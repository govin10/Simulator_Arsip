"use client";
import { useState } from "react";

export default function LoginPage() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error);
    window.location.href = j.role === "STUDENT" ? "/siswa" : "/guru";
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-brand-900 p-8 text-brand-50 md:flex">
          <div>
            <div className="mb-6 flex gap-1.5" aria-hidden>
              {["PDF", "✓", "90"].map((l) => (
                <div key={l} className="flex h-16 w-14 flex-col items-center justify-center rounded-md border border-kayu-300/40 bg-kayu-700/60 text-sm font-bold text-kayu-100">{l}</div>
              ))}
            </div>
            <h1 className="text-2xl font-bold leading-tight">Pengumpulan Tugas Kearsipan</h1>
            <p className="mt-3 text-sm text-brand-100">Kerjakan soal dari guru di kertas, foto atau pindai menjadi PDF, lalu kumpulkan di sini. Nilai dan catatan guru bisa kamu lihat kapan saja.</p>
          </div>
          <p className="text-xs text-brand-100/80">Kelas XI Manajemen Perkantoran · SMK Negeri 1 Pasuruan</p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-8">
          <h2 className="h1">Masuk</h2>
          <p className="muted">Siswa baru? <a href="/daftar" className="font-medium text-brand-700 underline">Daftar akun di sini</a>.</p>
          <div>
            <label className="label" htmlFor="u">Nama pengguna</label>
            <input id="u" className="input" autoComplete="username" value={username} onChange={(e) => setU(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="p">Kata sandi</label>
            <input id="p" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setP(e.target.value)} required />
          </div>
          {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700" role="alert">{err}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Memeriksa…" : "Masuk"}</button>
        </form>
      </div>
    </main>
  );
}
