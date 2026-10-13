import { useState } from 'react';
import {
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface UITextFieldProps
  extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label?: string;
  error?: string;
  hint?: string;
  secureToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  error,
  hint,
  secureToggle,
  value,
  onChangeText,
  containerStyle,
  secureTextEntry,
  ...rest
}: UITextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const isSecure = secureToggle ? !shown : secureTextEntry;

  const borderColor = error
    ? theme.colors.destructive
    : focused
      ? theme.colors.ring
      : theme.colors.border;

  return (
    <View style={[{ gap: theme.spacing.one }, containerStyle]}>
      {label ? (
        <Text variant="label" tone="muted">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          minHeight: 48,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor,
          backgroundColor: theme.colors.muted,
          paddingHorizontal: theme.spacing.four,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isSecure}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={theme.colors.mutedForeground}
          style={{
            flex: 1,
            color: theme.colors.foreground,
            fontSize: theme.typography.body.fontSize,
            lineHeight: theme.typography.body.lineHeight,
            fontFamily: theme.fonts.regular,
            paddingVertical: theme.spacing.three,
          }}
        />
        {secureToggle ? (
          <Text
            onPress={() => setShown((s) => !s)}
            variant="caption"
            tone="muted"
            style={{ paddingHorizontal: theme.spacing.two }}
            accessibilityRole="button"
          >
            {shown ? 'Hide' : 'Show'}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="destructive">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
