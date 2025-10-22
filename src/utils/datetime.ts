import { pad, toDateKey } from "../lib/domain";

export const getTodayDateKey = () => toDateKey(new Date());

export const getCurrentTimeString = () => {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

export const normalizeTimeInput = (input?: string | null): string | null => {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length > 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] ?? "0");
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
};

export const buildDateTime = (
  dateInput?: string | null,
  timeInput?: string | null,
  fallbackTime = "00:00",
): Date | null => {
  const trimmedDate = dateInput?.trim();
  if (!trimmedDate) return null;
  const normalizedTime = normalizeTimeInput(timeInput) ?? normalizeTimeInput(fallbackTime) ?? "00:00";
  const iso = `${trimmedDate}T${normalizedTime}:00`;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return null;
  return value;
};
