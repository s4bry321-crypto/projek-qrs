-- ============================================================================
-- SKEMA LENGKAP: Sistem Pesan QR (multi-tenant, Supabase Postgres)
-- Aman dijalankan ulang berkali-kali (idempotent). Jalankan SELURUH isi file
-- ini di Supabase Dashboard -> SQL Editor setiap kali ada pembaruan skema.
--
-- Versi ini berisi PERBAIKAN KEAMANAN (lihat CHANGES.md untuk ringkasan):
--   1. orders/order_items tidak lagi bisa dibaca/ditulis langsung oleh siapa
--      pun tanpa login -- semua alur pelanggan lewat fungsi create_order()
--      dan get_order_status() yang self-contained validasinya.
--   2. Harga dihitung ulang dari tabel menu_items di server (di dalam
--      create_order()), bukan dipercaya begitu saja dari browser pelanggan.
--   3. Status nonaktif kasir sekarang ditegakkan di setiap kebijakan RLS,
--      bukan cuma dicek saat login.
--   4. Masa aktif langganan resto (seller_is_active()) ditegakkan langsung
--      di RLS & di create_order(), tidak cuma bergantung ke kolom `status`
--      yang perlu diubah manual/oleh cron.
--   5. Pendaftaran mandiri Admin/Kasir tidak lagi bisa "mengklaim" resto
--      siapapun cuma dengan tahu/menebak seller_id (yang memang publik).
-- ============================================================================

-- ============================================================
-- 1. TABEL INTI
-- ============================================================

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

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references sellers(id),
  nama text not null
);
alter table categories add column if not exists seller_id uuid references sellers(id);

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
alter table menu_items drop constraint if exists menu_items_harga_check;
alter table menu_items add constraint menu_items_harga_check check (harga >= 0);

create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references sellers(id),
  nomor_meja text not null,
  status text not null default 'kosong'
);
alter table tables add column if not exists seller_id uuid references sellers(id);
alter table tables drop constraint if exists tables_status_check;
alter table tables add constraint tables_status_check check (status in ('kosong','terisi'));

-- Cegah nomor meja ganda dalam satu restoran (perbaikan poin kecil #4).
-- CATATAN PENTING: kalau baris "add constraint" di bawah ini gagal dengan
-- pesan berisi "duplicate key" / "violates unique constraint", artinya di
-- data kamu SEKARANG sudah ada nomor meja yang kembar untuk satu restoran.
-- Buka Table Editor -> tabel `tables`, cari & ganti salah satu nomor yang
-- kembar itu, baru jalankan ulang khusus 2 baris di bawah ini. Sampai itu
-- selesai, sisa file ini tetap tersimpan normal (tidak ikut gagal) karena
-- dibungkus blok aman di bawah.
do $$
begin
  alter table tables drop constraint if exists tables_seller_nomor_unique;
  alter table tables add constraint tables_seller_nomor_unique unique (seller_id, nomor_meja);
exception when others then
  raise notice 'DILEWATI: constraint nomor meja unik gagal dibuat (%). Kemungkinan ada nomor meja kembar di data sekarang -- lihat komentar di atas baris ini di schema.sql.', sqlerrm;
end $$;

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

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  nama text not null,
  harga numeric not null,
  jumlah int not null,
  catatan text
);
do $$
begin
  alter table order_items drop constraint if exists order_items_jumlah_check;
  alter table order_items add constraint order_items_jumlah_check check (jumlah > 0 and jumlah <= 50);
exception when others then
  raise notice 'DILEWATI: constraint jumlah order_items gagal dibuat (%). Kemungkinan ada data pesanan lama dengan jumlah di luar rentang wajar.', sqlerrm;
end $$;

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

create table if not exists platform_settings (
  id int primary key default 1,
  logo_url text,
  constraint single_row check (id = 1)
);
insert into platform_settings (id) values (1) on conflict (id) do nothing;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references sellers(id) not null,
  jumlah numeric not null,
  tanggal date not null default current_date,
  catatan text
);

-- Token undangan kasir per-restoran (satu token yang bisa dipakai berkali-kali,
-- menggantikan seller_id polos di link undangan -- lihat bagian "PENDAFTARAN
-- MANDIRI" di bawah untuk kenapa ini perlu). Dibuat otomatis untuk setiap
-- restoran lewat trigger di bagian bawah file ini.
create table if not exists cashier_invites (
  seller_id uuid primary key references sellers(id) on delete cascade,
  token uuid not null default gen_random_uuid()
);

-- ============================================================
-- 2. FUNGSI BANTU
-- security definer + search_path tetap supaya query di dalamnya tidak kena
-- RLS tabel profiles itu sendiri (mencegah infinite recursion), dan supaya
-- tidak rentan "search_path hijacking".
-- ============================================================
create or replace function get_my_seller_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select seller_id from profiles where id = auth.uid();
$$;

create or replace function get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function get_my_status()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select status from profiles where id = auth.uid();
$$;

-- Restoran dianggap aktif kalau status = 'aktif' DAN (tidak ada batas masa
-- aktif ATAU masa aktifnya belum lewat hari ini). Fungsi ini dipakai
-- LANGSUNG di kebijakan RLS & di create_order(), supaya penegakan masa aktif
-- tidak bergantung ke job pg_cron sempat jalan atau belum -- job pg_cron di
-- bagian bawah file ini cuma menjaga kolom `status` tetap rapi buat tampilan
-- dashboard Super Admin, bukan satu-satunya baris pertahanan.
create or replace function seller_is_active(p_seller_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from sellers
    where id = p_seller_id
      and status = 'aktif'
      and (masa_aktif_sampai is null or masa_aktif_sampai >= current_date)
  );
$$;

-- Dipakai di kebijakan pendaftaran-mandiri Admin di bawah. HARUS lewat
-- fungsi security definer seperti ini, bukan subquery mentah ke `profiles`
-- langsung di dalam kebijakan RLS -- soalnya subquery mentah cuma akan
-- melihat baris yang boleh dilihat SI PEMANGGIL sendiri (yang belum punya
-- profil sama sekali saat baru daftar), sehingga "admin lain" yang
-- sebenarnya ada tetap tidak akan "ketemu" oleh subquery itu dan
-- pengecekannya jadi tidak efektif.
create or replace function seller_has_admin(p_seller_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from profiles where seller_id = p_seller_id and role = 'admin');
$$;

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================
alter table sellers enable row level security;
alter table categories enable row level security;
alter table menu_items enable row level security;
alter table tables enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table profiles enable row level security;
alter table platform_settings enable row level security;
alter table payments enable row level security;
alter table cashier_invites enable row level security;

-- --- Data menu: tetap publik dibaca siapa saja (memang untuk ditampilkan
-- ke pelanggan tanpa login lewat QR) - TIDAK diubah dari desain awal.
drop policy if exists "public read sellers" on sellers;
create policy "public read sellers" on sellers for select using (true);

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);

drop policy if exists "public read menu_items" on menu_items;
create policy "public read menu_items" on menu_items for select using (true);

drop policy if exists "public read tables" on tables;
create policy "public read tables" on tables for select using (true);

drop policy if exists "public read platform_settings" on platform_settings;
create policy "public read platform_settings" on platform_settings for select using (true);

-- --- orders & order_items: HAPUS kebijakan lama yang menjadikan pesanan
-- SEMUA restoran bisa dibaca/ditulis siapa saja. Setelah ini, TIDAK ADA
-- kebijakan anon sama sekali untuk INSERT/SELECT langsung ke 2 tabel ini --
-- satu-satunya jalan resmi buat pelanggan adalah fungsi create_order() dan
-- get_order_status() di bagian bawah file ini (SECURITY DEFINER, jadi boleh
-- baca/tulis walau RLS di sini menutup akses langsung).
drop policy if exists "public insert orders" on orders;
drop policy if exists "public read orders" on orders;
drop policy if exists "public insert order_items" on order_items;
drop policy if exists "public read order_items" on order_items;

-- Admin & Kasir boleh baca & ubah status pesanan restoran MEREKA SENDIRI --
-- sekarang juga mensyaratkan akun staf itu sendiri masih 'aktif' (bukan cuma
-- rolenya). Ini bagian utama dari perbaikan "nonaktifkan kasir belum langsung
-- berlaku": begitu status seorang kasir diubah jadi nonaktif, baris ini
-- langsung menolak dia mengakses tabel orders/order_items lewat jalur
-- manapun, termasuk kalau sesi login di browser dia masih tersimpan/valid.
drop policy if exists "staff read own orders" on orders;
create policy "staff read own orders" on orders for select using (
  get_my_role() in ('admin','kasir')
  and get_my_status() = 'aktif'
  and get_my_seller_id() = orders.seller_id
);
drop policy if exists "staff update own orders" on orders;
create policy "staff update own orders" on orders for update using (
  get_my_role() in ('admin','kasir')
  and get_my_status() = 'aktif'
  and get_my_seller_id() = orders.seller_id
);
drop policy if exists "staff read own order_items" on order_items;
create policy "staff read own order_items" on order_items for select using (
  exists (
    select 1 from orders
    where orders.id = order_items.order_id
      and get_my_role() in ('admin','kasir')
      and get_my_status() = 'aktif'
      and get_my_seller_id() = orders.seller_id
  )
);

-- Admin: kelola penuh menu/kategori/meja restoran SENDIRI -- hanya kalau
-- (a) akun admin itu sendiri masih 'aktif', DAN (b) restorannya masih dalam
-- masa aktif langganan (seller_is_active). Begitu masa aktif lewat, Admin
-- otomatis tidak bisa lagi menambah/mengubah menu, kategori, atau meja lewat
-- jalur manapun (termasuk panggilan API langsung) -- bukan cuma diarahkan ke
-- halaman "Nonaktif" di tampilan React saja.
drop policy if exists "admin write own menu_items" on menu_items;
create policy "admin write own menu_items" on menu_items for all using (
  get_my_role() = 'admin' and get_my_status() = 'aktif' and get_my_seller_id() = menu_items.seller_id
  and seller_is_active(menu_items.seller_id)
);
drop policy if exists "admin write own categories" on categories;
create policy "admin write own categories" on categories for all using (
  get_my_role() = 'admin' and get_my_status() = 'aktif' and get_my_seller_id() = categories.seller_id
  and seller_is_active(categories.seller_id)
);
drop policy if exists "admin write own tables" on tables;
create policy "admin write own tables" on tables for all using (
  get_my_role() = 'admin' and get_my_status() = 'aktif' and get_my_seller_id() = tables.seller_id
  and seller_is_active(tables.seller_id)
);

-- Kasir: boleh ubah STATUS meja (kosong/terisi) sebagai bagian dari layani
-- pesanan sehari-hari (perbaikan bug tambahan yang ditemukan: sebelumnya
-- kasir -- bukan admin -- tidak pernah diberi izin RLS untuk ini sama
-- sekali, jadi "kosongkan meja setelah bayar" diam-diam gagal untuk akun
-- kasir). SENGAJA tidak disyaratkan seller_is_active supaya kasir tetap bisa
-- menuntaskan meja yang sedang dipakai walau masa aktif kebetulan lewat di
-- tengah jam operasional -- yang dikunci adalah Admin menambah/mengubah meja
-- BARU (lihat kebijakan admin di atas), bukan penyelesaian meja yang sudah
-- berjalan.
drop policy if exists "staff update own tables" on tables;
create policy "staff update own tables" on tables for update using (
  get_my_role() in ('admin','kasir') and get_my_status() = 'aktif' and get_my_seller_id() = tables.seller_id
);

-- Sellers: Super Admin kelola semua; staff baca & ubah data restoran sendiri;
-- user baru boleh mendaftarkan restoran sendiri (alur /admin/register).
drop policy if exists "super_admin manage sellers" on sellers;
create policy "super_admin manage sellers" on sellers for all using (
  get_my_role() = 'super_admin'
);
drop policy if exists "staff read own seller" on sellers;
create policy "staff read own seller" on sellers for select using (
  get_my_seller_id() = sellers.id
);
drop policy if exists "admin update own seller" on sellers;
create policy "admin update own seller" on sellers for update using (
  get_my_role() = 'admin' and get_my_seller_id() = sellers.id
);
drop policy if exists "self signup create seller" on sellers;
create policy "self signup create seller" on sellers for insert to authenticated with check (true);

-- Profiles: tiap user baca & buat profilnya sendiri.
--
-- PERBAIKAN (celah tambahan yang ditemukan saat membenahi RLS di atas):
-- kebijakan pendaftaran-mandiri yang lama cuma mengecek "role-nya admin atau
-- kasir", TIDAK pernah mengecek apakah seller_id yang diklaim itu memang
-- miliknya. Karena tabel `sellers` memang publik dibaca semua orang (perlu,
-- untuk menu QR), siapa pun bisa melihat/menebak seller_id restoran manapun
-- lalu langsung mendaftar sebagai admin ATAU kasir restoran itu tanpa pernah
-- diundang -- termasuk restoran KOMPETITOR yang sudah aktif. Sekarang:
--   - Admin: hanya boleh untuk restoran berstatus 'pending' & belum ada
--     admin lain terdaftar (cocok persis dengan alur /admin/register yang
--     memang selalu membuat baris seller baru lebih dulu).
--   - Kasir: insert langsung ke tabel ini TIDAK diizinkan sama sekali lagi.
--     Pendaftaran kasir sekarang WAJIB lewat fungsi claim_cashier_invite()
--     di bagian bawah, yang mensyaratkan token undangan asli dari Admin
--     restoran terkait (lihat juga: link undangan di halaman Kelola Kasir
--     berubah formatnya, link lama yang sudah pernah dibagikan tidak akan
--     berfungsi lagi).
drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select using (auth.uid() = id);

drop policy if exists "self signup create own profile" on profiles;
create policy "self signup create own profile" on profiles for insert with check (
  auth.uid() = id
  and role = 'admin'
  and exists (select 1 from sellers s where s.id = profiles.seller_id and s.status = 'pending')
  and not seller_has_admin(profiles.seller_id)
);

-- Admin baca & ubah akun kasir dengan seller_id yang sama -- PERBAIKAN:
-- sebelumnya kebijakan ini cuma mengecek bentuk baris TARGET-nya (role kasir
-- + seller_id cocok), tanpa pernah memverifikasi bahwa PEMANGGILNYA memang
-- admin. Akibatnya, seorang KASIR bisa membaca & bahkan mengubah data kasir
-- lain di restoran yang sama, termasuk (via kebijakan "update own profile"
-- di bawah sebelum diperbaiki) mengaktifkan-kan kembali akunnya sendiri
-- setelah dinonaktifkan admin. Sekarang caller wajib benar-benar admin aktif
-- dari seller_id yang sama.
drop policy if exists "admin manage own cashiers" on profiles;
create policy "admin manage own cashiers" on profiles for select using (
  profiles.role = 'kasir'
  and get_my_role() = 'admin' and get_my_status() = 'aktif' and get_my_seller_id() = profiles.seller_id
);
drop policy if exists "admin update own cashiers" on profiles;
create policy "admin update own cashiers" on profiles for update using (
  profiles.role = 'kasir'
  and get_my_role() = 'admin' and get_my_status() = 'aktif' and get_my_seller_id() = profiles.seller_id
);

drop policy if exists "super_admin read all profiles" on profiles;
create policy "super_admin read all profiles" on profiles for select using (
  get_my_role() = 'super_admin'
);

-- Semua role boleh update profilnya sendiri (nama, foto) -- role & seller_id
-- tidak boleh diubah sendiri (sudah ada sebelumnya), dan SEKARANG `status`
-- juga ditambahkan ke daftar yang tidak boleh diubah sendiri. Ini bagian
-- KEDUA dari perbaikan "nonaktifkan kasir belum langsung berlaku": tanpa
-- baris `status = get_my_status()` ini, kasir/admin yang baru dinonaktifkan
-- bisa meng-AKTIF-kan lagi akunnya sendiri lewat update profil biasa, karena
-- kebijakan ini sebelumnya sama sekali tidak membatasi kolom status.
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update using (
  auth.uid() = id
) with check (
  auth.uid() = id
  and role = get_my_role()
  and seller_id is not distinct from get_my_seller_id()
  and status = get_my_status()
);

drop policy if exists "super_admin update platform_settings" on platform_settings;
create policy "super_admin update platform_settings" on platform_settings for update using (
  get_my_role() = 'super_admin'
);

drop policy if exists "super_admin manage payments" on payments;
create policy "super_admin manage payments" on payments for all using (
  get_my_role() = 'super_admin'
);

-- cashier_invites: hanya admin restoran terkait yang boleh melihat token
-- undangannya (dipakai untuk menyusun link undangan di halaman Kelola
-- Kasir). TIDAK ADA akses publik/anon sama sekali -- satu-satunya cara
-- "menukar" token jadi akun kasir adalah lewat claim_cashier_invite().
drop policy if exists "admin read own cashier_invite" on cashier_invites;
create policy "admin read own cashier_invite" on cashier_invites for select using (
  get_my_role() = 'admin' and get_my_seller_id() = cashier_invites.seller_id
);

-- ============================================================
-- 4. FUNGSI PESANAN (dipakai Pelanggan, tanpa perlu login)
-- Menggantikan insert/select langsung ke orders & order_items. RLS tidak
-- bisa dipakai untuk kasus ini karena dua alasan: (a) RLS tidak punya cara
-- memvalidasi ulang harga yang dikirim browser terhadap harga asli di
-- menu_items, dan (b) RLS mengevaluasi tiap baris secara independen, tidak
-- tahu/peduli "pemanggil ini sedang mencari 1 order_id spesifik yang dia
-- tahu" vs "pemanggil ini sedang menyedot semua baris" -- keduanya terlihat
-- sama di level kebijakan. Makanya create_order() & get_order_status() ini
-- SECURITY DEFINER (jalan dengan hak penuh, lepas dari RLS di atas) dan
-- melakukan validasinya sendiri secara manual di dalam fungsi.
-- ============================================================

create or replace function create_order(
  p_seller_slug text,
  p_nomor_meja text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller sellers%rowtype;
  v_table tables%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_total numeric := 0;
  v_item jsonb;
  v_menu menu_items%rowtype;
  v_jumlah int;
  v_catatan text;
  v_item_count int := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong.';
  end if;

  select * into v_seller from sellers where slug = p_seller_slug;
  if not found then
    raise exception 'Restoran tidak ditemukan.';
  end if;
  if not seller_is_active(v_seller.id) then
    raise exception 'Restoran ini sedang tidak menerima pesanan saat ini.';
  end if;

  select * into v_table from tables where seller_id = v_seller.id and nomor_meja = p_nomor_meja;
  if not found then
    raise exception 'Meja tidak ditemukan. Coba pilih ulang nomor meja Anda.';
  end if;

  -- Baris orders dibuat DULU (dengan total sementara 0) supaya order_items
  -- di bawah bisa mereferensikannya (foreign key). Total sebenarnya dihitung
  -- di dalam loop lalu di-UPDATE di baris paling akhir fungsi ini.
  insert into orders (id, seller_id, table_id, status, total_harga)
  values (v_order_id, v_seller.id, v_table.id, 'baru', 0);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_count := v_item_count + 1;
    if v_item_count > 100 then
      raise exception 'Jumlah item terlalu banyak dalam satu pesanan.';
    end if;

    v_jumlah := coalesce((v_item->>'jumlah')::int, 0);
    if v_jumlah < 1 or v_jumlah > 50 then
      raise exception 'Jumlah salah satu item tidak valid.';
    end if;

    v_catatan := left(v_item->>'catatan', 500);

    -- Ini inti perbaikan validasi harga: harga & nama SELALU diambil ulang
    -- dari menu_items di server saat ini juga, TIDAK PERNAH dari data yang
    -- dikirim browser pelanggan -- apapun angka yang coba dikirim lewat
    -- request API langsung, yang tersimpan & dipakai untuk total_harga tetap
    -- harga asli dari database.
    select * into v_menu from menu_items
      where id = (v_item->>'menu_item_id')::uuid
        and seller_id = v_seller.id
        and status = 'tersedia';
    if not found then
      raise exception 'Salah satu item di keranjang sudah tidak tersedia. Silakan muat ulang menu.';
    end if;

    insert into order_items (order_id, menu_item_id, nama, harga, jumlah, catatan)
    values (v_order_id, v_menu.id, v_menu.nama, v_menu.harga, v_jumlah, v_catatan);

    v_total := v_total + (v_menu.harga * v_jumlah);
  end loop;

  update orders set total_harga = v_total where id = v_order_id;
  update tables set status = 'terisi' where id = v_table.id;

  return jsonb_build_object('order_id', v_order_id, 'total_harga', v_total);
end;
$$;
grant execute on function create_order(text, text, jsonb) to anon, authenticated;

create or replace function get_order_status(p_order_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'status', o.status,
    'waktu', o.waktu,
    'total_harga', o.total_harga,
    'nomor_meja', t.nomor_meja,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nama', oi.nama, 'harga', oi.harga, 'jumlah', oi.jumlah, 'catatan', oi.catatan
      ))
      from order_items oi where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from orders o
  left join tables t on t.id = o.table_id
  where o.id = p_order_id;
$$;
grant execute on function get_order_status(uuid) to anon, authenticated;

-- ============================================================
-- 5. PENDAFTARAN MANDIRI KASIR LEWAT TOKEN UNDANGAN
-- ============================================================

-- Setiap restoran baru otomatis dapat 1 baris cashier_invites (token acak)
-- lewat trigger ini, supaya tidak ada jalur pembuatan seller yang lupa
-- membuatkannya.
create or replace function ensure_cashier_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into cashier_invites (seller_id) values (new.id)
  on conflict (seller_id) do nothing;
  return new;
end;
$$;
drop trigger if exists trg_ensure_cashier_invite on sellers;
create trigger trg_ensure_cashier_invite
after insert on sellers
for each row execute function ensure_cashier_invite();

-- Isi token untuk restoran yang SUDAH ADA sebelum pembaruan ini (sekali jalan).
insert into cashier_invites (seller_id)
select id from sellers
on conflict (seller_id) do nothing;

-- Dipanggil dari halaman pendaftaran kasir SETELAH akun auth berhasil dibuat
-- (auth.signUp). Memvalidasi token undangan, lalu membuat baris profiles
-- dengan status AWAL 'nonaktif' (menunggu diaktifkan Admin di halaman
-- Kelola Kasir -- pakai tombol yang sudah ada) -- bukan langsung 'aktif'
-- seperti sebelumnya. Ini mencegah pendaftar-tanpa-undangan (yang berhasil
-- lewat kalau seandainya token bocor/ditebak) bisa langsung memakai sistem;
-- baris "staff ..." di RLS atas mensyaratkan status='aktif' untuk hampir
-- semua operasi, jadi akun yang belum diaktifkan Admin tidak bisa
-- baca/tulis data pesanan sama sekali.
create or replace function claim_cashier_invite(
  p_token uuid,
  p_nama text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Harus login terlebih dahulu.';
  end if;

  select seller_id into v_seller_id from cashier_invites where token = p_token;
  if not found then
    raise exception 'Link undangan tidak valid. Minta link undangan terbaru dari Admin restoran Anda.';
  end if;

  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Akun ini sudah pernah didaftarkan.';
  end if;

  insert into profiles (id, email, nama, role, seller_id, status)
  values (auth.uid(), p_email, p_nama, 'kasir', v_seller_id, 'nonaktif');

  return jsonb_build_object('seller_id', v_seller_id);
end;
$$;
grant execute on function claim_cashier_invite(uuid, text, text) to authenticated;

-- ============================================================
-- 6. STORAGE: bucket untuk logo restoran, logo platform, & foto profil
-- Sekarang dibatasi tipe file (gambar saja) & ukuran maksimum 3 MB di sisi
-- server (perbaikan poin kecil #3) -- sebelumnya cuma tidak dibatasi sama
-- sekali, jadi siapapun secara teknis bisa mengunggah file apapun dengan
-- ukuran berapapun lewat panggilan API langsung.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profil-assets', 'profil-assets', true, 3145728, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read profil-assets" on storage.objects;
create policy "public read profil-assets" on storage.objects for select using (bucket_id = 'profil-assets');

drop policy if exists "authenticated upload profil-assets" on storage.objects;
create policy "authenticated upload profil-assets" on storage.objects for insert to authenticated with check (bucket_id = 'profil-assets');

drop policy if exists "authenticated update profil-assets" on storage.objects;
create policy "authenticated update profil-assets" on storage.objects for update to authenticated using (bucket_id = 'profil-assets');

-- ============================================================
-- 7. PENJADWALAN: nonaktifkan otomatis restoran yang masa aktifnya lewat
-- Ini PELENGKAP tampilan saja (supaya kolom `status` di dashboard Super
-- Admin ikut rapi/akurat secara otomatis, sesuai permintaan perbaikan poin
-- "Masa Aktif Sampai"). Penegakan SESUNGGUHNYA (yang benar-benar memblokir
-- pemesanan & pengubahan data) sudah terjadi lewat seller_is_active() di
-- kebijakan RLS & di create_order() pada bagian atas -- jadi tetap AMAN
-- walau baris pg_cron di bawah ini gagal diaktifkan di project kamu (lihat
-- catatan errornya).
-- ============================================================
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'DILEWATI: gagal mengaktifkan ekstensi pg_cron secara otomatis (%). Aktifkan manual lewat Dashboard Supabase -> Database -> Extensions (cari "pg_cron", klik Enable), lalu jalankan ulang blok PENJADWALAN di bagian bawah schema.sql ini saja.', sqlerrm;
end $$;

create or replace function expire_sellers()
returns void
language sql
as $$
  update sellers
  set status = 'nonaktif'
  where status = 'aktif'
    and masa_aktif_sampai is not null
    and masa_aktif_sampai < current_date;
$$;

do $$
begin
  perform cron.unschedule('expire-sellers-daily');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.schedule('expire-sellers-daily', '10 0 * * *', 'select expire_sellers();');
exception when others then
  raise notice 'DILEWATI: gagal menjadwalkan job pg_cron (%). Kemungkinan pg_cron belum aktif di project ini -- lihat catatan di atas blok ini.', sqlerrm;
end $$;

-- ============================================================
-- 8. REALTIME: publikasikan perubahan data untuk fitur notifikasi live di
-- dashboard Kasir/Admin. Tanpa ini, kode subscription di aplikasi tidak
-- menerima update apapun sampai halaman di-refresh manual.
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
