'use client';

import { useState, useEffect } from 'react';
import { useDemoConfig } from '@/context/DemoConfigContext';

const DARK_BG = '#1A1730';
const GREEN = '#16C665';
const STORAGE_KEY = 'ca_demo_wallet';
const DEFAULT_BALANCE = 4237.18;
const SPEND_AMOUNT = 285.0;
const SPEND_TXN_ID = 'issuing-spend-euro-car-parts';

const formatGBP = (n: number) =>
  '£' + new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const ISV_TABS = ['Home', 'Sam', 'Milsey', 'SAM 1', 'New Dashboard', 'TEST', 'Alex Test', 'Workshop', 'Widgets', 'Finance'];

const HISTORICAL_TXNS = [
  { date: '28 Jun', merchant: 'Shell Fuel · Birmingham Service Stn', amount: 85.2, category: 'Fuel & Travel' },
  { date: '27 Jun', merchant: 'GSF Car Parts · Coventry Road', amount: 142.5, category: 'Auto Parts' },
  { date: '25 Jun', merchant: 'Halfords Trade Account', amount: 67.8, category: 'Auto Parts' },
];

const SPEND_CONTROLS = [
  { label: 'Auto Parts & Supplies', allowed: true },
  { label: 'Fuel & Vehicle Maintenance', allowed: true },
  { label: 'Trade Suppliers', allowed: true },
  { label: 'Hospitality & Entertainment', allowed: false },
  { label: 'General Retail', allowed: false },
];

const AccountsIQLogoGreen = () => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 186 32' width='160' height='28'>
    <text y='24' fontFamily='Arial, Helvetica, sans-serif' fontWeight='700' fontSize='22' fill='white'>
      accounts
    </text>
    <text x='97' y='24' fontFamily='Arial, Helvetica, sans-serif' fontWeight='700' fontSize='22' fill={GREEN}>
      IQ
    </text>
  </svg>
);

export default function IssuingDemoPage() {
  const { language } = useDemoConfig();
  const [walletBalance, setWalletBalance] = useState(DEFAULT_BALANCE);
  const [spendDone, setSpendDone] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw);
        setWalletBalance(state.balance ?? DEFAULT_BALANCE);
        setSpendDone(
          (state.transactions ?? []).some((t: { id: string }) => t.id === SPEND_TXN_ID)
        );
      }
    } catch {}
  }, []);

  const handleSpend = () => {
    if (spendDone || processing) return;
    setProcessing(true);
    setTimeout(() => {
      const newBalance = walletBalance - SPEND_AMOUNT;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const state = raw ? JSON.parse(raw) : { balance: DEFAULT_BALANCE, transactions: [] };
        const newTxns = [
          {
            id: SPEND_TXN_ID,
            date: 'Today',
            description: 'Euro Car Parts Ltd — Card ••4421',
            amount: -SPEND_AMOUNT,
            type: 'card_spend',
          },
          ...(state.transactions ?? []),
        ].slice(0, 10);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ balance: newBalance, transactions: newTxns }));
        setWalletBalance(newBalance);
        setSpendDone(true);
      } catch {}
      setProcessing(false);
    }, 1500);
  };

  return (
    <div className='flex h-screen overflow-hidden font-sans'>
      {/* Left panel */}
      <div
        className='w-[34%] flex-shrink-0 flex flex-col justify-between p-10 select-none'
        style={{ backgroundColor: DARK_BG }}
      >
        <div>
          <AccountsIQLogoGreen />
          <p
            className='mt-3 text-xs tracking-[0.2em] uppercase font-semibold'
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            AccountsIQ Issuing
          </p>

          <h1 className='mt-8 text-3xl font-bold leading-tight text-white'>
            Spend from your<br />Wallet Balance
          </h1>

          <div className='mt-5 w-12 h-1 rounded' style={{ backgroundColor: GREEN }} />

          <ul className='mt-8 space-y-5'>
            {[
              'Corporate cards that draw directly from your AccountsIQ Wallet — no bank top-ups needed',
              'Merchant category controls — restrict spend to approved supplier types only',
              'Instant transaction visibility — every card spend reflected in your wallet immediately',
              'Per-card daily limits — defined by you, not your bank',
            ].map((point) => (
              <li key={point} className='flex items-start gap-3'>
                <span
                  className='mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0'
                  style={{ backgroundColor: GREEN }}
                />
                <span className='text-white/80 text-sm leading-relaxed'>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className='text-xs' style={{ color: 'rgba(255,255,255,0.3)' }}>
          AccountsIQ · Confidential · August 2026
        </p>
      </div>

      {/* Right panel — ISV shell */}
      <div className='flex-1 flex flex-col overflow-hidden bg-white'>
        {/* ISV top nav */}
        <div className='border-b border-gray-200 bg-white'>
          <div className='flex items-center px-6 h-12 gap-1 overflow-x-auto'>
            <div className='w-8 h-8 rounded bg-gray-200 mr-3 flex-shrink-0' />
            {ISV_TABS.map((tab) => (
              <button
                key={tab}
                className={`px-3 py-1 text-sm whitespace-nowrap rounded transition-colors ${
                  tab === 'Finance'
                    ? 'font-semibold border-b-2 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={tab === 'Finance' ? { borderColor: GREEN } : {}}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Breadcrumb + heading */}
        <div className='px-8 pt-5 pb-4 border-b border-gray-100 flex-shrink-0'>
          <div className='flex items-center justify-between'>
            <nav className='text-xs text-gray-500 mb-2'>
              <a href={`/${language}/demo/wallet`} className='hover:text-gray-700'>Wallet</a>
              <span className='mx-1.5'>›</span>
              <span>Finance</span>
              <span className='mx-1.5'>›</span>
              <span>Cards</span>
              <span className='mx-1.5'>›</span>
              <span className='text-gray-700 font-medium'>Corporate Card ••4421</span>
            </nav>
          </div>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-semibold text-gray-900'>Corporate Card</h2>
              <p className='text-sm text-gray-500 mt-0.5'>Ellie Smith · Motasoft</p>
            </div>
            {/* Live wallet balance indicator */}
            <div className='flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200'>
              <div className='w-2 h-2 rounded-full animate-pulse' style={{ backgroundColor: GREEN }} />
              <span className='text-xs text-gray-500'>Wallet balance</span>
              <span className='text-sm font-bold text-gray-900'>{formatGBP(walletBalance)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-8'>
          <div className='flex gap-8'>
            {/* Left: card visual + stats */}
            <div className='flex-shrink-0 w-72'>
              {/* Card visual */}
              <div
                className='w-full h-44 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden'
                style={{ background: `linear-gradient(135deg, ${DARK_BG} 0%, #2D2550 100%)` }}
              >
                <div className='flex justify-between items-start'>
                  <span className='text-white font-bold text-sm'>AccountsIQ</span>
                  <div className='flex'>
                    <div className='w-7 h-7 rounded-full' style={{ backgroundColor: '#EB001B', opacity: 0.8 }} />
                    <div className='w-7 h-7 rounded-full -ml-3' style={{ backgroundColor: '#F79E1B', opacity: 0.8 }} />
                  </div>
                </div>
                {/* Chip */}
                <div
                  className='w-10 h-7 rounded-md flex items-center justify-center'
                  style={{ backgroundColor: 'rgba(255,215,0,0.55)' }}
                >
                  <div className='w-6 h-4 rounded border grid grid-cols-2 gap-0.5 p-0.5' style={{ borderColor: 'rgba(255,215,0,0.3)' }}>
                    <div className='rounded-sm' style={{ backgroundColor: 'rgba(255,215,0,0.35)' }} />
                    <div className='rounded-sm' style={{ backgroundColor: 'rgba(255,215,0,0.35)' }} />
                    <div className='rounded-sm' style={{ backgroundColor: 'rgba(255,215,0,0.35)' }} />
                    <div className='rounded-sm' style={{ backgroundColor: 'rgba(255,215,0,0.35)' }} />
                  </div>
                </div>
                <div>
                  <p className='font-mono text-sm tracking-widest' style={{ color: 'rgba(255,255,255,0.55)' }}>
                    •••• •••• •••• 4421
                  </p>
                  <div className='flex justify-between mt-1'>
                    <p className='text-white text-sm font-semibold'>ELLIE SMITH</p>
                    <p className='text-xs' style={{ color: 'rgba(255,255,255,0.45)' }}>Motasoft</p>
                  </div>
                </div>
                <div className='absolute top-0 right-0 w-1 h-full rounded-r-2xl' style={{ backgroundColor: GREEN }} />
              </div>

              {/* Card stats */}
              <div className='mt-4 grid grid-cols-2 gap-3'>
                <div className='rounded-xl border border-gray-200 p-3 text-center'>
                  <p className='text-xs text-gray-500'>Available to spend</p>
                  <p className='text-lg font-bold text-gray-900 mt-0.5'>{formatGBP(walletBalance)}</p>
                  <p className='text-xs text-gray-400'>from wallet</p>
                </div>
                <div className='rounded-xl border border-gray-200 p-3 text-center'>
                  <p className='text-xs text-gray-500'>Daily limit</p>
                  <p className='text-lg font-bold text-gray-900 mt-0.5'>£500</p>
                  <p className='text-xs text-gray-400'>per card</p>
                </div>
                <div className='rounded-xl border border-gray-200 p-3 text-center col-span-2'>
                  <p className='text-xs text-gray-500'>Spent this month</p>
                  <p className='text-lg font-bold text-gray-900 mt-0.5'>
                    {formatGBP(295.5 + (spendDone ? SPEND_AMOUNT : 0))}
                  </p>
                  <p className='text-xs text-gray-400'>across {spendDone ? 4 : 3} transactions</p>
                </div>
              </div>
            </div>

            {/* Right: controls + transactions */}
            <div className='flex-1 space-y-5'>
              {/* Spend controls */}
              <div className='rounded-xl border border-gray-200 p-4'>
                <p className='text-sm font-semibold text-gray-900 mb-1'>Merchant category controls</p>
                <p className='text-xs text-gray-400 mb-3'>Restrict where this card can be used:</p>
                <div className='space-y-2.5'>
                  {SPEND_CONTROLS.map(({ label, allowed }) => (
                    <div key={label} className='flex items-center gap-3'>
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                          allowed ? 'bg-green-50' : 'bg-red-50'
                        }`}
                      >
                        {allowed ? (
                          <svg className='w-3 h-3 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                          </svg>
                        ) : (
                          <svg className='w-3 h-3 text-red-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M6 18L18 6M6 6l12 12' />
                          </svg>
                        )}
                      </div>
                      <span className='text-sm text-gray-700'>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction list */}
              <div className='rounded-xl border border-gray-200 overflow-hidden'>
                <div className='flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200'>
                  <p className='text-xs font-semibold text-gray-700 uppercase tracking-widest'>Transactions</p>
                  <span className='text-xs text-gray-400'>Card ••4421</span>
                </div>
                <div>
                  {/* Live spend — appears after simulation */}
                  {spendDone && (
                    <div className='flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-green-50/60'>
                      <div className='flex items-center gap-3'>
                        <div className='w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0'>
                          <svg className='w-4 h-4 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                          </svg>
                        </div>
                        <div>
                          <p className='text-sm font-medium text-gray-900'>Euro Car Parts Ltd</p>
                          <div className='flex items-center gap-2 mt-0.5'>
                            <span className='text-xs text-gray-500'>Today · Auto Parts</span>
                            <span className='px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700'>Approved</span>
                          </div>
                        </div>
                      </div>
                      <span className='text-sm font-semibold text-red-600'>−{formatGBP(SPEND_AMOUNT)}</span>
                    </div>
                  )}
                  {/* Historical transactions */}
                  {HISTORICAL_TXNS.map((txn) => (
                    <div key={txn.merchant} className='flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0'>
                      <div className='flex items-center gap-3'>
                        <div className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0'>
                          <svg className='w-4 h-4 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                          </svg>
                        </div>
                        <div>
                          <p className='text-sm font-medium text-gray-900'>{txn.merchant}</p>
                          <p className='text-xs text-gray-500'>{txn.date} · {txn.category}</p>
                        </div>
                      </div>
                      <span className='text-sm font-semibold text-red-600'>−{formatGBP(txn.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spend simulation CTA */}
              {!spendDone ? (
                <button
                  onClick={handleSpend}
                  disabled={processing}
                  className='w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-70 transition-opacity'
                  style={{ backgroundColor: GREEN }}
                >
                  {processing ? (
                    <>
                      <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                      Processing payment…
                    </>
                  ) : (
                    <>
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                      </svg>
                      Pay Euro Car Parts Ltd — £285.00
                    </>
                  )}
                </button>
              ) : (
                <div
                  className='rounded-xl p-4 border flex items-center gap-3'
                  style={{ backgroundColor: GREEN + '10', borderColor: GREEN + '40' }}
                >
                  <div
                    className='w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0'
                    style={{ backgroundColor: GREEN }}
                  >
                    <svg className='w-5 h-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                    </svg>
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-gray-900'>
                      Payment approved — £285.00 deducted from wallet
                    </p>
                    <a
                      href={`/${language}/demo/wallet`}
                      className='text-xs font-semibold flex items-center gap-1 mt-0.5 hover:opacity-80'
                      style={{ color: GREEN }}
                    >
                      View updated wallet balance
                      <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
