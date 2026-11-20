import Link from "next/link";
import AppShell from "@/components/AppShell";
import { requireUser, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Recap({ searchParams }: { searchParams: Promise<{ kelas?: string }> }) {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const sp = await searchParams;
  const ids = await visibleClassIds(user);
  const classes = await db.classroom.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" } });
  const classId = sp.kelas && ids.includes(sp.kelas) ? sp.kelas : classes[0]?.id;
  const c = classId
    ? await db.classroom.findUnique({ where: { id: classId }, include: { students: { orderBy: { name: "asc" } }, assignments: { orderBy: { createdAt: "asc" }, include: { submissions: true } } } })
    : null;
  const waiting = c ? c.assignments.reduce((n, a) => n + a.submissions.filter((s) => s.status === "SUBMITTED").length, 0) : 0;
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((p, q) => p + q, 0) / xs.length) * 10) / 10 : null);

  return (
    <AppShell user={user} wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">Rekap nilai</h1>
          <p className="muted">{c ? `${c.name} · ${c.students.length} siswa · ${c.assignments.length} tugas · ${waiting} jawaban belum dikoreksi` : "Belum ada kelas."}</p>
        </div>
        {c && (
          <div className="flex flex-wrap gap-2">
            <a className="btn" href={`/api/teacher/export?kelas=${c.id}`}>⬇ Rekap nilai (CSV/Excel)</a>
            <a className="btn" href={`/api/teacher/export?kelas=${c.id}&detail=1`}>⬇ Detail pengumpulan</a>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {classes.map((k) => <Link key={k.id} href={`/guru?kelas=${k.id}`} className={`badge px-3 py-1 text-sm ${k.id === classId ? "bg-brand-600 text-white" : "bg-stone-200 text-stone-700"}`}>{k.name}</Link>)}
      </div>
      {c && (
        <div className="card mt-4 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="sticky left-0 bg-stone-50">Siswa</th>
                {c.assignments.map((a) => <th key={a.id} className="min-w-[110px] text-center normal-case"><Link href={`/guru/tugas/${a.id}`} className="text-brand-700 underline">{a.title}</Link><div className="font-normal text-stone-500">maks {a.maxScore}</div></th>)}
                <th className="text-right">Rata-rata</th>
              </tr>
            </thead>
            <tbody>
              {c.students.map((s) => {
                const scores: number[] = [];
                return (
                  <tr key={s.id}>
                    <td className="sticky left-0 bg-white font-medium">{s.name}<div className="text-xs font-normal text-stone-500">@{s.username}</div></td>
                    {c.assignments.map((a) => {
                      const sub = a.submissions.find((x) => x.studentId === s.id);
                      if (sub?.status === "GRADED" && sub.score != null) scores.push(sub.score);
                      return (
                        <td key={a.id} className="text-center tabular-nums">
                          {!sub ? <span className="text-stone-300" title="Belum mengumpulkan">—</span>
                            : sub.status === "GRADED" ? <strong>{sub.score}</strong>
                            : sub.status === "REVISION" ? <span className="badge bg-amber-100 text-amber-800">revisi</span>
                            : <Link href={`/guru/tugas/${a.id}`} className="badge bg-sky-100 text-sky-800">koreksi</Link>}
                        </td>
                      );
                    })}
                    <td className="text-right font-semibold tabular-nums">{avg(scores) ?? "—"}</td>
                  </tr>
                );
              })}
              {!c.students.length && <tr><td colSpan={c.assignments.length + 2} className="text-stone-500">Belum ada siswa di kelas ini.</td></tr>}
            </tbody>
            {c.students.length > 0 && c.assignments.length > 0 && (
              <tfoot>
                <tr>
                  <td className="sticky left-0 bg-stone-50 px-3 py-2 text-sm font-semibold">Terkumpul / rata-rata</td>
                  {c.assignments.map((a) => {
                    const g = a.submissions.filter((x) => x.status === "GRADED" && x.score != null).map((x) => x.score!);
                    return <td key={a.id} className="bg-stone-50 px-3 py-2 text-center text-sm">{a.submissions.length}/{c.students.length}<div className="font-semibold">{avg(g) ?? "—"}</div></td>;
                  })}
                  <td className="bg-stone-50" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </AppShell>
  );
}
