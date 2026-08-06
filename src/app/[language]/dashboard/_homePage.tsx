'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { getFinancialAccounts as getFinancialAccountsAction } from '@/app/api/money-management/financial-accounts/getFinancialAccounts';
import { createFinancialAccount as createFinancialAccountAction } from '@/app/api/money-management/financial-accounts/createFinancialAccount';
import { getFinancialAccountTransactions as getFinancialAccountTransactionsAction } from '@/app/api/money-management/financial-accounts/getFinancialAccountTransactions';
import { getFinancialAddresses as getFinancialAddressesAction } from '@/app/api/money-management/financial-addresses/getFinancialAddresses';
import { createFinancialAddress as createFinancialAddressAction } from '@/app/api/money-management/financial-addresses/createFinancialAddress';
import { fundFinancialAccount as fundFinancialAccountAction } from '@/app/api/money-management/financial-accounts/fundFinancialAccount';
import { formatPrice } from '@/utils/formatPrice';
import { Skeleton } from '@/components/common/Skeleton';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CurrencyCode } from '@/constants/currencyCodes';
import type { SupportedLanguage } from '@/constants/languages';

// ─── Brand ────────────────────────────────────────────────────────────────────
const BLUE = '#3B6AE8';
const BLUE_LIGHT = '#EFF4FF';
const BLUE_MID = '#E8F0FE';
const GREEN_ACCENT = '#059669';

// ─── SVG icons ────────────────────────────────────────────────────────────────
type SvgProps = React.SVGProps<SVGSVGElement>;

const IArrowUp = (p: SvgProps) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
);
const IArrowR = (p: SvgProps) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IBank = (p: SvgProps) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="3 21 21 21"/><polyline points="3 10 21 10"/>
    <line x1="5" y1="6" x2="12" y2="3"/><line x1="12" y1="3" x2="19" y2="6"/>
    <line x1="6" y1="14" x2="6" y2="17"/><line x1="10" y1="14" x2="10" y2="17"/>
    <line x1="14" y1="14" x2="14" y2="17"/><line x1="18" y1="14" x2="18" y2="17"/>
  </svg>
);
const ITx = (p: SvgProps) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M7 17l-4-4 4-4"/><path d="M3 13h14"/>
    <path d="M17 7l4 4-4 4"/><path d="M21 11H7"/>
  </svg>
);
const ICard = (p: SvgProps) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);
const ICheck = (p: SvgProps) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const WalletPage = () => {
  const { stripeSecretKey, language } = useDemoConfig();
  const { account } = useDemoMerchant();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [txTab, setTxTab] = useState<'all' | 'in' | 'out'>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [isTopUpPending, setIsTopUpPending] = useState(false);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: financialAccounts, isPending: isAccountsPending } = useQuery({
    queryKey: ['financial-accounts', account?.id, stripeSecretKey],
    queryFn: () => getFinancialAccountsAction({ accountId: account!.id, stripeSecretKey }),
    enabled: !!account,
  });

  const autoCreatingRef = useRef(false);
  useEffect(() => {
    if (!account || isAccountsPending || autoCreatingRef.current || (financialAccounts && financialAccounts.length > 0)) return;
    autoCreatingRef.current = true;
    createFinancialAccountAction({ name: 'AccountsIQ Wallet', accountId: account.id, stripeSecretKey })
      .then(() => queryClient.invalidateQueries({ queryKey: ['financial-accounts', account.id, stripeSecretKey] }))
      .catch((err) => console.error('Failed to auto-create wallet FA:', err))
      .finally(() => { autoCreatingRef.current = false; });
  }, [account, isAccountsPending, financialAccounts]);

  const currentFA = useMemo(() => {
    if (!financialAccounts || financialAccounts.length === 0) return null;
    return [...financialAccounts].sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())[0];
  }, [financialAccounts]);

  const firstFaId = currentFA?.id ?? null;
  const faIds = useMemo(() => financialAccounts?.map(fa => fa.id) ?? [], [financialAccounts]);

  const { data: allFaTransactions, isPending: isTransactionsPending } = useQuery({
    queryKey: ['financial-account-transactions-all', faIds],
    queryFn: async () => {
      const results = await Promise.all(
        faIds.map(faId => getFinancialAccountTransactionsAction({
          financialAccountId: faId, stripeSecretKey, accountId: account!.id,
        }))
      );
      return results.flat();
    },
    enabled: !!account && faIds.length > 0,
  });

  const transactions = useMemo(() => {
    if (!allFaTransactions) return undefined;
    return [...allFaTransactions].sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );
  }, [allFaTransactions]);

  const { data: financialAddresses } = useQuery({
    queryKey: ['financial-addresses', currentFA?.id, stripeSecretKey],
    queryFn: () => getFinancialAddressesAction({
      financialAccountId: currentFA!.id, stripeSecretKey, accountId: account!.id,
    }),
    enabled: !!currentFA,
  });

  // ─── Derived data ─────────────────────────────────────────────────────────

  const fmt = (value: number | undefined, currency: string | undefined) => {
    if (value === undefined || !currency) return '—';
    return formatPrice(value, language as SupportedLanguage, currency as CurrencyCode);
  };

  const primaryBalance = useMemo(() => {
    if (!financialAccounts || financialAccounts.length === 0) return null;
    let total = 0;
    let currency = 'gbp';
    for (const fa of financialAccounts) {
      if (!fa.balance?.available) continue;
      const entries = Object.entries(fa.balance.available);
      if (entries.length > 0) {
        total += (entries[0][1] as { value: number; currency: string }).value;
        currency = (entries[0][1] as { value: number; currency: string }).currency;
      }
    }
    return { value: total, currency };
  }, [financialAccounts]);

  const lastSettlement = useMemo(
    () => transactions?.find((tx) => (tx.balance_impact?.available?.value ?? 0) > 0) ?? null,
    [transactions],
  );

  const filteredTx = useMemo(() => {
    if (!transactions) return [];
    if (txTab === 'in') return transactions.filter(tx => (tx.balance_impact?.available?.value ?? 0) > 0).slice(0, 10);
    if (txTab === 'out') return transactions.filter(tx => (tx.balance_impact?.available?.value ?? 0) < 0).slice(0, 10);
    return transactions.slice(0, 10);
  }, [transactions, txTab]);

  const hasFinancialAddress = financialAddresses && financialAddresses.length > 0;

  const formatTxDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(language || 'en', { month: 'short', day: 'numeric' });

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      inbound_transfer: 'Inbound Transfer', outbound_payment: 'Outbound Payment',
      outbound_transfer: 'Outbound Transfer', received_credit: 'Settlement',
      received_debit: 'Received Debit', stripe_fee: 'Stripe Fee',
    };
    return labels[category] || category;
  };

  const handleRequestAddress = () => {
    if (!account || !currentFA) return;
    const walletCurrency: string = ((currentFA as any).storage?.holds_currencies as string[] | undefined)?.[0] ?? 'gbp';
    createFinancialAddressAction({
      accountId: account.id, financialAccountId: currentFA.id,
      currency: walletCurrency, stripeSecretKey,
    }).then(() => queryClient.invalidateQueries({ queryKey: ['financial-addresses', currentFA.id] }));
  };

  const handleTopUp = async (amount: number) => {
    if (!account || !currentFA || !financialAddresses?.[0]) return;
    setIsTopUpPending(true);
    try {
      await fundFinancialAccountAction({
        accountId: account.id, financialAccountId: currentFA.id,
        financialAddressId: (financialAddresses[0] as { id: string }).id,
        amount, currency: primaryBalance?.currency ?? 'gbp', stripeSecretKey,
      });
      queryClient.invalidateQueries({ queryKey: ['financial-accounts', account.id, stripeSecretKey] });
      queryClient.invalidateQueries({ queryKey: ['financial-account-transactions', currentFA.id] });
    } finally { setIsTopUpPending(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const DEMO_PERSONA_NAME = 'Eric Harmon';
  const DEMO_COMPANY_NAME = 'Triathlon Ireland';

  return (
    <div style={{ maxWidth: 900 }}>

      {/* Welcome */}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
        Welcome to {DEMO_PERSONA_NAME}&apos;s Home
      </h1>
      <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 20px' }}>{DEMO_COMPANY_NAME} · Hope you are having a great day!</p>

      {/* ── Available balance card ─────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderTop: `4px solid ${BLUE}`, borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,.08)', padding: '26px 28px',
        marginBottom: 18, display: 'flex', alignItems: 'flex-end', gap: 32, flexWrap: 'wrap' as const,
      }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#8892A0', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
            Available balance
          </div>
          {isAccountsPending ? (
            <>
              <Skeleton className='h-10 w-48 mb-2' />
              <Skeleton className='h-4 w-64' />
            </>
          ) : (
            <>
              <button
                onClick={() => router.push(`/${language}/dashboard/financial-accounts`)}
                style={{ fontSize: 36, fontWeight: 700, color: '#323E48', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' as const, display: 'block' }}
                title="View all accounts"
              >
                {primaryBalance
                  ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: primaryBalance.currency.toUpperCase(), minimumFractionDigits: 2 }).format(primaryBalance.value / 100)
                  : '£0.00'
                }
              </button>
              <div style={{ fontSize: 13, color: '#4D5761', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: BLUE, display: 'inline-flex' }}>
                  <IArrowUp style={{ transform: 'rotate(180deg)' }} />
                </span>
                {lastSettlement ? (
                  <>
                    Last settlement{' '}
                    <b style={{ color: '#323E48', fontWeight: 600 }}>
                      {fmt(lastSettlement.amount?.value, lastSettlement.amount?.currency)}
                    </b>
                    {' · '}
                    {formatTxDate(lastSettlement.created)}{' '}
                    {new Date(lastSettlement.created).toLocaleTimeString(language || 'en', { hour: '2-digit', minute: '2-digit' })}
                  </>
                ) : (
                  <span>No settlements yet — fund this account to get started</span>
                )}
              </div>
              {!hasFinancialAddress && currentFA && (
                <button
                  onClick={handleRequestAddress}
                  style={{ marginTop: 10, fontSize: 13, color: BLUE, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                >
                  + Request sort code &amp; account number
                </button>
              )}
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => router.push(`/${language}/dashboard/financial-accounts`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: BLUE, color: '#fff', border: 'none' }}
          >
            See details <IArrowR />
          </button>
        </div>
      </div>

      {/* ── Corporate card banner ──────────────────────────────────────────── */}
      <div style={{
        background: '#1C2B47', color: '#fff', borderRadius: 8,
        padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 24,
        overflow: 'hidden', position: 'relative', flexWrap: 'wrap' as const, marginBottom: 22,
      }}>
        <div style={{
          width: 140, height: 88, borderRadius: 8,
          background: 'linear-gradient(135deg, #162238 0%, #1C2B47 100%)',
          border: '1px solid #253759', padding: '12px 14px', flexShrink: 0,
          display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between',
          position: 'relative', boxShadow: '0 6px 16px rgba(0,0,0,.25)',
        }}>
          <div style={{ position: 'absolute', top: 32, left: 12, width: 22, height: 16, borderRadius: 3, background: 'linear-gradient(135deg, #c8a64b, #f5d678)' }} />
          <span style={{ fontSize: 11, color: '#8892A0', letterSpacing: '.12em', fontVariantNumeric: 'tabular-nums' }}>•••• 4421</span>
          <div style={{ alignSelf: 'flex-end', width: 18, height: 18, borderRadius: 999, background: BLUE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ICheck />
          </div>
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 0, position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: BLUE, marginBottom: 6 }}>Corporate Card</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', margin: '0 0 6px' }}>Spend directly from your wallet</h3>
          <p style={{ color: '#cfd4da', fontSize: 13, maxWidth: 540, margin: 0 }}>The AccountsIQ Corporate Card draws funds straight from your available balance — no top-ups, no waiting for settlements.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexShrink: 0, position: 'relative' }}>
          <button
            onClick={() => firstFaId && router.push(`/${language}/dashboard/financial-accounts/${firstFaId}?tab=cards`)}
            style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.3)', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            View cards
          </button>
          <button
            onClick={() => firstFaId && router.push(`/${language}/dashboard/financial-accounts/${firstFaId}?tab=cards`)}
            style={{ background: BLUE, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ICard /> Issue a card
          </button>
        </div>
      </div>

      {/* ── My activity tiles ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>My activity tiles</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 999, background: BLUE, color: '#fff', fontSize: 10, fontWeight: 700 }}>1</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'AP inbox traffic',  value: '4',      sub: 'to be processed',     highlight: false, href: null },
          { label: 'AP invoices',       value: '24',     sub: 'approved',             highlight: false, href: null },
          { label: 'AP invoices',       value: '£124.8K',sub: 'GBP due',              highlight: true,  href: `/${language}/demo/supplier-payments` },
          { label: 'PO tracker',        value: '46',     sub: 'not yet delivered',    highlight: false, href: null },
        ].map(({ label, value, sub, highlight, href }) => {
          const card = (
            <div style={{
              background: '#fff', borderRadius: 10, padding: '18px 20px',
              border: `1px solid ${highlight ? BLUE : '#E5E7EB'}`,
              boxShadow: highlight ? `0 0 0 1.5px ${BLUE}` : '0 1px 3px rgba(0,0,0,.06)',
              cursor: href ? 'pointer' : 'default',
            }}>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px' }}>{label}</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: highlight ? BLUE : '#111827', margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{sub}</p>
            </div>
          );
          return href ? <Link key={label + value} href={href} style={{ textDecoration: 'none' }}>{card}</Link> : <div key={label + value}>{card}</div>;
        })}
      </div>

      {/* ── My insight tiles ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>My insight tiles</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 999, background: BLUE, color: '#fff', fontSize: 10, fontWeight: 700 }}>2</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Creditor days',       value: '33,511',   sub: '',                              accent: false },
          { label: 'Purchase accruals',   value: '£180,251', sub: '53 commitments',                accent: false },
          { label: 'Approval efficiency', value: '71.9%',    sub: '4 approvers holding 6 docs',    accent: true  },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} style={{
            background: '#fff', borderRadius: 10, padding: '18px 20px',
            border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,.06)',
          }}>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: accent ? GREEN_ACCENT : '#111827', margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            {sub && <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Recent activity ───────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,.08)', padding: '22px 24px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#323E48', margin: 0, letterSpacing: '-0.01em' }}>Recent activity</h3>
            <div style={{ fontSize: 12, color: '#8892A0', marginTop: 2 }}>Last 10 transactions across all accounts</div>
          </div>
          <div style={{ display: 'inline-flex', background: '#F4F4F4', borderRadius: 6, padding: 2 }}>
            {(['all', 'in', 'out'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setTxTab(tab)}
                style={{ border: 'none', padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 4, cursor: 'pointer', background: txTab === tab ? '#fff' : 'transparent', color: txTab === tab ? '#323E48' : '#4D5761', boxShadow: txTab === tab ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isTransactionsPending ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {[...Array(5)].map((_, i) => <Skeleton key={i} className='h-10 w-full' />)}
          </div>
        ) : filteredTx.length > 0 ? (
          filteredTx.map((tx) => {
            const impact = tx.balance_impact?.available?.value ?? 0;
            const isCredit = impact >= 0;
            const isMove = tx.category === 'outbound_transfer' || tx.category === 'inbound_transfer';
            return (
              <div key={tx.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto auto', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F4F4F4' }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: isMove ? '#fdeed1' : isCredit ? BLUE_LIGHT : '#eaf0f6', color: isMove ? '#8b5e0b' : isCredit ? BLUE : '#3f5673', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isMove ? <ITx /> : isCredit ? <IArrowUp style={{ transform: 'rotate(180deg)' }} /> : <IBank />}
                </span>
                <div>
                  <div style={{ fontSize: 13, color: '#323E48', fontWeight: 600 }}>{getCategoryLabel(tx.category)}</div>
                  <div style={{ fontSize: 11, color: '#8892A0', marginTop: 2 }}>{tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isCredit ? BLUE : '#323E48', fontVariantNumeric: 'tabular-nums' }}>
                  {isCredit ? '+' : ''}{fmt(impact, tx.balance_impact?.available?.currency ?? tx.amount?.currency)}
                </div>
                <div style={{ fontSize: 11, color: '#8892A0', textAlign: 'right' as const, minWidth: 90, fontVariantNumeric: 'tabular-nums' }}>
                  {formatTxDate(tx.created)}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '32px 0', textAlign: 'center' as const, color: '#8892A0', fontSize: 13 }}>No transactions yet</div>
        )}
      </div>

      {/* ── Simulate settlement (dev tool, kept for demos) ────────────────── */}
      {hasFinancialAddress && (
        <div style={{ borderRadius: 6, border: '1px dashed #D8DCE0', background: '#FAFBFC', padding: '16px 18px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8892A0' }}>Simulate settlement</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
            {[500_00, 1000_00, 2500_00, 5000_00].map(amount => (
              <button
                key={amount}
                disabled={isTopUpPending}
                onClick={() => handleTopUp(amount)}
                style={{ padding: '7px 12px', borderRadius: 4, border: '1px solid #D8DCE0', background: '#fff', fontSize: 12, fontWeight: 500, color: '#4D5761', cursor: 'pointer', opacity: isTopUpPending ? 0.5 : 1 }}
              >
                {fmt(amount, primaryBalance?.currency ?? 'gbp')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1C2B47', color: '#fff', padding: '12px 18px', borderRadius: 6, boxShadow: '0 8px 20px rgba(0,0,0,.20)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500, zIndex: 50 }}>
          <span style={{ width: 22, height: 22, borderRadius: 999, background: BLUE, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <ICheck />
          </span>
          {toast}
        </div>
      )}

    </div>
  );
};

export default WalletPage;
