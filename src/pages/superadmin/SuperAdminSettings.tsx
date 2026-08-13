import React, { useEffect, useState, useRef } from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { supabase } from '../../lib/supabase';
import { uploadProfilAsset } from '../../lib/uploadImage';
import { Upload, Check } from 'lucide-react';

export default function SuperAdminSettings() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('platform_settings').select('logo_url').eq('id', 1).maybeSingle();
    if (error) {
      setMessage({ type: 'error', text: 'Gagal memuat pengaturan: ' + error.message });
    } else if (data) {
      setLogoUrl(data.logo_url || null);
    }
    setIsLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSave = async () => {
    if (!file) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const publicUrl = await uploadProfilAsset(file);
      const { error } = await supabase
        .from('platform_settings')
        .update({ logo_url: publicUrl })
        .eq('id', 1);

      if (error) throw new Error(error.message);

      setLogoUrl(publicUrl);
      setFile(null);
      setPreview(null);
      setMessage({ type: 'success', text: 'Logo platform berhasil disimpan.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal menyimpan logo: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Pengaturan Platform</h2>
        <p className="text-slate-500 mt-2">Logo ini muncul di dashboard Super Admin dan sebagai identitas platform kamu.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-lg">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Logo Platform</h3>

        {isLoading ? (
          <p className="text-slate-500">Memuat...</p>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {preview || logoUrl ? (
                  <img src={preview || logoUrl || ''} alt="Logo platform" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-400 text-xs text-center px-2">Belum ada logo</span>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                >
                  <Upload size={16} /> Pilih Gambar
                </button>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!file || isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : <><Check size={16} /> Simpan Logo</>}
            </button>
          </>
        )}
      </div>
    </SuperAdminLayout>
  );
}
