import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Category, MenuItem, Table, Seller } from '../../types';
import { useCart } from '../../contexts/CartContext';
import MenuCard from '../../components/MenuCard';
import { ShoppingCart, Search, MapPin, UtensilsCrossed, LayoutGrid } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  
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
          const sortedTables = (data as Table[]).sort((a, b) => 
            a.nomor_meja.localeCompare(b.nomor_meja, undefined, { numeric: true, sensitivity: 'base' })
          );
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
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restoran Tidak Ditemukan</h1>
          <p className="text-gray-500">Restoran yang Anda tuju tidak ditemukan atau sedang tidak aktif.</p>
        </div>
      </div>
    );
  }

  const availableMenuItems = menuItems.filter(m => m.status === 'tersedia');
  
  const filteredMenu = (activeCategory === 'all' 
    ? availableMenuItems 
    : availableMenuItems.filter(m => m.category_id === activeCategory)
  ).filter(m => m.nama.toLowerCase().includes(searchQuery.toLowerCase().trim()));

  const categoryNameById = Object.fromEntries(categories.map(c => [c.id, c.nama]));

  if (!tableNumber) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full text-center">
          {seller.logo_url ? (
            <img src={seller.logo_url} alt={seller.nama_restoran} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed size={26} className="text-brand-600" />
            </div>
          )}
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
                    : 'border-brand-200 bg-white hover:border-brand-600 hover:bg-brand-50 text-brand-600'
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
    <div className="min-h-screen bg-cream-50 pb-24">
      {/* Header: identitas resto + meja, pencarian, kategori */}
      <header className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 pt-4 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {seller.logo_url ? (
              <img src={seller.logo_url} alt={seller.nama_restoran} className="w-10 h-10 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <UtensilsCrossed size={18} className="text-brand-600" />
              </div>
            )}
            <h1 className="text-lg font-extrabold text-brand-700 truncate leading-tight">{seller.nama_restoran}</h1>
          </div>
          <button
            onClick={() => navigate(`/r/${slug}/cart`)}
            className="relative w-11 h-11 rounded-2xl bg-cream-100 hover:bg-brand-50 flex items-center justify-center text-gray-700 transition-colors shrink-0"
            aria-label="Lihat keranjang"
          >
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Info meja - posisinya sama seperti baris "lokasi Anda" di desain acuan */}
        <div className="max-w-5xl mx-auto px-4 pt-2 flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin size={14} className="text-brand-600 shrink-0" />
          <span>Meja Anda: <span className="font-bold text-gray-900">{tableNumber}</span></span>
          <button
            onClick={() => setTableNumber(null)}
            className="text-brand-600 hover:text-brand-700 underline shrink-0 ml-1"
          >
            Ganti
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="max-w-5xl mx-auto px-4 pt-3">
          <div className="relative flex items-center">
            <Search size={17} className="absolute left-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu favoritmu..."
              className="w-full pl-11 pr-14 py-3 bg-cream-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition-colors"
            />
            <span className="absolute right-1.5 w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white shrink-0">
              <Search size={15} />
            </span>
          </div>
        </div>

        {/* Kategori - pill outline, scrollable horizontal */}
        <div className="max-w-5xl mx-auto px-4 py-3 flex overflow-x-auto hide-scrollbar gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl whitespace-nowrap text-sm font-medium transition-colors shrink-0 border ${
              activeCategory === 'all' 
                ? 'bg-white border-brand-600 text-brand-600 shadow-sm' 
                : 'bg-cream-100 border-transparent text-gray-600 hover:bg-cream-100/70'
            }`}
          >
            <LayoutGrid size={14} /> Semua Menu
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl whitespace-nowrap text-sm font-medium transition-colors shrink-0 border ${
                activeCategory === cat.id 
                  ? 'bg-white border-brand-600 text-brand-600 shadow-sm' 
                  : 'bg-cream-100 border-transparent text-gray-600 hover:bg-cream-100/70'
              }`}
            >
              <UtensilsCrossed size={14} /> {cat.nama}
            </button>
          ))}
        </div>
      </header>

      {/* Menu Grid - 2 kolom di HP, 3 kolom di layar lebih lebar */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Memuat menu...</div>
        ) : filteredMenu.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8">
            {filteredMenu.map(item => (
              <MenuCard key={item.id} item={item} categoryName={categoryNameById[item.category_id]} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            {searchQuery ? `Tidak ada menu yang cocok dengan "${searchQuery}".` : 'Belum ada menu yang tersedia.'}
          </div>
        )}
      </main>

      {/* Floating Cart Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-20 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button 
              onClick={() => navigate(`/r/${slug}/cart`)}
              className="w-full bg-ink-900 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between hover:bg-brand-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart size={24} />
                  <span className="absolute -top-2 -right-2 bg-brand-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
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
