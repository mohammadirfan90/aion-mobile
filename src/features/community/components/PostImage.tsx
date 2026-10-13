/**
 * A post's image, with a quiet fallback when it can't load.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { ImageOff } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

export function PostImage({ uri, label }: { uri: string; label: string }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const frame = {
    width: '100%' as const,
    aspectRatio: 16 / 10,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.muted,
    overflow: 'hidden' as const,
  };
  if (failed) {
    return (
      <View style={[frame, { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.two }]}>
        <ImageOff size={24} color={theme.colors.mutedForeground} />
        <Text variant="caption" tone="muted">
          Image unavailable
        </Text>
      </View>
    );
  }
  return (
    <View style={frame}>
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={200}
        accessibilityLabel={label}
        onError={() => setFailed(true)}
      />
    </View>
  );
}
