/// <reference types="vitest" />

import { describe, expect, it } from "vitest";
import { getBookings } from "../../../src/lib/bookings";
import { supabaseMock } from "../testUtils/supabaseMock";

describe("booking service integration", () => {
  it("joins bookings with their customers", async () => {
    const bookingRows = [
      {
        id: "b-1",
        date: "2024-05-01",
        start: "09:00",
        end: "09:30",
        service_id: "cut",
        barber: "Maya",
        customer_id: "c-1",
      },
      {
        id: "b-2",
        date: "2024-05-01",
        start: "10:00",
        end: "10:45",
        service_id: "fade",
        barber: "Luca",
        customer_id: null,
      },
    ];
    const customerRows = [
      {
        id: "c-1",
        first_name: "Kira",
        last_name: "Torres",
        phone: "5552222",
        email: null,
        date_of_birth: null,
      },
    ];

    const bookingsTable = supabaseMock.useTable("bookings", {
      data: bookingRows,
      error: null,
      status: 200,
    });
    const customersTable = supabaseMock.useTable("customers", {
      data: customerRows,
      error: null,
      status: 200,
    });

    const result = await getBookings("2024-05-01");

    expect(supabaseMock.from).toHaveBeenCalledWith("bookings");
    expect(bookingsTable.eq).toHaveBeenCalledWith("date", "2024-05-01");
    expect(bookingsTable.order).toHaveBeenCalledWith("start");
    expect(customersTable.select).toHaveBeenCalledWith("id,first_name,last_name,phone,email,date_of_birth");
    expect(customersTable.in).toHaveBeenCalledWith("id", ["c-1"]);

    expect(result).toHaveLength(2);
    expect(result[0]._customer).toEqual(customerRows[0]);
    expect(result[1]._customer).toBeUndefined();
  });

  it("propagates errors from the bookings query", async () => {
    supabaseMock.useTable("bookings", {
      data: null,
      error: new Error("boom"),
      status: 500,
    });

    await expect(getBookings("2024-05-01")).rejects.toThrow("boom");
  });
});
