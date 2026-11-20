import "server-only";
import { db } from "./db";
import { HttpError, visibleClassIds } from "./auth";
import type { SessionUser } from "./session-token";
import { canSubmit } from "./tugas";
import { deleteFile } from "./storage";

/** Tugas yang boleh dikumpulkan siswa ini sekarang (melempar HttpError bila tidak). */
export async function assertCanSubmit(user: SessionUser, assignmentId: string) {
  const a = await db.assignment.findUnique({ where: { id: assignmentId } });
  if (!a || a.classroomId !== user.classroomId) throw new HttpError(404, "Tugas tidak ditemukan untuk kelasmu.");
  const sub = await db.submission.findUnique({ where: { assignmentId_studentId: { assignmentId, studentId: user.id } } });
  const c = canSubmit(a, sub);
  if (!c.ok) throw new HttpError(400, c.reason!);
  return { a, sub };
}

export async function recordSubmission(user: SessionUser, assignmentId: string, file: { key: string; name: string; size: number }) {
  const { sub } = await assertCanSubmit(user, assignmentId);
  const name = file.name.replace(/[^\p{L}\p{N} ._()-]/gu, "_").slice(0, 120) || "tugas.pdf";
  const saved = await db.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
    create: { assignmentId, studentId: user.id, fileKey: file.key, fileName: name, fileSize: file.size },
    update: { fileKey: file.key, fileName: name, fileSize: file.size, submittedAt: new Date(), uploadCount: { increment: 1 }, status: "SUBMITTED" },
  });
  if (sub && sub.fileKey !== file.key) await deleteFile(sub.fileKey);
  return saved;
}

/** Pengumpulan yang boleh dibuka pengguna ini: milik sendiri (siswa) atau kelas yang diampu (guru/admin). */
export async function loadVisibleSubmission(user: SessionUser, id: string) {
  const s = await db.submission.findUnique({ where: { id }, include: { assignment: true } });
  if (!s) throw new HttpError(404, "Pengumpulan tidak ditemukan.");
  if (user.role === "STUDENT" ? s.studentId !== user.id : !(await visibleClassIds(user)).includes(s.assignment.classroomId))
    throw new HttpError(404, "Pengumpulan tidak ditemukan.");
  return s;
}
