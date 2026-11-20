"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { MAX_PDF_BYTES, MAX_PDF_MB, fmtSize } from "@/lib/tugas";

export default function Uploader({ assignmentId, studentId, mode, access, replacing }: { assignmentId: string; studentId: string; mode: "blob" | "local"; access: "public" | "private"; replacing: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState("");

  function pick(f?: File) {
    setErr("");
    if (!f) return setFile(null);
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) { setFile(null); return setErr("File harus berformat PDF."); }
    if (f.size > MAX_PDF_BYTES) { setFile(null); return setErr(`Ukuran file ${fmtSize(f.size)}, maksimal ${MAX_PDF_MB} MB. Kompres dulu PDF-nya.`); }
    setFile(f);
  }

  async function send() {
    if (!file) return;
    setErr(""); setPct(0);
    try {
      if (mode === "blob") {
        const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/(\.pdf)?$/i, ".pdf");
        const blob = await upload(`tugas/${assignmentId}/${studentId}/${safe}`, file, {
          access, handleUploadUrl: "/api/upload", clientPayload: assignmentId, contentType: "application/pdf", multipart: file.size > 5 * 1024 * 1024,
          onUploadProgress: (e) => setPct(Math.round(e.percentage)),
        });
        const r = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentId, url: blob.url, fileName: file.name }) });
        if (!r.ok) throw new Error((await r.json()).error);
      } else {
        await new Promise<void>((resolve, reject) => {
          const fd = new FormData();
          fd.append("assignmentId", assignmentId);
          fd.append("file", file);
          const x = new XMLHttpRequest();
          x.open("POST", "/api/submissions/local");
          x.upload.onprogress = (e) => e.lengthComputable && setPct(Math.round((e.loaded / e.total) * 100));
          x.onload = () => (x.status < 300 ? resolve() : reject(new Error(JSON.parse(x.responseText).error)));
          x.onerror = () => reject(new Error("Koneksi terputus. Coba lagi."));
          x.send(fd);
        });
      }
      setFile(null); setPct(null);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch (e) {
      setPct(null);
      setErr((e as Error).message || "Gagal mengunggah. Coba lagi.");
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-brand-50 p-3">
      <label className="label" htmlFor={`f-${assignmentId}`}>{replacing ? "Unggah ulang (mengganti file lama)" : "Unggah jawaban (PDF)"}</label>
      <input ref={input} id={`f-${assignmentId}`} type="file" accept="application/pdf,.pdf" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        onChange={(e) => pick(e.target.files?.[0])} disabled={pct !== null} />
      {file && <p className="mt-2 text-sm">📄 {file.name} · {fmtSize(file.size)}</p>}
      {pct !== null && (
        <div className="mt-2" aria-live="polite">
          <div className="h-2 w-full rounded-full bg-stone-200"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1 text-xs text-stone-600">Mengunggah… {pct}%</p>
        </div>
      )}
      {err && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700" role="alert">{err}</p>}
      <button className="btn btn-primary mt-3 w-full sm:w-auto" disabled={!file || pct !== null} onClick={send}>{pct !== null ? "Mengunggah…" : "Kumpulkan"}</button>
      <p className="mt-2 text-xs text-stone-500">Maks. {MAX_PDF_MB} MB. Foto kertas jawaban bisa dijadikan PDF dengan aplikasi pemindai di HP (mis. fitur &ldquo;Pindai dokumen&rdquo; di Google Drive).</p>
    </div>
  );
}
