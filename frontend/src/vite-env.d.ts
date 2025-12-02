/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SEF_ENV: 'demo' | 'production';
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SHOW_DEMO?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
