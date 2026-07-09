"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import Link from 'next/link';

/**
 * Halaman Pendaftaran Mandiri Peserta Evendance (Google OAuth & Registrasi Manual).
 * - Pilihan jenis tiket: Regular (Gratis) vs VIP (Rp 150.000).
 * - Pendaftaran via Google atau Form Manual (Non-Google).
 * - Simulator Pembayaran Mock (khusus VIP) sebelum tiket diterbitkan.
 */
export default function DaftarPage() {
  const router = useRouter();

  // Sesi pendaftaran:
  // 'selection' (pilih tiket/metode) 
  // 'manualForm' (form input manual) 
  // 'googleConfirm' (konfirmasi data Google)
  // 'paymentGate' (pembayaran simulator VIP)
  // 'loading' (api processing)
  // 'success' (selesai)
  // 'error' (gagal)
  const [step, setStep] = useState('selection'); 
  
  // Data Peserta / Tiket Pilihan
  const [ticketType, setTicketType] = useState('REGULAR'); // 'REGULAR' | 'VIP'
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [googleProfile, setGoogleProfile] = useState(null);
  
  // State Pembayaran VIP
  const [paymentMethod, setPaymentMethod] = useState('VA_MANDIRI'); // VA_MANDIRI, VA_BCA, QRIS
  const [vaNumber] = useState(() => `94474-${Math.floor(Math.random() * 90000000) + 10000000}`);

  // Feedback & State
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);

  // Jika sudah punya tiket aktif, langsung alihkan ke halaman tiket
  useEffect(() => {
    const ticket = localStorage.getItem('peserta_ticket');
    if (ticket) {
      router.push('/tiket');
    }
  }, [router]);

  /**
   * Pendaftaran via Google OAuth
   */
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setErrorMsg('');
      setStep('loading');
      try {
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await profileRes.json();
        setGoogleProfile({
          ...profile,
          accessToken: tokenResponse.access_token,
        });

        // Set data form default dari Google
        setName(profile.name);
        setEmail(profile.email);
        
        // Alihkan ke step konfirmasi/bayar
        if (ticketType === 'VIP') {
          setStep('paymentGate');
        } else {
          setStep('googleConfirm');
        }
      } catch (err) {
        setErrorMsg('Gagal mengambil data profil Google Anda.');
        setStep('selection');
      }
    },
    onError: () => {
      setErrorMsg('Login Google dibatalkan.');
      setStep('selection');
    },
  });

  // Kirim registrasi ke backend (Google/Manual)
  const executeRegistration = async (isGoogle = false) => {
    setStep('loading');
    setErrorMsg('');

    const url = isGoogle ? 'http://localhost:5001/register-self' : 'http://localhost:5001/register-manual';
    const body = isGoogle 
      ? { idToken: googleProfile.accessToken, ticket_type: ticketType }
      : { name: name.trim(), username: username.trim(), email: email.trim(), ticket_type: ticketType };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pendaftaran.');
      }

      setRegisteredUser(data.user);
      setStep('success');

      // Simpan tiket sesi di localStorage
      localStorage.setItem('peserta_ticket', JSON.stringify({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        ticket_code: data.user.ticket_code,
        picture: isGoogle ? googleProfile.picture : null,
        ticket_type: data.user.ticket_type,
        payment_status: data.user.payment_status,
      }));

      setTimeout(() => {
        router.push('/tiket');
      }, 2500);
    } catch (err) {
      setErrorMsg(err.message);
      setStep(isGoogle ? 'googleConfirm' : 'manualForm');
    }
  };

  // Submit Pendaftaran Manual (Sebelum Payment/Finalisasi)
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim()) {
      setErrorMsg('Semua kolom wajib diisi.');
      return;
    }
    
    // Validasi email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Format email tidak valid.');
      return;
    }

    if (ticketType === 'VIP') {
      setStep('paymentGate'); // Bayar dulu baru insert db
    } else {
      executeRegistration(false); // Tiket gratis langsung insert db
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-teal-50/50 via-stone-50 to-stone-100">
      
      {/* NAVBAR */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-teal-500/20">
            E
          </div>
          <span className="text-lg font-bold text-stone-900 tracking-tight">Evendance</span>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/tiket/login"
            className="text-xs font-bold text-teal-700 hover:text-teal-800 px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-all"
          >
            Akses Tiket Saya →
          </Link>
          <Link 
            href="/login"
            className="text-xs font-bold text-stone-600 hover:text-stone-800 px-4 py-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 transition-all"
          >
            Admin
          </Link>
        </div>
      </nav>

      {/* VIEWPORT KONTEN */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg animate-fade-in-up">

          {/* ── ALERTS / FEEDBACK ERROR ── */}
          {errorMsg && step !== 'loading' && (
            <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 shadow-sm">
              <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs font-bold">{errorMsg}</div>
            </div>
          )}

          {/* ── STEP 1: PEMILIHAN TIPE TIKET & METODE DAFTAR ────────────────────── */}
          {step === 'selection' && (
            <div className="bg-white border border-stone-200 rounded-3xl shadow-xl p-8 flex flex-col gap-6">
              
              <div className="text-center flex flex-col gap-1">
                <h2 className="text-2xl font-black text-stone-900">Pendaftaran Event Evendance</h2>
                <p className="text-xs text-stone-500 font-medium">Pilih jenis tiket yang Anda inginkan untuk menghadiri event</p>
              </div>

              {/* Pemilihan Jenis Tiket (Cards) */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Regular Tiket Card */}
                <button
                  type="button"
                  onClick={() => setTicketType('REGULAR')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col gap-2 ${ticketType === 'REGULAR' ? 'border-teal-600 bg-teal-50/20 shadow-md' : 'border-stone-200 hover:border-stone-300 bg-white'}`}
                >
                  <div className="text-xl">🎫</div>
                  <div>
                    <h3 className="font-extrabold text-stone-950 text-sm">Regular Ticket</h3>
                    <p className="text-[10px] text-stone-500 font-semibold mt-0.5">Akses masuk standard gratis</p>
                  </div>
                  <div className="mt-2 font-black text-teal-600 text-base">GRATIS</div>
                  {ticketType === 'REGULAR' && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
                  )}
                </button>

                {/* VIP Tiket Card */}
                <button
                  type="button"
                  onClick={() => setTicketType('VIP')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col gap-2 ${ticketType === 'VIP' ? 'border-amber-500 bg-amber-50/10 shadow-md' : 'border-stone-200 hover:border-stone-300 bg-white'}`}
                >
                  <div className="text-xl">👑</div>
                  <div>
                    <h3 className="font-extrabold text-stone-950 text-sm">VIP Ticket</h3>
                    <p className="text-[10px] text-stone-500 font-semibold mt-0.5">Merchandise, barisan depan & snack</p>
                  </div>
                  <div className="mt-2 font-black text-amber-600 text-base">Rp 150.000</div>
                  {ticketType === 'VIP' && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
                  )}
                </button>
              </div>

              <div className="h-px bg-stone-200 my-1"></div>

              {/* Pilihan Metode Pendaftaran */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => googleLogin()}
                  className="w-full py-3.5 px-5 rounded-xl font-bold text-sm bg-white hover:bg-stone-50 border-2 border-stone-200 hover:border-stone-300 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-stone-700 cursor-pointer shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Daftar Menggunakan Google
                </button>

                <button
                  onClick={() => setStep('manualForm')}
                  className="w-full py-3 px-5 rounded-xl font-bold text-xs bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Daftar Secara Manual (Tanpa Google)
                </button>
              </div>

            </div>
          )}

          {/* ── STEP 2A: FORM INPUT PENDAFTARAN MANUAL ──────────────────────── */}
          {step === 'manualForm' && (
            <div className="bg-white border border-stone-200 rounded-3xl shadow-xl p-8 flex flex-col gap-6 animate-fade-in-up">
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setStep('selection')} 
                  className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  ←
                </button>
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Form Pendaftaran Manual</h2>
                  <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                    {ticketType === 'VIP' ? 'VIP TICKET (MOCK PAYMENT)' : 'REGULAR TICKET (GRATIS)'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: budisantoso"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Alamat Email</label>
                  <input
                    type="email"
                    required
                    placeholder="Contoh: budi.santoso@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-5 rounded-xl text-white font-bold text-sm bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {ticketType === 'VIP' ? 'Lanjutkan ke Pembayaran' : 'Daftar & Terbitkan Tiket'}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2B: KONFIRMASI GOOGLE (Untuk Tiket REGULAR) ────────── */}
          {step === 'googleConfirm' && googleProfile && (
            <div className="bg-white border border-stone-200 rounded-3xl shadow-xl p-8 flex flex-col gap-6 animate-fade-in-up">
              
              <div className="text-center">
                <h2 className="text-xl font-black text-stone-900">Konfirmasi Profil Google</h2>
                <p className="text-xs text-stone-500 mt-1">Daftarkan tiket gratis untuk akun Google ini</p>
              </div>

              <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={googleProfile.picture} 
                  alt="Foto Google" 
                  className="w-12 h-12 rounded-full border-2 border-teal-400"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-stone-900 text-sm truncate">{googleProfile.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5 truncate">{googleProfile.email}</div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => executeRegistration(true)}
                  className="w-full py-3.5 px-5 rounded-xl text-white font-bold text-sm bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  Konfirmasi &amp; Dapatkan Tiket
                </button>
                <button
                  onClick={() => setStep('selection')}
                  className="w-full py-2.5 px-5 rounded-xl text-stone-600 font-bold text-xs bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-all cursor-pointer"
                >
                  Kembali
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: LAYAR PEMBAYARAN MOCK (VIP ONLY) ────────────────── */}
          {step === 'paymentGate' && (
            <div className="bg-white border border-amber-300 rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
              
              {/* Header Simulator */}
              <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-md font-extrabold tracking-tight">MOCK PAYMENT SIMULATOR</h3>
                  <p className="text-[10px] text-amber-100 font-semibold">Uji coba simulasi pembayaran tiket VIP</p>
                </div>
                <div className="bg-amber-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                  SIMULASI
                </div>
              </div>

              {/* Body Simulator */}
              <div className="p-6 flex flex-col gap-5 bg-stone-50/50">
                
                {/* Info Detail Pembelian */}
                <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-stone-500">Nama Pembeli</span>
                    <span className="font-bold text-stone-900">{name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-stone-500">Kategori Tiket</span>
                    <span className="font-black text-amber-600">★ VIP TICKET</span>
                  </div>
                  <div className="h-px bg-stone-100 my-0.5"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-stone-800">Total Tagihan</span>
                    <span className="text-lg font-black text-stone-950">Rp 150.000</span>
                  </div>
                </div>

                {/* Pilih Metode Pembayaran */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Pilih Metode Virtual Account</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('VA_MANDIRI')}
                      className={`p-3.5 rounded-xl border text-xs font-extrabold flex items-center justify-between ${paymentMethod === 'VA_MANDIRI' ? 'border-amber-500 bg-amber-50/20 text-amber-800' : 'border-stone-200 bg-white text-stone-600'}`}
                    >
                      Mandiri VA
                      <span className="text-[8px] bg-stone-200 px-1.5 py-0.5 rounded text-stone-600">VA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('VA_BCA')}
                      className={`p-3.5 rounded-xl border text-xs font-extrabold flex items-center justify-between ${paymentMethod === 'VA_BCA' ? 'border-amber-500 bg-amber-50/20 text-amber-800' : 'border-stone-200 bg-white text-stone-600'}`}
                    >
                      BCA Virtual
                      <span className="text-[8px] bg-stone-200 px-1.5 py-0.5 rounded text-stone-600">VA</span>
                    </button>
                  </div>
                </div>

                {/* Info Rekening VA */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col gap-1 items-center justify-center text-center">
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Nomor Virtual Account</span>
                  <div className="text-lg font-black text-amber-700 select-all tracking-wider font-mono">{vaNumber}</div>
                  <span className="text-[10px] text-stone-500 font-semibold mt-1">Gunakan tombol di bawah untuk menyimulasikan transfer VA</span>
                </div>

                {/* Tombol Simulasikan Bayar */}
                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={() => executeRegistration(!!googleProfile)}
                    className="w-full py-3.5 px-5 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/10"
                  >
                    Simulasikan Pembayaran Sukses
                  </button>
                  <button
                    onClick={() => setStep(googleProfile ? 'selection' : 'manualForm')}
                    className="w-full py-2.5 px-5 rounded-xl text-stone-600 font-bold text-xs bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-all cursor-pointer"
                  >
                    Batal Pendaftaran
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ── STEP 4: LOADING STATE ──────────────────────── */}
          {step === 'loading' && (
            <div className="bg-white border border-stone-200 rounded-3xl shadow-xl p-12 flex flex-col items-center gap-5 animate-fade-in-up">
              <svg className="animate-spin h-10 w-10 text-teal-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div className="text-center">
                <h3 className="font-bold text-stone-800">Menyimpan Pendaftaran...</h3>
                <p className="text-xs text-stone-500 mt-1">Mengamankan reservasi tiket Anda pada database</p>
              </div>
            </div>
          )}

          {/* ── STEP 5: BERHASIL ────────────────────────────── */}
          {step === 'success' && registeredUser && (
            <div className="bg-white border border-emerald-200 rounded-3xl shadow-xl p-8 flex flex-col items-center gap-5 animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center flex flex-col gap-1">
                <h3 className="text-xl font-black text-emerald-800">Tiket Berhasil Diterbitkan!</h3>
                <p className="text-xs text-stone-600">
                  Kode tiket Anda: <strong className="text-teal-700">{registeredUser.ticket_code}</strong>
                </p>
                {registeredUser.ticket_type === 'VIP' && (
                  <div className="inline-flex self-center items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase mt-1">
                    👑 Tiket VIP — Lunas
                  </div>
                )}
              </div>
              <p className="text-xs text-stone-400 animate-soft-pulse mt-1">
                Membuka tiket digital Anda...
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
