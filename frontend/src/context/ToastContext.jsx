import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', message, duration = 4000 }) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg, duration) => addToast({ type: 'success', message: msg, duration }), [addToast]);
  const error = useCallback((msg, duration) => addToast({ type: 'error', message: msg, duration: duration || 5000 }), [addToast]);
  const info = useCallback((msg, duration) => addToast({ type: 'info', message: msg, duration }), [addToast]);
  const warning = useCallback((msg, duration) => addToast({ type: 'warning', message: msg, duration }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-nexora-lg border backdrop-blur-md transform transition-all duration-300 animate-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-white/95 dark:bg-nexora-navy/95 border-nexora-teal/30 text-nexora-navy dark:text-white'
                : toast.type === 'error'
                ? 'bg-white/95 dark:bg-nexora-navy/95 border-red-500/30 text-nexora-navy dark:text-white'
                : toast.type === 'warning'
                ? 'bg-white/95 dark:bg-nexora-navy/95 border-amber-500/30 text-nexora-navy dark:text-white'
                : 'bg-white/95 dark:bg-nexora-navy/95 border-nexora-electric/30 text-nexora-navy dark:text-white'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-nexora-teal" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-nexora-electric" />}
            </div>
            <div className="flex-1 text-sm font-medium">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-nexora-muted hover:text-nexora-navy dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
