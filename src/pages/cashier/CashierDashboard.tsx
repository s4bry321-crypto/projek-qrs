import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Printer, LogOut, Check, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function CashierDashboard() {
  const { signOut, userProfile, sellerData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showNewOrderBanner, setShowNewOrderBanner] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const playNewOrderSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const playBeep = (startTime: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
      };
      playBeep(ctx.currentTime);
      playBeep(ctx.currentTime + 0.4);
    } catch (err) {
      console.error('Gagal memutar suara notifikasi:', err);
    }
  };

  useEffect(() => { if (!userProfile?.seller_id) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*), tables(nomor_meja)')
        .eq('seller_id', userProfile.seller_id)
        .order('waktu', { ascending: false });
      if (data) {
        const mappedOrders = data.map((d: any) => ({
           ...d,
           nomor_meja: d.tables?.nomor_meja || '?'
        }));
        setOrders(mappedOrders as Order[]);
        
        setSelectedOrder(prev => {
          if (!prev) return null;
          const updated = mappedOrders.find(o => o.id === prev.id);
          return updated ? (updated as Order) : null;
        });
      }
    };

    fetchOrders();

    const channel = supabase
      .channel('orders_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `seller_id=eq.${userProfile.seller_id}` }, () => {
        playNewOrderSound();
        setShowNewOrderBanner(true);
        setTimeout(() => setShowNewOrderBanner(false), 6000);
        fetchOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `seller_id=eq.${userProfile.seller_id}` }, () => {
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

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
        
      if (error) {
        console.error("Gagal update pesanan:", error);
        alert(`Gagal mengupdate status pesanan: ${error.message}`);
        return;
      }
      
      // If status is dibayar, set table back to kosong
      if (newStatus === 'dibayar') {
         const orderToUpdate = orders.find(o => o.id === orderId);
         if (orderToUpdate?.table_id) {
           const { error: tableError } = await supabase
             .from('tables')
             .update({ status: 'kosong' })
             .eq('id', orderToUpdate.table_id);
           if (tableError) {
             console.error("Gagal update meja:", tableError);
             alert(`Pesanan berhasil dibayar, namun status meja gagal diubah: ${tableError.message}`);
           }
         }
         
         if (selectedOrder?.id === orderId) {
           setSelectedOrder(null);
         }
      }
    } catch (err: any) {
      console.error(err);
      alert(`Terjadi kesalahan: ${err.message || 'Gagal mengupdate status'}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Kasir</h1>
          <p className="text-sm text-gray-500">Masuk sebagai: {userProfile?.email}</p>
        </div>
        <button onClick={signOut} className="text-gray-500 hover:text-red-500 flex items-center gap-2">
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Kolom Daftar Pesanan */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col max-h-[calc(100vh-8rem)]">
          <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Bell size={18} className={`text-orange-500 ${showNewOrderBanner ? 'animate-bounce' : ''}`} /> Pesanan Aktif
            </h2>
          </div>
          {showNewOrderBanner && (
            <div className="mx-3 mt-3 p-3 rounded-lg bg-orange-100 text-orange-800 text-sm font-medium text-center animate-pulse">
              🔔 Pesanan baru masuk!
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {orders.filter(o => o.status !== 'dibayar').map(order => (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className={`p-4 rounded-lg cursor-pointer border transition-colors ${
                  selectedOrder?.id === order.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-lg">Meja {order.nomor_meja}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    order.status === 'baru' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'diproses' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{order.items?.length || 0} Item</span>
                  <span>Rp {order.total_harga.toLocaleString('id-ID')}</span>
                </div>
              </div>
            ))}
            {orders.filter(o => o.status !== 'dibayar').length === 0 && (
              <div className="text-center p-4 text-gray-500">Tidak ada pesanan aktif.</div>
            )}
          </div>
        </div>

        {/* Kolom Detail Pesanan */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          {selectedOrder ? (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Meja {selectedOrder.nomor_meja}</h2>
                  <p className="text-gray-500 text-sm">
                    {selectedOrder.waktu ? format(new Date(selectedOrder.waktu), 'dd MMM yyyy, HH:mm') : 'Waktu tidak diketahui'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
                  >
                    <Printer size={18} /> Cetak Struk
                  </button>
                  {selectedOrder.status === 'baru' && (
                    <button onClick={() => updateStatus(selectedOrder.id, 'diproses')} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition">
                      Proses <ArrowRight size={18} />
                    </button>
                  )}
                  {selectedOrder.status === 'diproses' && (
                    <button onClick={() => updateStatus(selectedOrder.id, 'selesai')} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition">
                      Siap <Check size={18} />
                    </button>
                  )}
                  {selectedOrder.status === 'selesai' && (
                    <button onClick={() => updateStatus(selectedOrder.id, 'dibayar')} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition">
                      Tandai Sudah Dibayar <Check size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 text-sm">
                      <th className="pb-3 font-medium">Item</th>
                      <th className="pb-3 font-medium text-center">Qty</th>
                      <th className="pb-3 font-medium text-right">Harga</th>
                      <th className="pb-3 font-medium text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-3">
                          <div className="font-medium text-gray-900">{item.nama}</div>
                          {item.catatan && <div className="text-sm text-gray-500">Catatan: {item.catatan}</div>}
                        </td>
                        <td className="py-3 text-center">{item.jumlah}</td>
                        <td className="py-3 text-right">Rp {item.harga.toLocaleString('id-ID')}</td>
                        <td className="py-3 text-right font-medium">Rp {(item.harga * item.jumlah).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                <span className="text-xl text-gray-600">Total Harga</span>
                <span className="text-3xl font-bold text-gray-900">Rp {selectedOrder.total_harga.toLocaleString('id-ID')}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Pilih pesanan di samping untuk melihat detail.
            </div>
          )}
        </div>
      </main>

      {/* Tampilan Struk Khusus Print */}
      {selectedOrder && (
        <div className="hidden print:block text-black p-4 bg-white max-w-sm mx-auto" ref={printRef}>
          <div className="text-center border-b border-black pb-4 mb-4">
            <h1 className="text-2xl font-bold uppercase">{sellerData?.nama_restoran || 'Restoran'}</h1>
          </div>
          <div className="mb-4 text-sm">
            <p><strong>Meja:</strong> {selectedOrder.nomor_meja}</p>
            <p><strong>Waktu:</strong> {selectedOrder.waktu ? format(new Date(selectedOrder.waktu), 'dd MMM yyyy, HH:mm') : '-'}</p>
            <p><strong>Order ID:</strong> {selectedOrder.id.slice(-6).toUpperCase()}</p>
          </div>
          <div className="border-b border-black pb-2 mb-2 text-sm">
            {selectedOrder.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between mb-1">
                <div className="flex-1">
                  <div>{item.nama}</div>
                  <div className="text-xs">{item.jumlah} x {item.harga.toLocaleString('id-ID')}</div>
                </div>
                <div className="font-bold">
                  {(item.harga * item.jumlah).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center text-lg font-bold border-b border-black pb-2 mb-4">
            <span>TOTAL</span>
            <span>Rp {selectedOrder.total_harga.toLocaleString('id-ID')}</span>
          </div>
          <div className="text-center text-sm">
            <p>Terima kasih atas kunjungan Anda!</p>
            <p>Silakan datang kembali.</p>
          </div>
        </div>
      )}
    </div>
  );
}
