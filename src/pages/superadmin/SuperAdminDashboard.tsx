import React, { useEffect, useState } from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { supabase } from '../../lib/supabase';
import { Payment } from '../../types';
import { TrendingUp, CreditCard, Store } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function SuperAdminDashboard() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalSellers, setTotalSellers] = useState(0);
  const [activeSellers, setActiveSellers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [paymentsRes, sellersRes] = await Promise.all([
      supabase.from('payments').select('*, sellers(nama_restoran)').order('tanggal', { ascending: false }),
      supabase.from('sellers').select('id, status')
    ]);

    if (paymentsRes.data) {
      setPayments(paymentsRes.data as Payment[]);
    }
    
    if (sellersRes.data) {
      setTotalSellers(sellersRes.data.length);
      setActiveSellers(sellersRes.data.filter(s => s.status === 'aktif').length);
    }
    
    setLoading(false);
  };

  const totalPendapatan = payments.reduce((acc, curr) => acc + curr.jumlah, 0);
  
  const now = new Date();
  const startOfCurrentMonth = startOfMonth(now);
  const endOfCurrentMonth = endOfMonth(now);
  
  const pendapatanBulanIni = payments
    .filter(p => isWithinInterval(new Date(p.tanggal), { start: startOfCurrentMonth, end: endOfCurrentMonth }))
    .reduce((acc, curr) => acc + curr.jumlah, 0);

  const recentPayments = payments.slice(0, 5);

  return (
    <SuperAdminLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Ringkasan Penghasilan</h2>
        <p className="text-slate-500 mt-2">Pantau pendapatan platform dari pembayaran restoran.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-green-100 text-green-600 p-3 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Pendapatan (Semua)</p>
              <h3 className="text-2xl font-bold text-slate-900">Rp {totalPendapatan.toLocaleString('id-ID')}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Pendapatan Bulan Ini</p>
              <h3 className="text-2xl font-bold text-slate-900">Rp {pendapatanBulanIni.toLocaleString('id-ID')}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-orange-100 text-orange-600 p-3 rounded-xl">
              <Store size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Restoran Aktif</p>
              <h3 className="text-2xl font-bold text-slate-900">{activeSellers} <span className="text-sm font-normal text-slate-500">/ {totalSellers}</span></h3>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-4">Pembayaran Terbaru</h3>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold">Tanggal</th>
                <th className="p-4 font-semibold">Restoran</th>
                <th className="p-4 font-semibold">Jumlah (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">Memuat data...</td>
                </tr>
              ) : recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">Belum ada data pembayaran.</td>
                </tr>
              ) : (
                recentPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="p-4 text-slate-700">
                      {format(new Date(payment.tanggal), 'dd MMM yyyy')}
                    </td>
                    <td className="p-4 font-medium text-slate-900">
                      {payment.sellers?.nama_restoran || '-'}
                    </td>
                    <td className="p-4 font-bold text-green-600">
                      Rp {payment.jumlah.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </SuperAdminLayout>
  );
}
