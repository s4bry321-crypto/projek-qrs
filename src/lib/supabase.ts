/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  // Sengaja dibuat mencolok: kalau env var belum ke-set, sebelumnya aplikasi diam-diam
  // memakai URL palsu dan semua query gagal tanpa penjelasan yang jelas ke pengguna.
  console.error(
    '[Supabase] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum ter-set. ' +
    'Aplikasi memakai koneksi placeholder yang TIDAK bisa membaca/menulis data apa pun. ' +
    'Cek panel Secrets/Environment Variables di tempat deploy.'
  );
  if (typeof document !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('div');
      banner.textContent = '⚠️ Supabase belum terhubung — VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY belum diisi. Data tidak akan tersimpan.';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:#fff;padding:8px 12px;text-align:center;font-size:12px;z-index:99999;font-family:sans-serif;';
      document.body.prepend(banner);
    });
  }
} else {
  // Sengaja di-log supaya gampang dicocokkan manual dengan Project URL asli di Supabase
  // (Settings > API) kalau ada kecurigaan aplikasi nyambung ke project yang salah.
  console.log('[Supabase] Terhubung ke project:', supabaseUrl);
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.invalid',
  supabaseKey || 'placeholder-anon-key'
);
