import type { Rune } from '../runes';

export const RUNE_SHARE_PAYLOAD_VERSION = 1;

export type RuneSharePayload = {
  version: typeof RUNE_SHARE_PAYLOAD_VERSION;
  kind: 'pixel-rune-share';
  sharedAt: string;
  rune: Rune;
  note?: string;
};

export type RuneShareDecodeResult =
  | {
      ok: true;
      payload: RuneSharePayload;
    }
  | {
      ok: false;
      reason: string;
    };

export type ImportedSharedRune = {
  rune: Rune;
  totalCustomRunes: number;
};
