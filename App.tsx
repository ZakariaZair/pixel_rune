import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ENV } from './src/config/env';
import { runStartupDiagnostics, type DiagnosticResult } from './src/diagnostics/startupDiagnostics';
import { logAppBoot } from './src/lib/logger';

export default function App() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      logAppBoot();
      const results = await runStartupDiagnostics();

      if (isMounted) {
        setDiagnostics(results);
      }
    }

    void boot();

    return () => {
      isMounted = false;
    };
  }, []);

  const readyCount = useMemo(
    () => diagnostics.filter((item) => item.status === 'ready').length,
    [diagnostics],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Pixel Rune</Text>
        <Text style={styles.title}>App mobile vierge prête à tester</Text>
        <Text style={styles.subtitle}>
          Expo + React Native + TypeScript avec logs de santé au démarrage.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>État de la stack</Text>
          <Text style={styles.cardText}>
            {diagnostics.length === 0
              ? 'Diagnostics en cours... regarde aussi le Terminal.'
              : `${readyCount}/${diagnostics.length} composantes prêtes ou joignables.`}
          </Text>
        </View>

        {diagnostics.map((item) => (
          <View key={item.name} style={styles.row}>
            <Text style={styles.rowStatus}>{statusLabel[item.status]}</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowMessage}>{item.message}</Text>
            </View>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Configuration</Text>
          <Text style={styles.code}>API URL: {ENV.supabaseUrl ? 'définie' : 'manquante'}</Text>
          <Text style={styles.code}>PostHog: {ENV.posthogApiKey ? 'défini' : 'manquant'}</Text>
          <Text style={styles.code}>RevenueCat iOS: {ENV.revenueCatIosKey ? 'défini' : 'manquant'}</Text>
          <Text style={styles.code}>RevenueCat Android: {ENV.revenueCatAndroidKey ? 'défini' : 'manquant'}</Text>
          <Text style={styles.code}>Sentry DSN: {ENV.sentryDsn ? 'défini' : 'manquant'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const statusLabel: Record<DiagnosticResult['status'], string> = {
  ready: '✅',
  skipped: '⚠️',
  error: '❌',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101018',
  },
  container: {
    flexGrow: 1,
    gap: 16,
    padding: 24,
    paddingTop: 56,
  },
  eyebrow: {
    color: '#9D8CFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  subtitle: {
    color: '#C8C5D8',
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#1B1B29',
    borderColor: '#2D2B42',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    color: '#DAD7EA',
    fontSize: 15,
    lineHeight: 22,
  },
  row: {
    alignItems: 'flex-start',
    backgroundColor: '#171724',
    borderColor: '#28263A',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  rowStatus: {
    fontSize: 20,
    lineHeight: 26,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  rowMessage: {
    color: '#BDB9CF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  code: {
    color: '#DAD7EA',
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 20,
  },
});
