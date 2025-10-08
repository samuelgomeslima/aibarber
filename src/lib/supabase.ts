import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const missingConfigMessage = 'Supabase configuration is missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.';

const createUnconfiguredClient = (): SupabaseClient => {
  const fail = () => {
    throw new Error(missingConfigMessage);
  };

  return new Proxy(
    {},
    {
      get() {
        fail();
      },
      apply() {
        fail();
      },
    },
  ) as SupabaseClient;
};

if (!url || !key) {
  console.error('Supabase environment variables are missing', {
    hasUrl: Boolean(url),
    hasKey: Boolean(key),
  });
}

export const supabase: SupabaseClient =
  url && key ? createClient(url, key) : createUnconfiguredClient();
export const isSupabaseConfigured = Boolean(url && key);
