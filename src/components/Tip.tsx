"use client";

import { useState } from "react";

export function Tip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 bg-white text-[10px] font-bold text-zinc-700"
      >
        ?
      </button>
      {open ? (
        <span className="absolute left-0 top-6 z-50 w-72 rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-700 shadow-lg">
          {text}
        </span>
      ) : null}
    </span>
  );
}
