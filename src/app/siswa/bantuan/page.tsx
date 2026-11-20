import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { FEATURES } from "@/lib/tugas";

export default async function Help() {
  const user = await requireUser(["STUDENT"]);
  return (
    <AppShell user={user}>
      <h1 className="h1">Bantuan</h1>
      <p className="muted">Cara memakai Arsipku.</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="h2">Praktik paket dokumen</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>Buka <strong>Paket Dokumen</strong>, pilih sesi dari guru, lalu klik <em>Mulai kerjakan</em>.</li>
            <li>Kerjakan tahap demi tahap. Umpan balik muncul setelah setiap tahap dikirim.</li>
            <li>Lihat skor dan saran di halaman hasil, atau di menu <strong>Hasil & Nilai</strong>.</li>
          </ol>
          <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">Aturan tiap sistem penyimpanan (abjad, nomor, subjek, wilayah, tanggal) bisa dibuka lewat tombol <strong>💡 Petunjuk</strong> di dalam praktik. Membuka petunjuk dihitung sebagai bantuan dan sedikit mengurangi skor kemandirian.</p>
        </section>
        <section className="card p-5">
          <h2 className="h2">Tugas PDF (soal kertas)</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>Kerjakan soal pada kertas acak dari guru. Tulis nama, kelas, dan fitur.</li>
            <li>Pindai menjadi satu PDF (misalnya dengan &ldquo;Pindai dokumen&rdquo; di Google Drive), maksimal 20 MB.</li>
            <li>Buka <strong>Tugas PDF</strong>, pilih fitur sesuai kertasmu, unggah, lalu klik <em>Kumpulkan</em>.</li>
          </ol>
          <p className="mt-3 text-sm font-semibold">Daftar fitur</p>
          <ol className="list-decimal pl-5 text-sm text-stone-600">{FEATURES.map((f) => <li key={f.key}>{f.label}</li>)}</ol>
        </section>
      </div>
    </AppShell>
  );
}
