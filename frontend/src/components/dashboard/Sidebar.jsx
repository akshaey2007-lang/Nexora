import React from 'react';
import {
  Inbox,
  Star,
  Bookmark,
  Send,
  FileText,
  Archive,
  AlertOctagon,
  Trash2,
  PenSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Tag,
  X
} from 'lucide-react';
import { useEmails } from '../../context/EmailContext';
import { useAuth } from '../../context/AuthContext';
import { FOLDERS } from '../../utils/constants';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const ICON_MAP = {
  Inbox,
  Star,
  Bookmark,
  Send,
  FileText,
  Archive,
  AlertOctagon,
  Trash2
};

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { currentFolder, setCurrentFolder, setSearchQuery, counts, customLabels, openCompose, selectEmail } = useEmails();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSelectFolder = (folderId) => {
    setSearchQuery('');
    setCurrentFolder(folderId);
    selectEmail(null);
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard');
    }
    if (setMobileOpen) setMobileOpen(false);
  };

  const handleCompose = () => {
    openCompose();
    if (setMobileOpen) setMobileOpen(false);
  };

  const sidebarContent = (isMobile = false) => {
    const isRail = !isMobile && collapsed;

    return (
      <div className="h-full flex flex-col bg-nexora-sidebar dark:bg-nexora-dark-sidebar border-r border-nexora-border dark:border-nexora-border-dark select-none">
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-nexora-border dark:border-nexora-border-dark flex-shrink-0">
          <Link
            to="/dashboard"
            onClick={() => handleSelectFolder('inbox')}
            className="flex items-center gap-2.5 min-w-0"
          >
            <img
              src="/nexora-icon.png"
              alt="Nexora Mail"
              className="w-8 h-8 object-contain flex-shrink-0"
            />
            {!isRail && (
              <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                Nexora Mail
              </span>
            )}
          </Link>

          {isMobile ? (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-nexora-dark-card transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-nexora-dark-card transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Compose CTA */}
        <div className="p-3 flex-shrink-0">
          <button
            onClick={handleCompose}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-lg bg-nexora-electric hover:bg-nexora-electric-hover text-white font-medium text-sm shadow-nexora-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexora-electric focus-visible:ring-offset-2"
            title="Compose email"
          >
            <PenSquare className="w-4 h-4 flex-shrink-0" />
            {!isRail && <span>Compose</span>}
          </button>
        </div>

        {/* Folder Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0.5">
          {FOLDERS.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const isActive = location.pathname === '/dashboard' && currentFolder === item.id;
            const count = item.countKey ? counts[item.countKey] || 0 : 0;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectFolder(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-nexora-electric dark:bg-indigo-500/15 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-nexora-dark-card hover:text-slate-900 dark:hover:text-white font-medium'
                }`}
                title={isRail ? item.label : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-nexora-electric dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  {!isRail && <span className="truncate">{item.label}</span>}
                </div>

                {!isRail && item.showCount && count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-[11px] rounded-md font-semibold tabular-nums ${
                      item.id === 'inbox'
                        ? 'bg-nexora-electric text-white'
                        : 'text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-nexora-dark-card'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Real Custom Gmail Labels (only shown if user has custom labels in Gmail) */}
          {!isRail && customLabels && customLabels.length > 0 && (
            <div className="pt-4 mt-3 border-t border-nexora-border dark:border-nexora-border-dark">
              <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Labels
              </div>
              <div className="space-y-0.5">
                {customLabels.map((label) => {
                  const folderKey = `label:${label.id}`;
                  const isActive = location.pathname === '/dashboard' && currentFolder === folderKey;
                  return (
                    <button
                      key={label.id}
                      onClick={() => handleSelectFolder(folderKey)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-nexora-electric dark:bg-indigo-500/15 dark:text-indigo-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-nexora-dark-card font-medium'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{label.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom Settings & Connected Account */}
        <div className="p-2.5 border-t border-nexora-border dark:border-nexora-border-dark space-y-1.5 flex-shrink-0">
          <Link
            to="/settings"
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              location.pathname === '/settings'
                ? 'bg-indigo-50 text-nexora-electric dark:bg-indigo-500/15 dark:text-indigo-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-nexora-dark-card hover:text-slate-900 dark:hover:text-white'
            }`}
            title={isRail ? 'Settings' : undefined}
          >
            <Settings className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {!isRail && <span>Settings</span>}
          </Link>

          {user && (
            <div
              className={`flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark ${
                isRail ? 'justify-center' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={
                    user.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user.displayName || user.email
                    )}&background=4F46E5&color=fff`
                  }
                  alt={user.displayName || user.email}
                  className="w-7 h-7 rounded-full object-cover"
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-nexora-dark-surface bg-emerald-500"
                  title="Connected to Gmail"
                />
              </div>

              {!isRail && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {user.displayName || 'Google Account'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block h-screen flex-shrink-0 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10 shadow-xl">
            {sidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
