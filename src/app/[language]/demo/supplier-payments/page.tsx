'use client';

import { useState, useRef } from 'react';

// ─── Brand (exact from screenshots) ──────────────────────────────────────────
const SIDEBAR   = '#1C2B47';   // dark navy
const ACTIVE_BG = '#253759';   // slightly lighter active row
const BLUE      = '#3B6AE8';   // primary blue (buttons, links, active text)
const GREEN_T   = '#059669';
const GREEN_BG  = '#D1FAE5';
const AMBER_T   = '#B45309';
const AMBER_BG  = '#FEF3C7';

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'home' | 'list' | 'new-payment' | 'post-approval' | 'batch' | 'processing' | 'complete';
type PayStatus = 'pending' | 'submitted' | 'in_flight' | 'settled';

interface PayLine { id: string; supplier: string; ref: string; ccy: string; amt: number; bcAmt: number; status: PayStatus; }

// ─── Static data matching screenshots exactly ─────────────────────────────────
const BATCH_LINES: PayLine[] = [
  { id: 'p1', supplier: 'Amazon Web Services', ref: '1234',      ccy: 'USD', amt: 23.00,    bcAmt: 17.97,  status: 'pending' },
  { id: 'p2', supplier: 'D-Nexus',             ref: 'INV-01983', ccy: 'USD', amt: 1_000.00, bcAmt: 781.20, status: 'pending' },
  { id: 'p3', supplier: 'Telin Singapore',     ref: '10016',     ccy: 'USD', amt: 944.00,   bcAmt: 737.45, status: 'pending' },
  { id: 'p4', supplier: 'Micromail',           ref: '12311145',  ccy: 'EUR', amt: 372.50,   bcAmt: 317.00, status: 'pending' },
];
const BC_TOTAL = 1_538.62;

const NEW_LINES = [
  { group: 'Employee 005', groupTotal: '739.00', rows: [
    { supplier: 'Employee 005', ref: 'Aug 2019 Claim', due: '30 Sep 2019', ccy: 'GBP', os: '250.00', pay: '250.00' },
    { supplier: 'Employee 005', ref: 'Aug claim',       due: '26 Sep 2019', ccy: 'GBP', os: '489.00', pay: '489.00' },
  ]},
  { group: 'Micromail', groupTotal: '322.49', rows: [
    { supplier: 'Micromail', ref: '12311145', due: '15 Apr 2021', ccy: 'EUR', os: '372.50', pay: '372.50', fxBadge: true },
  ]},
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const Dot = ({ n }: { n: number }) => (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold ml-1.5 flex-shrink-0" style={{ backgroundColor: BLUE, fontSize: 10 }}>{n}</span>
);

const Badge = ({ status }: { status: string }) => {
  const map: Record<string, [string, string]> = {
    Draft:     ['#6B7280', '#F3F4F6'],
    Processed: ['#1D4ED8', '#DBEAFE'],
    Approved:  [GREEN_T,   GREEN_BG ],
    Waiting:   [AMBER_T,   AMBER_BG ],
    submitted: [AMBER_T,   AMBER_BG ],
    in_flight: ['#0369A1', '#E0F2FE'],
    settled:   [GREEN_T,   GREEN_BG ],
    pending:   ['#6B7280', '#F3F4F6'],
  };
  const [color, bg] = map[status] ?? map['Draft'];
  const label = status === 'Waiting' ? 'Waiting For Approval' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', '-');
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ color, backgroundColor: bg }}>
      {label}
    </span>
  );
};

// ─── Shared Chrome ────────────────────────────────────────────────────────────
const Sidebar = ({ active }: { active: string }) => {
  const items = ['Home', 'Favourites', 'Sales', 'Purchases', 'Items', 'Banks', 'General Ledger', 'Reports', 'Dashboards'];
  return (
    <div className="flex flex-col flex-shrink-0 h-full" style={{ width: 210, backgroundColor: SIDEBAR }}>
      <div className="px-5 pt-5 pb-5 select-none">
        <span className="text-2xl font-bold text-white tracking-tight">AI</span>
        <span className="text-2xl font-bold tracking-tight" style={{ color: BLUE }}>Q</span>
      </div>
      <nav className="flex-1 px-2">
        {items.map((item) => {
          const isActive = item === active;
          return (
            <div
              key={item}
              className="flex items-center h-9 text-sm select-none"
              style={{
                paddingLeft: isActive ? 10 : 12,
                borderLeft: isActive ? `3px solid ${BLUE}` : '3px solid transparent',
                color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                backgroundColor: isActive ? ACTIVE_BG : 'transparent',
                fontWeight: isActive ? 600 : 400,
                borderRadius: isActive ? '0 6px 6px 0' : 0,
              }}
            >
              {item}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

const TopBar = () => (
  <div className="flex items-center justify-between px-5 h-11 border-b border-gray-200 flex-shrink-0 bg-white">
    <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
      ELL3024 – GBP – G.1 DEMO GBP Company
      <span className="text-gray-400">▾</span>
    </button>
    <div className="flex items-center gap-3 text-gray-400">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <span className="text-sm font-medium">?</span>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: BLUE }}>SB</div>
    </div>
  </div>
);

// ─── Screens ─────────────────────────────────────────────────────────────────

const HomeScreen = ({ nav }: { nav: (s: Screen) => void }) => (
  <div className="flex-1 overflow-y-auto p-8 bg-white">
    <h1 className="text-2xl font-bold text-gray-900 mb-0.5">Welcome to Sinéad's Home</h1>
    <p className="text-sm text-gray-400 mb-7">Hope you are having a great day!</p>

    <div className="flex items-center gap-2 mb-3">
      <span className="font-semibold text-gray-800 text-sm">My activity tiles</span>
      <Dot n={1} />
    </div>
    <div className="grid grid-cols-4 gap-4 mb-8">
      {[
        { label: 'AP inbox traffic', val: '4',      sub: 'to be processed', hi: false },
        { label: 'AP invoices',      val: '24',     sub: 'approved',        hi: false },
        { label: 'AP invoices',      val: '124.8K', sub: 'GBP due',         hi: true  },
        { label: 'PO tracker',       val: '46',     sub: 'not yet delivered',hi: false },
      ].map(({ label, val, sub, hi }) => (
        <div
          key={label + val}
          onClick={hi ? () => nav('list') : undefined}
          className="rounded-xl border p-5 bg-white"
          style={{
            borderColor: hi ? BLUE : '#E5E7EB',
            boxShadow: hi ? `0 0 0 1.5px ${BLUE}` : undefined,
            cursor: hi ? 'pointer' : 'default',
          }}
        >
          <p className="text-sm text-gray-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{val}</p>
          <p className="text-sm text-gray-400 mt-0.5">{sub}</p>
        </div>
      ))}
    </div>

    <div className="flex items-center gap-2 mb-3">
      <span className="font-semibold text-gray-800 text-sm">My insight tiles</span>
      <Dot n={2} />
    </div>
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Creditor days',       val: '33,511',  sub: '',                      color: 'text-gray-900' },
        { label: 'Purchase accruals',   val: '£180,251',sub: '53 commitments',        color: 'text-gray-900' },
        { label: 'Approval efficiency', val: '71.9%',   sub: '4 approvers holding 6 docs', color: '' },
      ].map(({ label, val, sub, color }) => (
        <div key={label} className="rounded-xl border border-gray-200 p-5 bg-white">
          <p className="text-sm text-gray-400 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`} style={!color ? { color: GREEN_T } : {}}>{val}</p>
          {sub && <p className="text-sm text-gray-400 mt-0.5">{sub}</p>}
        </div>
      ))}
    </div>
  </div>
);

const ListScreen = ({ nav }: { nav: (s: Screen) => void }) => (
  <div className="flex-1 overflow-y-auto p-8 bg-white">
    <h1 className="text-2xl font-bold text-gray-900 mb-5">Purchases</h1>
    <div className="flex gap-6 border-b border-gray-200 mb-6">
      {['Suppliers','Orders','AP Inbox','Item Invoices','Batch Invoices','Bulk Payments'].map(t => (
        <button key={t} className="pb-3 text-sm font-medium whitespace-nowrap"
          style={{ color: t==='Bulk Payments' ? BLUE : '#9CA3AF', borderBottom: t==='Bulk Payments' ? `2px solid ${BLUE}` : '2px solid transparent' }}>
          {t}
        </button>
      ))}
    </div>
    <div className="flex items-center justify-between mb-6">
      <button onClick={() => nav('new-payment')} className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: BLUE }}>
        New Bulk Payment
      </button>
      <div className="flex items-center gap-1.5">
        <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600">
          Open Bulk Payments <span className="text-gray-400">▾</span>
        </button>
        <Dot n={2} />
      </div>
    </div>
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          {['Number','Bank','Payment date','Approver','Status','Total'].map((h,i) => (
            <th key={h} className={`pb-2.5 text-xs font-medium text-gray-400 ${i===5?'text-right':'text-left'}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[
          { num:'280702', bank:'New Current Account',      bold:false, date:'28 Jul 2026', approver:'—',         status:'Draft',    total:'GBP 1,061.49', badge:null, click:false },
          { num:'201103', bank:'Bank Current Account GBP', bold:false, date:'20 Nov 2025', approver:'Ellen Dak', status:'Processed',total:'GBP 130.00',   badge:null, click:false },
          { num:'280302', bank:'Stripe Account',           bold:true,  date:'28 Mar 2025', approver:'Ellen Dak', status:'Approved', total:'GBP 1,538.62', badge:3,    click:true  },
        ].map(r => (
          <tr key={r.num} className="border-b border-gray-100 hover:bg-gray-50"
            style={{ cursor: r.click ? 'pointer' : 'default' }}
            onClick={r.click ? () => nav('batch') : undefined}>
            <td className="py-3 font-medium" style={{ color: BLUE }}>{r.num}</td>
            <td className="py-3 text-gray-700" style={{ fontWeight: r.bold ? 700 : 400 }}>
              {r.bank}{r.badge && <Dot n={r.badge} />}
            </td>
            <td className="py-3 text-gray-600">{r.date}</td>
            <td className="py-3 text-gray-600">{r.approver}</td>
            <td className="py-3"><Badge status={r.status} /></td>
            <td className="py-3 text-right text-gray-700">{r.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const NewPaymentScreen = ({ nav }: { nav: (s: Screen) => void }) => (
  <div className="flex-1 overflow-y-auto p-8 bg-white">
    <div className="flex items-center gap-3 mb-6">
      <h1 className="text-2xl font-bold text-gray-900">New Bulk Payment</h1>
      <Badge status="Draft" />
    </div>

    {/* Form fields */}
    <div className="grid grid-cols-4 gap-4 mb-8">
      <div>
        <div className="flex items-center gap-1 mb-1.5">
          <label className="text-xs text-gray-400 font-medium">Bank GL/Name</label><Dot n={1} />
        </div>
        <div className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700">
          21001 – New Current<br />Account
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1 mb-1.5">
          <label className="text-xs text-gray-400 font-medium">Payment type</label><Dot n={2} />
        </div>
        <div className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: BLUE }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BLUE }} />
            </span>
            <span className="font-medium" style={{ color: BLUE }}>Offline</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />
            <span className="text-gray-600">Online</span>
          </label>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 font-medium mb-1.5">Payment method</label>
        <div className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700">
          2 selected method(s)
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 font-medium mb-1.5">Approver name</label>
        <div className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-400">
          Select an approver
        </div>
      </div>
    </div>

    {/* Select all + total */}
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <button className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: BLUE }}>
          Select All Due Transactions
        </button>
        <Dot n={3} />
      </div>
      <div className="border border-gray-300 rounded-lg px-4 py-2 text-right">
        <p className="text-xs text-gray-400">Bulk payment total</p>
        <p className="font-bold text-gray-900 text-sm">GBP 1,061.49</p>
      </div>
    </div>

    {/* Payment lines table */}
    <table className="w-full text-sm mb-6">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left pb-2 text-xs font-medium text-gray-400 w-6" />
          <th className="text-left pb-2 text-xs font-medium text-gray-400">Supplier</th>
          <th className="text-left pb-2 text-xs font-medium text-gray-400">Reference</th>
          <th className="text-left pb-2 text-xs font-medium text-gray-400">Due date</th>
          <th className="text-left pb-2 text-xs font-medium text-gray-400">Ccy</th>
          <th className="text-right pb-2 text-xs font-medium text-gray-400">O/S amt</th>
          <th className="text-right pb-2 text-xs font-medium text-gray-400 flex items-center justify-end gap-1">
            Payment amt<Dot n={4} />
          </th>
        </tr>
      </thead>
      <tbody>
        {NEW_LINES.map(({ group, groupTotal, rows }) => (
          <>
            <tr key={group} className="border-b border-gray-100 bg-gray-50">
              <td />
              <td className="py-2 font-bold text-gray-800">{group}</td>
              <td /><td /><td />
              <td />
              <td className="py-2 text-right font-bold text-gray-800">{groupTotal}</td>
            </tr>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2.5 pl-2">
                  <input type="checkbox" defaultChecked className="rounded" style={{ accentColor: BLUE }} />
                </td>
                <td className="py-2.5 text-gray-700">{r.supplier}</td>
                <td className="py-2.5 text-gray-500">{r.ref}</td>
                <td className="py-2.5 text-gray-600">{r.due}</td>
                <td className="py-2.5 text-gray-600">
                  {r.ccy}
                  {(r as { fxBadge?: boolean }).fxBadge && <Dot n={5} />}
                </td>
                <td className="py-2.5 text-right text-gray-700">{r.os}</td>
                <td className="py-2.5 text-right">
                  <input
                    type="text"
                    defaultValue={r.pay}
                    readOnly
                    className="w-20 text-right border border-gray-300 rounded px-2 py-0.5 text-sm text-gray-700"
                  />
                </td>
              </tr>
            ))}
          </>
        ))}
      </tbody>
    </table>

    <div className="flex justify-end gap-3">
      <button className="px-6 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Save
      </button>
      <button
        onClick={() => nav('post-approval')}
        className="px-6 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90"
        style={{ backgroundColor: BLUE }}
      >
        Send For Approval
      </button>
    </div>
  </div>
);

const PostApprovalScreen = ({ nav }: { nav: (s: Screen) => void }) => {
  const [showToast, setShowToast] = useState(true);
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-white relative">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Purchases › Bulk Payments</h1>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-200">
            {['Number','Bank','Approver','Status','Total'].map((h,i) => (
              <th key={h} className={`pb-2.5 text-xs font-medium flex items-center gap-1 ${i===4?'justify-end':''}`} style={{ color: i===3 ? BLUE : '#9CA3AF' }}>
                {h}{i===3 && <Dot n={1} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { num:'280702', bank:'New Current Account', approver:'Ellen D approver', status:'Waiting', total:'GBP 1,061.49', click:false, hi:true  },
            { num:'280302', bank:'Stripe Account',      approver:'Ellen Dak',        status:'Approved',total:'GBP 1,538.62', click:true,  hi:false },
          ].map(r => (
            <tr key={r.num}
              className={`border-b border-gray-100 hover:bg-gray-50 ${r.hi ? 'bg-blue-50' : ''}`}
              style={{ cursor: r.click ? 'pointer' : 'default' }}
              onClick={r.click ? () => nav('batch') : undefined}>
              <td className="py-3 font-medium" style={{ color: BLUE }}>{r.num}</td>
              <td className="py-3 text-gray-700">{r.bank}</td>
              <td className="py-3 text-gray-600">{r.approver}</td>
              <td className="py-3"><Badge status={r.status} /></td>
              <td className="py-3 text-right text-gray-700">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Action panel + annotation */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 p-4">
          {['Download Payment File', 'Send Remittance', 'Mark as Completed', 'View Bulk Payment Report'].map(a => (
            <div key={a} className="flex items-center gap-2 py-2.5 border-b border-gray-100 text-sm text-gray-700">
              {a === 'Download Payment File' && <Dot n={2} />}
              {a}
            </div>
          ))}
          <button
            onClick={() => nav('batch')}
            className="mt-2 text-sm font-semibold py-2"
            style={{ color: BLUE }}
          >
            View Bulk Payment
          </button>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-600 leading-relaxed">
          The approver gets the batch with a note ("Please approve ASAP"), reviews line by line and approves. Once approved the batch locks — no edits without recall.
          <Dot n={3} />
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3.5 rounded-xl shadow-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#1F2937' }}
        >
          Bulk payment sent for approval successfully
          <button onClick={() => setShowToast(false)} className="text-white/60 hover:text-white ml-2 text-base">×</button>
        </div>
      )}
    </div>
  );
};

const BatchScreen = ({ nav }: { nav: (s: Screen) => void }) => (
  <div className="flex-1 overflow-y-auto p-8 bg-white">
    <div className="flex items-center gap-3 mb-1">
      <h1 className="text-2xl font-bold text-gray-900">View Bulk Payment</h1>
      <Badge status="Approved" />
      <span className="text-sm text-gray-400 ml-1">
        Bank: <span className="text-gray-600">Stripe Account</span>
        {' · '}Payment type:{' '}
        <span className="font-semibold" style={{ color: BLUE }}>Online</span>
      </span>
    </div>
    <div className="mb-6" />
    <table className="w-full text-sm mb-4">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left pb-2.5 text-xs font-medium text-gray-400 w-7" />
          <th className="text-left pb-2.5 text-xs font-medium text-gray-400">Supplier</th>
          <th className="text-left pb-2.5 text-xs font-medium text-gray-400">Reference</th>
          <th className="text-left pb-2.5 text-xs font-medium text-gray-400">Ccy</th>
          <th className="text-right pb-2.5 text-xs font-medium text-gray-400">Payment amt</th>
          <th className="text-right pb-2.5 text-xs font-medium text-gray-400">BC amt</th>
        </tr>
      </thead>
      <tbody>
        {BATCH_LINES.map((l, i) => (
          <tr key={l.id} className="border-b border-gray-100">
            <td className="py-3"><input type="checkbox" defaultChecked readOnly className="rounded" style={{ accentColor: BLUE }} /></td>
            <td className="py-3 text-gray-800">{l.supplier}</td>
            <td className="py-3 text-gray-500 font-mono text-xs">{l.ref}</td>
            <td className="py-3 text-gray-600">
              {l.ccy}{i === 0 && <Dot n={1} />}
            </td>
            <td className="py-3 text-right text-gray-800">{l.amt.toFixed(2)}</td>
            <td className="py-3 text-right text-gray-800">{l.bcAmt.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="flex items-center justify-between mb-6">
      <p className="text-sm text-gray-500">
        4 selected of 11 items · Bulk Payment BC Total:{' '}
        <span className="font-bold text-gray-900">GBP {BC_TOTAL.toFixed(2)}</span>
      </p>
      <div className="flex items-center gap-3">
        <button className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Edit
        </button>
        <button
          onClick={() => nav('processing')}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90"
          style={{ backgroundColor: BLUE }}
        >
          Process With Stripe
          <Dot n={2} />
        </button>
      </div>
    </div>

    <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: SIDEBAR }}>
      <div className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: BLUE }}>2FA</div>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
        Two-factor auth setup required —{' '}
        <span className="text-white">"AccountsIQ partners with Stripe to process payments. Before you can pay with Stripe we need to confirm your identity as an extra security measure."</span>
        <Dot n={3} />
      </p>
    </div>
  </div>
);

const ProcessingScreen = ({ lines, onComplete }: { lines: PayLine[]; onComplete: () => void }) => {
  const allSettled = lines.every(l => l.status === 'settled');
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-white">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-900">View Bulk Payment</h1>
        <Badge status={allSettled ? 'Processed' : 'submitted'} />
        <span className="text-sm text-gray-400 ml-1">
          Bank: <span className="text-gray-600">Stripe Account</span>
          {' · '}Payment type:{' '}
          <span className="font-semibold" style={{ color: BLUE }}>Online</span>
        </span>
      </div>
      <div className="mb-6" />
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left pb-2.5 text-xs font-medium text-gray-400 w-7" />
            <th className="text-left pb-2.5 text-xs font-medium text-gray-400">Supplier</th>
            <th className="text-left pb-2.5 text-xs font-medium text-gray-400">Reference</th>
            <th className="text-left pb-2.5 text-xs font-medium text-gray-400">Ccy</th>
            <th className="text-right pb-2.5 text-xs font-medium text-gray-400">Payment amt</th>
            <th className="text-right pb-2.5 text-xs font-medium text-gray-400">BC amt</th>
            <th className="text-center pb-2.5 text-xs font-medium text-gray-400">Status</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(l => (
            <tr key={l.id} className="border-b border-gray-100">
              <td className="py-3"><input type="checkbox" defaultChecked readOnly className="rounded" style={{ accentColor: BLUE }} /></td>
              <td className="py-3 text-gray-800">{l.supplier}</td>
              <td className="py-3 text-gray-500 font-mono text-xs">{l.ref}</td>
              <td className="py-3 text-gray-600">{l.ccy}</td>
              <td className="py-3 text-right text-gray-800">{l.amt.toFixed(2)}</td>
              <td className="py-3 text-right text-gray-800">{l.bcAmt.toFixed(2)}</td>
              <td className="py-3 text-center"><Badge status={l.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          4 payments · BC Total: <span className="font-bold text-gray-900">GBP {BC_TOTAL.toFixed(2)}</span>
        </p>
        {allSettled ? (
          <button onClick={onComplete} className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: GREEN_T }}>
            ✓ View settlement summary
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: BLUE }}>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Processing via Stripe…
          </div>
        )}
      </div>
    </div>
  );
};

const CompleteScreen = ({ onReset }: { onReset: () => void }) => (
  <div className="flex-1 overflow-y-auto p-8 bg-white">
    <div className="flex items-center gap-3 mb-1">
      <h1 className="text-2xl font-bold text-gray-900">View Bulk Payment</h1>
      <Badge status="Processed" />
    </div>
    <p className="text-sm mb-6" style={{ color: GREEN_T }}>✓ All 4 payments settled · GBP {BC_TOTAL.toFixed(2)}</p>
    <table className="w-full text-sm mb-6">
      <thead>
        <tr className="border-b border-gray-200">
          {['Supplier','Reference','Ccy','Payment amt','BC amt','Rail','Status'].map((h,i) => (
            <th key={h} className={`pb-2.5 text-xs font-medium text-gray-400 ${i>=3?'text-right':i===6?'text-center':'text-left'}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {BATCH_LINES.map(l => (
          <tr key={l.id} className="border-b border-gray-100">
            <td className="py-3 text-gray-800">{l.supplier}</td>
            <td className="py-3 text-gray-500 font-mono text-xs">{l.ref}</td>
            <td className="py-3 text-gray-600">{l.ccy}</td>
            <td className="py-3 text-right">{l.amt.toFixed(2)}</td>
            <td className="py-3 text-right">{l.bcAmt.toFixed(2)}</td>
            <td className="py-3 text-right text-xs text-gray-400">{l.ccy==='EUR'?'SEPA':'SWIFT/FX'}</td>
            <td className="py-3 text-center"><Badge status="settled" /></td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[
        { icon:'📒', title:'Ledger auto-updated',  body:'FX realised rates posted to General Ledger automatically. No manual journal entry needed.' },
        { icon:'🔔', title:'Webhooks delivered',   body:'Per-payment events (submitted → in-flight → settled) streamed to AccountsIQ in real time.' },
        { icon:'📨', title:'Remittances sent',     body:'Supplier remittance advices dispatched automatically on settlement.' },
      ].map(({ icon, title, body }) => (
        <div key={title} className="rounded-xl border border-gray-200 p-4">
          <div className="text-2xl mb-2">{icon}</div>
          <p className="font-semibold text-gray-800 text-sm mb-1">{title}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
        </div>
      ))}
    </div>
    <button onClick={onReset} className="text-xs text-gray-300 hover:text-gray-500 transition-colors">↺ Reset demo</button>
  </div>
);

// ─── 2FA Modal ────────────────────────────────────────────────────────────────
const TwoFAModal = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => {
  const [code, setCode] = useState('');
  const [err,  setErr ] = useState(false);
  const confirm = () => { if (code.length >= 6) { onConfirm(); } else { setErr(true); } };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-96 p-8">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#DBEAFE' }}>
          <svg className="w-6 h-6" style={{ color: BLUE }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-center text-gray-900 mb-1">Confirm your identity</h2>
        <p className="text-sm text-center text-gray-500 mb-5">
          Enter the 6-digit code to authorise <span className="font-semibold text-gray-800">GBP {BC_TOTAL.toFixed(2)}</span>
        </p>
        <input
          type="text" inputMode="numeric" maxLength={6} placeholder="• • • • • •"
          value={code} autoFocus
          onChange={e => { setErr(false); setCode(e.target.value.replace(/\D/g, '')); }}
          onKeyDown={e => e.key === 'Enter' && confirm()}
          className="w-full text-center text-2xl font-mono tracking-[0.5em] border rounded-xl py-3 outline-none mb-1"
          style={{ borderColor: err ? '#EF4444' : '#D1D5DB', color: BLUE }}
        />
        {err && <p className="text-xs text-red-500 text-center mb-3">Enter any 6 digits for the demo</p>}
        <button onClick={confirm} className="w-full mt-3 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90" style={{ backgroundColor: BLUE }}>
          Authorise payment
        </button>
        <button onClick={onCancel} className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
    </div>
  );
};

// ─── Stripe story strip ───────────────────────────────────────────────────────
const STORY: Record<Screen, { tag: string; text: string }> = {
  'home':         { tag: 'Context',          text: '£124.8K is due to suppliers. The finance team starts their payment cycle inside AccountsIQ — no switching tools.' },
  'list':         { tag: 'Integration seam', text: 'Batch 280302 is on a "Stripe Account" instead of TransferMate. Same approval workflow — Stripe is the new rail under the hood.' },
  'new-payment':  { tag: 'Payment build',    text: 'Finance team selects due invoices — domestic GBP and cross-border EUR in one batch. AccountsIQ builds the batch natively.' },
  'post-approval':{ tag: 'Approval locked',  text: 'Batch is approved and locked. The approver reviewed line by line inside AccountsIQ — no external portal required.' },
  'batch':        { tag: 'The moment',       text: '"Process With Stripe" sits at the exact same seam as the old TransferMate button. Zero retraining for the finance team.' },
  'processing':   { tag: 'Live status',      text: 'Per-payment webhooks drive real-time status: submitted → in-flight → settled. Ledger and remittances update automatically.' },
  'complete':     { tag: 'Cycle complete',   text: 'All payments settled. FX rates realised and posted. Remittances sent. The entire cycle never left AccountsIQ.' },
};

const StripeStrip = ({ screen }: { screen: Screen }) => {
  const { tag, text } = STORY[screen];
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
      <span className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: BLUE }}>
        ⚡ Stripe · {tag}
      </span>
      <p className="text-xs text-gray-500">{text}</p>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function SupplierPaymentsDemoPage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [show2FA, setShow2FA] = useState(false);
  const [lines, setLines] = useState<PayLine[]>(BATCH_LINES);
  const processingRef = useRef(false);

  const nav = (s: Screen) => {
    if (s === 'processing') { setShow2FA(true); return; }
    setScreen(s);
  };

  const confirm2FA = () => {
    setShow2FA(false);
    if (processingRef.current) return;
    processingRef.current = true;
    setScreen('processing');
    const seq: { id: string; status: PayStatus; delay: number }[] = [
      { id:'p1', status:'submitted', delay:300  },
      { id:'p2', status:'submitted', delay:500  },
      { id:'p3', status:'submitted', delay:700  },
      { id:'p4', status:'submitted', delay:900  },
      { id:'p1', status:'in_flight', delay:1400 },
      { id:'p2', status:'in_flight', delay:1700 },
      { id:'p3', status:'in_flight', delay:1900 },
      { id:'p4', status:'in_flight', delay:2200 },
      { id:'p1', status:'settled',   delay:2700 },
      { id:'p3', status:'settled',   delay:3100 },
      { id:'p2', status:'settled',   delay:3600 },
      { id:'p4', status:'settled',   delay:4200 },
    ];
    seq.forEach(({ id, status, delay }) =>
      setTimeout(() => setLines(prev => prev.map(l => l.id === id ? { ...l, status } : l)), delay)
    );
  };

  const reset = () => { setScreen('home'); setLines(BATCH_LINES); setShow2FA(false); processingRef.current = false; };

  const sidebarActive = screen === 'home' ? 'Home' : 'Purchases';

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Sidebar active={sidebarActive} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {screen === 'home'          && <HomeScreen nav={nav} />}
          {screen === 'list'          && <ListScreen nav={nav} />}
          {screen === 'new-payment'   && <NewPaymentScreen nav={nav} />}
          {screen === 'post-approval' && <PostApprovalScreen nav={nav} />}
          {screen === 'batch'         && <BatchScreen nav={nav} />}
          {screen === 'processing'    && <ProcessingScreen lines={lines} onComplete={() => setScreen('complete')} />}
          {screen === 'complete'      && <CompleteScreen onReset={reset} />}
        </div>
        <StripeStrip screen={screen} />
      </div>
      {show2FA && <TwoFAModal onConfirm={confirm2FA} onCancel={() => setShow2FA(false)} />}
    </div>
  );
}
