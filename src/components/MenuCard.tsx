import React from 'react';
import { MenuItem } from '../types';
import { useCart } from '../contexts/CartContext';
import { Plus } from 'lucide-react';

// Kartu menu gaya "premium" - foto penuh di atas, nama, deskripsi singkat,
// harga mencolok, dan tombol bulat '+' untuk langsung menambah 1 ke keranjang.
// Pengaturan jumlah/catatan detail dipindah ke halaman Keranjang.
const MenuCard: React.FC<{ item: MenuItem }> = ({ item }) => {
  const { addToCart } = useCart();

  const handleAdd = () => {
    if (item.status !== 'tersedia') return;
    addToCart(item, 1, '');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className="relative">
        {item.foto_url ? (
          <img src={item.foto_url} alt={item.nama} className="w-full h-28 sm:h-36 object-cover" />
        ) : (
          <div className="w-full h-28 sm:h-36 bg-gray-100 flex items-center justify-center text-gray-300 text-xs">
            No Image
          </div>
        )}
        {item.status !== 'tersedia' && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-red-500 text-xs font-bold bg-white px-3 py-1 rounded-full shadow-sm">Habis</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-sm text-gray-900 leading-tight mb-1 line-clamp-1">{item.nama}</h3>
        <p className="text-gray-400 text-xs mb-3 flex-1 line-clamp-1">{item.deskripsi || 'Menu favorit'}</p>

        <div className="flex items-center justify-between">
          <span className="font-bold text-orange-500 text-sm">Rp {item.harga.toLocaleString('id-ID')}</span>
          {item.status === 'tersedia' && (
            <button
              onClick={handleAdd}
              className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center transition-all shrink-0"
              aria-label={`Tambah ${item.nama} ke keranjang`}
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
