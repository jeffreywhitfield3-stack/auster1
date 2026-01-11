"use client";

import Link from "next/link";

export default function PaywallBanner(props: {
  show: boolean;
  onDismiss: () => void;
  remainingProduct: number;
  remainingTotal: number;
  label?: string;
  message?: string;
}) {
  if (!props.show) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="font-semibold">{props.label ?? "Free limit reached"}</div>
      <div className="mt-1 text-amber-800">{props.message ?? "Subscribe for unlimited access."}</div>
      <div className="mt-2 text-xs text-amber-900/80">
        Remaining: <b>{props.remainingProduct}</b> Econ credits • <b>{props.remainingTotal}</b> sitewide credits
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href="/pricing"
          className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          View pricing
        </Link>
        <button
          onClick={props.onDismiss}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Not now
        </button>
      </div>
    </div>
  );
}