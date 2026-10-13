/**
 * A bottom sheet with a short list of options (S19 sort menu, S21 category
 * picker, S20 post menu). Android's `Alert` caps out at three buttons, so
 * anything longer uses this.
 */
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

export interface SheetOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  destructive?: boolean;
}

export interface OptionSheetProps<T extends string> {
  visible: boolean;
  title: string;
  options: readonly SheetOption<T>[];
  selected?: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}

export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: OptionSheetProps<T>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Close"
        style={{ flex: 1, backgroundColor: theme.colors.scrim, justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={() => {
            /* keep the sheet open when tapping inside */
          }}
          accessible={false}
          style={{
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingHorizontal: theme.spacing.four,
            paddingTop: theme.spacing.three,
            paddingBottom: Math.max(insets.bottom, theme.spacing.four) + theme.spacing.two,
            gap: theme.spacing.one,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.colors.border,
              marginBottom: theme.spacing.two,
            }}
          />
          <Text variant="heading" accessibilityRole="header" style={{ marginBottom: theme.spacing.two }}>
            {title}
          </Text>
          {options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onSelect(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.three,
                  minHeight: 48,
                  paddingHorizontal: theme.spacing.three,
                  paddingVertical: theme.spacing.two,
                  borderRadius: theme.radius.lg,
                  backgroundColor: isSelected || pressed ? theme.colors.muted : 'transparent',
                })}
              >
                {opt.icon}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong" tone={opt.destructive ? 'destructive' : 'default'}>
                    {opt.label}
                  </Text>
                  {opt.description ? (
                    <Text variant="caption" tone="muted">
                      {opt.description}
                    </Text>
                  ) : null}
                </View>
                {isSelected ? <Check size={18} color={theme.colors.foreground} /> : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
