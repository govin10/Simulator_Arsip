"use client";
import Icon from "./Icon";
export default function LogoutButton() {
  return (
    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-50/90 hover:bg-white/10 hover:text-white"
      onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}>
      <Icon name="logout" className="h-[18px] w-[18px]" />Keluar
    </button>
  );
}
