"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentPaper, { type PublicDocument } from "./DocumentPaper";
import { SaveIndicator, clearLocalDraft, readLocalDraft, useAutosave, useEventLog } from "./hooks";
import { submitStage } from "./submit";
import { ACCESS, DOC_TYPES, META_FIELDS, RETENTION, SYSTEMS, VALUES, type FilingSystem, type Location } from "@/lib/domain";

type Meta = Partial<Record<string, string>>;
type Ans = { type?: string; value?: string; system?: string; catchword?: string; index?: string; code?: string; meta?: Meta };

export default function ProcessStage(p: {
  attemptId: string; homeOrg: string; system: FilingSystem; docs: PublicDocument[]; locations: Location[];
  lockSystem: boolean; metadataFields: string[]; initial: Record<string, Ans> | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, Ans>>(() => p.initial ?? {});
  const [cur, setCur] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const log = useEventLog(p.attemptId);
  const status = useAutosave(p.attemptId, "PROCESS", answers);

  useEffect(() => {
    // pulihkan cadangan lokal bila lebih baru dari server (mis. koneksi putus)
    const local = readLocalDraft<Record<string, Ans>>(p.attemptId, "PROCESS");
    if (local && Object.keys(local).length > Object.keys(p.initial ?? {}).length) setAnswers(local);
  }, [p.attemptId, p.initial]);

  const doc = p.docs[cur];
  useEffect(() => { log("OPEN_DOC", { docId: doc.id, stage: "PROCESS" }); }, [doc.id, log]);
  const a = answers[doc.id] ?? {};
  const set = (patch: Partial<Ans>) => {
    setAnswers((prev) => ({ ...prev, [doc.id]: { ...prev[doc.id], ...patch, system: p.lockSystem ? p.system : (patch.system ?? prev[doc.id]?.system) } }));
    log("CHANGE", { docId: doc.id, fields: Object.keys(patch) });
  };
  const setMeta = (k: string, v: string) => set({ meta: { ...(a.meta ?? {}), [k]: v } });

  const fields = META_FIELDS.filter((f) => p.metadataFields.includes(f.key));
  const required = (x: Ans) => [x.type, x.value, p.lockSystem ? "x" : x.system, x.catchword, x.index, x.code, ...fields.map((f) => x.meta?.[f.key])];
  const progress = useMemo(() => p.docs.map((d) => { const r = required(answers[d.id] ?? {}); return r.filter(Boolean).length / r.length; }), [answers]); // eslint-disable-line react-hooks/exhaustive-deps
  const incomplete = progress.filter((x) => x < 1).length;

  async function submit() {
    if (incomplete && !confirm(`${incomplete} dokumen belum lengkap. Kolom kosong dihitung salah. Tetap kirim?`)) return;
    setBusy(true); setErr("");
    try {
      const filled = Object.fromEntries(p.docs.map((d) => [d.id, { ...(answers[d.id] ?? {}), system: p.lockSystem ? p.system : answers[d.id]?.system }]));
      await submitStage(p.attemptId, "PROCESS", filled);
      clearLocalDraft(p.attemptId, "PROCESS");
      router.push(`/siswa/percobaan/${p.attemptId}/umpan-balik?tahap=PROCESS`);
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_400px]">
      <nav className="card h-fit p-2 lg:sticky lg:top-20" aria-label="Daftar dokumen">
        <p className="px-2 py-1 text-xs font-semibold uppercase text-stone-500">Dokumen ({p.docs.length})</p>
        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
          {p.docs.map((d, i) => (
            <li key={d.id}>
              <button onClick={() => setCur(i)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${i === cur ? "bg-brand-50 font-semibold text-brand-800 ring-1 ring-brand-500" : "hover:bg-stone-50"}`}>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${progress[i] === 1 ? "bg-brand-600 text-white" : progress[i] > 0 ? "bg-amber-200 text-amber-900" : "bg-stone-200 text-stone-600"}`}>{progress[i] === 1 ? "✓" : i + 1}</span>
                <span className="truncate">{d.number === "-" ? "(tanpa nomor)" : d.number}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 border-t border-stone-100 p-2">
          <SaveIndicator status={status} />
          <button className="btn btn-primary mt-2 w-full" onClick={submit} disabled={busy}>{busy ? "Memeriksa…" : "Kirim tahap 1"}</button>
          {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
        </div>
      </nav>

      <section aria-label="Dokumen">
        <div className="mb-2 flex items-center justify-between text-sm">
          <button className="btn btn-sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>← Sebelumnya</button>
          <span className="text-stone-600">Dokumen {cur + 1} dari {p.docs.length}</span>
          <button className="btn btn-sm" disabled={cur === p.docs.length - 1} onClick={() => setCur(cur + 1)}>Berikutnya →</button>
        </div>
        <DocumentPaper doc={doc} homeOrg={p.homeOrg} />
        <p className="mt-3 text-center text-xs text-stone-500">Kamu bekerja sebagai petugas arsip di <strong>{p.homeOrg}</strong>.</p>
      </section>

      <section className="space-y-3" aria-label="Lembar kerja">
        <fieldset className="card p-4">
          <legend className="px-1 text-sm font-semibold">A. Identifikasi</legend>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Jenis dokumen" value={a.type} onChange={(v) => set({ type: v })} options={DOC_TYPES} />
            <Select label="Nilai guna" value={a.value} onChange={(v) => set({ value: v })} options={VALUES} />
          </div>
        </fieldset>
        <fieldset className="card p-4">
          <legend className="px-1 text-sm font-semibold">B. Klasifikasi, indeks & kode</legend>
          <div className="grid gap-3">
            {p.lockSystem ? (
              <p className="text-sm">Sistem penyimpanan: <strong>{SYSTEMS.find((s) => s.value === p.system)?.label}</strong> <span className="text-xs text-stone-500">(ditetapkan guru)</span></p>
            ) : (
              <Select label="Sistem penyimpanan" value={a.system} onChange={(v) => set({ system: v })} options={SYSTEMS} />
            )}
            <Text label="Kata tangkap" value={a.catchword} onChange={(v) => set({ catchword: v })} />
            <Text label="Indeks" value={a.index} onChange={(v) => set({ index: v })} />
            <Text label="Kode klasifikasi" value={a.code} onChange={(v) => set({ code: v })} />
          </div>
        </fieldset>
        <fieldset className="card p-4">
          <legend className="px-1 text-sm font-semibold">C. Kartu kendali</legend>
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => {
              const v = a.meta?.[f.key] ?? "";
              const wide = ["subject", "from", "to", "location"].includes(f.key);
              return (
                <div key={f.key} className={wide ? "col-span-2" : ""}>
                  {f.key === "date" ? (
                    <Text id={`meta-${f.key}`} label={f.label} type="date" value={v} onChange={(x) => setMeta(f.key, x)} />
                  ) : f.key === "location" ? (
                    <Select id={`meta-${f.key}`} label={f.label} value={v} onChange={(x) => setMeta(f.key, x)} options={p.locations.map((l) => ({ value: l.id, label: l.path }))} />
                  ) : f.key === "access" ? (
                    <Select id={`meta-${f.key}`} label={f.label} value={v} onChange={(x) => setMeta(f.key, x)} options={ACCESS} />
                  ) : f.key === "retention" ? (
                    <Select id={`meta-${f.key}`} label={f.label} value={v} onChange={(x) => setMeta(f.key, x)} options={RETENTION.map((r) => ({ value: r, label: r }))} />
                  ) : (
                    <Text id={`meta-${f.key}`} label={f.label} value={v} onChange={(x) => setMeta(f.key, x)} />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
        <p className="text-xs text-stone-500">Hasil pemeriksaan baru muncul setelah tahap ini dikirim.</p>
      </section>
    </div>
  );
}

function Select({ label, value, onChange, options, id: idIn }: { label: string; value?: string; onChange: (v: string) => void; options: { value: string; label: string }[]; id?: string }) {
  const id = idIn ?? "f-" + label.replace(/\W+/g, "-");
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— pilih —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
function Text({ label, value, onChange, type = "text", id: idIn }: { label: string; value?: string; onChange: (v: string) => void; type?: string; id?: string }) {
  const id = idIn ?? "f-" + label.replace(/\W+/g, "-");
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} type={type} className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} autoComplete="off" spellCheck={false} />
    </div>
  );
}
