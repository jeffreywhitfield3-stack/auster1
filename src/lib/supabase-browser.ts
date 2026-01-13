"use client";

import { createBrowserClient as createClient } from "@supabase/ssr";

let cached: ReturnType<typeof createClient> | null = null;

export function supabaseBrowser() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  cached = createClient(url, anon);
  return cached;
}

// Export as createBrowserClient for convenience
export function createBrowserClient() {
  return supabaseBrowser();
}
