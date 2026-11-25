import React, { useEffect } from 'react';
import {
  Shield,
  Zap,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Server,
  Database,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LandingPage() {
  const { user, loginWithGoogle, activateDemoMode, logout, loading, isAuthenticated, demoModeAvailable } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If Google OAuth redirected to '/' with ?code=... or ?error=... (e.g. in local dev proxy), forward to backend callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('code') || params.get('error')) {
      window.location.replace(`/auth/google/callback${location.search}`);
    }
  }, [location.search]);

  const handleDemoClick = async () => {
    const ok = await activateDemoMode();
    if (ok) {
      navigate('/dashboard');
    }
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-nexora-ivory via-white to-nexora-ivory dark:from-nexora-dark-bg dark:via-nexora-dark-surface dark:to-nexora-dark-bg text-nexora-navy dark:text-gray-100 flex flex-col">
      {/* Top Navigation */}
      <header className="h-20 border-b border-nexora-border/80 dark:border-nexora-border-dark px-6 lg:px-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-nexora-navy to-nexora-electric flex items-center justify-center shadow-nexora-sm text-white font-extrabold text-xl">
            N
          </div>
          <span className="font-extrabold text-xl tracking-tight">
            NEXORA<span className="text-nexora-electric">.</span>MAIL
          </span>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-xs font-medium text-nexora-muted">
                Signed in as <strong className="text-nexora-navy dark:text-white">{user?.email}</strong>
              </span>
              <button
                onClick={handleDashboardClick}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-nexora-electric text-white font-semibold text-sm hover:bg-nexora-electric-hover transition-all shadow-nexora-md"
              >
                <span>Open Inbox</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={logout}
                className="px-3.5 py-2.5 rounded-xl border border-nexora-border dark:border-nexora-border-dark text-xs font-semibold text-nexora-muted hover:text-nexora-navy dark:hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <>
              {demoModeAvailable && (
                <button
                  onClick={handleDemoClick}
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-nexora-border dark:border-nexora-border-dark font-semibold text-sm hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-nexora-electric" />
                  <span>Live Interactive Demo</span>
                </button>
              )}

              <button
                onClick={loginWithGoogle}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-nexora-navy dark:bg-white text-white dark:text-nexora-navy font-semibold text-sm hover:opacity-90 transition-all shadow-nexora-sm"
              >
                <span>Sign In with Google</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-6xl mx-auto px-6 pt-16 pb-20 flex flex-col items-center text-center">
        {/* Security Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nexora-electric/10 text-nexora-electric font-semibold text-xs mb-8 border border-nexora-electric/20">
          <Shield className="w-3.5 h-3.5" />
          <span>Official Gmail API &bull; AES-256 Encrypted &bull; Free-Tier Deployable</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-[1.15] text-nexora-navy dark:text-white">
          The Executive Email Client Crafted for{' '}
          <span className="bg-gradient-to-r from-nexora-electric to-nexora-teal bg-clip-text text-transparent">
            Maximum Speed & Security
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-nexora-muted max-w-2xl leading-relaxed">
          Manage your live Gmail account with a distraction-free corporate dashboard. Server-side OAuth 2.0, zero local attachment storage, and real-time synchronization.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {isAuthenticated ? (
            <button
              onClick={handleDashboardClick}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-nexora-electric text-white font-bold text-base hover:bg-nexora-electric-hover hover:shadow-nexora-glow transition-all"
            >
              <Mail className="w-5 h-5" />
              <span>Go to My Inbox ({user?.email})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={loginWithGoogle}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-nexora-electric text-white font-bold text-base hover:bg-nexora-electric-hover hover:shadow-nexora-glow transition-all"
            >
              <Mail className="w-5 h-5" />
              <span>Connect Your Gmail Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {demoModeAvailable && !isAuthenticated && (
            <button
              onClick={handleDemoClick}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-nexora-navy dark:text-white font-bold text-base hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card transition-all shadow-nexora-sm"
            >
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Explore Interactive Demo</span>
            </button>
          )}
        </div>

        {/* Key Architectural Highlights */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-2xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-sm hover:shadow-nexora-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-nexora-electric/10 text-nexora-electric flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-nexora-navy dark:text-white mb-2">
              Official Gmail API
            </h3>
            <p className="text-sm text-nexora-muted leading-relaxed">
              Integrates directly with Google's Gmail API via server-side OAuth 2.0. Send, star, archive, trash, search, and manage real drafts seamlessly.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-sm hover:shadow-nexora-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-nexora-teal/10 text-nexora-teal flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-nexora-navy dark:text-white mb-2">
              AES-256-GCM Token Encryption
            </h3>
            <p className="text-sm text-nexora-muted leading-relaxed">
              Your Google refresh tokens are encrypted at rest with AES-256-GCM. Session cookies are HTTP-only and attachments are never kept on server disk.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-sm hover:shadow-nexora-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-nexora-navy dark:text-white mb-2">
              100% Free-Tier Architecture
            </h3>
            <p className="text-sm text-nexora-muted leading-relaxed">
              Engineered for seamless zero-cost hosting on Render Web Services, GitHub, and MongoDB Atlas Free Cluster.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-nexora-border dark:border-nexora-border-dark py-8 px-6 text-center text-xs text-nexora-muted">
        <p>&copy; {new Date().getFullYear()} NEXORA MAIL &bull; Enterprise Gmail Management Platform &bull; Built with React, Express, and MongoDB.</p>
      </footer>
    </div>
  );
}
