import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock,
  RefreshCw,
  Edit3,
  Trash2,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Send,
  X,
  Eye
} from 'lucide-react';
import schedulingService from '../services/scheduling/schedulingService';
import { useEmails } from '../context/EmailContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatScheduledDateTime } from '../services/ai/nlDateParser';
import { plainTextToSafeHtml } from '../services/ai/aiWritingService';
import SanitizedEmailBody from '../components/email/SanitizedEmailBody';
import AISchedulePanel from '../components/ai/AISchedulePanel';

const STATUS_BADGES = {
  Scheduled: 'bg-indigo-50 text-nexora-electric dark:bg-indigo-500/15 dark:text-indigo-300',
  Processing: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  Sent: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  Failed: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  Cancelled: 'bg-slate-100 text-slate-600 dark:bg-nexora-dark-card dark:text-slate-400'
};

export default function ScheduledEmailsPage() {
  const { settings } = useAuth();
  const { refreshScheduledCount } = useEmails();
  const { success, error, info } = useToast();

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [storageMode, setStorageMode] = useState('database');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [processingNow, setProcessingNow] = useState(false);
  const [showNewScheduler, setShowNewScheduler] = useState(false);

  const [viewingItem, setViewingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    recipient: '',
    cc: '',
    bcc: '',
    subject: '',
    bodyText: '',
    localDate: '',
    localTime: '',
    timezone: 'UTC'
  });

  const loadScheduled = useCallback(async () => {
    setLoading(true);
    try {
      const res = await schedulingService.listScheduledEmails(
        statusFilter === 'all' ? '' : statusFilter
      );
      setItems(res?.scheduledEmails || []);
      setSummary(res?.summary || {});
      if (res?.storageMode) setStorageMode(res.storageMode);
      refreshScheduledCount();
    } catch (err) {
      error(err?.message || 'Failed to load scheduled emails.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, error, refreshScheduledCount]);

  useEffect(() => {
    loadScheduled();
  }, [loadScheduled]);

  const startEdit = (item) => {
    const tz = item.timezone || settings?.timezone || 'UTC';
    const parts = formatScheduledDateTime(item.scheduledAt, tz);
    setEditingItem(item);
    setViewingItem(null);
    setEditForm({
      recipient: item.recipient || '',
      cc: item.cc || '',
      bcc: item.bcc || '',
      subject: item.subject || '',
      bodyText: String(item.body || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .trim(),
      localDate: parts.localDateInput,
      localTime: parts.localTimeInput,
      timezone: tz
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await schedulingService.updateScheduledEmail(editingItem.id, {
        recipient: editForm.recipient,
        cc: editForm.cc,
        bcc: editForm.bcc,
        subject: editForm.subject,
        body: plainTextToSafeHtml(editForm.bodyText),
        localDate: editForm.localDate,
        localTime: editForm.localTime,
        timezone: editForm.timezone
      });
      success('Updated.');
      setEditingItem(null);
      loadScheduled();
    } catch (err) {
      error(err?.message || 'Update failed.');
    }
  };

  const handleCancel = async (id) => {
    try {
      await schedulingService.cancelScheduledEmail(id);
      success('Cancelled.');
      loadScheduled();
    } catch (err) {
      error(err?.message || 'Could not cancel.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await schedulingService.deleteScheduledEmail(id);
      success('Deleted.');
      if (viewingItem?.id === id) setViewingItem(null);
      loadScheduled();
    } catch (err) {
      error(err?.message || 'Could not delete.');
    }
  };

  const handleProcessDueNow = async () => {
    setProcessingNow(true);
    try {
      const res = await schedulingService.processMineNow();
      const s = res?.summary || {};
      if ((s.sent || 0) > 0) {
        success(`Sent ${s.sent} due email(s).`);
      } else if ((s.failed || 0) > 0) {
        error(`${s.failed} failed.`);
      } else {
        info('No due emails.');
      }
      loadScheduled();
    } catch (err) {
      error(err?.message || 'Check failed.');
    } finally {
      setProcessingNow(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-nexora-ivory dark:bg-nexora-dark-bg">
      <div className="max-w-5xl mx-auto space-y-5 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-nexora-electric" />
              <span>Scheduled</span>
            </h1>
            {storageMode === 'session' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Running in active-session memory mode (configure MONGODB_URI to persist across Render restarts).
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleProcessDueNow}
              disabled={processingNow}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-surface text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-nexora-dark-card disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{processingNow ? 'Checking...' : 'Check Due'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNewScheduler(!showNewScheduler)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white text-xs font-medium shadow-nexora-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule</span>
            </button>
            <button
              type="button"
              onClick={loadScheduled}
              disabled={loading}
              className="p-2 rounded-lg border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-surface text-slate-500 hover:text-slate-900 dark:hover:text-white"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {showNewScheduler && (
          <AISchedulePanel
            onScheduled={() => {
              setShowNewScheduler(false);
              loadScheduled();
            }}
            onCancel={() => setShowNewScheduler(false)}
          />
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {['all', 'Scheduled', 'Sent', 'Failed', 'Cancelled'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-nexora-dark-card'
              }`}
            >
              {status === 'all' ? 'All' : status}
              {status !== 'all' && summary[status] !== undefined && ` (${summary[status]})`}
            </button>
          ))}
        </div>

        {/* Edit Form */}
        {editingItem && (
          <form
            onSubmit={handleSaveEdit}
            className="p-5 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-electric/50 shadow-nexora-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Edit Scheduled Email
              </h2>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                required
                value={editForm.recipient}
                onChange={(e) => setEditForm((p) => ({ ...p, recipient: e.target.value }))}
                placeholder="Recipient"
                className="w-full px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={editForm.subject}
                onChange={(e) => setEditForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Subject"
                className="w-full px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-slate-900 dark:text-white"
              />
            </div>

            <textarea
              rows={4}
              value={editForm.bodyText}
              onChange={(e) => setEditForm((p) => ({ ...p, bodyText: e.target.value }))}
              className="w-full p-3 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <input
                type="date"
                required
                value={editForm.localDate}
                onChange={(e) => setEditForm((p) => ({ ...p, localDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-slate-900 dark:text-white"
              />
              <input
                type="time"
                required
                value={editForm.localTime}
                onChange={(e) => setEditForm((p) => ({ ...p, localTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-slate-900 dark:text-white"
              />
              <input
                type="text"
                required
                value={editForm.timezone}
                onChange={(e) => setEditForm((p) => ({ ...p, timezone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white text-xs font-medium"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </form>
        )}

        {/* Preview Drawer */}
        {viewingItem && (
          <div className="p-5 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {viewingItem.subject || '(No Subject)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  To: {viewingItem.recipient} &bull; {viewingItem.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SanitizedEmailBody bodyHtml={viewingItem.body} />
          </div>
        )}

        {/* List */}
        <div className="rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center space-y-1.5">
              <CalendarClock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No scheduled emails
              </p>
            </div>
          ) : (
            <div className="divide-y divide-nexora-border dark:divide-nexora-border-dark">
              {items.map((item) => {
                const formatted = formatScheduledDateTime(item.scheduledAt, item.timezone || 'UTC');
                const canModify = item.status === 'Scheduled' || item.status === 'Failed';
                const canDelete = item.status !== 'Processing';

                return (
                  <div
                    key={item.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-nexora-dark-card/50 transition-colors"
                  >
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            STATUS_BADGES[item.status] || STATUS_BADGES.Scheduled
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          To: {item.recipient}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {item.subject || '(No Subject)'}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          {formatted.dateLabel} &bull; {formatted.timeLabel} ({item.timezone})
                        </span>
                        {item.sentAt && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Sent {formatScheduledDateTime(item.sentAt, item.timezone).timeLabel}
                          </span>
                        )}
                      </div>

                      {item.errorDetails && item.status !== 'Sent' && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>{item.errorDetails}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewingItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-nexora-dark-card"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      {canModify && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-nexora-dark-card"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancel(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Free-tier note: Render Free Web Services sleep on inactivity and GitHub Actions cron runs every ~15 minutes, so scheduled sends are best-effort.
        </p>
      </div>
    </div>
  );
}
