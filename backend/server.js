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
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
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
  const { idToken } = req.body;
  // idToken di sini sebenarnya adalah access_token dari implicit flow
  const accessToken = idToken;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access Token Google tidak ditemukan.' });
  }

  try {
    // Verifikasi identitas peserta melalui Google access token
    const payload = await verifyGoogleAccessToken(accessToken);

    const { name, email, sub: googleId } = payload;
    
    // Cek apakah peserta dengan email ini sudah terdaftar sebelumnya
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      // Jika sudah terdaftar, kembalikan data tiket yang ada (bukan error)
      return res.status(200).json({
        message: 'Anda sudah terdaftar sebelumnya. Tiket Anda ditampilkan di bawah.',
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

    const ticketType = req.body.ticket_type === 'VIP' ? 'VIP' : 'REGULAR';
    const price = ticketType === 'VIP' ? 150000 : 0;
    const paymentStatus = ticketType === 'VIP' ? 'PENDING' : 'LUNAS';

    // Generate kode tiket unik
    const ticketCode = await generateUniqueTicketCode(name);

    // Simpan peserta baru ke database
    const result = await pool.query(
      `INSERT INTO users (name, username, email, ticket_code, ticket_type, price, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, username, email.toLowerCase(), ticketCode, ticketType, price, paymentStatus]
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
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [decodeURIComponent(email).toLowerCase()]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tiket tidak ditemukan. Silakan daftar terlebih dahulu.' });
    }
    return res.status(200).json(result.rows[0]);
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
  if (!name || !username || !email) {
    return res.status(400).json({ error: 'Nama, username, dan email wajib diisi.' });
  }

  const ticketType = ticket_type === 'VIP' ? 'VIP' : 'REGULAR';
  const price = ticketType === 'VIP' ? 150000 : 0;
  const paymentStatus = ticketType === 'VIP' ? 'PENDING' : 'LUNAS';

  try {
    // Generate kode tiket unik
    const ticketCode = await generateUniqueTicketCode(name);

    // Simpan ke database
    const result = await pool.query(
      `INSERT INTO users (name, username, email, ticket_code, ticket_type, price, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name.trim(), username.trim().toLowerCase().replace(/\s+/g, ''), email.trim().toLowerCase(), ticketCode, ticketType, price, paymentStatus]
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
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(ticket_code) = $1',
      [cleanQuery]
    );

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
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
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
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
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
    const result = await pool.query('SELECT * FROM users WHERE ticket_code = $1', [ticket_code]);
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
  const { name, username, email } = req.body;
  if (!name || !username || !email) {
    return res.status(400).json({ error: 'Nama, username, dan email wajib diisi.' });
  }
  try {
    const ticketCode = await generateUniqueTicketCode(name);
    const query = `INSERT INTO users (name, username, email, ticket_code) VALUES ($1, $2, $3, $4) RETURNING *`;
    const result = await pool.query(query, [name.trim(), username.trim().toLowerCase(), email.trim().toLowerCase(), ticketCode]);
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrasi: Tambahkan kolom jika tabel sudah ada sebelumnya namun kolom belum ada
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(20) DEFAULT 'REGULAR';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS price INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'LUNAS';
    `);
    console.log('✅ Verifikasi dan migrasi tabel "users" selesai.');

    const countCheck = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(countCheck.rows[0].count, 10) === 0) {
      console.log('📦 Menginisialisasi 3 data dummy peserta...');
      const dummies = [
        ['Budi Santoso', 'budisantoso', 'budi.santoso@example.com', 'EVT-BUDIS-382', false, 'REGULAR', 0, 'LUNAS'],
        ['Siti Aminah', 'sitiaminah', 'siti.aminah@example.com', 'EVT-SITIA-719', true, 'VIP', 150000, 'LUNAS'],
        ['Ahmad Fauzi', 'ahmadfauzi', 'ahmad.fauzi@example.com', 'EVT-AHMAD-245', false, 'VIP', 150000, 'LUNAS'],
      ];
      for (const [name, username, email, ticket_code, is_attended, ticket_type, price, payment_status] of dummies) {
        await pool.query(
          'INSERT INTO users (name, username, email, ticket_code, is_attended, ticket_type, price, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [name, username, email, ticket_code, is_attended, ticket_type, price, payment_status]
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
