import { beforeEach, vi } from "vitest";
import { supabaseMock } from "./testUtils/supabaseMock";

vi.mock("../../src/lib/supabase", () => ({
  supabase: supabaseMock.client,
}));

beforeEach(() => {
  supabaseMock.reset();
});
