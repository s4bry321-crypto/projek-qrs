import type { CapacitorConfig } from '@capacitor/cli';

// APP_TARGET diisi oleh GitHub Actions saat build: 'staff' atau 'superadmin'.
// Ini menentukan appId & nama aplikasi supaya kedua APK bisa diinstall
// BERSAMAAN di HP yang sama tanpa bentrok (appId beda = aplikasi beda).
const target = process.env.APP_TARGET || 'staff';

const configs: Record<string, CapacitorConfig> = {
  staff: {
    appId: 'com.pesanqr.staff',
    appName: 'Pesan QR - Staff',
    webDir: 'dist',
    server: { androidScheme: 'https' }
  },
  superadmin: {
    appId: 'com.pesanqr.superadmin',
    appName: 'Pesan QR - Super Admin',
    webDir: 'dist',
    server: { androidScheme: 'https' }
  }
};

export default configs[target];
