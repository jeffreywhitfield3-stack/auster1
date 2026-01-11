"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ADMIN_EMAIL = "jeffreywhitfield3@gmail.com";

export default function TopNav() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [productsOpen, setProductsOpen] = useState(false);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setProductsOpen(false);
    if (productsOpen) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [productsOpen]);

  const products = [
    {
      name: "Research Stage",
      href: "/research",
      description: "Public research institution & attribution",
      icon: "🔬",
      badge: "NEW",
    },
    {
      name: "Derivatives Lab",
      href: "/products/derivatives",
      description: "Options chain, strategy builder, screeners",
      icon: "📊",
    },
    {
      name: "Econ Lab",
      href: "/products/econ",
      description: "Economic research environment",
      icon: "🏛",
    },
  ];

  return (
    <div className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-zinc-900">Auster</span>
          <span className="hidden text-xs font-medium text-zinc-500 sm:block">RESEARCH</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {/* Products Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setProductsOpen(!productsOpen);
              }}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              Products
              <svg
                className={`h-4 w-4 transition-transform ${productsOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {productsOpen && (
              <div className="absolute left-0 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
                {products.map((product) => (
                  <div key={product.href}>
                    <Link
                      href={product.href}
                      onClick={() => setProductsOpen(false)}
                      className="group block rounded-lg p-3 transition-colors hover:bg-zinc-50"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{product.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 group-hover:text-zinc-900">
                            <span>{product.name}</span>
                            {"badge" in product && product.badge && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                                {product.badge}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-600">
                            {product.description}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/pricing"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            Pricing
          </Link>

          <Link
            href="/blog"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            Blog
          </Link>

          <Link
            href="/support"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            Support
          </Link>
        </nav>

        {/* Auth Actions */}
        <div className="flex items-center gap-2">
          {authed ? (
            <>
              {isAdmin && (
                <Link
                  href="/app/admin/blog"
                  className="hidden rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 sm:block"
                >
                  Write
                </Link>
              )}

              <Link
                href="/app/projects"
                className="hidden rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 sm:block"
              >
                Projects
              </Link>

              <button
                onClick={signOut}
                className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login?next=/"
              className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
