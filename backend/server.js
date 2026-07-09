import express from 'express';
import cors from 'cors';
import qr from 'qr-image';
import { OAuth2Client } from 'google-auth-library';
import pool from './db.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Inisialisasi Google OAuth2 Client menggunakan Client ID dari .env
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware untuk memproses JSON request body
app.use(express.json());

// Konfigurasi CORS agar Next.js di port 3000 dapat berinteraksi dengan backend
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * Helper: Verifikasi Google Access Token dengan memanggil Google Userinfo API.
 * Jika token valid, Google mengembalikan data profil pengguna.
 * Jika token tidak valid/expired, Google mengembalikan error 401.
 */
async function verifyGoogleAccessToken(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error('Token Google tidak valid atau sudah kedaluwarsa.');
  }
  return res.json(); // { sub, name, email, picture, ... }
}

/**
 * Helper: Membuat Ticket Code unik (EVT-[5 HURUF]-[3 ANGKA])
 */
async function generateUniqueTicketCode(name) {
  const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const prefix = cleanName.slice(0, 5) || 'USER';
  
  let attempts = 0;
  while (attempts < 10) {
    const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const code = `EVT-${prefix}-${randomDigits}`;
    const checkRes = await pool.query('SELECT 1 FROM users WHERE ticket_code = $1', [code]);
    if (checkRes.rowCount === 0) return code;
    attempts++;
  }
  return `EVT-${prefix}-${Date.now().toString().slice(-3)}`;
}

/* ============================================================
   ROUTE GOOGLE OAUTH: Login Admin via Google
   ============================================================ */
app.post('/auth/google', async (req, res) => {
  const { idToken, profile } = req.body;
  // idToken di sini sebenarnya adalah access_token dari implicit flow
  const accessToken = idToken;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access Token Google tidak ditemukan.' });
  }

  try {
    // Verifikasi access token Google di sisi server (aman dari pemalsuan)
    const payload = await verifyGoogleAccessToken(accessToken);

    // Ambil daftar email admin dari .env
    const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
    const whitelistedEmails = adminEmailsEnv.split(',').map(e => e.trim().toLowerCase());

    if (!whitelistedEmails.includes(payload.email.toLowerCase())) {
      console.warn(`Attempted unauthorized admin login by: ${payload.email}`);
      return res.status(403).json({ 
        error: 'Email Anda tidak terdaftar sebagai Administrator. Gunakan akun Google Admin yang sah.' 
      });
    }

    return res.status(200).json({
      success: true,
      token: `google-admin-token-${payload.sub}`,
      user: {
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
        googleId: payload.sub,
      },
      message: `Selamat datang, ${payload.name}!`,
    });
  } catch (err) {
    console.error('Error verifikasi token Google admin:', err);
    return res.status(401).json({ error: 'Token Google tidak valid atau sudah kedaluwarsa.' });
  }
});

/* ============================================================
   ROUTE PESERTA: Daftar Mandiri Menggunakan Akun Google
   ============================================================ */
app.post('/register-self', async (req, res) => {
  const { idToken, ticket_type } = req.body;
  let { event_id } = req.body;
  // idToken di sini sebenarnya adalah access_token dari implicit flow
  const accessToken = idToken;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access Token Google tidak ditemukan.' });
  }

  if (!event_id) {
    const eventRes = await pool.query('SELECT id FROM events ORDER BY id ASC LIMIT 1');
    event_id = eventRes.rows[0]?.id;
  }

  try {
    const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [event_id]);
    if (eventCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Event tidak ditemukan.' });
    }
    const targetEvent = eventCheck.rows[0];

    // Verifikasi identitas peserta melalui Google access token
    const payload = await verifyGoogleAccessToken(accessToken);

    const { name, email, sub: googleId } = payload;
    
    // Cek apakah peserta dengan email ini sudah terdaftar untuk event ini sebelumnya
    const existing = await pool.query('SELECT * FROM users WHERE email = $1 AND event_id = $2', [email.toLowerCase(), event_id]);
    if (existing.rowCount > 0) {
      // Jika sudah terdaftar, kembalikan data tiket yang ada (bukan error)
      return res.status(200).json({
        message: 'Anda sudah terdaftar untuk event ini. Tiket Anda ditampilkan di bawah.',
        alreadyRegistered: true,
        user: existing.rows[0],
      });
    }

    // Membuat username otomatis dari bagian awal email (sebelum @)
    const rawUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    let username = rawUsername;
    
    // Pastikan username unik dengan menambahkan angka acak jika perlu
    const usernameCheck = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (usernameCheck.rowCount > 0) {
      username = `${rawUsername}${Math.floor(Math.random() * 900) + 100}`;
    }

    const ticketType = ticket_type === 'VIP' ? 'VIP' : 'REGULAR';
    const price = ticketType === 'VIP' ? targetEvent.price_vip : 0;
    const paymentStatus = ticketType === 'VIP' ? 'PENDING' : 'LUNAS';

    // Generate kode tiket unik
    const ticketCode = await generateUniqueTicketCode(name);

    // Simpan peserta baru ke database
    const result = await pool.query(
      `INSERT INTO users (name, username, email, ticket_code, ticket_type, price, payment_status, event_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, username, email.toLowerCase(), ticketCode, ticketType, price, paymentStatus, event_id]
    );

    return res.status(201).json({
      message: 'Pendaftaran berhasil! Selamat datang di Evendance.',
      alreadyRegistered: false,
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Error registrasi mandiri peserta:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email atau username Anda sudah terdaftar.' });
    }
    return res.status(500).json({ error: 'Gagal memproses pendaftaran. Coba lagi.' });
  }
});

/* ============================================================
   ROUTE PESERTA: Ambil Tiket Sendiri Berdasarkan Email Google
   ============================================================ */
app.get('/my-ticket/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const result = await pool.query(`
      SELECT u.*, e.title as event_title, e.location as event_location, e.date as event_date
      FROM users u
      LEFT JOIN events e ON u.event_id = e.id
      WHERE LOWER(u.email) = $1
      ORDER BY u.created_at DESC
    `, [decodeURIComponent(email).toLowerCase()]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tiket tidak ditemukan. Silakan daftar terlebih dahulu.' });
    }
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error mengambil tiket peserta:', err);
    return res.status(500).json({ error: 'Gagal mengambil data tiket.' });
  }
});

/* ============================================================
   ROUTE PESERTA: Daftar Mandiri Tanpa Google (Manual)
   ============================================================ */
app.post('/register-manual', async (req, res) => {
  const { name, username, email, ticket_type } = req.body;
  let { event_id } = req.body;
  if (!name || !username || !email) {
    return res.status(400).json({ error: 'Nama, username, dan email wajib diisi.' });
  }

  if (!event_id) {
    const eventRes = await pool.query('SELECT id FROM events ORDER BY id ASC LIMIT 1');
    event_id = eventRes.rows[0]?.id;
  }

  try {
    const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [event_id]);
    if (eventCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Event tidak ditemukan.' });
    }
    const targetEvent = eventCheck.rows[0];

    const ticketType = ticket_type === 'VIP' ? 'VIP' : 'REGULAR';
    const price = ticketType === 'VIP' ? targetEvent.price_vip : 0;
    const paymentStatus = ticketType === 'VIP' ? 'PENDING' : 'LUNAS';

    // Cek apakah email sudah terdaftar untuk event ini
    const existing = await pool.query('SELECT * FROM users WHERE email = $1 AND event_id = $2', [email.trim().toLowerCase(), event_id]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Alamat email sudah terdaftar untuk event ini.' });
    }

    // Generate kode tiket unik
    const ticketCode = await generateUniqueTicketCode(name);

    // Simpan ke database
    const result = await pool.query(
      `INSERT INTO users (name, username, email, ticket_code, ticket_type, price, payment_status, event_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name.trim(), username.trim().toLowerCase().replace(/\s+/g, ''), email.trim().toLowerCase(), ticketCode, ticketType, price, paymentStatus, event_id]
    );

    return res.status(201).json({
      message: 'Pendaftaran manual berhasil! Tiket Anda telah diterbitkan.',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Error pendaftaran manual peserta:', err);
    if (err.code === '23505') {
      if (err.detail?.includes('username')) return res.status(400).json({ error: 'Username sudah digunakan oleh peserta lain.' });
      if (err.detail?.includes('email')) return res.status(400).json({ error: 'Alamat email sudah terdaftar.' });
    }
    return res.status(500).json({ error: 'Terjadi kesalahan saat memproses pendaftaran manual.' });
  }
});

/* ============================================================
   ROUTE PESERTA: Login Tiket untuk Pengguna Manual (via Email / Kode Tiket)
   ============================================================ */
app.post('/tickets/login-manual', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'Email atau Kode Tiket wajib dimasukkan.' });
  }

  const cleanQuery = identifier.trim().toLowerCase();

  try {
    const result = await pool.query(`
      SELECT u.*, e.title as event_title, e.location as event_location, e.date as event_date
      FROM users u
      LEFT JOIN events e ON u.event_id = e.id
      WHERE LOWER(u.email) = $1 OR LOWER(u.ticket_code) = $1
      ORDER BY u.created_at DESC
    `, [cleanQuery]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tiket tidak ditemukan. Pastikan email atau kode tiket Anda benar.' });
    }

    return res.status(200).json({
      message: 'Akses tiket berhasil dikonfirmasi.',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Error login tiket manual:', err);
    return res.status(500).json({ error: 'Gagal memproses akses tiket.' });
  }
});

/* ============================================================
   ROUTE PESERTA: Simulasikan Konfirmasi Pembayaran Tiket VIP
   ============================================================ */
app.post('/tickets/confirm-payment', async (req, res) => {
  const { ticketCode } = req.body;
  if (!ticketCode) {
    return res.status(400).json({ error: 'Kode tiket wajib dikirimkan.' });
  }

  try {
    const checkUser = await pool.query('SELECT name, payment_status FROM users WHERE ticket_code = $1', [ticketCode]);
    if (checkUser.rowCount === 0) {
      return res.status(404).json({ error: 'Tiket tidak ditemukan.' });
    }

    if (checkUser.rows[0].payment_status === 'LUNAS') {
      return res.status(200).json({ message: 'Pembayaran tiket ini sudah lunas sebelumnya.' });
    }

    const result = await pool.query(
      "UPDATE users SET payment_status = 'LUNAS' WHERE ticket_code = $1 RETURNING *",
      [ticketCode]
    );

    return res.status(200).json({
      message: `Pembayaran tiket VIP atas nama "${result.rows[0].name}" berhasil disimulasikan!`,
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Error konfirmasi pembayaran:', err);
    return res.status(500).json({ error: 'Gagal melakukan verifikasi simulasi pembayaran.' });
  }
});

/* ============================================================
   ROUTE ADMIN: Login Statis (Fallback)
   ============================================================ */
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    return res.status(200).json({
      success: true,
      token: 'mock-session-token-evendance-2026',
      message: 'Login berhasil sebagai Administrator.'
    });
  }
  return res.status(401).json({ error: 'Username atau password Administrator salah.' });
});

/* ============================================================
   ROUTE: Ambil Semua Peserta
   ============================================================ */
app.get('/users', async (req, res) => {
  const { event_id } = req.query;
  try {
    let query = `
      SELECT u.*, e.title as event_title, e.location as event_location, e.date as event_date 
      FROM users u
      LEFT JOIN events e ON u.event_id = e.id
    `;
    const params = [];
    if (event_id) {
      query += ` WHERE u.event_id = $1`;
      params.push(event_id);
    }
    query += ` ORDER BY u.created_at DESC`;
    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error saat mengambil data peserta:', err);
    res.status(500).json({ error: 'Gagal mengambil data peserta dari database.' });
  }
});

/* ============================================================
   ROUTE: Detail Peserta Berdasarkan ID
   ============================================================ */
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT u.*, e.title as event_title, e.location as event_location, e.date as event_date, e.description as event_description
      FROM users u
      LEFT JOIN events e ON u.event_id = e.id
      WHERE u.id = $1
    `, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil detail peserta.' });
  }
});

/* ============================================================
   ROUTE: Cari Peserta Berdasarkan Kode Tiket (untuk Scanner)
   ============================================================ */
app.get('/users/ticket/:ticket_code', async (req, res) => {
  const { ticket_code } = req.params;
  try {
    const result = await pool.query(`
      SELECT u.*, e.title as event_title, e.location as event_location, e.date as event_date
      FROM users u
      LEFT JOIN events e ON u.event_id = e.id
      WHERE u.ticket_code = $1
    `, [ticket_code]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tiket peserta tidak terdaftar dalam sistem.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Gagal melakukan pencarian tiket.' });
  }
});

/* ============================================================
   ROUTE: Daftarkan Peserta Baru (oleh Admin)
   ============================================================ */
app.post('/register', async (req, res) => {
  const { name, username, email, ticket_type, payment_status } = req.body;
  let { event_id } = req.body;
  if (!name || !username || !email) {
    return res.status(400).json({ error: 'Nama, username, dan email wajib diisi.' });
  }

  if (!event_id) {
    const eventRes = await pool.query('SELECT id FROM events ORDER BY id ASC LIMIT 1');
    event_id = eventRes.rows[0]?.id;
  }

  try {
    const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [event_id]);
    if (eventCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Event tidak ditemukan.' });
    }
    const targetEvent = eventCheck.rows[0];

    const ticketType = ticket_type === 'VIP' ? 'VIP' : 'REGULAR';
    const price = ticketType === 'VIP' ? targetEvent.price_vip : 0;
    const paymentStatus = payment_status || (ticketType === 'VIP' ? 'PENDING' : 'LUNAS');

    // Cek apakah email sudah terdaftar untuk event ini
    const existing = await pool.query('SELECT * FROM users WHERE email = $1 AND event_id = $2', [email.trim().toLowerCase(), event_id]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Alamat email sudah terdaftar untuk event ini.' });
    }

    const ticketCode = await generateUniqueTicketCode(name);
    const query = `INSERT INTO users (name, username, email, ticket_code, ticket_type, price, payment_status, event_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
    const result = await pool.query(query, [name.trim(), username.trim().toLowerCase(), email.trim().toLowerCase(), ticketCode, ticketType, price, paymentStatus, event_id]);
    res.status(201).json({ message: 'Pendaftaran berhasil.', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      if (err.detail?.includes('username')) return res.status(400).json({ error: 'Username sudah digunakan oleh peserta lain.' });
      if (err.detail?.includes('email')) return res.status(400).json({ error: 'Alamat email sudah terdaftar.' });
      return res.status(400).json({ error: 'Username atau Email sudah terdaftar sebelumnya.' });
    }
    res.status(500).json({ error: 'Terjadi kesalahan sistem saat mendaftarkan peserta.' });
  }
});

/* ============================================================
   ROUTE: Update Data Peserta (oleh Admin)
   ============================================================ */
app.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, username, email, ticket_type, payment_status, event_id } = req.body;
  try {
    const checkUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (checkUser.rowCount === 0) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    }
    const current = checkUser.rows[0];

    const updatedName = name !== undefined ? name.trim() : current.name;
    const updatedUsername = username !== undefined ? username.trim().toLowerCase().replace(/\s+/g, '') : current.username;
    const updatedEmail = email !== undefined ? email.trim().toLowerCase() : current.email;
    const updatedTicketType = ticket_type !== undefined ? ticket_type : current.ticket_type;
    const updatedPaymentStatus = payment_status !== undefined ? payment_status : current.payment_status;
    const updatedEventId = event_id !== undefined ? parseInt(event_id, 10) : current.event_id;

    // Ambil harga tiket berdasarkan event_id dan ticket_type
    let price = current.price;
    if (updatedTicketType !== current.ticket_type || updatedEventId !== current.event_id) {
      if (updatedTicketType === 'VIP') {
        const eventRes = await pool.query('SELECT price_vip FROM events WHERE id = $1', [updatedEventId]);
        price = eventRes.rows[0]?.price_vip || 150000;
      } else {
        price = 0;
      }
    }

    const query = `
      UPDATE users 
      SET name = $1, username = $2, email = $3, ticket_type = $4, payment_status = $5, event_id = $6, price = $7
      WHERE id = $8
      RETURNING *
    `;
    const result = await pool.query(query, [
      updatedName,
      updatedUsername,
      updatedEmail,
      updatedTicketType,
      updatedPaymentStatus,
      updatedEventId,
      price,
      id
    ]);

    res.status(200).json({ message: 'Data peserta berhasil diperbarui.', user: result.rows[0] });
  } catch (err) {
    console.error('Error saat memperbarui data peserta:', err);
    if (err.code === '23505') {
      if (err.detail?.includes('username')) return res.status(400).json({ error: 'Username sudah digunakan oleh peserta lain.' });
      if (err.detail?.includes('email')) return res.status(400).json({ error: 'Alamat email sudah terdaftar.' });
    }
    res.status(500).json({ error: 'Gagal memperbarui data peserta.' });
  }
});

/* ============================================================
   ROUTE: Verifikasi Kehadiran Peserta
   ============================================================ */
app.patch('/users/:id/attend', async (req, res) => {
  const { id } = req.params;
  try {
    const checkUser = await pool.query('SELECT name, is_attended FROM users WHERE id = $1', [id]);
    if (checkUser.rowCount === 0) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    const user = checkUser.rows[0];
    if (user.is_attended) {
      return res.status(200).json({ message: `Peserta atas nama "${user.name}" sudah diverifikasi hadir sebelumnya.` });
    }
    const updateResult = await pool.query('UPDATE users SET is_attended = true WHERE id = $1 RETURNING *', [id]);
    res.status(200).json({ message: `Kehadiran peserta "${user.name}" berhasil diverifikasi.`, user: updateResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Gagal melakukan verifikasi kehadiran.' });
  }
});

/* ============================================================
   ROUTE: Hapus Peserta Berdasarkan ID (oleh Admin)
   ============================================================ */
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const checkUser = await pool.query('SELECT name FROM users WHERE id = $1', [id]);
    if (checkUser.rowCount === 0) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    }
    const name = checkUser.rows[0].name;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.status(200).json({ message: `Peserta "${name}" berhasil dihapus dari database.` });
  } catch (err) {
    console.error('Error saat menghapus peserta:', err);
    res.status(500).json({ error: 'Gagal menghapus peserta.' });
  }
});

/* ============================================================
   ROUTE: Generate QR Code Dinamis
   ============================================================ */
app.get('/api/qr/:text', (req, res) => {
  const { text } = req.params;
  try {
    const qrPngStream = qr.image(text, { type: 'png', margin: 2, size: 8 });
    res.type('png');
    qrPngStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat QR Code.' });
  }
});

/* ============================================================
   ROUTES EVENT (CRUD Event untuk Admin)
   ============================================================ */
app.get('/events', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, COALESCE(COUNT(u.id), 0) as participant_count 
      FROM events e
      LEFT JOIN users u ON e.id = u.event_id
      GROUP BY e.id
      ORDER BY e.date ASC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error saat mengambil data event:', err);
    res.status(500).json({ error: 'Gagal mengambil data event dari database.' });
  }
});

app.get('/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT e.*, COALESCE(COUNT(u.id), 0) as participant_count 
      FROM events e
      LEFT JOIN users u ON e.id = u.event_id
      WHERE e.id = $1
      GROUP BY e.id
    `, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Event tidak ditemukan.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil detail event.' });
  }
});

app.post('/events', async (req, res) => {
  const { title, description, date, location, capacity, price_vip } = req.body;
  if (!title || !date || !location) {
    return res.status(400).json({ error: 'Judul, tanggal, dan lokasi event wajib diisi.' });
  }
  try {
    const result = await pool.query(`
      INSERT INTO events (title, description, date, location, capacity, price_vip)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      title.trim(),
      description ? description.trim() : '',
      date,
      location.trim(),
      capacity ? parseInt(capacity, 10) : 100,
      price_vip ? parseInt(price_vip, 10) : 150000
    ]);
    res.status(201).json({ message: 'Event berhasil dibuat.', event: result.rows[0] });
  } catch (err) {
    console.error('Error saat membuat event:', err);
    res.status(500).json({ error: 'Gagal membuat event baru.' });
  }
});

app.patch('/events/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, date, location, capacity, price_vip } = req.body;
  try {
    const checkEvent = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (checkEvent.rowCount === 0) {
      return res.status(404).json({ error: 'Event tidak ditemukan.' });
    }

    const current = checkEvent.rows[0];
    const updatedTitle = title !== undefined ? title.trim() : current.title;
    const updatedDesc = description !== undefined ? description.trim() : current.description;
    const updatedDate = date !== undefined ? date : current.date;
    const updatedLoc = location !== undefined ? location.trim() : current.location;
    const updatedCap = capacity !== undefined ? parseInt(capacity, 10) : current.capacity;
    const updatedPriceVip = price_vip !== undefined ? parseInt(price_vip, 10) : current.price_vip;

    const result = await pool.query(`
      UPDATE events 
      SET title = $1, description = $2, date = $3, location = $4, capacity = $5, price_vip = $6
      WHERE id = $7
      RETURNING *
    `, [updatedTitle, updatedDesc, updatedDate, updatedLoc, updatedCap, updatedPriceVip, id]);

    res.status(200).json({ message: 'Event berhasil diperbarui.', event: result.rows[0] });
  } catch (err) {
    console.error('Error saat memperbarui event:', err);
    res.status(500).json({ error: 'Gagal memperbarui data event.' });
  }
});

app.delete('/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const checkEvent = await pool.query('SELECT title FROM events WHERE id = $1', [id]);
    if (checkEvent.rowCount === 0) {
      return res.status(404).json({ error: 'Event tidak ditemukan.' });
    }
    const title = checkEvent.rows[0].title;
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.status(200).json({ message: `Event "${title}" dan seluruh pesertanya berhasil dihapus.` });
  } catch (err) {
    console.error('Error saat menghapus event:', err);
    res.status(500).json({ error: 'Gagal menghapus event.' });
  }
});

app.get('/', (req, res) => {
  res.json({ app: 'Evendance Backend API', status: 'Running', version: '2.0' });
});

/* ============================================================
   INISIALISASI DATABASE & SERVER
   ============================================================ */
async function initializeApp() {
  try {
    const dbTest = await pool.query('SELECT NOW()');
    console.log(`✅ Database terhubung: ${dbTest.rows[0].now}`);

    // 1. Buat Tabel "events"
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        date TIMESTAMP NOT NULL,
        location VARCHAR(200) NOT NULL,
        capacity INT DEFAULT 100,
        price_vip INT DEFAULT 150000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Verifikasi tabel "events" selesai.');

    // 2. Buat Tabel "users"
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        ticket_code VARCHAR(50) UNIQUE NOT NULL,
        is_attended BOOLEAN DEFAULT FALSE,
        ticket_type VARCHAR(20) DEFAULT 'REGULAR',
        price INT DEFAULT 0,
        payment_status VARCHAR(20) DEFAULT 'LUNAS',
        event_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrasi: Tambahkan kolom jika tabel sudah ada sebelumnya namun kolom belum ada
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(20) DEFAULT 'REGULAR';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS price INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'LUNAS';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS event_id INT REFERENCES events(id) ON DELETE CASCADE;
    `);
    console.log('✅ Verifikasi dan migrasi tabel "users" selesai.');

    // 3. Inisialisasi Dummy Events
    const checkEventCount = await pool.query('SELECT COUNT(*) FROM events');
    if (parseInt(checkEventCount.rows[0].count, 10) === 0) {
      console.log('📦 Menginisialisasi 3 data dummy event...');
      const dummyEvents = [
        [
          'Evendance Annual Conference 2026',
          'Konferensi tahunan terbesar untuk para developer, innovator, dan tech enthusiast di Indonesia. Satu hari penuh sesi inspiratif, workshop hands-on, dan kesempatan networking.',
          '2026-11-15 08:00:00',
          'Jakarta Convention Center (JCC)',
          500,
          150000
        ],
        [
          'Full-Stack Web Development Workshop',
          'Workshop intensif membangun aplikasi web Next.js & Express.js. Pelajari arsitektur modern, optimasi performa, dan deployment.',
          '2026-12-10 09:30:00',
          'Bandung Creative Hub',
          50,
          200000
        ],
        [
          'Seminar AI & The Future of Work',
          'Menjelajahi peran Generative AI di dunia profesional dan bagaimana mempersiapkan karir di era kecerdasan buatan.',
          '2027-01-18 13:00:00',
          'Online via Google Meet',
          1000,
          50000
        ]
      ];
      for (const [title, desc, date, loc, cap, price_vip] of dummyEvents) {
        await pool.query(
          'INSERT INTO events (title, description, date, location, capacity, price_vip) VALUES ($1, $2, $3, $4, $5, $6)',
          [title, desc, date, loc, cap, price_vip]
        );
      }
      console.log('✅ Data dummy event berhasil diinisialisasi.');
    }

    // Hubungkan peserta yang memiliki event_id null ke event pertama
    await pool.query(`
      UPDATE users SET event_id = (SELECT id FROM events ORDER BY id ASC LIMIT 1) WHERE event_id IS NULL;
    `);

    // 4. Inisialisasi Dummy Users
    const countCheck = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(countCheck.rows[0].count, 10) === 0) {
      console.log('📦 Menginisialisasi 3 data dummy peserta...');
      const firstEventRes = await pool.query('SELECT id FROM events ORDER BY id ASC LIMIT 1');
      const defaultEventId = firstEventRes.rows[0]?.id;
      const dummies = [
        ['Budi Santoso', 'budisantoso', 'budi.santoso@example.com', 'EVT-BUDIS-382', false, 'REGULAR', 0, 'LUNAS', defaultEventId],
        ['Siti Aminah', 'sitiaminah', 'siti.aminah@example.com', 'EVT-SITIA-719', true, 'VIP', 150000, 'LUNAS', defaultEventId],
        ['Ahmad Fauzi', 'ahmadfauzi', 'ahmad.fauzi@example.com', 'EVT-AHMAD-245', false, 'VIP', 150000, 'LUNAS', defaultEventId],
      ];
      for (const [name, username, email, ticket_code, is_attended, ticket_type, price, payment_status, event_id] of dummies) {
        await pool.query(
          'INSERT INTO users (name, username, email, ticket_code, is_attended, ticket_type, price, payment_status, event_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [name, username, email, ticket_code, is_attended, ticket_type, price, payment_status, event_id]
        );
      }
      console.log('✅ Data dummy berhasil diinisialisasi.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server Evendance v2.0 aktif di http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('💥 Gagal menginisialisasi database:', err);
    process.exit(1);
  }
}

initializeApp();
