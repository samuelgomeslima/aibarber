import type { Product } from "./domain";

export type ProductInput = {
  name: string;
  price_cents: number;
  stock_quantity: number;
  sku?: string | null;
  description?: string | null;
  cost_cents?: number | null;
};

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

const clone = (product: Product): Product => ({ ...product });

const generateId = () => `prod_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

export async function listProducts(): Promise<Product[]> {
  return memoryProducts.map(clone);
}

export async function createProduct(payload: ProductInput): Promise<Product> {
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

  const now = new Date().toISOString();
  const product: Product = {
    id: generateId(),
    name,
    price_cents: Math.round(price),
    stock_quantity: Math.round(stock),
    sku: payload.sku?.trim() || null,
    description: payload.description?.trim() || null,
    cost_cents: Number.isFinite(payload.cost_cents ?? NaN)
      ? Math.round(Number(payload.cost_cents))
      : null,
    created_at: now,
    updated_at: now,
  };

  memoryProducts = [...memoryProducts, product];
  return clone(product);
}

export async function updateProduct(
  id: string,
  payload: ProductInput,
): Promise<Product> {
  if (!id) throw new Error("Product ID is required");

  const index = memoryProducts.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error("Product not found");
  }

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

  const now = new Date().toISOString();
  const current = memoryProducts[index];
  const updated: Product = {
    ...current,
    name,
    price_cents: Math.round(price),
    stock_quantity: Math.round(stock),
    sku: payload.sku?.trim() || null,
    description: payload.description?.trim() || null,
    cost_cents: Number.isFinite(payload.cost_cents ?? NaN)
      ? Math.round(Number(payload.cost_cents))
      : null,
    updated_at: now,
  };

  memoryProducts = [
    ...memoryProducts.slice(0, index),
    updated,
    ...memoryProducts.slice(index + 1),
  ];

  return clone(updated);
}

export async function deleteProduct(id: string): Promise<void> {
  if (!id) throw new Error("Product ID is required");
  memoryProducts = memoryProducts.filter((product) => product.id !== id);
}

function ensureQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }
  return Math.round(quantity);
}

async function adjustStock(id: string, delta: number): Promise<Product> {
  const index = memoryProducts.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error("Product not found");
  }

  const current = memoryProducts[index];
  const nextStock = current.stock_quantity + delta;
  if (nextStock < 0) {
    throw new Error("Insufficient stock");
  }

  const now = new Date().toISOString();
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

export async function sellProduct(id: string, quantity: number): Promise<Product> {
  const qty = ensureQuantity(quantity);
  return adjustStock(id, -qty);
}

export async function restockProduct(id: string, quantity: number): Promise<Product> {
  const qty = ensureQuantity(quantity);
  return adjustStock(id, qty);
}
