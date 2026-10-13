import { useRef } from 'react';
import { TextInput, View, type TextInputKeyPressEventData } from 'react-native';

import { useTheme } from '@/theme';

export interface UIOtpInputProps {
  length?: number;
  value: string[];
  onChange: (next: string[]) => void;
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  disabled,
}: UIOtpInputProps) {
  const theme = useTheme();
  const refs = useRef<(TextInput | null)[]>([]);

  const setDigit = (i: number, digit: string) => {
    const next = [...value];
    next[i] = digit.slice(-1);
    onChange(next);
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
    if (next.every((d) => d.length === 1)) onComplete?.(next.join(''));
  };

  const handleKey = (i: number, e: { nativeEvent: TextInputKeyPressEventData }) => {
    if (e.nativeEvent.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (i: number, text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length - i).split('');
    if (!digits.length) return;
    const next = [...value];
    digits.forEach((d, idx) => {
      next[i + idx] = d;
    });
    onChange(next);
    refs.current[Math.min(i + digits.length, length - 1)]?.focus();
    if (next.every((d) => d.length === 1)) onComplete?.(next.join(''));
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: theme.spacing.two,
        justifyContent: 'center',
      }}
    >
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 44,
            height: 52,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextInput
            ref={(r) => {
              refs.current[i] = r;
            }}
            value={value[i] ?? ''}
            editable={!disabled}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            autoFocus={autoFocus && i === 0}
            onChangeText={(t) => {
              if (t.length > 1) handlePaste(i, t);
              else setDigit(i, t);
            }}
            onKeyPress={(e) => handleKey(i, e)}
            style={{
              width: '100%',
              height: '100%',
              fontSize: 22,
              textAlign: 'center',
              color: theme.colors.foreground,
              fontFamily: theme.fonts.semibold,
            }}
          />
        </View>
      ))}
    </View>
  );
}
