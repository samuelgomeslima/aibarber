import { beforeAll, beforeEach } from "vitest";
import { supabaseMock } from "./testUtils/supabaseMock";
import {
  createSupabaseBookingGateway,
  setBookingGateway,
} from "../../src/lib/gateways/bookingGateway";

beforeAll(() => {
  setBookingGateway(createSupabaseBookingGateway(supabaseMock.client));
});

beforeEach(() => {
  supabaseMock.reset();
  setBookingGateway(createSupabaseBookingGateway(supabaseMock.client));
});
