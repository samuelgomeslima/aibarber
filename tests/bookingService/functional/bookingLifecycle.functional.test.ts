/// <reference types="vitest" />

import { describe, expect, it } from "vitest";
import {
  createBooking,
  createCustomer,
  findCustomerByPhone,
  listRecentBookings,
} from "../../../src/lib/bookings";
import { supabaseMock } from "../testUtils/supabaseMock";

describe("booking service functional flow", () => {
  it("supports creating a customer, finding them, and retrieving their booking", async () => {
    const customerRecord = {
      id: "cust-1",
      first_name: "Zoe",
      last_name: "Ray",
      phone: "12345678",
      email: null,
      date_of_birth: null,
    };
    const bookingRecord = {
      id: "book-1",
      date: "2024-05-01",
      start: "09:00",
      end: "09:30",
      service_id: "cut",
      barber: "Mina",
      customer_id: customerRecord.id,
      note: null,
    };

    const customersTable = supabaseMock.useTable("customers");
    customersTable.insert.mockImplementation((payload) => {
      expect(payload).toEqual({
        first_name: "Zoe",
        last_name: "Ray",
        phone: "12345678",
      });
      customersTable.returns({ data: customerRecord, error: null, status: 201 });
      return customersTable;
    });
    customersTable.single.mockResolvedValue({ data: customerRecord, error: null, status: 201 });
    customersTable.maybeSingle.mockResolvedValue({ data: customerRecord, error: null, status: 200 });
    customersTable.select.mockImplementation(() => customersTable);
    customersTable.eq.mockImplementation(() => customersTable);
    customersTable.in.mockImplementation(() => customersTable);
    customersTable.or.mockImplementation(() => customersTable);
    customersTable.order.mockImplementation(() => customersTable);
    customersTable.limit.mockImplementation(() => customersTable);

    const bookingsTable = supabaseMock.useTable("bookings");
    bookingsTable.insert.mockImplementation((payload) => {
      expect(payload).toEqual({
        date: bookingRecord.date,
        start: bookingRecord.start,
        end: bookingRecord.end,
        service_id: bookingRecord.service_id,
        barber: bookingRecord.barber,
        customer_id: bookingRecord.customer_id,
        note: null,
      });
      bookingsTable.returns({ data: { id: bookingRecord.id }, error: null, status: 201 });
      return bookingsTable;
    });
    bookingsTable.single.mockResolvedValue({ data: { id: bookingRecord.id }, error: null, status: 201 });
    bookingsTable.select.mockImplementation(() => bookingsTable);
    bookingsTable.order.mockImplementation(() => bookingsTable);
    bookingsTable.limit.mockImplementation(() => bookingsTable);
    bookingsTable.eq.mockImplementation(() => bookingsTable);
    bookingsTable.in.mockImplementation(() => bookingsTable);

    const createdCustomer = await createCustomer({
      first_name: " Zoe",
      last_name: " Ray ",
      phone: " (123) 456-78 ",
    });
    expect(createdCustomer).toEqual(customerRecord);

    customersTable.returns({ data: customerRecord, error: null, status: 200 });
    const foundCustomer = await findCustomerByPhone("123-456-78");
    expect(foundCustomer).toEqual(customerRecord);
    expect(customersTable.eq).toHaveBeenLastCalledWith("phone", "12345678");

    const bookingId = await createBooking({
      date: bookingRecord.date,
      start: bookingRecord.start,
      end: bookingRecord.end,
      service_id: bookingRecord.service_id,
      barber: bookingRecord.barber,
      customer_id: bookingRecord.customer_id,
    });
    expect(bookingId).toBe(bookingRecord.id);

    bookingsTable.returns({ data: [bookingRecord], error: null, status: 200 });
    customersTable.returns({ data: [customerRecord], error: null, status: 200 });

    const bookings = await listRecentBookings(5);

    expect(bookingsTable.order).toHaveBeenCalledWith("date", { ascending: false });
    expect(bookingsTable.order).toHaveBeenCalledWith("start", { ascending: false });
    expect(bookingsTable.limit).toHaveBeenCalledWith(5);
    expect(customersTable.in).toHaveBeenCalledWith("id", [customerRecord.id]);
    expect(bookings).toEqual([
      {
        ...bookingRecord,
        _customer: customerRecord,
      },
    ]);
  });
});
