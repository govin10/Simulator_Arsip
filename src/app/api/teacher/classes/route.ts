import { apiHandler, apiUser, HttpError, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeClassName } from "@/lib/tugas";

export const POST = apiHandler(async (req: Request) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const b = await req.json();
  const name = normalizeClassName(String(b.name ?? ""));
  if (!name) throw new HttpError(400, "Nama kelas wajib diisi.");
  if (await db.classroom.findUnique({ where: { name } })) throw new HttpError(400, "Nama kelas sudah ada.");
  const teacherId = u.role === "ADMIN" && b.teacherId ? b.teacherId : u.id;
  const c = await db.classroom.create({ data: { name, teacherId } });
  return Response.json({ id: c.id });
});

// Admin menetapkan guru kelas; guru dapat mengklaim kelas yang belum punya guru
export const PATCH = apiHandler(async (req: Request) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const b = await req.json();
  const c = await db.classroom.findUnique({ where: { id: b.id } });
  if (!c || !(await visibleClassIds(u)).includes(c.id)) throw new HttpError(404, "Kelas tidak ditemukan.");
  if (u.role === "ADMIN") await db.classroom.update({ where: { id: c.id }, data: { teacherId: b.teacherId || null } });
  else if (b.claim && !c.teacherId) await db.classroom.update({ where: { id: c.id }, data: { teacherId: u.id } });
  else throw new HttpError(403, "Hanya admin yang dapat mengganti guru kelas.");
  return Response.json({ ok: true });
});

// Hapus kelas kosong (mis. terbuat karena salah ketik saat siswa mendaftar)
export const DELETE = apiHandler(async (req: Request) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const c = await db.classroom.findUnique({ where: { id }, include: { _count: { select: { students: true, assignments: true } } } });
  if (!c || !(await visibleClassIds(u)).includes(c.id)) throw new HttpError(404, "Kelas tidak ditemukan.");
  if (c._count.students) throw new HttpError(400, "Pindahkan atau hapus siswanya dulu sebelum menghapus kelas.");
  await db.classroom.delete({ where: { id } });
  return Response.json({ ok: true });
});
