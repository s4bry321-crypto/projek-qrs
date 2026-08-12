# Sistem Pesan QR

Platform pemesanan makanan berbasis QR code, multi-tenant (bisa dipakai banyak restoran/warung berbeda dalam satu sistem). Ada 4 peran: Pelanggan (scan QR, pesan tanpa login), Kasir (proses pesanan & cetak struk), Admin (kelola menu/meja/kasir per restoran), dan Super Admin (kelola akun & pembayaran seller).

## Setup

**1. Install dependency**
```bash
npm install
```

**2. Siapkan database Supabase**
- Buat project baru di [supabase.com](https://supabase.com) (kalau belum ada).
- Buka **SQL Editor**, jalankan seluruh isi file [`supabase/schema.sql`](supabase/schema.sql). File ini aman dijalankan ulang berkali-kali.
- Buka **Authentication > Providers > Email**, pastikan **Confirm email** dalam keadaan **OFF** (supaya pendaftaran mandiri Admin/Kasir bisa langsung dipakai tanpa verifikasi email).

**3. Buat akun Super Admin pertama (manual, cuma sekali)**
- Authentication > Users > Add user (isi email & password).
- Table Editor > `profiles`, tambah baris baru: `id` = UID user tadi, `role` = `super_admin`, `seller_id` dikosongkan.

**4. Environment variables**

Salin `.env.example` jadi `.env.local`, isi dengan nilai dari Supabase (Settings > API):
```bash
cp .env.example .env.local
```

**5. Jalankan**
```bash
npm run dev
```

## Alur Peran

- **Pelanggan**: `/r/{slug-restoran}` — scan QR khusus restoran tsb, pilih meja, pesan.
- **Admin**: daftar sendiri di `/admin/register`, menunggu persetujuan Super Admin, lalu kelola menu/meja/kasir di `/admin`.
- **Kasir**: daftar lewat link undangan dari Admin (`/cashier/register?seller_id=...`), lalu proses pesanan di `/cashier`.
- **Super Admin**: login di `/superadmin/login`, kelola akun restoran & catat pembayaran.

## Struktur Database

Lihat [`supabase/schema.sql`](supabase/schema.sql) untuk skema lengkap (tabel, kolom, dan Row Level Security policy).

## Build untuk produksi
```bash
npm run build
```
Hasil build ada di folder `dist/`, siap di-deploy ke layanan static hosting mana pun (Vercel, Netlify, Cloudflare Pages, dll).
