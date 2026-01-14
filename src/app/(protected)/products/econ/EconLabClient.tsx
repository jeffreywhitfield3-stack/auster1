"use client";

import React from "react";
import Link from "next/link";

export default function EconLabClient() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
            Econ Lab
          </h1>
          <p className="mt-6 text-xl text-zinc-600">
            Run regressions, test hypotheses, analyze distributions.
            Real statistical tools for serious research.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products/econ/macro"
              className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Start exploring
            </Link>
          </div>
        </div>
      </section>

      {/* Research Labs */}
      <section className="border-y border-zinc-200 bg-zinc-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Macro", icon: "🏛", href: "/products/econ/macro", desc: "GDP, inflation, unemployment" },
              { name: "Inequality", icon: "📊", href: "/products/econ/inequality", desc: "Distributions and disparities" },
              { name: "Micro", icon: "🏪", href: "/products/econ/micro", desc: "Demand, supply, elasticity" },
              { name: "Econometrics", icon: "🧮", href: "/products/econ/econometrics", desc: "Regressions and inference" },
              { name: "Models", icon: "⚙️", href: "/products/econ/models", desc: "Quantitative models and tools" },
            ].map((lab) => (
              <Link
                key={lab.name}
                href={lab.href}
                className="group rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-900 hover:shadow-lg"
              >
                <div className="text-3xl">{lab.icon}</div>
                <h3 className="mt-3 text-lg font-bold text-zinc-900">
                  {lab.name}
                </h3>
                <p className="mt-2 text-sm text-zinc-600">
                  {lab.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-zinc-900">
            What you get
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="font-bold text-zinc-900">Transparent calculations</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Every calculation is visible. No black boxes.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Real data sources</h3>
              <p className="mt-2 text-sm text-zinc-600">
                FRED, BLS, Census, and other trusted sources.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Publishing tools</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Export charts and share your findings.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">No spin</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Follow the data wherever it leads.
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
            <p className="text-base text-zinc-900">
              Built for students, analysts, and researchers who want honest answers.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
