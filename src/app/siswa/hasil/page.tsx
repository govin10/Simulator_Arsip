import Link from "next/link";
import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDuration, kindLabel, scoreLabel } from "@/lib/domain";
import type { Scores } from "@/lib/grading";
import { STATUS_LABEL, featureLabel } from "@/lib/tugas";

export const dynamic = "force-dynamic";

export default async function Results() {
  const user = await requireUser(["STUDENT"]);
  const [attempts, subs] = await Promise.all([
    db.attempt.findMany({ where: { studentId: user.id, status: "FINISHED" }, include: { session: { include: { package: { select: { kind: true, kkm: true } } } } }, orderBy: { finishedAt: "desc" } }),
    db.submission.findMany({ where: { studentId: user.id }, include: { assignment: { select: { title: true, maxScore: true } } }, orderBy: { submittedAt: "desc" } }),
  ]);
  return (
    <AppShell user={user}>
      <h1 className="h1">Hasil & Nilai</h1>
      <p className="muted">Skor praktik di website dan nilai tugas PDF dari guru.</p>

      <section className="card mt-5 overflow-x-auto p-5">
        <h2 className="h2">Praktik paket dokumen</h2>
        <table className="table mt-3">
          <thead><tr><th>Sesi</th><th>Percobaan</th><th>Waktu</th><th className="text-right">Skor otomatis</th><th>Predikat</th><th className="text-right">Nilai guru</th><th /></tr></thead>
          <tbody>
            {attempts.map((a) => {
              const sc = (a.scores as unknown as Scores | null)?.total ?? null;
              const l = scoreLabel(sc);
              return (
                <tr key={a.id}>
                  <td className="font-medium">{a.session.title} <span className="badge bg-brand-50 text-brand-700">{kindLabel(a.session.package.kind)}</span></td>
                  <td>ke-{a.attemptNo}</td>
                  <td>{a.finishedAt ? fmtDuration(a.finishedAt.getTime() - a.startedAt.getTime()) : "—"}</td>
                  <td className="text-right text-lg font-bold tabular-nums">{sc ?? "—"}</td>
                  <td className={`text-sm font-medium ${l.tone}`}>{l.label}</td>
                  <td className="text-right tabular-nums">{a.teacherScore ?? "—"}</td>
                  <td className="text-right"><Link href={`/siswa/percobaan/${a.id}/hasil`} className="btn btn-sm">Detail</Link></td>
                </tr>
              );
            })}
            {!attempts.length && <tr><td colSpan={7} className="text-stone-500">Belum ada praktik yang selesai. <Link href="/siswa/praktik" className="text-brand-700 underline">Mulai praktik</Link></td></tr>}
          </tbody>
        </table>
      </section>

      <section className="card mt-4 overflow-x-auto p-5">
        <h2 className="h2">Tugas PDF</h2>
        <table className="table mt-3">
          <thead><tr><th>Tugas</th><th>Fitur</th><th>Status</th><th className="text-right">Nilai</th><th>Catatan guru</th></tr></thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.assignment.title}</td>
                <td className="text-sm">{s.feature ? featureLabel(s.feature) : "—"}</td>
                <td><span className={`badge ${s.status === "GRADED" ? "bg-brand-100 text-brand-800" : s.status === "REVISION" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>{STATUS_LABEL[s.status]}</span></td>
                <td className="text-right text-lg font-bold tabular-nums">{s.status === "GRADED" ? <>{s.score}<span className="text-xs font-normal text-stone-400">/{s.assignment.maxScore}</span></> : "—"}</td>
                <td className="max-w-xs text-sm text-stone-600">{s.feedback ?? "—"}</td>
              </tr>
            ))}
            {!subs.length && <tr><td colSpan={5} className="text-stone-500">Belum ada tugas PDF yang dikumpulkan. <Link href="/siswa/tugas" className="text-brand-700 underline">Lihat tugas</Link></td></tr>}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
