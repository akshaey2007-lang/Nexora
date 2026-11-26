import React, { useEffect } from 'react';
import {
  Shield,
  Zap,
  Lock,
  Mail,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LandingPage() {
  const { user, loginWithGoogle, logout, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If Google OAuth redirects to '/' with ?code= or ?error= (in local dev), forward to backend callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('code') || params.get('error')) {
      window.location.replace(`/auth/google/callback${location.search}`);
    }
  }, [location.search]);

  return (
    <div className="min-h-screen bg-white dark:bg-nexora-dark-bg text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-nexora-border dark:border-nexora-border-dark px-5 sm:px-10 lg:px-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/nexora-icon.png"
            alt="Nexora Mail"
            className="w-8 h-8 object-contain flex-shrink-0"
          />
          <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-white">
            Nexora Mail
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400">
                {user?.email}
              </span>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white font-medium text-sm transition-colors shadow-nexora-xs"
              >
                <span>Open Inbox</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={logout}
                className="px-3 py-2 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-nexora-dark-card transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={loginWithGoogle}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-5 sm:px-8 pt-20 pb-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-nexora-electric dark:text-indigo-300 font-medium text-xs mb-6 border border-indigo-200/70 dark:border-indigo-500/30">
          <Shield className="w-3.5 h-3.5" />
          <span>Google OAuth 2.0 &bull; Gmail API v1</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl leading-[1.12] text-slate-900 dark:text-white">
          A focused workspace for your Gmail inbox.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          Read, compose, triage, and search your live Gmail messages inside a fast, distraction-free interface backed by server-side OAuth 2.0 and encrypted token storage.
        </p>

        {/* Primary CTA */}
        <div className="mt-9">
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-nexora-electric hover:bg-nexora-electric-hover text-white font-semibold text-sm sm:text-base transition-colors shadow-nexora-sm"
            >
              <Mail className="w-4 h-4" />
              <span>Go to Inbox ({user?.email})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={loginWithGoogle}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-nexora-electric hover:bg-nexora-electric-hover text-white font-semibold text-sm sm:text-base disabled:opacity-50 transition-colors shadow-nexora-sm"
            >
              <Mail className="w-4 h-4" />
              <span>Continue with Google</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Core Architecture Highlights */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-5 w-full text-left">
          <div className="p-5 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-nexora-electric dark:text-indigo-400 flex items-center justify-center mb-3.5">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              Direct Gmail API Sync
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Every folder, draft, label, search query, and bulk action syncs directly with your real Gmail account without local mailbox duplication.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3.5">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              AES-256-GCM Token Protection
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              OAuth credentials are encrypted at rest and managed exclusively server-side through HTTP-only session cookies.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-nexora-dark-card text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3.5">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              Sanitized Reading & Streaming
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              HTML message bodies are sanitized via DOMPurify before rendering, and attachments stream through memory with zero disk storage.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-nexora-border dark:border-nexora-border-dark py-6 px-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>&copy; {new Date().getFullYear()} Nexora Mail &bull; Built with React, Express, MongoDB, and the Google Gmail API.</p>
      </footer>
    </div>
  );
}
