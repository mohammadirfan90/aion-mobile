/**
 * S28's not-earned state (`INCOMPLETE`): the course progress as a ring with
 * the percentage, a lessons count, and **Continue course** (→ S11).
 */
import { View } from 'react-native';
import { Award } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

import type { CourseProgressSummary } from '../api';

const RING_SIZE = 112;

export function NotEarnedCard({
  progress,
  progressLoading,
  progressError,
  onRetryProgress,
  onContinue,
}: {
  progress: CourseProgressSummary | undefined;
  progressLoading: boolean;
  progressError: boolean;
  onRetryProgress: () => void;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const percent = progress?.percent ?? 0;

  return (
    <Card outlined padded={false} style={{ padding: theme.spacing.six, gap: theme.spacing.five }}>
      <View style={{ alignItems: 'center', gap: theme.spacing.two }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.full,
            backgroundColor: theme.colors.muted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Award size={22} color={theme.colors.mutedForeground} />
        </View>
        <Text variant="title" style={{ textAlign: 'center' }} accessibilityRole="header">
          Certificate not earned yet
        </Text>
        <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
          Finish every lesson in this course to earn your certificate.
        </Text>
      </View>

      <View style={{ alignItems: 'center', gap: theme.spacing.three }}>
        {progressLoading ? (
          <>
            <Skeleton width={RING_SIZE} height={RING_SIZE} radius={RING_SIZE / 2} />
            <Skeleton width="60%" />
          </>
        ) : progressError || !progress ? (
          <>
            <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
              Couldn’t load your progress.
            </Text>
            <Button
              label="Retry"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={onRetryProgress}
            />
          </>
        ) : (
          <>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Course progress ${percent} percent`}
              accessibilityValue={{ now: percent, min: 0, max: 100 }}
              style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}
            >
              <ProgressRing value={percent / 100} size={RING_SIZE} stroke={8} />
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text variant="title" weight="bold">
                  {percent}%
                </Text>
                <Text variant="tiny" tone="muted">
                  complete
                </Text>
              </View>
            </View>
            <View style={{ alignSelf: 'stretch', gap: theme.spacing.two }}>
              <ProgressBar value={percent / 100} />
              <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
                {progress.completed} of {progress.total} lessons completed
              </Text>
            </View>
          </>
        )}
      </View>

      <Button label="Continue course" size="lg" onPress={onContinue} />
    </Card>
  );
}
