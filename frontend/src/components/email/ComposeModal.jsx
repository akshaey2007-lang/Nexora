import React, { useState } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Paperclip,
  Send,
  Save,
  Trash2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon
} from 'lucide-react';
import { useEmails } from '../../context/EmailContext';
import { useToast } from '../../context/ToastContext';
import emailService from '../../services/emailService';
import { formatFileSize } from '../../utils/dateFormatter';

export default function ComposeModal() {
  const { isComposeOpen, closeCompose, composeData, loadEmails } = useEmails();
  const { success, error } = useToast();

  const [to, setTo] = useState(composeData.to || '');
  const [cc, setCc] = useState(composeData.cc || '');
  const [bcc, setBcc] = useState(composeData.bcc || '');
  const [subject, setSubject] = useState(composeData.subject || '');
  const [body, setBody] = useState(composeData.body || '');
  const [showCc, setShowCc] = useState(Boolean(composeData.cc));
  const [showBcc, setShowBcc] = useState(Boolean(composeData.bcc));
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Sync state if composeData changes
  React.useEffect(() => {
    setTo(composeData.to || '');
    setCc(composeData.cc || '');
    setBcc(composeData.bcc || '');
    setSubject(composeData.subject || '');
    setBody(composeData.body || '');
    setShowCc(Boolean(composeData.cc));
    setShowBcc(Boolean(composeData.bcc));
  }, [composeData]);

  if (!isComposeOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > 15 * 1024 * 1024) {
      error('Total attachment size exceeds 15MB limit.');
      return;
    }
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!to || !to.trim()) {
      error('Please enter at least one recipient address (To).');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('to', to);
      if (cc) formData.append('cc', cc);
      if (bcc) formData.append('bcc', bcc);
      formData.append('subject', subject);
      formData.append('body', body);
      if (composeData.inReplyTo) formData.append('inReplyTo', composeData.inReplyTo);
      if (composeData.references) formData.append('references', composeData.references);
      if (composeData.threadId) formData.append('threadId', composeData.threadId);

      for (const file of attachments) {
        formData.append('attachments', file);
      }

      await emailService.sendEmail(formData);
      success('Email successfully sent!');
      closeCompose();
      loadEmails('sent');
    } catch (err) {
      error(err.message || 'Failed to send email. Check recipient or permissions.');
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const formData = new FormData();
      formData.append('to', to);
      formData.append('cc', cc);
      formData.append('bcc', bcc);
      formData.append('subject', subject);
      formData.append('body', body);

      if (composeData.draftId) {
        await emailService.updateDraft(composeData.draftId, formData);
      } else {
        await emailService.createDraft(formData);
      }

      success('Draft saved.');
      closeCompose();
      loadEmails('drafts');
    } catch (err) {
      error('Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const applyFormat = (tag) => {
    setBody((prev) => `${prev} <${tag}>formatted</${tag}>`);
  };

  return (
    <div
      className={`fixed bottom-0 right-0 sm:right-6 z-50 bg-white dark:bg-nexora-dark-surface rounded-t-2xl shadow-2xl border border-nexora-border dark:border-nexora-border-dark overflow-hidden flex flex-col transition-all duration-300 w-full sm:max-w-xl ${
        isMinimized ? 'h-14' : 'h-[620px] max-h-[90vh]'
      }`}
    >
      {/* Modal Top Header */}
      <div className="h-14 px-4 bg-nexora-navy text-white flex items-center justify-between flex-shrink-0 cursor-pointer select-none">
        <span className="font-semibold text-sm truncate">
          {subject ? subject : 'New Message'}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title={isMinimized ? 'Restore' : 'Minimize'}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={closeCompose}
            className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden">
          {/* Email Recipient Fields */}
          <div className="border-b border-nexora-border dark:border-nexora-border-dark divide-y divide-nexora-border/60 dark:divide-nexora-border-dark/60 text-sm">
            {/* To */}
            <div className="flex items-center px-4 py-2">
              <span className="w-16 text-nexora-muted font-medium text-xs">To:</span>
              <input
                type="email"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 bg-transparent border-none focus:outline-none text-nexora-navy dark:text-white placeholder:text-nexora-muted/60 text-sm"
              />
              <div className="flex items-center gap-2 text-xs text-nexora-muted font-medium">
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

            {/* Cc */}
            {showCc && (
              <div className="flex items-center px-4 py-2">
                <span className="w-16 text-nexora-muted font-medium text-xs">Cc:</span>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="comma separated emails"
                  className="flex-1 bg-transparent border-none focus:outline-none text-nexora-navy dark:text-white placeholder:text-nexora-muted/60 text-sm"
                />
              </div>
            )}

            {/* Bcc */}
            {showBcc && (
              <div className="flex items-center px-4 py-2">
                <span className="w-16 text-nexora-muted font-medium text-xs">Bcc:</span>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="comma separated emails"
                  className="flex-1 bg-transparent border-none focus:outline-none text-nexora-navy dark:text-white placeholder:text-nexora-muted/60 text-sm"
                />
              </div>
            )}

            {/* Subject */}
            <div className="flex items-center px-4 py-2">
              <span className="w-16 text-nexora-muted font-medium text-xs">Subject:</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Message subject"
                className="flex-1 bg-transparent border-none focus:outline-none text-nexora-navy dark:text-white placeholder:text-nexora-muted/60 text-sm font-medium"
              />
            </div>
          </div>

          {/* Formatting Toolbar */}
          <div className="px-4 py-1.5 bg-nexora-ivory/50 dark:bg-nexora-dark-card/50 border-b border-nexora-border dark:border-nexora-border-dark flex items-center gap-1 text-nexora-muted">
            <button
              type="button"
              onClick={() => applyFormat('strong')}
              className="p-1 rounded hover:bg-white dark:hover:bg-nexora-dark-surface hover:text-nexora-navy dark:hover:text-white transition-colors"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('em')}
              className="p-1 rounded hover:bg-white dark:hover:bg-nexora-dark-surface hover:text-nexora-navy dark:hover:text-white transition-colors"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('ul')}
              className="p-1 rounded hover:bg-white dark:hover:bg-nexora-dark-surface hover:text-nexora-navy dark:hover:text-white transition-colors"
              title="Bullet list"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('ol')}
              className="p-1 rounded hover:bg-white dark:hover:bg-nexora-dark-surface hover:text-nexora-navy dark:hover:text-white transition-colors"
              title="Numbered list"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body Editor */}
          <div className="flex-1 p-4 overflow-y-auto">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email message here..."
              className="w-full h-full resize-none bg-transparent border-none focus:outline-none text-sm text-nexora-navy dark:text-white placeholder:text-nexora-muted leading-relaxed"
            />
          </div>

          {/* Attachment Chips */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-nexora-border dark:border-nexora-border-dark flex flex-wrap gap-2 max-h-24 overflow-y-auto bg-nexora-ivory/30 dark:bg-nexora-dark-card/30">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark text-xs"
                >
                  <Paperclip className="w-3 h-3 text-nexora-electric" />
                  <span className="truncate max-w-[140px] font-medium">{file.name}</span>
                  <span className="text-[10px] text-nexora-muted">({formatFileSize(file.size)})</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-nexora-muted hover:text-red-500 transition-colors ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer Controls */}
          <div className="p-3 border-t border-nexora-border dark:border-nexora-border-dark flex items-center justify-between bg-white dark:bg-nexora-dark-surface">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-nexora-electric text-white font-semibold text-sm hover:bg-nexora-electric-hover disabled:opacity-50 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Sending...' : 'Send'}</span>
              </button>

              <label className="p-2 rounded-xl border border-nexora-border dark:border-nexora-border-dark text-nexora-muted hover:text-nexora-navy dark:hover:text-white hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card cursor-pointer transition-colors">
                <Paperclip className="w-4 h-4" />
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="p-2 rounded-xl border border-nexora-border dark:border-nexora-border-dark text-nexora-muted hover:text-nexora-navy dark:hover:text-white hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card transition-colors"
                title="Save Draft"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={closeCompose}
              className="p-2 rounded-xl text-nexora-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Discard draft"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
