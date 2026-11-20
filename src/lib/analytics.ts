import "server-only";
import { db } from "./db";
import { COMPONENTS } from "./domain";
import type { Scores } from "./grading";

export type Filter = { classIds: string[]; sessionId?: string };

export async function loadAttempts(f: Filter) {
  return db.attempt.findMany({
    where: { session: { classroomId: { in: f.classIds }, ...(f.sessionId ? { id: f.sessionId } : {}) } },
    include: { student: { select: { id: true, name: true, username: true } }, session: { include: { package: { select: { kind: true, title: true, kkm: true, system: true } }, classroom: { select: { name: true } } } }, retrievals: true },
    orderBy: [{ startedAt: "asc" }],
  });
}
export type AttemptRow = Awaited<ReturnType<typeof loadAttempts>>[number];

export function componentAverages(rows: AttemptRow[]) {
  const done = rows.filter((r) => r.scores);
  return COMPONENTS.map((c) => {
    const vals = done.map((r) => (r.scores as unknown as Scores).components[c.key]?.score).filter((v): v is number => typeof v === "number");
    return { key: c.key, label: c.label, avg: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null, n: vals.length };
  });
}

export async function topErrors(attemptIds: string[], limit = 10) {
  if (!attemptIds.length) return [];
  const g = await db.errorLog.groupBy({ by: ["code"], where: { attemptId: { in: attemptIds } }, _count: { code: true }, orderBy: { _count: { code: "desc" } }, take: limit });
  const students = await db.errorLog.groupBy({ by: ["code", "attemptId"], where: { attemptId: { in: attemptIds } } });
  return g.map((x) => ({ code: x.code, count: x._count.code, attempts: students.filter((s) => s.code === x.code).length }));
}

/** Perbandingan tes awal vs tes akhir per indikator (percobaan terakhir yang selesai per siswa). */
export function prePost(rows: AttemptRow[]) {
  const pick = (kind: string) => {
    const latest = new Map<string, AttemptRow>();
    for (const r of rows.filter((x) => x.session.package.kind === kind && x.scores)) latest.set(r.studentId, r);
    return [...latest.values()];
  };
  const pre = pick("PRETEST"), post = pick("POSTTEST");
  const avg = (list: AttemptRow[], key: string) => {
    const v = list.map((r) => (r.scores as unknown as Scores).components[key]?.score ?? (key === "total" ? (r.scores as unknown as Scores).total : undefined)).filter((x): x is number => typeof x === "number");
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };
  const totalAvg = (list: AttemptRow[]) => {
    const v = list.map((r) => (r.scores as unknown as Scores).total);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };
  return {
    nPre: pre.length, nPost: post.length,
    rows: [
      ...COMPONENTS.map((c) => ({ key: c.key, label: c.label, pre: avg(pre, c.key), post: avg(post, c.key) })),
      { key: "total", label: "Skor total", pre: totalAvg(pre), post: totalAvg(post) },
    ],
    passPre: pre.filter((r) => (r.scores as unknown as Scores).passed).length,
    passPost: post.filter((r) => (r.scores as unknown as Scores).passed).length,
  };
}

export const anonId = (studentId: string) => {
  let h = 0;
  for (const ch of studentId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `S-${(h % 100000).toString().padStart(5, "0")}`;
};
