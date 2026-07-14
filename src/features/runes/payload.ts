import type { ActiveRunePayload, Rune } from './types';

export function createActiveRunePayload(rune: Rune, selectedAt = new Date()): ActiveRunePayload {
  return {
    version: 1,
    selectedAt: selectedAt.toISOString(),
    rune,
  };
}
