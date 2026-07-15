import type { HexColor, Rune, RuneAnimation, RuneAnimationType, RunePixel } from '../runes';
import { RUNE_SHARE_PAYLOAD_VERSION, type RuneShareDecodeResult, type RuneSharePayload } from './types';

const RUNE_SHARE_KIND = 'pixel-rune-share';
const RUNE_SHARE_URL_SCHEME = 'pixelrune://share';
const MAX_RUNE_SIZE = 16;
const MAX_RUNE_PIXELS = MAX_RUNE_SIZE * MAX_RUNE_SIZE;
const MAX_NOTE_LENGTH = 160;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const RUNE_ANIMATION_TYPES = new Set<RuneAnimationType>(['none', 'fadeIn', 'fadeOut']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHexColor(value: unknown): value is HexColor {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value);
}

function sanitizeText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmedValue = value.trim();

  return (trimmedValue || fallback).slice(0, maxLength);
}

function sanitizeAnimation(value: unknown): RuneAnimation | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { type, durationMs } = value;

  if (typeof type !== 'string' || !RUNE_ANIMATION_TYPES.has(type as RuneAnimationType)) {
    return undefined;
  }

  return {
    type: type as RuneAnimationType,
    durationMs:
      typeof durationMs === 'number' && Number.isFinite(durationMs)
        ? Math.min(Math.max(Math.round(durationMs), 200), 3000)
        : 900,
  };
}

function sanitizeRunePixel(value: unknown, width: number, height: number): RunePixel | null {
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
    x >= width ||
    y < 0 ||
    y >= height ||
    !isHexColor(color)
  ) {
    return null;
  }

  return {
    x,
    y,
    color: color.toUpperCase() as HexColor,
  };
}

function sanitizeSharedRune(value: unknown): Rune | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, name, width, height, backgroundColor, pixels, animation } = value;

  if (
    typeof id !== 'string' ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width !== MAX_RUNE_SIZE ||
    height !== MAX_RUNE_SIZE ||
    !isHexColor(backgroundColor) ||
    !Array.isArray(pixels) ||
    pixels.length > MAX_RUNE_PIXELS
  ) {
    return null;
  }

  const dedupedPixels = new Map<string, RunePixel>();

  for (const pixel of pixels) {
    const sanitizedPixel = sanitizeRunePixel(pixel, width, height);

    if (sanitizedPixel) {
      dedupedPixels.set(`${sanitizedPixel.x}:${sanitizedPixel.y}`, sanitizedPixel);
    }
  }

  return {
    id: `shared-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: sanitizeText(name, 'Shared Rune', 48),
    width,
    height,
    backgroundColor: backgroundColor.toUpperCase() as HexColor,
    pixels: Array.from(dedupedPixels.values()),
    createdBy: 'shared',
    animation: sanitizeAnimation(animation),
  };
}

function utf8Encode(value: string): number[] {
  return Array.from(value).flatMap((character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    if (codePoint <= 0x7f) {
      return [codePoint];
    }

    if (codePoint <= 0x7ff) {
      return [0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f)];
    }

    if (codePoint <= 0xffff) {
      return [
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      ];
    }

    return [
      0xf0 | (codePoint >> 18),
      0x80 | ((codePoint >> 12) & 0x3f),
      0x80 | ((codePoint >> 6) & 0x3f),
      0x80 | (codePoint & 0x3f),
    ];
  });
}

function utf8Decode(bytes: number[]): string {
  const codePoints: number[] = [];

  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];

    if (byte <= 0x7f) {
      codePoints.push(byte);
      continue;
    }

    if ((byte & 0xe0) === 0xc0) {
      const nextByte = bytes[index + 1];
      codePoints.push(((byte & 0x1f) << 6) | (nextByte & 0x3f));
      index += 1;
      continue;
    }

    if ((byte & 0xf0) === 0xe0) {
      const nextByte = bytes[index + 1];
      const thirdByte = bytes[index + 2];
      codePoints.push(((byte & 0x0f) << 12) | ((nextByte & 0x3f) << 6) | (thirdByte & 0x3f));
      index += 2;
      continue;
    }

    const nextByte = bytes[index + 1];
    const thirdByte = bytes[index + 2];
    const fourthByte = bytes[index + 3];
    codePoints.push(
      ((byte & 0x07) << 18) |
        ((nextByte & 0x3f) << 12) |
        ((thirdByte & 0x3f) << 6) |
        (fourthByte & 0x3f),
    );
    index += 3;
  }

  return String.fromCodePoint(...codePoints);
}

function encodeBase64Url(value: string): string {
  const bytes = utf8Encode(value);
  let encodedValue = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const firstByte = bytes[index];
    const secondByte = bytes[index + 1];
    const thirdByte = bytes[index + 2];
    const combinedValue = (firstByte << 16) | ((secondByte ?? 0) << 8) | (thirdByte ?? 0);

    encodedValue += BASE64_ALPHABET[(combinedValue >> 18) & 0x3f];
    encodedValue += BASE64_ALPHABET[(combinedValue >> 12) & 0x3f];
    encodedValue += secondByte === undefined ? '=' : BASE64_ALPHABET[(combinedValue >> 6) & 0x3f];
    encodedValue += thirdByte === undefined ? '=' : BASE64_ALPHABET[combinedValue & 0x3f];
  }

  return encodedValue.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const bytes: number[] = [];

  for (let index = 0; index < paddedBase64.length; index += 4) {
    const firstValue = BASE64_ALPHABET.indexOf(paddedBase64[index]);
    const secondValue = BASE64_ALPHABET.indexOf(paddedBase64[index + 1]);
    const thirdCharacter = paddedBase64[index + 2];
    const fourthCharacter = paddedBase64[index + 3];
    const thirdValue = thirdCharacter === '=' ? 0 : BASE64_ALPHABET.indexOf(thirdCharacter);
    const fourthValue = fourthCharacter === '=' ? 0 : BASE64_ALPHABET.indexOf(fourthCharacter);

    if (firstValue < 0 || secondValue < 0 || thirdValue < 0 || fourthValue < 0) {
      throw new Error('Rune share payload is not valid base64url.');
    }

    const combinedValue = (firstValue << 18) | (secondValue << 12) | (thirdValue << 6) | fourthValue;

    bytes.push((combinedValue >> 16) & 0xff);

    if (thirdCharacter !== '=') {
      bytes.push((combinedValue >> 8) & 0xff);
    }

    if (fourthCharacter !== '=') {
      bytes.push(combinedValue & 0xff);
    }
  }

  return utf8Decode(bytes);
}

function extractEncodedPayload(sharedValue: string): string {
  const trimmedValue = sharedValue.trim();

  if (!trimmedValue.startsWith(RUNE_SHARE_URL_SCHEME)) {
    return trimmedValue;
  }

  const queryString = trimmedValue.split('?')[1] ?? '';
  const payloadPair = queryString
    .split('&')
    .map((part) => part.split('='))
    .find(([key]) => key === 'payload');

  return payloadPair?.[1] ? decodeURIComponent(payloadPair[1]) : '';
}

export function createRuneSharePayload(rune: Rune, note?: string): RuneSharePayload {
  return {
    version: RUNE_SHARE_PAYLOAD_VERSION,
    kind: RUNE_SHARE_KIND,
    sharedAt: new Date().toISOString(),
    rune,
    note: note ? sanitizeText(note, '', MAX_NOTE_LENGTH) : undefined,
  };
}

export function encodeRuneSharePayload(payload: RuneSharePayload): string {
  return encodeBase64Url(JSON.stringify(payload));
}

export function createRuneShareUrl(rune: Rune, note?: string): string {
  const payload = createRuneSharePayload(rune, note);
  const encodedPayload = encodeRuneSharePayload(payload);

  return `${RUNE_SHARE_URL_SCHEME}?payload=${encodedPayload}`;
}

export function decodeRuneSharePayload(sharedValue: string): RuneShareDecodeResult {
  try {
    const encodedPayload = extractEncodedPayload(sharedValue);

    if (!encodedPayload) {
      return {
        ok: false,
        reason: 'Missing Rune share payload.',
      };
    }

    const decodedPayload = JSON.parse(decodeBase64Url(encodedPayload)) as unknown;

    if (!isRecord(decodedPayload)) {
      return {
        ok: false,
        reason: 'Rune share payload is not valid JSON.',
      };
    }

    const { version, kind, sharedAt, rune, note } = decodedPayload;
    const sanitizedRune = sanitizeSharedRune(rune);

    if (
      version !== RUNE_SHARE_PAYLOAD_VERSION ||
      kind !== RUNE_SHARE_KIND ||
      typeof sharedAt !== 'string' ||
      Number.isNaN(Date.parse(sharedAt)) ||
      !sanitizedRune
    ) {
      return {
        ok: false,
        reason: 'Rune share payload uses an unsupported format.',
      };
    }

    return {
      ok: true,
      payload: {
        version: RUNE_SHARE_PAYLOAD_VERSION,
        kind: RUNE_SHARE_KIND,
        sharedAt,
        rune: sanitizedRune,
        note: typeof note === 'string' ? sanitizeText(note, '', MAX_NOTE_LENGTH) : undefined,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Rune share payload could not be decoded.',
    };
  }
}
