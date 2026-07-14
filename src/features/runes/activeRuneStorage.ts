import * as SecureStore from 'expo-secure-store';

const ACTIVE_RUNE_ID_STORAGE_KEY = 'pixelRune.activeRuneId';

export async function loadPersistedActiveRuneId(): Promise<string | null> {
  const isAvailable = await SecureStore.isAvailableAsync();

  if (!isAvailable) {
    return null;
  }

  const runeId = await SecureStore.getItemAsync(ACTIVE_RUNE_ID_STORAGE_KEY);

  if (!runeId) {
    return null;
  }

  return runeId;
}

export async function persistActiveRuneId(runeId: string): Promise<void> {
  if (!runeId.trim()) {
    return;
  }

  const isAvailable = await SecureStore.isAvailableAsync();

  if (!isAvailable) {
    return;
  }

  await SecureStore.setItemAsync(ACTIVE_RUNE_ID_STORAGE_KEY, runeId);
}
