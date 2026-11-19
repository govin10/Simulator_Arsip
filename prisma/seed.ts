/* Data contoh. Semua nama organisasi dan orang FIKTIF.
 * Kaidah kunci jawaban (indeks, kode, urutan) adalah usulan dan perlu disetujui guru. */
import { PrismaClient, type FilingSystem, type PackageKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_WEIGHTS, META_FIELDS, type Cabinet } from "../src/lib/domain";
import { CLASS_GROUPS, MONTHS, abjadCabinet, nomorCabinet, subjekCabinet, tanggalCabinet, wilayahCabinet } from "../src/lib/templates";

const db = new PrismaClient();
const HOME = "PT Karya Mandiri Pasuruan";

// ------------------------------------------------------------- Dokumen
type DocIn = {
  ref: string; number: string; date: string; sender: string; senderCity?: string; recipient: string; recipientCity?: string;
  subject: string; nature?: string; summary: string; attachment?: string; tricky?: boolean;
  type: string; value: string; access?: string; retention: string;
  catch: string; catchAlt?: string[]; index: string; indexAlt?: string[]; code: string; codeAlt?: string[]; folder: string;
};
type TaskIn = { prompt: string; ref: string | null };

async function createPackage(p: {
  title: string; description: string; system: FilingSystem; kind: PackageKind; difficulty: number; cabinet: Cabinet;
  docs: DocIn[]; tasks: TaskIn[]; scenario?: boolean;
}) {
  const pkg = await db.package.create({
    data: {
      title: p.title, description: p.description, system: p.system, kind: p.kind, difficulty: p.difficulty,
      homeOrg: HOME, homeCity: "Pasuruan", cabinet: p.cabinet,
      metadataFields: META_FIELDS.map((f) => f.key), weights: DEFAULT_WEIGHTS,
      scenario: { enabled: p.scenario ?? true, errors: { WRONG_FOLDER: 1, WRONG_CODE: 1, DUPLICATE: 1, MISSING_METADATA: 1, WRONG_ORDER: 1 } },
      kkm: 75, maxAttempts: p.kind === "LATIHAN" ? 5 : 1, targetSeconds: 120,
    },
  });
  const refs: Record<string, string> = {};
  for (const [i, d] of p.docs.entries()) {
    const row = await db.document.create({
      data: {
        packageId: pkg.id, position: i, number: d.number, date: new Date(d.date + "T00:00:00Z"),
        sender: d.sender, senderCity: d.senderCity ?? "", recipient: d.recipient, recipientCity: d.recipientCity ?? "",
        subject: d.subject, nature: d.nature ?? "Biasa", summary: d.summary, attachment: d.attachment ?? "", tricky: d.tricky ?? false,
        keyType: d.type, keyValue: d.value, keyCatchword: d.catch, keyCatchAlt: d.catchAlt ?? [], keyIndex: d.index, keyIndexAlt: d.indexAlt ?? [],
        keyCode: d.code, keyCodeAlt: d.codeAlt ?? [], keyFolderId: d.folder, keyAccess: d.access ?? "BIASA", keyRetention: d.retention,
      },
    });
    refs[d.ref] = row.id;
  }
  for (const [i, t] of p.tasks.entries())
    await db.retrievalTask.create({ data: { packageId: pkg.id, position: i, prompt: t.prompt, answerDocumentId: t.ref ? refs[t.ref] : null } });
  return pkg;
}

// Paket A (tes awal) – sistem abjad
const ABJAD_A: DocIn[] = [
  { ref: "a1", number: "045/SA/II/2026", date: "2026-02-10", sender: "PT Surya Abadi", senderCity: "Surabaya", recipient: HOME, recipientCity: "Pasuruan", subject: "Penawaran alat kantor", summary: "Menawarkan paket alat tulis dan perlengkapan kantor dengan potongan harga 10% untuk pembelian sebelum akhir Maret 2026.", attachment: "1 berkas daftar harga",
    type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", catch: "Surya Abadi", catchAlt: ["Surya"], index: "Surya Abadi, PT", code: "S", folder: "f-S" },
  { ref: "a2", number: "112/SAJ/II/2026", date: "2026-02-18", sender: "PT Surya Abadi Jaya", senderCity: "Sidoarjo", recipient: HOME, recipientCity: "Pasuruan", subject: "Konfirmasi pesanan kertas HVS", tricky: true, summary: "Mengonfirmasi pesanan 150 rim kertas HVS A4 yang akan dikirim pada 25 Februari 2026.",
    type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", catch: "Surya Abadi Jaya", catchAlt: ["Surya"], index: "Surya Abadi Jaya, PT", code: "S", folder: "f-S" },
  { ref: "a3", number: "018/KMP/II/2026", date: "2026-02-12", sender: HOME, senderCity: "Pasuruan", recipient: "CV Sejahtera Makmur", recipientCity: "Malang", subject: "Pemesanan tinta printer", summary: "Memesan 40 botol tinta printer warna hitam dan 20 botol warna untuk kebutuhan bagian administrasi.",
    type: "SURAT_KELUAR", value: "PENTING", retention: "5 tahun", catch: "Sejahtera Makmur", catchAlt: ["Sejahtera"], index: "Sejahtera Makmur, CV", code: "S", folder: "f-S" },
  { ref: "a4", number: "-", date: "2026-02-05", sender: "Budi Santoso", senderCity: "Pasuruan", recipient: "Manajer Personalia " + HOME, recipientCity: "Pasuruan", subject: "Lamaran pekerjaan staf administrasi", tricky: true, summary: "Mengajukan lamaran untuk posisi staf administrasi, dilampiri ijazah SMK jurusan Manajemen Perkantoran dan sertifikat magang.", attachment: "4 lembar",
    type: "SURAT_MASUK", value: "BERGUNA", access: "TERBATAS", retention: "2 tahun", catch: "Santoso", index: "Santoso, Budi", code: "S", folder: "f-S" },
  { ref: "a5", number: "07/UMJ/II/2026", date: "2026-02-20", sender: "UD Maju Jaya", senderCity: "Pasuruan", recipient: "Direktur " + HOME, recipientCity: "Pasuruan", subject: "Undangan peresmian toko cabang", nature: "", tricky: true, summary: "Mengundang Direktur hadir dalam peresmian toko cabang di Jalan Panglima Sudirman pada 2 Maret 2026 pukul 09.00.",
    type: "UNDANGAN", value: "TIDAK_BERGUNA", retention: "1 tahun", catch: "Maju Jaya", catchAlt: ["Maju"], index: "Maju Jaya, UD", code: "M", folder: "f-M" },
  { ref: "a6", number: "KW-0231", date: "2026-02-14", sender: "CV Mandiri Teknik", senderCity: "Pasuruan", recipient: HOME, recipientCity: "Pasuruan", subject: "Pembayaran servis AC ruang rapat", summary: "Telah diterima uang sebesar Rp1.750.000 untuk servis dan isi ulang freon dua unit AC ruang rapat.",
    type: "KUITANSI", value: "PENTING", access: "TERBATAS", retention: "10 tahun", catch: "Mandiri Teknik", catchAlt: ["Mandiri"], index: "Mandiri Teknik, CV", code: "M", folder: "f-M" },
  { ref: "a7", number: "M-03/UM/II/2026", date: "2026-02-16", sender: "Dewi Lestari (Kepala Bagian Umum)", senderCity: "Pasuruan", recipient: "Seluruh staf kantor", recipientCity: "Pasuruan", subject: "Jadwal piket kebersihan ruang arsip", summary: "Memberitahukan jadwal piket kebersihan ruang arsip untuk bulan Maret 2026, setiap hari Jumat pukul 15.00.",
    type: "MEMO", value: "BERGUNA", retention: "1 tahun", catch: "Lestari", index: "Lestari, Dewi", code: "L", folder: "f-L" },
  { ref: "a8", number: "021/KAW/II/2026", date: "2026-02-25", sender: "Dr. Andi Wijaya, S.E.", senderCity: "Malang", recipient: HOME, recipientCity: "Pasuruan", subject: "Jadwal pelatihan pengelolaan keuangan", summary: "Menyampaikan jadwal pelatihan pengelolaan keuangan untuk staf bagian keuangan pada 10–11 Maret 2026.",
    type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", catch: "Wijaya", index: "Wijaya, Andi (Dr., S.E.)", indexAlt: ["Wijaya, Andi", "Wijaya, Andi, Dr., S.E."], code: "W", folder: "f-W" },
  { ref: "a9", number: "LAP/KEU/01/2026", date: "2026-02-03", sender: "Rina Kusumawati (Staf Keuangan)", senderCity: "Pasuruan", recipient: "Direktur " + HOME, recipientCity: "Pasuruan", subject: "Laporan kas bulan Januari 2026", summary: "Melaporkan penerimaan, pengeluaran, dan saldo kas perusahaan selama Januari 2026.", attachment: "6 lembar",
    type: "LAPORAN", value: "PENTING", access: "TERBATAS", retention: "10 tahun", catch: "Kusumawati", index: "Kusumawati, Rina", code: "K", folder: "f-K" },
  { ref: "a10", number: "09/NOT/II/2026", date: "2026-02-27", sender: "Bambang Santosa, S.H. (Notaris)", senderCity: "Pasuruan", recipient: "Direktur " + HOME, recipientCity: "Pasuruan", subject: "Salinan akta perubahan anggaran dasar perusahaan", nature: "Rahasia", tricky: true, summary: "Menyerahkan salinan resmi akta perubahan anggaran dasar perusahaan yang telah disahkan.",
    type: "SURAT_MASUK", value: "VITAL", access: "RAHASIA", retention: "Permanen", catch: "Santosa", index: "Santosa, Bambang (S.H.)", indexAlt: ["Santosa, Bambang", "Santosa, Bambang, S.H."], code: "S", folder: "f-S" },
];
const ABJAD_A_TASKS: TaskIn[] = [
  { prompt: "Temukan surat dari PT Surya Abadi tentang penawaran alat kantor bulan Februari 2026.", ref: "a1" },
  { prompt: "Direktur meminta kuitansi pembayaran servis AC ruang rapat.", ref: "a6" },
  { prompt: "Temukan surat lamaran pekerjaan dari Budi Santoso.", ref: "a4" },
  { prompt: "Temukan surat dari CV Sejahtera Makmur tentang penawaran harga tinta bulan Maret 2026.", ref: null },
  { prompt: "Temukan salinan akta perubahan anggaran dasar dari notaris.", ref: "a10" },
];

// Paket B (tes akhir) – setara dengan Paket A
const ABJAD_B: DocIn[] = [
  { ref: "b1", number: "078/BT/III/2026", date: "2026-03-04", sender: "PT Bintang Timur", senderCity: "Surabaya", recipient: HOME, recipientCity: "Pasuruan", subject: "Penawaran mebel kantor", summary: "Menawarkan meja kerja dan lemari arsip baja dengan garansi dua tahun serta gratis ongkos kirim.", attachment: "1 katalog",
    type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", catch: "Bintang Timur", catchAlt: ["Bintang"], index: "Bintang Timur, PT", code: "B", folder: "f-B" },
  { ref: "b2", number: "131/BTR/III/2026", date: "2026-03-11", sender: "PT Bintang Timur Raya", senderCity: "Gresik", recipient: HOME, recipientCity: "Pasuruan", subject: "Konfirmasi pengiriman kursi kerja", tricky: true, summary: "Mengonfirmasi pengiriman 12 kursi kerja pada 18 Maret 2026.",
    type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", catch: "Bintang Timur Raya", catchAlt: ["Bintang"], index: "Bintang Timur Raya, PT", code: "B", folder: "f-B" },
  { ref: "b3", number: "024/KMP/III/2026", date: "2026-03-06", sender: HOME, senderCity: "Pasuruan", recipient: "CV Berkah Lestari", recipientCity: "Malang", subject: "Pemesanan map dan ordner arsip", summary: "Memesan 200 map gantung dan 50 ordner untuk penataan ruang arsip.",
    type: "SURAT_KELUAR", value: "PENTING", retention: "5 tahun", catch: "Berkah Lestari", catchAlt: ["Berkah"], index: "Berkah Lestari, CV", code: "B", folder: "f-B" },
  { ref: "b4", number: "-", date: "2026-03-02", sender: "Siti Rahmawati", senderCity: "Pasuruan", recipient: "Manajer Personalia " + HOME, recipientCity: "Pasuruan", subject: "Lamaran pekerjaan resepsionis", tricky: true, summary: "Mengajukan lamaran untuk posisi resepsionis, dilampiri ijazah dan sertifikat pelatihan pelayanan prima.", attachment: "4 lembar",
    type: "SURAT_MASUK", value: "BERGUNA", access: "TERBATAS", retention: "2 tahun", catch: "Rahmawati", index: "Rahmawati, Siti", code: "R", folder: "f-R" },
  { ref: "b5", number: "05/UHB/III/2026", date: "2026-03-16", sender: "UD Harapan Baru", senderCity: "Pasuruan", recipient: "Direktur " + HOME, recipientCity: "Pasuruan", subject: "Undangan pembukaan gudang baru", nature: "", tricky: true, summary: "Mengundang Direktur hadir dalam pembukaan gudang baru pada 25 Maret 2026 pukul 10.00.",
    type: "UNDANGAN", value: "TIDAK_BERGUNA", retention: "1 tahun", catch: "Harapan Baru", catchAlt: ["Harapan"], index: "Harapan Baru, UD", code: "H", folder: "f-H" },
  { ref: "b6", number: "KW-0418", date: "2026-03-09", sender: "CV Hasil Karya", senderCity: "Pasuruan", recipient: HOME, recipientCity: "Pasuruan", subject: "Pembayaran perbaikan printer", summary: "Telah diterima uang sebesar Rp950.000 untuk perbaikan dua unit printer bagian administrasi.",
    type: "KUITANSI", value: "PENTING", access: "TERBATAS", retention: "10 tahun", catch: "Hasil Karya", catchAlt: ["Hasil"], index: "Hasil Karya, CV", code: "H", folder: "f-H" },
  { ref: "b7", number: "M-05/PM/III/2026", date: "2026-03-13", sender: "Agus Prasetyo (Kepala Bagian Pemasaran)", senderCity: "Pasuruan", recipient: "Seluruh staf pemasaran", recipientCity: "Pasuruan", subject: "Target penjualan triwulan II", summary: "Menyampaikan target penjualan triwulan II 2026 dan jadwal rapat evaluasi mingguan.",
    type: "MEMO", value: "BERGUNA", access: "TERBATAS", retention: "2 tahun", catch: "Prasetyo", index: "Prasetyo, Agus", code: "P", folder: "f-P" },
  { ref: "b8", number: "014/HG/III/2026", date: "2026-03-19", sender: "Ir. Hendra Gunawan, M.M.", senderCity: "Malang", recipient: HOME, recipientCity: "Pasuruan", subject: "Penawaran jasa konsultasi tata ruang kantor", summary: "Menawarkan jasa konsultasi penataan ruang kantor dan ruang arsip.",
    type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", catch: "Gunawan", index: "Gunawan, Hendra (Ir., M.M.)", indexAlt: ["Gunawan, Hendra", "Gunawan, Hendra, Ir., M.M."], code: "G", folder: "f-G" },
  { ref: "b9", number: "LAP/KEU/02/2026", date: "2026-03-03", sender: "Lina Marlina (Staf Keuangan)", senderCity: "Pasuruan", recipient: "Direktur " + HOME, recipientCity: "Pasuruan", subject: "Laporan kas bulan Februari 2026", summary: "Melaporkan penerimaan, pengeluaran, dan saldo kas perusahaan selama Februari 2026.", attachment: "6 lembar",
    type: "LAPORAN", value: "PENTING", access: "TERBATAS", retention: "10 tahun", catch: "Marlina", index: "Marlina, Lina", code: "M", folder: "f-M" },
  { ref: "b10", number: "11/NOT/III/2026", date: "2026-03-24", sender: "Joko Rahmanto, S.H., M.Kn. (Notaris)", senderCity: "Pasuruan", recipient: "Direktur " + HOME, recipientCity: "Pasuruan", subject: "Salinan sertifikat hak guna bangunan kantor", nature: "Rahasia", tricky: true, summary: "Menyerahkan salinan resmi sertifikat hak guna bangunan gedung kantor.",
    type: "SURAT_MASUK", value: "VITAL", access: "RAHASIA", retention: "Permanen", catch: "Rahmanto", index: "Rahmanto, Joko (S.H., M.Kn.)", indexAlt: ["Rahmanto, Joko", "Rahmanto, Joko, S.H., M.Kn."], code: "R", folder: "f-R" },
];
const ABJAD_B_TASKS: TaskIn[] = [
  { prompt: "Temukan surat dari PT Bintang Timur tentang penawaran mebel kantor bulan Maret 2026.", ref: "b1" },
  { prompt: "Bagian keuangan meminta kuitansi pembayaran perbaikan printer.", ref: "b6" },
  { prompt: "Temukan surat lamaran pekerjaan dari Siti Rahmawati.", ref: "b4" },
  { prompt: "Temukan surat dari CV Berkah Lestari tentang penawaran harga ordner bulan April 2026.", ref: null },
  { prompt: "Temukan salinan sertifikat hak guna bangunan dari notaris.", ref: "b10" },
];

// Latihan sistem nomor & subjek: pokok masalah sama, kode berbeda
type Topic = { ref: string; type: string; value: string; access?: string; retention: string; sender: string; senderCity: string; recipient: string; recipientCity: string; number: string; subject: string; summary: string; group: [string, number]; catchN: string; catchAlt?: string[]; tricky?: boolean };
const r = HOME;
const TOPICS = (m: string): Topic[] => [
  { ref: "t1", type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", sender: "PT Surya Abadi", senderCity: "Surabaya", recipient: r, recipientCity: "Pasuruan", number: `051/SA/${m}/2026`, subject: "Penawaran alat tulis kantor", summary: "Menawarkan alat tulis kantor dengan harga khusus pelanggan tetap.", group: ["PL", 1], catchN: "Pengadaan", catchAlt: ["Penawaran", "Pengadaan barang"] },
  { ref: "t2", type: "UNDANGAN", value: "TIDAK_BERGUNA", retention: "1 tahun", sender: "Paguyuban Pengusaha Pasuruan", senderCity: "Pasuruan", recipient: "Direktur " + r, recipientCity: "Pasuruan", number: `03/PPP/${m}/2026`, subject: "Undangan rapat tahunan anggota", summary: "Mengundang Direktur menghadiri rapat tahunan anggota paguyuban.", group: ["UM", 1], catchN: "Undangan" },
  { ref: "t3", type: "KUITANSI", value: "PENTING", access: "TERBATAS", retention: "10 tahun", sender: "CV Mandiri Teknik", senderCity: "Pasuruan", recipient: r, recipientCity: "Pasuruan", number: "KW-0302", subject: "Pembayaran servis AC", summary: "Telah diterima pembayaran servis tiga unit AC kantor sebesar Rp2.100.000.", group: ["KU", 2], catchN: "Pembayaran" },
  { ref: "t4", type: "SURAT_MASUK", value: "BERGUNA", access: "TERBATAS", retention: "2 tahun", sender: "Budi Santoso", senderCity: "Pasuruan", recipient: "Manajer Personalia " + r, recipientCity: "Pasuruan", number: "-", subject: "Lamaran pekerjaan staf gudang", summary: "Mengajukan lamaran pekerjaan sebagai staf gudang.", group: ["KP", 1], catchN: "Penerimaan Pegawai", catchAlt: ["Lamaran", "Penerimaan"] },
  { ref: "t5", type: "MEMO", value: "BERGUNA", access: "TERBATAS", retention: "2 tahun", sender: "Dewi Lestari (Kepala Bagian Umum)", senderCity: "Pasuruan", recipient: "Manajer Personalia", recipientCity: "Pasuruan", number: `M-07/UM/${m}/2026`, subject: "Permohonan cuti tahunan staf", summary: "Meneruskan permohonan cuti tahunan dua orang staf bagian umum.", group: ["KP", 2], catchN: "Cuti", catchAlt: ["Cuti dan izin"] },
  { ref: "t6", type: "SURAT_KELUAR", value: "PENTING", retention: "5 tahun", sender: r, senderCity: "Pasuruan", recipient: "CV Sejahtera Makmur", recipientCity: "Malang", number: `022/KMP/${m}/2026`, subject: "Pemesanan tinta printer", summary: "Memesan tinta printer untuk kebutuhan kantor selama tiga bulan.", group: ["PL", 1], catchN: "Pengadaan", catchAlt: ["Pemesanan", "Pengadaan barang"], tricky: true },
  { ref: "t7", type: "SURAT_MASUK", value: "PENTING", retention: "5 tahun", sender: "PT Cahaya Ritel", senderCity: "Malang", recipient: r, recipientCity: "Pasuruan", number: `088/CR/${m}/2026`, subject: "Pesanan 200 rim kertas HVS", summary: "Memesan 200 rim kertas HVS produksi perusahaan untuk dikirim ke gudang Malang.", group: ["PM", 1], catchN: "Penjualan", catchAlt: ["Pesanan", "Pesanan dan penjualan"], tricky: true },
  { ref: "t8", type: "LAPORAN", value: "PENTING", access: "TERBATAS", retention: "10 tahun", sender: "Rina Kusumawati (Staf Keuangan)", senderCity: "Pasuruan", recipient: "Direktur " + r, recipientCity: "Pasuruan", number: `LAP/KEU/${m}/2026`, subject: "Laporan kas bulanan", summary: "Melaporkan arus kas perusahaan bulan sebelumnya.", group: ["KU", 3], catchN: "Laporan Keuangan", catchAlt: ["Laporan kas"] },
  { ref: "t9", type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", sender: "PT Surya Abadi", senderCity: "Surabaya", recipient: r, recipientCity: "Pasuruan", number: `064/SA/${m}/2026`, subject: "Penawaran perawatan mesin fotokopi", summary: "Menawarkan kontrak perawatan berkala mesin fotokopi selama satu tahun.", group: ["PL", 3], catchN: "Pemeliharaan", catchAlt: ["Perawatan"], tricky: true },
  { ref: "t10", type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", sender: "Lembaga Pelatihan Prima Kompetensi", senderCity: "Surabaya", recipient: r, recipientCity: "Pasuruan", number: `015/LPPK/${m}/2026`, subject: "Penawaran pelatihan kearsipan untuk staf", summary: "Menawarkan pelatihan kearsipan dua hari untuk staf administrasi.", group: ["KP", 3], catchN: "Pelatihan", tricky: true },
];
const GROUP_INFO = Object.fromEntries(CLASS_GROUPS.flatMap((d) => d.main.map((m) => [m.s, m])));
function topicDocs(system: "NOMOR" | "SUBJEK", month: number): DocIn[] {
  const mm = String(month).padStart(2, "0");
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][month - 1];
  const days = [8, 15, 20, 12, 22, 9, 18, 5, 26, 28];
  return TOPICS(roman).map((t, i) => {
    const g = GROUP_INFO[t.group[0]];
    const sub = g.subs[t.group[1] - 1];
    const numCode = String(Number(g.n) + t.group[1] * 10).padStart(3, "0");
    const sCode = `${g.s}.${t.group[1]}`;
    return {
      ref: t.ref, number: t.number, date: `2026-${mm}-${String(days[i]).padStart(2, "0")}`, sender: t.sender, senderCity: t.senderCity, recipient: t.recipient, recipientCity: t.recipientCity,
      subject: t.subject, summary: t.summary, tricky: t.tricky, type: t.type, value: t.value, access: t.access, retention: t.retention,
      catch: t.catchN, catchAlt: t.catchAlt, index: `${g.label} – ${sub}`, indexAlt: [`${g.label} ${sub}`],
      code: system === "NOMOR" ? numCode : sCode, folder: system === "NOMOR" ? `f-${numCode}` : `f-${g.s}${t.group[1]}`,
    };
  });
}
const topicTasks = (month: string): TaskIn[] => [
  { prompt: `Temukan penawaran perawatan mesin fotokopi dari PT Surya Abadi (${month} 2026).`, ref: "t9" },
  { prompt: "Temukan surat pesanan kertas HVS dari PT Cahaya Ritel.", ref: "t7" },
  { prompt: "Temukan memo permohonan cuti tahunan staf bagian umum.", ref: "t5" },
  { prompt: "Temukan surat dari PT Surya Abadi tentang penawaran kursi kantor.", ref: null },
];

const W = (c: string, city: string) => `${city} – ${c}`;
const WILAYAH_DOCS: DocIn[] = [
  { ref: "w1", number: "071/SA/V/2026", date: "2026-05-04", sender: "PT Surya Abadi", senderCity: "Surabaya", recipient: r, recipientCity: "Pasuruan", subject: "Penawaran alat kantor", summary: "Menawarkan alat kantor dengan potongan harga musim tahun ajaran baru.", type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", catch: "Surabaya", index: W("Surya Abadi, PT", "Surabaya"), code: "SBY.2", folder: "f-SBY2" },
  { ref: "w2", number: "033/MT/V/2026", date: "2026-05-06", sender: "CV Mandiri Teknik", senderCity: "Surabaya", recipient: r, recipientCity: "Pasuruan", subject: "Penawaran servis AC berkala", summary: "Menawarkan kontrak servis AC berkala setiap tiga bulan.", type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", catch: "Surabaya", index: W("Mandiri Teknik, CV", "Surabaya"), code: "SBY.2", folder: "f-SBY2", tricky: true },
  { ref: "w3", number: "031/KMP/V/2026", date: "2026-05-05", sender: r, senderCity: "Pasuruan", recipient: "CV Sejahtera Makmur", recipientCity: "Malang", subject: "Pemesanan tinta printer", summary: "Memesan tinta printer untuk kebutuhan bagian administrasi.", type: "SURAT_KELUAR", value: "PENTING", retention: "5 tahun", catch: "Malang", index: W("Sejahtera Makmur, CV", "Malang"), code: "MLG.2", folder: "f-MLG2", tricky: true },
  { ref: "w4", number: "019/AB/V/2026", date: "2026-05-11", sender: "PT Arta Boga", senderCity: "Malang", recipient: r, recipientCity: "Pasuruan", subject: "Konfirmasi kerja sama katering rapat", summary: "Mengonfirmasi kerja sama penyediaan konsumsi rapat bulanan.", type: "SURAT_MASUK", value: "PENTING", retention: "5 tahun", catch: "Malang", index: W("Arta Boga, PT", "Malang"), code: "MLG.1", folder: "f-MLG1" },
  { ref: "w5", number: "09/UMJ/V/2026", date: "2026-05-12", sender: "UD Maju Jaya", senderCity: "Pasuruan", recipient: "Direktur " + r, recipientCity: "Pasuruan", subject: "Undangan syukuran ulang tahun usaha", summary: "Mengundang Direktur dalam syukuran ulang tahun usaha ke-10.", type: "UNDANGAN", value: "TIDAK_BERGUNA", retention: "1 tahun", catch: "Pasuruan", index: W("Maju Jaya, UD", "Pasuruan"), code: "PSR.2", folder: "f-PSR2" },
  { ref: "w6", number: "-", date: "2026-05-07", sender: "Budi Santoso", senderCity: "Pasuruan", recipient: "Manajer Personalia " + r, recipientCity: "Pasuruan", subject: "Lamaran pekerjaan staf administrasi", summary: "Mengajukan lamaran pekerjaan sebagai staf administrasi.", type: "SURAT_MASUK", value: "BERGUNA", access: "TERBATAS", retention: "2 tahun", catch: "Pasuruan", index: W("Santoso, Budi", "Pasuruan"), code: "PSR.2", folder: "f-PSR2" },
  { ref: "w7", number: "035/KMP/V/2026", date: "2026-05-14", sender: r, senderCity: "Pasuruan", recipient: "PT Delta Prima", recipientCity: "Sidoarjo", subject: "Penawaran produk kertas", summary: "Menawarkan produk kertas HVS dan kertas karton dengan harga distributor.", type: "SURAT_KELUAR", value: "BERGUNA", retention: "2 tahun", catch: "Sidoarjo", index: W("Delta Prima, PT", "Sidoarjo"), code: "SDA.1", folder: "f-SDA1", tricky: true },
  { ref: "w8", number: "052/KU/V/2026", date: "2026-05-18", sender: "CV Karya Utama", senderCity: "Semarang", recipient: r, recipientCity: "Pasuruan", subject: "Permohonan katalog produk", summary: "Meminta katalog produk dan daftar harga terbaru.", type: "SURAT_MASUK", value: "BERGUNA", retention: "1 tahun", catch: "Semarang", index: W("Karya Utama, CV", "Semarang"), code: "SMG.1", folder: "f-SMG1" },
  { ref: "w9", number: "117/ND/V/2026", date: "2026-05-20", sender: "PT Nusa Data", senderCity: "Jakarta", recipient: r, recipientCity: "Pasuruan", subject: "Penawaran aplikasi kasir", summary: "Menawarkan aplikasi kasir berbasis web dengan masa uji coba 30 hari.", type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", catch: "Jakarta", index: W("Nusa Data, PT", "Jakarta"), code: "JKT.2", folder: "f-JKT2" },
  { ref: "w10", number: "038/KMP/V/2026", date: "2026-05-22", sender: r, senderCity: "Pasuruan", recipient: "Koperasi Sumber Rejeki", recipientCity: "Bandung", subject: "Konfirmasi pesanan kertas", summary: "Mengonfirmasi pesanan 300 rim kertas yang akan dikirim minggu depan.", type: "SURAT_KELUAR", value: "PENTING", retention: "5 tahun", catch: "Bandung", index: W("Sumber Rejeki, Koperasi", "Bandung"), code: "BDG.2", folder: "f-BDG2" },
];
const WILAYAH_TASKS: TaskIn[] = [
  { prompt: "Temukan surat penawaran servis AC dari perusahaan di Surabaya.", ref: "w2" },
  { prompt: "Temukan surat yang kita kirim ke PT Delta Prima di Sidoarjo.", ref: "w7" },
  { prompt: "Temukan surat dari PT Nusa Data di Bandung.", ref: null },
  { prompt: "Temukan undangan dari UD Maju Jaya, Pasuruan.", ref: "w5" },
];

const T = (date: string) => { const [y, m] = date.split("-"); return { catch: `${MONTHS[Number(m) - 1]} ${y}`, catchAlt: [MONTHS[Number(m) - 1], `${y}-${m}`], index: date, indexAlt: [`${y} ${MONTHS[Number(m) - 1]} ${date.slice(8)}`], code: `${y}.${m}`, folder: `f-${y}${m}` }; };
const TANGGAL_DOCS: DocIn[] = [
  { ref: "d1", number: "045/SA/II/2026", date: "2026-02-10", sender: "PT Surya Abadi", senderCity: "Surabaya", recipient: r, recipientCity: "Pasuruan", subject: "Penawaran alat kantor", summary: "Menawarkan alat kantor dengan potongan harga 10%.", type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", ...T("2026-02-10") },
  { ref: "d2", number: "KW-0210", date: "2026-02-03", sender: "CV Mandiri Teknik", senderCity: "Pasuruan", recipient: r, recipientCity: "Pasuruan", subject: "Pembayaran servis AC", summary: "Telah diterima pembayaran servis AC sebesar Rp1.200.000.", type: "KUITANSI", value: "PENTING", access: "TERBATAS", retention: "10 tahun", ...T("2026-02-03") },
  { ref: "d3", number: "04/PPP/II/2026", date: "2026-02-24", sender: "Paguyuban Pengusaha Pasuruan", senderCity: "Pasuruan", recipient: "Direktur " + r, recipientCity: "Pasuruan", subject: "Undangan rapat anggota", summary: "Mengundang Direktur menghadiri rapat anggota.", type: "UNDANGAN", value: "TIDAK_BERGUNA", retention: "1 tahun", ...T("2026-02-24") },
  { ref: "d4", number: "-", date: "2026-01-15", sender: "Budi Santoso", senderCity: "Pasuruan", recipient: "Manajer Personalia " + r, recipientCity: "Pasuruan", subject: "Lamaran pekerjaan staf administrasi", summary: "Mengajukan lamaran pekerjaan.", type: "SURAT_MASUK", value: "BERGUNA", access: "TERBATAS", retention: "2 tahun", ...T("2026-01-15") },
  { ref: "d5", number: "M-02/UM/I/2026", date: "2026-01-30", sender: "Dewi Lestari (Kepala Bagian Umum)", senderCity: "Pasuruan", recipient: "Seluruh staf", recipientCity: "Pasuruan", subject: "Jadwal piket kebersihan", summary: "Memberitahukan jadwal piket kebersihan bulan Februari.", type: "MEMO", value: "BERGUNA", retention: "1 tahun", ...T("2026-01-30") },
  { ref: "d6", number: "026/KMP/III/2026", date: "2026-03-05", sender: r, senderCity: "Pasuruan", recipient: "CV Sejahtera Makmur", recipientCity: "Malang", subject: "Pemesanan tinta printer", summary: "Memesan tinta printer.", type: "SURAT_KELUAR", value: "PENTING", retention: "5 tahun", ...T("2026-03-05") },
  { ref: "d7", number: "LAP/KEU/03/2026", date: "2026-04-17", sender: "Rina Kusumawati (Staf Keuangan)", senderCity: "Pasuruan", recipient: "Direktur " + r, recipientCity: "Pasuruan", subject: "Laporan kas bulan Maret 2026", summary: "Melaporkan arus kas bulan Maret 2026.", type: "LAPORAN", value: "PENTING", access: "TERBATAS", retention: "10 tahun", tricky: true, ...T("2026-04-17") },
  { ref: "d8", number: "091/AB/III/2026", date: "2026-03-21", sender: "PT Arta Boga", senderCity: "Malang", recipient: r, recipientCity: "Pasuruan", subject: "Konfirmasi kerja sama katering", summary: "Mengonfirmasi kerja sama konsumsi rapat.", type: "SURAT_MASUK", value: "PENTING", retention: "5 tahun", ...T("2026-03-21") },
  { ref: "d9", number: "117/ND/VI/2026", date: "2026-06-02", sender: "PT Nusa Data", senderCity: "Jakarta", recipient: r, recipientCity: "Pasuruan", subject: "Penawaran aplikasi kasir", summary: "Menawarkan aplikasi kasir berbasis web.", type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", ...T("2026-06-02") },
  { ref: "d10", number: "012/SAJ/II/2026", date: "2026-02-10", sender: "PT Surya Abadi Jaya", senderCity: "Sidoarjo", recipient: r, recipientCity: "Pasuruan", subject: "Konfirmasi pesanan kertas", summary: "Mengonfirmasi pesanan kertas HVS.", type: "SURAT_MASUK", value: "BERGUNA", retention: "2 tahun", tricky: true, ...T("2026-02-10") },
];
const TANGGAL_TASKS: TaskIn[] = [
  { prompt: "Temukan laporan kas bulan Maret 2026.", ref: "d7" },
  { prompt: "Temukan surat konfirmasi pesanan kertas yang diterima tanggal 10 Februari 2026.", ref: "d10" },
  { prompt: "Temukan undangan rapat anggota bulan Januari 2026.", ref: null },
  { prompt: "Temukan surat pemesanan tinta printer yang dikirim bulan Maret 2026.", ref: "d6" },
];

async function main() {
  // --if-empty: dipakai saat build Vercel; hanya mengisi data contoh bila database belum punya akun
  if (process.argv.includes("--if-empty") && (await db.user.count()) > 0) {
    console.log("Database sudah berisi data; seed dilewati.");
    return;
  }
  await db.$transaction([
    db.errorLog.deleteMany(), db.event.deleteMany(), db.retrievalResult.deleteMany(), db.attempt.deleteMany(),
    db.practiceSession.deleteMany(), db.retrievalTask.deleteMany(), db.document.deleteMany(), db.package.deleteMany(),
    db.user.deleteMany(), db.classroom.deleteMany(),
  ]);
  const hash = (p: string) => bcrypt.hashSync(p, 10);
  await db.user.create({ data: { username: "admin", name: "Admin Sekolah", role: "ADMIN", passwordHash: hash("admin123") } });
  const guru = await db.user.create({ data: { username: "guru", name: "Guru Kearsipan", role: "TEACHER", passwordHash: hash("guru123") } });
  const kelas1 = await db.classroom.create({ data: { name: "XI MP 1", teacherId: guru.id } });
  const kelas2 = await db.classroom.create({ data: { name: "XI MP 2", teacherId: guru.id } });
  const names = ["Ayu Pratiwi", "Bagus Saputra", "Citra Anggraini", "Dimas Kurniawan", "Eka Wulandari"];
  for (const [i, n] of names.entries())
    await db.user.create({ data: { username: `siswa0${i + 1}`, name: n, role: "STUDENT", classroomId: kelas1.id, passwordHash: hash("siswa123") } });
  await db.user.create({ data: { username: "siswa06", name: "Fajar Nugroho", role: "STUDENT", classroomId: kelas2.id, passwordHash: hash("siswa123") } });

  const pA = await createPackage({ title: "Paket A – Tes awal (sistem abjad)", description: "Tes praktik awal. 10 dokumen bulan Februari 2026.", system: "ABJAD", kind: "PRETEST", difficulty: 2, cabinet: abjadCabinet(), docs: ABJAD_A, tasks: ABJAD_A_TASKS });
  const pB = await createPackage({ title: "Paket B – Tes akhir (sistem abjad)", description: "Tes praktik akhir, setara dengan Paket A. 10 dokumen bulan Maret 2026.", system: "ABJAD", kind: "POSTTEST", difficulty: 2, cabinet: abjadCabinet(), docs: ABJAD_B, tasks: ABJAD_B_TASKS });
  const pN = await createPackage({ title: "Latihan sistem nomor (desimal)", description: "Klasifikasi desimal kantor 000–400.", system: "NOMOR", kind: "LATIHAN", difficulty: 2, cabinet: nomorCabinet(), docs: topicDocs("NOMOR", 1), tasks: topicTasks("Januari") });
  const pS = await createPackage({ title: "Latihan sistem subjek", description: "Subjek: Umum, Keuangan, Kepegawaian, Perlengkapan, Pemasaran.", system: "SUBJEK", kind: "LATIHAN", difficulty: 2, cabinet: subjekCabinet(), docs: topicDocs("SUBJEK", 4), tasks: topicTasks("April") });
  const pW = await createPackage({ title: "Latihan sistem wilayah", description: "Laci per provinsi, guide per kota.", system: "WILAYAH", kind: "LATIHAN", difficulty: 2, cabinet: wilayahCabinet(), docs: WILAYAH_DOCS, tasks: WILAYAH_TASKS });
  const pT = await createPackage({ title: "Latihan sistem tanggal", description: "Laci tahun, guide triwulan, folder bulan.", system: "TANGGAL", kind: "LATIHAN", difficulty: 1, cabinet: tanggalCabinet(), docs: TANGGAL_DOCS, tasks: TANGGAL_TASKS });

  await db.practiceSession.create({ data: { title: "Tes awal – Paket A", packageId: pA.id, classroomId: kelas1.id, active: true } });
  await db.practiceSession.create({ data: { title: "Latihan 1 – Sistem tanggal", packageId: pT.id, classroomId: kelas1.id, active: true } });
  await db.practiceSession.create({ data: { title: "Tes akhir – Paket B", packageId: pB.id, classroomId: kelas1.id, active: false } });
  void pN; void pS; void pW;
  console.log("Seed selesai.");
}
main().finally(() => db.$disconnect());
