import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomTabs from './BottomTabs';
import TopBar from './TopBar';
import FloatingActionButton from './FloatingActionButton';
import TrialBanner from './TrialBanner';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/transactions': 'Transaksjoner',
  '/payments': 'Betalinger',
  '/expenses': 'Utgifter',
  '/members': 'Medlemmer',
  '/seasons': 'Sesonger',
  '/budget': 'Budsjett',
  '/reports': 'Rapporter',
  '/audit-log': 'Revisjonslogg',
  '/settings': 'Innstillinger',
  '/ai-assistant': 'AI Assistent',
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs', user?.email],
    queryFn: () => base44.entities.Club.filter({ created_by: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const club = clubs[0];

  const pageTitle = PAGE_TITLES[location.pathname] || 'KlubbFinans';
  const canGoBack = location.pathname !== '/';

  return (
    <div className="flex h-screen overflow-hidden bg-background safe-top">
      {/* Sidebar – desktop */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {!bannerDismissed && <TrialBanner club={club} onDismiss={() => setBannerDismissed(true)} />}
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
          pageTitle={pageTitle}
          canGoBack={canGoBack}
          onBack={() => navigate(-1)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom tabs – mobile only */}
      <BottomTabs />

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
}