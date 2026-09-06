'use client';

import { useLayoutEffect } from 'react';

type CapacitorBridge = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

declare global {
  interface Window {
    Capacitor?: CapacitorBridge;
  }
}

export function NativeAppBridge() {
  useLayoutEffect(() => {
    const capacitor = window.Capacitor;
    const isNative = capacitor?.isNativePlatform?.() || capacitor?.getPlatform?.() === 'android';
    if (!isNative) return;

    document.documentElement.classList.add('native-app');
    document.body.classList.add('native-app');

    return () => {
      document.documentElement.classList.remove('native-app');
      document.body.classList.remove('native-app');
    };
  }, []);

  return null;
}
