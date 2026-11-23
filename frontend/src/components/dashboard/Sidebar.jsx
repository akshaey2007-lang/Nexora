import React from 'react';
import {
  Inbox,
  Star,
  Bookmark,
  Send,
  FileText,
  AlertOctagon,
  Trash2,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { useEmails } from '../../context/EmailContext';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

const ICON_MAP = {
  inbox: Inbox,
  starred: Star,
  important: Bookmark,
  sent: Send,
  drafts: FileText,
  spam: AlertOctagon,
  trash: Trash2
};

const NAV_ITEMS = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox', countKey: 'inbox' },
  { id: 'starred', label: 'Starred', icon: 'starred', countKey: 'starred' },
  { id: 'important', label: 'Important', icon: 'important', countKey: 'important' },
  { id: 'sent', label: 'Sent', icon: 'sent', countKey: 'sent' },
  { id: 'drafts', label: 'Drafts', icon: 'drafts', countKey: 'drafts' },
  { id: 'spam', label: 'Spam', icon: 'spam', countKey: 'spam' },
  { id: 'trash', label: 'Trash', icon: 'trash', countKey: 'trash' }
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { currentFolder, setCurrentFolder, counts, openCompose, selectEmail } = useEmails();
  const { user, isDemo } = useAuth();
  const location = useLocation();

  const handleSelectFolder = (folderId) => {
    setCurrentFolder(folderId);
    selectEmail(null);
  };

  return (
    <aside
      className={`h-screen bg-white dark:bg-nexora-dark-surface border-r border-nexora-border dark:border-nexora-border-dark flex flex-col transition-all duration-300 z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-nexora-border dark:border-nexora-border-dark">
        <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-nexora-navy to-nexora-electric flex items-center justify-center flex-shrink-0 shadow-nexora-sm text-white font-bold text-lg">
            N
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-nexora-navy dark:text-white leading-tight">
                NEXORA<span className="text-nexora-electric">.</span>
              </span>
              <span className="text-[10px] font-semibold text-nexora-muted uppercase tracking-wider">
                Enterprise Mail
              </span>
            </div>
          )}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card text-nexora-muted hover:text-nexora-navy dark:hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Compose Button */}
      <div className="p-3">
        <button
          onClick={() => openCompose()}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold shadow-nexora-md transition-all duration-200 ${
            collapsed
              ? 'bg-nexora-electric text-white hover:bg-nexora-electric-hover'
              : 'bg-nexora-electric text-white hover:bg-nexora-electric-hover hover:shadow-nexora-glow'
          }`}
          title="Compose new email"
        >
          <Plus className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Compose</span>}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive = location.pathname === '/dashboard' && currentFolder === item.id;
          const count = counts[item.countKey] || 0;

          return (
            <button
              key={item.id}
              onClick={() => handleSelectFolder(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-nexora-electric/10 text-nexora-electric dark:bg-nexora-electric/20 font-semibold'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card hover:text-nexora-navy dark:hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-nexora-electric' : 'text-nexora-muted'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && count > 0 && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                    item.id === 'inbox'
                      ? 'bg-nexora-electric text-white'
                      : 'bg-nexora-border dark:bg-nexora-border-dark text-nexora-muted'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Account card */}
      <div className="p-3 border-t border-nexora-border dark:border-nexora-border-dark space-y-2">
        <Link
          to="/settings"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            location.pathname === '/settings'
              ? 'bg-nexora-electric/10 text-nexora-electric font-semibold'
              : 'text-gray-600 dark:text-gray-300 hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card'
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4 text-nexora-muted flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {user && (
          <div
            className={`flex items-center gap-2.5 p-2 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div className="relative flex-shrink-0">
              <img
                src={
                  user.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.displayName || user.email
                  )}&background=536DFE&color=fff`
                }
                alt={user.displayName || user.email}
                className="w-8 h-8 rounded-full object-cover border border-white dark:border-nexora-navy"
              />
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-nexora-navy ${
                  isDemo ? 'bg-amber-400' : 'bg-nexora-teal'
                }`}
                title={isDemo ? 'Demo session' : 'Connected to Gmail'}
              />
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-nexora-navy dark:text-white truncate">
                  {user.displayName || 'Google User'}
                </p>
                <p className="text-[11px] text-nexora-muted truncate">{user.email}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
