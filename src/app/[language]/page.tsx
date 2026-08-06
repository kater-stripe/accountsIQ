'use client';

import { SignUpCard } from '@/components/account/SignUpCard';

const IndexPage = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left panel — brand */}
      <div style={{ flex: '0 0 45%', background: '#1C2B47', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 0, marginBottom: 24 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Accounts</span>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#3B6AE8', letterSpacing: '-0.02em' }}>IQ</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
            Smarter accounting.<br />Faster payments.
          </h1>
          <p style={{ fontSize: 16, color: '#8892A0', lineHeight: 1.6, margin: 0, maxWidth: 360 }}>
            AccountsIQ combines cloud accounting with embedded Stripe financial accounts, so your team can manage suppliers, track finances, and move money — all in one place.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { icon: '🏦', label: 'Embedded financial accounts & sort codes' },
            { icon: '💳', label: 'Corporate cards via Stripe Issuing' },
            { icon: '📤', label: 'Pay suppliers directly from your ledger' },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 14, color: '#B0B8C2' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — sign-up form */}
      <div style={{ flex: 1, background: '#F4F6F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <SignUpCard />
        </div>
      </div>
    </div>
  );
};

export default IndexPage;
