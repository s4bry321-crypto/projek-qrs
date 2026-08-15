import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import PillInput from '../../components/auth/PillInput';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    console.log("1. Memulai proses login admin untuk email:", email);
    
    // 1. Sign in
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
    
    // 2. Fetch profile
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
    if (profileData.role !== 'admin') {
      console.error("2. Role tidak sesuai (bukan admin). Role:", profileData.role);
      setError('Akses ditolak: Akun ini tidak terdaftar sebagai admin.');
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }
    
    // 3. Fetch seller data
    if (profileData.seller_id) {
      console.log("3. Mengambil data restoran (seller_id):", profileData.seller_id);
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', profileData.seller_id)
        .maybeSingle();
        
      if (sellerError) {
        console.error("3. Error saat mengambil data restoran:", sellerError);
        setError('Gagal mengambil data restoran: ' + sellerError.message);
        setIsLoading(false);
        return;
      }
      
      console.log("3. Data restoran berhasil diambil:", sellerData);
      
      // Navigate based on status explicitly to match App.tsx rules
      setIsLoading(false);
      
      if (sellerData.status === 'pending') {
        navigate('/admin/waiting-approval', { replace: true });
      } else if (sellerData.status === 'nonaktif' || sellerData.status === 'ditolak') {
        navigate('/admin/inactive', { replace: true });
      } else if (sellerData.status === 'aktif') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/admin', { replace: true });
      }
    } else {
      console.log("3. Tidak ada seller_id di profil, tidak mengambil data restoran.");
      setIsLoading(false);
      navigate('/admin', { replace: true });
    }
  };

  return (
    <AuthLayout title="Login Admin" subtitle="Masuk ke panel manajemen restoran.">
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

      <div className="mt-6 text-center">
        <p className="text-sm text-white/80">
          Belum mendaftarkan restoran?{' '}
          <Link to="/admin/register" className="font-bold text-white underline hover:text-orange-200">
            Daftar Sekarang
          </Link>
        </p>
        {import.meta.env.VITE_APP_TARGET === 'staff' && (
          <p className="text-sm text-white/60 mt-2">
            <Link to="/" className="hover:underline">
              &larr; Masuk sebagai Kasir
            </Link>
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
