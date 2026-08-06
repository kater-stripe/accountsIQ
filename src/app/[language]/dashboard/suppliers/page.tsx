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

const TH_STYLE: React.CSSProperties = { textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 700, color: '#8892A0', letterSpacing: '.04em', textTransform: 'uppercase', background: '#F9FAFB', borderBottom: '1px solid #F0F0F0' };
const TD_STYLE: React.CSSProperties = { padding: '13px 20px', borderTop: '1px solid #F4F4F4', fontSize: 13, color: '#4D5761' };

// ─── Item Invoices Tab ────────────────────────────────────────────────────────
const ItemInvoicesTab = () => {
  const { language } = useDemoConfig();
  const { bills } = useFakeBills();
  const hasBills = bills && bills.length > 0;

  const statusStyle = (status: string): React.CSSProperties =>
    status === 'paid'
      ? { background: '#D1FAE5', color: '#065F46' }
      : { background: `${BLUE}18`, color: BLUE };

  return (
    <div style={{ background: '#fff', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,.08)', overflow: 'hidden' }}>
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={TH_STYLE}>Supplier</th>
            <th style={TH_STYLE}>Invoice #</th>
            <th style={TH_STYLE}>Amount</th>
            <th style={TH_STYLE}>Status</th>
            <th style={TH_STYLE}>Due Date</th>
            <th style={{ ...TH_STYLE, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {hasBills ? bills.map((bill) => {
            const dueDate = bill.dueDate
              ? new Date(bill.dueDate * 1000).toLocaleDateString(language)
              : '-';
            return (
              <tr key={bill.id} style={{ cursor: 'default' }}>
                <td style={TD_STYLE}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {(() => { const av = getAvatar(bill.supplierName); return (
                      <span style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: av.bg, color: av.color }}>{av.initials}</span>
                    ); })()}
                    <span style={{ fontWeight: 600, color: '#323E48' }}>{bill.supplierName}</span>
                  </div>
                </td>
                <td style={{ ...TD_STYLE, fontFamily: 'monospace', fontWeight: 700, color: BLUE }}>{bill.invoiceNumber}</td>
                <td style={{ ...TD_STYLE, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#323E48' }}>
                  {formatPrice(bill.amount, language, bill.currency as CurrencyCode)}
                </td>
                <td style={TD_STYLE}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, ...statusStyle(bill.status) }}>
                    {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                  </span>
                </td>
                <td style={{ ...TD_STYLE, color: '#8892A0' }}>{dueDate}</td>
                <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                  {bill.status === 'open' && (
                    <button
                      onClick={() => window.open(`/${language}/bills/${bill.id}/pay`, '_blank')}
                      style={{ padding: '5px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: BLUE, border: 'none', cursor: 'pointer' }}
                    >
                      Pay
                    </button>
                  )}
                  {bill.status === 'paid' && (
                    <button
                      onClick={() => window.open(`/${language}/bills/${bill.id}/pay`, '_blank')}
                      style={{ padding: '5px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#8892A0', background: 'none', border: '1px solid #E5E7EB', cursor: 'pointer' }}
                    >
                      View
                    </button>
                  )}
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center' }}>
                <DocumentTextIcon style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#8892A0', margin: '0 0 4px' }}>No invoices yet</p>
                <p style={{ fontSize: 13, color: '#B0B8C2', margin: 0 }}>Item invoices will appear here once created.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {hasBills && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid #F4F4F4', fontSize: 12, color: '#8892A0' }}>
          {bills.length} invoice{bills.length !== 1 ? 's' : ''}
        </div>
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
    <div>

      {/* Summary bar */}
      <div style={{ background: '#fff', borderTop: `4px solid ${BLUE}`, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,.08)', padding: '22px 28px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' as const }}>
        <div style={{ flex: '1 1 240px' }}>
          <div style={{ fontSize: 11, color: '#8892A0', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Purchases</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#323E48', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {isPending ? '—' : `${allRows.length} suppliers`}
          </div>
          <div style={{ fontSize: 12, color: '#8892A0', marginTop: 6 }}>
            {DEMO_SUPPLIERS.length} direct · {allRows.length - DEMO_SUPPLIERS.length} via Stripe
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: BLUE, color: '#fff', border: 'none' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New supplier
        </button>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', marginBottom: 20 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              paddingBottom: 12, paddingLeft: 16, paddingRight: 16, paddingTop: 0,
              fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' as const,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === activeTab ? BLUE : '#8892A0',
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
      {activeTab !== 'Item Invoices' && (
        <>
          <div style={{ background: '#fff', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,.08)', overflow: 'hidden' }}>
            {isPending ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : (
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH_STYLE}>Supplier</th>
                    <th style={TH_STYLE}>Code</th>
                    <th style={TH_STYLE}>Ccy</th>
                    <th style={{ ...TH_STYLE, textAlign: 'right' }}>Balance</th>
                    <th style={{ ...TH_STYLE, width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {allRows.map((row) => {
                    const av = getAvatar(row.name);
                    return (
                      <tr key={row.id}>
                        <td style={TD_STYLE}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, userSelect: 'none' as const, background: av.bg, color: av.color }}>
                              {av.initials}
                            </span>
                            <span style={{ fontWeight: 600, color: '#323E48' }}>{row.name}</span>
                            {row.isStripe && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${BLUE}12`, color: BLUE }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill={BLUE}><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg>
                                Stripe
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...TD_STYLE, fontFamily: 'monospace', fontWeight: 700, color: BLUE }}>{row.code}</td>
                        <td style={{ ...TD_STYLE, color: '#8892A0' }}>{row.ccy}</td>
                        <td style={{ ...TD_STYLE, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: row.balance && row.balance > 0 ? NAVY : '#B0B8C2' }}>
                          {row.balance !== null ? fmtBalance(row.balance) : '—'}
                        </td>
                        <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                          {primaryFA && (
                            <button
                              onClick={() => setPaymentSupplier({ id: row.isStripe ? row.id : null, name: row.name })}
                              style={{ padding: '5px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: BLUE, border: 'none', cursor: 'pointer' }}
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
          <div style={{ fontSize: 12, color: '#8892A0', marginTop: 12, paddingLeft: 4 }}>
            {allRows.length} suppliers
          </div>
        </>
      )}

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
