import { NextResponse } from "next/server";
import type { z } from "zod";

/** Consistent JSON error shape for every API route: { error: { code, message } }. */
export function apiError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

export const unauthorized = () => apiError(401, "unauthorized", "Sign in to continue.");
export const notFound = (what = "Resource") => apiError(404, "not_found", `${what} not found.`);

export function validationError(error: z.ZodError) {
  return apiError(400, "invalid_input", "Some fields need attention.", {
    fields: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
