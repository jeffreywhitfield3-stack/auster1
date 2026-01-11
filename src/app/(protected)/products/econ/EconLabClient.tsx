"use client";

import React from "react";
import Link from "next/link";

// Research Workflow Stages
const researchWorkflow = [
  {
    stage: "01",
    name: "Explore",
    tagline: "Discover economic reality",
    description: "Begin with pattern discovery. Surface structural trends, inequality patterns, and macro dynamics that shape our world.",
    capabilities: [
      "Long-run structural trends",
      "Inequality & disparity analysis",
      "Macro indicator exploration",
      "Demographic distributions",
      "Regional comparison",
    ],
    labs: [
      { name: "Macro Research", href: "/products/econ/macro", icon: "🏛" },
      { name: "Inequality & Disparities", href: "/products/econ/inequality", icon: "📊" },
      { name: "Labor Market", href: "/products/econ/labor", icon: "💼" },
    ],
    color: "blue",
  },
  {
    stage: "02",
    name: "Structure",
    tagline: "Model economic mechanisms",
    description: "Turn observations into models. Understand microeconomic behavior, firm dynamics, and how economic agents respond to incentives.",
    capabilities: [
      "Demand & supply modeling",
      "Price elasticity estimation",
      "Firm & market behavior",
      "Sector-level analysis",
      "Consumer response patterns",
    ],
    labs: [
      { name: "Microeconomics", href: "/products/econ/micro", icon: "🏪" },
    ],
    color: "amber",
  },
  {
    stage: "03",
    name: "Test",
    tagline: "Establish evidence",
    description: "Apply rigor. Test hypotheses, quantify uncertainty, establish causality, and separate signal from noise.",
    capabilities: [
      "OLS regression analysis",
      "Hypothesis testing",
      "Confidence intervals",
      "Model comparison",
      "Causal inference tools",
    ],
    labs: [
      { name: "Econometrics", href: "/products/econ/econometrics", icon: "🧮" },
    ],
    color: "violet",
  },
  {
    stage: "04",
    name: "Communicate",
    tagline: "Publish insight",
    description: "Make findings public. Create shareable research, explorable visualizations, and communicate economic reality to the world.",
    capabilities: [
      "Export analysis & charts",
      "Shareable research pages",
      "Narrative layouts",
      "Data storytelling",
      "Public communication",
    ],
    labs: [
      { name: "Publishing Tools", href: "#", icon: "📝", badge: "Coming Soon" },
    ],
    color: "emerald",
  },
];

const coreValues = [
  {
    principle: "Inquiry over ideology",
    description: "Follow the evidence, not predetermined narratives. Question conventional wisdom. Explore controversial or neglected economic questions responsibly.",
  },
  {
    principle: "Clarity over complexity",
    description: "Make advanced methods accessible. Strip away jargon. Present economic analysis in ways that respect both rigor and comprehension.",
  },
  {
    principle: "Assumptions over black boxes",
    description: "All calculations are transparent. All methods are visible. Every analysis can be replicated and validated by others.",
  },
  {
    principle: "Evidence over rhetoric",
    description: "Data first, interpretation second. We provide tools and transparency. The conclusions are yours to draw.",
  },
  {
    principle: "Structure over noise",
    description: "Focus on long-run patterns and structural dynamics. Separate signal from noise. Find what matters.",
  },
];

const colorClasses = {
  blue: "from-blue-50 to-blue-100 text-blue-900 border-blue-200",
  amber: "from-amber-50 to-amber-100 text-amber-900 border-amber-200",
  violet: "from-violet-50 to-violet-100 text-violet-900 border-violet-200",
  emerald: "from-emerald-50 to-emerald-100 text-emerald-900 border-emerald-200",
};

export default function EconLabClient() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      {/* Hero Section */}
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              RESEARCH ENVIRONMENT
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl">
              Econ Lab
            </h1>
            <p className="mt-6 text-xl leading-8 text-zinc-600 sm:text-2xl">
              A cohesive environment for independent economic research —<br className="hidden sm:block" />
              where you investigate reality, test hypotheses, and publish findings.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products/econ/macro"
                className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-zinc-800"
              >
                Start Exploring
              </Link>
              <Link
                href="#workflow"
                className="rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
              Where Economic Research Happens
            </h2>
            <p className="mt-6 text-lg leading-8 text-zinc-700">
              The Econ Lab is not a collection of disconnected tools.
              It is a <strong>unified research environment</strong> designed for deep economic inquiry —
              a place where independent researchers, educators, and analysts explore structural questions,
              test economic claims, and communicate findings to the world.
            </p>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              This platform exists to empower free inquiry into controversial, neglected, and structural economic questions.
              We provide transparency, rigor, and publishing tools. You provide the curiosity and the questions.
            </p>
          </div>
        </div>
      </section>

      {/* Research Workflow */}
      <section id="workflow" className="border-b border-zinc-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold text-zinc-900 sm:text-5xl">
              The Research Workflow
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600">
              Economic research follows a natural progression. The Econ Lab is organized around four stages that mirror how serious inquiry actually happens.
            </p>
          </div>

          <div className="space-y-12">
            {researchWorkflow.map((workflow, idx) => (
              <div
                key={workflow.stage}
                className={`rounded-2xl border bg-gradient-to-br p-8 shadow-sm transition-shadow hover:shadow-lg ${
                  colorClasses[workflow.color as keyof typeof colorClasses]
                }`}
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                  {/* Stage Number & Title */}
                  <div className="lg:w-1/3">
                    <div className="text-5xl font-black opacity-30">
                      {workflow.stage}
                    </div>
                    <h3 className="mt-2 text-3xl font-bold">
                      {workflow.name}
                    </h3>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-wide opacity-70">
                      {workflow.tagline}
                    </p>
                    <p className="mt-4 text-base leading-7 opacity-90">
                      {workflow.description}
                    </p>
                  </div>

                  {/* Capabilities & Labs */}
                  <div className="flex-1 space-y-6">
                    {/* Capabilities */}
                    <div>
                      <div className="mb-3 text-xs font-bold uppercase tracking-wide opacity-70">
                        Capabilities
                      </div>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {workflow.capabilities.map((capability, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-60"></span>
                            <span>{capability}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Labs */}
                    <div>
                      <div className="mb-3 text-xs font-bold uppercase tracking-wide opacity-70">
                        Research Labs
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {workflow.labs.map((lab, i) => (
                          <Link
                            key={i}
                            href={lab.href}
                            className={`group relative inline-flex items-center gap-2 rounded-lg border border-current bg-white/50 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur transition-all hover:scale-105 hover:shadow-md ${
                              "badge" in lab && lab.badge ? "pointer-events-none opacity-60" : ""
                            }`}
                          >
                            <span className="text-base">{lab.icon}</span>
                            <span>{lab.name}</span>
                            {"badge" in lab && lab.badge && (
                              <span className="ml-1 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white">
                                {lab.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="border-b border-zinc-200 bg-zinc-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-zinc-900 sm:text-5xl">
              Core Principles
            </h2>
            <p className="mt-4 text-lg text-zinc-600">
              The values that guide how we build this platform and how research happens here.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {coreValues.map((value, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-zinc-900">
                  {value.principle}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  {value.description}
                </p>
              </div>
            ))}

            {/* Bonus: Responsible Communication */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <h3 className="text-lg font-bold text-zinc-900">
                Public responsibility
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Research has consequences. Communicate findings with nuance, acknowledge limitations, and respect the weight of public claims.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Inequality as First-Class Domain */}
      <section className="border-b border-zinc-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500"></span>
                FIRST-CLASS DOMAIN
              </div>
              <h2 className="text-4xl font-bold text-zinc-900 sm:text-5xl">
                Inequality & Disparities Research
              </h2>
              <p className="mt-6 text-lg leading-8 text-zinc-700">
                Economic inequality isn't a footnote — it's a structural force that shapes societies, markets, and lives.
              </p>
              <p className="mt-4 text-base leading-7 text-zinc-600">
                The Econ Lab treats inequality as a first-class analytical domain. Explore income distributions, wage gaps, demographic disparities, and long-run structural trends with the same rigor applied to macro and micro analysis.
              </p>

              <div className="mt-8">
                <Link
                  href="/products/econ/inequality"
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-violet-700"
                >
                  <span>📊</span>
                  <span>Explore Inequality Lab</span>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 p-8">
              <div className="space-y-4">
                <div className="text-sm font-semibold uppercase tracking-wide text-violet-900">
                  Key Analytical Tools
                </div>
                {[
                  "Gini coefficient calculation",
                  "Income & wealth distribution analysis",
                  "Wage gap measurement (gender, race, region)",
                  "Demographic comparison tools",
                  "Regional disparity mapping",
                  "Long-run structural trend detection",
                ].map((tool, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-600"></div>
                    <div className="text-sm text-violet-900">{tool}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Identity */}
      <section className="bg-zinc-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold text-zinc-900 sm:text-5xl">
              Built for Serious Inquiry
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600">
              The Econ Lab sits alongside professional research platforms like FRED, Our World in Data, and Bloomberg Research — but with a modern, cohesive research workflow.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
              <div className="mb-4 text-4xl">🏛️</div>
              <h3 className="text-xl font-bold text-zinc-900">
                Research-Grade Tools
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Econometric methods, real-time data integration, and transparency standards that match academic and institutional research.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
              <div className="mb-4 text-4xl">⚡</div>
              <h3 className="text-xl font-bold text-zinc-900">
                Modern Product Design
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Clean interfaces, fast workflows, and intuitive navigation. Research tools that respect your time and intelligence.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
              <div className="mb-4 text-4xl">📢</div>
              <h3 className="text-xl font-bold text-zinc-900">
                Built-In Publishing
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Turn research into shareable insights. Export charts, create explorable narratives, and communicate findings effectively.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="border-t border-zinc-200 bg-white py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
            Start Your Research
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            Choose where to begin. Every path leads to discovery.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Macro", icon: "🏛", href: "/products/econ/macro" },
              { name: "Inequality", icon: "📊", href: "/products/econ/inequality" },
              { name: "Micro", icon: "🏪", href: "/products/econ/micro" },
              { name: "Econometrics", icon: "🧮", href: "/products/econ/econometrics" },
            ].map((lab) => (
              <Link
                key={lab.name}
                href={lab.href}
                className="group rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center transition-all hover:border-zinc-900 hover:bg-zinc-900 hover:shadow-lg"
              >
                <div className="text-4xl">{lab.icon}</div>
                <div className="mt-3 text-sm font-semibold text-zinc-900 group-hover:text-white">
                  {lab.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
