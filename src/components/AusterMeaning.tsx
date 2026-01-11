import { Card } from "@/components/ui";

export default function AusterMeaning() {
  return (
    <Card className="p-6 md:p-8">
      <div className="text-sm font-semibold text-slate-900">What is “Auster”?</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">
        Historically, <span className="font-medium text-slate-800">auster</span> comes from the idea of discipline and restraint:
        choosing what matters when resources are limited. In practice, that means stress-testing assumptions, quantifying tradeoffs,
        and making decisions you can defend with numbers.
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-900">Mission</div>
          <div className="mt-1 text-sm text-slate-600">
            Give builders, analysts, and students a fast, scenario-first way to model decisions and export outcomes that hold up under scrutiny.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-900">Why scenario-first</div>
          <div className="mt-1 text-sm text-slate-600">
            Instead of a giant spreadsheet, you run controlled scenarios, compare sensitivities, and see the “why” behind the output.
          </div>
        </div>
      </div>
    </Card>
  );
}
