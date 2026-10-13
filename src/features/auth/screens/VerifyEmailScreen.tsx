import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleAlert, Mail } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { HeaderBackButton } from '@/components/ui/Header';
import { OtpInput } from '@/components/ui/OtpInput';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import { useVerifyEmail } from '@/features/auth/hooks';
import { useTheme } from '@/theme';

export function VerifyEmailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email as string) || 'ayesha@example.com';

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [cooldown, setCooldown] = useState(60);

  const { verify, resend, isLoading, isResending, error, clearError } = useVerifyEmail();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (codeToVerify?: string) => {
    const code = codeToVerify ?? otp.join('');
    if (code.length < 6) return;

    clearError();
    const success = await verify(code);
    if (success) {
      showToast('Email verified successfully', 'success');
      // Landing destination after verification per SPEC/SCREENS.md
      router.replace('/(auth)/login');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    clearError();
    const ok = await resend(email);
    if (ok) {
      setCooldown(60);
      showToast('A new 6-digit code has been sent', 'info');
    }
  };

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

          {/* Mail icon badge & Header (matching S04-verify-email.png) */}
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
              <Mail size={26} color={theme.colors.foreground} />
            </View>

            <Text variant="display" weight="bold" style={{ textAlign: 'center' }}>
              Check your email
            </Text>

            <View style={{ alignItems: 'center', gap: theme.spacing.half }}>
              <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
                We sent a 6-digit code to
              </Text>
              <Text variant="bodyStrong" style={{ textAlign: 'center' }}>
                {email}
              </Text>
            </View>
          </View>

          {/* 6-box OTP input */}
          <View style={{ gap: theme.spacing.three, marginTop: theme.spacing.two }}>
            <OtpInput
              length={6}
              value={otp}
              onChange={(next) => {
                setOtp(next);
                if (error) clearError();
              }}
              onComplete={(code) => handleVerify(code)}
              autoFocus
              disabled={isLoading}
            />

            {error ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: theme.spacing.one,
                  marginTop: theme.spacing.two,
                }}
                accessibilityRole="alert"
              >
                <CircleAlert size={16} color={theme.colors.destructive} />
                <Text variant="caption" tone="destructive">
                  {error}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Primary Verify button */}
          <View style={{ marginTop: theme.spacing.four }}>
            <Button
              label="Verify"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={otp.join('').length < 6}
              onPress={() => handleVerify()}
            />
          </View>
        </View>

        {/* Cooldown / Resend footer (matching S04-verify-email.png) */}
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: theme.spacing.four,
          }}
        >
          {cooldown > 0 ? (
            <Text variant="body" tone="muted">
              Didn&apos;t get it? Resend code in {formatCooldown(cooldown)}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.one }}>
              <Text variant="body" tone="muted">
                Didn&apos;t get it?
              </Text>
              <Pressable
                onPress={handleResend}
                disabled={isResending}
                accessibilityRole="button"
                accessibilityLabel="Resend verification code"
                hitSlop={8}
              >
                <Text variant="bodyStrong" style={{ textDecorationLine: 'underline' }}>
                  {isResending ? 'Resending...' : 'Resend code'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}
