import { isSupabaseBackend } from "@/config/env";
import { authService } from "@/features/auth/auth-service";
import { supabaseAuth } from "@/features/auth/supabase-auth";
import type { User } from "@/types/user";

/** Unified async auth interface backing the AuthProvider. */
export interface AuthAdapter {
  getSession(): Promise<User | null>;
  onAuthChange?(cb: (user: User | null) => void): () => void;
  loginWithPassword(email: string, password: string): Promise<User>;
  loginWithGoogle(): Promise<User | null>;
  sendMagicLink(email: string): Promise<void>;
  verifyMagicLink(token: string): Promise<User>;
  register(input: { name: string; email: string; password: string }): Promise<User>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  logout(): Promise<void>;
  demoCredentials: { email: string; password: string } | null;
}

/** Wrap the synchronous mock auth service in the async adapter shape. */
const mockAdapter: AuthAdapter = {
  getSession: async () => authService.getSession(),
  loginWithPassword: (email, password) => authService.loginWithPassword(email, password),
  loginWithGoogle: async () => authService.loginWithGoogle(),
  sendMagicLink: (email) => authService.sendMagicLink(email),
  verifyMagicLink: (token) => authService.verifyMagicLink(token),
  register: (input) => authService.register(input),
  requestPasswordReset: (email) => authService.requestPasswordReset(email),
  resetPassword: (token, password) => authService.resetPassword(token, password),
  logout: async () => authService.logout(),
  demoCredentials: authService.demoCredentials,
};

export const auth: AuthAdapter = isSupabaseBackend ? supabaseAuth : mockAdapter;
