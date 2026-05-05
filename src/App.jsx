import { Toaster } from "@/components/ui/toaster"
import { AnimatePresence, motion } from 'framer-motion';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ThemeProvider } from '@/lib/ThemeContext';

import AppLayout from '@/components/layout/AppLayout';
import PageTransition from '@/components/layout/PageTransition';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Payments from '@/pages/Payments';
import Expenses from '@/pages/Expenses';
import Members from '@/pages/Members';
import Seasons from '@/pages/Seasons';
import Budget from '@/pages/Budget';
import Reports from '@/pages/Reports';
import AuditLog from '@/pages/AuditLog';
import Settings from '@/pages/Settings';
import Onboarding from '@/pages/Onboarding';
import AiAssistant from '@/pages/AiAssistant';
import Automation from '@/pages/Automation';
import Liquidity from '@/pages/Liquidity';
import BankIntegration from '@/pages/BankIntegration';
import RecurringPayments from '@/pages/RecurringPayments';
import Families from '@/pages/Families';
import Dugnad from '@/pages/Dugnad';
import Consent from '@/pages/Consent';
import PlayerBalance from '@/pages/PlayerBalance';
import SeasonBudget from '@/pages/SeasonBudget';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, checkUserAuth } = useAuth();

  const { data: clubs = [], isLoading: isLoadingClubs } = useQuery({
    queryKey: ['clubs', user?.email],
    queryFn: () => base44.entities.Club.filter({ created_by: user.email }, '-created_date', 1),
    enabled: !isLoadingAuth && !isLoadingPublicSettings && !authError && !!user?.email,
  });

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">KF</span>
          </div>
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  if (isLoadingClubs) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // User hasn't given consent yet → show consent page
  if (user && !user.consent_given) {
    return <Consent onConsented={checkUserAuth} />;
  }

  // No club yet → show onboarding
  if (clubs.length === 0) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<AppLayout />}>
      <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
      <Route path="/transactions" element={<PageTransition><Transactions /></PageTransition>} />
      <Route path="/payments" element={<PageTransition><Payments /></PageTransition>} />
      <Route path="/expenses" element={<PageTransition><Expenses /></PageTransition>} />
      <Route path="/members" element={<PageTransition><Members /></PageTransition>} />
      <Route path="/seasons" element={<PageTransition><Seasons /></PageTransition>} />
      <Route path="/budget" element={<PageTransition><Budget /></PageTransition>} />
      <Route path="/reports" element={<PageTransition><Reports /></PageTransition>} />
      <Route path="/audit-log" element={<PageTransition><AuditLog /></PageTransition>} />
      <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
      <Route path="/ai-assistant" element={<PageTransition><AiAssistant /></PageTransition>} />
      <Route path="/automation" element={<PageTransition><Automation /></PageTransition>} />
      <Route path="/bank-integration" element={<PageTransition><BankIntegration /></PageTransition>} />
      <Route path="/recurring-payments" element={<PageTransition><RecurringPayments /></PageTransition>} />
      <Route path="/families" element={<PageTransition><Families /></PageTransition>} />
      <Route path="/dugnad" element={<PageTransition><Dugnad /></PageTransition>} />
      <Route path="/player-balance" element={<PageTransition><PlayerBalance /></PageTransition>} />
      <Route path="/season-budget" element={<PageTransition><SeasonBudget /></PageTransition>} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App