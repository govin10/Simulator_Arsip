import "server-only";
import type { Document, Package, RetrievalResult } from "@prisma/client";
import {
  type Cabinet, type ComponentKey, type FilingSystem, type MetaKey, type ScenarioType,
  COMPONENTS, DEFAULT_WEIGHTS, docTypeLabel, expectedOrder, flattenCabinet, isoDate, metaLabel, normCode, normText, systemLabel,
} from "./domain";
export { expectedOrder };

// ---------------------------------------------------------------------------
// Katalog kode kesalahan (dipakai umpan balik & dashboard "kesalahan tersering")
// ---------------------------------------------------------------------------
export const ERROR_CATALOG: Record<string, string> = {
  ID_TYPE: "Jenis dokumen keliru",
  ID_TYPE_DIRECTION: "Tertukar surat masuk / surat keluar",
  ID_VALUE: "Nilai guna arsip keliru",
  CLS_SYSTEM: "Sistem penyimpanan keliru",
  CLS_CATCH_EMPTY: "Kata tangkap kosong",
  CLS_CATCH: "Kata tangkap keliru",
  CLS_CATCH_DIRECTION: "Kata tangkap diambil dari pihak yang salah (masuk/keluar)",
  CLS_CATCH_BASIS: "Kata tangkap tidak sesuai dasar sistem",
  IDX_EMPTY: "Indeks kosong",
  IDX_BUSINESS_FORM: "Bentuk badan usaha di awal indeks",
  IDX_PERSON_ORDER: "Urutan unit nama orang keliru",
  IDX_TITLE: "Gelar dijadikan unit pertama",
  IDX_UNIT_ORDER: "Urutan unit indeks keliru",
  IDX_WRONG: "Indeks tidak sesuai aturan",
  CODE_EMPTY: "Kode kosong",
  CODE_OTHER_GROUP: "Kode milik kelompok lain",
  CODE_WRONG: "Kode tidak sesuai",
  CODE_INCONSISTENT: "Kode tidak konsisten (klasifikasi vs kartu kendali)",
  META_EMPTY: "Kolom kartu kendali kosong",
  META_WRONG: "Kolom kartu kendali keliru",
  LOC_MISSING: "Dokumen belum disimpan",
  LOC_WRONG_DRAWER: "Salah laci",
  LOC_WRONG_GUIDE: "Salah guide",
  LOC_WRONG_FOLDER: "Salah folder",
  LOC_INCONSISTENT: "Lokasi simpan berbeda dengan kartu kendali",
  ORDER_WRONG: "Urutan simpan keliru",
  RET_WRONG_DOC: "Temu kembali: dokumen keliru",
  RET_FALSE_NOT_FOUND: "Temu kembali: menyatakan tidak ada padahal ada",
  RET_FALSE_FOUND: "Temu kembali: memilih dokumen padahal arsip tidak ada",
  RET_SLOW: "Temu kembali melebihi target waktu",
  SCN_MISSED: "Skenario: kesalahan terlewat",
  SCN_FALSE_REPORT: "Skenario: laporan keliru",
  SCN_WRONG_CAUSE: "Skenario: penyebab keliru",
  SCN_WRONG_FIX: "Skenario: perbaikan keliru",
};

export type Finding = { stage: string; code: string; documentId?: string; field?: string; message: string };
export type Item = {
  component: ComponentKey | "skenario";
  documentId?: string;
  field: string;
  score: number; // 0..1
  given?: string;
  expected?: string; // hanya ditampilkan ke guru
};
export type StageResult = { items: Item[]; findings: Finding[]; gradedAt: string };

export type ProcessDocAnswer = {
  type?: string; value?: string; system?: string;
  catchword?: string; index?: string; code?: string;
  meta?: Partial<Record<MetaKey, string>>;
};
export type ProcessAnswers = Record<string, ProcessDocAnswer>;
export type StoreAnswers = { placements: Record<string, string[]> };

const docName = (d: Document) => `Dokumen no. ${d.number}`;
const BUSINESS_FORMS = ["pt", "cv", "ud", "fa", "firma", "koperasi", "pd", "perum", "tbk", "yayasan"];
const TITLES = ["dr", "drs", "dra", "ir", "h", "hj", "prof", "s", "se", "spd", "s pd", "sh", "mm", "st", "skom", "kh", "m", "mpd"];

const matches = (given: string | undefined, key: string, alts: string[] = []) =>
  !!given && [key, ...alts].some((k) => normText(k) === normText(given));
const matchesCode = (given: string | undefined, key: string, alts: string[] = []) =>
  !!given && [key, ...alts].some((k) => normCode(k) === normCode(given));
const tokens = (s: string) => normText(s).split(" ").filter(Boolean);
const sameTokenSet = (a: string, b: string) => {
  const x = tokens(a).sort().join(" "), y = tokens(b).sort().join(" ");
  return x.length > 0 && x === y;
};
function similarity(a: string, b: string) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((t) => B.has(t) && inter++);
  return inter / new Set([...A, ...B]).size;
}

// ---------------------------------------------------------------------------
// Aturan urutan per sistem
// ---------------------------------------------------------------------------
const ORDER_BASIS: Record<FilingSystem, string> = {
  ABJAD: "abjad indeks, lalu tanggal",
  NOMOR: "urutan menaik (tanggal)",
  SUBJEK: "tanggal (paling lama di depan)",
  WILAYAH: "abjad nama koresponden, lalu tanggal",
  TANGGAL: "tanggal (paling awal di depan)",
};

const CATCH_BASIS: Record<FilingSystem, string> = {
  ABJAD: "Pada sistem abjad, kata tangkap diambil dari nama orang atau badan yang menjadi koresponden.",
  NOMOR: "Pada sistem nomor, kata tangkap adalah pokok masalah dokumen yang dicocokkan dengan daftar klasifikasi.",
  SUBJEK: "Pada sistem subjek, kata tangkap diambil dari pokok isi atau perihal, bukan dari nama pengirim.",
  WILAYAH: "Pada sistem wilayah, kata tangkap berupa nama tempat (kota/kabupaten) koresponden.",
  TANGGAL: "Pada sistem tanggal, kata tangkap berupa bulan dan tahun dokumen.",
};
const CODE_BASIS: Record<FilingSystem, string> = {
  ABJAD: "huruf awal kata tangkap",
  NOMOR: "nomor klasifikasi pokok masalah dokumen",
  SUBJEK: "subjek dokumen pada daftar klasifikasi",
  WILAYAH: "kode wilayah koresponden",
  TANGGAL: "periode tahun.bulan dokumen",
};

// ---------------------------------------------------------------------------
// Tahap 1: identifikasi, klasifikasi, indeks, kode, kartu kendali
// ---------------------------------------------------------------------------
export function gradeProcess(pkg: Package, docs: Document[], answers: ProcessAnswers): StageResult {
  const system = pkg.system as FilingSystem;
  const cab = pkg.cabinet as unknown as Cabinet;
  const locs = flattenCabinet(cab);
  const enabledMeta = (pkg.metadataFields as string[]) ?? [];
  const items: Item[] = [];
  const findings: Finding[] = [];
  const F = (code: string, d: Document, message: string, field?: string) =>
    findings.push({ stage: "PROCESS", code, documentId: d.id, field, message });
  const home = normText(pkg.homeOrg);

  for (const d of docs) {
    const a = answers[d.id] ?? {};
    const name = docName(d);

    // Identifikasi
    const typeOk = a.type === d.keyType;
    items.push({ component: "identifikasi", documentId: d.id, field: "jenis", score: typeOk ? 1 : 0, given: docTypeLabel(a.type ?? "-"), expected: docTypeLabel(d.keyType) });
    if (!typeOk) {
      const dir = new Set(["SURAT_MASUK", "SURAT_KELUAR"]);
      if (a.type && dir.has(a.type) && dir.has(d.keyType))
        F("ID_TYPE_DIRECTION", d, `${name}: arah surat tertukar. Perhatikan siapa pembuat surat: bila dibuat oleh ${pkg.homeOrg}, surat itu surat keluar; bila diterima dari pihak luar, surat masuk.`, "jenis");
      else
        F("ID_TYPE", d, `${name}: jenis dokumen belum tepat. Perhatikan bentuk dan ciri dokumen (kop, bagian salam, tanda terima, atau susunan laporan).`, "jenis");
    }
    const valOk = a.value === d.keyValue;
    items.push({ component: "identifikasi", documentId: d.id, field: "nilai guna", score: valOk ? 1 : 0, given: a.value ?? "-", expected: d.keyValue });
    if (!valOk) F("ID_VALUE", d, `${name}: nilai guna arsip belum tepat. Pertimbangkan akibatnya bila dokumen ini hilang dan berapa lama dokumen ini masih dipakai.`, "nilai guna");

    // Klasifikasi: sistem + kata tangkap
    const sysOk = a.system === system;
    items.push({ component: "klasifikasi", documentId: d.id, field: "sistem", score: sysOk ? 1 : 0, given: a.system ? systemLabel(a.system) : "-", expected: systemLabel(system) });
    if (!sysOk) F("CLS_SYSTEM", d, `${name}: sistem penyimpanan tidak sesuai dengan sistem yang dipakai pada paket ini. Periksa kembali petunjuk paket.`, "sistem");

    const catchOk = matches(a.catchword, d.keyCatchword, d.keyCatchAlt);
    items.push({ component: "klasifikasi", documentId: d.id, field: "kata tangkap", score: catchOk ? 1 : 0, given: a.catchword ?? "", expected: [d.keyCatchword, ...d.keyCatchAlt].join(" / ") });
    if (!catchOk) {
      const g = normText(a.catchword);
      if (!g) F("CLS_CATCH_EMPTY", d, `${name}: kata tangkap belum diisi.`, "kata tangkap");
      else if ((system === "ABJAD" || system === "WILAYAH") && d.keyType === "SURAT_KELUAR" && (home.includes(g) || normText(d.sender).includes(g) || normText(d.senderCity).includes(g)))
        F("CLS_CATCH_DIRECTION", d, `${name}: untuk surat keluar, kata tangkap diambil dari pihak tujuan, bukan dari instansi sendiri.`, "kata tangkap");
      else if ((system === "ABJAD" || system === "WILAYAH") && d.keyType !== "SURAT_KELUAR" && (normText(d.recipient).includes(g) || home.includes(g)))
        F("CLS_CATCH_DIRECTION", d, `${name}: untuk dokumen yang diterima, kata tangkap diambil dari pengirim, bukan dari penerima.`, "kata tangkap");
      else if (system === "SUBJEK" && (normText(d.sender).includes(g)))
        F("CLS_CATCH_BASIS", d, `${name}: ${CATCH_BASIS.SUBJEK}`, "kata tangkap");
      else F("CLS_CATCH", d, `${name}: kata tangkap belum tepat. ${CATCH_BASIS[system]}`, "kata tangkap");
    }

    // Indeks
    const idxOk = matches(a.index, d.keyIndex, d.keyIndexAlt);
    items.push({ component: "indeks", documentId: d.id, field: "indeks", score: idxOk ? 1 : 0, given: a.index ?? "", expected: [d.keyIndex, ...d.keyIndexAlt].join(" / ") });
    if (!idxOk) {
      const g = tokens(a.index ?? "");
      const keyTokens = tokens(d.keyIndex);
      const keyIsBusiness = BUSINESS_FORMS.includes(keyTokens[keyTokens.length - 1] ?? "");
      if (!g.length) F("IDX_EMPTY", d, `${name}: indeks belum diisi.`, "indeks");
      else if ((system === "ABJAD" || system === "WILAYAH") && BUSINESS_FORMS.includes(g[0]) && keyIsBusiness)
        F("IDX_BUSINESS_FORM", d, `${name}: bentuk badan usaha (PT, CV, UD, dan sebagainya) ditulis di akhir indeks, bukan di awal.`, "indeks");
      else if (system === "ABJAD" && TITLES.includes(g[0]))
        F("IDX_TITLE", d, `${name}: gelar tidak dijadikan unit pertama indeks. Tulis gelar di belakang nama sesuai aturan yang diajarkan.`, "indeks");
      else if (sameTokenSet(a.index ?? "", d.keyIndex) || [d.keyIndex, ...d.keyIndexAlt].some((k) => sameTokenSet(a.index ?? "", k)))
        F(system === "ABJAD" && !keyIsBusiness ? "IDX_PERSON_ORDER" : "IDX_UNIT_ORDER", d,
          system === "ABJAD" && !keyIsBusiness
            ? `${name}: unsur nama sudah lengkap, tetapi urutannya keliru. Nama orang diindeks dengan nama akhir (keluarga) sebagai unit pertama.`
            : `${name}: unsur indeks sudah lengkap, tetapi urutan unitnya belum sesuai aturan sistem ${systemLabel(system)}.`, "indeks");
      else F("IDX_WRONG", d, `${name}: indeks belum sesuai aturan sistem ${systemLabel(system)}. Periksa kembali kata tangkap dan susunan unitnya.`, "indeks");
    }

    // Kode
    const codeOk = matchesCode(a.code, d.keyCode, d.keyCodeAlt);
    items.push({ component: "kode", documentId: d.id, field: "kode", score: codeOk ? 1 : 0, given: a.code ?? "", expected: [d.keyCode, ...d.keyCodeAlt].join(" / ") });
    if (!codeOk) {
      const other = locs.find((l) => l.code && normCode(l.code) === normCode(a.code));
      if (!normCode(a.code)) F("CODE_EMPTY", d, `${name}: kode klasifikasi belum diisi.`, "kode");
      else if (other)
        F("CODE_OTHER_GROUP", d, `${name}: kode "${a.code}" adalah kode kelompok ${other.label}, padahal isi dokumen tidak termasuk kelompok itu. Kode harus sesuai dengan ${CODE_BASIS[system]}.`, "kode");
      else F("CODE_WRONG", d, `${name}: kode arsip belum sesuai dengan ${CODE_BASIS[system]}.`, "kode");
    }

    // Kartu kendali
    const meta = a.meta ?? {};
    const expectedMeta: Record<string, { ok: (v: string) => boolean; show: string }> = {
      number: { ok: (v) => normCode(v) === normCode(d.number) || (d.number.trim() === "-" && ["tanpanomor", "tidakada", "tidakbernomor"].includes(normCode(v))), show: d.number },
      date: { ok: (v) => v === isoDate(d.date), show: isoDate(d.date) },
      from: { ok: (v) => similarity(v, d.sender) >= 0.75, show: d.sender },
      to: { ok: (v) => similarity(v, d.recipient) >= 0.75, show: d.recipient },
      subject: { ok: (v) => similarity(v, d.subject) >= 0.6, show: d.subject },
      code: { ok: (v) => matchesCode(v, d.keyCode, d.keyCodeAlt), show: d.keyCode },
      location: { ok: (v) => v === d.keyFolderId, show: locs.find((l) => l.id === d.keyFolderId)?.path ?? d.keyFolderId },
      access: { ok: (v) => v === d.keyAccess, show: d.keyAccess },
      retention: { ok: (v) => normText(v) === normText(d.keyRetention), show: d.keyRetention },
    };
    for (const f of enabledMeta) {
      const exp = expectedMeta[f];
      if (!exp) continue;
      const v = (meta[f as MetaKey] ?? "").toString().trim();
      const ok = !!v && exp.ok(v);
      const givenShow = f === "location" ? locs.find((l) => l.id === v)?.path ?? v : v;
      items.push({ component: "metadata", documentId: d.id, field: metaLabel(f), score: ok ? 1 : 0, given: givenShow, expected: exp.show });
      if (!v) F("META_EMPTY", d, `${name}: kolom "${metaLabel(f)}" pada kartu kendali masih kosong.`, metaLabel(f));
      else if (!ok) F("META_WRONG", d, `${name}: kolom "${metaLabel(f)}" pada kartu kendali belum sesuai dengan data dokumen atau aturan klasifikasi.`, metaLabel(f));
    }
    // Konsistensi kode
    if (enabledMeta.includes("code") && normCode(a.code) && normCode(meta.code) && normCode(a.code) !== normCode(meta.code))
      F("CODE_INCONSISTENT", d, `${name}: kode di kartu kendali berbeda dengan kode klasifikasi yang kamu tulis. Satu dokumen harus memakai kode yang sama di semua tempat.`, "kode");
  }
  return { items, findings, gradedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Tahap 2: lokasi dan urutan simpan
// ---------------------------------------------------------------------------
export function gradeStore(pkg: Package, docs: Document[], store: StoreAnswers, proc: ProcessAnswers): StageResult {
  const system = pkg.system as FilingSystem;
  const locs = flattenCabinet(pkg.cabinet as unknown as Cabinet);
  const locById = new Map(locs.map((l) => [l.id, l]));
  const byId = new Map(docs.map((d) => [d.id, d]));
  const items: Item[] = [];
  const findings: Finding[] = [];
  const placedIn = new Map<string, string>();
  for (const [folderId, ids] of Object.entries(store.placements ?? {})) for (const id of ids) placedIn.set(id, folderId);

  // Hitung status urutan untuk dokumen yang sudah di folder benar
  const orderOk = new Map<string, { ok: boolean; prev?: Document }>();
  for (const [folderId, ids] of Object.entries(store.placements ?? {})) {
    const here = ids.map((id) => byId.get(id)).filter((d): d is Document => !!d && d.keyFolderId === folderId);
    const exp = expectedOrder(system, here);
    here.forEach((d, i) => {
      const ei = exp.indexOf(d);
      const expectedPrev = exp[ei - 1];
      orderOk.set(d.id, { ok: here[i - 1]?.id === expectedPrev?.id, prev: expectedPrev });
    });
  }

  for (const d of docs) {
    const name = docName(d);
    const at = placedIn.get(d.id);
    const key = locById.get(d.keyFolderId);
    const got = at ? locById.get(at) : undefined;
    let score = 0;
    if (!at) {
      findings.push({ stage: "STORE", code: "LOC_MISSING", documentId: d.id, message: `${name} belum disimpan di lemari.` });
    } else if (at !== d.keyFolderId) {
      if (got && key && got.drawerId !== key.drawerId)
        findings.push({ stage: "STORE", code: "LOC_WRONG_DRAWER", documentId: d.id, message: `${name} disimpan di laci yang salah. Periksa kembali kata tangkap/kode, lalu cocokkan dengan label laci.` });
      else if (got && key && got.guideId !== key.guideId)
        findings.push({ stage: "STORE", code: "LOC_WRONG_GUIDE", documentId: d.id, message: `${name} sudah di laci yang benar, tetapi berada di belakang guide yang salah.` });
      else
        findings.push({ stage: "STORE", code: "LOC_WRONG_FOLDER", documentId: d.id, message: `${name} sudah di guide yang benar, tetapi foldernya belum tepat.` });
    } else {
      const o = orderOk.get(d.id);
      score = o?.ok ? 1 : 0.5;
      if (!o?.ok)
        findings.push({
          stage: "STORE", code: "ORDER_WRONG", documentId: d.id,
          message: `${name} sudah di folder yang benar, tetapi urutannya keliru: seharusnya ${o?.prev ? `diletakkan setelah dokumen no. ${o.prev.number}` : "berada paling depan"} karena urutan ${ORDER_BASIS[system]}.`,
        });
    }
    const cardLoc = proc[d.id]?.meta?.location;
    if (at && cardLoc && cardLoc !== at)
      findings.push({ stage: "STORE", code: "LOC_INCONSISTENT", documentId: d.id, message: `${name}: lokasi di lemari berbeda dengan lokasi yang kamu tulis di kartu kendali. Arsip akan sulit ditemukan kembali.` });
    items.push({ component: "lokasi", documentId: d.id, field: "lokasi & urutan", score, given: got?.path ?? "-", expected: key?.path ?? d.keyFolderId });
  }
  return { items, findings, gradedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Tahap 3: temu kembali (dinilai per permintaan saat siswa memastikan pilihan)
// ---------------------------------------------------------------------------
export function judgeRetrieval(answerDocumentId: string | null, selected: string | null, notFound: boolean) {
  if (answerDocumentId === null) return notFound;
  return !notFound && selected === answerDocumentId;
}
export function retrievalFindings(
  results: (RetrievalResult & { task: { prompt: string; answerDocumentId: string | null } })[],
  targetSeconds: number,
): StageResult {
  const items: Item[] = [];
  const findings: Finding[] = [];
  results.forEach((r, i) => {
    const label = `Permintaan ${i + 1}`;
    items.push({ component: "temuKembali", field: label, score: r.correct ? 1 : 0, given: r.answeredNotFound ? "Arsip tidak ada" : r.selectedDocumentId ?? "-", expected: r.task.answerDocumentId ?? "Arsip tidak ada" });
    if (!r.correct) {
      if (r.task.answerDocumentId === null)
        findings.push({ stage: "RETRIEVE", code: "RET_FALSE_FOUND", message: `${label}: arsip yang diminta sebenarnya tidak ada di lemari. Periksa setiap ciri permintaan (pengirim, perihal, bulan) sebelum memilih dokumen.` });
      else if (r.answeredNotFound)
        findings.push({ stage: "RETRIEVE", code: "RET_FALSE_NOT_FOUND", message: `${label}: arsip sebenarnya ada. Telusuri lewat kata tangkap atau kode yang sesuai dengan sistem penyimpanan.` });
      else
        findings.push({ stage: "RETRIEVE", code: "RET_WRONG_DOC", message: `${label}: dokumen yang dipilih tidak sesuai permintaan. Cocokkan kembali pengirim, perihal, dan tanggal.` });
    }
    if (r.durationMs && r.durationMs > targetSeconds * 1000)
      findings.push({ stage: "RETRIEVE", code: "RET_SLOW", message: `${label}: waktu pencarian ${Math.round(r.durationMs / 1000)} detik, melebihi target ${targetSeconds} detik.` });
  });
  return { items, findings, gradedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Tahap 4: skenario kesalahan (F7)
// ---------------------------------------------------------------------------
export type ScnTab = { tabId: string; docId: string; code: string };
export type ScnCard = { docId: string; number: string; date: string; from: string; to: string; subject: string; code: string; location: string };
export type ScnError = { id: string; type: ScenarioType; docId: string; tabIds: string[]; field?: "subject" | "code" | "date"; expectedFolderId?: string; expectedCode?: string; expectedValue?: string };
export type ScenarioState = { folders: Record<string, ScnTab[]>; cards: ScnCard[]; errors: ScnError[] };
export type ScnReport = { targetKind: "tab" | "card"; targetId: string; cause: ScenarioType; fix?: string };

function shuffle<T>(arr: T[], rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export { shuffle };

export function buildScenario(pkg: Package, docs: Document[]): ScenarioState {
  const system = pkg.system as FilingSystem;
  const locs = flattenCabinet(pkg.cabinet as unknown as Cabinet);
  const cfg = ((pkg.scenario as { errors?: Record<string, number> })?.errors ?? {}) as Record<string, number>;
  const folders: Record<string, ScnTab[]> = Object.fromEntries(locs.map((l) => [l.id, []]));
  let n = 0;
  const tid = () => `t${++n}`;
  for (const l of locs) {
    const here = expectedOrder(system, docs.filter((d) => d.keyFolderId === l.id));
    folders[l.id] = here.map((d) => ({ tabId: tid(), docId: d.id, code: d.keyCode }));
  }
  const cards: ScnCard[] = docs.map((d) => ({
    docId: d.id, number: d.number, date: isoDate(d.date), from: d.sender, to: d.recipient, subject: d.subject, code: d.keyCode, location: d.keyFolderId,
  }));
  const used = new Set<string>();
  const errors: ScnError[] = [];
  const findTab = (docId: string) => {
    for (const [fid, tabs] of Object.entries(folders)) {
      const i = tabs.findIndex((t) => t.docId === docId);
      if (i >= 0) return { fid, i, tab: tabs[i] };
    }
    return null;
  };
  const pickDoc = (filter: (d: Document) => boolean = () => true) => shuffle(docs).find((d) => !used.has(d.id) && filter(d));

  for (let k = 0; k < (cfg.WRONG_ORDER ?? 0); k++) {
    const cand = shuffle(Object.entries(folders)).find(([, tabs]) => tabs.length >= 2 && tabs.every((t) => !used.has(t.docId)));
    if (!cand) break;
    const [, tabs] = cand;
    const i = Math.floor(Math.random() * (tabs.length - 1));
    [tabs[i], tabs[i + 1]] = [tabs[i + 1], tabs[i]];
    used.add(tabs[i].docId); used.add(tabs[i + 1].docId);
    errors.push({ id: `e${errors.length + 1}`, type: "WRONG_ORDER", docId: tabs[i + 1].docId, tabIds: [tabs[i].tabId, tabs[i + 1].tabId] });
  }
  for (let k = 0; k < (cfg.WRONG_FOLDER ?? 0); k++) {
    const d = pickDoc();
    if (!d) break;
    const pos = findTab(d.id)!;
    const others = locs.filter((l) => l.id !== pos.fid);
    if (!others.length) break;
    const target = others[Math.floor(Math.random() * others.length)];
    folders[pos.fid].splice(pos.i, 1);
    folders[target.id].splice(Math.floor(Math.random() * (folders[target.id].length + 1)), 0, pos.tab);
    used.add(d.id);
    errors.push({ id: `e${errors.length + 1}`, type: "WRONG_FOLDER", docId: d.id, tabIds: [pos.tab.tabId], expectedFolderId: d.keyFolderId });
  }
  for (let k = 0; k < (cfg.WRONG_CODE ?? 0); k++) {
    const d = pickDoc();
    if (!d) break;
    const pos = findTab(d.id)!;
    const wrong = shuffle(locs.filter((l) => l.code && normCode(l.code) !== normCode(d.keyCode)))[0];
    pos.tab.code = wrong?.code ?? `${d.keyCode}X`;
    used.add(d.id);
    errors.push({ id: `e${errors.length + 1}`, type: "WRONG_CODE", docId: d.id, tabIds: [pos.tab.tabId], expectedCode: d.keyCode });
  }
  for (let k = 0; k < (cfg.DUPLICATE ?? 0); k++) {
    const d = pickDoc();
    if (!d) break;
    const pos = findTab(d.id)!;
    const copy = { tabId: tid(), docId: d.id, code: pos.tab.code };
    folders[pos.fid].splice(pos.i + 1, 0, copy);
    used.add(d.id);
    errors.push({ id: `e${errors.length + 1}`, type: "DUPLICATE", docId: d.id, tabIds: [pos.tab.tabId, copy.tabId] });
  }
  for (let k = 0; k < (cfg.MISSING_METADATA ?? 0); k++) {
    const d = pickDoc();
    if (!d) break;
    const field = (["subject", "code", "date"] as const)[Math.floor(Math.random() * 3)];
    const card = cards.find((c) => c.docId === d.id)!;
    const expectedValue = card[field];
    card[field] = "";
    used.add(d.id);
    errors.push({ id: `e${errors.length + 1}`, type: "MISSING_METADATA", docId: d.id, tabIds: [], field, expectedValue });
  }
  return { folders, cards: shuffle(cards), errors };
}

export function gradeScenario(state: ScenarioState, reports: ScnReport[], docs: Document[]) {
  const byId = new Map(docs.map((d) => [d.id, d]));
  const items: Item[] = [];
  const findings: Finding[] = [];
  const usedReports = new Set<number>();
  let found = 0, cause = 0, fix = 0;
  for (const e of state.errors) {
    const ri = reports.findIndex((r, i) => !usedReports.has(i) &&
      (e.type === "MISSING_METADATA" ? r.targetKind === "card" && r.targetId === e.docId : r.targetKind === "tab" && e.tabIds.includes(r.targetId)));
    const d = byId.get(e.docId);
    const name = d ? docName(d) : "Dokumen";
    if (ri < 0) {
      items.push({ component: "skenario", documentId: e.docId, field: "temuan", score: 0, expected: e.type });
      findings.push({ stage: "SCENARIO", code: "SCN_MISSED", documentId: e.docId, message: `Ada masalah pada ${name} yang belum kamu temukan.` });
      continue;
    }
    usedReports.add(ri);
    const r = reports[ri];
    found++;
    const causeOk = r.cause === e.type;
    if (causeOk) cause++;
    else findings.push({ stage: "SCENARIO", code: "SCN_WRONG_CAUSE", documentId: e.docId, message: `${name}: masalahnya sudah kamu temukan, tetapi penyebabnya keliru.` });
    let fixOk = false;
    if (causeOk) {
      if (e.type === "WRONG_FOLDER") fixOk = r.fix === e.expectedFolderId;
      else if (e.type === "WRONG_CODE") fixOk = normCode(r.fix) === normCode(e.expectedCode);
      else if (e.type === "MISSING_METADATA") fixOk = e.field === "date" ? r.fix === e.expectedValue : similarity(r.fix ?? "", e.expectedValue ?? "") >= 0.6 || normCode(r.fix) === normCode(e.expectedValue);
      else fixOk = true; // DUPLICATE / WRONG_ORDER: perbaikan = tindakan sesuai penyebab
    }
    if (fixOk) fix++;
    else if (causeOk) findings.push({ stage: "SCENARIO", code: "SCN_WRONG_FIX", documentId: e.docId, message: `${name}: penyebab sudah tepat, tetapi perbaikannya belum benar.` });
    items.push({ component: "skenario", documentId: e.docId, field: "temuan/penyebab/perbaikan", score: (1 + (causeOk ? 1 : 0) + (fixOk ? 1 : 0)) / 3, given: `${r.cause} ${r.fix ?? ""}`, expected: e.type });
  }
  const falseReports = reports.length - usedReports.size;
  reports.forEach((r, i) => {
    if (usedReports.has(i)) return;
    findings.push({ stage: "SCENARIO", code: "SCN_FALSE_REPORT", message: `Laporan keliru: ${r.targetKind === "card" ? "kartu kendali" : "tab arsip"} yang kamu tandai sebenarnya tidak bermasalah.` });
  });
  const total = state.errors.length || 1;
  const score = Math.max(0, ((found + cause + fix) / (3 * total)) * 100 - falseReports * 10);
  return { result: { items, findings, gradedAt: new Date().toISOString() } as StageResult, score: Math.round(score * 10) / 10, summary: { total: state.errors.length, found, cause, fix, falseReports } };
}

// ---------------------------------------------------------------------------
// Skor akhir otomatis
// ---------------------------------------------------------------------------
export type ComponentScore = { score: number; weight: number; correct: number; total: number; note?: string };
export type Scores = { components: Record<string, ComponentScore>; total: number; kkm: number; passed: boolean; avgRetrievalSeconds: number | null };

export function computeScores(
  pkg: Package,
  stageItems: Item[],
  retrievals: { correct: boolean | null; durationMs: number | null }[],
  helpCount: number,
  attemptNo: number,
): Scores {
  const weights = { ...DEFAULT_WEIGHTS, ...((pkg.weights as Record<string, number>) ?? {}) };
  const comps: Record<string, ComponentScore> = {};
  for (const c of COMPONENTS) {
    if (c.key === "waktu" || c.key === "kemandirian") continue;
    const its = stageItems.filter((i) => i.component === c.key);
    // identifikasi (jenis + nilai guna) dan klasifikasi (sistem + kata tangkap) punya 2 butir per dokumen
    const total = its.length, correct = its.reduce((s, i) => s + i.score, 0);
    comps[c.key] = { score: total ? Math.round((correct / total) * 1000) / 10 : 0, weight: weights[c.key], correct: Math.round(correct * 10) / 10, total };
  }
  const done = retrievals.filter((r) => r.durationMs != null);
  const avg = done.length ? done.reduce((s, r) => s + (r.durationMs ?? 0), 0) / done.length / 1000 : null;
  const retAcc = comps.temuKembali?.score ?? 0;
  if (avg == null) comps.waktu = { score: 0, weight: weights.waktu, correct: 0, total: 0, note: "Belum ada data temu kembali" };
  else if (retAcc < pkg.minAccuracyForTime)
    comps.waktu = { score: 0, weight: weights.waktu, correct: 0, total: 1, note: `Tidak dihitung: akurasi temu kembali ${retAcc}% di bawah batas ${pkg.minAccuracyForTime}%` };
  else comps.waktu = { score: Math.round(Math.min(1, pkg.targetSeconds / avg) * 1000) / 10, weight: weights.waktu, correct: 1, total: 1, note: `Rata-rata ${Math.round(avg)} detik, target ${pkg.targetSeconds} detik` };
  const indep = Math.max(0, 1 - 0.1 * helpCount - 0.15 * (attemptNo - 1));
  comps.kemandirian = { score: Math.round(indep * 1000) / 10, weight: weights.kemandirian, correct: 0, total: 0, note: `${helpCount} bantuan, percobaan ke-${attemptNo}` };
  const wsum = Object.values(comps).reduce((s, c) => s + c.weight, 0) || 1;
  const total = Math.round((Object.values(comps).reduce((s, c) => s + c.score * c.weight, 0) / wsum) * 10) / 10;
  return { components: comps, total, kkm: pkg.kkm, passed: total >= pkg.kkm, avgRetrievalSeconds: avg == null ? null : Math.round(avg) };
}
