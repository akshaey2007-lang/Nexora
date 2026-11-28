import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Copy,
  Download,
  RotateCcw,
  Trash2,
  PenSquare,
  CalendarClock,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAI } from '../../context/AIContext';
import { useAuth } from '../../context/AuthContext';
import { useEmails } from '../../context/EmailContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import {
  LETTER_TYPES,
  WRITING_STYLES
} from '../../services/ai/aiPromptService';
import {
  generateAssistantEmail,
  generateLetter,
  generateStructuredEmail,
  plainTextToSafeHtml
} from '../../services/ai/aiWritingService';
import AIModelStatus from './AIModelStatus';
import AISchedulePanel from './AISchedulePanel';

export default function AISidebar() {
  const aiState = useAI();
  const { isAISidebarOpen, closeAISidebar } = aiState;
  const { user } = useAuth();
  const { openCompose } = useEmails();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('write'); // write | letter | schedule
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Professional');
  const [letterType, setLetterType] = useState(LETTER_TYPES[0].label);
  const [showMoreFields, setShowMoreFields] = useState(false);

  const [recipientName, setRecipientName] = useState('');
  const [recipientRole, setRecipientRole] = useState('');
  const [importantDetails, setImportantDetails] = useState('');

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [hasOutput, setHasOutput] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [inlineSchedule, setInlineSchedule] = useState(false);

  if (!isAISidebarOpen) return null;

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || generating) return;

    setGenerating(true);
    setStreamingText('');
    setInlineSchedule(false);

    try {
      if (tab === 'letter') {
        const res = await generateLetter({
          letterType,
          prompt: prompt.trim(),
          recipientName: recipientName.trim() || '[Recipient Name]',
          recipientTitle: recipientRole.trim() || '[Recipient Title]',
          senderName: user?.displayName || '[Your Name]',
          importantDetails: importantDetails.trim(),
          aiState,
          onToken: (acc) => setStreamingText(acc)
        });
        setSubject(`${letterType}`);
        setBody(res.letterText || '');
        setHasOutput(true);
      } else if (showMoreFields && (recipientName || recipientRole || importantDetails || style !== 'Professional')) {
        const res = await generateStructuredEmail({
          prompt: prompt.trim(),
          style,
          recipientName: recipientName.trim(),
          recipientRole: recipientRole.trim(),
          importantDetails: importantDetails.trim(),
          senderName: user?.displayName || '[Your Name]',
          aiState,
          onToken: (acc) => setStreamingText(acc)
        });
        setSubject(res.subject || '');
        setBody(res.body || '');
        setHasOutput(true);
      } else {
        const res = await generateAssistantEmail({
          instruction: `${prompt.trim()} (Style: ${style})`,
          senderName: user?.displayName || '[Your Name]',
          aiState,
          onToken: (acc) => setStreamingText(acc)
        });
        setSubject(res.subject || '');
        setBody(res.body || '');
        setHasOutput(true);
      }
    } catch (err) {
      error(err?.message || 'Generation failed.');
    } finally {
      setGenerating(false);
      setStreamingText('');
    }
  };

  const handleInsert = () => {
    openCompose({
      subject: tab === 'letter' ? '' : subject,
      body: plainTextToSafeHtml(body)
    });
  };

  const handleCopy = async () => {
    const content = tab === 'letter' ? body : `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(content);
    success('Copied.');
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${letterType.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setHasOutput(false);
    setSubject('');
    setBody('');
    setInlineSchedule(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden"
        onClick={closeAISidebar}
      />

      <aside className="fixed lg:static inset-y-0 right-0 z-40 w-full sm:w-[380px] lg:w-[390px] flex-shrink-0 h-full bg-white dark:bg-nexora-dark-surface border-l border-nexora-border dark:border-nexora-border-dark flex flex-col shadow-xl lg:shadow-none">
        {/* Header */}
        <div className="h-14 px-4 border-b border-nexora-border dark:border-nexora-border-dark flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Nexora AI</span>
          </div>

          <button
            type="button"
            onClick={closeAISidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-nexora-dark-card transition-colors"
            aria-label="Close AI sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-3 pt-2.5 pb-2 border-b border-nexora-border dark:border-nexora-border-dark flex items-center gap-1 flex-shrink-0">
          {[
            { id: 'write', label: 'Write' },
            { id: 'letter', label: 'Letter' },
            { id: 'schedule', label: 'Schedule' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Compact Model Status */}
        <div className="px-3 pt-2.5 flex-shrink-0">
          <AIModelStatus compact />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
          {tab === 'schedule' ? (
            <AISchedulePanel
              onScheduled={() => {
                closeAISidebar();
                navigate('/scheduled');
              }}
            />
          ) : (
            <>
              <form onSubmit={handleGenerate} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  {tab === 'letter' ? (
                    <select
                      value={letterType}
                      onChange={(e) => setLetterType(e.target.value)}
                      className="col-span-2 px-2.5 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
                      aria-label="Letter type"
                    >
                      {LETTER_TYPES.map((lt) => (
                        <option key={lt.id} value={lt.label}>
                          {lt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
                      aria-label="Style"
                    >
                      {WRITING_STYLES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}

                  {tab === 'write' && (
                    <button
                      type="button"
                      onClick={() => setShowMoreFields((v) => !v)}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-nexora-dark-card"
                    >
                      <span>Details</span>
                      {showMoreFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {showMoreFields && (
                  <div className="space-y-2 p-2.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Recipient"
                        className="px-2.5 py-1.5 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={recipientRole}
                        onChange={(e) => setRecipientRole(e.target.value)}
                        placeholder="Role"
                        className="px-2.5 py-1.5 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <input
                      type="text"
                      value={importantDetails}
                      onChange={(e) => setImportantDetails(e.target.value)}
                      placeholder="Key details"
                      className="w-full px-2.5 py-1.5 rounded-md bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder={tab === 'letter' ? 'Describe letter...' : 'Describe email...'}
                  className="w-full p-2.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                />

                <button
                  type="submit"
                  disabled={generating || !prompt.trim()}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium disabled:opacity-50 transition-colors"
                >
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{generating ? 'Generating...' : 'Generate'}</span>
                </button>
              </form>

              {generating && streamingText && (
                <div className="p-3 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                  {streamingText}
                </div>
              )}

              {hasOutput && (
                <div className="space-y-2.5 pt-2 border-t border-nexora-border dark:border-nexora-border-dark">
                  {tab !== 'letter' && (
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Subject"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs font-medium text-slate-900 dark:text-white"
                    />
                  )}

                  <textarea
                    rows={10}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed"
                  />

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleInsert}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white text-xs font-medium"
                    >
                      <PenSquare className="w-3.5 h-3.5" />
                      <span>Insert</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-nexora-dark-card"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>

                    {tab === 'letter' && (
                      <button
                        type="button"
                        onClick={handleDownloadTxt}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-nexora-dark-card"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>TXT</span>
                      </button>
                    )}

                    {tab === 'write' && (
                      <button
                        type="button"
                        onClick={() => setInlineSchedule((v) => !v)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-nexora-dark-card"
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>Schedule</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleGenerate()}
                      disabled={generating}
                      className="p-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-slate-500 hover:text-slate-900 dark:hover:text-white ml-auto"
                      aria-label="Regenerate"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleClear}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      aria-label="Discard"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {inlineSchedule && (
                    <AISchedulePanel
                      initialDraft={{
                        subject,
                        bodyHtml: plainTextToSafeHtml(body)
                      }}
                      onScheduled={() => setInlineSchedule(false)}
                      onCancel={() => setInlineSchedule(false)}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
