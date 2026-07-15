import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { RunePreview } from './src/components/RunePreview';
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

type TabId = 'rune' | 'customize' | 'community';

const tabs: { id: TabId; label: string }[] = [
  { id: 'rune', label: 'Rune' },
  { id: 'customize', label: 'Create' },
  { id: 'community', label: 'Community' },
];

const colorPalette: HexColor[] = [
  '#9D8CFF',
  '#FF4D8D',
  '#FFE66D',
  '#61F2FF',
  '#72E6A6',
  '#FFFFFF',
];

const colorPickerRows: HexColor[][] = [
  ['#FF4D8D', '#FF5E5B', '#FF9F1C', '#FFE66D', '#72E6A6', '#61F2FF'],
  ['#9D8CFF', '#4D96FF', '#6FFFE9', '#70E000', '#F8E8A0', '#FFFFFF'],
  ['#C9184A', '#8D5A3B', '#B86B00', '#25734F', '#0D1324', '#171713'],
  ['#FFC2D1', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#A0C4FF', '#BDB2FF'],
];

const animationOptions: { label: string; type: RuneAnimationType }[] = [
  { label: 'None', type: 'none' },
  { label: 'Fade in', type: 'fadeIn' },
  { label: 'Fade out', type: 'fadeOut' },
];

function normalizeHexColor(input: string): HexColor | null {
  const trimmedInput = input.trim();
  const color = trimmedInput.startsWith('#') ? trimmedInput : `#${trimmedInput}`;

  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return null;
  }

  return color.toUpperCase() as HexColor;
}

export default function App() {
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
  const [customColorInput, setCustomColorInput] = useState<string>(colorPalette[0]);
  const [widgetSyncMessage, setWidgetSyncMessage] = useState('Widget sync pending native bridge.');
  const [mountedTabs, setMountedTabs] = useState<Record<TabId, boolean>>({
    rune: true,
    customize: false,
    community: false,
  });

  useEffect(() => {
    logAppBoot();
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
  const normalizedCustomColor = useMemo(
    () => normalizeHexColor(customColorInput),
    [customColorInput],
  );

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

  function selectColor(color: HexColor) {
    setSelectedColor(color);
    setCustomColorInput(color);
  }

  function applyCustomColor() {
    if (!normalizedCustomColor) {
      return;
    }

    selectColor(normalizedCustomColor);
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
            <Text style={styles.title}>
              {activeTab === 'rune'
                ? 'Your Rune'
                : activeTab === 'customize'
                  ? 'Create'
                  : 'Community'}
            </Text>
            <Text style={styles.subtitle}>
              {activeTab === 'rune'
                ? 'Pick the Rune you want to keep active.'
                : activeTab === 'customize'
                  ? 'Draw a 16×16 pixel charm and save it to your library.'
                  : 'Discover custom Runes shared by other creators.'}
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
                  <Text style={styles.kicker}>Active now</Text>
                  <View style={styles.previewWrap}>
                    <RunePreview animationEnabled rune={activeRune} size={168} />
                  </View>
                  <Text style={styles.selectedRuneName}>{activeRune.name}</Text>
                  {activeRune.animation?.type && activeRune.animation.type !== 'none' ? (
                    <Text style={styles.animationHint}>
                      {activeRune.animation.type === 'fadeIn' ? 'Fade in' : 'Fade out'} preview
                    </Text>
                  ) : null}
                  <Text style={styles.persistenceHint}>
                    {hasLoadedActiveRune ? 'Saved on this device' : 'Loading saved Rune…'}
                  </Text>
                </View>

                <View style={styles.selectorCard}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.selectorTitle}>Starter Runes</Text>
                      <Text style={styles.sectionSubtitle}>Ready-made charms to use instantly.</Text>
                    </View>
                    <Text style={styles.sectionCount}>{defaultRunes.length}</Text>
                  </View>
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
                    <View>
                      <Text style={styles.selectorTitle}>My Runes</Text>
                      <Text style={styles.sectionSubtitle}>Your saved custom designs.</Text>
                    </View>
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
                      <Text style={styles.emptyCustomTitle}>Nothing here yet</Text>
                      <Text style={styles.emptyCustomText}>
                        Create a Rune and it will appear in this library.
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setActiveTab('customize')}
                        style={[styles.inlineButton, styles.primaryActionButton]}
                      >
                        <Text style={styles.primaryActionText}>Create one</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                <View style={styles.noteCard}>
                  <Text style={styles.noteTitle}>Widget status</Text>
                  <Text style={styles.noteText}>{widgetSyncMessage}</Text>
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
                  <View style={styles.previewWrap}>
                    <RunePreview animationEnabled rune={draftRune} size={144} />
                  </View>
                  <Text style={styles.payloadHint}>
                    {draftPixels.length === 0
                      ? 'Start with a few pixels. You can edit it later.'
                      : `${draftPixels.length} painted pixels`}
                  </Text>
                </View>

                <View style={styles.selectorCard}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.selectorTitle}>Canvas</Text>
                      <Text style={styles.sectionSubtitle}>Tap a cell to paint or erase.</Text>
                    </View>
                  </View>
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

                <View style={styles.toolsCard}>
                  <View style={styles.toolBlock}>
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
                          onPress={() => selectColor(color)}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: color },
                            isSelected && styles.colorSwatchSelected,
                          ]}
                          />
                        );
                      })}
                    </View>
                    <View style={styles.colorPicker}>
                      {colorPickerRows.map((row, rowIndex) => (
                        <View key={`color-row-${rowIndex}`} style={styles.colorPickerRow}>
                          {row.map((color) => {
                            const isSelected = color === selectedColor;

                            return (
                              <Pressable
                                accessibilityLabel={`Select ${color}`}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                key={color}
                                onPress={() => selectColor(color)}
                                style={[
                                  styles.colorPickerCell,
                                  { backgroundColor: color },
                                  isSelected && styles.colorPickerCellSelected,
                                ]}
                              />
                            );
                          })}
                        </View>
                      ))}
                    </View>
                    <Text style={styles.exactColorLabel}>Exact color</Text>
                    <View style={styles.customColorRow}>
                      <View
                        style={[
                          styles.customColorPreview,
                          { backgroundColor: normalizedCustomColor ?? selectedColor },
                        ]}
                      />
                      <TextInput
                        accessibilityLabel="Custom hex color"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={7}
                        onChangeText={setCustomColorInput}
                        placeholder="#AABBCC"
                        placeholderTextColor="#8B846F"
                        style={styles.customColorInput}
                        value={customColorInput}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !normalizedCustomColor }}
                        disabled={!normalizedCustomColor}
                        onPress={applyCustomColor}
                        style={[
                          styles.customColorButton,
                          !normalizedCustomColor && styles.disabledActionButton,
                        ]}
                      >
                        <Text style={styles.customColorButtonText}>Use</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.toolBlock}>
                    <Text style={styles.selectorTitle}>Motion</Text>
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
                  </View>
                </View>

                <View style={styles.selectorCard}>
                  <TextInput
                    accessibilityLabel="Rune name"
                    onChangeText={setDraftName}
                    placeholder="Rune name"
                    placeholderTextColor="#8B846F"
                    style={styles.nameInput}
                    value={draftName}
                  />
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

            {mountedTabs.community ? (
              <ScrollView
                style={activeTab === 'community' ? styles.tabPanel : styles.hiddenTabPanel}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.communityPage}
              >
                <View style={styles.heroCard}>
                  <Text style={styles.kicker}>Coming soon</Text>
                  <Text style={styles.communityTitle}>Browse shared Runes</Text>
                  <Text style={styles.communityText}>
                    This is where people will publish custom Runes for others to discover, save,
                    and use as their active Rune.
                  </Text>
                </View>

                <View style={styles.selectorCard}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.selectorTitle}>Featured placeholders</Text>
                      <Text style={styles.sectionSubtitle}>
                        Example community slots before publishing is connected.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.communityGrid}>
                    {['Daily picks', 'Friends', 'Popular'].map((label) => (
                      <View key={label} style={styles.communityPlaceholder}>
                        <Text style={styles.placeholderIcon}>✦</Text>
                        <Text style={styles.placeholderTitle}>{label}</Text>
                        <Text style={styles.placeholderText}>Published Runes will appear here.</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.noteCard}>
                  <Text style={styles.noteTitle}>Publishing later</Text>
                  <Text style={styles.noteText}>
                    Community upload, profiles, moderation, and sharing are placeholders for now.
                  </Text>
                </View>
              </ScrollView>
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
    paddingTop: 12,
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
  communityPage: {
    gap: 14,
    paddingBottom: 10,
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
  kicker: {
    color: '#3D392E',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cardText: {
    color: '#4B493F',
    fontSize: 15,
    lineHeight: 22,
  },
  communityTitle: {
    color: '#171713',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
    textAlign: 'center',
  },
  communityText: {
    color: '#565244',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
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
  noteCard: {
    backgroundColor: '#F8F0D7',
    borderColor: '#C9B98F',
    borderRadius: 10,
    borderWidth: 2,
    padding: 12,
  },
  noteTitle: {
    color: '#3D392E',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  noteText: {
    color: '#625B48',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
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
  sectionSubtitle: {
    color: '#625B48',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: 10,
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
  inlineButton: {
    alignItems: 'center',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
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
  toolsCard: {
    backgroundColor: '#FDF8E7',
    borderColor: '#2E2A1F',
    borderRadius: 10,
    borderWidth: 2,
    elevation: 2,
    gap: 16,
    padding: 12,
    shadowColor: '#2E2A1F',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  toolBlock: {
    gap: 10,
  },
  communityGrid: {
    gap: 10,
  },
  communityPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#FFFDF3',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 2,
    padding: 16,
  },
  placeholderIcon: {
    color: '#F6A623',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  placeholderTitle: {
    color: '#171713',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  placeholderText: {
    color: '#625B48',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    textAlign: 'center',
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
  colorPicker: {
    backgroundColor: '#FFFDF3',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    gap: 6,
    padding: 8,
  },
  colorPickerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  colorPickerCell: {
    borderColor: 'rgba(46, 42, 31, 0.45)',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    height: 30,
  },
  colorPickerCellSelected: {
    borderColor: '#171713',
    borderWidth: 3,
  },
  exactColorLabel: {
    color: '#625B48',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  customColorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  customColorPreview: {
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    height: 42,
    width: 42,
  },
  customColorInput: {
    backgroundColor: '#FFFDF3',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    color: '#171713',
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  customColorButton: {
    alignItems: 'center',
    backgroundColor: '#F6A623',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  customColorButtonText: {
    color: '#171713',
    fontSize: 13,
    fontWeight: '900',
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
