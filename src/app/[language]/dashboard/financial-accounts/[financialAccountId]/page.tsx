'use client';

import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { getFinancialAccount as getFinancialAccountAction } from '@/app/api/money-management/financial-accounts/getFinancialAccount';
import { getFinancialAccountTransactions as getFinancialAccountTransactionsAction } from '@/app/api/money-management/financial-accounts/getFinancialAccountTransactions';
import { getFinancialAddresses as getFinancialAddressesAction } from '@/app/api/money-management/financial-addresses/getFinancialAddresses';
import { createFinancialAddress as createFinancialAddressAction } from '@/app/api/money-management/financial-addresses/createFinancialAddress';
import { fundFinancialAccount as fundFinancialAccountAction } from '@/app/api/money-management/financial-accounts/fundFinancialAccount';
import { getBalanceSettings as getBalanceSettingsAction } from '@/app/api/balance-settings/getBalanceSettings';
import { MoveMoneyModal } from '@/components/financial-account/MoveMoneyModal';
import { TransferModal } from '@/components/financial-account/TransferModal';
import { PaymentModal } from '@/components/financial-account/PaymentModal';
import { UseForPayoutsModal } from '@/components/financial-account/UseForPayoutsModal';
import { CardsList } from '@/components/issuing/CardsList';
import { Skeleton } from '@/components/common/Skeleton';
import { formatPrice } from '@/utils/formatPrice';
import type { CurrencyCode } from '@/constants/currencyCodes';
import type { SupportedLanguage } from '@/constants/languages';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ─── Icons ─────────────────────────────────────────────────────────────────────
type SvgProps = React.SVGProps<SVGSVGElement>;

const IArrowL = (p: SvgProps) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
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

type FATab = 'transactions' | 'cards';

const FinancialAccountPage = () => {
  const { financialAccountId } = useParams<{ financialAccountId: string }>();
  const { stripeSecretKey, language } = useDemoConfig();
  const { account } = useDemoMerchant();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [isMoveMoneyModalOpen, setIsMoveMoneyModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isUseForPayoutsModalOpen, setIsUseForPayoutsModalOpen] = useState(false);
  const [showFullAccountNumber, setShowFullAccountNumber] = useState(false);
  const [activeTab, setActiveTab] = useState<FATab>(searchParams.get('tab') === 'cards' ? 'cards' : 'transactions');
  const [isTopUpPending, setIsTopUpPending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: financialAccount, isPending: isAccountPending } = useQuery({
    queryKey: ['financial-account', financialAccountId],
    queryFn: () => getFinancialAccountAction({ financialAccountId, stripeSecretKey, accountId: account!.id }),
    enabled: !!account,
  });

  const { data: transactions, isPending: isTransactionsPending } = useQuery({
    queryKey: ['financial-account-transactions', financialAccountId],
    queryFn: () => getFinancialAccountTransactionsAction({ financialAccountId, stripeSecretKey, accountId: account!.id }),
    enabled: !!account,
  });

  const { data: balanceSettings } = useQuery({
    queryKey: ['balance-settings', account?.id],
    queryFn: () => getBalanceSettingsAction({ stripeSecretKey, accountId: account!.id }),
    enabled: !!account,
  });

  const { data: financialAddresses } = useQuery({
    queryKey: ['financial-addresses', financialAccountId, stripeSecretKey],
    queryFn: () => getFinancialAddressesAction({ financialAccountId, stripeSecretKey, accountId: account!.id }),
    enabled: !!account,
  });

  const faCurrency: string = ((financialAccount as any)?.storage?.holds_currencies as string[] | undefined)?.[0] ?? 'gbp';

  const { mutate: createAddress, isPending: isCreatingAddress } = useMutation({
    mutationFn: () => createFinancialAddressAction({
      accountId: account!.id,
      financialAccountId,
      currency: faCurrency,
      stripeSecretKey,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-addresses', financialAccountId, stripeSecretKey] }),
    onError: () => queryClient.invalidateQueries({ queryKey: ['financial-addresses', financialAccountId, stripeSecretKey] }),
  });

  const hasAddress = (financialAddresses?.length ?? 0) > 0;

  const bankDetails = (() => {
    const addr = financialAddresses?.[0];
    if (!addr) return null;
    if (addr.credentials?.type === 'gb_bank_account') {
      const gb = addr.credentials.gb_bank_account;
      return { type: 'GB', sortCode: gb?.sort_code, accountNumber: gb?.account_number, last4: gb?.last4 };
    }
    if (addr.credentials?.type === 'us_bank_account') {
      const us = addr.credentials.us_bank_account;
      return { type: 'US', routingNumber: us?.routing_number, accountNumber: us?.account_number, last4: us?.last4 };
    }
    return null;
  })();

  const isAutoPayoutsEnabled = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rules = (balanceSettings?.payments?.payouts as any)?.automatic_transfer_rules_by_currency;
    if (!rules) return false;
    return Object.values(rules).some((currencyRules) =>
      (currencyRules as Array<{ payout_method: string }>)?.some((rule) => rule.payout_method === financialAccountId),
    );
  })();

  const handleTopUp = async () => {
    if (!account || !financialAddresses?.length) return;
    const faCurrency = financialAccount?.storage?.holds_currencies?.[0] ?? 'gbp';
    setIsTopUpPending(true);
    try {
      await fundFinancialAccountAction({
        accountId: account.id,
        financialAccountId,
        financialAddressId: (financialAddresses[0] as any).id,
        amount: 50000,
        currency: faCurrency,
        stripeSecretKey,
      });
      queryClient.invalidateQueries({ queryKey: ['financial-account', financialAccountId] });
      queryClient.invalidateQueries({ queryKey: ['financial-account-transactions', financialAccountId] });
    } finally {
      setIsTopUpPending(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const totalBalance = (() => {
    if (!financialAccount?.balance?.available) return null;
    const entries = Object.entries(financialAccount.balance.available);
    return entries.length > 0 ? entries[0][1] : null;
  })();

  const fmt = (value: number | undefined, currency: string | undefined) => {
    if (value === undefined || currency === undefined) return '—';
    return formatPrice(value, language as SupportedLanguage, currency as CurrencyCode);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const categoryLabel: Record<string, string> = {
    adjustment: 'Adjustment', currency_conversion: 'Currency Conversion',
    inbound_transfer: 'Inbound Transfer', outbound_payment: 'Outbound Payment',
    outbound_transfer: 'Outbound Transfer', received_credit: 'Received Credit',
    received_debit: 'Received Debit', return: 'Return', stripe_fee: 'Stripe Fee',
  };

  return (
    <>
      {financialAccount && (
        <>
          <MoveMoneyModal open={isMoveMoneyModalOpen} onClose={() => setIsMoveMoneyModalOpen(false)} financialAccount={financialAccount} onSelectTransfer={() => { setIsMoveMoneyModalOpen(false); setIsTransferModalOpen(true); }} onSelectPayment={() => { setIsMoveMoneyModalOpen(false); setIsPaymentModalOpen(true); }} />
          <TransferModal open={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} sourceFinancialAccount={financialAccount} />
          <PaymentModal open={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} sourceFinancialAccount={financialAccount} />
          <UseForPayoutsModal open={isUseForPayoutsModalOpen} onClose={() => setIsUseForPayoutsModalOpen(false)} financialAccount={financialAccount} isCurrentlyEnabled={isAutoPayoutsEnabled} />
        </>
      )}

      {/* Back nav */}
      <button
        onClick={() => router.push(`/${language}/dashboard/financial-accounts`)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#8892A0', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20 }}
      >
        <IArrowL /> All accounts
      </button>

      {/* Balance card */}
      <div style={{ background: '#fff', borderLeft: '4px solid #3B6AE8', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,.08)', padding: '24px 28px', marginBottom: 16 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12, marginBottom: 20 }}>
          <div>
            {isAccountPending ? <Skeleton className='h-6 w-40 mb-1' /> : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#323E48', margin: 0, letterSpacing: '-0.01em' }}>
                  {financialAccount?.display_name ?? 'Financial Account'}
                </h2>
                {isAutoPayoutsEnabled && (
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' as const, background: '#EFF4FF', color: '#3B6AE8', padding: '3px 8px', borderRadius: 999 }}>Auto payouts active</span>
                )}
              </div>
            )}
            {/* Account number / sort code inline */}
            {bankDetails ? (
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
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
                      {showFullAccountNumber ? bankDetails.accountNumber : `••••${bankDetails.last4}`}
                      <span onClick={(e) => { e.stopPropagation(); setShowFullAccountNumber(v => !v); }} style={{ fontSize: 11, color: '#8892A0', cursor: 'pointer', marginLeft: 2 }}>{showFullAccountNumber ? 'hide' : 'show'}</span>
                      {copied === 'acct' ? <ICheck style={{ color: '#3B6AE8' }} /> : <ICopy style={{ color: '#8892A0' }} />}
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
            ) : hasAddress ? (
              <div style={{ fontSize: 12, color: '#8892A0', marginTop: 6, fontStyle: 'italic' }}>Bank details provisioning…</div>
            ) : (
              <button onClick={() => createAddress()} disabled={isCreatingAddress} style={{ marginTop: 6, fontSize: 12, color: '#3B6AE8', background: 'none', border: 'none', cursor: isCreatingAddress ? 'not-allowed' : 'pointer', padding: 0, fontWeight: 600, opacity: isCreatingAddress ? 0.6 : 1 }}>
                {isCreatingAddress ? 'Requesting…' : '+ Request sort code & account number'}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            <button
              onClick={handleTopUp}
              disabled={isAccountPending || !financialAccount || !hasAddress || isTopUpPending}
              style={{ padding: '8px 14px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: (!financialAccount || !hasAddress || isTopUpPending) ? 'not-allowed' : 'pointer', background: 'transparent', color: '#4D5761', border: '1px solid #D8DCE0', opacity: (!financialAccount || !hasAddress) ? 0.5 : 1 }}
            >
              {isTopUpPending ? 'Topping up…' : 'Top up'}
            </button>
            <button
              onClick={() => setIsUseForPayoutsModalOpen(true)}
              disabled={isAccountPending || !financialAccount}
              style={{ padding: '8px 14px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: !financialAccount ? 'not-allowed' : 'pointer', background: 'transparent', color: '#4D5761', border: '1px solid #D8DCE0', opacity: !financialAccount ? 0.5 : 1 }}
            >
              {isAutoPayoutsEnabled ? 'Manage payouts' : 'Use for payouts'}
            </button>
            <button
              onClick={() => setIsMoveMoneyModalOpen(true)}
              disabled={isAccountPending || !financialAccount}
              style={{ padding: '8px 14px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: !financialAccount ? 'not-allowed' : 'pointer', background: '#3B6AE8', color: '#fff', border: 'none', opacity: !financialAccount ? 0.5 : 1 }}
            >
              Move money
            </button>
          </div>
        </div>

        {/* Balance figures */}
        {isAccountPending ? (
          <div><Skeleton className='h-4 w-28 mb-2' /><Skeleton className='h-10 w-44' /></div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#8892A0', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Available balance</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#323E48', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {totalBalance ? fmt(totalBalance.value, totalBalance.currency) : fmt(0, 'gbp')}
              </div>
            </div>

            {/* Pending */}
            {(Object.keys(financialAccount?.balance?.inbound_pending ?? {}).length > 0 ||
              Object.keys(financialAccount?.balance?.outbound_pending ?? {}).length > 0) && (
              <div style={{ display: 'flex', gap: 32, paddingTop: 16, borderTop: '1px solid #F4F4F4' }}>
                {Object.entries(financialAccount!.balance!.inbound_pending ?? {}).map(([, bal]) => (
                  <div key='inbound'>
                    <div style={{ fontSize: 11, color: '#8892A0', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Inbound pending</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#323E48' }}>{fmt(bal?.value, bal?.currency)}</div>
                  </div>
                ))}
                {Object.entries(financialAccount!.balance!.outbound_pending ?? {}).map(([, bal]) => (
                  <div key='outbound'>
                    <div style={{ fontSize: 11, color: '#8892A0', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Outbound pending</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#323E48' }}>{fmt(bal?.value, bal?.currency)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Tabs + content */}
      <div style={{ background: '#fff', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,.08)', overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F4F4F4', padding: '0 24px' }}>
          {(['transactions', 'cards'] as FATab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ padding: '14px 0', marginRight: 24, fontSize: 13, fontWeight: 600, color: activeTab === tab ? '#3B6AE8' : '#8892A0', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#3B6AE8' : 'transparent'}`, cursor: 'pointer', textTransform: 'capitalize' as const }}
            >
              {tab === 'transactions' ? t('dashboard.expenses.financial-account.transactions') : t('dashboard.expenses.issuing-cards')}
            </button>
          ))}
        </div>

        {/* Transactions */}
        {activeTab === 'transactions' && (
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#FAFAFA' }}>
                  {['Date', 'Category', 'Amount', 'Balance Impact', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#8892A0', letterSpacing: '.04em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isTransactionsPending ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #F4F4F4' }}>
                      {[...Array(5)].map((__, j) => <td key={j} style={{ padding: '12px 16px' }}><Skeleton className='h-4 w-24' /></td>)}
                    </tr>
                  ))
                ) : transactions && transactions.length > 0 ? (
                  transactions.map((tx) => {
                    const impact = tx.balance_impact?.available?.value ?? 0;
                    const isDebit = impact < 0;
                    return (
                      <tr key={tx.id} style={{ borderTop: '1px solid #F4F4F4' }}>
                        <td style={{ padding: '12px 16px', color: '#323E48', whiteSpace: 'nowrap' as const }}>{fmtDate(tx.created)}</td>
                        <td style={{ padding: '12px 16px', color: '#4D5761' }}>{categoryLabel[tx.category] ?? tx.category}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: isDebit ? '#DC2626' : '#16A34A', whiteSpace: 'nowrap' as const }}>
                          {isDebit ? '' : '+'}{fmt(isDebit ? -(tx.amount?.value ?? 0) : (tx.amount?.value ?? 0), tx.amount?.currency)}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' as const }}>
                          {impact !== 0 && (
                            <span style={{ color: impact > 0 ? '#16A34A' : '#DC2626', fontWeight: 500 }}>
                              Available: {impact > 0 ? '+' : ''}{fmt(impact, tx.balance_impact?.available?.currency)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' as const, background: tx.status === 'posted' ? '#EFF4FF' : '#FEF3C7', color: tx.status === 'posted' ? '#3B6AE8' : '#92400E' }}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center' as const, color: '#8892A0', fontSize: 13 }}>
                      {t('dashboard.expenses.financial-account.no-transactions')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Cards */}
        {activeTab === 'cards' && (
          <div style={{ padding: 24 }}>
            <CardsList
              financialAccountId={financialAccountId}
              showCreateButton
              onCardClick={(card) => router.push(`/${language}/dashboard/cards/${card.id}`)}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default FinancialAccountPage;
