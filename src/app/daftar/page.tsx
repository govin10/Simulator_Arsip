import { db } from "@/lib/db";
import RegisterForm from "@/components/siswa/RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const classes = await db.classroom.findMany({ orderBy: { name: "asc" }, select: { name: true } });
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="h1">Daftar akun siswa</h1>
        <p className="muted mt-1">Sudah punya akun? <a href="/login" className="font-medium text-brand-700 underline">Masuk</a></p>
        <RegisterForm classes={classes.map((c) => c.name)} />
      </div>
    </main>
  );
}
