/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AEGIS_SOURCE?: string
  readonly VITE_AEGIS_BACKEND_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
