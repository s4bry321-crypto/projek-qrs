import React, { useEffect, useState } from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import SalesChart from '../../components/SalesChart';
import { supabase } from '../../lib/supabase';
import { Seller, Payment } from '../../types';
import { Plus, X } from 'lucide-react';
import { format } from 'date-fns';

export default function SuperAdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    seller_id: '',
    jumlah: '',
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    catatan: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [paymentsRes, sellersRes] = await Promise.all([
      supabase
        .from('payments')
        .select('*, sellers(nama_restoran)')
        .order('tanggal', { ascending: false }),
      supabase
        .from('sellers')
        .select('*')
        .order('nama_restoran', { ascending: true })
    ]);

    if (paymentsRes.data) {
      setPayments(paymentsRes.data as Payment[]);
    }
    if (sellersRes.data) {
      setSellers(sellersRes.data as Seller[]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (!formData.seller_id || !formData.jumlah || !formData.tanggal) {
      setMessage({ type: 'error', text: 'Semua field wajib diisi' });
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          seller_id: formData.seller_id,
          jumlah: parseInt(formData.jumlah),
          tanggal: formData.tanggal,
          catatan: formData.catatan
        });

      if (error) throw new Error(error.message);

      setMessage({ type: 'success', text: 'Pembayaran berhasil dicatat' });
      setShowForm(false);
      setFormData({
        seller_id: '',
        jumlah: '',
        tanggal: format(new Date(), 'yyyy-MM-dd'),
        catatan: ''
      });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Catat Pembayaran</h2>
          <p className="text-slate-500 mt-2">Daftar pembayaran dari restoran ke platform.</p>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setMessage(null); }}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-800 transition"
        >
          {showForm ? 'Batal' : <><Plus size={20} /> Tambah Pembayaran</>}
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
          <h3 className="text-xl font-bold text-slate-900 mb-4">Catat Pembayaran Baru</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Restoran (Seller)</label>
              <select 
                required
                value={formData.seller_id}
                onChange={e => setFormData({...formData, seller_id: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">-- Pilih Restoran --</option>
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.nama_restoran}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah (Rp)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={formData.jumlah}
                  onChange={e => setFormData({...formData, jumlah: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="100000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={formData.tanggal}
                  onChange={e => setFormData({...formData, tanggal: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catatan (Opsional)</label>
              <input 
                type="text" 
                value={formData.catatan}
                onChange={e => setFormData({...formData, catatan: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Misal: Perpanjangan 3 bulan"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-orange-500 text-white font-medium py-2 px-6 rounded-lg hover:bg-orange-600 transition disabled:opacity-70 flex items-center justify-center"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="mb-8">
          <SalesChart
            data={payments.map(p => ({ date: p.tanggal, value: p.jumlah }))}
            title="Grafik Penghasilan Platform"
            valueLabel="Penghasilan"
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold">Tanggal</th>
                <th className="p-4 font-semibold">Restoran</th>
                <th className="p-4 font-semibold">Jumlah (Rp)</th>
                <th className="p-4 font-semibold">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">Memuat data...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">Belum ada data pembayaran.</td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="p-4 text-slate-700">
                      {format(new Date(payment.tanggal), 'dd MMM yyyy')}
                    </td>
                    <td className="p-4 font-medium text-slate-900">
                      {payment.sellers?.nama_restoran || '-'}
                    </td>
                    <td className="p-4 font-bold text-green-600">
                      Rp {payment.jumlah.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-slate-600">
                      {payment.catatan || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
