import React from 'react';
import EmailList from '../components/dashboard/EmailList';
import EmailDetail from '../components/dashboard/EmailDetail';
import { useEmails } from '../context/EmailContext';
import { Mail } from 'lucide-react';

export default function DashboardPage() {
  const { selectedEmailId } = useEmails();

  return (
    <div className="flex h-full w-full overflow-hidden bg-nexora-ivory dark:bg-nexora-dark-bg">
      {/* On mobile: show list if no email selected, show detail if email selected */}
      {/* On desktop: split pane view */}
      <div
        className={`w-full md:w-1/2 lg:w-2/5 xl:w-[420px] h-full flex-shrink-0 border-r border-nexora-border dark:border-nexora-border-dark ${
          selectedEmailId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <EmailList />
      </div>

      <div
        className={`flex-1 h-full min-w-0 ${
          selectedEmailId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedEmailId ? (
          <EmailDetail />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center text-nexora-muted bg-white dark:bg-nexora-dark-surface">
            <div className="w-16 h-16 rounded-2xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark flex items-center justify-center mb-4 text-nexora-electric">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-nexora-navy dark:text-white mb-1">
              Select an email to read
            </h3>
            <p className="text-sm max-w-sm">
              Choose a message from the list on the left to view the full conversation, attachments, and reply options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
