import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🌙 DreamCloud</Text>
        <Text style={styles.tagline}>Rüyalarını dünyayla paylaş</Text>
      </View>

      <View style={styles.form}>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>E-posta ile Giriş Yap</Text>
        </Pressable>

        <Pressable style={styles.oauthButton}>
          <Text style={styles.oauthButtonText}>Google ile Devam Et</Text>
        </Pressable>

        <Pressable style={styles.oauthButton}>
          <Text style={styles.oauthButtonText}>Apple ile Devam Et</Text>
        </Pressable>

        <Link href="/(auth)/register" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Hesabın yok mu? Kayıt ol</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F23' },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  logo: { fontSize: 36, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  tagline: { fontSize: 16, color: '#9B9BB4', textAlign: 'center' },
  form: { paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  primaryButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  oauthButton: {
    backgroundColor: '#1A1A35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D4E',
  },
  oauthButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  linkButton: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: '#6C63FF', fontSize: 14 },
});
