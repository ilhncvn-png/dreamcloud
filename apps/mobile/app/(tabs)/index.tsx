import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { Colors } from '@/constants/colors';

export default function FeedScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🌙 DreamCloud</Text>
        <Pressable
          style={styles.logoutButton}
          onPress={() => {
            void logout();
          }}
        >
          <Text style={styles.logoutText}>Çıkış</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.welcome}>Hoş geldin! 👋</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>Rol: {user?.role}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Feed</Text>
          <Text style={styles.cardSubtitle}>Rüyalar Sprint 4'te aktive edilecek</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  logoutButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  welcome: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  email: { fontSize: 15, color: Colors.textSecondary },
  role: { fontSize: 13, color: Colors.textMuted },

  card: {
    marginTop: 32,
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  cardSubtitle: { fontSize: 13, color: Colors.textMuted },
});
