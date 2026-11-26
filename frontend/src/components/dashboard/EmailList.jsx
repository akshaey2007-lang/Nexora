import React from 'react';
import {
  RefreshCw,
  Inbox,
  Search,
  Check,
  Minus,
  Archive,
  Trash2,
  MailOpen,
  Mail,
  Star,
  RotateCcw,
  PenSquare,
  ChevronDown
} from 'lucide-react';
import EmailItem from './EmailItem';
import { useEmails } from '../../context/EmailContext';
import { EMPTY_STATES } from '../../utils/constants';

export default function EmailList() {
  const {
    currentFolder,
    customLabels,
    emails,
    selectedEmailId,
    selectEmail,
    selectedIds,
    toggleSelectAll,
    performBulkAction,
    loadingEmails,
    loadingMore,
    nextPageToken,
    loadMoreEmails,
    loadEmails,
    searchQuery,
    setSearchQuery,
    openCompose
  } = useEmails();

  const resolveFolderTitle = () => {
    if (searchQuery) return `Search: "${searchQuery}"`;
    if (currentFolder.startsWith('label:')) {
      const labelId = currentFolder.slice(6);
      const found = customLabels.find((l) => l.id === labelId);
      return found ? found.name : 'Label';
    }
    return currentFolder.charAt(0).toUpperCase() + currentFolder.slice(1);
  };

  const folderTitle = resolveFolderTitle();
  const emptyMeta = EMPTY_STATES[currentFolder] || {
    title: 'No messages found.',
    description: 'There are currently no messages in this view.'
  };

  const allSelected = emails.length > 0 && selectedIds.length === emails.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < emails.length;
  const isTrash = currentFolder === 'trash';
  const isDrafts = currentFolder === 'drafts';

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-nexora-dark-surface overflow-hidden">
      {/* Toolbar */}
      <div className="h-12 px-3 sm:px-4 border-b border-nexora-border dark:border-nexora-border-dark flex items-center justify-between gap-2 bg-white dark:bg-nexora-dark-surface flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Master Select All Checkbox */}
          {emails.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                allSelected || someSelected
                  ? 'bg-nexora-electric border-nexora-electric text-white'
                  : 'border-slate-300 dark:border-slate-600 hover:border-nexora-electric bg-white dark:bg-nexora-dark-card'
              }`}
              title={allSelected ? 'Deselect all' : 'Select all'}
              aria-label="Select all messages"
            >
              {allSelected && <Check className="w-3 h-3 stroke-[3]" />}
              {someSelected && <Minus className="w-3 h-3 stroke-[3]" />}
            </button>
          )}

          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-1 overflow-x-auto">
              <span className="text-xs font-semibold text-nexora-electric dark:text-indigo-400 mr-1.5 whitespace-nowrap">
                {selectedIds.length} selected
              </span>

              {isTrash ? (
                <button
                  type="button"
                  onClick={() => performBulkAction('restore')}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
              ) : (
                <>
                  {!isDrafts && (
                    <>
                      <button
                        type="button"
                        onClick={() => performBulkAction('archive')}
                        className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card"
                        title="Archive selected"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => performBulkAction('markRead')}
                        className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card"
                        title="Mark as read"
                      >
                        <MailOpen className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => performBulkAction('markUnread')}
                        className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card"
                        title="Mark as unread"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => performBulkAction('star')}
                        className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card"
                        title="Star selected"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => performBulkAction('trash')}
                    className="p-1.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    title={isDrafts ? 'Delete selected drafts' : 'Move selected to Trash'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {folderTitle}
              </h2>
              {!loadingEmails && (
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                  {emails.length}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => loadEmails()}
          disabled={loadingEmails}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-nexora-dark-card transition-colors flex-shrink-0"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingEmails ? 'animate-spin text-nexora-electric' : ''}`} />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        {loadingEmails ? (
          <div className="divide-y divide-nexora-border dark:divide-nexora-border-dark">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-4 h-4 rounded bg-slate-200 dark:bg-nexora-dark-card" />
                <div className="w-4 h-4 rounded bg-slate-200 dark:bg-nexora-dark-card" />
                <div className="w-32 h-3.5 rounded bg-slate-200 dark:bg-nexora-dark-card" />
                <div className="flex-1 h-3.5 rounded bg-slate-200 dark:bg-nexora-dark-card" />
                <div className="w-12 h-3.5 rounded bg-slate-200 dark:bg-nexora-dark-card" />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark flex items-center justify-center mb-3 text-slate-400">
              {searchQuery ? <Search className="w-5 h-5" /> : <Inbox className="w-5 h-5" />}
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              {searchQuery ? 'No matching emails found.' : emptyMeta.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
              {searchQuery
                ? 'Try different search keywords or clear the active filter.'
                : emptyMeta.description}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3.5 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-nexora-dark-card transition-colors"
              >
                Clear search
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openCompose()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white text-xs font-medium transition-colors"
              >
                <PenSquare className="w-3.5 h-3.5" />
                <span>Compose email</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div>
              {emails.map((email) => (
                <EmailItem
                  key={email.id}
                  email={email}
                  isSelected={selectedEmailId === email.id}
                  isChecked={selectedIds.includes(email.id)}
                  onClick={() => selectEmail(email.id, email)}
                />
              ))}
            </div>

            {nextPageToken && (
              <div className="p-4 flex justify-center border-t border-nexora-border dark:border-nexora-border-dark">
                <button
                  type="button"
                  onClick={loadMoreEmails}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-nexora-dark-card disabled:opacity-50 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>{loadingMore ? 'Loading more...' : 'Load older messages'}</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
