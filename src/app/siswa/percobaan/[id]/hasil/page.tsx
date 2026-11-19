import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ScoreTable from "@/components/ScoreTable";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_RUBRIC, RUBRIC_LEVELS, STAGES, stageLabel } from "@/lib/domain";
import type { Scores, StageResult } from "@/lib/grading";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["STUDENT"]);
  const { id } = await params;
  const a = await db.attempt.findUnique({ where: { id }, include: { session: { include: { package: true } }, retrievals: true } });
  if (!a || a.studentId !== user.id) redirect("/siswa");
  if (a.status !== "FINISHED") redirect(`/siswa/percobaan/${id}`);
  const scores = a.scores as unknown as Scores | null;
  const results = (a.results ?? {}) as Record<string, StageResult>;
  const rubric = (a.rubric ?? {}) as Record<string, number>;
  const history = await db.attempt.findMany({ where: { sessionId: a.sessionId, studentId: user.id }, orderBy: { attemptNo: "asc" } });
  const minutes = a.finishedAt ? Math.round((a.finishedAt.getTime() - a.startedAt.getTime()) / 60000) : null;

  return (
    <AppShell user={user}>
      <p className="muted">{a.session.title} · Percobaan ke-{a.attemptNo}</p>
      <h1 className="h1">Hasil praktik</h1>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="card p-5"><p className="text-xs font-semibold uppercase text-stone-500">Skor otomatis (data pendukung)</p><p className="mt-1 text-4xl font-bold">{scores?.total ?? "-"}</p><p className="muted">KKM {a.session.package.kkm}</p></div>
        <div className="card p-5"><p className="text-xs font-semibold uppercase text-stone-500">Nilai guru (rubrik)</p><p className="mt-1 text-4xl font-bold">{a.teacherScore ?? "—"}</p><p className="muted">{a.teacherScore == null ? "Menunggu pemeriksaan guru" : a.teacherNote || ""}</p></div>
        <div className="card p-5"><p className="text-xs font-semibold uppercase text-stone-500">Skenario kesalahan</p><p className="mt-1 text-4xl font-bold">{a.scenarioScore ?? "—"}</p><p className="muted">Waktu total {minutes ?? "-"} menit · {a.helpCount} bantuan</p></div>
      </div>
      {scores && <div className="card mt-4 overflow-x-auto p-2"><ScoreTable scores={scores} /></div>}

      <div className="card mt-4 p-5">
        <h2 className="h2">Rincian butir</h2>
        <p className="muted">Setiap skor dibentuk dari butir di bawah ini.</p>
        {STAGES.filter((st) => results[st.value]).map((st) => [st.value, results[st.value]] as const).map(([stage, r]) => (
          <details key={stage} className="mt-3 rounded-lg border border-stone-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold">{stageLabel(stage)} — {r.items.filter((i) => i.score === 1).length}/{r.items.length} butir benar penuh · {r.findings.length} catatan</summary>
            <ul className="mt-2 space-y-1 text-sm">
              {r.findings.map((f, i) => <li key={i} className="rounded bg-amber-50 px-2 py-1">{f.message}</li>)}
            </ul>
          </details>
        ))}
      </div>

      <div className="card mt-4 overflow-x-auto p-5">
        <h2 className="h2">Rubrik praktik guru</h2>
        <p className="muted">Bandingkan skor otomatis dengan penilaian guru per indikator.</p>
        <table className="table mt-2">
          <thead><tr><th>Indikator</th>{RUBRIC_LEVELS.map((l) => <th key={l.level} className="text-center">{l.level}. {l.label}</th>)}</tr></thead>
          <tbody>
            {DEFAULT_RUBRIC.map((r) => (
              <tr key={r.key}><td>{r.label}</td>{RUBRIC_LEVELS.map((l) => <td key={l.level} className="text-center">{rubric[r.key] === l.level ? "●" : <span className="text-stone-300">○</span>}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-stone-500">{RUBRIC_LEVELS.map((l) => `${l.level} = ${l.desc}`).join(" · ")}</p>
      </div>

      <div className="card mt-4 p-5">
        <h2 className="h2">Riwayat percobaan</h2>
        <ul className="mt-2 text-sm">
          {history.map((h) => <li key={h.id}>Percobaan {h.attemptNo}: {h.status === "FINISHED" ? `skor ${(h.scores as unknown as Scores | null)?.total ?? "-"}, ${h.helpCount} bantuan` : "belum selesai"}</li>)}
        </ul>
        <Link href="/siswa" className="btn mt-4">Kembali ke daftar sesi</Link>
      </div>
    </AppShell>
  );
}
