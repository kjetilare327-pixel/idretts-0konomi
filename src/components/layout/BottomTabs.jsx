import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CreditCard, ArrowLeftRight, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/',             label: 'Dashboard',  icon: LayoutDashboard },
  { path: '/transactions', label: 'Transaksjoner', icon: ArrowLeftRight },
  { path: '/payments',     label: 'Betalinger', icon: CreditCard },
  { path: '/members',      label: 'Medlemmer',  icon: Users },
  { path: '/settings',     label: 'Innstillinger', icon: Settings },
];

export default function BottomTabs() {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <tab.icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}