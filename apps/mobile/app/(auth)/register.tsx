import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import NeuralBackground from '@/components/auth/NeuralBackground';
import DreamInput from '@/components/auth/DreamInput';
import DreamButton from '@/components/auth/DreamButton';
import AuthErrorCard from '@/components/auth/AuthErrorCard';

// ─── Schema (unchanged) ──────────────────────────────────────────────────────
const schema = z
  .object({
    email: z.string().email('Geçerli bir e-posta girin'),
    username: z
      .string()
      .min(3, 'Kullanıcı adı en az 3 karakter')
      .max(30, 'Kullanıcı adı en fazla 30 karakter')
      .regex(/^[a-z0-9_]+$/, 'Sadece küçük harf, rakam ve alt çizgi'),
    password: z
      .string()
      .min(8, 'Şifre en az 8 karakter')
      .regex(/[A-Z]/, 'En az bir büyük harf içermeli')
      .regex(/[0-9]/, 'En az bir rakam içermeli'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

// ─── Register screen ──────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const { register } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', username: '', password: '', confirmPassword: '' },
  });

  // ── Submit (unchanged logic) ──────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await register({ email: data.email, username: data.username, password: data.password });
    } catch (err: unknown) {
      const raw =
        err !== null &&
        typeof err === 'object' &&
        'response' in err &&
        err.response !== null &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data !== null &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
          ? (err.response.data as { message: string | string[] }).message
          : 'Kayıt başarısız. Lütfen tekrar deneyin.';
      setServerError(Array.isArray(raw) ? (raw[0] ?? 'Kayıt başarısız.') : raw);
    }
  };

  return (
    <View style={styles.root}>
      <NeuralBackground />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Header ──────────────────────────────────────────────── */}
            <View style={styles.headerSection}>
              <View style={styles.chip}>
                <View style={styles.chipDot} />
                <Text style={[styles.chipText, { fontFamily: MONO }]}>NEURAL ENROLLMENT</Text>
              </View>
              <Text style={styles.heading}>Aramıza Katıl</Text>
              <Text style={styles.subtitle}>
                Rüyalarını kaydet, bilinçaltını keşfet.{'\n'}Kollektif düşün bir parçası ol.
              </Text>
            </View>

            {/* ── Glass card ──────────────────────────────────────────── */}
            <View style={styles.card}>
              <View style={styles.cardSheen} />

              {serverError != null && <AuthErrorCard message={serverError} />}

              {/* Email */}
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DreamInput
                    label="E-Posta — KİMLİK"
                    placeholder="dreamer@dreamcloud.ai"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.email?.message}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />

              {/* Username */}
              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DreamInput
                    label="Kullanıcı Adı — Dreamer Kimliği"
                    placeholder="dreamer_adi"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.username?.message}
                    onBlur={onBlur}
                    onChangeText={(t) => {
                      onChange(t.toLowerCase());
                    }}
                    value={value}
                  />
                )}
              />

              {/* Password */}
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DreamInput
                    label="Şifre — Güvenlik Anahtarı"
                    placeholder="••••••••••••"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.password?.message}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />

              {/* Confirm password */}
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DreamInput
                    label="Şifre Tekrar — Doğrulama"
                    placeholder="••••••••••••"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.confirmPassword?.message}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />

              {/* Submit */}
              <DreamButton
                title="Yolculuğu Başlat"
                onPress={() => {
                  void handleSubmit(onSubmit)();
                }}
                loading={isSubmitting}
                disabled={isSubmitting}
              />

              {/* Legal */}
              <View style={styles.legalRow}>
                <Text style={[styles.legalText, { fontFamily: MONO }]}>{'[ KAYIT → '}</Text>
                <Pressable
                  onPress={() => {
                    void Linking.openURL('https://dreamcloud.app/terms');
                  }}
                  accessibilityRole="link"
                >
                  <Text style={[styles.legalLink, { fontFamily: MONO }]}>KOŞULLAR</Text>
                </Pressable>
                <Text style={[styles.legalText, { fontFamily: MONO }]}>{' + '}</Text>
                <Pressable
                  onPress={() => {
                    void Linking.openURL('https://dreamcloud.app/privacy');
                  }}
                  accessibilityRole="link"
                >
                  <Text style={[styles.legalLink, { fontFamily: MONO }]}>GİZLİLİK</Text>
                </Pressable>
                <Text style={[styles.legalText, { fontFamily: MONO }]}>{' ]'}</Text>
              </View>
            </View>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <View style={styles.footer}>
              <Link href="/(auth)/login" asChild>
                <Pressable style={styles.footerRow} accessibilityRole="link">
                  <Text style={styles.footerText}>Zaten hesabın var mı? </Text>
                  <Text style={styles.footerLink}>Giriş Yap</Text>
                </Pressable>
              </Link>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={[styles.statusText, { fontFamily: MONO }]}>ENCRYPTION ACTIVE</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060614' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, gap: 24 },

  headerSection: { gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CC80FF',
    shadowColor: '#CC80FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2,
  },
  chipText: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: 'rgba(204,128,255,0.6)',
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: 'rgba(232,232,255,0.96)',
    textShadowColor: 'rgba(123,111,255,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(232,232,255,0.38)',
    lineHeight: 20,
  },

  card: {
    backgroundColor: 'rgba(12,8,32,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(123,111,255,0.22)',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: '#7B6FFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 14,
    overflow: 'hidden',
  },
  cardSheen: {
    position: 'absolute',
    top: 0,
    left: 28,
    right: 28,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
    paddingTop: 4,
  },
  legalText: {
    fontSize: 9,
    letterSpacing: 0.5,
    color: 'rgba(232,232,255,0.2)',
  },
  legalLink: {
    fontSize: 9,
    letterSpacing: 0.5,
    color: 'rgba(123,111,255,0.55)',
    fontWeight: '600',
  },

  footer: { alignItems: 'center', gap: 14, paddingBottom: 8 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: {
    fontSize: 14,
    color: 'rgba(232,232,255,0.35)',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(123,111,255,0.85)',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00CFFF',
    shadowColor: '#00CFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  statusText: {
    fontSize: 8,
    letterSpacing: 1.4,
    color: 'rgba(232,232,255,0.2)',
    textTransform: 'uppercase',
  },
});
