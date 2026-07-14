import type { HexColor, Rune, RuneAnimation, RuneAnimationType, RunePixel } from './types';

export const CUSTOM_RUNE_SIZE = 16;
export const CUSTOM_RUNE_BACKGROUND: HexColor = '#101018';
export const DEFAULT_RUNE_ANIMATION: RuneAnimation = {
  type: 'none',
  durationMs: 900,
};

type RuneDraftInput = {
  id?: string;
  name: string;
  pixels: RunePixel[];
  animationType?: RuneAnimationType;
};

function createLocalRuneId(prefix: 'custom' | 'copy' = 'custom'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRuneAnimation(animationType: RuneAnimationType = 'none'): RuneAnimation {
  return {
    type: animationType,
    durationMs: DEFAULT_RUNE_ANIMATION.durationMs,
  };
}

export function createBlankRuneDraft(
  name = 'Untitled Rune',
  animationType: RuneAnimationType = 'none',
): Rune {
  return {
    id: 'custom-draft',
    name,
    width: CUSTOM_RUNE_SIZE,
    height: CUSTOM_RUNE_SIZE,
    backgroundColor: CUSTOM_RUNE_BACKGROUND,
    pixels: [],
    createdBy: 'local',
    animation: createRuneAnimation(animationType),
  };
}

export function createCustomRune({ name, pixels, animationType }: RuneDraftInput): Rune {
  return {
    id: createLocalRuneId(),
    name: name.trim() || 'Untitled Rune',
    width: CUSTOM_RUNE_SIZE,
    height: CUSTOM_RUNE_SIZE,
    backgroundColor: CUSTOM_RUNE_BACKGROUND,
    pixels,
    createdBy: 'local',
    animation: createRuneAnimation(animationType),
  };
}

export function updateCustomRune(
  existingRune: Rune,
  { name, pixels, animationType }: RuneDraftInput,
): Rune {
  return {
    ...existingRune,
    name: name.trim() || existingRune.name,
    pixels,
    animation: createRuneAnimation(animationType ?? existingRune.animation?.type ?? 'none'),
  };
}

export function duplicateCustomRune(rune: Rune, existingCount: number): Rune {
  return {
    ...rune,
    id: createLocalRuneId('copy'),
    name: `${rune.name} Copy ${existingCount + 1}`,
    pixels: [...rune.pixels],
    createdBy: 'local',
  };
}

export function upsertPixel(
  pixels: RunePixel[],
  x: number,
  y: number,
  selectedColor: HexColor,
): RunePixel[] {
  const existingPixel = pixels.find((pixel) => pixel.x === x && pixel.y === y);

  if (existingPixel?.color === selectedColor) {
    return pixels.filter((pixel) => pixel.x !== x || pixel.y !== y);
  }

  return [...pixels.filter((pixel) => pixel.x !== x || pixel.y !== y), { x, y, color: selectedColor }];
}
