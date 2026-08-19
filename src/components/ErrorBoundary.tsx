import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Menangkap error tak terduga di komponen manapun di bawahnya, supaya yang
// tampil ke pengguna adalah pesan yang jelas -- bukan layar putih kosong
// karena seluruh pohon React ikut berhenti render (perbaikan poin kecil #2).
// Harus class component: React belum punya versi Hook untuk error boundary.
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Error tak terduga ditangkap ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-lg text-center">
          <div className="bg-red-100 text-red-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Terjadi Kesalahan</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Ada bagian halaman yang gagal ditampilkan. Coba muat ulang halaman ini -- kalau
            masalahnya masih berlanjut, hubungi Admin/pengelola sistem.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    );
  }
}
