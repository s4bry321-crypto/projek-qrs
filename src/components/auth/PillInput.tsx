import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PillInputProps {
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  isPassword?: boolean;
  minLength?: number;
  autoComplete?: string;
}

// Input pill-shape glassmorphism dengan ikon di kiri, dipakai di semua
// halaman login/register (Admin, Kasir, Super Admin).
export default function PillInput({
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  disabled,
  isPassword,
  minLength,
  autoComplete,
}: PillInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const actualType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none">
        {icon}
      </span>
      <input
        type={actualType}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        minLength={minLength}
        autoComplete={autoComplete}
        className={`w-full ${isPassword ? 'pl-11 pr-11' : 'pl-11 pr-4'} py-3 rounded-full text-white placeholder-white/60 border border-white/25 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition disabled:opacity-60`}
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
          aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
}
