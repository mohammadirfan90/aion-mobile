/**
 * S22 — Support tickets. Matches `docs/design/S22-support-tickets.png`.
 *
 * - Header: back, a search toggle (the API's `search`), the "Support" title
 *   and a one-line intro.
 * - Status filter chips (All / Open / In progress / Resolved / Closed).
 * - Ticket cards: `#ticketNumber`, status badge, subject, linked course, then
 *   the priority pill and the last update ("Staff replied" when staff spoke
 *   last).
 * - A pinned **New ticket** button (→ S24). Pull to refresh; more pages load
 *   at the end of the list.
 *
 * Skipped from the design: the "? help" icon and the "N active" counter (no
 * endpoint returns per-status counts), and "Resolved by {name}" (the API
 * doesn't say who resolved a ticket).
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  CircleCheck,
  ChevronLeft,
  Clock,
  LifeBuoy,
  Lock,
  Plus,
  Reply,
  Search,
  X,
} from 'lucide-react-native';

import type { SupportTicketWithRelations } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { SearchBar } from '@/components/ui/SearchBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { formatDayTime } from '@/lib/format';
import { useTheme, type Theme } from '@/theme';

import { PriorityPill, STATUS_LABEL, StatusBadge } from '../components/TicketBadges';
import { useSupportTickets, type TicketFilter } from '../hooks';

const FILTERS: readonly { value: TicketFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: STATUS_LABEL.open },
  { value: 'in_progress', label: STATUS_LABEL.in_progress },
  { value: 'resolved', label: STATUS_LABEL.resolved },
  { value: 'closed', label: STATUS_LABEL.closed },
];

const openNew = () => router.push('/(app)/support/new' as Href);

export function SupportTicketsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<TicketFilter>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const q = useSupportTickets(filter, query);

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const tickets = q.data?.pages.flatMap((p) => p.tickets) ?? [];
  const filtered = filter !== 'all' || query.length > 0;

  const toggleSearch = () => {
    if (searchOpen) setSearch('');
    setSearchOpen((s) => !s);
  };

  const header = (
    <View style={{ gap: theme.spacing.four, paddingBottom: theme.spacing.four }}>
      <View style={{ gap: theme.spacing.one }}>
        <Text variant="display">Support</Text>
        <Text tone="muted">Get help with the app, your courses and your account.</Text>
      </View>
      {searchOpen ? (
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search tickets" />
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.two, paddingHorizontal: theme.spacing.four }}
        style={{ marginHorizontal: -theme.spacing.four, flexGrow: 0 }}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </ScrollView>
    </View>
  );

  let body: React.ReactNode;
  if (q.isError && !q.data) {
    body = (
      <ErrorState
        title="Couldn’t load your tickets"
        description="Check your connection and try again."
        onRetry={() => void q.refetch()}
      />
    );
  } else if (q.isLoading) {
    body = (
      <View style={{ gap: theme.spacing.three }}>
        {[0, 1, 2].map((i) => (
          <TicketSkeleton key={i} theme={theme} />
        ))}
      </View>
    );
  } else if (tickets.length === 0) {
    body = filtered ? (
      <EmptyState
        icon={<LifeBuoy size={32} color={theme.colors.mutedForeground} />}
        title="No matching tickets"
        description={query ? 'Try another search or filter.' : 'Try another filter.'}
      />
    ) : (
      <EmptyState
        icon={<LifeBuoy size={32} color={theme.colors.mutedForeground} />}
        title="No tickets"
        description="Need help? Create one and we’ll reply here."
        actionLabel="Create a ticket"
        onAction={openNew}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: insets.top + theme.spacing.two,
          paddingHorizontal: theme.spacing.four,
          paddingBottom: theme.spacing.two,
        }}
      >
        <IconButton
          icon={<ChevronLeft size={22} color={theme.colors.foreground} />}
          label="Back"
          variant="muted"
          onPress={() => router.back()}
        />
        <IconButton
          icon={
            searchOpen ? (
              <X size={20} color={theme.colors.foreground} />
            ) : (
              <Search size={20} color={theme.colors.foreground} />
            )
          }
          label={searchOpen ? 'Close search' : 'Search tickets'}
          variant="muted"
          onPress={toggleSearch}
        />
      </View>

      <FlatList
        data={body ? [] : tickets}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={header}
        ListEmptyComponent={body ? <View>{body}</View> : null}
        renderItem={({ item }) => <TicketCard ticket={item} theme={theme} />}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.three }} />}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.four,
          paddingBottom: theme.spacing.six,
        }}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
        }}
        ListFooterComponent={
          q.isFetchingNextPage ? (
            <ActivityIndicator style={{ marginTop: theme.spacing.four }} color={theme.colors.mutedForeground} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching && !q.isFetchingNextPage}
            onRefresh={() => void q.refetch()}
            tintColor={theme.colors.mutedForeground}
            colors={[theme.colors.foreground]}
          />
        }
      />

      <View
        style={{
          paddingHorizontal: theme.spacing.four,
          paddingTop: theme.spacing.three,
          paddingBottom: Math.max(insets.bottom, theme.spacing.three),
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        <Button
          label="New ticket"
          size="lg"
          iconLeft={<Plus size={20} color={theme.colors.primaryForeground} />}
          onPress={openNew}
        />
      </View>
    </View>
  );
}

function lastUpdate(t: SupportTicketWithRelations): { icon: 'reply' | 'clock' | 'check' | 'lock'; text: string } {
  const when = formatDayTime(t.lastReplyAt ?? t.updatedAt);
  if (t.status === 'closed') return { icon: 'lock', text: `Closed · ${formatDayTime(t.updatedAt)}` };
  if (t.status === 'resolved') return { icon: 'check', text: `Resolved · ${formatDayTime(t.updatedAt)}` };
  if (t.lastReplySenderRole === 'instructor') return { icon: 'reply', text: `Staff replied · ${when}` };
  return { icon: 'clock', text: `Waiting on staff · ${when}` };
}

function TicketCard({ ticket, theme }: { ticket: SupportTicketWithRelations; theme: Theme }) {
  const update = lastUpdate(ticket);
  const iconColor =
    update.icon === 'check' ? theme.colors.success : theme.colors.mutedForeground;
  const Icon =
    update.icon === 'reply' ? Reply : update.icon === 'check' ? CircleCheck : update.icon === 'lock' ? Lock : Clock;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ticket ${ticket.ticketNumber}: ${ticket.subject}, ${STATUS_LABEL[ticket.status]}`}
      onPress={() => router.push(`/(app)/support/${ticket.id}` as Href)}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <Card style={{ gap: theme.spacing.two, borderRadius: theme.radius.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="label" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
            #{ticket.ticketNumber}
          </Text>
          <StatusBadge status={ticket.status} />
        </View>
        <Text variant="bodyStrong" numberOfLines={2}>
          {ticket.subject}
        </Text>
        {ticket.course ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
            <BookOpen size={14} color={theme.colors.mutedForeground} />
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
              {ticket.course.title}
            </Text>
          </View>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.three,
            marginTop: theme.spacing.one,
            paddingTop: theme.spacing.three,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <PriorityPill priority={ticket.priority} />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.one,
              flexShrink: 1,
            }}
          >
            <Icon size={14} color={iconColor} />
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
              {update.text}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function TicketSkeleton({ theme }: { theme: Theme }) {
  return (
    <Card style={{ gap: theme.spacing.three, borderRadius: theme.radius.xl }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton width={48} height={14} />
        <Skeleton width={72} height={18} radius={theme.radius.full} />
      </View>
      <Skeleton width="85%" height={18} />
      <Skeleton width="55%" height={14} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton width={56} height={18} radius={theme.radius.full} />
        <Skeleton width={120} height={14} />
      </View>
    </Card>
  );
}
