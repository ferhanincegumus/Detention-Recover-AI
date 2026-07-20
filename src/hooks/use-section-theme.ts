import { useLayoutEffect } from "react";
import { applyHtmlTheme } from "@/app/theme-provider";

type Theme = "dark" | "light";

/**
 * Force a theme for a whole section (route) while it is mounted. Used so the
 * public landing/auth surfaces stay dark while the admin panel is light,
 * regardless of the saved admin preference.
 *
 * useLayoutEffect runs before paint to minimize any flash on navigation.
 */
export function useSectionTheme(theme: Theme): void {
  useLayoutEffect(() => {
    applyHtmlTheme(theme);
  }, [theme]);
}
