'use client';

import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import {
  ConnectCapitalFinancing,
  ConnectCapitalFinancingApplication,
} from '@stripe/react-connect-js';
import Link from 'next/link';
import { useState } from 'react';

const DARK_BG = '#1A1730';
const AMBER = '#F59E0B';

const AccountsIQLogoAmber = () => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 186 32' width='160' height='28'>
    <text y='24' fontFamily='Arial, Helvetica, sans-serif' fontWeight='700' fontSize='22' fill='white'>
      accounts
    </text>
    <text x='97' y='24' fontFamily='Arial, Helvetica, sans-serif' fontWeight='700' fontSize='22' fill={AMBER}>
      IQ
    </text>
  </svg>
);

const ISV_TABS = ['Home', 'Sam', 'Milsey', 'SAM 1', 'New Dashboard', 'TEST', 'Alex Test', 'Workshop', 'Widgets', 'Finance'];

export default function FinanceDemoPage() {
  const { language } = useDemoConfig();
  const { isSignedIn } = useDemoMerchant();
  const [activeTab, setActiveTab] = useState('Your offer');
  const [waitingForUpdate, setWaitingForUpdate] = useState(false);

  return (
    <div className='flex h-screen overflow-hidden font-sans'>
      {/* Left panel */}
      <div
        className='w-[34%] flex-shrink-0 flex flex-col justify-between p-10 select-none'
        style={{ backgroundColor: DARK_BG }}
      >
        <div>
          <AccountsIQLogoAmber />
          <p
            className='mt-3 text-xs tracking-[0.2em] uppercase font-semibold'
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            Embedded Finance
          </p>

          <h1 className='mt-8 text-3xl font-bold leading-tight text-white'>
            Merchant Finance<br />in the Software
          </h1>

          <div className='mt-5 w-12 h-1 rounded' style={{ backgroundColor: AMBER }} />

          <ul className='mt-8 space-y-5'>
            {[
              'Pre-approved offer embedded in the software where they run their business',
              'Customisable amount via slider — £5k to £45k',
              'Repayment breakdown — live as the merchant adjusts',
              '"Powered by AccountsIQ" — co-branded, seamlessly embedded',
            ].map((point) => (
              <li key={point} className='flex items-start gap-3'>
                <span
                  className='mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0'
                  style={{ backgroundColor: AMBER }}
                />
                <span className='text-white/80 text-sm leading-relaxed'>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className='text-xs' style={{ color: 'rgba(255,255,255,0.3)' }}>
          AccountsIQ · Confidential · August 2026
        </p>
      </div>

      {/* Right panel — mock ISV shell */}
      <div className='flex-1 flex flex-col overflow-hidden bg-white'>
        {/* ISV top nav */}
        <div className='border-b border-gray-200 bg-white'>
          <div className='flex items-center px-6 h-12 gap-1 overflow-x-auto'>
            <div className='w-8 h-8 rounded bg-gray-200 mr-3 flex-shrink-0' />
            {ISV_TABS.map((tab) => (
              <button
                key={tab}
                className={`px-3 py-1 text-sm whitespace-nowrap rounded transition-colors ${
                  tab === 'Finance'
                    ? 'font-semibold border-b-2 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={tab === 'Finance' ? { borderColor: AMBER } : {}}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Breadcrumb + heading */}
        <div className='px-8 pt-5 pb-2 border-b border-gray-100'>
          <nav className='text-xs text-gray-500 mb-2'>
            <span>Finance</span>
            <span className='mx-1.5'>›</span>
            <span>Offers</span>
            <span className='mx-1.5'>›</span>
            <span className='text-gray-700 font-medium'>OFR-20260421-AX72</span>
          </nav>
          <h2 className='text-xl font-semibold text-gray-900'>Merchant finance</h2>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-8'>
          {isSignedIn ? (
            <div className='space-y-4'>
              <ConnectCapitalFinancingApplication
                onApplicationSubmitted={() => setWaitingForUpdate(true)}
              />
              <ConnectCapitalFinancing />
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center h-64 gap-4'>
              <p className='text-gray-500 text-sm'>Sign in to see your pre-approved offer.</p>
              <Link
                href={`/${language}/sign-in`}
                className='px-4 py-2 rounded text-white text-sm font-medium'
                style={{ backgroundColor: AMBER }}
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
