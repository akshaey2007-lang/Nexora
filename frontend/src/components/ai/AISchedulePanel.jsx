import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, X, CalendarClock } from 'lucide-react';
import { useAI } from '../../context/AIContext';
import { useAuth } from '../../context/AuthContext';
import { useEmails } from '../../context/EmailContext';
import { useToast } from '../../context/ToastContext';
import { interpretNaturalScheduleInstruction, plainTextToSafeHtml } from '../../services/ai/aiWritingService';
import {
  formatScheduledDateTime,
  parseNaturalScheduleText,
  zonedWallClockToUtc
} from '../../services/ai/nlDateParser';
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

function stripHtmlForPreview(html = '') {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export default function AISchedulePanel({ initialDraft = {}, onScheduled, onCancel }) {
  const aiState = useAI();
  const { settings } = useAuth();
  const { refreshScheduledCount } = useEmails();
  const { success, error } = useToast();

  const detectedTz =
    settings?.timezone && settings.timezone !== 'UTC'
      ? settings.timezone
      : (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC') ||
        'UTC';

  const [instruction, setInstruction] = useState('');
  const [recipient, setRecipient] = useState(initialDraft.to || '');
  const [cc, setCc] = useState(initialDraft.cc || '');
  const [bcc, setBcc] = useState(initialDraft.bcc || '');
  const [subject, setSubject] = useState(initialDraft.subject || '');
  const [bodyHtml, setBodyHtml] = useState(initialDraft.bodyHtml || '');
  const [bodyText, setBodyText] = useState(
    initialDraft.bodyText || stripHtmlForPreview(initialDraft.bodyHtml)
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
    if (initialDraft.to !== undefined) setRecipient(initialDraft.to || '');
    if (initialDraft.cc !== undefined) setCc(initialDraft.cc || '');
    if (initialDraft.bcc !== undefined) setBcc(initialDraft.bcc || '');
    if (initialDraft.subject !== undefined) setSubject(initialDraft.subject || '');
    if (initialDraft.bodyHtml !== undefined) {
      setBodyHtml(initialDraft.bodyHtml || '');
      if (!initialDraft.bodyText) {
        setBodyText(stripHtmlForPreview(initialDraft.bodyHtml));
      }
    }
    if (initialDraft.bodyText !== undefined) {
      setBodyText(initialDraft.bodyText || '');
    }
  }, [initialDraft.to, initialDraft.cc, initialDraft.bcc, initialDraft.subject, initialDraft.bodyHtml, initialDraft.bodyText]);

  const interpretInstructionText = async () => {
    const clean = instruction.trim();
    if (!clean) return null;

    setInterpreting(true);
    setParseError('');
    try {
      const res = await interpretNaturalScheduleInstruction({
        instruction: clean,
        timezone,
        existingDraft: { to: recipient, subject, body: bodyText },
        aiState,
        useModelIfReady: true
      });

      const resolvedRecipient = recipient || res.extracted?.recipientEmail || '';
      const resolvedSubject = subject || res.extracted?.subject || '';
      const resolvedBody = bodyText || res.extracted?.body || '';

      if (res.extracted?.recipientEmail && !recipient) setRecipient(res.extracted.recipientEmail);
      if (res.extracted?.subject && !subject) setSubject(res.extracted.subject);
      if (res.extracted?.body && !bodyText) {
        setBodyText(res.extracted.body);
        setBodyHtml(plainTextToSafeHtml(res.extracted.body));
      }

      if (!res.schedule.success) {
        setParseError(res.schedule.error);
        setParsedPreview(null);
        return null;
      }

      setLocalDate(res.schedule.localDateInput);
      setLocalTime(res.schedule.localTimeInput);
      setParsedPreview(res.schedule);

      return {
        localDate: res.schedule.localDateInput,
        localTime: res.schedule.localTimeInput,
        recipient: resolvedRecipient,
        subject: resolvedSubject,
        bodyText: resolvedBody
      };
    } catch (err) {
      setParseError(err?.message || 'Unable to parse schedule.');
      return null;
    } finally {
      setInterpreting(false);
    }
  };

  const handleReviewSchedule = async () => {
    setParseError('');

    let effectiveDate = localDate;
    let effectiveTime = localTime;
    let effectiveRecipient = recipient;

    // Auto-interpret if user typed a phrase and didn't click Parse separately
    if ((!effectiveDate || !effectiveTime) && instruction.trim()) {
      const parsed = await interpretInstructionText();
      if (!parsed) return;
      effectiveDate = parsed.localDate;
      effectiveTime = parsed.localTime;
      effectiveRecipient = parsed.recipient;
    }

    if (!effectiveRecipient.trim() || !effectiveRecipient.includes('@')) {
      setParseError('Enter a valid recipient email.');
      return;
    }

    if (!effectiveDate || !effectiveTime) {
      setParseError('Choose a date and time (or enter e.g. "tomorrow at 9 AM").');
      return;
    }

    const dateParts = effectiveDate.split('-').map(Number);
    const timeParts = effectiveTime.split(':').map(Number);
    if (dateParts.length !== 3 || timeParts.length < 2) {
      setParseError('Invalid date or time.');
      return;
    }

    const utc = zonedWallClockToUtc(
      {
        year: dateParts[0],
        month: dateParts[1],
        day: dateParts[2],
        hour: timeParts[0],
        minute: timeParts[1]
      },
      timezone
    );

    if (utc.getTime() <= Date.now()) {
      setParseError('Scheduled time must be in the future.');
      return;
    }

    setParsedPreview({
      ...formatScheduledDateTime(utc, timezone),
      timezone
    });
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

      success(res?.message || 'Email scheduled.');
      refreshScheduledCount();
      setConfirmStep(false);
      setInstruction('');
      if (onScheduled) onScheduled(res?.scheduledEmail);
    } catch (err) {
      const msg = err?.message || 'Failed to schedule email.';
      setParseError(msg);
      error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const tzOptions = COMMON_TIMEZONES.includes(detectedTz)
    ? COMMON_TIMEZONES
    : [detectedTz, ...COMMON_TIMEZONES];

  const previewDateSummary = parsedPreview
    ? `${parsedPreview.dateLabel} at ${parsedPreview.timeLabel}`
    : `${localDate} ${localTime}`;

  return (
    <div className="p-3.5 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-nexora-electric" />
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            Schedule Send
          </span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!confirmStep ? (
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={instruction}
              onChange={(e) => {
                const val = e.target.value;
                setInstruction(val);
                const live = parseNaturalScheduleText(val, { timezone });
                if (live.success) {
                  setLocalDate(live.localDateInput);
                  setLocalTime(live.localTimeInput);
                  setParsedPreview(live);
                  setParseError('');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  interpretInstructionText();
                }
              }}
              placeholder='When (e.g. "tomorrow at 9 AM")'
              className="flex-1 px-3 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-nexora-electric"
            />
            <button
              type="button"
              onClick={interpretInstructionText}
              disabled={interpreting || !instruction.trim()}
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium disabled:opacity-50"
            >
              {interpreting ? '...' : 'Parse'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="To (email)"
              className="px-3 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="px-3 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
            />
          </div>

          {!initialDraft.bodyHtml && (
            <textarea
              rows={3}
              value={bodyText}
              onChange={(e) => {
                setBodyText(e.target.value);
                setBodyHtml(plainTextToSafeHtml(e.target.value));
              }}
              placeholder="Message..."
              className="w-full p-2.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
            />
          )}

          <div className="grid grid-cols-3 gap-2">
            <input
              type="date"
              value={localDate}
              onChange={(e) => {
                setLocalDate(e.target.value);
                setParsedPreview(null);
              }}
              className="px-2 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
              aria-label="Date"
            />
            <input
              type="time"
              value={localTime}
              onChange={(e) => {
                setLocalTime(e.target.value);
                setParsedPreview(null);
              }}
              className="px-2 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
              aria-label="Time"
            />
            <select
              value={timezone}
              onChange={(e) => {
                setTimezone(e.target.value);
                setParsedPreview(null);
              }}
              className="px-2 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
              aria-label="Timezone"
            >
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {parseError && (
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleReviewSchedule}
              disabled={interpreting}
              className="px-4 py-1.5 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white text-xs font-medium disabled:opacity-50"
            >
              {interpreting ? 'Parsing...' : 'Review'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 text-xs">
          <div className="p-3 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark space-y-1.5">
            <div>
              <span className="text-slate-400">To: </span>
              <span className="font-medium text-slate-900 dark:text-white">{recipient}</span>
            </div>
            <div>
              <span className="text-slate-400">When: </span>
              <span className="font-medium text-nexora-electric dark:text-indigo-300">
                {previewDateSummary} ({timezone})
              </span>
            </div>
            <div>
              <span className="text-slate-400">Subject: </span>
              <span className="font-medium text-slate-900 dark:text-white">
                {subject || '(No Subject)'}
              </span>
            </div>
            {bodyText && (
              <p className="pt-1 border-t border-nexora-border dark:border-nexora-border-dark text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap">
                {bodyText}
              </p>
            )}
          </div>

          {parseError && (
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-300">
              {parseError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmStep(false)}
              className="px-3 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-slate-600 dark:text-slate-300"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmSchedule}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{submitting ? 'Scheduling...' : 'Confirm'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
