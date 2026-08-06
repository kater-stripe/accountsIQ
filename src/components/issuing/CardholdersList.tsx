'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { getCardholders as getCardholdersAction } from '@/app/api/issuing/getCardholders';
import { updateCardholder as updateCardholderAction } from '@/app/api/issuing/updateCardholder';
import { Skeleton } from '@/components/common/Skeleton';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useState } from 'react';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

export const CardholdersList = () => {
  const { stripeSecretKey } = useDemoConfig();
  const { account } = useDemoMerchant();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    cardholderId: string;
    cardholderName: string;
    action: 'activate' | 'deactivate';
  }>({ open: false, cardholderId: '', cardholderName: '', action: 'deactivate' });

  const { data: cardholders, isPending: isLoading } = useQuery({
    queryKey: ['issuing-cardholders', account?.id, stripeSecretKey],
    queryFn: () =>
      getCardholdersAction({
        accountId: account!.id,
        stripeSecretKey,
      }),
    enabled: !!account,
  });

  const { mutate: updateCardholder } = useMutation({
    mutationFn: updateCardholderAction,
    onMutate: ({ cardholderId }) => {
      setUpdatingId(cardholderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['issuing-cardholders'],
      });
    },
    onSettled: () => {
      setUpdatingId(null);
    },
  });

  const handleConfirmedAction = () => {
    if (!account) return;

    updateCardholder({
      cardholderId: confirmModal.cardholderId,
      status: confirmModal.action === 'deactivate' ? 'inactive' : 'active',
      accountId: account.id,
      stripeSecretKey,
    });
  };

  return (
    <>
      <ConfirmationModal
        open={confirmModal.open}
        onClose={() =>
          setConfirmModal((prev) => ({ ...prev, open: false }))
        }
        onConfirm={handleConfirmedAction}
        title={
          confirmModal.action === 'deactivate'
            ? t('dashboard.issuing.cardholders.deactivate-title')
            : t('dashboard.issuing.cardholders.activate-title')
        }
        description={
          confirmModal.action === 'deactivate'
            ? t('dashboard.issuing.cardholders.deactivate-confirm', {
                name: confirmModal.cardholderName,
              })
            : t('dashboard.issuing.cardholders.activate-confirm', {
                name: confirmModal.cardholderName,
              })
        }
        confirmLabel={
          confirmModal.action === 'deactivate'
            ? t('dashboard.issuing.cardholders.deactivate')
            : t('dashboard.issuing.cardholders.activate')
        }
        cancelLabel={t('dashboard.issuing.cardholders.cancel')}
        destructive={confirmModal.action === 'deactivate'}
      />

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
                      {t('dashboard.issuing.cardholders.name')}
                    </th>
                    <th
                      scope='col'
                      className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900'
                    >
                      {t('dashboard.issuing.cardholders.email')}
                    </th>
                    <th
                      scope='col'
                      className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900'
                    >
                      {t('dashboard.issuing.cardholders.phone')}
                    </th>
                    <th
                      scope='col'
                      className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900'
                    >
                      {t('dashboard.issuing.cardholders.type')}
                    </th>
                    <th
                      scope='col'
                      className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900'
                    >
                      {t('dashboard.issuing.cardholders.status')}
                    </th>
                    <th
                      scope='col'
                      className='px-3 py-3.5 text-right text-sm font-semibold text-gray-900'
                    >
                      {t('dashboard.issuing.cardholders.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 bg-white'>
                  {isLoading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i}>
                        <td className='whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6'>
                          <Skeleton className='h-4 w-32' />
                        </td>
                        <td className='whitespace-nowrap px-3 py-4'>
                          <Skeleton className='h-4 w-40' />
                        </td>
                        <td className='whitespace-nowrap px-3 py-4'>
                          <Skeleton className='h-4 w-28' />
                        </td>
                        <td className='whitespace-nowrap px-3 py-4'>
                          <Skeleton className='h-4 w-20' />
                        </td>
                        <td className='whitespace-nowrap px-3 py-4'>
                          <Skeleton className='h-5 w-16 rounded-full' />
                        </td>
                        <td className='whitespace-nowrap px-3 py-4'>
                          <Skeleton className='h-8 w-24 ml-auto' />
                        </td>
                      </tr>
                    ))
                  ) : cardholders && cardholders.length > 0 ? (
                    cardholders.map((ch) => (
                      <tr key={ch.id}>
                        <td className='whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6'>
                          <div className='flex items-center gap-3'>
                            <UserIcon className='size-5 text-gray-400' />
                            <span className='font-medium text-gray-900'>
                              {ch.name}
                            </span>
                          </div>
                        </td>
                        <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-500'>
                          <div className='flex items-center gap-1.5'>
                            <EnvelopeIcon className='size-4 text-gray-400' />
                            {ch.email || '-'}
                          </div>
                        </td>
                        <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-500'>
                          <div className='flex items-center gap-1.5'>
                            <PhoneIcon className='size-4 text-gray-400' />
                            {ch.phone_number || '-'}
                          </div>
                        </td>
                        <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize'>
                          {ch.type}
                        </td>
                        <td className='whitespace-nowrap px-3 py-4 text-sm'>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                              ch.status === 'active'
                                ? 'bg-blue-100 text-blue-700'
                                : ch.status === 'inactive'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {ch.status}
                          </span>
                        </td>
                        <td className='whitespace-nowrap px-3 py-4 text-sm text-right'>
                          {updatingId === ch.id ? (
                            <LoadingSpinner
                              className='size-4 ml-auto'
                              strokeWidth={3}
                            />
                          ) : ch.status === 'active' ? (
                            <Button
                              className='bg-red-600 hover:bg-red-700 text-white ml-auto'
                              onClick={() =>
                                setConfirmModal({
                                  open: true,
                                  cardholderId: ch.id,
                                  cardholderName: ch.name,
                                  action: 'deactivate',
                                })
                              }
                            >
                              {t('dashboard.issuing.cardholders.deactivate')}
                            </Button>
                          ) : (
                            <Button
                              className='ml-auto'
                              onClick={() =>
                                setConfirmModal({
                                  open: true,
                                  cardholderId: ch.id,
                                  cardholderName: ch.name,
                                  action: 'activate',
                                })
                              }
                            >
                              {t('dashboard.issuing.cardholders.activate')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className='py-8 text-center text-sm text-gray-500'
                      >
                        {t('dashboard.issuing.cardholders.empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
