'use client';

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Input } from '../common/Input';
import { CurrencyInput } from '../common/CurrencyInput';
import { Alert } from '../common/Alert';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { AddRecipientModal } from './AddRecipientModal';
import { AddPayoutMethodModal } from './AddPayoutMethodModal';
import { getRecipients as getRecipientsAction } from '@/app/api/accounts/getRecipients';
import { getPayoutMethods as getPayoutMethodsAction } from '@/app/api/money-management/payout-methods/getPayoutMethods';
import { createOutboundPayment as createOutboundPaymentAction } from '@/app/api/money-management/outbound-payments/createOutboundPayment';
import type { Stripe } from 'stripe';
import type { CurrencyCode } from '@/constants/currencyCodes';

type PaymentModalProps = {
  open: boolean;
  onClose: () => void;
  sourceFinancialAccount: Stripe.V2.MoneyManagement.FinancialAccount;
  allFinancialAccounts?: Stripe.V2.MoneyManagement.FinancialAccount[];
  initialRecipientId?: string;
};

export const PaymentModal = ({
  open,
  onClose,
  sourceFinancialAccount,
  allFinancialAccounts,
  initialRecipientId,
}: PaymentModalProps) => {
  const { t } = useTranslation();
  const { stripeSecretKey } = useDemoConfig();
  const { account } = useDemoMerchant();
  const queryClient = useQueryClient();

  const [selectedFaId, setSelectedFaId] = useState<string>(sourceFinancialAccount.id);
  const selectedFA = allFinancialAccounts?.find(fa => fa.id === selectedFaId) ?? sourceFinancialAccount;

  const [recipientAccountId, setRecipientAccountId] = useState<string>(initialRecipientId ?? '');
  const [payoutMethodId, setPayoutMethodId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [isAddRecipientModalOpen, setIsAddRecipientModalOpen] =
    useState<boolean>(false);
  const [isAddPayoutMethodModalOpen, setIsAddPayoutMethodModalOpen] =
    useState<boolean>(false);
  const [createdRecipientAccount, setCreatedRecipientAccount] =
    useState<Stripe.V2.Core.Account | null>(null);
  // Track locally created recipients (Customer Search API has indexing delays)
  // Using 'any' because the response from createRecipient goes through plain() and loses the Stripe Response type
  const [locallyCreatedRecipients, setLocallyCreatedRecipients] = useState<
    any[]
  >([]);

  // Get available currencies from selected FA
  const availableCurrencies = Object.keys(
    selectedFA.balance?.available || {},
  );
  const defaultCurrency = availableCurrencies[0] || 'usd';
  const [currency, setCurrency] = useState<string>(defaultCurrency);

  // Get available balance for selected currency
  const availableBalance =
    selectedFA.balance?.available?.[currency]?.value || 0;

  // Fetch recipients that belong to the connected account (logged-in merchant)
  const {
    data: recipients,
    isPending: isLoadingRecipients,
    refetch: refetchRecipients,
  } = useQuery({
    queryKey: ['recipients', account?.id, stripeSecretKey],
    queryFn: () =>
      getRecipientsAction({
        connectedAccountId: account!.id,
        stripeSecretKey,
      }),
    enabled: !!account && open,
  });

  // Fetch payout methods for selected recipient account
  // Requires both connected account ID and recipient account ID for FA4P context
  const { data: payoutMethods, isPending: isLoadingPayoutMethods } = useQuery({
    queryKey: ['payout-methods', account?.id, recipientAccountId, stripeSecretKey],
    queryFn: () =>
      getPayoutMethodsAction({
        connectedAccountId: account!.id,
        recipientAccountId,
        stripeSecretKey,
      }),
    enabled: !!account && !!recipientAccountId && open,
  });

  // Merge fetched recipients with locally created ones (handles search indexing delay)
  const allRecipients = useMemo(() => {
    const fetchedRecipients = recipients || [];
    // Add locally created recipients that aren't already in the fetched list
    const merged = [...fetchedRecipients];
    for (const localRecipient of locallyCreatedRecipients) {
      if (!merged.some((r) => r.id === localRecipient.id)) {
        merged.push(localRecipient);
      }
    }
    return merged;
  }, [recipients, locallyCreatedRecipients]);

  // Filter to only bank accounts and cards
  const availablePayoutMethods = useMemo(() => {
    if (!payoutMethods) return [];
    return payoutMethods.filter(
      (pm) =>
        (pm.type === 'bank_account' && pm.bank_account) ||
        (pm.type === 'card' && pm.card),
    );
  }, [payoutMethods]);

  // Reset payout method when recipient account changes
  useEffect(() => {
    setPayoutMethodId('');
  }, [recipientAccountId]);

  // Sync initialRecipientId and reset FA selection when modal opens
  useEffect(() => {
    if (open) {
      setRecipientAccountId(initialRecipientId ?? '');
      setSelectedFaId(sourceFinancialAccount.id);
    }
  }, [open, initialRecipientId, sourceFinancialAccount.id]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      const resetTimeout = setTimeout(() => {
        setRecipientAccountId('');
        setPayoutMethodId('');
        setAmount(0);
        setDescription('');
        setCurrency(defaultCurrency);
        setLocallyCreatedRecipients([]);
      }, 300);
      return () => clearTimeout(resetTimeout);
    }
  }, [open, defaultCurrency]);

  // Create payment mutation
  const {
    mutate: createPayment,
    isPending: isCreatingPayment,
    error: paymentError,
  } = useMutation({
    mutationFn: createOutboundPaymentAction,
    onSuccess: (response) => {
      if ('message' in response) {
        throw new Error(response.message);
      }

      onClose();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ['financial-account', sourceFinancialAccount.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['financial-account-transactions', sourceFinancialAccount.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['financial-accounts', account?.id, stripeSecretKey],
      });
    },
  });

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) return;

    const destinationCurrency = getDestinationCurrency();

    createPayment({
      connectedAccountId: account.id,
      fromFinancialAccountId: selectedFA.id,
      recipientAccountId,
      payoutMethodId,
      amount,
      currency,
      destinationCurrency,
      description: description || undefined,
      stripeSecretKey,
    });
  };

  const isPaymentFormValid =
    recipientAccountId &&
    payoutMethodId &&
    amount > 0 &&
    amount <= availableBalance;

  // Get label for account - show individual name or business name
  const getAccountLabel = (acc: Stripe.V2.Core.Account): string => {
    // For individuals, construct name from given_name and surname
    if (acc.identity?.individual) {
      const { given_name, surname } = acc.identity.individual;
      if (given_name || surname) {
        return [given_name, surname].filter(Boolean).join(' ');
      }
    }
    // For companies, use registered name
    if (acc.identity?.business_details?.registered_name) {
      return acc.identity.business_details.registered_name;
    }
    // Fallback to display_name, contact_email, or id
    return acc.display_name || acc.contact_email || acc.id;
  };

  // Get label for payout method
  const getPayoutMethodLabel = (
    pm: Stripe.V2.MoneyManagement.PayoutMethod,
  ): string => {
    if (pm.type === 'bank_account' && pm.bank_account) {
      return `${pm.bank_account.bank_name || 'Bank Account'} ••••${pm.bank_account.last4}`;
    }
    if (pm.type === 'card' && pm.card) {
      return `Card ••••${pm.card.last4}`;
    }
    return pm.id;
  };

  // Infer currency from country code
  const getCountryCurrency = (countryCode: string | undefined): string => {
    if (!countryCode) return currency; // fallback to source currency
    const countryToCurrency: Record<string, string> = {
      US: 'usd',
      GB: 'gbp',
      DE: 'eur',
      FR: 'eur',
      IT: 'eur',
      ES: 'eur',
      NL: 'eur',
      BE: 'eur',
      AT: 'eur',
      IE: 'eur',
      PT: 'eur',
      FI: 'eur',
      GR: 'eur',
      CA: 'cad',
      AU: 'aud',
      JP: 'jpy',
      SG: 'sgd',
      HK: 'hkd',
      NZ: 'nzd',
      CH: 'chf',
      SE: 'sek',
      NO: 'nok',
      DK: 'dkk',
      MX: 'mxn',
      BR: 'brl',
    };
    return countryToCurrency[countryCode] || currency;
  };

  // Get the destination currency from selected payout method
  const getDestinationCurrency = (): string | undefined => {
    if (!payoutMethodId) return undefined;
    const selectedMethod = availablePayoutMethods.find(pm => pm.id === payoutMethodId);
    if (!selectedMethod) return undefined;

    if (selectedMethod.type === 'bank_account' && selectedMethod.bank_account) {
      return getCountryCurrency(selectedMethod.bank_account.country);
    }
    // Card type doesn't expose country in the type, so we fall back to source currency
    // The API will handle currency conversion if needed
    return undefined;
  };

  // Handle successful recipient creation - go directly to add payout method
  const handleRecipientCreated = (account: Stripe.V2.Core.Account) => {
    setCreatedRecipientAccount(account);
    // Add to locally created recipients (search index has delays)
    setLocallyCreatedRecipients((prev) => [...prev, account]);
    setIsAddPayoutMethodModalOpen(true);
    // Also refetch in background for eventual consistency
    refetchRecipients();
  };

  // Handle payout method added successfully
  const handlePayoutMethodAdded = () => {
    // Auto-select the newly created recipient
    if (createdRecipientAccount && account) {
      setRecipientAccountId(createdRecipientAccount.id);
      // Invalidate payout methods cache so it fetches for the new recipient
      queryClient.invalidateQueries({
        queryKey: ['payout-methods', account.id, createdRecipientAccount.id],
      });
    }
    setIsAddPayoutMethodModalOpen(false);
    setCreatedRecipientAccount(null);
    refetchRecipients();
  };

  return (
    <>
      <AddRecipientModal
        open={isAddRecipientModalOpen}
        onClose={() => setIsAddRecipientModalOpen(false)}
        onSuccess={() => { }}
        onRecipientCreated={handleRecipientCreated}
      />

      {createdRecipientAccount && account && (
        <AddPayoutMethodModal
          open={isAddPayoutMethodModalOpen}
          onClose={() => setIsAddPayoutMethodModalOpen(false)}
          connectedAccountId={account.id}
          recipientAccount={createdRecipientAccount}
          onSuccess={handlePayoutMethodAdded}
        />
      )}

      <Dialog open={open} onClose={onClose} className='relative z-10'>
        <DialogBackdrop
          transition
          className='fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-leave:duration-200 data-enter:ease-out data-leave:ease-in'
        />

        <form onSubmit={handleSubmitPayment}>
          <div className='fixed inset-0 z-10 w-screen overflow-y-auto'>
            <div className='flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0'>
              <DialogPanel
                transition
                className='relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-leave:duration-200 data-enter:ease-out data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:data-closed:translate-y-0 sm:data-closed:scale-95'
              >
                <div>
                  <DialogTitle
                    as='h3'
                    className='text-lg font-semibold text-gray-900'
                  >
                    {t('modals.payment.title')}
                  </DialogTitle>
                  <p className='mt-1 text-sm text-gray-500'>
                    {t('modals.payment.description', {
                      accountName: selectedFA.display_name,
                    })}
                  </p>
                </div>

                {!isCreatingPayment && paymentError && (
                  <div className='mt-4'>
                    <Alert>{t('modals.payment.error')}</Alert>
                  </div>
                )}

                <div className='mt-4 flex flex-col gap-y-4'>
                  {/* Source Financial Account Selection */}
                  {allFinancialAccounts && allFinancialAccounts.length > 1 && (
                    <Select
                      label='Pay from'
                      value={selectedFaId}
                      onChange={(value) => setSelectedFaId(value || sourceFinancialAccount.id)}
                      options={allFinancialAccounts.map((fa) => ({
                        value: fa.id,
                        label: `${fa.display_name ?? fa.id} — ${Object.values(fa.balance?.available ?? {})[0] ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: (Object.values(fa.balance!.available!)[0] as any).currency.toUpperCase() }).format((Object.values(fa.balance!.available!)[0] as any).value / 100) : '—'}`,
                      }))}
                      nullable={false}
                      required
                    />
                  )}

                  {/* Recipient Account Selection */}
                  <div>
                    <Select
                      label={t('modals.payment.form.recipient-account')}
                      value={recipientAccountId}
                      onChange={(value) => setRecipientAccountId(value || '')}
                      options={allRecipients.map((acc) => ({
                        value: acc.id,
                        label: getAccountLabel(acc as Stripe.V2.Core.Account),
                      }))}
                      placeholder={
                        isLoadingRecipients
                          ? t('modals.payment.form.loading-accounts')
                          : allRecipients.length === 0
                            ? t('modals.payment.form.no-accounts-available')
                            : t('modals.payment.form.select-recipient-account')
                      }
                      disabled={isLoadingRecipients || allRecipients.length === 0}
                      nullable
                      required
                    />
                    <Button
                      type='button'
                      onClick={() => setIsAddRecipientModalOpen(true)}
                      className='mt-2 w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    >
                      {t('modals.payment.form.add-recipient')}
                    </Button>
                  </div>

                  {/* Payout Method Selection */}
                  <div>
                    <Select
                      label={t('modals.payment.form.destination')}
                      value={payoutMethodId}
                      onChange={(value) => setPayoutMethodId(value || '')}
                      options={availablePayoutMethods.map((pm) => ({
                        value: pm.id,
                        label: getPayoutMethodLabel(pm),
                      }))}
                      placeholder={
                        !recipientAccountId
                          ? t('modals.payment.form.select-account-first')
                          : isLoadingPayoutMethods
                            ? t('modals.payment.form.loading-payout-methods')
                            : availablePayoutMethods.length === 0
                              ? t('modals.payment.form.no-payout-methods-available')
                              : t('modals.payment.form.select-destination')
                      }
                      disabled={
                        !recipientAccountId ||
                        isLoadingPayoutMethods ||
                        availablePayoutMethods.length === 0
                      }
                      nullable
                      required
                    />
                    {/* Show "Add bank account" when recipient selected but has no payout methods */}
                    {recipientAccountId && !isLoadingPayoutMethods && availablePayoutMethods.length === 0 && (
                      <Button
                        type='button'
                        onClick={() => {
                          const selectedRecipient = allRecipients.find((r) => r.id === recipientAccountId);
                          if (selectedRecipient) {
                            setCreatedRecipientAccount(selectedRecipient as Stripe.V2.Core.Account);
                            setIsAddPayoutMethodModalOpen(true);
                          }
                        }}
                        className='mt-2 w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      >
                        + Add bank account for this recipient
                      </Button>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <CurrencyInput
                      label={t('modals.payment.form.amount', {
                        available: (availableBalance / 100).toFixed(2),
                        currency: currency.toUpperCase(),
                      })}
                      currency={currency as CurrencyCode}
                      onChange={setAmount}
                      required
                      max={availableBalance / 100}
                    />
                    {amount > availableBalance && (
                      <p className='mt-1 text-sm text-red-500'>
                        {t('modals.payment.form.insufficient-funds')}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <Input
                    label={t('modals.payment.form.description')}
                    value={description}
                    onChange={setDescription}
                    placeholder={t('modals.payment.form.description-placeholder')}
                  />
                </div>

                <div className='flex flex-col md:flex-row gap-4 mt-5'>
                  <Button
                    className='w-full bg-white border border-gray-500 text-gray-500 hover:bg-gray-100'
                    type='button'
                    onClick={onClose}
                  >
                    {t('modals.payment.form.cancel')}
                  </Button>
                  <Button
                    className='w-full'
                    disabled={
                      isCreatingPayment ||
                      !isPaymentFormValid ||
                      isLoadingRecipients ||
                      isLoadingPayoutMethods
                    }
                    type='submit'
                  >
                    {isCreatingPayment ? (
                      <LoadingSpinner className='size-4' strokeWidth={3} />
                    ) : (
                      t('modals.payment.form.send-payment')
                    )}
                  </Button>
                </div>
              </DialogPanel>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
};
