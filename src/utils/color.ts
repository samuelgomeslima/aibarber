export const applyAlpha = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace("#", "");
  if (normalized.length !== 6) {
    return hexColor;
  }
  const clampAlpha = Math.max(0, Math.min(alpha, 1));
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clampAlpha})`;
};

const normalizeHex = (value: string) => {
  const hex = value.replace("#", "");
  if (hex.length === 3) {
    return hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return hex;
};

const toRgb = (value: string): [number, number, number] | null => {
  const hex = normalizeHex(value);
  if (hex.length !== 6) {
    return null;
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return null;
  }
  return [r, g, b];
};

const toHex = (value: number) => value.toString(16).padStart(2, "0");

export const mixHexColor = (base: string, mix: string, amount: number) => {
  const baseRgb = toRgb(base);
  const mixRgb = toRgb(mix);
  if (!baseRgb || !mixRgb) {
    return base;
  }

  const clamp = Math.max(0, Math.min(amount, 1));
  const [r1, g1, b1] = baseRgb;
  const [r2, g2, b2] = mixRgb;
  const r = Math.round(r1 + (r2 - r1) * clamp);
  const g = Math.round(g1 + (g2 - g1) * clamp);
  const b = Math.round(b1 + (b2 - b1) * clamp);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const tintHexColor = (color: string, amount: number, mixColor = "#ffffff") =>
  mixHexColor(color, mixColor, amount);
