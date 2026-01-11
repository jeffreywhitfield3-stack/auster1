"use client";

import { useEffect, useRef, useState } from "react";

export default function HelpTip({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as any)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <span className="relative inline-block align-middle" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 bg-white text-[11px] font-bold text-zinc-700 hover:bg-zinc-50"
        aria-label={`Help: ${title}`}
        title={title}
      >
        ?
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-700 shadow-xl">
          <div className="text-xs font-semibold text-zinc-900">{title}</div>
          <div className="mt-1 leading-5">{text}</div>
        </div>
      ) : null}
    </span>
  );
}