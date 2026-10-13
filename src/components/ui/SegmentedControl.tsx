import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface UISegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: UISegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius.full,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: theme.spacing.two,
              borderRadius: theme.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? theme.colors.primary : 'transparent',
              opacity: pressed && !active ? 0.85 : 1,
            })}
          >
            <Text
              variant="label"
              style={{
                color: active
                  ? theme.colors.primaryForeground
                  : theme.colors.mutedForeground,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
