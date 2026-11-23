import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-nexora-ivory dark:bg-nexora-dark-bg flex items-center justify-center p-6 text-center text-nexora-navy dark:text-white">
      <div className="max-w-md w-full bg-white dark:bg-nexora-dark-surface rounded-2xl shadow-nexora-md border border-nexora-border dark:border-nexora-border-dark p-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-nexora-electric/10 text-nexora-electric flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold">404</h1>
        <h2 className="text-lg font-bold">Page Not Found</h2>
        <p className="text-sm text-nexora-muted">
          The email view or page you requested does not exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-nexora-electric text-white font-semibold text-sm hover:bg-nexora-electric-hover transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
