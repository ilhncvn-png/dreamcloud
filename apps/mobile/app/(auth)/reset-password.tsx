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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resetPasswordApi } from '@/api/auth.api';
import NeuralBackground from '@/components/auth/NeuralBackground';
import DreamInput from '@/components/auth/DreamInput';
import DreamButton from '@/components/auth/DreamButton';
import AuthErrorCard from '@/components/auth/AuthErrorCard';

// ─── Schema (unchanged) ──────────────────────────────────────────────────────
const schema = z
  .object({
    code: z.string().length(6, 'Kod 6 haneli olmalı'),
    newPassword: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
    confirmPassword: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

// ─── Reset password screen ────────────────────────────────────────────────────
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
  });

  // ── Submit (unchanged logic) ──────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await resetPasswordApi(email, data.code, data.newPassword);
      setDone(true);
    } catch (err: unknown) {
      const msg =
        err !== null &&
        typeof err === 'object' &&
        'response' in err &&
        err.response !== null &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data !== null &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
          ? (err.response.data as { message: string }).message
          : 'Geçersiz veya süresi dolmuş kod.';
      setServerError(msg);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={styles.root}>
        <NeuralBackground />
        <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
          <View style={styles.doneGlowRing} />

          {/* Check icon */}
          <View style={styles.doneIconBox}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#38D68A" />
          </View>

          <View style={styles.chip}>
            <View style={[styles.chipDot, { backgroundColor: '#38D68A' }]} />
            <Text style={[styles.chipText, { fontFamily: MONO, color: 'rgba(56,214,138,0.65)' }]}>
              SİSTEM GÜNCELLENDI
            </Text>
          </View>

          <Text style={styles.doneTitle}>Şifre Güncellendi</Text>
          <Text style={styles.doneBody}>
            Şifreniz başarıyla değiştirildi.{'\n'}Yeni şifrenizle giriş yapabilirsiniz.
          </Text>

          <View style={styles.doneDivider} />

          <DreamButton
            title="Giriş Yap"
            onPress={() => {
              router.replace('/(auth)/login');
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
                <Ionicons name="key-outline" size={30} color="#CC80FF" />
              </View>

              <View style={styles.chip}>
                <View style={styles.chipDot} />
                <Text style={[styles.chipText, { fontFamily: MONO }]}>ŞİFRE SIFIRLAMA</Text>
              </View>

              <Text style={styles.heading}>Şifremi Sıfırla</Text>
              <Text style={styles.subtitle}>
                E-postanıza gönderilen 6 haneli kodu{'\n'}ve yeni şifrenizi girin.
              </Text>
            </View>

            {/* ── Glass card ──────────────────────────────────────────── */}
            <View style={styles.card}>
              <View style={styles.cardSheen} />

              {serverError != null && <AuthErrorCard message={serverError} />}

              {/* OTP code — center-aligned, large */}
              <Controller
                control={control}
                name="code"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DreamInput
                    label="Doğrulama Kodu — 6 Hane"
                    placeholder="· · · · · ·"
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                    style={{ letterSpacing: 10, fontSize: 22, fontWeight: '700' }}
                    error={errors.code?.message}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />

              {/* New password */}
              <Controller
                control={control}
                name="newPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DreamInput
                    label="Yeni Şifre"
                    placeholder="••••••••••••"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.newPassword?.message}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    suffix={
                      <Pressable
                        onPress={() => {
                          setShowPassword((v) => !v);
                        }}
                        hitSlop={8}
                        accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color="rgba(123,111,255,0.5)"
                        />
                      </Pressable>
                    }
                  />
                )}
              />

              {/* Confirm password */}
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DreamInput
                    label="Yeni Şifre (Tekrar)"
                    placeholder="••••••••••••"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.confirmPassword?.message}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />

              <DreamButton
                title="Şifremi Güncelle"
                onPress={() => {
                  void handleSubmit(onSubmit)();
                }}
                loading={isSubmitting}
                disabled={isSubmitting}
              />
            </View>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <View style={styles.footer}>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={[styles.statusText, { fontFamily: MONO }]}>SECURE CHANNEL ACTIVE</Text>
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
  centerContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32, gap: 24 },

  // Header
  headerSection: { gap: 12, paddingTop: 4 },
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
    borderColor: 'rgba(204,128,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    inset: -2,
    borderRadius: 20,
    shadowColor: '#CC80FF',
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
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CC80FF',
    shadowColor: '#CC80FF',
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

  // Done / success state
  doneGlowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(56,214,138,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(56,214,138,0.12)',
    shadowColor: '#38D68A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 0,
  },
  doneIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(12,8,32,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(56,214,138,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38D68A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
    zIndex: 1,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(232,232,255,0.96)',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  doneBody: {
    fontSize: 14,
    color: 'rgba(232,232,255,0.38)',
    textAlign: 'center',
    lineHeight: 22,
  },
  doneDivider: {
    width: 80,
    height: 1,
    backgroundColor: 'rgba(56,214,138,0.2)',
    marginVertical: 4,
  },
});
