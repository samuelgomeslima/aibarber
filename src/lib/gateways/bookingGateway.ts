import { supabase } from "../supabase";
import type { Customer, DbBooking } from "../types/booking";

export type GatewayResult<T> = {
  data: T;
  status: number;
};

export class PersistenceError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PersistenceError";
    this.status = status;
  }
}

export interface BookingGateway {
  fetchBookingsByDate(date: string): Promise<GatewayResult<DbBooking[]>>;
  fetchBookingsForRange(startDate: string, endDate: string): Promise<GatewayResult<DbBooking[]>>;
  fetchRecentBookings(limit: number): Promise<GatewayResult<DbBooking[]>>;
  insertBooking(payload: {
    date: string;
    start: string;
    end: string;
    service_id: string;
    barber: string;
    customer_id?: string | null;
  }): Promise<GatewayResult<{ id: string | null }>>;
  deleteBooking(id: string): Promise<GatewayResult<{ deleted: number }>>;
  fetchCustomersByIds(ids: readonly string[]): Promise<GatewayResult<Customer[]>>;
  searchCustomers(opts: { query?: string | null; limit?: number }): Promise<GatewayResult<Customer[]>>;
  findCustomerById(id: string): Promise<GatewayResult<Customer | null>>;
  findCustomerByPhone(phone: string): Promise<GatewayResult<Customer | null>>;
  insertCustomer(payload: {
    first_name: string;
    last_name: string;
    phone: string;
  }): Promise<GatewayResult<Customer>>;
  fetchBookingsForDates(dates: readonly string[]): Promise<GatewayResult<DbBooking[]>>;
  insertManyBookings(payload: {
    date: string;
    start: string;
    end: string;
    service_id: string;
    barber: string;
    customer_id?: string | null;
  }[]): Promise<GatewayResult<null>>;
}

class SupabaseBookingGateway implements BookingGateway {
  async fetchBookingsByDate(date: string): Promise<GatewayResult<DbBooking[]>> {
    const { data, error, status } = await supabase
      .from("bookings")
      .select('id,date,start,"end",service_id,barber,customer_id')
      .eq("date", date)
      .order("start");
    if (error) throw new PersistenceError("Failed to fetch bookings by date", status, { cause: error });
    return { data: (data ?? []) as DbBooking[], status };
  }

  async fetchBookingsForRange(startDate: string, endDate: string): Promise<GatewayResult<DbBooking[]>> {
    const { data, error, status } = await supabase
      .from("bookings")
      .select('id,date,start,"end",service_id,barber,customer_id')
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date")
      .order("start");
    if (error) throw new PersistenceError("Failed to fetch bookings for range", status, { cause: error });
    return { data: (data ?? []) as DbBooking[], status };
  }

  async fetchRecentBookings(limit: number): Promise<GatewayResult<DbBooking[]>> {
    const { data, error, status } = await supabase
      .from("bookings")
      .select('id,date,start,"end",service_id,barber,customer_id')
      .order("date", { ascending: false })
      .order("start", { ascending: false })
      .limit(limit);
    if (error) throw new PersistenceError("Failed to fetch recent bookings", status, { cause: error });
    return { data: (data ?? []) as DbBooking[], status };
  }

  async insertBooking(payload: {
    date: string;
    start: string;
    end: string;
    service_id: string;
    barber: string;
    customer_id?: string | null;
  }): Promise<GatewayResult<{ id: string | null }>> {
    const { data, error, status } = await supabase.from("bookings").insert(payload).select("id").single();
    if (error) throw new PersistenceError("Failed to create booking", status, { cause: error });
    return { data: { id: data?.id ?? null }, status };
  }

  async deleteBooking(id: string): Promise<GatewayResult<{ deleted: number }>> {
    const { data, error, status } = await supabase.from("bookings").delete().eq("id", id);
    if (error) throw new PersistenceError("Failed to delete booking", status, { cause: error });
    return { data: { deleted: Array.isArray(data) ? data.length : 0 }, status };
  }

  async fetchCustomersByIds(ids: readonly string[]): Promise<GatewayResult<Customer[]>> {
    const { data, error, status } = await supabase
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .in("id", ids as string[]);
    if (error) throw new PersistenceError("Failed to fetch customers by ids", status, { cause: error });
    return { data: (data ?? []) as Customer[], status };
  }

  async searchCustomers(opts: { query?: string | null; limit?: number }): Promise<GatewayResult<Customer[]>> {
    const limit = opts.limit ?? 20;
    const query = opts.query?.trim();
    let request = supabase
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth");

    if (query) {
      request = request.or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`,
      );
    } else {
      request = request.order("first_name");
    }

    request = request.limit(limit);

    const { data, error, status } = await request;
    if (error) throw new PersistenceError("Failed to search customers", status, { cause: error });
    return { data: (data ?? []) as Customer[], status };
  }

  async findCustomerById(id: string): Promise<GatewayResult<Customer | null>> {
    const { data, error, status } = await supabase
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new PersistenceError("Failed to fetch customer by id", status, { cause: error });
    return { data: (data ?? null) as Customer | null, status };
  }

  async findCustomerByPhone(phone: string): Promise<GatewayResult<Customer | null>> {
    const { data, error, status } = await supabase
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .eq("phone", phone)
      .maybeSingle();
    if (error) throw new PersistenceError("Failed to fetch customer by phone", status, { cause: error });
    return { data: (data ?? null) as Customer | null, status };
  }

  async insertCustomer(payload: {
    first_name: string;
    last_name: string;
    phone: string;
  }): Promise<GatewayResult<Customer>> {
    const { data, error, status } = await supabase
      .from("customers")
      .insert(payload)
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .single();
    if (error) throw new PersistenceError("Failed to create customer", status, { cause: error });
    return { data: data as Customer, status };
  }

  async fetchBookingsForDates(dates: readonly string[]): Promise<GatewayResult<DbBooking[]>> {
    const { data, error, status } = await supabase
      .from("bookings")
      .select('id,date,start,"end",service_id,barber,customer_id')
      .in("date", dates as string[]);
    if (error) throw new PersistenceError("Failed to fetch bookings for dates", status, { cause: error });
    return { data: (data ?? []) as DbBooking[], status };
  }

  async insertManyBookings(payload: {
    date: string;
    start: string;
    end: string;
    service_id: string;
    barber: string;
    customer_id?: string | null;
  }[]): Promise<GatewayResult<null>> {
    const { error, status } = await supabase.from("bookings").insert(payload);
    if (error) throw new PersistenceError("Failed to create bookings", status, { cause: error });
    return { data: null, status };
  }
}

let activeGateway: BookingGateway = new SupabaseBookingGateway();

export function getBookingGateway(): BookingGateway {
  return activeGateway;
}

export function setBookingGateway(gateway: BookingGateway): void {
  activeGateway = gateway;
}

export function resetBookingGateway(): void {
  activeGateway = new SupabaseBookingGateway();
}

export function createSupabaseBookingGateway(): BookingGateway {
  return new SupabaseBookingGateway();
}
