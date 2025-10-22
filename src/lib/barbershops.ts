import type { SupabaseClientLike } from "./supabase";
import { supabase } from "./supabase";
import { DEFAULT_TIMEZONE } from "./timezone";

const BARBERSHOPS_TABLE = "barbershops";

export type BarbershopRow = {
  id: string;
  name: string;
  slug: string | null;
  timezone: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Barbershop = {
  id: string;
  name: string;
  slug: string | null;
  timezone: string;
  created_at: string | null;
  updated_at: string | null;
};

export type UpdateBarbershopPayload = {
  name?: string;
  slug?: string | null;
  timezone?: string;
};

function normalizeBarbershop(row: BarbershopRow): Barbershop {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
    timezone: row.timezone ?? DEFAULT_TIMEZONE,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export function createBarbershopRepository(client: SupabaseClientLike) {
  return {
    async getBarbershopForOwner(ownerId: string): Promise<Barbershop | null> {
      const trimmedOwner = ownerId?.trim();
      if (!trimmedOwner) {
        throw new Error("Owner id is required");
      }

      const { data, error } = await client
        .from(BARBERSHOPS_TABLE)
        .select("id,name,slug,timezone,created_at,updated_at")
        .eq("owner_id", trimmedOwner)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return normalizeBarbershop(data as BarbershopRow);
    },

    async updateBarbershop(id: string, payload: UpdateBarbershopPayload): Promise<Barbershop> {
      const trimmedId = id?.trim();
      if (!trimmedId) {
        throw new Error("Barbershop id is required");
      }

      const updates: Record<string, unknown> = {};

      if (payload.name !== undefined) {
        const trimmedName = payload.name.trim();
        if (!trimmedName) {
          throw new Error("Barbershop name is required");
        }
        updates.name = trimmedName;
      }

      if (payload.slug !== undefined) {
        const trimmedSlug = payload.slug?.trim();
        updates.slug = trimmedSlug ? trimmedSlug : null;
      }

      if (payload.timezone !== undefined) {
        const trimmedTz = payload.timezone.trim();
        if (!trimmedTz) {
          throw new Error("Timezone is required");
        }
        updates.timezone = trimmedTz;
      }

      if (Object.keys(updates).length === 0) {
        throw new Error("No updates provided");
      }

      const { data, error } = await client
        .from(BARBERSHOPS_TABLE)
        .update(updates)
        .eq("id", trimmedId)
        .select("id,name,slug,timezone,created_at,updated_at")
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Barbershop not found");
      }

      return normalizeBarbershop(data as BarbershopRow);
    },
  };
}

const defaultRepository = createBarbershopRepository(supabase);

export const getBarbershopForOwner = defaultRepository.getBarbershopForOwner;
export const updateBarbershop = defaultRepository.updateBarbershop;
