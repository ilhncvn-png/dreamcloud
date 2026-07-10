import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
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
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoColored = require('../../assets/images/logo-colored.png') as number;

import { useAuthStore } from '@/store/auth.store';
import NeuralBackground from '@/components/auth/NeuralBackground';
import DreamInput from '@/components/auth/DreamInput';
import DreamButton from '@/components/auth/DreamButton';
import AuthErrorCard from '@/components/auth/AuthErrorCard';

// ─── Schema (unchanged) ──────────────────────────────────────────────────────
const schema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});
type FormData = z.infer<typeof schema>;

// ─── Design tokens ───────────────────────────────────────────────────────────
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
let _splashShown = false;

// ─── Premium splash overlay ───────────────────────────────────────────────────
function SplashOverlay({ onDone }: { onDone: () => void }) {
  const bg = useSharedValue(1);
  const logoSc = useSharedValue(0.3);
  const logoOp = useSharedValue(0);
  const titleOp = useSharedValue(0);
  const tagOp = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance
    logoOp.value = withDelay(280, withTiming(1, { duration: 700 }));
    logoSc.value = withDelay(280, withSpring(1, { damping: 14, stiffness: 100 }));
    titleOp.value = withDelay(850, withTiming(1, { duration: 600 }));
    tagOp.value = withDelay(1200, withTiming(1, { duration: 500 }));

    // Fade out → call onDone after animation completes
    const t1 = setTimeout(() => {
      bg.value = withTiming(0, { duration: 550 });
    }, 2500);
    const t2 = setTimeout(onDone, 3100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [bg, logoOp, logoSc, tagOp, titleOp]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: bg.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOp.value,
    transform: [{ scale: logoSc.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOp.value }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOp.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.splash, overlayStyle]}>
      <NeuralBackground />

      {/* Outer glow ring */}
      <Animated.View style={[styles.splashRing, logoStyle]} />

      {/* Logo */}
      <Animated.View style={[styles.splashLogoWrap, logoStyle]}>
        <Image source={logoColored} style={styles.splashLogo} resizeMode="contain" />
      </Animated.View>

      {/* Title */}
      <Animated.View style={[styles.splashTitleWrap, titleStyle]}>
        <Text style={styles.splashTitle}>DreamCloud</Text>
      </Animated.View>

      {/* Tag */}
      <Animated.View style={[{ alignItems: 'center' }, tagStyle]}>
        <Text style={[styles.splashTag, { fontFamily: MONO }]}>DREAM INTELLIGENCE PLATFORM</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { login } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSplash, setShowSplash] = useState(!_splashShown);

  function handleSplashDone() {
    _splashShown = true;
    setShowSplash(false);
  }

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // ── Entrance animations ───────────────────────────────────────────────────
  const logoOp = useSharedValue(0);
  const logoTy = useSharedValue(-18);
  const cardOp = useSharedValue(0);
  const cardTy = useSharedValue(36);
  const footOp = useSharedValue(0);

  useEffect(() => {
    const delay = showSplash ? 2600 : 0;
    logoOp.value = withDelay(delay + 80, withTiming(1, { duration: 600 }));
    logoTy.value = withDelay(delay + 80, withSpring(0, { damping: 18, stiffness: 140 }));
    cardOp.value = withDelay(delay + 280, withTiming(1, { duration: 600 }));
    cardTy.value = withDelay(delay + 280, withSpring(0, { damping: 18, stiffness: 120 }));
    footOp.value = withDelay(delay + 500, withTiming(1, { duration: 500 }));
  }, [cardOp, cardTy, footOp, logoOp, logoTy, showSplash]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOp.value,
    transform: [{ translateY: logoTy.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOp.value,
    transform: [{ translateY: cardTy.value }],
  }));
  const footStyle = useAnimatedStyle(() => ({ opacity: footOp.value }));

  // ── Submit (unchanged logic) ──────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await login(data);
    } catch (err: unknown) {
      const raw =
        err !== null &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      const msg = raw
        ? Array.isArray(raw)
          ? (raw[0] ?? 'Giriş başarısız.')
          : raw
        : 'Giriş başarısız. Bilgilerinizi kontrol edin.';
      setServerError(typeof msg === 'string' ? msg : 'Giriş başarısız.');
    }
  };

  return (
    <View style={styles.root}>
      {/* Living neural background */}
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
            {/* ── Logo section ────────────────────────────────────────── */}
            <Animated.View style={[styles.logoSection, logoStyle]}>
              {/* Glow ring behind logo */}
              <View style={styles.logoGlowRing} />
              <View style={styles.logoBox}>
                <Image source={logoColored} style={styles.logoImage} resizeMode="contain" />
              </View>
              <Text style={styles.brandName}>DreamCloud</Text>
              <Text style={[styles.brandTag, { fontFamily: MONO }]}>
                DREAM INTELLIGENCE PLATFORM
              </Text>
            </Animated.View>

            {/* ── Glass auth card ──────────────────────────────────────── */}
            <Animated.View style={[styles.card, cardStyle]}>
              {/* Top inner highlight (glass sheen) */}
              <View style={styles.cardSheen} />

              {/* Auth chip */}
              <View style={styles.chip}>
                <View style={styles.chipDot} />
                <Text style={[styles.chipText, { fontFamily: MONO }]}>NEURAL AUTHENTICATION</Text>
              </View>

              {/* Heading */}
              <Text style={styles.heading}>Hoş Geldin, Dreamer</Text>
              <Text style={styles.subtitle}>
                Bilinçaltının kapısını aç.{'\n'}Rüyaların kolektif anlamını keşfet.
              </Text>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Error */}
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

              {/* Password */}
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DreamInput
                    label="Şifre — Güvenlik Anahtarı"
                    placeholder="••••••••••••"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.password?.message}
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

              {/* Forgot password */}
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable style={styles.forgotWrap} accessibilityRole="link">
                  <Text style={styles.forgotText}>Şifremi unuttum</Text>
                </Pressable>
              </Link>

              {/* Submit */}
              <DreamButton
                title="Rüyama Gir"
                onPress={() => {
                  void handleSubmit(onSubmit)();
                }}
                loading={isSubmitting}
                disabled={isSubmitting}
              />
            </Animated.View>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <Animated.View style={[styles.footer, footStyle]}>
              <Link href="/(auth)/register" asChild>
                <Pressable style={styles.footerRow} accessibilityRole="link">
                  <Text style={styles.footerText}>Henüz hesabın yok mu? </Text>
                  <Text style={styles.footerLink}>Aramıza Katıl</Text>
                </Pressable>
              </Link>

              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: '#38D68A' }]} />
                <Text style={[styles.statusText, { fontFamily: MONO }]}>NEURAL NETWORK ACTIVE</Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Premium splash overlay */}
      {showSplash && <SplashOverlay onDone={handleSplashDone} />}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060614' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    justifyContent: 'center',
    gap: 28,
  },

  // Logo section
  logoSection: { alignItems: 'center', gap: 10, position: 'relative', paddingVertical: 8 },
  logoGlowRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(123,111,255,0.1)',
    shadowColor: '#7B6FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 0,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(12,8,32,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(123,111,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7B6FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  logoImage: { width: 44, height: 44, borderRadius: 10 },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: 'rgba(232,232,255,0.96)',
    textShadowColor: 'rgba(123,111,255,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    marginTop: 2,
  },
  brandTag: {
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(123,111,255,0.48)',
    textTransform: 'uppercase',
  },

  // Card
  card: {
    backgroundColor: 'rgba(12,8,32,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(123,111,255,0.22)',
    borderRadius: 24,
    padding: 26,
    gap: 16,
    shadowColor: '#7B6FFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 36,
    elevation: 16,
    overflow: 'hidden',
  },
  cardSheen: {
    position: 'absolute',
    top: 0,
    left: 28,
    right: 28,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },

  // Auth chip
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

  // Heading
  heading: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: 'rgba(232,232,255,0.96)',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(232,232,255,0.38)',
    lineHeight: 19,
    marginTop: -4,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(123,111,255,0.1)',
    marginVertical: 2,
  },

  // Forgot
  forgotWrap: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: {
    fontSize: 12,
    color: 'rgba(123,111,255,0.65)',
    fontWeight: '500',
  },

  // Footer
  footer: { alignItems: 'center', gap: 14 },
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
    shadowColor: '#38D68A',
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

  // Splash
  splash: {
    backgroundColor: '#060614',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  splashRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(123,111,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(123,111,255,0.2)',
    shadowColor: '#7B6FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 35,
    elevation: 0,
  },
  splashLogoWrap: { alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  splashLogo: { width: 80, height: 80, borderRadius: 22 },
  splashTitleWrap: { alignItems: 'center', zIndex: 1 },
  splashTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: 'rgba(232,232,255,0.96)',
    textShadowColor: 'rgba(123,111,255,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  splashTag: {
    fontSize: 9,
    letterSpacing: 2.2,
    color: 'rgba(123,111,255,0.5)',
    textTransform: 'uppercase',
    zIndex: 1,
  },
});
