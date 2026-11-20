import { apiHandler, apiUser, HttpError, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAssignment } from "@/lib/assignments";

// Membuat tugas untuk satu atau beberapa kelas sekaligus
export const POST = apiHandler(async (req: Request) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const b = await req.json();
  const data = parseAssignment(b);
  const allowed = await visibleClassIds(u);
  const classIds: string[] = (b.classroomIds ?? []).filter((c: string) => allowed.includes(c));
  if (!classIds.length) throw new HttpError(400, "Pilih minimal satu kelas.");
  const created = await db.$transaction(classIds.map((classroomId) => db.assignment.create({ data: { ...data, classroomId, createdById: u.id } })));
  return Response.json({ ids: created.map((c) => c.id) });
});
