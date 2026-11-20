"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, match, children }: { href: string; match?: string; children: React.ReactNode }) {
  const path = usePathname();
  const base = href.split("?")[0];
  const active = match ? path.startsWith(match) : path === base && !href.includes("?");
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-white font-semibold text-brand-800 shadow" : "text-brand-50/90 hover:bg-white/10 hover:text-white"}`}>
      {children}
    </Link>
  );
}
