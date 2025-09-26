import { MaterialCommunityIcons } from "@expo/vector-icons";

export type ServiceId = "cut" | "cutshave";
export type Service = {
  id: ServiceId;
  name: string;
  minutes: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

export type BarberId = "joao" | "maria" | "carlos";
export type Barber = {
  id: BarberId;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

export const SERVICES: Service[] = [
  { id: "cut", name: "Cut", minutes: 30, icon: "content-cut" },
  { id: "cutshave", name: "Cut & Shave", minutes: 60, icon: "razor-double-edge" },
];

export const BARBERS: Barber[] = [
  { id: "joao", name: "João", icon: "account" },
  { id: "maria", name: "Maria", icon: "account-outline" },
  { id: "carlos", name: "Carlos", icon: "account-tie" },
];

export const BARBER_MAP = Object.fromEntries(BARBERS.map((b) => [b.id, b])) as Record<string, Barber>;

export const openingHour = 9;
export const closingHour = 18;

export const pad = (n: number) => n.toString().padStart(2, "0");

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

export function humanDate(dk: string) {
  const d = new Date(`${dk}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
