import type { SupabaseClientLike } from "./supabase";
import { supabase } from "./supabase";
import { requireCurrentBarbershopId } from "./activeBarbershop";

export const STAFF_ROLES = ["administrator", "manager", "professional", "assistant"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export type StaffMember = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  role: StaffRole;
};

const STAFF_TABLE = "staff_members";

type StaffInsertPayload = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  role: StaffRole;
};

type StaffUpdatePayload = Partial<Omit<StaffInsertPayload, "role">> & { role?: StaffRole };

export function createStaffRepository(client: SupabaseClientLike) {
  return {
    async listMembers(): Promise<StaffMember[]> {
      const barbershopId = await requireCurrentBarbershopId();
      const { data, error } = await client
        .from(STAFF_TABLE)
        .select("id,first_name,last_name,email,phone,date_of_birth,role")
        .eq("barbershop_id", barbershopId)
        .order("first_name");

      if (error) throw error;
      return (data ?? []) as StaffMember[];
    },

    async createMember(payload: StaffInsertPayload): Promise<StaffMember> {
      const barbershopId = await requireCurrentBarbershopId();
      const { data, error } = await client
        .from(STAFF_TABLE)
        .insert({ ...payload, barbershop_id: barbershopId })
        .select("id,first_name,last_name,email,phone,date_of_birth,role")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Staff member not created");
      return data as StaffMember;
    },

    async updateMember(id: string, payload: StaffUpdatePayload): Promise<StaffMember> {
      if (!id?.trim()) throw new Error("Staff member id is required");
      const barbershopId = await requireCurrentBarbershopId();

      const { data, error } = await client
        .from(STAFF_TABLE)
        .update(payload)
        .eq("id", id)
        .eq("barbershop_id", barbershopId)
        .select("id,first_name,last_name,email,phone,date_of_birth,role")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Staff member not found");
      return data as StaffMember;
    },
  };
}

const defaultRepository = createStaffRepository(supabase);

export const listStaffMembers = defaultRepository.listMembers;
export const createStaffMember = defaultRepository.createMember;
export const updateStaffMember = defaultRepository.updateMember;
