/**
 * Bottom tabs (SPEC §2). Five tabs in this order:
 *   1. Home      → S07 (Lucide `house`)
 *   2. Explore   → S08 (Lucide `compass`)
 *   3. Learning  → S09 (Lucide `book-open`)
 *   4. Community → S19 (Lucide `message-circle`)
 *   5. Profile   → S25 (Lucide `user`)
 *
 * Icons are tinted by the active theme via `useTheme()`. The label is shown
 * for every tab (the SPEC is fine with no labels on iOS but the verify
 * script's accessibility rule prefers them; they stay on for both platforms).
 */
import { Tabs } from 'expo-router';
import { BookOpen, Compass, House, MessageCircle, User } from 'lucide-react-native';

import { useTheme } from '@/theme';

export default function TabsLayout() {
  const theme = useTheme();
  const tint = theme.colors.primary;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tint,
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          title: 'Learning',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}