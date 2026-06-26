/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_OLLAMA_URL?: string;
    readonly VITE_OLLAMA_MODEL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
