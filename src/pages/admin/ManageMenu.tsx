import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { Category, MenuItem } from '../../types';
import { Edit2, Trash2, Plus, Search, Settings, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ManageMenu() {
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  // States for Category Form
  const [catName, setCatName] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  // States for Menu Form
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [menuData, setMenuData] = useState({
    category_id: '', nama: '', deskripsi: '', harga: '', foto_url: '', status: 'tersedia'
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeletingCat, setIsDeletingCat] = useState<string | null>(null);
  const [isDeletingMenu, setIsDeletingMenu] = useState<string | null>(null);

  const fetchData = async () => {
    if (!userProfile?.seller_id) return;
    try {
      const { data: catData, error: catError } = await supabase.from('categories').select('*').eq('seller_id', userProfile.seller_id);
      if (catError) {
        setErrorMsg('Gagal memuat kategori: ' + catError.message);
        return;
      }
      if (catData) setCategories(catData as Category[]);

      const { data: menuData, error: menuError } = await supabase.from('menu_items').select('*').eq('seller_id', userProfile.seller_id);
      if (menuError) {
        setErrorMsg('Gagal memuat menu: ' + menuError.message);
        return;
      }
      if (menuData) setMenuItems(menuData as MenuItem[]);
      
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Fetch admin menu exception:', err);
      setErrorMsg('Error: ' + err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userProfile]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !userProfile?.seller_id) return;
    setErrorMsg(null);
    const { error } = await supabase.from('categories').insert({ seller_id: userProfile.seller_id, nama: catName });
    if (error) {
      setErrorMsg('Gagal menambah kategori: ' + error.message);
      return;
    }
    setCatName('');
    fetchData();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!userProfile?.seller_id) return;
    if (confirm('Hapus kategori ini?')) {
      setIsDeletingCat(id);
      setErrorMsg(null);
      const { error } = await supabase.from('categories').delete().eq('id', id).eq('seller_id', userProfile.seller_id);
      if (error) {
        console.error('Gagal menghapus kategori:', error);
        setErrorMsg('Gagal menghapus kategori: ' + error.message);
      } else {
        fetchData();
      }
      setIsDeletingCat(null);
    }
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsUploading(true);

    let finalFotoUrl = menuData.foto_url;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('menu-photos')
        .upload(fileName, imageFile);

      if (uploadError) {
        setErrorMsg('Gagal mengupload gambar: ' + uploadError.message);
        setIsUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('menu-photos')
        .getPublicUrl(fileName);

      finalFotoUrl = publicUrl;
    }

    const payload = {
      ...menuData,
      harga: Number(menuData.harga),
      foto_url: finalFotoUrl,
      seller_id: userProfile?.seller_id
    };
    
    if (editingMenuId) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editingMenuId);
      if (error) {
        setErrorMsg('Gagal mengupdate menu: ' + error.message);
        setIsUploading(false);
        return;
      }
    } else {
      const { error } = await supabase.from('menu_items').insert(payload);
      if (error) {
        setErrorMsg('Gagal menambah menu: ' + error.message);
        setIsUploading(false);
        return;
      }
    }
    
    setShowMenuForm(false);
    setEditingMenuId(null);
    setImageFile(null);
    setImagePreview(null);
    setMenuData({ category_id: '', nama: '', deskripsi: '', harga: '', foto_url: '', status: 'tersedia' });
    setIsUploading(false);
    fetchData();
  };

  const handleEditMenu = (item: MenuItem) => {
    setEditingMenuId(item.id);
    setMenuData({
      category_id: item.category_id,
      nama: item.nama,
      deskripsi: item.deskripsi,
      harga: item.harga.toString(),
      foto_url: item.foto_url || '',
      status: item.status
    });
    setImageFile(null);
    setImagePreview(item.foto_url || null);
    setShowMenuForm(true);
  };

  const handleAddMenuClick = () => {
    setShowMenuForm(true);
    setEditingMenuId(null);
    setImageFile(null);
    setImagePreview(null);
    setMenuData({ category_id: '', nama: '', deskripsi: '', harga: '', foto_url: '', status: 'tersedia' });
  };

  const handleDeleteMenu = async (id: string) => {
    if (!userProfile?.seller_id) return;
    if (confirm('Hapus menu ini?')) {
      setIsDeletingMenu(id);
      setErrorMsg(null);
      const { error } = await supabase.from('menu_items').delete().eq('id', id).eq('seller_id', userProfile.seller_id);
      if (error) {
        console.error('Gagal menghapus menu:', error);
        setErrorMsg('Gagal menghapus menu: ' + error.message);
      } else {
        fetchData();
      }
      setIsDeletingMenu(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const filteredItems = menuItems
    .filter(item => activeCategory === 'all' || item.category_id === activeCategory)
    .filter(item => item.nama.toLowerCase().includes(searchQuery.toLowerCase().trim()));

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Kelola Menu</h1>
          <p className="text-slate-500 mt-1">Kategori dan grid menu premium untuk pelanggan.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-100 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <button 
            onClick={handleAddMenuClick}
            className="bg-sky-500 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-sky-600 transition text-sm shrink-0 shadow-sm"
          >
            <Plus size={18} /> Tambah Menu
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 border border-red-100">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Kategori - pill horizontal scrollable */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-medium transition-colors shrink-0 ${
            activeCategory === 'all' ? 'bg-sky-500 text-white shadow-sm' : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Semua
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-medium transition-colors shrink-0 ${
              activeCategory === cat.id
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {cat.nama}
          </button>
        ))}
        <button
          onClick={() => setShowCategoryModal(true)}
          className="w-9 h-9 rounded-xl bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 flex items-center justify-center shrink-0 shadow-sm"
          title="Kelola kategori"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Grid Menu Premium */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center text-slate-400">
          {searchQuery ? `Tidak ada menu yang cocok dengan "${searchQuery}".` : 'Belum ada menu. Klik "Tambah Menu" untuk mulai.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="relative">
                {item.foto_url ? (
                  <img src={item.foto_url} alt={item.nama} className="w-full h-28 sm:h-32 object-cover rounded-t-2xl" />
                ) : (
                  <div className="w-full h-28 sm:h-32 bg-slate-100 rounded-t-2xl flex items-center justify-center text-slate-300 text-xs">
                    No Image
                  </div>
                )}
                <button
                  onClick={() => handleDeleteMenu(item.id)}
                  disabled={isDeletingMenu === item.id}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-red-500 flex items-center justify-center shadow-sm transition disabled:opacity-50"
                  title="Hapus menu"
                >
                  {isDeletingMenu === item.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-bold text-sm text-slate-900 leading-tight line-clamp-1">{item.nama}</h3>
                <span className={`inline-block mt-1.5 mb-2 w-fit px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  item.status === 'tersedia' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {item.status === 'tersedia' ? 'Tersedia' : 'Habis'}
                </span>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-bold text-slate-900 text-sm">Rp {item.harga.toLocaleString('id-ID')}</span>
                  <button
                    onClick={() => handleEditMenu(item)}
                    className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-600 active:scale-95 text-white flex items-center justify-center transition-all shrink-0"
                    title="Edit menu"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Kelola Kategori */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Kelola Kategori</h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Nama kategori baru" 
                value={catName} 
                onChange={(e) => setCatName(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none"
                required
              />
              <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition">Tambah</button>
            </form>
            <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {categories.map(cat => (
                <li key={cat.id} className="py-3 flex justify-between items-center">
                  <span className="font-medium text-slate-800">{cat.nama}</span>
                  <button 
                    onClick={() => handleDeleteCategory(cat.id)} 
                    disabled={isDeletingCat === cat.id}
                    className="text-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
              {categories.length === 0 && (
                <li className="py-6 text-center text-slate-400 text-sm">Belum ada kategori.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Modal Form Menu */}
      {showMenuForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-slate-900">{editingMenuId ? 'Edit Menu' : 'Tambah Menu'}</h2>
            <form onSubmit={handleSaveMenu} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                <select 
                  required 
                  value={menuData.category_id} 
                  onChange={(e) => setMenuData({...menuData, category_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  <option value="" disabled>Pilih Kategori</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Menu</label>
                <input required type="text" value={menuData.nama} onChange={(e) => setMenuData({...menuData, nama: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea required value={menuData.deskripsi} onChange={(e) => setMenuData({...menuData, deskripsi: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Harga (Rp)</label>
                  <input required type="number" min="0" value={menuData.harga} onChange={(e) => setMenuData({...menuData, harga: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={menuData.status} onChange={(e) => setMenuData({...menuData, status: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl">
                    <option value="tersedia">Tersedia</option>
                    <option value="habis">Habis</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Foto Menu (opsional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100" 
                />
                {imagePreview && (
                  <div className="mt-3">
                    <p className="text-sm text-slate-500 mb-2">Preview:</p>
                    <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowMenuForm(false)} disabled={isUploading} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition disabled:opacity-50">Batal</button>
                <button type="submit" disabled={isUploading} className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-600 transition disabled:opacity-50">
                  {isUploading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
