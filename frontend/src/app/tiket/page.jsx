"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Halaman Tiket Peserta Evendance.
 * Peserta melihat tiket digital mereka beserta QR Code setelah berhasil mendaftar.
 * Data tiket diambil dari localStorage (sesi peserta) dan diverifikasi ke backend.
 */
export default function TiketPage() {
  const router = useRouter();

  const [ticket, setTicket] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTicket = async () => {
      // Cek sesi peserta di localStorage
      const stored = localStorage.getItem('peserta_ticket');
      if (!stored) {
        // Belum terdaftar, arahkan ke halaman pendaftaran
        router.push('/daftar');
        return;
      }

      try {
        const ticketData = JSON.parse(stored);
        setTicket(ticketData);

        // Ambil data terbaru dari backend (termasuk status kehadiran real-time)
        const res = await fetch(`http://localhost:5001/my-ticket/${encodeURIComponent(ticketData.email)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Gagal memuat data tiket.');
        }

        setUserData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadTicket();
  }, [router]);

  // Handler Logout Peserta
  const handleLogoutPeserta = () => {
    localStorage.removeItem('peserta_ticket');
    router.push('/daftar');
  };

  // Handler Cetak Tiket
  const handlePrint = () => {
    window.print();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-stone-50 min-h-screen text-stone-500">
        <svg className="animate-spin h-10 w-10 text-teal-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold">Memuat tiket Anda...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-stone-50 min-h-screen">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-sm font-bold text-rose-700 mb-4">{error}</p>
        <button
          onClick={handleLogoutPeserta}
          className="px-5 py-2 bg-teal-600 text-white rounded-xl font-bold text-xs cursor-pointer"
        >
          Daftar Ulang
        </button>
      </div>
    );
  }

  const displayData = userData || ticket;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-teal-50/30 via-stone-50 to-stone-100">

      {/* NAVIGASI ATAS */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full no-print">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-teal-500/20">
            E
          </div>
          <span className="text-lg font-bold text-stone-900 tracking-tight">Evendance</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="text-xs font-bold text-stone-600 px-3 py-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Cetak
          </button>
          <button
            onClick={handleLogoutPeserta}
            className="text-xs font-bold text-rose-600 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </nav>

      {/* KONTEN TIKET */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm animate-fade-in-up">

          {/* KARTU TIKET */}
          <div className="print-ticket-container bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden">
            
            {/* Header Tiket */}
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">E-Tiket Digital</div>
                  <h2 className="text-xl font-black tracking-tight mt-0.5">EVENDANCE</h2>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-white font-extrabold text-lg">E</span>
                </div>
              </div>
            </div>

            {/* Profil Peserta */}
            <div className="px-6 py-5 flex items-center gap-4 border-b border-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {ticket?.picture && (
                <img 
                  src={ticket.picture} 
                  alt="Foto Profil"
                  className="w-12 h-12 rounded-full border-2 border-teal-200 shadow-md"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-stone-900 text-sm truncate">{displayData?.name}</div>
                <div className="text-xs text-stone-500 mt-0.5 truncate">{displayData?.email}</div>
              </div>
              {/* Badge Status */}
              {userData?.is_attended ? (
                <div className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  <span className="text-[9px] font-extrabold text-emerald-700">✓ HADIR</span>
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
                  <span className="text-[9px] font-extrabold text-amber-700">BELUM HADIR</span>
                </div>
              )}
            </div>

            {/* Detail Tiket */}
            <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-stone-100">
              <div>
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Kode Tiket</span>
                <div className="font-extrabold text-teal-700 text-sm mt-0.5">{displayData?.ticket_code}</div>
              </div>
              <div>
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Username</span>
                <div className="font-bold text-stone-700 text-sm mt-0.5">@{displayData?.username}</div>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Tanggal Daftar</span>
                <div className="font-semibold text-stone-600 text-xs mt-0.5">
                  {displayData?.created_at ? new Date(displayData.created_at).toLocaleDateString('id-ID', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  }) : '-'}
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="px-6 py-6 flex flex-col items-center gap-4">
              <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`http://localhost:5001/api/qr/${encodeURIComponent(displayData?.ticket_code || 'LOADING')}`}
                  alt="QR Code Tiket"
                  className="w-44 h-44"
                />
              </div>
              <div className="text-center">
                <p className="text-[10px] text-stone-400 font-medium">
                  Tunjukkan QR Code ini kepada panitia saat memasuki acara
                </p>
              </div>
            </div>

            {/* Footer Tiket */}
            <div className="bg-stone-50 px-6 py-3 text-center border-t border-stone-100">
              <p className="text-[9px] text-stone-400 font-semibold">
                &copy; {new Date().getFullYear()} EVENDANCE — Sistem Registrasi &amp; Presensi Event Digital
              </p>
            </div>
          </div>

          {/* Tombol bantuan di bawah tiket */}
          <div className="mt-6 text-center no-print">
            <p className="text-[11px] text-stone-500">
              Simpan halaman ini atau <button onClick={handlePrint} className="text-teal-600 font-bold hover:underline cursor-pointer">cetak sebagai PDF</button> untuk menyimpan tiket Anda secara permanen.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
