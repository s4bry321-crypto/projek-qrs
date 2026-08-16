import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Daftarkan service worker supaya browser mengizinkan "Install App" (PWA).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Gagal mendaftarkan service worker:', err);
    });
  });
}

// Penanda build - buka DevTools Console dan cek baris ini untuk pastikan
// deployment yang sedang dibuka benar-benar versi terbaru. Nilainya di-set
// SEKALI saat "npm run build" dijalankan (lihat vite.config.ts), bukan
// saat halaman dibuka - jadi ini beneran nunjukin waktu deploy, bukan waktu sekarang.
console.log('[Build] Sistem Pesan QR - versi build:', __BUILD_TIME__);
