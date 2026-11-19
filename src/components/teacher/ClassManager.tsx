"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Student = { id: string; name: string; username: string };
type Cls = { id: string; name: string; teacherId: string | null; teacher: string; students: Student[] };
type Teacher = { id: string; name: string; username: string; role: string };

export default function ClassManager({ classes, isAdmin, teachers }: { classes: Cls[]; isAdmin: boolean; teachers: Teacher[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [newClass, setNewClass] = useState("");
  const [csv, setCsv] = useState("nama,username,password,kelas\n");
  const [importTo, setImportTo] = useState(classes[0]?.id ?? "");
  const [results, setResults] = useState<{ nama: string; username: string; password: string; kelas: string; status: string }[]>([]);
  const [teacherForm, setTeacherForm] = useState({ name: "", username: "", password: "" });

  async function call(url: string, method: string, body?: object) {
    setMsg("");
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error); return null; }
    router.refresh();
    return j;
  }
  return (
    <div className="mt-5 space-y-5">
      {msg && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">{msg}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <form className="card p-4" onSubmit={async (e) => { e.preventDefault(); if (await call("/api/teacher/classes", "POST", { name: newClass })) setNewClass(""); }}>
          <h2 className="h2">Tambah kelas</h2>
          <div className="mt-2 flex gap-2"><input className="input" placeholder="mis. XI MP 3" value={newClass} onChange={(e) => setNewClass(e.target.value)} /><button className="btn btn-primary">Tambah</button></div>
        </form>
        <div className="card p-4">
          <h2 className="h2">Impor siswa dari CSV</h2>
          <p className="text-xs text-stone-500">Kolom: <code>nama,username,password,kelas</code>. Password boleh kosong (dibuat otomatis). Kelas kosong = kelas terpilih.</p>
          <div className="mt-2 flex gap-2">
            <select className="input" value={importTo} onChange={(e) => setImportTo(e.target.value)} aria-label="Kelas tujuan">{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <label className="btn shrink-0 cursor-pointer">Pilih file<input type="file" accept=".csv,text/csv" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} /></label>
          </div>
          <textarea className="input mt-2 min-h-[100px] font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} aria-label="Isi CSV" />
          <button className="btn btn-primary mt-2" onClick={async () => { const j = await call("/api/teacher/students/import", "POST", { csv, classroomId: importTo }); if (j) setResults(j.results); }}>Impor</button>
        </div>
      </div>
      {results.length > 0 && (
        <div className="card overflow-x-auto p-4">
          <div className="flex items-center justify-between"><h2 className="h2">Hasil impor</h2><button className="btn btn-sm" onClick={() => window.print()}>Cetak daftar akun</button></div>
          <p className="text-xs text-amber-800">Catat kata sandi sekarang: kata sandi tidak dapat dilihat lagi setelah halaman ditutup.</p>
          <table className="table mt-2"><thead><tr><th>Nama</th><th>Username</th><th>Kata sandi</th><th>Kelas</th><th>Status</th></tr></thead>
            <tbody>{results.map((r, i) => <tr key={i}><td>{r.nama}</td><td>{r.username}</td><td className="font-mono">{r.password || "(tidak diubah)"}</td><td>{r.kelas}</td><td>{r.status}</td></tr>)}</tbody></table>
        </div>
      )}
      {classes.map((c) => (
        <details key={c.id} className="card p-4" open={classes.length <= 2}>
          <summary className="cursor-pointer"><span className="h2">{c.name}</span> <span className="muted">· {c.students.length} siswa · guru: {c.teacher}</span></summary>
          {isAdmin && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <label htmlFor={`t-${c.id}`}>Guru pengampu:</label>
              <select id={`t-${c.id}`} className="input max-w-xs" defaultValue={c.teacherId ?? ""} onChange={(e) => call("/api/teacher/classes", "PATCH", { id: c.id, teacherId: e.target.value })}>
                <option value="">—</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <table className="table mt-3">
            <thead><tr><th>Nama</th><th>Username</th><th /></tr></thead>
            <tbody>
              {c.students.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td><td className="font-mono">{s.username}</td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn btn-sm" onClick={async () => { const j = await call(`/api/teacher/users/${s.id}`, "POST"); if (j) setMsg(`Kata sandi baru ${s.username}: ${j.password}`); }}>Reset sandi</button>{" "}
                    <button className="btn btn-sm btn-danger" onClick={() => confirm(`Hapus akun ${s.name} beserta semua hasil praktiknya?`) && call(`/api/teacher/users/${s.id}`, "DELETE")}>Hapus</button>
                  </td>
                </tr>
              ))}
              {!c.students.length && <tr><td colSpan={3} className="text-stone-500">Belum ada siswa.</td></tr>}
            </tbody>
          </table>
        </details>
      ))}
      {isAdmin && (
        <div className="card p-4">
          <h2 className="h2">Akun guru (admin)</h2>
          <ul className="mt-2 text-sm">{teachers.map((t) => <li key={t.id}>{t.name} <span className="font-mono text-stone-500">({t.username})</span> {t.role === "ADMIN" && <span className="badge bg-stone-100">Admin</span>} <button className="ml-2 text-xs text-brand-700 underline" onClick={async () => { const j = await call(`/api/teacher/users/${t.id}`, "POST"); if (j) setMsg(`Kata sandi baru ${t.username}: ${j.password}`); }}>reset sandi</button></li>)}</ul>
          <form className="mt-3 grid gap-2 sm:grid-cols-4" onSubmit={async (e) => { e.preventDefault(); const j = await call("/api/admin/teachers", "POST", teacherForm); if (j) { setMsg(`Akun guru ${j.username} dibuat. Kata sandi: ${j.password}`); setTeacherForm({ name: "", username: "", password: "" }); } }}>
            <input className="input" placeholder="Nama guru" value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} />
            <input className="input" placeholder="Username" value={teacherForm.username} onChange={(e) => setTeacherForm({ ...teacherForm, username: e.target.value })} />
            <input className="input" placeholder="Kata sandi (opsional)" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} />
            <button className="btn btn-primary">Buat akun guru</button>
          </form>
        </div>
      )}
    </div>
  );
}
