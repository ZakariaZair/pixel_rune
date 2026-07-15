import { Share } from 'react-native';

import { loadPersistedCustomRunes, persistCustomRunes, type Rune } from '../runes';
import { createRuneShareUrl, decodeRuneSharePayload } from './runeShareCodec';
import type { ImportedSharedRune } from './types';

export async function shareRune(rune: Rune, note?: string): Promise<void> {
  const shareUrl = createRuneShareUrl(rune, note);

  await Share.share({
    title: 'Pixel Rune',
    message: `I sent you a Pixel Rune:\n${shareUrl}`,
    url: shareUrl,
  });
}

export async function importSharedRune(sharedValue: string): Promise<ImportedSharedRune> {
  const decodedShare = decodeRuneSharePayload(sharedValue);

  if (!decodedShare.ok) {
    throw new Error(decodedShare.reason);
  }

  const customRunes = await loadPersistedCustomRunes();
  const updatedCustomRunes = [...customRunes, decodedShare.payload.rune];

  await persistCustomRunes(updatedCustomRunes);

  return {
    rune: decodedShare.payload.rune,
    totalCustomRunes: updatedCustomRunes.length,
  };
}
