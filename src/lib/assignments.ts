import "server-only";
import { HttpError } from "./auth";
import { FEATURE_KEYS } from "./tugas";

export type AssignmentInput = { title: string; description?: string; dueAt?: string | null; allowLate?: boolean; maxScore?: number; isOpen?: boolean; features?: string[] };
export function parseAssignment(b: AssignmentInput) {
  const title = String(b.title ?? "").trim();
  if (!title) throw new HttpError(400, "Judul tugas wajib diisi.");
  const dueAt = b.dueAt ? new Date(b.dueAt) : null;
  if (dueAt && isNaN(dueAt.getTime())) throw new HttpError(400, "Tenggat tidak valid.");
  const maxScore = Number(b.maxScore ?? 100);
  if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 1000) throw new HttpError(400, "Nilai maksimal 1–1000.");
  const features = Array.isArray(b.features) ? FEATURE_KEYS.filter((k) => b.features!.includes(k)) : [];
  return { features, title: title.slice(0, 150), description: String(b.description ?? "").slice(0, 3000), dueAt, allowLate: b.allowLate !== false, maxScore, isOpen: b.isOpen !== false };
}

