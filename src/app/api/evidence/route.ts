import { NextResponse } from "next/server";
import { EvidenceInput } from "@/lib/contracts";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { EVIDENCE_LIMIT } from "@/lib/evidence";
import { apiError, readJson, unauthorized, validationError } from "@/lib/http/responses";
import { rateLimit } from "@/lib/platform/rate-limit";

/** The signed-in seller's evidence library (newest first). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const repo = getRepo();
  await repo.ensureProfile(user);
  return NextResponse.json({ items: await repo.listEvidence(user.id) });
}

/** Add one document to the library. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const limit = rateLimit(`evidence:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    return apiError(429, "rate_limited", "Too many changes at once. Try again in a minute.");
  }
  const parsed = EvidenceInput.safeParse(await readJson(req));
  if (!parsed.success) return validationError(parsed.error);

  const repo = getRepo();
  await repo.ensureProfile(user);
  if ((await repo.listEvidence(user.id)).length >= EVIDENCE_LIMIT) {
    return apiError(400, "too_many", `You can keep up to ${EVIDENCE_LIMIT} documents.`);
  }
  const claims = [...new Set(parsed.data.claims.map((c) => c.trim()).filter(Boolean))];
  const item = await repo.createEvidence(user.id, { ...parsed.data, claims });
  return NextResponse.json({ item }, { status: 201 });
}
