export type ThemeName = "light" | "dark";

export type ThemePreference = ThemeName | "system";

export const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}
