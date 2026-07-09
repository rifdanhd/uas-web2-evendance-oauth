"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Halaman Pendaftaran Evendance.
 * Desain Google UI Aesthetic (Light Mode, Clean, Minimalis, Tanpa Emoji).
 * Mendukung pemilihan event dinamis dari API backend.
 */
export default function DaftarPage() {
  // State daftar event
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // State form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [ticketType, setTicketType] = useState('REGULAR');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentProof, setPaymentProof] = useState('');

  // State flow
  const [step, setStep] = useState(1); // 1=form, 2=pembayaran VIP, 3=sukses
  const [isLoading, setIsLoading] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch semua event dari API
  useEffect(() => {
    fetch('http://localhost:5001/events')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setEvents(list);

        // Baca event_id dari query param URL
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const qEventId = params.get('event_id');
          if (qEventId && list.find(e => e.id.toString() === qEventId)) {
            setSelectedEventId(qEventId);
            setSelectedEvent(list.find(e => e.id.toString() === qEventId));
          } else if (list.length > 0) {
            setSelectedEventId(list[0].id.toString());
            setSelectedEvent(list[0]);
          }
        }
      })
      .catch(err => console.error('Gagal mengambil event:', err));
  }, []);

  // Perbarui selectedEvent setiap kali selectedEventId berubah
  useEffect(() => {
    if (selectedEventId && events.length > 0) {
      const found = events.find(e => e.id.toString() === selectedEventId);
      setSelectedEvent(found || null);
    }
  }, [selectedEventId, events]);

  const vipPrice = selectedEvent ? parseInt(selectedEvent.price_vip, 10) : 150000;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedEventId) {
      setErrorMsg('Silakan pilih event terlebih dahulu.');
      return;
    }

    if (ticketType === 'VIP' && !paymentMethod) {
      setStep(2);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5001/register-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase().replace(/\s+/g, ''),
          email: email.trim().toLowerCase(),
          ticket_type: ticketType,
          event_id: parseInt(selectedEventId, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pendaftaran gagal.');
      setRegisteredUser(data.user);
      localStorage.setItem('peserta_ticket', JSON.stringify({ ...data.user, event_id: parseInt(selectedEventId, 10) }));
      setStep(3);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentProof.trim()) {
      setErrorMsg('Nomor referensi / bukti pembayaran wajib diisi.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5001/register-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase().replace(/\s+/g, ''),
          email: email.trim().toLowerCase(),
          ticket_type: 'VIP',
          event_id: parseInt(selectedEventId, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pendaftaran gagal.');
      setRegisteredUser(data.user);
      localStorage.setItem('peserta_ticket', JSON.stringify({ ...data.user, event_id: parseInt(selectedEventId, 10) }));
      setStep(3);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" style={{ fontFamily: "'Inter', 'Google Sans', sans-serif" }}>

      {/* NAVIGASI */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3.5 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1a73e8] flex items-center justify-center text-white font-bold text-sm shadow-sm">E</div>
            <span className="text-base font-semibold text-slate-900 tracking-tight">Evendance</span>
          </Link>
          <Link href="/tiket" className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-full hover:bg-slate-100 transition-colors">
            Cek Tiket
          </Link>
        </div>
      </nav>

      {/* KONTEN UTAMA */}
      <main className="max-w-xl mx-auto px-4 py-10">

        {/* STEP 1: FORM PENDAFTARAN */}
        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-[#1a73e8] px-6 py-5 text-white">
              <h1 className="text-lg font-bold">Formulir Pendaftaran</h1>
              <p className="text-xs text-blue-100 mt-1">Isi data diri Anda untuk mendapatkan tiket digital.</p>
            </div>

            <form onSubmit={handleFormSubmit} className="px-6 py-6 flex flex-col gap-5">

              {/* Pilih Event */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="eventSelect" className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Pilih Program Event
                </label>
                <select
                  id="eventSelect"
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  required
                >
                  {events.length === 0 && <option value="">Memuat event...</option>}
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
                {selectedEvent && (
                  <div className="mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                      {selectedEvent.location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {new Date(selectedEvent.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                )}
              </div>

              {/* Nama */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nama Lengkap</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Masukkan nama lengkap Anda"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="username" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Username</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Contoh: budisantoso"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Alamat Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="nama@contoh.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Jenis Tiket */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Kategori Tiket</label>
                <div className="grid grid-cols-2 gap-3">
                  {['REGULAR', 'VIP'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTicketType(type)}
                      className={`rounded-xl border-2 p-3.5 text-left transition-all cursor-pointer ${ticketType === type ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <div className={`font-bold text-sm ${ticketType === type ? 'text-blue-700' : 'text-slate-700'}`}>{type}</div>
                      <div className={`text-[11px] mt-0.5 ${ticketType === type ? 'text-blue-600' : 'text-slate-400'}`}>
                        {type === 'REGULAR' ? 'Gratis' : `Rp ${vipPrice.toLocaleString('id-ID')}`}
                      </div>
                      <div className={`text-[10px] mt-1.5 leading-relaxed ${ticketType === type ? 'text-blue-500' : 'text-slate-400'}`}>
                        {type === 'REGULAR' ? 'Akses sesi umum' : 'Akses penuh + kursi prioritas'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ringkasan */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex flex-col gap-1.5">
                <div className="font-bold text-slate-700 text-sm mb-1">Ringkasan Pendaftaran</div>
                <div className="flex justify-between">
                  <span>Kategori Tiket</span>
                  <span className="font-semibold">{ticketType}</span>
                </div>
                {selectedEvent && (
                  <div className="flex justify-between">
                    <span>Event</span>
                    <span className="font-semibold truncate max-w-[180px] text-right">{selectedEvent.title}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200 mt-1">
                  <span>Total Biaya</span>
                  <span>{ticketType === 'REGULAR' ? 'Gratis' : `Rp ${vipPrice.toLocaleString('id-ID')}`}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#1a73e8] hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors cursor-pointer disabled:bg-slate-300"
              >
                {isLoading ? 'Memproses...' : ticketType === 'VIP' ? 'Lanjut ke Pembayaran' : 'Daftar Sekarang'}
              </button>

              <div className="text-center text-[11px] text-slate-400">
                Sudah terdaftar?{' '}
                <Link href="/tiket" className="text-blue-600 font-bold hover:underline">Cek tiket Anda</Link>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: PEMBAYARAN VIP */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-amber-500 px-6 py-5 text-white">
              <h1 className="text-lg font-bold">Pembayaran Tiket VIP</h1>
              <p className="text-xs text-amber-100 mt-1">Selesaikan pembayaran dan masukkan bukti transfer untuk konfirmasi.</p>
            </div>

            <div className="px-6 py-6 flex flex-col gap-5">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <div className="font-bold text-base mb-1">Total Tagihan: Rp {vipPrice.toLocaleString('id-ID')}</div>
                <div className="text-[11px] text-amber-600">Tiket VIP — {selectedEvent?.title}</div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Metode Pembayaran</label>
                {[
                  { id: 'bca', label: 'BCA Virtual Account', desc: '1234-5678-9012-3456' },
                  { id: 'mandiri', label: 'Mandiri Virtual Account', desc: '9876-5432-1098-7654' },
                  { id: 'qris', label: 'QRIS', desc: 'Scan QR Code dari aplikasi dompet digital Anda' },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col gap-0.5 border-2 rounded-xl p-3.5 text-left transition-all cursor-pointer ${paymentMethod === m.id ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <div className={`text-xs font-bold ${paymentMethod === m.id ? 'text-amber-800' : 'text-slate-700'}`}>{m.label}</div>
                    <div className={`text-[11px] ${paymentMethod === m.id ? 'text-amber-600' : 'text-slate-400'}`}>{m.desc}</div>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="paymentProof" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nomor Referensi / Bukti Transfer</label>
                <input
                  id="paymentProof"
                  type="text"
                  placeholder="Contoh: TXN20261115-001"
                  value={paymentProof}
                  onChange={e => setPaymentProof(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handlePaymentSubmit}
                disabled={isLoading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-sm transition-colors cursor-pointer disabled:bg-slate-300"
              >
                {isLoading ? 'Memproses...' : 'Konfirmasi Pembayaran'}
              </button>

              <button
                onClick={() => { setStep(1); setErrorMsg(''); }}
                className="w-full py-2.5 text-slate-500 hover:text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Kembali ke Form Pendaftaran
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUKSES */}
        {step === 3 && registeredUser && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-center">
            <div className="bg-green-500 px-6 py-5 text-white flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold">Pendaftaran Berhasil!</h2>
              <p className="text-xs text-green-100">Tiket digital Anda telah diterbitkan.</p>
            </div>

            <div className="px-6 py-6 flex flex-col gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex flex-col gap-2 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Nama</span>
                  <span className="font-bold text-slate-800">{registeredUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Email</span>
                  <span className="font-semibold text-slate-700 truncate max-w-[180px]">{registeredUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Kode Tiket</span>
                  <span className="font-mono font-bold text-blue-600">{registeredUser.ticket_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Kategori</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${registeredUser.ticket_type === 'VIP' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                    {registeredUser.ticket_type}
                  </span>
                </div>
              </div>

              <Link
                href="/tiket"
                className="block w-full py-3 bg-[#1a73e8] hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors text-center"
              >
                Lihat Tiket Saya
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
