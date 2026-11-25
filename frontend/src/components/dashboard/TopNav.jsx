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
  ExternalLink,
  UserPlus
} from 'lucide-react';
import { useEmails } from '../../context/EmailContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';

export default function TopNav() {
  const { searchQuery, setSearchQuery, loadEmails, loadingEmails } = useEmails();
  const { user, isDemo, loginWithGoogle, logout, disconnect } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [inputVal, setInputVal] = useState(searchQuery);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
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
    loadEmails(undefined, inputVal);
  };

  const handleClearSearch = () => {
    setInputVal('');
    setSearchQuery('');
    loadEmails(undefined, '');
  };

  return (
    <header className="h-16 bg-white dark:bg-nexora-dark-surface border-b border-nexora-border dark:border-nexora-border-dark px-4 sm:px-6 flex items-center justify-between gap-4 z-20">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-nexora-muted absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search emails by sender, subject, or query (e.g., from:acme is:unread)..."
            className="w-full pl-10 pr-10 py-2 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-sm text-nexora-navy dark:text-white placeholder:text-nexora-muted focus:outline-none focus:ring-2 focus:ring-nexora-electric/40 focus:border-nexora-electric transition-all"
          />
          {inputVal && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 p-1 rounded-full text-nexora-muted hover:text-nexora-navy dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Controls & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Refresh Button */}
        <button
          onClick={() => loadEmails()}
          disabled={loadingEmails}
          className="p-2 rounded-xl text-nexora-muted hover:text-nexora-navy dark:hover:text-white hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card transition-colors"
          title="Refresh emails"
        >
          <RefreshCw className={`w-4 h-4 ${loadingEmails ? 'animate-spin text-nexora-electric' : ''}`} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-nexora-muted hover:text-nexora-navy dark:hover:text-white hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Profile Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card transition-colors"
          >
            <img
              src={
                user?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user?.displayName || 'User'
                )}&background=536DFE&color=fff`
              }
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover border border-nexora-border dark:border-nexora-border-dark"
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-nexora-dark-surface rounded-2xl shadow-nexora-lg border border-nexora-border dark:border-nexora-border-dark py-2 z-50 animate-in fade-in-50 zoom-in-95">
              <div className="px-4 py-3 border-b border-nexora-border dark:border-nexora-border-dark">
                <p className="text-sm font-semibold text-nexora-navy dark:text-white truncate">
                  {user?.displayName || 'NEXORA User'}
                </p>
                <p className="text-xs text-nexora-muted truncate">{user?.email}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isDemo ? 'bg-amber-400' : 'bg-nexora-teal'
                    }`}
                  />
                  <span className="text-[11px] font-medium text-nexora-muted">
                    {isDemo ? 'Offline Demo Session' : 'Connected to Gmail API'}
                  </span>
                </div>
              </div>

              <div className="p-1 space-y-0.5">
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-nexora-ivory dark:hover:bg-nexora-dark-card rounded-xl transition-colors"
                >
                  <Settings className="w-4 h-4 text-nexora-muted" />
                  <span>Account & Settings</span>
                </Link>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    loginWithGoogle();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-nexora-electric hover:bg-nexora-electric/10 rounded-xl transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Switch Google Account</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    disconnect();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition-colors"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
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
