"use client";
import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  ACCESS, COMPONENTS, DOC_TYPES, META_FIELDS, PACKAGE_KINDS, RETENTION, SCENARIO_TYPES, SYSTEMS, VALUES,
  expectedOrder, flattenCabinet, normCode, normText, type Cabinet, type FilingSystem, type Folder,
} from "@/lib/domain";

export type EditDoc = {
  id: string; number: string; date: string; sender: string; senderCity: string; recipient: string; recipientCity: string; subject: string; nature: string;
  summary: string; attachment: string; tricky: boolean; keyType: string; keyValue: string; keyCatchword: string; keyCatchAlt: string[]; keyIndex: string;
  keyIndexAlt: string[]; keyCode: string; keyCodeAlt: string[]; keyFolderId: string; keySortKey: string; keyAccess: string; keyRetention: string;
};
type Pkg = {
  title: string; description: string; system: string; lockSystem: boolean; difficulty: number; kind: string; homeOrg: string; homeCity: string;
  kkm: number; maxAttempts: number; targetSeconds: number; minAccuracyForTime: number; weights: Record<string, number>; metadataFields: string[];
  scenario: { enabled: boolean; errors: Record<string, number> }; cabinet: Cabinet; documents: EditDoc[]; tasks: { id?: string; prompt: string; answerRef: string | null }[];
};
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const blankDoc = (homeOrg: string): EditDoc => ({
  id: uid("tmp"), number: "", date: new Date().toISOString().slice(0, 10), sender: "", senderCity: "", recipient: homeOrg, recipientCity: "Pasuruan", subject: "", nature: "Biasa",
  summary: "", attachment: "", tricky: false, keyType: "SURAT_MASUK", keyValue: "BERGUNA", keyCatchword: "", keyCatchAlt: [], keyIndex: "", keyIndexAlt: [], keyCode: "", keyCodeAlt: [],
  keyFolderId: "", keySortKey: "", keyAccess: "BIASA", keyRetention: "2 tahun",
});
const CSV_COLS = ["nomor", "tanggal", "pengirim", "kota_pengirim", "tujuan", "kota_tujuan", "perihal", "sifat", "isi", "lampiran", "jenis", "nilai_guna", "kata_tangkap", "kata_tangkap_alternatif", "indeks", "indeks_alternatif", "kode", "kode_alternatif", "lokasi", "akses", "masa_simpan", "kunci_urutan", "sengaja_mirip"];

export default function PackageEditor({ id, initial, usage }: { id: string; initial: Pkg; usage: { sessions: number; attempts: number } }) {
  const router = useRouter();
  const [pkg, setPkg] = useState<Pkg>(initial);
  const [tab, setTab] = useState("dokumen");
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const locs = useMemo(() => flattenCabinet(pkg.cabinet), [pkg.cabinet]);
  const set = (patch: Partial<Pkg>) => { setPkg((p) => ({ ...p, ...patch })); setDirty(true); };
  const setDoc = (did: string, patch: Partial<EditDoc>) => set({ documents: pkg.documents.map((d) => (d.id === did ? { ...d, ...patch } : d)) });

  const warnings = useMemo(() => {
    const w: string[] = [];
    const ids = new Set(locs.map((l) => l.id));
    if (pkg.documents.length < 8 || pkg.documents.length > 20) w.push(`Jumlah dokumen ${pkg.documents.length}; disarankan 8–20.`);
    pkg.documents.forEach((d, i) => {
      const n = d.number || `#${i + 1}`;
      if (!ids.has(d.keyFolderId)) w.push(`Dokumen ${n}: lokasi kunci belum dipilih atau tidak ada di lemari.`);
      const loc = locs.find((l) => l.id === d.keyFolderId);
      if (loc?.code && normCode(loc.code) !== normCode(d.keyCode) && !d.keyCodeAlt.some((c) => normCode(c) === normCode(loc.code))) w.push(`Dokumen ${n}: kode kunci "${d.keyCode}" berbeda dengan kode folder "${loc.code}". Pastikan memang disengaja.`);
      for (const k of ["number", "sender", "recipient", "subject", "keyCatchword", "keyIndex", "keyCode"] as const) if (!d[k]) w.push(`Dokumen ${n}: kolom ${k} kosong.`);
    });
    const nums = pkg.documents.map((d) => d.number).filter((x) => x && x !== "-");
    nums.filter((x, i) => nums.indexOf(x) !== i).forEach((x) => w.push(`Nomor ganda: ${x} (boleh bila disengaja).`));
    if (!pkg.tasks.length) w.push("Belum ada permintaan temu kembali.");
    if (pkg.tasks.length && !pkg.tasks.some((t) => !t.answerRef)) w.push("Disarankan ada minimal satu permintaan yang arsipnya tidak ada.");
    pkg.tasks.forEach((t, i) => { if (t.answerRef && !pkg.documents.some((d) => d.id === t.answerRef)) w.push(`Permintaan ${i + 1} menunjuk dokumen yang sudah dihapus.`); });
    return w;
  }, [pkg, locs]);

  async function save() {
    setMsg(null);
    const r = await fetch(`/api/packages/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pkg) });
    const j = await r.json();
    if (!r.ok) return setMsg({ ok: false, text: j.error });
    setMsg({ ok: true, text: "Paket tersimpan." }); setDirty(false);
    router.refresh();
  }

  function exportCsv() {
    const rows = pkg.documents.map((d) => [d.number, d.date, d.sender, d.senderCity, d.recipient, d.recipientCity, d.subject, d.nature, d.summary, d.attachment, d.keyType, d.keyValue, d.keyCatchword, d.keyCatchAlt.join("; "), d.keyIndex, d.keyIndexAlt.join("; "), d.keyCode, d.keyCodeAlt.join("; "), locs.find((l) => l.id === d.keyFolderId)?.code || d.keyFolderId, d.keyAccess, d.keyRetention, d.keySortKey, d.tricky ? "ya" : ""]);
    const csv = "﻿" + Papa.unparse({ fields: CSV_COLS, data: rows });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${pkg.title.replace(/\W+/g, "-")}-dokumen.csv`;
    a.click();
  }
  function importCsv(text: string, replace: boolean) {
    const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
    const list = (s?: string) => (s ?? "").split(";").map((x) => x.trim()).filter(Boolean);
    const findLoc = (v: string) => locs.find((l) => l.id === v || (l.code && normCode(l.code) === normCode(v)) || normText(l.label) === normText(v))?.id ?? "";
    const upper = (v: string, allowed: { value: string; label: string }[], dflt: string) => allowed.find((a) => normText(a.value) === normText(v) || normText(a.label) === normText(v))?.value ?? dflt;
    const docs: EditDoc[] = res.data.map((r) => ({
      ...blankDoc(pkg.homeOrg), number: r.nomor ?? "", date: (r.tanggal ?? "").slice(0, 10), sender: r.pengirim ?? "", senderCity: r.kota_pengirim ?? "", recipient: r.tujuan ?? "",
      recipientCity: r.kota_tujuan ?? "", subject: r.perihal ?? "", nature: r.sifat ?? "", summary: r.isi ?? "", attachment: r.lampiran ?? "",
      keyType: upper(r.jenis ?? "", DOC_TYPES, "SURAT_MASUK"), keyValue: upper(r.nilai_guna ?? "", VALUES, "BERGUNA"),
      keyCatchword: r.kata_tangkap ?? "", keyCatchAlt: list(r.kata_tangkap_alternatif), keyIndex: r.indeks ?? "", keyIndexAlt: list(r.indeks_alternatif),
      keyCode: r.kode ?? "", keyCodeAlt: list(r.kode_alternatif), keyFolderId: findLoc(r.lokasi ?? ""), keyAccess: upper(r.akses ?? "", ACCESS, "BIASA"),
      keyRetention: r.masa_simpan || "2 tahun", keySortKey: r.kunci_urutan ?? "", tricky: /^(ya|1|true)$/i.test(r.sengaja_mirip ?? ""),
    }));
    set({ documents: replace ? docs : [...pkg.documents, ...docs] });
    setMsg({ ok: true, text: `${docs.length} dokumen diimpor${res.errors.length ? ` (${res.errors.length} baris bermasalah)` : ""}. Periksa tab Pratinjau, lalu simpan.` });
  }

  const tabs = [["pengaturan", "Pengaturan"], ["lemari", "Lemari"], ["dokumen", `Dokumen & kunci (${pkg.documents.length})`], ["temu", `Temu kembali (${pkg.tasks.length})`], ["pratinjau", `Pratinjau${warnings.length ? ` ⚠ ${warnings.length}` : ""}`]];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">{pkg.title}</h1>
          <p className="muted">Dipakai {usage.sessions} sesi · {usage.attempts} percobaan siswa{usage.attempts ? " — perubahan kunci tidak mengubah hasil yang sudah dinilai." : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-700">Ada perubahan belum disimpan</span>}
          <button className="btn btn-primary" onClick={save}>Simpan paket</button>
        </div>
      </div>
      {msg && <p className={`mt-3 rounded-lg p-3 text-sm ${msg.ok ? "bg-brand-50 text-brand-800" : "bg-red-50 text-red-800"}`} role="status">{msg.text}</p>}
      <div className="mt-4 flex flex-wrap gap-1 border-b border-stone-200" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px rounded-t-lg border px-3 py-2 text-sm ${tab === k ? "border-stone-200 border-b-white bg-white font-semibold" : "border-transparent text-stone-600 hover:text-stone-900"}`}>{l}</button>)}
      </div>
      <div className="rounded-b-xl border border-t-0 border-stone-200 bg-white p-4">
        {tab === "pengaturan" && <Settings pkg={pkg} set={set} />}
        {tab === "lemari" && <CabinetEditor cabinet={pkg.cabinet} onChange={(cabinet) => set({ cabinet })} />}
        {tab === "dokumen" && (
          <div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => { const d = blankDoc(pkg.homeOrg); set({ documents: [...pkg.documents, d] }); setEditing(d.id); }}>+ Dokumen</button>
              <label className="btn cursor-pointer">Impor CSV (tambah)<input type="file" accept=".csv" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) importCsv(await f.text(), false); e.target.value = ""; }} /></label>
              <label className="btn cursor-pointer">Impor CSV (ganti semua)<input type="file" accept=".csv" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f && confirm("Ganti semua dokumen dengan isi CSV?")) importCsv(await f.text(), true); e.target.value = ""; }} /></label>
              <button className="btn" onClick={exportCsv}>Ekspor CSV / templat</button>
            </div>
            <p className="mt-2 text-xs text-stone-500">Kolom CSV: {CSV_COLS.join(", ")}. Alternatif dipisah titik koma. Lokasi boleh diisi kode folder (mis. S, 310, KU.2).</p>
            <div className="mt-3 overflow-x-auto">
              <table className="table">
                <thead><tr><th>#</th><th>Nomor</th><th>Tanggal</th><th>Asal → tujuan</th><th>Perihal</th><th>Kata tangkap</th><th>Indeks</th><th>Kode</th><th>Lokasi</th><th /></tr></thead>
                <tbody>
                  {pkg.documents.map((d, i) => (
                    <Fragment key={d.id}>
                      <tr className={editing === d.id ? "bg-brand-50" : ""}>
                        <td>{i + 1}{d.tricky && <span title="Sengaja mirip/tidak lengkap"> ⚑</span>}</td><td>{d.number}</td><td>{d.date}</td>
                        <td className="max-w-[220px]">{d.sender} → {d.recipient}</td><td>{d.subject}</td><td>{d.keyCatchword}</td><td>{d.keyIndex}</td><td>{d.keyCode}</td>
                        <td>{locs.find((l) => l.id === d.keyFolderId)?.label ?? <span className="text-red-600">belum</span>}</td>
                        <td className="whitespace-nowrap text-right">
                          <button className="btn btn-sm" onClick={() => setEditing(editing === d.id ? null : d.id)}>{editing === d.id ? "Tutup" : "Ubah"}</button>{" "}
                          <button className="btn btn-sm" disabled={i === 0} onClick={() => { const a = [...pkg.documents]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set({ documents: a }); }} aria-label="Naikkan">↑</button>{" "}
                          <button className="btn btn-sm btn-danger" onClick={() => confirm(`Hapus dokumen ${d.number}?`) && set({ documents: pkg.documents.filter((x) => x.id !== d.id) })}>Hapus</button>
                        </td>
                      </tr>
                      {editing === d.id && <tr><td colSpan={10} className="bg-brand-50/40"><DocForm doc={d} locs={locs} onChange={(patch) => setDoc(d.id, patch)} /></td></tr>}
                    </Fragment>
                  ))}
                  {!pkg.documents.length && <tr><td colSpan={10} className="text-stone-500">Belum ada dokumen.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab === "temu" && (
          <div className="space-y-3">
            <p className="muted">Tulis permintaan seperti yang diucapkan atasan. Pilih dokumen jawabannya, atau &ldquo;Arsip tidak ada&rdquo; untuk melatih ketelitian.</p>
            {pkg.tasks.map((t, i) => (
              <div key={t.id ?? i} className="grid gap-2 rounded-lg border border-stone-200 p-3 md:grid-cols-[1fr_320px_auto]">
                <textarea className="input" value={t.prompt} aria-label={`Permintaan ${i + 1}`} onChange={(e) => set({ tasks: pkg.tasks.map((x, j) => (j === i ? { ...x, prompt: e.target.value } : x)) })} />
                <select className="input" value={t.answerRef ?? ""} aria-label="Jawaban" onChange={(e) => set({ tasks: pkg.tasks.map((x, j) => (j === i ? { ...x, answerRef: e.target.value || null } : x)) })}>
                  <option value="">Arsip tidak ada</option>
                  {pkg.documents.map((d) => <option key={d.id} value={d.id}>{d.number} — {d.subject}</option>)}
                </select>
                <button className="btn btn-danger" onClick={() => set({ tasks: pkg.tasks.filter((_, j) => j !== i) })}>Hapus</button>
              </div>
            ))}
            <button className="btn btn-primary" onClick={() => set({ tasks: [...pkg.tasks, { prompt: "", answerRef: null }] })}>+ Permintaan</button>
          </div>
        )}
        {tab === "pratinjau" && (
          <div className="space-y-4">
            <div>
              <h2 className="h2">Pemeriksaan kunci</h2>
              {warnings.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul> : <p className="mt-2 text-sm text-brand-700">Tidak ada masalah yang terdeteksi.</p>}
            </div>
            <div>
              <h2 className="h2">Susunan benar menurut kunci</h2>
              <p className="muted">Urutan di dalam folder dihitung otomatis dari aturan sistem {SYSTEMS.find((s) => s.value === pkg.system)?.label} (atau dari &ldquo;kunci urutan&rdquo; bila diisi). Pastikan sesuai kaidah yang Anda ajarkan.</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {locs.filter((l) => pkg.documents.some((d) => d.keyFolderId === l.id)).map((l) => (
                  <div key={l.id} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm">
                    <p className="font-semibold">📁 {l.path}</p>
                    <ol className="mt-1 list-decimal pl-5">{expectedOrder(pkg.system as FilingSystem, pkg.documents.filter((d) => d.keyFolderId === l.id)).map((d) => <li key={d.id}>{d.keyIndex} · {d.date} · {d.number}</li>)}</ol>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`block ${wide ? "md:col-span-2" : ""}`}><span className="label">{label}</span>{children}</label>;
}
function Settings({ pkg, set }: { pkg: Pkg; set: (p: Partial<Pkg>) => void }) {
  const num = (k: keyof Pkg) => ({ type: "number", className: "input", value: pkg[k] as number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ [k]: Number(e.target.value) } as Partial<Pkg>) });
  const wsum = Object.values(pkg.weights).reduce((a, b) => a + Number(b || 0), 0);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Judul" wide><input className="input" value={pkg.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Deskripsi" wide><input className="input" value={pkg.description} onChange={(e) => set({ description: e.target.value })} /></Field>
        <Field label="Jenis paket"><select className="input" value={pkg.kind} onChange={(e) => set({ kind: e.target.value })}>{PACKAGE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></Field>
        <Field label="Tingkat kesulitan (1–3)"><input {...num("difficulty")} min={1} max={3} /></Field>
        <Field label="Sistem penyimpanan"><select className="input" value={pkg.system} onChange={(e) => set({ system: e.target.value })}>{SYSTEMS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={pkg.lockSystem} onChange={(e) => set({ lockSystem: e.target.checked })} /> Kunci sistem (siswa tidak memilih sistem)</label>
        <Field label="Organisasi fiktif tempat siswa bekerja"><input className="input" value={pkg.homeOrg} onChange={(e) => set({ homeOrg: e.target.value })} /></Field>
        <Field label="Kota organisasi"><input className="input" value={pkg.homeCity} onChange={(e) => set({ homeCity: e.target.value })} /></Field>
        <Field label="KKM"><input {...num("kkm")} /></Field>
        <Field label="Batas percobaan"><input {...num("maxAttempts")} /></Field>
        <Field label="Target waktu temu kembali (detik/dokumen)"><input {...num("targetSeconds")} /></Field>
        <Field label="Akurasi minimum agar skor waktu dihitung (%)"><input {...num("minAccuracyForTime")} /></Field>
      </div>
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Bobot penilaian <span className={`font-normal ${wsum === 100 ? "text-stone-500" : "text-amber-700"}`}>(jumlah {wsum}; dinormalisasi otomatis)</span></h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COMPONENTS.map((c) => <Field key={c.key} label={c.label}><input type="number" className="input" value={pkg.weights[c.key] ?? 0} onChange={(e) => set({ weights: { ...pkg.weights, [c.key]: Number(e.target.value) } })} /></Field>)}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Kolom kartu kendali yang dinilai</h3>
          <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
            {META_FIELDS.map((f) => <label key={f.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pkg.metadataFields.includes(f.key)} onChange={(e) => set({ metadataFields: e.target.checked ? [...pkg.metadataFields, f.key] : pkg.metadataFields.filter((x) => x !== f.key) })} />{f.label}</label>)}
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={pkg.scenario.enabled} onChange={(e) => set({ scenario: { ...pkg.scenario, enabled: e.target.checked } })} /> Aktifkan tahap skenario kesalahan</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {SCENARIO_TYPES.map((t) => <Field key={t.value} label={t.label}><input type="number" min={0} max={10} className="input" disabled={!pkg.scenario.enabled} value={pkg.scenario.errors[t.value] ?? 0} onChange={(e) => set({ scenario: { ...pkg.scenario, errors: { ...pkg.scenario.errors, [t.value]: Number(e.target.value) } } })} /></Field>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocForm({ doc, locs, onChange }: { doc: EditDoc; locs: ReturnType<typeof flattenCabinet>; onChange: (p: Partial<EditDoc>) => void }) {
  const t = (k: keyof EditDoc, label: string, wide?: boolean, type = "text") => (
    <Field label={label} wide={wide}><input type={type} className="input" value={doc[k] as string} onChange={(e) => onChange({ [k]: e.target.value } as Partial<EditDoc>)} /></Field>
  );
  const alt = (k: "keyCatchAlt" | "keyIndexAlt" | "keyCodeAlt", label: string) => (
    <Field label={label}><input className="input" value={doc[k].join("; ")} onChange={(e) => onChange({ [k]: e.target.value.split(";").map((x) => x.trim()).filter(Boolean) } as Partial<EditDoc>)} placeholder="pisahkan dengan ;" /></Field>
  );
  const sel = (k: keyof EditDoc, label: string, opts: { value: string; label: string }[]) => (
    <Field label={label}><select className="input" value={doc[k] as string} onChange={(e) => onChange({ [k]: e.target.value } as Partial<EditDoc>)}><option value="">— pilih —</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
  );
  return (
    <div className="grid gap-4 py-2 xl:grid-cols-2">
      <div>
        <h4 className="mb-2 text-sm font-semibold">Isi dokumen (terlihat siswa)</h4>
        <div className="grid gap-2 md:grid-cols-2">
          {t("number", "Nomor (isi - bila tidak ada)")}{t("date", "Tanggal", false, "date")}
          {t("sender", "Pengirim")}{t("senderCity", "Kota pengirim")}
          {t("recipient", "Tujuan")}{t("recipientCity", "Kota tujuan")}
          {t("subject", "Perihal", true)}{t("nature", "Sifat (boleh kosong)")}{t("attachment", "Lampiran")}
          <Field label="Isi ringkas" wide><textarea className="input" value={doc.summary} onChange={(e) => onChange({ summary: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={doc.tricky} onChange={(e) => onChange({ tricky: e.target.checked })} /> Sengaja mirip / tidak lengkap</label>
        </div>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold">Kunci jawaban (tersembunyi dari siswa)</h4>
        <div className="grid gap-2 md:grid-cols-2">
          {sel("keyType", "Jenis dokumen", DOC_TYPES)}{sel("keyValue", "Nilai guna", VALUES)}
          {t("keyCatchword", "Kata tangkap")}{alt("keyCatchAlt", "Kata tangkap lain yang diterima")}
          {t("keyIndex", "Indeks")}{alt("keyIndexAlt", "Indeks lain yang diterima")}
          {t("keyCode", "Kode")}{alt("keyCodeAlt", "Kode lain yang diterima")}
          <Field label="Lokasi simpan" wide><select className="input" value={doc.keyFolderId} onChange={(e) => { const l = locs.find((x) => x.id === e.target.value); onChange({ keyFolderId: e.target.value, ...(l?.code && !doc.keyCode ? { keyCode: l.code } : {}) }); }}><option value="">— pilih —</option>{locs.map((l) => <option key={l.id} value={l.id}>{l.path}{l.code ? ` (${l.code})` : ""}</option>)}</select></Field>
          {sel("keyAccess", "Tingkat akses", ACCESS)}{sel("keyRetention", "Masa simpan", RETENTION.map((r) => ({ value: r, label: r })))}
          {t("keySortKey", "Kunci urutan khusus (opsional)", true)}
        </div>
      </div>
    </div>
  );
}

function CabinetEditor({ cabinet, onChange }: { cabinet: Cabinet; onChange: (c: Cabinet) => void }) {
  const c = structuredClone(cabinet);
  const commit = () => onChange(c);
  const folderRow = (list: Folder[], i: number, depth: number) => {
    const f = list[i];
    return (
      <div key={f.id} className={`space-y-1 ${depth ? "ml-6" : ""}`}>
        <div className="flex flex-wrap items-center gap-1">
          <span aria-hidden>{depth ? "↳" : "📁"}</span>
          <input className="input w-48 py-1" value={f.label} aria-label="Label folder" onChange={(e) => { f.label = e.target.value; commit(); }} />
          <input className="input w-24 py-1" value={f.code ?? ""} placeholder="kode" aria-label="Kode folder" onChange={(e) => { f.code = e.target.value; commit(); }} />
          <span className="font-mono text-[10px] text-stone-400">{f.id}</span>
          {!depth && <button className="btn btn-sm" onClick={() => { f.subfolders = [...(f.subfolders ?? []), { id: uid("sf"), label: "Subfolder", code: "" }]; commit(); }}>+ subfolder</button>}
          <button className="btn btn-sm btn-danger" onClick={() => { list.splice(i, 1); commit(); }}>✕</button>
        </div>
        {f.subfolders?.map((_, j) => folderRow(f.subfolders!, j, depth + 1))}
      </div>
    );
  };
  return (
    <div className="space-y-3">
      <p className="muted">Laci → guide → folder (→ subfolder). Kode folder dipakai untuk mencocokkan kode di kunci dan saat impor CSV. Mengubah id tidak dimungkinkan agar kunci tetap tertaut.</p>
      {c.drawers.map((d, di) => (
        <div key={d.id} className="rounded-xl border border-kayu-300 bg-kayu-100 p-3">
          <div className="flex items-center gap-2">
            <input className="input max-w-sm font-semibold" value={d.label} aria-label="Label laci" onChange={(e) => { d.label = e.target.value; commit(); }} />
            <button className="btn btn-sm btn-danger" onClick={() => { c.drawers.splice(di, 1); commit(); }}>Hapus laci</button>
          </div>
          <div className="mt-2 grid gap-2 lg:grid-cols-2">
            {d.guides.map((g, gi) => (
              <div key={g.id} className="rounded-lg border border-kayu-300 bg-white p-2">
                <div className="flex items-center gap-2">
                  <input className="input py-1 font-semibold" value={g.label} aria-label="Label guide" onChange={(e) => { g.label = e.target.value; commit(); }} />
                  <button className="btn btn-sm btn-danger" onClick={() => { d.guides.splice(gi, 1); commit(); }}>✕</button>
                </div>
                <div className="mt-2 space-y-1">{g.folders.map((_, fi) => folderRow(g.folders, fi, 0))}</div>
                <button className="btn btn-sm mt-2" onClick={() => { g.folders.push({ id: uid("f"), label: "Folder baru", code: "" }); commit(); }}>+ folder</button>
              </div>
            ))}
          </div>
          <button className="btn btn-sm mt-2" onClick={() => { d.guides.push({ id: uid("g"), label: "Guide baru", folders: [] }); commit(); }}>+ guide</button>
        </div>
      ))}
      <button className="btn" onClick={() => { c.drawers.push({ id: uid("d"), label: `Laci ${c.drawers.length + 1}`, guides: [] }); commit(); }}>+ laci</button>
    </div>
  );
}
