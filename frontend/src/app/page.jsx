"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Halaman Utama (Landing Page) Evendance.
 * Menampilkan informasi event, countdown timer, benefit, dan CTA pembelian tiket.
 */

// Komponen Countdown Timer
function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const units = [
    { label: 'Hari', value: timeLeft.days },
    { label: 'Jam', value: timeLeft.hours },
    { label: 'Menit', value: timeLeft.minutes },
    { label: 'Detik', value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      {units.map((u, i) => (
        <div key={u.label} className="flex items-center gap-3 sm:gap-4">
          <div className="flex flex-col items-center">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2.5 sm:py-4 min-w-[52px] sm:min-w-[72px] text-center">
              <span className="text-2xl sm:text-4xl font-black text-white tabular-nums leading-none">
                {String(u.value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-[9px] sm:text-[11px] font-bold text-white/50 uppercase tracking-widest mt-1.5">{u.label}</span>
          </div>
          {i < 3 && <span className="text-white/30 font-black text-xl sm:text-3xl mb-4">:</span>}
        </div>
      ))}
    </div>
  );
}

// Komponen tiket card
function TicketCard({ type, price, features, isVip, ctaText }) {
  return (
    <div className={`relative rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col ${isVip ? 'border-amber-400/60 bg-gradient-to-b from-amber-950/60 to-stone-900/80 shadow-xl shadow-amber-900/20' : 'border-white/10 bg-white/5 shadow-lg'}`}>
      {isVip && (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400"></div>
      )}
      {isVip && (
        <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[9px] font-black uppercase tracking-widest">
          🔥 Terbatas
        </div>
      )}
      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4">
          <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${isVip ? 'text-amber-400' : 'text-teal-400'}`}>{type}</div>
          <div className={`text-3xl font-black ${isVip ? 'text-amber-300' : 'text-white'}`}>
            {price === 0 ? 'GRATIS' : `Rp ${price.toLocaleString('id-ID')}`}
          </div>
          {price > 0 && <div className="text-xs text-white/40 font-medium mt-0.5">per orang</div>}
        </div>

        <div className="flex flex-col gap-2.5 flex-1 mb-6">
          {features.map(f => (
            <div key={f} className="flex items-start gap-2.5 text-sm">
              <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isVip ? 'text-amber-400' : 'text-teal-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-white/70 font-medium">{f}</span>
            </div>
          ))}
        </div>

        <Link href="/daftar" className={`w-full py-3 rounded-xl font-bold text-sm text-center transition-all active:scale-[0.98] ${isVip ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-lg shadow-amber-500/20' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'}`}>
          {ctaText}
        </Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [stats, setStats] = useState({ total: 0, vip: 0, regular: 0 });

  const EVENT_DATE = '2026-11-15T08:00:00';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetch('http://localhost:5001/users')
      .then(r => r.json())
      .then(data => {
        const users = Array.isArray(data) ? data : [];
        setStats({
          total: users.length,
          vip: users.filter(u => u.ticket_type === 'VIP').length,
          regular: users.filter(u => u.ticket_type === 'REGULAR' || !u.ticket_type).length,
        });
        setStatsLoaded(true);
      })
      .catch(() => setStatsLoaded(true));
  }, []);

  const speakers = [
    { name: 'Dr. Ari Wibowo', role: 'AI & Future of Work', emoji: '🧠', org: 'MIT Indonesia' },
    { name: 'Sarah Putri', role: 'Startup Ecosystem', emoji: '🚀', org: 'Founders Club ID' },
    { name: 'Budi Santoso', role: 'Digital Transformation', emoji: '💡', org: 'Telkom Digital' },
    { name: 'Linda Chen', role: 'Product Design', emoji: '🎨', org: 'Google x AIGA' },
  ];

  const agenda = [
    { time: '08.00', title: 'Registrasi & Welcome Coffee', type: 'info' },
    { time: '09.00', title: 'Opening Ceremony & Keynote', type: 'main' },
    { time: '10.30', title: 'Panel Discussion: Future of Tech', type: 'main' },
    { time: '12.00', title: 'Lunch Break (VIP Premium Lunch)', type: 'break' },
    { time: '13.30', title: 'Workshop Paralel (4 track)', type: 'workshop' },
    { time: '15.30', title: 'Networking Session & Expo', type: 'info' },
    { time: '17.00', title: 'Closing & Door Prize', type: 'main' },
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── STICKY NAVBAR ───────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-stone-950/90 backdrop-blur-md border-b border-white/10 shadow-xl shadow-black/20' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-teal-500/30">E</div>
            <span className="text-lg font-black tracking-tight">Evendance</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-white/60">
            <a href="#tentang" className="hover:text-white transition-colors">Tentang</a>
            <a href="#speaker" className="hover:text-white transition-colors">Speaker</a>
            <a href="#agenda" className="hover:text-white transition-colors">Agenda</a>
            <a href="#tiket" className="hover:text-white transition-colors">Tiket</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tiket/login" className="text-xs font-bold text-white/60 px-3 py-1.5 hover:text-white transition-colors">
              Tiket Saya
            </Link>
            <Link href="/daftar" className="text-xs font-black px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-white transition-all shadow-lg shadow-teal-500/20">
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-950/40 via-stone-950 to-stone-950"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute top-40 right-10 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px'}}></div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center pt-28 pb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400 text-xs font-bold mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
            Pendaftaran Resmi Dibuka
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">Evendance</span>
            <br />
            <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Annual Conference
            </span>
          </h1>

          <p className="text-white/50 text-base sm:text-lg font-medium max-w-xl mx-auto mb-8 leading-relaxed">
            Satu hari penuh bersama para pemimpin industri, inovator, dan komunitas teknologi terbaik Indonesia.{' '}
            <strong className="text-white/70">15 November 2026</strong> — Jakarta Convention Center.
          </p>

          <div className="flex flex-col items-center gap-3 mb-10">
            <span className="text-xs font-bold text-white/30 uppercase tracking-widest">Mulai dalam</span>
            <CountdownTimer targetDate={EVENT_DATE} />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/daftar" className="px-8 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black text-base shadow-xl shadow-teal-500/20 transition-all active:scale-[0.98] hover:shadow-teal-500/30 hover:shadow-2xl">
              🎫 Dapatkan Tiket Sekarang
            </Link>
            <a href="#agenda" className="px-8 py-4 rounded-xl border border-white/15 hover:border-white/30 hover:bg-white/5 text-white/70 hover:text-white font-bold text-base transition-all">
              Lihat Agenda →
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/20">
          <span className="text-[10px] font-bold uppercase tracking-widest">Scroll</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── STATS BANNER ────────────────────────────────────── */}
      <section className="bg-white/5 border-y border-white/10 backdrop-blur-sm py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { label: 'Peserta Terdaftar', value: statsLoaded ? stats.total : '...', suffix: '+' },
            { label: 'Tiket VIP Tersisa', value: Math.max(0, 50 - (statsLoaded ? stats.vip : 0)), suffix: '' },
            { label: 'Speaker Expert', value: '12', suffix: '+' },
            { label: 'Workshop Track', value: '4', suffix: '' },
          ].map(s => (
            <div key={s.label} className="flex flex-col gap-1">
              <div className="text-3xl font-black text-white">{s.value}{s.suffix}</div>
              <div className="text-xs font-semibold text-white/40 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TENTANG SECTION ─────────────────────────────────── */}
      <section id="tentang" className="py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">Tentang Event</div>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-5">
              Bertemu, Belajar, dan<br />
              <span className="text-teal-400">Tumbuh Bersama</span>
            </h2>
            <p className="text-white/50 text-sm leading-relaxed mb-5">
              Evendance Annual Conference adalah event tahunan yang mempertemukan para profesional, pelajar, dan penggiat teknologi dari seluruh Indonesia. Satu hari penuh dipenuhi sesi inspiratif, workshop hands-on, dan kesempatan networking eksklusif.
            </p>
            <p className="text-white/50 text-sm leading-relaxed">
              Dengan sistem pendaftaran digital terintegrasi dan e-tiket berbasis QR Code, kami memastikan pengalaman terbaik dari proses pendaftaran hingga hari-H event.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { emoji: '🎯', title: 'Sesi Inspiratif', desc: 'Keynote dari para pemimpin industri terkemuka' },
              { emoji: '🛠️', title: 'Workshop', desc: '4 track paralel sesuai minat & keahlian Anda' },
              { emoji: '🤝', title: 'Networking', desc: 'Terhubung dengan 500+ profesional dan startup' },
              { emoji: '🎁', title: 'VIP Experience', desc: 'Merchandise pack & meet & greet speaker eksklusif' },
            ].map(f => (
              <div key={f.title} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all">
                <div className="text-2xl mb-2">{f.emoji}</div>
                <div className="text-sm font-bold text-white mb-1">{f.title}</div>
                <div className="text-xs text-white/40 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPEAKER SECTION ─────────────────────────────────── */}
      <section id="speaker" className="py-20 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">Featured Speakers</div>
            <h2 className="text-3xl sm:text-4xl font-black">Belajar dari yang Terbaik</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {speakers.map(s => (
              <div key={s.name} className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-500/30 hover:bg-white/8 transition-all group">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-900 to-stone-800 border border-white/10 flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform shadow-xl">
                  {s.emoji}
                </div>
                <div className="text-sm font-black text-white leading-tight">{s.name}</div>
                <div className="text-[11px] font-semibold text-teal-400 mt-0.5">{s.role}</div>
                <div className="text-[10px] text-white/30 font-medium mt-1">{s.org}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENDA SECTION ──────────────────────────────────── */}
      <section id="agenda" className="py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">Rundown Acara</div>
          <h2 className="text-3xl sm:text-4xl font-black">Jadwal Event</h2>
          <p className="text-white/40 text-sm mt-2">Sabtu, 15 November 2026 · Jakarta Convention Center</p>
        </div>
        <div className="flex flex-col gap-0">
          {agenda.map((item, i) => (
            <div key={i} className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ring-2 ring-offset-2 ring-offset-stone-950 ${item.type === 'main' ? 'bg-teal-400 ring-teal-500/50' : item.type === 'break' ? 'bg-amber-400 ring-amber-500/50' : item.type === 'workshop' ? 'bg-purple-400 ring-purple-500/50' : 'bg-white/20 ring-white/10'}`}></div>
                {i < agenda.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1 mb-1"></div>}
              </div>
              <div className="flex items-start gap-4 pb-4 flex-1 group-hover:bg-white/3 transition-colors rounded-xl px-3 py-1.5 -ml-3">
                <span className="text-xs font-black text-white/30 font-mono w-12 shrink-0 mt-0.5">{item.time}</span>
                <div>
                  <span className="text-sm font-bold text-white/80">{item.title}</span>
                  {item.type === 'break' && <span className="ml-2 text-[9px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">VIP</span>}
                  {item.type === 'workshop' && <span className="ml-2 text-[9px] font-black text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">Workshop</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TIKET SECTION ───────────────────────────────────── */}
      <section id="tiket" className="py-24 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">Pilihan Tiket</div>
            <h2 className="text-3xl sm:text-4xl font-black">Pilih Tiket Anda</h2>
            <p className="text-white/40 text-sm mt-2 max-w-md mx-auto">Tiket tersedia terbatas. Segera daftarkan diri sebelum kehabisan.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <TicketCard
              type="Regular Ticket"
              price={0}
              ctaText="Daftar Gratis →"
              isVip={false}
              features={[
                'Akses semua sesi konferensi',
                'Coffee break & snack',
                'Sertifikat digital peserta',
                'Networking session',
                'E-tiket QR Code',
              ]}
            />
            <TicketCard
              type="VIP Ticket 👑"
              price={150000}
              ctaText="Beli VIP Ticket →"
              isVip={true}
              features={[
                'Semua benefit Regular',
                'Premium Lunch eksklusif',
                'Exclusive Merchandise Pack 🎁',
                'Kursi VIP barisan depan ⭐',
                'Meet & Greet dengan speaker 🤝',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-950/60 to-emerald-950/60"></div>
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
        <div className="relative z-10 max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">
            Jangan Lewatkan<br />
            <span className="text-teal-400">Event of the Year</span>
          </h2>
          <p className="text-white/50 mb-8 text-sm sm:text-base font-medium leading-relaxed">
            Ribuan profesional dan pelajar sudah bergabung. Sekarang giliran Anda.
          </p>
          <Link href="/daftar" className="inline-block px-10 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black text-lg shadow-2xl shadow-teal-500/20 transition-all active:scale-[0.97] hover:shadow-teal-400/30">
            🎫 Dapatkan Tiket Sekarang
          </Link>
          <div className="mt-5 text-xs text-white/25 font-medium">
            Sudah punya tiket?{' '}
            <Link href="/tiket/login" className="text-teal-500/60 hover:text-teal-400 transition-colors">
              Lihat E-Tiket Anda →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-black text-xs">E</div>
            <span className="text-sm font-black text-white/60">Evendance</span>
          </div>
          <p className="text-xs text-white/20 font-medium text-center">
            &copy; {new Date().getFullYear()} Evendance — Sistem Manajemen Event & Registrasi Digital
          </p>
          <div className="flex items-center gap-4 text-xs text-white/30 font-semibold">
            <Link href="/login" className="hover:text-white/60 transition-colors">Admin Login</Link>
            <Link href="/scan" className="hover:text-white/60 transition-colors">Scanner QR</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
