import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.clearvisit.ai',
  appName: 'ClearVisit AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#3b82f6",
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: "#3b82f6"
    }
  }
};

export default config;