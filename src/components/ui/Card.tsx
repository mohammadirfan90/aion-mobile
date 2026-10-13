import { type StyleProp, View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface UICardProps extends ViewProps {
  padded?: boolean;
  outlined?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  padded = true,
  outlined = true,
  style,
  children,
  ...rest
}: UICardProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.lg,
          borderWidth: outlined ? 1 : 0,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.four : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
