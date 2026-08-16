import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import QRCode from 'qrcode';
import { Printer, Copy, Check } from 'lucide-react';

export default function AdminQR() {
  const { sellerData } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const orderUrl = sellerData?.slug
    ? `https://projek-qrs-umber.vercel.app/r/${sellerData.slug}`
    : '';

  useEffect(() => {
    if (!orderUrl) return;
    QRCode.toDataURL(orderUrl, { width: 600, margin: 2 })
      .then(setQrDataUrl)
      .catch((err) => console.error('Gagal membuat QR code:', err));
  }, [orderUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Gagal menyalin link:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminLayout>
      <div className="mb-8 print:hidden">
        <h2 className="text-3xl font-bold text-slate-900">Cetak QR Code</h2>
        <p className="text-slate-500 mt-2">QR ini sama untuk semua meja — pelanggan memilih nomor mejanya sendiri setelah scan. Cetak dan tempel di tiap meja.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md print:hidden">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" className="w-full rounded-lg border border-slate-100" />
        ) : (
          <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center text-gray-400">
            Membuat QR code...
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
          <span className="text-sm text-slate-600 truncate flex-1">{orderUrl}</span>
          <button onClick={handleCopy} className="text-slate-500 hover:text-slate-900 shrink-0">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        <button
          onClick={handlePrint}
          disabled={!qrDataUrl}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-3 rounded-lg font-medium transition disabled:opacity-50"
        >
          <Printer size={18} /> Cetak QR Code
        </button>
      </div>

      {/* Tampilan khusus print */}
      {qrDataUrl && (
        <div className="hidden print:flex flex-col items-center justify-center text-center p-8">
          {sellerData?.logo_url && (
            <img src={sellerData.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover mb-3" />
          )}
          <h1 className="text-2xl font-bold mb-1">{sellerData?.nama_restoran}</h1>
          <p className="text-sm text-slate-600 mb-6">Scan untuk lihat menu & pesan</p>
          <img src={qrDataUrl} alt="QR Code" className="w-80 h-80" />
          <p className="text-xs text-slate-500 mt-4">{orderUrl}</p>
        </div>
      )}
    </AdminLayout>
  );
}
