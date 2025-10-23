import { hasSupabaseCredentials, supabase } from "./supabase";
import { requireCurrentBarbershopId } from "./activeBarbershop";

export type CashEntryType = "service_sale" | "product_sale" | "adjustment";

export type CashEntry = {
  id: string;
  type: CashEntryType;
  amount_cents: number;
  quantity: number;
  unit_amount_cents: number | null;
  source_id: string | null;
  source_name: string;
  reference_id: string | null;
  note: string | null;
  created_at: string;
};

export type CashRegisterSummary = {
  total_cents: number;
  service_sales_cents: number;
  product_sales_cents: number;
  adjustments_cents: number;
};

type ServiceSaleInput = {
  serviceId: string;
  serviceName: string;
  unitPriceCents: number;
  quantity?: number;
  referenceId?: string | null;
  note?: string | null;
};

type ProductSaleInput = {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  note?: string | null;
};

type AdjustmentInput = {
  amount_cents: number;
  note?: string | null;
  reference_id?: string | null;
};

type NormalizedEntryInput = {
  type: CashEntryType;
  amount_cents: number;
  quantity: number;
  unit_amount_cents: number | null;
  source_id: string | null;
  source_name: string;
  reference_id: string | null;
  note: string | null;
};

type SupabaseCashEntryRow = {
  id: string;
  entry_type: CashEntryType;
  amount_cents: number;
  quantity: number;
  unit_amount_cents: number | null;
  source_id: string | null;
  source_name: string;
  reference_id: string | null;
  note: string | null;
  created_at: string;
};

const useMemoryStore = !hasSupabaseCredentials;

let memoryEntries: CashEntry[] = [];

const cloneEntry = (entry: CashEntry): CashEntry => ({ ...entry });

const sortEntries = (entries: CashEntry[]): CashEntry[] =>
  [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at));

const nowIso = () => new Date().toISOString();

const generateId = () => `cash_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

const ensureQuantity = (value: number | undefined, defaultValue = 1) => {
  const numeric = Number(value ?? defaultValue);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Quantity must be greater than zero");
  }
  return Math.round(numeric);
};

const ensureUnitAmount = (value: number | null | undefined) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("Unit amount must be zero or more");
  }
  return Math.round(numeric);
};

const normalizeSourceName = (value: string | null | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};

const toCashEntry = (row: SupabaseCashEntryRow): CashEntry => ({
  id: row.id,
  type: row.entry_type,
  amount_cents: Number.isFinite(row.amount_cents) ? row.amount_cents : 0,
  quantity: Number.isFinite(row.quantity) ? row.quantity : 0,
  unit_amount_cents: row.unit_amount_cents ?? null,
  source_id: row.source_id ?? null,
  source_name: row.source_name ?? "",
  reference_id: row.reference_id ?? null,
  note: row.note ?? null,
  created_at: row.created_at ?? nowIso(),
});

const persistEntryInMemory = async (input: NormalizedEntryInput): Promise<CashEntry> => {
  const entry: CashEntry = {
    id: generateId(),
    type: input.type,
    amount_cents: input.amount_cents,
    quantity: input.quantity,
    unit_amount_cents: input.unit_amount_cents,
    source_id: input.source_id,
    source_name: input.source_name,
    reference_id: input.reference_id,
    note: input.note,
    created_at: nowIso(),
  };
  memoryEntries = sortEntries([entry, ...memoryEntries]);
  return cloneEntry(entry);
};

const persistEntryInSupabase = async (input: NormalizedEntryInput): Promise<CashEntry> => {
  const barbershopId = await requireCurrentBarbershopId();
  const { data, error } = await supabase
    .from("cash_register_entries")
    .insert({
      entry_type: input.type,
      amount_cents: input.amount_cents,
      quantity: input.quantity,
      unit_amount_cents: input.unit_amount_cents,
      source_id: input.source_id,
      source_name: input.source_name,
      reference_id: input.reference_id,
      note: input.note,
      barbershop_id: barbershopId,
    })
    .select(
      "id,entry_type,amount_cents,quantity,unit_amount_cents,source_id,source_name,reference_id,note,created_at",
    )
    .single();

  if (error) {
    throw new Error(error.message ?? "Failed to record cash register entry");
  }
  if (!data) {
    throw new Error("Cash register entry could not be created");
  }

  return toCashEntry(data as SupabaseCashEntryRow);
};

const persistEntry = async (input: NormalizedEntryInput): Promise<CashEntry> => {
  if (useMemoryStore) {
    return persistEntryInMemory(input);
  }
  return persistEntryInSupabase(input);
};

const ensureAmount = (unit: number | null, quantity: number, fallback: number) => {
  if (unit === null) {
    const numeric = Number(fallback);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round(numeric);
  }
  return unit * quantity;
};

export async function recordServiceSale(input: ServiceSaleInput): Promise<CashEntry> {
  const quantity = ensureQuantity(input.quantity, 1);
  const unit = ensureUnitAmount(input.unitPriceCents);
  const sourceName = normalizeSourceName(input.serviceName, "Service sale");
  const amount = ensureAmount(unit, quantity, input.unitPriceCents);

  return persistEntry({
    type: "service_sale",
    quantity,
    unit_amount_cents: unit,
    amount_cents: amount,
    source_id: input.serviceId ?? null,
    source_name: sourceName,
    reference_id: input.referenceId ?? null,
    note: input.note?.trim() ?? null,
  });
}

export async function recordProductSale(input: ProductSaleInput): Promise<CashEntry> {
  const quantity = ensureQuantity(input.quantity, 1);
  const unit = ensureUnitAmount(input.unitPriceCents);
  const sourceName = normalizeSourceName(input.productName, "Product sale");
  const amount = ensureAmount(unit, quantity, input.unitPriceCents);

  return persistEntry({
    type: "product_sale",
    quantity,
    unit_amount_cents: unit,
    amount_cents: amount,
    source_id: input.productId ?? null,
    source_name: sourceName,
    reference_id: null,
    note: input.note?.trim() ?? null,
  });
}

export async function recordCashAdjustment(input: AdjustmentInput): Promise<CashEntry> {
  const amount = Number(input.amount_cents);
  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error("Adjustment amount must be a non-zero number");
  }

  return persistEntry({
    type: "adjustment",
    quantity: 1,
    unit_amount_cents: null,
    amount_cents: Math.round(amount),
    source_id: null,
    source_name: "Adjustment",
    reference_id: input.reference_id ?? null,
    note: input.note?.trim() ?? null,
  });
}

const listEntriesFromMemory = async (): Promise<CashEntry[]> => memoryEntries.map(cloneEntry);

const listEntriesFromSupabase = async (): Promise<CashEntry[]> => {
  const barbershopId = await requireCurrentBarbershopId();
  const { data, error } = await supabase
    .from("cash_register_entries")
    .select(
      "id,entry_type,amount_cents,quantity,unit_amount_cents,source_id,source_name,reference_id,note,created_at",
    )
    .eq("barbershop_id", barbershopId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message ?? "Failed to load cash register entries");
  }

  return (data ?? []).map((row) => toCashEntry(row as SupabaseCashEntryRow));
};

export async function listCashEntries(): Promise<CashEntry[]> {
  if (useMemoryStore) {
    return listEntriesFromMemory();
  }
  return listEntriesFromSupabase();
}

export function summarizeCashEntries(entries: CashEntry[]): CashRegisterSummary {
  return entries.reduce(
    (acc, entry) => {
      const amount = Number.isFinite(entry.amount_cents) ? entry.amount_cents : 0;
      acc.total_cents += amount;
      if (entry.type === "service_sale") {
        acc.service_sales_cents += amount;
      } else if (entry.type === "product_sale") {
        acc.product_sales_cents += amount;
      } else {
        acc.adjustments_cents += amount;
      }
      return acc;
    },
    { total_cents: 0, service_sales_cents: 0, product_sales_cents: 0, adjustments_cents: 0 },
  );
}
