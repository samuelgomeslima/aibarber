import { beforeEach, vi } from "vitest";
import { supabaseMock } from "./testUtils/supabaseMock";
import { resetBookingGateway } from "../../src/lib/gateways/bookingGateway";

vi.mock("../../src/lib/supabase", () => ({
  supabase: supabaseMock.client,
}));

beforeEach(() => {
  supabaseMock.reset();
  resetBookingGateway();
});
