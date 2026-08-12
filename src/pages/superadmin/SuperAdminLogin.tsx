import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    console.log("1. Memulai proses login super admin untuk email:", email);
    
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
    if (profileData.role !== 'super_admin') {
      console.error("2. Role tidak sesuai (bukan super_admin). Role:", profileData.role);
      setError('Akses ditolak: Akun ini bukan super admin.');
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }
    
    setIsLoading(false);
    navigate('/superadmin', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            SA
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">Super Admin</h1>
        <p className="text-slate-500 text-center mb-6">Sistem Manajemen Platform</p>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Administrator</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-70 flex justify-center items-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Login Akses Sistem'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
