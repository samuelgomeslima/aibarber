import type { ThemeName } from "./preferences";

export type ThemeColors = {
  bg: string;
  surface: string;
  sidebarBg: string;
  border: string;
  text: string;
  subtext: string;
  accent: string;
  accentFgOn: string;
  danger: string;
};

export const THEMES: Record<ThemeName, ThemeColors> = {
  dark: {
    bg: "#0b0d13",
    surface: "rgba(255,255,255,0.045)",
    sidebarBg: "#111827",
    border: "rgba(255,255,255,0.07)",
    text: "#e5e7eb",
    subtext: "#cbd5e1",
    accent: "#60a5fa",
    accentFgOn: "#091016",
    danger: "#ef4444",
  },
  light: {
    bg: "#f8fafc",
    surface: "rgba(15,23,42,0.06)",
    sidebarBg: "#ffffff",
    border: "rgba(15,23,42,0.12)",
    text: "#0f172a",
    subtext: "#475569",
    accent: "#2563eb",
    accentFgOn: "#f8fafc",
    danger: "#dc2626",
  },
};
