"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Halaman Utama Evendance.
 * Desain Google UI Aesthetic (Light Mode, Clean, Minimalis, Tanpa Emoji).
 * Menampilkan daftar event secara dinamis dari API backend.
 */
export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [nextEvent, setNextEvent] = useState(null);

  // Fetch events dari backend
  useEffect(() => {
    fetch('http://localhost:5001/events')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setEvents(list);
        // Cari event terdekat berikutnya
        const now = new Date();
        const upcoming = list
          .filter(e => new Date(e.date) > now)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        if (upcoming.length > 0) setNextEvent(upcoming[0]);
      })
      .catch(() => {})
      .finally(() => setIsLoadingEvents(false));
  }, []);

  // Hitung mundur ke event terdekat
  useEffect(() => {
    if (!nextEvent) return;
    const target = new Date(nextEvent.date);
    const tick = () => {
      const diff = target - new Date();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextEvent]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const benefits = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      color: 'bg-blue-50 text-blue-600',
      title: 'Tiket Digital QR',
      desc: 'Tiket digital dengan QR Code unik dikirimkan langsung ke email Anda setelah pendaftaran berhasil.',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: 'bg-green-50 text-green-600',
      title: 'Verifikasi Kehadiran',
      desc: 'Sistem presensi otomatis berbasis scan QR Code. Cepat, akurat, dan bebas antrian panjang.',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'bg-yellow-50 text-yellow-600',
      title: 'Pendaftaran Cepat',
      desc: 'Cukup satu klik masuk dengan akun Google atau isi form sederhana. Selesai dalam hitungan detik.',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-red-50 text-red-600',
      title: 'Komunitas Terpilih',
      desc: 'Bergabung bersama ratusan profesional dan pelajar terbaik dalam ekosistem teknologi Indonesia.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800" style={{ fontFamily: "'Inter', 'Google Sans', sans-serif" }}>

      {/* NAVIGASI */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3.5 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a73e8] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              E
            </div>
            <span className="text-base font-semibold text-slate-900 tracking-tight">Evendance</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tiket" className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-full hover:bg-slate-100 transition-colors">
              Cek Tiket
            </Link>
            <Link href="/login" className="text-xs font-semibold text-white bg-[#1a73e8] hover:bg-blue-700 px-4 py-2 rounded-full transition-colors shadow-sm">
              Masuk Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6">
          Platform Manajemen Event Digital
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight mb-5">
          Kelola Event, Tiket, dan Presensi
          <span className="block text-[#1a73e8]">dalam Satu Platform</span>
        </h1>
        <p className="text-base text-slate-500 max-w-2xl mx-auto leading-relaxed mb-8">
          Evendance menyederhanakan pendaftaran peserta, penerbitan tiket digital, dan verifikasi kehadiran berbasis QR Code untuk seminar, workshop, dan konferensi.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href={events.length > 0 ? `/daftar?event_id=${events[0]?.id}` : '/daftar'} className="px-6 py-2.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold text-sm rounded-full shadow-sm transition-colors">
            Daftar Sekarang
          </Link>
          <Link href="/tiket" className="px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-full border border-slate-300 shadow-sm transition-colors">
            Cek Tiket Saya
          </Link>
        </div>
      </section>

      {/* COUNTDOWN SECTION (Tampil jika ada event mendatang) */}
      {nextEvent && (
        <section className="max-w-3xl mx-auto px-6 mb-14">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-8 py-6 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Event Terdekat Berikutnya</p>
            <h3 className="text-base font-bold text-slate-900 mb-4">{nextEvent.title}</h3>
            <div className="flex items-center justify-center gap-4">
              {[
                { val: countdown.days, label: 'Hari' },
                { val: countdown.hours, label: 'Jam' },
                { val: countdown.minutes, label: 'Menit' },
                { val: countdown.seconds, label: 'Detik' },
              ].map(({ val, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-2xl font-bold text-slate-900 tabular-nums">{String(val).padStart(2, '0')}</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* DAFTAR EVENT */}
      <section className="max-w-5xl mx-auto px-6 mb-16">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Program Event</h2>
          <p className="text-sm text-slate-500 mt-1">Pilih program yang ingin Anda ikuti dan daftarkan diri sekarang.</p>
        </div>

        {isLoadingEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 animate-pulse h-52" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400 font-medium">
            Belum ada event aktif yang tersedia. Periksa kembali nanti.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event, idx) => {
              const colorAccents = ['border-blue-200', 'border-green-200', 'border-amber-200', 'border-red-200'];
              const accent = colorAccents[idx % colorAccents.length];
              return (
                <div key={event.id} className={`bg-white border ${accent} rounded-2xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow`}>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{event.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{event.description}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 text-[11px] text-slate-500 mt-auto">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {formatDate(event.date)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {event.location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /></svg>
                      Kapasitas: {event.participant_count || 0} / {event.capacity} peserta
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">VIP</div>
                      <div className="text-xs font-bold text-slate-700">Rp {parseInt(event.price_vip, 10).toLocaleString('id-ID')}</div>
                    </div>
                    <Link
                      href={`/daftar?event_id=${event.id}`}
                      className="px-3.5 py-1.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold text-[11px] rounded-full transition-colors shadow-sm"
                    >
                      Daftar
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* BENEFIT SECTION */}
      <section className="max-w-5xl mx-auto px-6 mb-20">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Mengapa Evendance?</h2>
          <p className="text-sm text-slate-500 mt-1">Fitur lengkap dirancang untuk memudahkan penyelenggara dan peserta.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((b, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
              <div className={`w-9 h-9 rounded-xl ${b.color} flex items-center justify-center mb-3`}>
                {b.icon}
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">{b.title}</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FOOTER SECTION */}
      <section className="bg-slate-50 border-t border-slate-200 py-12 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Siap Bergabung?</h2>
          <p className="text-sm text-slate-500 mb-6">Daftarkan diri Anda dalam hitungan detik dan dapatkan tiket digital yang siap digunakan.</p>
          <Link href="/daftar" className="inline-block px-7 py-3 bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold text-sm rounded-full shadow-sm transition-colors">
            Mulai Pendaftaran
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-6 border-t border-slate-200 text-center text-xs text-slate-400 font-semibold bg-white">
        &copy; {new Date().getFullYear()} Evendance. Platform manajemen event digital terpercaya.
      </footer>
    </div>
  );
}
