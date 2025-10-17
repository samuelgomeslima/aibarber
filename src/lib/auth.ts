import { supabase } from "./supabase";
import type { StaffRole } from "./users";

export type RegistrationPayload = {
  barbershopName: string;
  adminFirstName: string;
  adminLastName: string;
  email: string;
  password: string;
  phone?: string;
  timezone?: string;
};

export type RegistrationResult = {
  requiresEmailConfirmation: boolean;
  barbershopId?: string;
  staffMemberId?: string;
};

const BARBERSHOPS_TABLE = "barbershops";
const STAFF_TABLE = "staff_members";

const ADMIN_ROLE: StaffRole = "administrator";

export async function registerBarbershopAdministrator(
  payload: RegistrationPayload,
): Promise<RegistrationResult> {
  const name = payload.barbershopName.trim();
  const firstName = payload.adminFirstName.trim();
  const lastName = payload.adminLastName.trim();
  const email = payload.email.trim().toLowerCase();
  const password = payload.password;
  const phone = payload.phone?.trim() || null;
  const timezone = payload.timezone?.trim() || "UTC";

  if (!name) {
    throw new Error("Barbershop name is required.");
  }
  if (!firstName || !lastName) {
    throw new Error("Administrator first and last name are required.");
  }
  if (!email) {
    throw new Error("Administrator email is required.");
  }
  if (!password) {
    throw new Error("Password is required.");
  }

  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (signUpResult.error) {
    throw signUpResult.error;
  }

  const requiresEmailConfirmation = !signUpResult.data.session;

  if (!signUpResult.data.session?.user?.id) {
    return { requiresEmailConfirmation };
  }

  const registeredUserId = signUpResult.data.session.user.id;

  const barbershopInsert = await supabase
    .from(BARBERSHOPS_TABLE)
    .insert({
      name,
      owner_id: registeredUserId,
      timezone,
    })
    .select("id")
    .single();

  if (barbershopInsert.error) {
    throw barbershopInsert.error;
  }

  const barbershopId = barbershopInsert.data?.id as string | undefined;

  if (!barbershopId) {
    throw new Error("Barbershop record could not be created.");
  }

  const staffInsert = await supabase
    .from(STAFF_TABLE)
    .insert({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      role: ADMIN_ROLE,
      barbershop_id: barbershopId,
      auth_user_id: registeredUserId,
    })
    .select("id")
    .single();

  if (staffInsert.error) {
    await supabase.from(BARBERSHOPS_TABLE).delete().eq("id", barbershopId);
    throw staffInsert.error;
  }

  const staffMemberId = staffInsert.data?.id as string | undefined;

  return {
    requiresEmailConfirmation,
    barbershopId,
    staffMemberId,
  };
}
