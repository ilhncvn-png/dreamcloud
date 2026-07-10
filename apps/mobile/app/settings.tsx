import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { Colors } from '@/constants/colors';
import { BackIcon } from '@/design/icons';

function SettingsRow({
  label,
  subtitle,
  onPress,
  destructive = false,
  disabled = false,
  rightText,
}: {
  label: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  rightText?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        disabled && styles.rowDisabled,
        { opacity: pressed && !disabled ? 0.7 : 1 },
      ]}
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
    >
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      <Text style={styles.rowChevron}>
        {rightText ?? '›'}
      </Text>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const qc = useQueryClient();

  function handleLogout() {
    Alert.alert(
      'Çıkış Yap',
      'Hesabından çıkmak istediğine emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: () => {
            void logout().then(() => { qc.clear(); });
          },
        },
      ],
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Hesabı Sil',
      'Bu özellik yakında kullanıma sunulacak. Hesabını silmek için şu an destek ekibiyle iletişime geç.',
      [
        { text: 'Tamam', style: 'default' },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => { router.back(); }}
          accessibilityRole="button"
          accessibilityLabel="Geri git"
        >
          <BackIcon size={24} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hesap */}
        <SectionHeader title="HESAP" />
        <View style={styles.group}>
          <SettingsRow
            label="Profili Düzenle"
            subtitle="İsim, kullanıcı adı, bio, fotoğraf"
            onPress={() => { router.push('/profile/edit'); }}
          />
          <Divider />
          <SettingsRow
            label="Şifre Değiştir"
            subtitle="Yakında"
            disabled
            rightText="—"
          />
        </View>

        {/* Gizlilik */}
        <SectionHeader title="GİZLİLİK" />
        <View style={styles.group}>
          <SettingsRow
            label="Gizlilik Politikası"
            onPress={() => {
              // TODO: Open privacy policy URL or internal screen
              Alert.alert('Gizlilik Politikası', 'https://dreamcloud.app/privacy');
            }}
          />
          <Divider />
          <SettingsRow
            label="Kullanım Koşulları"
            onPress={() => {
              Alert.alert('Kullanım Koşulları', 'https://dreamcloud.app/terms');
            }}
          />
        </View>

        {/* Bildirimler */}
        <SectionHeader title="BİLDİRİMLER" />
        <View style={styles.group}>
          <SettingsRow
            label="Bildirim Tercihleri"
            subtitle="Yakında"
            disabled
            rightText="—"
          />
        </View>

        {/* Tehlikeli Alan */}
        <SectionHeader title="HESAP YÖNETİMİ" />
        <View style={styles.group}>
          <SettingsRow
            label="Hesabı Sil"
            subtitle="Tüm verilerini kalıcı olarak sil"
            onPress={handleDeleteAccount}
            destructive
          />
        </View>

        {/* Çıkış */}
        <View style={styles.logoutSection}>
          <Pressable
            style={({ pressed }) => [styles.logoutButton, { opacity: pressed ? 0.8 : 1 }]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Çıkış yap"
          >
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </Pressable>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>DreamCloud v1.0</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 32,
    color: Colors.primary,
    fontWeight: '300',
    lineHeight: 36,
    marginTop: -2,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  headerRight: { width: 40 },

  scroll: { paddingTop: 8 },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
  },

  group: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 20,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    minHeight: 52,
  },
  rowDisabled: { opacity: 0.45 },
  rowContent: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  rowLabelDestructive: { color: Colors.error },
  rowSubtitle: { fontSize: 12, color: Colors.textMuted },
  rowChevron: { fontSize: 20, color: Colors.textMuted, fontWeight: '300' },

  logoutSection: {
    marginHorizontal: 20,
    marginTop: 32,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 92, 92, 0.12)',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.error },

  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 24,
  },
});
