import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { useAI } from '../../context/AIContext';
import { useAuth } from '../../context/AuthContext';
import { useEmails } from '../../context/EmailContext';
import { useToast } from '../../context/ToastContext';
import { interpretNaturalScheduleInstruction, plainTextToSafeHtml } from '../../services/ai/aiWritingService';
import { formatScheduledDateTime } from '../../services/ai/nlDateParser';
import schedulingService from '../../services/scheduling/schedulingService';

const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Singapore',
  'Australia/Sydney'
];

export default function AISchedulePanel({ initialDraft = {}, onScheduled, onCancel }) {
  const aiState = useAI();
  const { settings } = useAuth();
  const { refreshScheduledCount } = useEmails();
  const { success, error } = useToast();

  const detectedTz =
    settings?.timezone ||
    (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC') ||
    'UTC';

  const [instruction, setInstruction] = useState('');
  const [recipient, setRecipient] = useState(initialDraft.to || '');
  const [cc, setCc] = useState(initialDraft.cc || '');
  const [bcc, setBcc] = useState(initialDraft.bcc || '');
  const [subject, setSubject] = useState(initialDraft.subject || '');
  const [bodyHtml, setBodyHtml] = useState(initialDraft.bodyHtml || '');
  const [bodyText, setBodyText] = useState(
    initialDraft.bodyText ||
      String(initialDraft.bodyHtml || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .trim()
  );
  const [timezone, setTimezone] = useState(detectedTz);
  const [localDate, setLocalDate] = useState('');
  const [localTime, setLocalTime] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);
  const [interpreting, setInterpreting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parseError, setParseError] = useState('');

  useEffect(() => {
    if (initialDraft.to !== undefined && initialDraft.to) setRecipient(initialDraft.to);
    if (initialDraft.cc !== undefined) setCc(initialDraft.cc || '');
    if (initialDraft.bcc !== undefined) setBcc(initialDraft.bcc || '');
    if (initialDraft.subject !== undefined && initialDraft.subject) setSubject(initialDraft.subject);
    if (initialDraft.bodyHtml !== undefined) setBodyHtml(initialDraft.bodyHtml);
  }, [initialDraft.to, initialDraft.cc, initialDraft.bcc, initialDraft.subject, initialDraft.bodyHtml]);

  const handleInterpret = async () => {
    if (!instruction.trim()) {
      setParseError('Enter a scheduling instruction (e.g., "Send this email tomorrow at 9 AM").');
      return;
    }

    setInterpreting(true);
    setParseError('');
    try {
      const res = await interpretNaturalScheduleInstruction({
        instruction: instruction.trim(),
        timezone,
        existingDraft: { to: recipient, subject, body: bodyText },
        aiState,
        useModelIfReady: true
      });

      if (res.extracted?.recipientEmail && !recipient) {
        setRecipient(res.extracted.recipientEmail);
      }
      if (res.extracted?.subject && !subject) {
        setSubject(res.extracted.subject);
      }
      if (res.extracted?.body && !bodyText) {
        setBodyText(res.extracted.body);
        setBodyHtml(plainTextToSafeHtml(res.extracted.body));
      }

      if (!res.schedule.success) {
        setParseError(res.schedule.error);
        setParsedPreview(null);
        return;
      }

      setLocalDate(res.schedule.localDateInput);
      setLocalTime(res.schedule.localTimeInput);
      setParsedPreview(res.schedule);
    } catch (err) {
      setParseError(err?.message || 'Unable to interpret schedule instruction.');
    } finally {
      setInterpreting(false);
    }
  };

  const handleManualReview = () => {
    setParseError('');
    if (!recipient.trim() || !recipient.includes('@')) {
      setParseError('Please enter a valid recipient email address.');
      return;
    }
    if (!localDate || !localTime) {
      setParseError('Please interpret a natural-language time or pick a date and time.');
      return;
    }

    // Verify timestamp is in the future locally before showing confirmation card
    const candidate = new Date(`${localDate}T${localTime}`);
    if (!Number.isNaN(candidate.getTime()) && timezone === detectedTz && candidate.getTime() <= Date.now()) {
      setParseError('Scheduled time must be in the future.');
      return;
    }

    setConfirmStep(true);
  };

  const handleConfirmSchedule = async () => {
    setSubmitting(true);
    setParseError('');
    try {
      const finalHtml = bodyHtml || plainTextToSafeHtml(bodyText);
      const res = await schedulingService.createScheduledEmail({
        recipient: recipient.trim(),
        cc: cc.trim(),
        bcc: bcc.trim(),
        subject: subject.trim() || '(No Subject)',
        body: finalHtml,
        localDate,
        localTime,
        timezone,
        naturalLanguageInput: instruction.trim()
      });

      success(res?.message || 'Email scheduled successfully.');
      refreshScheduledCount();
      setConfirmStep(false);
      setInstruction('');
      if (onScheduled) onScheduled(res?.scheduledEmail);
    } catch (err) {
      error(err?.message || 'Failed to schedule email.');
    } finally {
      setSubmitting(false);
    }
  };

  const tzOptions = COMMON_TIMEZONES.includes(detectedTz)
    ? COMMON_TIMEZONES
    : [detectedTz, ...COMMON_TIMEZONES];

  const previewDateSummary = parsedPreview
    ? `${parsedPreview.dateLabel} at ${parsedPreview.timeLabel}`
    : localDate && localTime
    ? `${localDate} at ${localTime}`
    : formatScheduledDateTime(new Date(Date.now() + 3600000), timezone).dateLabel;

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-nexora-dark-surface border border-violet-200 dark:border-violet-500/40 shadow-nexora-xs space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
            Natural Language Email Scheduler
          </h4>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!confirmStep ? (
        <div className="space-y-3">
          {/* Natural Language Input */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
              Schedule Instruction
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder='e.g. "Send this email tomorrow at 9 AM" or "Monday at 4 PM"'
                className="flex-1 px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
              <button
                type="button"
                onClick={handleInterpret}
                disabled={interpreting}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium disabled:opacity-50"
              >
                {interpreting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Interpret</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                'tomorrow at 9 AM',
                'Monday at 4 PM',
                'December 5 at 10:30 AM',
                'next Friday afternoon'
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setInstruction(sample)}
                  className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-nexora-dark-card text-slate-600 dark:text-slate-300 hover:text-violet-600"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Email Details & Editable Date/Time/Timezone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Recipient Email
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="recipient@domain.com"
                className="w-full px-3 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full px-3 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {!initialDraft.bodyHtml && (
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Message Body
              </label>
              <textarea
                rows={3}
                value={bodyText}
                onChange={(e) => {
                  setBodyText(e.target.value);
                  setBodyHtml(plainTextToSafeHtml(e.target.value));
                }}
                placeholder="Write the message body to schedule..."
                className="w-full p-2.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Date
              </label>
              <input
                type="date"
                value={localDate}
                onChange={(e) => {
                  setLocalDate(e.target.value);
                  setParsedPreview(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Time
              </label>
              <input
                type="time"
                value={localTime}
                onChange={(e) => {
                  setLocalTime(e.target.value);
                  setParsedPreview(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value);
                  setParsedPreview(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
              >
                {tzOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {parsedPreview && (
            <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-700/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>
                Resolved schedule: <strong>{parsedPreview.dateLabel}</strong> at{' '}
                <strong>{parsedPreview.timeLabel}</strong> ({parsedPreview.timezone})
              </span>
            </div>
          )}

          {parseError && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Confirmation required before queuing.
            </p>
            <button
              type="button"
              onClick={handleManualReview}
              className="px-4 py-2 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white text-xs font-medium"
            >
              Review Schedule Confirmation
            </button>
          </div>
        </div>
      ) : (
        /* Explicit Confirmation Screen */
        <div className="space-y-3 p-3.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs">
          <p className="font-semibold text-slate-900 dark:text-white text-sm">
            Confirm Scheduled Email
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-slate-400 block">Recipient</span>
              <span className="font-medium text-slate-900 dark:text-white break-all">{recipient}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Scheduled Date &amp; Time</span>
              <span className="font-medium text-violet-700 dark:text-violet-300">
                {previewDateSummary} ({timezone})
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block">Subject</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {subject || '(No Subject)'}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block mb-1">Message Preview</span>
              <div className="p-2.5 rounded bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-slate-700 dark:text-slate-200 max-h-28 overflow-y-auto whitespace-pre-wrap">
                {bodyText || '(Empty body)'}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-700/40 rounded p-2">
            Free-hosting notice: Render Free Web Services sleep during inactivity and GitHub Actions scheduled triggers run every ~15 minutes, so delivery happens shortly after the due timestamp rather than exact-second precision.
          </p>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmStep(false)}
              className="px-3 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-nexora-dark-surface"
            >
              Back to Edit
            </button>
            <button
              type="button"
              onClick={handleConfirmSchedule}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{submitting ? 'Scheduling...' : 'Confirm & Schedule Email'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
