'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConnectPayments } from '@stripe/react-connect-js';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { simulatePayment as simulatePaymentAction } from '@/app/api/payment-intents/simulatePayment';

const BLUE = '#3B6AE8';
const NAVY = '#1C2B47';

// ─── Simulate Modal ───────────────────────────────────────────────────────────
const SimulateModal = ({
  open, onClose, onSuccess, currency,
}: { open: boolean; onClose: () => void; onSuccess: () => void; currency: string }) => {
  const { stripeSecretKey } = useDemoConfig();
  const { account } = useDemoMerchant();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: () => simulatePaymentAction({
      accountId: account!.id,
      amount: Math.round(parseFloat(amount) * 100),
      currency,
      description: description || undefined,
      stripeSecretKey,
    }),
    onSuccess: () => { setAmount(''); setDescription(''); onSuccess(); },
  });

  if (!open) return null;

  const symbol = currency.toUpperCase() === 'GBP' ? '£' : currency.toUpperCase() === 'EUR' ? '€' : '$';
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${BLUE}15` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Simulate a sale</h2>
            <p className="text-xs text-gray-400 mt-0.5">Creates a confirmed payment on this account</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount ({currency.toUpperCase()})</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">{symbol}</span>
              <input type="number" min="0.50" step="0.01" className={inputCls + ' pl-7'}
                value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Description <span className="text-gray-300">(optional)</span>
            </label>
            <input type="text" className={inputCls} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="e.g. Annual membership fee" />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error instanceof Error ? error.message : 'Something went wrong.'}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { reset(); onClose(); }}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="button" disabled={isPending || !amount || parseFloat(amount) <= 0}
              onClick={() => mutate()}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: BLUE }}>
              {isPending ? 'Processing…' : 'Simulate sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const PaymentsPage = () => {
  const { currency } = useDemoConfig();
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState('');

  const handleSuccess = () => {
    setModalOpen(false);
    setToast('Payment simulated successfully');
    setTimeout(() => setToast(''), 4000);
  };

  return (
    <div>
      {/* Simulate button */}
      <div className="flex justify-end mb-4">
        <button onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: BLUE }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Simulate sale
        </button>
      </div>

      {/* Stripe embedded payments list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ borderTop: `4px solid ${BLUE}` }}>
        <div id="connect-payments">
          <ConnectPayments />
        </div>
      </div>

      <SimulateModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handleSuccess} currency={currency} />

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

export default PaymentsPage;
