'use server';

import type { CountryCode } from '@/constants/countryCodes';
import { STRIPE_API_VERSION } from '@/constants/stripeApiVersion';
import { initializeStripe } from '@/utils/initializeStripe';
import { plain } from '@/utils/plain';
import { CountryCode as MockCountryCode, Language as MockLanguage, Mock } from '@/utils/mock';
import { createFinancialAccount } from '@/app/api/money-management/financial-accounts/createFinancialAccount';
import type Stripe from 'stripe';

type CreateAccountParams = {
  countryCode: CountryCode;
  language?: string;
  email: string;
  /** Enables Treasury/money-management capabilities (business_storage, received_credits, outbound_payments) */
  storerCapabilityEnabled?: boolean;
  issuingCapabilityEnabled?: boolean;
  stripeSecretKey?: string;
};

type MoneyManagerCapabilities =
  Stripe.V2.Core.AccountCreateParams.Configuration.MoneyManager.Capabilities;
type BusinessStorage = MoneyManagerCapabilities['business_storage'];

const req = { requested: true as const };

const EURO_COUNTRIES: CountryCode[] = [
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR',
  'GR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL',
  'PT', 'SI', 'SK',
];

/** Request business_storage only for the account's home currency to avoid restricted-capability blocks. */
const buildBusinessStorage = (countryCode: CountryCode): BusinessStorage => {
  if (countryCode === 'GB') return { inbound: { gbp: req }, outbound: { gbp: req } };
  if (EURO_COUNTRIES.includes(countryCode)) return { inbound: { eur: req }, outbound: { eur: req } };
  return { inbound: { usd: req }, outbound: { usd: req } };
};

export const createAccount = async ({
  countryCode,
  language = 'en',
  email,
  storerCapabilityEnabled = false,
  issuingCapabilityEnabled = true,
  stripeSecretKey = process.env.STRIPE_SECRET_KEY,
}: CreateAccountParams) => {
  if (!stripeSecretKey) {
    throw new Error(
      'Unable to create account because neither a secret key was provided nor one was found in the environment variables.',
    );
  }

  const stripe = initializeStripe(stripeSecretKey);

  const { data: customers } = await stripe.customers.list({
    email,
  });

  if (customers.length > 0) {
    return {
      message: 'sign-up.errors.email-already-in-use',
    };
  }

  const mock = new Mock({
    language: language as MockLanguage,
    country: countryCode as MockCountryCode,
    validForConnect: true,
  });

  const companyNames = mock.companyNames();
  const displayName = companyNames.name || email.split('@')[0];

  const account = await stripe.v2.core.accounts.create({
    contact_email: email,
    display_name: displayName,
    configuration: {
      merchant: {
        capabilities: {
          card_payments: {
            requested: true,
          },
        },
      },
      customer: {
        capabilities: {
          automatic_indirect_tax: {
            requested: true,
          },
        },
      },
      ...(issuingCapabilityEnabled
        ? {
            card_creator: {
              capabilities: {
                commercial: {
                  stripe: {
                    prepaid_card: { requested: true },
                  },
                },
              },
            },
          }
        : {}),
      ...(storerCapabilityEnabled
        ? {
            money_manager: {
              capabilities: {
                received_credits: { bank_accounts: { requested: true } },
                business_storage: buildBusinessStorage(countryCode),
                outbound_payments: {
                  bank_accounts: { requested: true },
                  financial_accounts: { requested: true },
                },
                outbound_transfers: {
                  bank_accounts: { requested: true },
                  financial_accounts: { requested: true },
                },
              },
            },
            recipient: {
              capabilities: {
                stripe_balance: {
                  stripe_transfers: { requested: true },
                },
              },
            },
          }
        : {}),
    },
    identity: {
      country: countryCode,
    },
    defaults: {
      responsibilities: {
        fees_collector: 'application',
        losses_collector: 'application',
      },
    },
    dashboard: 'none',
    include: [
      'requirements',
      'configuration.merchant',
      'configuration.money_manager',
      'configuration.recipient',
      'identity',
      'defaults',
    ],
  });

  const shouldPrefillBusinessProfile = email
    .split('@')?.[0]
    ?.includes('+prefill-biz');

  const shouldPrefillIndividual = email
    .split('@')?.[0]
    ?.includes('+prefill-ind');

  let mcc = '5999';

  // Attempt to parse a 3 digit MCC from the e-mail address.
  try {
    const last3 = parseInt(email.split('@')?.[0]?.slice(-3));

    if (!isNaN(last3)) {
      mcc = `0${last3}`;
    }
  } catch {
    // Our attempt to parse an MCC from the e-mail failed, but we can safely ignore this.
  }

  // Attempt to parse a 4 digit MCC from the e-mail address.
  try {
    const last4 = parseInt(email.split('@')?.[0]?.slice(-4));

    if (!isNaN(last4)) {
      mcc = `${last4}`;
    }
  } catch {
    // Our attempt to parse an MCC from the e-mail failed, but we can safely ignore this.
  }

  if (shouldPrefillBusinessProfile) {
    const companyNames = mock.companyNames();

    const individualNames = mock.individualNames();

    const addresses = mock.addresses();

    const person = {
      ...individualNames,
      ...addresses,
      phone: mock.phoneNumber(),
      dob: {
        day: 1,
        month: 1,
        year: 1901,
      },
      id_number: mock.taxId(),
      relationship: {
        owner: true,
        title: 'Owner',
      },
    };

    // The `individualNames` contains a `name` property, but it's not a valid property for the `person` object.
    // @ts-expect-error
    delete person.name;

    await stripe.v2.core.accounts.persons.create(account.id, {
      given_name: person.first_name || person.first_name_kana,
      surname: person.last_name || person.last_name_kana,
      phone: person.phone,
      email: mock.email({
        individualNames,
      }),
      address: person.address
        ? {
            ...person.address,
            country: person.address.country.toLowerCase(),
          }
        : {
            ...person.address_kana,
            country: person.address_kana!.country.toLowerCase(),
          },
      date_of_birth: person.dob,
    });

    const typedAccount = account as Stripe.V2.Core.Account;

    await stripe.v2.core.accounts.update(account.id, {
      configuration: {
        merchant: {
          mcc,
          support: {
            url: 'https://accessible.stripe.com',
            address: addresses.address
              ? {
                  ...addresses.address,
                  country: addresses.address.country.toLowerCase(),
                }
              : {
                  ...addresses.address_kana,
                  country: addresses.address_kana!.country.toLowerCase(),
                },
            email: mock.email({
              companyNames,
            }),
            phone: mock.phoneNumber(),
          },
        },
      },
      identity: {
        entity_type: 'company',
        business_details: {
          registered_name: companyNames.name,
          annual_revenue: {
            amount: {
              value: mock.integer({ min: 10_000, max: 1_000_000 }) * 100,
              currency: typedAccount.defaults?.currency ?? 'usd',
            },
            fiscal_year_end: `${new Date().getFullYear() - 1}-12-30`,
          },
          estimated_worker_count: mock.integer({ min: 2, max: 100 }),
          address: addresses.address
            ? {
                ...addresses.address,
                country: addresses.address.country.toLowerCase(),
              }
            : {
                ...addresses.address_kana,
                country: addresses.address_kana!.country.toLowerCase(),
              },
          phone: mock.phoneNumber(),
        },
      },
    });
  }

  if (shouldPrefillIndividual) {
    const individualNames = mock.individualNames();

    const addresses = mock.addresses();

    await stripe.v2.core.accounts.persons.create(account.id, {
      given_name: individualNames.first_name || individualNames.first_name_kana,
      surname: individualNames.last_name || individualNames.last_name_kana,
      phone: mock.phoneNumber(),
      email: mock.email({
        individualNames,
      }),
      address: addresses.address
        ? {
            ...addresses.address,
            country: addresses.address.country.toLowerCase(),
          }
        : {
            ...addresses.address_kana,
            country: addresses.address_kana!.country.toLowerCase(),
          },
      date_of_birth: {
        day: 1,
        month: 1,
        year: 1901,
      },
    });

    await stripe.v2.core.accounts.update(account.id, {
      configuration: {
        merchant: {
          mcc,
          support: {
            url: 'https://accessible.stripe.com',
            address: addresses.address
              ? {
                  ...addresses.address,
                  country: addresses.address.country.toLowerCase(),
                }
              : {
                  ...addresses.address_kana,
                  country: addresses.address_kana!.country.toLowerCase(),
                },
            email: mock.email({
              individualNames,
            }),
            phone: mock.phoneNumber(),
          },
        },
      },
      identity: {
        entity_type: 'individual',
      },
    });
  }

  // Allows us to use V2 FAs w/ v1 Issuing API. Weird interop imo, but we can solve later.
  if (issuingCapabilityEnabled) {
    try {
      await stripe.accounts.update(account.id, {
        capabilities: {
          card_issuing: {
            requested: true,
          },
        },
      });
    } catch {
      // Expected when the platform hasn't been onboarded for Stripe Issuing.
      // v2 card_creator config is sufficient; this v1 capability is best-effort.
    }
  }

  /**
   * You can pass a v2 account id to legacy customers API to update the underlying customer.
   */
  await stripe.customers.update(account.id, {
    metadata: {
      accountId: account.id,
    },
  });

  // Auto-provision the default GBP financial account for every new connected account.
  if (storerCapabilityEnabled) {
    try {
      await createFinancialAccount({
        name: 'AccountsIQ Wallet',
        accountId: account.id,
        currency: 'gbp',
        stripeSecretKey,
      });
    } catch {
      // Non-fatal: FA can be created manually from the dashboard if this fails.
    }
  }

  return plain(account);
};
