import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-nexora-dark-bg text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="h-16 border-b border-nexora-border dark:border-nexora-border-dark px-5 sm:px-10 lg:px-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/nexora-icon.png" alt="Nexora Mail" className="w-8 h-8 object-contain" />
          <span className="font-semibold text-base tracking-tight">Nexora Mail</span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-nexora-electric"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-12 space-y-8 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <div className="space-y-2 border-b border-nexora-border dark:border-nexora-border-dark pb-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-nexora-electric dark:text-indigo-400">
            <FileText className="w-3.5 h-3.5" />
            <span>Service Agreement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Terms of Service — Nexora Mail
          </h1>
          <p className="text-xs text-slate-400">Effective Date: November 26, 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            1. Acceptance of Terms
          </h2>
          <p>
            By connecting your Google account and using <strong>Nexora Mail</strong>, you agree to use the application solely for lawful email communication in compliance with Google&apos;s Terms of Service and applicable laws.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            2. Service Availability
          </h2>
          <p>
            Nexora Mail is provided &ldquo;as is&rdquo; as a web client interface to the official Google Gmail API. Availability depends on Google API quotas, network connectivity, and hosting infrastructure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            3. User Responsibilities
          </h2>
          <p>
            You are responsible for maintaining the security of your Google account and for any messages composed or sent through your connected mailbox.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            4. Contact
          </h2>
          <p>
            Questions regarding these terms may be sent to{' '}
            <a href="mailto:akshaey2007@gmail.com" className="text-nexora-electric underline">
              akshaey2007@gmail.com
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
