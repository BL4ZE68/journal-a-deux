import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.journaladeux.app',
  appName: 'Journal à deux',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
