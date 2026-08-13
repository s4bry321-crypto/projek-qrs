export interface Table {
  id: string;
  nomor_meja: string;
  status: 'kosong' | 'terisi';
}

export interface Category {
  id: string;
  nama: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  nama: string;
  deskripsi: string;
  harga: number;
  foto_url: string;
  status: 'tersedia' | 'habis';
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  menu_id: string;
  nama: string;
  harga: number;
  jumlah: number;
  catatan?: string;
}

export interface Order {
  id: string;
  table_id: string;
  tables?: { nomor_meja: string };
  nomor_meja?: string;
  waktu: string;
  status: 'baru' | 'diproses' | 'selesai' | 'dibayar';
  items: OrderItem[];
  total_harga: number;
}

export interface Seller {
  id: string;
  nama_restoran: string;
  slug: string;
  status: 'aktif' | 'nonaktif' | 'pending' | 'ditolak';
  masa_aktif_sampai?: string;
  logo_url?: string;
}

export interface Payment {
  id: string;
  seller_id: string;
  sellers?: { nama_restoran: string };
  jumlah: number;
  tanggal: string;
  catatan?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  nama?: string;
  role: 'admin' | 'kasir' | 'super_admin';
  seller_id?: string;
  status?: 'aktif' | 'nonaktif';
  foto_url?: string;
}
