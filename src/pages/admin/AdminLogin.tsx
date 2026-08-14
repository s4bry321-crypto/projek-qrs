import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Login Admin</h1>
        <p className="text-gray-500 text-center mb-6">Masuk ke panel manajemen.</p>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-black transition disabled:opacity-70 flex justify-center items-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Masuk'
            )}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Belum mendaftarkan restoran?{' '}
            <Link to="/admin/register" className="font-bold text-gray-900 hover:underline">
              Daftar Sekarang
            </Link>
          </p>
          {import.meta.env.VITE_APP_TARGET === 'staff' && (
            <p className="text-sm text-gray-500 mt-2">
              <Link to="/" className="hover:underline">
                &larr; Masuk sebagai Kasir
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
