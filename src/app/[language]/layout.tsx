import type { PropsWithChildren } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AccountsIQ',
  icons: {
    icon: '/img/brand/icon.svg',
  },
};

const ZenFlowLayout = ({ children }: PropsWithChildren) => {
  return (
    <main className='grow flex flex-col' data-testid='main'>
      {children}
    </main>
  );
};

export default ZenFlowLayout;
