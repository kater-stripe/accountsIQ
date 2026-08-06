'use client';

import { useDemoConfig } from '@/context/DemoConfigContext';
import { SignInCard } from '@/components/account/SignInCard';

const SignInPage = () => {

  return (
    <div className='relative grow bg-white flex items-center justify-center'>
      <div className='w-full max-w-md px-6 py-12'>
        <div className='text-center mb-8'>
          <div className='inline-flex items-center gap-0 mb-2'>
            <span className='text-3xl font-bold' style={{ color: '#1C2B47' }}>Accounts</span>
            <span className='text-3xl font-bold' style={{ color: '#3B6AE8' }}>IQ</span>
          </div>
          <p className='text-sm text-gray-400'>Better begins now</p>
        </div>
        <SignInCard />
      </div>
    </div>
  );
};

export default SignInPage;
