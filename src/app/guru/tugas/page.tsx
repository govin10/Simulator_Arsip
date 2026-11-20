import Link from "next/link";
import AppShell from "@/components/AppShell";
import AssignmentForm from "@/components/guru/AssignmentForm";
import AssignmentActions from "@/components/guru/AssignmentActions";
import { requireUser, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtWib } from "@/lib/tugas";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ kelas?: string }> }) {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const { kelas } = await searchParams;
  const ids = await visibleClassIds(user);
  const classes = await db.classroom.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" }, include: { _count: { select: { students: true } } } });
  const filterIds = kelas && ids.includes(kelas) ? [kelas] : ids;
  const list = await db.assignment.findMany({
    where: { classroomId: { in: filterIds } },
    include: { classroom: { include: { _count: { select: { students: true } } } }, submissions: { select: { status: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell user={user}>
      <h1 className="h1">Tugas & koreksi</h1>
      <p className="muted">Soal tetap dibagikan di kertas. Di sini Anda membuat wadah pengumpulan, lalu mengoreksi PDF yang dikumpulkan siswa.</p>
      <details className="card mt-5 p-5" open={!list.length}>
        <summary className="cursor-pointer h2">+ Buat tugas baru</summary>
        <div className="mt-4"><AssignmentForm classes={classes.map((c) => ({ id: c.id, name: c.name }))} /></div>
      </details>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-sm text-stone-600">Filter kelas:</span>
        <Link href="/guru/tugas" className={`badge px-3 py-1 ${!kelas ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-800"}`}>Semua</Link>
        {classes.map((c) => <Link key={c.id} href={`/guru/tugas?kelas=${c.id}`} className={`badge px-3 py-1 ${kelas === c.id ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-800"}`}>{c.name}</Link>)}
      </div>
      <div className="card mt-3 overflow-x-auto">
        <table className="table">
          <thead><tr><th>Tugas</th><th>Kelas</th><th>Tenggat</th><th className="text-right">Terkumpul</th><th className="text-right">Belum dikoreksi</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list.map((a) => {
              const waiting = a.submissions.filter((s) => s.status === "SUBMITTED").length;
              return (
                <tr key={a.id}>
                  <td><Link href={`/guru/tugas/${a.id}`} className="font-medium text-brand-700 underline">{a.title}</Link>{a.features.length > 0 && <div className="text-xs text-stone-500">{a.features.length} fitur dipilih siswa</div>}</td>
                  <td>{a.classroom.name}</td>
                  <td className="whitespace-nowrap text-sm">{a.dueAt ? fmtWib(a.dueAt, false) : "—"}</td>
                  <td className="text-right tabular-nums">{a.submissions.length}/{a.classroom._count.students}</td>
                  <td className={`text-right tabular-nums ${waiting ? "font-semibold text-amber-700" : ""}`}>{waiting}</td>
                  <td>{a.isOpen ? <span className="badge bg-brand-100 text-brand-800">Dibuka</span> : <span className="badge bg-stone-200 text-stone-600">Ditutup</span>}</td>
                  <td className="whitespace-nowrap text-right">
                    <Link href={`/guru/tugas/${a.id}`} className="btn btn-sm btn-primary">Koreksi</Link>{" "}
                    <AssignmentActions id={a.id} title={a.title} isOpen={a.isOpen} submitted={a.submissions.length} />
                  </td>
                </tr>
              );
            })}
            {!list.length && <tr><td colSpan={7} className="text-stone-500">Belum ada tugas.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
