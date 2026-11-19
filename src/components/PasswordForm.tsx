"use client";
import { useState } from "react";

export default function PasswordForm() {
  const [f, setF] = useState({ oldPassword: "", newPassword: "", confirm: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.newPassword !== f.confirm) return setMsg({ ok: false, text: "Konfirmasi kata sandi tidak sama." });
    const r = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json();
    setMsg(r.ok ? { ok: true, text: "Kata sandi berhasil diganti." } : { ok: false, text: j.error });
    if (r.ok) setF({ oldPassword: "", newPassword: "", confirm: "" });
  }
  const field = (k: keyof typeof f, label: string, ac: string) => (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      <input id={k} type="password" className="input" autoComplete={ac} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required />
    </div>
  );
  return (
    <form onSubmit={submit} className="card mt-5 max-w-md space-y-3 p-5">
      {field("oldPassword", "Kata sandi lama", "current-password")}
      {field("newPassword", "Kata sandi baru (min. 6 karakter)", "new-password")}
      {field("confirm", "Ulangi kata sandi baru", "new-password")}
      {msg && <p className={`rounded-lg p-2 text-sm ${msg.ok ? "bg-brand-50 text-brand-800" : "bg-red-50 text-red-700"}`} role="status">{msg.text}</p>}
      <button className="btn btn-primary w-full">Simpan kata sandi</button>
    </form>
  );
}
