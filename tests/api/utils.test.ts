import { describe, expect, it } from "vitest";

const { getProvidedToken } = require("../../api/_shared/utils");

describe("getProvidedToken", () => {
  it("returns token for lowercase headers", () => {
    const req = { headers: { "x-api-key": "lowercase-token" } };
    expect(getProvidedToken(req)).toBe("lowercase-token");
  });

  it("returns token for uppercase headers", () => {
    const req = { headers: { "X-API-KEY": "uppercase-token" } };
    expect(getProvidedToken(req)).toBe("uppercase-token");
  });

  it("falls back to functions key regardless of case", () => {
    const req = { headers: { "X-FUNCTIONS-KEY": "functions-token" } };
    expect(getProvidedToken(req)).toBe("functions-token");
  });

  it("returns undefined when no token provided", () => {
    const req = { headers: { other: "value" } };
    expect(getProvidedToken(req)).toBeUndefined();
  });
});
