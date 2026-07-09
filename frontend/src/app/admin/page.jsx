"use client";

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [isVerifying, setIsVerifying] = useState(true);
  const [adminProfile, setAdminProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('peserta');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form Tambah Event
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCapacity, setEventCapacity] = useState('100');
  const [eventPriceVip, setEventPriceVip] = useState('150000');

  // Form Tambah Peserta
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userEventId, setUserEventId] = useState('');
  const [userTicketType, setUserTicketType] = useState('REGULAR');
  const [userPaymentStatus, setUserPaymentStatus] = useState('LUNAS');

  // Edit Modals
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ticketFilter, setTicketFilter] = useState('ALL');

  const notify = (ok, msg) => {
    if (ok) { setSuccessMsg(msg); setErrorMsg(''); }
    else { setErrorMsg(msg); setSuccessMsg(''); }
    setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 5000);
  };

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.push('/login'); return; }
    setIsVerifying(false);
    try { const p = localStorage.getItem('admin_profile'); if (p) setAdminProfile(JSON.parse(p)); } catch {}
  }, [router]);

  // Queries
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5001/events');
      if (!res.ok) throw new Error('Gagal memuat event.');
      return res.json();
    },
    enabled: !isVerifying,
  });

  useEffect(() => {
    if (events.length > 0 && !userEventId) setUserEventId(events[0].id.toString());
  }, [events, userEventId]);

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5001/users');
      if (!res.ok) throw new Error('Gagal memuat peserta.');
      return res.json();
    },
    enabled: !isVerifying,
  });

  // Event Mutations
  const createEventMutation = useMutation({
    mutationFn: async (body) => {
      const res = await fetch('http://localhost:5001/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error); return d;
    },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      notify(true, d.message || 'Event berhasil ditambahkan.');
      setEventTitle(''); setEventDesc(''); setEventDate(''); setEventLocation(''); setEventCapacity('100'); setEventPriceVip('150000');
    },
    onError: (e) => notify(false, e.message),
  });

  const updateEventMutation = useMutation({
    mutationFn: async (body) => {
      const res = await fetch(`http://localhost:5001/events/${body.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error); return d;
    },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      notify(true, d.message || 'Event diperbarui.'); setEditingEvent(null);
    },
    onError: (e) => notify(false, e.message),
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`http://localhost:5001/events/${id}`, { method: 'DELETE' });
      const d = await res.json(); if (!res.ok) throw new Error(d.error); return d;
    },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      notify(true, d.message || 'Event dihapus.');
    },
    onError: (e) => notify(false, e.message),
  });

  // Peserta Mutations
  const registerMutation = useMutation({
    mutationFn: async (body) => {
      const res = await fetch('http://localhost:5001/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error); return d;
    },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      notify(true, `Peserta berhasil didaftarkan. Tiket: ${d.user.ticket_code}`);
      setUserName(''); setUserUsername(''); setUserEmail(''); setUserTicketType('REGULAR'); setUserPaymentStatus('LUNAS');
    },
    onError: (e) => notify(false, e.message),
  });

  const updateUserMutation = useMutation({
    mutationFn: async (body) => {
      const res = await fetch(`http://localhost:5001/users/${body.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error); return d;
    },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      notify(true, d.message || 'Data peserta diperbarui.'); setEditingUser(null);
    },
    onError: (e) => notify(false, e.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`http://localhost:5001/users/${id}`, { method: 'DELETE' });
      const d = await res.json(); if (!res.ok) throw new Error(d.error); return d;
    },
    onSuccess: (d) => { queryClient.invalidateQueries({ queryKey: ['users'] }); notify(true, d.message || 'Peserta dihapus.'); },
    onError: (e) => notify(false, e.message),
  });

  const attendUserMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`http://localhost:5001/users/${id}/attend`, { method: 'PATCH' });
      const d = await res.json(); if (!res.ok) throw new Error(d.error); return d;
    },
    onSuccess: (d) => { queryClient.invalidateQueries({ queryKey: ['users'] }); notify(true, d.message || 'Kehadiran diverifikasi.'); },
    onError: (e) => notify(false, e.message),
  });

  const handleEventSubmit = (e) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate || !eventLocation.trim()) { notify(false, 'Judul, tanggal, dan lokasi wajib diisi.'); return; }
    createEventMutation.mutate({ title: eventTitle.trim(), description: eventDesc.trim(), date: eventDate, location: eventLocation.trim(), capacity: parseInt(eventCapacity, 10), price_vip: parseInt(eventPriceVip, 10) });
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (!userName.trim() || !userUsername.trim() || !userEmail.trim() || !userEventId) { notify(false, 'Semua kolom wajib diisi.'); return; }
    registerMutation.mutate({ name: userName.trim(), username: userUsername.trim().toLowerCase(), email: userEmail.trim().toLowerCase(), event_id: parseInt(userEventId, 10), ticket_type: userTicketType, payment_status: userPaymentStatus });
  };

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) return;
    const headers = ['Nama', 'Username', 'Email', 'Event', 'Kode Tiket', 'Jenis Tiket', 'Harga', 'Pembayaran', 'Kehadiran'];
    const rows = filteredUsers.map(u => [
      `"${u.name}"`, `"${u.username}"`, `"${u.email}"`,
      `"${(u.event_title || 'N/A')}"`, `"${u.ticket_code}"`,
      `"${u.ticket_type}"`, u.price || 0, `"${u.payment_status}"`,
      u.is_attended ? 'Hadir' : 'Belum Hadir',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `peserta-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const filteredUsers = users.filter(u => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.ticket_code.toLowerCase().includes(q);
    const matchEvent = eventFilter === 'ALL' || u.event_id?.toString() === eventFilter;
    const matchStatus = statusFilter === 'ALL' || (statusFilter === 'PRESENT' && u.is_attended) || (statusFilter === 'ABSENT' && !u.is_attended);
    const matchTicket = ticketFilter === 'ALL' || u.ticket_type === ticketFilter;
    return matchSearch && matchEvent && matchStatus && matchTicket;
  });

  const totalPeserta = users.length;
  const totalHadir = users.filter(u => u.is_attended).length;
  const rasio = totalPeserta > 0 ? Math.round((totalHadir / totalPeserta) * 100) : 0;
  const pendapatan = users.reduce((acc, u) => acc + (u.payment_status === 'LUNAS' ? (u.price || 0) : 0), 0);

  if (isVerifying) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
    </div>
  );

  // Shared input class
  const inp = "px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium w-full";

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-700" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1a73e8] flex items-center justify-center text-white font-bold text-base shadow-sm">E</div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Dashboard Admin Evendance</h1>
              <p className="text-[11px] text-slate-500 font-medium">Manajemen Event & Presensi Real-Time</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {adminProfile && (
              <span className="text-xs font-semibold text-slate-700 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 max-w-[150px] truncate">
                {adminProfile.name}
              </span>
            )}
            <Link href="/scan" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm">
              Scan Kamera
            </Link>
            <button onClick={() => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_profile'); router.push('/login'); }} className="px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs transition-colors shadow-sm cursor-pointer">
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex-1 w-full flex flex-col gap-6">

        {/* STATS */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Peserta', value: totalPeserta, sub: 'Semua event' },
            { label: 'Kehadiran', value: totalHadir, sub: `${totalPeserta - totalHadir} belum hadir` },
            { label: 'Rasio Kehadiran', value: `${rasio}%`, sub: 'Persentase verifikasi' },
            { label: 'Pendapatan VIP', value: `Rp ${pendapatan.toLocaleString('id-ID')}`, sub: 'Status lunas' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{s.value}</div>
              <div className="text-[10px] text-slate-500 mt-1">{s.sub}</div>
            </div>
          ))}
        </section>

        {/* ALERTS */}
        {(successMsg || errorMsg) && (
          <div>
            {successMsg && (
              <div className="p-3.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {/* TABS */}
        <div className="border-b border-slate-200 flex gap-6">
          {[['peserta', 'Kelola Peserta'], ['events', 'Kelola Event']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`pb-3 font-semibold text-sm transition-all relative cursor-pointer ${activeTab === key ? 'text-[#1a73e8]' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
              {activeTab === key && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#1a73e8] rounded-full"/>}
            </button>
          ))}
        </div>

        {/* ===== TAB PESERTA ===== */}
        {activeTab === 'peserta' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Tambah */}
            <div className="lg:col-span-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Tambah Peserta</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Daftarkan peserta ke event secara manual.</p>
                </div>
                <form onSubmit={handleUserSubmit} className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Event</label>
                    <select value={userEventId} onChange={e => setUserEventId(e.target.value)} className={inp}>
                      {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Nama Lengkap</label>
                    <input type="text" placeholder="Nama lengkap" value={userName} onChange={e => setUserName(e.target.value)} className={inp} required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Username</label>
                    <input type="text" placeholder="username" value={userUsername} onChange={e => setUserUsername(e.target.value)} className={inp} required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Email</label>
                    <input type="email" placeholder="email@contoh.com" value={userEmail} onChange={e => setUserEmail(e.target.value)} className={inp} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Jenis Tiket</label>
                      <select value={userTicketType} onChange={e => { setUserTicketType(e.target.value); if (e.target.value === 'REGULAR') setUserPaymentStatus('LUNAS'); }} className={inp}>
                        <option value="REGULAR">Regular</option>
                        <option value="VIP">VIP</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Pembayaran</label>
                      <select value={userPaymentStatus} onChange={e => setUserPaymentStatus(e.target.value)} disabled={userTicketType === 'REGULAR'} className={`${inp} disabled:opacity-50`}>
                        <option value="LUNAS">Lunas</option>
                        <option value="PENDING">Pending</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={registerMutation.isPending} className="w-full mt-1 py-2 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold text-xs shadow-sm cursor-pointer disabled:bg-slate-300">
                    {registerMutation.isPending ? 'Mendaftarkan...' : 'Daftar Peserta'}
                  </button>
                </form>
              </div>
            </div>

            {/* Tabel Peserta */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Daftar Peserta</h2>
                    <p className="text-[11px] text-slate-500">Total terfilter: {filteredUsers.length} orang</p>
                  </div>
                  {filteredUsers.length > 0 && (
                    <button onClick={handleExportCSV} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs cursor-pointer">
                      Ekspor CSV
                    </button>
                  )}
                </div>
                {/* Filter Row */}
                <div className="p-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-1">
                    <input type="text" placeholder="Cari nama, email, kode tiket..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={inp} />
                  </div>
                  <select value={eventFilter} onChange={e => setEventFilter(e.target.value)} className={inp}>
                    <option value="ALL">Semua Event</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                  </select>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inp}>
                    <option value="ALL">Kehadiran (Semua)</option>
                    <option value="PRESENT">Hadir</option>
                    <option value="ABSENT">Belum Hadir</option>
                  </select>
                  <select value={ticketFilter} onChange={e => setTicketFilter(e.target.value)} className={inp}>
                    <option value="ALL">Tiket (Semua)</option>
                    <option value="REGULAR">Regular</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                {isLoadingUsers ? (
                  <div className="py-12 text-center text-xs text-slate-500">Memuat peserta...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-medium">Tidak ada peserta yang cocok.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-2.5 px-4">Nama & Email</th>
                          <th className="py-2.5 px-4">Event</th>
                          <th className="py-2.5 px-4">Tiket</th>
                          <th className="py-2.5 px-4">Hadir</th>
                          <th className="py-2.5 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredUsers.map(user => (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{user.name}</div>
                              <div className="text-[10px] text-slate-400">{user.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-700 truncate max-w-[120px]" title={user.event_title}>{user.event_title || '-'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-mono text-blue-600 text-[10px]">{user.ticket_code}</div>
                              <div className="flex gap-1 mt-0.5">
                                <span className={`px-1 text-[9px] font-bold rounded ${user.ticket_type === 'VIP' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{user.ticket_type}</span>
                                <span className={`px-1 text-[9px] font-bold rounded ${user.payment_status === 'LUNAS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{user.payment_status}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.is_attended ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                {user.is_attended ? 'Hadir' : 'Absen'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex gap-1.5">
                                {!user.is_attended && (
                                  <button onClick={() => attendUserMutation.mutate(user.id)} className="px-2 py-1 rounded bg-green-50 hover:bg-green-600 hover:text-white border border-green-200 text-green-700 font-bold text-[10px] cursor-pointer transition-colors">Hadir</button>
                                )}
                                <button onClick={() => setEditingUser(user)} className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-[10px] cursor-pointer">Edit</button>
                                <button onClick={() => { if (confirm(`Hapus "${user.name}"?`)) deleteUserMutation.mutate(user.id); }} className="p-1 rounded bg-red-50 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 cursor-pointer transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB EVENT ===== */}
        {activeTab === 'events' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Tambah Event */}
            <div className="lg:col-span-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Buat Event Baru</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tambahkan program seminar atau workshop.</p>
                </div>
                <form onSubmit={handleEventSubmit} className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Judul Event</label>
                    <input type="text" placeholder="Judul program event" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className={inp} required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Deskripsi</label>
                    <textarea placeholder="Deskripsi singkat event..." value={eventDesc} onChange={e => setEventDesc(e.target.value)} rows={3} className={`${inp} resize-none`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Waktu Pelaksanaan</label>
                    <input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} className={inp} required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Lokasi / Venue</label>
                    <input type="text" placeholder="Nama lokasi atau Zoom" value={eventLocation} onChange={e => setEventLocation(e.target.value)} className={inp} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Kapasitas</label>
                      <input type="number" min="1" value={eventCapacity} onChange={e => setEventCapacity(e.target.value)} className={inp} required />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Tarif VIP (Rp)</label>
                      <input type="number" min="0" value={eventPriceVip} onChange={e => setEventPriceVip(e.target.value)} className={inp} required />
                    </div>
                  </div>
                  <button type="submit" disabled={createEventMutation.isPending} className="w-full mt-1 py-2 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold text-xs shadow-sm cursor-pointer disabled:bg-slate-300">
                    {createEventMutation.isPending ? 'Menambahkan...' : 'Buat Event'}
                  </button>
                </form>
              </div>
            </div>

            {/* Tabel Event */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Daftar Event</h2>
                  <p className="text-[11px] text-slate-500">{events.length} program event aktif</p>
                </div>
                {isLoadingEvents ? (
                  <div className="py-12 text-center text-xs text-slate-500">Memuat event...</div>
                ) : events.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-medium">Belum ada event terdaftar.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-2.5 px-4">Nama Program</th>
                          <th className="py-2.5 px-4">Tanggal & Lokasi</th>
                          <th className="py-2.5 px-4">Peserta</th>
                          <th className="py-2.5 px-4">VIP</th>
                          <th className="py-2.5 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {events.map(ev => (
                          <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{ev.title}</div>
                              <div className="text-[10px] text-slate-400 line-clamp-1 max-w-[180px]">{ev.description || 'Tanpa deskripsi'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-700">{new Date(ev.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                              <div className="text-[10px] text-slate-400">{ev.location}</div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700">{ev.participant_count || 0} / {ev.capacity}</td>
                            <td className="py-3 px-4 font-semibold text-slate-700">Rp {parseInt(ev.price_vip, 10).toLocaleString('id-ID')}</td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex gap-1.5">
                                <button onClick={() => setEditingEvent(ev)} className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-[10px] cursor-pointer">Edit</button>
                                <button onClick={() => { if (confirm(`Hapus event "${ev.title}" beserta seluruh pesertanya?`)) deleteEventMutation.mutate(ev.id); }} className="p-1 rounded bg-red-50 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 cursor-pointer transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL EDIT PESERTA */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Edit Data Peserta</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer">Tutup</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); updateUserMutation.mutate({ id: editingUser.id, name: editingUser.name, username: editingUser.username, email: editingUser.email, event_id: editingUser.event_id, ticket_type: editingUser.ticket_type, payment_status: editingUser.payment_status }); }} className="p-5 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Event</label>
                <select value={editingUser.event_id || ''} onChange={e => setEditingUser({ ...editingUser, event_id: parseInt(e.target.value, 10) })} className={inp}>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Nama Lengkap</label>
                <input type="text" value={editingUser.name || ''} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className={inp} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Username</label>
                <input type="text" value={editingUser.username || ''} onChange={e => setEditingUser({ ...editingUser, username: e.target.value })} className={inp} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Email</label>
                <input type="email" value={editingUser.email || ''} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className={inp} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Jenis Tiket</label>
                  <select value={editingUser.ticket_type || 'REGULAR'} onChange={e => setEditingUser({ ...editingUser, ticket_type: e.target.value, payment_status: e.target.value === 'REGULAR' ? 'LUNAS' : editingUser.payment_status })} className={inp}>
                    <option value="REGULAR">Regular</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Pembayaran</label>
                  <select value={editingUser.payment_status || 'LUNAS'} onChange={e => setEditingUser({ ...editingUser, payment_status: e.target.value })} disabled={editingUser.ticket_type === 'REGULAR'} className={`${inp} disabled:opacity-50`}>
                    <option value="LUNAS">Lunas</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={updateUserMutation.isPending} className="w-full mt-1 py-2 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-sm disabled:bg-slate-300">
                {updateUserMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT EVENT */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Edit Data Event</h3>
              <button onClick={() => setEditingEvent(null)} className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer">Tutup</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); updateEventMutation.mutate({ id: editingEvent.id, title: editingEvent.title, description: editingEvent.description, date: editingEvent.date, location: editingEvent.location, capacity: parseInt(editingEvent.capacity, 10), price_vip: parseInt(editingEvent.price_vip, 10) }); }} className="p-5 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Judul Event</label>
                <input type="text" value={editingEvent.title || ''} onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })} className={inp} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Deskripsi</label>
                <textarea value={editingEvent.description || ''} onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })} rows={3} className={`${inp} resize-none`} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Waktu</label>
                <input type="datetime-local" value={editingEvent.date ? new Date(editingEvent.date).toISOString().slice(0, 16) : ''} onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })} className={inp} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Lokasi</label>
                <input type="text" value={editingEvent.location || ''} onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value })} className={inp} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Kapasitas</label>
                  <input type="number" min="1" value={editingEvent.capacity || ''} onChange={e => setEditingEvent({ ...editingEvent, capacity: e.target.value })} className={inp} required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Tarif VIP (Rp)</label>
                  <input type="number" min="0" value={editingEvent.price_vip || ''} onChange={e => setEditingEvent({ ...editingEvent, price_vip: e.target.value })} className={inp} required />
                </div>
              </div>
              <button type="submit" disabled={updateEventMutation.isPending} className="w-full mt-1 py-2 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-sm disabled:bg-slate-300">
                {updateEventMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="py-5 border-t border-slate-200 text-center text-xs text-slate-400 font-semibold bg-white">
        &copy; {new Date().getFullYear()} Evendance. Dashboard Administrator.
      </footer>
    </div>
  );
}
