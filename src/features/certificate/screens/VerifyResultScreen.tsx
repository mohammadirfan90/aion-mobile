/**
 * S29 Verify certificate (result) · `verify/[code].tsx` — public, no login.
 *
 * Normalizes the route's code (so a pasted link or lowercase code still
 * works), calls `GET /courses/verify/{certificateId}` and shows the valid or
 * invalid card. The API returns 404 for every failure, so any 4xx / coded
 * error is "not found"; only network-style failures get a retry.
 * The code field stays on top (as in the design) to check another code.
 */
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ui/ErrorState';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

import { normalizeCertificateCode } from '../api';
import { CertificateHeader } from '../components/CertificateHeader';
import { VerifyCodeForm } from '../components/VerifyCodeForm';
import {
  InvalidCertificateCard,
  ValidCertificateCard,
  VerifyResultSkeleton,
} from '../components/VerifyResultCard';
import { isNotFoundError, useVerifyCertificate } from '../hooks';

export function VerifyResultScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code: string }>();
  const raw = typeof params.code === 'string' ? params.code : '';
  const code = normalizeCertificateCode(raw);

  const verifyQ = useVerifyCertificate(code);

  // Back might be S28 (when opened from "Verify in the app"), so go to the
  // empty form explicitly.
  const tryAnother = () => router.replace('/verify');

  let result: React.ReactNode;
  if (!code) {
    result = <InvalidCertificateCard code="" onTryAnother={tryAnother} />;
  } else if (verifyQ.isPending) {
    result = <VerifyResultSkeleton />;
  } else if (verifyQ.isError) {
    result = isNotFoundError(verifyQ.error) ? (
      <InvalidCertificateCard code={code} onTryAnother={tryAnother} />
    ) : (
      <ErrorState
        title="Couldn’t check this certificate"
        description="Check your connection and try again."
        onRetry={() => void verifyQ.refetch()}
      />
    );
  } else {
    result = <ValidCertificateCard certificate={verifyQ.data} />;
  }

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
          paddingTop: theme.spacing.five,
          paddingBottom: insets.bottom + theme.spacing.six,
          gap: theme.spacing.five,
        }}
        refreshControl={
          code ? (
            <RefreshControl
              refreshing={verifyQ.isRefetching}
              onRefresh={() => void verifyQ.refetch()}
              tintColor={theme.colors.mutedForeground}
            />
          ) : undefined
        }
      >
        <VerifyCodeForm key={code} initialCode={code} replace />
        {result}
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          Verification is provided by Aion.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
