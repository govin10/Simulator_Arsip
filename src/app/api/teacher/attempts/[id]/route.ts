import { apiHandler, apiUser, HttpError, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";

async function own(id: string, u: Awaited<ReturnType<typeof apiUser>>) {
  const a = await db.attempt.findUnique({ where: { id }, include: { session: true } });
  if (!a || !(await visibleClassIds(u)).includes(a.session.classroomId)) throw new HttpError(404, "Percobaan tidak ditemukan.");
  return a;
}

// Guru menimpa skor dengan catatan dan mengisi rubrik
export const PATCH = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const { id } = await ctx.params;
  await own(id, u);
  const b = await req.json();
  const score = b.teacherScore === "" || b.teacherScore == null ? null : Number(b.teacherScore);
  if (score != null && (isNaN(score) || score < 0 || score > 100)) throw new HttpError(400, "Nilai harus 0–100.");
  const a = await db.attempt.update({ where: { id }, data: { teacherScore: score, teacherNote: b.teacherNote ?? null, rubric: b.rubric ?? undefined } });
  return Response.json({ ok: true, teacherScore: a.teacherScore });
});

// Guru menghapus percobaan (misalnya agar siswa dapat mengulang)
export const DELETE = apiHandler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const { id } = await ctx.params;
  await own(id, u);
  await db.attempt.delete({ where: { id } });
  return Response.json({ ok: true });
});
