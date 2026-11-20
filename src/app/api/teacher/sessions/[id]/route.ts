import { apiHandler, apiUser, HttpError, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";

async function own(id: string, u: Awaited<ReturnType<typeof apiUser>>) {
  const s = await db.practiceSession.findUnique({ where: { id } });
  if (!s || !(await visibleClassIds(u)).includes(s.classroomId)) throw new HttpError(404, "Sesi tidak ditemukan.");
  return s;
}
export const PATCH = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const { id } = await ctx.params;
  await own(id, u);
  const b = await req.json();
  await db.practiceSession.update({ where: { id }, data: { ...(typeof b.active === "boolean" ? { active: b.active } : {}), ...(b.title ? { title: String(b.title).slice(0, 120) } : {}) } });
  return Response.json({ ok: true });
});
export const DELETE = apiHandler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const { id } = await ctx.params;
  await own(id, u);
  await db.practiceSession.delete({ where: { id } });
  return Response.json({ ok: true });
});
