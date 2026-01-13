// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";

export async function supabaseServer() {
  // Next 16 can return a promise in some contexts
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createSupabaseServerClient(url, anon, {
    cookies: {
      getAll() {
        // Some Next versions/types can be picky; this keeps it resilient.
        // cookieStore.getAll() exists in modern Next.
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In Server Components (like layouts), setting cookies can throw or be ignored.
        // That's OK: your proxy (updateSession) is responsible for refresh/rotation.
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // noop
        }
      },
    },
  });
}

// Alias for convenience
export { supabaseServer as createServerClient };