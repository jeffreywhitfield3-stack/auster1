// src/app/support/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <div className="text-xs font-semibold text-zinc-500">Support</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">Need help?</h1>
        <p className="mt-2 text-sm text-zinc-600">
          If something isn’t working, have a question, or want to request access, reach out anytime.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Contact */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Contact support</div>
          <p className="mt-2 text-sm text-zinc-600">
            Email us at{" "}
            <a
              className="font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-700"
              href="mailto:support@austerian.com?subject=Austerian%20Support"
            >
              support@austerian.com
            </a>{" "}
            and include:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-600">
            <li>What page/tool you were using</li>
            <li>What you expected to happen vs. what happened</li>
            <li>Any error message (copy/paste is perfect)</li>
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="mailto:support@austerian.com?subject=Austerian%20Support"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Email support
            </a>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Browse products
            </Link>
          </div>
        </section>

        {/* Billing / cancel */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Billing & subscriptions</div>
          <p className="mt-2 text-sm text-zinc-600">
            To manage your plan or cancel your subscription, use the billing portal.
          </p>

          {/* Adjust this href to wherever your Stripe Customer Portal lives. */}
          <div className="mt-4">
            <Link
              href="/billing"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Manage / cancel subscription
            </Link>
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            If you haven’t wired Stripe yet, keep this link pointing to <code className="rounded bg-zinc-50 px-1">/billing</code>{" "}
            for now and we’ll connect it to Stripe Customer Portal when you’re ready.
          </p>
        </section>

        {/* Access / scholarships */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Free access for students & under-resourced users</div>
          <p className="mt-2 text-sm text-zinc-600">
            Money shouldn’t be the reason you can’t learn or build. If you’re a student or money is a barrier right now,
            you can request free usage.
          </p>

          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-sm font-semibold text-zinc-900">Request free access</div>
            <p className="mt-1 text-sm text-zinc-600">
              Email{" "}
              <a
                className="font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-700"
                href="mailto:info@austerian.com?subject=Free%20Access%20Request%20(Austerian)"
              >
                info@austerian.com
              </a>{" "}
              with:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
              <li>What you plan on using Austerian for</li>
              <li>Which product(s) you want access to</li>
              <li>Any context you’re comfortable sharing (optional)</li>
            </ul>
            <p className="mt-3 text-sm text-zinc-600">
              I personally review these and I’ll get back to you as quickly as I can.
            </p>

            <div className="mt-4">
              <a
                href="mailto:info@austerian.com?subject=Free%20Access%20Request%20(Austerian)&body=Hi%20Austerian%20team%2C%0A%0AI%E2%80%99m%20requesting%20free%20access.%0A%0AWhat%20I%20plan%20to%20use%20Austerian%20for%3A%0A-%20%0A%0AProducts%20I%E2%80%99d%20like%20access%20to%3A%0A-%20%0A%0AThank%20you!"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Email free access request
              </a>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <div className="text-xs text-zinc-500">
          Tip: If you’re reporting a bug, including a screenshot and your browser (Chrome/Safari/Firefox) helps a lot.
        </div>
      </div>
    </main>
  );
}