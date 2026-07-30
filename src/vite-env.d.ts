/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_OLLAMA_URL?: string;
    readonly VITE_OLLAMA_MODEL?: string;
    readonly VITE_OLLAMA_MAX_TOKENS?: string;
    readonly VITE_OLLAMA_TIMEOUT_MS?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
