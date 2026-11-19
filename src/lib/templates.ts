import type { Cabinet, FilingSystem } from "./domain";

// Templat lemari arsip per sistem (dipakai data contoh dan saat guru membuat paket baru)
const letters = (s: string) => s.split("");
export function abjadCabinet(): Cabinet {
  const groups = [
    { d: "Laci 1 (A–I)", g: ["ABC", "DEF", "GHI"] },
    { d: "Laci 2 (J–R)", g: ["JKL", "MNO", "PQR"] },
    { d: "Laci 3 (S–Z)", g: ["STU", "VWX", "YZ"] },
  ];
  return {
    drawers: groups.map((x, i) => ({
      id: `d${i + 1}`, label: x.d,
      guides: x.g.map((g) => ({
        id: `g-${g}`, label: `Guide ${g[0]}–${g[g.length - 1]}`,
        folders: letters(g).map((l) => ({ id: `f-${l}`, label: `Folder ${l}`, code: l })),
      })),
    })),
  };
}
export const CLASS_GROUPS = [
  { drawer: "Laci 1", main: [
    { n: "000", s: "UM", label: "Umum", subs: ["Undangan", "Rapat & Acara", "Hubungan Masyarakat"] },
    { n: "100", s: "KU", label: "Keuangan", subs: ["Anggaran", "Pembayaran", "Laporan Keuangan"] } ] },
  { drawer: "Laci 2", main: [
    { n: "200", s: "KP", label: "Kepegawaian", subs: ["Penerimaan Pegawai", "Cuti & Izin", "Pelatihan"] },
    { n: "300", s: "PL", label: "Perlengkapan", subs: ["Pengadaan", "Inventaris", "Pemeliharaan"] } ] },
  { drawer: "Laci 3", main: [
    { n: "400", s: "PM", label: "Pemasaran", subs: ["Pesanan & Penjualan", "Promosi", "Layanan Pelanggan"] } ] },
];
export function nomorCabinet(): Cabinet {
  return {
    drawers: CLASS_GROUPS.map((d, i) => ({
      id: `d${i + 1}`, label: `${d.drawer} (${d.main.map((m) => m.n).join("–")})`,
      guides: d.main.map((m) => ({
        id: `g-${m.n}`, label: `${m.n} ${m.label}`,
        folders: m.subs.map((s, k) => { const code = String(Number(m.n) + (k + 1) * 10).padStart(3, "0"); return { id: `f-${code}`, label: `${code} ${s}`, code }; }),
      })),
    })),
  };
}
export function subjekCabinet(): Cabinet {
  return {
    drawers: CLASS_GROUPS.map((d, i) => ({
      id: `d${i + 1}`, label: `${d.drawer} (${d.main.map((m) => m.label).join(", ")})`,
      guides: d.main.map((m) => ({
        id: `g-${m.s}`, label: `${m.s} ${m.label}`,
        folders: m.subs.map((s, k) => ({ id: `f-${m.s}${k + 1}`, label: `${m.s}.${k + 1} ${s}`, code: `${m.s}.${k + 1}` })),
      })),
    })),
  };
}
export const CITIES = [
  { drawer: "Laci 1 (Jawa Timur)", cities: [["SBY", "Surabaya"], ["MLG", "Malang"], ["PSR", "Pasuruan"], ["SDA", "Sidoarjo"]] },
  { drawer: "Laci 2 (Jawa Tengah & DIY)", cities: [["SMG", "Semarang"], ["YGY", "Yogyakarta"]] },
  { drawer: "Laci 3 (DKI Jakarta & Jawa Barat)", cities: [["JKT", "Jakarta"], ["BDG", "Bandung"]] },
];
export function wilayahCabinet(): Cabinet {
  return {
    drawers: CITIES.map((d, i) => ({
      id: `d${i + 1}`, label: d.drawer,
      guides: d.cities.map(([c, name]) => ({
        id: `g-${c}`, label: `Guide ${name}`,
        folders: [
          { id: `f-${c}1`, label: `${name} A–L`, code: `${c}.1` },
          { id: `f-${c}2`, label: `${name} M–Z`, code: `${c}.2` },
        ],
      })),
    })),
  };
}
export const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export function tanggalCabinet(year = 2026): Cabinet {
  return {
    drawers: [{
      id: "d1", label: `Laci ${year}`,
      guides: ["I", "II", "III", "IV"].map((tw, q) => ({
        id: `g-TW${q + 1}`, label: `Triwulan ${tw}`,
        folders: [0, 1, 2].map((k) => { const m = q * 3 + k + 1; const mm = String(m).padStart(2, "0"); return { id: `f-${year}${mm}`, label: `${MONTHS[m - 1]} ${year}`, code: `${year}.${mm}` }; }),
      })),
    }],
  };
}


export function defaultCabinet(system: FilingSystem): Cabinet {
  switch (system) {
    case "ABJAD": return abjadCabinet();
    case "NOMOR": return nomorCabinet();
    case "SUBJEK": return subjekCabinet();
    case "WILAYAH": return wilayahCabinet();
    case "TANGGAL": return tanggalCabinet();
  }
}
