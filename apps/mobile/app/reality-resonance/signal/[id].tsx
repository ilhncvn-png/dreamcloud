import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import {
  COLLECTIVE_SIGNALS, SIGNAL_TYPE_TR, SIGNAL_TYPE_COLOR,
} from '@/data/reality-resonance.data';

export default function SignalDetailScreen() {
  const router   = useRouter();
  const { id }   = useLocalSearchParams<{ id: string }>();
  const signal   = COLLECTIVE_SIGNALS.find(s => s.id === id);

  const typeColor   = signal ? (SIGNAL_TYPE_COLOR[signal.type] ?? '#6C63FF') : '#6C63FF';
  const typeLabel   = signal ? (SIGNAL_TYPE_TR[signal.type]   ?? signal.type) : '';

  return (
    <SafeAreaView style={sc.container} edges={['top']}>
      <View style={sc.header}>
        <Pressable
          style={({ pressed }) => [sc.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => { router.back(); }}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={sc.titleWrap}>
          <Text style={sc.title}>Sinyal Detayı</Text>
          <Text style={sc.subtitle}>KOLEKTİF BİLİNÇ SİNYALİ</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      {!signal ? (
        <View style={sc.notFound}>
          <Text style={sc.notFoundTxt}>Sinyal bulunamadı.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sc.scroll}>
          {/* Icon + name hero */}
          <View style={dt.hero}>
            <Text style={dt.heroIcon}>{signal.icon}</Text>
            <Text style={dt.heroName}>{signal.name}</Text>
            <View style={[dt.typeBadge, { backgroundColor: `${typeColor}18`, borderColor: `${typeColor}40` }]}>
              <Text style={[dt.typeLabel, { color: typeColor }]}>{typeLabel}</Text>
            </View>
          </View>

          <View style={dt.divider} />

          {/* Stats row */}
          <View style={dt.statsRow}>
            <View style={dt.stat}>
              <Text style={dt.statValue}>{signal.count}</Text>
              <Text style={dt.statLabel}>kişi gördü</Text>
            </View>
            <View style={dt.statSep} />
            <View style={dt.stat}>
              <Text style={dt.statValue}>{signal.relatedDreams}</Text>
              <Text style={dt.statLabel}>ilgili rüya</Text>
            </View>
            <View style={dt.statSep} />
            <View style={dt.stat}>
              <Text style={dt.statValue}>{signal.timeWindow}</Text>
              <Text style={dt.statLabel}>zaman penceresi</Text>
            </View>
          </View>

          <View style={dt.divider} />

          {/* Dominant emotion */}
          <View style={dt.section}>
            <Text style={dt.sLabel}>HAKİM DUYGU</Text>
            <View style={[dt.emotionRow, { borderColor: `${signal.dominantEmotionColor}40`, backgroundColor: `${signal.dominantEmotionColor}10` }]}>
              <View style={[dt.emotionDot, { backgroundColor: signal.dominantEmotionColor }]} />
              <Text style={[dt.emotionTxt, { color: signal.dominantEmotionColor }]}>{signal.dominantEmotion}</Text>
            </View>
          </View>

          <View style={dt.divider} />

          {/* Explanation */}
          <View style={dt.section}>
            <Text style={dt.sLabel}>ANALİZ</Text>
            <Text style={dt.explanationTxt}>{signal.explanation}</Text>
          </View>

          <View style={dt.divider} />

          {/* CTA */}
          <View style={dt.ctaWrap}>
            <Pressable
              style={({ pressed }) => [dt.cta, { opacity: pressed ? 0.78 : 1 }]}
              onPress={() => { router.back(); }}
            >
              <Ionicons name="book-outline" size={16} color={Colors.primary} />
              <Text style={dt.ctaTxt}>Bu Sinyaldeki Rüyaları Gör</Text>
            </Pressable>
            <Text style={dt.ctaNote}>
              * Bu özellik gelecek güncellemeyle kullanıma açılacak.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const sc = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:    { padding: 4 },
  titleWrap:  { alignItems: 'center', gap: 2 },
  title:      { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  subtitle:   { fontSize: 8, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2 },
  scroll:     { paddingBottom: 48 },
  notFound:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundTxt:{ fontSize: 14, color: Colors.textMuted },
});

const dt = StyleSheet.create({
  hero:         { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 12 },
  heroIcon:     { fontSize: 48 },
  heroName:     { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  typeBadge:    { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  typeLabel:    { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  divider:      { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 24 },
  statsRow:     { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 24 },
  stat:         { flex: 1, alignItems: 'center', gap: 6 },
  statValue:    { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  statLabel:    { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  statSep:      { width: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 4 },
  section:      { paddingHorizontal: 24, paddingVertical: 24, gap: 14 },
  sLabel:       { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  emotionRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  emotionDot:   { width: 8, height: 8, borderRadius: 4 },
  emotionTxt:   { fontSize: 15, fontWeight: '700' },
  explanationTxt: { fontSize: 14, color: 'rgba(255,255,255,0.68)', lineHeight: 24 },
  ctaWrap:      { paddingHorizontal: 24, paddingVertical: 24, gap: 12 },
  cta:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14, backgroundColor: `rgba(108,99,255,0.12)`, borderWidth: 1, borderColor: `rgba(108,99,255,0.30)` },
  ctaTxt:       { fontSize: 15, fontWeight: '700', color: Colors.primary },
  ctaNote:      { fontSize: 10, color: 'rgba(255,255,255,0.22)', textAlign: 'center', lineHeight: 16, fontStyle: 'italic' },
});
