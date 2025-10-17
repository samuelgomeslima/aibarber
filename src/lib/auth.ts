import type { Session } from "@supabase/supabase-js";

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

type PendingBarbershopRegistration = {
  barbershopName: string;
  adminFirstName: string;
  adminLastName: string;
  email: string;
  phone: string | null;
  timezone: string;
};

const BARBERSHOPS_TABLE = "barbershops";
const STAFF_TABLE = "staff_members";

const ADMIN_ROLE: StaffRole = "administrator";

const EMAIL_REDIRECT_ENV_KEYS = [
  "EXPO_PUBLIC_EMAIL_CONFIRMATION_REDIRECT_TO",
  "EXPO_PUBLIC_SITE_URL",
  "EXPO_PUBLIC_APP_URL",
  "EXPO_PUBLIC_APP_BASE_URL",
] as const;

const DEFAULT_EMAIL_CONFIRMATION_REDIRECT = "https://localhost:3000";

function normalizeUrl(candidate: string | undefined | null): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  const tryCreate = (value: string) => {
    try {
      return new URL(value).toString();
    } catch (error) {
      return null;
    }
  };

  return tryCreate(trimmed) ?? tryCreate(`https://${trimmed}`);
}

export function getEmailConfirmationRedirectUrl(): string {
  for (const key of EMAIL_REDIRECT_ENV_KEYS) {
    const resolved = normalizeUrl(process.env[key]);
    if (resolved) {
      return resolved;
    }
  }
  return DEFAULT_EMAIL_CONFIRMATION_REDIRECT;
}

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

  const pendingRegistrationMetadata: PendingBarbershopRegistration = {
    barbershopName: name,
    adminFirstName: firstName,
    adminLastName: lastName,
    email,
    phone,
    timezone,
  };

  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailConfirmationRedirectUrl(),
      data: {
        first_name: firstName,
        last_name: lastName,
        pending_barbershop_registration: pendingRegistrationMetadata,
      },
    },
  });

  if (signUpResult.error) {
    throw signUpResult.error;
  }

  const requiresEmailConfirmation = !signUpResult.data.session;

  const registeredUserId = signUpResult.data.session?.user?.id;

  if (!registeredUserId) {
    return { requiresEmailConfirmation };
  }

  const { barbershopId, staffMemberId } = await upsertBarbershopAndAdministrator({
    userId: registeredUserId,
    registration: pendingRegistrationMetadata,
  });

  await clearPendingRegistrationMetadata();

  return {
    requiresEmailConfirmation,
    barbershopId,
    staffMemberId,
  };
}

export async function completePendingBarbershopRegistration(
  session: Session,
): Promise<RegistrationResult | null> {
  const pending = getPendingRegistrationFromMetadata(session);

  if (!pending) {
    return null;
  }

  const { barbershopId, staffMemberId } = await upsertBarbershopAndAdministrator({
    userId: session.user.id,
    registration: pending,
  });

  await clearPendingRegistrationMetadata();

  return {
    requiresEmailConfirmation: false,
    barbershopId,
    staffMemberId,
  };
}

function getPendingRegistrationFromMetadata(session: Session): PendingBarbershopRegistration | null {
  const metadata = session.user.user_metadata?.pending_barbershop_registration;

  if (!metadata) {
    return null;
  }

  const {
    barbershopName,
    adminFirstName,
    adminLastName,
    email,
    phone = null,
    timezone: storedTimezone,
  } = metadata as Partial<PendingBarbershopRegistration>;

  const timezone = storedTimezone || "UTC";

  if (!barbershopName || !adminFirstName || !adminLastName || !email) {
    return null;
  }

  return {
    barbershopName,
    adminFirstName,
    adminLastName,
    email,
    phone,
    timezone,
  };
}

type UpsertBarbershopArgs = {
  userId: string;
  registration: PendingBarbershopRegistration;
};

async function upsertBarbershopAndAdministrator({
  userId,
  registration,
}: UpsertBarbershopArgs): Promise<{ barbershopId: string; staffMemberId: string }> {
  const existingBarbershop = await supabase
    .from(BARBERSHOPS_TABLE)
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (existingBarbershop.error) {
    throw existingBarbershop.error;
  }

  let barbershopId = existingBarbershop.data?.id as string | undefined;

  if (!barbershopId) {
    const insertResult = await supabase
      .from(BARBERSHOPS_TABLE)
      .insert({
        name: registration.barbershopName,
        owner_id: userId,
        timezone: registration.timezone,
      })
      .select("id")
      .single();

    if (insertResult.error) {
      throw insertResult.error;
    }

    barbershopId = insertResult.data?.id as string | undefined;

    if (!barbershopId) {
      throw new Error("Barbershop record could not be created.");
    }
  }

  const existingStaffMember = await supabase
    .from(STAFF_TABLE)
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (existingStaffMember.error) {
    throw existingStaffMember.error;
  }

  let staffMemberId = existingStaffMember.data?.id as string | undefined;

  if (!staffMemberId) {
    const staffInsert = await supabase
      .from(STAFF_TABLE)
      .insert({
        first_name: registration.adminFirstName,
        last_name: registration.adminLastName,
        email: registration.email,
        phone: registration.phone,
        role: ADMIN_ROLE,
        barbershop_id: barbershopId,
        auth_user_id: userId,
      })
      .select("id")
      .single();

    if (staffInsert.error) {
      throw staffInsert.error;
    }

    staffMemberId = staffInsert.data?.id as string | undefined;
  }

  if (!staffMemberId) {
    throw new Error("Staff member record could not be created.");
  }

  return { barbershopId, staffMemberId };
}

async function clearPendingRegistrationMetadata() {
  const { error } = await supabase.auth.updateUser({
    data: { pending_barbershop_registration: null },
  });

  if (error) {
    throw error;
  }
}
