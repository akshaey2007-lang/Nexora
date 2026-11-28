import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Paperclip,
  Send,
  Save,
  Trash2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  RemoveFormatting,
  Sparkles,
  CalendarClock
} from 'lucide-react';
import { useEmails } from '../../context/EmailContext';
import { useToast } from '../../context/ToastContext';
import emailService from '../../services/emailService';
import { formatFileSize } from '../../utils/dateFormatter';
import AIWritingPanel from '../ai/AIWritingPanel';
import AISchedulePanel from '../ai/AISchedulePanel';

export default function ComposeModal() {
  const { isComposeOpen, closeCompose, composeData, loadEmails, fetchCounts } = useEmails();
  const { success, error } = useToast();

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [schedulePanelOpen, setSchedulePanelOpen] = useState(false);

  const editorRef = useRef(null);

  useEffect(() => {
    setTo(composeData.to || '');
    setCc(composeData.cc || '');
    setBcc(composeData.bcc || '');
    setSubject(composeData.subject || '');
    setBodyHtml(composeData.body || '');
    setShowCc(Boolean(composeData.cc));
    setShowBcc(Boolean(composeData.bcc));
    setAttachments([]);
    setIsMinimized(false);
    setLinkInputOpen(false);
    setLinkUrl('');
    setAiPanelOpen(false);
    setSchedulePanelOpen(false);

    if (editorRef.current) {
      editorRef.current.innerHTML = composeData.body || '';
    }
  }, [composeData, isComposeOpen]);

  if (!isComposeOpen) return null;

  const syncEditorContent = () => {
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  const applyBodyFromAI = (nextHtml) => {
    setBodyHtml(nextHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = nextHtml;
    }
  };

  const execCommand = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    syncEditorContent();
  };

  const handleInsertLink = (e) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    const formatted = /^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    execCommand('createLink', formatted);
    setLinkUrl('');
    setLinkInputOpen(false);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const combined = [...attachments, ...files];
    if (combined.length > 5) {
      error('Maximum 5 attachments allowed per email.');
      return;
    }
    const totalSize = combined.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > 15 * 1024 * 1024) {
      error('Total attachment size exceeds 15MB limit.');
      return;
    }
    setAttachments(combined);
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const validateRecipients = (input) => {
    const list = input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) return false;
    return list.every((addr) => {
      const m = addr.match(/<([^>]+)>/);
      const emailOnly = (m ? m[1] : addr).trim();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOnly);
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!validateRecipients(to)) {
      error('Please enter valid recipient email address(es) separated by commas.');
      return;
    }

    const currentHtml = editorRef.current ? editorRef.current.innerHTML : bodyHtml;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('to', to.trim());
      if (cc.trim()) formData.append('cc', cc.trim());
      if (bcc.trim()) formData.append('bcc', bcc.trim());
      formData.append('subject', subject);
      formData.append('body', currentHtml);
      if (composeData.inReplyTo) formData.append('inReplyTo', composeData.inReplyTo);
      if (composeData.references) formData.append('references', composeData.references);
      if (composeData.threadId) formData.append('threadId', composeData.threadId);
      if (composeData.draftId) formData.append('draftId', composeData.draftId);

      for (const file of attachments) {
        formData.append('attachments', file);
      }

      await emailService.sendEmail(formData);
      success('Message sent.');
      closeCompose();
      loadEmails();
      fetchCounts();
    } catch (err) {
      error(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    const currentHtml = editorRef.current ? editorRef.current.innerHTML : bodyHtml;
    setSavingDraft(true);
    try {
      const formData = new FormData();
      formData.append('to', to.trim());
      formData.append('cc', cc.trim());
      formData.append('bcc', bcc.trim());
      formData.append('subject', subject);
      formData.append('body', currentHtml);
      if (composeData.threadId) formData.append('threadId', composeData.threadId);

      for (const file of attachments) {
        formData.append('attachments', file);
      }

      if (composeData.draftId) {
        await emailService.updateDraft(composeData.draftId, formData);
      } else {
        await emailService.createDraft(formData);
      }

      success('Draft saved.');
      closeCompose();
      loadEmails();
      fetchCounts();
    } catch (err) {
      error(err.message || 'Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDiscard = async () => {
    if (composeData.draftId) {
      try {
        await emailService.deleteDraft(composeData.draftId);
        success('Draft discarded.');
        loadEmails();
        fetchCounts();
      } catch {
        error('Failed to discard draft.');
        return;
      }
    }
    closeCompose();
  };

  const containerSize = isMinimized
    ? 'h-12 w-full sm:w-80 bottom-0 right-0 sm:right-6'
    : isExpanded
    ? 'inset-3 sm:inset-8 max-w-4xl mx-auto'
    : 'bottom-0 right-0 sm:right-6 w-full sm:w-[580px] h-[100dvh] sm:h-[580px] sm:max-h-[85vh]';

  return (
    <div
      className={`fixed z-50 bg-white dark:bg-nexora-dark-surface sm:rounded-t-xl ${
        isExpanded ? 'rounded-xl' : ''
      } shadow-nexora-lg border border-nexora-border dark:border-nexora-border-dark overflow-hidden flex flex-col transition-all duration-200 ${containerSize}`}
    >
      {/* Top Bar */}
      <div
        onClick={() => isMinimized && setIsMinimized(false)}
        className="h-12 px-4 bg-slate-900 dark:bg-nexora-dark-sidebar text-white flex items-center justify-between flex-shrink-0 select-none"
      >
        <span className="font-medium text-sm truncate pr-2">
          {subject ? subject : composeData.draftId ? 'Edit Draft' : 'New Message'}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="hidden sm:inline-flex p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title={isMinimized ? 'Restore' : 'Minimize'}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
              setIsExpanded(!isExpanded);
            }}
            className="hidden sm:inline-flex p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title={isExpanded ? 'Default size' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeCompose();
            }}
            className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden">
          {/* Recipients & Subject */}
          <div className="border-b border-nexora-border dark:border-nexora-border-dark divide-y divide-nexora-border/70 dark:divide-nexora-border-dark/70 text-sm">
            <div className="flex items-center px-4 py-2 gap-2">
              <label className="w-12 text-slate-400 font-medium text-xs">To</label>
              <input
                type="text"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@domain.com"
                className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
              />
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="hover:text-nexora-electric"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="hover:text-nexora-electric"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>

            {showCc && (
              <div className="flex items-center px-4 py-2 gap-2">
                <label className="w-12 text-slate-400 font-medium text-xs">Cc</label>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Comma-separated emails"
                  className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
                />
              </div>
            )}

            {showBcc && (
              <div className="flex items-center px-4 py-2 gap-2">
                <label className="w-12 text-slate-400 font-medium text-xs">Bcc</label>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="Comma-separated emails"
                  className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
                />
              </div>
            )}

            <div className="flex items-center px-4 py-2 gap-2">
              <label className="w-12 text-slate-400 font-medium text-xs">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium"
              />
            </div>
          </div>

          {/* Rich Text Formatting Toolbar */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-nexora-dark-card/60 border-b border-nexora-border dark:border-nexora-border-dark flex flex-wrap items-center gap-1 text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('bold');
              }}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-nexora-dark-surface hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('italic');
              }}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-nexora-dark-surface hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('underline');
              }}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-nexora-dark-surface hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Underline"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <div className="h-3.5 w-px bg-nexora-border dark:border-nexora-border-dark mx-0.5" />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('insertUnorderedList');
              }}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-nexora-dark-surface hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Bulleted list"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('insertOrderedList');
              }}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-nexora-dark-surface hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Numbered list"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setLinkInputOpen(!linkInputOpen)}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-nexora-dark-surface hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Insert link"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('removeFormat');
              }}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-nexora-dark-surface hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Clear formatting"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSchedulePanelOpen(false);
                  setAiPanelOpen((v) => !v);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  aiPanelOpen
                    ? 'bg-violet-600 text-white'
                    : 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:hover:bg-violet-500/30'
                }`}
                title="Write or rewrite with local Nexora AI"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Write</span>
              </button>
            </div>
          </div>

          {aiPanelOpen && (
            <AIWritingPanel
              subject={subject}
              bodyHtml={editorRef.current ? editorRef.current.innerHTML : bodyHtml}
              onApplySubject={setSubject}
              onApplyBodyHtml={applyBodyFromAI}
              onClose={() => setAiPanelOpen(false)}
            />
          )}

          {schedulePanelOpen && (
            <div className="p-3 border-b border-nexora-border dark:border-nexora-border-dark max-h-72 overflow-y-auto bg-slate-50/70 dark:bg-nexora-dark-card/40 space-y-2">
              <AISchedulePanel
                initialDraft={{
                  to,
                  cc,
                  bcc,
                  subject,
                  bodyHtml: editorRef.current ? editorRef.current.innerHTML : bodyHtml
                }}
                onScheduled={() => {
                  setSchedulePanelOpen(false);
                  closeCompose();
                }}
                onCancel={() => setSchedulePanelOpen(false)}
              />
            </div>
          )}

          {linkInputOpen && (
            <div className="px-4 py-2 bg-slate-50 dark:bg-nexora-dark-card border-b border-nexora-border dark:border-nexora-border-dark flex items-center gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 px-2.5 py-1 rounded-md border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-surface text-xs focus:outline-none focus:ring-1 focus:ring-nexora-electric"
              />
              <button
                type="button"
                onClick={handleInsertLink}
                className="px-2.5 py-1 rounded-md bg-nexora-electric text-white text-xs font-medium"
              >
                Add Link
              </button>
            </div>
          )}

          {/* ContentEditable Rich Text Body */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div
              ref={editorRef}
              contentEditable
              onInput={syncEditorContent}
              data-placeholder="Write your message..."
              className="nexora-editor w-full min-h-full text-sm text-slate-900 dark:text-slate-100 leading-relaxed"
            />
          </div>

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-nexora-border dark:border-nexora-border-dark flex flex-wrap gap-2 max-h-24 overflow-y-auto bg-slate-50/70 dark:bg-nexora-dark-card/40">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-xs"
                >
                  <Paperclip className="w-3 h-3 text-nexora-electric" />
                  <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                  <span className="text-[11px] text-slate-400">({formatFileSize(file.size)})</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-slate-400 hover:text-red-500 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer Actions */}
          <div className="px-4 py-3 border-t border-nexora-border dark:border-nexora-border-dark flex items-center justify-between bg-white dark:bg-nexora-dark-surface">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white font-medium text-sm disabled:opacity-50 transition-colors shadow-nexora-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Sending...' : 'Send'}</span>
              </button>

              <label
                className="p-2 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-nexora-dark-card cursor-pointer transition-colors"
                title="Attach files (max 15MB)"
              >
                <Paperclip className="w-4 h-4" />
                <input type="file" multiple onChange={handleFileChange} className="hidden" />
              </label>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-nexora-dark-card text-xs font-medium transition-colors"
                title="Save draft"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{savingDraft ? 'Saving...' : 'Save draft'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAiPanelOpen(false);
                  setSchedulePanelOpen((v) => !v);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  schedulePanelOpen
                    ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                    : 'border-nexora-border dark:border-nexora-border-dark text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-nexora-dark-card'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Schedule</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDiscard}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Discard"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
