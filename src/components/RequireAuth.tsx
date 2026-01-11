"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

type Status = { kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string };

function withTimeout<T>(promise: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  const nextUrl = useMemo(() => `/login?next=${encodeURIComponent(pathname || "/")}`, [pathname]);

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        setStatus({ kind: "loading" });

        const res = await withTimeout<Awaited<ReturnType<typeof supabase.auth.getSession>>>(
          supabase.auth.getSession(),
          6000,
          "getSession timeout"
        );

        if (!alive) return;

        if (res.error) {
          setStatus({ kind: "error", message: res.error.message });
          return;
        }

        if (!res.data.session) {
          router.replace(nextUrl);
          return;
        }

        setStatus({ kind: "ready" });
      } catch (e: any) {
        if (!alive) return;
        setStatus({ kind: "error", message: String(e?.message || e) });
      }
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      // If user explicitly signs out, or session disappears, bounce to login.
      if (event === "SIGNED_OUT" && alive) {
        router.replace(nextUrl);
        return;
      }
      if (!session && alive) {
        router.replace(nextUrl);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, router, nextUrl]);

  if (status.kind === "ready") return <>{children}</>;

  if (status.kind === "error") {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Auth check issue</div>
          <div className="mt-2 text-sm text-zinc-600">
            {status.message.includes("timeout")
              ? "Session check timed out. This usually means the browser can’t reach Supabase auth or the env vars are missing/incorrect in this environment."
              : status.message}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              onClick={() => router.replace(nextUrl)}
            >
              Go to login
            </button>
            <button
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>

          <div className="mt-4 text-xs text-zinc-500">
            Quick checks:
            <ul className="mt-1 list-disc pl-5">
              <li>
                Vercel env vars: <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
                <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
              </li>
              <li>Supabase Auth → URL Configuration includes your production domain</li>
              <li>Ad blockers / strict privacy settings aren’t blocking the Supabase domain</li>
            </ul>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Loading…</div>
        <div className="mt-2 text-sm text-zinc-600">Checking session.</div>
      </div>
    </main>
  );
}
