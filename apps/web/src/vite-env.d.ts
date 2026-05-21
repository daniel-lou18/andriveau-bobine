/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Worker origin for production Pages builds; unset in local dev (Vite `/api` proxy). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
