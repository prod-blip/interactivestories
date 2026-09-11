import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export const PREMIUM_PRODUCT_ID = 'premium_story_pack_1';
export const PREMIUM_STORY_IDS = ['tortoise-and-rabbit', 'tortoise-and-tiger'] as const;

export type PremiumStoryId = (typeof PREMIUM_STORY_IDS)[number];

export type BillingStatus = {
  productId: string;
  owned: boolean;
  pending: boolean;
  cancelled: boolean;
  available: boolean;
  price?: string;
  message?: string;
};

type MoonlitBillingPlugin = {
  getStatus(): Promise<BillingStatus>;
  purchase(): Promise<BillingStatus>;
  restorePurchases(): Promise<BillingStatus>;
  addListener(
    eventName: 'entitlementChanged',
    listener: (status: BillingStatus) => void,
  ): Promise<PluginListenerHandle>;
};

const billingPlugin = registerPlugin<MoonlitBillingPlugin>('MoonlitBilling');

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function isPremiumStory(storyId: string): storyId is PremiumStoryId {
  return PREMIUM_STORY_IDS.includes(storyId as PremiumStoryId);
}

export async function getPremiumStatus(): Promise<BillingStatus> {
  if (!isNativeAndroid()) {
    return {
      productId: PREMIUM_PRODUCT_ID,
      owned: true,
      pending: false,
      cancelled: false,
      available: false,
    };
  }
  return billingPlugin.getStatus();
}

export async function purchasePremiumStories(): Promise<BillingStatus> {
  if (!isNativeAndroid()) return getPremiumStatus();
  return billingPlugin.purchase();
}

export async function restorePremiumStories(): Promise<BillingStatus> {
  if (!isNativeAndroid()) return getPremiumStatus();
  return billingPlugin.restorePurchases();
}

export async function listenForEntitlementChanges(
  listener: (status: BillingStatus) => void,
): Promise<PluginListenerHandle | undefined> {
  if (!isNativeAndroid()) return undefined;
  return billingPlugin.addListener('entitlementChanged', listener);
}
