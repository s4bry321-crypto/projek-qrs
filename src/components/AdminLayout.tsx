import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, UtensilsCrossed, MonitorStop, LogOut, Users, Store, QrCode, Menu, X, Coffee } from 'lucide-react';

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

  const RestoBrand = () => (
    <div className="flex items-center gap-2 min-w-0">
      {sellerData?.logo_url ? (
        <img src={sellerData.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-cover shrink-0" />
      ) : (
        <Coffee size={20} className="text-teal-600 shrink-0" />
      )}
      <span className="font-serif italic text-teal-600 font-semibold truncate">{sellerData?.nama_restoran || 'Admin Panel'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar - cuma tampil di layar sempit */}
      <div 
        className="md:hidden fixed top-0 inset-x-0 bg-white border-b border-slate-100 text-slate-700 flex items-center justify-between px-4 z-30 print:hidden shadow-sm"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(env(safe-area-inset-top) + 3.5rem)' }}
      >
        <button onClick={() => setIsSidebarOpen(true)} aria-label="Buka menu" className="text-teal-600">
          <Menu size={24} />
        </button>
        <RestoBrand />
        <div className="w-6" />
      </div>

      {/* Overlay backdrop - cuma di layar sempit saat sidebar terbuka */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-white border-r border-slate-100 flex flex-col fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 md:translate-x-0 print:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-6 border-b border-slate-100 flex items-start justify-between">
          <div className="min-w-0">
            <RestoBrand />
            <p className="text-slate-400 text-xs mt-2 truncate">{userProfile?.email}</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-700 shrink-0 ml-2">
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
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-4 pt-[calc(env(safe-area-inset-top)+4.5rem)] md:p-8">
        {children}
      </main>
    </div>
  );
}
