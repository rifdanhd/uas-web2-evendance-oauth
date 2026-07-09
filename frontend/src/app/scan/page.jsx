"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';

/**
 * Halaman Live QR Code Camera Scanner dengan proteksi login admin.
 * Membuka webcam untuk mendeteksi QR Code, melakukan presensi otomatis,
 * dan merayakannya dengan efek confetti saat kehadiran berhasil dicatat.
 */
export default function ScanPage() {
  const router = useRouter();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanCount, setScanCount] = useState(0); // Menghitung total berhasil scan dalam sesi

  // PROTEKSI ROUTE
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/login');
    } else {
      setIsVerifying(false);
    }
  }, [router]);

  // Fungsi merayakan kehadiran sukses dengan letupan Confetti
  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#0d9488', '#14b8a6', '#2dd4bf', '#f0fdfa', '#ffffff']
    });
  };

  // Fungsi berhenti scanner
  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      setScannerStarted(false);
    } catch (err) {
      console.error("Error saat mematikan scanner:", err);
    }
  }, []);

  // Fungsi proses tiket hasil scan
  const processScannedTicket = useCallback(async (ticketCode) => {
    setIsProcessing(true);
    try {
      const userRes = await fetch(`http://localhost:5001/users/ticket/${encodeURIComponent(ticketCode)}`);
      const userData = await userRes.json();

      if (!userRes.ok) throw new Error(userData.error || 'Tiket tidak ditemukan di sistem.');

      const attendRes = await fetch(`http://localhost:5001/users/${userData.id}/attend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const attendData = await attendRes.json();

      if (!attendRes.ok) throw new Error(attendData.error || 'Gagal memproses verifikasi kehadiran.');

      setScanResult({
        success: true,
        message: attendData.message,
        user: attendData.user || userData,
        alreadyAttended: attendData.message?.includes('sudah diverifikasi')
      });

      // Tampilkan confetti hanya jika ini adalah verifikasi pertama (bukan duplikat)
      if (!attendData.message?.includes('sudah diverifikasi')) {
        setScanCount(prev => prev + 1);
        triggerConfetti();
      }

    } catch (err) {
      setScanResult({ success: false, message: err.message });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Fungsi mulai scanner kamera
  const startScanner = useCallback(async () => {
    try {
      setCameraError('');

      const html5Qrcode = new Html5Qrcode("reader");
      scannerRef.current = html5Qrcode;

      const qrCodeSuccessCallback = async (decodedText) => {
        try {
          if (html5Qrcode.isScanning) await html5Qrcode.stop();
          scannerRef.current = null;
        } catch (e) { /* diabaikan */ }
        setScannerStarted(false);
        await processScannedTicket(decodedText);
      };

      const config = {
        fps: 10,
        qrbox: (w, h) => {
          const s = Math.min(w, h) * 0.65;
          return { width: s, height: s };
        }
      };

      await html5Qrcode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback);
      setScannerStarted(true);
    } catch (err) {
      console.error("Gagal memulai kamera scanner:", err);
      setCameraError("Gagal mengakses kamera. Pastikan izin kamera telah diberikan di browser Anda.");
      setScannerStarted(false);
    }
  }, [processScannedTicket]);

  // Otomatis mulai scanner saat mounted dan state sesuai
  useEffect(() => {
    if (!isVerifying && !scanResult && !isProcessing) {
      startScanner();
    }
    return () => { stopScanner(); };
  }, [isVerifying, scanResult, isProcessing, startScanner, stopScanner]);

  // Handler scan tiket berikutnya
  const handleScanNext = () => setScanResult(null);

  // ── RENDER: Verifikasi ─────────────────────────────────────────────────
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

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-stone-100">
      
      {/* NAVBAR */}
      <header className="glass-card sticky top-0 z-50 px-6 py-4 border-b border-stone-200">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="w-8 h-8 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-stone-900 leading-tight">Pemindai Presensi</h1>
              <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Kamera Live Scanner</p>
            </div>
          </div>
          
          {/* Counter Sukses Scan di Sesi Ini */}
          <div className="flex items-center gap-2">
            {scanCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-extrabold text-emerald-700">{scanCount} Hadir</span>
              </div>
            )}
            <Link 
              href="/"
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* VIEWPORT PEMINDAI */}
      <main className="max-w-md mx-auto px-4 py-6 flex-1 w-full flex flex-col gap-5 justify-center">
        
        {/* ── LOADING: Memproses API ───────── */}
        {isProcessing && (
          <div className="glass-card p-8 rounded-3xl border border-stone-200 shadow-xl flex flex-col items-center justify-center gap-4 min-h-[380px] animate-fade-in-up">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-stone-200 flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-stone-800">Memproses Verifikasi</h3>
              <p className="text-xs text-stone-500 mt-1">Mencocokkan tiket dan memverifikasi kehadiran ke database...</p>
            </div>
          </div>
        )}

        {/* ── HASIL SCAN ────────────────────── */}
        {!isProcessing && scanResult && (
          <div className={`glass-card p-8 rounded-3xl shadow-xl flex flex-col gap-5 min-h-[380px] animate-fade-in-up ${scanResult.success ? 'border border-emerald-200' : 'border border-rose-200'}`}>
            
            {/* Header Hasil */}
            <div className="flex flex-col items-center text-center gap-3">
              {scanResult.success ? (
                <>
                  {scanResult.alreadyAttended ? (
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center shadow-inner">
                      <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
                      <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <h3 className={`text-xl font-black ${scanResult.alreadyAttended ? 'text-amber-800' : 'text-emerald-800'}`}>
                    {scanResult.alreadyAttended ? 'SUDAH TERCATAT' : 'PRESENSI BERHASIL!'}
                  </h3>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center shadow-inner">
                    <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-rose-800">TIKET TIDAK VALID</h3>
                </>
              )}
              <p className="text-sm font-medium text-stone-600 leading-normal px-2">{scanResult.message}</p>
            </div>

            {/* Detail Peserta (jika ada) */}
            {scanResult.success && scanResult.user && (
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col gap-2">
                <div>
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Nama Peserta</span>
                  <div className="font-extrabold text-stone-900 text-sm">{scanResult.user.name}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Kode Tiket</span>
                    <div className="font-bold text-teal-600 text-xs">{scanResult.user.ticket_code}</div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Email</span>
                    <div className="font-semibold text-stone-600 text-xs truncate">{scanResult.user.email}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tombol Scan Ulang */}
            <button
              onClick={handleScanNext}
              className="w-full mt-auto py-3 px-5 rounded-xl text-white font-bold text-sm bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all shadow-md shadow-teal-500/10 cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Pindai Tiket Berikutnya
            </button>
          </div>
        )}

        {/* ── VIEWFINDER KAMERA AKTIF ────────── */}
        {!isProcessing && !scanResult && (
          <div className="flex flex-col gap-4 animate-fade-in-up">
            
            <div className="relative aspect-square w-full bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-stone-700">
              
              {/* Box video kamera */}
              <div id="reader" className="absolute inset-0 w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"></div>

              {/* Overlay gelap semi-transparan di sekitar area scan */}
              {scannerStarted && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                  {/* Efek gelap di luar kotak bidik */}
                  <div className="absolute inset-0 bg-stone-950/40"></div>
                  
                  {/* Kotak bidik teal - area aktif scan */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-[65%] aspect-square rounded-2xl overflow-hidden">
                      {/* "jendela" transparan di area bidik */}
                      <div className="absolute inset-0 bg-transparent border-2 border-teal-400 rounded-2xl shadow-[inset_0_0_0_1px_rgba(45,212,191,0.3)]"></div>
                      
                      {/* Laser pemindai animasi */}
                      <div className="scanner-laser"></div>

                      {/* Sudut-sudut dekoratif kotak bidik */}
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-teal-400 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-teal-400 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-teal-400 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-teal-400 rounded-br-lg"></div>
                    </div>
                  </div>

                  {/* Label status kamera aktif */}
                  <div className="absolute bottom-4 inset-x-0 flex justify-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900/70 border border-teal-500/40 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-teal-300 tracking-wider">KAMERA AKTIF</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Kamera */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-stone-900/95 z-20 gap-4">
                  <div className="w-14 h-14 rounded-full bg-rose-900/50 flex items-center justify-center border border-rose-700">
                    <svg className="w-7 h-7 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-rose-300">{cameraError}</p>
                  <button 
                    onClick={startScanner}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-all border border-teal-500 cursor-pointer"
                  >
                    Coba Aktifkan Ulang
                  </button>
                </div>
              )}
            </div>

            {/* Petunjuk di bawah kamera */}
            <div className="text-center flex flex-col gap-1.5 px-4">
              <span className="text-xs font-bold text-stone-600 tracking-wide uppercase">Cara Penggunaan</span>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Arahkan kamera ke <strong>QR Code tiket peserta</strong> hingga berada di dalam bingkai teal. Verifikasi kehadiran akan dilakukan secara <strong>otomatis</strong> tanpa perlu menekan tombol apapun.
              </p>
            </div>

          </div>
        )}

      </main>

      <footer className="py-5 text-center text-xs text-stone-400 font-medium">
        &copy; {new Date().getFullYear()} Evendance. Sesi Aktif.
      </footer>
    </div>
  );
}
