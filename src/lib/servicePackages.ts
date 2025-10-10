import type { SupabaseClientLike } from "./supabase";
import { supabase } from "./supabase";
import type { Service, ServicePackage } from "./domain";

type DbServicePackageRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  regular_price_cents: number | null;
  created_at: string | null;
  service_package_items: DbServicePackageItemRow[] | null;
};

type DbServicePackageItemRow = {
  id: string;
  service_id: string;
  quantity: number;
  services?: null | {
    id: string;
    name: string;
    estimated_minutes: number;
    price_cents: number;
    icon: string | null;
    created_at: string | null;
  };
};

type ServicePackageItemInput = {
  service_id: string;
  quantity: number;
};

export type ServicePackagePayload = {
  name: string;
  description?: string | null;
  price_cents: number;
  regular_price_cents?: number | null;
  items: ServicePackageItemInput[];
};

const SELECT_COLUMNS = `id,name,description,price_cents,regular_price_cents,created_at,service_package_items(id,service_id,quantity,services(id,name,estimated_minutes,price_cents,icon,created_at)))`;

export function createServicePackagesRepository(client: SupabaseClientLike) {
  const mapRow = (row: DbServicePackageRow): ServicePackage => {
    const price = Number(row.price_cents);
    const regularPrice = row.regular_price_cents;
    const items = (row.service_package_items ?? []).map((item) => {
      const quantity = Number(item.quantity);
      const linkedService = item.services;
      const service: Service | null = linkedService
        ? {
            id: linkedService.id,
            name: linkedService.name,
            estimated_minutes:
              Number.isFinite(Number(linkedService.estimated_minutes))
                ? Number(linkedService.estimated_minutes)
                : Number.parseInt(String(linkedService.estimated_minutes ?? 0), 10) || 0,
            price_cents:
              Number.isFinite(Number(linkedService.price_cents))
                ? Number(linkedService.price_cents)
                : Number.parseInt(String(linkedService.price_cents ?? 0), 10) || 0,
            icon: (linkedService.icon || "content-cut") as Service["icon"],
            created_at: linkedService.created_at ?? null,
          }
        : null;
      return {
        id: item.id,
        service_id: item.service_id,
        quantity: Number.isFinite(quantity)
          ? Math.max(0, Math.round(quantity))
          : Number.parseInt(String(item.quantity ?? 0), 10) || 0,
        service,
      };
    });

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      price_cents: Number.isFinite(price)
        ? Math.round(price)
        : Number.parseInt(String(row.price_cents ?? 0), 10) || 0,
      regular_price_cents: Number.isFinite(Number(regularPrice))
        ? (regularPrice === null ? null : Math.round(Number(regularPrice)))
        : regularPrice ?? null,
      created_at: row.created_at ?? null,
      items,
    };
  };

  const fetchById = async (id: string): Promise<ServicePackage> => {
    const { data, error } = await client
      .from("service_packages")
      .select(SELECT_COLUMNS)
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!data) throw new Error("Service package not found");
    return mapRow(data as DbServicePackageRow);
  };

  const sanitizeItems = (items: ServicePackageItemInput[]) => {
    const cleaned = (items ?? []).map((item) => {
      const serviceId = String(item.service_id ?? "").trim();
      const quantityNumber = Number(item.quantity);
      if (!serviceId) {
        throw new Error("Service selection is required");
      }
      if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
        throw new Error("Quantity must be greater than zero");
      }
      return {
        service_id: serviceId,
        quantity: Math.max(1, Math.round(quantityNumber)),
      };
    });

    if (cleaned.length === 0) {
      throw new Error("At least one service must be included in the package");
    }

    return cleaned;
  };

  return {
    async listServicePackages(): Promise<ServicePackage[]> {
      const { data, error } = await client
        .from("service_packages")
        .select(SELECT_COLUMNS)
        .order("name");
      if (error) throw error;
      const rows = (data ?? []) as DbServicePackageRow[];
      return rows.map(mapRow);
    },

    async createServicePackage(payload: ServicePackagePayload): Promise<ServicePackage> {
      const cleanName = payload.name?.trim();
      const priceInput = Number(payload.price_cents);
      const regularPriceInput =
        payload.regular_price_cents === null || payload.regular_price_cents === undefined
          ? null
          : Number(payload.regular_price_cents);
      const description = payload.description?.trim() ?? null;
      const items = sanitizeItems(payload.items ?? []);

      if (!cleanName) throw new Error("Name is required");
      if (!Number.isFinite(priceInput) || priceInput < 0) {
        throw new Error("Price must be zero or greater");
      }
      if (regularPriceInput !== null && (!Number.isFinite(regularPriceInput) || regularPriceInput < 0)) {
        throw new Error("Regular price must be zero or greater");
      }

      const { data, error } = await client
        .from("service_packages")
        .insert({
          name: cleanName,
          description,
          price_cents: Math.round(priceInput),
          regular_price_cents: regularPriceInput === null ? null : Math.round(regularPriceInput),
        })
        .select("id")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Failed to create service package");

      const packageId = data.id as string;

      const { error: itemsError } = await client
        .from("service_package_items")
        .insert(
          items.map((item) => ({
            package_id: packageId,
            service_id: item.service_id,
            quantity: item.quantity,
          })),
        );

      if (itemsError) throw itemsError;

      return fetchById(packageId);
    },

    async updateServicePackage(id: string, payload: ServicePackagePayload): Promise<ServicePackage> {
      if (!id) throw new Error("Package ID is required");

      const cleanName = payload.name?.trim();
      const priceInput = Number(payload.price_cents);
      const regularPriceInput =
        payload.regular_price_cents === null || payload.regular_price_cents === undefined
          ? null
          : Number(payload.regular_price_cents);
      const description = payload.description?.trim() ?? null;
      const items = sanitizeItems(payload.items ?? []);

      if (!cleanName) throw new Error("Name is required");
      if (!Number.isFinite(priceInput) || priceInput < 0) {
        throw new Error("Price must be zero or greater");
      }
      if (regularPriceInput !== null && (!Number.isFinite(regularPriceInput) || regularPriceInput < 0)) {
        throw new Error("Regular price must be zero or greater");
      }

      const { error } = await client
        .from("service_packages")
        .update({
          name: cleanName,
          description,
          price_cents: Math.round(priceInput),
          regular_price_cents: regularPriceInput === null ? null : Math.round(regularPriceInput),
        })
        .eq("id", id);

      if (error) throw error;

      const { error: deleteError } = await client
        .from("service_package_items")
        .delete()
        .eq("package_id", id);
      if (deleteError) throw deleteError;

      const { error: insertError } = await client
        .from("service_package_items")
        .insert(
          items.map((item) => ({
            package_id: id,
            service_id: item.service_id,
            quantity: item.quantity,
          })),
        );
      if (insertError) throw insertError;

      return fetchById(id);
    },

    async deleteServicePackage(id: string): Promise<void> {
      if (!id) throw new Error("Package ID is required");

      const { error } = await client.from("service_packages").delete().eq("id", id);
      if (error) throw error;
    },
  };
}

export type ServicePackagesRepository = ReturnType<typeof createServicePackagesRepository>;

const defaultRepository = createServicePackagesRepository(supabase);

export const listServicePackages = defaultRepository.listServicePackages;
export const createServicePackage = defaultRepository.createServicePackage;
export const updateServicePackage = defaultRepository.updateServicePackage;
export const deleteServicePackage = defaultRepository.deleteServicePackage;
