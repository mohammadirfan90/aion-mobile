/**
 * S28's native certificate: certificate title, course, student, issue date,
 * issuer, ID and a QR that encodes just the `certificateId` (S29 accepts it).
 * Only API §14 fields are shown — no signature or ledger line (DESIGN.md).
 * The card is one accessibility element that reads out every field.
 */
import { View } from 'react-native';
import { Award } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import { MONO_FONT } from '@/components/Markdown';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import type { StudentCertificate } from '@/api/types';
import { useTheme } from '@/theme';

const QR_SIZE = 84;

export function CertificateCard({ certificate }: { certificate: StudentCertificate }) {
  const theme = useTheme();

  return (
    <Card
      outlined
      padded={false}
      style={{ padding: theme.spacing.four }}
      accessible
      accessibilityLabel={`${certificate.certificateTitle}. ${certificate.courseTitle}. Awarded to ${certificate.studentName} on ${certificate.issueDate} by ${certificate.issuerName}. Certificate ID ${certificate.certificateId}.`}
    >
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          overflow: 'hidden',
        }}
      >
        {/* Title block */}
        <View
          style={{
            alignItems: 'center',
            paddingTop: theme.spacing.five,
            paddingHorizontal: theme.spacing.four,
            paddingBottom: theme.spacing.five,
            gap: theme.spacing.two,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.muted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.one,
            }}
          >
            <Award size={22} color={theme.colors.foreground} />
          </View>
          <Text
            variant="tiny"
            tone="muted"
            style={{ textTransform: 'uppercase', letterSpacing: 2.5, textAlign: 'center' }}
          >
            {certificate.certificateTitle}
          </Text>
          <Text variant="title" weight="bold" style={{ textAlign: 'center' }}>
            {certificate.courseTitle}
          </Text>
          <Text variant="caption" tone="muted" style={{ marginTop: theme.spacing.three }}>
            Awarded to
          </Text>
          <Text
            variant="display"
            style={{ textAlign: 'center', fontStyle: 'italic' }}
            adjustsFontSizeToFit
            numberOfLines={2}
          >
            {certificate.studentName}
          </Text>
          <View
            style={{
              width: 48,
              height: 1,
              backgroundColor: theme.colors.border,
              marginTop: theme.spacing.two,
            }}
          />
        </View>

        {/* Issued / issuer */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: theme.spacing.three,
            paddingVertical: theme.spacing.three,
            paddingHorizontal: theme.spacing.three,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <View style={{ flexShrink: 1, gap: theme.spacing.half }}>
            <Text variant="tiny" tone="muted" style={{ letterSpacing: 1 }}>
              ISSUED
            </Text>
            <Text variant="body">{certificate.issueDate}</Text>
          </View>
          <View style={{ flexShrink: 1, alignItems: 'flex-end', gap: theme.spacing.half }}>
            <Text variant="tiny" tone="muted" style={{ letterSpacing: 1 }}>
              ISSUER
            </Text>
            <Text variant="body" style={{ textAlign: 'right' }}>
              {certificate.issuerName}
            </Text>
          </View>
        </View>

        {/* ID + QR */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: theme.spacing.three,
            padding: theme.spacing.three,
          }}
        >
          <View style={{ flex: 1, gap: theme.spacing.one }}>
            <Text variant="tiny" tone="muted" style={{ letterSpacing: 1 }}>
              CERTIFICATE ID
            </Text>
            <Text
              selectable
              variant="caption"
              style={{ fontFamily: MONO_FONT }}
            >
              {certificate.certificateId}
            </Text>
          </View>
          <View
            style={{
              padding: theme.spacing.one,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              // A QR needs dark modules on a light ground to scan reliably,
              // so dark mode swaps the foreground/background tokens.
              backgroundColor: theme.mode === 'dark' ? theme.colors.foreground : theme.colors.card,
            }}
          >
            <QRCode
              value={certificate.certificateId}
              size={QR_SIZE}
              color={theme.mode === 'dark' ? theme.colors.background : theme.colors.foreground}
              backgroundColor={
                theme.mode === 'dark' ? theme.colors.foreground : theme.colors.card
              }
              ecl="M"
            />
          </View>
        </View>
      </View>
    </Card>
  );
}
