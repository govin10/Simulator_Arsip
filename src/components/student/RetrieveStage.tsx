"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentPaper, { type PublicDocument } from "./DocumentPaper";
import { submitStage } from "./submit";
import type { Cabinet, FilingSystem } from "@/lib/domain";

type Task = { id: string; prompt: string; answered: boolean; durationMs: number | null };
type Tab = { id: string; number: string; label: string; code: string };
type Card = { number: string; date: string; from: string; to: string; subject: string; code: string; location: string };

export default function RetrieveStage(p: { attemptId: string; homeOrg: string; system: FilingSystem; cabinet: Cabinet; targetSeconds: number; tasks: Task[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(p.tasks);
  const [active, setActive] = useState<string | null>(null);
  const [startAt, setStartAt] = useState<number>(0);
  const [now, setNow] = useState(Date.now());
  const [drawer, setDrawer] = useState(p.cabinet.drawers[0]?.id);
  const [folder, setFolder] = useState<{ id: string; label: string; tabs: Tab[] } | null>(null);
  const [doc, setDoc] = useState<PublicDocument | null>(null);
  const [mode, setMode] = useState<"lemari" | "kartu">("lemari");
  const [q, setQ] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const api = `/api/attempts/${p.attemptId}`;
  const promptRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);

  async function call(body: object) {
    const r = await fetch(`${api}/retrieval`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    return j;
  }
  const step = (s: object) => active && call({ action: "step", taskId: active, step: s }).catch(() => {});

  async function start(t: Task) {
    setErr("");
    const j = await call({ action: "start", taskId: t.id });
    // sinkronkan jam dengan server agar timer tidak bisa dimanipulasi
    const offset = Date.now() - new Date(j.serverNow).getTime();
    setStartAt(new Date(j.shownAt).getTime() + offset);
    setActive(t.id); setFolder(null); setDoc(null); setCards([]); setQ("");
    setTimeout(() => promptRef.current?.focus(), 50);
  }
  async function openFolder(id: string, label: string) {
    const r = await fetch(`${api}/folder?folderId=${encodeURIComponent(id)}`);
    const j = await r.json();
    setFolder({ id, label, tabs: j.tabs ?? [] }); setDoc(null);
    step({ kind: "OPEN_FOLDER", folderId: id });
  }
  async function openDoc(id: string) {
    const r = await fetch(`${api}/doc?docId=${encodeURIComponent(id)}`);
    const j = await r.json();
    setDoc(j.doc);
    step({ kind: "OPEN_DOC", docId: id });
  }
  async function search(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch(`${api}/cards?q=${encodeURIComponent(q)}`);
    setCards((await r.json()).cards ?? []);
    step({ kind: "SEARCH_CARD", q });
  }
  async function answer(notFound: boolean) {
    if (!active) return;
    if (notFound && !confirm("Yakin arsip yang diminta tidak ada di lemari?")) return;
    setBusy(true);
    try {
      const j = await call({ action: "answer", taskId: active, documentId: notFound ? null : doc?.id, notFound });
      setTasks((ts) => ts.map((t) => (t.id === active ? { ...t, answered: true, durationMs: j.durationMs } : t)));
      setActive(null); setDoc(null); setFolder(null);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  async function finish() {
    setBusy(true);
    try {
      await submitStage(p.attemptId, "RETRIEVE", {});
      router.push(`/siswa/percobaan/${p.attemptId}/umpan-balik?tahap=RETRIEVE`);
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  const activeTask = tasks.find((t) => t.id === active);
  const elapsed = active ? Math.max(0, Math.floor((now - startAt) / 1000)) : 0;
  const allDone = tasks.every((t) => t.answered);
  const activeDrawer = p.cabinet.drawers.find((d) => d.id === drawer);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="card h-fit p-3 lg:sticky lg:top-20">
        <h2 className="text-sm font-semibold">Permintaan pencarian</h2>
        <p className="mt-1 text-xs text-stone-500">Timer berjalan sejak permintaan dibuka sampai kamu memastikan pilihan. Target: {p.targetSeconds} detik per dokumen.</p>
        <ol className="mt-3 space-y-2">
          {tasks.map((t, i) => (
            <li key={t.id} className={`rounded-lg border p-2 text-sm ${t.id === active ? "border-brand-500 bg-brand-50" : "border-stone-200"}`}>
              <p className="font-semibold">Permintaan {i + 1}</p>
              {t.answered ? (
                <p className="text-xs text-stone-600">✓ Dijawab · {Math.round((t.durationMs ?? 0) / 1000)} detik</p>
              ) : t.id === active ? (
                <p className="text-xs text-brand-700">Sedang dikerjakan</p>
              ) : (
                <button className="btn btn-sm mt-1" disabled={!!active} onClick={() => start(t)}>Buka permintaan</button>
              )}
            </li>
          ))}
        </ol>
        <button className="btn btn-primary mt-4 w-full" disabled={!allDone || busy} onClick={finish}>{busy ? "Memeriksa…" : "Kirim tahap 3"}</button>
        {!allDone && <p className="mt-1 text-xs text-stone-500">Jawab semua permintaan untuk mengirim.</p>}
        {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
      </aside>

      <section>
        {!activeTask ? (
          <div className="card grid place-items-center p-10 text-center text-stone-600">
            <p>{allDone ? "Semua permintaan sudah dijawab. Kirim tahap 3 untuk melihat hasil." : "Buka satu permintaan untuk mulai mencari arsip."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="card flex flex-wrap items-center justify-between gap-3 border-brand-500 p-4">
              <h2 ref={promptRef} tabIndex={-1} className="text-base font-semibold outline-none">“{activeTask.prompt}”</h2>
              <span className={`rounded-lg px-3 py-1 font-mono text-lg ${elapsed > p.targetSeconds ? "bg-amber-100 text-amber-900" : "bg-stone-100"}`} aria-label="Waktu berjalan">
                ⏱ {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
              </span>
            </div>
            <div className="flex gap-2" role="tablist">
              <button role="tab" aria-selected={mode === "lemari"} className={`btn btn-sm ${mode === "lemari" ? "btn-primary" : ""}`} onClick={() => setMode("lemari")}>Telusuri lemari</button>
              <button role="tab" aria-selected={mode === "kartu"} className={`btn btn-sm ${mode === "kartu" ? "btn-primary" : ""}`} onClick={() => setMode("kartu")}>Cari di register kartu kendali</button>
            </div>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="space-y-3">
                {mode === "lemari" ? (
                  <div className="rounded-2xl bg-kayu-700 p-3">
                    <div className="flex flex-wrap gap-2">
                      {p.cabinet.drawers.map((d) => (
                        <button key={d.id} onClick={() => { setDrawer(d.id); step({ kind: "OPEN_DRAWER", drawerId: d.id }); }}
                          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${d.id === drawer ? "bg-kayu-100 text-kayu-700" : "bg-kayu-500 text-white"}`}>{d.label}</button>
                      ))}
                    </div>
                    <div className="mt-3 space-y-2 rounded-xl bg-kayu-100 p-2">
                      {activeDrawer?.guides.map((g) => (
                        <div key={g.id}>
                          <p className="text-xs font-bold text-kayu-700">{g.label}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {g.folders.flatMap((f) => (f.subfolders?.length ? f.subfolders.map((s) => ({ ...s, label: `${f.label} › ${s.label}` })) : [f])).map((f) => (
                              <button key={f.id} onClick={() => openFolder(f.id, f.label)}
                                className={`rounded border px-2 py-1 text-xs ${folder?.id === f.id ? "border-brand-500 bg-brand-50" : "border-amber-300 bg-amber-50 hover:bg-amber-100"}`}>📁 {f.label}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="card p-3">
                    <form onSubmit={search} className="flex gap-2">
                      <input className="input" placeholder="Ketik pengirim, perihal, kode, atau tanggal (YYYY-MM-DD)" value={q} onChange={(e) => setQ(e.target.value)} />
                      <button className="btn">Cari</button>
                    </form>
                    <ul className="mt-2 space-y-2">
                      {cards.map((c, i) => (
                        <li key={i} className="rounded-lg border border-stone-200 p-2 text-xs">
                          <p><strong>{c.number}</strong> · {c.date} · kode <strong>{c.code}</strong></p>
                          <p>{c.from} → {c.to}</p>
                          <p>Perihal: {c.subject}</p>
                          <p className="text-stone-600">Lokasi: {c.location}</p>
                        </li>
                      ))}
                      {!cards.length && <li className="text-xs text-stone-500">Hasil pencarian kartu kendali tampil di sini. Kartu hanya menunjukkan lokasi; buka foldernya di lemari untuk mengambil arsip.</li>}
                    </ul>
                  </div>
                )}
                {folder && (
                  <div className="card p-3">
                    <p className="text-sm font-semibold">📂 {folder.label}</p>
                    <ul className="mt-2 space-y-1">
                      {folder.tabs.map((t) => (
                        <li key={t.id}>
                          <button onClick={() => openDoc(t.id)} className={`w-full rounded border px-2 py-1 text-left text-xs ${doc?.id === t.id ? "border-brand-500 bg-brand-50" : "border-stone-200 hover:bg-stone-50"}`}>
                            <span className="font-semibold">{t.code}</span> · {t.label} · no. {t.number}
                          </button>
                        </li>
                      ))}
                      {!folder.tabs.length && <li className="text-xs text-stone-500">Folder kosong.</li>}
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {doc ? <DocumentPaper doc={doc} homeOrg={p.homeOrg} /> : <div className="card p-6 text-center text-sm text-stone-500">Buka arsip dari folder untuk membacanya.</div>}
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary" disabled={!doc || busy} onClick={() => answer(false)}>Pastikan: ini arsip yang diminta</button>
                  <button className="btn" disabled={busy} onClick={() => answer(true)}>Arsip tidak ada</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
