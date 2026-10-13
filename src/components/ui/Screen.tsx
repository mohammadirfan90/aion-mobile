import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export interface UIScreenProps {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  keyboard?: boolean;
  edges?: { top?: boolean; bottom?: boolean };
  background?: string;
  style?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = false,
  refreshControl = false,
  refreshing,
  onRefresh,
  padded = true,
  keyboard = false,
  edges = { top: true, bottom: true },
  background,
  style,
}: UIScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bg = background ?? theme.colors.background;

  const padStyle = {
    paddingTop: edges.top ? insets.top : 0,
    paddingBottom: edges.bottom ? insets.bottom : 0,
    paddingHorizontal: padded ? theme.spacing.four : 0,
  };

  const inner = scroll ? (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[padStyle, { flexGrow: 1 }, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        refreshControl ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.colors.foreground} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, backgroundColor: bg }, padStyle, style]}>{children}</View>
  );

  if (!keyboard) return inner;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {inner}
    </KeyboardAvoidingView>
  );
}
