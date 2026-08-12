import React from 'react';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminWaitingApproval() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-lg text-center">
        <div className="bg-orange-100 text-orange-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Menunggu Persetujuan</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Pendaftaran restoran Anda sedang ditinjau oleh Super Admin. Anda akan bisa mengelola menu, meja, dan kasir setelah akun disetujui.
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
