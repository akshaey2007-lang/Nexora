import React from 'react';
import { Sparkles, ShieldAlert, ArrowRight, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function DemoBanner() {
  const { isDemo, loginWithGoogle } = useAuth();

  if (!isDemo) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-nexora-electric/10 to-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 text-nexora-navy dark:text-amber-200">
      <div className="flex items-center gap-2 font-medium">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span className="font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Demo Mode Active:</span>
        <span className="text-gray-700 dark:text-gray-300">
          Previewing with simulated offline mailbox. All actions (send, star, trash, compose) are functional.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={loginWithGoogle}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-nexora-electric text-white font-medium hover:bg-nexora-electric-hover transition-colors shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Connect Real Gmail</span>
          <ArrowRight className="w-3 h-3" />
        </button>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-nexora-dark-card border border-amber-300/50 dark:border-amber-700/50 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-nexora-navy transition-colors"
        >
          <Settings className="w-3 h-3" />
          <span>Setup Guide</span>
        </Link>
      </div>
    </div>
  );
}
