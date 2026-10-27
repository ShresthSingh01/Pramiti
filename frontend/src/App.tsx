import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { ApplicationIngestionModal } from './components/shared/ApplicationIngestionModal';
import api from './lib/api';
import { Theme, getInitialTheme, applyTheme } from './lib/theme';

// Lazy-loaded route views for lightning-fast initial load & code splitting
const Dashboard = lazy(() => import('./features/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const ApplicationListView = lazy(() => import('./features/application/ApplicationList').then(m => ({ default: m.ApplicationListView })));
const ApplicationDetailView = lazy(() => import('./features/application/ApplicationDetail').then(m => ({ default: m.ApplicationDetailView })));
const RuleStoreView = lazy(() => import('./features/rules/RuleStore').then(m => ({ default: m.RuleStoreView })));
const VerificationHubView = lazy(() => import('./features/verification/VerificationHub').then(m => ({ default: m.VerificationHubView })));
const AlertListView = lazy(() => import('./features/alerts/AlertList').then(m => ({ default: m.AlertListView })));
const SettingsView = lazy(() => import('./features/settings/Settings').then(m => ({ default: m.SettingsView })));
const LoginPage = lazy(() => import('./features/auth/LoginPage').then(m => ({ default: m.LoginPage })));

// Sleek fallback loader
const RouteFallback: React.FC = () => (
  <div className="w-full h-80 flex flex-col items-center justify-center space-y-3">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    <span className="text-xs text-text-muted font-medium font-mono">Loading module...</span>
  </div>
);

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('eg_token');
  });
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isSyntheticModalOpen, setIsSyntheticModalOpen] = useState(false);
  const [hasSynthetic, setHasSynthetic] = useState(false);
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  const checkStatus = async () => {
    try {
      const [appRes, alertRes] = await Promise.all([
        api.get<any[]>('/applications'),
        api.get<any[]>('/alerts')
      ]);
      setHasSynthetic(appRes.data.some((a: any) => a.isSynthetic));
      setHasUnreadAlerts(alertRes.data.some((al: any) => !al.acknowledged));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Defer non-critical status check to idle so initial dashboard view paints instantly
      const timer = setTimeout(() => {
        checkStatus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  const handlePurge = async () => {
    if (confirm("Purge all synthetic test applications? The platform will return to a clean empty state.")) {
      try {
        await api.delete('/synthetic');
        checkStatus();
        window.location.reload();
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <LoginPage
          onLogin={() => {
            setIsAuthenticated(true);
          }}
        />
      </Suspense>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-app text-text-primary transition-colors duration-200">
        <Sidebar 
          onOpenSyntheticModal={() => setIsSyntheticModalOpen(true)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar 
            hasUnreadAlerts={hasUnreadAlerts}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <main className="p-6 flex-1 overflow-y-auto">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard onOpenNewAppModal={() => setIsSyntheticModalOpen(true)} />} />
                <Route path="/applications" element={<ApplicationListView onOpenNewAppModal={() => setIsSyntheticModalOpen(true)} />} />
                <Route path="/applications/:id" element={<ApplicationDetailView />} />
                <Route path="/rules" element={<RuleStoreView />} />
                <Route path="/verification" element={<VerificationHubView />} />
                <Route path="/alerts" element={<AlertListView />} />
                <Route path="/settings" element={<SettingsView />} />
              </Routes>
            </Suspense>
          </main>
        </div>

        <ApplicationIngestionModal
          isOpen={isSyntheticModalOpen}
          onClose={() => setIsSyntheticModalOpen(false)}
          onSuccess={() => {
            checkStatus();
          }}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
