'use client';

import { useState, useEffect } from 'react';
import { useDemoConfig } from '@/context/DemoConfigContext';

const DARK_BG = '#1A1730';
const GREEN = '#16C665';
const STORAGE_KEY = 'ca_demo_wallet';
const DEFAULT_BALANCE = 4237.18;
const SETTLEMENT_AMOUNT = 1124.8;

interface WalletTxn {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'settlement' | 'card_spend' | 'pot_move' | 'withdrawal';
}

const formatGBP = (n: number) =>
  '£' + new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const getStoredState = (): { balance: number; transactions: WalletTxn[] } => {
  if (typeof window === 'undefined') return { balance: DEFAULT_BALANCE, transactions: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { balance: DEFAULT_BALANCE, transactions: [] };
  } catch {
    return { balance: DEFAULT_BALANCE, transactions: [] };
  }
};

const saveState = (balance: number, transactions: WalletTxn[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ balance, transactions }));
  } catch {}
};

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

const SCHEDULED = [
  { day: '02', month: 'MAY', label: 'Auto-allocation: VAT Savings', sub: '18% of daily settlement', amount: '−£148', negative: true },
  { day: '05', month: 'MAY', label: 'Withdraw to Barclays ••3421', sub: 'Recurring — first Mondays', amount: '£2,500.00', negative: false },
  { day: '09', month: 'MAY', label: 'Operating Reserve top-up', sub: 'Manual schedule', amount: '£500.00', negative: false },
];

const AUTO_RULES = [
  { label: 'VAT Savings', pct: 18, color: GREEN },
  { label: 'Operating Reserve', pct: 10, color: '#374151' },
  { label: 'Available balance', pct: 72, color: '#D1D5DB' },
];

const QUICK_ACTIONS = [
  'Move £800 into my VAT savings pot',
  'How much have I earned in interest this quarter?',
  'Withdraw £2,000 to my main account on Friday',
  'Set up a new pot for staff bonuses',
];

const AI_RESPONSE = {
  userMsg: 'Move £800 into my VAT savings pot',
  body: (
    <>
      <p className='text-sm text-gray-800 leading-relaxed'>
        I'll move{' '}
        <span className='font-semibold' style={{ color: GREEN }}>£800.00</span>{' '}
        from your{' '}
        <span className='font-semibold'>Available balance</span>{' '}
        into your{' '}
        <span className='font-semibold'>VAT Savings pot</span>. This will earn{' '}
        <span className='font-semibold'>3.5% AER</span>. Your new available balance will be{' '}
        <span className='font-semibold'>£3,437.18</span>. Shall I go ahead?
      </p>
      <div className='mt-3 rounded border border-gray-200 overflow-hidden text-sm'>
        <div className='flex justify-between px-3 py-2 bg-gray-50 border-b border-gray-200'>
          <span className='text-gray-600'>Available balance now</span>
          <span className='font-medium'>£4,237.18</span>
        </div>
        <div className='flex justify-between px-3 py-2'>
          <span className='text-gray-600'>→ Move to VAT Savings pot</span>
          <span className='font-medium text-red-600'>−£800.00</span>
        </div>
      </div>
    </>
  ),
};

export default function WalletDemoPage() {
  const { language } = useDemoConfig();
  const [balance, setBalance] = useState(DEFAULT_BALANCE);
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [settlementDone, setSettlementDone] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showConversation, setShowConversation] = useState(false);
  const [sentMsg, setSentMsg] = useState('');

  useEffect(() => {
    const state = getStoredState();
    setBalance(state.balance);
    setTransactions(state.transactions);
    setSettlementDone(state.transactions.some((t) => t.type === 'settlement'));
  }, []);

  const handleTopUp = () => {
    const newBalance = balance + SETTLEMENT_AMOUNT;
    const newTxn: WalletTxn = {
      id: `settlement-${Date.now()}`,
      date: 'Today',
      description: 'Card settlement received',
      amount: SETTLEMENT_AMOUNT,
      type: 'settlement',
    };
    const newTxns = [newTxn, ...transactions].slice(0, 10);
    setBalance(newBalance);
    setTransactions(newTxns);
    setSettlementDone(true);
    saveState(newBalance, newTxns);
  };

  const handleReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setBalance(DEFAULT_BALANCE);
    setTransactions([]);
    setSettlementDone(false);
    setShowConversation(false);
    setSentMsg('');
  };

  const handleSend = (msg?: string) => {
    const text = msg ?? inputValue;
    if (!text.trim()) return;
    setSentMsg(text);
    setShowConversation(true);
    setInputValue('');
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
            AccountsIQ Wallet
          </p>

          <h1 className='mt-8 text-3xl font-bold leading-tight text-white'>
            Save &amp; Spend Wallet
          </h1>

          <div className='mt-5 w-12 h-1 rounded' style={{ backgroundColor: GREEN }} />

          <ul className='mt-8 space-y-5'>
            {[
              'Live balance — last settlement, next settlement shown',
              'New product banners — prominent call to action & tracking',
              "Natural language prompt — 'Move £800 to my VAT pot'",
              'Scheduled auto-allocations + interest-bearing pot summary',
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

      {/* Right panel — wallet UI */}
      <div className='flex-1 flex flex-col overflow-hidden bg-white'>
        {/* Top bar */}
        <div className='flex items-center justify-between px-6 h-12 border-b border-gray-200 flex-shrink-0'>
          <nav className='text-xs text-gray-500'>
            <span>Operate</span>
            <span className='mx-1.5'>/</span>
            <span className='font-medium text-gray-700'>Wallet</span>
          </nav>
          <div className='flex items-center gap-4'>
            <a
              href={`/${language}/demo/issuing`}
              className='text-xs font-medium flex items-center gap-1 hover:opacity-80'
              style={{ color: GREEN }}
            >
              Corporate Card
              <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
              </svg>
            </a>
            <button className='text-gray-400 hover:text-gray-600'>
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
              </svg>
            </button>
            <button className='text-gray-400 hover:text-gray-600'>
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' />
              </svg>
            </button>
          </div>
        </div>

        {/* Page heading */}
        <div className='px-8 pt-5 pb-3 border-b border-gray-100 flex-shrink-0'>
          <h1 className='text-2xl font-bold text-gray-900'>AccountsIQ Wallet</h1>
          <p className='text-sm text-gray-500 mt-0.5'>Receive, allocate, and move your card-processing funds</p>
        </div>

        {/* Scrollable body */}
        <div className='flex-1 overflow-y-auto'>
          <div className='flex gap-5 p-6'>
            {/* Main column */}
            <div className='flex-1 min-w-0 space-y-4'>
              {/* Balance card */}
              <div
                className='rounded-xl border p-5'
                style={{ borderColor: GREEN }}
              >
                <p className='text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2'>
                  Available Balance
                </p>
                <p className='text-4xl font-bold text-gray-900'>{formatGBP(balance)}</p>
                <div className='mt-1 flex items-center gap-3'>
                  <p className='text-xs text-gray-500'>
                    <span className='text-green-600 font-medium'>↑ Last settlement £842.30</span>
                    {' · '}Today 06:14
                  </p>
                  {!settlementDone ? (
                    <button
                      onClick={handleTopUp}
                      className='text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 hover:opacity-80 transition-opacity'
                      style={{ color: GREEN, borderColor: GREEN + '60', backgroundColor: GREEN + '10' }}
                    >
                      <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 14l-7 7m0 0l-7-7m7 7V3' />
                      </svg>
                      Receive settlement +£1,124.80
                    </button>
                  ) : (
                    <span className='text-xs font-medium text-green-600'>
                      ✓ Settlement +£1,124.80 received today
                    </span>
                  )}
                </div>
                <div className='flex gap-3 mt-4'>
                  <button className='flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50'>
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' />
                    </svg>
                    Move funds
                  </button>
                  <button
                    className='flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90'
                    style={{ backgroundColor: GREEN }}
                  >
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                    </svg>
                    Withdraw to bank
                  </button>
                </div>
              </div>

              {/* Coming Soon banner */}
              <div className='rounded-xl bg-gray-900 p-5 flex items-center gap-4'>
                <div className='flex-shrink-0 relative'>
                  <div className='w-14 h-10 rounded-md bg-gray-700 flex items-center justify-center text-xs text-gray-300 font-mono'>
                    ····<br />4421
                  </div>
                  <div
                    className='absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center'
                    style={{ backgroundColor: GREEN }}
                  >
                    <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                    </svg>
                  </div>
                </div>
                <div className='flex-1'>
                  <p className='text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1'>Coming Soon</p>
                  <p className='text-white font-semibold text-sm'>Spend directly from your wallet</p>
                  <p className='text-gray-400 text-xs mt-0.5'>
                    The AccountsIQ Corporate Card draws funds straight from your available balance and pots — no top-ups, no waiting for settlements.
                  </p>
                </div>
                <div className='flex gap-2 flex-shrink-0'>
                  <button className='px-3 py-1.5 rounded-lg border border-gray-600 text-white text-xs font-medium hover:bg-gray-800'>
                    Learn more
                  </button>
                  <a
                    href={`/${language}/demo/issuing`}
                    className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-90'
                    style={{ backgroundColor: GREEN }}
                  >
                    <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                    </svg>
                    See it in action
                  </a>
                </div>
              </div>

              {/* Natural language prompt */}
              <div className='rounded-xl border border-gray-200 p-3'>
                <div className='flex items-center gap-3'>
                  <div
                    className='w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center'
                    style={{ backgroundColor: GREEN + '22' }}
                  >
                    <svg className='w-4 h-4' style={{ color: GREEN }} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z' />
                    </svg>
                  </div>
                  <input
                    className='flex-1 text-sm text-gray-700 outline-none placeholder-gray-400'
                    placeholder="What would you like to do? e.g. 'Move £800 to my VAT pot'"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button
                    onClick={() => handleSend()}
                    className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90'
                    style={{ backgroundColor: GREEN }}
                  >
                    <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8' />
                    </svg>
                    Send
                  </button>
                </div>
                <div className='flex flex-wrap gap-2 mt-3'>
                  {QUICK_ACTIONS.map((qa) => (
                    <button
                      key={qa}
                      onClick={() => handleSend(qa)}
                      className='px-3 py-1 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-green-400 hover:text-green-700 transition-colors'
                    >
                      {qa}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation history */}
              {showConversation && (
                <div className='rounded-xl border border-gray-200 overflow-hidden'>
                  <div className='flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50'>
                    <div className='flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-widest'>
                      <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z' />
                      </svg>
                      Conversation History
                    </div>
                    <span className='text-xs text-gray-400'>1 message</span>
                  </div>

                  {/* User message */}
                  <div className='flex justify-end px-4 py-3'>
                    <div className='max-w-[70%] bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-gray-800'>
                      {sentMsg}
                    </div>
                  </div>

                  {/* AI response */}
                  <div className='px-4 py-3 flex gap-3'>
                    <div
                      className='w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs'
                      style={{ backgroundColor: GREEN }}
                    >
                      W
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-2'>
                        <span className='text-sm font-semibold text-gray-900'>Wallet Assistant</span>
                        <span className='px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500'>AI</span>
                      </div>
                      {AI_RESPONSE.body}
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction history — populated by demo interactions */}
              {transactions.length > 0 && (
                <div className='rounded-xl border border-gray-200 overflow-hidden'>
                  <div className='flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200'>
                    <p className='text-xs font-semibold text-gray-700 uppercase tracking-widest'>Recent activity</p>
                    <span className='text-xs text-gray-400'>{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div>
                    {transactions.map((txn) => (
                      <div key={txn.id} className='flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0'>
                        <div className='flex items-center gap-3'>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${txn.amount > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                            {txn.amount > 0 ? (
                              <svg className='w-4 h-4 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 14l-7 7m0 0l-7-7m7 7V3' />
                              </svg>
                            ) : (
                              <svg className='w-4 h-4 text-red-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className='text-sm font-medium text-gray-800'>{txn.description}</p>
                            <p className='text-xs text-gray-500'>{txn.date}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.amount > 0 ? '+' : '−'}{formatGBP(txn.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className='w-56 flex-shrink-0 space-y-5'>
              {/* This month */}
              <div className='rounded-xl border border-gray-200 p-4'>
                <p className='text-xs font-semibold text-gray-700 mb-3'>This month</p>
                <div className='space-y-2 text-xs'>
                  {[
                    { label: 'Settlements in', val: '£24,108.40' },
                    { label: 'Withdrawals', val: '£18,500.00' },
                    { label: 'Allocated to pots', val: '£3,200.00' },
                    { label: 'Interest earned', val: '+£9.68', green: true },
                  ].map(({ label, val, green }) => (
                    <div key={label} className='flex justify-between'>
                      <span className='text-gray-500'>{label}</span>
                      <span className={`font-medium ${green ? 'text-green-600' : 'text-gray-900'}`}>{val}</span>
                    </div>
                  ))}
                </div>
                <button className='mt-3 text-xs font-medium flex items-center gap-1' style={{ color: GREEN }}>
                  View statement <span>→</span>
                </button>
              </div>

              {/* Scheduled */}
              <div className='rounded-xl border border-gray-200 p-4'>
                <p className='text-xs font-semibold text-gray-700 mb-3'>Scheduled</p>
                <div className='space-y-3'>
                  {SCHEDULED.map((s) => (
                    <div key={s.label} className='flex gap-2 items-start'>
                      <div className='text-center flex-shrink-0 w-8'>
                        <p className='text-xs font-bold text-gray-900'>{s.day}</p>
                        <p className='text-xs text-gray-400'>{s.month}</p>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs font-medium text-gray-800 leading-tight'>{s.label}</p>
                        <p className='text-xs text-gray-400 leading-tight mt-0.5'>{s.sub}</p>
                      </div>
                      <span className={`text-xs font-semibold flex-shrink-0 ${s.negative ? 'text-red-600' : 'text-gray-900'}`}>
                        {s.amount}
                      </span>
                    </div>
                  ))}
                </div>
                <button className='mt-3 w-full py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50'>
                  Manage schedules
                </button>
              </div>

              {/* Auto-allocation rules */}
              <div className='rounded-xl border border-gray-200 p-4'>
                <p className='text-xs font-semibold text-gray-700 mb-1'>Auto-allocation rules</p>
                <p className='text-xs text-gray-400 mb-3'>Each settlement is split automatically:</p>
                <div className='space-y-2'>
                  {AUTO_RULES.map((r) => (
                    <div key={r.label} className='flex items-center gap-2'>
                      <span
                        className='w-2.5 h-2.5 rounded-full flex-shrink-0'
                        style={{ backgroundColor: r.color }}
                      />
                      <span className='text-xs text-gray-700 flex-1'>{r.label}</span>
                      <span className='text-xs font-semibold text-gray-900'>{r.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={handleReset}
                className='w-full text-xs text-gray-300 hover:text-gray-500 transition-colors py-1'
              >
                ↺ Reset demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
