'use client';

import { SignUpCard } from '@/components/account/SignUpCard';
import { useDemoConfig } from '@/context/DemoConfigContext';
import Link from 'next/link';

const NAVY = '#1C2B47';
const BLUE = '#3B6AE8';

const SignUpPage = () => {
  const { language } = useDemoConfig();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left panel */}
      <div style={{ flex: '0 0 42%', background: NAVY, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 52px' }}>
        {/* Centred content — logo sits above heading */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'baseline', marginBottom: 32 }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Accounts</span>
              <span style={{ fontSize: 30, fontWeight: 800, color: BLUE, letterSpacing: '-0.02em' }}>IQ</span>
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1.3, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
              Cloud accounting built for growing businesses.
            </h1>
            <p style={{ fontSize: 14, color: '#8892A0', lineHeight: 1.75, margin: '0 0 44px', maxWidth: 340 }}>
              Manage your accounts payable, financial accounts, and supplier payments — all in one place.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'Dedicated financial accounts with UK sort codes',
                'Real-time reporting across all accounts',
                'Pay suppliers directly from your ledger',
                'Corporate cards via Stripe Issuing',
              ].map(text => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="12" fill={`${BLUE}33`} />
                    <polyline points="7 12 10 15 17 9" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 13, color: '#B0B8C2' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#4D5761', margin: 0, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24 }}>
          Already have an account?{' '}
          <Link href={`/${language}/sign-in`} style={{ color: '#8892A0', fontWeight: 600, textDecoration: 'underline' }}>
            Sign in
          </Link>
        </p>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, background: '#F4F6F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 80px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Create your account</h2>
            <p style={{ fontSize: 13, color: '#8892A0', margin: 0 }}>Get started with AccountsIQ in minutes</p>
          </div>
          <SignUpCard />
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
