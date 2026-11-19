import { fmtDate } from "@/lib/domain";

export type PublicDocument = {
  id: string; number: string; date: string | Date; sender: string; senderCity: string; recipient: string; recipientCity: string;
  subject: string; nature: string; summary: string; attachment: string; layout: string;
};

/** Tampilan dokumen menyerupai surat. Jenis dokumen tidak ditulis: siswa harus mengidentifikasi sendiri. */
export default function DocumentPaper({ doc, homeOrg }: { doc: PublicDocument; homeOrg: string }) {
  const isKw = doc.layout === "KUITANSI";
  const isLap = doc.layout === "LAPORAN";
  const isMemo = doc.layout === "MEMO";
  const fromHome = doc.sender === homeOrg;
  const heading = isKw ? "KUITANSI" : isLap ? "LAPORAN" : isMemo ? "MEMO INTERNAL" : null;
  const headerOrg = isMemo || isLap ? homeOrg : isKw ? doc.sender : fromHome ? homeOrg : doc.sender;
  return (
    <article className="relative mx-auto max-w-2xl rounded-sm border border-stone-300 bg-[#fffdf7] p-6 font-serif text-[15px] leading-relaxed text-stone-800 shadow-[0_2px_10px_rgba(0,0,0,0.08)] sm:p-8" aria-label={`Dokumen ${doc.number}`}>
      <header className="border-b-2 border-double border-stone-400 pb-3 text-center">
        <p className="text-lg font-bold uppercase tracking-wide">{headerOrg.replace(/\s*\(.*\)$/, "")}</p>
        <p className="text-xs text-stone-500">{(headerOrg === homeOrg ? "Pasuruan" : doc.senderCity) || "—"}</p>
      </header>
      {heading && <p className="mt-4 text-center font-bold tracking-widest">{heading}</p>}
      <div className="mt-4 grid grid-cols-[110px_1fr] gap-x-2 gap-y-0.5 text-sm">
        <span>Nomor</span><span>: {doc.number}</span>
        {!isKw && <><span>Sifat</span><span>: {doc.nature || <em className="text-stone-400">(tidak dicantumkan)</em>}</span></>}
        {doc.attachment && <><span>Lampiran</span><span>: {doc.attachment}</span></>}
        <span>{isKw ? "Untuk" : "Perihal"}</span><span>: <strong>{doc.subject}</strong></span>
        <span>Tanggal</span><span>: {doc.senderCity ? `${doc.senderCity}, ` : ""}{fmtDate(doc.date)}</span>
      </div>
      <div className="mt-4 text-sm">
        {isKw ? (
          <>
            <p>Telah terima dari: <strong>{doc.recipient}</strong></p>
          </>
        ) : (
          <>
            <p>Kepada Yth.</p>
            <p className="font-semibold">{doc.recipient}</p>
            {doc.recipientCity && <p>di {doc.recipientCity}</p>}
          </>
        )}
      </div>
      <p className="mt-4 text-sm">{doc.summary}</p>
      <footer className="mt-6 text-right text-sm">
        <p>{isKw ? "Penerima," : "Hormat kami,"}</p>
        <p className="mt-8 font-semibold">{doc.sender}</p>
      </footer>
    </article>
  );
}
