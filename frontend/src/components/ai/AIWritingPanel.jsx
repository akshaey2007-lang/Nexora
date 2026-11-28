import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  Loader2,
  Wand2,
  Type,
  ArrowRight
} from 'lucide-react';
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

export default function AIWritingPanel({
  subject,
  bodyHtml,
  onApplySubject,
  onApplyBodyHtml,
  onClose
}) {
  const aiState = useAI();
  const { user } = useAuth();
  const { error, info } = useToast();

  const [instruction, setInstruction] = useState('');
  const [selectedTone, setSelectedTone] = useState(REWRITE_TONES[0]);
  const [busyTool, setBusyTool] = useState('');
  const [streamingText, setStreamingText] = useState('');

  // Pending preview requiring explicit user approval before modifying Compose
  const [pendingChange, setPendingChange] = useState(null);
  // pendingChange = { kind: 'body' | 'email' | 'subject', label, originalText, proposedText, proposedSubject?, subjectSuggestions? }

  const currentPlain = htmlToPlainText(bodyHtml);

  const handlePromptWrite = async (e) => {
    e.preventDefault();
    if (!instruction.trim()) {
      error('Describe the email you want Nexora AI to draft.');
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
        label: 'Write with Nexora AI',
        originalText: currentPlain,
        proposedSubject: res.subject,
        proposedText: res.body
      });
      if (res.usedFallback) {
        info('Created structured draft template (local WebGPU AI inactive).');
      }
    } catch (err) {
      error(err?.message || 'Could not generate email.');
    } finally {
      setBusyTool('');
      setStreamingText('');
    }
  };

  const handleTool = async (tool, label, extraTone = null) => {
    if (tool !== 'generate_subject' && !currentPlain.trim()) {
      error('Write a quick draft first (or enter a prompt above) so AI can rewrite or continue it.');
      return;
    }
    if (tool === 'generate_subject' && !currentPlain.trim() && !subject.trim()) {
      error('Write an email body first so AI can generate a relevant subject.');
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
        label,
        originalText: tool === 'generate_subject' ? subject || '(No Subject)' : currentPlain,
        proposedText: res.text,
        subjectSuggestions: res.suggestions || [res.text]
      });
    } catch (err) {
      error(err?.message || 'AI writing action failed.');
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

  const handleReject = () => {
    setPendingChange(null);
  };

  return (
    <div className="border-b border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-950/20 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            Nexora AI Writing Studio
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-nexora-dark-card border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300">
            Local Browser AI • Free
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
          title="Close AI panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Prompt-to-Email Composer */}
      <form onSubmit={handlePromptWrite} className="flex items-center gap-2">
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Instruction (e.g., Write a professional email to my placement coordinator asking about upcoming drives)..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        />
        <button
          type="submit"
          disabled={Boolean(busyTool)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium disabled:opacity-50 flex-shrink-0"
        >
          {busyTool === 'write_prompt' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wand2 className="w-3.5 h-3.5" />
          )}
          <span>Draft</span>
        </button>
      </form>

      {/* All 8 Rewriting Tools */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={Boolean(busyTool)}
          onClick={() => handleTool('improve', 'Improve writing')}
          className="px-2.5 py-1 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-violet-400 disabled:opacity-50"
        >
          {busyTool === 'improve' ? 'Improving...' : 'Improve writing'}
        </button>
        <button
          type="button"
          disabled={Boolean(busyTool)}
          onClick={() => handleTool('fix_grammar', 'Fix grammar')}
          className="px-2.5 py-1 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-violet-400 disabled:opacity-50"
        >
          {busyTool === 'fix_grammar' ? 'Checking...' : 'Fix grammar'}
        </button>
        <button
          type="button"
          disabled={Boolean(busyTool)}
          onClick={() => handleTool('make_professional', 'Make professional')}
          className="px-2.5 py-1 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-violet-400 disabled:opacity-50"
        >
          Make professional
        </button>
        <button
          type="button"
          disabled={Boolean(busyTool)}
          onClick={() => handleTool('make_concise', 'Make concise')}
          className="px-2.5 py-1 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-violet-400 disabled:opacity-50"
        >
          Shorten
        </button>
        <button
          type="button"
          disabled={Boolean(busyTool)}
          onClick={() => handleTool('expand', 'Expand')}
          className="px-2.5 py-1 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-violet-400 disabled:opacity-50"
        >
          Expand
        </button>
        <button
          type="button"
          disabled={Boolean(busyTool)}
          onClick={() => handleTool('continue_writing', 'Continue writing')}
          className="px-2.5 py-1 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-violet-400 disabled:opacity-50"
        >
          Continue writing
        </button>
        <button
          type="button"
          disabled={Boolean(busyTool)}
          onClick={() => handleTool('generate_subject', 'Generate subject')}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-violet-400 disabled:opacity-50"
        >
          <Type className="w-3 h-3 text-violet-500" />
          <span>Generate subject</span>
        </button>

        {/* Change Tone Inline Control */}
        <div className="inline-flex items-center gap-1 ml-auto">
          <select
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value)}
            className="px-2 py-1 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-[11px] text-slate-700 dark:text-slate-200"
            aria-label="Target tone"
          >
            {REWRITE_TONES.map((t) => (
              <option key={t} value={t}>
                Tone: {t}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={Boolean(busyTool)}
            onClick={() => handleTool('change_tone', `Change tone (${selectedTone})`, selectedTone)}
            className="px-2.5 py-1 rounded-md bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[11px] font-medium hover:bg-violet-200 dark:hover:bg-violet-500/30 disabled:opacity-50"
          >
            Apply Tone
          </button>
        </div>
      </div>

      {/* Streaming live text */}
      {busyTool && streamingText && (
        <div className="p-2.5 rounded-lg bg-white dark:bg-nexora-dark-surface border border-violet-200 dark:border-violet-500/30 text-xs text-slate-600 dark:text-slate-300 max-h-28 overflow-y-auto whitespace-pre-wrap">
          {streamingText}
        </div>
      )}

      {/* Original vs AI-Generated Comparison (Requires Explicit Accept/Reject) */}
      {pendingChange && (
        <div className="p-3 rounded-lg bg-white dark:bg-nexora-dark-surface border border-violet-300 dark:border-violet-500/40 shadow-nexora-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
              Preview: {pendingChange.label} (Original unchanged until you Accept)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleReject}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-nexora-dark-card"
              >
                <X className="w-3 h-3" />
                <span>Reject</span>
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
              >
                <Check className="w-3 h-3" />
                <span>Accept &amp; Apply</span>
              </button>
            </div>
          </div>

          {pendingChange.kind === 'subject' && pendingChange.subjectSuggestions?.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {pendingChange.subjectSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPendingChange((prev) => ({ ...prev, proposedText: s }))}
                  className={`px-2 py-1 rounded text-[11px] border ${
                    pendingChange.proposedText === s
                      ? 'border-violet-600 bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 font-medium'
                      : 'border-nexora-border dark:border-nexora-border-dark text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-md bg-slate-50 dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark max-h-36 overflow-y-auto">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Current Original
              </p>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {pendingChange.originalText || '(Empty draft)'}
              </p>
            </div>

            <div className="p-2.5 rounded-md bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-500/30 max-h-36 overflow-y-auto space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1">
                <ArrowRight className="w-3 h-3" />
                <span>AI Suggestion (Editable)</span>
              </p>
              {pendingChange.kind === 'email' && (
                <input
                  type="text"
                  value={pendingChange.proposedSubject || ''}
                  onChange={(e) =>
                    setPendingChange((prev) => ({ ...prev, proposedSubject: e.target.value }))
                  }
                  className="w-full px-2 py-1 rounded border border-violet-200 dark:border-violet-500/40 bg-white dark:bg-nexora-dark-surface text-xs font-medium text-slate-900 dark:text-white"
                />
              )}
              <textarea
                rows={4}
                value={pendingChange.proposedText}
                onChange={(e) =>
                  setPendingChange((prev) => ({ ...prev, proposedText: e.target.value }))
                }
                className="w-full p-1.5 rounded border border-violet-200 dark:border-violet-500/40 bg-white dark:bg-nexora-dark-surface text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
