"use client";

import { useState } from "react";

export default function Tip({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center gap-2">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-50"
        aria-label="What is this?"
      >
        ?
      </button>
      {open ? (
        <span className="absolute left-0 top-7 z-50 w-[320px] rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-700 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="leading-relaxed">{children}</div>
            <button
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </span>
      ) : null}
    </span>
  );
}