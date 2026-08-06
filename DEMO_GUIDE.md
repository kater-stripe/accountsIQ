# AccountsIQ Demo Guide

**Persona:** Eric Harmon, Finance Manager at Triathlon Ireland
**Platform:** AccountsIQ — cloud accounting and embedded finance for mid-market businesses

---

## Demo Surfaces

### 1. Full Dashboard (`/en/dashboard`)
Requires sign-in. Shows the complete AccountsIQ product experience with live Stripe data.

### 2. Presentation Slides (`/en/demo/*`)
Standalone split-screen slides — no sign-in required. Use these for screen-share presentations.

---

## Dashboard Pages

### Home (`/en/dashboard`)
- Live wallet balance (sum of all financial accounts)
- Inbound/outbound transaction totals
- Recent transactions across all accounts
- Scheduled payments and auto-allocation rules (mock UI)
- **AI Assistant** — auto-opens on this page with pending payment alert; click "Review pending payments" to jump straight to Item Invoices

### Financial Accounts (`/en/dashboard/financial-accounts`)
- Lists all Stripe Treasury financial accounts with live balances
- Per-account: balance, account number, sort code
- Click "See details →" to drill into an individual account

### Financial Account Detail (`/en/dashboard/financial-accounts/[id]`)
- Live balance for that account
- Full transaction history (Transactions tab) with date, category, amount, balance impact
- Issuing Cards tab — cards funded from this account

### Purchases / Suppliers (`/en/dashboard/suppliers`)
- **Suppliers tab** — list of all suppliers (3 hardcoded demo + live Stripe recipients); shows balances; "Pay" button opens payment modal
- **Item Invoices tab** — 3 fake open invoices (Acme Office Supplies, CloudServe IT, Metro Cleaning Co.) with Pay buttons
- **Orders, AP Inbox, Batch Invoices, Bulk Payments** — additional tabs (mock UI to show breadth of AP workflow)
- Add new supplier via "+ New supplier" → creates a real Stripe recipient account and triggers onboarding
- Pay a supplier → opens payment modal; selects source financial account; executes a real Stripe OutboundPayment (GB CoP pre-flight handled automatically)

### Sales (`/en/dashboard/sales`)
- Live Stripe payments data via Connect embedded component
- "Simulate payment" button — creates a real confirmed PaymentIntent on the connected account for demo purposes

### Reports (`/en/dashboard/reports`)
- KPI row: total balance across all FAs, total inflows, total outflows (live)
- FA balance table — each account with live balance and status
- 6-month inflow/outflow bar chart (live transactions)
- Transaction breakdown by category with relative bar indicators
- Recent 25 transactions sorted newest-first (live, refreshes on every visit)

---

## Presentation Slides

### Merchant Finance (`/en/demo/finance`)
**Stripe product: Stripe Capital**
- Split-screen: AccountsIQ product context on left, live Stripe Capital component on right
- Shows a real financing offer (if eligible) or application form for the connected account
- Demonstrates Capital embedded directly inside an accounting platform

### AccountsIQ Wallet (`/en/demo/wallet`)
**Stripe product: Stripe Treasury**
- Interactive mock wallet with £4,237.18 starting balance
- Click "Receive settlement" → adds £1,124.80 and a transaction entry
- Shows auto-allocation rules (VAT Savings 18%, Operating Reserve 10%)
- Shows scheduled payments
- Balance state persists in localStorage and is shared with the Corporate Card slide

### Corporate Card (`/en/demo/issuing`)
**Stripe product: Stripe Issuing**
- Live card details for a corporate card (cardholder, limits, spend controls)
- Shows category-level spend controls (Auto Parts ✓, Fuel ✓, Hospitality ✗)
- Click "Simulate card spend" → deducts £285.00 from the shared wallet balance, adds a transaction
- Demonstrates real-time balance update across both slides

### Supplier Payments (`/en/demo/supplier-payments`)
**Stripe product: Stripe Connect (Recipient Accounts) + Treasury**
- Walkthrough of the full AP payment flow: AP Inbox → batch payment run → FX payments → approval → settlement
- Shows multi-currency payments (USD, EUR) with GBP base cost
- Simulates payment lifecycle: pending → submitted → in-flight → settled
- Demonstrates embedded cross-border supplier payments inside an accounting workflow

---

## Key Demo Talking Points

| Feature | Stripe Product |
|---|---|
| Financial accounts with UK sort codes | Stripe Treasury |
| Real-time balance across all accounts | Stripe Treasury |
| Pay suppliers directly (incl. CoP) | Stripe Treasury + Connect |
| Corporate cards with spend controls | Stripe Issuing |
| Embedded financing offer | Stripe Capital |
| Onboard and pay new suppliers | Stripe Connect (Recipient Accounts) |
| Sales / payment acceptance | Stripe Payments |

---

## Reset Demo State

The Wallet and Corporate Card slides use `localStorage` key `ca_demo_wallet`. To reset the balance back to £4,237.18, open browser DevTools → Application → Local Storage and delete the `ca_demo_wallet` entry (or run `localStorage.removeItem('ca_demo_wallet')` in the console).
