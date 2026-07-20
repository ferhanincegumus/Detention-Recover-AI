import { getSupabase } from "@/services/supabase/client";
import { env } from "@/config/env";
import { UserRole, type User } from "@/types/user";
import type { User as SupabaseUser } from "@supabase/supabase-js";

function toAppUser(u: SupabaseUser): User {
  const name =
    (u.user_metadata?.full_name as string | undefined) ??
    (u.user_metadata?.name as string | undefined) ??
    u.email?.split("@")[0] ??
    "Admin";
  return {
    id: u.id,
    name,
    email: u.email ?? "",
    role: UserRole.Admin,
    avatarUrl: u.user_metadata?.avatar_url as string | undefined,
    createdAt: u.created_at,
  };
}

/** Supabase Auth adapter (email/password, Google OAuth, magic link, reset). */
export const supabaseAuth = {
  async getSession(): Promise<User | null> {
    const { data } = await getSupabase().auth.getSession();
    return data.session ? toAppUser(data.session.user) : null;
  },

  onAuthChange(cb: (user: User | null) => void): () => void {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      cb(session ? toAppUser(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  },

  async loginWithPassword(email: string, password: string): Promise<User> {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return toAppUser(data.user);
  },

  async loginWithGoogle(): Promise<User | null> {
    // Redirect-based OAuth — the session is picked up on return via onAuthChange.
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${env.appUrl}${import.meta.env.BASE_URL}login` },
    });
    if (error) throw new Error(error.message);
    return null;
  },

  async sendMagicLink(email: string): Promise<void> {
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${env.appUrl}${import.meta.env.BASE_URL}app` },
    });
    if (error) throw new Error(error.message);
  },

  async verifyMagicLink(): Promise<User> {
    // Supabase completes magic-link sign-in automatically (detectSessionInUrl).
    const user = await this.getSession();
    if (!user) throw new Error("Invalid or expired link.");
    return user;
  },

  async register(input: { name: string; email: string; password: string }): Promise<User> {
    const { data, error } = await getSupabase().auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.name } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Check your email to confirm your account.");
    return toAppUser(data.user);
  },

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${env.appUrl}${import.meta.env.BASE_URL}reset-password`,
    });
    if (error) throw new Error(error.message);
  },

  async resetPassword(_token: string, password: string): Promise<void> {
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },

  async logout(): Promise<void> {
    await getSupabase().auth.signOut();
  },

  demoCredentials: null,
};
