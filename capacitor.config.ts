import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pesanqr.app',
  appName: 'Sistem Pesan QR',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
