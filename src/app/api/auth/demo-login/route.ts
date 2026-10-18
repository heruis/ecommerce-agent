import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_COOKIE } from "@/lib/auth";
import { env } from "@/lib/env";
import { apiError, readJson, validationError } from "@/lib/http/responses";

/** DATA_MODE=memory only: sign in with just an email (no password) for local demos. */
export async function POST(req: Request) {
  if (env().DATA_MODE !== "memory") return apiError(404, "not_found", "Demo sign-in is disabled.");
  const parsed = z.object({ email: z.email() }).safeParse(await readJson(req));
  if (!parsed.success) return validationError(parsed.error);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEMO_COOKIE, parsed.data.email.toLowerCase(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
