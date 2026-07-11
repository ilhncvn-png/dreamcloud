import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

import AuthGuard from '@/components/AuthGuard';
import AppShell from '@/components/AppShell';

import AuthPage from '@/pages/AuthPage';
import HomePage from '@/pages/HomePage';
import DreamDetailPage from '@/pages/DreamDetailPage';
import ProfilePage from '@/pages/ProfilePage';
import ComingSoonPage from '@/pages/ComingSoonPage';

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 2 * 60 * 1000 },
  },
});

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const { hydrate } = useAuthStore();
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthHydrator>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<AuthPage initialPanel="login" />} />
            <Route path="/register" element={<AuthPage initialPanel="register" />} />
            <Route path="/forgot-password" element={<AuthPage initialPanel="forgot" />} />

            {/* Protected routes */}
            <Route
              path="/home"
              element={
                <AuthGuard>
                  <AppShell>
                    <HomePage />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/dream/:id"
              element={
                <AuthGuard>
                  <AppShell>
                    <DreamDetailPage />
                  </AppShell>
                </AuthGuard>
              }
            />
            <Route
              path="/profile/:username"
              element={
                <AuthGuard>
                  <AppShell>
                    <ProfilePage />
                  </AppShell>
                </AuthGuard>
              }
            />

            {/* Coming soon routes */}
            {[
              { path: '/explore', title: 'Keşfet', icon: '✦' },
              { path: '/atlas', title: 'Rüya Atlası', icon: '◎' },
              { path: '/matches', title: 'Eşleşmeler', icon: '⟡' },
              { path: '/notifications', title: 'Bildirimler', icon: '◉' },
              { path: '/my-world', title: 'Dünyam', icon: '◐' },
            ].map(({ path, title, icon }) => (
              <Route
                key={path}
                path={path}
                element={
                  <AuthGuard>
                    <AppShell>
                      <ComingSoonPage title={title} icon={icon} />
                    </AppShell>
                  </AuthGuard>
                }
              />
            ))}

            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthHydrator>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? '/home' : '/login'} replace />;
}
