import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.libtrack.studentapp',
  appName: 'LIBTRACK Student',
  // The student app is the Vite build in mobile-improved. Capacitor copies this
  // into the APK, so the app runs from the bundle instead of loading a remote page.
  webDir: 'mobile-improved/dist',
  android: {
    // Capacitor serves the bundle over https://localhost. Mixed content is only
    // relevant for plain-http origins, and we only talk to the live https host.
    allowMixedContent: false,
  },
  plugins: {
    // Route fetch/XHR through the native HTTP stack. Without this the WebView
    // applies browser CORS to calls to the LIBTRACK host, which sends no
    // Access-Control-Allow-Origin header, so every session request would fail.
    // The native layer has no CORS check and keeps Laravel's session cookie.
    CapacitorHttp: {
      enabled: true,
    },
    // Keep document.cookie in sync with the native jar so the session is
    // inspectable and survives an app restart.
    CapacitorCookies: {
      enabled: true,
    },
  },
};

export default config;
