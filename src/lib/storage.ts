import "server-only";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { del, get, issueSignedToken, presignUrl } from "@vercel/blob";

/**
 * Token Vercel Blob. Biasanya bernama BLOB_READ_WRITE_TOKEN, tetapi bila saat menghubungkan Blob
 * prefix-nya diganti (mis. FILES_READ_WRITE_TOKEN), token tetap dikenali dari isinya (vercel_blob_rw_...).
 */
export function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const env = Object.entries(process.env);
  return (
    env.find(([, v]) => v?.startsWith("vercel_blob_rw_"))?.[1] ??
    env.find(([k, v]) => /BLOB/i.test(k) && /READ_WRITE_TOKEN$/i.test(k) && !!v)?.[1]
  );
}

/** Untuk kotak diagnostik guru: hanya NAMA variabel, tidak pernah isinya. */
export function storageDiagnostics() {
  const names = Object.keys(process.env).filter((k) => /BLOB|READ_WRITE|STORAGE/i.test(k)).sort();
  return {
    mode: storageMode(),
    vercelEnv: process.env.VERCEL_ENV ?? "(bukan di Vercel)",
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || "-",
    names,
  };
}

/** Jenis akses store Blob. Store baru Vercel bertipe private; set BLOB_ACCESS=public untuk store public. */
export const blobAccess = (): "public" | "private" => (process.env.BLOB_ACCESS === "public" ? "public" : "private");

/**
 * Respons untuk membuka PDF di Blob.
 * - Public: langsung dialihkan ke URL file.
 * - Private: dialihkan ke URL bertanda tangan yang berlaku 10 menit; bila gagal, file dialirkan lewat server.
 */
export async function blobFileResponse(url: string, fileName: string) {
  const u = new URL(url);
  if (!u.hostname.includes(".private.")) return Response.redirect(url, 302);
  const pathname = decodeURIComponent(u.pathname.replace(/^\//, ""));
  const token = blobToken();
  try {
    const signed = await issueSignedToken({ pathname, operations: ["get"], validUntil: Date.now() + 10 * 60 * 1000, token });
    const { presignedUrl } = await presignUrl(signed, { operation: "get", pathname, access: "private" });
    return new Response(null, { status: 302, headers: { Location: presignedUrl, "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.warn("Presign gagal, file dialirkan lewat server:", (e as Error).message);
    const r = await get(url, { access: "private", token });
    if (!r || r.statusCode !== 200) return Response.json({ error: "File tidak ditemukan di penyimpanan." }, { status: 404 });
    return new Response(r.stream, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`, "Cache-Control": "private, no-store" },
    });
  }
}

/** "blob" bila token Vercel Blob tersedia; "local" untuk percobaan di komputer sendiri. */
export const storageMode = (): "blob" | "local" => (blobToken() ? "blob" : "local");

const LOCAL_DIR = path.join(process.cwd(), ".uploads");
export const blobPrefix = (assignmentId: string, studentId: string) => `tugas/${assignmentId}/${studentId}/`;

export function isOurBlobUrl(url: string, assignmentId: string, studentId: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com") && decodeURIComponent(u.pathname).startsWith("/" + blobPrefix(assignmentId, studentId));
  } catch {
    return false;
  }
}

export async function saveLocal(assignmentId: string, studentId: string, data: Buffer) {
  if (process.env.VERCEL) throw new Error("Penyimpanan file belum diatur: token read-write Vercel Blob tidak ditemukan. Guru/admin: lihat petunjuk di halaman Kelas & akun.");
  const key = `local:${assignmentId}/${studentId}-${Date.now()}.pdf`;
  const file = path.join(LOCAL_DIR, key.slice(6));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
  return key;
}
export async function readLocal(key: string) {
  const rel = key.slice(6);
  const file = path.join(LOCAL_DIR, rel);
  if (!file.startsWith(LOCAL_DIR + path.sep)) throw new Error("Path tidak valid.");
  return readFile(file);
}
export async function deleteFile(key: string) {
  try {
    if (key.startsWith("local:")) await unlink(path.join(LOCAL_DIR, key.slice(6)));
    else if (key.startsWith("https://")) await del(key, { token: blobToken() });
  } catch (e) {
    console.warn("Gagal menghapus file lama:", (e as Error).message);
  }
}
