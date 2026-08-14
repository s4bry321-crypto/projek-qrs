import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Store, Users } from 'lucide-react';

// Halaman ini menggantikan landing "Silakan scan QR" ketika aplikasi
// di-build sebagai APK (bukan website biasa) - lihat VITE_APP_TARGET.
// 'staff'      -> tampilkan pilihan masuk Admin / Kasir (TANPA link ke Super Admin)
// 'superadmin' -> langsung arahkan ke /superadmin/login
// default/'web'-> tampilan biasa buat pelanggan (scan QR)
export default function AppHome() {
  const target = import.meta.env.VITE_APP_TARGET;

  if (target === 'superadmin') {
    return <Navigate to="/superadmin/login" replace />;
  }

  if (target === 'staff') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sistem Pesan QR</h1>
          <p className="text-gray-500 mb-8">Masuk sebagai</p>
          <div className="space-y-3">
            <Link
              to="/admin/login"
              className="flex items-center gap-3 w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-orange-400 transition-colors"
            >
              <div className="w-11 h-11 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Store size={22} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Admin</div>
                <div className="text-xs text-gray-500">Kelola menu, meja, & kasir</div>
              </div>
            </Link>
            <Link
              to="/cashier/login"
              className="flex items-center gap-3 w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-orange-400 transition-colors"
            >
              <div className="w-11 h-11 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Users size={22} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Kasir</div>
                <div className="text-xs text-gray-500">Proses pesanan & cetak struk</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default: tampilan web biasa untuk pelanggan
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500 text-center px-4">
      Silakan scan QR Code restoran untuk memesan.
    </div>
  );
}
