/**
 * S29 Verify certificate (entry) · `verify/index.tsx` — public, no login.
 *
 * A code field with **Verify** (→ `/verify/{code}`) and a disabled **Scan QR
 * code** button (the scanner lands in P3-01). Reached from S02's "Verify a
 * certificate" link and from S28. Uses nothing that needs a session.
 */
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

import { CertificateHeader } from '../components/CertificateHeader';
import { VerifyCodeForm } from '../components/VerifyCodeForm';

export function VerifyCertificateScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <CertificateHeader title="Verify a certificate" divider />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: theme.spacing.four,
          paddingTop: theme.spacing.six,
          paddingBottom: insets.bottom + theme.spacing.six,
          gap: theme.spacing.six,
        }}
      >
        <View style={{ alignItems: 'center', gap: theme.spacing.three }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.muted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={26} color={theme.colors.foreground} />
          </View>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            Enter the certificate ID printed on an Aion certificate, or paste its verification link,
            to check that it’s genuine.
          </Text>
        </View>

        <VerifyCodeForm />

        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          Verification is provided by Aion. No account is needed.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
