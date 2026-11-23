import React from 'react';
import {
  ArrowLeft,
  Star,
  Archive,
  Trash2,
  Mail,
  Reply,
  Forward,
  Paperclip,
  Download,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { useEmails } from '../../context/EmailContext';
import { formatFullEmailDate, formatFileSize } from '../../utils/dateFormatter';
import SanitizedEmailBody from '../email/SanitizedEmailBody';
import emailService from '../../services/emailService';

export default function EmailDetail() {
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
    handleForward,
    currentFolder
  } = useEmails();

  if (loadingDetail) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-nexora-dark-surface p-6 animate-pulse space-y-6">
        <div className="w-1/3 h-6 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-2 flex-1">
            <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-1/6 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
        <div className="space-y-3 pt-4">
          <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="w-5/6 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="w-4/6 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!selectedEmail) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-nexora-dark-surface overflow-hidden">
      {/* Header Toolbar */}
      <div className="h-14 px-4 sm:px-6 border-b border-nexora-border dark:border-nexora-border-dark flex items-center justify-between gap-3 bg-white dark:bg-nexora-dark-surface flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => selectEmail(null)}
            className="p-1.5 rounded-lg text-nexora-muted hover:text-nexora-navy dark:hover:text-white hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card transition-colors"
            title="Back to email list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-nexora-border dark:bg-nexora-border-dark mx-1" />

          {currentFolder === 'trash' ? (
            <button
              onClick={() => restoreEmail(selectedEmail.id)}
              className="p-1.5 rounded-lg text-nexora-muted hover:text-nexora-teal hover:bg-nexora-teal/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Restore to Inbox"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restore</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => archiveEmail(selectedEmail.id)}
                className="p-1.5 rounded-lg text-nexora-muted hover:text-nexora-navy dark:hover:text-white hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card transition-colors"
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>

              <button
                onClick={() => trashEmail(selectedEmail.id)}
                className="p-1.5 rounded-lg text-nexora-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Move to trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => markRead(selectedEmail.id, false)}
                className="p-1.5 rounded-lg text-nexora-muted hover:text-nexora-electric hover:bg-nexora-electric/10 transition-colors"
                title="Mark as unread"
              >
                <Mail className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={(e) => toggleStar(selectedEmail.id, e)}
            className="p-1.5 rounded-lg text-nexora-muted hover:text-amber-400 transition-colors"
            title={selectedEmail.isStarred ? 'Unstar' : 'Star'}
          >
            <Star
              className={`w-4 h-4 ${
                selectedEmail.isStarred ? 'fill-amber-400 text-amber-400' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleReply(selectedEmail)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-nexora-border dark:border-nexora-border-dark text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card transition-colors"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>

          <button
            onClick={() => handleForward(selectedEmail)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-nexora-border dark:border-nexora-border-dark text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card transition-colors"
          >
            <Forward className="w-3.5 h-3.5" />
            <span>Forward</span>
          </button>
        </div>
      </div>

      {/* Email Body Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        {/* Subject Header */}
        <h1 className="text-xl sm:text-2xl font-bold text-nexora-navy dark:text-white leading-tight">
          {selectedEmail.subject || '(No Subject)'}
        </h1>

        {/* Sender Information Card */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-nexora-ivory/60 dark:bg-nexora-dark-card/50 border border-nexora-border dark:border-nexora-border-dark">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-nexora-navy to-nexora-electric text-white font-bold flex items-center justify-center flex-shrink-0">
              {(selectedEmail.fromName || selectedEmail.from || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-nexora-navy dark:text-white truncate">
                  {selectedEmail.fromName || selectedEmail.from}
                </span>
                <span className="text-xs text-nexora-muted truncate hidden sm:inline">
                  &lt;{selectedEmail.fromEmail || selectedEmail.from}&gt;
                </span>
              </div>
              <p className="text-xs text-nexora-muted truncate mt-0.5">
                to: {selectedEmail.to || 'me'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-nexora-muted flex-shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatFullEmailDate(selectedEmail.date)}</span>
          </div>
        </div>

        {/* Rendered HTML or Text Body */}
        <div className="py-4">
          <SanitizedEmailBody
            bodyHtml={selectedEmail.bodyHtml}
            bodyText={selectedEmail.bodyText}
          />
        </div>

        {/* Attachments Section */}
        {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
          <div className="pt-6 border-t border-nexora-border dark:border-nexora-border-dark space-y-3">
            <h4 className="text-xs font-bold text-nexora-muted uppercase tracking-wider flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attachments ({selectedEmail.attachments.length})</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedEmail.attachments.map((att, idx) => {
                const downloadUrl = emailService.getAttachmentUrl(selectedEmail.id, att.id);
                return (
                  <a
                    key={att.id || idx}
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-nexora-border dark:border-nexora-border-dark bg-nexora-ivory/40 dark:bg-nexora-dark-card/30 hover:border-nexora-electric/40 transition-colors group"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-semibold text-nexora-navy dark:text-white truncate group-hover:text-nexora-electric transition-colors">
                        {att.filename}
                      </p>
                      <p className="text-[11px] text-nexora-muted mt-0.5">
                        {formatFileSize(att.size)}
                      </p>
                    </div>
                    <div className="p-1.5 rounded-lg text-nexora-muted group-hover:text-nexora-electric group-hover:bg-nexora-electric/10 transition-colors flex-shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Quick Reply / Forward Actions */}
        <div className="pt-8 border-t border-nexora-border dark:border-nexora-border-dark flex items-center gap-3">
          <button
            onClick={() => handleReply(selectedEmail)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-nexora-electric text-white font-semibold text-xs hover:bg-nexora-electric-hover transition-colors shadow-sm"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Reply to sender</span>
          </button>

          <button
            onClick={() => handleForward(selectedEmail)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-nexora-border dark:border-nexora-border-dark text-gray-700 dark:text-gray-200 font-semibold text-xs hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card transition-colors"
          >
            <Forward className="w-3.5 h-3.5" />
            <span>Forward message</span>
          </button>
        </div>
      </div>
    </div>
  );
}
