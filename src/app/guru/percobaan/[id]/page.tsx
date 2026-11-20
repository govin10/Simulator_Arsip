import { notFound } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import ScoreTable from "@/components/ScoreTable";
import GradeForm from "@/components/teacher/GradeForm";
import { requireUser, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";
import { STAGES, componentLabel, stageLabel } from "@/lib/domain";
import type { Scores, StageResult } from "@/lib/grading";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const { id } = await params;
  const a = await db.attempt.findUnique({
    where: { id },
    include: { student: true, session: { include: { package: { include: { documents: true, retrievalTasks: { orderBy: { position: "asc" } } } }, classroom: true } }, retrievals: true, _count: { select: { events: true } } },
  });
  if (!a || !(await visibleClassIds(user)).includes(a.session.classroomId)) notFound();
  const scores = a.scores as unknown as Scores | null;
  const results = (a.results ?? {}) as Record<string, StageResult>;
  const docNo = new Map(a.session.package.documents.map((d) => [d.id, d.number]));
  const summary = ((a.answers as Record<string, unknown>)?.SCENARIO_SUMMARY ?? null) as { total: number; found: number; cause: number; fix: number; falseReports: number } | null;

  return (
    <AppShell user={user} wide>
      <Link href={`/guru/analitik?kelas=${a.session.classroomId}`} className="text-sm text-brand-700 underline">← Analitik praktik</Link>
      <h1 className="h1 mt-2">{a.student.name} · {a.session.title}</h1>
      <p className="muted">{a.session.classroom.name} · Percobaan ke-{a.attemptNo} · {a.status === "FINISHED" ? "selesai" : `sedang di ${stageLabel(a.stage)}`} · {a.helpCount} bantuan · {a._count.events} kejadian tercatat</p>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {scores ? <div className="card overflow-x-auto p-2"><ScoreTable scores={scores} /></div> : <div className="card p-5 text-stone-600">Skor otomatis muncul setelah tahap temu kembali dikirim.</div>}
          {summary && (
            <div className="card p-5">
              <h2 className="h2">Skenario kesalahan: {a.scenarioScore}</h2>
              <p className="text-sm">Kesalahan disisipkan {summary.total} · ditemukan {summary.found} · penyebab benar {summary.cause} · perbaikan benar {summary.fix} · laporan keliru {summary.falseReports}</p>
            </div>
          )}
          {a.retrievals.length > 0 && (
            <div className="card overflow-x-auto p-5">
              <h2 className="h2">Temu kembali</h2>
              <table className="table mt-2">
                <thead><tr><th>Permintaan</th><th>Jawaban</th><th>Kunci</th><th>Hasil</th><th className="text-right">Waktu</th><th className="text-right">Langkah</th></tr></thead>
                <tbody>
                  {a.session.package.retrievalTasks.map((t) => {
                    const r = a.retrievals.find((x) => x.taskId === t.id);
                    return (
                      <tr key={t.id}>
                        <td className="max-w-xs">{t.prompt}</td>
                        <td>{!r?.answeredAt ? "—" : r.answeredNotFound ? "Tidak ada" : docNo.get(r.selectedDocumentId ?? "") ?? "?"}</td>
                        <td>{t.answerDocumentId ? docNo.get(t.answerDocumentId) : "Tidak ada"}</td>
                        <td>{r?.correct == null ? "—" : r.correct ? "✓" : "✗"}</td>
                        <td className="text-right tabular-nums">{r?.durationMs ? `${Math.round(r.durationMs / 1000)} dtk` : "—"}</td>
                        <td className="text-right tabular-nums">{Array.isArray(r?.steps) ? (r.steps as unknown[]).length : 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {STAGES.filter((st) => results[st.value]).map((st) => [st.value, results[st.value]] as const).map(([stage, r]) => (
            <details key={stage} className="card p-5">
              <summary className="cursor-pointer h2">{stageLabel(stage)} · {r.items.filter((x) => x.score < 1).length} butir salah · {r.findings.length} catatan</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Dokumen</th><th>Komponen</th><th>Butir</th><th>Jawaban siswa</th><th>Kunci</th><th className="text-right">Nilai</th></tr></thead>
                  <tbody>
                    {[...r.items].sort((x, y) => x.score - y.score).map((it, i) => (
                      <tr key={i} className={it.score < 1 ? (it.score === 0 ? "bg-red-50/60" : "bg-amber-50/60") : ""}>
                        <td>{it.documentId ? docNo.get(it.documentId) : "—"}</td>
                        <td>{it.component === "skenario" ? "Skenario" : componentLabel(it.component)}</td>
                        <td>{it.field}</td>
                        <td className="max-w-[220px] break-words">{stage === "RETRIEVE" ? (docNo.get(it.given ?? "") ?? it.given) : it.given || <em className="text-stone-400">kosong</em>}</td>
                        <td className="max-w-[220px] break-words text-stone-600">{stage === "RETRIEVE" ? (docNo.get(it.expected ?? "") ?? it.expected) : it.expected}</td>
                        <td className="text-right tabular-nums">{Math.round(it.score * 100) / 100}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-3 space-y-1 text-sm">{r.findings.map((f, i) => <li key={i} className="rounded bg-stone-50 px-2 py-1"><span className="mr-2 font-mono text-xs text-stone-500">{f.code}</span>{f.message}</li>)}</ul>
            </details>
          ))}
        </div>
        <aside className="h-fit xl:sticky xl:top-4">
          <GradeForm attemptId={a.id} initial={{ teacherScore: a.teacherScore, teacherNote: a.teacherNote ?? "", rubric: (a.rubric ?? {}) as Record<string, number> }} autoScore={scores?.total ?? null} />
        </aside>
      </div>
    </AppShell>
  );
}
