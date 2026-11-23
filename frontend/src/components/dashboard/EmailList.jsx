import React from 'react';
import { Mail, RefreshCw, Inbox, Search } from 'lucide-react';
import EmailItem from './EmailItem';
import { useEmails } from '../../context/EmailContext';

export default function EmailList() {
  const {
    currentFolder,
    emails,
    selectedEmailId,
    selectEmail,
    loadingEmails,
    loadEmails,
    searchQuery
  } = useEmails();

  const folderTitle = searchQuery
    ? `Search Results for "${searchQuery}"`
    : currentFolder.charAt(0).toUpperCase() + currentFolder.slice(1);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-nexora-dark-surface overflow-hidden">
      {/* List Header / Toolbar */}
      <div className="h-14 px-4 sm:px-6 border-b border-nexora-border dark:border-nexora-border-dark flex items-center justify-between gap-4 bg-white dark:bg-nexora-dark-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-nexora-navy dark:text-white capitalize flex items-center gap-2">
            {folderTitle}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark font-medium text-nexora-muted">
            {emails.length} {emails.length === 1 ? 'message' : 'messages'}
          </span>
        </div>

        <button
          onClick={() => loadEmails()}
          disabled={loadingEmails}
          className="p-1.5 rounded-lg text-nexora-muted hover:text-nexora-navy dark:hover:text-white hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loadingEmails ? 'animate-spin text-nexora-electric' : ''}`} />
        </button>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto">
        {loadingEmails ? (
          // Skeleton Loading
          <div className="divide-y divide-nexora-border dark:divide-nexora-border-dark">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} className="flex items-center gap-4 px-4 py-4 animate-pulse">
                <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="w-40 h-4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 h-4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="w-16 h-4 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          // Empty State
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-nexora-muted">
            <div className="w-16 h-16 rounded-2xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark flex items-center justify-center mb-4 text-nexora-electric">
              {searchQuery ? <Search className="w-8 h-8" /> : <Inbox className="w-8 h-8" />}
            </div>
            <h3 className="text-base font-semibold text-nexora-navy dark:text-white mb-1">
              {searchQuery ? 'No matching emails found' : `Your ${currentFolder} is empty`}
            </h3>
            <p className="text-sm max-w-sm">
              {searchQuery
                ? 'Try refining your search keywords or clear the filter.'
                : 'There are no emails currently in this folder.'}
            </p>
          </div>
        ) : (
          // Email Items
          <div className="divide-y divide-nexora-border dark:divide-nexora-border-dark">
            {emails.map((email) => (
              <EmailItem
                key={email.id}
                email={email}
                isSelected={selectedEmailId === email.id}
                onClick={() => selectEmail(email.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
