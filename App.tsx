import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { RunePreview } from './src/components/RunePreview';
import { ENV } from './src/config/env';
import { runStartupDiagnostics, type DiagnosticResult } from './src/diagnostics/startupDiagnostics';
import {
  createActiveRunePayload,
  defaultRunes,
  getDefaultRuneById,
  loadPersistedActiveRuneId,
  persistActiveRuneId,
} from './src/features/runes';
import { logAppBoot, logWarn } from './src/lib/logger';

type TabId = 'rune' | 'status' | 'config';

const tabs: { id: TabId; label: string }[] = [
  { id: 'rune', label: 'Rune' },
  { id: 'status', label: 'Status' },
  { id: 'config', label: 'Config' },
];

export default function App() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [activeRuneId, setActiveRuneId] = useState<string>(defaultRunes[0].id);
  const [hasLoadedActiveRune, setHasLoadedActiveRune] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('rune');

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

  useEffect(() => {
    let isMounted = true;

    async function loadActiveRune() {
      try {
        const persistedRuneId = await loadPersistedActiveRuneId();

        if (isMounted && persistedRuneId) {
          setActiveRuneId(persistedRuneId);
        }
      } catch (error) {
        logWarn('Runes', 'Failed to load persisted active Rune', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (isMounted) {
          setHasLoadedActiveRune(true);
        }
      }
    }

    void loadActiveRune();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedActiveRune) {
      return;
    }

    void persistActiveRuneId(activeRuneId).catch((error: unknown) => {
      logWarn('Runes', 'Failed to persist active Rune', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, [activeRuneId, hasLoadedActiveRune]);

  const readyCount = useMemo(
    () => diagnostics.filter((item) => item.status === 'ready').length,
    [diagnostics],
  );
  const activeRune = getDefaultRuneById(activeRuneId) ?? defaultRunes[0];
  const activeRunePayload = useMemo(() => createActiveRunePayload(activeRune), [activeRune]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="auto" />
        <View style={styles.appShell}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Pixel Rune</Text>
            <Text style={styles.title}>
              {activeTab === 'rune'
                ? 'Choose your Rune'
                : activeTab === 'status'
                  ? 'Stack status'
                  : 'App config'}
            </Text>
            <Text style={styles.subtitle}>
              {activeTab === 'rune'
                ? 'Pick the pixel charm that will drive the app and widget payload.'
                : activeTab === 'status'
                  ? 'Startup diagnostics stay available without crowding the Rune screen.'
                  : 'Environment readiness for integrations used later in the product.'}
            </Text>
          </View>

          <View style={styles.content}>
            {activeTab === 'rune' ? (
              <View style={styles.runePage}>
                <View style={styles.heroCard}>
                  <Text style={styles.cardTitle}>Active Rune</Text>
                  <View style={styles.previewWrap}>
                    <RunePreview rune={activeRune} size={168} />
                  </View>
                  <Text style={styles.selectedRuneName}>{activeRune.name}</Text>
                  <Text style={styles.payloadHint}>
                    Payload v{activeRunePayload.version} · {activeRune.width}×{activeRune.height} ·{' '}
                    {activeRune.pixels.length} pixels
                  </Text>
                  <Text style={styles.persistenceHint}>
                    {hasLoadedActiveRune ? 'Saved locally on this device' : 'Loading saved Rune…'}
                  </Text>
                </View>

                <View style={styles.runeGrid}>
                  {defaultRunes.map((rune) => {
                    const isSelected = rune.id === activeRune.id;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        key={rune.id}
                        onPress={() => setActiveRuneId(rune.id)}
                        style={[styles.runeOption, isSelected && styles.runeOptionSelected]}
                      >
                        <RunePreview rune={rune} size={48} />
                        <Text style={styles.runeOptionText} numberOfLines={1}>
                          {rune.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {activeTab === 'status' ? (
              <View style={styles.pageStack}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>État de la stack</Text>
                  <Text style={styles.cardText}>
                    {diagnostics.length === 0
                      ? 'Diagnostics en cours... regarde aussi le Terminal.'
                      : `${readyCount}/${diagnostics.length} composantes prêtes ou joignables.`}
                  </Text>
                </View>

                <View style={styles.statusList}>
                  {diagnostics.map((item) => (
                    <View key={item.name} style={styles.row}>
                      <Text style={styles.rowStatus}>{statusLabel[item.status]}</Text>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.rowMessage} numberOfLines={2}>
                          {item.message}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {activeTab === 'config' ? (
              <View style={styles.pageStack}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Configuration</Text>
                  <Text style={styles.cardText}>
                    Integration keys are checked locally. Real secrets are not shown.
                  </Text>
                </View>

                <View style={styles.configGrid}>
                  <ConfigPill label="API URL" isReady={Boolean(ENV.supabaseUrl)} />
                  <ConfigPill label="PostHog" isReady={Boolean(ENV.posthogApiKey)} />
                  <ConfigPill label="RevenueCat iOS" isReady={Boolean(ENV.revenueCatIosKey)} />
                  <ConfigPill label="RevenueCat Android" isReady={Boolean(ENV.revenueCatAndroidKey)} />
                  <ConfigPill label="Sentry DSN" isReady={Boolean(ENV.sentryDsn)} />
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.tabBar}>
            {tabs.map((tab) => {
              const isSelected = tab.id === activeTab;

              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.tabButton, isSelected && styles.tabButtonSelected]}
                >
                  <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextSelected]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function ConfigPill({ label, isReady }: { label: string; isReady: boolean }) {
  return (
    <View style={styles.configPill}>
      <Text style={styles.configPillLabel}>{label}</Text>
      <Text style={[styles.configPillValue, isReady ? styles.readyText : styles.missingText]}>
        {isReady ? 'Ready' : 'Missing'}
      </Text>
    </View>
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
  appShell: {
    flex: 1,
    padding: 20,
    paddingBottom: 12,
  },
  header: {
    gap: 8,
    paddingBottom: 16,
    paddingTop: 18,
  },
  content: {
    flex: 1,
  },
  runePage: {
    flex: 1,
    gap: 14,
  },
  pageStack: {
    flex: 1,
    gap: 16,
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
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 35,
  },
  subtitle: {
    color: '#C8C5D8',
    fontSize: 15,
    lineHeight: 21,
  },
  card: {
    backgroundColor: '#1B1B29',
    borderColor: '#2D2B42',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#1B1B29',
    borderColor: '#2D2B42',
    borderRadius: 22,
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
  previewWrap: {
    marginTop: 8,
  },
  selectedRuneName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  payloadHint: {
    color: '#9E9AAF',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  persistenceHint: {
    color: '#72E6A6',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 6,
    textAlign: 'center',
  },
  runeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  runeOption: {
    alignItems: 'center',
    backgroundColor: '#12121D',
    borderColor: '#2D2B42',
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 8,
    padding: 10,
  },
  runeOptionSelected: {
    backgroundColor: '#26213D',
    borderColor: '#9D8CFF',
  },
  runeOptionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statusList: {
    gap: 10,
  },
  row: {
    alignItems: 'flex-start',
    backgroundColor: '#171724',
    borderColor: '#28263A',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
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
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  configGrid: {
    gap: 12,
  },
  configPill: {
    alignItems: 'center',
    backgroundColor: '#171724',
    borderColor: '#28263A',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  configPillLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  configPillValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  readyText: {
    color: '#72E6A6',
  },
  missingText: {
    color: '#FFB86B',
  },
  tabBar: {
    backgroundColor: '#171724',
    borderColor: '#2D2B42',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 6,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    paddingVertical: 12,
  },
  tabButtonSelected: {
    backgroundColor: '#9D8CFF',
  },
  tabButtonText: {
    color: '#BDB9CF',
    fontSize: 14,
    fontWeight: '800',
  },
  tabButtonTextSelected: {
    color: '#101018',
  },
});
