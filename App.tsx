import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  type HexColor,
  type Rune,
  type RunePixel,
} from './src/features/runes';
import { logAppBoot, logWarn } from './src/lib/logger';

type TabId = 'rune' | 'customize' | 'status' | 'config';

const tabs: { id: TabId; label: string }[] = [
  { id: 'rune', label: 'Rune' },
  { id: 'customize', label: 'Create' },
  { id: 'status', label: 'Status' },
  { id: 'config', label: 'Config' },
];

const CUSTOM_RUNE_SIZE = 16;
const CUSTOM_RUNE_BACKGROUND: HexColor = '#101018';
const colorPalette: HexColor[] = [
  '#9D8CFF',
  '#FF4D8D',
  '#FFE66D',
  '#61F2FF',
  '#72E6A6',
  '#FFFFFF',
];

export default function App() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [activeRuneId, setActiveRuneId] = useState<string>(defaultRunes[0].id);
  const [hasLoadedActiveRune, setHasLoadedActiveRune] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('rune');
  const [customRunes, setCustomRunes] = useState<Rune[]>([]);
  const [draftPixels, setDraftPixels] = useState<RunePixel[]>([]);
  const [selectedColor, setSelectedColor] = useState<HexColor>(colorPalette[0]);

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

        if (isMounted && persistedRuneId && getDefaultRuneById(persistedRuneId)) {
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

    if (!getDefaultRuneById(activeRuneId)) {
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
  const draftRune = useMemo<Rune>(
    () => ({
      id: 'custom-draft',
      name: 'Draft Rune',
      width: CUSTOM_RUNE_SIZE,
      height: CUSTOM_RUNE_SIZE,
      backgroundColor: CUSTOM_RUNE_BACKGROUND,
      pixels: draftPixels,
      createdBy: 'local',
    }),
    [draftPixels],
  );
  const activeRune =
    customRunes.find((rune) => rune.id === activeRuneId) ??
    getDefaultRuneById(activeRuneId) ??
    defaultRunes[0];
  const activeRunePayload = useMemo(() => createActiveRunePayload(activeRune), [activeRune]);

  function toggleDraftPixel(x: number, y: number) {
    setDraftPixels((currentPixels) => {
      const existingPixel = currentPixels.find((pixel) => pixel.x === x && pixel.y === y);

      if (existingPixel?.color === selectedColor) {
        return currentPixels.filter((pixel) => pixel.x !== x || pixel.y !== y);
      }

      return [
        ...currentPixels.filter((pixel) => pixel.x !== x || pixel.y !== y),
        { x, y, color: selectedColor },
      ];
    });
  }

  function saveDraftRune() {
    if (draftPixels.length === 0) {
      return;
    }

    const customRune: Rune = {
      ...draftRune,
      id: `custom-${Date.now()}`,
      name: `Custom ${customRunes.length + 1}`,
      pixels: draftPixels,
    };

    setCustomRunes((currentRunes) => [customRune, ...currentRunes]);
    setActiveRuneId(customRune.id);
    setDraftPixels([]);
    setActiveTab('rune');
  }

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
                : activeTab === 'customize'
                  ? 'Create a Rune'
                : activeTab === 'status'
                  ? 'Stack status'
                  : 'App config'}
            </Text>
            <Text style={styles.subtitle}>
              {activeTab === 'rune'
                ? 'Pick the pixel charm that will drive the app and widget payload.'
                : activeTab === 'customize'
                  ? 'Paint a 16×16 Rune using the same serializable Rune engine.'
                : activeTab === 'status'
                  ? 'Startup diagnostics stay available without crowding the Rune screen.'
                  : 'Environment readiness for integrations used later in the product.'}
            </Text>
          </View>

          <View style={styles.content}>
            {activeTab === 'rune' ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.runePage}
              >
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

                <View style={styles.selectorCard}>
                  <Text style={styles.selectorTitle}>Default Runes</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.runeRail}
                  >
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
                          <RunePreview rune={rune} size={44} />
                          <Text style={styles.runeOptionText} numberOfLines={1}>
                            {rune.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.selectorCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.selectorTitle}>Customized Runes</Text>
                    <Text style={styles.sectionCount}>{customRunes.length}</Text>
                  </View>
                  {customRunes.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.runeRail}
                    >
                      {customRunes.map((rune) => {
                        const isSelected = rune.id === activeRune.id;

                        return (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            key={rune.id}
                            onPress={() => setActiveRuneId(rune.id)}
                            style={[styles.runeOption, isSelected && styles.runeOptionSelected]}
                          >
                            <RunePreview rune={rune} size={44} />
                            <Text style={styles.runeOptionText} numberOfLines={1}>
                              {rune.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyCustomRunes}>
                      <Text style={styles.emptyCustomTitle}>No custom Runes yet</Text>
                      <Text style={styles.emptyCustomText}>
                        Use the Create tab to paint your first personalized Rune.
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            ) : null}

            {activeTab === 'customize' ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.customizePage}
              >
                <View style={styles.heroCard}>
                  <Text style={styles.cardTitle}>Draft Preview</Text>
                  <View style={styles.previewWrap}>
                    <RunePreview rune={draftRune} size={144} />
                  </View>
                  <Text style={styles.payloadHint}>
                    {draftPixels.length === 0
                      ? 'Tap cells below to start painting.'
                      : `${draftPixels.length} painted pixels`}
                  </Text>
                </View>

                <View style={styles.selectorCard}>
                  <Text style={styles.selectorTitle}>Paint grid</Text>
                  <View style={styles.editorGrid}>
                    {Array.from({ length: CUSTOM_RUNE_SIZE }).map((_, y) => (
                      <View key={`editor-row-${y}`} style={styles.editorRow}>
                        {Array.from({ length: CUSTOM_RUNE_SIZE }).map((__, x) => {
                          const paintedPixel = draftPixels.find(
                            (pixel) => pixel.x === x && pixel.y === y,
                          );

                          return (
                            <Pressable
                              accessibilityLabel={`Paint pixel ${x + 1}, ${y + 1}`}
                              accessibilityRole="button"
                              key={`editor-cell-${x}-${y}`}
                              onPress={() => toggleDraftPixel(x, y)}
                              style={[
                                styles.editorCell,
                                { backgroundColor: paintedPixel?.color ?? '#0D0D16' },
                              ]}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.selectorCard}>
                  <Text style={styles.selectorTitle}>Color</Text>
                  <View style={styles.palette}>
                    {colorPalette.map((color) => {
                      const isSelected = color === selectedColor;

                      return (
                        <Pressable
                          accessibilityLabel={`Select ${color}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          key={color}
                          onPress={() => setSelectedColor(color)}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: color },
                            isSelected && styles.colorSwatchSelected,
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>

                <View style={styles.editorActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDraftPixels([])}
                    style={[styles.actionButton, styles.secondaryActionButton]}
                  >
                    <Text style={styles.secondaryActionText}>Clear</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: draftPixels.length === 0 }}
                    disabled={draftPixels.length === 0}
                    onPress={saveDraftRune}
                    style={[
                      styles.actionButton,
                      styles.primaryActionButton,
                      draftPixels.length === 0 && styles.disabledActionButton,
                    ]}
                  >
                    <Text style={styles.primaryActionText}>Save Rune</Text>
                  </Pressable>
                </View>
              </ScrollView>
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
    gap: 14,
    paddingBottom: 10,
  },
  customizePage: {
    gap: 14,
    paddingBottom: 10,
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
  selectorCard: {
    backgroundColor: '#171724',
    borderColor: '#28263A',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  selectorTitle: {
    color: '#DAD7EA',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionCount: {
    backgroundColor: '#26213D',
    borderRadius: 999,
    color: '#C8BDFF',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
    minWidth: 24,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    textAlign: 'center',
  },
  runeRail: {
    gap: 10,
    paddingRight: 2,
  },
  runeOption: {
    alignItems: 'center',
    backgroundColor: '#12121D',
    borderColor: '#2D2B42',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    minWidth: 92,
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
  emptyCustomRunes: {
    alignItems: 'center',
    backgroundColor: '#12121D',
    borderColor: '#2D2B42',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 18,
  },
  emptyCustomTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyCustomText: {
    color: '#BDB9CF',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  editorGrid: {
    alignSelf: 'center',
    backgroundColor: '#0D0D16',
    borderColor: '#2D2B42',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  editorRow: {
    flexDirection: 'row',
  },
  editorCell: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    height: 18,
    width: 18,
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatch: {
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    width: 42,
  },
  colorSwatchSelected: {
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    paddingVertical: 14,
  },
  primaryActionButton: {
    backgroundColor: '#9D8CFF',
  },
  secondaryActionButton: {
    backgroundColor: '#171724',
    borderColor: '#2D2B42',
    borderWidth: 1,
  },
  disabledActionButton: {
    opacity: 0.45,
  },
  primaryActionText: {
    color: '#101018',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryActionText: {
    color: '#DAD7EA',
    fontSize: 15,
    fontWeight: '800',
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
