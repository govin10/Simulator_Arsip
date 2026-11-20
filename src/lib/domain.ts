// Tipe dan konstanta yang aman dipakai di browser (TIDAK memuat kunci jawaban).

export type FilingSystem = "ABJAD" | "NOMOR" | "SUBJEK" | "WILAYAH" | "TANGGAL";
export type Stage = "PROCESS" | "STORE" | "RETRIEVE" | "SCENARIO" | "DONE";

export const SYSTEMS: { value: FilingSystem; label: string }[] = [
  { value: "ABJAD", label: "Abjad" },
  { value: "NOMOR", label: "Nomor (desimal)" },
  { value: "SUBJEK", label: "Subjek" },
  { value: "WILAYAH", label: "Wilayah" },
  { value: "TANGGAL", label: "Tanggal (kronologis)" },
];
export const systemLabel = (s: string) => SYSTEMS.find((x) => x.value === s)?.label ?? s;

export const DOC_TYPES = [
  { value: "SURAT_MASUK", label: "Surat masuk" },
  { value: "SURAT_KELUAR", label: "Surat keluar" },
  { value: "MEMO", label: "Memo" },
  { value: "UNDANGAN", label: "Undangan" },
  { value: "KUITANSI", label: "Kuitansi" },
  { value: "LAPORAN", label: "Laporan" },
];
export const docTypeLabel = (s: string) => DOC_TYPES.find((x) => x.value === s)?.label ?? s;

export const VALUES = [
  { value: "VITAL", label: "Vital" },
  { value: "PENTING", label: "Penting" },
  { value: "BERGUNA", label: "Berguna" },
  { value: "TIDAK_BERGUNA", label: "Tidak berguna" },
];
export const valueLabel = (s: string) => VALUES.find((x) => x.value === s)?.label ?? s;

export const ACCESS = [
  { value: "BIASA", label: "Biasa (terbuka)" },
  { value: "TERBATAS", label: "Terbatas" },
  { value: "RAHASIA", label: "Rahasia" },
];
export const RETENTION = ["1 tahun", "2 tahun", "5 tahun", "10 tahun", "Permanen"];

export const PACKAGE_KINDS = [
  { value: "PRETEST", label: "Tes awal" },
  { value: "LATIHAN", label: "Latihan" },
  { value: "POSTTEST", label: "Tes akhir" },
];
export const kindLabel = (s: string) => PACKAGE_KINDS.find((x) => x.value === s)?.label ?? s;

export const STAGES: { value: Stage; label: string }[] = [
  { value: "PROCESS", label: "1. Identifikasi, klasifikasi, indeks & kartu kendali" },
  { value: "STORE", label: "2. Penyimpanan di lemari arsip" },
  { value: "RETRIEVE", label: "3. Temu kembali arsip" },
  { value: "SCENARIO", label: "4. Skenario kesalahan" },
];
export const stageLabel = (s: string) => STAGES.find((x) => x.value === s)?.label ?? s;

// ---------- Lemari arsip ----------
export type Folder = { id: string; label: string; code?: string; subfolders?: Folder[] };
export type Guide = { id: string; label: string; folders: Folder[] };
export type Drawer = { id: string; label: string; guides: Guide[] };
export type Cabinet = { drawers: Drawer[] };

export type Location = {
  id: string;
  label: string;
  code?: string;
  drawerId: string;
  guideId: string;
  parentFolderId?: string;
  path: string; // "Laci 1 › Guide A–C › Folder A"
};

/** Semua lokasi yang bisa menampung dokumen (folder tanpa subfolder, atau subfolder). */
export function flattenCabinet(cab: Cabinet): Location[] {
  const out: Location[] = [];
  for (const d of cab.drawers ?? [])
    for (const g of d.guides ?? [])
      for (const f of g.folders ?? []) {
        if (f.subfolders?.length) {
          for (const s of f.subfolders)
            out.push({
              id: s.id, label: s.label, code: s.code, drawerId: d.id, guideId: g.id, parentFolderId: f.id,
              path: `${d.label} › ${g.label} › ${f.label} › ${s.label}`,
            });
        } else {
          out.push({ id: f.id, label: f.label, code: f.code, drawerId: d.id, guideId: g.id, path: `${d.label} › ${g.label} › ${f.label}` });
        }
      }
  return out;
}

// ---------- Aturan urutan di dalam folder ----------
export type SortableDoc = { keySortKey: string; keyIndex: string; date: Date | string; number: string };
export function sortKeyFor(system: FilingSystem, d: SortableDoc) {
  if (d.keySortKey) return d.keySortKey;
  const date = isoDate(d.date);
  switch (system) {
    case "ABJAD":
    case "WILAYAH":
      return `${normText(d.keyIndex)}|${date}|${d.number}`;
    case "NOMOR":
    case "SUBJEK":
    case "TANGGAL":
    default:
      return `${date}|${d.number}`;
  }
}
export function expectedOrder<T extends SortableDoc>(system: FilingSystem, docs: T[]): T[] {
  return [...docs].sort((a, b) => sortKeyFor(system, a).localeCompare(sortKeyFor(system, b), "id", { numeric: true }));
}

// ---------- Kartu kendali ----------
export const META_FIELDS = [
  { key: "number", label: "Nomor arsip/surat" },
  { key: "date", label: "Tanggal" },
  { key: "from", label: "Asal (pengirim)" },
  { key: "to", label: "Tujuan" },
  { key: "subject", label: "Perihal" },
  { key: "code", label: "Kode klasifikasi" },
  { key: "location", label: "Lokasi simpan" },
  { key: "access", label: "Tingkat akses" },
  { key: "retention", label: "Masa simpan" },
] as const;
export type MetaKey = (typeof META_FIELDS)[number]["key"];
export const metaLabel = (k: string) => META_FIELDS.find((f) => f.key === k)?.label ?? k;

// ---------- Penilaian ----------
export const COMPONENTS = [
  { key: "identifikasi", label: "Identifikasi dokumen", weight: 10 },
  { key: "klasifikasi", label: "Klasifikasi", weight: 15 },
  { key: "indeks", label: "Ketepatan indeks", weight: 10 },
  { key: "kode", label: "Ketepatan kode", weight: 15 },
  { key: "lokasi", label: "Lokasi dan urutan simpan", weight: 15 },
  { key: "metadata", label: "Akurasi metadata", weight: 10 },
  { key: "temuKembali", label: "Keberhasilan temu kembali", weight: 15 },
  { key: "waktu", label: "Waktu pengerjaan", weight: 5 },
  { key: "kemandirian", label: "Kemandirian", weight: 5 },
] as const;
export type ComponentKey = (typeof COMPONENTS)[number]["key"];
export const DEFAULT_WEIGHTS: Record<ComponentKey, number> = Object.fromEntries(
  COMPONENTS.map((c) => [c.key, c.weight]),
) as Record<ComponentKey, number>;
export const componentLabel = (k: string) => COMPONENTS.find((c) => c.key === k)?.label ?? k;

export const SCENARIO_TYPES = [
  { value: "WRONG_FOLDER", label: "Dokumen di folder salah / tidak ada di lokasi kartu" },
  { value: "WRONG_CODE", label: "Kode pada tab tidak sesuai" },
  { value: "DUPLICATE", label: "Dokumen ganda" },
  { value: "MISSING_METADATA", label: "Metadata kartu kendali tidak lengkap" },
  { value: "WRONG_ORDER", label: "Urutan dokumen salah" },
] as const;
export type ScenarioType = (typeof SCENARIO_TYPES)[number]["value"];
export const scenarioLabel = (s: string) => SCENARIO_TYPES.find((x) => x.value === s)?.label ?? s;

export const DEFAULT_RUBRIC = [
  { key: "identifikasi", label: "Mengidentifikasi jenis dan karakteristik arsip" },
  { key: "klasifikasi", label: "Menentukan sistem, kata tangkap, dan kode klasifikasi" },
  { key: "indeks", label: "Membuat indeks sesuai aturan" },
  { key: "penyimpanan", label: "Menyimpan arsip pada lokasi dan urutan yang benar" },
  { key: "kartu", label: "Mengisi kartu kendali dengan lengkap dan benar" },
  { key: "temuKembali", label: "Menemukan kembali arsip dengan cepat dan tepat" },
];
export const RUBRIC_LEVELS = [
  { level: 1, label: "Perlu bimbingan", desc: "Banyak kesalahan, masih bergantung arahan guru" },
  { level: 2, label: "Cukup", desc: "Sebagian benar, kesalahan pada aturan pokok" },
  { level: 3, label: "Baik", desc: "Sebagian besar benar, kesalahan kecil" },
  { level: 4, label: "Sangat baik", desc: "Benar, konsisten, dan mandiri" },
];

// ---------- Normalisasi (toleransi huruf besar-kecil, spasi, tanda baca) ----------
export function normText(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[.,;:"'()\/\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function normCode(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, "").replace(/[–—]/g, "-");
}
export function fmtDate(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
export function isoDate(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toISOString().slice(0, 10);
}

// ---------- Petunjuk singkat per sistem dan tahap (dihitung sebagai "bantuan") ----------
export const SYSTEM_HINTS: Record<FilingSystem, string[]> = {
  ABJAD: [
    "Kata tangkap diambil dari nama koresponden: pengirim untuk surat masuk, tujuan untuk surat keluar.",
    "Nama orang: nama akhir (keluarga) menjadi unit pertama. Contoh: Budi Santoso → Santoso, Budi.",
    "Gelar tidak dijadikan unit pertama; tulis di belakang dalam kurung bila perlu.",
    "Badan usaha: bentuk usaha (PT, CV, UD) ditulis di akhir. Contoh: PT Surya Abadi → Surya Abadi, PT.",
    "Kode = huruf awal kata tangkap. Di dalam folder, dokumen diurutkan menurut abjad indeks, lalu tanggal.",
  ],
  NOMOR: [
    "Tentukan pokok masalah dokumen, lalu cari nomor kelompoknya pada daftar klasifikasi di lemari.",
    "Kata tangkap = pokok masalah; kode = nomor klasifikasi (misalnya 310).",
    "Indeks = nama kelompok klasifikasi (pokok – sub pokok).",
    "Di dalam folder, dokumen diurutkan menaik menurut tanggal.",
  ],
  SUBJEK: [
    "Kata tangkap diambil dari pokok isi atau perihal, bukan dari nama pengirim.",
    "Cocokkan pokok isi dengan subjek dan sub-subjek pada daftar klasifikasi lemari; kodenya mengikuti folder.",
    "Indeks = subjek – sub-subjek.",
    "Di dalam folder, dokumen diurutkan menurut tanggal (paling lama di depan).",
  ],
  WILAYAH: [
    "Kata tangkap = nama tempat (kota/kabupaten) koresponden: asal surat masuk, tujuan surat keluar.",
    "Laci = provinsi, guide = kota/kabupaten, folder = kelompok huruf awal nama koresponden.",
    "Indeks = Kota – Nama koresponden (badan usaha: bentuk usaha di akhir).",
    "Di dalam folder, dokumen diurutkan menurut abjad nama koresponden, lalu tanggal.",
  ],
  TANGGAL: [
    "Kata tangkap = bulan dan tahun dokumen (misalnya Februari 2026).",
    "Indeks ditulis tahun-bulan-tanggal (misalnya 2026-02-14).",
    "Kode = tahun.bulan (misalnya 2026.02). Laci = tahun, guide = triwulan, folder = bulan.",
    "Di dalam folder, dokumen diurutkan menurut tanggal, paling awal di depan.",
  ],
};

export const STAGE_HINTS: Record<string, string[]> = {
  PROCESS: [
    "Baca kop dan bagian pengirim/tujuan: jika dibuat oleh organisasi tempatmu bekerja, itu surat keluar.",
    "Nilai guna: vital (tak tergantikan, menyangkut hak/kekayaan), penting (dipakai berulang, bernilai hukum/keuangan), berguna (sementara), tidak berguna (segera dimusnahkan).",
    "Isi kartu kendali dari data dokumen; kode dan lokasi harus sama dengan klasifikasi yang kamu tentukan.",
  ],
  STORE: [
    "Seret kartu dokumen ke folder, atau pakai tombol 'Pilih lokasi' bila tidak memakai mouse.",
    "Atur urutan di dalam folder dengan tombol ↑ ↓ sesuai aturan urutan sistem.",
    "Hasil baru diperiksa setelah kamu mengirim tahap ini.",
  ],
  RETRIEVE: [
    "Baca permintaan, tentukan kata tangkap/kode yang dicari, lalu buka laci dan folder yang sesuai.",
    "Kamu juga bisa mencari di register kartu kendali (pengirim, perihal, kode, tanggal).",
    "Periksa semua ciri (pengirim, perihal, bulan) sebelum memastikan. Bila tidak ada yang cocok, pilih 'Arsip tidak ada'.",
  ],
  SCENARIO: [
    "Bandingkan kartu kendali dengan isi lemari: lokasi, kode, dan kelengkapan.",
    "Periksa urutan dan dokumen yang muncul dua kali.",
    "Tandai hanya yang benar-benar salah: laporan keliru mengurangi skor.",
  ],
};

// ---------- Predikat nilai ----------
export function scoreLabel(n: number | null | undefined) {
  if (n == null) return { label: "—", tone: "text-stone-500" };
  if (n >= 90) return { label: "Sangat baik", tone: "text-emerald-700" };
  if (n >= 75) return { label: "Baik", tone: "text-brand-700" };
  if (n >= 60) return { label: "Cukup", tone: "text-amber-700" };
  return { label: "Perlu bimbingan", tone: "text-red-700" };
}
export function fmtDuration(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} menit`;
  return `${Math.floor(m / 60)} jam ${m % 60} menit`;
}
