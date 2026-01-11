// src/app/login/LoginClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const supabase = useMemo(() => supabaseBrowser(), []);

  const nextUrl = useMemo(() => {
    const n = sp.get("next");
    // basic safety: only allow internal paths
    if (!n || !n.startsWith("/")) return "/";
    return n;
  }, [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("Signing in…");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    setStatus("");
    setLoading(false);
    router.replace(nextUrl);
  }

  async function onSignup(e: React.MouseEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("Creating account…");

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    setStatus("Account created. If email confirmation is enabled, confirm then sign in.");
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold">Login</div>
        {status ? <div className="mt-2 text-sm text-zinc-600">{status}</div> : null}

        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <input
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            Sign in
          </button>

          <button
            disabled={loading}
            onClick={onSignup}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
          >
            Create account
          </button>
        </form>

        <div className="mt-4 text-xs text-zinc-500">
          After signing in you’ll be redirected to:{" "}
          <span className="font-mono text-zinc-700">{nextUrl}</span>
        </div>
      </div>
    </main>
  );
}