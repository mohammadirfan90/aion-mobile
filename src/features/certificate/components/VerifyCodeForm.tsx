/**
 * S29's code entry: a pill field with an inline **Verify** button, and a
 * **Scan QR code** button that stays disabled until the scanner (P3-01).
 * The typed or pasted text is normalized (trimmed, uppercased, `CERT-…`
 * pulled out of a URL) before navigating to `/verify/{code}`.
 */
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ScanQrCode } from 'lucide-react-native';

import { MONO_FONT } from '@/components/Markdown';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

import { normalizeCertificateCode } from '../api';

export function VerifyCodeForm({
  initialCode = '',
  replace = false,
  autoFocus = false,
}: {
  initialCode?: string;
  /** On the result screen, replace it instead of stacking another result. */
  replace?: boolean;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  const [value, setValue] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const submit = () => {
    const code = normalizeCertificateCode(value);
    if (!code) {
      setError('Enter a certificate code.');
      return;
    }
    setError(null);
    setValue(code);
    const href = `/verify/${encodeURIComponent(code)}` as Href;
    if (replace) router.replace(href);
    else router.push(href);
  };

  return (
    <View style={{ gap: theme.spacing.three }}>
      <View style={{ gap: theme.spacing.one }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 56,
            borderRadius: theme.radius.full,
            borderWidth: 1,
            borderColor: error
              ? theme.colors.destructive
              : focused
                ? theme.colors.foreground
                : theme.colors.border,
            backgroundColor: theme.colors.card,
            paddingLeft: theme.spacing.five,
            paddingRight: theme.spacing.one,
            gap: theme.spacing.two,
          }}
        >
          <TextInput
            value={value}
            onChangeText={(t) => {
              setValue(t);
              if (error) setError(null);
            }}
            onSubmitEditing={submit}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="CERT-AION-…"
            placeholderTextColor={theme.colors.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            autoFocus={autoFocus}
            returnKeyType="go"
            accessibilityLabel="Certificate code"
            accessibilityHint="Type or paste the code or link from a certificate"
            style={{
              flex: 1,
              minWidth: 0,
              color: theme.colors.foreground,
              fontFamily: MONO_FONT,
              fontSize: theme.typography.body.fontSize,
              paddingVertical: theme.spacing.three,
            }}
          />
          <Button label="Verify" fullWidth={false} onPress={submit} />
        </View>
        {error ? (
          <Text variant="caption" tone="destructive" style={{ paddingHorizontal: theme.spacing.four }}>
            {error}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: theme.spacing.one }}>
        <Button
          label="Scan QR code"
          variant="secondary"
          size="lg"
          disabled
          accessibilityHint="QR scanning is coming soon"
          iconLeft={<ScanQrCode size={18} color={theme.colors.foreground} />}
        />
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          QR scanning is coming soon. For now, type or paste the code.
        </Text>
      </View>
    </View>
  );
}
