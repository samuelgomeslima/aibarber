import type { SupabaseClientLike } from "./supabase";
import { supabase } from "./supabase";
import type { Service } from "./domain";

export type DbService = {
  id: string;
  name: string;
  estimated_minutes: number;
  price_cents: number;
  icon: string;
  created_at: string | null;
};

export type ServicesRepository = ReturnType<typeof createServicesRepository>;

export function createServicesRepository(client: SupabaseClientLike) {
  return {
    async listServices(): Promise<Service[]> {
      const { data, error } = await client
        .from("services")
        .select("id,name,estimated_minutes,price_cents,icon,created_at")
        .order("name");
      if (error) throw error;
      const rows = (data ?? []) as DbService[];
      return rows.map((row) => {
        const minutes = Number(row.estimated_minutes);
        const price = Number(row.price_cents);
        return {
          id: row.id,
          name: row.name,
          estimated_minutes:
            Number.isFinite(minutes)
              ? minutes
              : Number.parseInt(String(row.estimated_minutes ?? 0), 10) || 0,
          price_cents:
            Number.isFinite(price)
              ? price
              : Number.parseInt(String(row.price_cents ?? 0), 10) || 0,
          icon: (row.icon || "content-cut") as Service["icon"],
          created_at: row.created_at ?? null,
        };
      });
    },

    async createService(payload: {
      name: string;
      estimated_minutes: number;
      price_cents: number;
      icon: Service["icon"];
    }): Promise<Service> {
      const cleanName = payload.name?.trim();
      const minutesInput = Number(payload.estimated_minutes);
      const priceInput = Number(payload.price_cents);

      if (!cleanName) throw new Error("Name is required");
      if (!Number.isFinite(minutesInput) || minutesInput <= 0) {
        throw new Error("Estimated minutes must be greater than 0");
      }
      if (!Number.isFinite(priceInput) || priceInput < 0) {
        throw new Error("Price must be 0 or more");
      }

      const { data, error } = await client
        .from("services")
        .insert({
          name: cleanName,
          estimated_minutes: Math.round(minutesInput),
          price_cents: Math.round(priceInput),
          icon: payload.icon,
        })
        .select("id,name,estimated_minutes,price_cents,icon,created_at")
        .single();

      if (error) throw error;

      const minutes = Number(data!.estimated_minutes);
      const price = Number(data!.price_cents);

      return {
        id: data!.id,
        name: data!.name,
        estimated_minutes:
          Number.isFinite(minutes)
            ? minutes
            : Number.parseInt(String(data!.estimated_minutes ?? 0), 10) || 0,
        price_cents:
          Number.isFinite(price)
            ? price
            : Number.parseInt(String(data!.price_cents ?? 0), 10) || 0,
        icon: (data!.icon || "content-cut") as Service["icon"],
        created_at: data!.created_at ?? null,
      };
    },

    async updateService(
      id: string,
      payload: {
        name: string;
        estimated_minutes: number;
        price_cents: number;
        icon: Service["icon"];
      },
    ): Promise<Service> {
      const cleanName = payload.name?.trim();
      const minutesInput = Number(payload.estimated_minutes);
      const priceInput = Number(payload.price_cents);

      if (!id) throw new Error("Service ID is required");
      if (!cleanName) throw new Error("Name is required");
      if (!Number.isFinite(minutesInput) || minutesInput <= 0) {
        throw new Error("Estimated minutes must be greater than 0");
      }
      if (!Number.isFinite(priceInput) || priceInput < 0) {
        throw new Error("Price must be 0 or more");
      }

      const { data, error } = await client
        .from("services")
        .update({
          name: cleanName,
          estimated_minutes: Math.round(minutesInput),
          price_cents: Math.round(priceInput),
          icon: payload.icon,
        })
        .eq("id", id)
        .select("id,name,estimated_minutes,price_cents,icon,created_at")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Service not found");

      const minutes = Number(data.estimated_minutes);
      const price = Number(data.price_cents);

      return {
        id: data.id,
        name: data.name,
        estimated_minutes:
          Number.isFinite(minutes)
            ? minutes
            : Number.parseInt(String(data.estimated_minutes ?? 0), 10) || 0,
        price_cents:
          Number.isFinite(price)
            ? price
            : Number.parseInt(String(data.price_cents ?? 0), 10) || 0,
        icon: (data.icon || "content-cut") as Service["icon"],
        created_at: data.created_at ?? null,
      };
    },

    async deleteService(id: string): Promise<void> {
      if (!id) throw new Error("Service ID is required");

      const { error } = await client.from("services").delete().eq("id", id);
      if (error) {
        const errorCode =
          typeof error === "object" && error !== null && "code" in error
            ? String((error as { code?: string | number }).code ?? "")
            : "";
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: string }).message ?? "")
            : "";

        const isForeignKeyViolation =
          errorCode === "23503" ||
          errorCode === "PGRST116" ||
          errorMessage.toLowerCase().includes("violates foreign key constraint") ||
          errorMessage.toLowerCase().includes("is still referenced");

        if (isForeignKeyViolation) {
          throw new Error("This service is currently being used and cannot be deleted.");
        }

        throw error;
      }
    },
  };
}

const defaultRepository = createServicesRepository(supabase);

export const listServices = defaultRepository.listServices;
export const createService = defaultRepository.createService;
export const updateService = defaultRepository.updateService;
export const deleteService = defaultRepository.deleteService;

