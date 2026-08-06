'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { getCard as getCardAction } from '@/app/api/issuing/getCard';
import { getCardTransactions as getCardTransactionsAction } from '@/app/api/issuing/getCardTransactions';
import { updateCard as updateCardAction } from '@/app/api/issuing/updateCard';
import { getFinancialAddresses as getFinancialAddressesAction } from '@/app/api/money-management/financial-addresses/getFinancialAddresses';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { CardStatusBadge } from './CardStatusBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { formatPrice } from '@/utils/formatPrice';
import type { CurrencyCode } from '@/constants/currencyCodes';
import type { SupportedLanguage } from '@/constants/languages';
import {
  ArrowLeftIcon,
  CreditCardIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import type Stripe from 'stripe';

type CopiedField = 'number' | 'expiry' | 'cvc' | null;

type CardDetailProps = {
  cardId: string;
  onBack: () => void;
};

export const CardDetail = ({ cardId, onBack }: CardDetailProps) => {
  const { stripeSecretKey, language } = useDemoConfig();
  const { account } = useDemoMerchant();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [showSensitive, setShowSensitive] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<CopiedField>(null);

  const copyToClipboard = async (text: string, field: CopiedField) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const { data: card, isPending: isCardLoading } = useQuery({
    queryKey: ['issuing-card', cardId, account?.id, stripeSecretKey],
    queryFn: () =>
      getCardAction({
        cardId,
        accountId: account!.id,
        stripeSecretKey,
      }),
    enabled: !!account,
  });

  const { data: transactions, isPending: isTransactionsLoading } = useQuery({
    queryKey: [
      'issuing-card-transactions',
      cardId,
      account?.id,
      stripeSecretKey,
    ],
    queryFn: () =>
      getCardTransactionsAction({
        cardId,
        accountId: account!.id,
        stripeSecretKey,
      }),
    enabled: !!account,
  });

  // Get the FA ID from the card
  // @ts-expect-error - financial_account_v2 is not in the type definition
  const faId = card?.financial_account_v2 as string | undefined;

  // Fetch financial addresses if there's a linked FA
  const { data: financialAddresses } = useQuery({
    queryKey: ['financial-addresses', faId, stripeSecretKey],
    queryFn: () =>
      getFinancialAddressesAction({
        financialAccountId: faId!,
        stripeSecretKey,
        accountId: account!.id,
      }),
    enabled: !!account && !!faId,
  });

  // Get last4 from financial address
  const faLast4 = (() => {
    if (!financialAddresses || financialAddresses.length === 0) return null;
    const address = financialAddresses[0];
    if (address?.credentials?.type === 'gb_bank_account') {
      return address.credentials.gb_bank_account?.last4;
    } else if (address?.credentials?.type === 'us_bank_account') {
      return address.credentials.us_bank_account?.last4;
    }
    return null;
  })();

  const { mutate: updateCardStatus, isPending: isUpdating } = useMutation({
    mutationFn: updateCardAction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['issuing-card', cardId],
      });
      queryClient.invalidateQueries({
        queryKey: ['issuing-cards'],
      });
    },
  });

  const handleDeactivate = () => {
    if (!account) return;

    updateCardStatus({
      cardId,
      status: 'inactive',
      accountId: account.id,
      stripeSecretKey,
    });
  };

  const handleActivate = () => {
    if (!account) return;

    updateCardStatus({
      cardId,
      status: 'active',
      accountId: account.id,
      stripeSecretKey,
    });
  };

  const handleCancel = () => {
    if (!account) return;

    updateCardStatus({
      cardId,
      status: 'canceled',
      accountId: account.id,
      stripeSecretKey,
    });
  };

  const formatTransactionDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(language || 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className='space-y-4'>
      <ConfirmationModal
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={handleCancel}
        title={t('dashboard.issuing.card-detail.cancel-card')}
        description={t('dashboard.issuing.card-detail.cancel-confirm')}
        confirmLabel={t('dashboard.issuing.card-detail.cancel-card')}
        cancelLabel={t('dashboard.issuing.card-detail.keep-card')}
        destructive
      />

      {/* Header */}
      <div className='flex items-center gap-4'>
        <button
          onClick={onBack}
          className='p-2 hover:bg-gray-100 rounded-md transition-colors'
        >
          <ArrowLeftIcon className='size-5' />
        </button>
        <h2 className='text-lg font-semibold'>
          {t('dashboard.issuing.card-detail.title')}
        </h2>
      </div>

      {/* Card Info */}
      <Card>
        {isCardLoading ? (
          <div className='space-y-4'>
            <Skeleton className='h-6 w-48' />
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-4 w-24' />
          </div>
        ) : card ? (
          <div className='space-y-6'>
            {/* Card Visual */}
            <div className='relative max-w-sm overflow-hidden rounded-xl shadow-2xl'>
              {/* Base black background */}
              <div className='absolute inset-0 bg-black' />
              {/* Subtle gradient overlay */}
              <div className='absolute inset-0 bg-gradient-to-br from-gray-800/30 via-transparent to-gray-900/50' />
              {/* Diagonal shine effect */}
              <div className='absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent' />
              {/* Noise texture overlay */}
              <div
                className='absolute inset-0 opacity-[0.15]'
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />
              {/* Card content */}
              <div className='relative p-6 text-white'>
                <div className='flex justify-between items-start mb-8'>
                  <CreditCardIcon className='size-8 text-gray-400' />
                  <CardStatusBadge status={card.status} />
                </div>
                <div className='space-y-2'>
                  <button
                    type='button'
                    onClick={() => {
                      if (showSensitive && card.number) {
                        copyToClipboard(card.number, 'number');
                      }
                    }}
                    disabled={!showSensitive || !card.number}
                    className={`text-lg font-mono tracking-widest text-left transition-all ${
                      showSensitive && card.number
                        ? 'hover:text-gray-300 cursor-pointer'
                        : 'cursor-default'
                    }`}
                    title={showSensitive && card.number ? 'Click to copy' : undefined}
                  >
                    {showSensitive && card.number
                      ? card.number.replace(/(.{4})/g, '$1 ').trim()
                      : `•••• •••• •••• ${card.last4}`}
                    {copiedField === 'number' && (
                      <ClipboardDocumentCheckIcon className='inline-block ml-2 size-4 text-blue-400' />
                    )}
                  </button>
                  <div className='flex justify-between items-end'>
                    <div>
                      <p className='text-xs text-gray-500'>
                        {t('dashboard.issuing.card-detail.cardholder-label')}
                      </p>
                      <p className='text-sm'>
                        {(card.cardholder as Stripe.Issuing.Cardholder)?.name ||
                          '-'}
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={() => {
                        const expiry = `${String(card.exp_month).padStart(2, '0')}${String(card.exp_year).slice(-2)}`;
                        copyToClipboard(expiry, 'expiry');
                      }}
                      className='text-right hover:text-gray-300 cursor-pointer transition-all'
                      title='Click to copy'
                    >
                      <p className='text-xs text-gray-500'>
                        {t('dashboard.issuing.card-detail.expires')}
                      </p>
                      <p className='text-sm font-mono'>
                        {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}
                        {copiedField === 'expiry' && (
                          <ClipboardDocumentCheckIcon className='inline-block ml-1 size-3 text-blue-400' />
                        )}
                      </p>
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        if (showSensitive && card.cvc) {
                          copyToClipboard(card.cvc, 'cvc');
                        }
                      }}
                      disabled={!showSensitive || !card.cvc}
                      className={`text-right min-w-[40px] transition-all ${
                        showSensitive && card.cvc
                          ? 'hover:text-gray-300 cursor-pointer'
                          : 'cursor-default'
                      }`}
                      title={showSensitive && card.cvc ? 'Click to copy' : undefined}
                    >
                      <p className='text-xs text-gray-500'>CVC</p>
                      <p className='text-sm font-mono'>
                        {showSensitive && card.cvc ? card.cvc : '•••'}
                        {copiedField === 'cvc' && (
                          <ClipboardDocumentCheckIcon className='inline-block ml-1 size-3 text-blue-400' />
                        )}
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className='flex flex-wrap gap-2'>
              <Button
                onClick={() => setShowSensitive(!showSensitive)}
                colorMode='dark'
                className='!w-38 justify-center'
              >
                {showSensitive ? (
                  <>
                    <EyeSlashIcon className='size-4' />
                    {t('dashboard.issuing.card-detail.hide-details')}
                  </>
                ) : (
                  <>
                    <EyeIcon className='size-4' />
                    {t('dashboard.issuing.card-detail.show-details')}
                  </>
                )}
              </Button>

              {card.status === 'active' && (
                <Button onClick={handleDeactivate} disabled={isUpdating}>
                  {isUpdating ? (
                    <LoadingSpinner className='size-4' strokeWidth={3} />
                  ) : (
                    t('dashboard.issuing.card-detail.deactivate')
                  )}
                </Button>
              )}

              {card.status === 'inactive' && (
                <Button onClick={handleActivate} disabled={isUpdating}>
                  {isUpdating ? (
                    <LoadingSpinner className='size-4' strokeWidth={3} />
                  ) : (
                    t('dashboard.issuing.card-detail.activate')
                  )}
                </Button>
              )}

              {card.status !== 'canceled' && (
                <Button
                  onClick={() => setCancelConfirmOpen(true)}
                  disabled={isUpdating}
                  className='bg-red-600 hover:bg-red-700 text-white'
                >
                  {t('dashboard.issuing.card-detail.cancel-card')}
                </Button>
              )}
            </div>

            {/* Card Details */}
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <p className='text-gray-500'>
                  {t('dashboard.issuing.card-detail.type-label')}
                </p>
                <p className='font-medium capitalize'>{card.type}</p>
              </div>
              <div>
                <p className='text-gray-500'>
                  {t('dashboard.issuing.card-detail.currency-label')}
                </p>
                <p className='font-medium uppercase'>{card.currency}</p>
              </div>
              <div>
                <p className='text-gray-500'>
                  {t('dashboard.issuing.card-detail.funding-label')}
                </p>
                <p className='font-medium'>
                  {faId ? (
                    <button
                      onClick={() =>
                        router.push(
                          `/${language}/dashboard/financial-accounts/${faId}`,
                        )
                      }
                      className='inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-medium hover:bg-blue-200 transition-colors cursor-pointer'
                    >
                      FA ••{faLast4 || faId.slice(-4)}
                    </button>
                  ) : (
                    'Issuing Balance'
                  )}
                </p>
              </div>
              <div>
                <p className='text-gray-500'>
                  {t('dashboard.issuing.card-detail.created-label')}
                </p>
                <p className='font-medium'>
                  {new Date(card.created * 1000).toLocaleDateString(
                    language || 'en',
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className='text-gray-500'>Card not found</p>
        )}
      </Card>

      {/* Transactions */}
      <Card>
        <h2 className='text-lg font-semibold mb-4'>
          {t('dashboard.issuing.card-detail.transactions')}
        </h2>
        <div className='flow-root'>
          <div className='-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8'>
            <div className='inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8'>
              <div className='overflow-hidden shadow-sm ring-1 ring-black/5 sm:rounded-lg'>
                <table className='min-w-full divide-y divide-gray-300'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th
                        scope='col'
                        className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6'
                      >
                        {t('dashboard.issuing.card-detail.txn-date')}
                      </th>
                      <th
                        scope='col'
                        className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900'
                      >
                        {t('dashboard.issuing.card-detail.txn-merchant')}
                      </th>
                      <th
                        scope='col'
                        className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900'
                      >
                        {t('dashboard.issuing.card-detail.txn-amount')}
                      </th>
                      <th
                        scope='col'
                        className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900'
                      >
                        {t('dashboard.issuing.card-detail.txn-type')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200 bg-white'>
                    {isTransactionsLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i}>
                          <td className='whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6'>
                            <Skeleton className='h-4 w-32' />
                          </td>
                          <td className='whitespace-nowrap px-3 py-4'>
                            <Skeleton className='h-4 w-28' />
                          </td>
                          <td className='whitespace-nowrap px-3 py-4'>
                            <Skeleton className='h-4 w-20' />
                          </td>
                          <td className='whitespace-nowrap px-3 py-4'>
                            <Skeleton className='h-4 w-16' />
                          </td>
                        </tr>
                      ))
                    ) : transactions && transactions.length > 0 ? (
                      transactions.map((txn) => (
                        <tr key={txn.id}>
                          <td className='whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6'>
                            {formatTransactionDate(txn.created)}
                          </td>
                          <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-500'>
                            {txn.merchant_data?.name || '-'}
                          </td>
                          <td className='whitespace-nowrap px-3 py-4 text-sm font-medium'>
                            {(() => {
                              // Issuing transactions: negative = capture/spending (debit), positive = refund (credit)
                              const isDebit = txn.amount < 0;
                              return (
                                <span className={isDebit ? 'text-red-600' : 'text-blue-600'}>
                                  {isDebit ? '' : '+'}
                                  {formatPrice(
                                    txn.amount,
                                    language as SupportedLanguage,
                                    txn.currency as CurrencyCode,
                                  )}
                                </span>
                              );
                            })()}
                          </td>
                          <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize'>
                            {txn.type}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className='py-8 text-center text-sm text-gray-500'
                        >
                          {t('dashboard.issuing.card-detail.no-transactions')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

