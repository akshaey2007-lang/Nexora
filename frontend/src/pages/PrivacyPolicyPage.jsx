import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
            <Shield className="w-3.5 h-3.5" />
            <span>Legal &amp; Data Privacy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Privacy Policy — Nexora Mail
          </h1>
          <p className="text-xs text-slate-400">Effective Date: November 26, 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            1. Information We Access
          </h2>
          <p>
            When you sign in to <strong>Nexora Mail</strong> using Google OAuth 2.0, we request access only to the minimum scopes required to operate the email client:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><code className="text-xs">openid</code>, <code className="text-xs">userinfo.email</code>, and <code className="text-xs">userinfo.profile</code>: to display your name, email address, and profile avatar.</li>
            <li><code className="text-xs">https://www.googleapis.com/auth/gmail.modify</code>: to read, compose, send, search, label, star, archive, draft, and move messages to or from Trash on your behalf.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            2. How We Use &amp; Store Your Data
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Gmail Is the Source of Truth:</strong> Nexora Mail does not duplicate or permanently store your email messages, conversation bodies, or attachments in our database or on server disk.</li>
            <li><strong>Encrypted Credentials:</strong> OAuth tokens are encrypted at rest using AES-256-GCM and are stored strictly server-side alongside HTTP-only session cookies.</li>
            <li><strong>No Third-Party Sharing or Ads:</strong> We never sell, rent, share, or use your Gmail content for advertising, data brokering, or training generalized AI/ML models.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            3. Google API Services User Data Policy (Limited Use)
          </h2>
          <p>
            Nexora Mail&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-nexora-electric underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            4. Revoking Access &amp; Data Deletion
          </h2>
          <p>
            You may disconnect your account at any time via <strong>Settings &rarr; Disconnect</strong> inside Nexora Mail (which removes stored tokens from our database) or revoke permissions directly from your{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-nexora-electric underline"
            >
              Google Account Third-Party Access
            </a>{' '}
            page.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            5. Contact
          </h2>
          <p>
            For questions regarding privacy or data handling, contact the developer at{' '}
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
