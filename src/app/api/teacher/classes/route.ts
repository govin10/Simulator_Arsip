import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";

export const POST = apiHandler(async (req: Request) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const b = await req.json();
  const name = String(b.name ?? "").trim();
  if (!name) throw new HttpError(400, "Nama kelas wajib diisi.");
  if (await db.classroom.findUnique({ where: { name } })) throw new HttpError(400, "Nama kelas sudah dipakai.");
  const teacherId = u.role === "ADMIN" && b.teacherId ? b.teacherId : u.id;
  const c = await db.classroom.create({ data: { name, teacherId } });
  return Response.json({ id: c.id });
});
export const PATCH = apiHandler(async (req: Request) => {
  const u = await apiUser(["ADMIN"]);
  void u;
  const b = await req.json();
  await db.classroom.update({ where: { id: b.id }, data: { teacherId: b.teacherId || null } });
  return Response.json({ ok: true });
});
