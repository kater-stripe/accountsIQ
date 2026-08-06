'use client';

import { useQuery } from '@tanstack/react-query';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { getFinancialAccounts as getFinancialAccountsAction } from '@/app/api/money-management/financial-accounts/getFinancialAccounts';
import { getFinancialAccountTransactions as getFinancialAccountTransactionsAction } from '@/app/api/money-management/financial-accounts/getFinancialAccountTransactions';
import { formatPrice } from '@/utils/formatPrice';
import { Skeleton } from '@/components/common/Skeleton';
import { useMemo } from 'react';
import type { CurrencyCode } from '@/constants/currencyCodes';
import type { SupportedLanguage } from '@/constants/languages';

const BLUE = '#3B6AE8';
const NAVY = '#1C2B47';

const CATEGORY_LABELS: Record<string, string> = {
  inbound_transfer: 'Inbound Transfer',
  outbound_transfer: 'Outbound Transfer',
  outbound_payment: 'Supplier Payment',
  inbound_payment: 'Incoming Payment',
  issuing_authorization_hold: 'Card Hold',
  issuing_capture: 'Card Spend',
  issuing_refund: 'Card Refund',
  stripe_fee: 'Stripe Fee',
  financial_account_credit: 'Credit',
  financial_account_debit: 'Debit',
};

const getCatLabel = (cat: string) => CATEGORY_LABELS[cat] ?? cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const ReportsPage = () => {
  const { stripeSecretKey, language } = useDemoConfig();
  const { account } = useDemoMerchant();

  const { data: financialAccounts, isPending: faLoading } = useQuery({
    queryKey: ['financial-accounts', account?.id, stripeSecretKey],
    queryFn: () => getFinancialAccountsAction({ accountId: account!.id, stripeSecretKey }),
    enabled: !!account,
    staleTime: 0,
  });

  const faIds = useMemo(() => financialAccounts?.map(fa => fa.id) ?? [], [financialAccounts]);

  const { data: allTx, isPending: txLoading } = useQuery({
    queryKey: ['report-transactions', faIds],
    queryFn: async () => {
      const results = await Promise.all(
        faIds.map(faId => getFinancialAccountTransactionsAction({
          financialAccountId: faId, stripeSecretKey, accountId: account!.id,
        }))
      );
      return results.flat();
    },
    enabled: !!account && faIds.length > 0,
    staleTime: 0,
  });

  const isLoading = faLoading || txLoading;

  const fmt = (value: number | undefined, currency: string | undefined) => {
    if (value === undefined || !currency) return '—';
    return formatPrice(value, language as SupportedLanguage, currency as CurrencyCode);
  };

  // ─── Aggregates ──────────────────────────────────────────────────────────────

  const { totalBalance, balanceCurrency } = useMemo(() => {
    if (!financialAccounts?.length) return { totalBalance: 0, balanceCurrency: 'gbp' };
    let total = 0;
    let currency = 'gbp';
    for (const fa of financialAccounts) {
      const entries = Object.entries(fa.balance?.available ?? {});
      if (entries.length) {
        total += (entries[0][1] as any).value ?? 0;
        currency = (entries[0][1] as any).currency ?? currency;
      }
    }
    return { totalBalance: total, balanceCurrency: currency };
  }, [financialAccounts]);

  const { totalIn, totalOut, txCurrency } = useMemo(() => {
    if (!allTx?.length) return { totalIn: 0, totalOut: 0, txCurrency: balanceCurrency };
    let inn = 0, out = 0, currency = balanceCurrency;
    for (const tx of allTx) {
      const impact = tx.balance_impact?.available?.value ?? 0;
      currency = tx.balance_impact?.available?.currency ?? tx.amount?.currency ?? currency;
      if (impact > 0) inn += impact;
      else out += Math.abs(impact);
    }
    return { totalIn: inn, totalOut: out, txCurrency: currency };
  }, [allTx, balanceCurrency]);

  // Monthly inflow/outflow for bar chart (last 6 months)
  const monthlyData = useMemo(() => {
    const months: Record<string, { label: string; in: number; out: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { label: d.toLocaleString(language || 'en', { month: 'short' }), in: 0, out: 0 };
    }
    for (const tx of allTx ?? []) {
      const d = new Date(tx.created);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) continue;
      const impact = tx.balance_impact?.available?.value ?? 0;
      if (impact > 0) months[key].in += impact;
      else months[key].out += Math.abs(impact);
    }
    return Object.values(months);
  }, [allTx, language]);

  const maxMonthly = useMemo(() => Math.max(...monthlyData.map(m => Math.max(m.in, m.out)), 1), [monthlyData]);

  // Breakdown by category
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number; currency: string }> = {};
    for (const tx of allTx ?? []) {
      const cat = getCatLabel(tx.category ?? 'unknown');
      const impact = Math.abs(tx.balance_impact?.available?.value ?? tx.amount?.value ?? 0);
      const currency = tx.balance_impact?.available?.currency ?? tx.amount?.currency ?? txCurrency;
      if (!map[cat]) map[cat] = { count: 0, total: 0, currency };
      map[cat].count++;
      map[cat].total += impact;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8);
  }, [allTx, txCurrency]);

  const totalTxVolume = useMemo(() => categoryBreakdown.reduce((s, [, v]) => s + v.total, 0) || 1, [categoryBreakdown]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1000 }}>

      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Total Balance', value: fmt(totalBalance, balanceCurrency), sub: `Across ${financialAccounts?.length ?? 0} account${financialAccounts?.length !== 1 ? 's' : ''}` },
          { label: 'Total Inflows', value: fmt(totalIn, txCurrency), sub: 'All time receipts' },
          { label: 'Total Outflows', value: fmt(totalOut, txCurrency), sub: 'All time disbursements' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.07)', borderTop: `3px solid ${BLUE}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8892A0', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: 12, color: '#8892A0', marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Account balances ────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Financial Accounts</span>
        </div>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              <th style={{ textAlign: 'left', padding: '9px 20px', fontSize: 11, fontWeight: 700, color: '#8892A0', textTransform: 'uppercase', letterSpacing: '.06em' }}>Account</th>
              <th style={{ textAlign: 'left', padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#8892A0', textTransform: 'uppercase', letterSpacing: '.06em' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '9px 20px', fontSize: 11, fontWeight: 700, color: '#8892A0', textTransform: 'uppercase', letterSpacing: '.06em' }}>Available Balance</th>
            </tr>
          </thead>
          <tbody>
            {(financialAccounts ?? []).map((fa, i) => {
              const entries = Object.entries(fa.balance?.available ?? {});
              const bal = entries[0]?.[1] as any;
              return (
                <tr key={fa.id} style={{ borderTop: i > 0 ? '1px solid #F3F4F6' : undefined }}>
                  <td style={{ padding: '12px 20px', fontWeight: 600, color: '#323E48' }}>
                    {fa.display_name || `Account ${i + 1}`}
                    <span style={{ fontSize: 11, color: '#8892A0', marginLeft: 8, fontWeight: 400 }}>{fa.id.slice(-8)}</span>
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 99,
                      fontSize: 11, fontWeight: 600,
                      background: fa.status === 'open' ? '#D1FAE5' : '#FEF3C7',
                      color: fa.status === 'open' ? '#065F46' : '#92400E',
                    }}>
                      {(fa.status ?? 'unknown').charAt(0).toUpperCase() + (fa.status ?? '').slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
                    {bal ? fmt(bal.value, bal.currency) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Monthly bar chart ────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,.07)', padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Monthly Cash Flow</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 120 }}>
          {monthlyData.map((m, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, width: '100%', height: '100%', justifyContent: 'center' }}>
                <div title={`Inflow: ${fmt(m.in, txCurrency)}`} style={{ flex: 1, background: `${BLUE}cc`, borderRadius: '3px 3px 0 0', height: `${Math.round((m.in / maxMonthly) * 100)}%`, minHeight: m.in > 0 ? 4 : 0, transition: 'height .3s' }} />
                <div title={`Outflow: ${fmt(m.out, txCurrency)}`} style={{ flex: 1, background: '#E5E7EB', borderRadius: '3px 3px 0 0', height: `${Math.round((m.out / maxMonthly) * 100)}%`, minHeight: m.out > 0 ? 4 : 0, transition: 'height .3s' }} />
              </div>
              <div style={{ fontSize: 11, color: '#8892A0', fontWeight: 500 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#8892A0' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: `${BLUE}cc` }} /> Inflows
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#8892A0' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#E5E7EB' }} /> Outflows
          </div>
        </div>
      </div>

      {/* ── Transaction breakdown ─────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,.07)', padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Transaction Breakdown</div>
        {categoryBreakdown.length === 0 ? (
          <p style={{ fontSize: 13, color: '#8892A0', textAlign: 'center', padding: '24px 0' }}>No transactions yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {categoryBreakdown.map(([cat, { count, total, currency }]) => {
              const pct = Math.round((total / totalTxVolume) * 100);
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#323E48' }}>{cat}</span>
                    <span style={{ fontSize: 12, color: '#8892A0' }}>{count} txn{count !== 1 ? 's' : ''} · {fmt(total, currency)}</span>
                  </div>
                  <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: BLUE, borderRadius: 99, transition: 'width .4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent transactions ──────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Recent Transactions</span>
          <span style={{ fontSize: 11, color: '#8892A0' }}>{allTx?.length ?? 0} total</span>
        </div>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              {['Date', 'Type', 'Account', 'Status', 'Amount'].map(h => (
                <th key={h} style={{ textAlign: h === 'Amount' ? 'right' : 'left', padding: '9px 20px', fontSize: 11, fontWeight: 700, color: '#8892A0', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(allTx ?? []).slice().sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()).slice(0, 20).map((tx, i) => {
              const impact = tx.balance_impact?.available?.value ?? 0;
              const isCredit = impact >= 0;
              const currency = tx.balance_impact?.available?.currency ?? tx.amount?.currency;
              const fa = financialAccounts?.find(f => f.id === tx.financial_account);
              return (
                <tr key={tx.id} style={{ borderTop: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '11px 20px', color: '#8892A0', whiteSpace: 'nowrap' }}>
                    {new Date(tx.created).toLocaleDateString(language || 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '11px 20px', fontWeight: 600, color: '#323E48' }}>{getCatLabel(tx.category ?? '')}</td>
                  <td style={{ padding: '11px 20px', color: '#8892A0', fontSize: 12 }}>{fa?.display_name ?? '—'}</td>
                  <td style={{ padding: '11px 20px' }}>
                    <span style={{
                      display: 'inline-flex', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: tx.status === 'posted' ? '#D1FAE5' : '#FEF3C7',
                      color: tx.status === 'posted' ? '#065F46' : '#92400E',
                    }}>
                      {(tx.status ?? '').charAt(0).toUpperCase() + (tx.status ?? '').slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '11px 20px', textAlign: 'right', fontWeight: 700, color: isCredit ? BLUE : NAVY, fontVariantNumeric: 'tabular-nums' }}>
                    {isCredit ? '+' : ''}{fmt(impact, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(allTx?.length ?? 0) === 0 && (
          <p style={{ fontSize: 13, color: '#8892A0', textAlign: 'center', padding: '24px 0' }}>No transactions yet</p>
        )}
      </div>

    </div>
  );
};

export default ReportsPage;
