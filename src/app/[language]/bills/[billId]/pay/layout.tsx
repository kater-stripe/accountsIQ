import type { PropsWithChildren } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pay Invoice | AccountsIQ',
  icons: {
    icon: '/img/brand/icon.svg',
  },
};

const PayLayout = ({ children }: PropsWithChildren) => {
  return <div className='min-h-screen bg-gray-50'>{children}</div>;
};

export default PayLayout;
