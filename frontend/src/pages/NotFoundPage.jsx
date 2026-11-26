import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-nexora-ivory dark:bg-nexora-dark-bg flex items-center justify-center p-6 text-center text-slate-900 dark:text-white">
      <div className="max-w-md w-full bg-white dark:bg-nexora-dark-surface rounded-xl shadow-nexora-md border border-nexora-border dark:border-nexora-border-dark p-8 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-nexora-electric dark:text-indigo-400 flex items-center justify-center mx-auto">
          <Mail className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold">404</h1>
        <h2 className="text-base font-semibold">Page Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The page you requested does not exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white font-medium text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Inbox</span>
        </Link>
      </div>
    </div>
  );
}
