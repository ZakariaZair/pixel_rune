import { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import type { Rune } from '../features/runes';

type RunePreviewProps = {
  rune: Rune;
  animationEnabled?: boolean;
  size?: number;
};

const EMPTY_PIXEL_COLOR = 'transparent';
const MIN_FADE_OPACITY = 0.18;

function RunePreviewComponent({ rune, animationEnabled = false, size = 192 }: RunePreviewProps) {
  const pixelSize = size / Math.max(rune.width, rune.height);
  const opacity = useRef(new Animated.Value(1)).current;
  const animationType = rune.animation?.type ?? 'none';
  const animationDuration = rune.animation?.durationMs ?? 900;
  const pixelColors = useMemo(() => {
    const colors = new Map<string, string>();

    for (const pixel of rune.pixels) {
      colors.set(`${pixel.x}:${pixel.y}`, pixel.color);
    }

    return colors;
  }, [rune.pixels]);

  useEffect(() => {
    if (!animationEnabled || animationType === 'none') {
      opacity.stopAnimation();
      opacity.setValue(1);
      return;
    }

    const fromValue = animationType === 'fadeIn' ? MIN_FADE_OPACITY : 1;
    const toValue = animationType === 'fadeIn' ? 1 : MIN_FADE_OPACITY;

    opacity.setValue(fromValue);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: animationDuration,
          toValue,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 0,
          toValue: fromValue,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      opacity.setValue(1);
    };
  }, [animationDuration, animationEnabled, animationType, opacity]);

  return (
    <Animated.View
      accessibilityLabel={`${rune.name} Rune preview`}
      accessibilityRole="image"
      style={[
        styles.frame,
        {
          backgroundColor: rune.backgroundColor ?? '#F3EEDC',
          height: rune.height * pixelSize,
          opacity,
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
    </Animated.View>
  );
}

export const RunePreview = memo(RunePreviewComponent);

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    borderColor: '#2E2A1F',
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  pixel: {
    borderColor: 'rgba(46, 42, 31, 0.16)',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
