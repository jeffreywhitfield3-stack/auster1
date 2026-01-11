import Link from "next/link";

export const dynamic = "force-dynamic";

export default function BriefPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const metric = String(searchParams.metric || "median_income");
  const pinned = String(searchParams.pinned || "");
  const overlay = String(searchParams.overlay || "");

  return (
    <main className="mx-auto max-w-4xl p-6 pb-24">
      <div className="mb-4">
        <div className="text-2xl font-semibold text-zinc-900">Auster Econ Brief</div>
        <div className="mt-1 text-sm text-zinc-600">
          Shareable snapshot generated from your Econ Lab exploration.
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
        <div className="font-semibold text-zinc-900">Parameters</div>
        <div className="mt-2 text-zinc-700">
          <div>Metric: <span className="font-semibold">{metric}</span></div>
          <div>Pinned: <span className="font-semibold">{pinned || "—"}</span></div>
          <div>Overlay: <span className="font-semibold">{overlay || "—"}</span></div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link href="/products/econ" className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
            Back to Econ Lab
          </Link>
        </div>
      </div>

      <div className="mt-6 text-xs text-zinc-500">
        Next iteration: render map snapshot + pinned table + automatic “key takeaways”.
      </div>
    </main>
  );
}