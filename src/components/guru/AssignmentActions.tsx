"use client";
import { useRouter } from "next/navigation";

export default function AssignmentActions({ id, title, isOpen, submitted, afterDelete }: { id: string; title: string; isOpen: boolean; submitted: number; afterDelete?: string }) {
  const router = useRouter();
  async function call(method: string, body?: object) {
    const r = await fetch(`/api/teacher/assignments/${id}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) return alert((await r.json()).error);
    if (method === "DELETE" && afterDelete) router.push(afterDelete); else router.refresh();
  }
  return (
    <>
      <button className="btn btn-sm" onClick={() => call("PATCH", { isOpen: !isOpen })}>{isOpen ? "Tutup pengumpulan" : "Buka pengumpulan"}</button>{" "}
      <button className="btn btn-sm btn-danger" onClick={() => confirm(`Hapus tugas "${title}"${submitted ? ` beserta ${submitted} file jawaban siswa dan nilainya` : ""}? Tidak bisa dibatalkan.`) && call("DELETE")}>Hapus</button>
    </>
  );
}
