import React from 'react';
import EmailList from '../components/dashboard/EmailList';
import EmailDetail from '../components/dashboard/EmailDetail';
import { useEmails } from '../context/EmailContext';
import { Mail } from 'lucide-react';

export default function DashboardPage() {
  const { selectedEmailId } = useEmails();

  return (
    <div className="flex h-full w-full overflow-hidden bg-nexora-ivory dark:bg-nexora-dark-bg">
      {/* Email List Pane (Full width on mobile when no message selected, fixed left pane on desktop) */}
      <div
        className={`w-full md:w-[360px] lg:w-[400px] xl:w-[430px] h-full flex-shrink-0 border-r border-nexora-border dark:border-nexora-border-dark ${
          selectedEmailId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <EmailList />
      </div>

      {/* Email Detail Pane */}
      <div
        className={`flex-1 h-full min-w-0 ${
          selectedEmailId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedEmailId ? (
          <EmailDetail />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-nexora-ivory dark:bg-nexora-dark-bg">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark flex items-center justify-center mb-3 text-slate-400 shadow-nexora-xs">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              No message selected
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Select a conversation from the list to read its full contents, download attachments, or reply.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
