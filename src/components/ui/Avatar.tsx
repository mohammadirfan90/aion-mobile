import { Image, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface UIAvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function Avatar({ uri, name, size = 40 }: UIAvatarProps) {
  const theme = useTheme();
  const dim = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={name ?? 'avatar'}
        style={{ ...dim, backgroundColor: theme.colors.muted }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={name ?? 'avatar'}
      style={{
        ...dim,
        backgroundColor: theme.colors.muted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="bodyStrong" tone="muted">
        {initialsOf(name)}
      </Text>
    </View>
  );
}
