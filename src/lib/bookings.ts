import { supabase } from "./supabase";
export type DbBooking = {
  id: string;
  date: string;
  start: string;
  end: string;
  service: string;
  barber: string;
  customer_id?: string | null;
};

export type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
};

export type BookingWithCustomer = DbBooking & { _customer?: Customer };

export async function getBookings(dateKey: string): Promise<BookingWithCustomer[]> {
  const { data, error, status } = await supabase
    .from("bookings")
    .select('id,date,start,"end",service,barber,customer_id')
    .eq("date", dateKey)
    .order("start");

  console.log("[getBookings]", { dateKey, status, data, error });
  if (error) throw error;

  const rows = (data ?? []) as DbBooking[];
  const ids = Array.from(new Set(rows.map((r) => r.customer_id).filter(Boolean))) as string[];
  let customerMap = new Map<string, Customer>();

  if (ids.length) {
    const { data: people, error: e2 } = await supabase
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .in("id", ids);
    if (e2) throw e2;
    customerMap = new Map((people ?? []).map((c) => [c.id, c as Customer]));
  }

  return rows.map((r) => ({ ...r, _customer: r.customer_id ? customerMap.get(r.customer_id) : undefined }));
}

export async function getBookingsForRange(
  startDate: string,
  endDate: string,
): Promise<BookingWithCustomer[]> {
  if (!startDate || !endDate) return [];

  const { data, error, status } = await supabase
    .from("bookings")
    .select('id,date,start,"end",service,barber,customer_id')
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date")
    .order("start");

  console.log("[getBookingsForRange]", { startDate, endDate, status, error });
  if (error) throw error;

  const rows = (data ?? []) as DbBooking[];
  const ids = Array.from(new Set(rows.map((r) => r.customer_id).filter(Boolean))) as string[];
  let customerMap = new Map<string, Customer>();

  if (ids.length) {
    const { data: people, error: e2 } = await supabase
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .in("id", ids);
    if (e2) throw e2;
    customerMap = new Map((people ?? []).map((c) => [c.id, c as Customer]));
  }

  return rows.map((r) => ({ ...r, _customer: r.customer_id ? customerMap.get(r.customer_id) : undefined }));
}

export async function createBooking(payload: {
  date: string;
  start: string;
  end: string;
  service: string;
  barber: string;
  customer_id?: string | null;
}) {
  const { data, error, status } = await supabase.from("bookings").insert(payload).select("id").single();
  console.log("[createBooking]", { payload, status, error });
  if (error) throw error;
  return data?.id ?? null;
}

export async function cancelBooking(id: string) {
  const { data, error, status } = await supabase.from("bookings").delete().eq("id", id);
  console.log("[cancelBooking]", { id, status, data, error });
  if (error) throw error;
}

export async function listCustomers(query: string) {
  const q = (query || "").trim();
  let req = supabase
    .from("customers")
    .select("id,first_name,last_name,phone,email,date_of_birth")
    .order("first_name")
    .limit(20);

  if (q) {
    req = supabase
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(20);
  }

  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export async function getCustomerById(id: string) {
  if (!id?.trim()) return null;
  const { data, error, status } = await supabase
    .from("customers")
    .select("id,first_name,last_name,phone,email,date_of_birth")
    .eq("id", id.trim())
    .maybeSingle();
  console.log("[getCustomerById]", { id, status, error });
  if (error) throw error;
  return (data ?? null) as Customer | null;
}

export async function findCustomerByPhone(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const { data, error, status } = await supabase
    .from("customers")
    .select("id,first_name,last_name,phone,email,date_of_birth")
    .eq("phone", digits)
    .maybeSingle();
  console.log("[findCustomerByPhone]", { phone: digits, status, error });
  if (error) throw error;
  return (data ?? null) as Customer | null;
}

export async function createCustomer(payload: {
  first_name: string;
  last_name: string;
  phone: string;
}) {
  const first_name = payload.first_name?.trim();
  const last_name = payload.last_name?.trim();
  const phoneDigits = (payload.phone || "").replace(/\D/g, "");

  if (!first_name || !last_name || phoneDigits.length < 8) {
    throw new Error("Invalid customer payload");
  }

  const { data, error, status } = await supabase
    .from("customers")
    .insert({
      first_name,
      last_name,
      phone: phoneDigits,
    })
    .select("id,first_name,last_name,phone,email,date_of_birth")
    .single();
  console.log("[createCustomer]", { status, error });
  if (error) throw error;
  return data as Customer;
}
