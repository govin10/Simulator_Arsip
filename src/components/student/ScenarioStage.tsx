"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentPaper, { type PublicDocument } from "./DocumentPaper";
import { SaveIndicator, clearLocalDraft, useAutosave, useEventLog } from "./hooks";
import { submitStage } from "./submit";
import { SCENARIO_TYPES, scenarioLabel, type Cabinet, type FilingSystem, type Location, type ScenarioType } from "@/lib/domain";

type Tab = { tabId: string; docId: string; code: string; number: string; label: string };
type Card = { docId: string; number: string; date: string; from: string; to: string; subject: string; code: string; location: string };
type Report = { targetKind: "tab" | "card"; targetId: string; cause: ScenarioType; fix?: string };

export default function ScenarioStage(p: {
  attemptId: string; homeOrg: string; system: FilingSystem; cabinet: Cabinet; locations: Location[];
  folders: Record<string, Tab[]>; cards: Card[]; docs: PublicDocument[]; initial: { reports: Report[] } | null;
}) {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>(p.initial?.reports ?? []);
  const [target, setTarget] = useState<{ kind: "tab" | "card"; id: string; title: string } | null>(null);
  const [cause, setCause] = useState<ScenarioType | "">("");
  const [fix, setFix] = useState("");
  const [viewing, setViewing] = useState<PublicDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const log = useEventLog(p.attemptId);
  const data = useMemo(() => ({ reports }), [reports]);
  const status = useAutosave(p.attemptId, "SCENARIO", data);
  const locById = new Map(p.locations.map((l) => [l.id, l]));
  const docById = new Map(p.docs.map((d) => [d.id, d]));
  const reported = new Set(reports.map((r) => r.targetId));

  function pick(kind: "tab" | "card", id: string, title: string) {
    setTarget({ kind, id, title }); setCause(kind === "card" ? "MISSING_METADATA" : ""); setFix("");
    log("SCN_SELECT", { kind, id });
  }
  function addReport() {
    if (!target || !cause) return;
    setReports((r) => [...r.filter((x) => x.targetId !== target.id), { targetKind: target.kind, targetId: target.id, cause, fix: fix || undefined }]);
    log("SCN_REPORT", { target: target.id, cause });
    setTarget(null);
  }
  async function submit() {
    if (!confirm(`Kirim ${reports.length} laporan temuan? Laporan yang keliru mengurangi skor.`)) return;
    setBusy(true);
    try {
      await submitStage(p.attemptId, "SCENARIO", { reports });
      clearLocalDraft(p.attemptId, "SCENARIO");
      router.push(`/siswa/percobaan/${p.attemptId}/umpan-balik?tahap=SCENARIO`);
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }
  const tabCauses = SCENARIO_TYPES.filter((t) => t.value !== "MISSING_METADATA");

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm">Lemari di bawah sudah diisi oleh petugas lain dan <strong>mengandung beberapa kesalahan</strong>. Bandingkan isi lemari dengan register kartu kendali, tandai yang salah, pilih penyebab, dan tulis perbaikannya.</p>
        <div className="flex items-center gap-3"><SaveIndicator status={status} /><button className="btn btn-primary" onClick={submit} disabled={busy}>Kirim tahap 4 ({reports.length} temuan)</button></div>
        {err && <p className="w-full text-xs text-red-700">{err}</p>}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl bg-kayu-700 p-3" aria-label="Lemari bermasalah">
          {p.cabinet.drawers.map((d) => (
            <details key={d.id} className="mb-2 rounded-xl bg-kayu-100 p-2" open>
              <summary className="cursor-pointer text-sm font-bold text-kayu-700">{d.label}</summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {p.locations.filter((l) => l.drawerId === d.id).map((l) => (
                  <div key={l.id} className="rounded-md border border-amber-300 bg-amber-50 p-1.5">
                    <p className="text-xs font-semibold text-amber-900">📁 {l.label} {l.code && <span className="font-normal">({l.code})</span>}</p>
                    <ol className="mt-1 space-y-1">
                      {(p.folders[l.id] ?? []).map((t, i) => (
                        <li key={t.tabId} className="flex items-center gap-1">
                          <span className="w-4 text-right text-[10px] text-stone-500">{i + 1}</span>
                          <button onClick={() => pick("tab", t.tabId, `Tab ${t.code} · ${t.label} (no. ${t.number}) di ${l.label}`)}
                            className={`flex-1 truncate rounded border bg-white px-1.5 py-0.5 text-left text-xs ${target?.id === t.tabId ? "border-brand-500 ring-1 ring-brand-500" : reported.has(t.tabId) ? "border-red-400 bg-red-50" : "border-stone-200"}`}>
                            <strong>{t.code}</strong> · {t.label} · {t.number}
                          </button>
                          <button className="btn btn-sm px-1.5" aria-label="Baca dokumen" onClick={() => { const d = docById.get(t.docId); if (d) { setViewing(d); log("OPEN_DOC", { docId: d.id, stage: "SCENARIO" }); } }}>👁</button>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </section>
        <section className="space-y-4">
          <div className="card overflow-x-auto p-3">
            <h2 className="text-sm font-semibold">Register kartu kendali</h2>
            <table className="table mt-2 text-xs">
              <thead><tr><th>No.</th><th>Tanggal</th><th>Asal → tujuan</th><th>Perihal</th><th>Kode</th><th>Lokasi</th><th /></tr></thead>
              <tbody>
                {p.cards.map((c) => (
                  <tr key={c.docId} className={reported.has(c.docId) ? "bg-red-50" : ""}>
                    <td>{c.number}</td><td>{c.date || <Empty />}</td><td>{c.from} → {c.to}</td><td>{c.subject || <Empty />}</td><td>{c.code || <Empty />}</td>
                    <td>{locById.get(c.location)?.label ?? c.location}</td>
                    <td><button className="btn btn-sm" onClick={() => pick("card", c.docId, `Kartu kendali no. ${c.number}`)}>Tandai</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {target && (
            <div className="card border-brand-500 p-4">
              <h3 className="text-sm font-semibold">Laporkan masalah: {target.title}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="cause">Penyebab</label>
                  <select id="cause" className="input" value={cause} onChange={(e) => { setCause(e.target.value as ScenarioType); setFix(""); }}>
                    <option value="">— pilih —</option>
                    {(target.kind === "card" ? SCENARIO_TYPES.filter((t) => t.value === "MISSING_METADATA") : tabCauses).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="fix">Perbaikan</label>
                  {cause === "WRONG_FOLDER" ? (
                    <select id="fix" className="input" value={fix} onChange={(e) => setFix(e.target.value)}>
                      <option value="">— pindahkan ke —</option>
                      {p.locations.map((l) => <option key={l.id} value={l.id}>{l.path}</option>)}
                    </select>
                  ) : cause === "WRONG_CODE" ? (
                    <input id="fix" className="input" placeholder="Kode yang benar" value={fix} onChange={(e) => setFix(e.target.value)} />
                  ) : cause === "MISSING_METADATA" ? (
                    <input id="fix" className="input" placeholder="Isi kolom yang kosong (tanggal: YYYY-MM-DD)" value={fix} onChange={(e) => setFix(e.target.value)} />
                  ) : cause === "DUPLICATE" ? (
                    <p className="text-sm text-stone-600">Salinan ganda akan dikeluarkan dari folder.</p>
                  ) : cause === "WRONG_ORDER" ? (
                    <p className="text-sm text-stone-600">Dokumen akan ditukar ke urutan yang benar.</p>
                  ) : <p className="text-sm text-stone-500">Pilih penyebab dulu.</p>}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn btn-primary" disabled={!cause} onClick={addReport}>Simpan temuan</button>
                <button className="btn" onClick={() => setTarget(null)}>Batal</button>
              </div>
            </div>
          )}
          <div className="card p-3">
            <h2 className="text-sm font-semibold">Temuanmu ({reports.length})</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {reports.map((r) => (
                <li key={r.targetId} className="flex items-start justify-between gap-2 rounded border border-stone-200 p-2">
                  <span>{r.targetKind === "card" ? "Kartu" : "Tab"} · {scenarioLabel(r.cause)}{r.fix ? ` → ${locById.get(r.fix)?.path ?? r.fix}` : ""}</span>
                  <button className="btn btn-sm" onClick={() => setReports((x) => x.filter((y) => y !== r))}>Hapus</button>
                </li>
              ))}
              {!reports.length && <li className="text-xs text-stone-500">Belum ada temuan.</li>}
            </ul>
          </div>
        </section>
      </div>
      {viewing && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/50 p-4" onClick={() => setViewing(null)} role="dialog" aria-modal>
          <div className="mx-auto max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <DocumentPaper doc={viewing} homeOrg={p.homeOrg} />
            <button className="btn mx-auto mt-3 flex" onClick={() => setViewing(null)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
const Empty = () => <em className="text-red-600">(kosong)</em>;
