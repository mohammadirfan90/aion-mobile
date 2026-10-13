import { View } from 'react-native';

import { useTheme } from '@/theme';

export interface UIProgressBarProps {
  value: number; // 0..1
  height?: number;
}

export function ProgressBar({ value, height = 6 }: UIProgressBarProps) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(pct * 100), min: 0, max: 100 }}
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: theme.colors.muted,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          backgroundColor: theme.colors.primary,
        }}
      />
    </View>
  );
}
