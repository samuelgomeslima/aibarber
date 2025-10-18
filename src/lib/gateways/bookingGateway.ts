import { supabase, type SupabaseClientLike } from "../supabase";
import type { Customer, DbBooking } from "../types/booking";
import { requireCurrentBarbershopId } from "../activeBarbershop";

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
    note?: string | null;
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
    note?: string | null;
  }[]): Promise<GatewayResult<null>>;
  markBookingPerformed(
    id: string,
    performedAt: string,
  ): Promise<GatewayResult<{ id: string; performed_at: string | null }>>;
}

class SupabaseBookingGateway implements BookingGateway {
  constructor(private readonly client: SupabaseClientLike) {}

  private wrapError(error: any, fallbackMessage: string, status?: number): never {
    const message = typeof error?.message === "string" && error.message.trim().length > 0 ? error.message : fallbackMessage;
    throw new PersistenceError(message, status, { cause: error });
  }

  async fetchBookingsByDate(date: string): Promise<GatewayResult<DbBooking[]>> {
    const barbershopId = await requireCurrentBarbershopId();
    const { data, error, status } = await this.client
      .from("bookings")
      .select('id,date,start,"end",service_id,barber,customer_id,note,performed_at')
      .eq("date", date)
      .eq("barbershop_id", barbershopId)
      .order("start");
    if (error) this.wrapError(error, "Failed to fetch bookings by date", status);
    return { data: (data ?? []) as DbBooking[], status: status ?? 200 };
  }

  async fetchBookingsForRange(startDate: string, endDate: string): Promise<GatewayResult<DbBooking[]>> {
    const barbershopId = await requireCurrentBarbershopId();
    const { data, error, status } = await this.client
      .from("bookings")
      .select('id,date,start,"end",service_id,barber,customer_id,note,performed_at')
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("barbershop_id", barbershopId)
      .order("date")
      .order("start");
    if (error) this.wrapError(error, "Failed to fetch bookings for range", status);
    return { data: (data ?? []) as DbBooking[], status: status ?? 200 };
  }

  async fetchRecentBookings(limit: number): Promise<GatewayResult<DbBooking[]>> {
    const barbershopId = await requireCurrentBarbershopId();
    const { data, error, status } = await this.client
      .from("bookings")
      .select('id,date,start,"end",service_id,barber,customer_id,note,performed_at')
      .order("date", { ascending: false })
      .order("start", { ascending: false })
      .eq("barbershop_id", barbershopId)
      .limit(limit);
    if (error) this.wrapError(error, "Failed to fetch recent bookings", status);
    return { data: (data ?? []) as DbBooking[], status: status ?? 200 };
  }

  async insertBooking(payload: {
    date: string;
    start: string;
    end: string;
    service_id: string;
    barber: string;
    customer_id?: string | null;
    note?: string | null;
  }): Promise<GatewayResult<{ id: string | null }>> {
    const barbershopId = await requireCurrentBarbershopId();
    const { data, error, status } = await this.client
      .from("bookings")
      .insert({ ...payload, barbershop_id: barbershopId })
      .select("id")
      .single();
    if (error) this.wrapError(error, "Failed to create booking", status);
    return { data: { id: data?.id ?? null }, status: status ?? 201 };
  }

  async deleteBooking(id: string): Promise<GatewayResult<{ deleted: number }>> {
    const barbershopId = await requireCurrentBarbershopId();
    const { data, error, status } = await this.client
      .from("bookings")
      .delete()
      .eq("id", id)
      .eq("barbershop_id", barbershopId);
    if (error) this.wrapError(error, "Failed to delete booking", status);
    return { data: { deleted: Array.isArray(data) ? data.length : 0 }, status: status ?? 200 };
  }

  async fetchCustomersByIds(ids: readonly string[]): Promise<GatewayResult<Customer[]>> {
    const barbershopId = await requireCurrentBarbershopId();
    const { data, error, status } = await this.client
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .in("id", ids as string[])
      .eq("barbershop_id", barbershopId);
    if (error) this.wrapError(error, "Failed to fetch customers by ids", status);
    return { data: (data ?? []) as Customer[], status: status ?? 200 };
  }

  async searchCustomers(opts: { query?: string | null; limit?: number }): Promise<GatewayResult<Customer[]>> {
    const limit = opts.limit ?? 20;
    const query = opts.query?.trim();
    const barbershopId = await requireCurrentBarbershopId();
    let request = this.client
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .eq("barbershop_id", barbershopId);

    if (query) {
      request = request.or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`,
      );
    } else {
      request = request.order("first_name");
    }

    request = request.limit(limit);

    const { data, error, status } = await request;
    if (error) this.wrapError(error, "Failed to search customers", status);
    return { data: (data ?? []) as Customer[], status: status ?? 200 };
  }

  async findCustomerById(id: string): Promise<GatewayResult<Customer | null>> {
    const barbershopId = await requireCurrentBarbershopId();
    const { data, error, status } = await this.client
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .eq("id", id)
      .eq("barbershop_id", barbershopId)
      .maybeSingle();
    if (error) this.wrapError(error, "Failed to fetch customer by id", status);
    return { data: (data ?? null) as Customer | null, status: status ?? 200 };
  }

  async findCustomerByPhone(phone: string): Promise<GatewayResult<Customer | null>> {
    const barbershopId = await requireCurrentBarbershopId();
    const { data, error, status } = await this.client
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .eq("phone", phone)
      .eq("barbershop_id", barbershopId)
      .maybeSingle();
    if (error) this.wrapError(error, "Failed to fetch customer by phone", status);
    return { data: (data ?? null) as Customer | null, status: status ?? 200 };
  }

  async insertCustomer(payload: {
    first_name: string;
    last_name: string;
    phone: string;
  }): Promise<GatewayResult<Customer>> {
    const barbershopId = await requireCurrentBarbershopId();
    const { data, error, status } = await this.client
      .from("customers")
      .insert({ ...payload, barbershop_id: barbershopId })
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .single();
    if (error) this.wrapError(error, "Failed to create customer", status);
    return { data: data as Customer, status: status ?? 201 };
  }

  async fetchBookingsForDates(dates: readonly string[]): Promise<GatewayResult<DbBooking[]>> {
    const barbershopId = await requireCurrentBarbershopId();
    const { data, error, status } = await this.client
      .from("bookings")
      .select('id,date,start,"end",service_id,barber,customer_id,note,performed_at')
      .in("date", dates as string[])
      .eq("barbershop_id", barbershopId);
    if (error) this.wrapError(error, "Failed to fetch bookings for dates", status);
    return { data: (data ?? []) as DbBooking[], status: status ?? 200 };
  }

  async insertManyBookings(
    payload: {
      date: string;
      start: string;
      end: string;
      service_id: string;
      barber: string;
      customer_id?: string | null;
      note?: string | null;
    }[],
  ): Promise<GatewayResult<null>> {
    const barbershopId = await requireCurrentBarbershopId();
    const { error, status } = await this.client
      .from("bookings")
      .insert(payload.map((item) => ({ ...item, barbershop_id: barbershopId })));
    if (error) this.wrapError(error, "Failed to create bookings", status);
    return { data: null, status: status ?? 201 };
  }

  async markBookingPerformed(
    id: string,
    performedAt: string,
  ): Promise<GatewayResult<{ id: string; performed_at: string | null }>> {
    const barbershopId = await requireCurrentBarbershopId();
    const { data, error, status } = await this.client
      .from("bookings")
      .update({ performed_at: performedAt })
      .eq("id", id)
      .eq("barbershop_id", barbershopId)
      .select("id,performed_at")
      .single();
    if (error) this.wrapError(error, "Failed to confirm booking", status);
    return { data: { id: data?.id ?? id, performed_at: data?.performed_at ?? performedAt }, status: status ?? 200 };
  }
}

let activeGateway: BookingGateway = createSupabaseBookingGateway();

export function getBookingGateway(): BookingGateway {
  return activeGateway;
}

export function setBookingGateway(gateway: BookingGateway): void {
  activeGateway = gateway;
}

export function resetBookingGateway(): void {
  activeGateway = createSupabaseBookingGateway();
}

export function createSupabaseBookingGateway(client: SupabaseClientLike = supabase): BookingGateway {
  return new SupabaseBookingGateway(client);
}

