import type { PostgrestSingleResponse } from "@supabase/supabase-js";

import { hasSupabaseCredentials, supabase } from "./supabase";

export type CashMovementType = "service" | "product";

export type CashMovementMetadata = {
  booking_id?: string | null;
  service_id?: string | null;
  barber_id?: string | null;
  date?: string | null;
  start?: string | null;
  end?: string | null;
  customer_id?: string | null;
  product_id?: string | null;
  quantity?: number | null;
  unit_price_cents?: number | null;
};

export type CashMovement = {
  id: string;
  type: CashMovementType;
  amount_cents: number;
  occurred_at: string;
  description: string;
  metadata?: CashMovementMetadata;
};

type ServiceRevenueInput = {
  bookingId: string;
  serviceId: string;
  barberId: string;
  amount_cents: number;
  description: string;
  occurred_at?: string;
  metadata?: CashMovementMetadata;
};

type ProductSaleInput = {
  productId: string;
  quantity: number;
  amount_cents: number;
  description: string;
  occurred_at?: string;
  metadata?: CashMovementMetadata;
};

const useMemoryStore = !hasSupabaseCredentials;

let memoryMovements: CashMovement[] = [];

const generateId = () => `cash_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

const METADATA_KEYS: (keyof CashMovementMetadata)[] = [
  "booking_id",
  "service_id",
  "barber_id",
  "date",
  "start",
  "end",
  "customer_id",
  "product_id",
  "quantity",
  "unit_price_cents",
];

type SupabaseCashMovementRow = {
  id: string;
  movement_type: CashMovementType;
  amount_cents: number;
  occurred_at: string | null;
  description: string;
  booking_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

const SUPABASE_COLUMNS =
  "id,movement_type,amount_cents,occurred_at,description,booking_id,metadata,created_at";

function cloneMetadata(metadata?: CashMovementMetadata): CashMovementMetadata | undefined {
  if (!metadata) return undefined;
  const copy: Partial<CashMovementMetadata> = {};
  METADATA_KEYS.forEach((key) => {
    if (metadata[key] !== undefined) {
      (copy as Record<string, unknown>)[key] = metadata[key] ?? null;
    }
  });
  return Object.keys(copy).length ? (copy as CashMovementMetadata) : undefined;
}

function serializeMetadata(metadata?: CashMovementMetadata): CashMovementMetadata | null {
  const cloned = cloneMetadata(metadata);
  return cloned ?? null;
}

function normalizeMetadata(metadata: unknown): CashMovementMetadata | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }
  const source = metadata as Record<string, unknown>;
  const normalized: Partial<CashMovementMetadata> = {};
  METADATA_KEYS.forEach((key) => {
    if (source[key] !== undefined) {
      (normalized as Record<string, unknown>)[key] = source[key];
    }
  });
  return Object.keys(normalized).length ? (normalized as CashMovementMetadata) : undefined;
}

function cloneMovement(movement: CashMovement): CashMovement {
  return {
    ...movement,
    metadata: cloneMetadata(movement.metadata),
  };
}

function normalizeAmount(input: number): number {
  const amount = Number.isFinite(input) ? Number(input) : 0;
  return Math.round(amount);
}

function sortMovements(movements: CashMovement[]): CashMovement[] {
  return [...movements].sort((a, b) => {
    const dateCompare = b.occurred_at.localeCompare(a.occurred_at);
    if (dateCompare !== 0) return dateCompare;
    return b.id.localeCompare(a.id);
  });
}

function ensureBookingUniqueness(
  existingMovements: CashMovement[],
  input: Omit<CashMovement, "id">,
): void {
  if (input.type !== "service") {
    return;
  }

  const bookingId = input.metadata?.booking_id ?? null;
  if (!bookingId) {
    return;
  }

  const duplicate = existingMovements.some(
    (movement) =>
      movement.type === "service" &&
      (movement.metadata?.booking_id ?? null) === bookingId,
  );

  if (duplicate) {
    throw new Error("Service revenue has already been recorded for this booking.");
  }
}

function addMovementToMemory(input: Omit<CashMovement, "id">): CashMovement {
  ensureBookingUniqueness(memoryMovements, input);

  const movement: CashMovement = {
    ...input,
    id: generateId(),
    amount_cents: normalizeAmount(input.amount_cents),
    metadata: cloneMetadata(input.metadata),
  };
  memoryMovements = sortMovements([movement, ...memoryMovements]);
  return cloneMovement(movement);
}

function mapSupabaseMovement(row: SupabaseCashMovementRow): CashMovement {
  let metadata = normalizeMetadata(row.metadata ?? undefined);
  const occurredAt = row.occurred_at ?? row.created_at ?? new Date().toISOString();
  if (row.booking_id) {
    if (!metadata) {
      metadata = { booking_id: row.booking_id };
    } else if (metadata.booking_id === undefined) {
      metadata.booking_id = row.booking_id;
    }
  }
  return {
    id: row.id,
    type: row.movement_type,
    amount_cents: normalizeAmount(row.amount_cents),
    occurred_at: occurredAt,
    description: row.description,
    metadata,
  };
}

async function listCashMovementsFromSupabase(): Promise<CashMovement[]> {
  const { data, error } = await supabase
    .from("cash_movements")
    .select(SUPABASE_COLUMNS)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message ?? "Failed to load cash movements");
  }

  const movements = (data ?? []).map((row) => mapSupabaseMovement(row as SupabaseCashMovementRow));
  return sortMovements(movements);
}

async function addMovementToSupabase(
  input: Omit<CashMovement, "id"> & { booking_id?: string | null },
): Promise<CashMovement> {
  const payload = {
    movement_type: input.type,
    amount_cents: normalizeAmount(input.amount_cents),
    occurred_at: input.occurred_at,
    description: input.description,
    booking_id: input.booking_id ?? null,
    metadata: serializeMetadata(input.metadata),
  };

  const { data, error } = (await supabase
    .from("cash_movements")
    .insert([payload])
    .select(SUPABASE_COLUMNS)
    .single()) as PostgrestSingleResponse<SupabaseCashMovementRow>;

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new Error(
        "Service revenue has already been recorded for this booking.",
      );
    }
    throw new Error(error.message ?? "Failed to record cash movement");
  }
  if (!data) {
    throw new Error("Cash movement could not be recorded");
  }

  return mapSupabaseMovement(data);
}

export async function listCashMovements(): Promise<CashMovement[]> {
  if (useMemoryStore) {
    return sortMovements(memoryMovements).map(cloneMovement);
  }

  return listCashMovementsFromSupabase();
}

export async function recordServiceRevenue(input: ServiceRevenueInput): Promise<CashMovement> {
  const occurred_at = input.occurred_at ?? new Date().toISOString();
  const amount_cents = normalizeAmount(input.amount_cents);
  const metadata: CashMovementMetadata = {
    booking_id: input.bookingId,
    service_id: input.serviceId,
    barber_id: input.barberId,
    ...input.metadata,
  };

  if (useMemoryStore) {
    return addMovementToMemory({
      type: "service",
      amount_cents,
      occurred_at,
      description: input.description,
      metadata,
    });
  }

  return addMovementToSupabase({
    type: "service",
    amount_cents,
    occurred_at,
    description: input.description,
    booking_id: input.bookingId,
    metadata,
  });
}

export async function recordProductSaleRevenue(input: ProductSaleInput): Promise<CashMovement> {
  const occurred_at = input.occurred_at ?? new Date().toISOString();
  const amount_cents = normalizeAmount(input.amount_cents);
  const metadata: CashMovementMetadata = {
    product_id: input.productId,
    quantity: input.quantity,
    ...input.metadata,
  };

  if (useMemoryStore) {
    return addMovementToMemory({
      type: "product",
      amount_cents,
      occurred_at,
      description: input.description,
      metadata,
    });
  }

  return addMovementToSupabase({
    type: "product",
    amount_cents,
    occurred_at,
    description: input.description,
    metadata,
  });
}

export async function clearCashMovementsForTests(): Promise<void> {
  if (useMemoryStore) {
    memoryMovements = [];
    return;
  }
  throw new Error("Cash register persistence is not configured.");
}
