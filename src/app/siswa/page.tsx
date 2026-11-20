import AppShell from "@/components/AppShell";
import Uploader from "@/components/siswa/Uploader";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { blobAccess, storageMode } from "@/lib/storage";
import { STATUS_LABEL, canSubmit, fmtSize, fmtWib, isLate } from "@/lib/tugas";

export const dynamic = "force-dynamic";

export default async function StudentHome() {
  const user = await requireUser(["STUDENT"]);
  const me = await db.user.findUnique({ where: { id: user.id }, include: { classroom: true } });
  const assignments = me?.classroomId
    ? await db.assignment.findMany({
        where: { classroomId: me.classroomId },
        include: { submissions: { where: { studentId: user.id } } },
        orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      })
    : [];
  const mode = storageMode();
  const pending = assignments.filter((a) => !a.submissions[0] && canSubmit(a, null).ok).length;

  return (
    <AppShell user={user}>
      <h1 className="h1">Tugas saya</h1>
      <p className="muted mt-1">Kelas {me?.classroom?.name ?? "-"} · {pending ? `${pending} tugas belum dikumpulkan` : "Semua tugas yang dibuka sudah dikumpulkan"}</p>
      {!assignments.length && <div className="card mt-6 p-6 text-stone-600">Belum ada tugas dari guru untuk kelasmu.</div>}
      <div className="mt-6 space-y-4">
        {assignments.map((a) => {
          const sub = a.submissions[0];
          const can = canSubmit(a, sub);
          const overdue = a.dueAt && new Date() > a.dueAt;
          return (
            <article key={a.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="h2">{a.title}</h2>
                  <p className={`text-sm ${overdue && !sub ? "font-medium text-red-700" : "text-stone-600"}`}>
                    Tenggat: {a.dueAt ? fmtWib(a.dueAt) : "tidak ada"}{!a.isOpen && " · pengumpulan ditutup"}
                  </p>
                </div>
                <Badge status={sub?.status} />
              </div>
              {a.description && <p className="mt-3 whitespace-pre-line text-sm">{a.description}</p>}

              {sub && (
                <div className="mt-4 rounded-lg border border-stone-200 p-3 text-sm">
                  <p>
                    <a className="font-medium text-brand-700 underline" href={`/api/submissions/${sub.id}/file`} target="_blank" rel="noopener">📄 {sub.fileName}</a>
                    <span className="text-stone-500"> · {fmtSize(sub.fileSize)} · dikumpulkan {fmtWib(sub.submittedAt, false)}</span>
                    {isLate(a, sub.submittedAt) && <span className="badge ml-2 bg-amber-100 text-amber-800">Terlambat</span>}
                  </p>
                  {sub.status === "GRADED" && (
                    <p className="mt-2 text-base">Nilai: <strong className="text-2xl">{sub.score}</strong> <span className="text-stone-500">/ {a.maxScore}</span></p>
                  )}
                  {sub.feedback && <p className={`mt-2 whitespace-pre-line rounded p-2 ${sub.status === "REVISION" ? "bg-amber-50 text-amber-900" : "bg-stone-50"}`}><strong>Catatan guru:</strong> {sub.feedback}</p>}
                </div>
              )}

              <div className="mt-4">
                {can.ok ? (
                  <Uploader assignmentId={a.id} studentId={user.id} mode={mode} access={blobAccess()} replacing={!!sub} />
                ) : (
                  !sub && <p className="text-sm text-stone-500">{can.reason}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}

function Badge({ status }: { status?: string }) {
  if (!status) return <span className="badge bg-stone-200 text-stone-700">Belum dikumpulkan</span>;
  const c = status === "GRADED" ? "bg-brand-100 text-brand-800" : status === "REVISION" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800";
  return <span className={`badge ${c}`}>{STATUS_LABEL[status]}</span>;
}
