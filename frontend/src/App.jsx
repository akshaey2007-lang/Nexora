import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EmailProvider } from './context/EmailContext';
import { AIProvider } from './context/AIContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

import DashboardLayout from './layouts/DashboardLayout';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import AIAssistantPage from './pages/AIAssistantPage';
import ScheduledEmailsPage from './pages/ScheduledEmailsPage';
import SettingsPage from './pages/SettingsPage';
import AuthErrorPage from './pages/AuthErrorPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-nexora-ivory dark:bg-nexora-dark-bg text-slate-900 dark:text-white gap-3">
        <img
          src="/nexora-icon.png"
          alt="Nexora Mail"
          className="w-10 h-10 object-contain animate-pulse"
        />
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">
          Loading Nexora Mail...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AIProvider>
            <EmailProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public Pages */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/auth/error" element={<AuthErrorPage />} />

                  {/* Authenticated Dashboard Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardPage />} />
                  </Route>

                  <Route
                    path="/ai"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<AIAssistantPage />} />
                  </Route>

                  <Route
                    path="/scheduled"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ScheduledEmailsPage />} />
                  </Route>

                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<SettingsPage />} />
                  </Route>

                  {/* 404 Fallback */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </BrowserRouter>
            </EmailProvider>
          </AIProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
