# 🎟️ Evendance — Sistem Registrasi & Presensi Event Digital Real-Time

**Evendance** adalah aplikasi web modern berbasis Fullstack JavaScript yang dirancang untuk mempermudah manajemen event, pendaftaran peserta mandiri, penerbitan e-tiket dengan QR Code dinamis, hingga sistem pemindaian presensi (*check-in*) menggunakan kamera secara langsung (*real-time*). 

Aplikasi ini dilengkapi dengan integrasi **Google OAuth 2.0** untuk autentikasi aman, basis data **PostgreSQL** untuk keandalan data, serta dashboard analitik interaktif bagi Administrator.

---

## 🚀 Fitur Utama (Features)

Aplikasi ini dikembangkan dengan fitur-fitur tingkat produksi (*production-ready*) untuk memaksimalkan nilai akademis UAS:

### 1. 👥 Registrasi & Pemesanan Tiket Mandiri
*   **Google OAuth 2.0 Implicit Flow**: Peserta dapat mendaftar hanya dengan sekali klik menggunakan akun Google mereka. Nama, email, dan foto profil otomatis disinkronkan.
*   **Pendaftaran Manual**: Fallback pendaftaran tanpa akun Google bagi peserta umum.
*   **Multi-Kategori Tiket**:
    *   **Regular**: Tiket gratis dengan penerbitan langsung.
    *   **VIP**: Tiket berbayar (Rp 150.000) dengan simulasi gerbang pembayaran virtual (*Mock Payment Gateway*).

### 2. 💳 Simulator Pembayaran Terintegrasi
*   Simulator pembayaran virtual untuk tiket VIP menggunakan Virtual Account (BCA, Mandiri) atau QRIS. Karcis tiket digital hanya akan diterbitkan setelah pembayaran sukses disimulasikan.

### 3. 📊 Dashboard Analitik Admin Premium (Real-Time)
*   **Kartu Statistik 4-Kolom**: Informasi total peserta, rasio kehadiran (persentase dengan progress bar), jumlah peserta hadir, dan akumulasi total pendapatan secara dinamis.
*   **Multi-Criteria Filter & Search**: Pencarian cerdas berbasis nama/email/kode tiket, disandingkan dengan filter kategori tiket (Semua/VIP/Regular), status kehadiran (Hadir/Belum Hadir), serta status pembayaran (Semua/Lunas/Pending).
*   **CRUD Data Peserta**: Administrator memiliki hak akses penuh untuk mendaftarkan peserta baru, melakukan pencarian, verifikasi manual, hingga menghapus data peserta (*Delete CRUD*).
*   **Ekspor Data Excel (CSV)**: Fitur ekspor seluruh data peserta ke format CSV dengan prefix UTF-8 BOM untuk keterbacaan sempurna di Microsoft Excel.

### 4. 📷 Kamera Scanner Live QR Code
*   Integrasi pustaka `html5-qrcode` untuk mengakses kamera laptop atau smartphone secara langsung guna memindai QR Code tiket peserta.
*   **Presensi Instan**: Verifikasi kehadiran otomatis dalam milidetik dengan letupan efek selebrasi **Confetti** interaktif saat peserta sukses melakukan check-in.

---

## 🛠️ Tumpukan Teknologi (Tech Stack)

### Frontend (Client Side)
*   **Framework**: Next.js 14+ (React) dengan App Router
*   **State Management & Data Fetching**: TanStack React Query v5 (untuk caching data optimal)
*   **Pemindai**: Html5Qrcode
*   **Autentikasi**: @react-oauth/google
*   **Interaksi UI**: Canvas Confetti & Tailwind CSS

### Backend (Server API)
*   **Runtime**: Node.js dengan ES Modules
*   **Framework**: Express.js
*   **Database Driver**: node-postgres (`pg`)
*   **Utilitas**: QR-Image Generator & Google Auth Library

### Database (Data Store)
*   **DBMS**: PostgreSQL (Relational Database)

---

## 🗄️ Skema Database (Database Schema)

Tabel utama yang digunakan disimpan di database PostgreSQL dengan struktur sebagai berikut:

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    is_attended BOOLEAN DEFAULT FALSE,
    ticket_type VARCHAR(20) DEFAULT 'REGULAR', -- 'REGULAR' | 'VIP'
    price INT DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'LUNAS', -- 'LUNAS' | 'PENDING'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚦 Endpoint API Backend

| Metode | Endpoint | Deskripsi | Akses |
| :--- | :--- | :--- | :--- |
| **POST** | `/register-self` | Registrasi mandiri peserta menggunakan Google OAuth | Publik |
| **POST** | `/register-manual` | Registrasi mandiri peserta secara manual tanpa Google | Publik |
| **POST** | `/tickets/login-manual` | Akses e-ticket manual menggunakan email/kode tiket | Publik |
| **POST** | `/tickets/confirm-payment` | Simulasi konfirmasi pembayaran untuk tiket VIP | Publik |
| **GET** | `/my-ticket/:email` | Mengambil data e-ticket berdasarkan alamat email | Publik |
| **GET** | `/api/qr/:text` | Menghasilkan stream gambar QR Code dinamis berbasis teks | Publik |
| **GET** | `/users` | Mengambil seluruh daftar peserta terdaftar | Admin |
| **GET** | `/users/:id` | Mengambil detail profil peserta berdasarkan ID | Admin |
| **GET** | `/users/ticket/:ticket_code`| Mencari peserta berdasarkan kode tiket (untuk Scanner) | Admin |
| **POST** | `/register` | Mendaftarkan peserta baru langsung dari dashboard | Admin |
| **PATCH** | `/users/:id/attend` | Melakukan verifikasi/check-in kehadiran peserta | Admin |
| **DELETE**| `/users/:id` | Menghapus data peserta dari database | Admin |
| **POST** | `/login` | Autentikasi administrator (Username/Password fallback) | Admin |

---

## ⚙️ Petunjuk Pemasangan & Menjalankan (Installation Guide)

### 1. Persiapan Basis Data (PostgreSQL)
Buat database baru di PostgreSQL Anda dengan nama `evendance`:
```sql
CREATE DATABASE evendance;
```

### 2. Konfigurasi Backend
1. Masuk ke folder backend:
   ```bash
   cd backend
   ```
2. Pasang dependensi npm:
   ```bash
   npm install
   ```
3. Duplikat atau edit file `.env` di dalam folder `backend` dan isi variabel berikut:
   ```env
   PORT=5001
   PGHOST=localhost
   PGPORT=5432
   PGUSER=username_postgres_anda
   PGPASSWORD=password_postgres_anda
   PGDATABASE=evendance
   GOOGLE_CLIENT_ID=kredensial_client_id_google_anda
   ADMIN_EMAILS=email1@gmail.com,email2@gmail.com
   ```
4. Jalankan backend dalam mode development:
   ```bash
   npm run dev
   ```
   *Backend otomatis mendeteksi database, membuat tabel `users`, dan menginisialisasi 3 data dummy jika database kosong.*

### 3. Konfigurasi Frontend
1. Masuk ke folder frontend:
   ```bash
   cd ../frontend
   ```
2. Pasang dependensi npm:
   ```bash
   npm install
   ```
3. Jalankan server frontend:
   ```bash
   npm run dev
   ```
4. Buka browser Anda di: [http://localhost:3000](http://localhost:3000)

---

## 📂 Struktur Direktori Project

```text
UAS-WEB2-EVENDANCE-OAUTH/
│
├── backend/
│   ├── node_modules/
│   ├── .env                  # Variabel koneksi DB & OAuth (Lokal)
│   ├── db.js                 # Pool koneksi pg (PostgreSQL)
│   ├── package.json
│   └── server.js             # API router & Inisialisasi skema DB
│
├── frontend/
│   ├── node_modules/
│   ├── public/               # Asset Gambar & SVG
│   └── src/
│       └── app/
│           ├── layout.jsx    # Root Layout & Font Outfit
│           ├── globals.css   # Variabel warna & glassmorphism
│           ├── page.jsx      # Dashboard Utama Administrator
│           ├── providers.jsx # React Query Client Provider
│           ├── daftar/       # Halaman Pendaftaran & Mock Payment
│           ├── login/        # Halaman Login OAuth Admin
│           ├── scan/         # Halaman Kamera Live QR Scanner
│           ├── tiket/        # Halaman Tiket Digital Peserta
│           └── users/[id]/   # Halaman Verifikasi Kehadiran Manual
│
└── .gitignore                # Pengecualian git untuk kerahasiaan kredensial
```

---

## 🧑‍💻 Hak Cipta & Kontributor

*   **Nama Mahasiswa**: [Nama Anda]
*   **NIM**: [NIM Anda]
*   **Mata Kuliah**: Pemrograman Web 2 / UAS
