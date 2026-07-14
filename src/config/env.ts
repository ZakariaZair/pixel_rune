import Constants from 'expo-constants';

type ExtraConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  sentryDsn?: string;
  posthogApiKey?: string;
  posthogHost?: string;
  revenueCatIosKey?: string;
  revenueCatAndroidKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const ENV = {
  supabaseUrl: extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  sentryDsn: extra.sentryDsn ?? process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  posthogApiKey: extra.posthogApiKey ?? process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
  posthogHost: extra.posthogHost ?? process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  revenueCatIosKey: extra.revenueCatIosKey ?? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatAndroidKey: extra.revenueCatAndroidKey ?? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
};

export function isConfigured(value: string) {
  return value.trim().length > 0;
}
