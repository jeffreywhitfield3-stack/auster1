// src/components/StartExploringButton.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function StartExploringButton() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    }
    checkAuth();
  }, []);

  // Show loading state while checking auth
  if (isLoggedIn === null) {
    return (
      <button
        disabled
        className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-zinc-900 shadow-lg opacity-50 cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  // If logged in, go to derivatives lab; if not, go to login
  const href = isLoggedIn ? "/products/derivatives" : "/login";

  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-zinc-900 shadow-lg transition-all hover:bg-zinc-100"
    >
      Start exploring →
    </Link>
  );
}
