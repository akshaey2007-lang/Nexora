import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  Copy,
  PenSquare,
  Trash2,
  CalendarClock,
  Loader2,
  Edit3,
  Check
} from 'lucide-react';
import { useAI } from '../../context/AIContext';
import { useAuth } from '../../context/AuthContext';
import { useEmails } from '../../context/EmailContext';
import { useToast } from '../../context/ToastContext';
import { generateAssistantEmail, plainTextToSafeHtml } from '../../services/ai/aiWritingService';
import AISchedulePanel from './AISchedulePanel';

const SUGGESTIONS = [
  'Write a professional email requesting permission for two days of leave.',
  'Draft a polite follow-up email after a software engineering interview.',
  'Write an apology email for missing yesterday’s project sync meeting.',
  'Write a clear email asking a professor for guidance on final year project.'
];

export default function AIAssistant() {
  const aiState = useAI();
  const { user } = useAuth();
  const { openCompose } = useEmails();
  const { success, error, info } = useToast();

  const [promptInput, setPromptInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am NEXORA AI — running privately inside your browser at zero cost. Describe the email you need in natural language, and I will prepare a complete draft for your review.'
    }
  ]);
  const [generating, setGenerating] = useState(false);
  const [streamingPreview, setStreamingPreview] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(true);
  const [lastInstruction, setLastInstruction] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const runPrompt = async (instructionText) => {
    const clean = instructionText.trim();
    if (!clean || generating) return;

    setGenerating(true);
    setStreamingPreview('');
    setLastInstruction(clean);

    const updatedHistory = [...messages, { role: 'user', content: clean }];
    setMessages(updatedHistory);
    setPromptInput('');

    try {
      const result = await generateAssistantEmail({
        instruction: clean,
        conversationHistory: updatedHistory,
        senderName: user?.displayName || '[Your Name]',
        aiState,
        onToken: (acc) => setStreamingPreview(acc)
      });

      setDraftSubject(result.subject || 'Draft Email');
      setDraftBody(result.body || '');
      setHasDraft(true);
      setIsEditingDraft(true);

      const note = result.usedFallback
        ? 'Generated structured template offline (WebGPU unavailable or AI disabled). Review and customize any placeholders before sending.'
        : 'Prepared your draft locally. Review and edit the Subject/Body below before inserting into Compose or scheduling.';

      setMessages((prev) => [...prev, { role: 'assistant', content: note }]);
    } catch (err) {
      error(err?.message || 'Could not generate response.');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Generation failed: ${err?.message || 'Unknown error'}` }
      ]);
    } finally {
      setGenerating(false);
      setStreamingPreview('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runPrompt(promptInput);
  };

  const handleCopy = async () => {
    const text = `Subject: ${draftSubject}\n\n${draftBody}`;
    await navigator.clipboard.writeText(text);
    success('Copied draft to clipboard.');
  };

  const handleInsertIntoCompose = () => {
    openCompose({
      subject: draftSubject,
      body: plainTextToSafeHtml(draftBody)
    });
    success('Inserted AI draft into Compose.');
  };

  const handleDiscard = () => {
    setHasDraft(false);
    setDraftSubject('');
    setDraftBody('');
    setScheduleOpen(false);
    info('Draft discarded.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Conversational Prompt Pane */}
      <div className="lg:col-span-6 flex flex-col rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs overflow-hidden min-h-[460px] max-h-[680px]">
        <div className="px-4 py-3 border-b border-nexora-border dark:border-nexora-border-dark flex items-center justify-between bg-slate-50/70 dark:bg-nexora-dark-card/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              NEXORA AI Conversation
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Review required before sending
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-nexora-electric text-white'
                    : 'bg-nexora-ivory dark:bg-nexora-dark-card text-slate-800 dark:text-slate-200 border border-nexora-border dark:border-nexora-border-dark'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {generating && (
            <div className="p-3 rounded-xl bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200/70 dark:border-violet-500/30 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-medium mb-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating response locally...</span>
              </div>
              {streamingPreview || 'Preparing email structure...'}
            </div>
          )}

          {messages.length === 1 && (
            <div className="pt-2 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Try an example instruction
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => runPrompt(s)}
                    className="text-left px-2.5 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-card hover:border-violet-400 text-xs text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-nexora-border dark:border-nexora-border-dark flex items-end gap-2 bg-white dark:bg-nexora-dark-surface"
        >
          <textarea
            rows={2}
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                runPrompt(promptInput);
              }
            }}
            placeholder="Describe the email you want (e.g., Write a professional email requesting 2 days of leave)..."
            className="flex-1 px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
          />
          <button
            type="submit"
            disabled={generating || !promptInput.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Generate</span>
          </button>
        </form>
      </div>

      {/* Editable Generated Email Preview */}
      <div className="lg:col-span-6 flex flex-col rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs overflow-hidden min-h-[460px]">
        <div className="px-4 py-3 border-b border-nexora-border dark:border-nexora-border-dark flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 dark:bg-nexora-dark-card/50">
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            Editable Draft Output
          </span>

          {hasDraft && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => lastInstruction && runPrompt(lastInstruction)}
                disabled={generating}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Regenerate</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingDraft(!isEditingDraft)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card"
              >
                {isEditingDraft ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                <span>{isEditingDraft ? 'Preview' : 'Edit'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
          )}
        </div>

        {!hasDraft ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              Your generated email appears here
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Review, edit Subject and Body freely, then insert into Compose or schedule delivery. Nexora never sends emails without your explicit approval.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Subject
              </label>
              <input
                type="text"
                value={draftSubject}
                readOnly={!isEditingDraft}
                onChange={(e) => setDraftSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>

            <div className="flex-1 flex flex-col space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Message Body
              </label>
              {isEditingDraft ? (
                <textarea
                  rows={11}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  className="flex-1 w-full p-3 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              ) : (
                <div className="flex-1 p-3.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed overflow-y-auto">
                  {draftBody}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-nexora-border dark:border-nexora-border-dark flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleInsertIntoCompose}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white text-xs font-medium shadow-nexora-xs"
                >
                  <PenSquare className="w-3.5 h-3.5" />
                  <span>Insert into Compose</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleOpen(!scheduleOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-violet-300 dark:border-violet-500/40 bg-violet-50/60 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-medium hover:bg-violet-100 dark:hover:bg-violet-500/20"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Schedule Email</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleDiscard}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
            </div>

            {scheduleOpen && (
              <div className="pt-2">
                <AISchedulePanel
                  initialDraft={{
                    subject: draftSubject,
                    bodyHtml: plainTextToSafeHtml(draftBody)
                  }}
                  onScheduled={() => setScheduleOpen(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
