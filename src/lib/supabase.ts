import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseClientConfig = {
  url: string;
  anonKey: string;
};

export type SupabaseClientFactory = typeof createClient;

export type SupabaseClientLike = Pick<SupabaseClient, "from">;

export function createSupabaseClient(
  config: SupabaseClientConfig,
  clientFactory: SupabaseClientFactory = createClient,
): SupabaseClient {
  const { url, anonKey } = config;

  if (!url || !anonKey) {
    console.error("Supabase env missing", { url, hasKey: !!anonKey });
  }

  return clientFactory(url, anonKey);
}

const defaultConfig: SupabaseClientConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const hasSupabaseCredentials = Boolean(defaultConfig.url && defaultConfig.anonKey);

export function isSupabaseConfigured() {
  return hasSupabaseCredentials;
}

function createUnconfiguredClient(): SupabaseClient {
  const message = "Supabase client is not configured";
  const handler = () => {
    throw new Error(message);
  };
  return {
    from: handler as SupabaseClient["from"],
    rpc: handler as SupabaseClient["rpc"],
  } as SupabaseClient;
}

export const supabase = hasSupabaseCredentials
  ? createSupabaseClient(defaultConfig)
  : createUnconfiguredClient();
