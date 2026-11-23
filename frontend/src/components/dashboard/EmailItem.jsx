import React from 'react';
import { Star, Paperclip, Archive, Trash2, Mail, MailOpen } from 'lucide-react';
import { formatEmailDate } from '../../utils/dateFormatter';
import { useEmails } from '../../context/EmailContext';

export default function EmailItem({ email, isSelected, onClick }) {
  const { toggleStar, markRead, archiveEmail, trashEmail } = useEmails();

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-4 py-3.5 border-b border-nexora-border dark:border-nexora-border-dark cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-nexora-electric/10 dark:bg-nexora-electric/20 border-l-4 border-l-nexora-electric'
          : email.isUnread
          ? 'bg-white dark:bg-nexora-dark-surface font-semibold text-nexora-navy dark:text-white border-l-4 border-l-nexora-teal/80 hover:bg-nexora-ivory/60 dark:hover:bg-nexora-dark-card'
          : 'bg-nexora-ivory/30 dark:bg-nexora-dark-bg/60 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-nexora-dark-surface border-l-4 border-l-transparent'
      }`}
    >
      {/* Star button */}
      <button
        onClick={(e) => toggleStar(email.id, e)}
        className="text-gray-300 hover:text-amber-400 transition-colors p-1 rounded-md"
        title={email.isStarred ? 'Starred' : 'Not starred'}
      >
        <Star
          className={`w-4 h-4 ${
            email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-nexora-muted/50'
          }`}
        />
      </button>

      {/* Sender */}
      <div className="w-40 sm:w-48 flex-shrink-0 truncate text-sm">
        <span className={email.isUnread ? 'font-bold text-nexora-navy dark:text-white' : 'font-normal'}>
          {email.fromName || email.from || 'Unknown'}
        </span>
      </div>

      {/* Subject & Snippet */}
      <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">
        <span className={`truncate ${email.isUnread ? 'font-bold text-nexora-navy dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>
          {email.subject || '(No Subject)'}
        </span>
        <span className="text-nexora-muted font-normal text-xs truncate hidden md:inline">
          — {email.snippet}
        </span>
      </div>

      {/* Attachment clip */}
      {email.hasAttachments && (
        <div className="flex-shrink-0 text-nexora-muted" title="Has attachment">
          <Paperclip className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Date */}
      <div className="flex-shrink-0 text-xs text-nexora-muted font-medium w-16 text-right group-hover:hidden">
        {formatEmailDate(email.date)}
      </div>

      {/* Contextual Action Buttons on Hover */}
      <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => archiveEmail(email.id, e)}
          className="p-1.5 rounded-lg text-nexora-muted hover:text-nexora-navy dark:hover:text-white hover:bg-nexora-border/50 dark:hover:bg-nexora-border-dark transition-colors"
          title="Archive"
        >
          <Archive className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => trashEmail(email.id, e)}
          className="p-1.5 rounded-lg text-nexora-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => markRead(email.id, !email.isUnread, e)}
          className="p-1.5 rounded-lg text-nexora-muted hover:text-nexora-electric hover:bg-nexora-electric/10 transition-colors"
          title={email.isUnread ? 'Mark as read' : 'Mark as unread'}
        >
          {email.isUnread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
