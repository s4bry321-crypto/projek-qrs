# Ringkasan Perbaikan Keamanan & Bug

Dokumen ini menjelaskan semua perubahan yang dilakukan, kenapa, dan **langkah manual yang wajib kamu lakukan** supaya perbaikannya benar-benar aktif di project Supabase kamu.

## ⚠️ WAJIB DILAKUKAN MANUAL (perubahan kode saja tidak cukup)

1. **Jalankan ulang `supabase/schema.sql` di Supabase Dashboard → SQL Editor**, lalu klik Run.
   Ini mengubah database LIVE kamu (RLS, fungsi, tabel baru). Mengganti file di repo/kode
   TIDAK otomatis mengubah database yang sudah berjalan.
   - Kalau ada baris yang gagal dengan pesan `DILEWATI: ...` (di bagian nomor meja unik,
     jumlah item, atau pg_cron) — itu SENGAJA tidak menghentikan seluruh proses. Baca pesan
     errornya, ikuti instruksi di komentar SQL persis di atas baris yang gagal itu.
   - Aman dijalankan berkali-kali kalau perlu mengulang.
2. **Semua link undangan kasir yang sudah pernah kamu bagikan (format lama
   `?seller_id=...`) akan BERHENTI BERFUNGSI.** Setelah menjalankan schema.sql, buka
   halaman Kelola Kasir tiap resto yang sedang proses onboarding kasir baru, salin link
   yang baru (format `?token=...`), lalu kirim ulang ke kasir yang bersangkutan.
3. **Kasir yang baru mendaftar sekarang mulai dengan status NONAKTIF** (dulu langsung
   aktif). Admin resto wajib klik "Aktifkan" di halaman Kelola Kasir setelah kasir baru
   mendaftar, sebelum kasir itu bisa login.
4. Deploy ulang aplikasi web (Vercel) & build ulang APK seperti biasa supaya kode baru ini
   yang dipakai.

## Perbaikan prioritas utama (keamanan & uang)

**1. Data pesanan semua resto bisa dibaca siapa saja**
`orders`/`order_items` sekarang RLS-nya tertutup total untuk akses langsung (tidak ada
lagi policy `using (true)`). Alur pelanggan (buat pesanan, cek status) dipindah ke dua
fungsi database baru: `create_order()` dan `get_order_status()`. Dampak ke kode: `CartPage.tsx`
dan `OrderStatusPage.tsx` diubah untuk memanggil fungsi ini, bukan `insert`/`select` langsung.
`OrderStatusPage.tsx` juga beralih dari Realtime subscription ke polling tiap 5 detik (Realtime
untuk anon otomatis berhenti berfungsi begitu RLS tertutup).

**2. Harga pesanan tidak divalidasi ulang di server**
`create_order()` mengambil ulang harga & nama tiap item dari tabel `menu_items` saat pesanan
dibuat — angka yang dikirim dari keranjang browser pelanggan sama sekali tidak dipakai/dipercaya
lagi untuk `total_harga` maupun `order_items.harga`.

**3. Nonaktifkan kasir belum langsung berlaku**
Semua kebijakan RLS yang menyangkut data kasir/admin sekarang ikut mengecek
`profiles.status = 'aktif'` (bukan cuma role). Ditambah: kebijakan "update profil sendiri"
sekarang mengunci kolom `status` juga (sebelumnya cuma role & seller_id) — tanpa ini,
seorang kasir yang baru dinonaktifkan sebenarnya bisa meng-aktifkan-kan akunnya sendiri
lagi lewat update profil biasa. `ProtectedRoute` di `App.tsx` juga menambah pengecekan status
supaya tab dashboard yang sudah lama terbuka ikut ter-redirect keluar.

## Perbaikan langganan bulanan

**4. "Masa Aktif Sampai" belum ditegakkan otomatis**
- Fungsi `seller_is_active()` dipakai LANGSUNG di kebijakan RLS penulisan data (menu, kategori,
  meja) dan di `create_order()` — jadi begitu tanggal lewat, penegakannya *seketika*, tidak
  menunggu job terjadwal.
- Job pg_cron harian (`expire_sellers`) ditambahkan untuk merapikan kolom `status` di dashboard
  Super Admin secara otomatis — ini pelengkap tampilan, bukan satu-satunya pertahanan.
- Kasir tetap bisa menuntaskan pesanan yang sedang berjalan (ubah status, kosongkan meja)
  walau masa aktif baru lewat di tengah jam operasional — supaya tidak ada shift yang
  mendadak macet. Yang dikunci adalah Admin menambah/mengubah menu, kategori, dan meja BARU,
  serta pelanggan membuat pesanan BARU.

## Poin kecil yang ikut dibenahi

- **404**: `src/pages/NotFound.tsx` (baru) + route catch-all di `App.tsx`.
- **Error boundary**: `src/components/ErrorBoundary.tsx` (baru), membungkus seluruh app.
- **Upload gambar**: `uploadImage.ts` menolak file di luar JPG/PNG/WEBP/GIF atau di atas 3 MB;
  bucket storage di schema.sql juga dikonfigurasi dengan batas yang sama di sisi server.
- **Nomor meja ganda**: constraint unik `(seller_id, nomor_meja)` di database + pesan error yang
  jelas di `ManageTables.tsx` (tambah, generate, maupun ubah nama meja).
- **Automated test & QR seragam per meja**: belum disentuh, sesuai catatanmu (MVP dulu / bukan bug).

## Temuan tambahan (di luar daftar awal), ikut dibenahi karena ditemukan saat membenahi RLS

- **Siapa pun bisa mendaftar jadi admin ATAU kasir restoran lain** cuma dengan tahu/menebak
  `seller_id` (yang memang publik dibaca, perlu untuk menu QR) — lewat form pendaftaran
  mandiri di `/admin/register` atau `/cashier/register`. Sekarang: pendaftaran admin mandiri
  cuma boleh untuk resto berstatus `pending` yang belum ada adminnya; pendaftaran kasir mandiri
  wajib token undangan asli dari `cashier_invites` (lihat perubahan `CashierRegister.tsx` &
  `ManageCashier.tsx`).
- **Kasir bisa membaca & mengubah data kasir lain** di resto yang sama (kebijakan lama cuma
  mengecek bentuk baris target, bukan bahwa pemanggilnya benar admin).
- **Kasir tidak pernah diberi izin RLS mengosongkan meja** setelah pesanan dibayar (cuma admin)
  — jadi langkah itu diam-diam gagal setiap kali kasir (bukan admin) yang menandai pesanan
  selesai dibayar.
