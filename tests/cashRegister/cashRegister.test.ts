import { describe, expect, it } from "vitest";
import { calculateEntryAmount, recordServiceSale } from "../../src/lib/cashRegister";

describe("calculateEntryAmount", () => {
  it("multiplies the unit amount by quantity when provided", () => {
    expect(calculateEntryAmount(1250, 3, 1250)).toBe(3750);
  });

  it("falls back to the default price and still multiplies by quantity", () => {
    expect(calculateEntryAmount(null, 4, 800)).toBe(3200);
  });

  it("returns 0 when the fallback value cannot be converted to a number", () => {
    expect(calculateEntryAmount(null, 2, Number("abc"))).toBe(0);
    expect(calculateEntryAmount(null, 2, Number.NaN)).toBe(0);
  });

  it("rounds the total when the fallback value contains decimals", () => {
    expect(calculateEntryAmount(null, 3, 100.4)).toBe(301);
    expect(calculateEntryAmount(null, 3, 100.5)).toBe(302);
  });
});

describe("validation of quantities", () => {
  it("throws when quantity is zero", async () => {
    await expect(
      recordServiceSale({
        serviceId: "svc_1",
        serviceName: "Test service",
        unitPriceCents: 1500,
        quantity: 0,
      }),
    ).rejects.toThrow("Quantity must be greater than zero");
  });

  it("throws when quantity is negative", async () => {
    await expect(
      recordServiceSale({
        serviceId: "svc_2",
        serviceName: "Test service",
        unitPriceCents: 1500,
        quantity: -2,
      }),
    ).rejects.toThrow("Quantity must be greater than zero");
  });
});
