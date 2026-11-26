import React from 'react';
import { Star, Paperclip, Archive, Trash2, Mail, MailOpen, RotateCcw, Check } from 'lucide-react';
import { formatEmailDate } from '../../utils/dateFormatter';
import { useEmails } from '../../context/EmailContext';

export default function EmailItem({ email, isSelected, isChecked, onClick }) {
  const {
    currentFolder,
    toggleStar,
    markRead,
    archiveEmail,
    trashEmail,
    restoreEmail,
    toggleSelectId
  } = useEmails();

  const isDraft = currentFolder === 'drafts' || email.isDraft;
  const isTrash = currentFolder === 'trash';

  const senderLabel = isDraft
    ? email.to
      ? `Draft to ${email.to}`
      : 'Draft'
    : currentFolder === 'sent'
    ? `To: ${email.to || '(No recipient)'}`
    : email.fromName || email.from || 'Unknown';

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-2.5 px-3 sm:px-4 py-2.5 border-b border-nexora-border dark:border-nexora-border-dark cursor-pointer transition-colors ${
        isSelected
          ? 'bg-indigo-50/90 dark:bg-indigo-500/15'
          : isChecked
          ? 'bg-indigo-50/40 dark:bg-indigo-500/10'
          : email.isUnread
          ? 'bg-white dark:bg-nexora-dark-surface hover:bg-slate-50 dark:hover:bg-nexora-dark-card'
          : 'bg-slate-50/40 dark:bg-nexora-dark-bg/50 hover:bg-slate-50 dark:hover:bg-nexora-dark-surface'
      }`}
    >
      {/* Selection Checkbox */}
      <button
        type="button"
        onClick={(e) => toggleSelectId(email.id, e)}
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          isChecked
            ? 'bg-nexora-electric border-nexora-electric text-white'
            : 'border-slate-300 dark:border-slate-600 hover:border-nexora-electric bg-white dark:bg-nexora-dark-card'
        }`}
        aria-label={isChecked ? 'Deselect email' : 'Select email'}
      >
        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
      </button>

      {/* Star Toggle */}
      {!isDraft && (
        <button
          type="button"
          onClick={(e) => toggleStar(email.id, e)}
          className="p-1 rounded text-slate-300 dark:text-slate-600 hover:text-amber-400 transition-colors flex-shrink-0"
          title={email.isStarred ? 'Remove star' : 'Star message'}
          aria-label={email.isStarred ? 'Remove star' : 'Star message'}
        >
          <Star
            className={`w-3.5 h-3.5 ${
              email.isStarred ? 'fill-amber-400 text-amber-400' : ''
            }`}
          />
        </button>
      )}

      {/* Unread Dot */}
      <div className="w-2 flex-shrink-0 flex justify-center">
        {email.isUnread && <span className="w-2 h-2 rounded-full bg-nexora-electric" />}
      </div>

      {/* Main Content (Responsive stack on mobile, inline on sm+) */}
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
        {/* Sender / Draft label */}
        <div className="sm:w-40 md:w-44 flex-shrink-0 truncate text-[13px]">
          <span
            className={
              isDraft
                ? 'text-red-600 dark:text-red-400 font-medium'
                : email.isUnread
                ? 'font-semibold text-slate-900 dark:text-white'
                : 'font-normal text-slate-600 dark:text-slate-300'
            }
          >
            {senderLabel}
          </span>
        </div>

        {/* Subject + Snippet */}
        <div className="flex-1 min-w-0 flex items-baseline gap-1.5 text-[13px]">
          <span
            className={`truncate ${
              email.isUnread
                ? 'font-semibold text-slate-900 dark:text-white'
                : 'font-normal text-slate-800 dark:text-slate-200'
            }`}
          >
            {email.subject || '(No Subject)'}
          </span>
          {email.snippet && (
            <span className="text-slate-400 dark:text-slate-500 font-normal text-xs truncate hidden md:inline">
              — {email.snippet}
            </span>
          )}
        </div>
      </div>

      {/* Attachment Indicator */}
      {email.hasAttachments && (
        <span className="flex-shrink-0 text-slate-400" title="Contains attachment">
          <Paperclip className="w-3.5 h-3.5" />
        </span>
      )}

      {/* Timestamp (hidden on desktop hover when action bar shows) */}
      <div className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500 tabular-nums w-14 text-right sm:group-hover:hidden">
        {formatEmailDate(email.date)}
      </div>

      {/* Quick Actions on Hover */}
      <div className="hidden sm:group-hover:flex items-center gap-0.5 flex-shrink-0">
        {isTrash ? (
          <button
            type="button"
            onClick={(e) => restoreEmail(email.id, e)}
            className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
            title="Restore to Inbox"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        ) : (
          <>
            {!isDraft && (
              <button
                type="button"
                onClick={(e) => archiveEmail(email.id, e)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-nexora-dark-card transition-colors"
                title="Archive"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => trashEmail(email.id, e)}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title={isDraft ? 'Delete draft' : 'Move to Trash'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {!isDraft && (
              <button
                type="button"
                onClick={(e) => markRead(email.id, email.isUnread, e)}
                className="p-1.5 rounded-md text-slate-400 hover:text-nexora-electric hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-colors"
                title={email.isUnread ? 'Mark as read' : 'Mark as unread'}
              >
                {email.isUnread ? <MailOpen className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
