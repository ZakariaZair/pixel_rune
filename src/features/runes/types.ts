export type HexColor = `#${string}`;

export type RunePixel = {
  x: number;
  y: number;
  color: HexColor;
};

export type RuneAnimationType = 'none' | 'fadeIn' | 'fadeOut';

export type RuneAnimation = {
  type: RuneAnimationType;
  durationMs: number;
};

export type Rune = {
  id: string;
  name: string;
  width: number;
  height: number;
  pixels: RunePixel[];
  backgroundColor?: HexColor;
  createdBy?: string;
  animation?: RuneAnimation;
};

export type ActiveRunePayload = {
  version: 1;
  selectedAt: string;
  rune: Rune;
};
