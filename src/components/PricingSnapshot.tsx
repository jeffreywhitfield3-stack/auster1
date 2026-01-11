import { Card, Button } from "@/components/ui";

type Plan = {
  name: string;
  price: string;
  cadence: string;
  bullets: string[];
};

const plans: Plan[] = [
  {
    name: "Auster Pro",
    price: "$19.00",
    cadence: "/ month",
    bullets: ["Unlimited runs across all products", "Save projects & progress", "Export CSV/PDF", "Scenario grids & snapshots"],
  },
  {
    name: "Auster Advanced",
    price: "$39.00",
    cadence: "/ month",
    bullets: ["Everything in Pro", "More scenario presets & sensitivity grids", "Extra metrics panels & analytics views", "Priority UI features (future)"],
  },
  {
    name: "Auster Unlimited",
    price: "$250.00",
    cadence: "lifetime",
    bullets: ["Lifetime unlimited runs", "Everything in Advanced", "Best value for power users", "No recurring billing"],
  },
];

export default function PricingSnapshot() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xl font-semibold text-slate-900">Pricing</div>
          <div className="mt-1 text-sm text-slate-600">
            Free includes limited runs. Paid unlocks unlimited runs + saving + exports + scenarios.
          </div>
        </div>
        <Button href="/pricing" variant="secondary">
          View plans
        </Button>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.name} className="p-6">
            <div className="text-base font-semibold text-slate-900">{p.name}</div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-slate-900">{p.price}</div>
              <div className="text-sm font-medium text-slate-500">{p.cadence}</div>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {p.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-slate-900" />
                  <span className="leading-6">{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <Button href="/pricing" variant="primary">
                Continue
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
