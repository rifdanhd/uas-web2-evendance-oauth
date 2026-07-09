"use client";

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

export default function UserDetailPage({ params }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/login');
    } else {
      setIsVerifying(false);
    }
  }, [router]);

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  };

  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await fetch(`http://localhost:5001/users/${id}`);
      if (!res.ok) throw new Error('Gagal mengambil data peserta.');
      return res.json();
    },
    enabled: !isVerifying,
  });

  const attendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`http://localhost:5001/users/${id}/attend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal melakukan verifikasi kehadiran.');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccessMsg(data.message || 'Verifikasi kehadiran berhasil!');
      setErrorMsg('');
      triggerConfetti();
    },
    onError: (err) => {
      setErrorMsg(err.message);
      setSuccessMsg('');
    },
  });

  const Spinner = () => (
    <div className="flex flex-col items-center justify-center p-12 bg-slate-50 min-h-screen text-slate-500">
      <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <span className="text-xs font-semibold">Memuat data...</span>
    </div>
  );

  if (isVerifying || isLoading) return <Spinner />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-50 min-h-screen">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xl mb-4">!</div>
        <h2 className="text-sm font-bold text-red-800">Terjadi Kesalahan</h2>
        <p className="text-xs text-slate-500 mt-2">{error.message}</p>
        <Link href="/admin" className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-full shadow-sm transition-all">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen justify-center items-center py-12 px-4 bg-slate-50 text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-md mb-5 flex items-center justify-between">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Dashboard
        </Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-sm cursor-pointer">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h8z" />
          </svg>
          Cetak
        </button>
      </div>

      {(successMsg || errorMsg) && (
        <div className="w-full max-w-md mb-5">
          {successMsg && (
            <div className="p-3.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs font-semibold flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {errorMsg}
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden relative">
        <div className="h-2.5 bg-[#1a73e8] w-full"></div>

        <div className="p-8 pb-5 flex flex-col gap-5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-bold tracking-wider text-blue-600 uppercase">Tiket Masuk Resmi</span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">EVENDANCE</h3>
            </div>
            {user.is_attended ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-green-50 border border-green-200 text-[10px] font-bold text-green-700">Hadir</span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600">Belum Hadir</span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nama Peserta</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">{user.name}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Event Terdaftar</div>
              <div className="text-sm font-bold text-slate-700 leading-snug mt-0.5">{user.event_title || 'Evendance Conference'}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Username</div>
                <div className="text-xs font-semibold text-slate-600 mt-0.5">@{user.username}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kode Tiket</div>
                <div className="text-xs font-mono font-bold text-blue-600 tracking-wide mt-0.5">{user.ticket_code}</div>
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Alamat Email</div>
              <div className="text-xs font-semibold text-slate-600 truncate mt-0.5">{user.email}</div>
            </div>
          </div>
        </div>

        <div className="w-full border-t border-dashed border-slate-200 my-2"></div>

        <div className="p-8 pt-5 flex flex-col items-center gap-5 bg-slate-50/50">
          <div className="p-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`http://localhost:5001/api/qr/${user.ticket_code}`}
              alt={`QR Code tiket ${user.ticket_code}`}
              className="w-40 h-40 object-contain"
            />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pindai QR Code untuk Verifikasi</p>
            <p className="text-[9px] text-slate-400 mt-1 max-w-[280px]">Scan barcode di atas menggunakan modul kamera scanner untuk memvalidasi tiket masuk.</p>
          </div>

          {!user.is_attended ? (
            <button
              onClick={() => attendMutation.mutate()}
              disabled={attendMutation.isPending}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer disabled:bg-slate-300 flex items-center justify-center gap-2"
            >
              {attendMutation.isPending ? 'Memproses...' : 'Konfirmasi Kehadiran'}
            </button>
          ) : (
            <div className="w-full py-2.5 bg-green-50 border border-green-200 text-green-800 font-bold text-xs rounded-lg text-center flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Kehadiran Telah Terverifikasi
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
