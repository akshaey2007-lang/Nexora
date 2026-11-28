import React from 'react';
import {
  ArrowLeft,
  Star,
  Archive,
  Trash2,
  Mail,
  Reply,
  ReplyAll,
  Forward,
  Paperclip,
  Download,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { useEmails } from '../../context/EmailContext';
import { formatFullEmailDate, formatFileSize } from '../../utils/dateFormatter';
import SanitizedEmailBody from '../email/SanitizedEmailBody';
import AISmartReply from '../ai/AISmartReply';
import emailService from '../../services/emailService';

export default function EmailDetail() {
  const [smartReplyOpen, setSmartReplyOpen] = React.useState(false);
  const {
    selectedEmail,
    selectEmail,
    loadingDetail,
    toggleStar,
    archiveEmail,
    trashEmail,
    restoreEmail,
    markRead,
    handleReply,
    handleReplyAll,
    handleForward,
    currentFolder
  } = useEmails();

  if (loadingDetail) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-nexora-dark-surface p-6 animate-pulse space-y-5">
        <div className="w-1/2 h-6 bg-slate-200 dark:bg-nexora-dark-card rounded" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-nexora-dark-card" />
          <div className="space-y-2 flex-1">
            <div className="w-1/4 h-4 bg-slate-200 dark:bg-nexora-dark-card rounded" />
            <div className="w-1/3 h-3 bg-slate-200 dark:bg-nexora-dark-card rounded" />
          </div>
        </div>
        <div className="space-y-3 pt-4">
          <div className="w-full h-4 bg-slate-200 dark:bg-nexora-dark-card rounded" />
          <div className="w-5/6 h-4 bg-slate-200 dark:bg-nexora-dark-card rounded" />
          <div className="w-4/6 h-4 bg-slate-200 dark:bg-nexora-dark-card rounded" />
        </div>
      </div>
    );
  }

  if (!selectedEmail) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-nexora-ivory dark:bg-nexora-dark-bg overflow-hidden">
      {/* Header Toolbar */}
      <div className="h-12 px-3 sm:px-5 border-b border-nexora-border dark:border-nexora-border-dark flex items-center justify-between gap-2 bg-white dark:bg-nexora-dark-surface flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => selectEmail(null)}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-nexora-dark-card transition-colors"
            title="Back to list"
            aria-label="Back to list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-nexora-border dark:bg-nexora-border-dark mx-1" />

          {currentFolder === 'trash' ? (
            <button
              type="button"
              onClick={() => restoreEmail(selectedEmail.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => archiveEmail(selectedEmail.id)}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-nexora-dark-card transition-colors"
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => trashEmail(selectedEmail.id)}
                className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Move to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => markRead(selectedEmail.id, false)}
                className="p-1.5 rounded-md text-slate-500 hover:text-nexora-electric hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-colors"
                title="Mark as unread"
              >
                <Mail className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={(e) => toggleStar(selectedEmail.id, e)}
            className="p-1.5 rounded-md text-slate-400 hover:text-amber-400 transition-colors"
            title={selectedEmail.isStarred ? 'Remove star' : 'Star message'}
          >
            <Star
              className={`w-4 h-4 ${
                selectedEmail.isStarred ? 'fill-amber-400 text-amber-400' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleReply(selectedEmail)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-card text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-nexora-dark-surface transition-colors"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reply</span>
          </button>

          <button
            type="button"
            onClick={() => handleReplyAll(selectedEmail)}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-card text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-nexora-dark-surface transition-colors"
            title="Reply All"
          >
            <ReplyAll className="w-3.5 h-3.5" />
            <span>Reply All</span>
          </button>

          <button
            type="button"
            onClick={() => handleForward(selectedEmail)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-card text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-nexora-dark-surface transition-colors"
            title="Forward"
          >
            <Forward className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Forward</span>
          </button>

          <button
            type="button"
            onClick={() => setSmartReplyOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-card text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/15 transition-colors"
            aria-label="AI Reply"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Reply</span>
          </button>
        </div>
      </div>

      {/* Reading Pane */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {/* Subject */}
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
          {selectedEmail.subject || '(No Subject)'}
        </h1>

        {/* Sender & Recipient Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-nexora-electric dark:text-indigo-300 font-semibold text-sm flex items-center justify-center flex-shrink-0">
              {(selectedEmail.fromName || selectedEmail.from || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {selectedEmail.fromName || selectedEmail.from}
                </span>
                {selectedEmail.fromEmail && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    &lt;{selectedEmail.fromEmail}&gt;
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 break-words">
                <span className="font-medium text-slate-600 dark:text-slate-300">To:</span>{' '}
                {selectedEmail.to || 'me'}
              </p>
              {selectedEmail.cc && (
                <p className="text-xs text-slate-500 dark:text-slate-400 break-words">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Cc:</span>{' '}
                  {selectedEmail.cc}
                </p>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500 tabular-nums flex-shrink-0 sm:text-right">
            {formatFullEmailDate(selectedEmail.date)}
          </div>
        </div>

        {/* Message Body */}
        <SanitizedEmailBody
          bodyHtml={selectedEmail.bodyHtml}
          bodyText={selectedEmail.bodyText}
        />

        {/* Attachments */}
        {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attachments ({selectedEmail.attachments.length})</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {selectedEmail.attachments.map((att, idx) => {
                const downloadUrl = emailService.getAttachmentUrl(
                  selectedEmail.id,
                  att.id,
                  att.filename,
                  att.mimeType
                );
                return (
                  <a
                    key={att.id || idx}
                    href={downloadUrl}
                    download={att.filename}
                    className="flex items-center justify-between p-3 rounded-xl border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-surface hover:border-nexora-electric/60 transition-colors group"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-nexora-electric transition-colors">
                        {att.filename}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
                        {formatFileSize(att.size)}
                      </p>
                    </div>
                    <div className="p-1.5 rounded-lg text-slate-400 group-hover:text-nexora-electric group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/15 transition-colors flex-shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Reply / Reply All / Forward Bar */}
        <div className="pt-2 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleReply(selectedEmail)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white font-medium text-xs transition-colors shadow-nexora-xs"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>

          <button
            type="button"
            onClick={() => handleReplyAll(selectedEmail)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-surface text-slate-700 dark:text-slate-200 font-medium text-xs hover:bg-slate-50 dark:hover:bg-nexora-dark-card transition-colors"
          >
            <ReplyAll className="w-3.5 h-3.5" />
            <span>Reply All</span>
          </button>

          <button
            type="button"
            onClick={() => handleForward(selectedEmail)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-surface text-slate-700 dark:text-slate-200 font-medium text-xs hover:bg-slate-50 dark:hover:bg-nexora-dark-card transition-colors"
          >
            <Forward className="w-3.5 h-3.5" />
            <span>Forward</span>
          </button>

          <button
            type="button"
            onClick={() => setSmartReplyOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium text-xs hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Reply</span>
          </button>
        </div>

        {/* Local Browser AI Smart Reply */}
        <AISmartReply
          email={selectedEmail}
          open={smartReplyOpen}
          onClose={() => setSmartReplyOpen(false)}
        />
      </div>
    </div>
  );
}
