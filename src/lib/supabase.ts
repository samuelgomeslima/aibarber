import { createClient, SupabaseClient } from '@supabase/supabase-js';

type SupabaseConfigResponse = {
  supabaseUrl?: string;
  [key: string]: unknown;
};

let cachedClient: SupabaseClient | null = null;
let creatingClient: Promise<SupabaseClient> | null = null;

const DEFAULT_ENDPOINT = '/api/supabase-url';

function normaliseBaseUrl(baseUrl?: string | null): string {
  if (!baseUrl) {
    return '';
  }

  if (baseUrl.endsWith('/')) {
    return baseUrl.slice(0, -1);
  }

  return baseUrl;
}

async function fetchSupabaseUrl(): Promise<string> {
  const baseUrl = normaliseBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  const endpoint = process.env.EXPO_PUBLIC_SUPABASE_CONFIG_ENDPOINT || DEFAULT_ENDPOINT;
  const prefix = endpoint.startsWith('/') ? '' : '/';
  const requestUrl = `${baseUrl}${prefix}${endpoint}`;

  const response = await fetch(requestUrl);
  if (!response.ok) {
    throw new Error(`Failed to load Supabase configuration (status ${response.status}).`);
  }

  const data: SupabaseConfigResponse = await response.json();
  const supabaseUrl = typeof data.supabaseUrl === 'string' ? data.supabaseUrl.trim() : '';

  if (!supabaseUrl) {
    throw new Error('The Supabase configuration endpoint returned an empty URL.');
  }

  return supabaseUrl;
}

export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (cachedClient) {
    return cachedClient;
  }

  if (!creatingClient) {
    creatingClient = (async () => {
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!anonKey) {
        throw new Error('Supabase anonymous key is not configured.');
      }

      const url = await fetchSupabaseUrl();
      cachedClient = createClient(url, anonKey);
      return cachedClient;
    })().finally(() => {
      creatingClient = null;
    });
  }

  return creatingClient;
}
