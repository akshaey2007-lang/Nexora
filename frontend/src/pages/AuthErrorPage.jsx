import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, HelpCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthErrorPage() {
  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get('error') || 'unknown_error';
  const { loginWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-nexora-ivory dark:bg-nexora-dark-bg flex items-center justify-center p-5 text-slate-900 dark:text-white">
      <div className="max-w-md w-full bg-white dark:bg-nexora-dark-surface rounded-xl shadow-nexora-md border border-nexora-border dark:border-nexora-border-dark p-6 sm:p-8 space-y-5">
        <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-lg font-bold">Google Sign-In Failed</h1>
          <p className="text-xs font-mono bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg break-all">
            {errorParam}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="font-semibold flex items-center gap-1.5 text-slate-900 dark:text-white">
            <HelpCircle className="w-4 h-4 text-nexora-electric" />
            <span>Troubleshooting</span>
          </div>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong>Test User Access:</strong> If your Google Cloud OAuth consent screen is still in Testing mode, add your Gmail address under <em>Audience &rarr; Test users</em> or publish the app.
            </li>
            <li>
              <strong>Redirect URI:</strong> Verify the callback URL in Google Cloud Console matches your server&apos;s <code className="font-mono">GOOGLE_REDIRECT_URI</code>.
            </li>
            <li>
              <strong>Cancelled Authorization:</strong> Re-try and grant Gmail permissions on the consent prompt.
            </li>
          </ul>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white font-medium text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Signing In Again</span>
          </button>

          <div className="text-center pt-1">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
