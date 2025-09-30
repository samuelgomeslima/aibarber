import { beforeEach, vi } from "vitest";
import { supabaseMock } from "./testUtils/supabaseMock";

const getSupabaseClient = vi.fn(async () => supabaseMock.client);

vi.mock("../../src/lib/supabase", () => ({
  getSupabaseClient,
}));

beforeEach(() => {
  supabaseMock.reset();
  getSupabaseClient.mockClear();
});
