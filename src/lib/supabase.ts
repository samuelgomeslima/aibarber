import { createClient } from "@supabase/supabase-js";

function readEnv(name: "EXPO_PUBLIC_SUPABASE_URL" | "EXPO_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Supabase configuration missing required environment variable: ${name}`);
  }
  return value;
}

const url = readEnv("EXPO_PUBLIC_SUPABASE_URL");
const key = readEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

export const supabase = createClient(url, key);
