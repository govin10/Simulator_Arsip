"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { kindLabel, systemLabel } from "@/lib/domain";

type Pkg = { id: string; title: string; kind: string; system: string };
export default function SessionManager({ classes, packages, sessions }: {
  classes: { id: string; name: string }[]; packages: Pkg[];
  sessions: { id: string; title: string; active: boolean; className: string; classroomId: string; pkg: Omit<Pkg, "id">; attempts: number; createdAt: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({ classroomId: classes[0]?.id ?? "", packageId: packages[0]?.id ?? "", title: "", active: true });
  const [err, setErr] = useState("");
  async function req(url: string, method: string, body?: object) {
    setErr("");
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) setErr((await r.json()).error);
    router.refresh();
  }
  return (
    <>
      <form className="card mt-5 grid gap-3 p-4 md:grid-cols-[1fr_1.5fr_1.5fr_auto_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); req("/api/teacher/sessions", "POST", form); }}>
        <div><label className="label" htmlFor="c">Kelas</label><select id="c" className="input" value={form.classroomId} onChange={(e) => setForm({ ...form, classroomId: e.target.value })}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="p">Paket</label><select id="p" className="input" value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })}>{packages.map((p) => <option key={p.id} value={p.id}>{p.title} ({kindLabel(p.kind)})</option>)}</select></div>
        <div><label className="label" htmlFor="t">Judul sesi</label><input id="t" className="input" placeholder="mis. Latihan 2 – Sistem subjek" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Langsung aktif</label>
        <button className="btn btn-primary">Buat sesi</button>
      </form>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      <div className="card mt-4 overflow-x-auto">
        <table className="table">
          <thead><tr><th>Sesi</th><th>Kelas</th><th>Paket</th><th>Percobaan</th><th>Status</th><th /></tr></thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.title}</td>
                <td>{s.className}</td>
                <td>{s.pkg.title} <span className="badge bg-stone-100 text-stone-600">{kindLabel(s.pkg.kind)} · {systemLabel(s.pkg.system)}</span></td>
                <td>{s.attempts}</td>
                <td>{s.active ? <span className="badge bg-brand-100 text-brand-800">Aktif</span> : <span className="badge bg-stone-200 text-stone-600">Nonaktif</span>}</td>
                <td className="whitespace-nowrap text-right">
                  <Link className="btn btn-sm" href={`/guru?kelas=${s.classroomId}&sesi=${s.id}`}>Pantau</Link>{" "}
                  <button className="btn btn-sm" onClick={() => req(`/api/teacher/sessions/${s.id}`, "PATCH", { active: !s.active })}>{s.active ? "Nonaktifkan" : "Aktifkan"}</button>{" "}
                  <button className="btn btn-sm btn-danger" onClick={() => confirm(`Hapus sesi "${s.title}" beserta ${s.attempts} percobaan siswa?`) && req(`/api/teacher/sessions/${s.id}`, "DELETE")}>Hapus</button>
                </td>
              </tr>
            ))}
            {!sessions.length && <tr><td colSpan={6} className="text-stone-500">Belum ada sesi.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
