/**
 * S25 — Profile (tab). Matches docs/design/S25-profile.png.
 *
 *   - Brand bar (logo, AI tutor button) and the "Profile" title.
 *   - Avatar (initials when there's none), name, @username, headline and an
 *     **Edit profile** button (→ S26).
 *   - Stats card from the learning summary: enrolled / completed / lessons
 *     finished.
 *   - Menu: My certificates (expands to the completed courses → S28),
 *     Support tickets (→ S22), Settings (→ S27), About Aion (alert).
 *   - Log out (confirmation; clears the session and the query cache).
 *
 * Data: `useMe()` (`GET /users/me`) and `useProfileLearningSummary()`
 * (`GET /users/me/learning-summary`), API §12.
 */
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Award, Bot, ChevronRight, Headset, Info, LogOut, Pencil, Settings } from 'lucide-react-native';

import logoLight from '@/assets/brand/logo.png';
import logoDark from '@/assets/brand/logo-dark.png';
import type { LearningSummaryData, Me } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { useTheme, type Theme } from '@/theme';

import { appVersion, platformName } from '../app-info';
import { MenuGroup, MenuRow } from '../components/MenuGroup';
import { useLogout, useMe, useProfileLearningSummary } from '../hooks';

const AVATAR_SIZE = 96;

export function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const meQ = useMe();
  const summaryQ = useProfileLearningSummary();
  const logout = useLogout();
  const [certsOpen, setCertsOpen] = useState(false);
  const info = appVersion();

  const me = meQ.data;
  const summary = summaryQ.data;
  const certificates = summary?.courses.filter((c) => c.isCompleted) ?? [];

  const onRefresh = () => {
    void meQ.refetch();
    void summaryQ.refetch();
  };

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You’ll need to sign in again to keep learning.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          logout
            .mutateAsync()
            .then(() => {
              // The root guard swaps to the (auth) group; land on Login (S02) rather than Welcome.
              setTimeout(() => router.replace('/(auth)/login' as Href), 0);
            })
            .catch((e: unknown) => showToast(friendlyError((e as { code?: string }).code), 'error'));
        },
      },
    ]);

  const showAbout = () =>
    Alert.alert(
      info.name,
      `Version ${info.label}\n\nThe student app for the Aion learning platform: courses, lessons, AI study tools and community.`,
    );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.two,
        paddingHorizontal: theme.spacing.four,
        paddingBottom: theme.spacing.eight,
        gap: theme.spacing.five,
      }}
      refreshControl={
        <RefreshControl
          refreshing={(meQ.isRefetching || summaryQ.isRefetching) && !!me}
          onRefresh={onRefresh}
          tintColor={theme.colors.foreground}
        />
      }
    >
      {/* Brand bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Image
          source={theme.mode === 'dark' ? logoDark : logoLight}
          style={{ width: 80, height: 24 }}
          contentFit="contain"
          accessibilityLabel="Aion"
        />
        <IconButton
          icon={<Bot size={22} color={theme.colors.foreground} />}
          label="Open AI tutor"
          onPress={() => router.push('/tutor' as Href)}
        />
      </View>

      <Text variant="display" accessibilityRole="header">
        Profile
      </Text>

      {meQ.isError && !me ? (
        <ErrorState
          title="Couldn’t load your profile"
          description={friendlyError((meQ.error as { code?: string } | null)?.code ?? 'NETWORK')}
          onRetry={onRefresh}
        />
      ) : !me ? (
        <ProfileSkeleton theme={theme} />
      ) : (
        <>
          <ProfileHeader me={me} theme={theme} />
          <StatsCard
            summary={summary}
            isError={summaryQ.isError && !summary}
            onRetry={() => void summaryQ.refetch()}
            theme={theme}
          />

          <MenuGroup>
            <MenuRow
              key="certs"
              icon={<Award size={20} color={theme.colors.foreground} />}
              title="My certificates"
              badge={summary ? String(certificates.length) : undefined}
              expanded={certsOpen}
              accessory="chevron"
              onPress={() => setCertsOpen((o) => !o)}
            />
            {certsOpen ? (
              <CertificateList
                key="cert-list"
                loading={!summary}
                courses={certificates}
                theme={theme}
              />
            ) : null}
            <MenuRow
              key="support"
              icon={<Headset size={20} color={theme.colors.foreground} />}
              title="Support tickets"
              onPress={() => router.push('/(app)/support' as Href)}
            />
            <MenuRow
              key="settings"
              icon={<Settings size={20} color={theme.colors.foreground} />}
              title="Settings"
              onPress={() => router.push('/(app)/settings' as Href)}
            />
            <MenuRow
              key="about"
              icon={<Info size={20} color={theme.colors.foreground} />}
              title="About Aion"
              onPress={showAbout}
            />
          </MenuGroup>

          <MenuGroup>
            <MenuRow
              icon={<LogOut size={20} color={theme.colors.destructive} />}
              title={logout.isPending ? 'Logging out…' : 'Log out'}
              tone="destructive"
              accessory="none"
              onPress={logout.isPending ? undefined : confirmLogout}
            />
          </MenuGroup>

          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            Aion for {platformName()} · v{info.label}
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function ProfileHeader({ me, theme }: { me: Me; theme: Theme }) {
  const displayName = me.name?.trim() || me.username || me.email;
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.one }}>
      <Avatar uri={me.avatarUrl} name={displayName} size={AVATAR_SIZE} />
      <Text variant="title" style={{ marginTop: theme.spacing.three, textAlign: 'center' }}>
        {displayName}
      </Text>
      {me.username ? <Text tone="muted">@{me.username}</Text> : null}
      {me.headline ? (
        <Text style={{ textAlign: 'center' }} numberOfLines={2}>
          {me.headline}
        </Text>
      ) : null}
      <View style={{ marginTop: theme.spacing.three }}>
        <Button
          label="Edit profile"
          variant="secondary"
          fullWidth={false}
          iconLeft={<Pencil size={16} color={theme.colors.foreground} />}
          onPress={() => router.push('/(app)/profile/edit' as Href)}
        />
      </View>
    </View>
  );
}

function StatsCard({
  summary,
  isError,
  onRetry,
  theme,
}: {
  summary: LearningSummaryData | undefined;
  isError: boolean;
  onRetry: () => void;
  theme: Theme;
}) {
  if (isError) {
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}>
        <Text tone="muted" style={{ flex: 1 }}>
          Couldn’t load your learning stats.
        </Text>
        <Button label="Retry" size="sm" variant="secondary" fullWidth={false} onPress={onRetry} />
      </Card>
    );
  }
  const stats = [
    { label: 'Enrolled', value: summary?.totalEnrolled },
    { label: 'Completed', value: summary?.totalCompleted },
    { label: 'Lessons finished', value: summary?.totalLessonsFinished },
  ];
  return (
    <Card style={{ flexDirection: 'row', paddingHorizontal: theme.spacing.two }}>
      {stats.map((s, i) => (
        <View key={s.label} style={{ flex: 1, flexDirection: 'row' }}>
          {i > 0 ? <Divider vertical /> : null}
          <View
            style={{ flex: 1, alignItems: 'center', gap: 2 }}
            accessible
            accessibilityLabel={s.value === undefined ? `${s.label}: loading` : `${s.value} ${s.label}`}
          >
            {s.value === undefined ? (
              <Skeleton width={32} height={28} />
            ) : (
              <Text variant="display">{s.value}</Text>
            )}
            <Text variant="caption" tone="muted" numberOfLines={1} adjustsFontSizeToFit>
              {s.label}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

function CertificateList({
  loading,
  courses,
  theme,
}: {
  loading: boolean;
  courses: LearningSummaryData['courses'];
  theme: Theme;
}) {
  const inset = { paddingLeft: theme.spacing.four + 40 + theme.spacing.three, paddingRight: theme.spacing.four };
  if (loading) {
    return (
      <View style={[inset, { paddingVertical: theme.spacing.three, gap: theme.spacing.two }]}>
        <Skeleton width="80%" />
        <Skeleton width="60%" />
      </View>
    );
  }
  if (!courses.length) {
    return (
      <View style={[inset, { paddingVertical: theme.spacing.three }]}>
        <Text variant="caption" tone="muted">
          Finish a course to earn your first certificate.
        </Text>
      </View>
    );
  }
  return (
    <View style={{ paddingVertical: theme.spacing.one }}>
      {courses.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => router.push(`/(app)/course/${c.id}/certificate` as Href)}
          accessibilityRole="button"
          accessibilityLabel={`Certificate for ${c.title}`}
          style={({ pressed }) => [
            inset,
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.two,
              minHeight: 44,
              backgroundColor: pressed ? theme.colors.muted : 'transparent',
            },
          ]}
        >
          <Text style={{ flex: 1 }} numberOfLines={1}>
            {c.title}
          </Text>
          <ChevronRight size={16} color={theme.colors.mutedForeground} />
        </Pressable>
      ))}
    </View>
  );
}

function ProfileSkeleton({ theme }: { theme: Theme }) {
  return (
    <View style={{ gap: theme.spacing.five }}>
      <View style={{ alignItems: 'center', gap: theme.spacing.two }}>
        <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} radius={AVATAR_SIZE / 2} />
        <Skeleton width="50%" height={24} />
        <Skeleton width="30%" />
        <Skeleton width="40%" />
        <Skeleton width={140} height={44} radius={theme.radius.full} />
      </View>
      <Skeleton height={88} radius={theme.radius.lg} />
      <Skeleton height={256} radius={theme.radius.lg} />
    </View>
  );
}
