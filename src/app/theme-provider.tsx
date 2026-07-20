import { createContext, useContext, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

type Theme = "dark" | "light";

/**
 * Apply a theme to the document root. The theme lives on <html> (not a wrapper)
 * so portaled UI (dialogs, dropdowns, toasts) inherits the same theme.
 *
 * The app is section-themed: the public landing + auth surfaces are always
 * dark (brand identity), while the admin panel is light by default. Each
 * section applies its own theme on mount, so this is deliberately NOT applied
 * globally from the provider.
 */
export function applyHtmlTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

interface ThemeContextValue {
  /** The admin panel's theme preference (default light). */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Admin defaults to light; the founder can still toggle to dark.
  const [theme, setTheme] = useLocalStorage<Theme>("dra-admin-theme", "light");

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
