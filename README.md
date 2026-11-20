# Tugas Arsip — Pengumpulan & Penilaian Tugas Kearsipan

Website untuk kelas XI Manajemen Perkantoran SMK Negeri 1 Pasuruan. Soal diberikan guru **di kertas**; siswa mengerjakan, memindai menjadi **PDF**, lalu mengumpulkannya di website. Guru mengoreksi PDF langsung di browser dan memberi nilai serta catatan.

## Alur
**Siswa**
1. *Daftar* (nama, kelas, username, kata sandi). Kelas yang belum ada dibuat otomatis; penulisan dirapikan (`xi mp1` → `XI MP 1`).
2. Melihat tugas kelasnya beserta tenggat, **memilih fitur yang dikerjakan** sesuai kertas acak yang diterimanya, lalu mengunggah PDF (maks. 20 MB, ada progress bar, bisa dari HP).
3. Melihat nilai dan catatan guru. Bila guru *mengembalikan untuk revisi*, siswa bisa mengunggah ulang.

**Guru**
1. *Tugas & koreksi* → buat tugas (judul, petunjuk, **fitur yang bisa dipilih siswa**, tenggat, nilai maksimal, terima terlambat atau tidak) untuk satu atau beberapa kelas sekaligus.
2. Buka tugas → daftar siswa (sudah/belum kumpul, terlambat) → PDF tampil di halaman → isi nilai & catatan → *Simpan & berikutnya* (atau tekan Enter). Bisa *Kembalikan untuk revisi*.
3. *Rekap nilai* → tabel siswa × tugas per kelas (dengan fitur yang dikerjakan), **ringkasan per fitur**, ekspor CSV (bisa dibuka di Excel).

**Fitur** (sama dengan fitur simulator sebelumnya): 1. Identifikasi dokumen · 2. Klasifikasi arsip · 3. Indeks & kode arsip · 4. Penyimpanan di lemari arsip · 5. Kartu kendali & metadata · 6. Temu kembali arsip · 7. Skenario kesalahan arsip. Guru membagikan kertas soal acak; siswa memilih fitur yang sesuai saat mengumpulkan. Fitur yang tidak dicentang di tugas tidak bisa dipilih siswa (diperiksa juga di server).
4. *Kelas & akun* → pindahkan siswa yang salah kelas, hapus kelas kosong (salah ketik), reset kata sandi, hapus akun.

File PDF hanya bisa dibuka oleh siswa pemiliknya dan guru kelasnya; alamat asli file tidak ditampilkan di halaman.

## Teknologi
Next.js 15 · TypeScript · Tailwind · Prisma + PostgreSQL (Neon) · Vercel Blob (penyimpanan PDF).

## Deploy ke Vercel
1. Import repo ke Vercel (Add New → Project). Tambahkan env `AUTH_SECRET` (teks acak ≥ 32 karakter).
2. Tab **Storage → Create Database → Neon** (region Singapore) → hubungkan ke project → otomatis menambah `DATABASE_URL`.
3. Tab **Storage → Create → Blob** → hubungkan ke project → otomatis menambah `BLOB_READ_WRITE_TOKEN`.
4. **Redeploy.** Saat build, `npm run db:setup` otomatis:
   - menghapus tabel simulator versi lama bila masih ada (`prisma/cleanup.sql`),
   - membuat/memperbarui tabel (`prisma db push`),
   - mengisi data awal **hanya bila database masih kosong** (data yang ada tidak pernah dihapus).

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
Bila database kosong saat pertama deploy: `admin/admin123`, `guru/guru123`, dan siswa contoh `siswa01/siswa123` (XI MP 1). **Segera ganti kata sandi** (klik nama di kanan atas) dan hapus akun siswa contoh.

- **Kata sandi sendiri:** klik nama di kanan atas → *Ganti kata sandi*.
- **Siswa lupa kata sandi:** guru → *Kelas & akun* → *Reset sandi*.
- **Guru/admin lain:** admin → *Kelas & akun* → bagian *Akun guru*.
