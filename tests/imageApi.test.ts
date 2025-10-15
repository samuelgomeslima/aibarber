import { describe, expect, it } from "vitest";

import { __internal } from "../src/lib/imageApi";

const { extractErrorMessage } = __internal;

describe("extractErrorMessage", () => {
  it("returns top-level error string", () => {
    expect(extractErrorMessage({ error: "simple error" })).toBe("simple error");
  });

  it("returns nested error message", () => {
    expect(extractErrorMessage({ error: { message: "nested message" } })).toBe("nested message");
  });

  it("returns nested error fallback", () => {
    expect(extractErrorMessage({ error: { error: "inner" } })).toBe("inner");
  });

  it("returns details when present", () => {
    expect(extractErrorMessage({ details: "details here" })).toBe("details here");
  });

  it("returns message when present", () => {
    expect(extractErrorMessage({ message: "hello" })).toBe("hello");
  });

  it("returns null when no message", () => {
    expect(extractErrorMessage({})).toBeNull();
  });
});
