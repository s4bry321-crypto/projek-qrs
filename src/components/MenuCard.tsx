import React, { useState } from 'react';
import { MenuItem } from '../types';
import { useCart } from '../contexts/CartContext';
import { Plus, Minus, ShoppingCart } from 'lucide-react';

const MenuCard: React.FC<{ item: MenuItem }> = ({ item }) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    addToCart(item, quantity, notes);
    setQuantity(1);
    setNotes('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {item.foto_url ? (
        <img src={item.foto_url} alt={item.nama} className="w-full h-48 object-cover" />
      ) : (
        <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">
          No Image
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-gray-800">{item.nama}</h3>
          <span className="font-bold text-orange-600">Rp {item.harga.toLocaleString('id-ID')}</span>
        </div>
        <p className="text-gray-500 text-sm mb-4 flex-1">{item.deskripsi}</p>
        
        {item.status === 'tersedia' ? (
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Catatan (opsional)" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 text-gray-500 hover:bg-gray-50 rounded-l-lg"><Minus size={16} /></button>
                <span className="px-3 py-1 font-medium min-w-[2.5rem] text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-2 text-gray-500 hover:bg-gray-50 rounded-r-lg"><Plus size={16} /></button>
              </div>
              <button 
                onClick={handleAdd}
                className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <ShoppingCart size={18} />
                <span className="font-medium text-sm">Tambah</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto py-2 text-center text-red-500 font-medium bg-red-50 rounded-lg">
            Habis
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuCard;
