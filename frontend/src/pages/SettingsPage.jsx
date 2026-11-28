import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Sun,
  Moon,
  Monitor,
  Save,
  LogOut,
  Lock,
  Mail,
  Bell,
  Sliders,
  UserCheck,
  Sparkles,
  Cpu,
  HardDrive,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAI } from '../context/AIContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import settingsService from '../services/settingsService';
import AIModelStatus from '../components/ai/AIModelStatus';
import { formatFileSize } from '../utils/dateFormatter';

export default function SettingsPage() {
  const { user, mailboxProfile, loginWithGoogle, disconnect, logout, settings, setSettings } = useAuth();
  const {
    aiEnabled,
    selectedModelId,
    models,
    webgpu,
    storageEstimate,
    cached,
    updateAISettings,
    clearCachedModel,
    clearAllCachedModels
  } = useAI();
  const { theme, setTheme } = useTheme();
  const { success, error } = useToast();

  const [signature, setSignature] = useState(settings?.signature || '');
  const [emailsPerPage, setEmailsPerPage] = useState(settings?.emailsPerPage || 25);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(Boolean(settings?.sidebarCollapsed));
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings?.notificationsEnabled !== undefined ? Boolean(settings.notificationsEnabled) : true
  );
  const [timezone, setTimezone] = useState(
    settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setSignature(settings.signature || '');
      setEmailsPerPage(settings.emailsPerPage || 25);
      setSidebarCollapsed(Boolean(settings.sidebarCollapsed));
      if (settings.notificationsEnabled !== undefined) {
        setNotificationsEnabled(Boolean(settings.notificationsEnabled));
      }
      if (settings.timezone) {
        setTimezone(settings.timezone);
      }
    }
  }, [settings]);

  const persistSettings = async (patch) => {
    setSaving(true);
    try {
      const res = await settingsService.updateSettings(patch);
      if (res?.settings) {
        setSettings(res.settings);
        success('Settings saved.');
      }
    } catch (err) {
      error(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (nextTheme) => {
    localStorage.setItem('nexora_theme_manual', '1');
    setTheme(nextTheme);
    persistSettings({ theme: nextTheme });
  };

  const handleNotificationsToggle = async () => {
    const nextVal = !notificationsEnabled;
    if (nextVal && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => {});
    }
    setNotificationsEnabled(nextVal);
    persistSettings({ notificationsEnabled: nextVal });
  };

  const handleSidebarDefaultToggle = () => {
    const nextVal = !sidebarCollapsed;
    setSidebarCollapsed(nextVal);
    persistSettings({ sidebarCollapsed: nextVal });
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8 bg-nexora-ivory dark:bg-nexora-dark-bg">
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your connected Gmail account, email preferences, appearance, and security controls.
          </p>
        </div>

        {/* 1. Connected Account & Profile */}
        <section className="p-5 sm:p-6 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-nexora-electric dark:text-indigo-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Account & Connected Mailbox
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gmail API v1 &bull; OAuth 2.0
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={
                  user?.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.displayName || user?.email || 'U'
                  )}&background=4F46E5&color=fff`
                }
                alt={user?.displayName || 'Profile'}
                className="w-11 h-11 rounded-full object-cover border border-nexora-border dark:border-nexora-border-dark flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {user?.displayName || 'Google User'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                {mailboxProfile && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
                    {mailboxProfile.messagesTotal?.toLocaleString()} messages &bull;{' '}
                    {mailboxProfile.threadsTotal?.toLocaleString()} threads in Gmail
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={loginWithGoogle}
                className="px-3.5 py-2 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white text-xs font-medium transition-colors"
              >
                Switch Account
              </button>
              <button
                type="button"
                onClick={disconnect}
                className="px-3.5 py-2 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </section>

        {/* 2. Email Preferences */}
        <section className="p-5 sm:p-6 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-nexora-dark-card text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Email Preferences
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize page size, timezone, and outgoing email signature.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Messages per page
              </label>
              <select
                value={emailsPerPage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setEmailsPerPage(val);
                  persistSettings({ emailsPerPage: val });
                }}
                className="w-full px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexora-electric/20"
              >
                <option value={10}>10 messages</option>
                <option value={25}>25 messages</option>
                <option value={50}>50 messages</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Timezone
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                onBlur={() => persistSettings({ timezone })}
                className="w-full px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexora-electric/20"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-nexora-border dark:border-nexora-border-dark">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Email Signature
            </label>
            <textarea
              rows={3}
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Optional signature appended to new emails..."
              className="w-full p-3 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-nexora-electric/20"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => persistSettings({ signature })}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 3. Appearance & Notifications */}
        <section className="p-5 sm:p-6 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-nexora-dark-card text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Appearance & Notifications
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure theme, layout density, and desktop alerts.
              </p>
            </div>
          </div>

          {/* Theme */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select light, dark, or match your operating system.
              </p>
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-nexora-ivory dark:bg-nexora-dark-card rounded-lg border border-nexora-border dark:border-nexora-border-dark self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-white dark:bg-nexora-dark-surface text-slate-900 dark:text-white shadow-nexora-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-nexora-dark-surface text-slate-900 dark:text-white shadow-nexora-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  theme === 'system'
                    ? 'bg-white dark:bg-nexora-dark-surface text-slate-900 dark:text-white shadow-nexora-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Sidebar default toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-nexora-border dark:border-nexora-border-dark">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Compact sidebar</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Keep the left navigation collapsed to icons by default.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={sidebarCollapsed}
              onClick={handleSidebarDefaultToggle}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                sidebarCollapsed ? 'bg-nexora-electric' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  sidebarCollapsed ? 'translate-x-[18px]' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Notifications toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-nexora-border dark:border-nexora-border-dark">
            <div className="flex items-start gap-2.5">
              <Bell className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Browser new-mail notifications
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Show desktop alerts when unread inbox count increases on refresh.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              onClick={handleNotificationsToggle}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                notificationsEnabled ? 'bg-nexora-electric' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-[18px]' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* 4. Nexora AI */}
        <section className="p-5 sm:p-6 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Nexora AI
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your AI writing requests are processed locally in your browser. Nexora does not require paid AI APIs or external AI subscriptions.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={aiEnabled}
              onClick={() => updateAISettings({ aiEnabled: !aiEnabled })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                aiEnabled ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-label="Enable Nexora AI"
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  aiEnabled ? 'translate-x-[18px]' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Model
              </label>
              <select
                value={selectedModelId}
                onChange={(e) => updateAISettings({ aiModelId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.approxDownload})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                <Cpu className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <span>
                  WebGPU:{' '}
                  {webgpu?.supported ? 'Ready' : webgpu ? 'Unavailable' : 'Checking...'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {webgpu?.supported
                  ? webgpu.adapterLabel || 'GPU accelerated'
                  : 'Using offline writing templates'}
              </p>
            </div>
          </div>

          <AIModelStatus />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-nexora-border dark:border-nexora-border-dark text-xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <HardDrive className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>
                {cached ? 'Cached in browser' : 'Not cached'}
                {storageEstimate ? ` • ${formatFileSize(storageEstimate.usageBytes)} used` : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => clearCachedModel()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-nexora-dark-card"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cache</span>
              </button>
              <button
                type="button"
                onClick={() => clearAllCachedModels()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>
        </section>

        {/* 5. Security */}
        <section className="p-5 sm:p-6 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Security</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Active OAuth scopes and server-side protection
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-nexora-dark-card transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark space-y-1">
              <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Least-Privilege OAuth Scope</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                https://www.googleapis.com/auth/gmail.modify
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark space-y-1">
              <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>AES-256-GCM & HTTP-Only Sessions</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Tokens are encrypted server-side; attachments stream through memory only.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
