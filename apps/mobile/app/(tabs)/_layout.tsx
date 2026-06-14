import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F0F23',
          borderTopColor: '#2D2D4E',
        },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#9B9BB4',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Feed', tabBarLabel: 'Ana Sayfa' }} />
      <Tabs.Screen name="explore" options={{ title: 'Keşfet', tabBarLabel: 'Keşfet' }} />
      <Tabs.Screen name="add-dream" options={{ title: 'Rüya Ekle', tabBarLabel: 'Ekle' }} />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Bildirimler', tabBarLabel: 'Bildirim' }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarLabel: 'Profil' }} />
    </Tabs>
  );
}
