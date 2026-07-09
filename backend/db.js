import pg from 'pg';
import dotenv from 'dotenv';

// Memuat variabel lingkungan dari file .env
dotenv.config();

const { Pool } = pg;

/**
 * Konfigurasi koneksi ke database PostgreSQL.
 * Menggunakan variabel lingkungan dari .env dengan nilai fallback jika tidak didefinisikan.
 */
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'evendance',
});

// Menambahkan event listener untuk memantau error pada koneksi pool yang sedang berjalan
pool.on('error', (err) => {
  console.error('Error tidak terduga pada client database idle:', err);
  process.exit(-1);
});

// Mengekspor pool koneksi agar dapat digunakan oleh server.js untuk query
export default pool;
