import "server-only";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { del } from "@vercel/blob";

/**
 * Token Vercel Blob. Biasanya bernama BLOB_READ_WRITE_TOKEN, tetapi bila saat menghubungkan Blob
 * prefix-nya diganti (mis. FILES_READ_WRITE_TOKEN), token tetap dikenali dari isinya (vercel_blob_rw_...).
 */
export function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [k, v] of Object.entries(process.env)) if (k.endsWith("READ_WRITE_TOKEN") && v?.startsWith("vercel_blob_rw_")) return v;
  return undefined;
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
  if (process.env.VERCEL) throw new Error("Penyimpanan file belum diatur: token Vercel Blob tidak ditemukan. Guru/admin: hubungkan Blob di tab Storage Vercel (centang Production), lalu Redeploy.");
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
