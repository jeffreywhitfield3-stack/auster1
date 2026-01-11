"use client";

export async function consumeRun(product: "derivatives" | "econ" | "housing") {
  const r = await fetch("/api/usage/consume", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ product }),
  });
  const j = await r.json();
  return j;
}
