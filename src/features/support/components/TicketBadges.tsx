/**
 * Status badge and priority pill shared by S22 and S23. Status uses the kit
 * `Badge`; priority is a muted pill with a coloured dot, as in the designs.
 */
import { View } from 'react-native';

import type { SupportTicketPriority, SupportTicketStatus } from '@/api/types';
import { Badge, type UIBadgeProps } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

export const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_TONE: Record<SupportTicketStatus, NonNullable<UIBadgeProps['tone']>> = {
  open: 'primary',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

export const PRIORITY_LABEL: Record<SupportTicketPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export function StatusBadge({ status }: { status: SupportTicketStatus }) {
  return <Badge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />;
}

export function PriorityPill({
  priority,
  prefix = false,
}: {
  priority: SupportTicketPriority;
  prefix?: boolean;
}) {
  const theme = useTheme();
  const dot =
    priority === 'urgent' || priority === 'high'
      ? theme.colors.destructive
      : priority === 'normal'
        ? theme.colors.mutedForeground
        : theme.colors.ring;
  const label = `${prefix ? 'Priority: ' : ''}${PRIORITY_LABEL[priority]}`;
  return (
    <View
      accessible
      accessibilityLabel={`Priority ${PRIORITY_LABEL[priority]}`}
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: theme.spacing.two,
        paddingVertical: 2,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.muted,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
      <Text variant="tiny">{label}</Text>
    </View>
  );
}
