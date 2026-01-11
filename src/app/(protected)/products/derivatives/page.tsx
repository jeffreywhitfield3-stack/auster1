import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import DerivativesClient from "./DerivativesClient";

export const runtime = "nodejs";

export default async function Page() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent("/products/derivatives")}`);

  return <DerivativesClient />;
}