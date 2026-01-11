import { Suspense } from "react";
import LaborClient from "./LaborClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Loading…</div>
            <div className="mt-2 text-sm text-zinc-600">Initializing Labor Market Lab.</div>
          </div>
        </main>
      }
    >
      <LaborClient />
    </Suspense>
  );
}
