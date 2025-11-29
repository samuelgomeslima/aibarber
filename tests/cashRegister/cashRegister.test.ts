import { describe, expect, it } from "vitest";
import { calculateEntryAmount } from "../../src/lib/cashRegister";

describe("calculateEntryAmount", () => {
  it("multiplies the unit amount by quantity when provided", () => {
    expect(calculateEntryAmount(1250, 3, 1250)).toBe(3750);
  });

  it("falls back to the default price and still multiplies by quantity", () => {
    expect(calculateEntryAmount(null, 4, 800)).toBe(3200);
  });
});
