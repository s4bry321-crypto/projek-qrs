-- ============================================================
-- SKEMA LENGKAP: Sistem Pesan QR (multi-tenant)
-- Aman dijalankan ulang berkali-kali (idempotent).
-- Jalankan seluruh isi file ini di Supabase SQL Editor.
-- ============================================================

-- 1. SELLERS (restoran/tenant)
create table if not exists sellers (
  id uuid primary key default gen_random_uuid(),
  nama_restoran text not null,
  slug text not null unique,
  status text not null default 'pending',
  masa_aktif_sampai date,
  logo_url text,
  dibuat_pada timestamptz not null default now()
);
alter table sellers add column if not exists masa_aktif_sampai date;
alter table sellers add column if not exists logo_url text;
alter table sellers drop constraint if exists sellers_status_check;
alter table sellers add constraint sellers_status_check check (status in ('pending','aktif','nonaktif','ditolak'));

-- 2. KATEGORI MENU
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references sellers(id),
  nama text not null
);
alter table categories add column if not exists seller_id uuid references sellers(id);

-- 3. ITEM MENU
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references sellers(id),
  category_id uuid references categories(id) on delete set null,
  nama text not null,
  deskripsi text,
  harga numeric not null,
  foto_url text,
  status text not null default 'tersedia'
);
alter table menu_items add column if not exists seller_id uuid references sellers(id);
alter table menu_items drop constraint if exists menu_items_status_check;
alter table menu_items add constraint menu_items_status_check check (status in ('tersedia','habis'));

-- 4. MEJA
create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references sellers(id),
  nomor_meja text not null,
  status text not null default 'kosong'
);
alter table tables add column if not exists seller_id uuid references sellers(id);
alter table tables drop constraint if exists tables_status_check;
alter table tables add constraint tables_status_check check (status in ('kosong','terisi'));

-- 5. PESANAN
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references sellers(id),
  table_id uuid references tables(id),
  waktu timestamptz not null default now(),
  status text not null default 'baru',
  total_harga numeric not null default 0
);
alter table orders add column if not exists seller_id uuid references sellers(id);
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check check (status in ('baru','diproses','selesai','dibayar'));

-- 6. ITEM PESANAN
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  nama text not null,
  harga numeric not null,
  jumlah int not null,
  catatan text
);

-- 7. PROFIL PENGGUNA (role: super_admin / admin / kasir)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nama text,
  role text not null,
  seller_id uuid references sellers(id),
  status text default 'aktif',
  foto_url text
);
alter table profiles add column if not exists email text;
alter table profiles add column if not exists nama text;
alter table profiles add column if not exists seller_id uuid references sellers(id);
alter table profiles add column if not exists status text default 'aktif';
alter table profiles add column if not exists foto_url text;
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('super_admin','admin','kasir'));
alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check check (status in ('aktif','nonaktif'));

-- 7b. PENGATURAN PLATFORM (logo Super Admin - cuma ada 1 baris)
create table if not exists platform_settings (
  id int primary key default 1,
  logo_url text,
  constraint single_row check (id = 1)
);
insert into platform_settings (id) values (1) on conflict (id) do nothing;

-- 8. PEMBAYARAN SELLER KE PLATFORM (dicatat manual oleh Super Admin)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references sellers(id) not null,
  jumlah numeric not null,
  tanggal date not null default current_date,
  catatan text
);

-- ============================================================
-- FUNGSI BANTU
-- Menghindari "infinite recursion" RLS kalau policy tabel profiles
-- perlu mengecek data di tabel profiles itu sendiri.
-- ============================================================
create or replace function get_my_seller_id()
returns uuid
language sql
security definer
stable
as $$
  select seller_id from profiles where id = auth.uid();
$$;

create or replace function get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table sellers enable row level security;
alter table categories enable row level security;
alter table menu_items enable row level security;
alter table tables enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table profiles enable row level security;
alter table payments enable row level security;

-- Pelanggan (publik, tanpa login): baca menu/kategori/meja/sellers, buat & baca pesanan
drop policy if exists "public read sellers" on sellers;
create policy "public read sellers" on sellers for select using (true);

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);

drop policy if exists "public read menu_items" on menu_items;
create policy "public read menu_items" on menu_items for select using (true);

drop policy if exists "public read tables" on tables;
create policy "public read tables" on tables for select using (true);

drop policy if exists "public insert orders" on orders;
create policy "public insert orders" on orders for insert with check (true);
drop policy if exists "public read orders" on orders;
create policy "public read orders" on orders for select using (true);

drop policy if exists "public insert order_items" on order_items;
create policy "public insert order_items" on order_items for insert with check (true);
drop policy if exists "public read order_items" on order_items;
create policy "public read order_items" on order_items for select using (true);

-- Admin: CRUD penuh untuk data restoran miliknya sendiri
drop policy if exists "admin write own menu_items" on menu_items;
create policy "admin write own menu_items" on menu_items for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin' and profiles.seller_id = menu_items.seller_id)
);
drop policy if exists "admin write own categories" on categories;
create policy "admin write own categories" on categories for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin' and profiles.seller_id = categories.seller_id)
);
drop policy if exists "admin write own tables" on tables;
create policy "admin write own tables" on tables for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin' and profiles.seller_id = tables.seller_id)
);

-- Admin & Kasir: ubah status pesanan restoran miliknya sendiri
drop policy if exists "staff update own orders" on orders;
create policy "staff update own orders" on orders for update using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin','kasir') and profiles.seller_id = orders.seller_id)
);

-- Sellers: Super Admin kelola semua; staff baca resto sendiri; user baru boleh daftar (insert) restoran sendiri
drop policy if exists "super_admin manage sellers" on sellers;
create policy "super_admin manage sellers" on sellers for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'super_admin')
);
drop policy if exists "staff read own seller" on sellers;
create policy "staff read own seller" on sellers for select using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.seller_id = sellers.id)
);
drop policy if exists "self signup create seller" on sellers;
create policy "self signup create seller" on sellers for insert to authenticated with check (true);

-- Profiles: user baca & buat profilnya sendiri (role dibatasi admin/kasir untuk pendaftaran mandiri);
-- Admin baca & ubah akun kasir yang seller_id-nya sama
drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select using (auth.uid() = id);
drop policy if exists "self signup create own profile" on profiles;
create policy "self signup create own profile" on profiles for insert with check (
  auth.uid() = id and role in ('admin','kasir')
);
drop policy if exists "admin manage own cashiers" on profiles;
create policy "admin manage own cashiers" on profiles for select using (
  role = 'kasir' and seller_id = get_my_seller_id()
);
drop policy if exists "admin update own cashiers" on profiles;
create policy "admin update own cashiers" on profiles for update using (
  role = 'kasir' and seller_id = get_my_seller_id()
);

-- Super Admin boleh baca semua profil (dibutuhkan untuk fitur reset password Admin)
drop policy if exists "super_admin read all profiles" on profiles;
create policy "super_admin read all profiles" on profiles for select using (
  get_my_role() = 'super_admin'
);

-- Admin: boleh update baris seller miliknya sendiri (nama, logo, dll)
drop policy if exists "admin update own seller" on sellers;
create policy "admin update own seller" on sellers for update using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin' and profiles.seller_id = sellers.id)
);

-- Semua role: boleh update profilnya sendiri (nama, foto), TAPI role & seller_id tidak boleh diubah sendiri
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update using (
  auth.uid() = id
) with check (
  auth.uid() = id
  and role = get_my_role()
  and seller_id is not distinct from get_my_seller_id()
);

-- Pengaturan platform (logo Super Admin): siapa saja boleh baca, cuma Super Admin boleh ubah
alter table platform_settings enable row level security;
drop policy if exists "public read platform_settings" on platform_settings;
create policy "public read platform_settings" on platform_settings for select using (true);
drop policy if exists "super_admin update platform_settings" on platform_settings;
create policy "super_admin update platform_settings" on platform_settings for update using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'super_admin')
);

-- ============================================================
-- STORAGE: bucket untuk logo restoran, logo platform, & foto profil kasir
-- ============================================================
insert into storage.buckets (id, name, public)
values ('profil-assets', 'profil-assets', true)
on conflict (id) do nothing;

drop policy if exists "public read profil-assets" on storage.objects;
create policy "public read profil-assets" on storage.objects for select using (bucket_id = 'profil-assets');

drop policy if exists "authenticated upload profil-assets" on storage.objects;
create policy "authenticated upload profil-assets" on storage.objects for insert to authenticated with check (bucket_id = 'profil-assets');

drop policy if exists "authenticated update profil-assets" on storage.objects;
create policy "authenticated update profil-assets" on storage.objects for update to authenticated using (bucket_id = 'profil-assets');

-- Payments: hanya Super Admin
drop policy if exists "super_admin manage payments" on payments;
create policy "super_admin manage payments" on payments for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'super_admin')
);

-- ============================================================
-- REALTIME: aktifkan publikasi perubahan data untuk tabel yang dipakai
-- fitur real-time (notifikasi pesanan baru, update status, dll).
-- Tanpa ini, kode subscription di aplikasi tidak akan menerima update
-- apapun sampai halaman di-refresh manual.
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table orders;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table order_items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table tables;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table menu_items;
exception when duplicate_object then null;
end $$;
