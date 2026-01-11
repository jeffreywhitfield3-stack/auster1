import { Card, Button } from "@/components/ui";

type Tile = {
  title: string;
  tag: string;
  desc: string;
  href: string;
};

const tiles: Tile[] = [
  {
    title: "Derivatives Lab",
    tag: "Options + spreads",
    desc: "Spreads, payoff tables, scenario grids, volatility stats, entry/exit framing.",
    href: "/products/derivatives",
  },
  {
    title: "Econ & Econometrics",
    tag: "Formulas + tables",
    desc: "Exam-ready calculators: OLS, hypothesis tests, elasticities, macro indicators, regression helpers.",
    href: "/products/econ",
  },
  {
    title: "Housing Feasibility",
    tag: "Real estate",
    desc: "DSCR, cap rate, amortization, IRR, break-evens, sensitivity grids, export-ready summaries.",
    href: "/products/housing",
  },
  {
    title: "DCF / Valuation Studio",
    tag: "Intrinsic value",
    desc: "DCF model, PV tables, sensitivity grid (WACC × terminal growth), compare to live quote, override assumptions.",
    href: "/products/valuation",
  },
  {
    title: "Portfolio & Risk Lab",
    tag: "Risk analytics",
    desc: "Portfolio weights, volatility, Sharpe, VaR/CVaR, drawdowns, correlations, NAV chart.",
    href: "/products/portfolio",
  },
];

export default function ProductTiles() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {tiles.map((t) => (
        <Card key={t.title} className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-base font-semibold text-slate-900">{t.title}</div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              {t.tag}
            </span>
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-600">{t.desc}</div>
          <div className="mt-5">
            <Button href={t.href} variant="primary">
              Open
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
