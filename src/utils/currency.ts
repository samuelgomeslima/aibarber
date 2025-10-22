export const sanitizeSignedCurrencyInput = (input: string) => {
  if (!input) return "";
  let sanitized = input.replace(/[^0-9.,-]/g, "");
  const isNegative = sanitized.startsWith("-");
  sanitized = sanitized.replace(/-/g, "");
  return isNegative ? `-${sanitized}` : sanitized;
};

export const parseSignedCurrency = (input: string): number => {
  if (!input) return NaN;
  const trimmed = input.trim();
  if (!trimmed) return NaN;
  const negative = trimmed.startsWith("-");
  const numericPart = trimmed.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
  if (!numericPart) return NaN;
  const value = Number.parseFloat(numericPart);
  if (!Number.isFinite(value)) return NaN;
  const cents = Math.round(value * 100);
  return negative ? -cents : cents;
};
