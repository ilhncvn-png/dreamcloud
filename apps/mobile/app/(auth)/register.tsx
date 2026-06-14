import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hesap Oluştur</Text>
        <Text style={styles.subtitle}>Rüya yolculuğuna başla</Text>
      </View>

      <View style={styles.form}>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
        </Pressable>

        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Zaten hesabın var mı? Giriş yap</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F23' },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#9B9BB4' },
  form: { paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  primaryButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  linkButton: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: '#6C63FF', fontSize: 14 },
});
