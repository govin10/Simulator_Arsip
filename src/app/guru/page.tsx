import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Bar } from "@/components/ScoreTable";
import { requireUser, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";
import { anonId, componentAverages, loadAttempts, prePost, topErrors } from "@/lib/analytics";
import { kindLabel, stageLabel } from "@/lib/domain";
import { ERROR_CATALOG, type Scores } from "@/lib/grading";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ kelas?: string; sesi?: string; anon?: string }> }) {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const sp = await searchParams;
  const allowed = await visibleClassIds(user);
  const classes = await db.classroom.findMany({ where: { id: { in: allowed } }, orderBy: { name: "asc" } });
  const classId = sp.kelas && allowed.includes(sp.kelas) ? sp.kelas : classes[0]?.id;
  const sessions = classId ? await db.practiceSession.findMany({ where: { classroomId: classId }, include: { package: true }, orderBy: { createdAt: "asc" } }) : [];
  const sessionId = sessions.find((s) => s.id === sp.sesi)?.id;
  const anon = sp.anon === "1";
  const rows = classId ? await loadAttempts({ classIds: [classId], sessionId }) : [];
  const allClassRows = classId && sessionId ? await loadAttempts({ classIds: [classId] }) : rows;
  const finished = rows.filter((r) => r.status === "FINISHED" && r.scores);
  const comps = componentAverages(rows);
  const errs = await topErrors(rows.map((r) => r.id));
  const pp = prePost(allClassRows);
  const students = classId ? await db.user.findMany({ where: { classroomId: classId, role: "STUDENT" }, orderBy: { name: "asc" } }) : [];
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const avgScore = avg(finished.map((r) => (r.scores as unknown as Scores).total));
  const rtimes = rows.flatMap((r) => r.retrievals.map((x) => x.durationMs).filter((x): x is number => x != null));
  const avgRet = rtimes.length ? Math.round(rtimes.reduce((a, b) => a + b, 0) / rtimes.length / 1000) : null;
  const passCount = finished.filter((r) => (r.scores as unknown as Scores).passed).length;
  const name = (s: { id: string; name: string }) => (anon ? anonId(s.id) : s.name);
  const qs = new URLSearchParams({ ...(classId ? { kelas: classId } : {}), ...(sessionId ? { sesi: sessionId } : {}), ...(anon ? { anon: "1" } : {}) }).toString();

  return (
    <AppShell user={user} wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">Dashboard guru</h1>
          <p className="muted">Skor otomatis adalah data pendukung. Nilai utama tetap dari rubrik praktik.</p>
        </div>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div><label className="label" htmlFor="kelas">Kelas</label>
            <select id="kelas" name="kelas" className="input" defaultValue={classId}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="sesi">Sesi</label>
            <select id="sesi" name="sesi" className="input" defaultValue={sessionId ?? ""}><option value="">Semua sesi</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="anon" value="1" defaultChecked={anon} /> Anonimkan</label>
          <button className="btn">Terapkan</button>
          <a className="btn" href={`/api/teacher/export?${qs}`}>⬇ Ekspor CSV</a>
        </form>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Percobaan selesai" value={`${finished.length}`} sub={`dari ${rows.length} percobaan · ${students.length} siswa`} />
        <Stat label="Rata-rata skor otomatis" value={avgScore ?? "—"} sub={`${passCount} percobaan ≥ KKM`} />
        <Stat label="Rata-rata waktu temu kembali" value={avgRet != null ? `${avgRet} dtk` : "—"} sub={`${rtimes.length} pencarian tercatat`} />
        <Stat label="Rata-rata bantuan" value={avg(rows.map((r) => r.helpCount)) ?? "—"} sub="per percobaan" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="h2">Skor per indikator</h2>
          <p className="muted">Rata-rata percobaan yang selesai. Garis hitam = KKM 75.</p>
          <table className="table mt-3">
            <tbody>
              {comps.map((c) => (
                <tr key={c.key}><td className="w-1/3">{c.label}</td><td className="w-16 text-right font-semibold tabular-nums">{c.avg ?? "—"}</td><td>{c.avg != null && <Bar value={c.avg} kkm={75} />}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card p-5">
          <h2 className="h2">Kesalahan tersering</h2>
          <p className="muted">Jumlah kemunculan dan banyaknya percobaan yang mengalaminya.</p>
          <table className="table mt-3">
            <thead><tr><th>Jenis kesalahan</th><th className="text-right">Kemunculan</th><th className="text-right">Percobaan</th></tr></thead>
            <tbody>
              {errs.map((e) => <tr key={e.code}><td>{ERROR_CATALOG[e.code] ?? e.code} <span className="text-xs text-stone-400">{e.code}</span></td><td className="text-right tabular-nums">{e.count}</td><td className="text-right tabular-nums">{e.attempts}</td></tr>)}
              {!errs.length && <tr><td colSpan={3} className="text-stone-500">Belum ada data.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card mt-4 overflow-x-auto p-5">
        <h2 className="h2">Tes awal vs tes akhir</h2>
        <p className="muted">Kelas terpilih · percobaan terakhir per siswa · tes awal n={pp.nPre} ({pp.passPre} ≥ KKM), tes akhir n={pp.nPost} ({pp.passPost} ≥ KKM)</p>
        <table className="table mt-3">
          <thead><tr><th>Indikator</th><th className="text-right">Tes awal</th><th className="text-right">Tes akhir</th><th className="text-right">Selisih</th></tr></thead>
          <tbody>
            {pp.rows.map((r) => {
              const d = r.pre != null && r.post != null ? Math.round((r.post - r.pre) * 10) / 10 : null;
              return <tr key={r.key} className={r.key === "total" ? "font-semibold" : ""}><td>{r.label}</td><td className="text-right tabular-nums">{r.pre ?? "—"}</td><td className="text-right tabular-nums">{r.post ?? "—"}</td>
                <td className={`text-right tabular-nums ${d == null ? "" : d >= 0 ? "text-brand-700" : "text-red-700"}`}>{d == null ? "—" : `${d > 0 ? "+" : ""}${d}`}</td></tr>;
            })}
          </tbody>
        </table>
      </section>

      <section className="card mt-4 overflow-x-auto p-5">
        <h2 className="h2">Progres siswa</h2>
        <table className="table mt-3">
          <thead><tr><th>Siswa</th><th>Sesi</th><th>Percobaan</th><th>Status</th><th className="text-right">Skor otomatis</th><th className="text-right">Skenario</th><th className="text-right">Nilai guru</th><th className="text-right">Bantuan</th><th className="text-right">Temu kembali</th><th /></tr></thead>
          <tbody>
            {rows.slice().reverse().map((r) => {
              const s = r.scores as unknown as Scores | null;
              const rt = r.retrievals.filter((x) => x.durationMs != null);
              return (
                <tr key={r.id}>
                  <td className="font-medium">{name(r.student)}</td>
                  <td>{r.session.title} <span className="badge bg-stone-100 text-stone-600">{kindLabel(r.session.package.kind)}</span></td>
                  <td>{r.attemptNo}</td>
                  <td>{r.status === "FINISHED" ? <span className="badge bg-brand-100 text-brand-800">Selesai</span> : <span className="badge bg-amber-100 text-amber-800">{stageLabel(r.stage).replace(/^\d\.\s*/, "")}</span>}</td>
                  <td className={`text-right tabular-nums ${s && !s.passed ? "text-amber-700" : ""}`}>{s?.total ?? "—"}</td>
                  <td className="text-right tabular-nums">{r.scenarioScore ?? "—"}</td>
                  <td className="text-right tabular-nums">{r.teacherScore ?? "—"}</td>
                  <td className="text-right tabular-nums">{r.helpCount}</td>
                  <td className="text-right tabular-nums">{rt.length ? `${rt.filter((x) => x.correct).length}/${rt.length} · ${Math.round(rt.reduce((a, b) => a + (b.durationMs ?? 0), 0) / rt.length / 1000)} dtk` : "—"}</td>
                  <td><Link className="text-brand-700 underline" href={`/guru/percobaan/${r.id}`}>Periksa</Link></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={10} className="text-stone-500">Belum ada percobaan.</td></tr>}
          </tbody>
        </table>
        {students.filter((s) => !rows.some((r) => r.studentId === s.id)).length > 0 && (
          <p className="mt-3 text-sm text-stone-600">Belum mulai: {students.filter((s) => !rows.some((r) => r.studentId === s.id)).map(name).join(", ")}</p>
        )}
      </section>
    </AppShell>
  );
}
function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return <div className="card p-4"><p className="text-xs font-semibold uppercase text-stone-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p><p className="text-xs text-stone-500">{sub}</p></div>;
}
