import { apiHandler, apiUser, HttpError, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/storage";
import { parseAssignment } from "@/lib/assignments";

async function own(id: string, u: Awaited<ReturnType<typeof apiUser>>) {
  const a = await db.assignment.findUnique({ where: { id } });
  if (!a || !(await visibleClassIds(u)).includes(a.classroomId)) throw new HttpError(404, "Tugas tidak ditemukan.");
  return a;
}
export const PATCH = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const { id } = await ctx.params;
  await own(id, u);
  const b = await req.json();
  if (Object.keys(b).length === 1 && typeof b.isOpen === "boolean") await db.assignment.update({ where: { id }, data: { isOpen: b.isOpen } });
  else await db.assignment.update({ where: { id }, data: parseAssignment(b) });
  return Response.json({ ok: true });
});
export const DELETE = apiHandler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const { id } = await ctx.params;
  await own(id, u);
  const subs = await db.submission.findMany({ where: { assignmentId: id }, select: { fileKey: true } });
  await db.assignment.delete({ where: { id } });
  await Promise.all(subs.map((s) => deleteFile(s.fileKey)));
  return Response.json({ ok: true });
});
