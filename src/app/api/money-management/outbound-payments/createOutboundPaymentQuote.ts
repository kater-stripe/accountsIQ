'use server';

import { initializeStripe } from '@/utils/initializeStripe';
import { plain } from '@/utils/plain';

type CreateOutboundPaymentQuoteParams = {
  connectedAccountId: string;
  fromFinancialAccountId: string;
  recipientAccountId: string;
  payoutMethodId: string;
  amount: number;
  sourceCurrency: string;
  destinationCurrency: string;
  stripeSecretKey?: string;
};

export const createOutboundPaymentQuote = async ({
  connectedAccountId,
  fromFinancialAccountId,
  recipientAccountId,
  payoutMethodId,
  amount,
  sourceCurrency,
  destinationCurrency,
  stripeSecretKey = process.env.STRIPE_SECRET_KEY,
}: CreateOutboundPaymentQuoteParams) => {
  if (!stripeSecretKey) {
    throw new Error('No Stripe secret key provided.');
  }

  const stripe = initializeStripe(stripeSecretKey);

  try {
    const quote = await stripe.v2.moneyManagement.outboundPaymentQuotes.create(
      {
        from: { financial_account: fromFinancialAccountId, currency: sourceCurrency },
        to: { recipient: recipientAccountId, payout_method: payoutMethodId, currency: destinationCurrency },
        amount: { value: amount, currency: sourceCurrency },
      },
      { stripeContext: connectedAccountId },
    );

    return plain(quote);
  } catch (error) {
    console.error('Unable to create outbound payment quote', error);
    return {
      message: error instanceof Error ? error.message : 'Failed to fetch FX quote',
    };
  }
};
