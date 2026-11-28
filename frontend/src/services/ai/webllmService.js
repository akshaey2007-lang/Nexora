let webllmModulePromise = null;
async function getWebLLM() {
  if (!webllmModulePromise) {
    webllmModulePromise = import('@mlc-ai/web-llm');
  }
  return await webllmModulePromise;
}

export const DEFAULT_AI_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

export const AI_MODELS = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    f32FallbackId: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.2 1B Instruct',
    provider: 'Meta (MLC WebLLM)',
    badge: 'Recommended Default',
    approxDownload: '~700 MB',
    vramMB: 879,
    speed: 'Very Fast',
    description:
      'Lightweight default optimized for fast loading, smooth student laptop performance, and concise everyday emails.'
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    f32FallbackId: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    name: 'Qwen 2.5 1.5B Instruct',
    provider: 'Alibaba Qwen (MLC WebLLM)',
    badge: 'Balanced Quality',
    approxDownload: '~1.0 GB',
    vramMB: 1630,
    speed: 'Fast',
    description:
      'Strong structured letter generation, tone rewriting, and natural-language scheduling extraction.'
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    f32FallbackId: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    name: 'Qwen 2.5 0.5B Instruct',
    provider: 'Alibaba Qwen (MLC WebLLM)',
    badge: 'Ultra Compact',
    approxDownload: '~400 MB',
    vramMB: 945,
    speed: 'Fastest',
    description:
      'Smallest download and memory footprint for slower connections or tight GPU memory.'
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    f32FallbackId: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.2 3B Instruct',
    provider: 'Meta (MLC WebLLM)',
    badge: 'Higher Quality',
    approxDownload: '~1.8 GB',
    vramMB: 2264,
    speed: 'Moderate',
    description:
      'Richer nuance for detailed business proposals, formal correspondence, and sensitive tone rewrites.'
  },
  {
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    f32FallbackId: 'Qwen2.5-3B-Instruct-q4f32_1-MLC',
    name: 'Qwen 2.5 3B Instruct',
    provider: 'Alibaba Qwen (MLC WebLLM)',
    badge: 'Rich Drafting',
    approxDownload: '~1.9 GB',
    vramMB: 2505,
    speed: 'Moderate',
    description:
      'Higher-capacity instruction model for complex letters and multi-detail email drafting (best with 4GB+ GPU VRAM).'
  }
];

export function getModelMetadata(modelId) {
  return (
    AI_MODELS.find((m) => m.id === modelId || m.f32FallbackId === modelId) ||
    AI_MODELS[0]
  );
}

export function resolveRuntimeModelId(preferredModelId, shaderF16Supported = true) {
  const meta = getModelMetadata(preferredModelId);
  if (!shaderF16Supported && meta.f32FallbackId) {
    return meta.f32FallbackId;
  }
  return meta.id;
}

/**
 * Checks whether the current browser and hardware expose a working WebGPU adapter.
 */
export async function checkWebGPUSupport() {
  if (typeof navigator === 'undefined') {
    return {
      supported: false,
      shaderF16: false,
      reason: 'WebGPU is only available inside a compatible desktop or mobile browser.'
    };
  }

  if (!('gpu' in navigator) || !navigator.gpu) {
    return {
      supported: false,
      shaderF16: false,
      reason:
        'This browser does not expose WebGPU (navigator.gpu). Use Chrome 113+, Edge 113+, or a WebGPU-enabled browser with hardware acceleration enabled. Offline templates remain available.'
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        shaderF16: false,
        reason:
          'No compatible WebGPU hardware adapter was found on this device (or GPU acceleration is disabled in browser settings). Template fallback remains available.'
      };
    }

    const shaderF16 = adapter.features ? adapter.features.has('shader-f16') : false;
    const maxBufferMB = adapter.limits?.maxStorageBufferBindingSize
      ? Math.round(adapter.limits.maxStorageBufferBindingSize / (1024 * 1024))
      : null;

    let adapterLabel = 'WebGPU Graphics Adapter';
    try {
      const info = adapter.info || (typeof adapter.requestAdapterInfo === 'function' ? await adapter.requestAdapterInfo() : null);
      if (info) {
        const parts = [info.vendor, info.architecture, info.description, info.device].filter(Boolean);
        if (parts.length > 0) adapterLabel = parts.join(' • ');
      }
    } catch {
      // Ignore optional adapter metadata lookup errors
    }

    return {
      supported: true,
      shaderF16,
      maxBufferMB,
      adapterLabel,
      reason: ''
    };
  } catch (err) {
    return {
      supported: false,
      shaderF16: false,
      reason: err?.message || 'Unable to access WebGPU adapter on this device.'
    };
  }
}

class WebLLMManager {
  constructor() {
    this.engine = null;
    this.loadedModelId = null;
    this.loadPromise = null;
    this.worker = null;
    this.appConfig = null;
    this.listeners = new Set();
    this.state = {
      status: 'idle', // idle | checking | loading | ready | generating | unsupported | error
      modelId: DEFAULT_AI_MODEL_ID,
      runtimeModelId: null,
      progress: 0,
      progressText: 'Not initialized (downloads only when you enable or click Initialize)',
      cached: false,
      generationProgress: '',
      error: null,
      webgpu: null
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  emit(patch) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  getState() {
    return { ...this.state };
  }

  async inspectEnvironment(preferredModelId = this.state.modelId) {
    const webgpu = await checkWebGPUSupport();
    const runtimeId = resolveRuntimeModelId(preferredModelId, webgpu.shaderF16);
    const cached = await this.hasCachedModel(runtimeId);
    const meta = getModelMetadata(preferredModelId);

    this.emit({
      modelId: meta.id,
      webgpu,
      cached,
      status: !webgpu.supported
        ? 'unsupported'
        : this.engine && this.loadedModelId === runtimeId
        ? 'ready'
        : 'idle',
      progressText: !webgpu.supported
        ? webgpu.reason
        : this.engine && this.loadedModelId === runtimeId
        ? `${meta.name} ready locally`
        : cached
        ? `${meta.name} cached in browser — click Load Local AI to activate instantaneously`
        : `${meta.name} ready to download (${meta.approxDownload}) when you start AI`
    });

    return { webgpu, cached, runtimeId };
  }

  async getAppConfig() {
    if (!this.appConfig) {
      const { prebuiltAppConfig } = await getWebLLM();
      this.appConfig = {
        ...prebuiltAppConfig,
        cacheBackend: 'cache'
      };
    }
    return this.appConfig;
  }

  async hasCachedModel(modelId = this.state.modelId) {
    try {
      const { hasModelInCache } = await getWebLLM();
      const appConfig = await this.getAppConfig();
      const runtimeId = resolveRuntimeModelId(
        modelId,
        this.state.webgpu ? this.state.webgpu.shaderF16 : true
      );
      if (await hasModelInCache(runtimeId, appConfig)) return true;
      const meta = getModelMetadata(modelId);
      if (meta.f32FallbackId && (await hasModelInCache(meta.f32FallbackId, appConfig))) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async getStorageInfo() {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        return {
          usageBytes: estimate.usage || 0,
          quotaBytes: estimate.quota || 0
        };
      }
    } catch {
      // Storage API optional
    }
    return null;
  }

  async initialize(preferredModelId = this.state.modelId) {
    const meta = getModelMetadata(preferredModelId);
    const webgpu = this.state.webgpu || (await checkWebGPUSupport());

    if (!webgpu.supported) {
      this.emit({
        status: 'unsupported',
        webgpu,
        error: webgpu.reason,
        progressText: webgpu.reason
      });
      throw new Error(webgpu.reason);
    }

    const runtimeId = resolveRuntimeModelId(meta.id, webgpu.shaderF16);

    if (this.engine && this.loadedModelId === runtimeId) {
      this.emit({
        status: 'ready',
        modelId: meta.id,
        runtimeModelId: runtimeId,
        progress: 1,
        cached: true,
        error: null,
        progressText: `${meta.name} ready locally in your browser`
      });
      return this.engine;
    }

    if (this.loadPromise) {
      return await this.loadPromise;
    }

    this.loadPromise = (async () => {
      try {
        const alreadyCached = await this.hasCachedModel(meta.id);
        this.emit({
          status: 'loading',
          modelId: meta.id,
          runtimeModelId: runtimeId,
          progress: 0.02,
          cached: alreadyCached,
          error: null,
          progressText: alreadyCached
            ? `Loading ${meta.name} from local browser cache...`
            : `Downloading & caching ${meta.name} (${meta.approxDownload})...`
        });

        const initProgressCallback = (report) => {
          const pct = typeof report?.progress === 'number' ? Math.max(0, Math.min(1, report.progress)) : 0;
          this.emit({
            status: 'loading',
            progress: pct,
            progressText: report?.text || `Preparing model (${Math.round(pct * 100)}%)...`
          });
        };

        const { CreateMLCEngine, CreateWebWorkerMLCEngine } = await getWebLLM();
        const appConfig = await this.getAppConfig();

        if (this.engine && typeof this.engine.reload === 'function') {
          await this.engine.reload(runtimeId);
        } else {
          try {
            if (!this.worker && typeof Worker !== 'undefined') {
              this.worker = new Worker(new URL('./aiWorker.js', import.meta.url), {
                type: 'module'
              });
            }
            if (this.worker) {
              this.engine = await CreateWebWorkerMLCEngine(this.worker, runtimeId, {
                appConfig,
                initProgressCallback
              });
            } else {
              this.engine = await CreateMLCEngine(runtimeId, {
                appConfig,
                initProgressCallback
              });
            }
          } catch (workerErr) {
            // Safe fallback to main-thread engine if browser blocks dedicated module workers
            this.worker = null;
            this.engine = await CreateMLCEngine(runtimeId, {
              appConfig,
              initProgressCallback
            });
            void workerErr;
          }
        }

        this.loadedModelId = runtimeId;
        this.emit({
          status: 'ready',
          modelId: meta.id,
          runtimeModelId: runtimeId,
          progress: 1,
          cached: true,
          error: null,
          progressText: `${meta.name} loaded cleanly on device GPU`
        });

        return this.engine;
      } catch (err) {
        const message = err?.message || 'Failed to load local WebLLM model.';
        this.emit({
          status: 'error',
          error: message,
          progressText: `Model load failed: ${message}`
        });
        throw err;
      } finally {
        this.loadPromise = null;
      }
    })();

    return await this.loadPromise;
  }

  async generate({
    systemPrompt,
    userPrompt,
    messages = null,
    temperature = 0.5,
    maxTokens = 700,
    onToken = null,
    preferredModelId = this.state.modelId
  }) {
    const engine = await this.initialize(preferredModelId);

    const chatMessages = messages || [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    this.emit({
      status: 'generating',
      generationProgress: 'Generating locally on WebGPU...',
      error: null
    });

    try {
      if (typeof onToken === 'function') {
        const chunks = await engine.chat.completions.create({
          messages: chatMessages,
          temperature,
          max_tokens: maxTokens,
          stream: true
        });

        let accumulated = '';
        let tokenCount = 0;
        for await (const chunk of chunks) {
          const delta = chunk.choices?.[0]?.delta?.content || '';
          if (delta) {
            accumulated += delta;
            tokenCount += 1;
            onToken(accumulated, delta, tokenCount);
            if (tokenCount % 12 === 0) {
              this.emit({
                status: 'generating',
                generationProgress: `Generated ${tokenCount} chunks locally...`
              });
            }
          }
        }

        this.emit({
          status: 'ready',
          generationProgress: ''
        });
        return accumulated;
      }

      const completion = await engine.chat.completions.create({
        messages: chatMessages,
        temperature,
        max_tokens: maxTokens
      });

      const content = completion.choices?.[0]?.message?.content || '';
      this.emit({
        status: 'ready',
        generationProgress: ''
      });
      return content;
    } catch (err) {
      const msg = err?.message || 'Generation interrupted or failed.';
      this.emit({
        status: 'ready',
        generationProgress: '',
        error: msg
      });
      throw err;
    }
  }

  interrupt() {
    try {
      if (this.engine && typeof this.engine.interruptGenerate === 'function') {
        this.engine.interruptGenerate();
      }
    } finally {
      this.emit({
        status: this.engine ? 'ready' : 'idle',
        generationProgress: ''
      });
    }
  }

  async unload() {
    try {
      if (this.engine && typeof this.engine.unload === 'function') {
        await this.engine.unload();
      }
    } catch {
      // Ignore cleanup errors
    } finally {
      if (this.worker && typeof this.worker.terminate === 'function') {
        this.worker.terminate();
      }
      this.worker = null;
      this.engine = null;
      this.loadedModelId = null;
      const stillCached = await this.hasCachedModel(this.state.modelId);
      this.emit({
        status: 'idle',
        runtimeModelId: null,
        progress: 0,
        cached: stillCached,
        generationProgress: '',
        progressText: 'Model unloaded from GPU memory'
      });
    }
  }

  async clearCachedModel(modelId = this.state.modelId) {
    const meta = getModelMetadata(modelId);
    if (this.loadedModelId === meta.id || this.loadedModelId === meta.f32FallbackId) {
      await this.unload();
    }

    const { deleteModelAllInfoInCache } = await getWebLLM();
    const appConfig = await this.getAppConfig();
    const idsToDelete = [meta.id, meta.f32FallbackId].filter(Boolean);
    for (const id of idsToDelete) {
      try {
        await deleteModelAllInfoInCache(id, appConfig);
      } catch {
        // Ignore missing cache entries
      }
    }

    const cached = await this.hasCachedModel(this.state.modelId);
    this.emit({
      cached,
      progress: 0,
      progressText: 'Cached model files removed from browser storage'
    });
  }

  async clearAllCachedModels() {
    await this.unload();

    const { deleteModelAllInfoInCache } = await getWebLLM();
    const appConfig = await this.getAppConfig();
    for (const m of AI_MODELS) {
      for (const id of [m.id, m.f32FallbackId].filter(Boolean)) {
        try {
          await deleteModelAllInfoInCache(id, appConfig);
        } catch {
          // Ignore errors
        }
      }
    }

    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => /webllm|mlc/i.test(k))
          .map((k) => caches.delete(k))
      );
    }

    this.emit({
      cached: false,
      progress: 0,
      progressText: 'All cached local AI models cleared'
    });
  }
}

export const webllmManager = new WebLLMManager();
export default webllmManager;
