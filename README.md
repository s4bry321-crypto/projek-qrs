# Sistem Pesan QR

Platform pemesanan makanan berbasis QR code, multi-tenant (bisa dipakai banyak restoran/warung berbeda dalam satu sistem). Ada 4 peran: Pelanggan (scan QR, pesan tanpa login), Kasir (proses pesanan & cetak struk), Admin (kelola menu/meja/kasir per restoran), dan Super Admin (kelola akun & pembayaran seller).

---

## BAGIAN 1 — Setup Supabase (kerjakan lebih dulu, sebelum deploy)

### 1.1 Buat/siapkan project Supabase
Kalau belum punya, buat project baru di [supabase.com](https://supabase.com).

### 1.2 Jalankan skema database
Buka **SQL Editor** di dashboard Supabase, jalankan **seluruh isi file** [`supabase/schema.sql`](supabase/schema.sql). Aman dijalankan berkali-kali walau sebagian sudah pernah dijalankan sebelumnya.

### 1.3 Matikan konfirmasi email
Buka **Authentication > Providers > Email**, pastikan **Confirm email** dalam keadaan **OFF**. Ini wajib — kalau menyala, pendaftaran mandiri Admin/Kasir akan gagal karena mereka belum punya sesi login aktif sampai klik link di email.

### 1.4 Buat akun Super Admin pertama (manual, sekali saja)
1. **Authentication > Users > Add user** — isi email & password.
2. **Table Editor > profiles** — tambah baris baru: `id` = UID user yang barusan dibuat, `role` = `super_admin`, `seller_id` dikosongkan (NULL).

### 1.5 Catat kredensial untuk langkah deploy
Buka **Settings > API**, catat:
- **Project URL**
- **anon public key**

---

## BAGIAN 2 — Deploy ke Vercel

### 2.1 Push kode ke GitHub
Kalau belum, upload seluruh isi folder ini ke repo GitHub (lewat web GitHub atau `git push` dari Termux).

### 2.2 Import ke Vercel
1. Login ke [vercel.com](https://vercel.com), klik **Add New > Project**.
2. Pilih/hubungkan repo GitHub-nya. Vercel otomatis mengenali ini sebagai project Vite — biarkan pengaturan default (Build Command: `npm run build`, Output Directory: `dist`).

### 2.3 Isi Environment Variables
Sebelum klik Deploy, buka bagian **Environment Variables**, tambahkan:
| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL dari langkah 1.5 |
| `VITE_SUPABASE_ANON_KEY` | anon public key dari langkah 1.5 |

### 2.4 Deploy
Klik **Deploy**. Tunggu sampai selesai, lalu buka link yang diberikan Vercel.

> File `vercel.json` di project ini sudah mengatur supaya semua halaman (`/admin/login`, `/r/nama-resto`, dll) bisa dibuka langsung tanpa 404 — tidak perlu pengaturan tambahan di Vercel.

---

## BAGIAN 3 — Uji Coba Setelah Live

1. Buka DevTools Console di website yang sudah live, cari baris `[Supabase] Terhubung ke project: ...` — cocokkan dengan Project URL di langkah 1.5. Kalau beda/tidak muncul, berarti Environment Variables di Vercel belum benar.
2. Login sebagai Super Admin, coba tambah/setujui restoran percobaan.
3. Daftar sebagai Admin baru lewat `/admin/register`, pastikan masuk ke halaman "Menunggu Persetujuan", lalu setujui dari Super Admin.
4. Login sebagai Admin, isi menu & meja, salin link undangan Kasir, daftar sebagai Kasir di tab baru.
5. Buka `/r/{slug-restoran}` sebagai Pelanggan, pesan sampai selesai.
6. Cek notifikasi real-time masuk di dashboard Kasir, coba cetak struk, tandai dibayar, pastikan meja kembali kosong.

---

## Alur Peran (ringkasan)

- **Pelanggan**: `/r/{slug-restoran}` — scan QR khusus restoran tsb, pilih meja, pesan.
- **Admin**: daftar sendiri di `/admin/register`, menunggu persetujuan Super Admin, lalu kelola menu/meja/kasir di `/admin`.
- **Kasir**: daftar lewat link undangan dari Admin (`/cashier/register?seller_id=...`), lalu proses pesanan di `/cashier`.
- **Super Admin**: login di `/superadmin/login`, kelola akun restoran & catat pembayaran.

## Troubleshooting Cepat

| Gejala | Kemungkinan Penyebab |
|---|---|
| "new row violates row-level security policy" | Cek `supabase/schema.sql` sudah dijalankan lengkap, dan Confirm Email sudah OFF (lihat 1.3) |
| Halaman 404 saat buka langsung/refresh | Pastikan `vercel.json` ikut ter-deploy (harusnya otomatis kalau ada di root project) |
| Login "kepental" balik ke halaman login | Cek Console browser untuk pesan error spesifik; AuthContext sudah punya logging detail di tiap langkah |
| Data restoran lain ikut kelihatan | Seharusnya tidak terjadi (RLS + `seller_id` sudah mengisolasi) — kalau terjadi, laporkan dengan detail langkahnya |

## Build lokal (opsional, untuk development)
```bash
npm install
cp .env.example .env.local   # lalu isi dengan kredensial Supabase
npm run dev
```
