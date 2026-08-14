import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import SalesChart from '../../components/SalesChart';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import { TrendingUp, ShoppingBag, CheckCircle, User, Calendar, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminDashboard() {
  const { userProfile, sellerData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.seller_id) return;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('seller_id', userProfile.seller_id)
        .order('waktu', { ascending: false });
        
      if (data) {
        setOrders(data as Order[]);
      }
      setLoading(false);
    };

    fetchOrders();

    const channel = supabase
      .channel('admin_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `seller_id=eq.${userProfile.seller_id}` }, () => {
        fetchOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile]);

  if (loading) return <AdminLayout><div>Memuat data...</div></AdminLayout>;

  const totalPendapatan = orders
    .filter(o => o.status === 'dibayar')
    .reduce((acc, order) => acc + order.total_harga, 0);

  const totalPesananSelesai = orders.filter(o => o.status === 'dibayar').length;
  const pesananAktif = orders.filter(o => o.status !== 'dibayar').length;

  const itemTerlaris = orders.reduce((acc, order) => {
    order.items?.forEach(item => {
      acc[item.nama] = (acc[item.nama] || 0) + item.jumlah;
    });
    return acc;
  }, {} as Record<string, number>);

  const topItems = Object.entries(itemTerlaris)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Penjualan</h1>
        <p className="text-gray-500 mt-2">Ringkasan aktivitas restoran Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-green-100 text-green-600 rounded-xl">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-gray-500 font-medium">Total Pendapatan</p>
            <p className="text-2xl font-bold text-gray-900">Rp {totalPendapatan.toLocaleString('id-ID')}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
            <CheckCircle size={28} />
          </div>
          <div>
            <p className="text-gray-500 font-medium">Pesanan Selesai</p>
            <p className="text-2xl font-bold text-gray-900">{totalPesananSelesai}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-orange-100 text-orange-600 rounded-xl">
            <ShoppingBag size={28} />
          </div>
          <div>
            <p className="text-gray-500 font-medium">Pesanan Aktif</p>
            <p className="text-2xl font-bold text-gray-900">{pesananAktif}</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <SalesChart
          data={orders.filter(o => o.status === 'dibayar').map(o => ({ date: o.waktu, value: o.total_harga }))}
          title="Grafik Pendapatan"
          valueLabel="Pendapatan"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Menu Terlaris</h2>
        </div>
        <div className="p-0">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-500">Nama Menu</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-right">Terjual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topItems.map(([nama, jumlah], idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 font-medium text-gray-900">{nama}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-500">{jumlah} porsi</td>
                </tr>
              ))}
              {topItems.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-gray-400">Belum ada data penjualan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Ringkasan Akun */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ringkasan Akun</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                <User size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Status Restoran</p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                  sellerData?.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {sellerData?.status?.toUpperCase() || '-'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                <Calendar size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Masa Aktif Sampai</p>
                <p className="font-medium text-gray-800 text-sm truncate">
                  {sellerData?.masa_aktif_sampai || 'Belum diatur'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                <Mail size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Email Admin</p>
                <p className="font-medium text-gray-800 text-sm truncate">{userProfile?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Riwayat Transaksi Terakhir */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Riwayat Transaksi Terakhir</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 font-medium text-gray-500">Waktu</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Meja</th>
                  <th className="px-6 py-4 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-4 font-medium text-gray-500 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.slice(0, 5).map(order => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(order.waktu).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{order.nomor_meja || order.tables?.nomor_meja || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'dibayar' ? 'bg-green-100 text-green-700' :
                        order.status === 'selesai' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'diproses' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">Rp {order.total_harga.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Belum ada transaksi</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
