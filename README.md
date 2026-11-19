# Simulator Klasifikasi, Penyimpanan, dan Temu Kembali Arsip Digital

Website simulator kearsipan untuk siswa XI Manajemen Perkantoran SMK Negeri 1 Pasuruan. Siswa **mengerjakan** pekerjaan arsip: identifikasi → klasifikasi, indeks & kode → kartu kendali → menyimpan di lemari virtual → temu kembali bertimer → skenario kesalahan. Guru melihat skor per indikator, kesalahan tersering, serta perbandingan tes awal dan tes akhir.

## Fitur (sesuai PRD)

| PRD | Implementasi |
|---|---|
| F1 Paket dokumen | Bank paket, 8–20 dokumen fiktif, dokumen "sengaja mirip/tidak lengkap", urutan diacak per percobaan |
| F2 Klasifikasi | 5 sistem (abjad, nomor, subjek, wilayah, tanggal); sistem bisa dikunci per paket; sistem, kata tangkap, kode dinilai terpisah |
| F3 Indeks & kode | Toleransi huruf besar-kecil, spasi, tanda baca; jawaban alternatif (sinonim) dari kunci guru; diagnosis khusus (PT di depan, urutan nama orang, gelar, arah surat masuk/keluar) |
| F4 Lemari virtual | Laci → guide → folder → subfolder; drag-and-drop (mouse & sentuh) + menu "Simpan ke…" tanpa seret; atur urutan ↑↓; tidak ada tanda benar/salah sebelum dikirim |
| F5 Kartu kendali | 9 kolom; guru menyalakan/mematikan kolom per paket; kosong vs salah dicatat terpisah; konsistensi kode/lokasi diperiksa |
| F6 Temu kembali | Timer dari server, setiap langkah tercatat (buka laci/folder/dokumen, cari register), permintaan "arsip tidak ada" |
| F7 Skenario kesalahan | Dibangkitkan otomatis dari kunci: folder salah, kode salah, ganda, metadata kosong, urutan salah (jumlah diatur guru); temuan benar / penyebab / perbaikan / laporan keliru |
| F8 Umpan balik | Setiap aturan punya kode kesalahan + templat pesan; tampil setelah tahap dikirim; tidak memberi jawaban lengkap |
| F9 Penilaian | 9 komponen dengan bobot yang bisa diubah; skor waktu hanya dihitung bila akurasi ≥ ambang; kemandirian dikurangi bantuan & percobaan ulang; setiap skor bisa ditelusuri ke butirnya |
| F10 Dashboard guru | Filter kelas/sesi, skor per indikator, kesalahan tersering, progres siswa, tes awal vs akhir, ekspor CSV (bisa dianonimkan), rubrik & nilai akhir guru dengan catatan |

Integritas: kunci jawaban **tidak pernah dikirim ke browser siswa**; semua pemeriksaan di server. Jawaban tersimpan otomatis ke server (dan cadangan di perangkat) sehingga sesi dapat dilanjutkan.

## Teknologi
Next.js 15 (App Router) · TypeScript · Tailwind · Prisma + PostgreSQL · @dnd-kit · login JWT (cookie httpOnly).

## Menjalankan secara lokal
```bash
cp .env.example .env        # isi DATABASE_URL dan AUTH_SECRET
npm install
npx prisma db push          # buat tabel
npm run db:seed             # data contoh (MENGHAPUS data yang ada)
npm run dev                 # http://localhost:3000
```

Akun contoh: `admin/admin123`, `guru/guru123`, `siswa01`…`siswa05/siswa123` (XI MP 1), `siswa06/siswa123` (XI MP 2). **Ganti semua kata sandi sebelum dipakai di kelas:**

- **Kata sandi sendiri** (semua peran): klik nama Anda di kanan atas → halaman *Ganti kata sandi*.
- **Siswa**: guru membuka *Kelas & akun* → *Reset sandi* (dibuat acak), atau impor CSV dengan kolom `password` berisi kata sandi pilihan.
- **Guru/admin lain**: admin membuka *Kelas & akun* → bagian *Akun guru* → *reset sandi*.
- Akun siswa contoh (`siswa01`–`siswa06`) sebaiknya dihapus dan diganti daftar siswa asli lewat impor CSV.

Paket contoh: Paket A (tes awal, abjad), Paket B (tes akhir setara, abjad), dan latihan sistem nomor, subjek, wilayah, tanggal.

## Deploy ke Vercel
1. Buat database Postgres (Vercel Postgres / Neon / Supabase), salin connection string.
2. Import repo ke Vercel, set environment variable `DATABASE_URL` dan `AUTH_SECRET` (string acak ≥ 32 karakter).
3. Sekali dari komputer: `DATABASE_URL=... npx prisma db push` lalu `DATABASE_URL=... npm run db:seed`.

## Hal yang perlu dikonfirmasi guru (PRD bagian 10)
Kaidah di kunci contoh adalah **usulan** dan bisa diubah di editor paket:
- Abjad: nama orang → nama akhir dulu (`Santoso, Budi`); badan usaha → bentuk usaha di akhir (`Surya Abadi, PT`); gelar di belakang dalam kurung; kode = huruf awal; urutan dalam folder = abjad indeks lalu tanggal.
- Nomor: klasifikasi desimal kantor 000–400 (folder 010…430); urutan = tanggal menaik.
- Subjek: UM/KU/KP/PL/PM dengan sub-subjek .1–.3; urutan = tanggal.
- Wilayah: laci provinsi, guide kota, folder A–L / M–Z; indeks `Kota – Nama`.
- Tanggal: laci tahun, guide triwulan, folder bulan; kode `2026.02`.
- KKM 75, target temu kembali 120 detik, ambang akurasi untuk skor waktu 60%, pengurangan kemandirian 10/bantuan dan 15/percobaan ulang.
- Akun siswa dibuat guru (impor CSV `nama,username,password,kelas`).
