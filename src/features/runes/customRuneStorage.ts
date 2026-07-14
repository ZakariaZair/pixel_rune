import * as SecureStore from 'expo-secure-store';

import type { HexColor, Rune, RuneAnimation, RuneAnimationType, RunePixel } from './types';

const CUSTOM_RUNES_STORAGE_KEY = 'pixelRune.customRunes.v1';
const CUSTOM_RUNE_SIZE = 16;
const DEFAULT_ANIMATION_DURATION_MS = 900;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const RUNE_ANIMATION_TYPES = new Set<RuneAnimationType>(['none', 'fadeIn', 'fadeOut']);

type StoredCustomRunesPayload = {
  version: 1;
  runes: Rune[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHexColor(value: unknown): value is HexColor {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value);
}

function isRuneAnimationType(value: unknown): value is RuneAnimationType {
  return typeof value === 'string' && RUNE_ANIMATION_TYPES.has(value as RuneAnimationType);
}

function sanitizeAnimation(value: unknown): RuneAnimation {
  if (!isRecord(value)) {
    return {
      type: 'none',
      durationMs: DEFAULT_ANIMATION_DURATION_MS,
    };
  }

  const { type, durationMs } = value;

  return {
    type: isRuneAnimationType(type) ? type : 'none',
    durationMs:
      typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs >= 200
        ? Math.min(durationMs, 3000)
        : DEFAULT_ANIMATION_DURATION_MS,
  };
}

function sanitizePixel(value: unknown): RunePixel | null {
  if (!isRecord(value)) {
    return null;
  }

  const { x, y, color } = value;

  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x >= CUSTOM_RUNE_SIZE ||
    y < 0 ||
    y >= CUSTOM_RUNE_SIZE ||
    !isHexColor(color)
  ) {
    return null;
  }

  return { x, y, color };
}

function sanitizeRune(value: unknown): Rune | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, name, width, height, backgroundColor, pixels, animation } = value;

  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    width !== CUSTOM_RUNE_SIZE ||
    height !== CUSTOM_RUNE_SIZE ||
    !isHexColor(backgroundColor) ||
    !Array.isArray(pixels)
  ) {
    return null;
  }

  const dedupedPixels = new Map<string, RunePixel>();

  for (const pixel of pixels) {
    const sanitizedPixel = sanitizePixel(pixel);

    if (sanitizedPixel) {
      dedupedPixels.set(`${sanitizedPixel.x}:${sanitizedPixel.y}`, sanitizedPixel);
    }
  }

  return {
    id,
    name: name.trim() || 'Untitled Rune',
    width,
    height,
    backgroundColor,
    pixels: Array.from(dedupedPixels.values()),
    createdBy: 'local',
    animation: sanitizeAnimation(animation),
  };
}

export async function loadPersistedCustomRunes(): Promise<Rune[]> {
  const isAvailable = await SecureStore.isAvailableAsync();

  if (!isAvailable) {
    return [];
  }

  const rawPayload = await SecureStore.getItemAsync(CUSTOM_RUNES_STORAGE_KEY);

  if (!rawPayload) {
    return [];
  }

  const parsedPayload = JSON.parse(rawPayload) as unknown;

  if (!isRecord(parsedPayload)) {
    return [];
  }

  const payload = parsedPayload as Partial<StoredCustomRunesPayload>;

  if (payload.version !== 1 || !Array.isArray(payload.runes)) {
    return [];
  }

  return payload.runes.flatMap((rune) => {
    const sanitizedRune = sanitizeRune(rune);

    return sanitizedRune ? [sanitizedRune] : [];
  });
}

export async function persistCustomRunes(runes: Rune[]): Promise<void> {
  const isAvailable = await SecureStore.isAvailableAsync();

  if (!isAvailable) {
    return;
  }

  const payload: StoredCustomRunesPayload = {
    version: 1,
    runes,
  };

  await SecureStore.setItemAsync(CUSTOM_RUNES_STORAGE_KEY, JSON.stringify(payload));
}
