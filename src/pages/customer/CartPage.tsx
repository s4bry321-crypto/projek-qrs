import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const { cart, updateQuantity, removeFromCart, totalPrice, clearCart, tableNumber } = useCart();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitOrder = async () => {
    if (!tableNumber || cart.length === 0 || !slug) return;
    setIsSubmitting(true);
    try {
      // Kirim cuma ID, jumlah, & catatan -- harga & nama TIDAK dikirim dari
      // sini sama sekali. create_order() menghitung ulang harga tiap item
      // dari tabel menu_items di server, jadi angka yang tersimpan (dan
      // yang nanti ditagih kasir) selalu harga asli saat ini, bukan apapun
      // yang ada di keranjang browser.
      const { data, error: rpcError } = await supabase.rpc('create_order', {
        p_seller_slug: slug,
        p_nomor_meja: tableNumber,
        p_items: cart.map(item => ({
          menu_item_id: item.menu_id,
          jumlah: item.jumlah,
          catatan: item.catatan || null
        }))
      });

      if (rpcError) throw rpcError;

      clearCart();
      navigate(`/r/${slug}/order/${data.order_id}`);
    } catch (error: any) {
      console.error("Error placing order: ", error);
      alert(error?.message || "Gagal mengirim pesanan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Keranjang Kosong</h2>
        <p className="text-gray-500 mb-6">Anda belum menambahkan makanan ke keranjang.</p>
        <button 
          onClick={() => navigate(`/r/${slug}`)}
          className="bg-brand-600 text-white px-6 py-2 rounded-full font-medium hover:bg-brand-700 transition"
        >
          Lihat Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 pb-32">
      <header className="bg-white shadow-sm sticky top-0 z-10 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(`/r/${slug}`)} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Keranjang Pesanan</h1>
      </header>


      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {cart.map(item => (
          <div key={item.menu_id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{item.nama}</h3>
                <p className="text-brand-600 font-medium">Rp {item.harga.toLocaleString('id-ID')}</p>
              </div>
              <button onClick={() => removeFromCart(item.menu_id)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 size={20} />
              </button>
            </div>
            
            {item.catatan && (
              <p className="text-sm text-gray-500 bg-cream-100 p-2 rounded">
                Catatan: {item.catatan}
              </p>
            )}

            <div className="flex items-center justify-between mt-2">
              <span className="font-semibold text-gray-800">
                Rp {(item.harga * item.jumlah).toLocaleString('id-ID')}
              </span>
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button onClick={() => updateQuantity(item.menu_id, -1)} className="p-2 text-gray-500 hover:bg-gray-50 rounded-l-lg"><Minus size={16} /></button>
                <span className="px-3 py-1 font-medium min-w-[2.5rem] text-center">{item.jumlah}</span>
                <button onClick={() => updateQuantity(item.menu_id, 1)} className="p-2 text-gray-500 hover:bg-gray-50 rounded-r-lg"><Plus size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center text-lg">
            <span className="text-gray-600">Total Pembayaran</span>
            <span className="font-bold text-gray-900 text-xl">Rp {totalPrice.toLocaleString('id-ID')}</span>
          </div>
          <button 
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className="w-full bg-brand-600 text-white font-bold py-4 rounded-2xl hover:bg-brand-700 transition disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {isSubmitting ? 'Mengirim Pesanan...' : 'Kirim Pesanan'}
          </button>
        </div>
      </div>
    </div>
  );
}
