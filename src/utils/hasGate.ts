'use server';

/** Feature gates are not used in this demo — always returns false. */
export const hasGate = async (_params: { gate: string; stripeSecretKey?: string }): Promise<boolean> => {
  return false;
};
