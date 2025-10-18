import { hasSupabaseCredentials, supabase } from "./supabase";

let cachedBarbershopId: string | null = null;
let hasResolvedBarbershopId = false;
let pendingRequest: Promise<string | null> | null = null;

async function fetchCurrentBarbershopId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  const userId = data.user?.id;
  if (!userId) {
    return null;
  }

  const { data: staffMember, error: staffError } = await supabase
    .from("staff_members")
    .select("barbershop_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (staffError) {
    throw staffError;
  }

  const staffBarbershopId = typeof staffMember?.barbershop_id === "string" ? staffMember.barbershop_id : null;
  if (staffBarbershopId) {
    return staffBarbershopId;
  }

  const { data: ownedShop, error: ownerError } = await supabase
    .from("barbershops")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (ownerError) {
    throw ownerError;
  }

  const ownedBarbershopId = typeof ownedShop?.id === "string" ? ownedShop.id : null;
  return ownedBarbershopId;
}

async function loadBarbershopId(refresh: boolean): Promise<string | null> {
  if (!hasSupabaseCredentials) {
    return null;
  }

  if (!refresh && hasResolvedBarbershopId) {
    return cachedBarbershopId;
  }

  if (!pendingRequest) {
    pendingRequest = fetchCurrentBarbershopId()
      .then((id) => {
        cachedBarbershopId = id;
        hasResolvedBarbershopId = true;
        return cachedBarbershopId;
      })
      .catch((error) => {
        hasResolvedBarbershopId = false;
        cachedBarbershopId = null;
        throw error;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }

  return pendingRequest;
}

export async function getCurrentBarbershopId(options?: { refresh?: boolean }): Promise<string | null> {
  return loadBarbershopId(options?.refresh ?? false);
}

export async function requireCurrentBarbershopId(options?: { refresh?: boolean }): Promise<string> {
  const id = await getCurrentBarbershopId(options);
  if (!id) {
    throw new Error("No barbershop is associated with the current user.");
  }
  return id;
}

export function setCurrentBarbershopId(id: string | null): void {
  cachedBarbershopId = id;
  hasResolvedBarbershopId = true;
}

export function clearCurrentBarbershopCache(): void {
  cachedBarbershopId = null;
  hasResolvedBarbershopId = false;
  pendingRequest = null;
}
