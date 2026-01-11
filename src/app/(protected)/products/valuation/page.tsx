import { Suspense } from "react";
import ValuationClient from "./ValuationClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-600">Loading…</div>}>
      <ValuationClient />
    </Suspense>
  );
}