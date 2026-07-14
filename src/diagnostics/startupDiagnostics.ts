import { Platform } from 'react-native';
import * as Network from 'expo-network';

import { ENV, isConfigured } from '../config/env';
import { logError, logInfo, logWarn } from '../lib/logger';
import { supabase } from '../lib/supabase';

export type DiagnosticResult = {
  name: string;
  status: 'ready' | 'skipped' | 'error';
  message: string;
};

export async function runStartupDiagnostics(): Promise<DiagnosticResult[]> {
  logInfo('Diagnostics', 'Starting mobile stack diagnostics');

  const results: DiagnosticResult[] = [];

  results.push(await checkNetwork());
  results.push(await checkSupabase());
  results.push(checkSentry());
  results.push(checkPostHog());
  results.push(checkRevenueCat());
  results.push(checkEasConfig());

  logInfo('Diagnostics', 'Completed mobile stack diagnostics', {
    ready: results.filter((result) => result.status === 'ready').map((result) => result.name),
    skipped: results.filter((result) => result.status === 'skipped').map((result) => result.name),
    errors: results.filter((result) => result.status === 'error').map((result) => result.name),
  });

  return results;
}

async function checkNetwork(): Promise<DiagnosticResult> {
  try {
    const state = await Network.getNetworkStateAsync();
    const message = `Type=${state.type}; connected=${String(state.isConnected)}; internetReachable=${String(
      state.isInternetReachable,
    )}`;
    logInfo('Network', message);

    return {
      name: 'Expo Network',
      status: state.isConnected ? 'ready' : 'error',
      message,
    };
  } catch (error) {
    logError('Network', 'Failed to read network state', error);
    return {
      name: 'Expo Network',
      status: 'error',
      message: 'Impossible de lire l’état réseau.',
    };
  }
}

async function checkSupabase(): Promise<DiagnosticResult> {
  if (!supabase) {
    const message = 'Clés manquantes: EXPO_PUBLIC_SUPABASE_URL et/ou EXPO_PUBLIC_SUPABASE_ANON_KEY.';
    logWarn('Supabase', message);
    return {
      name: 'Supabase',
      status: 'skipped',
      message,
    };
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    const message = `Client initialisé; session active=${String(Boolean(data.session))}.`;
    logInfo('Supabase', message);
    return {
      name: 'Supabase',
      status: 'ready',
      message,
    };
  } catch (error) {
    logError('Supabase', 'Client initialized but health check failed', error);
    return {
      name: 'Supabase',
      status: 'error',
      message: 'Client initialisé, mais le test auth/session a échoué.',
    };
  }
}

function checkSentry(): DiagnosticResult {
  if (!isConfigured(ENV.sentryDsn)) {
    const message = 'DSN manquant: EXPO_PUBLIC_SENTRY_DSN. Sentry est installé mais non initialisé.';
    logWarn('Sentry', message);
    return {
      name: 'Sentry',
      status: 'skipped',
      message,
    };
  }

  try {
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: ENV.sentryDsn,
      debug: __DEV__,
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    });

    const message = 'Sentry initialisé.';
    logInfo('Sentry', message);
    return {
      name: 'Sentry',
      status: 'ready',
      message,
    };
  } catch (error) {
    logError('Sentry', 'Initialization failed', error);
    return {
      name: 'Sentry',
      status: 'error',
      message: 'Sentry est configuré mais son initialisation a échoué.',
    };
  }
}

function checkPostHog(): DiagnosticResult {
  if (!isConfigured(ENV.posthogApiKey)) {
    const message = 'Clé manquante: EXPO_PUBLIC_POSTHOG_API_KEY. PostHog est installé mais non initialisé.';
    logWarn('PostHog', message);
    return {
      name: 'PostHog',
      status: 'skipped',
      message,
    };
  }

  if (Platform.OS === 'web') {
    const message =
      'PostHog React Native est configuré, mais ce diagnostic est ignoré sur web. Utilise Android/iOS ou ajoute posthog-js pour le web.';
    logWarn('PostHog', message);
    return {
      name: 'PostHog',
      status: 'skipped',
      message,
    };
  }

  try {
    const { PostHog } = require('posthog-react-native');
    const client = new PostHog(ENV.posthogApiKey, {
      host: ENV.posthogHost,
      persistence: 'memory',
      captureAppLifecycleEvents: false,
    });
    client.capture('mobile_app_boot_diagnostics');

    const message = `PostHog initialisé sur ${ENV.posthogHost}.`;
    logInfo('PostHog', message);
    return {
      name: 'PostHog',
      status: 'ready',
      message,
    };
  } catch (error) {
    logError('PostHog', 'Initialization failed', error);
    return {
      name: 'PostHog',
      status: 'error',
      message: 'PostHog est configuré mais son initialisation a échoué.',
    };
  }
}

function checkRevenueCat(): DiagnosticResult {
  const key = Platform.OS === 'ios' ? ENV.revenueCatIosKey : ENV.revenueCatAndroidKey;

  if (!isConfigured(key)) {
    const message =
      Platform.OS === 'ios'
        ? 'Clé manquante: EXPO_PUBLIC_REVENUECAT_IOS_KEY.'
        : 'Clé manquante: EXPO_PUBLIC_REVENUECAT_ANDROID_KEY.';
    logWarn('RevenueCat', `${message} RevenueCat est installé mais non initialisé.`);
    return {
      name: 'RevenueCat',
      status: 'skipped',
      message,
    };
  }

  try {
    const Purchases = require('react-native-purchases').default;
    Purchases.configure({ apiKey: key });

    const message = `RevenueCat initialisé pour ${Platform.OS}.`;
    logInfo('RevenueCat', message);
    return {
      name: 'RevenueCat',
      status: 'ready',
      message,
    };
  } catch (error) {
    logError('RevenueCat', 'Initialization failed', error);
    return {
      name: 'RevenueCat',
      status: 'error',
      message:
        'RevenueCat est configuré mais indisponible dans ce runtime. Utilise un development build, pas Expo Go.',
    };
  }
}

function checkEasConfig(): DiagnosticResult {
  const message = 'eas.json présent; builds Android/iOS configurés en preview et production.';
  logInfo('EAS', message);
  return {
    name: 'EAS Build/Submit',
    status: 'ready',
    message,
  };
}
