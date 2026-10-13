/**
 * S29's result card. Valid: a green check and the returned fields (student,
 * course, issue date, issuer, plus completion date and score when present).
 * Invalid: a red state with "No certificate found for this code".
 * No tags, "Distinction" or record numbers (DESIGN.md).
 */
import { View } from 'react-native';
import { Check, X } from 'lucide-react-native';

import { MONO_FONT } from '@/components/Markdown';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import type { VerifiedCertificate } from '@/api/types';
import { useTheme } from '@/theme';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function StatusIcon({ valid }: { valid: boolean }) {
  const theme = useTheme();
  const color = valid ? theme.colors.success : theme.colors.destructive;
  return (
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: theme.colors.muted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {valid ? <Check size={30} color={color} /> : <X size={30} color={color} />}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.four,
        paddingVertical: theme.spacing.three,
      }}
    >
      <Text variant="body" tone="muted">
        {label}
      </Text>
      <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>
        {typeof children === 'string' ? (
          <Text variant="body" weight="medium" style={{ textAlign: 'right' }}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export function ValidCertificateCard({ certificate }: { certificate: VerifiedCertificate }) {
  const theme = useTheme();
  const completed = certificate.completedAt ? formatDate(certificate.completedAt) : null;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Student', value: certificate.studentName },
    { label: 'Course', value: certificate.courseTitle },
    { label: 'Issued', value: certificate.issueDate },
    { label: 'Issuer', value: certificate.issuerName },
  ];
  if (completed) rows.push({ label: 'Completed', value: completed });
  if (certificate.score) {
    rows.push({ label: 'Score', value: <Badge label={certificate.score} tone="success" /> });
  }
  rows.push({
    label: 'Certificate ID',
    value: (
      <Text selectable variant="caption" style={{ fontFamily: MONO_FONT, textAlign: 'right' }}>
        {certificate.certificateId}
      </Text>
    ),
  });

  return (
    <Card outlined padded={false} style={{ padding: theme.spacing.five }}>
      <View
        accessible
        accessibilityRole="summary"
        accessibilityLabel={`Valid certificate. ${certificate.certificateTitle} for ${certificate.courseTitle}, awarded to ${certificate.studentName} on ${certificate.issueDate} by ${certificate.issuerName}.`}
        style={{ alignItems: 'center', gap: theme.spacing.three, paddingBottom: theme.spacing.four }}
      >
        <StatusIcon valid />
        <Text variant="title" style={{ textAlign: 'center' }}>
          Valid certificate
        </Text>
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          {certificate.certificateTitle}
        </Text>
      </View>
      {rows.map((row) => (
        <View key={row.label}>
          <Divider />
          <Row label={row.label}>{row.value}</Row>
        </View>
      ))}
    </Card>
  );
}

export function InvalidCertificateCard({
  code,
  onTryAnother,
}: {
  code: string;
  onTryAnother: () => void;
}) {
  const theme = useTheme();
  return (
    <Card outlined padded={false} style={{ padding: theme.spacing.five, gap: theme.spacing.five }}>
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`Not verified. No certificate found for the code ${code}.`}
        style={{ alignItems: 'center', gap: theme.spacing.three }}
      >
        <StatusIcon valid={false} />
        <Text variant="title" tone="destructive" style={{ textAlign: 'center' }}>
          Not verified
        </Text>
        <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
          No certificate found for this code
        </Text>
        {code ? (
          <View
            style={{
              paddingHorizontal: theme.spacing.three,
              paddingVertical: theme.spacing.one,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.muted,
              maxWidth: '100%',
            }}
          >
            <Text selectable variant="caption" style={{ fontFamily: MONO_FONT }}>
              {code}
            </Text>
          </View>
        ) : null}
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          Check the code for typos, or ask the certificate holder for their verification link.
        </Text>
      </View>
      <Button label="Try another code" variant="secondary" size="lg" onPress={onTryAnother} />
    </Card>
  );
}

export function VerifyResultSkeleton() {
  const theme = useTheme();
  return (
    <Card outlined padded={false} style={{ padding: theme.spacing.five, gap: theme.spacing.four }}>
      <View
        style={{ alignItems: 'center', gap: theme.spacing.three }}
        accessibilityLabel="Verifying certificate"
      >
        <Skeleton width={64} height={64} radius={32} />
        <Skeleton width="55%" height={24} />
      </View>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton width="25%" />
          <Skeleton width="45%" />
        </View>
      ))}
    </Card>
  );
}
