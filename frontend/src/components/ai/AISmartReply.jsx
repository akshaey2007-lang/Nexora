import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  PenSquare,
  RotateCcw,
  Loader2,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAI } from '../../context/AIContext';
import { useAuth } from '../../context/AuthContext';
import { useEmails } from '../../context/EmailContext';
import { useToast } from '../../context/ToastContext';
import { SMART_REPLY_STYLES } from '../../services/ai/aiPromptService';
import { generateSmartReply, plainTextToSafeHtml } from '../../services/ai/aiWritingService';
import emailService from '../../services/emailService';

export default function AISmartReply({ email, open, onClose }) {
  const aiState = useAI();
  const { user } = useAuth();
  const { openCompose, loadEmails, fetchCounts } = useEmails();
  const { success, error, info } = useToast();

  const [replyStyle, setReplyStyle] = useState('Professional');
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Reset smart reply state whenever switching to another email
  useEffect(() => {
    setReplyBody('');
    setReplySubject(
      email?.subject?.startsWith('Re:') ? email.subject : `Re: ${email?.subject || ''}`
    );
    setGenerated(false);
  }, [email?.id, email?.subject]);

  const handleGenerate = async (styleOverride = replyStyle) => {
    if (!email) return;
    setGenerating(true);
    setReplyStyle(styleOverride);
    try {
      const res = await generateSmartReply({
        incomingEmail: email,
        style: styleOverride,
        senderName: user?.displayName || '[Your Name]',
        aiState,
        onToken: (acc) => setReplyBody(acc)
      });
      setReplySubject(res.subject);
      setReplyBody(res.body);
      setGenerated(true);
      if (res.usedFallback) {
        info('Prepared smart reply template locally (WebGPU AI inactive).');
      }
    } catch (err) {
      error(err?.message || 'Failed to generate AI reply.');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenInCompose = () => {
    if (!email) return;
    openCompose({
      to: email.fromEmail || email.from,
      subject: replySubject,
      inReplyTo: email.messageId,
      references: email.references ? `${email.references} ${email.messageId}` : email.messageId,
      threadId: email.threadId,
      body: `${plainTextToSafeHtml(replyBody)}<br><blockquote style="border-left:2px solid #cbd5e1;padding-left:12px;margin:0;color:#64748b;">On ${email.date}, ${email.fromName || email.from} wrote:<br>${email.bodyHtml || email.bodyText || ''}</blockquote>`
    });
    if (onClose) onClose();
  };

  const handleApprovedSend = async () => {
    if (!email || !replyBody.trim()) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('to', (email.fromEmail || email.from || '').trim());
      formData.append('subject', replySubject);
      formData.append('body', plainTextToSafeHtml(replyBody));
      if (email.messageId) formData.append('inReplyTo', email.messageId);
      if (email.references || email.messageId) {
        formData.append('references', email.references ? `${email.references} ${email.messageId}` : email.messageId);
      }
      if (email.threadId) formData.append('threadId', email.threadId);

      await emailService.sendEmail(formData);
      success('Approved reply sent via Gmail.');
      setGenerated(false);
      setReplyBody('');
      if (onClose) onClose();
      loadEmails();
      fetchCounts();
    } catch (err) {
      error(err?.message || 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-nexora-dark-surface border border-violet-200 dark:border-violet-500/40 shadow-nexora-sm space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Nexora AI Smart Reply
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Only this email is processed locally in your browser; nothing is sent externally.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
          title="Close Smart Reply"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Style Selector + Generate Action */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {SMART_REPLY_STYLES.map((styleName) => (
            <button
              key={styleName}
              type="button"
              onClick={() => handleGenerate(styleName)}
              disabled={generating}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                replyStyle === styleName
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 dark:bg-nexora-dark-card text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-nexora-dark-bg'
              }`}
            >
              {styleName}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => handleGenerate(replyStyle)}
          disabled={generating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          <span>{generated ? 'Regenerate' : 'Generate Reply'}</span>
        </button>
      </div>

      {/* Editable Reply Box */}
      {(generated || generating || replyBody) && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">To:</span>
            <span className="truncate">{email.fromEmail || email.from}</span>
          </div>

          <input
            type="text"
            value={replySubject}
            onChange={(e) => setReplySubject(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs font-medium text-slate-900 dark:text-white"
            aria-label="Reply subject"
          />

          <textarea
            rows={5}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="AI reply will appear here for your review..."
            className="w-full p-3 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleOpenInCompose}
              disabled={!replyBody.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-nexora-dark-card disabled:opacity-50"
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span>Open in Full Compose</span>
            </button>

            <button
              type="button"
              onClick={handleApprovedSend}
              disabled={sending || generating || !replyBody.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white text-xs font-medium disabled:opacity-50 shadow-nexora-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Sending...' : 'Approve & Send Reply'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
