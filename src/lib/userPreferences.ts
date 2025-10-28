import type { SupportedLanguage } from "../locales/language";
import { isSupportedLanguage } from "../locales/language";
import type { ThemePreference } from "../theme/preferences";
import { isThemePreference } from "../theme/preferences";
import type { SupabaseClientLike } from "./supabase";
import { supabase } from "./supabase";

const TABLE = "user_preferences";

type PreferencesRow = {
  user_id: string;
  language: SupportedLanguage | null;
  appearance: ThemePreference | null;
};

export type UserPreferences = {
  language?: SupportedLanguage;
  appearance?: ThemePreference;
};

export type UserPreferencesUpdate = Partial<UserPreferences>;

function parsePreferences(row: PreferencesRow | null | undefined): UserPreferences | null {
  if (!row) {
    return null;
  }

  const result: UserPreferences = {};

  if (isSupportedLanguage(row.language)) {
    result.language = row.language;
  }

  if (isThemePreference(row.appearance)) {
    result.appearance = row.appearance;
  }

  return Object.keys(result).length > 0 ? result : {};
}

export async function fetchUserPreferences(
  userId: string,
  client: SupabaseClientLike = supabase,
): Promise<UserPreferences | null> {
  if (!userId?.trim()) {
    throw new Error("User id is required to fetch preferences");
  }

  const { data, error, status } = await client
    .from(TABLE)
    .select("language,appearance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && status !== 406) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return parsePreferences(data as PreferencesRow);
}

export async function saveUserPreferences(
  userId: string,
  updates: UserPreferencesUpdate,
  client: SupabaseClientLike = supabase,
): Promise<UserPreferences> {
  if (!userId?.trim()) {
    throw new Error("User id is required to update preferences");
  }

  const payload: Partial<PreferencesRow> = {};

  if (updates.language) {
    payload.language = updates.language;
  }

  if (updates.appearance) {
    payload.appearance = updates.appearance;
  }

  if (!Object.keys(payload).length) {
    const existing = await fetchUserPreferences(userId, client);
    return existing ?? {};
  }

  const existingResult = await client
    .from(TABLE)
    .select("language,appearance")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingResult.error && existingResult.status !== 406) {
    throw existingResult.error;
  }

  if (!existingResult.data) {
    const { data, error } = await client
      .from(TABLE)
      .insert({ user_id: userId, ...payload })
      .select("language,appearance")
      .single();

    if (error) {
      throw error;
    }

    return parsePreferences(data as PreferencesRow) ?? {};
  }

  const { data, error } = await client
    .from(TABLE)
    .update(payload)
    .eq("user_id", userId)
    .select("language,appearance")
    .single();

  if (error) {
    throw error;
  }

  return parsePreferences(data as PreferencesRow) ?? {};
}
