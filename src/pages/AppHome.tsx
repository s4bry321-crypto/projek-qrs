import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Store, Users } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';

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
      <AuthLayout title="Sistem Pesan QR" subtitle="Masuk sebagai" showBack={false}>
        <div className="space-y-3">
          <Link
            to="/admin/login"
            className="flex items-center gap-3 w-full rounded-2xl p-4 border border-white/20 hover:border-orange-300/60 hover:bg-white/[0.12] transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div className="w-11 h-11 rounded-xl bg-orange-500/90 text-white flex items-center justify-center shrink-0">
              <Store size={22} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-white">Admin</div>
              <div className="text-xs text-white/60">Kelola menu, meja, & kasir</div>
            </div>
          </Link>
          <Link
            to="/cashier/login"
            className="flex items-center gap-3 w-full rounded-2xl p-4 border border-white/20 hover:border-orange-300/60 hover:bg-white/[0.12] transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div className="w-11 h-11 rounded-xl bg-orange-500/90 text-white flex items-center justify-center shrink-0">
              <Users size={22} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-white">Kasir</div>
              <div className="text-xs text-white/60">Proses pesanan & cetak struk</div>
            </div>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // Default: tampilan web biasa untuk pelanggan
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500 text-center px-4">
      Silakan scan QR Code restoran untuk memesan.
    </div>
  );
}
