import type { Service, ServicePackage, ServicePackageItem } from "./domain";
import { hasSupabaseCredentials, supabase, type SupabaseClientLike } from "./supabase";

export type ServicePackageItemInput = {
  service_id: string;
  quantity: number;
};

export type ServicePackageInput = {
  name: string;
  price_cents: number;
  original_price_cents: number;
  items: ReadonlyArray<ServicePackageItemInput>;
};

type NormalizedServicePackageInput = {
  name: string;
  price_cents: number;
  original_price_cents: number;
  items: ReadonlyArray<{ service_id: string; quantity: number }>;
};

type DbServicePackageItemRow = {
  id: string;
  service_id: string;
  quantity: number;
  services: {
    id: string;
    name: string;
    estimated_minutes: number;
    price_cents: number;
    icon: string;
    created_at: string | null;
  } | null;
};

type DbServicePackageRow = {
  id: string;
  name: string;
  price_cents: number;
  original_price_cents: number;
  created_at: string | null;
  updated_at: string | null;
  service_package_items: DbServicePackageItemRow[] | null;
};

const SERVICE_PACKAGE_COLUMNS =
  "id,name,price_cents,original_price_cents,created_at,updated_at," +
  "service_package_items:service_package_items (" +
  "id,service_id,quantity," +
  "services:services (id,name,estimated_minutes,price_cents,icon,created_at)" +
  ")";

const useMemoryStore = !hasSupabaseCredentials;

let memoryPackages: ServicePackage[] = [];

const cloneService = (service: Service): Service => ({ ...service });

const cloneItem = (item: ServicePackageItem): ServicePackageItem => ({
  ...item,
  service: item.service ? cloneService(item.service) : item.service ?? undefined,
});

const clonePackage = (pkg: ServicePackage): ServicePackage => ({
  ...pkg,
  items: pkg.items.map(cloneItem),
});

const generateId = () => `pkg_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

const nowIso = () => new Date().toISOString();

function normalizeInput(payload: ServicePackageInput): NormalizedServicePackageInput {
  const name = payload.name?.trim();
  if (!name) {
    throw new Error("Name is required");
  }

  const price = Number(payload.price_cents);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be 0 or more");
  }

  const original = Number(payload.original_price_cents);
  if (!Number.isFinite(original) || original <= 0) {
    throw new Error("Original price must be greater than 0");
  }

  const itemMap = new Map<string, number>();
  payload.items.forEach((item) => {
    const id = item.service_id?.trim();
    if (!id) {
      throw new Error("Service ID is required");
    }
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }
    const current = itemMap.get(id) ?? 0;
    itemMap.set(id, current + Math.round(quantity));
  });

  const items = Array.from(itemMap.entries()).map(([service_id, quantity]) => ({ service_id, quantity }));

  if (items.length === 0) {
    throw new Error("Select at least one service");
  }

  if (price >= original) {
    throw new Error("Price must be lower than the sum of services");
  }

  return {
    name,
    price_cents: Math.round(price),
    original_price_cents: Math.round(original),
    items,
  };
}

function mapRow(row: DbServicePackageRow): ServicePackage {
  const items: ServicePackageItem[] = (row.service_package_items ?? []).map((item) => {
    const serviceRow = item.services;
    let service: Service | null = null;
    if (serviceRow) {
      const minutes = Number(serviceRow.estimated_minutes);
      const price = Number(serviceRow.price_cents);
      service = {
        id: serviceRow.id,
        name: serviceRow.name,
        estimated_minutes: Number.isFinite(minutes)
          ? minutes
          : Number.parseInt(String(serviceRow.estimated_minutes ?? 0), 10) || 0,
        price_cents: Number.isFinite(price)
          ? price
          : Number.parseInt(String(serviceRow.price_cents ?? 0), 10) || 0,
        icon: (serviceRow.icon || "content-cut") as Service["icon"],
        created_at: serviceRow.created_at ?? null,
      };
    }
    return {
      id: item.id,
      service_id: item.service_id,
      quantity: Number(item.quantity) || 0,
      service,
    };
  });

  return {
    id: row.id,
    name: row.name,
    price_cents: Number(row.price_cents) || 0,
    original_price_cents: Number(row.original_price_cents) || 0,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    items,
  };
}

async function listPackagesFromMemory(): Promise<ServicePackage[]> {
  return memoryPackages.map(clonePackage);
}

async function createPackageInMemory(input: NormalizedServicePackageInput): Promise<ServicePackage> {
  const now = nowIso();
  const pkg: ServicePackage = {
    id: generateId(),
    name: input.name,
    price_cents: input.price_cents,
    original_price_cents: input.original_price_cents,
    created_at: now,
    updated_at: now,
    items: input.items.map((item) => ({ service_id: item.service_id, quantity: item.quantity })),
  };
  memoryPackages = [...memoryPackages, pkg];
  return clonePackage(pkg);
}

async function updatePackageInMemory(id: string, input: NormalizedServicePackageInput): Promise<ServicePackage> {
  const index = memoryPackages.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error("Service package not found");
  }
  const now = nowIso();
  const current = memoryPackages[index];
  const updated: ServicePackage = {
    ...current,
    name: input.name,
    price_cents: input.price_cents,
    original_price_cents: input.original_price_cents,
    updated_at: now,
    items: input.items.map((item) => ({ service_id: item.service_id, quantity: item.quantity })),
  };
  memoryPackages = [...memoryPackages.slice(0, index), updated, ...memoryPackages.slice(index + 1)];
  return clonePackage(updated);
}

async function deletePackageFromMemory(id: string): Promise<void> {
  memoryPackages = memoryPackages.filter((item) => item.id !== id);
}

async function listPackagesFromSupabase(client: SupabaseClientLike): Promise<ServicePackage[]> {
  const { data, error } = await client.from("service_packages").select(SERVICE_PACKAGE_COLUMNS).order("name");
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as DbServicePackageRow));
}

async function fetchPackageById(client: SupabaseClientLike, id: string): Promise<ServicePackage> {
  const { data, error } = await client
    .from("service_packages")
    .select(SERVICE_PACKAGE_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return mapRow(data as DbServicePackageRow);
}

async function createPackageInSupabase(
  client: SupabaseClientLike,
  input: NormalizedServicePackageInput,
): Promise<ServicePackage> {
  const { data, error } = await client
    .from("service_packages")
    .insert({
      name: input.name,
      price_cents: input.price_cents,
      original_price_cents: input.original_price_cents,
    })
    .select("id")
    .single();

  if (error) throw error;
  const createdId = (data as { id: string } | null)?.id;
  if (!createdId) {
    throw new Error("Failed to create service package");
  }

  try {
    if (input.items.length) {
      const { error: itemsError } = await client.from("service_package_items").insert(
        input.items.map((item) => ({
          package_id: createdId,
          service_id: item.service_id,
          quantity: item.quantity,
        })),
      );
      if (itemsError) throw itemsError;
    }
  } catch (err) {
    await client.from("service_packages").delete().eq("id", createdId);
    throw err;
  }

  return fetchPackageById(client, createdId);
}

async function updatePackageInSupabase(
  client: SupabaseClientLike,
  id: string,
  input: NormalizedServicePackageInput,
): Promise<ServicePackage> {
  const { error } = await client
    .from("service_packages")
    .update({
      name: input.name,
      price_cents: input.price_cents,
      original_price_cents: input.original_price_cents,
    })
    .eq("id", id);

  if (error) throw error;

  const { error: deleteError } = await client.from("service_package_items").delete().eq("package_id", id);
  if (deleteError) throw deleteError;

  if (input.items.length) {
    const { error: insertError } = await client.from("service_package_items").insert(
      input.items.map((item) => ({
        package_id: id,
        service_id: item.service_id,
        quantity: item.quantity,
      })),
    );
    if (insertError) throw insertError;
  }

  return fetchPackageById(client, id);
}

async function deletePackageInSupabase(client: SupabaseClientLike, id: string): Promise<void> {
  const { error } = await client.from("service_packages").delete().eq("id", id);
  if (error) throw error;
}

export function createServicePackagesRepository(client: SupabaseClientLike) {
  return {
    async listServicePackages(): Promise<ServicePackage[]> {
      if (useMemoryStore) {
        return listPackagesFromMemory();
      }
      return listPackagesFromSupabase(client);
    },

    async createServicePackage(payload: ServicePackageInput): Promise<ServicePackage> {
      const input = normalizeInput(payload);
      if (useMemoryStore) {
        return createPackageInMemory(input);
      }
      return createPackageInSupabase(client, input);
    },

    async updateServicePackage(id: string, payload: ServicePackageInput): Promise<ServicePackage> {
      if (!id) throw new Error("Service package ID is required");
      const input = normalizeInput(payload);
      if (useMemoryStore) {
        return updatePackageInMemory(id, input);
      }
      return updatePackageInSupabase(client, id, input);
    },

    async deleteServicePackage(id: string): Promise<void> {
      if (!id) throw new Error("Service package ID is required");
      if (useMemoryStore) {
        await deletePackageFromMemory(id);
        return;
      }
      await deletePackageInSupabase(client, id);
    },
  };
}

const defaultRepository = createServicePackagesRepository(supabase);

export const listServicePackages = defaultRepository.listServicePackages;
export const createServicePackage = defaultRepository.createServicePackage;
export const updateServicePackage = defaultRepository.updateServicePackage;
export const deleteServicePackage = defaultRepository.deleteServicePackage;
