import { apiHandler, apiUser, HttpError, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";

export const POST = apiHandler(async (req: Request) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const b = await req.json();
  if (!(await visibleClassIds(u)).includes(b.classroomId)) throw new HttpError(403, "Kelas tidak dapat diakses.");
  const pkg = await db.package.findUnique({ where: { id: b.packageId }, include: { _count: { select: { documents: true, retrievalTasks: true } } } });
  if (!pkg) throw new HttpError(404, "Paket tidak ditemukan.");
  if (pkg._count.documents < 1) throw new HttpError(400, "Paket belum memiliki dokumen.");
  const s = await db.practiceSession.create({ data: { title: String(b.title || pkg.title).slice(0, 120), packageId: pkg.id, classroomId: b.classroomId, active: !!b.active } });
  return Response.json({ id: s.id });
});
