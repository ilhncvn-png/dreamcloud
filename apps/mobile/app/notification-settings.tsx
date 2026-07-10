import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/api/notifications.api';
import type { NotificationPreferences } from '@/types/notification.types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface PrefItem {
  key: keyof NotificationPreferences;
  title: string;
  subtitle: string;
  icon: IoniconName;
  color: string;
}

const PREFS: PrefItem[] = [
  {
    key: 'dreamMatch',
    title: 'Rüya Eşleşmeleri',
    subtitle: 'Birileriyle aynı rüyayı gördüğünüzde bildirim alın',
    icon: 'sparkles-outline',
    color: Colors.primary,
  },
  {
    key: 'dreamConnection',
    title: 'Rüya Bağlantıları',
    subtitle: 'Yeni bir rüya bağlantısı kurulduğunda bildirim alın',
    icon: 'git-compare-outline',
    color: '#4CAF87',
  },
  {
    key: 'highResonance',
    title: 'Güçlü Rezonans',
    subtitle: 'Derin veya ayna seviyesinde eşleşme olduğunda bildirim alın',
    icon: 'flash-outline',
    color: '#FBBF24',
  },
  {
    key: 'sharedSymbol',
    title: 'Ortak Rüya Sembolleri',
    subtitle: 'Biriyle aynı sembolü paylaştığınızda bildirim alın',
    icon: 'shapes-outline',
    color: '#60A5FA',
  },
  {
    key: 'signalTrending',
    title: 'Trending Sinyaller',
    subtitle: 'Rüyanız kolektif bir sinyale girdiğinde bildirim alın',
    icon: 'trending-up-outline',
    color: '#A78BFA',
  },
  {
    key: 'dreamMention',
    title: 'Rüyamda Göründüm',
    subtitle: 'Birisi sizi rüyasında gördüğünde bildirim alın',
    icon: 'eye-outline',
    color: '#F472B6',
  },
  {
    key: 'dreamMilestone',
    title: 'Rüya Kilometre Taşları',
    subtitle: 'Önemli rüya sayılarına ulaştığınızda bildirim alın',
    icon: 'trophy-outline',
    color: '#FBBF24',
  },
  {
    key: 'social',
    title: 'Sosyal Bildirimler',
    subtitle: 'Beğeni, yorum ve takip bildirimlerini alın',
    icon: 'heart-outline',
    color: '#F472B6',
  },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
  });

  const [local, setLocal] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (data && !local) setLocal(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (updated) => {
      setLocal(updated);
      void qc.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  function toggle(key: keyof NotificationPreferences) {
    if (!local) return;
    const updated = { ...local, [key]: !local[key] };
    setLocal(updated);
    mutation.mutate({ [key]: !local[key] });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Bildirim Ayarları</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading || !local ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionLabel}>KATEGORİLER</Text>

          <View style={styles.card}>
            {PREFS.map((pref, idx) => (
              <View key={pref.key}>
                {idx > 0 && <View style={styles.separator} />}
                <View style={styles.row}>
                  <View style={[styles.iconBox, { backgroundColor: `${pref.color}18`, borderColor: `${pref.color}30` }]}>
                    <Ionicons name={pref.icon} size={18} color={pref.color} />
                  </View>
                  <View style={styles.textBlock}>
                    <Text style={styles.rowTitle}>{pref.title}</Text>
                    <Text style={styles.rowSubtitle}>{pref.subtitle}</Text>
                  </View>
                  <Switch
                    value={local[pref.key]}
                    onValueChange={() => toggle(pref.key)}
                    trackColor={{ false: Colors.border, true: `${Colors.primary}80` }}
                    thumbColor={local[pref.key] ? Colors.primary : Colors.textMuted}
                  />
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.hint}>
            Bildirim ayarlarınız anında uygulanır. Sistem bildirimleri her zaman aktiftir.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 20, gap: 0 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textBlock: { flex: 1, gap: 2 },
  rowTitle:    { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  rowSubtitle: { fontSize: 12, color: Colors.textMuted, lineHeight: 16 },

  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 64,
  },

  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
