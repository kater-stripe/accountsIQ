'use client';

import Link from 'next/link';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useMemo, type ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import { useDemoMerchant } from '@/context/DemoMerchantContext';

type LogoProps = Omit<
  ComponentProps<'img'>,
  'src' | 'alt' | 'width' | 'height'
>;

export const Logo = ({ children, ...props }: LogoProps) => {
  const { customLogo, language } = useDemoConfig();
  const pathname = usePathname();

  const { account } = useDemoMerchant();

  const href = useMemo(() => {
    if (pathname.includes('/dashboard')) {
      return `/${language}/dashboard`;
    }

    if (pathname.includes('/storefront')) {
      return `/${language}/storefront/${account?.id}`;
    }

    return `/${language}`;
  }, [account?.id, language, pathname]);

  return (
    <Link href={href}>
      <img
        src={customLogo || '/img/brand/logo.svg'}
        alt='AccountsIQ Logo'
        {...props}
      />
    </Link>
  );
};
