import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

export interface UISkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
}

export function Skeleton({ width = '100%', height = 16, radius }: UISkeletonProps) {
  const theme = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.muted,
        },
        animatedStyle,
      ]}
    />
  );
}

export function SkeletonGroup({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={i === 0 ? 18 : 14} width={i === 0 ? '60%' : '90%'} />
      ))}
    </View>
  );
}
