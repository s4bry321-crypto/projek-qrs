import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-lg text-center">
        <div className="bg-orange-100 text-orange-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Compass size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Halaman Tidak Ditemukan</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Alamat yang Anda buka tidak ada, atau link-nya sudah tidak berlaku lagi.
          Periksa lagi alamatnya, atau kembali ke halaman utama.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center w-full px-6 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
