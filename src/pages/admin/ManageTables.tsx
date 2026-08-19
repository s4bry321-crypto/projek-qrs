import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { Table } from '../../types';
import { Trash2, Plus, AlertCircle, Pencil, Table2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// error.code '23505' = pelanggaran unique constraint Postgres -- di sini
// spesifiknya constraint tables_seller_nomor_unique dari schema.sql (cegah
// nomor meja ganda dalam 1 restoran).
function friendlyTableError(error: any, fallbackPrefix: string): string {
  if (error?.code === '23505') {
    return 'Nomor meja ini sudah dipakai. Gunakan nomor/nama lain.';
  }
  return fallbackPrefix + (error?.message || 'Terjadi kesalahan.');
}

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
    const trimmed = nomorMeja.trim();
    if (!trimmed || !userProfile?.seller_id) return;

    // Cek duplikat di sisi klien dulu untuk feedback instan -- pengecekan
    // yang sebenarnya menentukan (anti race-condition, mis. 2 tab dibuka
    // bersamaan) tetap constraint unik di database (lihat schema.sql).
    if (tables.some(t => t.nomor_meja === trimmed)) {
      setErrorMsg('Nomor meja ini sudah dipakai. Gunakan nomor/nama lain.');
      return;
    }

    setIsAdding(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.from('tables').insert({ 
        seller_id: userProfile.seller_id,
        nomor_meja: trimmed, 
        status: 'kosong' 
      }).select().single();
      if (error) {
        console.error('Error adding table:', error);
        setErrorMsg(friendlyTableError(error, 'Gagal menambah meja: '));
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
         setErrorMsg(friendlyTableError(error, 'Gagal generate meja: '));
      } else {
        fetchTables();
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
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (tables.some(t => t.id !== id && t.nomor_meja === trimmed)) {
      setErrorMsg('Nomor meja ini sudah dipakai. Gunakan nomor/nama lain.');
      return;
    }
    setIsSavingEdit(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.from('tables').update({ nomor_meja: trimmed }).eq('id', id);
      if (error) {
        console.error('Error updating table:', error);
        setErrorMsg(friendlyTableError(error, 'Gagal mengubah nama meja: '));
      } else {
        setTables(prev => prev.map(t => t.id === id ? { ...t, nomor_meja: trimmed } : t)
          .sort((a, b) => a.nomor_meja.localeCompare(b.nomor_meja, undefined, { numeric: true, sensitivity: 'base' })));
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
        <h1 className="text-3xl font-bold text-slate-900">Kelola Meja</h1>
        <p className="text-slate-500 mt-2">Atur daftar meja yang tersedia untuk pelanggan.</p>
      </div>
      
      {errorMsg && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 border border-red-100">
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:col-span-1 h-fit">
          <h2 className="text-xl font-bold mb-4 text-slate-900">Tambah Meja</h2>
          <form onSubmit={handleAddTable} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nomor/Nama Meja</label>
              <input 
                type="text" 
                placeholder="Contoh: 01, VIP-1" 
                value={nomorMeja} 
                onChange={(e) => setNomorMeja(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none"
                required
              />
            </div>
            <button type="submit" disabled={isAdding} className="w-full bg-sky-500 text-white px-4 py-2.5 rounded-xl hover:bg-sky-600 transition flex items-center justify-center gap-2 disabled:opacity-50 font-medium">
              {isAdding ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Plus size={18} />}{isAdding ? ' Menambah...' : ' Tambah'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Daftar Meja</h2>
            {tables.length === 0 && (
              <button 
                onClick={handleGenerateTables}
                className="bg-sky-50 text-sky-600 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-sky-100 transition"
              >
                Generate 10 Meja
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {tables.map(table => (
              <div key={table.id} className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 flex flex-col items-center gap-2 relative">
                {editingTableId === table.id ? (
                  <div className="w-full flex flex-col gap-2 py-2">
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
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium py-1.5 rounded-lg transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="absolute top-2 right-2 flex items-center gap-0.5">
                      <button
                        onClick={() => startEdit(table)}
                        className="text-slate-300 hover:text-blue-500 p-1 transition-colors"
                        title="Edit nama meja"
                      >
                        <Pencil size={12} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTable(table.id)}
                        disabled={isDeletingTable === table.id}
                        className="text-slate-300 hover:text-red-500 p-1 transition-colors disabled:opacity-50"
                        title="Hapus meja"
                      >
                        {isDeletingTable === table.id ? <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div> : <Trash2 size={12} />}
                      </button>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mt-1">
                      <Table2 size={24} />
                    </div>
                    <div className="text-base font-bold text-slate-900">{table.nomor_meja}</div>
                    <button 
                      onClick={() => handleToggleStatus(table)}
                      disabled={isToggling === table.id}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                        table.status === 'kosong'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                      }`}
                    >
                      {isToggling === table.id ? 'Mengubah...' : table.status === 'kosong' ? 'Kosong' : 'Terisi'}
                    </button>
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
