import type { Tables, TablesInsert } from "../types/database";
import { getSupabaseClient } from "./supabase";

export type ServiceFormData = Pick<
  Tables<"services">,
  "name" | "description" | "price" | "duration"
>;

export async function listServices() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, price, duration")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch services", error);
    throw error;
  }

  return data ?? [];
}

export async function createService(payload: ServiceFormData) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      name: payload.name,
      description: payload.description,
      price: payload.price,
      duration: payload.duration,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create service", error);
    throw error;
  }

  return data;
}

export async function updateService(id: number, payload: Partial<TablesInsert<"services">>) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("services")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update service", error);
    throw error;
  }

  return data;
}

export async function deleteService(id: number) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("services").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete service", error);
    throw error;
  }
}
