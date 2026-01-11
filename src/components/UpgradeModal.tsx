"use client";

import Link from "next/link";

export function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg">
        <div className="text-sm font-semibold text-zinc-900">Upgrade to unlock more</div>
        <div className="mt-2 text-sm text-zinc-600">
          Free accounts can run each tool 5 times per product and 15 times total. Paid plans unlock unlimited runs plus saving/exporting/scenarios.
        </div>
        <div className="mt-4 flex gap-2">
          <Link href="/pricing" className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-zinc-800">
            View pricing
          </Link>
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
