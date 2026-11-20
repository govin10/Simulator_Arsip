# Arsipku — Simulator & Pengumpulan Tugas Kearsipan

Website untuk kelas XI Manajemen Perkantoran SMK Negeri 1 Pasuruan, dengan dua cara berlatih:

1. **Praktik di website (simulator).** Siswa mengerjakan paket dokumen langsung di website: identifikasi → klasifikasi, indeks & kode → kartu kendali/metadata → lemari arsip virtual (drag & drop) → temu kembali bertimer → skenario kesalahan. Penilaian otomatis per komponen, umpan balik berbasis jenis kesalahan, rubrik guru.
2. **Tugas PDF (soal kertas).** Guru membagikan kertas soal acak per fitur; siswa mengerjakan, memindai menjadi PDF, memilih fitur yang dikerjakan, lalu mengunggahnya. Guru mengoreksi PDF di browser dan memberi nilai + catatan.

Tampilan: menu samping, dashboard bergaya kartu, tema pink lembut.

## Menu
**Siswa:** Beranda (ringkasan progres & menu praktik) · Paket Dokumen · Klasifikasi & Indeks · Lemari Arsip · Metadata Arsip · Temu Kembali · Skenario Kesalahan (menu tahap membuka praktik yang sedang berjalan) · Tugas PDF · Hasil & Nilai · Bantuan · Ganti Sandi. Siswa mendaftar sendiri di halaman *Daftar* dan mengisi kelasnya.

**Guru:** Beranda (jumlah siswa, rata-rata skor, paket dikerjakan, waktu rata-rata, ketuntasan, progres siswa, kesalahan tersering) · Siswa & Kelas · Paket Dokumen (bank paket + editor kunci jawaban + impor CSV) · Sesi Praktik · Hasil Praktik (analitik per indikator, tes awal vs akhir, ekspor CSV, periksa & rubrik) · Tugas PDF (buat tugas, koreksi PDF) · Rekap Nilai PDF.

**Fitur tugas PDF:** 1. Identifikasi dokumen · 2. Klasifikasi arsip · 3. Indeks & kode arsip · 4. Penyimpanan di lemari arsip · 5. Kartu kendali & metadata · 6. Temu kembali arsip · 7. Skenario kesalahan arsip.

Kunci jawaban simulator tidak pernah dikirim ke browser siswa. PDF hanya bisa dibuka pemiliknya dan guru kelasnya.

## Teknologi
Next.js 15 · TypeScript · Tailwind · Prisma + PostgreSQL (Neon) · Vercel Blob (penyimpanan PDF).

## Deploy ke Vercel
1. Import repo ke Vercel (Add New → Project). Tambahkan env `AUTH_SECRET` (teks acak ≥ 32 karakter).
2. Tab **Storage → Create Database → Neon** (region Singapore) → hubungkan ke project → otomatis menambah `DATABASE_URL`.
3. Tab **Storage → Create → Blob** → hubungkan ke project → otomatis menambah `BLOB_READ_WRITE_TOKEN`.
4. **Redeploy.** Saat build, `npm run db:setup` otomatis:
   - membuat/memperbarui tabel (`prisma db push`),
   - mengisi akun contoh bila belum ada akun, dan 6 paket praktik contoh bila belum ada paket (data yang ada tidak pernah dihapus).

Tanpa `BLOB_READ_WRITE_TOKEN`, unggahan di Vercel akan gagal dengan pesan "Penyimpanan file belum diatur".

## Menjalankan di komputer
```bash
cp .env.example .env        # isi DATABASE_URL dan AUTH_SECRET
npm install
npm run db:setup
npm run dev                 # http://localhost:3000
```
Tanpa token Blob, PDF disimpan di folder `.uploads/` (hanya untuk percobaan lokal).

## Akun awal
Bila belum ada akun saat pertama deploy: `admin/admin123`, `guru/guru123`, dan siswa contoh `siswa01/siswa123` (XI MP 1). **Segera ganti kata sandi** (klik nama di kanan atas) dan hapus akun siswa contoh.

- **Kata sandi sendiri:** klik nama di kanan atas → *Ganti kata sandi*.
- **Siswa lupa kata sandi:** guru → *Kelas & akun* → *Reset sandi*.
- **Guru/admin lain:** admin → *Kelas & akun* → bagian *Akun guru*.
