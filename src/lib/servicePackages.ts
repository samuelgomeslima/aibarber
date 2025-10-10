import type { PostgrestSingleResponse } from "@supabase/supabase-js";

import type { ServicePackage, ServicePackageItem } from "./domain";
import { hasSupabaseCredentials, supabase } from "./supabase";

export type ServicePackageInput = {
  name: string;
  price_cents: number;
  regular_price_cents: number;
  description?: string | null;
  items: ReadonlyArray<{ service_id: string; quantity: number }>;
};

type ServicePackageRow = {
  id: string;
  name: string;
  price_cents: number;
  regular_price_cents: number;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
};

type ServicePackageItemRow = {
  id: string;
  package_id: string;
  service_id: string;
  quantity: number;
  position: number | null;
  created_by: string | null;
};

type ServicePackageJoinRow = ServicePackageRow & {
  service_package_items: ServicePackageItemRow[] | null;
};

const TABLE_NAME = "service_packages";
const ITEMS_TABLE = "service_package_items";

const useMemoryStore = !hasSupabaseCredentials;

type MemoryPackage = ServicePackage;

async function requireAuthUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  const userId = data.user?.id;
  if (!userId) {
    throw new Error("User is not authenticated");
  }
  return userId;
}

type NormalizedInput = {
  name: string;
  price_cents: number;
  regular_price_cents: number;
  description: string | null;
  items: ReadonlyArray<{ service_id: string; quantity: number }>;
};

let memoryPackages: MemoryPackage[] = [
  {
    id: "pkg-starter",
    name: "5 Haircuts",
    price_cents: 25000,
    regular_price_cents: 30000,
    description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      { id: "pkg-starter-item-1", service_id: "svc-haircut", quantity: 5 },
    ],
  },
  {
    id: "pkg-premium",
    name: "10 Haircut & Shave",
    price_cents: 48000,
    regular_price_cents: 60000,
    description: "Ideal for loyal customers",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      { id: "pkg-premium-item-1", service_id: "svc-haircut", quantity: 10 },
      { id: "pkg-premium-item-2", service_id: "svc-shave", quantity: 10 },
    ],
  },
];

const clonePackage = (pkg: MemoryPackage): MemoryPackage => ({
  ...pkg,
  items: pkg.items.map((item) => ({ ...item })),
});

const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

function normalizeInput(payload: ServicePackageInput): NormalizedInput {
  const name = payload.name?.trim();
  const price = Number(payload.price_cents);
  const regular = Number(payload.regular_price_cents);
  const description = payload.description?.trim() || null;

  if (!name) {
    throw new Error("Name is required");
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be 0 or more");
  }
  if (!Number.isFinite(regular) || regular < 0) {
    throw new Error("Regular price must be 0 or more");
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("At least one service is required");
  }

  const seen = new Set<string>();
  const items = payload.items.map((item) => {
    const serviceId = item.service_id?.trim();
    const quantity = Number(item.quantity);
    if (!serviceId) {
      throw new Error("Service is required");
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }
    if (seen.has(serviceId)) {
      throw new Error("Each service can only appear once in the package");
    }
    seen.add(serviceId);
    return { service_id: serviceId, quantity: Math.round(quantity) };
  });

  return {
    name,
    price_cents: Math.round(price),
    regular_price_cents: Math.round(regular),
    description,
    items,
  };
}

function mapPackage(row: ServicePackageJoinRow): ServicePackage {
  const items: ServicePackageItem[] = (row.service_package_items ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((item) => ({
      id: item.id,
      service_id: item.service_id,
      quantity: item.quantity,
    }));

  return {
    id: row.id,
    name: row.name,
    price_cents: row.price_cents,
    regular_price_cents: row.regular_price_cents,
    description: row.description,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
    items,
  };
}

async function fetchPackageById(id: string): Promise<ServicePackage> {
  const { data, error } = await supabase
    .from<ServicePackageJoinRow>(TABLE_NAME)
    .select(
      "id,name,price_cents,regular_price_cents,description,created_at,updated_at,service_package_items(id,service_id,quantity,position)",
    )
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("Package not found");
  }
  return mapPackage(data);
}

async function listPackagesFromMemory(): Promise<ServicePackage[]> {
  return memoryPackages.map(clonePackage);
}

async function createPackageInMemory(input: NormalizedInput): Promise<ServicePackage> {
  const now = new Date().toISOString();
  const pkg: MemoryPackage = {
    id: generateId("pkg"),
    name: input.name,
    price_cents: input.price_cents,
    regular_price_cents: input.regular_price_cents,
    description: input.description,
    created_at: now,
    updated_at: now,
    items: input.items.map((item) => ({
      id: generateId("pkg_item"),
      service_id: item.service_id,
      quantity: item.quantity,
    })),
  };
  memoryPackages = [...memoryPackages, pkg];
  return clonePackage(pkg);
}

async function updatePackageInMemory(id: string, input: NormalizedInput): Promise<ServicePackage> {
  const index = memoryPackages.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error("Package not found");
  }
  const now = new Date().toISOString();
  const updated: MemoryPackage = {
    ...memoryPackages[index],
    name: input.name,
    price_cents: input.price_cents,
    regular_price_cents: input.regular_price_cents,
    description: input.description,
    updated_at: now,
    items: input.items.map((item) => ({
      id: generateId("pkg_item"),
      service_id: item.service_id,
      quantity: item.quantity,
    })),
  };
  memoryPackages = [
    ...memoryPackages.slice(0, index),
    updated,
    ...memoryPackages.slice(index + 1),
  ];
  return clonePackage(updated);
}

async function deletePackageFromMemory(id: string): Promise<void> {
  memoryPackages = memoryPackages.filter((item) => item.id !== id);
}

export async function listServicePackages(): Promise<ServicePackage[]> {
  if (useMemoryStore) {
    return listPackagesFromMemory();
  }

  const { data, error } = await supabase
    .from<ServicePackageJoinRow>(TABLE_NAME)
    .select(
      "id,name,price_cents,regular_price_cents,description,created_at,updated_at,service_package_items(id,service_id,quantity,position)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapPackage);
}

export async function createServicePackage(payload: ServicePackageInput): Promise<ServicePackage> {
  const input = normalizeInput(payload);
  if (useMemoryStore) {
    return createPackageInMemory(input);
  }

  const userId = await requireAuthUserId();

  const { data, error } = await supabase
    .from<ServicePackageRow>(TABLE_NAME)
    .insert({
      name: input.name,
      price_cents: input.price_cents,
      regular_price_cents: input.regular_price_cents,
      description: input.description,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }
  const packageId = data?.id;
  if (!packageId) {
    throw new Error("Failed to create service package");
  }

  const itemsPayload = input.items.map((item, index) => ({
    package_id: packageId,
    service_id: item.service_id,
    quantity: item.quantity,
    position: index,
    created_by: userId,
  }));

  const itemsResult: PostgrestSingleResponse<ServicePackageItemRow[]> = await supabase
    .from<ServicePackageItemRow>(ITEMS_TABLE)
    .insert(itemsPayload)
    .select("id");

  if (itemsResult.error) {
    const cleanupResult = await supabase
      .from<ServicePackageRow>(TABLE_NAME)
      .delete()
      .eq("id", packageId);

    if (cleanupResult.error) {
      throw new Error(
        `${itemsResult.error.message}. Additionally failed to clean up created package: ${cleanupResult.error.message}`,
      );
    }

    throw itemsResult.error;
  }

  return fetchPackageById(packageId);
}

export async function updateServicePackage(
  id: string,
  payload: ServicePackageInput,
): Promise<ServicePackage> {
  if (!id) {
    throw new Error("Package ID is required");
  }
  const input = normalizeInput(payload);
  if (useMemoryStore) {
    return updatePackageInMemory(id, input);
  }

  const userId = await requireAuthUserId();

  const { error: updateError } = await supabase
    .from<ServicePackageRow>(TABLE_NAME)
    .update({
      name: input.name,
      price_cents: input.price_cents,
      regular_price_cents: input.regular_price_cents,
      description: input.description,
    })
    .eq("id", id);

  if (updateError) {
    throw updateError;
  }

  const {
    data: existingItems,
    error: existingItemsError,
  } = await supabase
    .from<ServicePackageItemRow>(ITEMS_TABLE)
    .select("service_id,quantity,position,created_by")
    .eq("package_id", id);

  if (existingItemsError) {
    throw existingItemsError;
  }

  const { error: deleteError } = await supabase.from<ServicePackageItemRow>(ITEMS_TABLE).delete().eq("package_id", id);
  if (deleteError) {
    throw deleteError;
  }

  if (input.items.length > 0) {
    const itemsPayload = input.items.map((item, index) => ({
      package_id: id,
      service_id: item.service_id,
      quantity: item.quantity,
      position: index,
      created_by: userId,
    }));
    const insertResult: PostgrestSingleResponse<ServicePackageItemRow[]> = await supabase
      .from<ServicePackageItemRow>(ITEMS_TABLE)
      .insert(itemsPayload)
      .select("id");
    if (insertResult.error) {
      if (existingItems && existingItems.length > 0) {
        const rollbackPayload = existingItems.map((item, index) => ({
          package_id: id,
          service_id: item.service_id,
          quantity: item.quantity,
          position: item.position ?? index,
          created_by: item.created_by ?? userId,
        }));
        const rollbackResult = await supabase.from<ServicePackageItemRow>(ITEMS_TABLE).insert(rollbackPayload);
        if (rollbackResult.error) {
          throw new Error(
            `${insertResult.error.message}. Additionally failed to restore existing items: ${rollbackResult.error.message}`,
          );
        }
      }

      throw insertResult.error;
    }
  }

  return fetchPackageById(id);
}

export async function deleteServicePackage(id: string): Promise<void> {
  if (!id) {
    throw new Error("Package ID is required");
  }
  if (useMemoryStore) {
    return deletePackageFromMemory(id);
  }

  const { error } = await supabase.from<ServicePackageRow>(TABLE_NAME).delete().eq("id", id);
  if (error) {
    throw error;
  }
}
