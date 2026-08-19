import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSearchParams, Link } from 'react-router-dom';
import { User, Mail, Lock, CheckCircle2 } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import PillInput from '../../components/auth/PillInput';

export default function CashierRegister() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [formData, setFormData] = useState({ nama: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
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

      console.log('Langkah 2: Menukar token undangan menjadi profil kasir...');
      const { error: claimError } = await supabase.rpc('claim_cashier_invite', {
        p_token: token,
        p_nama: formData.nama,
        p_email: formData.email
      });

      if (claimError) {
        console.error('Error saat claim_cashier_invite:', claimError);
        throw new Error(claimError.message || 'Gagal menyelesaikan pendaftaran kasir.');
      }

      console.log('Pendaftaran kasir selesai, menunggu aktivasi Admin.');
      setRegistered(true);
    } catch (err: any) {
      console.error('Terjadi kesalahan pada proses pendaftaran kasir:', err);
      setError(err.message || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Link Tidak Valid" showBack={false}>
        <p className="text-white/80 text-center">
          Link undangan ini tidak lengkap. Minta link undangan baru dari Admin restoran Anda.
        </p>
      </AuthLayout>
    );
  }

  if (registered) {
    return (
      <AuthLayout title="Pendaftaran Berhasil" showBack={false}>
        <div className="flex flex-col items-center text-center gap-4">
          <div className="bg-white/20 text-white w-16 h-16 rounded-full flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>
          <p className="text-white/80">
            Akun Anda sudah dibuat. Untuk keamanan, akun kasir baru perlu diaktifkan dulu oleh
            Admin restoran ini (di halaman Kelola Kasir) sebelum bisa dipakai login.
          </p>
          <Link
            to="/cashier/login"
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3 rounded-full hover:from-orange-600 hover:to-amber-600 transition text-center shadow-lg"
          >
            KE HALAMAN LOGIN
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Daftar Sebagai Kasir" subtitle="Anda diundang untuk bergabung sebagai kasir.">
      {error && (
        <div className="bg-red-500/20 border border-red-400/40 text-red-100 p-3 rounded-2xl text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <PillInput
          icon={<User size={18} />}
          value={formData.nama}
          onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
          placeholder="Nama"
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

      <div className="mt-6 text-center">
        <p className="text-sm text-white/80">
          Sudah punya akun? <Link to="/cashier/login" className="font-bold text-white underline hover:text-orange-200">Masuk</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
