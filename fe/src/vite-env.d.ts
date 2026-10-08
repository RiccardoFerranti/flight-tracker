/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLANES_BASIC_WS_URL: string;
  readonly VITE_PLANE_DETAILS_WS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
