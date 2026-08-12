import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

export default function CashierRegister() {
  const [searchParams] = useSearchParams();
  const sellerId = searchParams.get('seller_id');
  const [formData, setFormData] = useState({ nama: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!sellerId) {
      setError('Link undangan tidak valid. Minta link baru dari Admin restoran Anda.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Langkah 1: Membuat akun user kasir...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { name: formData.nama }
        }
      });

      if (authError) {
        console.error('Error saat membuat akun auth:', authError);
        throw new Error(`Gagal membuat akun: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Gagal membuat akun: Data user tidak ditemukan.');
      }

      console.log('Langkah 2: Menyimpan data profil kasir...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          nama: formData.nama,
          role: 'kasir',
          seller_id: sellerId,
          status: 'aktif'
        });

      if (profileError) {
        console.error('Error saat insert profiles:', profileError);
        throw new Error(`Gagal menyimpan profil kasir: ${profileError.message}`);
      }

      console.log('Pendaftaran kasir selesai.');
      navigate('/cashier', { replace: true });
    } catch (err: any) {
      console.error('Terjadi kesalahan pada proses pendaftaran kasir:', err);
      setError(err.message || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!sellerId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Tidak Valid</h1>
          <p className="text-gray-500">Link undangan ini tidak lengkap. Minta link undangan baru dari Admin restoran Anda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Daftar Sebagai Kasir</h1>
        <p className="text-gray-500 text-center mb-6">Anda diundang untuk bergabung sebagai kasir.</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input
              type="text"
              required
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition disabled:opacity-70"
          >
            {isLoading ? 'Mendaftar...' : 'Daftar & Masuk'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Sudah punya akun? <Link to="/cashier/login" className="font-bold text-gray-900 hover:underline">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
