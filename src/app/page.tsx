import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Hero */}
      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
            Tools for serious analysis
          </h1>

          <p className="mt-8 text-xl text-zinc-600">
            Auster gives you professional-grade tools for derivatives and economic research.
            No fluff, no gimmicks. Just clean, powerful analysis.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/products/derivatives"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-zinc-800"
            >
              Derivatives Lab →
            </Link>
            <Link
              href="/products/econ"
              className="inline-flex items-center justify-center rounded-lg border-2 border-zinc-300 bg-white px-8 py-4 text-base font-semibold text-zinc-900 transition-all hover:border-zinc-400"
            >
              Econ Lab →
            </Link>
          </div>
        </div>
      </section>

      {/* The Two Labs */}
      <section className="border-y border-zinc-200 bg-zinc-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2">

            {/* Derivatives */}
            <div className="rounded-xl border border-zinc-200 bg-white p-8">
              <div className="text-sm font-semibold text-blue-600">DERIVATIVES LAB</div>

              <h3 className="mt-4 text-2xl font-bold text-zinc-900">
                Options analysis that actually works
              </h3>

              <p className="mt-4 text-base text-zinc-600">
                Build multi-leg strategies, visualize payoffs, screen for opportunities,
                and analyze risk. Everything you need for serious derivatives work.
              </p>

              <div className="mt-6 space-y-2 text-sm text-zinc-700">
                <div>• Liquidity-first option chains</div>
                <div>• Strategy builder with live payoff charts</div>
                <div>• Screeners for spreads and anomalies</div>
                <div>• Earnings and event analysis</div>
              </div>

              <Link
                href="/products/derivatives"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Try it now →
              </Link>
            </div>

            {/* Econ */}
            <div className="rounded-xl border border-zinc-200 bg-white p-8">
              <div className="text-sm font-semibold text-violet-600">ECON LAB</div>

              <h3 className="mt-4 text-2xl font-bold text-zinc-900">
                Economic research without the BS
              </h3>

              <p className="mt-4 text-base text-zinc-600">
                Run regressions, analyze distributions, test hypotheses.
                Real statistical tools for people who want honest answers.
              </p>

              <div className="mt-6 space-y-2 text-sm text-zinc-700">
                <div>• Regression and causal inference</div>
                <div>• Inequality and distribution analysis</div>
                <div>• Macro indicators (GDP, inflation, unemployment)</div>
                <div>• Publishing tools for sharing your work</div>
              </div>

              <Link
                href="/products/econ"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700"
              >
                Try it now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-zinc-900">
            Built different
          </h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="font-bold text-zinc-900">Show your work</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Every calculation is visible. No black boxes. You can verify everything.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Follow the data</h3>
              <p className="mt-2 text-sm text-zinc-600">
                No spin, no narrative. Just analysis that holds up under scrutiny.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Skip the noise</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Focus on what matters. Clean interface, powerful tools.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Actually useful</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Built for real research and real decisions, not just browsing data.
              </p>
            </div>
          </div>

          <div className="mt-16 rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center">
            <p className="text-lg text-zinc-900">
              Made for students, analysts, investors, and researchers who want to do real work.
            </p>
          </div>
        </div>
      </section>

      {/* What's Coming */}
      <section className="border-t border-zinc-200 bg-zinc-900 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-white">
            What's next
          </h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Coming Soon</div>
              <h3 className="mt-2 font-bold text-white">Saved workspaces</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Save your analysis and come back to it later.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Coming Soon</div>
              <h3 className="mt-2 font-bold text-white">Public research</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Share your findings with others.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">In Progress</div>
              <h3 className="mt-2 font-bold text-white">More tools</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Portfolio analysis and multi-asset workflows.
              </p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/products/derivatives"
              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-zinc-900 transition-all hover:bg-zinc-100"
            >
              Start exploring
            </Link>
            <p className="mt-4 text-sm text-zinc-400">
              Free tier available. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="border-t border-zinc-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="flex justify-center gap-8 text-sm text-zinc-600">
            <Link href="/pricing" className="hover:text-zinc-900">Pricing</Link>
            <Link href="/products/derivatives" className="hover:text-zinc-900">Derivatives</Link>
            <Link href="/products/econ" className="hover:text-zinc-900">Econ</Link>
          </div>
        </div>
      </section>

    </main>
  );
}


 