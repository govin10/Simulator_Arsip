"use client";
import { useState } from "react";
import { normalizeClassName } from "@/lib/tugas";

export default function RegisterForm({ classes }: { classes: string[] }) {
  const [f, setF] = useState({ name: "", username: "", password: "", confirm: "", className: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const norm = normalizeClassName(f.className);
  const isNew = norm.length > 1 && !classes.includes(norm);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (f.password !== f.confirm) return setErr("Konfirmasi kata sandi tidak sama.");
    setBusy(true);
    const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json();
    if (!r.ok) { setErr(j.error); setBusy(false); return; }
    window.location.href = "/siswa";
  }
  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <div><label className="label" htmlFor="name">Nama lengkap</label><input id="name" className="input" autoComplete="name" value={f.name} onChange={set("name")} required /></div>
      <div>
        <label className="label" htmlFor="kelas">Kelas</label>
        <input id="kelas" className="input" list="daftar-kelas" placeholder="mis. XI MP 1" value={f.className} onChange={set("className")} required autoComplete="off" />
        <datalist id="daftar-kelas">{classes.map((c) => <option key={c} value={c} />)}</datalist>
        {norm && <p className={`mt-1 text-xs ${isNew ? "text-amber-700" : "text-stone-500"}`}>{isNew ? `Kelas "${norm}" belum ada dan akan dibuat. Pastikan penulisannya sama dengan teman sekelasmu.` : `Masuk ke kelas ${norm}.`}</p>}
      </div>
      <div>
        <label className="label" htmlFor="username">Username</label>
        <input id="username" className="input" autoComplete="username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") })} required />
        <p className="mt-1 text-xs text-stone-500">Huruf kecil/angka tanpa spasi, mis. ayu.pratiwi</p>
      </div>
      <div><label className="label" htmlFor="pw">Kata sandi (min. 6 karakter)</label><input id="pw" type="password" className="input" autoComplete="new-password" value={f.password} onChange={set("password")} required /></div>
      <div><label className="label" htmlFor="pw2">Ulangi kata sandi</label><input id="pw2" type="password" className="input" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} required /></div>
      {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700" role="alert">{err}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Mendaftarkan…" : "Daftar"}</button>
    </form>
  );
}
