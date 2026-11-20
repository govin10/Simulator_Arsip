import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { loadOwnAttempt, toPublic } from "@/lib/attempts";
import { db } from "@/lib/db";

export const GET = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["STUDENT"]);
  const { id } = await ctx.params;
  const a = await loadOwnAttempt(id, u);
  const docId = new URL(req.url).searchParams.get("docId") ?? "";
  const d = await db.document.findFirst({ where: { id: docId, packageId: a.session.packageId } });
  if (!d) throw new HttpError(404, "Dokumen tidak ditemukan.");
  return Response.json({ doc: toPublic(d) });
});
