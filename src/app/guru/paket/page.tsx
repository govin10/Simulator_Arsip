import Link from "next/link";
import AppShell from "@/components/AppShell";
import { NewPackage, PackageActions } from "@/components/teacher/PackageActions";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { kindLabel, systemLabel } from "@/lib/domain";

export default async function PackagesPage() {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const pkgs = await db.package.findMany({ include: { _count: { select: { documents: true, retrievalTasks: true, sessions: true } }, createdBy: { select: { name: true } } }, orderBy: { createdAt: "asc" } });
  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">Bank paket dokumen</h1>
          <p className="muted">Setiap paket berisi 8–20 dokumen fiktif, kunci jawaban tersembunyi, struktur lemari, dan permintaan temu kembali.</p>
        </div>
        <NewPackage />
      </div>
      <div className="card mt-5 overflow-x-auto">
        <table className="table">
          <thead><tr><th>Paket</th><th>Jenis</th><th>Sistem</th><th className="text-right">Dokumen</th><th className="text-right">Temu kembali</th><th className="text-right">Dipakai</th><th /></tr></thead>
          <tbody>
            {pkgs.map((p) => (
              <tr key={p.id}>
                <td><Link className="font-medium text-brand-700 underline" href={`/guru/paket/${p.id}`}>{p.title}</Link><p className="text-xs text-stone-500">{p.description}</p></td>
                <td>{kindLabel(p.kind)}</td><td>{systemLabel(p.system)}</td>
                <td className={`text-right ${p._count.documents < 8 || p._count.documents > 20 ? "text-amber-700" : ""}`}>{p._count.documents}</td>
                <td className="text-right">{p._count.retrievalTasks}</td>
                <td className="text-right">{p._count.sessions} sesi</td>
                <td className="whitespace-nowrap text-right"><PackageActions id={p.id} title={p.title} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
