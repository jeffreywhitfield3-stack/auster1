// src/app/app/admin/layout.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ADMIN_EMAIL = "jeffreywhitfield3@gmail.com";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email || "";

      if (!alive) return;

      if (!data.session) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/app/admin/blog")}`);
        return;
      }

      if (email !== ADMIN_EMAIL) {
        router.replace("/");
        return;
      }

      setOk(true);
    })();

    return () => {
      alive = false;
    };
  }, [supabase, router, pathname]);

  if (!ok) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Loading…</div>
          <div className="mt-2 text-sm text-zinc-600">Checking admin access.</div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}