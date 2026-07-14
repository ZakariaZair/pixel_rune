import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Rune } from '../features/runes';

type RunePreviewProps = {
  rune: Rune;
  size?: number;
};

const EMPTY_PIXEL_COLOR = 'transparent';

function RunePreviewComponent({ rune, size = 192 }: RunePreviewProps) {
  const pixelSize = size / Math.max(rune.width, rune.height);
  const pixelColors = useMemo(() => {
    const colors = new Map<string, string>();

    for (const pixel of rune.pixels) {
      colors.set(`${pixel.x}:${pixel.y}`, pixel.color);
    }

    return colors;
  }, [rune.pixels]);

  return (
    <View
      accessibilityLabel={`${rune.name} Rune preview`}
      accessibilityRole="image"
      style={[
        styles.frame,
        {
          backgroundColor: rune.backgroundColor ?? '#101018',
          height: rune.height * pixelSize,
          width: rune.width * pixelSize,
        },
      ]}
    >
      {Array.from({ length: rune.height }).map((_, y) => (
        <View key={`row-${y}`} style={styles.row}>
          {Array.from({ length: rune.width }).map((__, x) => (
            <View
              key={`${x}:${y}`}
              style={[
                styles.pixel,
                {
                  backgroundColor: pixelColors.get(`${x}:${y}`) ?? EMPTY_PIXEL_COLOR,
                  height: pixelSize,
                  width: pixelSize,
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export const RunePreview = memo(RunePreviewComponent);

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    borderColor: '#2D2B42',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  pixel: {
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
