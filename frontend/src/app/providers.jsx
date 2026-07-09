"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState } from 'react';

/**
 * Google OAuth Client ID dari Google Cloud Console.
 * Digunakan oleh @react-oauth/google untuk menampilkan popup login Google.
 */
const GOOGLE_CLIENT_ID = '944740210212-opu8dqketdkosh54a13c7mrusep5085l.apps.googleusercontent.com';

/**
 * Komponen Providers untuk menyediakan QueryClient dan Google OAuth ke seluruh aplikasi.
 * - QueryClientProvider: Menyediakan TanStack React Query untuk fetching data.
 * - GoogleOAuthProvider: Menyediakan konteks Google Sign-In untuk semua halaman.
 */
export default function Providers({ children }) {
  // Menggunakan useState agar instance QueryClient hanya dibuat sekali saja
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Mencegah query di-fetch ulang setiap kali jendela browser mendapatkan fokus kembali
            refetchOnWindowFocus: false,
            // Mencoba kembali query yang gagal sebanyak 1 kali saja
            retry: 1,
          },
        },
      })
  );

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
