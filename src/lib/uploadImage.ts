import { supabase } from './supabase';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB - samakan dengan file_size_limit bucket di schema.sql

// Helper upload gambar (logo restoran, logo profil, foto profil kasir)
// ke bucket 'profil-assets'. Dipakai bersama supaya tidak duplikat logic
// di 3 tempat berbeda (Super Admin, Admin, Kasir).
//
// Validasi tipe/ukuran di sini cuma untuk kasih tahu pengguna secepatnya
// (sebelum buang-buang waktu upload). Batas SEBENARNYA yang tidak bisa
// dilewati tetap dipaksakan di level server lewat konfigurasi bucket
// storage (file_size_limit & allowed_mime_types) di schema.sql.
export async function uploadProfilAsset(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Format file tidak didukung. Gunakan gambar JPG, PNG, WEBP, atau GIF.');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Ukuran file terlalu besar. Maksimal 3 MB.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('profil-assets')
    .upload(fileName, file);

  if (uploadError) {
    throw new Error('Gagal mengupload gambar: ' + uploadError.message);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('profil-assets')
    .getPublicUrl(fileName);

  return publicUrl;
}
