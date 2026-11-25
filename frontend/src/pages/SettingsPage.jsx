import React, { useState } from 'react';
import {
  Shield,
  Key,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
  Save,
  LogOut,
  ExternalLink,
  Lock,
  Mail,
  Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import settingsService from '../services/settingsService';

export default function SettingsPage() {
  const { user, isDemo, loginWithGoogle, disconnect, settings, setSettings } = useAuth();
  const { theme, setTheme } = useTheme();
  const { success, error } = useToast();

  const [signature, setSignature] = useState(
    settings?.signature || '--\nSent with NEXORA MAIL'
  );
  const [savingSignature, setSavingSignature] = useState(false);

  const handleSaveSignature = async () => {
    setSavingSignature(true);
    try {
      const res = await settingsService.updateSettings({ signature });
      if (res && res.settings) {
        setSettings(res.settings);
        success('Email signature successfully saved.');
      }
    } catch (err) {
      error('Failed to update signature.');
    } finally {
      setSavingSignature(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 sm:p-10 max-w-5xl mx-auto space-y-8 bg-nexora-ivory dark:bg-nexora-dark-bg text-nexora-navy dark:text-gray-100">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">System & Account Settings</h1>
        <p className="text-sm text-nexora-muted mt-1">
          Manage your connected Google Workspace account, preferences, and cryptographic security credentials.
        </p>
      </div>

      {/* Account Connection Status Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-nexora-electric/10 text-nexora-electric flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Connected Google Account</h2>
              <p className="text-xs text-nexora-muted">Gmail API v1 &bull; Server-Side OAuth 2.0</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isDemo
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isDemo ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
            {isDemo ? 'Simulated Demo Session' : 'Active & Synced'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark">
          <div className="flex items-center gap-3">
            <img
              src={
                user?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user?.displayName || 'User'
                )}&background=536DFE&color=fff`
              }
              alt="Profile"
              className="w-12 h-12 rounded-full border border-nexora-border dark:border-nexora-border-dark"
            />
            <div>
              <p className="font-semibold text-sm">{user?.displayName || 'NEXORA User'}</p>
              <p className="text-xs text-nexora-muted">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDemo ? (
              <button
                onClick={loginWithGoogle}
                className="px-4 py-2 rounded-xl bg-nexora-electric text-white text-xs font-semibold hover:bg-nexora-electric-hover transition-colors shadow-sm"
              >
                Connect Real Gmail
              </button>
            ) : (
              <>
                <button
                  onClick={loginWithGoogle}
                  className="px-4 py-2 rounded-xl bg-nexora-electric text-white text-xs font-semibold hover:bg-nexora-electric-hover transition-colors shadow-sm"
                >
                  Switch Account
                </button>
                <button
                  onClick={disconnect}
                  className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  Disconnect Account
                </button>
              </>
            )}
          </div>
        </div>

        {/* Scopes Overview */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-nexora-muted uppercase tracking-wider">
            Authorized OAuth Scopes (Minimum Privilege)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-nexora-teal flex-shrink-0" />
              <span className="font-mono text-gray-700 dark:text-gray-300 truncate">
                .../auth/gmail.modify
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-nexora-teal flex-shrink-0" />
              <span className="font-mono text-gray-700 dark:text-gray-300">openid & email</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-sm space-y-6">
        <h2 className="text-base font-bold">Appearance & Signature</h2>

        {/* Theme */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Interface Theme</p>
            <p className="text-xs text-nexora-muted">Choose between light, dark, or system mode.</p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-nexora-ivory dark:bg-nexora-dark-card rounded-xl border border-nexora-border dark:border-nexora-border-dark">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'bg-white dark:bg-nexora-navy text-nexora-navy dark:text-white shadow-sm'
                  : 'text-nexora-muted hover:text-nexora-navy dark:hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-nexora-navy text-white shadow-sm'
                  : 'text-nexora-muted hover:text-nexora-navy dark:hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-nexora-electric" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        {/* Email Signature */}
        <div className="space-y-2 pt-4 border-t border-nexora-border dark:border-nexora-border-dark">
          <label className="block text-sm font-semibold">Email Signature</label>
          <textarea
            rows={3}
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="--&#10;Sent with NEXORA MAIL"
            className="w-full p-3 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm focus:outline-none focus:ring-2 focus:ring-nexora-electric/40 focus:border-nexora-electric"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSaveSignature}
              disabled={savingSignature}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-nexora-navy dark:bg-white text-white dark:text-nexora-navy text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSignature ? 'Saving...' : 'Save Signature'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security & Cryptography Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-nexora-teal/10 text-nexora-teal flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Security & Compliance Verification</h2>
            <p className="text-xs text-nexora-muted">Hardened enterprise specifications active</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-4 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark space-y-1">
            <div className="flex items-center gap-2 font-semibold text-xs text-nexora-navy dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-nexora-teal" />
              <span>AES-256-GCM Token Encryption</span>
            </div>
            <p className="text-[11px] text-nexora-muted">
              Refresh tokens are encrypted at rest with random 16-byte IVs and authenticated tags.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark space-y-1">
            <div className="flex items-center gap-2 font-semibold text-xs text-nexora-navy dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-nexora-teal" />
              <span>Zero Attachment Disk Retention</span>
            </div>
            <p className="text-[11px] text-nexora-muted">
              Attachments are processed entirely in-memory using Multer streams; no files persist on server disk.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark space-y-1">
            <div className="flex items-center gap-2 font-semibold text-xs text-nexora-navy dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-nexora-teal" />
              <span>HTTP-Only Session Cookies</span>
            </div>
            <p className="text-[11px] text-nexora-muted">
              Tokens are never stored in localStorage, shielding against client-side script interception.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark space-y-1">
            <div className="flex items-center gap-2 font-semibold text-xs text-nexora-navy dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-nexora-teal" />
              <span>Strict HTML Sanitization</span>
            </div>
            <p className="text-[11px] text-nexora-muted">
              DOMPurify filters all incoming message HTML to disarm malicious scripts and iframes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
