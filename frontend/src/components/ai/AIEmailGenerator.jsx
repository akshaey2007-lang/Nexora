import React, { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  Copy,
  PenSquare,
  Trash2,
  Download,
  Loader2,
  Edit3,
  Check,
  FileText
} from 'lucide-react';
import { useAI } from '../../context/AIContext';
import { useAuth } from '../../context/AuthContext';
import { useEmails } from '../../context/EmailContext';
import { useToast } from '../../context/ToastContext';
import {
  EMAIL_EXAMPLE_PROMPTS,
  LETTER_EXAMPLE_PROMPTS,
  LETTER_TYPES,
  WRITING_STYLES
} from '../../services/ai/aiPromptService';
import {
  generateLetter,
  generateStructuredEmail,
  plainTextToSafeHtml
} from '../../services/ai/aiWritingService';

export default function AIEmailGenerator({ mode = 'email' }) {
  const aiState = useAI();
  const { user } = useAuth();
  const { openCompose } = useEmails();
  const { success, error, info } = useToast();

  // Shared / Email Writer states
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Professional');
  const [recipientName, setRecipientName] = useState('');
  const [recipientRole, setRecipientRole] = useState('');
  const [purpose, setPurpose] = useState('');
  const [importantDetails, setImportantDetails] = useState('');
  const [desiredTone, setDesiredTone] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Letter Generator states
  const [letterType, setLetterType] = useState(LETTER_TYPES[0].label);

  // Generated Output states
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [hasOutput, setHasOutput] = useState(false);
  const [editing, setEditing] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim() && !purpose.trim()) {
      error('Please describe what you want to write.');
      return;
    }

    setGenerating(true);
    setStreamingText('');

    try {
      if (mode === 'letter') {
        const res = await generateLetter({
          letterType,
          prompt: prompt.trim(),
          recipientName: recipientName.trim() || '[Recipient Name]',
          recipientTitle: recipientRole.trim() || '[Recipient Role / Organization]',
          senderName: user?.displayName || '[Your Name]',
          importantDetails: importantDetails.trim(),
          aiState,
          onToken: (acc) => setStreamingText(acc)
        });
        setBody(res.letterText || '');
        setSubject(`${letterType}: ${prompt.trim().slice(0, 60)}`);
        setHasOutput(true);
        setEditing(true);
        if (res.usedFallback) {
          info('Generated formal letter template offline (local WebGPU AI inactive).');
        }
      } else {
        const res = await generateStructuredEmail({
          prompt: prompt.trim(),
          style,
          recipientName: recipientName.trim(),
          recipientRole: recipientRole.trim(),
          purpose: purpose.trim(),
          importantDetails: importantDetails.trim(),
          tone: desiredTone.trim(),
          additionalInstructions: additionalInstructions.trim(),
          senderName: user?.displayName || '[Your Name]',
          aiState,
          onToken: (acc) => setStreamingText(acc)
        });
        setSubject(res.subject || '');
        setBody(res.body || '');
        setHasOutput(true);
        setEditing(true);
        if (res.usedFallback) {
          info('Generated email template offline (local WebGPU AI inactive).');
        }
      }
    } catch (err) {
      error(err?.message || 'Failed to generate content.');
    } finally {
      setGenerating(false);
      setStreamingText('');
    }
  };

  const handleCopy = async () => {
    const content = mode === 'letter' ? body : `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(content);
    success(mode === 'letter' ? 'Letter copied to clipboard.' : 'Email copied to clipboard.');
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
    success('Letter downloaded as TXT.');
  };

  const handleUseInCompose = () => {
    openCompose({
      subject: mode === 'letter' ? `${letterType} — Review Subject` : subject,
      body: plainTextToSafeHtml(body)
    });
    success('Inserted into Compose window.');
  };

  const handleDiscard = () => {
    setHasOutput(false);
    setSubject('');
    setBody('');
  };

  const examples = mode === 'letter' ? LETTER_EXAMPLE_PROMPTS : EMAIL_EXAMPLE_PROMPTS;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Input Controls */}
      <form
        onSubmit={handleGenerate}
        className="lg:col-span-5 p-5 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs space-y-4"
      >
        <div className="flex items-center gap-2">
          {mode === 'letter' ? (
            <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          )}
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {mode === 'letter' ? 'AI Letter Generator' : 'AI Email Writer'}
          </h3>
        </div>

        {mode === 'letter' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Letter Category
            </label>
            <select
              value={letterType}
              onChange={(e) => setLetterType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            >
              {LETTER_TYPES.map((lt) => (
                <option key={lt.id} value={lt.label}>
                  {lt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Prompt / Description
          </label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === 'letter'
                ? 'e.g., Write a formal letter to my college principal requesting permission to attend a technical conference.'
                : 'e.g., Write an email applying for a software developer internship.'
            }
            className="w-full p-3 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>

        {/* Example Prompts */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Example Prompts
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="px-2 py-1 rounded-md border border-nexora-border dark:border-nexora-border-dark bg-nexora-ivory dark:bg-nexora-dark-card hover:border-violet-400 text-[11px] text-slate-600 dark:text-slate-300 text-left transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {mode === 'email' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Writing Style
            </label>
            <div className="flex flex-wrap gap-1.5">
              {WRITING_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    style === s
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 dark:bg-nexora-dark-card text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-nexora-dark-bg'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Recipient Name
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              {mode === 'letter' ? 'Recipient Title / Org' : 'Recipient Role'}
            </label>
            <input
              type="text"
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value)}
              placeholder="e.g., Hiring Manager, Principal"
              className="w-full px-3 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {mode === 'email' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Purpose
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Core goal of email"
                className="w-full px-3 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Desired Tone
              </label>
              <input
                type="text"
                value={desiredTone}
                onChange={(e) => setDesiredTone(e.target.value)}
                placeholder="e.g., Polite, Confident"
                className="w-full px-3 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Important Details
          </label>
          <textarea
            rows={2}
            value={importantDetails}
            onChange={(e) => setImportantDetails(e.target.value)}
            placeholder="Dates, skills, attachment notes, deadlines..."
            className="w-full p-2.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
          />
        </div>

        {mode === 'email' && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Additional Instructions
            </label>
            <input
              type="text"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="e.g., Keep under 120 words"
              className="w-full px-3 py-1.5 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-900 dark:text-white"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={generating}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50 shadow-nexora-xs transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{generating ? 'Generating Locally...' : mode === 'letter' ? 'Generate Formal Letter' : 'Generate Email'}</span>
        </button>
      </form>

      {/* Output Pane */}
      <div className="lg:col-span-7 flex flex-col rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs overflow-hidden min-h-[480px]">
        <div className="px-4 py-3 border-b border-nexora-border dark:border-nexora-border-dark flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 dark:bg-nexora-dark-card/50">
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            {mode === 'letter' ? 'Generated Letter (Editable)' : 'Generated Email (Editable)'}
          </span>

          {hasOutput && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Regenerate</span>
              </button>
              <button
                type="button"
                onClick={() => setEditing(!editing)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card"
              >
                {editing ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                <span>{editing ? 'Preview' : 'Edit'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-nexora-border dark:border-nexora-border-dark text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card"
              >
                <Copy className="w-3 h-3" />
                <span>{mode === 'letter' ? 'Copy Letter' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 flex flex-col space-y-3">
          {generating && !hasOutput ? (
            <div className="flex-1 p-4 rounded-lg bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/70 dark:border-violet-500/30 text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-200">
              {streamingText || 'Drafting content locally...'}
            </div>
          ) : !hasOutput ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Ready to draft privately in your browser
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                {mode === 'letter'
                  ? 'Generates structured letters using placeholders like [Date], [Recipient Name], and [Your Name] — never fabricating personal details.'
                  : 'Produces separate editable Subject and Body fields ready for your review before inserting into Compose.'}
              </p>
            </div>
          ) : (
            <>
              {mode === 'email' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    readOnly={!editing}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex-1 flex flex-col space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {mode === 'letter' ? 'Letter Content' : 'Body'}
                </label>
                {editing ? (
                  <textarea
                    rows={14}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="flex-1 w-full p-3 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-slate-900 dark:text-white leading-relaxed font-sans"
                  />
                ) : (
                  <div className="flex-1 p-4 rounded-lg bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {body}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-nexora-border dark:border-nexora-border-dark flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUseInCompose}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white text-xs font-medium"
                  >
                    <PenSquare className="w-3.5 h-3.5" />
                    <span>{mode === 'letter' ? 'Use in Email' : 'Insert into Compose'}</span>
                  </button>

                  {mode === 'letter' && (
                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-nexora-dark-card"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download as TXT</span>
                    </button>
                  )}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
