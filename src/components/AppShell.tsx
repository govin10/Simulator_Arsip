import Link from "next/link";
import type { SessionUser } from "@/lib/session-token";
import LogoutButton from "./LogoutButton";

export default function AppShell({ user, children, wide }: { user: SessionUser; children: React.ReactNode; wide?: boolean }) {
  const staff = user.role !== "STUDENT";
  const nav = staff
    ? [["/guru", "Rekap nilai"], ["/guru/tugas", "Tugas & koreksi"], ["/guru/kelas", "Kelas & akun"]]
    : [["/siswa", "Tugas saya"]];
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className={`mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 ${wide ? "max-w-[1600px]" : "max-w-6xl"}`}>
          <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-xs text-white" aria-hidden>TA</span>
            Tugas Arsip
          </Link>
          <nav className="flex flex-wrap gap-1">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-md px-2.5 py-1.5 text-sm text-stone-700 hover:bg-stone-100">{label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/akun" className="text-stone-600 hover:underline" title="Ganti kata sandi">{user.name} <span className="badge bg-stone-100 text-stone-600">{user.role === "STUDENT" ? "Siswa" : user.role === "ADMIN" ? "Admin" : "Guru"}</span></Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className={`mx-auto px-4 py-6 ${wide ? "max-w-[1600px]" : "max-w-6xl"}`}>{children}</main>
    </div>
  );
}
