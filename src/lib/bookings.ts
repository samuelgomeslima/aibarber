import type { PostgrestError } from "@supabase/supabase-js";
import type { Tables, TablesUpdate } from "../types/database";
import { getSupabaseClient } from "./supabase";

export type BookingForm = Pick<
  Tables<"bookings">,
  | "customer_id"
  | "service_id"
  | "scheduled_for"
  | "status"
  | "notes"
> & { stylist_id?: number | null };

export type BookingListItem = Tables<"bookings"> & {
  customer: Pick<Tables<"customers">, "first_name" | "last_name" | "phone">;
  service: Pick<Tables<"services">, "name" | "duration">;
  stylist?: Tables<"stylists"> | null;
};

async function handleRequest<T>(
  request: Promise<{ data: T | null; error: PostgrestError | null; status: number }>,
) {
  const { data, error, status } = await request;

  if (error) {
    console.error("Supabase request failed", error);
    throw Object.assign(new Error(error.message), { status });
  }

  return data;
}

export async function listBookings() {
  const supabase = await getSupabaseClient();
  const request = supabase
    .from("bookings")
    .select(
      `id, created_at, scheduled_for, status, notes,
      customer:customers(id, first_name, last_name, phone),
      service:services(id, name, duration),
      stylist:stylists(id, first_name, last_name)`
    )
    .order("scheduled_for", { ascending: true });

  const data = await handleRequest<BookingListItem[]>(request);
  return data ?? [];
}

export async function getBooking(id: number) {
  const supabase = await getSupabaseClient();
  const request = supabase
    .from("bookings")
    .select(
      `*,
      customer:customers(*),
      service:services(*),
      stylist:stylists(*)`
    )
    .eq("id", id)
    .single();

  return handleRequest<BookingListItem | null>(request);
}

export async function createBooking(payload: BookingForm) {
  const supabase = await getSupabaseClient();
  const request = supabase
    .from("bookings")
    .insert({
      customer_id: payload.customer_id,
      service_id: payload.service_id,
      scheduled_for: payload.scheduled_for,
      status: payload.status,
      notes: payload.notes,
      stylist_id: payload.stylist_id ?? null,
    })
    .select("id")
    .single();

  return handleRequest<{ id: number } | null>(request);
}

export async function updateBooking(id: number, payload: TablesUpdate<"bookings">) {
  const supabase = await getSupabaseClient();
  const request = supabase
    .from("bookings")
    .update(payload)
    .eq("id", id)
    .select("id")
    .single();

  return handleRequest<{ id: number } | null>(request);
}

export async function deleteBooking(id: number) {
  const supabase = await getSupabaseClient();
  const request = supabase.from("bookings").delete().eq("id", id);
  await handleRequest(request);
}

export async function searchBookings(params: {
  customerId?: number;
  stylistId?: number | null;
  status?: Tables<"bookings">["status"];
  scheduledFrom?: string;
  scheduledTo?: string;
}) {
  const supabase = await getSupabaseClient();
  let query = supabase
    .from("bookings")
    .select(
      `id, scheduled_for, status, notes,
      customer:customers(id, first_name, last_name, phone),
      service:services(id, name, duration),
      stylist:stylists(id, first_name, last_name)`
    );

  if (params.customerId) {
    query = query.eq("customer_id", params.customerId);
  }

  if (typeof params.stylistId === "number") {
    query = query.eq("stylist_id", params.stylistId);
  }

  if (params.status) {
    query = query.eq("status", params.status);
  }

  if (params.scheduledFrom) {
    query = query.gte("scheduled_for", params.scheduledFrom);
  }

  if (params.scheduledTo) {
    query = query.lte("scheduled_for", params.scheduledTo);
  }

  query = query.order("scheduled_for", { ascending: true });

  const data = await handleRequest<BookingListItem[]>(query);
  return data ?? [];
}

export async function listStylists() {
  const supabase = await getSupabaseClient();
  const request = supabase
    .from("stylists")
    .select("id, first_name, last_name")
    .order("first_name", { ascending: true });

  const data = await handleRequest<Tables<"stylists">[]>(request);
  return data ?? [];
}

export async function listCustomers() {
  const supabase = await getSupabaseClient();
  const request = supabase
    .from("customers")
    .select("id, first_name, last_name, phone")
    .order("first_name", { ascending: true });

  const data = await handleRequest<Tables<"customers">[]>(request);
  return data ?? [];
}
