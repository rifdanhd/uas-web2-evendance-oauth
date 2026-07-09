"use client";

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Halaman Dashboard Utama Evendance dengan proteksi login admin.
 * Dilengkapi fitur Pencarian, Filter Kehadiran, Ekspor CSV, dan Statistik Real-time.
 */
export default function Dashboard() {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  // State proteksi login
  const [isVerifying, setIsVerifying] = useState(true);
  
  // Profil admin dari Google OAuth (nama, email, foto)
  const [adminProfile, setAdminProfile] = useState(null);

  // State untuk form input pendaftaran
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  
  // State untuk pencarian dan filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'PRESENT', 'ABSENT'
  
  // State untuk notifikasi feedback pengguna
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // PROTEKSI ROUTE: Verifikasi keberadaan token sesi admin di localStorage
  // Juga memuat profil admin dari Google jika tersedia
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/login');
    } else {
      setIsVerifying(false);
      // Muat profil Google admin yang tersimpan dari proses login
      const profile = localStorage.getItem('admin_profile');
      if (profile) {
        try { setAdminProfile(JSON.parse(profile)); } catch (e) { /* abaikan parse error */ }
      }
    }
  }, [router]);

  // 1. QUERY: Mengambil seluruh daftar peserta dari Backend API
  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5001/users');
      if (!res.ok) {
        throw new Error('Gagal memuat data dari server.');
      }
      return res.json();
    },
    enabled: !isVerifying, // hanya jalankan query jika sudah terverifikasi login
  });

  // 2. MUTATION: Mengirim data registrasi peserta baru
  const registerMutation = useMutation({
    mutationFn: async (newUser) => {
      const res = await fetch('http://localhost:5001/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || 'Pendaftaran gagal.');
      }
      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      setName('');
      setUsername('');
      setEmail('');
      
      setSuccessMsg(`Pendaftaran berhasil! Kode Tiket: ${data.user.ticket_code}`);
      setErrorMsg('');
      
      setTimeout(() => setSuccessMsg(''), 8000);
    },
    onError: (err) => {
      setErrorMsg(err.message);
      setSuccessMsg('');
    },
  });

  // Handler Submit Form
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name.trim() || !username.trim() || !email.trim()) {
      setErrorMsg('Semua kolom formulir pendaftaran wajib diisi.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Format alamat email tidak valid.');
      return;
    }

    registerMutation.mutate({
      name: name.trim(),
      username: username.trim().toLowerCase().replace(/\s+/g, ''),
      email: email.trim().toLowerCase(),
    });
  };

  // Handler Logout
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_profile');
    router.push('/login');
  };

  // Handler Ekspor ke CSV dengan UTF-8 BOM agar kompatibel dengan Microsoft Excel
  const handleExportCSV = () => {
    if (users.length === 0) return;

    // Header baris pertama
    const headers = ['Nama Lengkap', 'Username', 'Alamat Email', 'Kode Tiket', 'Status Kehadiran', 'Tanggal Terdaftar'];
    
    // Baris data peserta
    const rows = users.map(user => [
      `"${user.name.replace(/"/g, '""')}"`,
      `"${user.username}"`,
      `"${user.email}"`,
      `"${user.ticket_code}"`,
      user.is_attended ? 'Hadir' : 'Belum Hadir',
      `"${new Date(user.created_at).toLocaleString('id-ID')}"`
    ]);

    // Menggabungkan data menjadi format CSV string
    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Membuat Blob dengan prefix UTF-8 BOM (\uFEFF) agar terbaca rapi di Excel
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `evendance-peserta-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Logika Filter dan Pencarian di Sisi Frontend
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.ticket_code.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PRESENT') return matchesSearch && user.is_attended;
    if (statusFilter === 'ABSENT') return matchesSearch && !user.is_attended;
    return matchesSearch;
  });

  // Kalkulasi statistik peserta
  const totalPeserta = users.length;
  const totalHadir = users.filter(u => u.is_attended).length;
  const persentaseHadir = totalPeserta > 0 ? Math.round((totalHadir / totalPeserta) * 100) : 0;

  // Tampilan transisi pemeriksaan login
  if (isVerifying) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-stone-50 min-h-screen text-stone-500">
        <svg className="animate-spin h-10 w-10 text-teal-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold">Memverifikasi sesi masuk admin...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* HEADER UTAMA / NAVBAR */}
      <header className="glass-card sticky top-0 z-50 px-6 py-4 border-b border-stone-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white font-extrabold text-xl tracking-tight">
              E
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">Evendance</h1>
              <p className="text-xs text-stone-500 font-medium">Sistem Registrasi & Presensi Event Real-Time</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Profil Admin Google */}
            {adminProfile && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={adminProfile.picture} 
                  alt="Foto Admin" 
                  className="w-6 h-6 rounded-full border border-stone-300"
                />
                <span className="text-xs font-bold text-stone-700 max-w-[120px] truncate hidden sm:inline">{adminProfile.name}</span>
              </div>
            )}

            {/* Tombol Kamera Scan */}
            <Link 
              href="/scan"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-md shadow-teal-500/10 hover:translate-y-[-1px] active:translate-y-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 20h2M4 8h2m8 0h2M5 12h2m0 4h2M4 16h2M6 20h2m4-16h2m4 0h2m-4 12h2M4 4h4v4H4V4zm0 12h4v4H4v-4zm12-12h4v4h-4V4z" />
              </svg>
              Pindai QR Kamera
            </Link>

            {/* Tombol Logout */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs border border-stone-200 transition-all cursor-pointer hover:translate-y-[-1px] active:translate-y-0"
            >
              <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* BODY DASHBOARD */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex-1 w-full flex flex-col gap-8">
        
        {/* KARTU STATISTIK */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-stone-200 flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300">
            <div className="text-stone-500 text-sm font-semibold tracking-wide uppercase">Total Peserta</div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-stone-900">{totalPeserta}</span>
              <span className="text-sm text-stone-500 font-medium">orang</span>
            </div>
            <div className="text-xs text-stone-400 mt-2">Telah terdaftar dalam sistem</div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-stone-200 flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300">
            <div className="text-stone-500 text-sm font-semibold tracking-wide uppercase">Kehadiran (Presensi)</div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-emerald-600">{totalHadir}</span>
              <span className="text-sm text-stone-500 font-medium">/ {totalPeserta}</span>
            </div>
            <div className="text-xs text-emerald-600 mt-2 font-medium">Peserta telah diverifikasi hadir</div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-stone-200 flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300">
            <div className="text-stone-500 text-sm font-semibold tracking-wide uppercase">Rasio Kehadiran</div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-teal-600">{persentaseHadir}%</span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2 mt-3 overflow-hidden">
              <div 
                className="bg-teal-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${persentaseHadir}%` }}
              ></div>
            </div>
          </div>
        </section>

        {/* ALERTS FEEDBACK */}
        {(successMsg || errorMsg) && (
          <div className="w-full transition-all duration-300">
            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 shadow-sm">
                <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm font-semibold">{successMsg}</div>
              </div>
            )}
            
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-sm">
                <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm font-semibold">{errorMsg}</div>
              </div>
            )}
          </div>
        )}

        {/* GRID TATA LETAK 2 KOLOM */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* KOLOM KIRI: FORM PENDAFTARAN */}
          <div className="lg:col-span-5">
            <div className="glass-card p-8 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Pendaftaran Peserta Baru</h2>
                <p className="text-sm text-stone-500 mt-1">Masukkan data lengkap peserta untuk menerbitkan tiket acara.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="text-sm font-semibold text-stone-700">Nama Lengkap</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Contoh: Budi Santoso"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={registerMutation.isPending}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white disabled:bg-stone-100 text-sm font-medium"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="username" className="text-sm font-semibold text-stone-700">Username</label>
                  <input
                    id="username"
                    type="text"
                    placeholder="Contoh: budis"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={registerMutation.isPending}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white disabled:bg-stone-100 text-sm font-medium"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-semibold text-stone-700">Alamat Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Contoh: budi.santoso@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={registerMutation.isPending}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white disabled:bg-stone-100 text-sm font-medium"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full mt-2 py-3 px-5 rounded-xl text-white font-semibold text-sm bg-teal-600 hover:bg-teal-700 active:scale-[0.98] disabled:bg-stone-300 disabled:active:scale-100 transition-all duration-250 cursor-pointer shadow-md shadow-teal-500/10 flex items-center justify-center gap-2"
                >
                  {registerMutation.isPending ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Mendaftarkan...
                    </>
                  ) : (
                    'Daftar Sekarang'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* KOLOM KANAN: TABEL PESERTA DENGAN PENCARIAN & FILTER */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="glass-card rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex-1 flex flex-col">
              
              {/* Bagian Judul Tabel */}
              <div className="p-6 border-b border-stone-200 bg-white/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Daftar Peserta Terdaftar</h2>
                  <p className="text-sm text-stone-500 mt-1">Daftar seluruh pendaftar event.</p>
                </div>
                {/* Tombol Ekspor CSV */}
                {users.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold text-xs transition-all shadow-sm cursor-pointer hover:translate-y-[-1px] active:translate-y-0 self-start sm:self-auto"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Ekspor CSV
                  </button>
                )}
              </div>

              {/* BAR KONTROL: PENCARIAN & FILTER STATUS */}
              {!isLoading && !isError && users.length > 0 && (
                <div className="p-4 border-b border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row gap-3">
                  {/* Kolom Pencarian */}
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Cari nama, email, atau kode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full rounded-xl border border-stone-300 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Filter Status (Grouped Buttons) */}
                  <div className="flex gap-1 bg-stone-200/60 p-1 rounded-xl self-start sm:self-auto">
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setStatusFilter('PRESENT')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'PRESENT' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                      Hadir
                    </button>
                    <button
                      onClick={() => setStatusFilter('ABSENT')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'ABSENT' ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                      Belum Hadir
                    </button>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-stone-500">
                  <svg className="animate-spin h-8 w-8 text-teal-600 mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm font-semibold">Memuat daftar peserta...</span>
                </div>
              )}

              {isError && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-stone-500">
                  <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xl mb-4">!</div>
                  <span className="text-sm font-semibold text-rose-700">Error: {error.message}</span>
                </div>
              )}

              {!isLoading && !isError && users.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-stone-400">
                  <svg className="w-12 h-12 text-stone-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-sm font-medium">Belum ada peserta yang mendaftar.</span>
                </div>
              )}

              {/* DATA DITEMUKAN SETELAH PENCARIAN/FILTER */}
              {!isLoading && !isError && users.length > 0 && filteredUsers.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-stone-400">
                  <svg className="w-10 h-10 text-stone-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-semibold">Tidak ada peserta yang cocok dengan kriteria kueri.</span>
                </div>
              )}

              {/* TABEL DATA PESERTA */}
              {!isLoading && !isError && filteredUsers.length > 0 && (
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-100/80 border-b border-stone-200 text-xs font-bold text-stone-600 tracking-wider">
                        <th className="py-3.5 px-6">Nama & Email</th>
                        <th className="py-3.5 px-6">Username</th>
                        <th className="py-3.5 px-6">Status Kehadiran</th>
                        <th className="py-3.5 px-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white/30 text-sm">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-stone-900">{user.name}</div>
                            <div className="text-xs text-stone-500 mt-0.5">{user.email}</div>
                          </td>
                          <td className="py-4 px-6 text-stone-600 font-medium">
                            @{user.username}
                          </td>
                          <td className="py-4 px-6">
                            {user.is_attended ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Hadir
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-200 text-stone-700 border border-stone-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                                Belum Hadir
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {!user.is_attended ? (
                              <Link 
                                href={`/users/${user.id}`}
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-teal-50 border border-teal-200 hover:bg-teal-600 hover:text-white hover:border-teal-600 text-teal-700 font-bold text-xs transition-all duration-200 shadow-sm"
                              >
                                Verifikasi Presensi
                              </Link>
                            ) : (
                              <Link 
                                href={`/users/${user.id}`}
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200 text-stone-600 font-bold text-xs transition-all duration-200"
                              >
                                Detail Tiket
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>

        </section>
      </main>

      <footer className="py-6 border-t border-stone-200 mt-auto text-center text-xs text-stone-400 font-medium">
        &copy; {new Date().getFullYear()} Evendance. Dibuat dengan penuh dedikasi.
      </footer>
    </div>
  );
}
