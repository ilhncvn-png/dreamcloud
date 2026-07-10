import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { forgotPasswordApi } from '@/api/auth.api';
import NeuralBackground from '@/components/auth/NeuralBackground';
import DreamInput from '@/components/auth/DreamInput';
import DreamButton from '@/components/auth/DreamButton';
import AuthErrorCard from '@/components/auth/AuthErrorCard';

// ─── Schema (unchanged) ──────────────────────────────────────────────────────
const schema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
});
type FormData = z.infer<typeof schema>;

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

// ─── Forgot password screen ───────────────────────────────────────────────────
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  // ── Submit (unchanged logic) ──────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await forgotPasswordApi(data.email);
      setSentEmail(data.email);
      setSent(true);
    } catch {
      setServerError('Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  // ── Success / sent state ──────────────────────────────────────────────────
  if (sent) {
    return (
      <View style={styles.root}>
        <NeuralBackground />
        <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
          {/* Glow ring */}
          <View style={styles.sentGlowRing} />

          {/* Mail icon */}
          <View style={styles.sentIconBox}>
            <Ionicons name="mail-outline" size={36} color="#7B6FFF" />
          </View>

          {/* Text */}
          <View style={styles.chip}>
            <View style={[styles.chipDot, { backgroundColor: '#38D68A' }]} />
            <Text style={[styles.chipText, { fontFamily: MONO, color: 'rgba(56,214,138,0.65)' }]}>
              TRANSMISSION SENT
            </Text>
          </View>

          <Text style={styles.sentTitle}>Kod Gönderildi</Text>
          <Text style={styles.sentBody}>
            {'Eğer '}
            <Text style={styles.sentEmail}>{sentEmail}</Text>
            {' adresine kayıtlı bir hesap varsa, şifre sıfırlama kodu gönderildi.'}
          </Text>

          {/* Divider */}
          <View style={styles.sentDivider} />

          {/* Actions */}
          <DreamButton
            title="Kodu Gir"
            onPress={() => {
              router.push({
                pathname: '/(auth)/reset-password',
                params: { email: sentEmail },
              });
            }}
          />
          <DreamButton
            title="Giriş Sayfasına Dön"
            variant="ghost"
            onPress={() => {
              router.back();
            }}
          />
        </SafeAreaView>
      </View>
    );
  }

  // ── Form state ────────────────────────────────────────────────────────────
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
            {/* ── Back + Header ────────────────────────────────────────── */}
            <View style={styles.headerSection}>
              <Pressable
                style={styles.backBtn}
                onPress={() => {
                  router.back();
                }}
                accessibilityRole="button"
                accessibilityLabel="Geri"
                hitSlop={12}
              >
                <Ionicons name="chevron-back" size={22} color="rgba(232,232,255,0.65)" />
              </Pressable>

              <View style={styles.iconBox}>
                <View style={styles.iconGlow} />
                <Ionicons name="lock-closed-outline" size={30} color="#7B6FFF" />
              </View>

              <View style={styles.chip}>
                <View style={styles.chipDot} />
                <Text style={[styles.chipText, { fontFamily: MONO }]}>ŞIFRE KURTARMA</Text>
              </View>

              <Text style={styles.heading}>Şifremi Unuttum</Text>
              <Text style={styles.subtitle}>
                E-posta adresinizi girin.{'\n'}Size bir şifre sıfırlama kodu göndereceğiz.
              </Text>
            </View>

            {/* ── Glass card ──────────────────────────────────────────── */}
            <View style={styles.card}>
              <View style={styles.cardSheen} />

              {serverError != null && <AuthErrorCard message={serverError} />}

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DreamInput
                    label="E-Posta — Kayıtlı Adres"
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

              <DreamButton
                title="Kodu Gönder"
                onPress={() => {
                  void handleSubmit(onSubmit)();
                }}
                loading={isSubmitting}
                disabled={isSubmitting}
              />
            </View>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <View style={styles.footer}>
              <Pressable
                style={styles.footerRow}
                onPress={() => {
                  router.back();
                }}
                accessibilityRole="link"
              >
                <Text style={styles.footerText}>Giriş Sayfasına Dön</Text>
              </Pressable>
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
  centerContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32, gap: 24 },

  // Header section
  headerSection: { gap: 12, paddingTop: 4, position: 'relative' },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 4,
    marginBottom: 8,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(12,8,32,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(123,111,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    inset: -2,
    borderRadius: 20,
    shadowColor: '#7B6FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 0,
  },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#7B6FFF',
    shadowColor: '#7B6FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2,
  },
  chipText: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: 'rgba(123,111,255,0.6)',
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 24,
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

  // Card
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

  // Footer
  footer: { alignItems: 'center' },
  footerRow: { paddingVertical: 10 },
  footerText: {
    fontSize: 14,
    color: 'rgba(123,111,255,0.65)',
    fontWeight: '500',
  },

  // Sent success state
  sentGlowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(123,111,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(123,111,255,0.15)',
    shadowColor: '#7B6FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 0,
  },
  sentIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(12,8,32,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(123,111,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7B6FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 1,
  },
  sentTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(232,232,255,0.96)',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  sentBody: {
    fontSize: 14,
    color: 'rgba(232,232,255,0.38)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  sentEmail: {
    color: 'rgba(204,128,255,0.9)',
    fontWeight: '600',
  },
  sentDivider: {
    width: 80,
    height: 1,
    backgroundColor: 'rgba(123,111,255,0.2)',
    marginVertical: 4,
  },
});
