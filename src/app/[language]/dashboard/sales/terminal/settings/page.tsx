'use client';

import { useTranslation } from 'react-i18next';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getLocations as getLocationsAction } from '@/app/api/terminal/locations/getLocations';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/common/Button';
import { LocationRow } from '@/components/terminal/LocationRow';
import { CreateTerminalLocationModal } from '@/components/terminal/CreateTerminalLocationModal';
import { useEffect, useState } from 'react';
import { Select } from '@/components/common/Select';
import { PairReaderModal } from '@/components/terminal/PairReaderModal';
import { getReadersByLocationId as getReadersByLocationIdAction } from '@/app/api/terminal/readers/getReadersByLocationId';
import { ReaderRow } from '@/components/terminal/ReaderRow';

const TerminalSettingsPage = () => {
  const { t } = useTranslation();

  const { stripeSecretKey, chargeType, canCreateObjects } = useDemoConfig();

  const { account } = useDemoMerchant();

  const { data: locations, isLoading: isLocationsLoading } = useQuery({
    queryKey: ['terminal-locations', account?.id, stripeSecretKey, chargeType],
    queryFn: () =>
      getLocationsAction({
        accountId: account!.id,
        stripeSecretKey,
        chargeType,
      }),
    enabled: !!account,
  });

  const [
    isCreateTerminalLocationModalOpen,
    setIsCreateTerminalLocationModalOpen,
  ] = useState(false);

  const [isPairReaderModalOpen, setIsPairReaderModalOpen] = useState(false);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );

  /**
   * When the locations change, we should update the selected location (for the reader table) automatically.
   */
  useEffect(() => {
    if (!locations || locations?.length === 0) {
      return;
    }

    if (
      selectedLocationId &&
      locations?.some((location) => location.id === selectedLocationId)
    ) {
      return;
    }

    setSelectedLocationId(locations![0].id);
  }, [locations]);

  const { data: readers, isPending: isReadersLoading } = useQuery({
    queryKey: [
      'terminal-readers',
      selectedLocationId,
      stripeSecretKey,
      chargeType,
    ],
    queryFn: () =>
      getReadersByLocationIdAction({
        locationId: selectedLocationId!,
        stripeSecretKey,
        chargeType,
        accountId: account!.id,
      }),
    enabled: !!selectedLocationId,
  });

  return (
    <>
      <CreateTerminalLocationModal
        open={isCreateTerminalLocationModalOpen}
        onClose={() => setIsCreateTerminalLocationModalOpen(false)}
      />
      <PairReaderModal
        open={isPairReaderModalOpen}
        onClose={() => setIsPairReaderModalOpen(false)}
        locationId={selectedLocationId!}
      />
      <Card>
        <h2 className='text-lg font-semibold mb-4'>
          {t('dashboard.terminal-and-pos.terminal.terminal-locations')}
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
                        {t(
                          'dashboard.terminal-and-pos.terminal.locations-table.name',
                        )}
                      </th>
                      <th
                        scope='col'
                        className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900'
                      >
                        {t(
                          'dashboard.terminal-and-pos.terminal.locations-table.address',
                        )}
                      </th>
                      <th
                        scope='col'
                        className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900'
                      >
                        {t(
                          'dashboard.terminal-and-pos.terminal.locations-table.actions',
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200 bg-white'>
                    {isLocationsLoading && (
                      <tr>
                        <td colSpan={4}>
                          <div className='flex items-center justify-center p-4'>
                            <LoadingSpinner className='size-6' />
                          </div>
                        </td>
                      </tr>
                    )}
                    {locations?.map((location) => (
                      <LocationRow key={location.id} location={location} />
                    ))}
                    <tr>
                      <td colSpan={4}>
                        <div className='flex items-center justify-center p-4'>
                          <div className='relative group'>
                            <Button
                              onClick={() =>
                                setIsCreateTerminalLocationModalOpen(true)
                              }
                              disabled={!canCreateObjects}
                            >
                              {t(
                                'dashboard.terminal-and-pos.terminal.locations-table.create-location',
                              )}
                            </Button>
                            {!canCreateObjects && (
                              <span className='absolute left-full ml-2 top-1/2 -translate-y-1/2 w-max max-w-xs p-2 py-1 px-2 text-xs text-dark bg-white border rounded-md shadow-lg invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10'>
                                Use custom keys or direct charges to enable
                                terminal location creation.
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <Card className='mt-4'>
        <h2 className='text-lg font-semibold mb-4'>
          {t('dashboard.terminal-and-pos.terminal.readers')}
        </h2>
        <Select
          label={t('dashboard.terminal-and-pos.terminal.select-location')}
          options={
            locations?.map((location) => ({
              value: location.id,
              label: location.display_name,
            })) ?? []
          }
          disabled={isLocationsLoading || locations?.length === 0}
          value={selectedLocationId ?? undefined}
          onChange={(value) => setSelectedLocationId(value)}
        />
        <div className='flow-root mt-4'>
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
                        {t(
                          'dashboard.terminal-and-pos.terminal.readers-table.name',
                        )}
                      </th>
                      <th
                        scope='col'
                        className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900'
                      >
                        {t(
                          'dashboard.terminal-and-pos.terminal.readers-table.serial-number',
                        )}
                      </th>
                      <th
                        scope='col'
                        className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900'
                      >
                        {t(
                          'dashboard.terminal-and-pos.terminal.readers-table.status',
                        )}
                      </th>
                      <th
                        scope='col'
                        className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900'
                      >
                        {t(
                          'dashboard.terminal-and-pos.terminal.readers-table.actions',
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200 bg-white'>
                    {selectedLocationId && isReadersLoading && (
                      <tr>
                        <td colSpan={4}>
                          <div className='flex items-center justify-center p-4'>
                            <LoadingSpinner className='size-6' />
                          </div>
                        </td>
                      </tr>
                    )}
                    {selectedLocationId &&
                      readers?.map((reader) => (
                        <ReaderRow key={reader.id} reader={reader} />
                      ))}
                    <tr>
                      <td colSpan={4}>
                        <div className='flex items-center justify-center p-4'>
                          <div className='relative group'>
                            <Button
                              onClick={() => setIsPairReaderModalOpen(true)}
                              disabled={
                                !selectedLocationId || !canCreateObjects
                              }
                            >
                              {t(
                                'dashboard.terminal-and-pos.terminal.readers-table.pair-reader',
                              )}
                            </Button>
                            {!canCreateObjects && (
                              <span className='absolute left-full ml-2 top-1/2 -translate-y-1/2 w-max max-w-xs p-2 py-1 px-2 text-xs text-dark bg-white border rounded-md shadow-lg invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10'>
                                Use custom keys or direct charges to enable
                                reader pairing.
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};

export default TerminalSettingsPage;
