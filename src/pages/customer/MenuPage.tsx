import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Category, MenuItem, Table, Seller } from '../../types';
import { useCart } from '../../contexts/CartContext';
import MenuCard from '../../components/MenuCard';
import { ShoppingCart } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function MenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const { tableNumber, setTableNumber, totalItems, totalPrice, ensureSellerContext } = useCart();
  const navigate = useNavigate();

  const [seller, setSeller] = useState<Seller | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  const [loading, setLoading] = useState(true);
  const [loadingTables, setLoadingTables] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!slug) return;
      try {
        const { data, error } = await supabase
          .from('sellers')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (error || !data || data.status !== 'aktif') {
          setSeller(null);
        } else {
          setSeller(data as Seller);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSeller(false);
      }
    };
    fetchSeller();
  }, [slug]);

  useEffect(() => {
    if (seller) {
      ensureSellerContext(seller.id);
    }
  }, [seller, ensureSellerContext]);

  useEffect(() => {
    if (!seller) return;

    const fetchMenu = async () => {
      try {
        const { data: catData, error: catError } = await supabase.from('categories').select('*').eq('seller_id', seller.id);
        if (catError) {
          setErrorMsg('Gagal memuat kategori: ' + catError.message);
          return;
        }
        if (catData) setCategories(catData as Category[]);

        const { data: menuData, error: menuError } = await supabase.from('menu_items').select('*').eq('seller_id', seller.id);
        if (menuError) {
          setErrorMsg('Gagal memuat menu: ' + menuError.message);
          return;
        }
        if (menuData) setMenuItems(menuData as MenuItem[]);
        
        setErrorMsg(null);
      } catch (err: any) {
        setErrorMsg('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchTables = async () => {
      try {
        const { data, error } = await supabase.from('tables').select('*').eq('seller_id', seller.id).order('nomor_meja', { ascending: true });
        if (error) {
          setErrorMsg('Gagal memuat meja: ' + error.message);
          return;
        }
        if (data) {
          const sortedTables = (data as Table[]).sort((a, b) => parseInt(a.nomor_meja) - parseInt(b.nomor_meja));
          setTables(sortedTables);
        }
      } catch (err: any) {
        setErrorMsg('Error: ' + err.message);
      } finally {
        setLoadingTables(false);
      }
    };

    fetchMenu();
    fetchTables();

    const tableSub = supabase
      .channel(`tables_changes_${seller.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `seller_id=eq.${seller.id}` }, () => {
        fetchTables();
      })
      .subscribe();

    const menuSub = supabase
      .channel(`menu_changes_${seller.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `seller_id=eq.${seller.id}` }, () => {
        fetchMenu();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tableSub);
      supabase.removeChannel(menuSub);
    };
  }, [seller]);

  if (loadingSeller) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Memuat...</div>;
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restoran Tidak Ditemukan</h1>
          <p className="text-gray-500">Restoran yang Anda tuju tidak ditemukan atau sedang tidak aktif.</p>
        </div>
      </div>
    );
  }

  const availableMenuItems = menuItems.filter(m => m.status === 'tersedia');
  
  const filteredMenu = activeCategory === 'all' 
    ? availableMenuItems 
    : availableMenuItems.filter(m => m.category_id === activeCategory);

  if (!tableNumber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Selamat Datang di {seller.nama_restoran}!</h1>
          <p className="text-gray-500 mb-6">Silakan pilih nomor meja Anda untuk mulai memesan.</p>
          
          {errorMsg && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {loadingTables ? (
              <div className="col-span-3 text-gray-400 py-4">Memuat meja...</div>
            ) : tables.length > 0 ? tables.map(t => (
              <button
                key={t.id}
                onClick={() => setTableNumber(t.nomor_meja)}
                className={`py-6 rounded-2xl border-2 font-bold text-3xl transition-all shadow-sm active:scale-95 ${
                  t.status === 'terisi' 
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-70'
                    : 'border-orange-200 bg-white hover:border-orange-500 hover:bg-orange-50 text-orange-600 shadow-orange-50'
                }`}
                disabled={t.status === 'terisi'}
              >
                {t.nomor_meja}
              </button>
            )) : (
              <div className="col-span-3 text-gray-400 py-4 text-center">
                Belum ada meja tersedia.<br/>
                <span className="text-sm">Silakan hubungi kasir atau admin.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{seller.nama_restoran}</h1>
            <p className="text-sm text-gray-500">Meja: {tableNumber}</p>
          </div>
          <button 
            onClick={() => setTableNumber(null)}
            className="text-xs text-orange-500 hover:text-orange-700 underline"
          >
            Ganti Meja
          </button>
        </div>
        
        {/* Categories Tab */}
        <div className="max-w-4xl mx-auto px-4 py-3 flex overflow-x-auto hide-scrollbar gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
              activeCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua Menu
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                activeCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.nama}
            </button>
          ))}
        </div>
      </header>

      {/* Menu Grid */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Memuat menu...</div>
        ) : filteredMenu.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredMenu.map(item => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">Belum ada menu yang tersedia.</div>
        )}
      </main>

      {/* Floating Cart Icon */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-20 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button 
              onClick={() => navigate(`/r/${slug}/cart`)}
              className="w-full bg-gray-900 text-white p-4 rounded-xl shadow-xl flex items-center justify-between hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart size={24} />
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {totalItems}
                  </span>
                </div>
                <span className="font-medium">Lihat Keranjang</span>
              </div>
              <span className="font-bold">Rp {totalPrice.toLocaleString('id-ID')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
