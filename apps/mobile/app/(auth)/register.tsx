import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import { Colors } from '@/constants/colors';

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/logo-colored.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Hesap Oluştur</Text>
            <Text style={styles.subtitle}>Rüya yolculuğuna başla</Text>
          </View>

          <View style={styles.form}>
            {serverError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>E-posta</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="ornek@email.com"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Kullanıcı Adı</Text>
              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.username && styles.inputError]}
                    placeholder="kullanici_adi"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={(t) => {
                      onChange(t.toLowerCase());
                    }}
                    value={value}
                  />
                )}
              />
              {errors.username && <Text style={styles.fieldError}>{errors.username.message}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Şifre</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Şifre Tekrar</Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.confirmPassword && styles.inputError]}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.confirmPassword && (
                <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>
              )}
            </View>

            <Pressable
              style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              onPress={() => {
                void handleSubmit(onSubmit)();
              }}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Kayıt ol"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
              )}
            </Pressable>

            {/* Legal */}
            <View style={styles.legalRow}>
              <Text style={styles.legalText}>Kayıt olarak </Text>
              <Pressable onPress={() => { void Linking.openURL('https://dreamcloud.app/terms'); }}>
                <Text style={styles.legalLink}>Kullanım Koşulları</Text>
              </Pressable>
              <Text style={styles.legalText}>'nı ve </Text>
              <Pressable onPress={() => { void Linking.openURL('https://dreamcloud.app/privacy'); }}>
                <Text style={styles.legalLink}>Gizlilik Politikası</Text>
              </Pressable>
              <Text style={styles.legalText}>'nı kabul etmiş olursunuz.</Text>
            </View>

            <Link href="/(auth)/login" asChild>
              <Pressable style={styles.linkButton}>
                <Text style={styles.linkText}>Zaten hesabın var mı? </Text>
                <Text style={styles.linkTextBold}>Giriş Yap</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 24 },

  header: { paddingTop: 40, paddingBottom: 32 },
  logo: { width: 140, height: 56, marginBottom: 16, borderRadius: 12 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: Colors.textSecondary },

  form: { paddingBottom: 32, gap: 16 },

  errorBanner: {
    backgroundColor: '#3D1515',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.error,
    padding: 12,
  },
  errorBannerText: { color: Colors.error, fontSize: 14, textAlign: 'center' },

  field: { gap: 6 },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginLeft: 2 },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  inputError: { borderColor: Colors.error },
  fieldError: { color: Colors.error, fontSize: 12, marginLeft: 2 },

  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 0,
  },
  legalText: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
  legalLink: { color: Colors.primary, fontSize: 12, fontWeight: '600', lineHeight: 18 },

  linkButton: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 },
  linkText: { color: Colors.textSecondary, fontSize: 14 },
  linkTextBold: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
