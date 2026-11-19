import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { loadOwnAttempt } from "@/lib/attempts";
import { db } from "@/lib/db";

// Autosimpan jawaban yang belum dikirim
export const PUT = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["STUDENT"]);
  const { id } = await ctx.params;
  const a = await loadOwnAttempt(id, u);
  const { stage, data } = await req.json();
  if (a.status !== "IN_PROGRESS" || a.stage !== stage) throw new HttpError(409, "Tahap sudah berubah.");
  await db.attempt.update({ where: { id }, data: { draft: { stage, data, savedAt: new Date().toISOString() } } });
  return Response.json({ ok: true, savedAt: new Date().toISOString() });
});
