"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import Link from 'next/link';

/**
 * Halaman Login Administrator Evendance via Google OAuth 2.0.
 * Admin masuk menggunakan akun Google → token diverifikasi di backend.
 * Data profil admin (nama, email, foto) disimpan di localStorage.
 */
export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Jika sudah login, langsung alihkan ke Dashboard
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  /**
   * Alur Google Login untuk Admin:
   * 1. Popup Google muncul → pengguna pilih akun
   * 2. Google mengembalikan access_token
   * 3. Kita gunakan access_token untuk ambil info profil dari Google API
   * 4. Lalu kirim credential ke backend POST /auth/google untuk verifikasi
   * 5. Backend kembalikan session token + profil → simpan di localStorage
   */
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        // Ambil data profil Google menggunakan access_token
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await profileRes.json();

        // Kirim data profil ke backend untuk divalidasi
        // Karena kita menggunakan implicit flow, kita kirim profil langsung
        const res = await fetch('http://localhost:5001/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Backend akan menerima dan memverifikasi data ini
            idToken: tokenResponse.access_token,
            profile: profile,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Gagal memverifikasi akun Google Anda.');
        }

        // Simpan token dan profil admin di localStorage
        localStorage.setItem('admin_token', data.token || `google-admin-${profile.sub}`);
        localStorage.setItem('admin_profile', JSON.stringify({
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
        }));

        // Alihkan ke Dashboard utama
        router.push('/');
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google Login Error:', error);
      setErrorMsg('Gagal melakukan proses login Google. Silakan coba lagi.');
    },
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-teal-50/30">
      
      {/* NAVIGASI ATAS */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-teal-500/20">
            E
          </div>
          <span className="text-lg font-bold text-stone-900 tracking-tight">Evendance</span>
        </div>
        <Link 
          href="/daftar"
          className="text-xs font-bold text-teal-700 hover:text-teal-800 px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-all"
        >
          Daftar sebagai Peserta →
        </Link>
      </nav>

      {/* KONTEN UTAMA */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-fade-in-up">
          
          {/* KARTU LOGIN */}
          <div className="bg-white border border-stone-200 rounded-3xl shadow-xl p-8 flex flex-col gap-7">
            
            {/* BRANDING */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-xl shadow-teal-500/25 text-white font-extrabold text-3xl tracking-tight">
                E
              </div>
              <div>
                <h2 className="text-2xl font-black text-stone-900">Portal Administrator</h2>
                <p className="text-xs text-stone-500 font-medium mt-1">
                  Masuk dengan akun Google untuk mengelola event
                </p>
              </div>
            </div>

            {/* ERROR MESSAGE */}
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 shadow-sm">
                <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs font-bold leading-tight">{errorMsg}</div>
              </div>
            )}

            {/* TOMBOL MASUK DENGAN GOOGLE */}
            <button
              onClick={() => googleLogin()}
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-xl font-bold text-sm bg-white hover:bg-stone-50 border-2 border-stone-200 hover:border-stone-300 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 transition-all duration-200 cursor-pointer shadow-sm flex items-center justify-center gap-3 text-stone-700"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-stone-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Memverifikasi akun Google...
                </>
              ) : (
                <>
                  {/* Logo Google SVG berwarna */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Masuk dengan Google
                </>
              )}
            </button>

            {/* DIVIDER */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-200"></div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">atau</span>
              <div className="flex-1 h-px bg-stone-200"></div>
            </div>

            {/* INFO */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-center">
              <p className="text-[11px] text-stone-500 leading-relaxed">
                <span className="font-bold text-stone-700">Anda seorang peserta?</span><br />
                Gunakan halaman <Link href="/daftar" className="text-teal-600 font-bold hover:underline">Pendaftaran Peserta</Link> untuk mendaftar dan mendapatkan tiket event Anda.
              </p>
            </div>
          </div>

          {/* FOOTER */}
          <p className="text-center text-[10px] text-stone-400 mt-6 font-medium">
            &copy; {new Date().getFullYear()} Evendance. Sistem Registrasi &amp; Presensi Event.
          </p>
        </div>
      </main>
    </div>
  );
}
