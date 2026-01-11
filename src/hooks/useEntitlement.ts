"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function useEntitlement() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [tier, setTier] = useState<"free" | "pro" | "advanced" | "unlimited">("free");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const sess = await supabase.auth.getSession();
      if (!alive) return;

      if (!sess.data.session) {
        setTier("free");
        setReady(true);
        return;
      }

      const uid = sess.data.session.user.id;

      const ent = await supabase.from("user_entitlements").select("tier").eq("user_id", uid).maybeSingle();
      if (!alive) return;

      setTier((ent.data?.tier ?? "free") as any);
      setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e: any, s: any) => {
      if (!alive) return;
      if (!s) {
        setTier("free");
        setReady(true);
        return;
      }
      const ent = await supabase.from("user_entitlements").select("tier").eq("user_id", s.user.id).maybeSingle();
      if (!alive) return;
      setTier((ent.data?.tier ?? "free") as any);
      setReady(true);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return { tier, isPaid: tier !== "free", ready };
}
