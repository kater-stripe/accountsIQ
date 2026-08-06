# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

This is the **ClearAccept** demo — a fork of the Stripe `demoeng-zenflow` demo (`sage` branch). It is a fictional embedded-finance SaaS platform for service-based merchants, used for sales demos at Stripe. The primary demo surfaces are three presentation-style split-screen slides:

- `/en/demo/finance` — Merchant Finance (Stripe Capital embedded component, live Stripe data)
- `/en/demo/wallet` — ClearAccept Wallet (interactive mock wallet with localStorage state)
- `/en/demo/issuing` — Corporate Card (interactive mock issuing with localStorage state)

The wallet and issuing slides share state via the `ca_demo_wallet` localStorage key to simulate a live balance update when a card spend is made.

## Commands

```bash
# Requires Node 24.11.0 (enforced via .node-version + nodenv)
node -v          # must be v24.11.0

npm install      # install deps
npm run dev      # dev server at localhost:3000
npm run build    # production build (TypeScript errors block unless BUILD_ENVIRONMENT=CUSTOM)
npm run lint     # ESLint
npm run format   # Prettier
```

There are no test commands — this repo has no test suite.

## Environment Setup

`.env.local` already exists with ClearAccept defaults (`CURRENCY=gbp`, dark sidebar, `DEMO_NAME=clearaccept`). Do not commit real keys.

## Architecture

### Routing

All pages live under `/src/app/[language]/` — the `[language]` segment is always present (e.g., `/en/dashboard`). The root `/` permanently redirects to `/default` (see `next.config.mjs`). Language is read from URL params, not from Context.

Key route groups:
- `/[language]/` — storefront/sign-in/sign-up
- `/[language]/dashboard/` — merchant dashboard (requires auth; has sidebar layout)
- `/[language]/demo/` — standalone split-screen demo slides (no sidebar, no auth required)

### Context Provider Hierarchy

Order in `src/app/layout.tsx` matters — each provider depends on those above it:

```
QueryClientProvider → UmamiProvider → DemoConfigProvider → DemoMerchantProvider
  → CartProvider → DemoCustomerProvider → ToolsPanelWrapper → HandleCallbacksProvider
```

**DemoConfigProvider** — merges three sources (lowest-to-highest precedence): env var defaults in `src/constants/demoConfig.ts`, `${demoName}-demo-config` localStorage, `${demoName}-custom-demo-config` localStorage. Config fields can also be overridden via `?demogen_<key>=<value>` query params. `getPlatformAccount` derives `country` from the `CURRENCY` env var (no API call) — add entries to `CURRENCY_TO_COUNTRY` in `getPlatformAccount.ts` for new currencies.

**DemoMerchantProvider** — manages the signed-in Stripe Connect account. Also initializes `ConnectComponentsProvider` (wraps children when a Stripe account is active), so all Stripe embedded components (`@stripe/react-connect-js`) work throughout the tree. The `connectInstance` `useMemo` depends only on `account?.id` (not the full account object) — do not change this dependency or refreshing account data will tear down and remount the ConnectJS instance.

### Onboarding Redirect Logic

`DemoMerchantContext` redirects between sign-up and dashboard based on `account.requirements?.summary?.minimum_deadline?.status`. **Critical v2 behaviour**: freshly-created v2 accounts always return `requirements: null` — requirements are computed asynchronously. The code treats `null` as "onboarding incomplete" to keep the user on the sign-up page so `ConnectAccountOnboarding` can render. Only redirect to dashboard when `requirements` is explicitly non-null AND status is not `past_due`/`currently_due`.

### API Layer

Files under `src/app/api/**/` are **not** Next.js route handlers. They are `'use server'` async functions called directly from client components inside TanStack Query `queryFn`/`mutationFn`. The only actual route handler is `src/app/api/accounts/account-session/route.ts` (used by the Connect SDK to fetch account sessions).

Always wrap Stripe SDK response objects with `plain()` from `@/utils/plain` before returning from a server action — Stripe objects contain circular refs that aren't serializable across the server/client boundary.

### Stripe SDK — v2 API

The SDK is pinned to `stripe@^22.4.0-beta.1`. This version is required for `money_manager` TypeScript types (`Stripe.V2.Core.AccountCreateParams.Configuration.MoneyManager`).

**v1 vs v2 API headers:**
- v1 calls use `stripeAccount: accountId` in RequestOptions (second arg)
- v2 calls (`stripe.v2.*`, `stripe.v2.moneyManagement.*`) use `stripeContext: accountId` in RequestOptions

**API version constant:** `src/constants/stripeApiVersion.ts` exports `STRIPE_API_VERSION = '2026-06-24.preview'`. The account session route uses `'2026-06-24.preview;embedded_connect_beta=v2'` — **all** components at this API version require the `embedded_connect_beta=v2` suffix, not just treasury components.

**`initializeStripe` utility** (`src/utils/initializeStripe.ts`) — directly instantiates `new Stripe(apiKey, { typescript: true })`. It accepts a `hideApiActivity` option for API compatibility with call sites, but the option is a no-op (the demoeng tools-panel API activity logger was removed to avoid type incompatibilities with the new SDK).

**node_modules patches (lost on `npm install` — re-apply if you reinstall):**
- `node_modules/@demoeng/tools-panel/src/features/api-activity/create-initialize-stripe.ts` — widen `makeRequest` param types to match v22 SDK's `HttpClientInterface`. *(Note: `@demoeng` packages have since been removed, so this patch is no longer needed.)*
- `node_modules/stripe/cjs/resources/V2/TestHelpers/FinancialAddresses.d.ts` and the `esm/` copy — add `'sepa_credit_transfer'` to `FinancialAddressCreditParams.Network` type. The API supports it (gated feature, enabled on this platform) but the SDK type definition omits it.

**Account creation** (`src/app/api/accounts/createAccount.ts`) uses `money_manager` configuration (not the old `storer`). The `buildBusinessStorage()` helper always requests both `inbound` and `outbound` together for the same currency — `business_storage` requires both or neither. A v1 `stripe.accounts.update` for `card_issuing` capability is intentionally kept (v1 interop for Issuing) and silently caught if the platform isn't Issuing-enabled.

**Valid `include` values** for `stripe.v2.core.accounts.retrieve/create`:
`'requirements' | 'configuration.customer' | 'configuration.merchant' | 'configuration.recipient' | 'configuration.money_manager' | 'defaults' | 'future_requirements' | 'identity'`
(`configuration.storer` and `configuration.card_creator` are not valid in v22.)

**OutboundTransfer vs OutboundPayment:**
- `OutboundTransfer` — FA → connected account's **own** bank account (uses `toPayoutMethodId`, v2 `stripe.v2.moneyManagement.outboundTransfers`)
- `OutboundPayment` — FA → **recipient** account's bank account (uses `to.recipient` + `to.payout_method`, v2 `stripe.v2.moneyManagement.outboundPayments`)

**GB Confirmation of Payee (CoP):** GB bank account payout methods (`gbba_` prefix) require two raw-fetch steps before an OutboundPayment can be created — otherwise the API returns `cop_not_accepted`. See `createOutboundPayment.ts` for the pattern:
```
POST /v2/core/vault/gb_bank_accounts/{gbba_id}/initiate_confirmation_of_payee
POST /v2/core/vault/gb_bank_accounts/{gbba_id}/acknowledge_confirmation_of_payee
```
Both calls use `Stripe-Context: {connectedAccountId}/{recipientAccountId}`.

**Recipient account links:** v2 recipient accounts don't support v1 `stripe.accountLinks.create`. Use a raw fetch to `POST https://api.stripe.com/v2/core/account_links` with `Stripe-Account: connectedAccountId` header (see `createRecipientOnboardingLink.ts`).

**Recipient listing header:** `getRecipients.ts` uses `stripeAccount: connectedAccountId` (v1-style), not `stripeContext` — the v2 list endpoint for recipient accounts uses `Stripe-Account`.

**Remaining v1 calls (intentional):**
- `stripe.accountSessions.create` — account sessions have no v2 equivalent
- `stripe.accounts.update` in `createAccount.ts` — v1 card_issuing capability interop
- `stripe.customers.*` — customer API has no v2 equivalent

### Account Session Route

`src/app/api/accounts/account-session/route.ts` uses a **3-tier fallback** — all tiers use `'2026-06-24.preview;embedded_connect_beta=v2'`:
1. Full components (treasury + base + all features)
2. Base only if the account lacks treasury capability
3. Minimal features (no `disable_stripe_user_authentication`) if the platform hasn't been granted that feature

### Brand Colors

Colors are CSS variables injected by `BrandColorOverrides` component (rendered inside `DemoConfigProvider`):
- `--brand-primary` / `bg-brand-primary` / `text-brand-primary`
- `--brand-secondary` / `bg-brand-secondary` (used as the sidebar background)

Use these Tailwind classes instead of hardcoded hex values — except in the `/demo/` pages and several dashboard pages, which use **inline styles** with these color constants:
- `/demo/` pages: `DARK_BG = '#1A1730'`, `AMBER = '#F59E0B'`, `GREEN = '#16C665'`
- `wallet` and `financial-accounts` dashboard pages: `#323E48` (navy headings), `#77B32A` (green accent), `#8892A0` (muted labels), `#4D5761` (secondary text)
- `payments` (Sales) and `reports` dashboard pages: `BLUE = '#3B6AE8'`, `NAVY = '#1C2B47'`

### i18n

All user-visible strings must go through `useTranslation()` / `t('key')`. Locale JSON files are in `public/locales/` (en, en-GB, fr, de, es, it, ja, zh). If you add a new string key, add it to every locale file. The demo slides are exempt — they are English-only hardcoded strings.

### Stripe Connect Embedded Components

Used from `@stripe/react-connect-js`. Import `loadConnectAndInitialize` from `@stripe/connect-js/pure` (not the default export) to avoid SSR side effects — this is already done in `DemoMerchantContext.tsx`. Components must be rendered inside the `ConnectComponentsProvider` tree, which is provided by `DemoMerchantProvider` once the user is signed in.

### GitHub Packages

`@demoeng/utils` and `@demoeng/tools-panel` are installed from `github:stripe-demos/demoeng-*`. They must stay in `transpilePackages` in `next.config.mjs`.

## ClearAccept-Specific Customizations

Changes made from the upstream `sage` branch:

| File | Change |
|------|--------|
| `public/img/brand/logo.svg` | ClearAccept wordmark (green `#00D639`) |
| `public/img/brand/icon.svg` | Green "C" icon |
| `src/app/[language]/layout.tsx` | Page title → "ClearAccept" |
| `.env.local` | `CURRENCY=gbp`, dark sidebar, `DEMO_NAME=clearaccept` |
| `src/app/[language]/demo/finance/page.tsx` | Merchant Finance split-screen slide (Stripe Capital) |
| `src/app/[language]/demo/wallet/page.tsx` | ClearAccept Wallet slide — interactive, localStorage-backed balance |
| `src/app/[language]/demo/issuing/page.tsx` | Corporate Card slide — simulates card spend, writes to localStorage |
| `src/constants/stripeApiVersion.ts` | `2026-06-24.preview` |
| `src/app/api/accounts/createAccount.ts` | v2 `money_manager` config, `buildBusinessStorage()` helper |
| `src/app/api/accounts/account-session/route.ts` | 3-tier fallback; all tiers use `embedded_connect_beta=v2` |
| `src/app/api/accounts/getPlatformAccount.ts` | Derives country from `CURRENCY` env var — no v1 API call |
| `src/app/api/money-management/**/` | Use `stripeContext` (not `stripeAccount`) for v2 endpoints |
| `src/utils/initializeStripe.ts` | Direct Stripe instantiation (removed demoeng wrapper) |
| `src/context/DemoMerchantContext.tsx` | `@stripe/connect-js/pure` import; `money_manager` capabilities; `requirements: null` = onboarding incomplete; `connectInstance` keyed on `account?.id` only |
| `src/app/[language]/dashboard/wallet/page.tsx` | Full dashboard wallet — real FA balance (sum of all FAs), fan-out transactions, AI/pots/scheduled mock UI, localStorage-backed state; inline styles |
| `src/app/[language]/dashboard/financial-accounts/page.tsx` | FA list page redesigned to match wallet color scheme; inline styles; "See details →" per-card button |
| `src/app/api/accounts/createRecipient.ts` | `include: ['requirements', 'configuration.recipient', 'identity']` |
| `src/app/api/accounts/getRecipients.ts` | `stripeAccount` header (not `stripeContext`) for recipient listing |
| `src/app/api/accounts/createRecipientOnboardingLink.ts` | Raw fetch to `POST /v2/core/account_links` (v1 accountLinks not supported for v2 recipients) |
| `src/app/api/money-management/outbound-payments/createOutboundPayment.ts` | CoP pre-flight (initiate + acknowledge) for `gbba_` payout methods before OBP creation |
| `src/components/common/Sidebar.tsx` | Nav items: Home, Favourites (disabled), Sales, Purchases, Items (disabled), Financial Accounts, General Ledger (disabled), Reports, Dashboards (disabled); disabled items render as `<span>` with `cursor: default` instead of `<Link>` |
| `src/app/[language]/dashboard/payments/page.tsx` | Renamed to "Sales" (via locale files); blue top-border card; `SimulateModal` creates a confirmed PaymentIntent on the connected account via v1 `stripeAccount` |
| `src/app/[language]/dashboard/reports/page.tsx` | Custom analytics page — fetches all FAs + transactions (fan-out per FA); KPI row, FA balance table, 6-month bar chart, category breakdown, recent 20 transactions |
| `src/app/[language]/dashboard/suppliers/page.tsx` | `DEMO_SUPPLIERS` list (AccountsIQ, AWS, Certification Europa); Stripe recipients deduplicated against demo names; `PaymentModal` accepts `allFinancialAccounts` prop for FA selector; `ItemInvoicesTab` using `useFakeBills` |
| `src/app/[language]/dashboard/wallet/page.tsx` | Added `DEMO_PERSONA_NAME = 'Eric Harmon'` and `DEMO_COMPANY_NAME = 'Triathlon Ireland'` — hardcoded because Stripe account identity has wrong data |
| `src/components/ai-wizard/AIWizard.tsx` | Removed capital financing logic; shows pending supplier payments count from `useFakeBills`; "Review pending payments" button navigates to suppliers page |
| `src/components/financial-account/PaymentModal.tsx` | Added `allFinancialAccounts` prop; "Pay from" `<Select>` shown when >1 FA; `selectedFaId` state drives `fromFinancialAccountId` and description |
| `src/app/api/payment-intents/simulatePayment.ts` | New server action — creates a confirmed PaymentIntent with `pm_card_visa` on a connected account (v1 `stripeAccount`) |

## Deploying

The GitHub Actions workflow "Build and Deploy to Cloud Run" deploys to `<subdomain>.stripedemos.com`. Paste the `.env.local` contents into the workflow's env field when triggering from the Actions tab.
