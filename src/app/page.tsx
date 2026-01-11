import Link from "next/link";


import { Button } from "@/components/ui";


 


export default function HomePage() {


  return (


    <main className="min-h-screen bg-white">


      {/* Hero Section - Research-Grade Positioning */}


      <section className="border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-white">


        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">


          <div className="mx-auto max-w-4xl text-center">


            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm">


              <span className="relative flex h-2 w-2">


                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>


                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>


              </span>


              Scenario-first labs for high-stakes thinking


            </div>


 


            <h1 className="text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl">


              Where real financial and economic thinking happens


            </h1>


 


            <p className="mt-8 text-xl leading-8 text-zinc-600 sm:text-2xl">


              Auster is a research-grade platform for derivatives analysis and independent economic inquiry.


              Not a calculator site. Not a trading gimmick. A new class of analytical product.


            </p>


 


            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">


              <Link


                href="/products/derivatives"


                className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-zinc-800 hover:shadow-xl"


              >


                Open Derivatives Lab →


              </Link>


              <Link


                href="/products/econ"


                className="inline-flex items-center justify-center rounded-lg border-2 border-zinc-300 bg-white px-8 py-4 text-base font-semibold text-zinc-900 transition-all hover:border-zinc-400 hover:bg-zinc-50"


              >


                Enter Econ Lab →


              </Link>


            </div>


 


            <div className="mt-16 grid gap-8 sm:grid-cols-3">


              {[


                { label: "Decision-grade outputs", description: "Analysis that holds up under scrutiny" },


                { label: "Transparent assumptions", description: "Every calculation visible and verifiable" },


                { label: "Research workflows", description: "From inquiry to publishable insight" },


              ].map((item) => (


                <div key={item.label} className="text-center">


                  <div className="text-sm font-bold text-zinc-900">{item.label}</div>


                  <div className="mt-2 text-sm text-zinc-600">{item.description}</div>


                </div>


              ))}


            </div>


          </div>


        </div>


      </section>


 


      {/* Platform Labs Showcase */}


      <section className="border-b border-zinc-200 bg-white py-24 sm:py-32">


        <div className="mx-auto max-w-7xl px-6">


          <div className="mx-auto max-w-3xl text-center">


            <h2 className="text-base font-semibold uppercase tracking-wide text-emerald-600">


              Two Complete Analytical Environments


            </h2>


            <p className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">


              Not tools. Labs.


            </p>


            <p className="mt-6 text-lg leading-8 text-zinc-600">


              Each lab is a complete research environment with its own workflows, philosophy, and analytical depth.


            </p>


          </div>


 


          <div className="mx-auto mt-20 grid max-w-6xl gap-12 lg:grid-cols-2">


            {/* Derivatives Lab */}


            <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-10 shadow-lg transition-all hover:shadow-2xl">


              <div className="absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-blue-50 blur-3xl"></div>


 


              <div className="relative">


                <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900">


                  📈 Derivatives Lab


                </div>


 


                <h3 className="mt-6 text-2xl font-bold text-zinc-900">


                  Professional derivatives research and strategy


                </h3>


 


                <p className="mt-4 text-base leading-7 text-zinc-600">


                  A full options-analysis environment designed for serious derivatives work.


                  Liquidity-first chains, strategy builders, payoff visualizations, anomaly detection,


                  and portfolio-grade workflows.


                </p>


 


                <div className="mt-8 space-y-3">


                  {[


                    "Liquidity-first option chains",


                    "Multi-leg strategy builder with payoff views",


                    "Anomaly detection and options screeners",


                    "Earnings and event risk analysis",


                    "Portfolio-grade analytical workflows",


                  ].map((feature) => (


                    <div key={feature} className="flex items-start gap-3">


                      <svg className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">


                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />


                      </svg>


                      <span className="text-sm text-zinc-700">{feature}</span>


                    </div>


                  ))}


                </div>


 


                <Link


                  href="/products/derivatives"


                  className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"


                >


                  Explore Derivatives Lab →


                </Link>


              </div>


            </div>


 


            {/* Econ Lab */}


            <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-10 shadow-lg transition-all hover:shadow-2xl">


              <div className="absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-violet-50 blur-3xl"></div>


 


              <div className="relative">


                <div className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-900">


                  🔬 Econ Lab


                </div>


 


                <h3 className="mt-6 text-2xl font-bold text-zinc-900">


                  A haven for independent economic research


                </h3>


 


                <p className="mt-4 text-base leading-7 text-zinc-600">


                  Deep research tools for exploring controversial questions, testing claims with data,


                  and communicating findings. Free inquiry, transparent methods, evidence-first reasoning.


                </p>


 


                <div className="mt-8 space-y-3">


                  {[


                    "Econometrics: OLS regression and causal inference",


                    "Inequality: Distribution analysis and Gini coefficients",


                    "Macro: GDP, inflation, unemployment dynamics",


                    "Micro: Demand curves and price elasticity",


                    "Statistical storytelling and publishing tools",


                  ].map((feature) => (


                    <div key={feature} className="flex items-start gap-3">


                      <svg className="mt-1 h-5 w-5 flex-shrink-0 text-violet-600" fill="currentColor" viewBox="0 0 20 20">


                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />


                      </svg>


                      <span className="text-sm text-zinc-700">{feature}</span>


                    </div>


                  ))}


                </div>


 


                <Link


                  href="/products/econ"


                  className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 transition-colors hover:text-violet-700"


                >


                  Explore Econ Lab →


                </Link>


              </div>


            </div>


          </div>


        </div>


      </section>


 


      {/* Why Auster Exists - Values Section */}


      <section className="border-b border-zinc-200 bg-zinc-50 py-24 sm:py-32">


        <div className="mx-auto max-w-7xl px-6">


          <div className="mx-auto max-w-3xl text-center">


            <h2 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">


              Why Auster exists


            </h2>


            <p className="mt-6 text-lg leading-8 text-zinc-600">


              Financial and economic analysis should prioritize clarity over noise,


              inquiry over ideology, and assumptions over black boxes.


            </p>


          </div>


 


          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">


            {[


              {


                title: "Clarity over noise",


                description: "Cut through market chatter. Focus on structural relationships and testable claims.",


              },


              {


                title: "Inquiry over ideology",


                description: "Follow the data wherever it leads. No predetermined narratives or political agendas.",


              },


              {


                title: "Assumptions over black boxes",


                description: "Every calculation visible. Every method reproducible. Every assumption challengeable.",


              },


              {


                title: "Insight over information",


                description: "Tools designed to generate understanding, not just data. Decision-grade outputs.",


              },


            ].map((value) => (


              <div key={value.title} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">


                <h3 className="text-base font-bold text-zinc-900">{value.title}</h3>


                <p className="mt-3 text-sm leading-6 text-zinc-600">{value.description}</p>


              </div>


            ))}


          </div>


 


          <div className="mx-auto mt-16 max-w-3xl rounded-2xl border-2 border-zinc-300 bg-white p-8 shadow-lg">


            <p className="text-center text-lg font-semibold text-zinc-900">


              Auster is built for independent thinkers, serious students, analysts, investors,


              and researchers who want to explore and communicate ideas responsibly.


            </p>


            <p className="mt-4 text-center text-base text-zinc-600">


              This isn't a site. This is a place to think.


            </p>


          </div>


        </div>


      </section>


 


      {/* How Labs Work - Product Demonstrations */}


      <section className="border-b border-zinc-200 bg-white py-24 sm:py-32">


        <div className="mx-auto max-w-7xl px-6">


          <div className="mx-auto max-w-3xl text-center">


            <h2 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">


              Scenario testing at the core


            </h2>


            <p className="mt-6 text-lg leading-8 text-zinc-600">


              Every lab is designed around repeatable analytical workflows that move from question to insight to communication.


            </p>


          </div>


 


          <div className="mx-auto mt-16 max-w-5xl space-y-16">


            {[


              {


                step: "01",


                title: "Define your scenario",


                description: "Start with a question. Set your assumptions. Configure your parameters. Every lab provides structured inputs for your analysis.",


                color: "emerald",


              },


              {


                step: "02",


                title: "Run analysis with transparency",


                description: "See every calculation. Understand every assumption. Adjust variables and watch outputs update in real-time with full mathematical visibility.",


                color: "blue",


              },


              {


                step: "03",


                title: "Visualize and communicate",


                description: "Generate publication-ready charts, tables, and statistical summaries. Export results. Share insights that hold up under scrutiny.",


                color: "violet",


              },


            ].map((item) => (


              <div key={item.step} className="flex flex-col gap-8 lg:flex-row lg:items-start">


                <div className="flex-shrink-0">


                  <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-${item.color}-100 text-2xl font-bold text-${item.color}-600`}>


                    {item.step}


                  </div>


                </div>


                <div className="flex-1">


                  <h3 className="text-2xl font-bold text-zinc-900">{item.title}</h3>


                  <p className="mt-4 text-base leading-7 text-zinc-600">{item.description}</p>


                </div>


              </div>


            ))}


          </div>


        </div>


      </section>


 


      {/* Trust and Roadmap */}


      <section className="bg-zinc-900 py-24 sm:py-32">


        <div className="mx-auto max-w-7xl px-6">


          <div className="mx-auto max-w-3xl text-center">


            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">


              Building for the long term


            </h2>


            <p className="mt-6 text-lg leading-8 text-zinc-300">


              Auster is evolving into a full research platform with saved workspaces,


              public research pages, and community-visible insights.


            </p>


          </div>


 


          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-3">


            {[


              {


                title: "Saved workspaces",


                description: "Return to your analysis. Version your research. Build on past work.",


                status: "Roadmap",


              },


              {


                title: "Public research pages",


                description: "Publish findings. Share methodologies. Let others validate your work.",


                status: "Roadmap",


              },


              {


                title: "Portfolio-grade tools",


                description: "Professional workflows for serious analysis. Multi-asset capabilities.",


                status: "In Progress",


              },


            ].map((item) => (


              <div key={item.title} className="rounded-xl border border-zinc-700 bg-zinc-800 p-6">


                <div className="inline-flex items-center gap-2 rounded-full bg-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300">


                  {item.status}


                </div>


                <h3 className="mt-4 text-base font-bold text-white">{item.title}</h3>


                <p className="mt-3 text-sm leading-6 text-zinc-400">{item.description}</p>


              </div>


            ))}


          </div>


 


          <div className="mt-16 text-center">


            <Link


              href="/login"


              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-zinc-900 shadow-lg transition-all hover:bg-zinc-100"


            >


              Start exploring →


            </Link>


            <p className="mt-4 text-sm text-zinc-400">


              Free tier available. No credit card required.


            </p>


          </div>


        </div>


      </section>


 


      {/* Final CTA */}


      <section className="border-t border-zinc-200 bg-white py-16">


        <div className="mx-auto max-w-7xl px-6 text-center">


          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">


            Auster · Research-grade analytical platform


          </p>


          <div className="mt-6 flex justify-center gap-8 text-sm text-zinc-600">


            <Link href="/pricing" className="hover:text-zinc-900">Pricing</Link>


            <Link href="/products/derivatives" className="hover:text-zinc-900">Derivatives Lab</Link>


            <Link href="/products/econ" className="hover:text-zinc-900">Econ Lab</Link>


          </div>


        </div>


      </section>


    </main>


  );


}


 