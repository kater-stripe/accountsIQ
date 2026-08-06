'use client';

import { SignInCard } from '@/components/account/SignInCard';
import { useDemoConfig } from '@/context/DemoConfigContext';
import Link from 'next/link';

const NAVY = '#1C2B47';
const BLUE = '#3B6AE8';

const SignInPage = () => {
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
              Welcome back.
            </h1>
            <p style={{ fontSize: 14, color: '#8892A0', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 340 }}>
              Sign in to access your AccountsIQ dashboard — manage your financial accounts, pay suppliers, and track your business finances in one place.
            </p>

            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '20px 22px' }}>
              <p style={{ fontSize: 13, color: '#B0B8C2', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                "AccountsIQ gives us a single view of every transaction across our accounts. It&apos;s transformed how we manage our finances."
              </p>
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#4D5761', margin: 0, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24 }}>
          Don&apos;t have an account?{' '}
          <Link href={`/${language}/sign-up`} style={{ color: '#8892A0', fontWeight: 600, textDecoration: 'underline' }}>
            Sign up
          </Link>
        </p>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, background: '#F4F6F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 80px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Sign in to AccountsIQ</h2>
            <p style={{ fontSize: 13, color: '#8892A0', margin: 0 }}>Enter your email to access your dashboard</p>
          </div>
          <SignInCard />
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
