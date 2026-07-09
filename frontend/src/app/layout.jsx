import './globals.css';
import Providers from './providers';

// Metadata halaman untuk optimasi SEO dalam Bahasa Indonesia
export const metadata = {
  title: 'Evendance - Sistem Pendaftaran & Kehadiran Event',
  description: 'Kelola pendaftaran peserta dan verifikasi kehadiran event secara real-time dengan aman dan cepat.',
};

/**
 * Root Layout utama untuk aplikasi Evendance.
 * Mengintegrasikan Providers (React Query Client) dan file CSS global.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="id" className="h-full">
      <body className="bg-stone-50 text-stone-900 min-h-full font-sans antialiased flex flex-col">
        {/* Membungkus aplikasi dengan React Query Provider */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
