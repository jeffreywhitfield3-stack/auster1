import { NextResponse } from "next/server";
import { STATES } from "@/lib/housing/states";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    level: "state",
    items: STATES.map((s) => ({ id: s.code2, name: s.name })),
  });
}