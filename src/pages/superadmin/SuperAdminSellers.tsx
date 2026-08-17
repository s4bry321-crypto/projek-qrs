import React, { useEffect, useState } from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { supabase } from '../../lib/supabase';
import { Seller } from '../../types';
import { Check, X, Store, AlertCircle, Plus } from 'lucide-react';
import { format, addMonths } from 'date-fns';

export default function SuperAdminSellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // States for Approval Modal
  const [showApproval, setShowApproval] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [activeDuration, setActiveDuration] = useState('1'); // in months
  const [customDate, setCustomDate] = useState('');

  // States for Extend Modal
  const [showExtend, setShowExtend] = useState(false);
  const [extendSeller, setExtendSeller] = useState<Seller | null>(null);
  const [extendDate, setExtendDate] = useState('');

  // States for Create Modal
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    nama_restoran: '', 
    slug: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isRejecting, setIsRejecting] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isExtendingState, setIsExtendingState] = useState<string | null>(null);
  const [isResettingPw, setIsResettingPw] = useState<string | null>(null);

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .order('nama_restoran', { ascending: true });
      
    if (data) {
      setSellers(data as Seller[]);
    }
    setLoading(false);
  };

  const handleResetAdminPassword = async (seller: Seller) => {
    if (!window.confirm(`Kirim link reset password ke Admin restoran "${seller.nama_restoran}"?`)) return;
    setIsResettingPw(seller.id);
    setMessage(null);
    try {
      const { data: adminProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('seller_id', seller.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (profileError) throw new Error(profileError.message);
      if (!adminProfile?.email) {
        throw new Error('Belum ada akun Admin untuk restoran ini.');
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(adminProfile.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (resetError) throw new Error(resetError.message);

      setMessage({ type: 'success', text: `Link reset password sudah dikirim ke ${adminProfile.email}.` });
    } catch (err: any) {
      console.error('Gagal reset password admin:', err);
      setMessage({ type: 'error', text: 'Gagal mengirim link reset: ' + err.message });
    } finally {
      setIsResettingPw(null);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData(prev => ({ ...prev, nama_restoran: name, slug }));
  };

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('sellers')
        .insert({ 
          nama_restoran: formData.nama_restoran, 
          slug: formData.slug, 
          status: 'aktif' 
        });

      if (error) {
        throw new Error(error.message);
      }

      setMessage({ type: 'success', text: `Restoran berhasil dibuat!` });
      setShowForm(false);
      setFormData({ nama_restoran: '', slug: '' });
      fetchSellers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSeller) return;
    let finalDate = customDate;
    if (activeDuration !== 'manual') {
      finalDate = format(addMonths(new Date(), parseInt(activeDuration)), 'yyyy-MM-dd');
    }
    if (!finalDate) {
      setMessage({ type: 'error', text: 'Pilih masa aktif' });
      return;
    }

    try {
      setIsApproving(selectedSeller.id);
      const { error } = await supabase
        .from('sellers')
        .update({ status: 'aktif', masa_aktif_sampai: finalDate })
        .eq('id', selectedSeller.id);
        
      if (error) {
        console.error("Gagal menyetujui:", error);
        throw new Error(`Gagal menyetujui: ${error.message}`);
      }

      setMessage({ type: 'success', text: 'Restoran disetujui dan diaktifkan.' });
      setShowApproval(false);
      setSelectedSeller(null);
      fetchSellers();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsApproving(null);
    }
  };

  const handleReject = async (seller: Seller) => {
    if (!confirm(`Tolak pendaftaran restoran ${seller.nama_restoran}?`)) return;
    try {
      setIsRejecting(seller.id);
      const { error } = await supabase
        .from('sellers')
        .update({ status: 'ditolak' })
        .eq('id', seller.id);
        
      if (error) { 
        console.error("Gagal menolak:", error); 
        throw new Error(`Gagal menolak: ${error.message}`); 
      }

      setMessage({ type: 'success', text: 'Pendaftaran ditolak.' });
      fetchSellers();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsRejecting(null);
    }
  };

  const handleExtend = async () => {
    if (!extendSeller || !extendDate) return;
    try {
      setIsExtendingState(extendSeller.id);
      const { error } = await supabase
        .from('sellers')
        .update({ masa_aktif_sampai: extendDate, status: 'aktif' })
        .eq('id', extendSeller.id);
        
      if (error) {
        console.error("Gagal memperpanjang:", error);
        throw new Error(`Gagal memperpanjang: ${error.message}`);
      }

      setMessage({ type: 'success', text: 'Masa aktif berhasil diperpanjang.' });
      setShowExtend(false);
      setExtendSeller(null);
      fetchSellers();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsExtendingState(null);
    }
  };

  const handleDeactivate = async (seller: Seller) => {
    if (!confirm(`Nonaktifkan restoran ${seller.nama_restoran}?`)) return;
    try {
      setIsDeactivating(seller.id);
      const { error } = await supabase
        .from('sellers')
        .update({ status: 'nonaktif' })
        .eq('id', seller.id);
        
      if (error) {
        console.error("Gagal menonaktifkan:", error);
        throw new Error(`Gagal menonaktifkan: ${error.message}`);
      }

      setMessage({ type: 'success', text: 'Restoran dinonaktifkan.' });
      fetchSellers();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsDeactivating(null);
    }
  };

  const pendingSellers = sellers.filter(s => s.status === 'pending');
  const otherSellers = sellers.filter(s => s.status !== 'pending');

  return (
    <SuperAdminLayout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Kelola Restoran</h2>
          <p className="text-slate-500 mt-2">Daftar semua restoran (seller) yang terdaftar di platform.</p>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setMessage(null); }}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-800 transition"
        >
          {showForm ? 'Batal' : <><Plus size={20} /> Tambah Restoran Manual</>}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 flex justify-between items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          <div>{message.text}</div>
          <button onClick={() => setMessage(null)} className="opacity-50 hover:opacity-100"><X size={20} /></button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 max-w-2xl">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Buat Restoran Baru</h3>
          <form onSubmit={handleCreateSeller} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Restoran</label>
              <input 
                type="text" 
                required
                value={formData.nama_restoran} 
                onChange={handleNameChange} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" 
                placeholder="Contoh: Warung Barokah" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug URL (Otomatis)</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-500 sm:text-sm">
                  {window.location.host}/r/
                </span>
                <input 
                  type="text" 
                  required
                  value={formData.slug} 
                  onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} 
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-none rounded-r-lg focus:outline-none focus:ring-2 focus:ring-orange-500" 
                />
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-orange-500 text-white font-medium py-2 px-6 rounded-lg hover:bg-orange-600 transition disabled:opacity-70 flex items-center justify-center min-w-[150px]"
              >
                {isSubmitting ? 'Memproses...' : 'Buat Restoran'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Sellers */}
      {pendingSellers.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="text-orange-500" />
            Menunggu Persetujuan ({pendingSellers.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingSellers.map(seller => (
              <div key={seller.id} className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  Baru
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-orange-500 shadow-sm overflow-hidden shrink-0">
                    {seller.logo_url ? (
                      <img src={seller.logo_url} alt={seller.nama_restoran} className="w-full h-full object-cover" />
                    ) : (
                      <Store size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{seller.nama_restoran}</h3>
                    <p className="text-slate-500 text-sm">/r/{seller.slug}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => { setSelectedSeller(seller); setShowApproval(true); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition">
                    <Check size={18} /> Setujui
                  </button>
                  <button onClick={() => handleReject(seller)} disabled={isRejecting === seller.id} className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50">
                    {isRejecting === seller.id ? <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div> : <X size={18} />}{isRejecting === seller.id ? 'Menolak...' : 'Tolak'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Sellers */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-4">Daftar Restoran Terdaftar</h3>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold">Nama Restoran</th>
                  <th className="p-4 font-semibold">Link (Slug)</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Masa Aktif Sampai</th>
                  <th className="p-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {otherSellers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Belum ada data restoran yang aktif/nonaktif.
                    </td>
                  </tr>
                ) : (
                  otherSellers.map((seller) => (
                    <tr key={seller.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {seller.logo_url ? (
                              <img src={seller.logo_url} alt={seller.nama_restoran} className="w-full h-full object-cover" />
                            ) : (
                              <Store size={16} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{seller.nama_restoran}</div>
                            <div className="text-xs text-slate-500">{seller.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-600 font-mono text-xs px-2 py-1 bg-slate-100 rounded">
                          /r/{seller.slug}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          seller.status === 'aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {seller.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-700">
                          {seller.masa_aktif_sampai ? format(new Date(seller.masa_aktif_sampai), 'dd MMM yyyy') : '-'}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetAdminPassword(seller)}
                            disabled={isResettingPw === seller.id}
                            className="text-slate-600 hover:text-slate-900 font-medium px-3 py-1 rounded hover:bg-slate-100 transition disabled:opacity-50 flex items-center gap-1.5"
                            title="Kirim link reset password ke Admin restoran ini"
                          >
                            {isResettingPw === seller.id ? <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div> : null} Reset PW
                          </button>
                          <button 
                            onClick={() => { setExtendSeller(seller); setExtendDate(seller.masa_aktif_sampai || format(addMonths(new Date(), 1), 'yyyy-MM-dd')); setShowExtend(true); }}
                            className="text-blue-600 hover:text-blue-900 font-medium px-3 py-1 rounded hover:bg-blue-50 transition"
                          >
                            Perpanjang
                          </button>
                          {seller.status === 'aktif' && (
                            <button 
                              onClick={() => handleDeactivate(seller)}
                              disabled={isDeactivating === seller.id}
                              className="text-red-600 hover:text-red-900 font-medium px-3 py-1 rounded hover:bg-red-50 transition disabled:opacity-50 flex items-center gap-2"
                            >
                              {isDeactivating === seller.id ? <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div> : null} Nonaktifkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApproval && selectedSeller && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Setujui Restoran</h3>
              <p className="text-slate-500 text-sm mt-1">Tentukan masa aktif awal untuk <strong>{selectedSeller.nama_restoran}</strong>.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Masa Aktif</label>
                <select 
                  value={activeDuration}
                  onChange={(e) => setActiveDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mb-3"
                >
                  <option value="1">1 Bulan</option>
                  <option value="3">3 Bulan</option>
                  <option value="6">6 Bulan</option>
                  <option value="12">1 Tahun</option>
                  <option value="manual">Tanggal Manual...</option>
                </select>
                
                {activeDuration === 'manual' && (
                  <input 
                    type="date" 
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                )}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => { setShowApproval(false); setSelectedSeller(null); }}
                className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition"
              >
                Batal
              </button>
              <button 
                onClick={handleApprove}
                disabled={!!isApproving}
                className="px-4 py-2 bg-green-600 text-white font-medium hover:bg-green-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {isApproving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null} Setujui & Aktifkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {showExtend && extendSeller && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Perpanjang Masa Aktif</h3>
              <p className="text-slate-500 text-sm mt-1">Ubah tanggal berlaku untuk <strong>{extendSeller.nama_restoran}</strong>.</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Berakhir Baru</label>
              <input 
                type="date" 
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => { setShowExtend(false); setExtendSeller(null); }}
                className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition"
              >
                Batal
              </button>
              <button 
                onClick={handleExtend}
                disabled={!!isExtendingState}
                className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {isExtendingState ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null} Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

    </SuperAdminLayout>
  );
}
