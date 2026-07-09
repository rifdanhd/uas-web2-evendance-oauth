"use client";

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

/**
 * Halaman Verifikasi Kehadiran Dinamis dengan proteksi login admin.
 * Menampilkan detail tiket peserta, QR Code, tombol konfirmasi, dan fitur cetak tiket.
 */
export default function UserDetailPage({ params }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  
  const queryClient = useQueryClient();
  const router = useRouter();
  
  // State proteksi login
  const [isVerifying, setIsVerifying] = useState(true);

  // State untuk notifikasi feedback pengguna
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // PROTEKSI ROUTE: Verifikasi keberadaan token sesi admin di localStorage
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/login');
    } else {
      setIsVerifying(false);
    }
  }, [router]);

  // Fungsi merayakan verifikasi kehadiran sukses dengan letupan Confetti
  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  // 1. QUERY: Mengambil detail peserta berdasarkan ID
  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await fetch(`http://localhost:5001/users/${id}`);
      if (!res.ok) {
        throw new Error('Gagal mengambil data peserta.');
      }
      return res.json();
    },
    enabled: !isVerifying,
  });

  // 2. MUTATION: Mengonfirmasi kehadiran (PATCH)
  const attendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`http://localhost:5001/users/${id}/attend`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal melakukan verifikasi kehadiran.');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      setSuccessMsg(data.message || 'Verifikasi kehadiran berhasil!');
      setErrorMsg('');
      
      // Memicu selebrasi confetti
      triggerConfetti();
    },
    onError: (err) => {
      setErrorMsg(err.message);
      setSuccessMsg('');
    },
  });

  const handleConfirmAttendance = () => {
    attendMutation.mutate();
  };

  // Handler Cetak Tiket
  const handlePrint = () => {
    window.print();
  };

  // Tampilan pemeriksaan sesi masuk
  if (isVerifying) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-stone-50 min-h-screen text-stone-500">
        <svg className="animate-spin h-10 w-10 text-teal-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold">Memverifikasi sesi masuk...</span>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-stone-50 min-h-screen text-stone-500">
        <svg className="animate-spin h-10 w-10 text-teal-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold">Memuat data tiket peserta...</span>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-stone-50 min-h-screen text-stone-500">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-extrabold text-2xl mb-4">
          !
        </div>
        <h2 className="text-lg font-bold text-rose-800">Terjadi Kesalahan</h2>
        <p className="text-sm text-stone-500 mt-2">{error.message}</p>
        <Link 
          href="/" 
          className="mt-6 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-all"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen justify-center items-center py-12 px-4 bg-stone-50 print:bg-white print:p-0">
      
      {/* HEADER NAVIGASI / TOMBOL KEMBALI */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between no-print">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-teal-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Dashboard
        </Link>

        {/* Tombol Cetak Tiket */}
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 text-xs font-bold transition-all cursor-pointer shadow-sm"
        >
          <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h8z" />
          </svg>
          Cetak Tiket
        </button>
      </div>

      {/* ALERTS FEEDBACK */}
      <div className="w-full max-w-md mb-6 transition-all duration-300 no-print">
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 shadow-md animate-bounce">
            <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm font-semibold">{successMsg}</div>
          </div>
        )}
        
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-md">
            <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm font-semibold">{errorMsg}</div>
          </div>
        )}
      </div>

      {/* KARTU TIKET PREMIUM */}
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-xl overflow-hidden relative print-ticket-container print:border-none print:shadow-none">
        
        <div className="h-3 bg-teal-600 w-full no-print"></div>
        
        <div className="absolute top-[52%] -left-4 w-8 h-8 rounded-full bg-stone-50 border border-stone-200 z-10 print:hidden"></div>
        
        <div className="absolute top-[52%] -right-4 w-8 h-8 rounded-full bg-stone-50 border border-stone-200 z-10 print:hidden"></div>

        <div className="p-8 pb-6 flex flex-col gap-5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold tracking-widest text-teal-600 uppercase">TIKET MASUK RESMI</span>
              <h3 className="text-2xl font-black text-stone-900 mt-0.5 tracking-tight">EVENDANCE</h3>
            </div>
            {user.is_attended ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Hadir
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                Belum Hadir
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <div>
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Nama Peserta</div>
              <div className="text-lg font-extrabold text-stone-800">{user.name}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Username</div>
                <div className="text-sm font-semibold text-stone-700">@{user.username}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Kode Tiket</div>
                <div className="text-sm font-extrabold text-teal-600 tracking-wide">{user.ticket_code}</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Alamat Email</div>
              <div className="text-sm font-semibold text-stone-700 truncate">{user.email}</div>
            </div>
          </div>
        </div>

        <div className="w-full border-t-2 border-dashed border-stone-200 relative my-2"></div>

        <div className="p-8 pt-6 flex flex-col items-center gap-6 bg-stone-50/50 print:bg-white">
          
          <div className="p-3 bg-white border border-stone-200 rounded-2xl shadow-sm flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`http://localhost:5001/api/qr/${user.ticket_code}`} 
              alt={`QR Code untuk tiket ${user.ticket_code}`}
              className="w-44 h-44 object-contain"
            />
          </div>

          <div className="text-center">
            <p className="text-xs font-semibold text-stone-400">PINDAI ATAU TUNJUKKAN QR CODE DI ATAS</p>
            <p className="text-[10px] text-stone-400 mt-1">Gunakan barcode ini saat memasuki gerbang acara untuk verifikasi otomatis.</p>
          </div>

          {!user.is_attended ? (
            <button
              onClick={handleConfirmAttendance}
              disabled={attendMutation.isPending}
              className="w-full py-3 px-5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-all duration-250 cursor-pointer shadow-md shadow-teal-500/10 active:scale-[0.98] disabled:bg-stone-300 disabled:active:scale-100 flex items-center justify-center gap-2 no-print"
            >
              {attendMutation.isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Memverifikasi...
                </>
              ) : (
                'Konfirmasi Kehadiran'
              )}
            </button>
          ) : (
            <div className="w-full py-3 px-5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-sm rounded-xl text-center flex items-center justify-center gap-2 print:border-none print:bg-white print:text-emerald-600">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Kehadiran Telah Terverifikasi
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
