export const palette = {
  textPrimary: "#e5e7eb",
  textSecondary: "#cbd5e1",
  accentPrimary: "#60a5fa",
  accentOnDark: "#091016",
  danger: "#ef4444",
  borderStrong: "rgba(255,255,255,0.12)",
  borderMuted: "rgba(255,255,255,0.07)",
  surfaceElevated: "rgba(255,255,255,0.06)",
  surfaceSubtle: "rgba(255,255,255,0.045)",
  backgroundDark: "#0b0d13",
} as const;

export const formCardColors = {
  text: palette.textPrimary,
  subtext: palette.textSecondary,
  border: palette.borderStrong,
  surface: palette.surfaceElevated,
  accent: palette.accentPrimary,
  accentFgOn: palette.accentOnDark,
  danger: palette.danger,
} as const;

export type FormCardColors = typeof formCardColors;

export const subtleFormCardColors = {
  text: palette.textPrimary,
  subtext: palette.textSecondary,
  border: palette.borderMuted,
  surface: palette.surfaceSubtle,
  accent: palette.accentPrimary,
  accentFgOn: palette.accentOnDark,
  danger: palette.danger,
} as const;

export type SubtleFormCardColors = typeof subtleFormCardColors;

export const modalColors = {
  text: palette.textPrimary,
  subtext: palette.textSecondary,
  surface: palette.surfaceElevated,
  border: palette.borderStrong,
  accent: palette.accentPrimary,
  bg: palette.backgroundDark,
} as const;

export type ModalColors = typeof modalColors;

export const modalColorsWithDanger = {
  ...modalColors,
  danger: palette.danger,
} as const;

export type ModalColorsWithDanger = typeof modalColorsWithDanger;
