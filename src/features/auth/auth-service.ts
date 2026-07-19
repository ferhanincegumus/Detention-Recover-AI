import { sleep, uid } from "@/lib/utils";
import { UserRole, type User } from "@/types/user";

/**
 * Auth service. In mock mode this is a self-contained single-admin auth backed
 * by localStorage. In Base44 mode each method maps to Base44 Auth (email/pw,
 * Google OAuth, magic link) with the same return contract.
 */

const SESSION_KEY = "dra-session";

/** The single admin account for the mock backend. */
const ADMIN: User & { password: string } = {
  id: "owner_admin",
  name: "Founder",
  email: "admin@detentionrecover.ai",
  role: UserRole.Admin,
  password: "recover123",
  createdAt: "2026-01-01T00:00:00Z",
};

function persistSession(user: User): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function publicUser(): User {
  const { password: _password, ...rest } = ADMIN;
  void _password;
  return rest;
}

export const authService = {
  getSession(): User | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },

  async loginWithPassword(email: string, password: string): Promise<User> {
    await sleep(600);
    if (email.trim().toLowerCase() !== ADMIN.email || password !== ADMIN.password) {
      throw new Error("Invalid email or password.");
    }
    const user = publicUser();
    persistSession(user);
    return user;
  },

  async loginWithGoogle(): Promise<User> {
    await sleep(700);
    const user = publicUser();
    persistSession(user);
    return user;
  },

  async sendMagicLink(email: string): Promise<void> {
    await sleep(600);
    if (!email.includes("@")) throw new Error("Enter a valid email.");
    // In production a Base44 function emails a signed link via Resend.
  },

  /** Consume a magic-link token and establish a session. */
  async verifyMagicLink(token: string): Promise<User> {
    await sleep(500);
    if (!token) throw new Error("Invalid or expired link.");
    const user = publicUser();
    persistSession(user);
    return user;
  },

  async register(input: { name: string; email: string; password: string }): Promise<User> {
    await sleep(700);
    // Single-admin product — registration creates the admin session in mock mode.
    const user: User = {
      id: uid("user"),
      name: input.name,
      email: input.email,
      role: UserRole.Admin,
      createdAt: new Date().toISOString(),
    };
    persistSession(user);
    return user;
  },

  async requestPasswordReset(email: string): Promise<void> {
    await sleep(600);
    if (!email.includes("@")) throw new Error("Enter a valid email.");
  },

  async resetPassword(token: string, _password: string): Promise<void> {
    await sleep(600);
    void _password;
    if (!token) throw new Error("Invalid or expired reset link.");
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  /** Demo credentials surfaced on the login screen in mock mode. */
  demoCredentials: { email: ADMIN.email, password: ADMIN.password },
};
