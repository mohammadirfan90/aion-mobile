/**
 * S23 — Ticket thread. Matches `docs/design/S23-ticket-thread.png`.
 *
 * - Header: back, `#ticketNumber`, and a menu with **Mark as resolved** while
 *   the ticket is open or in progress (students may only resolve or close).
 * - A summary card (subject, status, priority, linked course · lesson) at the
 *   top of the thread, so it scrolls away on small screens.
 * - Messages oldest first with day separators: yours on the right, staff on
 *   the left with their avatar and name.
 * - A reply composer above the keyboard; a "This ticket is closed" bar
 *   instead when the status is `closed`. Replies show at once and the list
 *   scrolls to them.
 *
 * Skipped from the design: the attachment button (tickets have no
 * attachments in the API) and read receipts (not in the API).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, BookOpen, ChevronLeft, EllipsisVertical, Lock } from 'lucide-react-native';

import type { SupportTicketMessage, SupportTicketWithRelations } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { formatDate, formatTime, parseDate } from '@/lib/format';
import { useTheme, type Theme } from '@/theme';

import { PriorityPill, StatusBadge } from '../components/TicketBadges';
import { useSendTicketMessage, useTicketThread, useUpdateTicketStatus } from '../hooks';

const MESSAGE_MAX = 5000;

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: SupportTicketMessage };

function dayKey(value: string): string {
  const d = parseDate(value);
  return d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : '';
}

export function TicketThreadScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' && params.id ? params.id : null;

  const q = useTicketThread(id);
  const send = useSendTicketMessage(id ?? 'pending');
  const status = useUpdateTicketStatus(id ?? 'pending');
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<Row>>(null);
  const pendingScroll = useRef(true);

  const ticket = q.data?.ticket;
  const messages = q.data?.messages;
  const closed = ticket?.status === 'closed';
  const canResolve = ticket?.status === 'open' || ticket?.status === 'in_progress';

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [];
    let lastDay = '';
    for (const m of messages ?? []) {
      const day = dayKey(m.createdAt);
      if (day !== lastDay) {
        list.push({ kind: 'day', key: `day-${day}`, label: formatDate(m.createdAt) });
        lastDay = day;
      }
      list.push({ kind: 'message', key: m.id, message: m });
    }
    return list;
  }, [messages]);

  // Jump to the newest message on load and whenever one is added.
  useEffect(() => {
    if (!rows.length) return;
    pendingScroll.current = true;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [rows.length]);

  const onSend = () => {
    const text = draft.trim();
    if (!text || !id || send.isPending) return;
    setDraft('');
    send.mutate(text, {
      onError: (e) => {
        setDraft((d) => d || text);
        showToast(friendlyError((e as { code?: string }).code), 'error');
      },
    });
  };

  const onMenu = () =>
    Alert.alert(`Ticket #${ticket?.ticketNumber ?? ''}`, undefined, [
      {
        text: 'Mark as resolved',
        onPress: () =>
          status.mutate('resolved', {
            onSuccess: () => showToast('Marked as resolved', 'success'),
            onError: (e) => showToast(friendlyError((e as { code?: string }).code), 'error'),
          }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const notFound = ['TICKET_NOT_FOUND', 'FORBIDDEN', 'NOT_FOUND'].includes(
    (q.error as { code?: string } | null)?.code ?? '',
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior="padding"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.three,
          paddingTop: insets.top + theme.spacing.two,
          paddingHorizontal: theme.spacing.four,
          paddingBottom: theme.spacing.three,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <IconButton
          icon={<ChevronLeft size={22} color={theme.colors.foreground} />}
          label="Back"
          variant="muted"
          onPress={() => router.back()}
        />
        <Text variant="heading" style={{ flex: 1 }} numberOfLines={1}>
          {ticket ? `#${ticket.ticketNumber}` : ''}
        </Text>
        {canResolve ? (
          status.isPending ? (
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={theme.colors.mutedForeground} />
            </View>
          ) : (
            <IconButton
              icon={<EllipsisVertical size={20} color={theme.colors.foreground} />}
              label="Ticket options"
              variant="muted"
              onPress={onMenu}
            />
          )
        ) : null}
      </View>

      {q.isError && !q.data ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {notFound ? (
            <ErrorState
              title="Ticket not found"
              description="It may have been removed, or it isn’t yours."
              retryLabel="Back to tickets"
              onRetry={() => router.back()}
            />
          ) : (
            <ErrorState
              title="Couldn’t load this ticket"
              description="Check your connection and try again."
              onRetry={() => void q.refetch()}
            />
          )}
        </View>
      ) : q.isLoading || !ticket ? (
        <ThreadSkeleton theme={theme} />
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r) => r.key}
          ListHeaderComponent={<TicketSummary ticket={ticket} theme={theme} />}
          contentContainerStyle={{ padding: theme.spacing.four, gap: theme.spacing.four }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => {
            if (!pendingScroll.current) return;
            pendingScroll.current = false;
            listRef.current?.scrollToEnd({ animated: false });
          }}
          refreshControl={
            <RefreshControl
              refreshing={q.isRefetching}
              onRefresh={() => void q.refetch()}
              tintColor={theme.colors.mutedForeground}
              colors={[theme.colors.foreground]}
            />
          }
          renderItem={({ item }) =>
            item.kind === 'day' ? (
              <DaySeparator label={item.label} theme={theme} />
            ) : (
              <MessageRow message={item.message} theme={theme} />
            )
          }
        />
      )}

      {ticket && closed ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.two,
            paddingHorizontal: theme.spacing.four,
            paddingTop: theme.spacing.four,
            paddingBottom: Math.max(insets.bottom, theme.spacing.four),
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          }}
        >
          <Lock size={16} color={theme.colors.mutedForeground} />
          <Text tone="muted">This ticket is closed</Text>
        </View>
      ) : ticket ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: theme.spacing.two,
            marginHorizontal: theme.spacing.four,
            marginTop: theme.spacing.two,
            marginBottom: Math.max(insets.bottom, theme.spacing.three),
            paddingLeft: theme.spacing.four,
            paddingRight: theme.spacing.one,
            paddingVertical: theme.spacing.one,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message…"
            placeholderTextColor={theme.colors.mutedForeground}
            multiline
            maxLength={MESSAGE_MAX}
            accessibilityLabel="Message"
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 140,
              paddingVertical: theme.spacing.three,
              color: theme.colors.foreground,
              fontFamily: theme.fonts.regular,
              fontSize: theme.typography.body.fontSize,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !draft.trim() || send.isPending }}
            disabled={!draft.trim() || send.isPending}
            onPress={onSend}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: draft.trim() ? theme.colors.primary : theme.colors.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            {send.isPending ? (
              <ActivityIndicator color={theme.colors.primaryForeground} />
            ) : (
              <ArrowUp
                size={20}
                color={draft.trim() ? theme.colors.primaryForeground : theme.colors.mutedForeground}
              />
            )}
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function TicketSummary({ ticket, theme }: { ticket: SupportTicketWithRelations; theme: Theme }) {
  const linked = [ticket.course?.title, ticket.lesson?.title].filter(Boolean).join(' · ');
  return (
    <Card style={{ gap: theme.spacing.three, borderRadius: theme.radius.xl }}>
      <Text variant="title">{ticket.subject}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.two }}>
        <StatusBadge status={ticket.status} />
        <PriorityPill priority={ticket.priority} prefix />
      </View>
      {linked ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.two }}>
          <BookOpen size={14} color={theme.colors.mutedForeground} />
          <Text variant="caption" tone="muted" style={{ flex: 1 }} numberOfLines={2}>
            {linked}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function DaySeparator({ label, theme }: { label: string; theme: Theme }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          paddingHorizontal: theme.spacing.three,
          paddingVertical: theme.spacing.one,
          borderRadius: theme.radius.full,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.muted,
        }}
      >
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      </View>
    </View>
  );
}

function MessageRow({ message, theme }: { message: SupportTicketMessage; theme: Theme }) {
  const sending = message.id.startsWith('temp-');
  if (message.senderRole === 'student') {
    return (
      <View style={{ alignItems: 'flex-end', gap: theme.spacing.one }}>
        <View
          style={{
            maxWidth: '85%',
            paddingHorizontal: theme.spacing.four,
            paddingVertical: theme.spacing.three,
            borderRadius: 20,
            borderBottomRightRadius: theme.radius.sm,
            backgroundColor: theme.colors.primary,
            opacity: sending ? 0.7 : 1,
          }}
        >
          <Text selectable style={{ color: theme.colors.primaryForeground }}>
            {message.message}
          </Text>
        </View>
        <Text variant="tiny" tone="muted">
          {sending ? 'Sending…' : formatTime(message.createdAt)}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.three }}>
      <Avatar uri={message.sender.avatarUrl} name={message.sender.name} size={36} />
      <View style={{ flex: 1, alignItems: 'flex-start', gap: theme.spacing.one }}>
        <Text variant="caption" tone="muted">
          {message.sender.name} (Instructor)
        </Text>
        <View
          style={{
            maxWidth: '100%',
            paddingHorizontal: theme.spacing.four,
            paddingVertical: theme.spacing.three,
            borderRadius: 20,
            borderTopLeftRadius: theme.radius.sm,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          }}
        >
          <Text selectable>{message.message}</Text>
        </View>
        <Text variant="tiny" tone="muted">
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

function ThreadSkeleton({ theme }: { theme: Theme }) {
  return (
    <View style={{ flex: 1, padding: theme.spacing.four, gap: theme.spacing.five }}>
      <Card style={{ gap: theme.spacing.three, borderRadius: theme.radius.xl }}>
        <Skeleton width="80%" height={22} />
        <View style={{ flexDirection: 'row', gap: theme.spacing.two }}>
          <Skeleton width={80} height={18} radius={theme.radius.full} />
          <Skeleton width={96} height={18} radius={theme.radius.full} />
        </View>
        <Skeleton width="60%" height={14} />
      </Card>
      <View style={{ alignItems: 'flex-end' }}>
        <Skeleton width="70%" height={64} radius={18} />
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.three }}>
        <Skeleton width={36} height={36} radius={theme.radius.full} />
        <Skeleton width="65%" height={80} radius={18} />
      </View>
    </View>
  );
}
