import { supabase } from './supabase';

// Helper upload gambar (logo restoran, logo platform, foto profil kasir)
// ke bucket 'profil-assets'. Dipakai bersama supaya tidak duplikat logic
// di 3 tempat berbeda (Super Admin, Admin, Kasir).
export async function uploadProfilAsset(file: File): Promise<string> {
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
