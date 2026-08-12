import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import { CheckCircle2, Clock, ChefHat, ArrowLeft } from 'lucide-react';

export default function OrderStatusPage() {
  const { slug, orderId } = useParams<{ slug: string, orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, items:order_items(*), tables(nomor_meja)')
        .eq('id', orderId)
        .single();

      if (orderData) {
        const mappedOrder = {
          ...orderData,
          nomor_meja: (orderData as any).tables?.nomor_meja || '?'
        };
        setOrder(mappedOrder as Order);
      }
      setLoading(false);
    };

    fetchOrder();

    const orderSub = supabase
      .channel(`order_${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, () => {
        fetchOrder();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderSub);
    };
  }, [orderId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat status pesanan...</div>;
  }

  if (!order) {
    return <div className="min-h-screen flex items-center justify-center">Pesanan tidak ditemukan.</div>;
  }

  const getStatusDisplay = () => {
    switch (order.status) {
      case 'baru':
        return { icon: <Clock size={48} className="text-blue-500" />, text: 'Pesanan Diterima', color: 'text-blue-500', bg: 'bg-blue-50' };
      case 'diproses':
        return { icon: <ChefHat size={48} className="text-orange-500" />, text: 'Sedang Dimasak', color: 'text-orange-500', bg: 'bg-orange-50' };
      case 'selesai':
        return { icon: <CheckCircle2 size={48} className="text-green-500" />, text: 'Siap Disajikan', color: 'text-green-500', bg: 'bg-green-50' };
      case 'dibayar':
        return { icon: <CheckCircle2 size={48} className="text-gray-500" />, text: 'Pesanan Selesai', color: 'text-gray-500', bg: 'bg-gray-50' };
      default:
        return { icon: <Clock size={48} />, text: 'Status Tidak Diketahui', color: 'text-gray-500', bg: 'bg-gray-50' };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(`/r/${slug}`)} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Status Pesanan</h1>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className={`p-8 rounded-2xl flex flex-col items-center justify-center mb-8 ${statusInfo.bg}`}>
          <div className="mb-4">{statusInfo.icon}</div>
          <h2 className={`text-2xl font-bold ${statusInfo.color}`}>{statusInfo.text}</h2>
          <p className="text-gray-600 mt-2">Meja: <span className="font-bold text-gray-900">{order.nomor_meja}</span></p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Rincian Pesanan</h3>
          <div className="space-y-4 mb-6">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{item.jumlah}x {item.nama}</p>
                  {item.catatan && <p className="text-sm text-gray-500">Catatan: {item.catatan}</p>}
                </div>
                <p className="font-medium text-gray-900">Rp {(item.harga * item.jumlah).toLocaleString('id-ID')}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <span className="font-bold text-gray-600">Total</span>
            <span className="font-bold text-xl text-gray-900">Rp {order.total_harga.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
