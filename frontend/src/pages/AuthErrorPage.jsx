import React from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Sparkles, HelpCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthErrorPage() {
  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get('error') || 'unknown_error';
  const { loginWithGoogle, activateDemoMode, demoModeAvailable } = useAuth();
  const navigate = useNavigate();

  const handleDemo = async () => {
    const ok = await activateDemoMode();
    if (ok) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-nexora-ivory dark:bg-nexora-dark-bg flex items-center justify-center p-6 text-nexora-navy dark:text-white">
      <div className="max-w-lg w-full bg-white dark:bg-nexora-dark-surface rounded-2xl shadow-nexora-lg border border-nexora-border dark:border-nexora-border-dark p-8 space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Google Authentication Alert</h1>
          <p className="text-xs font-mono bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-2 rounded-lg break-all">
            {errorParam}
          </p>
        </div>

        {/* Beginner-friendly explanation */}
        <div className="p-4 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs space-y-2 text-gray-700 dark:text-gray-300 leading-relaxed">
          <div className="font-bold flex items-center gap-1.5 text-nexora-navy dark:text-white">
            <HelpCircle className="w-4 h-4 text-nexora-electric" />
            <span>Common Causes & Quick Resolution:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Testing Audience Restriction:</strong> If your Google Cloud OAuth consent screen is set to <em>"External (Testing)"</em>, you must add your Gmail address to <strong>Audience &rarr; Test users</strong> in the Google Cloud Console.
            </li>
            <li>
              <strong>Redirect URI Mismatch:</strong> Ensure <code>http://localhost:5000/auth/google/callback</code> (or your Render URL) matches the Authorized Redirect URIs in your Google Cloud credentials.
            </li>
            <li>
              <strong>Cancelled Consent:</strong> You might have closed the Google authorization window before granting permissions.
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-nexora-electric text-white font-semibold text-sm hover:bg-nexora-electric-hover transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Connecting Again</span>
          </button>

          {demoModeAvailable && (
            <button
              onClick={handleDemo}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-nexora-navy dark:text-white font-semibold text-sm hover:bg-gray-100 dark:hover:bg-nexora-navy transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Continue in Interactive Demo Mode</span>
            </button>
          )}

          <div className="text-center pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-nexora-muted hover:text-nexora-navy dark:hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Welcome Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
