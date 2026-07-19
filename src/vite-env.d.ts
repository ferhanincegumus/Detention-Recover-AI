/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
  readonly VITE_DATA_BACKEND?: string;
  readonly VITE_BASE44_APP_ID?: string;
  readonly VITE_BASE44_API_URL?: string;
  readonly VITE_ENABLE_REGISTRATION?: string;
  readonly VITE_ENABLE_GOOGLE_AUTH?: string;
  readonly VITE_ENABLE_MAGIC_LINK?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_SUPPORT_PHONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
