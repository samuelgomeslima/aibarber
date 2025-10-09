import type { PostgrestSingleResponse } from "@supabase/supabase-js";

import type { Product } from "./domain";
import { hasSupabaseCredentials, supabase } from "./supabase";

export type ProductInput = {
  name: string;
  price_cents: number;
  stock_quantity: number;
  sku?: string | null;
  description?: string | null;
  cost_cents?: number | null;
};

type NormalizedProductInput = {
  name: string;
  price_cents: number;
  stock_quantity: number;
  sku: string | null;
  description: string | null;
  cost_cents: number | null;
};

type SupabaseProductRow = {
  id: string;
  name: string;
  price_cents: number;
  stock_quantity: number;
  sku: string | null;
  description: string | null;
  cost_cents: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type MovementType = "sell" | "restock";

const PRODUCT_COLUMNS =
  "id,name,price_cents,stock_quantity,sku,description,cost_cents,created_at,updated_at";

let memoryProducts: Product[] = [
  {
    id: "prod-shampoo",
    name: "Hydrating shampoo",
    price_cents: 4500,
    stock_quantity: 18,
    sku: "SHAMP-01",
    description: "Salon grade shampoo ideal for dry hair.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-beard-oil",
    name: "Beard oil",
    price_cents: 5500,
    stock_quantity: 9,
    sku: "BEARD-02",
    description: "Organic beard conditioning oil.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const useMemoryStore = !hasSupabaseCredentials;

const clone = (product: Product): Product => ({ ...product });
const generateId = () => `prod_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

function nowIso() {
  return new Date().toISOString();
}

function ensureProductId(id: string) {
  if (!id) {
    throw new Error("Product ID is required");
  }
}

function normalizeProductInput(payload: ProductInput): NormalizedProductInput {
  const name = payload.name?.trim();
  const price = Number(payload.price_cents);
  const stock = Number(payload.stock_quantity);

  if (!name) {
    throw new Error("Name is required");
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be 0 or more");
  }
  if (!Number.isFinite(stock) || stock < 0) {
    throw new Error("Stock must be 0 or more");
  }

  let cost_cents: number | null = null;
  if (payload.cost_cents !== undefined && payload.cost_cents !== null) {
    const cost = Number(payload.cost_cents);
    cost_cents = Number.isFinite(cost) ? Math.round(cost) : null;
  }

  return {
    name,
    price_cents: Math.round(price),
    stock_quantity: Math.round(stock),
    sku: payload.sku?.trim() || null,
    description: payload.description?.trim() || null,
    cost_cents,
  };
}

function mapProduct(row: SupabaseProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price_cents: row.price_cents,
    stock_quantity: row.stock_quantity,
    sku: row.sku,
    description: row.description,
    cost_cents: row.cost_cents ?? null,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  };
}

async function listProductsFromMemory(): Promise<Product[]> {
  return memoryProducts.map(clone);
}

async function createProductInMemory(input: NormalizedProductInput): Promise<Product> {
  const now = nowIso();
  const product: Product = {
    id: generateId(),
    ...input,
    created_at: now,
    updated_at: now,
  };
  memoryProducts = [...memoryProducts, product];
  return clone(product);
}

async function updateProductInMemory(id: string, input: NormalizedProductInput): Promise<Product> {
  const index = memoryProducts.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error("Product not found");
  }

  const now = nowIso();
  const current = memoryProducts[index];
  const updated: Product = {
    ...current,
    ...input,
    updated_at: now,
  };

  memoryProducts = [
    ...memoryProducts.slice(0, index),
    updated,
    ...memoryProducts.slice(index + 1),
  ];

  return clone(updated);
}

async function deleteProductFromMemory(id: string): Promise<void> {
  memoryProducts = memoryProducts.filter((product) => product.id !== id);
}

function ensureQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }
  return Math.round(quantity);
}

async function adjustStockInMemory(id: string, delta: number): Promise<Product> {
  const index = memoryProducts.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error("Product not found");
  }

  const current = memoryProducts[index];
  const nextStock = current.stock_quantity + delta;
  if (nextStock < 0) {
    throw new Error("Insufficient stock");
  }

  const now = nowIso();
  const updated: Product = {
    ...current,
    stock_quantity: nextStock,
    updated_at: now,
  };

  memoryProducts = [
    ...memoryProducts.slice(0, index),
    updated,
    ...memoryProducts.slice(index + 1),
  ];

  return clone(updated);
}

async function listProductsFromSupabase(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select(PRODUCT_COLUMNS);
  if (error) {
    throw new Error(error.message ?? "Failed to load products");
  }
  return (data ?? []).map((row) => mapProduct(row as SupabaseProductRow));
}

async function createProductInSupabase(input: NormalizedProductInput): Promise<Product> {
  const { data, error } = (await supabase
    .from("products")
    .insert(input)
    .select(PRODUCT_COLUMNS)
    .single()) as PostgrestSingleResponse<SupabaseProductRow>;

  if (error) {
    throw new Error(error.message ?? "Failed to create product");
  }
  if (!data) {
    throw new Error("Product could not be created");
  }

  return mapProduct(data);
}

async function updateProductInSupabase(id: string, input: NormalizedProductInput): Promise<Product> {
  const { data, error } = (await supabase
    .from("products")
    .update(input)
    .eq("id", id)
    .select(PRODUCT_COLUMNS)
    .single()) as PostgrestSingleResponse<SupabaseProductRow>;

  if (error) {
    throw new Error(error.message ?? "Failed to update product");
  }
  if (!data) {
    throw new Error("Product not found");
  }

  return mapProduct(data);
}

async function deleteProductFromSupabase(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    throw new Error(error.message ?? "Failed to delete product");
  }
}

async function recordStockMovementInSupabase(
  id: string,
  quantity: number,
  movement: MovementType,
): Promise<Product> {
  const { data, error } = (await supabase.rpc("record_product_movement", {
    p_product_id: id,
    p_quantity: quantity,
    p_movement_type: movement,
  })) as PostgrestSingleResponse<SupabaseProductRow>;

  if (error) {
    const action = movement === "sell" ? "sell" : "restock";
    throw new Error(error.message ?? `Failed to ${action} product`);
  }
  if (!data) {
    throw new Error("No product returned from stock movement");
  }

  return mapProduct(data);
}

export async function listProducts(): Promise<Product[]> {
  if (useMemoryStore) {
    return listProductsFromMemory();
  }
  return listProductsFromSupabase();
}

export async function createProduct(payload: ProductInput): Promise<Product> {
  const input = normalizeProductInput(payload);
  if (useMemoryStore) {
    return createProductInMemory(input);
  }
  return createProductInSupabase(input);
}

export async function updateProduct(id: string, payload: ProductInput): Promise<Product> {
  ensureProductId(id);
  const input = normalizeProductInput(payload);
  if (useMemoryStore) {
    return updateProductInMemory(id, input);
  }
  return updateProductInSupabase(id, input);
}

export async function deleteProduct(id: string): Promise<void> {
  ensureProductId(id);
  if (useMemoryStore) {
    await deleteProductFromMemory(id);
    return;
  }
  await deleteProductFromSupabase(id);
}

export async function sellProduct(id: string, quantity: number): Promise<Product> {
  ensureProductId(id);
  const qty = ensureQuantity(quantity);
  if (useMemoryStore) {
    return adjustStockInMemory(id, -qty);
  }
  return recordStockMovementInSupabase(id, qty, "sell");
}

export async function restockProduct(id: string, quantity: number): Promise<Product> {
  ensureProductId(id);
  const qty = ensureQuantity(quantity);
  if (useMemoryStore) {
    return adjustStockInMemory(id, qty);
  }
  return recordStockMovementInSupabase(id, qty, "restock");
}
