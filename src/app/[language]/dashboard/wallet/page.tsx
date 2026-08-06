'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoConfig } from '@/context/DemoConfigContext';

const WalletRedirect = () => {
  const { language } = useDemoConfig();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${language}/dashboard`);
  }, [language, router]);
  return null;
};

export default WalletRedirect;
