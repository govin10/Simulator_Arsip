// Helper yang aman dipakai di browser maupun server.

export const MAX_PDF_MB = 20;
export const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

export const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Menunggu dinilai",
  REVISION: "Perlu revisi",
  GRADED: "Sudah dinilai",
};

/** Tanggal & jam dalam WIB, mis. "Kamis, 20 November 2026 14.30 WIB". */
export function fmtWib(d: Date | string | null | undefined, withDay = true) {
  if (!d) return "-";
  const x = typeof d === "string" ? new Date(d) : d;
  const s = x.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta", ...(withDay ? { weekday: "long" } : {}), day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return `${s} WIB`;
}
export const fmtSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Nama kelas dirapikan agar "xi mp 1", "XI  MP1 " tidak menjadi kelas ganda. */
export function normalizeClassName(s: string) {
  return s.trim().replace(/\s+/g, " ").toUpperCase().replace(/^(X|XI|XII)\s*([A-Z]+)\s*(\d+)$/, "$1 $2 $3");
}

export type AssignmentRule = { isOpen: boolean; dueAt: Date | string | null; allowLate: boolean };
export type SubmissionLike = { status: string; submittedAt: Date | string } | null | undefined;

/** Boleh mengunggah? Mengembalikan alasan bila tidak. */
export function canSubmit(a: AssignmentRule, sub: SubmissionLike, now = new Date()): { ok: boolean; reason?: string } {
  if (sub?.status === "GRADED") return { ok: false, reason: "Tugas sudah dinilai guru." };
  if (sub?.status === "REVISION") return { ok: true };
  if (!a.isOpen) return { ok: false, reason: "Pengumpulan sudah ditutup guru." };
  if (a.dueAt && now > new Date(a.dueAt) && !a.allowLate) return { ok: false, reason: "Tenggat sudah lewat." };
  return { ok: true };
}
export const isLate = (a: { dueAt: Date | string | null }, submittedAt: Date | string) => !!a.dueAt && new Date(submittedAt) > new Date(a.dueAt);
