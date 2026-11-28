import React, { useState } from 'react';
import { Check, X, Loader2, Wand2 } from 'lucide-react';
import { useAI } from '../../context/AIContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { REWRITE_TONES } from '../../services/ai/aiPromptService';
import {
  generateStructuredEmail,
  htmlToPlainText,
  plainTextToSafeHtml,
  runWritingTool
} from '../../services/ai/aiWritingService';
import AIModelStatus from './AIModelStatus';

export default function AIWritingPanel({
  subject,
  bodyHtml,
  onApplySubject,
  onApplyBodyHtml,
  onClose
}) {
  const aiState = useAI();
  const { user } = useAuth();
  const { error } = useToast();

  const [instruction, setInstruction] = useState('');
  const [selectedTone, setSelectedTone] = useState(REWRITE_TONES[0]);
  const [busyTool, setBusyTool] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [pendingChange, setPendingChange] = useState(null);

  const currentPlain = htmlToPlainText(bodyHtml);

  const handlePromptWrite = async (e) => {
    e.preventDefault();
    if (!instruction.trim()) {
      error('Enter a prompt first.');
      return;
    }
    setBusyTool('write_prompt');
    setStreamingText('');
    try {
      const res = await generateStructuredEmail({
        prompt: instruction.trim(),
        style: 'Professional',
        senderName: user?.displayName || '[Your Name]',
        aiState,
        onToken: (acc) => setStreamingText(acc)
      });

      setPendingChange({
        kind: 'email',
        originalText: currentPlain,
        proposedSubject: res.subject,
        proposedText: res.body
      });
    } catch (err) {
      error(err?.message || 'Generation failed.');
    } finally {
      setBusyTool('');
      setStreamingText('');
    }
  };

  const handleTool = async (tool, extraTone = null) => {
    if (tool !== 'generate_subject' && !currentPlain.trim()) {
      error('Write a draft first.');
      return;
    }
    if (tool === 'generate_subject' && !currentPlain.trim() && !subject.trim()) {
      error('Write a message body first.');
      return;
    }

    setBusyTool(tool);
    setStreamingText('');
    try {
      const res = await runWritingTool({
        tool,
        text: currentPlain,
        subject,
        targetTone: extraTone || selectedTone,
        aiState,
        onToken: (acc) => setStreamingText(acc)
      });

      setPendingChange({
        kind: tool === 'generate_subject' ? 'subject' : 'body',
        originalText: tool === 'generate_subject' ? subject || '' : currentPlain,
        proposedText: res.text,
        subjectSuggestions: res.suggestions || [res.text]
      });
    } catch (err) {
      error(err?.message || 'Action failed.');
    } finally {
      setBusyTool('');
      setStreamingText('');
    }
  };

  const handleAccept = () => {
    if (!pendingChange) return;
    if (pendingChange.kind === 'subject') {
      onApplySubject(pendingChange.proposedText);
    } else if (pendingChange.kind === 'email') {
      if (pendingChange.proposedSubject) {
        onApplySubject(pendingChange.proposedSubject);
      }
      onApplyBodyHtml(plainTextToSafeHtml(pendingChange.proposedText));
    } else {
      onApplyBodyHtml(plainTextToSafeHtml(pendingChange.proposedText));
    }
    setPendingChange(null);
  };

  return (
    <div className="border-b border-nexora-border dark:border-nexora-border-dark bg-slate-50/70 dark:bg-nexora-dark-card/40 px-4 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <AIModelStatus compact />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white flex-shrink-0"
          aria-label="Close AI toolbar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <form onSubmit={handlePromptWrite} className="flex items-center gap-2">
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Ask AI to write..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <button
          type="submit"
          disabled={Boolean(busyTool)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium disabled:opacity-50"
        >
          {busyTool === 'write_prompt' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wand2 className="w-3.5 h-3.5" />
          )}
          <span>Write</span>
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1">
        {[
          { id: 'improve', label: 'Improve' },
          { id: 'fix_grammar', label: 'Grammar' },
          { id: 'make_professional', label: 'Professional' },
          { id: 'make_concise', label: 'Shorten' },
          { id: 'expand', label: 'Expand' },
          { id: 'continue_writing', label: 'Continue' },
          { id: 'generate_subject', label: 'Subject' }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={Boolean(busyTool)}
            onClick={() => handleTool(item.id)}
            className="px-2 py-1 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-violet-400 disabled:opacity-50"
          >
            {busyTool === item.id ? '...' : item.label}
          </button>
        ))}

        <div className="inline-flex items-center gap-1 ml-auto">
          <select
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value)}
            className="px-2 py-1 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-[11px] text-slate-700 dark:text-slate-200"
            aria-label="Tone"
          >
            {REWRITE_TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={Boolean(busyTool)}
            onClick={() => handleTool('change_tone', selectedTone)}
            className="px-2 py-1 rounded-md bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[11px] font-medium hover:bg-violet-200 disabled:opacity-50"
          >
            Tone
          </button>
        </div>
      </div>

      {busyTool && streamingText && (
        <div className="p-2 rounded-lg bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 max-h-24 overflow-y-auto whitespace-pre-wrap">
          {streamingText}
        </div>
      )}

      {pendingChange && (
        <div className="p-2.5 rounded-lg bg-white dark:bg-nexora-dark-surface border border-violet-300 dark:border-violet-500/40 space-y-2">
          {pendingChange.kind === 'subject' && pendingChange.subjectSuggestions?.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {pendingChange.subjectSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPendingChange((prev) => ({ ...prev, proposedText: s }))}
                  className={`px-2 py-0.5 rounded text-[11px] border ${
                    pendingChange.proposedText === s
                      ? 'border-violet-600 bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'
                      : 'border-nexora-border dark:border-nexora-border-dark text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-slate-50 dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark max-h-28 overflow-y-auto whitespace-pre-wrap text-slate-500 dark:text-slate-400">
              {pendingChange.originalText || '(Empty)'}
            </div>

            <div className="space-y-1">
              {pendingChange.kind === 'email' && (
                <input
                  type="text"
                  value={pendingChange.proposedSubject || ''}
                  onChange={(e) =>
                    setPendingChange((prev) => ({ ...prev, proposedSubject: e.target.value }))
                  }
                  className="w-full px-2 py-1 rounded border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-card text-xs font-medium text-slate-900 dark:text-white"
                />
              )}
              <textarea
                rows={4}
                value={pendingChange.proposedText}
                onChange={(e) =>
                  setPendingChange((prev) => ({ ...prev, proposedText: e.target.value }))
                }
                className="w-full p-2 rounded border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-card text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setPendingChange(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300"
            >
              <X className="w-3 h-3" />
              <span>Reject</span>
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
            >
              <Check className="w-3 h-3" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
