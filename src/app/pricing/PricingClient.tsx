"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Badge } from "@/components/ui";

type Entitlement = { isPaid: boolean; plan: string | null; status: string | null };

export default function PricingClient({ authedEmail }: { authedEmail: string | null }) {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [ent, setEnt] = useState<Entitlement>({ isPaid: false, plan: null, status: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/billing/entitlement", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (alive) setEnt({ isPaid: !!j.isPaid, plan: j.plan ?? null, status: j.status ?? null });
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const price = useMemo(() => {
    return billing === "annual" ? { main: "$24", sub: "/mo billed annually", note: "Save ~20%" } : { main: "$29", sub: "/mo", note: "" };
  }, [billing]);

  const ctaHref =
    billing === "annual" ? "/api/billing/checkout?plan=annual" : "/api/billing/checkout?plan=monthly";

  return (
    <main className="mx-auto max-w-6xl p-6 pb-24">
      <div className="mb-10">
        <div className="flex items-center gap-2">
          <Badge>Pricing</Badge>
          <div className="text-sm text-zinc-600">One subscription, full platform access</div>
        </div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900">
          Unlock every lab with Austerian Pro
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          Derivatives, valuation, portfolio risk, macro & econometrics, and housing feasibility — all in one place.
          Build faster, understand deeper, and stop juggling tools.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                billing === "monthly" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                billing === "annual" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              Annual <span className="ml-2 text-xs opacity-90">(best value)</span>
            </button>
          </div>

          {price.note ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
              {price.note}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Free */}
        <Card className="p-6">
          <div className="text-sm font-semibold text-zinc-900">Free</div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">$0</div>
          <div className="mt-1 text-sm text-zinc-600">Explore the platform with daily quotas</div>

          <ul className="mt-5 space-y-2 text-sm text-zinc-700">
            <li>• Access to all labs (quota-limited)</li>
            <li>• Build and test workflows</li>
            <li>• Learn with tooltips & examples</li>
          </ul>

          <div className="mt-6">
            <Link
              href={authedEmail ? "/products/derivatives" : "/login?next=/products/derivatives"}
              className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Start free
            </Link>
          </div>
        </Card>

        {/* Pro */}
        <Card className="p-6 ring-1 ring-zinc-900">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-900">Austerian Pro</div>
            <Badge>Most popular</Badge>
          </div>

          <div className="mt-2 flex items-end gap-2">
            <div className="text-4xl font-extrabold text-zinc-900">{price.main}</div>
            <div className="pb-1 text-sm text-zinc-600">{price.sub}</div>
          </div>

          <div className="mt-1 text-sm text-zinc-600">Unlimited access across the entire platform</div>

          <ul className="mt-5 space-y-2 text-sm text-zinc-700">
            <li>• Unlimited runs across all labs</li>
            <li>• Unlimited projects & saves</li>
            <li>• Full data depth (where available)</li>
            <li>• Priority reliability for compute routes</li>
          </ul>

          <div className="mt-6 space-y-2">
            {ent.isPaid ? (
              <a
                href="/api/billing/portal"
                className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Manage subscription
              </a>
            ) : authedEmail ? (
              <a
                href={ctaHref}
                className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Upgrade to Pro
              </a>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent("/pricing")}`}
                className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Sign in to upgrade
              </Link>
            )}

            <div className="text-xs text-zinc-500">
              Cancel anytime from the billing portal. No lock-in.
            </div>
          </div>
        </Card>

        {/* Sponsored */}
        <Card className="p-6">
          <div className="text-sm font-semibold text-zinc-900">Sponsored Access</div>
          <div className="mt-2 text-3xl font-extrabold text-zinc-900">Request</div>
          <div className="mt-1 text-sm text-zinc-600">
            For students and under-resourced individuals — if money is the barrier, we still want you building.
          </div>

          <ul className="mt-5 space-y-2 text-sm text-zinc-700">
            <li>• Free Pro access (reviewed manually)</li>
            <li>• Great for classes, research, and job prep</li>
            <li>• Case studies may be featured (optional)</li>
          </ul>

          <div className="mt-6">
            <a
              href="mailto:info@austerian.com?subject=Sponsored%20Access%20Request&body=Hi%20Austerian%2C%0A%0AHere%E2%80%99s%20what%20I%20want%20to%20use%20Austerian%20for%3A%0A%0A-%20%0A%0AI%E2%80%99m%20requesting%20sponsored%20access%20because%3A%0A%0A-%20%0A"
              className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Email info@austerian.com
            </a>
          </div>
        </Card>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="text-sm font-semibold text-zinc-900">What you get with Pro</div>
          <p className="mt-2 text-sm text-zinc-600">
            Pro is designed to replace multiple tools. You’ll have unlimited access to every product page and
            compute-heavy feature across the platform.
          </p>
          <div className="mt-4 grid gap-2 text-sm text-zinc-700">
            <div>• Derivatives Lab: chain, strategies, payoff grids</div>
            <div>• Valuation Studio: DCF + scenario analysis</div>
            <div>• Portfolio Lab: VaR, CVaR, correlations, drawdowns</div>
            <div>• Econ & Econometrics: live macro + calculations</div>
            <div>• Housing: feasibility + market screening</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-semibold text-zinc-900">FAQ</div>
          <div className="mt-3 space-y-3 text-sm text-zinc-700">
            <div>
              <div className="font-semibold">Can I cancel anytime?</div>
              <div className="text-zinc-600">Yes — manage/cancel in the billing portal.</div>
            </div>
            <div>
              <div className="font-semibold">Do you offer refunds?</div>
              <div className="text-zinc-600">If something goes wrong, email support@austerian.com.</div>
            </div>
            <div>
              <div className="font-semibold">I’m a student — can I get access?</div>
              <div className="text-zinc-600">
                Yes. Email info@austerian.com with what you’re building and we’ll review a sponsored request.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}