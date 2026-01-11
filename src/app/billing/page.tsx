import Link from "next/link";

export const dynamic = "force-dynamic";

export default function BillingPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold text-zinc-900">Billing</div>
        <div className="mt-2 text-sm text-zinc-600">
          Subscription management will appear here once Stripe is connected.
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            View pricing
          </Link>

          <Link
            href="/support"
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Back to support
          </Link>
        </div>
      </div>
    </main>
  );
}