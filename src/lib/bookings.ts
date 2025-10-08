import { logger } from "./logger";
import { supabase } from "./supabase";

export type DbBooking = {
  id: string;
  date: string;
  start: string;
  end: string;
  service_id: string;
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

const stripSeconds = (time: string | null | undefined) =>
  typeof time === "string" && time.length >= 5 ? time.slice(0, 5) : time ?? "";

const normalizeTimeFields = (rows: DbBooking[]): DbBooking[] =>
  rows.map((row) => ({
    ...row,
    start: stripSeconds(row.start),
    end: stripSeconds(row.end),
  }));

export type BookingWithCustomer = DbBooking & { _customer?: Customer };

async function attachCustomers(rows: DbBooking[]): Promise<BookingWithCustomer[]> {
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

export async function getBookings(dateKey: string): Promise<BookingWithCustomer[]> {
  const { data, error, status } = await supabase
    .from("bookings")
    .select('id,date,start,"end",service_id,barber,customer_id')
    .eq("date", dateKey)
    .order("start");

  if (error) {
    logger.error("bookings.getBookings failed", { dateKey, status, error });
    throw error;
  }

  logger.debug("bookings.getBookings succeeded", {
    dateKey,
    status,
    count: Array.isArray(data) ? data.length : 0,
  });

  const rows = normalizeTimeFields((data ?? []) as DbBooking[]);
  return attachCustomers(rows);
}

export async function getBookingsForRange(
  startDate: string,
  endDate: string,
): Promise<BookingWithCustomer[]> {
  if (!startDate || !endDate) return [];

  const { data, error, status } = await supabase
    .from("bookings")
    .select('id,date,start,"end",service_id,barber,customer_id')
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date")
    .order("start");

  if (error) {
    logger.error("bookings.getBookingsForRange failed", {
      startDate,
      endDate,
      status,
      error,
    });
    throw error;
  }

  logger.debug("bookings.getBookingsForRange succeeded", {
    startDate,
    endDate,
    status,
    count: Array.isArray(data) ? data.length : 0,
  });

  const rows = normalizeTimeFields((data ?? []) as DbBooking[]);
  return attachCustomers(rows);
}

export async function listRecentBookings(limit = 200): Promise<BookingWithCustomer[]> {
  const { data, error, status } = await supabase
    .from("bookings")
    .select('id,date,start,"end",service_id,barber,customer_id')
    .order("date", { ascending: false })
    .order("start", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("bookings.listRecentBookings failed", { status, error, limit });
    throw error;
  }

  logger.debug("bookings.listRecentBookings succeeded", {
    status,
    limit,
    count: Array.isArray(data) ? data.length : 0,
  });

  const rows = normalizeTimeFields((data ?? []) as DbBooking[]);
  return attachCustomers(rows);
}

export async function createBooking(payload: {
  date: string;
  start: string;
  end: string;
  service_id: string;
  barber: string;
  customer_id?: string | null;
}) {
  const { data, error, status } = await supabase.from("bookings").insert(payload).select("id").single();
  if (error) {
    logger.error("bookings.createBooking failed", { status, error });
    throw error;
  }

  const bookingId = data?.id ?? null;
  logger.info("bookings.createBooking succeeded", { bookingId, status });
  return bookingId;
}

export async function cancelBooking(id: string) {
  const { data, error, status } = await supabase.from("bookings").delete().eq("id", id);
  if (error) {
    logger.error("bookings.cancelBooking failed", { id, status, error });
    throw error;
  }

  logger.info("bookings.cancelBooking succeeded", { id, status, deleted: Array.isArray(data) ? data.length : 0 });
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
  if (error) {
    logger.error("customers.getCustomerById failed", { id, status, error });
    throw error;
  }

  logger.debug("customers.getCustomerById succeeded", { id, status, found: Boolean(data) });
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
  if (error) {
    logger.error("customers.findCustomerByPhone failed", { phone: digits, status, error });
    throw error;
  }

  logger.debug("customers.findCustomerByPhone succeeded", {
    phone: digits,
    status,
    found: Boolean(data),
  });
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
  if (error) {
    logger.error("customers.createCustomer failed", { status, error });
    throw error;
  }

  logger.info("customers.createCustomer succeeded", { customerId: data?.id, status });
  return data as Customer;
}
