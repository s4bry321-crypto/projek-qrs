import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Store, User, Mail, Lock } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import PillInput from '../../components/auth/PillInput';

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
    <AuthLayout title="Daftar Restoran Baru" subtitle="Mulai jualan dengan sistem QR pemesanan.">
      {error && (
        <div className="bg-red-500/20 border border-red-400/40 text-red-100 p-3 rounded-2xl text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <PillInput
          icon={<Store size={18} />}
          value={formData.nama_restoran}
          onChange={(e) => setFormData({ ...formData, nama_restoran: e.target.value })}
          placeholder="Nama Restoran"
          required
          disabled={isLoading}
        />
        <PillInput
          icon={<User size={18} />}
          value={formData.nama_pemilik}
          onChange={(e) => setFormData({ ...formData, nama_pemilik: e.target.value })}
          placeholder="Nama Pemilik"
          required
          disabled={isLoading}
        />
        <PillInput
          icon={<Mail size={18} />}
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Email"
          required
          disabled={isLoading}
          autoComplete="email"
        />
        <PillInput
          icon={<Lock size={18} />}
          isPassword
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Password"
          required
          disabled={isLoading}
          minLength={6}
          autoComplete="new-password"
        />
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3 rounded-full hover:from-orange-600 hover:to-amber-600 transition disabled:opacity-70 flex justify-center items-center shadow-lg"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'DAFTAR SEKARANG'
          )}
        </button>
      </form>
      
      <p className="mt-6 text-center text-sm text-white/80">
        Sudah punya akun? <Link to="/admin/login" className="font-bold text-white underline hover:text-orange-200">Masuk</Link>
      </p>
    </AuthLayout>
  );
}
