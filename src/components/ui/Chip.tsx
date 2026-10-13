import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface UIChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export function Chip({ label, selected, onPress, disabled }: UIChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: theme.spacing.three,
        paddingVertical: theme.spacing.two,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected
          ? theme.colors.primary
          : pressed
            ? theme.colors.muted
            : 'transparent',
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Text
        variant="label"
        style={{
          color: selected ? theme.colors.primaryForeground : theme.colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export interface UIChipGroupProps<T extends string> {
  options: readonly T[];
  value?: T;
  onChange?: (next: T) => void;
  multi?: boolean;
  values?: T[];
  onMultiChange?: (next: T[]) => void;
  gap?: number;
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multi,
  values,
  onMultiChange,
  gap,
}: UIChipGroupProps<T>) {
  const theme = useTheme();
  const isSelected = (opt: T) =>
    multi ? (values ?? []).includes(opt) : value === opt;
  const toggle = (opt: T) => {
    if (multi) {
      const list = values ?? [];
      const next = list.includes(opt) ? list.filter((o) => o !== opt) : [...list, opt];
      onMultiChange?.(next);
    } else {
      onChange?.(opt);
    }
  };
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: gap ?? theme.spacing.two,
      }}
    >
      {options.map((opt) => (
        <Chip key={opt} label={opt} selected={isSelected(opt)} onPress={() => toggle(opt)} />
      ))}
    </View>
  );
}
