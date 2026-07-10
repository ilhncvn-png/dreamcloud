import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '@/api/notifications.api';
import { useAuthStore } from '@/store/auth.store';
import { Colors } from '@/constants/colors';
import {
  HomeIcon,
  ExploreIcon,
  CreateIcon,
  MatchIcon,
  MyWorldIcon,
} from '@/design/icons';

export default function TabsLayout() {
  const { isAuthenticated } = useAuthStore();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
      }}
    >
      {/* ── Visible tabs ───────────────────────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ color, focused }) => <HomeIcon size={24} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Keşfet',
          tabBarLabel: 'Keşfet',
          tabBarIcon: ({ color, focused }) => <ExploreIcon size={24} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="add-dream"
        options={{
          title: 'Rüya Ekle',
          tabBarLabel: 'Ekle',
          tabBarIcon: ({ color, focused }) => <CreateIcon size={24} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Eşleşmeler',
          tabBarLabel: 'Eşleşme',
          tabBarIcon: ({ color, focused }) => <MatchIcon size={24} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="my-world"
        options={{
          title: 'Benim Dünyam',
          tabBarLabel: 'Dünyam',
          tabBarIcon: ({ color, focused }) => <MyWorldIcon size={24} color={color} focused={focused} />,
          ...(unreadCount > 0 && {
            tabBarBadge: unreadCount > 99 ? '99+' : unreadCount,
            tabBarBadgeStyle: styles.tabBadge,
          }),
        }}
      />

      {/* ── Hidden routes — accessible via push, not shown in tab bar ─────── */}
      <Tabs.Screen name="signals"       options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile"       options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBadge: {
    backgroundColor: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
});
