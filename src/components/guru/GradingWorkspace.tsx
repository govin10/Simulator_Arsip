"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL, fmtSize } from "@/lib/tugas";

type Row = {
  studentId: string; name: string; username: string;
  sub: { id: string; fileName: string; fileSize: number; submittedAt: string; late: boolean; uploadCount: number; status: string; score: number | null; feedback: string; gradedBy: string | null } | null;
};

export default function GradingWorkspace({ rows, maxScore }: { rows: Row[]; maxScore: number }) {
  const router = useRouter();
  const withSub = rows.filter((r) => r.sub);
  const firstWaiting = withSub.find((r) => r.sub!.status === "SUBMITTED") ?? withSub[0];
  const [sel, setSel] = useState<string | null>(firstWaiting?.studentId ?? null);
  const [filter, setFilter] = useState<"all" | "waiting" | "missing">("all");
  const cur = rows.find((r) => r.studentId === sel)?.sub ? rows.find((r) => r.studentId === sel)! : null;
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Isi ulang formulir hanya saat berpindah siswa / file baru, agar pesan "tersimpan" tidak hilang setelah refresh
  useEffect(() => {
    setScore(cur?.sub?.score != null ? String(cur.sub.score) : "");
    setFeedback(cur?.sub?.feedback ?? "");
    setMsg(null);
  }, [cur?.studentId, cur?.sub?.id, cur?.sub?.submittedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = rows.filter((r) => (filter === "waiting" ? r.sub?.status === "SUBMITTED" : filter === "missing" ? !r.sub : true));
  const nextId = () => {
    const i = withSub.findIndex((r) => r.studentId === sel);
    const after = [...withSub.slice(i + 1), ...withSub.slice(0, i)];
    return (after.find((r) => r.sub!.status === "SUBMITTED") ?? withSub[i + 1])?.studentId ?? null;
  };

  async function save(action: "grade" | "revision", goNext: boolean) {
    if (!cur?.sub) return;
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/submissions/${cur.sub.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, score, feedback }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: j.error });
    setMsg({ ok: true, text: action === "revision" ? "Dikembalikan untuk revisi." : "Nilai tersimpan." });
    const n = goNext ? nextId() : null;
    router.refresh();
    if (n) setSel(n);
  }

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
      <aside className="card h-fit p-2 xl:sticky xl:top-20" aria-label="Daftar siswa">
        <div className="flex gap-1 p-1">
          {([["all", `Semua (${rows.length})`], ["waiting", `Belum dikoreksi (${rows.filter((r) => r.sub?.status === "SUBMITTED").length})`], ["missing", `Belum kumpul (${rows.filter((r) => !r.sub).length})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-md px-2 py-1 text-xs ${filter === k ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-700"}`}>{l}</button>
          ))}
        </div>
        <ul className="mt-1 max-h-[70vh] overflow-auto">
          {shown.map((r) => (
            <li key={r.studentId}>
              <button disabled={!r.sub} onClick={() => setSel(r.studentId)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${sel === r.studentId ? "bg-brand-50 ring-1 ring-brand-500" : r.sub ? "hover:bg-stone-50" : "cursor-default opacity-60"}`}>
                <span className="min-w-0 truncate">{r.name}</span>
                <span className="shrink-0 text-xs">
                  {!r.sub ? <span className="text-stone-500">belum</span>
                    : r.sub.status === "GRADED" ? <strong className="text-brand-700">{r.sub.score}</strong>
                    : r.sub.status === "REVISION" ? <span className="text-amber-700">revisi</span>
                    : <span className="badge bg-sky-100 text-sky-800">baru</span>}
                  {r.sub?.late && <span className="ml-1 text-amber-700" title="Terlambat">⏰</span>}
                </span>
              </button>
            </li>
          ))}
          {!shown.length && <li className="p-2 text-sm text-stone-500">Tidak ada.</li>}
        </ul>
      </aside>

      <section className="card min-h-[70vh] overflow-hidden p-0" aria-label="Pratinjau jawaban">
        {cur?.sub ? (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-4 py-2 text-sm">
              <span className="min-w-0 truncate">📄 <strong>{cur.name}</strong> · {cur.sub.fileName} · {fmtSize(cur.sub.fileSize)}</span>
              <a className="btn btn-sm" href={`/api/submissions/${cur.sub.id}/file`} target="_blank" rel="noopener">Buka di tab baru ↗</a>
            </div>
            <iframe key={cur.sub.id + cur.sub.submittedAt} src={`/api/submissions/${cur.sub.id}/file`} title={`Jawaban ${cur.name}`} className="h-[75vh] w-full flex-1 bg-stone-200" />
          </div>
        ) : (
          <div className="grid h-full min-h-[50vh] place-items-center p-8 text-center text-stone-500">{withSub.length ? "Pilih siswa di kiri." : "Belum ada siswa yang mengumpulkan."}</div>
        )}
      </section>

      <aside className="card h-fit p-4 xl:sticky xl:top-20" aria-label="Penilaian">
        {cur?.sub ? (
          <>
            <h2 className="h2">{cur.name}</h2>
            <p className="text-xs text-stone-500">@{cur.username} · dikumpulkan {cur.sub.submittedAt}{cur.sub.uploadCount > 1 ? ` · unggahan ke-${cur.sub.uploadCount}` : ""}</p>
            <p className="mt-1 text-sm">Status: <strong>{STATUS_LABEL[cur.sub.status]}</strong>{cur.sub.late && <span className="badge ml-2 bg-amber-100 text-amber-800">Terlambat</span>}</p>
            {cur.sub.gradedBy && <p className="text-xs text-stone-500">Terakhir oleh {cur.sub.gradedBy}</p>}
            <label className="label mt-4" htmlFor="score">Nilai (0–{maxScore})</label>
            <input id="score" className="input text-2xl font-bold" inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save("grade", true); } }} autoFocus />
            <label className="label mt-3" htmlFor="fb">Catatan untuk siswa (opsional)</label>
            <textarea id="fb" className="input min-h-[110px]" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="mis. Indeks badan usaha sudah tepat, urutan folder S masih keliru." />
            <button className="btn btn-primary mt-3 w-full" disabled={busy} onClick={() => save("grade", true)}>Simpan & berikutnya →</button>
            <button className="btn mt-2 w-full" disabled={busy} onClick={() => save("grade", false)}>Simpan</button>
            <button className="btn mt-2 w-full text-amber-800" disabled={busy} onClick={() => save("revision", false)} title="Siswa dapat mengunggah ulang">↩ Kembalikan untuk revisi</button>
            {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-brand-700" : "text-red-700"}`} role="status">{msg.text}</p>}
            <p className="mt-3 text-xs text-stone-500">Tekan Enter di kolom nilai untuk menyimpan dan pindah ke jawaban berikutnya yang belum dikoreksi.</p>
          </>
        ) : <p className="text-sm text-stone-500">Belum ada jawaban yang dipilih.</p>}
      </aside>
    </div>
  );
}
