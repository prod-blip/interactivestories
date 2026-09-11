'use client';

import {
  getPremiumStatus,
  isNativeAndroid,
  isPremiumStory,
  listenForEntitlementChanges,
  purchasePremiumStories,
  restorePremiumStories,
  type BillingStatus,
} from '@/lib/story-access';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type StoryAccessContextValue = {
  ready: boolean;
  native: boolean;
  owned: boolean;
  pending: boolean;
  available: boolean;
  price?: string;
  message?: string;
  purchasing: boolean;
  canAccess(storyId: string): boolean;
  purchase(): Promise<BillingStatus>;
  restore(): Promise<BillingStatus>;
};

const initialStatus: BillingStatus = {
  productId: 'premium_story_pack_1',
  owned: false,
  pending: false,
  cancelled: false,
  available: false,
};

const StoryAccessContext = createContext<StoryAccessContextValue | undefined>(undefined);

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Google Play could not be reached. Please try again.';
}

export function StoryAccessProvider({ children }: { children: React.ReactNode }) {
  const [native, setNative] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<BillingStatus>(initialStatus);
  const [purchasing, setPurchasing] = useState(false);

  const applyStatus = useCallback((next: BillingStatus) => {
    setStatus(next);
    setReady(true);
  }, []);

  useEffect(() => {
    const previewLocked = process.env.NODE_ENV !== 'production' &&
      new URLSearchParams(window.location.search).get('billingPreview') === 'locked';
    if (previewLocked) {
      setNative(true);
      applyStatus({
        productId: 'premium_story_pack_1',
        owned: false,
        pending: false,
        cancelled: false,
        available: true,
        price: '₹199',
      });
      return;
    }

    const runningNatively = isNativeAndroid();
    setNative(runningNatively);

    let active = true;
    let removeListener: (() => Promise<void>) | undefined;

    getPremiumStatus()
      .then((next) => {
        if (active) applyStatus(next);
      })
      .catch((error) => {
        if (!active) return;
        setStatus((current) => ({ ...current, message: errorMessage(error) }));
        setReady(true);
      });

    listenForEntitlementChanges((next) => {
      if (active) applyStatus(next);
    }).then((handle) => {
      if (!handle) return;
      if (!active) {
        void handle.remove();
        return;
      }
      removeListener = () => handle.remove();
    });

    return () => {
      active = false;
      void removeListener?.();
    };
  }, [applyStatus]);

  const purchase = useCallback(async () => {
    setPurchasing(true);
    try {
      const next = await purchasePremiumStories();
      applyStatus(next);
      return next;
    } catch (error) {
      const message = errorMessage(error);
      setStatus((current) => ({ ...current, message }));
      throw new Error(message);
    } finally {
      setPurchasing(false);
    }
  }, [applyStatus]);

  const restore = useCallback(async () => {
    setPurchasing(true);
    try {
      const next = await restorePremiumStories();
      applyStatus(next);
      return next;
    } catch (error) {
      const message = errorMessage(error);
      setStatus((current) => ({ ...current, message }));
      throw new Error(message);
    } finally {
      setPurchasing(false);
    }
  }, [applyStatus]);

  const value = useMemo<StoryAccessContextValue>(() => ({
    ready,
    native,
    owned: status.owned,
    pending: status.pending,
    available: status.available,
    price: status.price,
    message: status.message,
    purchasing,
    canAccess(storyId) {
      return !native || !isPremiumStory(storyId) || status.owned;
    },
    purchase,
    restore,
  }), [native, purchase, purchasing, ready, restore, status]);

  return <StoryAccessContext.Provider value={value}>{children}</StoryAccessContext.Provider>;
}

export function useStoryAccess(): StoryAccessContextValue {
  const context = useContext(StoryAccessContext);
  if (!context) throw new Error('useStoryAccess must be used inside StoryAccessProvider.');
  return context;
}
