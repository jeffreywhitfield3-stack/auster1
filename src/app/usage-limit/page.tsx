import Link from "next/link";

export default function UsageLimitPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl sm:p-12 text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
            You've reached your free usage limit
          </h1>

          {/* Description */}
          <p className="mt-4 text-lg leading-8 text-zinc-600">
            Your free tier has been fully used. Subscribe to continue using Auster's analytical tools and unlock unlimited access to both labs.
          </p>

          {/* Benefits */}
          <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-left">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
              Upgrade to Pro and get:
            </h2>
            <ul className="mt-4 space-y-3">
              {[
                "Unlimited requests across all tools",
                "Full access to Derivatives Lab",
                "Full access to Econ Lab",
                "Priority support",
                "No rate limits or usage caps"
              ].map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <svg className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-zinc-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
            >
              View pricing & subscribe →
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border-2 border-zinc-300 bg-white px-8 py-4 text-base font-semibold text-zinc-900 transition-all hover:border-zinc-400 hover:bg-zinc-50"
            >
              ← Back to home
            </Link>
          </div>

          {/* Footer note */}
          <p className="mt-8 text-sm text-zinc-500">
            Questions about pricing?{" "}
            <Link href="/support" className="font-semibold text-blue-600 hover:text-blue-700">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
