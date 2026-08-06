'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoConfig } from '@/context/DemoConfigContext';

const DashboardPage = () => {
  const { language } = useDemoConfig();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${language}/dashboard/wallet`);
  }, [language, router]);
  return null;
};

export default DashboardPage;
