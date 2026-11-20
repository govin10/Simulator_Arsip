import { apiHandler, apiUser, HttpError, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";
import { csvResponse, toCsv } from "@/lib/csv";
import { featureLabel, fmtWib, isLate, STATUS_LABEL } from "@/lib/tugas";

// Rekap nilai satu kelas: satu baris per siswa, satu kolom per tugas (bisa dibuka di Excel)
export const GET = apiHandler(async (req: Request) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const sp = new URL(req.url).searchParams;
  const kelas = sp.get("kelas") ?? "";
  if (!(await visibleClassIds(u)).includes(kelas)) throw new HttpError(404, "Kelas tidak ditemukan.");
  const c = await db.classroom.findUnique({
    where: { id: kelas },
    include: { students: { orderBy: { name: "asc" } }, assignments: { orderBy: { createdAt: "asc" }, include: { submissions: true } } },
  });
  if (!c) throw new HttpError(404, "Kelas tidak ditemukan.");
  if (sp.get("detail") === "1") {
    const rows: (string | number | null)[][] = [["kelas", "nama", "username", "tugas", "fitur", "status", "nilai", "nilai_maks", "dikumpulkan", "terlambat", "jumlah_unggah", "catatan_guru"]];
    for (const a of c.assignments) for (const s of c.students) {
      const sub = a.submissions.find((x) => x.studentId === s.id);
      rows.push([c.name, s.name, s.username, a.title, sub?.feature ? featureLabel(sub.feature) : "", sub ? STATUS_LABEL[sub.status] : "Belum mengumpulkan", sub?.score ?? "", a.maxScore,
        sub ? fmtWib(sub.submittedAt, false) : "", sub ? (isLate(a, sub.submittedAt) ? "ya" : "tidak") : "", sub?.uploadCount ?? "", sub?.feedback ?? ""]);
    }
    return csvResponse(`detail-${c.name.replace(/\s+/g, "-")}.csv`, toCsv(rows));
  }
  const rows: (string | number | null)[][] = [["nama", "username", ...c.assignments.flatMap((a) => (a.features.length ? [`${a.title} (maks ${a.maxScore})`, `${a.title} – fitur`] : [`${a.title} (maks ${a.maxScore})`])), "rata_rata"]];
  for (const s of c.students) {
    const scores = c.assignments.map((a) => a.submissions.find((x) => x.studentId === s.id && x.status === "GRADED")?.score ?? null);
    const valid = scores.filter((x): x is number => x != null);
    const cells = c.assignments.flatMap((a, i) => {
      const f = a.submissions.find((x) => x.studentId === s.id)?.feature;
      return a.features.length ? [scores[i] ?? "", f ? featureLabel(f) : ""] : [scores[i] ?? ""];
    });
    rows.push([s.name, s.username, ...cells, valid.length ? Math.round((valid.reduce((p, q) => p + q, 0) / valid.length) * 10) / 10 : ""]);
  }
  return csvResponse(`nilai-${c.name.replace(/\s+/g, "-")}.csv`, toCsv(rows));
});
