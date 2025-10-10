/// <reference types="vitest" />

import { describe, expect, it } from "vitest";
import { createServicesRepository } from "../../../src/lib/services";
import { supabaseMock } from "../testUtils/supabaseMock";

describe("services repository", () => {
  it("throws a helpful message when a foreign key violation occurs", async () => {
    supabaseMock.useTable("services", {
      data: null,
      status: 409,
      error: {
        code: "23503",
        message: "update or delete on table \"services\" violates foreign key constraint",
      },
    });

    const repository = createServicesRepository(supabaseMock.client);

    await expect(repository.deleteService("svc-1")).rejects.toThrow(
      "This service is currently being used and cannot be deleted.",
    );
  });

  it("detects foreign key violations reported without the postgres error code", async () => {
    supabaseMock.useTable("services", {
      data: null,
      status: 409,
      error: {
        code: "PGRST116",
        message: "Key (id)=(svc-1) is still referenced from table \"bookings\".",
      },
    });

    const repository = createServicesRepository(supabaseMock.client);

    await expect(repository.deleteService("svc-1")).rejects.toThrow(
      "This service is currently being used and cannot be deleted.",
    );
  });

  it("throws the original error when deletion fails for another reason", async () => {
    const original = new Error("boom");
    supabaseMock.useTable("services", { data: null, status: 500, error: original });

    const repository = createServicesRepository(supabaseMock.client);

    await expect(repository.deleteService("svc-1")).rejects.toThrow(original);
  });
});
