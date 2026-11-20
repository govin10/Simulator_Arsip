"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_RUBRIC, RUBRIC_LEVELS } from "@/lib/domain";

export default function GradeForm({ attemptId, initial, autoScore }: { attemptId: string; initial: { teacherScore: number | null; teacherNote: string; rubric: Record<string, number> }; autoScore: number | null }) {
  const router = useRouter();
  const [rubric, setRubric] = useState(initial.rubric);
  const [score, setScore] = useState(initial.teacherScore?.toString() ?? "");
  const [note, setNote] = useState(initial.teacherNote);
  const [msg, setMsg] = useState("");
  const filled = DEFAULT_RUBRIC.filter((r) => rubric[r.key]);
  const rubricScore = filled.length === DEFAULT_RUBRIC.length ? Math.round((filled.reduce((s, r) => s + rubric[r.key], 0) / (DEFAULT_RUBRIC.length * 4)) * 1000) / 10 : null;

  async function save() {
    const r = await fetch(`/api/teacher/attempts/${attemptId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teacherScore: score, teacherNote: note, rubric }) });
    const j = await r.json();
    setMsg(r.ok ? "Tersimpan." : j.error);
    router.refresh();
  }
  async function remove() {
    if (!confirm("Hapus percobaan ini? Siswa akan mendapat kembali satu kesempatan. Data tidak dapat dikembalikan.")) return;
    await fetch(`/api/teacher/attempts/${attemptId}`, { method: "DELETE" });
    router.push("/guru/analitik");
  }
  return (
    <div className="card p-5">
      <h2 className="h2">Rubrik praktik & nilai akhir</h2>
      <div className="mt-3 space-y-3">
        {DEFAULT_RUBRIC.map((r) => (
          <fieldset key={r.key}>
            <legend className="text-sm font-medium">{r.label}</legend>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {RUBRIC_LEVELS.map((l) => (
                <label key={l.level} title={l.desc} className={`cursor-pointer rounded-md border px-1 py-1 text-center text-xs ${rubric[r.key] === l.level ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 hover:bg-stone-50"}`}>
                  <input type="radio" className="sr-only" name={r.key} checked={rubric[r.key] === l.level} onChange={() => setRubric({ ...rubric, [r.key]: l.level })} />
                  {l.level} · {l.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="mt-3 text-sm">Skor rubrik: <strong>{rubricScore ?? "—"}</strong> · Skor otomatis: <strong>{autoScore ?? "—"}</strong></p>
      <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-2">
        <div>
          <label className="label" htmlFor="ts">Nilai akhir guru (0–100)</label>
          <input id="ts" className="input" inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
        <button className="btn" type="button" disabled={rubricScore == null} onClick={() => setScore(String(rubricScore))}>Pakai skor rubrik</button>
      </div>
      <label className="label mt-3" htmlFor="tn">Catatan (wajib bila menimpa skor otomatis)</label>
      <textarea id="tn" className="input min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn btn-primary mt-3 w-full" onClick={save} disabled={!!score && autoScore != null && Number(score) !== autoScore && !note.trim()}>Simpan penilaian</button>
      {msg && <p className="mt-2 text-sm text-brand-700">{msg}</p>}
      <button className="btn btn-danger mt-6 w-full" onClick={remove}>Hapus percobaan</button>
    </div>
  );
}
