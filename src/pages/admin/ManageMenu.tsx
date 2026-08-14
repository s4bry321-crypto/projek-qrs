import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { Category, MenuItem } from '../../types';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ManageMenu() {
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  // States for Category Form
  const [catName, setCatName] = useState('');
  
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

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Kelola Menu</h1>
        <p className="text-gray-500 mt-2">Atur kategori dan daftar makanan.</p>
      </div>

      {errorMsg && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-200">
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kategori */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold mb-4">Kategori</h2>
          <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Nama kategori" 
              value={catName} 
              onChange={(e) => setCatName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
            />
            <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition">Tambah</button>
          </form>
          <ul className="divide-y divide-gray-100">
            {categories.map(cat => (
              <li key={cat.id} className="py-3 flex justify-between items-center">
                <span className="font-medium text-gray-800">{cat.nama}</span>
                <button 
                  onClick={() => handleDeleteCategory(cat.id)} 
                  disabled={isDeletingCat === cat.id}
                  className="text-red-400 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Kolom Daftar Menu */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold">Daftar Menu</h2>
            <button 
              onClick={handleAddMenuClick}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-orange-600 transition text-sm"
            >
              <Plus size={18} /> Tambah Menu
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-500">Item Menu</th>
                <th className="px-6 py-4 font-medium text-gray-500">Harga</th>
                <th className="px-6 py-4 font-medium text-gray-500">Status</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {menuItems.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{item.nama}</div>
                    <div className="text-sm text-gray-500 truncate max-w-[200px]">{item.deskripsi}</div>
                  </td>
                  <td className="px-6 py-4 font-medium">Rp {item.harga.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === 'tersedia' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <button 
                      onClick={() => handleEditMenu(item)} 
                      disabled={isDeletingMenu === item.id}
                      className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteMenu(item.id)} 
                      disabled={isDeletingMenu === item.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isDeletingMenu === item.id ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Menu */}
      {showMenuForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingMenuId ? 'Edit Menu' : 'Tambah Menu'}</h2>
            <form onSubmit={handleSaveMenu} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select 
                  required 
                  value={menuData.category_id} 
                  onChange={(e) => setMenuData({...menuData, category_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="" disabled>Pilih Kategori</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Menu</label>
                <input required type="text" value={menuData.nama} onChange={(e) => setMenuData({...menuData, nama: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea required value={menuData.deskripsi} onChange={(e) => setMenuData({...menuData, deskripsi: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga (Rp)</label>
                  <input required type="number" min="0" value={menuData.harga} onChange={(e) => setMenuData({...menuData, harga: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={menuData.status} onChange={(e) => setMenuData({...menuData, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="tersedia">Tersedia</option>
                    <option value="habis">Habis</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto Menu (opsional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" 
                />
                {imagePreview && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-500 mb-2">Preview:</p>
                    <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-gray-200" />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowMenuForm(false)} disabled={isUploading} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50">Batal</button>
                <button type="submit" disabled={isUploading} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50">
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
