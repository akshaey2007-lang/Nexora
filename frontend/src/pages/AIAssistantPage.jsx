import React, { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  Mail,
  FileText,
  CalendarClock
} from 'lucide-react';
import AIModelStatus from '../components/ai/AIModelStatus';
import AIAssistant from '../components/ai/AIAssistant';
import AIEmailGenerator from '../components/ai/AIEmailGenerator';
import AISchedulePanel from '../components/ai/AISchedulePanel';
import { useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
  { id: 'writer', label: 'Email Writer', icon: Mail },
  { id: 'letter', label: 'Letter Generator', icon: FileText },
  { id: 'schedule', label: 'NL Scheduler', icon: CalendarClock }
];

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('assistant');
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-nexora-ivory dark:bg-nexora-dark-bg">
      <div className="max-w-6xl mx-auto space-y-5 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[11px] font-semibold border border-violet-200/70 dark:border-violet-500/30 mb-1.5">
              <Sparkles className="w-3 h-3" />
              <span>NEXORA AI &bull; Zero-Cost On-Device Intelligence</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              NEXORA AI
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Your intelligent assistant for effortless communication.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs self-start">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-violet-600 text-white shadow-nexora-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Local Model Status Bar */}
        <AIModelStatus />

        {/* Active AI Tool Surface */}
        {activeTab === 'assistant' && <AIAssistant />}
        {activeTab === 'writer' && <AIEmailGenerator mode="email" />}
        {activeTab === 'letter' && <AIEmailGenerator mode="letter" />}
        {activeTab === 'schedule' && (
          <div className="max-w-3xl">
            <AISchedulePanel onScheduled={() => navigate('/scheduled')} />
          </div>
        )}
      </div>
    </div>
  );
}
