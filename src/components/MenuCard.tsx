import React from 'react';
import { MenuItem } from '../types';
import { useCart } from '../contexts/CartContext';
import { Plus } from 'lucide-react';

// Kartu menu - foto penuh di atas dengan tombol '+' melayang di sudutnya,
// nama, deskripsi singkat, tag kategori, dan harga dalam pil lembut.
// Pengaturan jumlah/catatan detail dipindah ke halaman Keranjang.
const MenuCard: React.FC<{ item: MenuItem; categoryName?: string }> = ({ item, categoryName }) => {
  const { addToCart } = useCart();

  const handleAdd = () => {
    if (item.status !== 'tersedia') return;
    addToCart(item, 1, '');
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow overflow-visible flex flex-col">
      <div className="relative">
        {item.foto_url ? (
          <img src={item.foto_url} alt={item.nama} className="w-full h-28 sm:h-36 object-cover rounded-t-3xl" />
        ) : (
          <div className="w-full h-28 sm:h-36 bg-cream-100 flex items-center justify-center text-brand-200 text-xs rounded-t-3xl">
            No Image
          </div>
        )}
        {item.status !== 'tersedia' && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center rounded-t-3xl">
            <span className="text-brand-600 text-xs font-bold bg-white px-3 py-1 rounded-full shadow-sm">Habis</span>
          </div>
        )}
        {item.status === 'tersedia' && (
          <button
            onClick={handleAdd}
            className="absolute -bottom-4 right-3 w-9 h-9 rounded-full bg-brand-600 hover:bg-brand-700 active:scale-95 text-white flex items-center justify-center transition-all shrink-0 shadow-lg ring-4 ring-white"
            aria-label={`Tambah ${item.nama} ke keranjang`}
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className="p-3 pt-4 flex flex-col flex-1">
        <h3 className="font-semibold text-sm text-gray-900 leading-tight mb-1 line-clamp-1">{item.nama}</h3>
        <p className="text-gray-400 text-xs mb-2 flex-1 line-clamp-1">{item.deskripsi || 'Menu favorit'}</p>

        <div className="flex items-center justify-between gap-2 mt-1">
          {categoryName ? (
            <span className="text-[10px] font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-full truncate">
              {categoryName}
            </span>
          ) : <span />}
          <span className="font-bold text-brand-600 text-sm whitespace-nowrap">Rp {item.harga.toLocaleString('id-ID')}</span>
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
