import { logger } from "./logger";
import { getBookingGateway, PersistenceError } from "./gateways/bookingGateway";
import type { Customer, DbBooking } from "./types/booking";

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
  if (ids.length === 0) {
    return rows.map((r) => ({ ...r, _customer: undefined }));
  }

  const gateway = getBookingGateway();
  const { data } = await gateway.fetchCustomersByIds(ids);
  const customerMap = new Map((data ?? []).map((c) => [c.id, c]));
  return rows.map((r) => ({ ...r, _customer: r.customer_id ? customerMap.get(r.customer_id) : undefined }));
}

export async function getBookings(dateKey: string): Promise<BookingWithCustomer[]> {
  const gateway = getBookingGateway();
  try {
    const { data, status } = await gateway.fetchBookingsByDate(dateKey);
    logger.debug("bookings.getBookings succeeded", {
      dateKey,
      status,
      count: Array.isArray(data) ? data.length : 0,
    });
    const rows = normalizeTimeFields(data ?? []);
    return attachCustomers(rows);
  } catch (error) {
    const status = error instanceof PersistenceError ? error.status : undefined;
    logger.error("bookings.getBookings failed", { dateKey, status, error });
    throw error;
  }
}

export async function getBookingsForRange(
  startDate: string,
  endDate: string,
): Promise<BookingWithCustomer[]> {
  if (!startDate || !endDate) return [];
  const gateway = getBookingGateway();
  try {
    const { data, status } = await gateway.fetchBookingsForRange(startDate, endDate);
    logger.debug("bookings.getBookingsForRange succeeded", {
      startDate,
      endDate,
      status,
      count: Array.isArray(data) ? data.length : 0,
    });
    const rows = normalizeTimeFields(data ?? []);
    return attachCustomers(rows);
  } catch (error) {
    const status = error instanceof PersistenceError ? error.status : undefined;
    logger.error("bookings.getBookingsForRange failed", {
      startDate,
      endDate,
      status,
      error,
    });
    throw error;
  }
}

export async function listRecentBookings(limit = 500): Promise<BookingWithCustomer[]> {
  const gateway = getBookingGateway();
  try {
    const { data, status } = await gateway.fetchRecentBookings(limit);
    logger.debug("bookings.listRecentBookings succeeded", {
      status,
      limit,
      count: Array.isArray(data) ? data.length : 0,
    });
    const rows = normalizeTimeFields(data ?? []);
    return attachCustomers(rows);
  } catch (error) {
    const status = error instanceof PersistenceError ? error.status : undefined;
    logger.error("bookings.listRecentBookings failed", { status, error, limit });
    throw error;
  }
}

export type BookingInsertPayload = {
  date: string;
  start: string;
  end: string;
  service_id: string;
  barber: string;
  customer_id?: string | null;
};

export async function createBooking(payload: BookingInsertPayload) {
  const gateway = getBookingGateway();
  try {
    const { data, status } = await gateway.insertBooking(payload);
    const bookingId = data?.id ?? null;
    logger.info("bookings.createBooking succeeded", { bookingId, status });
    return bookingId;
  } catch (error) {
    const status = error instanceof PersistenceError ? error.status : undefined;
    logger.error("bookings.createBooking failed", { status, error });
    throw error;
  }
}

export async function createBookingsBulk(payloads: BookingInsertPayload[]): Promise<void> {
  if (payloads.length === 0) return;
  const gateway = getBookingGateway();
  try {
    const { status } = await gateway.insertManyBookings(payloads);
    logger.info("bookings.createBookingsBulk succeeded", {
      status,
      count: payloads.length,
    });
  } catch (error) {
    const status = error instanceof PersistenceError ? error.status : undefined;
    logger.error("bookings.createBookingsBulk failed", { status, error, count: payloads.length });
    throw error;
  }
}

export async function cancelBooking(id: string) {
  const gateway = getBookingGateway();
  try {
    const { data, status } = await gateway.deleteBooking(id);
    logger.info("bookings.cancelBooking succeeded", { id, status, deleted: data.deleted });
  } catch (error) {
    const status = error instanceof PersistenceError ? error.status : undefined;
    logger.error("bookings.cancelBooking failed", { id, status, error });
    throw error;
  }
}

export async function listCustomers(query: string) {
  const gateway = getBookingGateway();
  const q = (query || "").trim();
  const { data } = await gateway.searchCustomers({ query: q || null, limit: 20 });
  return (data ?? []) as Customer[];
}

export async function getCustomerById(id: string) {
  if (!id?.trim()) return null;
  const gateway = getBookingGateway();
  try {
    const { data, status } = await gateway.findCustomerById(id.trim());
    logger.debug("customers.getCustomerById succeeded", { id: id.trim(), status, found: Boolean(data) });
    return (data ?? null) as Customer | null;
  } catch (error) {
    const status = error instanceof PersistenceError ? error.status : undefined;
    logger.error("customers.getCustomerById failed", { id: id.trim(), status, error });
    throw error;
  }
}

export async function findCustomerByPhone(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const gateway = getBookingGateway();
  try {
    const { data, status } = await gateway.findCustomerByPhone(digits);
    logger.debug("customers.findCustomerByPhone succeeded", {
      phone: digits,
      status,
      found: Boolean(data),
    });
    return (data ?? null) as Customer | null;
  } catch (error) {
    const status = error instanceof PersistenceError ? error.status : undefined;
    logger.error("customers.findCustomerByPhone failed", { phone: digits, status, error });
    throw error;
  }
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

  const gateway = getBookingGateway();
  try {
    const { data, status } = await gateway.insertCustomer({
      first_name,
      last_name,
      phone: phoneDigits,
    });
    logger.info("customers.createCustomer succeeded", { customerId: data?.id, status });
    return data as Customer;
  } catch (error) {
    const status = error instanceof PersistenceError ? error.status : undefined;
    logger.error("customers.createCustomer failed", { status, error });
    throw error;
  }
}

export async function getBookingsForDates(dates: readonly string[]): Promise<DbBooking[]> {
  if (!dates.length) return [];
  const gateway = getBookingGateway();
  const { data } = await gateway.fetchBookingsForDates(dates);
  return normalizeTimeFields(data ?? []);
}
