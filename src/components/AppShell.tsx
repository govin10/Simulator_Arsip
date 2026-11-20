import Link from "next/link";
import type { SessionUser } from "@/lib/session-token";
import Icon, { type IconName } from "./Icon";
import LogoutButton from "./LogoutButton";
import NavLink from "./NavLink";

type Item = { href: string; label: string; icon: IconName; match?: string };
const STUDENT: Item[] = [
  { href: "/siswa", label: "Beranda", icon: "home" },
  { href: "/siswa/praktik", label: "Paket Dokumen", icon: "doc", match: "/siswa/praktik" },
  { href: "/siswa/lanjut?tahap=PROCESS", label: "Klasifikasi & Indeks", icon: "tag" },
  { href: "/siswa/lanjut?tahap=STORE", label: "Lemari Arsip", icon: "cabinet" },
  { href: "/siswa/lanjut?tahap=PROCESS", label: "Metadata Arsip", icon: "card" },
  { href: "/siswa/lanjut?tahap=RETRIEVE", label: "Temu Kembali", icon: "search" },
  { href: "/siswa/lanjut?tahap=SCENARIO", label: "Skenario Kesalahan", icon: "alert" },
  { href: "/siswa/tugas", label: "Tugas PDF", icon: "upload", match: "/siswa/tugas" },
  { href: "/siswa/hasil", label: "Hasil & Nilai", icon: "chart", match: "/siswa/hasil" },
  { href: "/siswa/bantuan", label: "Bantuan", icon: "help", match: "/siswa/bantuan" },
];
const STAFF: Item[] = [
  { href: "/guru", label: "Beranda", icon: "home" },
  { href: "/guru/kelas", label: "Siswa & Kelas", icon: "users", match: "/guru/kelas" },
  { href: "/guru/paket", label: "Paket Dokumen", icon: "box", match: "/guru/paket" },
  { href: "/guru/sesi", label: "Sesi Praktik", icon: "calendar", match: "/guru/sesi" },
  { href: "/guru/analitik", label: "Hasil Praktik", icon: "chart", match: "/guru/analitik" },
  { href: "/guru/tugas", label: "Tugas PDF", icon: "upload", match: "/guru/tugas" },
  { href: "/guru/rekap", label: "Rekap Nilai PDF", icon: "layers", match: "/guru/rekap" },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2 text-lg font-bold text-white">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 ring-1 ring-white/25"><Icon name="cabinet" className="h-4 w-4" /></span>
      Arsipku
    </Link>
  );
}
function Nav({ items }: { items: Item[] }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Menu utama">
      {items.map((it) => (
        <NavLink key={it.label} href={it.href} match={it.match}>
          <Icon name={it.icon} className="h-[18px] w-[18px] shrink-0" />{it.label}
        </NavLink>
      ))}
      <NavLink href="/akun" match="/akun"><Icon name="key" className="h-[18px] w-[18px] shrink-0" />Ganti Sandi</NavLink>
    </nav>
  );
}

export default function AppShell({ user, children, wide }: { user: SessionUser; children: React.ReactNode; wide?: boolean }) {
  const items = user.role === "STUDENT" ? STUDENT : STAFF;
  const role = user.role === "STUDENT" ? "Siswa" : user.role === "ADMIN" ? "Admin" : "Guru";
  const initials = user.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="min-h-screen lg:flex">
      {/* Menu samping (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col bg-gradient-to-b from-brand-800 to-brand-900 p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Brand />
        <div className="mt-6 flex-1 overflow-y-auto"><Nav items={items} /></div>
        <LogoutButton />
      </aside>
      {/* Menu atas (HP/tablet) */}
      <details className="group sticky top-0 z-40 bg-brand-800 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between p-3 [&::-webkit-details-marker]:hidden">
          <Brand />
          <span className="grid h-9 w-9 place-items-center rounded-lg text-white ring-1 ring-white/25" aria-label="Buka menu"><Icon name="menu" /></span>
        </summary>
        <div className="max-h-[75vh] overflow-y-auto border-t border-white/10 p-3"><Nav items={items} /><div className="mt-2"><LogoutButton /></div></div>
      </details>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-end gap-3 px-4 pt-4 sm:px-6">
          <Link href="/akun" className="flex items-center gap-2.5 rounded-full bg-white py-1 pl-1 pr-3 shadow-sm ring-1 ring-brand-100 hover:ring-brand-200" title="Akun">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">{initials}</span>
            <span className="text-left leading-tight"><span className="block text-sm font-semibold text-stone-800">{user.name}</span><span className="block text-xs text-stone-500">{role}</span></span>
          </Link>
        </header>
        <main className={`mx-auto px-4 pb-10 pt-2 sm:px-6 ${wide ? "max-w-[1600px]" : "max-w-6xl"}`}>{children}</main>
      </div>
    </div>
  );
}
