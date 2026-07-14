import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { RunePreview } from './src/components/RunePreview';
import { ENV } from './src/config/env';
import { runStartupDiagnostics, type DiagnosticResult } from './src/diagnostics/startupDiagnostics';
import {
  createActiveRunePayload,
  createBlankRuneDraft,
  createCustomRune,
  CUSTOM_RUNE_SIZE,
  defaultRunes,
  duplicateCustomRune,
  getDefaultRuneById,
  loadPersistedCustomRunes,
  loadPersistedActiveRuneId,
  persistCustomRunes,
  persistActiveRuneId,
  syncActiveRunePayloadToWidget,
  updateCustomRune,
  upsertPixel,
  type HexColor,
  type Rune,
  type RuneAnimationType,
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

const colorPalette: HexColor[] = [
  '#9D8CFF',
  '#FF4D8D',
  '#FFE66D',
  '#61F2FF',
  '#72E6A6',
  '#FFFFFF',
];

const animationOptions: { label: string; type: RuneAnimationType }[] = [
  { label: 'None', type: 'none' },
  { label: 'Fade in', type: 'fadeIn' },
  { label: 'Fade out', type: 'fadeOut' },
];

export default function App() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [activeRuneId, setActiveRuneId] = useState<string>(defaultRunes[0].id);
  const [hasLoadedActiveRune, setHasLoadedActiveRune] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('rune');
  const [customRunes, setCustomRunes] = useState<Rune[]>([]);
  const [hasLoadedCustomRunes, setHasLoadedCustomRunes] = useState(false);
  const [editingRuneId, setEditingRuneId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('Untitled Rune');
  const [draftAnimationType, setDraftAnimationType] = useState<RuneAnimationType>('none');
  const [draftPixels, setDraftPixels] = useState<RunePixel[]>([]);
  const [selectedColor, setSelectedColor] = useState<HexColor>(colorPalette[0]);
  const [widgetSyncMessage, setWidgetSyncMessage] = useState('Widget sync pending native bridge.');
  const [mountedTabs, setMountedTabs] = useState<Record<TabId, boolean>>({
    rune: true,
    customize: false,
    status: false,
    config: false,
  });

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

    async function loadCustomRunes() {
      try {
        const persistedCustomRunes = await loadPersistedCustomRunes();

        if (isMounted) {
          setCustomRunes(persistedCustomRunes);
        }
      } catch (error) {
        logWarn('Runes', 'Failed to load persisted custom Runes', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (isMounted) {
          setHasLoadedCustomRunes(true);
        }
      }
    }

    void loadCustomRunes();

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

    const activeRuneExists =
      Boolean(getDefaultRuneById(activeRuneId)) || customRunes.some((rune) => rune.id === activeRuneId);

    if (!activeRuneExists) {
      return;
    }

    void persistActiveRuneId(activeRuneId).catch((error: unknown) => {
      logWarn('Runes', 'Failed to persist active Rune', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, [activeRuneId, customRunes, hasLoadedActiveRune]);

  useEffect(() => {
    setMountedTabs((currentTabs) => {
      if (currentTabs[activeTab]) {
        return currentTabs;
      }

      return {
        ...currentTabs,
        [activeTab]: true,
      };
    });
  }, [activeTab]);

  useEffect(() => {
    if (!hasLoadedCustomRunes) {
      return;
    }

    void persistCustomRunes(customRunes).catch((error: unknown) => {
      logWarn('Runes', 'Failed to persist custom Runes', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, [customRunes, hasLoadedCustomRunes]);

  const readyCount = useMemo(
    () => diagnostics.filter((item) => item.status === 'ready').length,
    [diagnostics],
  );
  const draftRune = useMemo<Rune>(
    () => ({
      ...createBlankRuneDraft(draftName, draftAnimationType),
      id: editingRuneId ?? 'custom-draft',
      pixels: draftPixels,
    }),
    [draftAnimationType, draftName, draftPixels, editingRuneId],
  );
  const activeRune: Rune =
    customRunes.find((rune) => rune.id === activeRuneId) ??
    getDefaultRuneById(activeRuneId) ??
    defaultRunes[0];
  const activeRunePayload = useMemo(() => createActiveRunePayload(activeRune), [activeRune]);

  useEffect(() => {
    if (!hasLoadedActiveRune || !hasLoadedCustomRunes) {
      return;
    }

    let isCurrent = true;

    async function syncWidgetPayload() {
      try {
        const syncState = await syncActiveRunePayloadToWidget(activeRunePayload);

        if (!isCurrent) {
          return;
        }

        if (syncState.status === 'synced') {
          setWidgetSyncMessage(`Widget payload synced: ${activeRunePayload.rune.name}`);
          return;
        }

        setWidgetSyncMessage(syncState.reason);
      } catch (error) {
        if (isCurrent) {
          const message = error instanceof Error ? error.message : String(error);
          setWidgetSyncMessage(`Widget sync failed: ${message}`);
          logWarn('Runes', 'Failed to sync active Rune payload to widget', { error: message });
        }
      }
    }

    void syncWidgetPayload();

    return () => {
      isCurrent = false;
    };
  }, [activeRunePayload, hasLoadedActiveRune, hasLoadedCustomRunes]);

  function toggleDraftPixel(x: number, y: number) {
    setDraftPixels((currentPixels) => upsertPixel(currentPixels, x, y, selectedColor));
  }

  function resetDraft() {
    setEditingRuneId(null);
    setDraftName('Untitled Rune');
    setDraftAnimationType('none');
    setDraftPixels([]);
  }

  function editCustomRune(rune: Rune) {
    setEditingRuneId(rune.id);
    setDraftName(rune.name);
    setDraftAnimationType(rune.animation?.type ?? 'none');
    setDraftPixels([...rune.pixels]);
    setActiveTab('customize');
  }

  function saveDraftRune() {
    if (draftPixels.length === 0) {
      return;
    }

    if (editingRuneId) {
      const existingRune = customRunes.find((rune) => rune.id === editingRuneId);

      if (!existingRune) {
        resetDraft();
        return;
      }

      const updatedRune = updateCustomRune(existingRune, {
        animationType: draftAnimationType,
        name: draftName,
        pixels: draftPixels,
      });

      setCustomRunes((currentRunes) =>
        currentRunes.map((rune) => (rune.id === editingRuneId ? updatedRune : rune)),
      );
      setActiveRuneId(updatedRune.id);
      resetDraft();
      setActiveTab('rune');
      return;
    }

    const customRune = createCustomRune({
      animationType: draftAnimationType,
      name: draftName,
      pixels: draftPixels,
    });

    setCustomRunes((currentRunes) => [customRune, ...currentRunes]);
    setActiveRuneId(customRune.id);
    resetDraft();
    setActiveTab('rune');
  }

  function duplicateRune(rune: Rune) {
    const duplicatedRune = duplicateCustomRune(rune, customRunes.length);

    setCustomRunes((currentRunes) => [duplicatedRune, ...currentRunes]);
    setActiveRuneId(duplicatedRune.id);
  }

  function deleteCustomRune(runeId: string) {
    setCustomRunes((currentRunes) => currentRunes.filter((rune) => rune.id !== runeId));

    if (activeRuneId === runeId) {
      setActiveRuneId(defaultRunes[0].id);
    }

    if (editingRuneId === runeId) {
      resetDraft();
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
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
            {mountedTabs.rune ? (
              <ScrollView
                style={activeTab === 'rune' ? styles.tabPanel : styles.hiddenTabPanel}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.runePage}
              >
                <View style={styles.heroCard}>
                  <Text style={styles.cardTitle}>Active Rune</Text>
                  <View style={styles.previewWrap}>
                    <RunePreview animationEnabled rune={activeRune} size={168} />
                  </View>
                  <Text style={styles.selectedRuneName}>{activeRune.name}</Text>
                  <Text style={styles.payloadHint}>
                    Payload v{activeRunePayload.version} · {activeRune.width}×{activeRune.height} ·{' '}
                    {activeRune.pixels.length} pixels
                  </Text>
                  {activeRune.animation?.type && activeRune.animation.type !== 'none' ? (
                    <Text style={styles.animationHint}>
                      Animation: {activeRune.animation.type === 'fadeIn' ? 'fade in' : 'fade out'}
                    </Text>
                  ) : null}
                  <Text style={styles.persistenceHint}>
                    {hasLoadedActiveRune ? 'Saved locally on this device' : 'Loading saved Rune…'}
                  </Text>
                  <Text style={styles.widgetHint}>{widgetSyncMessage}</Text>
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
                          <RunePreview rune={rune} size={48} />
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
                          <View key={rune.id} style={styles.customRuneOption}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              onPress={() => setActiveRuneId(rune.id)}
                              style={[styles.runeOption, isSelected && styles.runeOptionSelected]}
                            >
                              <RunePreview rune={rune} size={48} />
                              <Text style={styles.runeOptionText} numberOfLines={1}>
                                {rune.name}
                              </Text>
                            </Pressable>
                            <View style={styles.compactActions}>
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => editCustomRune(rune)}
                                style={styles.compactAction}
                              >
                                <Text style={styles.compactActionText}>Edit</Text>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => duplicateRune(rune)}
                                style={styles.compactAction}
                              >
                                <Text style={styles.compactActionText}>Copy</Text>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => deleteCustomRune(rune.id)}
                                style={[styles.compactAction, styles.dangerCompactAction]}
                              >
                                <Text style={[styles.compactActionText, styles.dangerActionText]}>
                                  Delete
                                </Text>
                              </Pressable>
                            </View>
                          </View>
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

            {mountedTabs.customize ? (
              <ScrollView
                style={activeTab === 'customize' ? styles.tabPanel : styles.hiddenTabPanel}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.customizePage}
              >
                <View style={styles.heroCard}>
                  <Text style={styles.cardTitle}>
                    {editingRuneId ? 'Edit Rune' : 'Draft Preview'}
                  </Text>
                  <TextInput
                    accessibilityLabel="Rune name"
                    onChangeText={setDraftName}
                    placeholder="Rune name"
                    placeholderTextColor="#8B846F"
                    style={styles.nameInput}
                    value={draftName}
                  />
                  <View style={styles.previewWrap}>
                    <RunePreview animationEnabled rune={draftRune} size={144} />
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
                                { backgroundColor: paintedPixel?.color ?? '#F8F0D7' },
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

                <View style={styles.selectorCard}>
                  <Text style={styles.selectorTitle}>Animation</Text>
                  <View style={styles.segmentedOptions}>
                    {animationOptions.map((option) => {
                      const isSelected = option.type === draftAnimationType;

                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          key={option.type}
                          onPress={() => setDraftAnimationType(option.type)}
                          style={[
                            styles.segmentedOption,
                            isSelected && styles.segmentedOptionSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.segmentedOptionText,
                              isSelected && styles.segmentedOptionTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.optionHelpText}>
                    Animation is stored in the Rune payload. Widget rendering may ignore it.
                  </Text>
                </View>

                <View style={styles.editorActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={resetDraft}
                    style={[styles.actionButton, styles.secondaryActionButton]}
                  >
                    <Text style={styles.secondaryActionText}>
                      {editingRuneId ? 'Cancel' : 'Clear'}
                    </Text>
                  </Pressable>
                  {editingRuneId ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => deleteCustomRune(editingRuneId)}
                      style={[styles.actionButton, styles.dangerActionButton]}
                    >
                      <Text style={styles.dangerButtonText}>Delete</Text>
                    </Pressable>
                  ) : null}
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
                    <Text style={styles.primaryActionText}>
                      {editingRuneId ? 'Update Rune' : 'Save Rune'}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}

            {mountedTabs.status ? (
              <View
                style={[
                  styles.pageStack,
                  activeTab === 'status' ? styles.tabPanel : styles.hiddenTabPanel,
                ]}
              >
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

            {mountedTabs.config ? (
              <View
                style={[
                  styles.pageStack,
                  activeTab === 'config' ? styles.tabPanel : styles.hiddenTabPanel,
                ]}
              >
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
    backgroundColor: '#F3EEDC',
  },
  appShell: {
    flex: 1,
    backgroundColor: '#F3EEDC',
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
  tabPanel: {
    flex: 1,
  },
  hiddenTabPanel: {
    display: 'none',
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
    color: '#4B493F',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#171713',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 35,
  },
  subtitle: {
    color: '#565244',
    fontSize: 15,
    lineHeight: 21,
  },
  card: {
    backgroundColor: '#FFFDF3',
    borderColor: '#2E2A1F',
    borderRadius: 10,
    borderWidth: 2,
    elevation: 2,
    padding: 18,
    shadowColor: '#2E2A1F',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#FFFDF3',
    borderColor: '#2E2A1F',
    borderRadius: 12,
    borderWidth: 2,
    elevation: 2,
    padding: 18,
    shadowColor: '#2E2A1F',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  cardTitle: {
    color: '#171713',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  cardText: {
    color: '#4B493F',
    fontSize: 15,
    lineHeight: 22,
  },
  previewWrap: {
    marginTop: 8,
  },
  selectedRuneName: {
    color: '#171713',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },
  payloadHint: {
    color: '#686354',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  persistenceHint: {
    color: '#25734F',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    marginTop: 6,
    textAlign: 'center',
  },
  widgetHint: {
    color: '#625B48',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 4,
    textAlign: 'center',
  },
  animationHint: {
    color: '#8A5A00',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    marginTop: 4,
    textAlign: 'center',
  },
  selectorCard: {
    backgroundColor: '#FDF8E7',
    borderColor: '#2E2A1F',
    borderRadius: 10,
    borderWidth: 2,
    elevation: 2,
    padding: 12,
    shadowColor: '#2E2A1F',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  selectorTitle: {
    color: '#3D392E',
    fontSize: 13,
    fontWeight: '900',
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
    backgroundColor: '#F6A623',
    borderColor: '#2E2A1F',
    borderRadius: 999,
    borderWidth: 2,
    color: '#171713',
    fontSize: 12,
    fontWeight: '900',
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
    backgroundColor: '#FFFDF3',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    elevation: 1,
    gap: 8,
    minWidth: 92,
    padding: 10,
    shadowColor: '#2E2A1F',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  runeOptionSelected: {
    backgroundColor: '#FFE2A6',
    borderColor: '#171713',
  },
  runeOptionText: {
    color: '#171713',
    fontSize: 13,
    fontWeight: '900',
  },
  customRuneOption: {
    gap: 8,
    width: 122,
  },
  compactActions: {
    gap: 6,
  },
  compactAction: {
    alignItems: 'center',
    backgroundColor: '#FFFDF3',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    paddingVertical: 7,
  },
  dangerCompactAction: {
    backgroundColor: '#FFE9E1',
    borderColor: '#7E2B1F',
  },
  compactActionText: {
    color: '#171713',
    fontSize: 11,
    fontWeight: '900',
  },
  dangerActionText: {
    color: '#7E2B1F',
  },
  emptyCustomRunes: {
    alignItems: 'center',
    backgroundColor: '#FFFDF3',
    borderColor: '#8B846F',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 2,
    padding: 18,
  },
  emptyCustomTitle: {
    color: '#171713',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyCustomText: {
    color: '#565244',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  editorGrid: {
    alignSelf: 'center',
    backgroundColor: '#E6DCC3',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  nameInput: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFDF3',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    color: '#171713',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editorRow: {
    flexDirection: 'row',
  },
  editorCell: {
    borderColor: 'rgba(46, 42, 31, 0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    height: 18,
    width: 18,
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  segmentedOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentedOption: {
    alignItems: 'center',
    backgroundColor: '#FFFDF3',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    elevation: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    shadowColor: '#2E2A1F',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  segmentedOptionSelected: {
    backgroundColor: '#F6A623',
  },
  segmentedOptionText: {
    color: '#4B493F',
    fontSize: 13,
    fontWeight: '900',
  },
  segmentedOptionTextSelected: {
    color: '#171713',
  },
  optionHelpText: {
    color: '#565244',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  colorSwatch: {
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    elevation: 1,
    height: 42,
    shadowColor: '#2E2A1F',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    width: 42,
  },
  colorSwatchSelected: {
    borderColor: '#171713',
    borderWidth: 3,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    elevation: 2,
    flex: 1,
    paddingVertical: 14,
    shadowColor: '#2E2A1F',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  primaryActionButton: {
    backgroundColor: '#F6A623',
  },
  secondaryActionButton: {
    backgroundColor: '#FFFDF3',
  },
  dangerActionButton: {
    backgroundColor: '#FFE9E1',
    borderColor: '#7E2B1F',
  },
  disabledActionButton: {
    opacity: 0.45,
  },
  primaryActionText: {
    color: '#171713',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryActionText: {
    color: '#171713',
    fontSize: 15,
    fontWeight: '900',
  },
  dangerButtonText: {
    color: '#7E2B1F',
    fontSize: 15,
    fontWeight: '900',
  },
  statusList: {
    gap: 10,
  },
  row: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFDF3',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
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
    color: '#171713',
    fontSize: 16,
    fontWeight: '900',
  },
  rowMessage: {
    color: '#565244',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  configGrid: {
    gap: 12,
  },
  configPill: {
    alignItems: 'center',
    backgroundColor: '#FFFDF3',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  configPillLabel: {
    color: '#171713',
    fontSize: 15,
    fontWeight: '900',
  },
  configPillValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  readyText: {
    color: '#25734F',
  },
  missingText: {
    color: '#B86B00',
  },
  tabBar: {
    backgroundColor: '#FFFDF3',
    borderColor: '#2E2A1F',
    borderRadius: 10,
    borderWidth: 2,
    elevation: 3,
    flexDirection: 'row',
    gap: 8,
    padding: 6,
    shadowColor: '#2E2A1F',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 12,
  },
  tabButtonSelected: {
    backgroundColor: '#F6A623',
    borderColor: '#2E2A1F',
    borderWidth: 2,
  },
  tabButtonText: {
    color: '#4B493F',
    fontSize: 14,
    fontWeight: '900',
  },
  tabButtonTextSelected: {
    color: '#171713',
  },
});
