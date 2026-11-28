import React from 'react';
import {
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Square
} from 'lucide-react';
import { useAI } from '../../context/AIContext';

export default function AIModelStatus({ compact = false }) {
  const {
    aiEnabled,
    selectedModelMeta,
    status,
    progress,
    progressText,
    cached,
    webgpu,
    initializeAI,
    cancelGeneration,
    unloadAI
  } = useAI();

  const pct = Math.round((progress || 0) * 100);
  const isUnsupported = status === 'unsupported' || (webgpu && !webgpu.supported);

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            {status === 'loading' || status === 'generating' ? (
              <Loader2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 animate-spin flex-shrink-0" />
            ) : status === 'ready' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : isUnsupported ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
            )}

            <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
              {status === 'ready'
                ? `${selectedModelMeta.name} ready`
                : status === 'loading'
                ? progressText || `Loading (${pct}%)`
                : status === 'generating'
                ? 'Generating...'
                : isUnsupported
                ? 'Templates'
                : !aiEnabled
                ? 'AI Off'
                : cached
                ? `${selectedModelMeta.name} (cached)`
                : `${selectedModelMeta.name} (${selectedModelMeta.approxDownload})`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {status === 'generating' && (
              <button
                type="button"
                onClick={cancelGeneration}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white text-[11px] font-medium hover:bg-red-700"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>Stop</span>
              </button>
            )}
            {aiEnabled && !isUnsupported && status !== 'ready' && status !== 'loading' && status !== 'generating' && (
              <button
                type="button"
                onClick={() => initializeAI()}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-medium"
              >
                <Download className="w-3 h-3" />
                <span>Load</span>
              </button>
            )}
          </div>
        </div>

        {status === 'loading' && (
          <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-nexora-dark-card overflow-hidden">
            <div
              className="h-full bg-violet-600 transition-all duration-200 rounded-full"
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-nexora-ivory dark:bg-nexora-dark-card border border-nexora-border dark:border-nexora-border-dark space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
            {selectedModelMeta.name}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
              status === 'ready'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                : status === 'loading' || status === 'generating'
                ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                : isUnsupported
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                : 'bg-slate-200/70 text-slate-700 dark:bg-nexora-dark-surface dark:text-slate-300'
            }`}
          >
            {status === 'ready'
              ? 'Ready'
              : status === 'loading'
              ? `${pct}%`
              : status === 'generating'
              ? 'Generating'
              : isUnsupported
              ? 'Unsupported'
              : !aiEnabled
              ? 'Disabled'
              : cached
              ? 'Cached'
              : 'Standby'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status === 'generating' && (
            <button
              type="button"
              onClick={cancelGeneration}
              className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-medium"
            >
              Stop
            </button>
          )}
          {status === 'ready' && (
            <button
              type="button"
              onClick={unloadAI}
              className="px-3 py-1 rounded-lg border border-nexora-border dark:border-nexora-border-dark bg-white dark:bg-nexora-dark-surface text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            >
              Unload
            </button>
          )}
          {aiEnabled && !isUnsupported && status !== 'ready' && status !== 'loading' && status !== 'generating' && (
            <button
              type="button"
              onClick={() => initializeAI()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{cached ? 'Load' : 'Download'}</span>
            </button>
          )}
        </div>
      </div>

      {status === 'loading' && (
        <div className="space-y-1">
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-nexora-dark-surface overflow-hidden">
            <div
              className="h-full bg-violet-600 transition-all duration-200 rounded-full"
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{progressText}</p>
        </div>
      )}
    </div>
  );
}
