import { hasSupabaseCredentials, supabase } from "./supabase";
import type { SupportedLanguage } from "../locales/language";

export type ThemePreferenceSetting = "system" | "light" | "dark";

export type UserSettingsRecord = {
  user_id: string;
  language: SupportedLanguage | null;
  theme_preference: ThemePreferenceSetting | null;
};

export type UserSettingsUpdatePayload = {
  language?: SupportedLanguage | null;
  theme_preference?: ThemePreferenceSetting | null;
};

const USER_SETTINGS_TABLE = "user_settings";

const memoryStore: Record<string, UserSettingsRecord> = {};

function mapRow(row: {
  user_id?: string | null;
  language?: SupportedLanguage | null;
  theme_preference?: ThemePreferenceSetting | null;
} | null | undefined): UserSettingsRecord | null {
  if (!row?.user_id) {
    return null;
  }

  return {
    user_id: row.user_id,
    language: row.language ?? null,
    theme_preference: row.theme_preference ?? null,
  };
}

export async function getUserSettings(userId: string): Promise<UserSettingsRecord | null> {
  if (!userId) {
    return null;
  }

  if (!hasSupabaseCredentials) {
    return memoryStore[userId] ?? null;
  }

  const { data, error } = await supabase
    .from(USER_SETTINGS_TABLE)
    .select("user_id,language,theme_preference")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load user settings", error);
    return memoryStore[userId] ?? null;
  }

  const mapped = mapRow(data ?? null);
  if (mapped) {
    memoryStore[userId] = mapped;
  }

  return mapped;
}

export async function upsertUserSettings(
  userId: string,
  updates: UserSettingsUpdatePayload,
): Promise<UserSettingsRecord | null> {
  if (!userId) {
    return null;
  }

  if (!hasSupabaseCredentials) {
    const current = memoryStore[userId] ?? { user_id: userId, language: null, theme_preference: null };
    const next: UserSettingsRecord = {
      user_id: userId,
      language: updates.language ?? current.language ?? null,
      theme_preference: updates.theme_preference ?? current.theme_preference ?? null,
    };
    memoryStore[userId] = next;
    return next;
  }

  const payload = {
    user_id: userId,
    ...updates,
  };

  const { data, error } = await supabase
    .from(USER_SETTINGS_TABLE)
    .upsert(payload, { onConflict: "user_id" })
    .select("user_id,language,theme_preference")
    .maybeSingle();

  if (error) {
    console.error("Failed to save user settings", error);
    return memoryStore[userId] ?? null;
  }

  const mapped = mapRow(data ?? null);
  if (mapped) {
    memoryStore[userId] = mapped;
  }

  return mapped;
}
