type UsagePeek = {
  allowed: boolean;
  remainingProduct: number;
  remainingTotal: number;
  paid?: boolean;
};

export async function peekUsage(product: string): Promise<UsagePeek> {
  try {
    const r = await fetch(`/api/usage/peek?product=${encodeURIComponent(product)}`, { cache: "no-store" });
    if (!r.ok) return { allowed: true, remainingProduct: 999, remainingTotal: 999 };
    const d = await r.json();
    return {
      allowed: Boolean(d.allowed),
      remainingProduct: Number(d.remainingProduct ?? 0),
      remainingTotal: Number(d.remainingTotal ?? 0),
      paid: Boolean(d.paid ?? false),
    };
  } catch {
    return { allowed: true, remainingProduct: 999, remainingTotal: 999 };
  }
}

export async function incrementUsage(product: string, cost = 1): Promise<{ allowed: boolean } & any> {
  const r = await fetch(`/api/usage/increment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ product, cost }),
    cache: "no-store",
  });

  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { allowed: false, ...d };
  return d;
}