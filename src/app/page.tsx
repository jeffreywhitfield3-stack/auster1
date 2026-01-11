import ProductTiles from "@/components/ProductTiles";
import PricingSnapshot from "@/components/PricingSnapshot";
import AusterMeaning from "@/components/AusterMeaning";
import { Badge, Button, Card, Container } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="pb-20 pt-10">
      <Container>
        <div className="grid gap-8 md:grid-cols-12 md:items-start">
          <div className="md:col-span-7">
            <Badge>Auster is scenario-first</Badge>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 md:text-6xl">
              Stop fighting spreadsheets.
              <br />
              Stress-test decisions in minutes.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Auster is a practical toolkit for derivatives strategies, econometrics calculators, and housing feasibility.
              Run scenarios fast, understand the “why”, and share outcomes that hold up under scrutiny.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/login" variant="primary">
                Start free
              </Button>
              <Button href="/pricing" variant="secondary">
                View pricing
              </Button>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                { t: "Fast", d: "Local compute" },
                { t: "Clear", d: "Scenario outputs" },
                { t: "Shareable", d: "PDF + CSV" },
              ].map((x) => (
                <Card key={x.t} className="p-4">
                  <div className="text-sm font-semibold text-slate-900">{x.t}</div>
                  <div className="mt-1 text-sm text-slate-600">{x.d}</div>
                </Card>
              ))}
            </div>
          </div>

          <div className="md:col-span-5">
            <AusterMeaning />
          </div>
        </div>

        <div className="mt-12">
          <div className="text-lg font-semibold text-slate-900">Products</div>
          <div className="mt-1 text-sm text-slate-600">
            Sign in to run calculations. Free users get limited runs; paid unlocks unlimited + saving + exports.
          </div>
          <div className="mt-5">
            <ProductTiles />
          </div>
        </div>

        <div className="mt-14">
          <PricingSnapshot />
        </div>
      </Container>
    </main>
  );
}
