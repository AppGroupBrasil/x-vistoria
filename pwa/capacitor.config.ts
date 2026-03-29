import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xvistoria.app',
  appName: 'X Vistoria',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'app.xvistoria.com.br',
  },
  plugins: {
    Camera: {
      quality: 80,
    },
  },
};

export default config;
