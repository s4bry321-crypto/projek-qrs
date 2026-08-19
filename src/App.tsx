import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

// Customer Pages
import MenuPage from './pages/customer/MenuPage';
import CartPage from './pages/customer/CartPage';
import OrderStatusPage from './pages/customer/OrderStatusPage';

// Cashier Pages
import CashierLogin from './pages/cashier/CashierLogin';
import CashierRegister from './pages/cashier/CashierRegister';
import CashierDashboard from './pages/cashier/CashierDashboard';

// Super Admin Pages
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminSellers from './pages/superadmin/SuperAdminSellers';
import SuperAdminPayments from './pages/superadmin/SuperAdminPayments';
import SuperAdminSettings from './pages/superadmin/SuperAdminSettings';

import AdminLogin from './pages/admin/AdminLogin';
import AdminRegister from './pages/admin/AdminRegister';
import AdminWaitingApproval from './pages/admin/AdminWaitingApproval';
import AdminInactive from './pages/admin/AdminInactive';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageMenu from './pages/admin/ManageMenu';
import ManageTables from './pages/admin/ManageTables';
import ManageCashier from './pages/admin/ManageCashier';
import AdminProfile from './pages/admin/AdminProfile';
import AdminQR from './pages/admin/AdminQR';
import AppHome from './pages/AppHome';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';

const ProtectedRoute = ({ children, allowedRoles, redirectTo }: { children: React.ReactNode, allowedRoles: string[], redirectTo: string }) => {
  const { userProfile, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;

  if (!userProfile || !allowedRoles.includes(userProfile.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Akun kasir yang dinonaktifkan Admin diarahkan keluar begitu userProfile
  // dimuat ulang (mis. buka lagi tab yang sudah lama terbuka), bukan cuma
  // dicek sekali saat proses login saja. Ini pelengkap tampilan -- baris
  // pertahanan yang sesungguhnya ada di kebijakan RLS (lihat schema.sql),
  // yang menolak akses data sekalipun sesi login browser-nya masih valid.
  if (userProfile.role === 'kasir' && userProfile.status === 'nonaktif') {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { userProfile, sellerData, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;

  if (!userProfile || userProfile.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  if (sellerData?.status === 'pending') {
    return <Navigate to="/admin/waiting-approval" replace />;
  }

  if (sellerData?.status === 'nonaktif' || sellerData?.status === 'ditolak') {
    return <Navigate to="/admin/inactive" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Customer Routes */}
            <Route path="/r/:slug" element={<MenuPage />} />
            <Route path="/r/:slug/cart" element={<CartPage />} />
            <Route path="/r/:slug/order/:orderId" element={<OrderStatusPage />} />
            <Route path="/" element={<AppHome />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Cashier Routes */}
            <Route path="/cashier/login" element={<CashierLogin />} />
            <Route path="/cashier/register" element={<CashierRegister />} />
            <Route path="/kasir/login" element={<Navigate to="/cashier/login" replace />} />
            <Route 
              path="/cashier/*" 
              element={
                <ProtectedRoute allowedRoles={['kasir', 'admin']} redirectTo="/cashier/login">
                  <Routes>
                    <Route path="/" element={<CashierDashboard />} />
                  </Routes>
                </ProtectedRoute>
              } 
            />
            <Route path="/kasir/*" element={<Navigate to="/cashier" replace />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route path="/admin/waiting-approval" element={<AdminWaitingApproval />} />
            <Route path="/admin/inactive" element={<AdminInactive />} />
            <Route 
              path="/admin/*" 
              element={
                <AdminProtectedRoute>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/menu" element={<ManageMenu />} />
                    <Route path="/tables" element={<ManageTables />} />
                    <Route path="/cashier" element={<ManageCashier />} />
                    <Route path="/profile" element={<AdminProfile />} />
                    <Route path="/qr" element={<AdminQR />} />
                  </Routes>
                </AdminProtectedRoute>
              } 
            />

            {/* Super Admin Routes */}
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route 
              path="/superadmin/*" 
              element={
                <ProtectedRoute allowedRoles={['super_admin']} redirectTo="/superadmin/login">
                  <Routes>
                    <Route path="/" element={<SuperAdminDashboard />} />
                    <Route path="/sellers" element={<SuperAdminSellers />} />
                    <Route path="/payments" element={<SuperAdminPayments />} />
                    <Route path="/settings" element={<SuperAdminSettings />} />
                  </Routes>
                </ProtectedRoute>
              } 
            />

            {/* Halaman manapun yang tidak cocok dengan rute di atas */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
      {/* Penanda versi build - selalu kelihatan di semua halaman, kecil di pojok kanan bawah,
          supaya bisa dicek langsung dari layar HP tanpa perlu buka DevTools/Console. */}
      <div
        style={{
          position: 'fixed',
          bottom: 4,
          right: 6,
          fontSize: 10,
          color: 'rgba(0,0,0,0.35)',
          background: 'rgba(255,255,255,0.7)',
          padding: '1px 6px',
          borderRadius: 6,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        v: {new Date(__BUILD_TIME__).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
      </div>
    </AuthProvider>
    </ErrorBoundary>
  );
}
