'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { getRecipients as getRecipientsAction } from '@/app/api/accounts/getRecipients';
import { createRecipient as createRecipientAction } from '@/app/api/accounts/createRecipient';
import { getFinancialAccounts as getFinancialAccountsAction } from '@/app/api/money-management/financial-accounts/getFinancialAccounts';
import { Skeleton } from '@/components/common/Skeleton';
import { useFakeBills } from '@/hooks/useFakeBills';
import { formatPrice } from '@/utils/formatPrice';
import type { CurrencyCode } from '@/constants/currencyCodes';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { PaymentModal } from '@/components/financial-account/PaymentModal';

const BLUE = '#3B6AE8';
const NAVY = '#1C2B47';

const DEMO_SUPPLIERS = [
  { code: 'ACC01',  name: 'AccountsIQ',               ccy: 'EUR', balance: 3_595.20 },
  { code: 'AMAZ01', name: 'Amazon Web Services',       ccy: 'USD', balance: 123.00   },
  { code: 'CER01',  name: 'Certification Europa Ltd', ccy: 'EUR', balance: 2_848.00 },
];

const fmtBalance = (v: number) =>
  new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

// Derive initials + a consistent hue from name
const getAvatar = (name: string) => {
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  const hash = name.split('').reduce((h, c) => h * 31 + c.charCodeAt(0), 0);
  const hue = Math.abs(hash) % 360;
  return { initials, bg: `hsl(${hue}, 55%, 92%)`, color: `hsl(${hue}, 50%, 35%)` };
};

// ─── Add Supplier Modal ────────────────────────────────────────────────────────
const AddSupplierModal = ({
  open, onClose, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (name: string) => void;
}) => {
  const { stripeSecretKey } = useDemoConfig();
  const { account } = useDemoMerchant();

  const [entityType, setEntityType] = useState<'company' | 'individual'>('company');
  const [registeredName, setRegisteredName] = useState('');
  const [givenName, setGivenName] = useState('');
  const [surname, setSurname] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [country, setCountry] = useState('GB');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setLoading(true);
    setError('');
    try {
      const result = await createRecipientAction({
        connectedAccountId: account.id,
        contactEmail,
        entityType,
        country,
        registeredName: entityType === 'company' ? registeredName : undefined,
        givenName: entityType === 'individual' ? givenName : undefined,
        surname: entityType === 'individual' ? surname : undefined,
        stripeSecretKey,
      });
      if ('message' in result) {
        setError('Failed to create supplier. Please try again.');
      } else {
        onSuccess(result.display_name ?? contactEmail);
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${BLUE}15` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Add new supplier</h2>
            <p className="text-xs text-gray-400 mt-0.5">Creates a Stripe recipient account for direct payments</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Supplier type</label>
            <div className="flex gap-2">
              {(['company', 'individual'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEntityType(t)}
                  className="flex-1 py-2 rounded-lg border text-sm font-medium transition-all"
                  style={{
                    borderColor: entityType === t ? BLUE : '#E5E7EB',
                    backgroundColor: entityType === t ? `${BLUE}0d` : 'white',
                    color: entityType === t ? BLUE : '#6B7280',
                  }}
                >
                  {t === 'company' ? 'Company' : 'Individual'}
                </button>
              ))}
            </div>
          </div>

          {entityType === 'company' ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Registered company name</label>
              <input className={inputCls} value={registeredName} onChange={e => setRegisteredName(e.target.value)} required placeholder="e.g. Acme Supplies Ltd" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">First name</label>
                <input className={inputCls} value={givenName} onChange={e => setGivenName(e.target.value)} required placeholder="Jane" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Last name</label>
                <input className={inputCls} value={surname} onChange={e => setSurname(e.target.value)} required placeholder="Smith" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Contact email</label>
            <input type="email" className={inputCls} value={contactEmail} onChange={e => setContactEmail(e.target.value)} required placeholder="contact@example.com" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Country</label>
            <select className={inputCls} value={country} onChange={e => setCountry(e.target.value)}>
              <option value="GB">United Kingdom</option>
              <option value="IE">Ireland</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="US">United States</option>
              <option value="NL">Netherlands</option>
            </select>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: BLUE }}>
              {loading ? 'Creating…' : 'Add supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Item Invoices Tab ────────────────────────────────────────────────────────
const ItemInvoicesTab = () => {
  const { language } = useDemoConfig();
  const { bills } = useFakeBills();
  const hasBills = bills && bills.length > 0;

  const statusStyle = (status: string) =>
    status === 'paid'
      ? { background: '#D1FAE5', color: '#065F46' }
      : { background: `${BLUE}18`, color: BLUE };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#F9FAFB' }}>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Supplier</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Invoice #</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Due Date</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {hasBills ? bills.map((bill) => {
            const dueDate = bill.dueDate
              ? new Date(bill.dueDate * 1000).toLocaleDateString(language)
              : '-';
            return (
              <tr key={bill.id} className="border-t border-gray-100 hover:bg-blue-50/40 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {(() => { const av = getAvatar(bill.supplierName); return (
                      <span className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold select-none"
                        style={{ background: av.bg, color: av.color }}>{av.initials}</span>
                    ); })()}
                    <span className="font-medium text-gray-800">{bill.supplierName}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-mono text-sm font-semibold" style={{ color: BLUE }}>{bill.invoiceNumber}</td>
                <td className="px-4 py-3.5 font-semibold tabular-nums text-gray-800">
                  {formatPrice(bill.amount, language, bill.currency as CurrencyCode)}
                </td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={statusStyle(bill.status)}>
                    {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-gray-500">{dueDate}</td>
                <td className="px-5 py-3.5 text-right">
                  {bill.status === 'open' && (
                    <button
                      onClick={() => window.open(`/${language}/bills/${bill.id}/pay`, '_blank')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: BLUE }}
                    >
                      Pay
                    </button>
                  )}
                  {bill.status === 'paid' && (
                    <button
                      onClick={() => window.open(`/${language}/bills/${bill.id}/pay`, '_blank')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      View
                    </button>
                  )}
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={6}>
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <DocumentTextIcon className="size-10 mb-3" />
                  <p className="text-sm font-medium text-gray-500">No invoices yet</p>
                  <p className="text-sm text-gray-400 mt-1">Item invoices will appear here once created.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {hasBills && (
        <p className="text-xs text-gray-400 px-5 py-3 border-t border-gray-100">{bills.length} invoice{bills.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const SuppliersPage = () => {
  const { stripeSecretKey, language } = useDemoConfig();
  const { account } = useDemoMerchant();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('Suppliers');
  const [paymentSupplier, setPaymentSupplier] = useState<{ id: string | null; name: string } | null>(null);

  const { data: financialAccounts } = useQuery({
    queryKey: ['financial-accounts', account?.id, stripeSecretKey],
    queryFn: () => getFinancialAccountsAction({ accountId: account!.id, stripeSecretKey }),
    enabled: !!account,
  });
  const primaryFA = financialAccounts?.[0] ?? null;

  const TABS = ['Suppliers', 'Orders', 'AP Inbox', 'Item Invoices', 'Batch Invoices', 'Bulk Payments'];

  const { data: recipients, isPending } = useQuery({
    queryKey: ['recipients', account?.id, stripeSecretKey],
    queryFn: () => getRecipientsAction({ connectedAccountId: account!.id, stripeSecretKey }),
    enabled: !!account,
  });

  const STRIPE_BALANCES = [4_210.50, 1_875.00, 9_340.75, 620.00, 2_155.30, 7_890.00, 3_480.25, 510.00];

  const demoNames = new Set(DEMO_SUPPLIERS.map(s => s.name.toLowerCase()));

  const stripeRows = (recipients ?? [])
    .filter(r => {
      const name = (r.display_name ?? r.contact_email ?? '').toLowerCase();
      return !demoNames.has(name);
    })
    .map((r, i) => {
      const name = r.display_name ?? r.contact_email ?? 'Unknown';
      const code = name.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5).padEnd(3, '0') + (i + 10);
      return { code, name, ccy: 'GBP', balance: STRIPE_BALANCES[i % STRIPE_BALANCES.length] as number | null, isStripe: true, id: r.id };
    });

  const allRows = [
    ...DEMO_SUPPLIERS.map(s => ({ ...s, balance: s.balance as number | null, isStripe: false, id: s.code })),
    ...stripeRows,
  ];

  const handleSuccess = (name: string) => {
    setModalOpen(false);
    setToast(`"${name}" added as a Stripe recipient`);
    queryClient.invalidateQueries({ queryKey: ['recipients', account?.id] });
    setTimeout(() => setToast(''), 4000);
  };

  return (
    <div className="bg-white min-h-full">

      {/* Page header */}
      <div className="flex items-center justify-between mb-0">
        <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: BLUE }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New supplier
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-gray-200 mt-5 mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="pb-3 px-4 text-sm font-medium whitespace-nowrap"
            style={{
              color: tab === activeTab ? BLUE : '#9CA3AF',
              borderBottom: tab === activeTab ? `2px solid ${BLUE}` : '2px solid transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Item Invoices tab */}
      {activeTab === 'Item Invoices' && <ItemInvoicesTab />}

      {/* Suppliers table card */}
      {activeTab !== 'Item Invoices' && <><div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {isPending ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Supplier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Ccy</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Balance</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {allRows.map((row, idx) => {
                const av = getAvatar(row.name);
                return (
                  <tr
                    key={row.id}
                    className="border-t border-gray-100 hover:bg-blue-50/40 transition-colors"
                  >
                    {/* Supplier name + avatar */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold select-none"
                          style={{ background: av.bg, color: av.color }}
                        >
                          {av.initials}
                        </span>
                        <span className="font-medium text-gray-800">{row.name}</span>
                        {row.isStripe && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: `${BLUE}12`, color: BLUE }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill={BLUE}><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg>
                            Stripe
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Code */}
                    <td className="px-4 py-3.5 font-mono text-sm font-semibold" style={{ color: BLUE }}>
                      {row.code}
                    </td>
                    {/* Currency */}
                    <td className="px-4 py-3.5 text-gray-500">{row.ccy}</td>
                    {/* Balance */}
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums" style={{ color: row.balance && row.balance > 0 ? NAVY : '#9CA3AF' }}>
                      {row.balance !== null ? fmtBalance(row.balance) : <span className="text-xs text-gray-400 font-normal">—</span>}
                    </td>
                    {/* Pay action */}
                    <td className="px-4 py-3.5 text-right">
                      {primaryFA && (
                        <button
                          onClick={() => setPaymentSupplier({ id: row.isStripe ? row.id : null, name: row.name })}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: BLUE }}
                        >
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Row count */}
      <p className="text-xs text-gray-400 mt-3 pl-1">{allRows.length} suppliers</p>
      </>}

      {/* Add Supplier Modal */}
      <AddSupplierModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handleSuccess} />

      {/* Payment Modal */}
      {primaryFA && paymentSupplier && (
        <PaymentModal
          open={!!paymentSupplier}
          onClose={() => setPaymentSupplier(null)}
          sourceFinancialAccount={primaryFA}
          allFinancialAccounts={financialAccounts ?? undefined}
          initialRecipientId={paymentSupplier.id ?? undefined}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium z-50"
          style={{ backgroundColor: NAVY }}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: BLUE }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
          {toast}
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
