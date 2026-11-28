import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import webllmManager, {
  AI_MODELS,
  DEFAULT_AI_MODEL_ID,
  getModelMetadata
} from '../services/ai/webllmService';
import settingsService from '../services/settingsService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const AIContext = createContext(null);

export function AIProvider({ children }) {
  const { settings, setSettings, isAuthenticated } = useAuth();
  const { success, error, info } = useToast();

  const [aiEnabled, setAiEnabled] = useState(() => {
    const saved = localStorage.getItem('nexora_ai_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [selectedModelId, setSelectedModelId] = useState(() => {
    return localStorage.getItem('nexora_ai_model_id') || DEFAULT_AI_MODEL_ID;
  });

  const [engineState, setEngineState] = useState(() => webllmManager.getState());
  const [storageEstimate, setStorageEstimate] = useState(null);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);

  const openAISidebar = useCallback(() => setIsAISidebarOpen(true), []);
  const closeAISidebar = useCallback(() => setIsAISidebarOpen(false), []);
  const toggleAISidebar = useCallback(() => setIsAISidebarOpen((v) => !v), []);

  useEffect(() => {
    const unsubscribe = webllmManager.subscribe((nextState) => {
      setEngineState(nextState);
    });
    return unsubscribe;
  }, []);

  // Sync persisted server settings into local state without downloading any model weights
  useEffect(() => {
    if (settings) {
      if (settings.aiEnabled !== undefined) {
        setAiEnabled(Boolean(settings.aiEnabled));
        localStorage.setItem('nexora_ai_enabled', String(Boolean(settings.aiEnabled)));
      }
      if (settings.aiModelId) {
        const meta = getModelMetadata(settings.aiModelId);
        setSelectedModelId(meta.id);
        localStorage.setItem('nexora_ai_model_id', meta.id);
      }
    }
  }, [settings]);

  const refreshEnvironmentStatus = useCallback(
    async (modelId = selectedModelId) => {
      const env = await webllmManager.inspectEnvironment(modelId);
      const estimate = await webllmManager.getStorageInfo();
      setStorageEstimate(estimate);
      return env;
    },
    [selectedModelId]
  );

  // Check WebGPU + cache on login, and silently load already-cached model from browser SSD into GPU (zero network download)
  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return undefined;

    (async () => {
      const env = await refreshEnvironmentStatus(selectedModelId);
      if (
        !cancelled &&
        aiEnabled &&
        env?.webgpu?.supported &&
        env?.cached &&
        webllmManager.getState().status === 'idle'
      ) {
        webllmManager.initialize(selectedModelId).catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, aiEnabled, selectedModelId, refreshEnvironmentStatus]);

  const updateAISettings = useCallback(
    async ({ aiEnabled: nextEnabled, aiModelId: nextModelId }) => {
      const patch = {};
      if (nextEnabled !== undefined) {
        setAiEnabled(Boolean(nextEnabled));
        localStorage.setItem('nexora_ai_enabled', String(Boolean(nextEnabled)));
        patch.aiEnabled = Boolean(nextEnabled);
        if (!nextEnabled) {
          await webllmManager.unload();
        }
      }
      if (nextModelId) {
        const meta = getModelMetadata(nextModelId);
        setSelectedModelId(meta.id);
        localStorage.setItem('nexora_ai_model_id', meta.id);
        patch.aiModelId = meta.id;
        await refreshEnvironmentStatus(meta.id);
      }
      try {
        const res = await settingsService.updateSettings(patch);
        if (res?.settings) {
          setSettings(res.settings);
        }
      } catch {
        // Local storage already persisted cleanly even if offline
      }
    },
    [refreshEnvironmentStatus, setSettings]
  );

  const initializeAI = useCallback(
    async (modelId = selectedModelId) => {
      if (!aiEnabled) {
        error('Nexora AI is disabled. Enable it in Settings to initialize local inference.');
        return null;
      }
      try {
        const engine = await webllmManager.initialize(modelId);
        const estimate = await webllmManager.getStorageInfo();
        setStorageEstimate(estimate);
        const meta = getModelMetadata(modelId);
        success(`${meta.name} initialized locally in your browser.`);
        return engine;
      } catch (err) {
        error(err?.message || 'Unable to initialize local AI model.');
        return null;
      }
    },
    [aiEnabled, selectedModelId, error, success]
  );

  const clearCachedModel = useCallback(
    async (modelId = selectedModelId) => {
      await webllmManager.clearCachedModel(modelId);
      const estimate = await webllmManager.getStorageInfo();
      setStorageEstimate(estimate);
      info('Cleared cached model weights from browser storage.');
    },
    [selectedModelId, info]
  );

  const clearAllCachedModels = useCallback(async () => {
    await webllmManager.clearAllCachedModels();
    const estimate = await webllmManager.getStorageInfo();
    setStorageEstimate(estimate);
    info('All cached local AI model data cleared.');
  }, [info]);

  const cancelGeneration = useCallback(() => {
    webllmManager.interrupt();
  }, []);

  const unloadAI = useCallback(async () => {
    await webllmManager.unload();
    info('Unloaded AI model from device GPU memory.');
  }, [info]);

  return (
    <AIContext.Provider
      value={{
        aiEnabled,
        selectedModelId,
        models: AI_MODELS,
        selectedModelMeta: getModelMetadata(selectedModelId),
        status: !aiEnabled ? 'disabled' : engineState.status,
        progress: engineState.progress,
        progressText: !aiEnabled
          ? 'Nexora AI is disabled in Settings. Template fallback remains available.'
          : engineState.progressText,
        generationProgress: engineState.generationProgress,
        cached: engineState.cached,
        webgpu: engineState.webgpu,
        error: engineState.error,
        storageEstimate,
        initializeAI,
        updateAISettings,
        clearCachedModel,
        clearAllCachedModels,
        cancelGeneration,
        unloadAI,
        refreshEnvironmentStatus,
        isAISidebarOpen,
        openAISidebar,
        closeAISidebar,
        toggleAISidebar
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return ctx;
}
