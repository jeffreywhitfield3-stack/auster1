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
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      {/* Hero Section */}
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              SIMPLE PRICING
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
              One subscription.<br />Everything included.
            </h1>
            <p className="mt-6 text-xl leading-8 text-zinc-600">
              Get access to every lab, tool, and feature we have. No tiers, no add-ons, no surprises.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Monthly Plan */}
            <div className="relative rounded-2xl border-2 border-zinc-200 bg-white p-8 shadow-sm hover:border-zinc-300 hover:shadow-md transition-all">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Pro Monthly
                </h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight text-zinc-900">$29</span>
                  <span className="text-lg text-zinc-600">/month</span>
                </div>
                <p className="mt-2 text-sm text-zinc-600">Billed monthly - Cancel anytime</p>
              </div>

              <ul className="mt-8 space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-zinc-700">
                    <strong className="font-semibold text-zinc-900">Unlimited access</strong> to all labs - Derivatives, Econ, Housing, Portfolio, and Valuation
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-zinc-700">
                    <strong className="font-semibold text-zinc-900">Full Research Stage access</strong> - publish, discuss, and collaborate
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-zinc-700">
                    <strong className="font-semibold text-zinc-900">Save & load workspaces</strong> across all products
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-zinc-700">
                    <strong className="font-semibold text-zinc-900">Priority support</strong> and feature requests
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-zinc-700">
                    <strong className="font-semibold text-zinc-900">Early access</strong> to new features and tools
                  </span>
                </li>
              </ul>

              <div className="mt-8">
                {!user ? (
                  <Link
                    href="/login?next=/pricing"
                    className="flex w-full items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
                  >
                    Sign in to subscribe
                  </Link>
                ) : paid ? (
                  <Link
                    href="/api/billing/portal"
                    className="flex w-full items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
                  >
                    Manage subscription
                  </Link>
                ) : (
                  <Link
                    href="/api/billing/checkout?plan=monthly"
                    className="flex w-full items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
                  >
                    Start monthly plan
                  </Link>
                )}
              </div>
            </div>

            {/* Annual Plan - Featured */}
            <div className="relative rounded-2xl border-2 border-blue-600 bg-gradient-to-b from-blue-50 to-white p-8 shadow-lg">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                  BEST VALUE - SAVE $60
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                  Pro Annual
                </h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight text-zinc-900">$288</span>
                  <span className="text-lg text-zinc-600">/year</span>
                </div>
                <p className="mt-2 text-sm text-zinc-600">
                  Just $24/month - Billed annually - Cancel anytime
                </p>
              </div>

              <ul className="mt-8 space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-zinc-900">
                    Everything in Pro Monthly
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-zinc-700">
                    <strong className="font-semibold text-zinc-900">Save $60 per year</strong> vs monthly billing
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-zinc-700">
                    <strong className="font-semibold text-zinc-900">Lock in your rate</strong> - no mid-year price changes
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-zinc-700">
                    <strong className="font-semibold text-zinc-900">Less billing hassle</strong> - one charge per year
                  </span>
                </li>
              </ul>

              <div className="mt-8">
                {!user ? (
                  <Link
                    href="/login?next=/pricing"
                    className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    Sign in to subscribe
                  </Link>
                ) : paid ? (
                  <Link
                    href="/api/billing/portal"
                    className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    Manage subscription
                  </Link>
                ) : (
                  <Link
                    href="/api/billing/checkout?plan=annual"
                    className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    Start annual plan
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-zinc-200 bg-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-zinc-900">
            Common questions
          </h2>
          <div className="mt-12 space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">
                What do I get with a subscription?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Everything. You get unlimited access to all five labs (Derivatives, Econ, Housing, Portfolio, Valuation),
                full Research Stage features for publishing and collaboration, the ability to save and load workspaces across all tools, and priority support.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">
                Can I cancel anytime?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Yep. Cancel anytime you want. You'll keep access until the end of your billing period,
                and if you're on an annual plan, we'll refund the unused portion.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">
                Can I try it before paying?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Yes. Everyone gets free credits to explore the platform first. You can test all the features with limited usage
                and see if Auster works for you before subscribing.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">
                What payment methods do you accept?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                All major credit cards - Visa, Mastercard, American Express, and Discover. We process everything securely through Stripe.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">
                Any discounts for students or institutions?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                We're working on institutional and educational pricing. If you're interested,{" "}
                <Link href="/support" className="font-semibold text-blue-600 hover:underline">
                  reach out to us
                </Link>{" "}
                and we can talk about what you need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-zinc-200 bg-gradient-to-b from-zinc-50 to-white py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-zinc-900">
            Let's get started
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            Join the researchers, analysts, and investors who use Auster for serious economic and market analysis.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {!user ? (
              <Link
                href="/login?next=/pricing"
                className="rounded-xl bg-zinc-900 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
              >
                Sign in to subscribe
              </Link>
            ) : !paid ? (
              <>
                <Link
                  href="/api/billing/checkout?plan=annual"
                  className="rounded-xl bg-zinc-900 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
                >
                  Start annual plan
                </Link>
                <Link
                  href="/api/billing/checkout?plan=monthly"
                  className="rounded-xl border border-zinc-300 bg-white px-8 py-3 text-base font-semibold text-zinc-900 hover:bg-zinc-50 transition-colors"
                >
                  Start monthly plan
                </Link>
              </>
            ) : (
              <Link
                href="/api/billing/portal"
                className="rounded-xl bg-zinc-900 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
              >
                Manage subscription
              </Link>
            )}
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            Questions?{" "}
            <Link href="/support" className="font-semibold text-zinc-900 hover:underline">
              Visit our support page
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}