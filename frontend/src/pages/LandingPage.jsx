import React, { useEffect } from 'react';
import {
  Shield,
  Zap,
  Lock,
  Mail,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

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
            alt="NEXORA MAIL"
            className="w-8 h-8 object-contain flex-shrink-0"
          />
          <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-white">
            NEXORA MAIL
          </span>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white">
              Features
            </a>
            <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-white">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-slate-900 dark:hover:text-white">
              Terms
            </Link>
          </nav>

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
          NEXORA MAIL — A focused workspace for your Gmail inbox.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          NEXORA MAIL is an email management web application powered by the Google Gmail API. Connect your Gmail account to read conversations, compose rich-text emails with attachments, search across labels, and organize your mailbox without clutter.
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

        {/* Public Application Purpose & Data Transparency Section */}
        <section
          id="how-it-works"
          className="mt-16 w-full text-left p-6 sm:p-8 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              About NEXORA MAIL &amp; Google Data Transparency
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              NEXORA MAIL provides a clean productivity dashboard over your existing Gmail mailbox. Users can view Inbox, Starred, Important, Sent, Drafts, Archive, Spam, Trash, and custom labels, perform bulk actions, reply or forward threads, and upload or download attachments directly through Google&apos;s official API.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <div className="space-y-1.5">
              <h3 className="font-semibold text-slate-900 dark:text-white">Requested OAuth Permissions</h3>
              <p>
                NEXORA MAIL requests <code className="text-xs">openid</code>, <code className="text-xs">userinfo.email</code>, <code className="text-xs">userinfo.profile</code>, and <code className="text-xs">gmail.modify</code> solely so you can read, compose, send, label, archive, and trash messages inside the app.
              </p>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-slate-900 dark:text-white">Compliance &amp; Privacy Policy</h3>
              <p>
                We never store email bodies in our database, sell data, or train AI models on Gmail content. Review our{' '}
                <Link to="/privacy" className="text-nexora-electric underline font-medium">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link to="/terms" className="text-nexora-electric underline font-medium">
                  Terms of Service
                </Link>{' '}
                before signing in.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-nexora-border dark:border-nexora-border-dark py-6 px-6 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
        <p>&copy; {new Date().getFullYear()} NEXORA MAIL &bull; Gmail API Client</p>
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="hover:text-slate-700 dark:hover:text-slate-300 underline">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-slate-700 dark:hover:text-slate-300 underline">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
