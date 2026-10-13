/**
 * S28 Certificate · `(app)/course/[id]/certificate.tsx`
 *
 * Earned: the native certificate card (with a QR of the `certificateId`),
 * a "Verify in the app" link (→ S29), **View full certificate** (the API's
 * `html` in a WebView), **Share** (disabled until P3-05) and **Verify
 * online** (`EXPO_PUBLIC_WEB_URL + verifyUrl` in the in-app browser).
 *
 * Not earned (`INCOMPLETE`): the course progress and **Continue course**.
 * `FORBIDDEN` / `NOT_FOUND` / a disabled certificate get an empty state;
 * anything else is a retryable error.
 */
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Award, ExternalLink, Eye, Share, ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import type { StudentCertificate } from '@/api/types';
import { env } from '@/lib/env';
import { useTheme } from '@/theme';

import { errorCode } from '../api';
import { CertificateCard } from '../components/CertificateCard';
import { CertificateHeader } from '../components/CertificateHeader';
import { FullCertificateModal } from '../components/FullCertificateModal';
import { NotEarnedCard } from '../components/NotEarnedCard';
import { useCourseProgressSummary, useStudentCertificate } from '../hooks';

export function CertificateScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const courseId = typeof params.id === 'string' ? params.id : null;

  const certQ = useStudentCertificate(courseId);
  const code = certQ.isError ? errorCode(certQ.error) : null;
  const notEarned = code === 'INCOMPLETE';
  const progressQ = useCourseProgressSummary(courseId, notEarned);

  const header = <CertificateHeader title="Certificate" centered />;
  const container = { flex: 1, backgroundColor: theme.colors.background } as const;

  const goToCurriculum = () => {
    if (courseId) router.push(`/(app)/course/${courseId}/curriculum` as Href);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (certQ.isPending) {
    return (
      <View style={container}>
        {header}
        <View
          style={{ padding: theme.spacing.four, gap: theme.spacing.three, alignItems: 'center' }}
          accessibilityLabel="Loading certificate"
        >
          <Skeleton width="100%" height={420} radius={theme.radius.xl} />
          <Skeleton width="50%" />
          <Skeleton width="100%" height={52} radius={theme.radius.full} />
          <Skeleton width="100%" height={52} radius={theme.radius.full} />
        </View>
      </View>
    );
  }

  // ── Errors ────────────────────────────────────────────────────────────────
  if (certQ.isError) {
    if (notEarned) {
      return (
        <View style={container}>
          {header}
          <ScrollView
            contentContainerStyle={{
              padding: theme.spacing.four,
              paddingBottom: insets.bottom + theme.spacing.six,
            }}
            refreshControl={
              <RefreshControl
                refreshing={certQ.isRefetching || progressQ.isRefetching}
                onRefresh={() => {
                  void certQ.refetch();
                  void progressQ.refetch();
                }}
                tintColor={theme.colors.mutedForeground}
              />
            }
          >
            <NotEarnedCard
              progress={progressQ.data}
              progressLoading={progressQ.isPending}
              progressError={progressQ.isError}
              onRetryProgress={() => void progressQ.refetch()}
              onContinue={goToCurriculum}
            />
          </ScrollView>
        </View>
      );
    }
    if (code === 'FORBIDDEN' || code === 'NOT_FOUND') {
      return (
        <View style={container}>
          {header}
          <EmptyState
            icon={<Award size={28} color={theme.colors.mutedForeground} />}
            title={code === 'FORBIDDEN' ? 'You’re not enrolled in this course' : 'Course not found'}
            description={
              code === 'FORBIDDEN'
                ? 'Enroll and finish the course to earn its certificate.'
                : 'This course may have been removed.'
            }
            actionLabel="Go back"
            onAction={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        </View>
      );
    }
    return (
      <View style={container}>
        {header}
        <ErrorState
          title="Couldn’t load your certificate"
          description="Check your connection and try again."
          onRetry={() => void certQ.refetch()}
        />
      </View>
    );
  }

  const certificate = certQ.data;

  if (!certificate.enabled) {
    return (
      <View style={container}>
        {header}
        <EmptyState
          icon={<Award size={28} color={theme.colors.mutedForeground} />}
          title="No certificate for this course"
          description="This course doesn’t issue certificates."
          actionLabel="Back to course"
          onAction={goToCurriculum}
        />
      </View>
    );
  }

  return (
    <View style={container}>
      {header}
      <EarnedCertificate
        certificate={certificate}
        bottomInset={insets.bottom}
        refreshing={certQ.isRefetching}
        onRefresh={() => void certQ.refetch()}
      />
    </View>
  );
}

function EarnedCertificate({
  certificate,
  bottomInset,
  refreshing,
  onRefresh,
}: {
  certificate: StudentCertificate;
  bottomInset: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const theme = useTheme();
  const [fullOpen, setFullOpen] = useState(false);

  const verifyOnline = async () => {
    const url = `${env.webUrl.replace(/\/$/, '')}${certificate.verifyUrl}`;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      showToast('Couldn’t open the browser', 'error');
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.four,
          paddingBottom: bottomInset + theme.spacing.six,
          gap: theme.spacing.four,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.mutedForeground}
          />
        }
      >
        <CertificateCard certificate={certificate} />

        <Pressable
          onPress={() => router.push(`/verify/${certificate.certificateId}` as Href)}
          accessibilityRole="link"
          accessibilityLabel="Verify this certificate in the app"
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
            gap: theme.spacing.two,
            paddingVertical: theme.spacing.one,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ShieldCheck size={16} color={theme.colors.mutedForeground} />
          <Text variant="label" tone="muted" style={{ textDecorationLine: 'underline' }}>
            Verify in the app
          </Text>
        </Pressable>

        <View style={{ gap: theme.spacing.three }}>
          <Button
            label="View full certificate"
            variant="secondary"
            size="lg"
            iconLeft={<Eye size={18} color={theme.colors.foreground} />}
            onPress={() => setFullOpen(true)}
          />
          <View style={{ flexDirection: 'row', gap: theme.spacing.three }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Share"
                size="lg"
                disabled
                accessibilityHint="Sharing is coming soon"
                iconLeft={<Share size={18} color={theme.colors.primaryForeground} />}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Verify online"
                variant="secondary"
                size="lg"
                accessibilityHint="Opens the certificate's public page in the browser"
                iconLeft={<ExternalLink size={18} color={theme.colors.foreground} />}
                onPress={() => void verifyOnline()}
              />
            </View>
          </View>
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            Sharing is coming soon.
          </Text>
        </View>
      </ScrollView>

      <FullCertificateModal
        visible={fullOpen}
        html={certificate.html}
        title={certificate.courseTitle}
        onClose={() => setFullOpen(false)}
      />
    </>
  );
}
