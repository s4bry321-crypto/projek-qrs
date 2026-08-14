import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, UtensilsCrossed, MonitorStop, LogOut, Users, Store, QrCode, Menu, X } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut, userProfile, sellerData } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Kelola Menu', path: '/admin/menu', icon: <UtensilsCrossed size={20} /> },
    { name: 'Kelola Meja', path: '/admin/tables', icon: <MonitorStop size={20} /> },
    { name: 'Kelola Kasir', path: '/admin/cashier', icon: <Users size={20} /> },
    { name: 'Profil Bisnis', path: '/admin/profile', icon: <Store size={20} /> },
    { name: 'Cetak QR', path: '/admin/qr', icon: <QrCode size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar - cuma tampil di layar sempit */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-gray-900 text-white flex items-center justify-between px-4 z-30 print:hidden">
        <button onClick={() => setIsSidebarOpen(true)} aria-label="Buka menu">
          <Menu size={24} />
        </button>
        <span className="font-semibold truncate px-2">{sellerData?.nama_restoran || 'Admin Panel'}</span>
        <div className="w-6" />
      </div>

      {/* Overlay backdrop - cuma di layar sempit saat sidebar terbuka */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-gray-900 text-white flex flex-col fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 md:translate-x-0 print:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-gray-800 flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              {sellerData?.logo_url && (
                <img src={sellerData.logo_url} alt="Logo" className="w-9 h-9 rounded-lg object-cover shrink-0" />
              )}
              <h1 className="text-xl font-bold text-white truncate">{sellerData?.nama_restoran || 'Admin Panel'}</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1 truncate">{userProfile?.email}</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white shrink-0 ml-2">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-300 hover:bg-red-500 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-4 pt-20 md:p-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
