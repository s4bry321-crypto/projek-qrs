import React from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminInactive() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-lg text-center">
        <div className="bg-red-100 text-red-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Akun Tidak Aktif</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Akun restoran Anda sedang dinonaktifkan. Silakan hubungi Super Admin untuk informasi lebih lanjut.
        </p>
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
        >
          <LogOut size={20} />
          Keluar
        </button>
      </div>
    </div>
  );
}
