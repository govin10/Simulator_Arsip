import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Simulator Arsip Digital",
  description: "Simulator klasifikasi, penyimpanan, dan temu kembali arsip untuk siswa XI Manajemen Perkantoran.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={font.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
