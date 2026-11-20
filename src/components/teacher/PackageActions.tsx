"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SYSTEMS } from "@/lib/domain";

export function PackageActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  return (
    <>
      <Link className="btn btn-sm" href={`/guru/paket/${id}`}>Ubah</Link>{" "}
      <button className="btn btn-sm" onClick={async () => { const r = await fetch(`/api/packages/${id}/duplicate`, { method: "POST" }); const j = await r.json(); if (r.ok) router.push(`/guru/paket/${j.id}`); }}>Duplikat</button>{" "}
      <button className="btn btn-sm btn-danger" onClick={async () => {
        if (!confirm(`Hapus paket "${title}"?`)) return;
        const r = await fetch(`/api/packages/${id}`, { method: "DELETE" });
        if (!r.ok) alert((await r.json()).error);
        router.refresh();
      }}>Hapus</button>
    </>
  );
}

export function NewPackage() {
  const router = useRouter();
  const [system, setSystem] = useState("ABJAD");
  const [title, setTitle] = useState("");
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={async (e) => {
      e.preventDefault();
      const r = await fetch("/api/packages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, title }) });
      const j = await r.json();
      if (r.ok) router.push(`/guru/paket/${j.id}`);
    }}>
      <div><label className="label" htmlFor="nt">Judul paket baru</label><input id="nt" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Latihan abjad 2" /></div>
      <div><label className="label" htmlFor="ns">Sistem</label><select id="ns" className="input" value={system} onChange={(e) => setSystem(e.target.value)}>{SYSTEMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
      <button className="btn btn-primary">+ Buat dari templat</button>
    </form>
  );
}
