// src/app/pricing/page.tsx
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isActiveStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

export default async function PricingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let paid = false;

  if (user) {
    // This assumes your server client can read these tables with RLS policies,
    // OR you can keep it simple and rely on checkout route guard.
    // If you already have RLS for user read on entitlements/subscriptions, this works.
    const { data: ent } = await supabase
      .from("entitlements")
      .select("is_paid, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: sub } = await supabase
      .from("stripe_subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    paid = Boolean(ent?.is_paid) || ent?.plan === "pro" || isActiveStatus(sub?.status);
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="text-3xl font-semibold tracking-tight text-zinc-900">Pricing</div>
        <div className="mt-2 text-sm text-zinc-600">
          One subscription unlocks full sitewide access to all labs and tools.
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold text-zinc-900">Pro Monthly</div>
            <div className="mt-2 text-3xl font-extrabold text-zinc-900">$29</div>
            <div className="mt-1 text-sm text-zinc-600">per month</div>

            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li>• Unlimited access across the entire platform</li>
              <li>• Priority improvements and feature updates</li>
              <li>• Cancel anytime</li>
            </ul>

            <div className="mt-5">
              {!user ? (
                <Link
                  href="/login?next=/pricing"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Sign in to subscribe
                </Link>
              ) : paid ? (
                <Link
                  href="/api/billing/portal"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Manage subscription
                </Link>
              ) : (
                <Link
                  href="/api/billing/checkout?plan=monthly"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Start monthly
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold text-zinc-900">Pro Annual</div>
            <div className="mt-2 text-3xl font-extrabold text-zinc-900">$288</div>
            <div className="mt-1 text-sm text-zinc-600">per year (save vs monthly)</div>

            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li>• Everything in Pro Monthly</li>
              <li>• Best value plan</li>
              <li>• Cancel anytime</li>
            </ul>

            <div className="mt-5">
              {!user ? (
                <Link
                  href="/login?next=/pricing"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  Sign in to subscribe
                </Link>
              ) : paid ? (
                <Link
                  href="/api/billing/portal"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  Manage subscription
                </Link>
              ) : (
                <Link
                  href="/api/billing/checkout?plan=annual"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  Start annual
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-zinc-600">
          Need help? Visit{" "}
          <Link href="/support" className="font-semibold text-zinc-900 underline">
            Support
          </Link>
          .
        </div>
      </div>
    </main>
  );
}