import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moonlitstories.app',
  appName: 'Moonlit Stories',
  webDir: 'www',
  backgroundColor: '#090c18',
  android: {
    allowMixedContent: false,
    backgroundColor: '#090c18',
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
  },
  plugins: {
    SystemBars: {
      // Current WebViews expose env(safe-area-inset-*); disabling Capacitor's
      // legacy fallback avoids an early pre-DOM injection warning.
      insetsHandling: 'disable',
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#090c18',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#090c18',
    },
  },
};

export default config;
