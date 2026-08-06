'use client';

import { useTranslation } from 'react-i18next';
import { Card } from '@/components/common/Card';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getProducts as getProductsAction } from '@/app/api/products/getProducts';
import { formatPrice } from '@/utils/formatPrice';
import { Button } from '@/components/common/Button';
import { useEffect, useState, useRef } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { Select } from '@/components/common/Select';
import {
  EnvelopeIcon,
  PhoneIcon,
  ShoppingCartIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { getLocations as getLocationsAction } from '@/app/api/terminal/locations/getLocations';
import { getReadersByLocationId as getReadersByLocationIdAction } from '@/app/api/terminal/readers/getReadersByLocationId';
import { calculateTax as calculateTaxAction } from '@/app/api/tax-calculations/calculateTax';
import { setReaderDisplay as setReaderDisplayAction } from '@/app/api/terminal/readers/setReaderDisplay';
import type { Stripe } from 'stripe';
import { collectPaymentMethod as collectPaymentMethodAction } from '@/app/api/terminal/readers/collectPaymentMethod';
import { getReaderById as getReaderByIdAction } from '@/app/api/terminal/readers/getReaderById';
import { cancelReaderAction as cancelReaderActionAction } from '@/app/api/terminal/readers/cancelReaderAction';
import { confirmPaymentIntent as confirmPaymentIntentAction } from '@/app/api/terminal/readers/confirmPaymentIntent';
import Confetti from 'react-confetti';
import { collectPhoneNumber as collectPhoneNumberAction } from '@/app/api/terminal/readers/collectPhoneNumber';
import { collectEmail as collectEmailAction } from '@/app/api/terminal/readers/collectEmail';
import { getIndirectCustomersByEmail as getIndirectCustomersByEmailAction } from '@/app/api/customers/getIndirectCustomersByEmail';
import { getIndirectCustomersByPhoneNumber as getIndirectCustomersByPhoneNumberAction } from '@/app/api/customers/getIndirectCustomersByPhoneNumber';
import { CreateCustomerModal } from '@/components/customer/CreateCustomerModal';
import { formatTime } from '@/utils/formatTime';

const POSPage = () => {
  const { t } = useTranslation();

  const {
    stripeSecretKey,
    chargeType,
    language,
    currency,
    primaryColor,
    secondaryColor,
  } = useDemoConfig();
  const { account } = useDemoMerchant();

  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Track window dimensions and scroll position for confetti
  useEffect(() => {
    const updateWindowDimensions = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight + window.scrollY,
      });
    };

    updateWindowDimensions();
    window.addEventListener('resize', updateWindowDimensions);
    window.addEventListener('scroll', updateWindowDimensions);

    return () => {
      window.removeEventListener('resize', updateWindowDimensions);
      window.removeEventListener('scroll', updateWindowDimensions);
    };
  }, []);

  const getConfettiColors = () => {
    return [primaryColor, secondaryColor];
  };

  const { data: products, isPending: isProductsLoading } = useQuery({
    queryKey: ['products', account?.id, stripeSecretKey, chargeType],
    queryFn: () =>
      getProductsAction({
        accountId: account!.id,
        stripeSecretKey,
        chargeType,
      }),
    enabled: !!account,
  });

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );

  const [selectedReaderId, setSelectedReaderId] = useState<string | null>(null);

  const { data: locations, isPending: isLocationsLoading } = useQuery({
    queryKey: ['locations', account?.id, stripeSecretKey, chargeType],
    queryFn: () =>
      getLocationsAction({
        accountId: account!.id,
        stripeSecretKey,
        chargeType,
      }),
  });

  /**
   * Handles updates when the terminal locations change.
   */
  useEffect(() => {
    if (locations === undefined || locations.length === 0) {
      setSelectedLocationId(null);
      setSelectedReaderId(null);

      return;
    }

    if (selectedLocationId === null) {
      setSelectedLocationId(locations[0].id);
      setSelectedReaderId(null);
    }

    if (
      selectedLocationId &&
      !locations.some((location) => location.id === selectedLocationId)
    ) {
      setSelectedLocationId(null);
      setSelectedReaderId(null);
    }
  }, [locations]);

  const { data: readers, isPending: isReadersLoading } = useQuery({
    queryKey: [
      'readers',
      account?.id,
      selectedLocationId,
      stripeSecretKey,
      chargeType,
    ],
    queryFn: () =>
      getReadersByLocationIdAction({
        accountId: account!.id,
        stripeSecretKey,
        chargeType,
        locationId: selectedLocationId!,
        status: 'online',
      }),
    enabled: !!selectedLocationId,
  });

  /**
   * Handles updates when the terminal readers change.
   */
  useEffect(() => {
    if (readers === undefined || readers.length === 0) {
      setSelectedReaderId(null);

      return;
    }

    if (selectedReaderId === null) {
      setSelectedReaderId(readers[0].id);
    }

    if (
      selectedReaderId &&
      !readers.some((reader) => reader.id === selectedReaderId)
    ) {
      setSelectedReaderId(null);
    }
  }, [readers]);

  const selectedLocation = locations?.find(
    (location) => location.id === selectedLocationId,
  );

  const {
    addItem,
    removeItem,
    setItemQuantity,
    cartRecentlyUpdated,
    items,
    subtotal,
    clearCart,
    hasSubscriptionInCart,
  } = useCart();

  const { data: taxCalculation, isPending: isTaxCalculationLoading } = useQuery(
    {
      queryKey: [
        'tax-calculation',
        account?.id,
        items,
        stripeSecretKey,
        chargeType,
        selectedLocation,
      ],
      queryFn: () =>
        calculateTaxAction({
          items,
          stripeSecretKey,
          currency,
          shippingAddress: {
            city: selectedLocation?.address.city,
            line1: selectedLocation?.address.line1,
            postal_code: selectedLocation?.address.postal_code,
            state: selectedLocation?.address.state,
            country: selectedLocation?.address.country ?? 'US',
          },
          chargeType,
          accountId: account!.id,
        }),
    },
  );

  const { mutate: setReaderDisplay, isPending: isSettingReaderDisplay } =
    useMutation({
      mutationKey: [
        'set-reader-display',
        account?.id,
        stripeSecretKey,
        chargeType,
        items,
        taxCalculation,
      ],
      mutationFn: setReaderDisplayAction,
    });

  /**
   * Updates the reader display when the cart or reader changes.
   */
  useEffect(() => {
    if (!selectedReaderId) {
      return;
    }

    if (isTaxCalculationLoading) {
      return;
    }

    setReaderDisplay({
      readerId: selectedReaderId,
      stripeSecretKey,
      chargeType,
      accountId: account!.id,
      currency,
      items,
      tax:
        (taxCalculation?.tax_amount_exclusive ?? 0) +
        (taxCalculation?.tax_amount_inclusive ?? 0),
      total: taxCalculation?.amount_total ?? 0,
    });
  }, [items, isTaxCalculationLoading, selectedReaderId]);

  /**
   * The current reader state, used for tracking the reader between `setReaderDisplay` and `collectPaymentMethod `.
   */
  const {
    data: reader,
    isLoading: isReaderLoading,
    refetch: refetchReader,
  } = useQuery({
    queryKey: [
      'reader',
      account?.id,
      stripeSecretKey,
      chargeType,
      selectedReaderId,
    ],
    queryFn: () =>
      getReaderByIdAction({
        accountId: account!.id,
        stripeSecretKey,
        chargeType,
        readerId: selectedReaderId!,
      }),
    refetchInterval: 800,
    enabled: !!selectedReaderId,
  });

  const { mutate: confirmPaymentIntent, isPending: isConfirmingPaymentIntent } =
    useMutation({
      mutationKey: [
        'confirm-payment-intent',
        account?.id,
        stripeSecretKey,
        chargeType,
      ],
      mutationFn: async (
        ...params: Parameters<typeof confirmPaymentIntentAction>
      ) => {
        const response = await confirmPaymentIntentAction(...params);

        /**
         * We explicitly want to refresh the reader state before returning the response.
         */
        await refetchReader();

        return response;
      },
      onSuccess: () => {
        clearCart();

        setSelectedCustomerId(null);
        setCustomersFromSearch([]);
        setCreateCustomerModalEmail(null);
        setCreateCustomerModalPhoneNumber(null);
        setIsCreateCustomerModalOpen(false);

        setShowConfetti(true);

        setTimeout(() => {
          setShowConfetti(false);
        }, 8000);
      },
    });

  /**
   * Confirms the payment intent when the reader's payment intent (tied to payment method collection) is in the `requires_confirmation` state.
   */
  useEffect(() => {
    if (!reader) {
      return;
    }

    if (reader.action?.type !== 'collect_payment_method') {
      return;
    }

    const paymentIntent = reader.action.collect_payment_method
      ?.payment_intent as Stripe.PaymentIntent;

    if (paymentIntent.status !== 'requires_confirmation') {
      return;
    }

    console.log('confirmPaymentIntent', {
      readerId: reader.id,
      paymentIntentId: paymentIntent.id,
      stripeSecretKey,
      chargeType,
      items,
      customerId: selectedCustomerId ?? undefined,
      accountId: account!.id,
    });

    confirmPaymentIntent({
      readerId: reader.id,
      paymentIntentId: paymentIntent.id,
      stripeSecretKey,
      chargeType,
      items,
      customerId: selectedCustomerId ?? undefined,
      accountId: account!.id,
    });
  }, [reader]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  const { mutate: collectPaymentMethod, isPending: isCollectingPaymentMethod } =
    useMutation({
      mutationKey: [
        'collect-payment-method',
        account?.id,
        stripeSecretKey,
        chargeType,
        items,
        taxCalculation,
        selectedCustomerId,
      ],
      mutationFn: async (
        ...params: Parameters<typeof collectPaymentMethodAction>
      ) => {
        const response = await collectPaymentMethodAction(...params);

        /**
         * We explicitly want to refresh the reader state before returning the response.
         */
        await refetchReader();

        return response;
      },
    });

  const { mutate: cancelReaderAction, isPending: isCancellingReaderAction } =
    useMutation({
      mutationKey: [
        'cancel-reader-action',
        account?.id,
        stripeSecretKey,
        chargeType,
      ],
      mutationFn: async (
        ...params: Parameters<typeof cancelReaderActionAction>
      ) => {
        const response = await cancelReaderActionAction(...params);

        /**
         * We explicitly want to refresh the reader state before returning the response.
         */
        await refetchReader();

        return response;
      },
      onSuccess: () => {
        setReaderDisplay({
          readerId: selectedReaderId!,
          stripeSecretKey,
          chargeType,
          accountId: account!.id,
          currency,
          items,
          tax:
            (taxCalculation?.tax_amount_exclusive ?? 0) +
            (taxCalculation?.tax_amount_inclusive ?? 0),
          total: taxCalculation?.amount_total ?? 0,
        });
      },
    });

  /**
   * We conditionally show padding on the products card if there's a scrollbar visible.
   */
  const [isProductsScrollbarVisible, setIsProductsScrollbarVisible] =
    useState(false);
  const productsScrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScrollbar = () => {
      if (!productsScrollContainerRef.current) {
        return;
      }

      const { scrollHeight, clientHeight } = productsScrollContainerRef.current;

      setIsProductsScrollbarVisible(scrollHeight > clientHeight);
    };

    checkScrollbar();

    // Check on window resize
    window.addEventListener('resize', checkScrollbar);

    // Clean up the event listener when the component unmounts.
    return () => window.removeEventListener('resize', checkScrollbar);
  }, [products]);

  const [customersFromSearch, setCustomersFromSearch] = useState<
    Stripe.Customer[]
  >([]);

  const { mutate: collectPhoneNumber, isPending: isCollectingPhoneNumber } =
    useMutation({
      mutationKey: [
        'collect-phone-number',
        account?.id,
        stripeSecretKey,
        chargeType,
      ],
      mutationFn: async (
        ...params: Parameters<typeof collectPhoneNumberAction>
      ) => {
        const response = await collectPhoneNumberAction(...params);

        /**
         * We explicitly want to refresh the reader state before returning the response.
         */
        await refetchReader();

        /**
         * Note we're waiting for input collection to complete. We do this so we don't pickup old input collection after a redirect.
         */
        setWaitingForCollectInputs(true);

        return response;
      },
    });

  const { mutate: collectEmail, isPending: isCollectingEmail } = useMutation({
    mutationKey: ['collect-email', account?.id, stripeSecretKey, chargeType],
    mutationFn: async (...params: Parameters<typeof collectEmailAction>) => {
      const response = await collectEmailAction(...params);

      /**
       * We explicitly want to refresh the reader state before returning the response.
       */
      await refetchReader();

      /**
       * Note we're waiting for input collection to complete. We do this so we don't pickup old input collection after a redirect.
       */
      setWaitingForCollectInputs(true);

      return response;
    },
  });

  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] =
    useState(false);

  const [createCustomerModalEmail, setCreateCustomerModalEmail] = useState<
    string | null
  >(null);

  const [createCustomerModalPhoneNumber, setCreateCustomerModalPhoneNumber] =
    useState<string | null>(null);

  const {
    mutate: getIndirectCustomersByEmail,
    isPending: isGettingIndirectCustomersByEmail,
  } = useMutation({
    mutationKey: [
      'get-indirect-customers-by-email',
      account?.id,
      stripeSecretKey,
      chargeType,
    ],
    mutationFn: getIndirectCustomersByEmailAction,
    onSuccess: (data, { email }) => {
      setCustomersFromSearch(data);

      if (data.length === 1) {
        setSelectedCustomerId(data[0].id);
      }

      if (data.length === 0) {
        setCreateCustomerModalPhoneNumber(null);
        setCreateCustomerModalEmail(email);
        setIsCreateCustomerModalOpen(true);
      }
    },
  });

  const {
    mutate: getIndirectCustomersByPhoneNumber,
    isPending: isGettingIndirectCustomersByPhoneNumber,
  } = useMutation({
    mutationKey: [
      'get-indirect-customers-by-phone-number',
      account?.id,
      stripeSecretKey,
      chargeType,
    ],
    mutationFn: getIndirectCustomersByPhoneNumberAction,
    onSuccess: (data, { phoneNumber }) => {
      setCustomersFromSearch(data);

      if (data.length === 1) {
        setSelectedCustomerId(data[0].id);
      }

      if (data.length === 0) {
        setCreateCustomerModalEmail(null);
        setCreateCustomerModalPhoneNumber(phoneNumber);
        setIsCreateCustomerModalOpen(true);
      }
    },
  });

  const [waitingForCollectInputs, setWaitingForCollectInputs] = useState(false);

  useEffect(() => {
    if (!waitingForCollectInputs) {
      return;
    }

    if (!reader) {
      return;
    }

    if (reader.action?.type !== 'collect_inputs') {
      return;
    }

    if (reader.action.status !== 'succeeded') {
      return;
    }

    setWaitingForCollectInputs(false);

    setReaderDisplay({
      readerId: selectedReaderId!,
      stripeSecretKey,
      chargeType,
      accountId: account!.id,
      currency,
      items,
      tax:
        (taxCalculation?.tax_amount_exclusive ?? 0) +
        (taxCalculation?.tax_amount_inclusive ?? 0),
      total: taxCalculation?.amount_total ?? 0,
    });

    const phone = reader.action.collect_inputs?.inputs?.[0]?.phone?.value;

    if (phone) {
      getIndirectCustomersByPhoneNumber({
        phoneNumber: phone,
        stripeSecretKey,
        chargeType,
        accountId: account!.id,
      });

      return;
    }

    const email = reader.action.collect_inputs?.inputs?.[0]?.email?.value;

    if (email) {
      getIndirectCustomersByEmail({
        email,
        stripeSecretKey,
        chargeType,
        accountId: account!.id,
      });

      return;
    }
  }, [reader]);

  return (
    <>
      <CreateCustomerModal
        open={isCreateCustomerModalOpen}
        onClose={(customer) => {
          setIsCreateCustomerModalOpen(false);

          if (customer) {
            setSelectedCustomerId(customer.id);
            setCustomersFromSearch([customer]);
          }
        }}
        email={createCustomerModalEmail}
        phoneNumber={createCustomerModalPhoneNumber}
      />
      <Card className='grid gap-4 mb-6'>
        <Select
          label={t('dashboard.terminal-and-pos.pos.select-location')}
          options={
            locations?.map((location) => ({
              value: location.id,
              label: location.display_name,
            })) ?? []
          }
          value={selectedLocationId ?? undefined}
          onChange={(value) => {
            setSelectedLocationId(value);
          }}
          disabled={isLocationsLoading || locations?.length === 0}
        />
        <Select
          label={t('dashboard.terminal-and-pos.pos.select-reader')}
          options={
            readers?.map((reader) => ({
              value: reader.id,
              label: `${reader.label} (${reader.serial_number})`,
            })) ?? []
          }
          value={selectedReaderId ?? undefined}
          onChange={(value) => {
            setSelectedReaderId(value);
          }}
          disabled={isReadersLoading || readers?.length === 0}
        />
      </Card>
      <div className='grid grid-cols-12 gap-6'>
        <Card
          className='col-span-12 lg:col-span-6 flex flex-col'
          style={{
            height: '46rem',
          }}
        >
          <h2 className='text-lg font-semibold mb-4'>
            {t('dashboard.terminal-and-pos.pos.products')}
          </h2>
          <div
            ref={productsScrollContainerRef}
            className={`grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-6 flex-grow overflow-y-scroll scrollbar scrollbar-w-[6px] scrollbar-thumb-rounded-full scrollbar-thumb-brand-secondary ${isProductsScrollbarVisible ? 'pr-4' : ''}`}
          >
            {isProductsLoading && (
              <div className='col-span-3 sm:col-span-6 lg:col-span-9 flex justify-center items-center'>
                <LoadingSpinner className='size-8' strokeWidth={3} />
              </div>
            )}
            {products?.map((product) => {
              const startTime = product.metadata.startTime
                ? new Date(`1970-01-01T${product.metadata.startTime}`)
                : null;
              const endTime = product.metadata.endTime
                ? new Date(`1970-01-01T${product.metadata.endTime}`)
                : null;

              return (
                <div key={product.id} className='group col-span-3'>
                  <div className='relative'>
                    <img
                      src={
                        product.images.length > 0
                          ? product.images[0]
                          : '/img/empty-product-image.png'
                      }
                      className='rounded-lg object-cover group-hover:opacity-80 transition-opacity'
                    />
                    <div className='absolute bottom-0 w-full opacity-0 group-hover:opacity-100 transition-opacity p-2'>
                      <Button
                        className='w-full'
                        disabled={cartRecentlyUpdated}
                        onClick={() => {
                          addItem(product, product.default_price);
                        }}
                      >
                        {t('dashboard.terminal-and-pos.pos.add-to-cart')}
                      </Button>
                    </div>
                  </div>
                  <div className='mt-4 flex flex-col gap-y-1'>
                    <div className='flex flex-col'>
                      <span className='text-black text-lg font-semibold'>
                        {product.name}
                      </span>
                      {startTime && (
                        <span className='text-gray-500 text-sm'>
                          {formatTime(
                            startTime.getHours(),
                            startTime.getMinutes(),
                            language,
                          )}
                          {endTime &&
                            ` - ${formatTime(endTime.getHours(), endTime.getMinutes(), language)}`}
                        </span>
                      )}
                    </div>
                    <span className='text-black text-lg'>
                      {formatPrice(
                        product.default_price.unit_amount ?? 0,
                        language,
                        currency,
                      )}
                      {product.default_price.recurring?.interval &&
                        ` ${t(`perTimeUnits.${product.default_price.recurring.interval}`)}`}
                    </span>
                  </div>
                </div>
              );
            })}
            {products?.length === 0 && (
              <div className='col-span-3 sm:col-span-6 lg:col-span-9 flex justify-center items-center'>
                <p className='text-gray-500'>
                  {t('dashboard.terminal-and-pos.pos.no-products-found')}{' '}
                  <Link
                    href={`/${language}/dashboard/products`}
                    className='underline text-brand-primary'
                  >
                    {t('dashboard.terminal-and-pos.pos.no-products-found-link')}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </Card>
        <Card
          className='col-span-12 lg:col-span-6 flex flex-col'
          style={{
            height: '46rem',
          }}
        >
          <h2 className='text-lg font-semibold mb-2'>
            {t('dashboard.terminal-and-pos.pos.customer')}
          </h2>
          <div className='flex gap-2 items-end mb-4'>
            <div className='flex-grow'>
              <Select
                label={t('dashboard.terminal-and-pos.pos.customer')}
                options={
                  customersFromSearch.map((customer) => ({
                    value: customer.id,
                    label: customer.name ?? customer.email ?? '',
                  })) ?? []
                }
                value={selectedCustomerId ?? undefined}
                onChange={(value) => {
                  setSelectedCustomerId(value);
                }}
                disabled={
                  customersFromSearch.length === 0 ||
                  isCollectingPaymentMethod ||
                  reader?.action?.type === 'collect_payment_method'
                }
                hideLabel={true}
              />
            </div>
            <Button
              className='shrink-0 h-[2.7rem]'
              disabled={
                !selectedReaderId ||
                isCollectingEmail ||
                isCollectingPhoneNumber ||
                isGettingIndirectCustomersByPhoneNumber ||
                (reader?.action?.type === 'collect_inputs' &&
                  reader?.action.status !== 'succeeded') ||
                reader?.action?.type === 'collect_payment_method' ||
                isCollectingPaymentMethod
              }
              onClick={() =>
                collectPhoneNumber({
                  readerId: selectedReaderId!,
                  stripeSecretKey,
                  chargeType,
                  accountId: account!.id,
                  customText: {
                    title: t(
                      'dashboard.terminal-and-pos.pos.collect-inputs.phone-number.title',
                    ),
                    description: t(
                      'dashboard.terminal-and-pos.pos.collect-inputs.phone-number.description',
                    ),
                  },
                })
              }
            >
              {isCollectingPhoneNumber ||
              isGettingIndirectCustomersByPhoneNumber ||
              (reader?.action?.type === 'collect_inputs' &&
                reader.action.collect_inputs?.inputs[0].phone &&
                reader.action.status !== 'succeeded') ? (
                <LoadingSpinner className='size-5' strokeWidth={3} />
              ) : (
                <PhoneIcon className='size-5' />
              )}
            </Button>
            <Button
              className='shrink-0 h-[2.7rem]'
              disabled={
                !selectedReaderId ||
                isCollectingEmail ||
                isCollectingPhoneNumber ||
                isGettingIndirectCustomersByEmail ||
                (reader?.action?.type === 'collect_inputs' &&
                  reader?.action.status !== 'succeeded') ||
                reader?.action?.type === 'collect_payment_method' ||
                isCollectingPaymentMethod
              }
              onClick={() =>
                collectEmail({
                  readerId: selectedReaderId!,
                  stripeSecretKey,
                  chargeType,
                  accountId: account!.id,
                  customText: {
                    title: t(
                      'dashboard.terminal-and-pos.pos.collect-inputs.email.title',
                    ),
                    description: t(
                      'dashboard.terminal-and-pos.pos.collect-inputs.email.description',
                    ),
                  },
                })
              }
            >
              {isCollectingEmail ||
              isGettingIndirectCustomersByEmail ||
              (reader?.action?.type === 'collect_inputs' &&
                reader.action.collect_inputs?.inputs[0].email &&
                reader.action.status !== 'succeeded') ? (
                <LoadingSpinner className='size-5' strokeWidth={3} />
              ) : (
                <EnvelopeIcon className='size-5' />
              )}
            </Button>
          </div>
          <h2 className='text-lg font-semibold mb-2'>
            {t('dashboard.terminal-and-pos.pos.cart')}
          </h2>
          <div className='grow overflow-y-scroll flex flex-col gap-y-2 scrollbar scrollbar-w-[6px] scrollbar-thumb-rounded-full scrollbar-thumb-brand-secondary'>
            {items.length === 0 && (
              <div className='border border-dashed border-gray-500 rounded-md p-4 text-center flex flex-col items-center gap-y-2'>
                <ShoppingCartIcon className='w-10 h-10 text-gray-500' />
                <p className='text-gray-500'>
                  {t('dashboard.terminal-and-pos.pos.cart-empty')}
                </p>
              </div>
            )}
            {items.map((item) => {
              const startTime = item.product.metadata.startTime
                ? new Date(`1970-01-01T${item.product.metadata.startTime}`)
                : null;
              const endTime = item.product.metadata.endTime
                ? new Date(`1970-01-01T${item.product.metadata.endTime}`)
                : null;

              return (
                <div key={item.product.id} className='py-2 flex gap-x-4 w-full'>
                  <img
                    src={
                      item.product.images.length > 0
                        ? item.product.images[0]
                        : '/img/empty-product-image.png'
                    }
                    className='shrink-0 w-24 h-24 rounded-lg object-cover group-hover:opacity-80 transition-opacity'
                  />
                  <div className='flex flex-col gap-y-2 justify-between grow'>
                    <div className='flex flex-col grow'>
                      <div>
                        <span className='text-black text-md font-semibold'>
                          {item.product.name}
                        </span>
                        {startTime && (
                          <span className='text-gray-500 text-sm'>
                            {' '}
                            (
                            {formatTime(
                              startTime.getHours(),
                              startTime.getMinutes(),
                              language,
                            )}
                            {endTime &&
                              ` - ${formatTime(endTime.getHours(), endTime.getMinutes(), language)}`}
                            )
                          </span>
                        )}
                      </div>
                      <span className='text-black text-md'>
                        {formatPrice(
                          item.price.unit_amount ?? 0,
                          language,
                          currency,
                        )}
                        {item.price.recurring?.interval &&
                          ` ${t(`perTimeUnits.${item.price.recurring.interval}`)}`}
                      </span>
                    </div>
                    <div className='grid grid-cols-12 gap-x-4'>
                      <div className='col-span-2'>
                        <Select
                          label={t('dashboard.terminal-and-pos.pos.quantity')}
                          value={item.quantity}
                          onChange={(value) => {
                            setItemQuantity(item, value);
                          }}
                          hideLabel={true}
                          options={[
                            { value: 1, label: '1' },
                            { value: 2, label: '2' },
                            { value: 3, label: '3' },
                            { value: 4, label: '4' },
                            { value: 5, label: '5' },
                            { value: 6, label: '6' },
                            { value: 7, label: '7' },
                            { value: 8, label: '8' },
                            { value: 9, label: '9' },
                            { value: 10, label: '10' },
                            ...(item.quantity >= 10
                              ? [
                                  ...(item.quantity > 11
                                    ? [
                                        {
                                          value: item.quantity - 1,
                                          label: `${item.quantity - 1}`,
                                        },
                                      ]
                                    : []),
                                  ...(item.quantity > 10
                                    ? [
                                        {
                                          value: item.quantity,
                                          label: `${item.quantity}`,
                                        },
                                      ]
                                    : []),
                                  {
                                    value: item.quantity + 1,
                                    label: `${item.quantity + 1}`,
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                      <button
                        className='col-span-1 hover:cursor-pointer'
                        onClick={() => {
                          removeItem(item);
                        }}
                      >
                        <TrashIcon className='w-5 h-5 text-gray-500 hover:text-brand-primary' />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className='shrink-0'>
            <div className='py-4'>
              <div className='flex justify-between p-1'>
                <span>{t('dashboard.terminal-and-pos.pos.subtotal')}</span>{' '}
                <span className='text-right'>
                  {formatPrice(subtotal, language, currency)}
                </span>
              </div>
              <div className='flex justify-between p-1'>
                <span>{t('dashboard.terminal-and-pos.pos.tax')}</span>{' '}
                <span className='text-right'>
                  {isTaxCalculationLoading ? (
                    <LoadingSpinner className='size-4' strokeWidth={3} />
                  ) : (
                    formatPrice(
                      (taxCalculation?.tax_amount_exclusive ?? 0) +
                        (taxCalculation?.tax_amount_inclusive ?? 0),
                      language,
                      currency,
                    )
                  )}
                </span>
              </div>
              <div className='flex justify-between rounded-md p-1'>
                <span className='font-semibold'>
                  {t('dashboard.terminal-and-pos.pos.total')}
                </span>{' '}
                <span className='text-right'>
                  {isTaxCalculationLoading ? (
                    <LoadingSpinner className='size-4' strokeWidth={3} />
                  ) : (
                    formatPrice(
                      taxCalculation?.amount_total ?? 0,
                      language,
                      currency,
                    )
                  )}
                </span>
              </div>
            </div>
            <div className='border-t border-gray-200 pt-4'>
              {(
                reader?.action?.collect_payment_method
                  ?.payment_intent as Stripe.PaymentIntent
              )?.status === 'requires_payment_method' ? (
                <Button
                  className='w-full'
                  disabled={isCancellingReaderAction}
                  onClick={async () => {
                    await cancelReaderAction({
                      readerId: selectedReaderId!,
                      stripeSecretKey,
                      chargeType,
                      accountId: account!.id,
                    });
                  }}
                >
                  {isCancellingReaderAction ? (
                    <LoadingSpinner className='size-5' strokeWidth={3} />
                  ) : (
                    t('dashboard.terminal-and-pos.pos.cancel-payment')
                  )}
                </Button>
              ) : (
                <Button
                  className='w-full'
                  disabled={
                    items.length === 0 ||
                    !selectedReaderId ||
                    isTaxCalculationLoading ||
                    isSettingReaderDisplay ||
                    isReaderLoading ||
                    isCollectingPaymentMethod ||
                    isConfirmingPaymentIntent ||
                    isCollectingEmail ||
                    isCollectingPhoneNumber ||
                    isGettingIndirectCustomersByEmail ||
                    isGettingIndirectCustomersByPhoneNumber ||
                    (reader?.action?.type === 'collect_inputs' &&
                      reader?.action.status !== 'succeeded') ||
                    (hasSubscriptionInCart && !selectedCustomerId)
                  }
                  onClick={() => {
                    if (!selectedReaderId) {
                      return;
                    }

                    if (!taxCalculation) {
                      return;
                    }

                    collectPaymentMethod({
                      readerId: selectedReaderId,
                      stripeSecretKey,
                      chargeType,
                      accountId: account!.id,
                      currency,
                      items,
                      tax:
                        (taxCalculation?.tax_amount_exclusive ?? 0) +
                        (taxCalculation?.tax_amount_inclusive ?? 0),
                      total: taxCalculation?.amount_total ?? 0,
                      customerId: selectedCustomerId,
                      taxCalculationId:
                        'id' in taxCalculation ? taxCalculation.id : undefined,
                    });
                  }}
                >
                  {isTaxCalculationLoading ||
                  isCollectingPaymentMethod ||
                  isConfirmingPaymentIntent ? (
                    <LoadingSpinner className='size-5' strokeWidth={3} />
                  ) : (
                    t('dashboard.terminal-and-pos.pos.pay', {
                      amount: formatPrice(
                        taxCalculation?.amount_total ?? 0,
                        language,
                        currency,
                      ),
                    })
                  )}
                </Button>
              )}
              <div className='flex justify-center mt-1'>
                <button
                  className='text-gray-600 hover:cursor-pointer text-sm hover:text-gray-800'
                  onClick={() => {
                    clearCart();

                    setSelectedCustomerId(null);
                    setCustomersFromSearch([]);
                    setCreateCustomerModalEmail(null);
                    setCreateCustomerModalPhoneNumber(null);
                    setIsCreateCustomerModalOpen(false);

                    cancelReaderAction({
                      readerId: selectedReaderId!,
                      stripeSecretKey,
                      chargeType,
                      accountId: account!.id,
                    });
                  }}
                >
                  {t('dashboard.terminal-and-pos.pos.clear-all')}
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          colors={getConfettiColors()}
          numberOfPieces={300}
          recycle={false}
          gravity={0.15}
        />
      )}
    </>
  );
};

export default POSPage;
