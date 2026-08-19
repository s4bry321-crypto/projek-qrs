import React, { useState, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { uploadProfilAsset } from '../../lib/uploadImage';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, Check, Lock } from 'lucide-react';

export default function AdminProfile() {
  const { userProfile, sellerData } = useAuth();
  const [namaRestoran, setNamaRestoran] = useState(sellerData?.nama_restoran || '');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ganti password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSave = async () => {
    if (!userProfile?.seller_id) return;
    setIsSaving(true);
    setMessage(null);
    try {
      let logoUrl = sellerData?.logo_url;
      if (file) {
        logoUrl = await uploadProfilAsset(file);
      }

      const { error } = await supabase
        .from('sellers')
        .update({ nama_restoran: namaRestoran, logo_url: logoUrl })
        .eq('id', userProfile.seller_id);

      if (error) throw new Error(error.message);

      setMessage({ type: 'success', text: 'Profil bisnis berhasil disimpan. Muat ulang halaman untuk melihat perubahan di sidebar.' });
      setFile(null);
      setPreview(null);
    } catch (err: any) {
      console.error('Gagal simpan profil bisnis:', err);
      setMessage({ type: 'error', text: 'Gagal menyimpan: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password minimal 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Konfirmasi password tidak sama.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);

      setPasswordMessage({ type: 'success', text: 'Password berhasil diubah.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Gagal mengubah password:', err);
      setPasswordMessage({ type: 'error', text: 'Gagal mengubah password: ' + err.message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Profil Bisnis</h2>
        <p className="text-gray-500 mt-2">Nama dan logo ini akan tampil di halaman pemesanan pelanggan.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-lg space-y-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Restoran</label>
          <input
            type="text"
            value={namaRestoran}
            onChange={(e) => setNamaRestoran(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo Restoran</label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
              {preview || sellerData?.logo_url ? (
                <img src={preview || sellerData?.logo_url || ''} alt="Logo restoran" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-xs text-center px-2">Belum ada logo</span>
              )}
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
              >
                <Upload size={16} /> Pilih Gambar
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition disabled:opacity-50"
        >
          {isSaving ? 'Menyimpan...' : <><Check size={16} /> Simpan Profil</>}
        </button>
      </div>

      {/* Ganti Password */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-lg">
        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Lock size={18} className="text-sky-500" /> Ganti Password
        </h3>
        <p className="text-gray-500 text-sm mb-4">Ubah password akun Admin kamu.</p>

        {passwordMessage && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {passwordMessage.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
              disabled={isChangingPassword}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ulangi Password Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
              disabled={isChangingPassword}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            type="submit"
            disabled={isChangingPassword}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            {isChangingPassword ? 'Menyimpan...' : <><Check size={16} /> Ubah Password</>}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
