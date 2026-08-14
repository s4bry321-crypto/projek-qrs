import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { UserX, UserCheck, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { UserProfile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export default function ManageCashier() {
  const { userProfile } = useAuth();
  const [cashiers, setCashiers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCashiers();
  }, [userProfile]);

  const fetchCashiers = async () => {
    if (!userProfile?.seller_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'kasir')
      .eq('seller_id', userProfile.seller_id);

    if (error) {
      setMessage({ type: 'error', text: 'Gagal memuat daftar kasir: ' + error.message });
    } else if (data) {
      setCashiers(data as UserProfile[]);
    }
    setLoading(false);
  };

  const inviteLink = userProfile?.seller_id
    ? `https://projek-qrs-umber.vercel.app/cashier/register?seller_id=${userProfile.seller_id}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal menyalin link. Salin manual dari kotak di atas.' });
    }
  };

  const handleToggleStatus = async (cashier: UserProfile) => {
    const newStatus = cashier.status === 'nonaktif' ? 'aktif' : 'nonaktif';
    const isActivating = newStatus === 'aktif';

    if (!window.confirm(`Apakah Anda yakin ingin ${isActivating ? 'mengaktifkan' : 'menonaktifkan'} akun kasir ini?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', cashier.id);

      if (error) {
        throw new Error(error.message);
      }

      setCashiers(prev => prev.map(c =>
        c.id === cashier.id ? { ...c, status: newStatus } : c
      ));

      setMessage({
        type: 'success',
        text: `Akun kasir berhasil di${isActivating ? 'aktifkan' : 'nonaktifkan'}.`
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Gagal mengubah status kasir: ' + error.message });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Kelola Kasir</h2>
        <p className="text-gray-500 mt-2">Undang dan atur akun kasir restoran.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <LinkIcon size={18} className="text-orange-500" /> Link Undangan Kasir
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Kirim link ini ke calon kasir (lewat WhatsApp, dll). Mereka bisa daftar sendiri lewat link ini dan langsung bisa masuk ke dashboard kasir.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={inviteLink}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition flex items-center gap-2 shrink-0"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Tersalin' : 'Salin'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-4 px-6 font-semibold text-gray-600">Nama</th>
                <th className="py-4 px-6 font-semibold text-gray-600">Email Kasir</th>
                <th className="py-4 px-6 font-semibold text-gray-600">Status</th>
                <th className="py-4 px-6 font-semibold text-gray-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">Memuat data kasir...</td>
                </tr>
              ) : cashiers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">Belum ada akun kasir. Bagikan link undangan di atas untuk menambahkan.</td>
                </tr>
              ) : cashiers.map(cashier => (
                <tr key={cashier.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-900">{cashier.nama || '-'}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-gray-700">{cashier.email}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      cashier.status === 'nonaktif' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {cashier.status === 'nonaktif' ? 'NONAKTIF' : 'AKTIF'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleToggleStatus(cashier)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        cashier.status === 'nonaktif'
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {cashier.status === 'nonaktif' ? <UserCheck size={16} /> : <UserX size={16} />}
                      {cashier.status === 'nonaktif' ? 'Aktifkan' : 'Nonaktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
