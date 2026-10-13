import { View } from 'react-native';

import { useTheme } from '@/theme';

export interface UIDividerProps {
  inset?: number;
  vertical?: boolean;
}

export function Divider({ inset = 0, vertical = false }: UIDividerProps) {
  const theme = useTheme();
  if (vertical) {
    return (
      <View
        accessibilityRole="none"
        style={{
          width: 1,
          alignSelf: 'stretch',
          backgroundColor: theme.colors.border,
          marginHorizontal: inset,
        }}
      />
    );
  }
  return (
    <View
      accessibilityRole="none"
      style={{
        height: 1,
        alignSelf: 'stretch',
        backgroundColor: theme.colors.border,
        marginVertical: inset,
      }}
    />
  );
}
