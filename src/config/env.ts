/**
 * Centralized, validated access to build-time environment variables.
 *
 * The app runs against a local mock backend by default so it is fully
 * demoable without any external services. Set VITE_DATA_BACKEND=base44 and
 * provide the Base44 app id to run against the real backend.
 */

type DataBackend = "mock" | "supabase";

function readString(key: string, fallback = ""): string {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readBool(key: string, fallback = false): boolean {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  if (typeof value !== "string") return fallback;
  return value === "true" || value === "1";
}

export const env = {
  appName: "Detention Recover AI",
  appUrl: readString("VITE_APP_URL", "https://detentionrecover.ai"),
  dataBackend: (readString("VITE_DATA_BACKEND", "mock") as DataBackend) satisfies DataBackend,
  supabase: {
    url: readString("VITE_SUPABASE_URL"),
    anonKey: readString("VITE_SUPABASE_ANON_KEY"),
    /** Base URL for Edge Functions; derived from the project URL if unset. */
    functionsUrl: readString("VITE_SUPABASE_FUNCTIONS_URL"),
  },
  features: {
    /** Public registration should be disabled after deployment (single admin). */
    publicRegistration: readBool("VITE_ENABLE_REGISTRATION", true),
    googleAuth: readBool("VITE_ENABLE_GOOGLE_AUTH", true),
    magicLink: readBool("VITE_ENABLE_MAGIC_LINK", true),
    /** SMS/WhatsApp is disabled for now — email-only via Resend. */
    sms: readBool("VITE_ENABLE_SMS", false),
  },
  support: {
    email: readString("VITE_SUPPORT_EMAIL", "recover@detentionrecover.ai"),
    phone: readString("VITE_SUPPORT_PHONE", "+18885551234"),
  },
} as const;

export const isMockBackend = env.dataBackend === "mock";
export const isSupabaseBackend = env.dataBackend === "supabase";
