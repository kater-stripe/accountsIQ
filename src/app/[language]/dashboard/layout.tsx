'use client';

import { AIWizard } from '@/components/ai-wizard/AIWizard';
import { Container } from '@/components/common/Container';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';
import { Logo } from '@/components/common/Logo';
import { Sidebar } from '@/components/common/Sidebar';
import { ConnectNotificationsBannerWrapper } from '@/components/connect/ConnectNotificationsBannerWrapper';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type DashboardLayoutProps = PropsWithChildren;

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { language } = useDemoConfig();
  const { isSignedIn, account, signOut } = useDemoMerchant();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pathname = usePathname();

  const pathnameWithoutLanguage = pathname.replace(`/${language}`, '');

  const { t } = useTranslation();

  /**
   * If we're not signed in, redirect to the sign in page.
   */
  useEffect(() => {
    if (isSignedIn) {
      return;
    }

    router.push(`/${language}/sign-in`);
  }, [isSignedIn]);

  const headings = useMemo(() => {
    switch (pathnameWithoutLanguage) {
      case '/dashboard': {
        const title = t('dashboard.home.greeting', {
          name:
            account?.display_name ||
            account?.identity?.business_details?.registered_name ||
            `${account?.identity?.individual?.given_name ?? ''} ${account?.identity?.individual?.surname ?? ''}`.trim() ||
            account?.contact_email,
        });

        return {
          title,
        };
      }
      case '/dashboard/payouts': {
        return {
          title: t('dashboard.payouts.title'),
        };
      }
      case '/dashboard/products': {
        return {
          title: t('dashboard.products.title'),
        };
      }
      case '/dashboard/financial-accounts': {
        return {
          title: t('dashboard.expenses.title'),
        };
      }
      case '/dashboard/bills': {
        return {
          title: t('dashboard.bills.title'),
        };
      }
      case '/dashboard/cards': {
        return {
          title: t('dashboard.cards.title'),
        };
      }
      case '/dashboard/capital': {
        return {
          title: t('dashboard.capital.title'),
        };
      }
      case '/dashboard/payments': {
        return {
          title: t('dashboard.payments.title'),
        };
      }
      case '/dashboard/invoices': {
        return {
          title: t('dashboard.invoices.title'),
        };
      }
      case '/dashboard/customers': {
        return {
          title: t('dashboard.customers.title'),
        };
      }
      case '/dashboard/tax': {
        return {
          title: t('dashboard.tax.title'),
        };
      }
      case '/dashboard/reports': {
        return {
          title: t('dashboard.reports.title'),
        };
      }
      case '/dashboard/payments/terminal/pos':
        return {
          title: t('dashboard.terminal.pos.title'),
        };
      case '/dashboard/payments/terminal/settings': {
        return {
          title: t('dashboard.terminal.settings.title'),
        };
      }
      case '/dashboard/payments/terminal/shop': {
        return {
          title: t('dashboard.terminal.shop.title'),
        };
      }
      case '/dashboard/payments/settings': {
        return {
          title: t('dashboard.payments.settings.title'),
        };
      }
      case '/dashboard/customers': {
        return {
          title: t('dashboard.customers.title'),
        };
      }
      case '/dashboard/payments/invoices': {
        return {
          title: t('dashboard.invoices.title'),
        };
      }
      case '/dashboard/account': {
        return {
          title: t('dashboard.account.title'),
        };
      }
      case '/dashboard/apps': {
        return {
          title: t('dashboard.apps.title'),
        };
      }
      case '/dashboard/membership': {
        return {
          title: t('dashboard.membership.title'),
        };
      }
      default: {
        if (
          pathnameWithoutLanguage.startsWith(
            '/dashboard/financial-accounts/',
          )
        ) {
          return {
            title: t('dashboard.expenses.financial-account.title'),
          };
        }

        return {
          title: t('dashboard.home.greeting', {
            name:
              account?.display_name ||
              account?.identity?.business_details?.registered_name ||
              account?.identity?.individual?.given_name ||
              account?.contact_email,
          }),
        };
      }
    }
  }, [pathnameWithoutLanguage, account]);

  const hideHeadings = ['/dashboard/onramp', '/dashboard/wallet', '/dashboard/suppliers'].includes(pathnameWithoutLanguage);

  /**
   * We're not signed in or have not completed onboarding. Wait for redirect to home page.
   */
  if (
    !isSignedIn ||
    !account ||
    account.requirements?.summary?.minimum_deadline?.status === 'past_due'
  ) {
    return <LoadingOverlay />;
  }

  return (
    <div className='relative'>
      {/* Mobile Top Navbar */}
      <div className='lg:hidden bg-brand-secondary px-8 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50'>
        <Logo className='flex-shrink-0 max-h-12' />
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className='text-white p-2'
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className='size-6' />
          ) : (
            <Bars3Icon className='size-6' />
          )}
        </button>
      </div>

      <div className='grid grid-cols-12 lg:h-screen'>
        {/* Desktop Sidebar */}
        <div className='hidden lg:flex lg:col-span-2 bg-brand-secondary py-8 flex-col'>
          <Logo className='mb-6 px-8 flex-shrink-0' />
          <Sidebar />
        </div>

        {/* Mobile Sliding Menu */}
        <div
          className={`lg:hidden fixed inset-y-0 left-0 z-40 w-full bg-black transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className='py-8 flex flex-col h-full pt-16'>
            <Sidebar onMobileMenuClose={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>

        {/* Mobile Menu Backdrop */}
        {isMobileMenuOpen && (
          <div
            className='lg:hidden fixed inset-0 bg-black/20 z-30'
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className='col-span-12 lg:col-span-10 min-h-screen pt-16 lg:pt-0 lg:overflow-y-auto' style={{ background: '#F5F7FA' }}>
          <Container>
            {!hideHeadings && (
              <div style={{ marginBottom: 8 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#323E48', letterSpacing: '-0.02em', margin: 0 }}>{headings.title}</h1>
                <div style={{ height: 3, width: 40, background: '#3B6AE8', borderRadius: 2, marginTop: 8 }} />
                {(headings as { subtitle?: string }).subtitle && (
                  <p style={{ fontSize: 14, color: '#8892A0', marginTop: 4 }}>{(headings as { subtitle?: string }).subtitle}</p>
                )}
              </div>
            )}
            <div id='connect-notifications-banner'>
              <ConnectNotificationsBannerWrapper />
            </div>
            <div className='mt-4'>{children}</div>
          </Container>
        </div>
      </div>

      {/* AI Wizard */}
      <AIWizard />
    </div>
  );
};

export default DashboardLayout;
