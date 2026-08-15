import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { Table } from '../../types';
import { Trash2, Plus, AlertCircle, Pencil } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ManageTables() {
  const { userProfile } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [nomorMeja, setNomorMeja] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDeletingTable, setIsDeletingTable] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchTables = async () => {
    if (!userProfile?.seller_id) return;
    const { data, error } = await supabase.from('tables').select('*').eq('seller_id', userProfile.seller_id);
    if (error) {
      console.error('Error fetching tables:', error);
      setErrorMsg('Gagal memuat meja: ' + error.message);
    }
    if (data) {
      const sortedTables = (data as Table[]).sort((a, b) => 
        a.nomor_meja.localeCompare(b.nomor_meja, undefined, { numeric: true, sensitivity: 'base' })
      );
      setTables(sortedTables);
    }
  };

  useEffect(() => {
    if (!userProfile?.seller_id) return;
    fetchTables();

    const channel = supabase
      .channel('admin_tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `seller_id=eq.${userProfile.seller_id}` }, () => {
        fetchTables();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile]);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorMeja || !userProfile?.seller_id) return;
    setIsAdding(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.from('tables').insert({ 
        seller_id: userProfile.seller_id,
        nomor_meja: nomorMeja, 
        status: 'kosong' 
      }).select().single();
      if (error) {
        console.error('Error adding table:', error);
        setErrorMsg('Gagal menambah meja: ' + error.message);
      } else if (data) {
        // Update state lokal langsung - tidak menunggu realtime subscription,
        // supaya meja baru langsung muncul walau koneksi realtime lambat/gagal.
        setTables(prev => {
          const next = [...prev, data as Table];
          return next.sort((a, b) => 
            a.nomor_meja.localeCompare(b.nomor_meja, undefined, { numeric: true, sensitivity: 'base' })
          );
        });
        setNomorMeja('');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan: ' + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (confirm('Hapus meja ini?')) {
      setIsDeletingTable(id);
      setErrorMsg('');
      try {
        const { error } = await supabase.from('tables').delete().eq('id', id);
        if (error) {
          console.error('Error deleting table:', error);
          setErrorMsg('Gagal menghapus meja: ' + error.message);
        } else {
          // Update state lokal langsung - tidak menunggu realtime subscription
          setTables(prev => prev.filter(t => t.id !== id));
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Terjadi kesalahan: ' + err.message);
      } finally {
        setIsDeletingTable(null);
      }
    }
  };

  const handleToggleStatus = async (table: Table) => {
    setIsToggling(table.id);
    setErrorMsg('');
    try {
      const newStatus = table.status === 'kosong' ? 'terisi' : 'kosong';
      const { error } = await supabase.from('tables').update({ status: newStatus }).eq('id', table.id);
      if (error) {
        console.error('Error toggling status:', error);
        setErrorMsg('Gagal mengubah status: ' + error.message);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan: ' + err.message);
    } finally {
      setIsToggling(null);
    }
  };

  const handleGenerateTables = async () => {
    if (confirm('Generate 10 meja secara otomatis?') && userProfile?.seller_id) {
      setErrorMsg('');
      const newTables = [];
      for (let i = 1; i <= 10; i++) {
        newTables.push({ seller_id: userProfile.seller_id, nomor_meja: i.toString(), status: 'kosong' });
      }
      const { error } = await supabase.from('tables').insert(newTables);
      if (error) { 
         console.error('Error generating tables:', error);
         setErrorMsg('Gagal generate meja: ' + error.message);
      }
    }
  };

  const startEdit = (table: Table) => {
    setEditingTableId(table.id);
    setEditValue(table.nomor_meja);
    setErrorMsg('');
  };

  const cancelEdit = () => {
    setEditingTableId(null);
    setEditValue('');
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    setIsSavingEdit(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.from('tables').update({ nomor_meja: editValue.trim() }).eq('id', id);
      if (error) {
        console.error('Error updating table:', error);
        setErrorMsg('Gagal mengubah nama meja: ' + error.message);
      } else {
        setEditingTableId(null);
        setEditValue('');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Kelola Meja</h1>
        <p className="text-gray-500 mt-2">Atur daftar meja yang tersedia untuk pelanggan.</p>
      </div>
      
      {errorMsg && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-200">
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:col-span-1 h-fit">
          <h2 className="text-xl font-bold mb-4">Tambah Meja</h2>
          <form onSubmit={handleAddTable} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor/Nama Meja</label>
              <input 
                type="text" 
                placeholder="Contoh: 01, VIP-1" 
                value={nomorMeja} 
                onChange={(e) => setNomorMeja(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            <button type="submit" disabled={isAdding} className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition flex items-center justify-center gap-2 disabled:opacity-50">
              {isAdding ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Plus size={18} />}{isAdding ? ' Menambah...' : ' Tambah'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Daftar Meja</h2>
            {tables.length === 0 && (
              <button 
                onClick={handleGenerateTables}
                className="bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-200 transition"
              >
                Generate 10 Meja
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {tables.map(table => (
              <div key={table.id} className="border border-gray-200 rounded-xl p-3 flex flex-col gap-2">
                {editingTableId === table.id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                      className="w-full text-center text-base font-bold border border-blue-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => saveEdit(table.id)}
                        disabled={isSavingEdit}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isSavingEdit ? '...' : 'Simpan'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium py-1.5 rounded-lg transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(table)}
                        className="text-gray-400 hover:text-blue-500 p-1 transition-colors"
                        title="Edit nama meja"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTable(table.id)}
                        disabled={isDeletingTable === table.id}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors disabled:opacity-50"
                        title="Hapus meja"
                      >
                        {isDeletingTable === table.id ? <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div> : <Trash2 size={14} />}
                      </button>
                    </div>
                    <div className="flex flex-col items-center gap-2 pb-1">
                      <div className="text-2xl font-bold text-gray-900">{table.nomor_meja}</div>
                      <button 
                        onClick={() => handleToggleStatus(table)}
                        disabled={isToggling === table.id}
                        className={`w-full text-xs font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          table.status === 'kosong'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {isToggling === table.id ? 'Mengubah...' : table.status === 'kosong' ? 'Kosong' : 'Terisi'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
