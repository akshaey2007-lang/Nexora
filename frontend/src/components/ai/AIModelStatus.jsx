import React from 'react';
import {
  Sparkles,
  Cpu,
  Download,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
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
    generationProgress,
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
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200/80 dark:border-violet-500/30 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {status === 'loading' || status === 'generating' ? (
            <Loader2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 animate-spin flex-shrink-0" />
          ) : status === 'ready' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : isUnsupported ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
          )}

          <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
            {status === 'ready'
              ? `${selectedModelMeta.name} Ready (Local WebGPU)`
              : status === 'loading'
              ? `Loading ${selectedModelMeta.name} (${pct}%)`
              : status === 'generating'
              ? generationProgress || 'Generating locally...'
              : isUnsupported
              ? 'Template Mode (WebGPU unavailable in this browser)'
              : !aiEnabled
              ? 'Nexora AI disabled (Template mode active)'
              : cached
              ? `${selectedModelMeta.name} Cached — Ready to activate`
              : `Local AI: ${selectedModelMeta.name} (${selectedModelMeta.approxDownload})`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {status === 'generating' && (
            <button
              type="button"
              onClick={cancelGeneration}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-600 text-white text-[11px] font-medium hover:bg-red-700"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span>Stop</span>
            </button>
          )}
          {aiEnabled && !isUnsupported && status !== 'ready' && status !== 'loading' && status !== 'generating' && (
            <button
              type="button"
              onClick={() => initializeAI()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-medium transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>{cached ? 'Activate Model' : 'Load Local AI'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-nexora-dark-surface border border-nexora-border dark:border-nexora-border-dark shadow-nexora-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedModelMeta.name}
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                  status === 'ready'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                    : status === 'loading' || status === 'generating'
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                    : isUnsupported
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-nexora-dark-card dark:text-slate-300'
                }`}
              >
                {status === 'ready'
                  ? 'Ready'
                  : status === 'loading'
                  ? `Loading ${pct}%`
                  : status === 'generating'
                  ? 'Generating'
                  : isUnsupported
                  ? 'WebGPU Unavailable'
                  : !aiEnabled
                  ? 'Disabled'
                  : 'Standby'}
              </span>
              {cached && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-nexora-electric dark:bg-indigo-500/15 dark:text-indigo-300">
                  <HardDrive className="w-3 h-3" />
                  Cached
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {progressText}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {status === 'generating' && (
            <button
              type="button"
              onClick={cancelGeneration}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Generation</span>
            </button>
          )}

          {status === 'ready' && (
            <button
              type="button"
              onClick={unloadAI}
              className="px-3 py-1.5 rounded-lg border border-nexora-border dark:border-nexora-border-dark text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-nexora-dark-card"
            >
              Unload GPU Memory
            </button>
          )}

          {aiEnabled && !isUnsupported && status !== 'ready' && status !== 'loading' && status !== 'generating' && (
            <button
              type="button"
              onClick={() => initializeAI()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium shadow-nexora-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{cached ? 'Load Cached Model' : `Download & Initialize (${selectedModelMeta.approxDownload})`}</span>
            </button>
          )}
        </div>
      </div>

      {status === 'loading' && (
        <div className="space-y-1.5">
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-nexora-dark-card overflow-hidden">
            <div
              className="h-full bg-violet-600 transition-all duration-200 rounded-full"
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            <span>{progressText}</span>
            <span>{pct}%</span>
          </div>
        </div>
      )}

      {isUnsupported && (
        <div className="p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
          Local AI inference requires WebGPU support (for example Chrome 113+ or Edge 113+ on desktop with GPU acceleration). Smart structured non-AI email &amp; letter templates remain active at zero cost.
        </div>
      )}

      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        100% Free Local Inference: Runs directly inside your browser via WebLLM &amp; WebGPU. Zero paid API credits required.
      </p>
    </div>
  );
}
