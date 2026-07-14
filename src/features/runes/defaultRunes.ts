import type { HexColor, Rune, RunePixel } from './types';

const PIXEL_RUNE_BACKGROUND = '#101018';

function pixelsFromRows(rows: readonly string[], palette: Record<string, HexColor>): RunePixel[] {
  return rows.flatMap((row, y) =>
    Array.from(row).flatMap((symbol, x) => {
      const color = palette[symbol];

      return color ? [{ x, y, color }] : [];
    }),
  );
}

function largeSigilPixels(size: 32 | 64): RunePixel[] {
  const center = (size - 1) / 2;
  const stroke = size === 32 ? 0.75 : 1.35;
  const pixels: RunePixel[] = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const distance = Math.sqrt(dx * dx + dy * dy);
      const manhattanDistance = absX + absY;
      const isOuterCircle = Math.abs(distance - size * 0.36) <= stroke;
      const isInnerCircle = Math.abs(distance - size * 0.16) <= stroke * 0.8;
      const isDiamond = Math.abs(manhattanDistance - size * 0.46) <= stroke;
      const isVerticalBeam = absX <= stroke && distance <= size * 0.27;
      const isHorizontalBeam = absY <= stroke && distance <= size * 0.27;
      const isDiagonalCut =
        Math.abs(absX - absY) <= stroke && distance >= size * 0.18 && distance <= size * 0.31;
      const isCornerMark =
        absX >= size * 0.31 &&
        absX <= size * 0.4 &&
        absY >= size * 0.31 &&
        absY <= size * 0.4 &&
        Math.abs(absX - absY) <= stroke * 1.25;

      let color: HexColor | undefined;

      if (isVerticalBeam || isHorizontalBeam) {
        color = '#F8FBFF';
      } else if (isInnerCircle || isDiagonalCut) {
        color = '#61F2FF';
      } else if (isDiamond) {
        color = '#9D8CFF';
      } else if (isOuterCircle || isCornerMark) {
        color = '#6E56CF';
      }

      if (color) {
        pixels.push({ x, y, color });
      }
    }
  }

  return pixels;
}

export const defaultRunes = [
  {
    id: 'heart-default',
    name: 'Heart',
    width: 8,
    height: 8,
    backgroundColor: PIXEL_RUNE_BACKGROUND,
    pixels: [
      { x: 1, y: 1, color: '#FF4D8D' },
      { x: 2, y: 1, color: '#FF4D8D' },
      { x: 5, y: 1, color: '#FF4D8D' },
      { x: 6, y: 1, color: '#FF4D8D' },
      { x: 0, y: 2, color: '#FF4D8D' },
      { x: 1, y: 2, color: '#FF7AAF' },
      { x: 2, y: 2, color: '#FF7AAF' },
      { x: 3, y: 2, color: '#FF4D8D' },
      { x: 4, y: 2, color: '#FF4D8D' },
      { x: 5, y: 2, color: '#FF7AAF' },
      { x: 6, y: 2, color: '#FF7AAF' },
      { x: 7, y: 2, color: '#FF4D8D' },
      { x: 0, y: 3, color: '#FF4D8D' },
      { x: 1, y: 3, color: '#FF7AAF' },
      { x: 2, y: 3, color: '#FF7AAF' },
      { x: 3, y: 3, color: '#FF7AAF' },
      { x: 4, y: 3, color: '#FF7AAF' },
      { x: 5, y: 3, color: '#FF7AAF' },
      { x: 6, y: 3, color: '#FF7AAF' },
      { x: 7, y: 3, color: '#FF4D8D' },
      { x: 1, y: 4, color: '#FF4D8D' },
      { x: 2, y: 4, color: '#FF7AAF' },
      { x: 3, y: 4, color: '#FF7AAF' },
      { x: 4, y: 4, color: '#FF7AAF' },
      { x: 5, y: 4, color: '#FF7AAF' },
      { x: 6, y: 4, color: '#FF4D8D' },
      { x: 2, y: 5, color: '#FF4D8D' },
      { x: 3, y: 5, color: '#FF7AAF' },
      { x: 4, y: 5, color: '#FF7AAF' },
      { x: 5, y: 5, color: '#FF4D8D' },
      { x: 3, y: 6, color: '#FF4D8D' },
      { x: 4, y: 6, color: '#FF4D8D' },
    ],
  },
  {
    id: 'moon-default',
    name: 'Moon',
    width: 8,
    height: 8,
    backgroundColor: '#0D1324',
    pixels: [
      { x: 4, y: 0, color: '#F8E8A0' },
      { x: 5, y: 0, color: '#F8E8A0' },
      { x: 3, y: 1, color: '#F8E8A0' },
      { x: 4, y: 1, color: '#FFF4C8' },
      { x: 2, y: 2, color: '#F8E8A0' },
      { x: 3, y: 2, color: '#FFF4C8' },
      { x: 2, y: 3, color: '#F8E8A0' },
      { x: 3, y: 3, color: '#FFF4C8' },
      { x: 2, y: 4, color: '#F8E8A0' },
      { x: 3, y: 4, color: '#FFF4C8' },
      { x: 3, y: 5, color: '#F8E8A0' },
      { x: 4, y: 5, color: '#FFF4C8' },
      { x: 4, y: 6, color: '#F8E8A0' },
      { x: 5, y: 6, color: '#F8E8A0' },
      { x: 6, y: 1, color: '#8BA7FF' },
      { x: 7, y: 3, color: '#8BA7FF' },
      { x: 6, y: 6, color: '#8BA7FF' },
    ],
  },
  {
    id: 'spark-default',
    name: 'Spark',
    width: 8,
    height: 8,
    backgroundColor: '#11111A',
    pixels: [
      { x: 3, y: 0, color: '#FFE66D' },
      { x: 4, y: 0, color: '#FFE66D' },
      { x: 3, y: 1, color: '#FFF5A8' },
      { x: 4, y: 1, color: '#FFF5A8' },
      { x: 2, y: 2, color: '#FFE66D' },
      { x: 3, y: 2, color: '#FFFFFF' },
      { x: 4, y: 2, color: '#FFFFFF' },
      { x: 5, y: 2, color: '#FFE66D' },
      { x: 0, y: 3, color: '#FFB347' },
      { x: 1, y: 3, color: '#FFE66D' },
      { x: 2, y: 3, color: '#FFFFFF' },
      { x: 3, y: 3, color: '#FFFFFF' },
      { x: 4, y: 3, color: '#FFFFFF' },
      { x: 5, y: 3, color: '#FFFFFF' },
      { x: 6, y: 3, color: '#FFE66D' },
      { x: 7, y: 3, color: '#FFB347' },
      { x: 0, y: 4, color: '#FFB347' },
      { x: 1, y: 4, color: '#FFE66D' },
      { x: 2, y: 4, color: '#FFFFFF' },
      { x: 3, y: 4, color: '#FFFFFF' },
      { x: 4, y: 4, color: '#FFFFFF' },
      { x: 5, y: 4, color: '#FFFFFF' },
      { x: 6, y: 4, color: '#FFE66D' },
      { x: 7, y: 4, color: '#FFB347' },
      { x: 2, y: 5, color: '#FFE66D' },
      { x: 3, y: 5, color: '#FFFFFF' },
      { x: 4, y: 5, color: '#FFFFFF' },
      { x: 5, y: 5, color: '#FFE66D' },
      { x: 3, y: 6, color: '#FFF5A8' },
      { x: 4, y: 6, color: '#FFF5A8' },
      { x: 3, y: 7, color: '#FFE66D' },
      { x: 4, y: 7, color: '#FFE66D' },
    ],
  },
  {
    id: 'guardian-16-default',
    name: 'Guardian 16',
    width: 16,
    height: 16,
    backgroundColor: '#080A14',
    pixels: pixelsFromRows(
      [
        '................',
        '......PPPP......',
        '.....PCCCCP.....',
        '....PCLLLLCP....',
        '...PCLPPPPCLP...',
        '..PCLP....PLCP..',
        '.PCLP..LL..PLCP.',
        'PCLP..LCCL..PLCP',
        'PCLP..LCCL..PLCP',
        '.PCLP..LL..PLCP.',
        '..PCLP....PLCP..',
        '...PCLPPPPCLP...',
        '....PCLLLLCP....',
        '.....PCCCCP.....',
        '......PPPP......',
        '................',
      ],
      {
        C: '#61F2FF',
        L: '#D6FBFF',
        P: '#9D8CFF',
      },
    ),
  },
  {
    id: 'sigil-32-default',
    name: 'Sigil 32',
    width: 32,
    height: 32,
    backgroundColor: '#070914',
    pixels: largeSigilPixels(32),
  },
  {
    id: 'temple-64-default',
    name: 'Temple 64',
    width: 64,
    height: 64,
    backgroundColor: '#050711',
    pixels: largeSigilPixels(64),
  },
] as const satisfies readonly Rune[];

export function getDefaultRuneById(runeId: string): Rune | undefined {
  return defaultRunes.find((rune) => rune.id === runeId);
}
