"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import Link from 'next/link';

/**
 * Halaman Pendaftaran Mandiri & Pembelian Tiket Evendance.
 * Alur: Pilih tiket → Pilih metode daftar → Isi data → Checkout/Payment → Tiket Diterbitkan
 */
export default function DaftarPage() {
  const router = useRouter();

  const [step, setStep] = useState('selection');
  const [ticketType, setTicketType] = useState('REGULAR');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [googleProfile, setGoogleProfile] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('VA_BCA');
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);

  // Nomor VA unik per sesi
  const [vaNumber] = useState(() => {
    const codes = {
      VA_BCA: `8808${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      VA_MANDIRI: `88608${Math.floor(Math.random() * 900000000) + 100000000}`,
      VA_BNI: `8880${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      QRIS: `00020101021226700016ID.CO.BCA.WWW01189360092100${Math.floor(Math.random() * 9000000000000) + 1000000000000}`,
    };
    return codes;
  });

  // Countdown timer 15 menit
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [timerActive, setTimerActive] = useState(false);

  // Nomor invoice
  const [invoiceNumber] = useState(() => `INV-EVD-${Date.now().toString().slice(-8)}`);

  useEffect(() => {
    const ticket = localStorage.getItem('peserta_ticket');
    if (ticket) router.push('/tiket');
  }, [router]);

  useEffect(() => {
    if (!timerActive) return;
    if (timeLeft <= 0) {
      setStep('selection');
      setTimerActive(false);
      setTimeLeft(15 * 60);
      return;
    }
    const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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
      if (!res.ok) throw new Error(data.error || 'Gagal memproses pendaftaran.');

      setRegisteredUser(data.user);
      setStep('success');
      setTimerActive(false);

      localStorage.setItem('peserta_ticket', JSON.stringify({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        ticket_code: data.user.ticket_code,
        picture: isGoogle ? googleProfile.picture : null,
        ticket_type: data.user.ticket_type,
        payment_status: data.user.payment_status,
        created_at: data.user.created_at,
      }));

      setTimeout(() => router.push('/tiket'), 2800);
    } catch (err) {
      setErrorMsg(err.message);
      setStep(isGoogle ? 'googleConfirm' : (ticketType === 'VIP' ? 'paymentGate' : 'manualForm'));
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setErrorMsg('');
      setStep('loading');
      try {
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await profileRes.json();
        setGoogleProfile({ ...profile, accessToken: tokenResponse.access_token });
        setName(profile.name);
        setEmail(profile.email);
        if (ticketType === 'VIP') {
          setStep('paymentGate');
          setTimerActive(true);
        } else {
          setStep('googleConfirm');
        }
      } catch {
        setErrorMsg('Gagal mengambil profil Google.');
        setStep('selection');
      }
    },
    onError: () => { setErrorMsg('Login Google dibatalkan.'); setStep('selection'); },
  });

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim()) { setErrorMsg('Semua kolom wajib diisi.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setErrorMsg('Format email tidak valid.'); return; }
    if (ticketType === 'VIP') { setStep('paymentGate'); setTimerActive(true); }
    else { executeRegistration(false); }
  };

  const handlePayNow = () => {
    executeRegistration(!!googleProfile);
  };

  const paymentMethods = [
    { id: 'VA_BCA', label: 'BCA Virtual Account', logo: '🏦', color: 'blue' },
    { id: 'VA_MANDIRI', label: 'Mandiri Virtual Account', logo: '🏛️', color: 'yellow' },
    { id: 'VA_BNI', label: 'BNI Virtual Account', logo: '🏢', color: 'orange' },
    { id: 'QRIS', label: 'QRIS (Semua E-Wallet)', logo: '📱', color: 'purple' },
  ];

  const currentVA = vaNumber[paymentMethod];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-stone-100">

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-stone-200 px-6 py-3 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-teal-500/20">E</div>
            <span className="text-lg font-black text-stone-900 tracking-tight">Evendance</span>
            <span className="hidden sm:inline text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1 border-l border-stone-200 pl-2">Ticket Store</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tiket/login" className="text-xs font-bold text-teal-700 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-all">
              Tiket Saya →
            </Link>
            <Link href="/login" className="text-xs font-bold text-stone-600 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 hover:bg-stone-100 transition-all">
              Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ───────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">

        {/* Error Banner */}
        {errorMsg && step !== 'loading' && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 shadow-sm">
            <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-xs font-semibold">{errorMsg}</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 1: PILIH TIKET + METODE DAFTAR 
            ══════════════════════════════════════════════════════ */}
        {step === 'selection' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* LEFT: Event Info */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-gradient-to-br from-teal-700 to-emerald-800 rounded-2xl p-6 text-white shadow-xl shadow-teal-900/20">
                <div className="text-xs font-bold uppercase tracking-widest text-teal-200 mb-2">Event Night 2026</div>
                <h1 className="text-2xl font-black leading-tight">Evendance Annual Conference</h1>
                <p className="text-xs text-teal-100 mt-2 font-medium leading-relaxed">Networking, workshop, dan sesi inspiratif bersama para pemimpin industri terbaik.</p>
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-teal-100 font-semibold">
                    <svg className="w-3.5 h-3.5 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Sabtu, 15 November 2026
                  </div>
                  <div className="flex items-center gap-2 text-xs text-teal-100 font-semibold">
                    <svg className="w-3.5 h-3.5 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    08.00 – 17.00 WIB
                  </div>
                  <div className="flex items-center gap-2 text-xs text-teal-100 font-semibold">
                    <svg className="w-3.5 h-3.5 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Jakarta Convention Center
                  </div>
                </div>
              </div>

              {/* Sisa tiket */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
                <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Ketersediaan Tiket</div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700">Regular</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-stone-100 rounded-full h-1.5 overflow-hidden"><div className="bg-teal-500 h-1.5 rounded-full" style={{width: '62%'}}></div></div>
                      <span className="text-stone-500 font-bold">76 tersisa</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700">VIP</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-stone-100 rounded-full h-1.5 overflow-hidden"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: '18%'}}></div></div>
                      <span className="text-rose-600 font-bold">9 tersisa!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Pemilihan Tiket */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-stone-100">
                  <h2 className="text-base font-black text-stone-900">Pilih Tiket</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Klik tiket untuk memilih, kemudian lanjutkan ke pendaftaran</p>
                </div>

                <div className="p-5 flex flex-col gap-3">
                  {/* Regular Ticket */}
                  <button type="button" onClick={() => setTicketType('REGULAR')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${ticketType === 'REGULAR' ? 'border-teal-500 bg-teal-50/30' : 'border-stone-200 hover:border-stone-300 bg-white'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${ticketType === 'REGULAR' ? 'border-teal-500 bg-teal-500' : 'border-stone-300'}`}>
                          {ticketType === 'REGULAR' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-sm">Regular Ticket</span>
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold">TERSEDIA</span>
                          </div>
                          <p className="text-xs text-stone-500 mt-1 leading-relaxed">Akses penuh ke semua sesi konferensi, coffee break, dan networking</p>
                        </div>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <div className="font-black text-teal-600 text-lg">GRATIS</div>
                        <div className="text-[10px] text-stone-400">per orang</div>
                      </div>
                    </div>
                  </button>

                  {/* VIP Ticket */}
                  <button type="button" onClick={() => setTicketType('VIP')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${ticketType === 'VIP' ? 'border-amber-500 bg-amber-50/30' : 'border-stone-200 hover:border-stone-300 bg-white'}`}>
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider">
                      🔥 Terbatas
                    </div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${ticketType === 'VIP' ? 'border-amber-500 bg-amber-500' : 'border-stone-300'}`}>
                          {ticketType === 'VIP' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-sm">VIP Ticket 👑</span>
                          </div>
                          <p className="text-xs text-stone-500 mt-1 leading-relaxed">Semua fasilitas Regular + Exclusive Merchandise Pack + Barisan VIP + Premium Lunch</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {['🎁 Merch Pack', '🍱 Lunch', '⭐ VIP Area', '🤝 Meet Speaker'].map(b => (
                              <span key={b} className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">{b}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <div className="font-black text-amber-600 text-lg">Rp 150.000</div>
                        <div className="text-[10px] text-stone-400">per orang</div>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="px-5 pb-5 flex flex-col gap-3">
                  <div className="h-px bg-stone-100"></div>
                  <p className="text-xs font-bold text-stone-500 text-center">Daftar Menggunakan Akun Anda</p>
                  <button onClick={() => googleLogin()}
                    className="w-full py-3 px-5 rounded-xl font-bold text-sm bg-white hover:bg-stone-50 border-2 border-stone-200 hover:border-stone-300 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-stone-700 cursor-pointer shadow-sm">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Lanjutkan dengan Google
                  </button>
                  <button onClick={() => setStep('manualForm')}
                    className="w-full py-2.5 px-5 rounded-xl font-bold text-xs bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 transition-all cursor-pointer flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Daftar Manual (Tanpa Google)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 2A: FORM INPUT MANUAL 
            ══════════════════════════════════════════════════════ */}
        {step === 'manualForm' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in-up">
              <div className="p-5 border-b border-stone-100 flex items-center gap-3">
                <button onClick={() => setStep('selection')} className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors cursor-pointer text-stone-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div>
                  <h2 className="text-base font-black text-stone-900">Data Peserta</h2>
                  <p className="text-[11px] text-stone-500">
                    {ticketType === 'VIP' ? '👑 VIP Ticket — Rp 150.000' : '🎫 Regular Ticket — Gratis'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="p-5 flex flex-col gap-4">
                {[
                  { id: 'name', label: 'Nama Lengkap', type: 'text', placeholder: 'Masukkan nama lengkap Anda', val: name, setter: setName },
                  { id: 'username', label: 'Username', type: 'text', placeholder: 'Tanpa spasi, huruf kecil', val: username, setter: setUsername },
                  { id: 'email', label: 'Alamat Email', type: 'email', placeholder: 'email@contoh.com', val: email, setter: setEmail },
                ].map(field => (
                  <div key={field.id} className="flex flex-col gap-1.5">
                    <label htmlFor={field.id} className="text-xs font-bold text-stone-700">{field.label}</label>
                    <input
                      id={field.id}
                      type={field.type}
                      required
                      placeholder={field.placeholder}
                      value={field.val}
                      onChange={(e) => field.setter(e.target.value)}
                      className="px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-sm font-medium transition-all"
                    />
                  </div>
                ))}

                {ticketType === 'VIP' && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Setelah melengkapi data, Anda akan diarahkan ke halaman pembayaran
                  </div>
                )}

                <button type="submit"
                  className={`w-full mt-1 py-3 px-5 rounded-xl text-white font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${ticketType === 'VIP' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/20'}`}>
                  {ticketType === 'VIP' ? 'Lanjutkan ke Pembayaran →' : '🎫 Terbitkan Tiket Saya'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 2B: KONFIRMASI GOOGLE (Regular) 
            ══════════════════════════════════════════════════════ */}
        {step === 'googleConfirm' && googleProfile && (
          <div className="max-w-md mx-auto">
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in-up">
              <div className="p-5 border-b border-stone-100">
                <h2 className="text-base font-black text-stone-900">Konfirmasi Identitas</h2>
                <p className="text-xs text-stone-500 mt-0.5">Pastikan data Google Anda sudah benar sebelum mendaftar</p>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={googleProfile.picture} alt="Foto Google" className="w-12 h-12 rounded-full border-2 border-teal-400 shadow-md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-stone-900 text-sm truncate">{googleProfile.name}</div>
                    <div className="text-xs text-stone-500 mt-0.5 truncate">{googleProfile.email}</div>
                  </div>
                  <div className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold">Terverifikasi ✓</div>
                </div>
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-800 flex items-center gap-2">
                  <span className="text-base">🎫</span> Regular Ticket — <strong>GRATIS</strong>. Tiket langsung diterbitkan setelah konfirmasi.
                </div>
                <button onClick={() => executeRegistration(true)}
                  className="w-full py-3 px-5 rounded-xl text-white font-bold text-sm bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-teal-500/20">
                  ✓ Konfirmasi & Terbitkan Tiket
                </button>
                <button onClick={() => setStep('selection')}
                  className="w-full py-2.5 px-5 rounded-xl text-stone-600 font-bold text-xs bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-all cursor-pointer">
                  Kembali
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 3: PAYMENT CHECKOUT (VIP) 
            ══════════════════════════════════════════════════════ */}
        {step === 'paymentGate' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in-up">

            {/* LEFT: Payment Method Selection */}
            <div className="lg:col-span-3 flex flex-col gap-4">

              {/* Countdown Header */}
              <div className={`rounded-xl p-3.5 flex items-center justify-between border ${timeLeft < 120 ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-xs font-bold">Selesaikan pembayaran dalam</span>
                </div>
                <span className="text-lg font-black font-mono tracking-widest">{formatTime(timeLeft)}</span>
              </div>

              {/* Pilih Metode Pembayaran */}
              <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-stone-100">
                  <h2 className="text-base font-black text-stone-900">Pilih Metode Pembayaran</h2>
                </div>
                <div className="p-4 flex flex-col gap-2.5">
                  {paymentMethods.map(method => (
                    <button key={method.id} type="button" onClick={() => setPaymentMethod(method.id)}
                      className={`w-full p-3.5 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${paymentMethod === method.id ? 'border-amber-500 bg-amber-50/40' : 'border-stone-200 hover:border-stone-300 bg-white'}`}>
                      <span className="text-lg">{method.logo}</span>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-stone-900">{method.label}</div>
                        {method.id !== 'QRIS' && <div className="text-[10px] text-stone-500 font-medium mt-0.5">Transfer melalui ATM, m-banking, atau internet banking</div>}
                        {method.id === 'QRIS' && <div className="text-[10px] text-stone-500 font-medium mt-0.5">GoPay, OVO, DANA, ShopeePay, dan semua e-wallet</div>}
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === method.id ? 'border-amber-500 bg-amber-500' : 'border-stone-300'}`}>
                        {paymentMethod === method.id && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detail Pembayaran / VA Number */}
              <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                  <h3 className="text-sm font-black text-stone-900">
                    {paymentMethod === 'QRIS' ? 'Kode QRIS' : 'Nomor Virtual Account'}
                  </h3>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    {paymentMethods.find(m => m.id === paymentMethod)?.label}
                  </span>
                </div>
                <div className="p-5 flex flex-col items-center gap-3">
                  {paymentMethod === 'QRIS' ? (
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 w-32 h-32 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`http://localhost:5001/api/qr/${encodeURIComponent(currentVA.slice(0, 30))}`} alt="QRIS" className="w-24 h-24" />
                    </div>
                  ) : (
                    <div className="w-full p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Nomor VA</div>
                        <div className="text-xl font-black font-mono text-stone-900 tracking-widest select-all">{currentVA}</div>
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(currentVA)}
                        className="p-2 rounded-lg bg-stone-200 hover:bg-stone-300 transition-colors cursor-pointer">
                        <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  )}
                  <p className="text-center text-[11px] text-stone-500 leading-relaxed">
                    Lakukan pembayaran ke nomor di atas, kemudian klik tombol <strong>&ldquo;Konfirmasi Pembayaran&rdquo;</strong> untuk menerbitkan tiket Anda.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT: Order Summary */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden sticky top-20">
                <div className="p-5 border-b border-stone-100">
                  <h3 className="text-sm font-black text-stone-900">Ringkasan Pesanan</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-0.5">{invoiceNumber}</p>
                </div>
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">👑</div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-stone-900 leading-tight">VIP Ticket</div>
                      <div className="text-xs text-stone-500">Evendance Annual Conference 2026</div>
                    </div>
                  </div>
                  <div className="h-px bg-stone-100"></div>
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Harga Tiket</span>
                      <span className="font-semibold">Rp 150.000</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Biaya Layanan</span>
                      <span className="font-semibold">Rp 0</span>
                    </div>
                    <div className="flex justify-between text-stone-500 text-[10px]">
                      <span className="italic">*biaya layanan sudah termasuk</span>
                    </div>
                    <div className="h-px bg-stone-100"></div>
                    <div className="flex justify-between font-black text-stone-900 text-sm">
                      <span>Total</span>
                      <span className="text-amber-600">Rp 150.000</span>
                    </div>
                  </div>

                  {/* Peserta */}
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-col gap-1.5 text-[11px]">
                    <div className="flex justify-between text-stone-600">
                      <span>Pemesan</span>
                      <span className="font-bold text-stone-800 truncate max-w-[110px]">{name || googleProfile?.name || '—'}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Email</span>
                      <span className="font-bold text-stone-800 truncate max-w-[110px]">{email || googleProfile?.email || '—'}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Metode</span>
                      <span className="font-bold text-stone-800">{paymentMethods.find(m => m.id === paymentMethod)?.label.split(' ')[0]}</span>
                    </div>
                  </div>

                  <button onClick={handlePayNow}
                    className="w-full py-3.5 px-5 rounded-xl text-white font-black text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 mt-1">
                    ✓ Konfirmasi Pembayaran
                  </button>
                  <button onClick={() => { setStep('selection'); setTimerActive(false); setTimeLeft(15 * 60); }}
                    className="w-full py-2 px-5 rounded-xl text-stone-500 font-bold text-xs hover:text-stone-700 transition-colors cursor-pointer text-center">
                    Batal & Kembali
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 4: LOADING 
            ══════════════════════════════════════════════════════ */}
        {step === 'loading' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-12 flex flex-col items-center gap-5 animate-fade-in-up">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-stone-100 flex items-center justify-center">
                  <svg className="animate-spin h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-black text-stone-800">Memproses Pesanan...</h3>
                <p className="text-xs text-stone-500 mt-1">Menerbitkan e-tiket dan menyimpan data ke database</p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 5: SUCCESS 
            ══════════════════════════════════════════════════════ */}
        {step === 'success' && registeredUser && (
          <div className="max-w-md mx-auto">
            <div className="bg-white border border-emerald-200 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white text-center">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-black">Pembayaran Berhasil!</h3>
                <p className="text-emerald-100 text-xs mt-1 font-medium">E-tiket Anda telah berhasil diterbitkan</p>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Nama</span>
                    <span className="font-bold text-stone-900">{registeredUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Kode Tiket</span>
                    <span className="font-black text-teal-600 tracking-wider">{registeredUser.ticket_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Jenis Tiket</span>
                    <span className={`font-bold ${registeredUser.ticket_type === 'VIP' ? 'text-amber-600' : 'text-teal-600'}`}>
                      {registeredUser.ticket_type === 'VIP' ? '👑 VIP' : '🎫 Regular'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Status</span>
                    <span className="font-bold text-emerald-600">✓ LUNAS</span>
                  </div>
                </div>
                <p className="text-center text-xs text-stone-400 animate-pulse">Membuka halaman tiket digital Anda...</p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-400 font-medium">
        &copy; {new Date().getFullYear()} Evendance — Powered by secure event technology
      </footer>
    </div>
  );
}
