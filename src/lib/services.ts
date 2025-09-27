import { supabase } from "./supabase";
import type { Service } from "./domain";

export type DbService = {
  id: string;
  name: string;
  estimated_minutes: number;
  price_cents: number;
  icon: string;
  created_at: string | null;
};

export async function listServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("id,name,estimated_minutes,price_cents,icon,created_at")
    .order("name");
  if (error) throw error;
  const rows = (data ?? []) as DbService[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    estimated_minutes: row.estimated_minutes,
    price_cents: row.price_cents,
    icon: (row.icon || "content-cut") as Service["icon"],
    created_at: row.created_at ?? null,
  }));
}

export async function createService(payload: {
  name: string;
  estimated_minutes: number;
  price_cents: number;
  icon: Service["icon"];
}): Promise<Service> {
  const cleanName = payload.name?.trim();
  const minutes = Number(payload.estimated_minutes);
  const price = Number(payload.price_cents);

  if (!cleanName) throw new Error("Name is required");
  if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("Estimated minutes must be greater than 0");
  if (!Number.isFinite(price) || price < 0) throw new Error("Price must be 0 or more");

  const { data, error } = await supabase
    .from("services")
    .insert({
      name: cleanName,
      estimated_minutes: Math.round(minutes),
      price_cents: Math.round(price),
      icon: payload.icon,
    })
    .select("id,name,estimated_minutes,price_cents,icon,created_at")
    .single();

  if (error) throw error;

  return {
    id: data!.id,
    name: data!.name,
    estimated_minutes: data!.estimated_minutes,
    price_cents: data!.price_cents,
    icon: (data!.icon || "content-cut") as Service["icon"],
    created_at: data!.created_at ?? null,
  };
}
