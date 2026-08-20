import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Printer, LogOut, Check, ArrowRight, Camera, Coins, PieChart, ClipboardCheck, Plus } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { uploadProfilAsset } from '../../lib/uploadImage';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export default function CashierDashboard() {
  const { signOut, userProfile, sellerData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showNewOrderBanner, setShowNewOrderBanner] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;
    setIsUploadingPhoto(true);
    try {
      const url = await uploadProfilAsset(file);
      const { error } = await supabase.from('profiles').update({ foto_url: url }).eq('id', userProfile.id);
      if (error) throw new Error(error.message);
      window.location.reload();
    } catch (err: any) {
      alert('Gagal mengupload foto profil: ' + err.message);
      setIsUploadingPhoto(false);
    }
  };

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

  // Dipindah keluar dari useEffect (tanpa mengubah isinya sama sekali) supaya
  // bisa juga dipanggil manual dari tombol FAB, bukan cuma otomatis lewat
  // realtime subscription.
  const fetchOrders = async () => {
    if (!userProfile?.seller_id) return;
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

  useEffect(() => { if (!userProfile?.seller_id) return;
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

      // Update tampilan langsung (optimistic) - tidak perlu nunggu realtime/refresh manual
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setSelectedOrder(prev => (prev && prev.id === orderId ? { ...prev, status: newStatus } : prev));
      
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

  const buildStrukText = (order: Order): string => {
    const lines: string[] = [];
    lines.push((sellerData?.nama_restoran || 'Restoran').toUpperCase());
    lines.push('================================');
    lines.push(`Meja: ${order.nomor_meja}`);
    lines.push(`Waktu: ${order.waktu ? format(new Date(order.waktu), 'dd MMM yyyy, HH:mm') : '-'}`);
    lines.push(`Order ID: ${order.id.slice(-6).toUpperCase()}`);
    lines.push('--------------------------------');
    order.items?.forEach(item => {
      lines.push(`${item.nama}`);
      lines.push(`  ${item.jumlah} x ${item.harga.toLocaleString('id-ID')} = ${(item.harga * item.jumlah).toLocaleString('id-ID')}`);
    });
    lines.push('--------------------------------');
    lines.push(`TOTAL: Rp ${order.total_harga.toLocaleString('id-ID')}`);
    lines.push('================================');
    lines.push('Terima kasih atas kunjungan Anda!');
    return lines.join('\n');
  };

  const handlePrint = async () => {
    // window.print() tidak didukung di WebView Android (Capacitor) - cuma jalan
    // normal di browser biasa (web/PWA). Kalau berjalan sebagai aplikasi native,
    // pakai Share sheet Android supaya masih bisa dikirim/print lewat aplikasi lain
    // (Google Cloud Print, WhatsApp, simpan sebagai file, dll).
    if (Capacitor.isNativePlatform()) {
      if (!selectedOrder) return;
      try {
        await Share.share({
          title: `Struk - Meja ${selectedOrder.nomor_meja}`,
          text: buildStrukText(selectedOrder),
          dialogTitle: 'Bagikan / Cetak Struk',
        });
      } catch (err: any) {
        // Pengguna membatalkan share sheet - bukan error, abaikan saja.
        if (err?.message && !err.message.toLowerCase().includes('cancel')) {
          console.error('Gagal membagikan struk:', err);
          alert('Gagal membagikan struk: ' + err.message);
        }
      }
    } else {
      window.print();
    }
  };

  // --- Nilai turunan untuk 3 kotak statistik (dihitung langsung dari state
  // `orders` yang sudah ada, BUKAN query Supabase baru). Karena skema saat
  // ini tidak menyimpan batas waktu "shift", Pendapatan Shift = total semua
  // pesanan yang sudah dibayar pada data yang sedang dimuat.
  const pendapatanShift = orders
    .filter(o => o.status === 'dibayar')
    .reduce((sum, o) => sum + (o.total_harga || 0), 0);
  const pesananProsesCount = orders.filter(o => o.status === 'baru' || o.status === 'diproses').length;
  const pesananSelesaiCount = orders.filter(o => o.status === 'selesai' || o.status === 'dibayar').length;

  const getElapsedLabel = (waktu?: string) => {
    if (!waktu) return '-';
    const mnt = differenceInMinutes(new Date(), new Date(waktu));
    if (mnt < 1) return 'Baru saja';
    if (mnt < 60) return `${mnt} mnt`;
    return `${Math.floor(mnt / 60)} jam`;
  };

  const statusPillClass = (status: string) => {
    switch (status) {
      case 'baru': return 'bg-purple-100 text-purple-700';
      case 'diproses': return 'bg-blue-100 text-blue-700';
      default: return 'bg-teal-100 text-teal-700';
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <header 
        className="bg-white shadow-sm px-6 py-4 flex justify-between items-center print:hidden shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <div className="flex items-center gap-3">
          <div className="relative group shrink-0">
            <div className="w-11 h-11 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {userProfile?.foto_url ? (
                <img src={userProfile.foto_url} alt="Foto profil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-500 font-bold text-sm">
                  {(userProfile?.nama || userProfile?.email || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition disabled:opacity-100"
              title="Ganti foto profil"
            >
              <Camera size={11} />
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard Kasir</h1>
            <p className="text-sm text-gray-500">Masuk sebagai: {userProfile?.email}</p>
          </div>
        </div>
        <button onClick={signOut} className="text-gray-500 hover:text-red-500 flex items-center gap-2">
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 py-5 max-w-2xl w-full mx-auto print:hidden">
        {/* Statistik */}
        <div className="grid grid-cols-3 gap-3 mb-6 shrink-0">
          <div className="bg-indigo-50 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-indigo-500 mb-2">
              <Coins size={16} />
              <span className="text-xs font-medium text-gray-700 leading-tight">Pendapatan Shift</span>
            </div>
            <p className="text-lg font-bold text-gray-900">Rp {pendapatanShift.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-indigo-50 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-indigo-500 mb-2">
              <PieChart size={16} />
              <span className="text-xs font-medium text-gray-700 leading-tight">Pesanan Proses</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{pesananProsesCount}</p>
          </div>
          <div className="bg-indigo-50 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-indigo-500 mb-2">
              <ClipboardCheck size={16} />
              <span className="text-xs font-medium text-gray-700 leading-tight">Pesanan Selesai</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{pesananSelesaiCount}</p>
          </div>
        </div>

        {/* Daftar Pesanan Aktif (gaya tiket) */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex-1 overflow-y-auto min-h-0">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Bell size={18} className={`text-orange-500 ${showNewOrderBanner ? 'animate-bounce' : ''}`} /> Pesanan Aktif
          </h2>

          {showNewOrderBanner && (
            <div className="mb-3 p-3 rounded-lg bg-orange-100 text-orange-800 text-sm font-medium text-center animate-pulse">
              🔔 Pesanan baru masuk!
            </div>
          )}

          <div className="space-y-3">
            {orders.filter(o => o.status !== 'dibayar').map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-4 rounded-2xl cursor-pointer border-2 border-dashed bg-white shadow-sm transition-colors flex items-center justify-between gap-2 flex-wrap ${
                  selectedOrder?.id === order.id ? 'border-indigo-400' : 'border-gray-300 hover:border-indigo-300'
                }`}
              >
                <span className="font-extrabold text-xl text-gray-900">Meja {order.nomor_meja}</span>
                <div className="flex items-center gap-3 text-sm">
                  <span className={`px-3 py-1 rounded-full font-semibold ${statusPillClass(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <span className="text-gray-500">{getElapsedLabel(order.waktu)}</span>
                  <span className="text-gray-500">{order.items?.length || 0} Item</span>
                </div>
              </div>
            ))}
            {orders.filter(o => o.status !== 'dibayar').length === 0 && (
              <div className="text-center p-4 text-gray-500">Tidak ada pesanan aktif.</div>
            )}
          </div>
        </div>

        {/* Detail Pesanan - tampil di bawah daftar (bukan di samping), sesuai
            layout satu kolom untuk layar sempit */}
        <div className="bg-gray-50 rounded-2xl p-4 min-h-[16rem] flex flex-col">
          {selectedOrder ? (
            <>
              <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Meja {selectedOrder.nomor_meja}</h2>
                  <p className="text-gray-500 text-sm">
                    {selectedOrder.waktu ? format(new Date(selectedOrder.waktu), 'dd MMM yyyy, HH:mm') : 'Waktu tidak diketahui'}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium transition border border-gray-200"
                  >
                    <Printer size={18} /> {Capacitor.isNativePlatform() ? 'Bagikan / Cetak Struk' : 'Cetak Struk'}
                  </button>
                  {selectedOrder.status === 'baru' && (
                    <button onClick={() => updateStatus(selectedOrder.id, 'diproses')} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition">
                      Proses <ArrowRight size={18} />
                    </button>
                  )}
                  {selectedOrder.status === 'diproses' && (
                    <button onClick={() => updateStatus(selectedOrder.id, 'selesai')} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition">
                      Siap <Check size={18} />
                    </button>
                  )}
                  {selectedOrder.status === 'selesai' && (
                    <button onClick={() => updateStatus(selectedOrder.id, 'dibayar')} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium transition">
                      Tandai Sudah Dibayar <Check size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-6 -mx-1 px-1">
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
            <div className="flex-1 flex items-center justify-center text-center text-gray-400 px-6 py-10">
              ☕ Klik pada salah satu pesanan aktif di atas untuk melihat detail lengkap, riwayat, dan instruksi dapur. ☕
            </div>
          )}
        </div>
      </main>

      {/* Tombol FAB - refresh manual daftar pesanan (memanggil ulang fetchOrders
          yang sama persis, cuma sekarang bisa dipicu manual juga) */}
      <button
        onClick={fetchOrders}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition print:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Muat ulang pesanan"
      >
        <Plus size={26} />
      </button>

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
