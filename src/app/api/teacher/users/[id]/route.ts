import bcrypt from "bcryptjs";
import { apiHandler, apiUser, HttpError, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";
import { genPassword } from "@/lib/passwords";

async function target(id: string, u: Awaited<ReturnType<typeof apiUser>>) {
  const t = await db.user.findUnique({ where: { id } });
  if (!t) throw new HttpError(404, "Akun tidak ditemukan.");
  if (u.role === "ADMIN") return t;
  if (t.role !== "STUDENT" || !t.classroomId || !(await visibleClassIds(u)).includes(t.classroomId)) throw new HttpError(403, "Akses ditolak.");
  return t;
}
// Reset kata sandi
export const POST = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const t = await target((await ctx.params).id, u);
  const b = await req.json().catch(() => ({}));
  const password = String(b.password ?? "").trim() || genPassword();
  await db.user.update({ where: { id: t.id }, data: { passwordHash: bcrypt.hashSync(password, 10) } });
  return Response.json({ password });
});
export const DELETE = apiHandler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const t = await target((await ctx.params).id, u);
  if (t.id === u.id) throw new HttpError(400, "Tidak dapat menghapus akun sendiri.");
  await db.user.delete({ where: { id: t.id } });
  return Response.json({ ok: true });
});
