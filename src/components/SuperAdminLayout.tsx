import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, LogOut, Store, CreditCard, Settings, Menu, X } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut, userProfile } = useAuth();
  const navigate = useNavigate();
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchLogo = async () => {
      const { data } = await supabase.from('platform_settings').select('logo_url').eq('id', 1).maybeSingle();
      if (data?.logo_url) setPlatformLogo(data.logo_url);
    };
    fetchLogo();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/superadmin/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/superadmin', icon: <LayoutDashboard size={20} /> },
    { name: 'Restoran', path: '/superadmin/sellers', icon: <Store size={20} /> },
    { name: 'Pembayaran', path: '/superadmin/payments', icon: <CreditCard size={20} /> },
    { name: 'Pengaturan', path: '/superadmin/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar - cuma tampil di layar sempit */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-slate-900 text-white flex items-center justify-between px-4 z-30">
        <button onClick={() => setIsSidebarOpen(true)} aria-label="Buka menu">
          <Menu size={24} />
        </button>
        <span className="font-semibold">Super Admin</span>
        <div className="w-6" />
      </div>

      {/* Overlay backdrop - cuma di layar sempit saat sidebar terbuka */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              {platformLogo && (
                <img src={platformLogo} alt="Logo" className="w-9 h-9 rounded-lg object-cover shrink-0" />
              )}
              <h1 className="text-2xl font-bold text-white text-orange-500">Super Admin</h1>
            </div>
            <p className="text-slate-400 text-sm mt-1 truncate">{userProfile?.email}</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white shrink-0 ml-2">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/superadmin'}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-orange-500 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-300 hover:bg-red-500 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      <main className="md:ml-64 p-4 pt-20 md:p-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
