'use client';

import { getCheckoutSessionById } from '@/app/api/checkout-sessions/getCheckoutSessionById';
import { getPaymentIntentById } from '@/app/api/payment-intents/getPaymentIntentById';
import { getSetupIntentById } from '@/app/api/setup-intents/getSetupIntentById';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import type {
  PaymentIntent,
  PaymentIntentResult,
  StripeCheckoutConfirmResult,
  StripeCheckoutStatus,
} from '@stripe/stripe-js';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useCountdown } from 'usehooks-ts';

type HandleablePaymentIntent = Pick<PaymentIntent, 'status'> & {
  last_payment_error: Pick<
    NonNullable<PaymentIntent['last_payment_error']>,
    'message'
  > | null;
};

type HandleCallbacksContextProps = {
  errorMessage: string;
  setErrorMessage: (message: string) => void;
  hasCallbackParameters: boolean;
  handlePaymentIntent: (paymentIntent: HandleablePaymentIntent) => void;
  handlePaymentIntentResult: (paymentIntentResult: PaymentIntentResult) => void;
  handleStripeCheckoutConfirmResult: (
    stripeCheckoutConfirmResult: StripeCheckoutConfirmResult,
  ) => void;
  handleStripeCheckoutStatus: (
    stripeCheckoutStatus: StripeCheckoutStatus,
  ) => void;
  successUrl: string;
  returnUrl: string;
  redirectCountdown: number;
  resetRedirectCountdown: () => void;
};

const HandleCallbacksContext =
  createContext<HandleCallbacksContextProps | null>(null);

export const HandleCallbacksProvider = ({ children }: PropsWithChildren) => {
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { account } = useDemoMerchant();

  const [
    redirectCountdown,
    {
      startCountdown: startRedirectCountdown,
      stopCountdown: stopRedirectCountdown,
      resetCountdown: resetRedirectCountdown,
    },
  ] = useCountdown({
    countStart: 6,
    intervalMs: 1000,
  });

  const pathname = usePathname();

  useEffect(() => {
    setErrorMessage('');
  }, [pathname]);

  const {
    language,
    stripePublishableKey,
    stripeSecretKey,
    chargeType,
    onrampDiscountEligible,
    configure,
  } = useDemoConfig();

  const successUrl = useMemo(() => {
    if (pathname.startsWith(`/${language}/storefront/`)) {
      return `${window.location.origin}/${language}/storefront/${account?.id}/checkout/success`;
    }

    return `${window.location.origin}/${language}/dashboard/sales`;
  }, [pathname, language]);

  const returnUrl = useMemo(() => {
    if (pathname.startsWith(`/${language}/storefront/`)) {
      return `${window.location.origin}/${language}/storefront/${account?.id}/checkout`;
    }

    return `${window.location.origin}/${language}/dashboard`;
  }, [pathname, language]);

  useEffect(() => {
    if (redirectCountdown === 1) {
      stopRedirectCountdown();
      router.push(successUrl);
    }
  }, [redirectCountdown]);

  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  const embeddedSessionId = searchParams.get('session_id');

  const { data: checkoutSession } = useQuery({
    queryKey: [stripeSecretKey, embeddedSessionId],
    queryFn: () =>
      getCheckoutSessionById({
        stripeSecretKey,
        chargeType,
        accountId: account!.id,
        id: embeddedSessionId!,
      }),
    enabled: !!embeddedSessionId,
  });

  useEffect(() => {
    if (checkoutSession === undefined) {
      return;
    }

    switch (checkoutSession?.status) {
      case 'complete':
        if (successUrl.endsWith('/payments')) {
          resetRedirectCountdown();
          startRedirectCountdown();
        } else {
          router.push(successUrl);
        }
        break;
      case 'expired':
        setErrorMessage(t('checkout.payment_status.error'));
        break;
      case 'open':
        setErrorMessage(t('checkout.payment_status.requires_payment_method'));
        break;
    }
  }, [checkoutSession]);

  const paymentIntentId = searchParams.get('payment_intent');
  const paymentIntentClientSecret = searchParams.get(
    'payment_intent_client_secret',
  );

  const { data: paymentIntent } = useQuery({
    queryKey: [
      'paymentIntent',
      paymentIntentId,
      paymentIntentClientSecret,
      chargeType,
      account?.id,
    ],
    queryFn: () =>
      getPaymentIntentById({
        id: paymentIntentId!,
        clientSecret: paymentIntentClientSecret!,
        stripePublishableKey,
        chargeType,
        accountId: account!.id,
      }),
    enabled: !!paymentIntentClientSecret && !!paymentIntentId,
  });

  const handlePaymentIntent = async (
    paymentIntent: HandleablePaymentIntent,
  ) => {
    switch (paymentIntent?.status) {
      case 'succeeded':
      case 'requires_capture':
      case 'processing':
        if (onrampDiscountEligible) {
          // Consume the one-time discount and re-show the promo banner for future cycles
          configure('onrampDiscountEligible', false);
          configure('onrampBannerVisible', true);
        }
        if (successUrl.endsWith('/payments')) {
          resetRedirectCountdown();
          startRedirectCountdown();
        } else {
          router.push(successUrl);
        }
        break;
      case 'requires_payment_method':
        setErrorMessage(t('checkout.payment_status.requires_payment_method'));
        break;
      default:
        setErrorMessage(t('checkout.payment_status.error'));
        break;
    }
  };

  useEffect(() => {
    if (paymentIntent === undefined) {
      return;
    }

    handlePaymentIntent(paymentIntent);
  }, [paymentIntent]);

  const handlePaymentIntentResult = ({
    error,
    paymentIntent,
  }: PaymentIntentResult) => {
    if (error?.message) {
      setErrorMessage(error.message);

      return;
    }

    if (paymentIntent === undefined) {
      setErrorMessage(t('checkout.payment_status.error'));

      return;
    }

    handlePaymentIntent(paymentIntent);
  };

  const handleStripeCheckoutConfirmResult = async (
    stripeCheckoutConfirmResult: StripeCheckoutConfirmResult,
  ) => {
    switch (stripeCheckoutConfirmResult.type) {
      case 'error':
        setErrorMessage(stripeCheckoutConfirmResult.error.message);
        return;
      case 'success':
        if (successUrl.endsWith('/payments')) {
          startRedirectCountdown();
        } else {
          router.push(successUrl);
        }
        return;
    }
  };

  const handleStripeCheckoutStatus = (
    stripeCheckoutStatus: StripeCheckoutStatus,
  ) => {
    switch (stripeCheckoutStatus.type) {
      case 'expired':
        setErrorMessage(t('checkout.payment_status.error'));
        break;
      case 'complete':
        if (successUrl.endsWith('/payments')) {
          resetRedirectCountdown();
          startRedirectCountdown();
        } else {
          router.push(successUrl);
        }
        break;
    }
  };

  const setupIntentId = searchParams.get('setup_intent');
  const setupIntentClientSecret = searchParams.get(
    'setup_intent_client_secret',
  );

  const { data: setupIntent } = useQuery({
    queryKey: [
      setupIntentClientSecret,
      setupIntentId,
      stripePublishableKey,
      chargeType,
      account?.id,
    ],
    queryFn: () =>
      getSetupIntentById({
        clientSecret: setupIntentClientSecret!,
        id: setupIntentId!,
        stripePublishableKey,
        chargeType,
        accountId: account!.id,
      }),
    enabled: !!setupIntentClientSecret && !!setupIntentId,
  });

  useEffect(() => {
    if (!setupIntent) {
      return;
    }

    if (setupIntent.status !== 'succeeded') {
      setErrorMessage(
        setupIntent.last_setup_error?.message ??
          t('checkout.payment_status.error'),
      );
    }
  }, [setupIntent]);

  const hasCallbackParameters =
    embeddedSessionId !== null || paymentIntentClientSecret !== null;

  return (
    <HandleCallbacksContext.Provider
      value={{
        errorMessage,
        setErrorMessage,
        hasCallbackParameters,
        handlePaymentIntent,
        handlePaymentIntentResult,
        handleStripeCheckoutConfirmResult,
        handleStripeCheckoutStatus,
        successUrl,
        returnUrl,
        redirectCountdown,
        resetRedirectCountdown,
      }}
    >
      {children}
    </HandleCallbacksContext.Provider>
  );
};

export const useHandleCallbacks = () => {
  const context = useContext(HandleCallbacksContext);

  if (context === null) {
    throw new Error(
      '`useHandleCallbacks` must be used within a `HandleCallbacksProvider`',
    );
  }

  return context;
};
