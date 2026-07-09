"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TiketPage() {
  const router = useRouter();

  const [tickets, setTickets] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('peserta_ticket');
    if (!stored) {
      router.push('/daftar');
      return;
    }

    const loadTicket = async () => {
      try {
        const ticketData = JSON.parse(stored);
        const res = await fetch(`http://localhost:5001/my-ticket/${encodeURIComponent(ticketData.email)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memuat data tiket.');
        const ticketList = Array.isArray(data) ? data : [data];
        setTickets(ticketList);
        if (ticketList.length > 0) {
          const storedEventId = ticketData.event_id;
          const matchedIdx = ticketList.findIndex(t => t.event_id === storedEventId);
          setSelectedIdx(matchedIdx !== -1 ? matchedIdx : 0);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadTicket();
  }, [router]);

  const handleLogoutPeserta = () => {
    localStorage.removeItem('peserta_ticket');
    router.push('/daftar');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-50 min-h-screen text-slate-500">
        <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-xs font-semibold">Memuat tiket Anda...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-50 min-h-screen">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-sm font-bold text-red-700 mb-4">{error}</p>
        <button onClick={handleLogoutPeserta} className="px-5 py-2 bg-blue-600 text-white rounded-full font-bold text-xs cursor-pointer shadow-sm hover:bg-blue-700">
          Daftar Kembali
        </button>
      </div>
    );
  }

  const activeTicket = tickets[selectedIdx];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
      <nav className="px-6 py-4 flex items-center justify-between max-w-4xl mx-auto w-full bg-transparent">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1a73e8] flex items-center justify-center text-white font-bold text-sm shadow-sm">E</div>
          <span className="text-base font-semibold text-slate-900 tracking-tight">Evendance</span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="text-xs font-semibold text-slate-600 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Cetak Tiket
          </button>
          <button onClick={handleLogoutPeserta} className="text-xs font-semibold text-red-600 px-3 py-2 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition-all cursor-pointer shadow-sm">
            Keluar Sesi
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
        {tickets.length > 1 && (
          <div className="w-full max-w-sm bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label htmlFor="ticketSelect" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Pilih Tiket ({tickets.length} event terdaftar)
            </label>
            <select
              id="ticketSelect"
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none cursor-pointer"
            >
              {tickets.map((t, idx) => (
                <option key={t.id} value={idx}>{t.event_title || `Tiket #${idx + 1}`}</option>
              ))}
            </select>
          </div>
        )}

        {activeTicket ? (
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">
            <div className="bg-[#1a73e8] px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-85">E-Tiket Digital Resmi</div>
                  <h2 className="text-lg font-bold tracking-tight mt-0.5">EVENDANCE</h2>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">E</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nama Event</span>
              <div className="font-bold text-slate-900 text-sm mt-0.5 leading-snug">{activeTicket.event_title || 'Evendance Conference'}</div>
            </div>

            <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100">
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pemilik Tiket</span>
                <div className="font-bold text-slate-900 text-sm truncate mt-0.5">{activeTicket.name}</div>
                <div className="text-xs text-slate-500 truncate">{activeTicket.email}</div>
              </div>
              {activeTicket.is_attended ? (
                <span className="px-2 py-0.5 rounded bg-green-50 border border-green-200 text-[8px] font-bold text-green-700 shrink-0">HADIR</span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[8px] font-bold text-slate-600 shrink-0">BELUM HADIR</span>
              )}
            </div>

            <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-slate-100 text-xs">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kode Tiket</span>
                <div className="font-mono font-bold text-blue-600 mt-0.5">{activeTicket.ticket_code}</div>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kategori</span>
                <div className="mt-0.5">
                  <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${activeTicket.ticket_type === 'VIP' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                    {activeTicket.ticket_type}
                  </span>
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lokasi</span>
                <div className="font-semibold text-slate-600 mt-0.5">{activeTicket.event_location || '-'}</div>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Waktu Mulai</span>
                <div className="font-semibold text-slate-600 mt-0.5">
                  {activeTicket.event_date
                    ? new Date(activeTicket.event_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB'
                    : '-'}
                </div>
              </div>
            </div>

            <div className="px-6 py-6 flex flex-col items-center gap-4">
              <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`http://localhost:5001/api/qr/${encodeURIComponent(activeTicket.ticket_code || '')}`}
                  alt="QR Code Tiket"
                  className="w-40 h-40 object-contain"
                />
              </div>
              <p className="text-[9px] text-slate-400 font-medium text-center max-w-[240px] leading-relaxed">
                Tunjukkan QR Code ini kepada panitia untuk verifikasi kehadiran di pintu masuk.
              </p>
            </div>

            <div className="bg-slate-50 px-6 py-3 text-center border-t border-slate-100">
              <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">EVENDANCE Digital Ticket System</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-xs text-slate-500 shadow-sm">
            Gagal memproses tiket.
          </div>
        )}

        <div className="text-center text-[11px] text-slate-500">
          Simpan halaman ini atau{' '}
          <button onClick={() => window.print()} className="text-blue-600 font-bold hover:underline cursor-pointer">
            cetak sebagai PDF
          </button>{' '}
          sebagai dokumen fisik Anda.
        </div>
      </main>
    </div>
  );
}
