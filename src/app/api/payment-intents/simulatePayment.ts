'use server';

import { initializeStripe } from '@/utils/initializeStripe';
import { plain } from '@/utils/plain';

type SimulatePaymentParams = {
  accountId: string;
  amount: number; // in minor units (pence)
  currency: string;
  description?: string;
  stripeSecretKey?: string;
};

export const simulatePayment = async ({
  accountId,
  amount,
  currency,
  description,
  stripeSecretKey = process.env.STRIPE_SECRET_KEY,
}: SimulatePaymentParams) => {
  if (!stripeSecretKey) throw new Error('No Stripe secret key');

  const stripe = initializeStripe(stripeSecretKey);

  // Create and immediately confirm with a test card on the connected account
  const pi = await stripe.paymentIntents.create(
    {
      amount,
      currency,
      description: description || 'Simulated sale',
      payment_method: 'pm_card_visa',
      confirm: true,
      return_url: 'https://example.com',
    },
    { stripeAccount: accountId },
  );

  return plain(pi);
};
