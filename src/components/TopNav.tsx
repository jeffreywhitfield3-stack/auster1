"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ADMIN_EMAIL = "jeffreywhitfield3@gmail.com";

export default function TopNav() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }: any) => {
      if (!alive) return;
      setAuthed(!!data?.session);
      setEmail(data?.session?.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, s: any) => {
      setAuthed(!!s);
      setEmail(s?.user?.email ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  const isAdmin = (email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4">
        <Link href="/" className="text-sm font-extrabold tracking-tight text-zinc-900">
          Auster
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
            Pricing
          </Link>

          <Link href="/blog" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
            Blog
          </Link>

          <Link href="/support" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
            Support
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
            >
              Products
            </button>

            {open ? (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg">
                <Link
                  onClick={() => setOpen(false)}
                  href="/products/derivatives"
                  className="block rounded-xl px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
                >
                  Derivatives Lab
                </Link>
                <Link
                  onClick={() => setOpen(false)}
                  href="/products/econ"
                  className="block rounded-xl px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
                >
                  Econ & Econometrics
                </Link>
                <Link
                  onClick={() => setOpen(false)}
                  href="/products/housing"
                  className="block rounded-xl px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
                >
                  Housing Feasibility
                </Link>
                <div className="my-1 h-px bg-zinc-200" />
                <Link
                  onClick={() => setOpen(false)}
                  href="/products/valuation"
                  className="block rounded-xl px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
                >
                  DCF / Valuation Studio
                </Link>
                <Link
                  onClick={() => setOpen(false)}
                  href="/products/portfolio"
                  className="block rounded-xl px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
                >
                  Portfolio & Risk Lab
                </Link>
              </div>
            ) : null}
          </div>

          {authed ? (
            <>
              {isAdmin ? (
                <Link
                  href="/app/admin/blog"
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  Write
                </Link>
              ) : null}

              <Link
                href="/app/projects"
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Projects
              </Link>

              <button
                onClick={signOut}
                className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login?next=/"
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}