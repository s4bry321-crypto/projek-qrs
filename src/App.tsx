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

const ProtectedRoute = ({ children, allowedRoles, redirectTo }: { children: React.ReactNode, allowedRoles: string[], redirectTo: string }) => {
  const { userProfile, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;

  if (!userProfile || !allowedRoles.includes(userProfile.role)) {
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
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Customer Routes */}
            <Route path="/r/:slug" element={<MenuPage />} />
            <Route path="/r/:slug/cart" element={<CartPage />} />
            <Route path="/r/:slug/order/:orderId" element={<OrderStatusPage />} />
            <Route path="/" element={<div className="min-h-screen flex items-center justify-center text-gray-500">Silakan scan QR Code restoran untuk memesan.</div>} />

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
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
