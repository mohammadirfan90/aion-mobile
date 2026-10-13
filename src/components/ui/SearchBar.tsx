import { TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';

import { useTheme } from '@/theme';

export interface UISearchBarProps {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  onSubmit,
}: UISearchBarProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        paddingHorizontal: theme.spacing.four,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.muted,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: theme.spacing.two,
      }}
    >
      <Search size={18} color={theme.colors.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.mutedForeground}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={{
          flex: 1,
          color: theme.colors.foreground,
          fontSize: theme.typography.body.fontSize,
          fontFamily: theme.fonts.regular,
          paddingVertical: 0,
        }}
      />
    </View>
  );
}
