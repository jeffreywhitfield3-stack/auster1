import clsx from "clsx"

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx("rounded-xl border border-zinc-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  )
}
