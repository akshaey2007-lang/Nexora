import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Sun,
  Moon,
  LogOut,
  Settings,
  Shield,
  X,
  UserPlus,
  Menu,
  Sparkles
} from 'lucide-react';
import { useEmails } from '../../context/EmailContext';
import { useAuth } from '../../context/AuthContext';
import { useAI } from '../../context/AIContext';
import { useTheme } from '../../context/ThemeContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function TopNav({ onOpenMobileMenu }) {
  const { searchQuery, setSearchQuery, loadEmails, loadingEmails, selectEmail } = useEmails();
  const { user, loginWithGoogle, logout, disconnect } = useAuth();
  const { isAISidebarOpen, toggleAISidebar } = useAI();
  const { isDark, toggleTheme } = useTheme();

  const [inputVal, setInputVal] = useState(searchQuery);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setInputVal(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(inputVal);
    selectEmail(null);
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard');
    }
  };

  const handleClearSearch = () => {
    setInputVal('');
    setSearchQuery('');
  };

  return (
    <header className="h-14 bg-white dark:bg-nexora-dark-surface border-b border-nexora-border dark:border-nexora-border-dark px-3 sm:px-5 flex items-center justify-between gap-3 flex-shrink-0 z-20">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Mobile Navigation Drawer Trigger */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search mail (e.g. from:alice, is:unread, has:attachment)..."
            className="w-full pl-9 pr-9 py-1.5 rounded-lg bg-slate-100/80 dark:bg-nexora-dark-card border border-transparent focus:bg-white dark:focus:bg-nexora-dark-bg focus:border-nexora-electric/60 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-nexora-electric/15 transition-all"
          />
          {inputVal && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        <button
          onClick={() => loadEmails()}
          disabled={loadingEmails}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-nexora-dark-card transition-colors"
          title="Refresh mailbox"
          aria-label="Refresh mailbox"
        >
          <RefreshCw className={`w-4 h-4 ${loadingEmails ? 'animate-spin text-nexora-electric' : ''}`} />
        </button>

        <button
          onClick={() => {
            localStorage.setItem('nexora_theme_manual', '1');
            toggleTheme();
          }}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-nexora-dark-card transition-colors"
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleAISidebar}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isAISidebarOpen
              ? 'bg-violet-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-nexora-dark-card'
          }`}
          aria-label="Toggle Nexora AI sidebar"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">AI</span>
        </button>

        <Link
          to="/settings"
          className="hidden sm:flex p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-nexora-dark-card transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* User Profile Dropdown */}
        <div className="relative pl-1" ref={menuRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-nexora-electric/30 transition-all"
            aria-label="Account menu"
          >
            <img
              src={
                user?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user?.displayName || user?.email || 'U'
                )}&background=4F46E5&color=fff`
              }
              alt={user?.displayName || 'Profile'}
              className="w-8 h-8 rounded-full object-cover border border-nexora-border dark:border-nexora-border-dark"
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-nexora-dark-surface rounded-xl shadow-nexora-lg border border-nexora-border dark:border-nexora-border-dark py-1.5 z-50">
              <div className="px-3.5 py-2.5 border-b border-nexora-border dark:border-nexora-border-dark">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {user?.displayName || 'Google User'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Connected via Gmail API
                  </span>
                </div>
              </div>

              <div className="p-1 space-y-0.5">
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-nexora-dark-card rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Settings</span>
                </Link>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    loginWithGoogle();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-nexora-electric dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Switch Google Account</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    disconnect();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>Disconnect Account</span>
                </button>

                <div className="my-1 border-t border-nexora-border dark:border-nexora-border-dark" />

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
