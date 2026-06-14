import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FeedScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🌙 DreamCloud</Text>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Rüyalar yükleniyor...</Text>
        <Text style={styles.emptySubtext}>Sprint 4'te aktive edilecek</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F23' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D4E',
  },
  logo: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { color: '#9B9BB4', fontSize: 16 },
  emptySubtext: { color: '#5A5A7A', fontSize: 12 },
});
