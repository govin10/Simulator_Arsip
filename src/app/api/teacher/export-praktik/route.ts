import { apiHandler, apiUser, visibleClassIds } from "@/lib/auth";
import { anonId, loadAttempts } from "@/lib/analytics";
import { db } from "@/lib/db";
import { COMPONENTS, kindLabel, systemLabel } from "@/lib/domain";
import { csvResponse, toCsv } from "@/lib/csv";
import type { Scores } from "@/lib/grading";

// Ekspor hasil ke CSV (bisa dibuka di Excel). ?jenis=kesalahan untuk daftar kesalahan per butir.
export const GET = apiHandler(async (req: Request) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const sp = new URL(req.url).searchParams;
  const allowed = await visibleClassIds(u);
  const classIds = sp.get("kelas") ? allowed.filter((c) => c === sp.get("kelas")) : allowed;
  const anon = sp.get("anon") === "1";
  const rows = await loadAttempts({ classIds, sessionId: sp.get("sesi") ?? undefined });
  const who = (r: (typeof rows)[number]) => (anon ? anonId(r.studentId) : r.student.name);
  const stamp = new Date().toISOString().slice(0, 10);

  if (sp.get("jenis") === "kesalahan") {
    const errs = await db.errorLog.findMany({ where: { attemptId: { in: rows.map((r) => r.id) } } });
    const byAttempt = new Map(rows.map((r) => [r.id, r]));
    const out = [["kelas", "siswa", "sesi", "percobaan", "tahap", "kode_kesalahan", "bidang", "pesan"]];
    for (const e of errs) { const r = byAttempt.get(e.attemptId)!; out.push([r.session.classroom.name, who(r), r.session.title, String(r.attemptNo), e.stage, e.code, e.field ?? "", e.message]); }
    return csvResponse(`kesalahan-${stamp}.csv`, toCsv(out));
  }

  const header = ["kelas", anon ? "id_anonim" : "siswa", ...(anon ? [] : ["username"]), "sesi", "jenis_sesi", "paket", "sistem", "percobaan", "status", "mulai", "selesai", "durasi_menit", "bantuan",
    ...COMPONENTS.map((c) => `skor_${c.key}`), "skor_otomatis", "lulus_kkm", "skor_skenario", "nilai_guru", "catatan_guru",
    "temu_kembali_benar", "temu_kembali_jumlah", "temu_kembali_rata_detik"];
  const out: (string | number | null)[][] = [header];
  for (const r of rows) {
    const s = r.scores as unknown as Scores | null;
    const rt = r.retrievals.filter((x) => x.durationMs != null);
    out.push([
      r.session.classroom.name, who(r), ...(anon ? [] : [r.student.username]), r.session.title, kindLabel(r.session.package.kind), r.session.package.title, systemLabel(r.session.package.system),
      r.attemptNo, r.status === "FINISHED" ? "selesai" : r.stage, r.startedAt.toISOString(), r.finishedAt?.toISOString() ?? "",
      r.finishedAt ? Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 6000) / 10 : "", r.helpCount,
      ...COMPONENTS.map((c) => s?.components[c.key]?.score ?? ""), s?.total ?? "", s ? (s.passed ? "ya" : "tidak") : "", r.scenarioScore ?? "", r.teacherScore ?? "", r.teacherNote ?? "",
      rt.filter((x) => x.correct).length, rt.length, rt.length ? Math.round(rt.reduce((a, b) => a + (b.durationMs ?? 0), 0) / rt.length / 1000) : "",
    ]);
  }
  return csvResponse(`hasil-praktik-${stamp}.csv`, toCsv(out));
});
