import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { unauthorized } from "@/lib/http/responses";

/** Download everything we store about the signed-in user, as one JSON file. Owner: WS4. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const data = await getRepo().exportUserData(user.id);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="shelfpass-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
