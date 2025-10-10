import type { SupabaseClientLike } from "./supabase";
import { supabase } from "./supabase";
import type { Service, ServicePackage, ServicePackageItem } from "./domain";

type DbServiceRow = {
  id: string;
  name: string;
  estimated_minutes: number | null;
  price_cents: number | null;
  icon: string | null;
};

type DbServicePackageItem = {
  service_id: string;
  quantity: number;
  service?: DbServiceRow | null;
};

type DbServicePackage = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  regular_price_cents: number | null;
  created_at: string | null;
  service_package_items?: DbServicePackageItem[] | null;
};

type ServicePackagePayload = {
  name: string;
  description?: string | null;
  price_cents: number;
  regular_price_cents: number;
  items: Array<{ service_id: string; quantity: number }>;
};

function mapDbService(row: DbServiceRow | null | undefined): Service | null {
  if (!row) return null;

  const minutes = Number(row.estimated_minutes);
  const price = Number(row.price_cents);

  return {
    id: row.id,
    name: row.name,
    estimated_minutes: Number.isFinite(minutes)
      ? minutes
      : Number.parseInt(String(row.estimated_minutes ?? 0), 10) || 0,
    price_cents: Number.isFinite(price)
      ? price
      : Number.parseInt(String(row.price_cents ?? 0), 10) || 0,
    icon: (row.icon || "content-cut") as Service["icon"],
    created_at: null,
  };
}

function mapDbServicePackageItem(item: DbServicePackageItem): ServicePackageItem {
  const quantity = Number(item.quantity);
  return {
    service_id: item.service_id,
    quantity: Number.isFinite(quantity)
      ? Math.max(0, Math.round(quantity))
      : Number.parseInt(String(item.quantity ?? 0), 10) || 0,
    service: mapDbService(item.service ?? null),
  };
}

function mapDbServicePackage(row: DbServicePackage): ServicePackage {
  const price = Number(row.price_cents);
  const regularPrice = Number(row.regular_price_cents);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    price_cents: Number.isFinite(price)
      ? Math.max(0, Math.round(price))
      : Number.parseInt(String(row.price_cents ?? 0), 10) || 0,
    regular_price_cents: Number.isFinite(regularPrice)
      ? Math.max(0, Math.round(regularPrice))
      : Number.parseInt(String(row.regular_price_cents ?? 0), 10) || 0,
    created_at: row.created_at ?? null,
    items: (row.service_package_items ?? []).map(mapDbServicePackageItem),
  };
}

export function createServicePackagesRepository(client: SupabaseClientLike) {
  const selectColumns =
    "id,name,description,price_cents,regular_price_cents,created_at,service_package_items(service_id,quantity,service:services(id,name,estimated_minutes,price_cents,icon))";

  async function fetchById(id: string): Promise<ServicePackage> {
    const { data, error } = await client
      .from("service_packages")
      .select(selectColumns)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Service package not found");

    return mapDbServicePackage(data as DbServicePackage);
  }

  function validatePayload(payload: ServicePackagePayload) {
    const cleanName = payload.name?.trim();
    if (!cleanName) throw new Error("Name is required");

    const price = Number(payload.price_cents);
    const regular = Number(payload.regular_price_cents);
    if (!Number.isFinite(price) || price <= 0) throw new Error("Price must be greater than zero");
    if (!Number.isFinite(regular) || regular <= 0) {
      throw new Error("Regular price must be greater than zero");
    }
    if (price >= regular) {
      throw new Error("Discounted price must be lower than the regular price");
    }

    const validItems = payload.items.filter((item) => item.quantity > 0 && item.service_id?.trim());
    if (validItems.length === 0) {
      throw new Error("At least one service is required in the package");
    }
  }

  return {
    async listServicePackages(): Promise<ServicePackage[]> {
      const { data, error } = await client.from("service_packages").select(selectColumns).order("name");
      if (error) throw error;
      const rows = (data ?? []) as DbServicePackage[];
      return rows.map(mapDbServicePackage);
    },

    async createServicePackage(payload: ServicePackagePayload): Promise<ServicePackage> {
      validatePayload(payload);
      const cleanName = payload.name.trim();
      const description = payload.description?.trim() || null;
      const items = payload.items
        .filter((item) => item.quantity > 0 && item.service_id?.trim())
        .map((item) => ({
          service_id: item.service_id.trim(),
          quantity: Math.round(item.quantity),
        }));

      const { data, error } = await client
        .from("service_packages")
        .insert({
          name: cleanName,
          description,
          price_cents: Math.round(payload.price_cents),
          regular_price_cents: Math.round(payload.regular_price_cents),
        })
        .select("id")
        .single();

      if (error) throw error;
      const createdId = (data as { id: string }).id;

      const { error: itemsError } = await client
        .from("service_package_items")
        .insert(items.map((item) => ({ ...item, package_id: createdId })));

      if (itemsError) throw itemsError;

      return fetchById(createdId);
    },

    async updateServicePackage(id: string, payload: ServicePackagePayload): Promise<ServicePackage> {
      if (!id) throw new Error("Package ID is required");
      validatePayload(payload);

      const cleanName = payload.name.trim();
      const description = payload.description?.trim() || null;
      const items = payload.items
        .filter((item) => item.quantity > 0 && item.service_id?.trim())
        .map((item) => ({
          service_id: item.service_id.trim(),
          quantity: Math.round(item.quantity),
        }));

      const { error } = await client
        .from("service_packages")
        .update({
          name: cleanName,
          description,
          price_cents: Math.round(payload.price_cents),
          regular_price_cents: Math.round(payload.regular_price_cents),
        })
        .eq("id", id);

      if (error) throw error;

      const { error: deleteError } = await client.from("service_package_items").delete().eq("package_id", id);
      if (deleteError) throw deleteError;

      const { error: insertError } = await client
        .from("service_package_items")
        .insert(items.map((item) => ({ ...item, package_id: id })));
      if (insertError) throw insertError;

      return fetchById(id);
    },

    async deleteServicePackage(id: string): Promise<void> {
      if (!id) throw new Error("Package ID is required");
      const { error: itemsError } = await client.from("service_package_items").delete().eq("package_id", id);
      if (itemsError) throw itemsError;

      const { error } = await client.from("service_packages").delete().eq("id", id);
      if (error) throw error;
    },
  };
}

const defaultRepository = createServicePackagesRepository(supabase);

export const listServicePackages = defaultRepository.listServicePackages;
export const createServicePackage = defaultRepository.createServicePackage;
export const updateServicePackage = defaultRepository.updateServicePackage;
export const deleteServicePackage = defaultRepository.deleteServicePackage;
