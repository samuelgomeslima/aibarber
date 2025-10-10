import type { SupabaseClientLike } from "./supabase";
import { supabase } from "./supabase";
import type { Service, ServicePackage } from "./domain";

export type DbServicePackage = {
  id: string;
  name: string;
  description: string | null;
  standard_price_cents: number;
  discount_price_cents: number;
  created_at: string | null;
};

export type DbServicePackageItem = {
  id: string;
  package_id: string;
  service_id: string;
  quantity: number;
  services?: {
    id: string;
    name: string;
    estimated_minutes: number;
    price_cents: number;
    icon: Service["icon"];
    created_at: string | null;
  } | null;
};

type CreateServicePackagePayload = {
  name: string;
  description?: string | null;
  standard_price_cents: number;
  discount_price_cents: number;
  items: ReadonlyArray<{ service_id: string; quantity: number }>;
};

export type ServicePackagesRepository = ReturnType<typeof createServicePackagesRepository>;

function toService(row: DbServicePackageItem["services"]): Service | null {
  if (!row) return null;
  const minutes = Number(row.estimated_minutes);
  const price = Number(row.price_cents);
  return {
    id: row.id,
    name: row.name,
    estimated_minutes:
      Number.isFinite(minutes) ? minutes : Number.parseInt(String(row.estimated_minutes ?? 0), 10) || 0,
    price_cents: Number.isFinite(price) ? price : Number.parseInt(String(row.price_cents ?? 0), 10) || 0,
    icon: (row.icon || "content-cut") as Service["icon"],
    created_at: row.created_at ?? null,
  };
}

function mapPackage(row: DbServicePackage & { service_package_items?: DbServicePackageItem[] | null }): ServicePackage {
  const standard = Number(row.standard_price_cents);
  const discount = Number(row.discount_price_cents);
  const items = (row.service_package_items ?? []).map((item) => {
    const quantity = Number(item.quantity);
    return {
      id: item.id,
      service_id: item.service_id,
      quantity: Number.isFinite(quantity)
        ? quantity
        : Number.parseInt(String(item.quantity ?? 0), 10) || 0,
      service: toService(item.services ?? null),
    };
  });

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    standard_price_cents:
      Number.isFinite(standard) ? standard : Number.parseInt(String(row.standard_price_cents ?? 0), 10) || 0,
    discount_price_cents:
      Number.isFinite(discount) ? discount : Number.parseInt(String(row.discount_price_cents ?? 0), 10) || 0,
    created_at: row.created_at ?? null,
    items,
  };
}

async function fetchPackage(client: SupabaseClientLike, id: string): Promise<ServicePackage> {
  const { data, error } = await client
    .from("service_packages")
    .select(
      `id,name,description,standard_price_cents,discount_price_cents,created_at,service_package_items:service_package_items(id,service_id,quantity,services:services(id,name,estimated_minutes,price_cents,icon,created_at)))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Service package not found");
  return mapPackage(data as DbServicePackage & { service_package_items: DbServicePackageItem[] });
}

export function createServicePackagesRepository(client: SupabaseClientLike) {
  return {
    async listServicePackages(): Promise<ServicePackage[]> {
      const { data, error } = await client
        .from("service_packages")
        .select(
          `id,name,description,standard_price_cents,discount_price_cents,created_at,service_package_items:service_package_items(id,service_id,quantity,services:services(id,name,estimated_minutes,price_cents,icon,created_at)))`,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as Array<DbServicePackage & { service_package_items?: DbServicePackageItem[] | null }>;
      return rows.map((row) => mapPackage(row));
    },

    async createServicePackage(payload: CreateServicePackagePayload): Promise<ServicePackage> {
      const cleanName = payload.name?.trim();
      const description = payload.description?.trim() || null;
      const standardInput = Number(payload.standard_price_cents);
      const discountInput = Number(payload.discount_price_cents);
      const items = Array.from(payload.items ?? []).map((item) => ({
        service_id: item.service_id,
        quantity: Number(item.quantity),
      }));

      if (!cleanName) throw new Error("Name is required");
      if (!Number.isFinite(standardInput) || standardInput <= 0) {
        throw new Error("Standard price must be greater than zero");
      }
      if (!Number.isFinite(discountInput) || discountInput <= 0) {
        throw new Error("Discounted price must be greater than zero");
      }
      if (discountInput >= standardInput) {
        throw new Error("Discounted price must be lower than the standard price");
      }
      if (items.length === 0) {
        throw new Error("At least one service is required");
      }
      if (items.some((item) => !item.service_id || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
        throw new Error("Each item must include a service and a positive quantity");
      }

      const { data: pkg, error: createError } = await client
        .from("service_packages")
        .insert({
          name: cleanName,
          description,
          standard_price_cents: Math.round(standardInput),
          discount_price_cents: Math.round(discountInput),
        })
        .select("id")
        .single();

      if (createError) throw createError;
      const packageId = pkg!.id;

      const itemsPayload = items.map((item) => ({
        package_id: packageId,
        service_id: item.service_id,
        quantity: Math.round(item.quantity),
      }));

      const { error: itemsError } = await client.from("service_package_items").insert(itemsPayload);
      if (itemsError) throw itemsError;

      return fetchPackage(client, packageId);
    },

    async deleteServicePackage(id: string): Promise<void> {
      if (!id) throw new Error("Package ID is required");

      const { error } = await client.from("service_packages").delete().eq("id", id);
      if (error) throw error;
    },
  };
}

const defaultRepository = createServicePackagesRepository(supabase);

export const listServicePackages = defaultRepository.listServicePackages;
export const createServicePackage = defaultRepository.createServicePackage;
export const deleteServicePackage = defaultRepository.deleteServicePackage;
