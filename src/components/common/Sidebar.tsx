'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDemoConfig } from '@/context/DemoConfigContext';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { UserIcon, ArrowLeftEndOnRectangleIcon } from '@heroicons/react/24/outline';

const BLUE = '#3B6AE8';
const ACTIVE_BG = '#253759';

interface SidebarProps {
  onMobileMenuClose?: () => void;
}

export const Sidebar = ({ onMobileMenuClose }: SidebarProps) => {
  const { language } = useDemoConfig();
  const { signOut } = useDemoMerchant();
  const pathname = usePathname();

  const navItems = [
    { label: 'Home',            href: `/${language}/dashboard` },
    { label: 'Favourites',      href: `/${language}/dashboard/favourites`, disabled: true },
    { label: 'Sales',           href: `/${language}/dashboard/payments` },
    { label: 'Purchases',       href: `/${language}/dashboard/suppliers` },
    { label: 'Items',               href: `/${language}/dashboard/items`, disabled: true },
    { label: 'Financial Accounts',  href: `/${language}/dashboard/financial-accounts` },
    { label: 'General Ledger',      href: `/${language}/dashboard/capital`, disabled: true },
    { label: 'Reports',             href: `/${language}/dashboard/reports` },
    { label: 'Dashboards',          href: `/${language}/dashboard/apps`, disabled: true },
  ];

  const isActive = (href: string) => {
    if (href === `/${language}/dashboard`) {
      return pathname === `/${language}/dashboard`;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col justify-between flex-grow">
      <nav className="px-2 mt-2">
        {navItems.map(({ label, href, disabled }) => {
          const active = isActive(href);
          const inner = (
            <div
              className="flex items-center h-9 text-sm select-none mb-0.5"
              style={{
                paddingLeft: active ? 10 : 12,
                borderLeft: active ? `3px solid ${BLUE}` : '3px solid transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.55)',
                backgroundColor: active ? ACTIVE_BG : 'transparent',
                fontWeight: active ? 600 : 400,
                borderRadius: active ? '0 6px 6px 0' : 0,
                cursor: disabled ? 'default' : undefined,
              }}
            >
              {label}
            </div>
          );
          return disabled ? (
            <span key={label}>{inner}</span>
          ) : (
            <Link key={label} href={href} onClick={onMobileMenuClose}>
              {inner}
            </Link>
          );
        })}
      </nav>

      <nav className="px-2 pb-4">
        <Link href={`/${language}/dashboard/account`} onClick={onMobileMenuClose}>
          <div className="flex items-center gap-2 h-9 text-sm px-3 text-white/55 hover:text-white transition-colors">
            <UserIcon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            Account
          </div>
        </Link>
        <button
          onClick={() => { signOut(); onMobileMenuClose?.(); }}
          className="flex items-center gap-2 h-9 text-sm px-3 w-full text-white/55 hover:text-white transition-colors"
        >
          <ArrowLeftEndOnRectangleIcon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          Sign out
        </button>
      </nav>
    </div>
  );
};
