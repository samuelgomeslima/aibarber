import type { PostgrestSingleResponse } from "@supabase/supabase-js";

import type { ServicePackage, ServicePackageItem } from "./domain";
import { hasSupabaseCredentials, supabase } from "./supabase";

export type ServicePackageInput = {
  name: string;
  description?: string | null;
  regular_price_cents: number;
  price_cents: number;
  items: ServicePackageItem[];
};

type NormalizedPackageInput = {
  name: string;
  description: string | null;
  regular_price_cents: number;
  price_cents: number;
  items: ServicePackageItem[];
};

type SupabasePackageRow = {
  id: string;
  name: string;
  description: string | null;
  regular_price_cents: number;
  price_cents: number;
  items: ServicePackageItem[];
  created_at: string | null;
  updated_at: string | null;
};

const PACKAGE_COLUMNS =
  "id,name,description,regular_price_cents,price_cents,items,created_at,updated_at";

const useMemoryStore = !hasSupabaseCredentials;

const nowIso = () => new Date().toISOString();
const clone = (pkg: ServicePackage): ServicePackage => ({
  ...pkg,
  items: pkg.items.map((item) => ({ ...item })),
});

const generateId = () => `pkg_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

let memoryPackages: ServicePackage[] = [
  {
    id: "pkg-haircut-shave-10",
    name: "10× Haircut + Shave",
    description: "Perfect for loyal clients who want a fresh cut and shave every visit.",
    regular_price_cents: 120000,
    price_cents: 99000,
    items: [
      { service_id: "svc-haircut", quantity: 10 },
      { service_id: "svc-shave", quantity: 10 },
    ],
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: "pkg-haircut-5",
    name: "5× Haircut",
    description: "Bundle of five signature haircuts with a loyal customer discount.",
    regular_price_cents: 60000,
    price_cents: 52000,
    items: [{ service_id: "svc-haircut", quantity: 5 }],
    created_at: nowIso(),
    updated_at: nowIso(),
  },
];

function normalizeInput(payload: ServicePackageInput): NormalizedPackageInput {
  const name = payload.name?.trim();
  const regularPrice = Number(payload.regular_price_cents);
  const price = Number(payload.price_cents);
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (!name) {
    throw new Error("Name is required");
  }
  if (!Number.isFinite(regularPrice) || regularPrice < 0) {
    throw new Error("Regular price must be 0 or more");
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Package price must be 0 or more");
  }
  if (!items.length) {
    throw new Error("Include at least one service in the package");
  }

  const normalizedItems = items.map((item) => {
    const serviceId = item.service_id?.trim();
    const quantity = Number(item.quantity);
    if (!serviceId) {
      throw new Error("Service ID is required for each package item");
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Item quantity must be greater than zero");
    }
    return { service_id: serviceId, quantity: Math.round(quantity) };
  });

  return {
    name,
    description: payload.description?.trim() || null,
    regular_price_cents: Math.round(regularPrice),
    price_cents: Math.round(price),
    items: normalizedItems,
  };
}

function mapPackage(row: SupabasePackageRow): ServicePackage {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    regular_price_cents: row.regular_price_cents,
    price_cents: row.price_cents,
    items: Array.isArray(row.items)
      ? row.items.map((item) => ({
          service_id: item.service_id,
          quantity: item.quantity,
        }))
      : [],
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  };
}

async function listPackagesFromMemory(): Promise<ServicePackage[]> {
  return memoryPackages.map(clone);
}

async function createPackageInMemory(input: NormalizedPackageInput): Promise<ServicePackage> {
  const now = nowIso();
  const pkg: ServicePackage = {
    id: generateId(),
    ...input,
    created_at: now,
    updated_at: now,
  };
  memoryPackages = [...memoryPackages, pkg];
  return clone(pkg);
}

async function updatePackageInMemory(id: string, input: NormalizedPackageInput): Promise<ServicePackage> {
  const index = memoryPackages.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error("Package not found");
  }

  const now = nowIso();
  const current = memoryPackages[index];
  const updated: ServicePackage = {
    ...current,
    ...input,
    updated_at: now,
  };

  memoryPackages = [
    ...memoryPackages.slice(0, index),
    updated,
    ...memoryPackages.slice(index + 1),
  ];

  return clone(updated);
}

async function deletePackageFromMemory(id: string): Promise<void> {
  memoryPackages = memoryPackages.filter((pkg) => pkg.id !== id);
}

function ensureId(id: string) {
  if (!id) {
    throw new Error("Package ID is required");
  }
}

export async function listServicePackages(): Promise<ServicePackage[]> {
  if (useMemoryStore) {
    return listPackagesFromMemory();
  }

  const { data, error } = await supabase
    .from("service_packages")
    .select(PACKAGE_COLUMNS)
    .order("name");
  if (error) throw error;
  const rows = (data ?? []) as SupabasePackageRow[];
  return rows.map(mapPackage);
}

export async function createServicePackage(payload: ServicePackageInput): Promise<ServicePackage> {
  const input = normalizeInput(payload);
  if (useMemoryStore) {
    return createPackageInMemory(input);
  }

  const response: PostgrestSingleResponse<SupabasePackageRow> = await supabase
    .from("service_packages")
    .insert({
      name: input.name,
      description: input.description,
      regular_price_cents: input.regular_price_cents,
      price_cents: input.price_cents,
      items: input.items,
    })
    .select(PACKAGE_COLUMNS)
    .single();

  if (response.error) throw response.error;
  if (!response.data) throw new Error("Failed to create service package");
  return mapPackage(response.data);
}

export async function updateServicePackage(
  id: string,
  payload: ServicePackageInput,
): Promise<ServicePackage> {
  ensureId(id);
  const input = normalizeInput(payload);
  if (useMemoryStore) {
    return updatePackageInMemory(id, input);
  }

  const response: PostgrestSingleResponse<SupabasePackageRow> = await supabase
    .from("service_packages")
    .update({
      name: input.name,
      description: input.description,
      regular_price_cents: input.regular_price_cents,
      price_cents: input.price_cents,
      items: input.items,
    })
    .eq("id", id)
    .select(PACKAGE_COLUMNS)
    .single();

  if (response.error) throw response.error;
  if (!response.data) throw new Error("Service package not found");
  return mapPackage(response.data);
}

export async function deleteServicePackage(id: string): Promise<void> {
  ensureId(id);
  if (useMemoryStore) {
    await deletePackageFromMemory(id);
    return;
  }

  const { error } = await supabase.from("service_packages").delete().eq("id", id);
  if (error) throw error;
}
