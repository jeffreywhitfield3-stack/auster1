"use client";

import { useState } from "react";
import { useEntitlement } from "@/hooks/useEntitlement";
import { UpgradeModal } from "@/components/UpgradeModal";

export function RequirePaidAction({ onPaidClick, children }: { onPaidClick: () => void | Promise<void>; children: React.ReactNode }) {
  const { isPaid, ready } = useEntitlement();
  const [open, setOpen] = useState(false);

  async function onClick() {
    if (!ready) return;
    if (!isPaid) {
      setOpen(true);
      return;
    }
    await onPaidClick();
  }

  return (
    <>
      <span onClick={onClick} className="inline-flex cursor-pointer">
        {children}
      </span>
      <UpgradeModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
