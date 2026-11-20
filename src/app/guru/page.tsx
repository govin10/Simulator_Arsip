import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import { requireUser, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";
import { ERROR_CATALOG, type Scores } from "@/lib/grading";
import { scoreLabel } from "@/lib/domain";

export const dynamic = "force-dynamic";

const r1 = (n: number) => Math.round(n * 10) / 10;
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}`;

export default async function TeacherHome({ searchParams }: { searchParams: Promise<{ kelas?: string }> }) {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const sp = await searchParams;
  const ids = await visibleClassIds(user);
  const classes = await db.classroom.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" } });
  const classId = sp.kelas && ids.includes(sp.kelas) ? sp.kelas : classes[0]?.id;
  const [students, sessions, attempts, waitingPdf] = classId
    ? await Promise.all([
        db.user.findMany({ where: { classroomId: classId, role: "STUDENT" }, orderBy: { name: "asc" } }),
        db.practiceSession.findMany({ where: { classroomId: classId }, select: { id: true } }),
        db.attempt.findMany({ where: { session: { classroomId: classId } }, include: { session: { include: { package: { select: { title: true, kkm: true } } } } }, orderBy: { startedAt: "asc" } }),
        db.submission.count({ where: { status: "SUBMITTED", assignment: { classroomId: classId } } }),
      ])
    : [[], [], [], 0];
  const finished = attempts.filter((a) => a.status === "FINISHED" && a.scores);
  const dur = (a: (typeof attempts)[number]) => (a.finishedAt ? a.finishedAt.getTime() - a.startedAt.getTime() : 0);

  // Per siswa: percobaan terakhir per sesi
  const rows = students.map((s) => {
    const mine = finished.filter((a) => a.studentId === s.id);
    const lastPerSession = new Map<string, (typeof mine)[number]>();
    for (const a of mine) lastPerSession.set(a.sessionId, a);
    const latest = [...lastPerSession.values()];
    const scores = latest.map((a) => (a.scores as unknown as Scores).total);
    const avg = scores.length ? r1(scores.reduce((p, q) => p + q, 0) / scores.length) : null;
    const kkm = latest[0]?.session.package.kkm ?? 75;
    return { s, done: lastPerSession.size, avg, time: mine.length ? mine.reduce((p, a) => p + dur(a), 0) / mine.length : null, tuntas: avg != null ? avg >= kkm : null, started: attempts.some((a) => a.studentId === s.id) };
  });
  const rated = rows.filter((r) => r.avg != null);
  const classAvg = rated.length ? r1(rated.reduce((p, r) => p + r.avg!, 0) / rated.length) : null;
  const tuntas = rows.filter((r) => r.tuntas).length;
  const avgTime = finished.length ? finished.reduce((p, a) => p + dur(a), 0) / finished.length : null;
  const lastFinished = finished.length ? [...finished].sort((a, b) => (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0))[0] : null;

  // Kesalahan paling sering: banyaknya siswa yang mengalaminya
  const errs = finished.length ? await db.errorLog.findMany({ where: { attemptId: { in: attempts.map((a) => a.id) } }, select: { code: true, attemptId: true } }) : [];
  const studentOf = new Map(attempts.map((a) => [a.id, a.studentId]));
  const byCode = new Map<string, Set<string>>();
  for (const e of errs) { if (!byCode.has(e.code)) byCode.set(e.code, new Set()); byCode.get(e.code)!.add(studentOf.get(e.attemptId)!); }
  const topErr = [...byCode.entries()].map(([code, set]) => ({ code, n: set.size })).sort((a, b) => b.n - a.n).slice(0, 6);
  const maxErr = Math.max(1, ...topErr.map((e) => e.n));

  return (
    <AppShell user={user} wide>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Guru</h1>
          <p className="muted">Ringkasan praktik kearsipan kelas. Skor otomatis adalah data pendukung; nilai utama tetap dari rubrik guru.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {classes.map((k) => <Link key={k.id} href={`/guru?kelas=${k.id}`} className={`badge px-3 py-1 text-sm ${k.id === classId ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-800"}`}>{k.name}</Link>)}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Jumlah Siswa" icon="users" value={students.length} sub={`${rows.filter((r) => r.started).length} aktif berlatih`} />
        <StatCard label="Rata-rata Skor" icon="chart" value={classAvg ?? "—"} sub={classAvg == null ? "Belum ada data" : scoreLabel(classAvg).label} tone={scoreLabel(classAvg).tone} />
        <StatCard label="Paket Dikerjakan" icon="box" value={finished.length} sub={`dari ${sessions.length} sesi`} />
        <StatCard label="Waktu Rata-rata" icon="clock" value={avgTime != null ? mmss(avgTime) : "—"} sub="menit per paket" />
        <StatCard label="Tingkat Ketuntasan" icon="check" value={students.length ? `${Math.round((tuntas / students.length) * 100)}%` : "—"} sub={`${tuntas} / ${students.length} siswa`} progress={students.length ? (tuntas / students.length) * 100 : 0} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="card overflow-x-auto p-5">
          <div className="flex items-center justify-between"><h2 className="h2">Progres Siswa</h2><Link href={`/guru/analitik?kelas=${classId ?? ""}`} className="text-sm text-brand-700 underline">Lihat analitik lengkap →</Link></div>
          <table className="table mt-3">
            <thead><tr><th>Nama</th><th className="text-center">Paket selesai</th><th className="text-right">Rata-rata skor</th><th className="text-right">Waktu</th><th className="text-center">Ketuntasan</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.s.id}>
                  <td className="font-medium">{r.s.name}</td>
                  <td className="text-center tabular-nums">{r.done} / {sessions.length}</td>
                  <td className="text-right font-semibold tabular-nums">{r.avg ?? "—"}</td>
                  <td className="text-right tabular-nums">{r.time != null ? mmss(r.time) : "—"}</td>
                  <td className="text-center">{r.tuntas == null ? <span className="badge bg-stone-100 text-stone-500">Belum</span> : r.tuntas ? <span className="badge bg-emerald-100 text-emerald-800">Tuntas</span> : <span className="badge bg-red-100 text-red-700">Tidak tuntas</span>}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="text-stone-500">Belum ada siswa di kelas ini.</td></tr>}
            </tbody>
          </table>
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="h2">Kesalahan Paling Sering Terjadi</h2>
            <p className="text-xs text-stone-500">Jumlah siswa yang mengalami setiap jenis kesalahan</p>
            <ul className="mt-3 space-y-2.5">
              {topErr.map((e) => (
                <li key={e.code} className="grid grid-cols-[minmax(0,13rem)_1fr_auto] items-center gap-2 text-sm">
                  <span className="truncate text-stone-700" title={ERROR_CATALOG[e.code] ?? e.code}>{ERROR_CATALOG[e.code] ?? e.code}</span>
                  <span className="h-3 rounded-full bg-brand-50"><span className="block h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${(e.n / maxErr) * 100}%` }} /></span>
                  <span className="w-16 text-right text-xs tabular-nums text-stone-600">{e.n} siswa</span>
                </li>
              ))}
              {!topErr.length && <li className="text-sm text-stone-500">Belum ada data kesalahan.</li>}
            </ul>
          </section>
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4"><p className="text-xs font-semibold text-stone-500">Paket Terakhir Dikerjakan</p><p className="mt-1 font-semibold">{lastFinished?.session.package.title ?? "—"}</p></div>
            <div className="card p-4"><p className="text-xs font-semibold text-stone-500">Rata-rata Skor Kelas</p><p className="mt-1 text-2xl font-bold">{classAvg ?? "—"}</p></div>
          </div>
          <Link href="/guru/tugas" className="card flex items-center justify-between p-4 hover:shadow-md">
            <span><span className="block text-xs font-semibold text-stone-500">Tugas PDF belum dikoreksi</span><span className="text-2xl font-bold">{waitingPdf}</span></span>
            <span className="btn btn-primary btn-sm">Koreksi →</span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
