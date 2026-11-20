import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Menu tahap (Klasifikasi, Lemari, Temu kembali, ...) membuka praktik yang sedang berjalan.
export default async function Continue({ searchParams }: { searchParams: Promise<{ tahap?: string }> }) {
  const user = await requireUser(["STUDENT"]);
  const { tahap } = await searchParams;
  const running = await db.attempt.findFirst({ where: { studentId: user.id, status: "IN_PROGRESS" }, orderBy: { startedAt: "desc" } });
  if (running) redirect(`/siswa/percobaan/${running.id}`);
  redirect(`/siswa/praktik?mulai=${encodeURIComponent(tahap ?? "")}`);
}
