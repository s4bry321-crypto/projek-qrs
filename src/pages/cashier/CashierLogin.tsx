import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import PillInput from '../../components/auth/PillInput';

export default function CashierLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    console.log("1. Memulai proses login kasir untuk email:", email);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      console.error("1. Error saat autentikasi:", authError);
      setError(authError.message || 'Login gagal. Periksa kembali email dan password.');
      setIsLoading(false);
      return;
    }
    
    console.log("1. Autentikasi berhasil. User ID:", authData.user.id);
    
    console.log("2. Mengambil data profil...");
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();
      
    if (profileError) {
      console.error("2. Error saat mengambil profil:", profileError);
      setError('Gagal mengambil data profil: ' + profileError.message);
      setIsLoading(false);
      return;
    }
    
    console.log("2. Data profil berhasil diambil:", profileData);
    
    if (!profileData) {
      console.error("2. Data profil tidak ditemukan.");
      setError('Akses ditolak: Data profil tidak ditemukan.');
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }
    if (profileData.role !== 'kasir' && profileData.role !== 'admin') {
      console.error("2. Role tidak sesuai (bukan kasir/admin). Role:", profileData.role);
      setError('Akses ditolak: Akun ini tidak terdaftar sebagai kasir.');
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }

    if (profileData.role === 'kasir' && profileData.status === 'nonaktif') {
      console.error("2. Akun kasir berstatus nonaktif.");
      setError('Akun kasir ini telah dinonaktifkan. Hubungi Admin restoran Anda.');
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }
    
    setIsLoading(false);
    navigate('/cashier', { replace: true });
  };

  return (
    <AuthLayout title="Login Kasir" subtitle="Masuk untuk mengelola pesanan.">
      {error && (
        <div className="bg-red-500/20 border border-red-400/40 text-red-100 p-3 rounded-2xl text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <PillInput
          icon={<Mail size={18} />}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          disabled={isLoading}
          autoComplete="email"
        />
        <PillInput
          icon={<Lock size={18} />}
          isPassword
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          disabled={isLoading}
          autoComplete="current-password"
        />
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3 rounded-full hover:from-orange-600 hover:to-amber-600 transition disabled:opacity-70 flex justify-center items-center shadow-lg"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'MASUK'
          )}
        </button>
      </form>
      {import.meta.env.VITE_APP_TARGET === 'staff' && (
        <div className="mt-6 text-center">
          <p className="text-sm text-white/60">
            <Link to="/" className="hover:underline">
              &larr; Masuk sebagai Admin
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
