/**
 * S27 — Settings. Matches docs/design/S27-settings.png.
 *
 *   - Appearance: System / Light / Dark. Applies instantly and is persisted
 *     (the `useSettings` store in `@/theme`).
 *   - Security: Change password (dialog → `POST /auth/password`, API §2) and
 *     Biometric lock (disabled "Coming soon"; P3-04 adds it).
 *   - About: Terms and Privacy on the web, open-source licenses, app version.
 *   - Developer (`__DEV__` only): mock mode indicator and the fixture role
 *     switch (student/admin).
 */
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Code,
  FileText,
  Fingerprint,
  IdCard,
  Info,
  KeyRound,
  Shield,
  SlidersHorizontal,
} from 'lucide-react-native';

import type { Me } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import { env } from '@/lib/env';
import { friendlyError } from '@/lib/errors';
import { useSettings, useTheme, type ThemeOverride } from '@/theme';

import { appVersion } from '../app-info';
import { ChangePasswordDialog } from '../components/ChangePasswordDialog';
import { MenuGroup, MenuRow, SectionLabel, ThemedSwitch } from '../components/MenuGroup';
import { StackHeader } from '../components/StackHeader';
import { useMe, useSwitchFixtureRole } from '../hooks';

const THEME_OPTIONS: readonly { value: ThemeOverride; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const ROLE_OPTIONS: readonly { value: Me['role']; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'admin', label: 'Admin' },
];

const LICENSES =
  'Aion is built on open-source software, including Expo, React Native, React, Expo Router, ' +
  'TanStack Query, Zustand, Zod, React Hook Form, Reanimated, Lucide icons and the Geist font.\n\n' +
  'Each is used under its own license (mostly MIT, Apache 2.0 or the SIL Open Font License). ' +
  'The full texts ship with each package.';

export function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const themeOverride = useSettings((s) => s.themeOverride);
  const setThemeOverride = useSettings((s) => s.setThemeOverride);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const info = appVersion();

  const openWeb = (path: string) => {
    WebBrowser.openBrowserAsync(`${env.webUrl.replace(/\/$/, '')}${path}`).catch(() =>
      showToast('Couldn’t open the page. Try again later.', 'error'),
    );
  };

  const icon = (Icon: typeof Info) => <Icon size={20} color={theme.colors.foreground} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StackHeader
        title="Settings"
        left={
          <IconButton
            icon={<ChevronLeft size={22} color={theme.colors.foreground} />}
            label="Back"
            variant="muted"
            onPress={() => router.back()}
          />
        }
      />
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.four,
          paddingBottom: insets.bottom + theme.spacing.eight,
          gap: theme.spacing.six,
        }}
      >
        <View>
          <SectionLabel>Appearance</SectionLabel>
          <Card style={{ padding: theme.spacing.two }}>
            <SegmentedControl options={THEME_OPTIONS} value={themeOverride} onChange={setThemeOverride} />
          </Card>
        </View>

        <View>
          <SectionLabel>Security</SectionLabel>
          <MenuGroup>
            <MenuRow icon={icon(KeyRound)} title="Change password" onPress={() => setPasswordOpen(true)} />
            <MenuRow
              icon={icon(Fingerprint)}
              title="Biometric lock"
              subtitle="Coming soon"
              trailing={<ThemedSwitch value={false} disabled accessibilityLabel="Biometric lock, coming soon" />}
            />
          </MenuGroup>
        </View>

        <View>
          <SectionLabel>About</SectionLabel>
          <MenuGroup>
            <MenuRow
              icon={icon(FileText)}
              title="Terms of service"
              accessory="external"
              accessibilityHint="Opens in the browser"
              onPress={() => openWeb('/terms')}
            />
            <MenuRow
              icon={icon(Shield)}
              title="Privacy policy"
              accessory="external"
              accessibilityHint="Opens in the browser"
              onPress={() => openWeb('/privacy')}
            />
            <MenuRow
              icon={icon(Code)}
              title="Open-source licenses"
              onPress={() => Alert.alert('Open-source licenses', LICENSES)}
            />
            <MenuRow icon={icon(Info)} title="Version" value={info.label} />
          </MenuGroup>
        </View>

        {__DEV__ ? <DeveloperSection /> : null}

        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          {info.name} · v{info.label}
        </Text>
      </ScrollView>

      <ChangePasswordDialog visible={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </View>
  );
}

function DeveloperSection() {
  const theme = useTheme();
  const meQ = useMe();
  const switchRole = useSwitchFixtureRole();
  const role = switchRole.isPending && switchRole.variables ? switchRole.variables : meQ.data?.role;

  const onRole = (next: Me['role']) => {
    if (next === meQ.data?.role) return;
    switchRole.mutate(next, {
      onSuccess: (me) => showToast(`Now signed in as ${me.role}`, 'success'),
      onError: (e) => showToast(friendlyError((e as { code?: string }).code), 'error'),
    });
  };

  return (
    <View>
      <SectionLabel right={<Badge label="INTERNAL" />}>Developer</SectionLabel>
      <MenuGroup>
        <MenuRow
          icon={<SlidersHorizontal size={20} color={theme.colors.foreground} />}
          title="Mock data"
          trailing={<Badge label={env.useMocks ? 'ON' : 'OFF'} tone={env.useMocks ? 'primary' : 'neutral'} />}
        />
        <View style={{ padding: theme.spacing.four, gap: theme.spacing.three }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IdCard size={20} color={theme.colors.foreground} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text>Signed in as</Text>
              <Text variant="caption" tone="muted">
                {env.useMocks ? 'Switches the fixture account’s role.' : 'Only available with mock data.'}
              </Text>
            </View>
          </View>
          {!env.useMocks ? null : role ? (
            <SegmentedControl options={ROLE_OPTIONS} value={role} onChange={onRole} />
          ) : (
            <Skeleton height={40} radius={theme.radius.full} />
          )}
        </View>
      </MenuGroup>
    </View>
  );
}
