/// <reference types="vitest" />

import { describe, expect, it, vi } from "vitest";
import {
  findCustomerByPhone,
  getCustomerById,
  listCustomers,
} from "../../../src/lib/bookings";
import { supabaseMock } from "../testUtils/supabaseMock";
import * as ActiveBarbershop from "../../../src/lib/activeBarbershop";

vi.spyOn(ActiveBarbershop, "requireCurrentBarbershopId").mockResolvedValue("shop-test");

describe("booking service customers", () => {
  it("lists customers in alphabetical order when no search query is provided", async () => {
    const customerRows = [
      { id: "c-1", first_name: "Ada", last_name: "Lovelace", phone: "1234", email: null, date_of_birth: null },
      { id: "c-2", first_name: "Grace", last_name: "Hopper", phone: "5678", email: null, date_of_birth: null },
    ];
    const customersTable = supabaseMock.useTable("customers", {
      data: customerRows,
      error: null,
      status: 200,
    });

    const result = await listCustomers("");

    expect(supabaseMock.from).toHaveBeenCalledWith("customers");
    expect(customersTable.select).toHaveBeenCalledWith("id,first_name,last_name,phone,email,date_of_birth");
    expect(customersTable.eq).toHaveBeenCalledWith("barbershop_id", "shop-test");
    expect(customersTable.order).toHaveBeenCalledWith("first_name");
    expect(customersTable.limit).toHaveBeenCalledWith(20);
    expect(result).toEqual(customerRows);
  });

  it("uses a flexible search when a query is provided", async () => {
    const match = {
      id: "c-3",
      first_name: "Anne",
      last_name: "Shirley",
      phone: "9999",
      email: "anne@example.com",
      date_of_birth: null,
    };
    const customersTable = supabaseMock.useTable("customers", {
      data: [match],
      error: null,
      status: 200,
    });

    const result = await listCustomers(" anN  ");

    expect(supabaseMock.from).toHaveBeenCalledWith("customers");
    expect(customersTable.or).toHaveBeenCalledWith(
      expect.stringContaining("%anN%"),
    );
    expect(customersTable.eq).toHaveBeenCalledWith("barbershop_id", "shop-test");
    expect(customersTable.limit).toHaveBeenCalledWith(20);
    expect(result).toEqual([match]);
  });

  it("finds a customer by normalized phone digits", async () => {
    const found = {
      id: "c-4",
      first_name: "Mara",
      last_name: "Jade",
      phone: "5551234",
      email: null,
      date_of_birth: null,
    };
    const customersTable = supabaseMock.useTable("customers", {
      data: found,
      error: null,
      status: 200,
    });

    const result = await findCustomerByPhone(" (555) 1234 ");

    expect(customersTable.select).toHaveBeenCalledWith("id,first_name,last_name,phone,email,date_of_birth");
    expect(customersTable.eq).toHaveBeenCalledWith("phone", "5551234");
    expect(customersTable.eq).toHaveBeenCalledWith("barbershop_id", "shop-test");
    expect(result).toEqual(found);
  });

  it("skips the database lookup when the customer id is blank", async () => {
    const result = await getCustomerById("   ");

    expect(result).toBeNull();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("retrieves a customer by id when provided", async () => {
    const entry = {
      id: "c-5",
      first_name: "Jon",
      last_name: "Snow",
      phone: "1111",
      email: null,
      date_of_birth: null,
    };
    const customersTable = supabaseMock.useTable("customers", {
      data: entry,
      error: null,
      status: 200,
    });

    const result = await getCustomerById("  c-5  ");

    expect(supabaseMock.from).toHaveBeenCalledWith("customers");
    expect(customersTable.eq).toHaveBeenCalledWith("id", "c-5");
    expect(customersTable.eq).toHaveBeenCalledWith("barbershop_id", "shop-test");
    expect(result).toEqual(entry);
  });
});
