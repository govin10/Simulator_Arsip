"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Init = { id?: string; title: string; description: string; dueAt: string | null; allowLate: boolean; maxScore: number; classroomIds: string[] };
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/** Formulir buat/ubah tugas. Tenggat diisi dengan jam perangkat guru (WIB). */
export default function AssignmentForm({ classes, initial, onDone }: { classes: { id: string; name: string }[]; initial?: Init; onDone?: () => void }) {
  const router = useRouter();
  const editing = !!initial?.id;
  const [f, setF] = useState({
    title: initial?.title ?? "", description: initial?.description ?? "", due: toLocalInput(initial?.dueAt ?? null),
    allowLate: initial?.allowLate ?? true, maxScore: initial?.maxScore ?? 100, classroomIds: initial?.classroomIds ?? (classes.length === 1 ? [classes[0].id] : []),
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const body = { title: f.title, description: f.description, dueAt: f.due ? new Date(f.due).toISOString() : null, allowLate: f.allowLate, maxScore: Number(f.maxScore), classroomIds: f.classroomIds };
    const r = await fetch(editing ? `/api/teacher/assignments/${initial!.id}` : "/api/teacher/assignments", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: j.error });
    setMsg({ ok: true, text: editing ? "Perubahan disimpan." : `Tugas dibuat untuk ${f.classroomIds.length} kelas.` });
    if (!editing) setF({ ...f, title: "", description: "", due: "" });
    router.refresh();
    onDone?.();
  }
  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2"><label className="label" htmlFor="t">Judul tugas</label><input id="t" className="input" placeholder="mis. Tugas 1 – Sistem penyimpanan abjad" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></div>
      <div className="md:col-span-2"><label className="label" htmlFor="d">Petunjuk untuk siswa (opsional)</label><textarea id="d" className="input min-h-[80px]" placeholder="mis. Kerjakan soal di lembar yang dibagikan, tulis nama dan kelas, lalu pindai menjadi satu file PDF." value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      {!editing && (
        <fieldset className="md:col-span-2">
          <legend className="label">Untuk kelas</legend>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => (
              <label key={c.id} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${f.classroomIds.includes(c.id) ? "border-brand-600 bg-brand-50 font-medium text-brand-800" : "border-stone-300"}`}>
                <input type="checkbox" className="sr-only" checked={f.classroomIds.includes(c.id)} onChange={(e) => setF({ ...f, classroomIds: e.target.checked ? [...f.classroomIds, c.id] : f.classroomIds.filter((x) => x !== c.id) })} />
                {f.classroomIds.includes(c.id) ? "✓ " : ""}{c.name}
              </label>
            ))}
            {!classes.length && <p className="text-sm text-stone-500">Belum ada kelas. Kelas muncul setelah siswa mendaftar, atau buat di menu Kelas & akun.</p>}
          </div>
        </fieldset>
      )}
      <div><label className="label" htmlFor="due">Tenggat (opsional)</label><input id="due" type="datetime-local" className="input" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
      <div><label className="label" htmlFor="max">Nilai maksimal</label><input id="max" type="number" min={1} max={1000} className="input" value={f.maxScore} onChange={(e) => setF({ ...f, maxScore: Number(e.target.value) })} /></div>
      <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={f.allowLate} onChange={(e) => setF({ ...f, allowLate: e.target.checked })} /> Tetap terima pengumpulan setelah tenggat (ditandai &ldquo;terlambat&rdquo;)</label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button className="btn btn-primary" disabled={busy}>{busy ? "Menyimpan…" : editing ? "Simpan perubahan" : "Buat tugas"}</button>
        {msg && <span className={`text-sm ${msg.ok ? "text-brand-700" : "text-red-700"}`} role="status">{msg.text}</span>}
      </div>
    </form>
  );
}
