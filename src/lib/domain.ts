import { MaterialCommunityIcons } from "@expo/vector-icons";

import { DEFAULT_TIMEZONE, formatDateKey, formatDateLabel } from "./timezone";

export type ServiceId = string;
export type Service = {
  id: ServiceId;
  name: string;
  estimated_minutes: number;
  price_cents: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  created_at?: string | null;
};

export type ServicePackageItem = {
  id: string;
  service_id: ServiceId;
  quantity: number;
};

export type ServicePackage = {
  id: string;
  name: string;
  price_cents: number;
  regular_price_cents: number;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items: ServicePackageItem[];
};

export type ProductId = string;
export type Product = {
  id: ProductId;
  name: string;
  price_cents: number;
  stock_quantity: number;
  sku?: string | null;
  description?: string | null;
  cost_cents?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BarberId = "joao" | "maria" | "carlos";
export type Barber = {
  id: BarberId;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

export const BARBERS: Barber[] = [
  { id: "joao", name: "João", icon: "account" },
  { id: "maria", name: "Maria", icon: "account-outline" },
  { id: "carlos", name: "Carlos", icon: "account-tie" },
];

export const BARBER_MAP = Object.fromEntries(BARBERS.map((b) => [b.id, b])) as Record<string, Barber>;

export const openingHour = 9;
export const closingHour = 18;

export const pad = (n: number) => n.toString().padStart(2, "0");

export function formatPrice(cents: number) {
  if (Number.isNaN(cents)) return "—";
  const value = cents / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function toDateKey(d: Date, timeZone: string = DEFAULT_TIMEZONE) {
  return formatDateKey(d, timeZone);
}

export function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad(h)}:${pad(m)}`;
}

export function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function addMinutes(t: string, minutes: number) {
  return minutesToTime(timeToMinutes(t) + minutes);
}

export function overlap(aS: string, aE: string, bS: string, bE: string) {
  const as = timeToMinutes(aS);
  const ae = timeToMinutes(aE);
  const bs = timeToMinutes(bS);
  const be = timeToMinutes(bE);
  return Math.max(as, bs) < Math.min(ae, be);
}

export function humanDate(dk: string, locale?: string, timeZone: string = DEFAULT_TIMEZONE) {
  return formatDateLabel(
    dk,
    {
      weekday: "short",
      month: "short",
      day: "numeric",
    },
    locale,
    timeZone,
  );
}
