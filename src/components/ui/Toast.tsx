import { create } from 'zustand';

import { useTheme } from '@/theme';

import { Text } from './Text';
import { View } from 'react-native';
import { useEffect } from 'react';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: string;
  text: string;
  tone: ToastTone;
  durationMs?: number;
}

interface ToastState {
  current: ToastMessage | null;
  show: (msg: Omit<ToastMessage, 'id'>) => void;
  dismiss: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (msg) =>
    set({
      current: { id: Math.random().toString(36).slice(2), ...msg },
    }),
  dismiss: () => set({ current: null }),
}));

export function showToast(text: string, tone: ToastTone = 'info', durationMs = 2500) {
  useToastStore.getState().show({ text, tone, durationMs });
}

export function ToastHost() {
  const theme = useTheme();
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(dismiss, current.durationMs ?? 2500);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  if (!current) return null;

  const palette = (() => {
    switch (current.tone) {
      case 'success':
        return { bg: theme.colors.success, fg: '#FFFFFF' };
      case 'error':
        return { bg: theme.colors.destructive, fg: '#FFFFFF' };
      default:
        return { bg: theme.colors.foreground, fg: theme.colors.background };
    }
  })();

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 24,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          paddingHorizontal: theme.spacing.four,
          paddingVertical: theme.spacing.three,
          borderRadius: theme.radius.full,
          backgroundColor: palette.bg,
          maxWidth: '100%',
        }}
      >
        <Text style={{ color: palette.fg }} variant="bodyStrong">
          {current.text}
        </Text>
      </View>
    </View>
  );
}
