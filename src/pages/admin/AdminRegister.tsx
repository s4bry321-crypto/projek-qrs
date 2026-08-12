import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function AdminRegister() {
  const [formData, setFormData] = useState({
    nama_restoran: '',
    nama_pemilik: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      console.log('Langkah 1: Membuat akun user...');
      // 1. SignUp user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { name: formData.nama_pemilik }
        }
      });
      
      if (authError) {
        console.error('Error saat membuat akun auth:', authError);
        throw new Error(`Gagal membuat akun: ${authError.message}`);
      }
      
      if (!authData.user) {
        console.error('Data user kosong setelah auth.signUp');
        throw new Error('Gagal membuat akun: Data user tidak ditemukan.');
      }

      console.log('User berhasil dibuat dengan ID:', authData.user.id);
      console.log('Langkah 2: Menyimpan data restoran...');

      // Create slug from nama_restoran
      const slug = formData.nama_restoran.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // 2. Insert into sellers
      const { data: sellerDataArray, error: sellerError } = await supabase
        .from('sellers')
        .insert({
          nama_restoran: formData.nama_restoran,
          slug,
          status: 'pending'
        })
        .select();

      if (sellerError) {
        console.error('Error saat insert sellers:', sellerError);
        throw new Error(`Gagal mendaftarkan restoran: ${sellerError.message}`);
      }

      if (!sellerDataArray || sellerDataArray.length === 0) {
        console.error('Insert seller berhasil tapi data tidak dikembalikan (kemungkinan masalah RLS).');
        throw new Error('Pendaftaran restoran gagal membaca data setelah disimpan. Hubungi admin.');
      }
      
      const sellerData = sellerDataArray[0];
      console.log('Restoran berhasil dibuat dengan ID:', sellerData.id);
      console.log('Langkah 3: Menyimpan data profil...');

      // 3. Insert into profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          nama: formData.nama_pemilik,
          role: 'admin',
          seller_id: sellerData.id
        });

      if (profileError) {
        console.error('Error saat insert profiles:', profileError);
        throw new Error(`Gagal menyimpan profil admin: ${profileError.message}`);
      }

      console.log('Profil admin berhasil dibuat.');
      console.log('Pendaftaran selesai.');

      // Registration successful, navigate to waiting page
      navigate('/admin/waiting-approval');
    } catch (err: any) {
      console.error('Terjadi kesalahan pada proses pendaftaran:', err);
      setError(err.message || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Daftar Restoran Baru</h1>
        <p className="text-gray-500 text-center mb-6">Mulai jualan dengan sistem QR pemesanan.</p>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Restoran</label>
            <input 
              type="text" 
              required
              value={formData.nama_restoran}
              onChange={(e) => setFormData({...formData, nama_restoran: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemilik</label>
            <input 
              type="text" 
              required
              value={formData.nama_pemilik}
              onChange={(e) => setFormData({...formData, nama_pemilik: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-black transition disabled:opacity-70"
          >
            {isLoading ? 'Mendaftar...' : 'Daftar Sekarang'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-gray-600">
          Sudah punya akun? <Link to="/admin/login" className="text-gray-900 font-bold hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
