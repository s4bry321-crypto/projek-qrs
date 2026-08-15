import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, UtensilsCrossed } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showBack?: boolean;
  icon?: React.ReactNode;
}

// Background bertema F&B (kayu hangat) dibuat murni pakai CSS gradient -
// tidak bergantung ke foto eksternal apa pun. Kalau nanti punya foto
// kayu/makanan sendiri, taruh di public/auth-bg.jpg dan tinggal set
// backgroundImage di bawah supaya ikut dipakai.
export default function AuthLayout({ title, subtitle, children, showBack = true, icon }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 15% 15%, rgba(255,183,94,0.18), transparent 45%),
          radial-gradient(circle at 85% 75%, rgba(255,140,60,0.14), transparent 50%),
          repeating-linear-gradient(100deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 26px),
          linear-gradient(160deg, #4a3221 0%, #2f1f14 55%, #1c130c 100%)
        `,
      }}
    >
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-4 sm:left-6 text-white/80 hover:text-white transition-colors z-10"
          aria-label="Kembali"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/90 flex items-center justify-center shadow-lg mb-4">
            {icon || <UtensilsCrossed size={30} className="text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-white text-center">{title}</h1>
          {subtitle && <p className="text-white/70 text-sm text-center mt-1">{subtitle}</p>}
        </div>

        <div
          className="rounded-3xl p-6 sm:p-7 border border-white/20 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
