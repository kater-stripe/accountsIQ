'use client';

import { Card } from '../common/Card';
import { ConnectAccountOnboarding } from '@stripe/react-connect-js';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useState } from 'react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { useTranslation } from 'react-i18next';
import { Alert } from '../common/Alert';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { createHostedOnboardingLink as createHostedOnboardingLinkAction } from '@/app/api/accounts/createHostedOnboardingLink';
import { createFinancialAccount as createFinancialAccountAction } from '@/app/api/money-management/financial-accounts/createFinancialAccount';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Combobox } from '../common/Combobox';
import { COUNTRIES, CountryCode, CountryName } from '@/constants/countryCodes';
import Link from 'next/link';

export const SignUpCard = () => {
  const {
    stripeSecretKey,
    language,
    onboardingType,
    storerCapabilityEnabled,
    issuingCapabilityEnabled,
    onboardCollectionFields,
    country: defaultCountryCode,
  } = useDemoConfig();

  const router = useRouter();

  const {
    isSignedIn,
    account,
    createAccount,
    isCreatingAccount,
    createAccountError,
    getAccountByEmail,
    email: merchantEmail,
  } = useDemoMerchant();

  const { t } = useTranslation();

  const [email, setEmail] = useState(merchantEmail);

  const defaultCountry = COUNTRIES.find((c) => c.code === defaultCountryCode);

  const [country, setCountry] = useState<{
    id: CountryCode;
    name: CountryName;
  } | null>({
    id: defaultCountry?.code ?? 'US',
    name: defaultCountry?.name ?? 'United States',
  });

  const {
    mutateAsync: createHostedOnboardingLink,
    isPending: isCreatingHostedOnboardingLink,
    data: hostedOnboardingLink,
  } = useMutation({
    mutationFn: createHostedOnboardingLinkAction,
    onSuccess: ({ url }) => {
      /**
       * As soon as a hosted onboarding link is created, we open it in the current tab.
       */
      window.open(url, '_self');
    },
  });

  return (
    <Card>
      {isSignedIn && onboardingType === 'embedded' ? (
        <div id='connect-account-onboarding'>
          <ConnectAccountOnboarding
            onExit={async () => {
              await getAccountByEmail({
                email: account?.contact_email!,
                stripeSecretKey,
              });

              // Per the docs flow: create FA + financial address immediately after onboarding.
              // Fire-and-forget — don't block the redirect on FA creation failure.
              if (storerCapabilityEnabled && account?.id) {
                createFinancialAccountAction({
                  name: 'AccountsIQ Wallet',
                  accountId: account.id,
                  stripeSecretKey,
                }).catch((err) =>
                  console.error('Failed to create financial account after onboarding:', err),
                );
              }

              router.push(`/${language}/dashboard`);
            }}
            collectionOptions={{
              fields: onboardCollectionFields,
              futureRequirements: 'include',
            }}
          />
        </div>
      ) : (
        <form
          className='flex flex-col gap-6'
          onSubmit={async (e) => {
            e.preventDefault();

            if (!email) {
              return;
            }

            const account = await createAccount({
              email,
              language,
              countryCode: country?.id ?? 'US',
              storerCapabilityEnabled,
              issuingCapabilityEnabled,
              stripeSecretKey,
            });

            if (onboardingType === 'hosted') {
              if ('message' in account) {
                return;
              }

              if (
                account.requirements?.summary?.minimum_deadline?.status !==
                'past_due'
              ) {
                router.push(`/${language}/dashboard`);
                return;
              }

              createHostedOnboardingLink({
                accountId: account!.id,
                stripeSecretKey,
                returnRefreshUrl: `${window.location.origin}${window.location.pathname}`,
                onboardCollectionFields,
              });
            }
          }}
        >
          <div>
            <p className='text-xl font-semibold text-brand-secondary'>
              {t('sign-up.heading')}
            </p>
            <p className='text-brand-secondary'>
              {t('sign-up.existing-account')}{' '}
              <Link
                href={`/${language}/sign-in`}
                className='inline-flex items-center gap-x-1 font-bold underline text-brand-primary'
              >
                <span>{t('sign-up.sign-in')}</span>
                <ArrowRightIcon
                  className='size-4 flex-shrink-0'
                  strokeWidth={2.5}
                />
              </Link>
            </p>
          </div>
          {createAccountError && <Alert>{t(createAccountError.message)}</Alert>}
          <Combobox
            label={t('sign-up.country.label')}
            options={COUNTRIES.map((country) => ({
              id: country.code,
              name: country.name,
            }))}
            required={true}
            value={country}
            onChange={(value) => {
              setCountry(
                value as {
                  id: CountryCode;
                  name: CountryName;
                } | null,
              );
            }}
          />
          <Input
            label={t('sign-up.email.label')}
            value={email ?? ''}
            onChange={(value) => setEmail(value)}
            placeholder='jenny@example.com'
            required={true}
          />
          <Input
            label={t('sign-up.password.label')}
            value='abcdefghi'
            type='password'
            required={true}
          />
          <Input
            label={t('sign-up.confirm-password.label')}
            value='abcdefghi'
            type='password'
            required={true}
          />
          <Button
            type='submit'
            disabled={
              isCreatingAccount ||
              isCreatingHostedOnboardingLink ||
              !!hostedOnboardingLink
            }
            className='w-32 h-10'
          >
            {isCreatingAccount ||
            isCreatingHostedOnboardingLink ||
            !!hostedOnboardingLink ? (
              <LoadingSpinner className='size-4' strokeWidth={3} />
            ) : (
              <>
                {t('sign-up.button.text')}
                <ArrowRightIcon className='size-4' strokeWidth={2.5} />
              </>
            )}
          </Button>
        </form>
      )}
    </Card>
  );
};
