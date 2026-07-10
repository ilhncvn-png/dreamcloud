import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { EVENT_MATCHES, LEVEL_COLOR, LEVEL_TR } from '@/data/reality-resonance.data';

export default function EventMatchDetailScreen() {
  const router  = useRouter();
  const { id }  = useLocalSearchParams<{ id: string }>();
  const item    = EVENT_MATCHES.find(e => e.id === id);

  const color   = item ? (LEVEL_COLOR[item.level] ?? '#6C63FF') : '#6C63FF';
  const level   = item ? (LEVEL_TR[item.level]   ?? '')          : '';

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
          <Text style={sc.title}>Rezonans Detayı</Text>
          <Text style={sc.subtitle}>OLAY EŞLEŞMESİ</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      {!item ? (
        <View style={sc.notFound}>
          <Text style={sc.notFoundTxt}>Eşleşme bulunamadı.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sc.scroll}>
          {/* Resonance hero */}
          <View style={[dt.hero, { borderColor: `${color}30` }]}>
            <Text style={[dt.heroScore, { color }]}>{item.resonance}%</Text>
            <Text style={[dt.heroLevel, { color: `${color}99` }]}>{level} Rezonans</Text>
            <Text style={dt.heroDate}>{item.dateRange}</Text>
          </View>

          <View style={dt.divider} />

          {/* Dream signal */}
          <View style={dt.section}>
            <Text style={dt.sLabel}>RÜYA SİNYALİ</Text>
            <Text style={dt.bodyTxt}>{item.dreamSignal}</Text>
          </View>

          <View style={dt.divider} />

          {/* Real event */}
          <View style={dt.section}>
            <Text style={dt.sLabel}>GERÇEK DÜNYA OLAYI</Text>
            <Text style={dt.bodyTxt}>{item.realEvent}</Text>
          </View>

          <View style={dt.divider} />

          {/* Matching symbols */}
          <View style={dt.section}>
            <Text style={dt.sLabel}>EŞLEŞİ SEMBOLLER</Text>
            <View style={dt.tags}>
              {item.matchingSymbols.map(sym => (
                <View key={sym} style={[dt.tag, { borderColor: `${color}40`, backgroundColor: `${color}10` }]}>
                  <Text style={[dt.tagTxt, { color }]}>{sym}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={dt.divider} />

          {/* Matching emotions */}
          <View style={dt.section}>
            <Text style={dt.sLabel}>EŞLEŞİ DUYGULAR</Text>
            <View style={dt.tags}>
              {item.matchingEmotions.map(em => (
                <View key={em} style={[dt.tag, { borderColor: 'rgba(248,113,113,0.30)', backgroundColor: 'rgba(248,113,113,0.08)' }]}>
                  <Text style={[dt.tagTxt, { color: '#F87171' }]}>{em}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={dt.divider} />

          {/* Confidence */}
          <View style={dt.section}>
            <Text style={dt.sLabel}>GÜVEN SEVİYESİ</Text>
            <View style={[dt.confidenceBadge, { borderColor: `${color}40`, backgroundColor: `${color}10` }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={color} />
              <Text style={[dt.confidenceTxt, { color }]}>{item.confidenceLevel}</Text>
            </View>
          </View>

          <View style={dt.divider} />

          {/* Explanation */}
          <View style={dt.section}>
            <Text style={dt.sLabel}>AÇIKLAMA</Text>
            <Text style={dt.explanationTxt}>{item.explanation}</Text>
          </View>

          <View style={dt.divider} />

          {/* Disclaimer */}
          <View style={dt.section}>
            <View style={dt.disclaimerBox}>
              <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.25)" />
              <Text style={dt.disclaimerTxt}>
                Bu eşleşme istatistiksel benzerlik analizine dayanır. Nedensellik ilişkisi kurulamaz.
              </Text>
            </View>
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
  hero:            { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 8, marginHorizontal: 24, marginTop: 24, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)' },
  heroScore:       { fontSize: 52, fontWeight: '900', lineHeight: 56 },
  heroLevel:       { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  heroDate:        { fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 4 },
  divider:         { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 24, marginTop: 8 },
  section:         { paddingHorizontal: 24, paddingVertical: 22, gap: 14 },
  sLabel:          { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  bodyTxt:         { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.80)', lineHeight: 22 },
  tags:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:             { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  tagTxt:          { fontSize: 13, fontWeight: '700' },
  confidenceBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  confidenceTxt:   { fontSize: 14, fontWeight: '700' },
  explanationTxt:  { fontSize: 14, color: 'rgba(255,255,255,0.68)', lineHeight: 24 },
  disclaimerBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  disclaimerTxt:   { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.32)', lineHeight: 19 },
});
