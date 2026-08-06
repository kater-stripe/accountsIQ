'use server';

import { initializeStripe } from '@/utils/initializeStripe';
import { plain } from '@/utils/plain';

type GetPaymentIntentsParams = {
  accountId: string;
  limit?: number;
  stripeSecretKey?: string;
};

export const getPaymentIntents = async ({
  accountId,
  limit = 50,
  stripeSecretKey = process.env.STRIPE_SECRET_KEY,
}: GetPaymentIntentsParams) => {
  if (!stripeSecretKey) throw new Error('No Stripe secret key');

  const stripe = initializeStripe(stripeSecretKey);

  const { data } = await stripe.paymentIntents.list(
    { limit },
    { stripeAccount: accountId },
  );

  return plain(data);
};
