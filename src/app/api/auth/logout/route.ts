import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { env } from "@/lib/env";

/** Sign out in either mode. */
export async function POST() {
  if (env().DATA_MODE === "supabase") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
