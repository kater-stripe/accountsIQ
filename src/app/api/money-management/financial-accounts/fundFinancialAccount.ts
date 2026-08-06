'use server';

import { initializeStripe } from '@/utils/initializeStripe';
import { plain } from '@/utils/plain';

type FundFinancialAccountParams = {
  accountId: string;
  financialAccountId: string;
  /** The financial address ID (fa_addr_...) to credit. Required for test/sandbox. */
  financialAddressId: string;
  amount: number;
  currency: string;
  stripeSecretKey?: string;
};

/**
 * Funds a v2 FinancialAccount by simulating a received credit using the sandbox test helper.
 * Uses stripe.v2.testHelpers.financialAddresses.credit() with stripeContext.
 * For production, replace with stripe.v2.moneyManagement.inboundTransfers.create().
 */
export const fundFinancialAccount = async ({
  accountId,
  financialAccountId: _financialAccountId,
  financialAddressId,
  amount,
  currency,
  stripeSecretKey = process.env.STRIPE_SECRET_KEY,
}: FundFinancialAccountParams) => {
  if (!stripeSecretKey) {
    throw new Error('No Stripe secret key available.');
  }

  const stripe = initializeStripe(stripeSecretKey);

  try {
    const result = await stripe.v2.testHelpers.financialAddresses.credit(
      financialAddressId,
      {
        amount: { value: amount, currency },
        // @ts-ignore — sepa_credit_transfer is supported by the API but missing from the SDK type
        network: currency === 'gbp' ? 'fps' : currency === 'eur' ? 'sepa_credit_transfer' : 'ach',
        statement_descriptor: 'AccountsIQ Top Up',
      },
      {
        stripeContext: accountId,
      },
    );

    return plain(result);
  } catch (error) {
    console.error(`Unable to fund financial account via ${financialAddressId}`, error);
    return {
      message: 'Unable to top up financial account.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
