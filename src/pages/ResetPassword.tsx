import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Lock, CheckCircle } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import PillInput from '../components/auth/PillInput';

// Halaman ini dituju oleh link di email "reset password" yang dikirim lewat
// supabase.auth.resetPasswordForEmail(). Dipakai bersama oleh Admin, Kasir,
// dan Super Admin - siapa pun yang link resetnya diklik akan mendarat di sini.
export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Saat link reset di email diklik, Supabase otomatis membuat sesi sementara
    // dan memicu event PASSWORD_RECOVERY - baru setelah itu updateUser() di bawah bisa jalan.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sama.');
      return;
    }
    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      console.error('Gagal update password:', updateError);
      setError(updateError.message);
      setIsLoading(false);
      return;
    }
    setSuccess(true);
    setIsLoading(false);
  };

  if (success) {
    return (
      <AuthLayout title="Password Berhasil Diubah" showBack={false}>
        <div className="text-center text-white/90">
          <CheckCircle size={40} className="mx-auto mb-3 text-emerald-300" />
          <p className="mb-6">Password kamu sudah berhasil diperbarui. Silakan login kembali memakai password baru.</p>
          <Link to="/admin/login" className="inline-block bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3 px-6 rounded-full">
            Ke Halaman Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (!ready) {
    return (
      <AuthLayout title="Link Tidak Valid" showBack={false}>
        <p className="text-white/80 text-center">
          Link reset password ini tidak valid atau sudah kedaluwarsa. Minta link baru dari Admin/Super Admin kamu.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Atur Password Baru" subtitle="Masukkan password baru untuk akunmu." showBack={false}>
      {error && (
        <div className="bg-red-500/20 border border-red-400/40 text-red-100 p-3 rounded-2xl text-sm mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <PillInput
          icon={<Lock size={18} />}
          isPassword
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password Baru"
          required
          disabled={isLoading}
          minLength={6}
        />
        <PillInput
          icon={<Lock size={18} />}
          isPassword
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Ulangi Password Baru"
          required
          disabled={isLoading}
          minLength={6}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3 rounded-full hover:from-orange-600 hover:to-amber-600 transition disabled:opacity-70 flex justify-center items-center shadow-lg"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'SIMPAN PASSWORD BARU'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
