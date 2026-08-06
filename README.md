# AccountsIQ

**AccountsIQ** is a cloud accounting platform for mid-market and growing businesses, combining general ledger, accounts payable, supplier payments, and embedded financial accounts in one place. This repo is a Stripe sales demo that shows how AccountsIQ embeds Stripe's financial infrastructure to offer customers a seamless money-movement experience — without leaving their accounting software.

The demo is built on top of the [`demoeng-zenflow`](https://github.com/stripe-demos/demoeng-zenflow) starter (`sage` branch) and customised for the AccountsIQ brand and narrative.

---

## What the demo shows

### Dashboard (authenticated)

| Section | Description |
|---------|-------------|
| **Home** | Welcome screen with live financial account balance summary and AI-powered action prompts |
| **Financial Accounts** | Real Stripe financial accounts — balance, sort code & account number, recent settlements |
| **Purchases** | Supplier ledger with invoice management, batch payment authorisation, and direct Stripe payouts to registered suppliers |
| **Sales** | Payment history via Stripe embedded component; simulate incoming payments |
| **Reports** | Live analytics across all financial accounts — KPIs, monthly bar chart, category breakdown, recent transactions |
| **Corporate Card** | Stripe Issuing — virtual cards for employee spend, real-time balance updates |

### Demo slides (no login required)

| Route | What it shows |
|-------|---------------|
| `/en/demo/finance` | **Merchant Finance** — Stripe Capital embedded component with live financing offer data |
| `/en/demo/wallet` | **AccountsIQ Wallet** — interactive mock wallet; balance updates live when a card spend is made |
| `/en/demo/issuing` | **Corporate Card** — simulates card spend and writes balance delta back to the wallet slide |

The wallet and issuing slides share state via `localStorage` to demonstrate a live, connected balance experience during a presentation.

---

## Stripe products featured

- **Stripe Financial Accounts** (v2 Money Management API) — hold, move, and receive funds
- **Stripe Capital** — embedded financing offer inside the accounting dashboard
- **Stripe Issuing** — corporate cards linked to financial account balances
- **Stripe Connect** — each AccountsIQ customer is a connected account; embedded components render inside their context
- **Outbound Payments** — pay suppliers directly from a financial account, with GB Confirmation of Payee pre-flight

---

## Tech stack

- Next.js 14 (App Router), React 18, TypeScript
- Stripe Node SDK v22 (`stripe@^22.4.0-beta.1`, API version `2026-06-24.preview`)
- TanStack Query, Tailwind CSS, Headless UI

---

## Setup

Requires **Node 24.11.0** (enforced via `.node-version` + nodenv).

```bash
node -v        # must be v24.11.0

npm install
# .env.local already exists — add your Stripe secret and publishable keys
npm run dev    # http://localhost:3000
```

`.env.local` is pre-configured with `CURRENCY=gbp`, dark sidebar, and `DEMO_NAME=clearaccept`. Do not commit real keys.

```bash
npm run build    # production build (TypeScript errors block unless BUILD_ENVIRONMENT=CUSTOM)
npm run lint     # ESLint
npm run format   # Prettier
```

---

## Deploying

1. Go to the **Actions** tab → run **"Build and Deploy to Cloud Run"**.
2. Select your branch, enter a subdomain (e.g. `accountsiq`), choose **Custom** deployment type.
3. Paste your `.env.local` contents into the env field.
4. Once complete, the demo is live at `<subdomain>.stripedemos.com`.

---

## Architecture notes

See [`CLAUDE.md`](./CLAUDE.md) for detailed technical notes: Stripe v2 API patterns, `'use server'` action conventions, context provider hierarchy, GB Confirmation of Payee flow, and all AccountsIQ-specific customisations.
