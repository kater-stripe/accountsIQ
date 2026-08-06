'use client';

import { getFinancialAccounts as getFinancialAccountsAction } from '@/app/api/money-management/financial-accounts/getFinancialAccounts';
import { createFinancialAccount as createFinancialAccountAction } from '@/app/api/money-management/financial-accounts/createFinancialAccount';
import { getFinancialAddresses as getFinancialAddressesAction } from '@/app/api/money-management/financial-addresses/getFinancialAddresses';
import { createFinancialAddress as createFinancialAddressAction } from '@/app/api/money-management/financial-addresses/createFinancialAddress';
import { getFinancialAccountTransactions as getFinancialAccountTransactionsAction } from '@/app/api/money-management/financial-accounts/getFinancialAccountTransactions';
import { Skeleton } from '@/components/common/Skeleton';
import { CreateFinancialAccountModal } from '@/components/financial-account/CreateFinancialAccountModal';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Stripe } from 'stripe';

// ─── Icons ────────────────────────────────────────────────────────────────────
type SvgProps = React.SVGProps<SVGSVGElement>;

const IArrowR = (p: SvgProps) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IArrowUp = (p: SvgProps) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
);
const IPlus = (p: SvgProps) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const ICopy = (p: SvgProps) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const ICheck = (p: SvgProps) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─── Per-FA card ──────────────────────────────────────────────────────────────

type FACardProps = {
  fa: Stripe.V2.MoneyManagement.FinancialAccount;
  index: number;
  language: string;
  stripeSecretKey: string | undefined;
  accountId: string;
};

const BORDER_COLORS = ['#3B6AE8', '#1C2B47', '#4D5761'];

const FACard = ({ fa, index, language, stripeSecretKey, accountId }: FACardProps) => {
  const router = useRouter();
  const borderColor = BORDER_COLORS[index % BORDER_COLORS.length];
  const [copied, setCopied] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: addresses, isPending: isAddressesPending } = useQuery({
    queryKey: ['financial-addresses', fa.id, stripeSecretKey],
    queryFn: () => getFinancialAddressesAction({ financialAccountId: fa.id, stripeSecretKey, accountId }),
    enabled: !!accountId,
  });

  const faCurrency: string = ((fa as any).storage?.holds_currencies as string[] | undefined)?.[0] ?? 'gbp';

  const { mutate: requestAddress, isPending: isRequestingAddress } = useMutation({
    mutationFn: () => createFinancialAddressAction({ accountId, financialAccountId: fa.id, currency: faCurrency, stripeSecretKey }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-addresses', fa.id, stripeSecretKey] }),
    onError: () => queryClient.invalidateQueries({ queryKey: ['financial-addresses', fa.id, stripeSecretKey] }),
  });

  const { data: transactions } = useQuery({
    queryKey: ['financial-account-transactions', fa.id],
    queryFn: () => getFinancialAccountTransactionsAction({ financialAccountId: fa.id, stripeSecretKey, accountId }),
    enabled: !!accountId,
  });

  const lastTx = useMemo(
    () => transactions?.find(tx => (tx.balance_impact?.available?.value ?? 0) > 0) ?? null,
    [transactions],
  );

  const isGbpFa = faCurrency === 'gbp';
  const hasAddress = (addresses?.length ?? 0) > 0;

  const bankDetails = useMemo(() => {
    const addr = addresses?.[0];
    if (!addr) return null;
    if (addr.credentials?.type === 'gb_bank_account') {
      const gb = addr.credentials.gb_bank_account;
      return { type: 'GB', sortCode: gb?.sort_code, accountNumber: gb?.account_number };
    }
    if (addr.credentials?.type === 'us_bank_account') {
      const us = addr.credentials.us_bank_account;
      return { type: 'US', routingNumber: us?.routing_number, accountNumber: us?.account_number };
    }
    return null;
  }, [addresses]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const availableEntries = Object.entries(fa.balance?.available ?? {});
  const available = availableEntries[0]?.[1] as { value: number; currency: string } | undefined;

  const fmtAmt = (value: number, currency: string) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: 2 }).format(value / 100);

  return (
    <div style={{ background: '#fff', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,.08)', padding: '22px 24px', borderLeft: `4px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#323E48', margin: 0, letterSpacing: '-0.01em' }}>{fa.display_name ?? 'Financial Account'}</h3>
          <div style={{ fontSize: 12, color: '#8892A0', marginTop: 2 }}>{fa.id.slice(-12)}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: fa.status === 'open' ? '#EFF4FF' : '#F4F4F4', color: fa.status === 'open' ? '#3B6AE8' : '#8892A0', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' as const, padding: '3px 8px', borderRadius: 999 }}>
          {fa.status}
        </span>
      </div>

      {/* Balance */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#8892A0', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Available balance</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#323E48', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {available ? fmtAmt(available.value, available.currency) : '£0.00'}
        </div>
        {lastTx && (
          <div style={{ fontSize: 12, color: '#8892A0', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#3B6AE8' }}><IArrowUp style={{ transform: 'rotate(180deg)' }} /></span>
            Last settlement{' '}
            <span style={{ fontWeight: 600, color: '#323E48' }}>
              {lastTx.amount?.value != null ? fmtAmt(lastTx.amount.value, lastTx.amount.currency!) : '—'}
            </span>
            {' · '}
            {new Date(lastTx.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>

      {/* Bank details — only for GBP accounts */}
      {isGbpFa && isAddressesPending ? (
        <div style={{ height: 40, marginBottom: 16 }} />
      ) : isGbpFa && !bankDetails && !hasAddress ? (
        <div style={{ paddingTop: 14, paddingBottom: 14, borderTop: '1px solid #F4F4F4', marginBottom: 16 }}>
          <button
            onClick={() => requestAddress()}
            disabled={isRequestingAddress}
            style={{ fontSize: 12, color: '#3B6AE8', background: 'none', border: 'none', cursor: isRequestingAddress ? 'not-allowed' : 'pointer', padding: 0, fontWeight: 600, opacity: isRequestingAddress ? 0.6 : 1 }}
          >
            {isRequestingAddress ? 'Requesting…' : '+ Request sort code & account number'}
          </button>
        </div>
      ) : isGbpFa && !bankDetails && hasAddress ? (
        <div style={{ paddingTop: 14, paddingBottom: 14, borderTop: '1px solid #F4F4F4', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#8892A0', fontStyle: 'italic' }}>Bank details provisioning…</div>
        </div>
      ) : isGbpFa && bankDetails ? (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, paddingTop: 14, paddingBottom: 14, borderTop: '1px solid #F4F4F4' }}>
          {bankDetails.type === 'GB' && bankDetails.sortCode && (
            <div>
              <div style={{ fontSize: 10, color: '#8892A0', textTransform: 'uppercase' as const, letterSpacing: '.04em', marginBottom: 2 }}>Sort code</div>
              <button onClick={() => copy(bankDetails.sortCode!, 'sort')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#323E48', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {bankDetails.sortCode} {copied === 'sort' ? <ICheck style={{ color: '#3B6AE8' }} /> : <ICopy style={{ color: '#8892A0' }} />}
              </button>
            </div>
          )}
          {bankDetails.accountNumber && (
            <div>
              <div style={{ fontSize: 10, color: '#8892A0', textTransform: 'uppercase' as const, letterSpacing: '.04em', marginBottom: 2 }}>Account number</div>
              <button onClick={() => copy(bankDetails.accountNumber!, 'acct')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#323E48', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {bankDetails.accountNumber} {copied === 'acct' ? <ICheck style={{ color: '#3B6AE8' }} /> : <ICopy style={{ color: '#8892A0' }} />}
              </button>
            </div>
          )}
          {bankDetails.type === 'US' && bankDetails.routingNumber && (
            <div>
              <div style={{ fontSize: 10, color: '#8892A0', textTransform: 'uppercase' as const, letterSpacing: '.04em', marginBottom: 2 }}>Routing number</div>
              <button onClick={() => copy(bankDetails.routingNumber!, 'routing')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#323E48', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {bankDetails.routingNumber} {copied === 'routing' ? <ICheck style={{ color: '#3B6AE8' }} /> : <ICopy style={{ color: '#8892A0' }} />}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Action */}
      <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #F4F4F4' }}>
        <button
          onClick={() => router.push(`/${language}/dashboard/financial-accounts/${fa.id}`)}
          style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#3B6AE8', color: '#fff', border: 'none' }}
        >
          See details <IArrowR />
        </button>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const FinancialAccountsPage = () => {
  const { stripeSecretKey, language } = useDemoConfig();
  const { account } = useDemoMerchant();
  const queryClient = useQueryClient();
  const autoCreateAttempted = useRef(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: financialAccounts, isPending } = useQuery({
    queryKey: ['financial-accounts', account?.id, stripeSecretKey],
    queryFn: () => getFinancialAccountsAction({ accountId: account!.id, stripeSecretKey }),
    enabled: !!account,
  });

  // Auto-create if none
  useEffect(() => {
    if (autoCreateAttempted.current || isPending || !account?.id || !financialAccounts || financialAccounts.length > 0) return;
    autoCreateAttempted.current = true;
    createFinancialAccountAction({ name: 'AccountsIQ Wallet', accountId: account.id, stripeSecretKey })
      .then(() => queryClient.invalidateQueries({ queryKey: ['financial-accounts', account.id, stripeSecretKey] }))
      .catch(err => console.error('Auto-create FA failed:', err));
  }, [isPending, financialAccounts, account?.id]);

  const sorted = useMemo(() => {
    if (!financialAccounts) return [];
    return [...financialAccounts].sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
  }, [financialAccounts]);

  // Totals across all FAs
  const totalBalance = useMemo(() => {
    if (!financialAccounts) return null;
    let total = 0, currency = 'gbp';
    for (const fa of financialAccounts) {
      const entries = Object.entries(fa.balance?.available ?? {});
      if (entries.length > 0) {
        total += (entries[0][1] as { value: number; currency: string }).value;
        currency = (entries[0][1] as { value: number; currency: string }).currency;
      }
    }
    return { value: total, currency };
  }, [financialAccounts]);

  return (
    <>
      <CreateFinancialAccountModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Summary bar */}
      <div style={{ background: '#fff', borderTop: '4px solid #3B6AE8', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,.08)', padding: '22px 28px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' as const }}>
        <div style={{ flex: '1 1 240px' }}>
          <div style={{ fontSize: 11, color: '#8892A0', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Total available balance</div>
          {isPending ? (
            <Skeleton className='h-10 w-40' />
          ) : (
            <div style={{ fontSize: 32, fontWeight: 700, color: '#323E48', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {totalBalance
                ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: totalBalance.currency.toUpperCase(), minimumFractionDigits: 2 }).format(totalBalance.value / 100)
                : '£0.00'}
            </div>
          )}
          <div style={{ fontSize: 12, color: '#8892A0', marginTop: 6 }}>
            Across {sorted.length} account{sorted.length === 1 ? '' : 's'}
          </div>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#3B6AE8', color: '#fff', border: 'none' }}
        >
          <IPlus /> New account
        </button>
      </div>

      {/* FA cards grid */}
      {isPending ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {[...Array(2)].map((_, i) => <Skeleton key={i} className='h-56 w-full' />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {sorted.map((fa, i) => (
            <FACard
              key={fa.id}
              fa={fa as Stripe.V2.MoneyManagement.FinancialAccount}
              index={i}
              language={language}
              stripeSecretKey={stripeSecretKey}
              accountId={account!.id}
            />
          ))}
          {/* Add account card */}
          <button
            onClick={() => setIsCreateOpen(true)}
            style={{ background: '#fff', border: '2px dashed #D8DCE0', borderRadius: 6, padding: '22px 24px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 8, color: '#8892A0', cursor: 'pointer', fontSize: 13, fontWeight: 500, minHeight: 160 }}
          >
            <IPlus />
            Create a new account
          </button>
        </div>
      )}
    </>
  );
};

export default FinancialAccountsPage;
