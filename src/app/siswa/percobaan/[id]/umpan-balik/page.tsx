import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { componentLabel, stageLabel } from "@/lib/domain";
import type { StageResult } from "@/lib/grading";

export default async function FeedbackPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tahap?: string }> }) {
  const user = await requireUser(["STUDENT"]);
  const { id } = await params;
  const { tahap = "PROCESS" } = await searchParams;
  const a = await db.attempt.findUnique({ where: { id } });
  if (!a || a.studentId !== user.id) redirect("/siswa/praktik");
  const r = ((a.results ?? {}) as Record<string, StageResult>)[tahap];
  if (!r) redirect(`/siswa/percobaan/${id}`);
  const docs = await db.document.findMany({ where: { id: { in: a.docOrder } }, select: { id: true, number: true, subject: true } });
  const docName = new Map(docs.map((d) => [d.id, `${d.number === "-" ? "(tanpa nomor)" : d.number} — ${d.subject}`]));

  // ringkasan per komponen (tanpa kunci jawaban)
  const comp: Record<string, { s: number; n: number }> = {};
  for (const it of r.items) { comp[it.component] ??= { s: 0, n: 0 }; comp[it.component].s += it.score; comp[it.component].n += 1; }
  const groups = new Map<string, typeof r.findings>();
  for (const f of r.findings) { const k = f.documentId ?? "_"; groups.set(k, [...(groups.get(k) ?? []), f]); }
  const nextHref = a.status === "FINISHED" ? `/siswa/percobaan/${id}/hasil` : `/siswa/percobaan/${id}`;

  return (
    <AppShell user={user}>
      <p className="muted">Umpan balik</p>
      <h1 className="h1">{stageLabel(tahap)}</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(comp).map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-xs font-semibold uppercase text-stone-500">{k === "skenario" ? "Skenario kesalahan" : componentLabel(k)}</p>
            <p className="mt-1 text-2xl font-bold">{Math.round((v.s / v.n) * 100)}<span className="text-sm font-normal text-stone-500">%</span></p>
          </div>
        ))}
      </div>
      <div className="card mt-4 p-5">
        <h2 className="h2">Yang perlu diperbaiki ({r.findings.length})</h2>
        <p className="muted">Pesan ini menunjukkan jenis kesalahan dan alasannya, bukan jawaban lengkap. Pelajari, lalu terapkan di tahap berikutnya atau pada percobaan ulang.</p>
        {!r.findings.length && <p className="mt-3 rounded-lg bg-brand-50 p-3 text-brand-800">Hebat! Tidak ada kesalahan pada tahap ini.</p>}
        <div className="mt-3 space-y-3">
          {[...groups.entries()].map(([docId, fs]) => (
            <div key={docId} className="rounded-lg border border-stone-200 p-3">
              {docId !== "_" && <p className="text-sm font-semibold">{docName.get(docId) ?? "Dokumen"}</p>}
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {fs.map((f, i) => { const m = f.message.replace(/^Dokumen no\. [^:]+: /, ""); return <li key={i}>{m.charAt(0).toUpperCase() + m.slice(1)}</li>; })}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <a href={nextHref} className="btn btn-primary">{a.status === "FINISHED" ? "Lihat hasil akhir" : "Lanjut ke tahap berikutnya →"}</a>
      </div>
    </AppShell>
  );
}
