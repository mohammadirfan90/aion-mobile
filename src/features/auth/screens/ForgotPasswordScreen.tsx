import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, CircleAlert, KeyRound } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { HeaderBackButton } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useForgotPassword } from '@/features/auth/hooks';
import { forgotPasswordSchema } from '@/features/auth/schemas';
import { useTheme } from '@/theme';

export function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const { requestReset, isLoading, error, clearError } = useForgotPassword();

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (fieldError) setFieldError(null);
    if (error) clearError();
    if (sentSuccess) setSentSuccess(false);
  };

  const handleSendCode = async () => {
    clearError();
    setFieldError(null);

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setFieldError(validation.error.issues[0]?.message ?? 'Invalid email');
      return;
    }

    const ok = await requestReset(email.trim());
    if (ok) {
      setSentSuccess(true);
      // Wait briefly so the user sees the confirmation banner, then navigate to S06 reset-password
      setTimeout(() => {
        const target = `/(auth)/reset-password?email=${encodeURIComponent(email.trim())}`;
        router.push(target as never);
      }, 900);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  return (
    <Screen scroll keyboard padded edges={{ top: true, bottom: true }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'space-between',
          minHeight: 520,
          paddingBottom: theme.spacing.four,
        }}
      >
        <View style={{ gap: theme.spacing.six }}>
          {/* Top back button */}
          <View style={{ alignItems: 'flex-start', marginTop: theme.spacing.one }}>
            <HeaderBackButton onPress={() => router.back()} />
          </View>

          {/* Key icon badge & Heading (matching S05-forgot-password.png) */}
          <View style={{ alignItems: 'center', gap: theme.spacing.three }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: theme.radius.full,
                backgroundColor: theme.colors.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KeyRound size={26} color={theme.colors.foreground} />
            </View>

            <Text variant="display" weight="bold" style={{ textAlign: 'center' }}>
              Forgot your password?
            </Text>

            <Text
              variant="body"
              tone="muted"
              style={{ textAlign: 'center', paddingHorizontal: theme.spacing.four }}
            >
              Enter your email and we&apos;ll send you a 6-digit code to reset it.
            </Text>
          </View>

          {/* Input & Send code */}
          <View style={{ gap: theme.spacing.four, marginTop: theme.spacing.two }}>
            <TextField
              label="Email"
              placeholder="ayesha@example.com"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="go"
              onSubmitEditing={handleSendCode}
              error={fieldError ?? undefined}
            />

            <Button
              label="Send code"
              size="lg"
              fullWidth
              loading={isLoading}
              onPress={handleSendCode}
            />

            {/* Success confirmation card matching S05-forgot-password.png */}
            {sentSuccess && (
              <View
                style={{
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.muted,
                  padding: theme.spacing.four,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.three,
                }}
              >
                <CheckCircle2 size={20} color={theme.colors.success} />
                <Text variant="body" tone="default" style={{ flex: 1, lineHeight: 20 }}>
                  If an account exists for this email, a code is on its way.
                </Text>
              </View>
            )}

            {/* Error banner (e.g. RATE_LIMITED) */}
            {error && (
              <View
                style={{
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.destructive,
                  backgroundColor: theme.colors.muted,
                  padding: theme.spacing.four,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.two,
                }}
                accessibilityRole="alert"
              >
                <CircleAlert size={18} color={theme.colors.destructive} />
                <Text variant="bodyStrong" tone="destructive" style={{ flex: 1 }}>
                  {error}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer: Back to log in link */}
        <View style={{ alignItems: 'center', paddingVertical: theme.spacing.four }}>
          <Pressable
            onPress={handleBackToLogin}
            accessibilityRole="button"
            accessibilityLabel="Back to log in"
            hitSlop={8}
          >
            <Text variant="body" tone="muted">
              Back to log in
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
