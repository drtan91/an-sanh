import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detect standalone mode (already running as installed PWA)
    const checkStandalone = () => {
      try {
        const isStandalone =
          (typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(display-mode: standalone)')?.matches) ||
          (typeof window !== 'undefined' &&
            (window.navigator as unknown as { standalone?: boolean })?.standalone === true);
        setIsInstalled(Boolean(isStandalone));
      } catch {
        setIsInstalled(false);
      }
    };

    checkStandalone();

    // 2. Detect iOS devices
    try {
      const userAgent =
        typeof window !== 'undefined' && window.navigator?.userAgent
          ? window.navigator.userAgent.toLowerCase()
          : '';
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any)?.MSStream;
      setIsIOS(Boolean(isIOSDevice));
    } catch {
      setIsIOS(false);
    }

    // 3. Listen for Android / Chrome install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      try {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      } catch {
        // Safe fallback
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    try {
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);
      }
    } catch {
      // Safe fallback
    }

    return () => {
      try {
        if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          window.removeEventListener('appinstalled', handleAppInstalled);
        }
      } catch {
        // Safe fallback
      }
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}
