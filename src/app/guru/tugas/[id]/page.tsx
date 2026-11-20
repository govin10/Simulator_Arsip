import { notFound } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AssignmentForm from "@/components/guru/AssignmentForm";
import AssignmentActions from "@/components/guru/AssignmentActions";
import GradingWorkspace from "@/components/guru/GradingWorkspace";
import { requireUser, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtWib, isLate } from "@/lib/tugas";

export const dynamic = "force-dynamic";

export default async function GradePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const { id } = await params;
  const a = await db.assignment.findUnique({
    where: { id },
    include: { classroom: { include: { students: { orderBy: { name: "asc" } } } }, submissions: { include: { gradedBy: { select: { name: true } } } } },
  });
  if (!a || !(await visibleClassIds(user)).includes(a.classroomId)) notFound();
  const rows = a.classroom.students.map((s) => {
    const sub = a.submissions.find((x) => x.studentId === s.id);
    return {
      studentId: s.id, name: s.name, username: s.username,
      sub: sub ? { id: sub.id, fileName: sub.fileName, fileSize: sub.fileSize, submittedAt: fmtWib(sub.submittedAt, false), late: isLate(a, sub.submittedAt), uploadCount: sub.uploadCount, status: sub.status, score: sub.score, feedback: sub.feedback ?? "", gradedBy: sub.gradedBy?.name ?? null } : null,
    };
  });
  const submitted = rows.filter((r) => r.sub).length;
  const graded = rows.filter((r) => r.sub?.status === "GRADED").length;

  return (
    <AppShell user={user} wide>
      <Link href={`/guru/tugas?kelas=${a.classroomId}`} className="text-sm text-brand-700 underline">← Daftar tugas</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">{a.title}</h1>
          <p className="muted">{a.classroom.name} · Tenggat {a.dueAt ? fmtWib(a.dueAt) : "tidak ada"} · Nilai maks {a.maxScore} · {submitted}/{rows.length} terkumpul · {graded} dinilai</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-sm" href={`/api/teacher/export?kelas=${a.classroomId}&detail=1`}>⬇ Ekspor CSV kelas</a>
          <AssignmentActions id={a.id} title={a.title} isOpen={a.isOpen} submitted={submitted} afterDelete="/guru/tugas" />
        </div>
      </div>
      <details className="card mt-3 p-4">
        <summary className="cursor-pointer text-sm font-semibold">Ubah judul, petunjuk, atau tenggat</summary>
        <div className="mt-3">
          <AssignmentForm classes={[]} initial={{ id: a.id, title: a.title, description: a.description, dueAt: a.dueAt?.toISOString() ?? null, allowLate: a.allowLate, maxScore: a.maxScore, classroomIds: [a.classroomId] }} />
        </div>
      </details>
      <GradingWorkspace rows={rows} maxScore={a.maxScore} />
    </AppShell>
  );
}
