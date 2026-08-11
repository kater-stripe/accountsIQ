# AccountsIQ EBC — supplier-payments demo brief

**Purpose:** a demo-safe answer pack for the eight workshop questions, grounded in the AccountsIQ materials and current Stripe product evidence available on 6 August 2026.

## Executive recommendation

Lead with an **embedded UK domestic supplier-payment run** rather than a multi-country wallet, per-invoice virtual accounts, or stablecoin/FX workflow.

The demo should show one AccountsIQ customer legal entity selecting three approved GBP supplier invoices, an authorised user approving the run in AccountsIQ, Stripe executing the payments, an exception returned into the same run, and AccountsIQ reconciling the final results to the invoices. It directly proves the customer value proposition: review, approve, pay, track exceptions, and reconcile without leaving AccountsIQ.

Treat EUR/Ireland-originated payments, cross-border corridors, FX locking, collections virtual-account design, and liability as **workshop decisions / validation items**, not as committed product behaviour. Current evidence supports UK Global Payouts as a preview product but does not confirm Ireland as a Global Payouts sender country or an AccountsIQ-approved implementation.

## What AccountsIQ asked for

AccountsIQ explicitly described the desired experience as keeping the entire workflow inside AIQ: approve payment runs; send domestic and international supplier payments; track payment status and exceptions; view history and reporting; and move seamlessly between accounting and payments. They say the design flows are discussion aids, not a final solution. ([Slack, `#accountsiq-workshop`, 29 July](https://stripe.slack.com/archives/C0BL7SNM72M/p1785320819354719))

The EBC is 12 August, and the 30-minute “Art of the possible” session is owned by Kate Roumruk and Ben Mo. The current EBC deck positions the destination as embedded approval, payment, and reconciliation across domestic and international suppliers. ([Engagement doc](https://docs.google.com/document/d/1PUmebprPqPGLNqO-BcUBQa_KyNbYDUnEvVOfhkVqyU0/edit?tab=t.0); [current deck](https://docs.google.com/presentation/d/1ZmYsVDCs4oGjbjv3HRMpdUGimJ1yzhZiYLz14-L4VeM/edit))

## Answer pack

### 1. Account model

**Recommended answer:** model a Stripe Financial Account as belonging to **one customer legal entity**. AccountsIQ can show a group view and handle consolidation in its own accounting layer, while Stripe holds entity-level balances and executes money movement.

A Financial Account is bound to one LegalEntity; a LegalEntity can have multiple Financial Accounts, including accounts separated by business unit or financial product. This supports an entity-first model, not a wallet jointly owned by a multi-entity corporate group. The right starting architecture is therefore: AccountsIQ platform → one connected account/legal entity → one operating Financial Account per currency/use case as needed. ([V2 FinancialAccounts 101](https://trailhead.corp.stripe.com/docs/mms-transactions-and-fas/v2-financialaccounts-101?entrypoint=home_search_result); [Accounts Lexicon](https://trailhead.corp.stripe.com/docs/accounts-core/accounts-lexicon?entrypoint=home_search_result))

**Demo wording:** “Stripe provides a balance and payment capability per legal entity. AIQ remains the group finance system: it can present a consolidated view, manage intercompany logic, and decide which entity funds each run.”

**Do not claim:** a single Stripe wallet shared across distinct legal entities, or that Stripe performs AIQ’s multi-entity consolidation. That has not been validated.

### 2. UK/Ireland rails, currencies, and settlement timing

**Current position:** UK Global Payouts is documented for eligible UK users and 100+ recipient countries, with recipients typically receiving funds in **1–7 business days**, depending on corridor. It requires pre-funding a Financial Account. It is preview functionality, and the detailed rail/currency matrix must be checked against the platform legal entity, recipient country, currency, and payout method. ([Global Payouts — US & UK Public Preview](https://confluence.corp.stripe.com/pages/viewpage.action?pageId=1759215988))

**Important limitation:** the evidence retrieved does **not** establish Ireland as a Global Payouts sender country, nor does it establish a definitive Irish domestic rail/currency/timing matrix. Do not give a definitive Ireland answer at the EBC. Ask the Global Payouts team to confirm the UK and Ireland sender/recipient corridor matrix for the final proposed construct.

**Demo wording:** “We can demonstrate the approved UK domestic path now. For Ireland and each international corridor, we will confirm eligibility, rail, expected arrival window, and funding mechanics before the pilot design is final.”

### 3. FX at approval and settlement

Stripe’s FX Quotes API supports live quotes and quoted lock windows of **5 minutes, 1 hour, or 24 hours**. A quote must be used before `lock_expires_at`; material market movement can invalidate it. The integration must handle expiry/invalidity and re-quote. ([FX Quotes API](https://docs.corp.stripe.com/payments/currencies/localize-prices/fx-quotes-api))

**Demo-safe answer:** “AIQ can show an indicative or time-limited quote during approval, including the rate, source amount, recipient amount, FX fee, quote ID, and expiry. The quote can only be honoured if the payout flow supports attaching it and the payment is initiated in the window. We should not promise that a quote remains fixed through an arbitrary approval cycle until the outbound-payment/Global-Payouts integration is confirmed.”

**What posts back:** at minimum AIQ should receive/store the Stripe payout ID, quote ID if used, source and destination amounts/currencies, applied rate/FX fee where exposed, payment status, and settlement/return timestamps. AIQ owns the accounting entries, including any realised FX gain/loss calculation. The exact statement/reconciliation fields must be validated for the selected payout product.

### 4. KYC/KYB onboarding

Account onboarding can be embedded in AIQ. Stripe’s component reads the due requirements and renders a localised, validated flow for business data, representatives, documents, and identity verification. It can be tailored to collect currently due, eventually due, or future requirements, but filtering does not remove the underlying compliance requirement. ([Embedded account onboarding](https://docs.corp.stripe.com/connect/supported-embedded-components/account-onboarding))

**Demo wording:** “AIQ can own the application journey and keep data collection in its branded experience. Stripe remains the compliance decision-maker: requirements, KYC/KYB verification, capability activation, and any follow-up are Stripe-controlled.”

Run onboarding for each distinct customer legal entity. Reuse of identity data may reduce repeat data capture for the **same** real-world legal entity, subject to configuration and eligibility; it is not a way to combine distinct subsidiaries into one KYC subject. ([Legal-entity sharing](https://trailhead.corp.stripe.com/docs/carm/general-tech-docs/legal-entity-sharing?entrypoint=home_search_result))

### 5. Collections and virtual account details

Do **not** promise a unique virtual account per AIQ customer or invoice. Financial Accounts are not intended as a high-cardinality per-payment sub-ledger.

A relevant but specific Multiprocessor Settlement pattern supports one or more financial addresses per Financial Account and currency, including GBP sort-code/account-number and EUR IBAN examples. It matches incoming money using a **reference, amount, and financial account**, and surfaces received-credit/settlement webhooks. It is not a generic invoice-allocation product; it requires Custom Connect, platform-owned loss liability, a risk reserve, and Sales approval. ([Multiprocessor payouts for marketplaces](https://docs.corp.stripe.com/connect/multiprocessor-payouts-marketplaces))

**Design recommendation:** use a customer/entity-and-currency collection account only if the selected product makes it eligible. Put an immutable AccountsIQ invoice or remittance reference on the payment; on receipt, persist the Stripe received-credit ID, bank reference/statement descriptor, amount, currency, and funding account; then match to open invoices in AccountsIQ. Unmatched/partial receipts should enter an AIQ exception queue.

### 6. Authentication, approval, and controls

AccountsIQ can retain its maker-checker, approval chain, role controls, and application 2FA as its own payment-authorisation layer. Stripe authentication remains authoritative for sensitive embedded actions such as onboarding, account management, and certain bank-detail edits. It can include Stripe-controlled password, SMS, or OTP challenges, and cannot be treated as replaced by AIQ 2FA. ([Stripe user authentication in embedded](https://trailhead.corp.stripe.com/docs/connect-integration-guide/user-authentication-in-embedded?entrypoint=home_search_result))

**Demo wording:** “AIQ decides who can create and approve a payment run; Stripe adds any required authentication and compliance controls for sensitive account actions. We will make the hand-off contextual rather than force a separate dashboard visit.”

Do not promise that every payment execution can bypass Stripe step-up; validate the exact control model for the selected payout configuration.

### 7. Commercials, failures, and recalls

Commercial terms must be deal-specific. Internal Global Payouts reference pricing is not an AccountsIQ quote. Confirm standard payout fees, cross-border and FX fees, minimums, reserves, negative-balance treatment, and corridor economics through Sales and Product before presenting numbers.

The current Global Payouts reference says a payout can be cancelled while **Processing** but not once **Posted**. It also says UK domestic and cross-border payout reversals are unsupported, and returned ACH payouts require correction and re-initiation. That makes AIQ’s approval screen and recipient-detail validation a first-class risk control. ([Global Payouts — US & UK Public Preview](https://confluence.corp.stripe.com/pages/viewpage.action?pageId=1759215988))

**Demo wording:** “Before execution, AIQ will show the recipient, amount, method, fee/FX disclosure, and warning that some payouts cannot be reversed after submission. After execution, AIQ shows Stripe status and directs failed/returned cases into a controlled repair-and-retry flow.”

**Liability:** do not allocate liability verbally. The exact party responsible for failed, returned, recalled, fraudulent, or unauthorised supplier payments depends on the product, platform model, risk configuration, and contract. The multiprocessor-settlement construct explicitly requires platform-owned loss liability and a reserve; that should be treated as an example of the diligence needed, not a universal answer.

### 8. Most compelling first prototype

**Build:** “Approve, pay, reconcile” for a UK entity funding a domestic GBP supplier-payment run.

1. **Build/review:** three approved AIQ supplier invoices are grouped into a run with payee, due date, amount, payment method, and reference.
2. **Approve in AIQ:** a controller completes AIQ’s approval; display clear final-payment confirmation.
3. **Execute and track:** Stripe sends the payments; AIQ shows `paid`, `processing`, and `needs attention` states in the run.
4. **Reconcile:** AIQ returns the payout/reference IDs, fees and dates to the invoices, and shows an exception queue for the failed supplier.

**Optional extension, labelled eligibility-dependent:** add one EUR international supplier and show the FX disclosure/quote artefacts. Do not use this to assert Irish-originated Global Payouts availability, guaranteed FX locks, or universal corridor support.

This slice is compelling because it demonstrates the desired AIQ-native workflow and deliberately focuses on the value they care about—control, visibility, and reconciliation—without relying on unconfirmed cross-border or collections capabilities.

## Critical customer context and constraints

- AccountsIQ is the parent of ExpenseIn, which is already developing on Stripe Financial Accounts. ExpenseIn’s implementation has been using v1 connected accounts projected into v2. New connected accounts have been projected after about 10 minutes in their sandbox, and a hosted/embedded onboarding path is already familiar to their developer. (“Follow-up on v1/v2 Capabilities Sync,” 15 May 2026.)
- ExpenseIn’s UK platform was gated for outbound credential reuse, with new external bank accounts automatically projected into v2 payout methods; their developer confirmed outbound transfers in the development sandbox. (“Follow-up on v1/v2 Capabilities Sync,” 2–3 July 2026.)
- This is not evidence that every AIQ UK/Ireland corridor is ready. In their current testing, a GB platform received `business_storage.outbound.eur is not available for platforms in country GB`, and the team was separately gating multi-currency Financial Accounts. (“Follow-up on v1/v2 Capabilities Sync,” 23 July 2026.)
- The AccountsIQ deck/architecture draft already models an AccountsIQ Custom Stripe Platform, connected customer business, Financial Account, external bank, supplier recipient account, and outbound vendor payment. ([Account model draft](https://docs.google.com/presentation/d/1V-Zr9TpQw4E-FrmzPpGmOWSucMUt_miNK5mJct3DPI8/edit))

## Open decisions to take into the workshop

1. Is the first go-live UK-only, and which AccountsIQ legal entity will be the Stripe platform?
2. Which supplier corridors and currencies are actually required for phase one, and which are future roadmap?
3. Does the initial product use Global Payouts, Financial Accounts/Treasury Sending, or a different approved construct?
4. Is AIQ the platform of record/funder, or does each customer legal entity fund and send its own run?
5. What recipient verification, approval policy, beneficiary-change controls, and payment-limit rules must AIQ enforce?
6. What reconciliation/status fields does AIQ need to close invoices and investigate exceptions?
7. Which team owns final confirmation of country eligibility, rail/currency matrix, FX quote attachment, loss liability/reserves, and commercial pricing?

## Research coverage and limitations

Reviewed: the supplied screenshot; the customer’s stated design intent in Slack; the AccountsIQ EBC engagement doc; current EBC deck; account-model draft; AccountsIQ qualification notes; searchable Slack; Gmail threads with ExpenseIn; and current internal Stripe product documentation.

The supplied GitHub Pages design-system URL could not be retrieved directly, so visual/UI-specific claims from that site are unverified. Its functional intent is corroborated by the customer text posted in Slack. Some AccountsIQ Slack channels are group DMs that were inaccessible because the current Slack OAuth lacks `mpim:read` and `mpim:history`; this is therefore a substantial but not literally complete “everything” pass.
