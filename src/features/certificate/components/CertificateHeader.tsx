/**
 * Top bar for S28/S29: a muted circular back button and the title, below
 * the safe-area inset. `centered` matches S28's centred title; S29 keeps it
 * left-aligned with a hairline under the bar, as in its design.
 */
import { View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

const BUTTON_SIZE = 44;

export function CertificateHeader({
  title,
  centered = false,
  divider = false,
  onBack,
}: {
  title: string;
  centered?: boolean;
  divider?: boolean;
  /** Defaults to going back, or to the app root when there's no history (deep link). */
  onBack?: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const back =
    onBack ??
    (() => {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    });

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: insets.top + theme.spacing.two,
        paddingHorizontal: theme.spacing.four,
        paddingBottom: theme.spacing.two,
        gap: theme.spacing.three,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: theme.colors.border,
      }}
    >
      <IconButton
        icon={<ChevronLeft size={22} color={theme.colors.foreground} />}
        label="Back"
        variant="muted"
        size={BUTTON_SIZE}
        onPress={back}
      />
      <Text
        variant="heading"
        accessibilityRole="header"
        numberOfLines={1}
        style={{ flex: 1, textAlign: centered ? 'center' : 'left' }}
      >
        {title}
      </Text>
      {/* Balances the back button so a centred title is truly centred. */}
      {centered ? <View style={{ width: BUTTON_SIZE }} /> : null}
    </View>
  );
}
