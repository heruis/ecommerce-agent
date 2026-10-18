import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/** Liveness + which modes are active. Never returns secrets. */
export async function GET() {
  const e = env();
  return NextResponse.json({
    ok: true,
    modes: { ai: e.AI_MODE, data: e.DATA_MODE, billing: e.BILLING_MODE, rag: e.RAG_MODE },
  });
}
