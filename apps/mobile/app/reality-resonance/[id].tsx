import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { REALIZED_DREAMS, LEVEL_COLOR, LEVEL_TR } from '@/data/reality-resonance.data';

export default function RealizedDreamDetailScreen() {
  const router  = useRouter();
  const { id }  = useLocalSearchParams<{ id: string }>();
  const item    = REALIZED_DREAMS.find(d => d.id === id);

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
          <Text style={sc.title}>Gerçekleşen Rüya</Text>
          <Text style={sc.subtitle}>REZONANS ANALİZİ</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      {!item ? (
        <View style={sc.notFound}>
          <Text style={sc.notFoundTxt}>Kayıt bulunamadı.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sc.scroll}>
          {/* Score hero */}
          <View style={[dt.hero, { borderColor: `${color}30` }]}>
            <Text style={[dt.heroScore, { color }]}>{item.resonance}%</Text>
            <Text style={[dt.heroLevel, { color: `${color}99` }]}>{level} Rezonans</Text>
          </View>

          <View style={dt.divider} />

          {/* Dream */}
          <View style={dt.section}>
            <Text style={dt.sLabel}>RÜYA</Text>
            <Text style={dt.dateTag}>{item.dreamDate}</Text>
            <Text style={dt.dreamTxt}>{item.dream}</Text>
          </View>

          {/* Time gap bridge */}
          <View style={dt.bridge}>
            <View style={dt.bridgeLine} />
            <View style={dt.bridgePill}>
              <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.35)" />
              <Text style={dt.bridgeTxt}>{item.timeGap} sonra</Text>
            </View>
            <View style={dt.bridgeLine} />
          </View>

          {/* Event */}
          <View style={dt.section}>
            <Text style={dt.sLabel}>GERÇEKLEŞEN OLAY</Text>
            <Text style={dt.dateTag}>{item.eventDate}</Text>
            <Text style={dt.eventTxt}>{item.event}</Text>
          </View>

          <View style={dt.divider} />

          {/* Matching keywords */}
          <View style={dt.section}>
            <Text style={dt.sLabel}>EŞLEŞİ KAVRAMLAR</Text>
            <View style={dt.tags}>
              {item.matchingKeywords.map(kw => (
                <View key={kw} style={[dt.tag, { borderColor: `${color}40`, backgroundColor: `${color}10` }]}>
                  <Text style={[dt.tagTxt, { color }]}>{kw}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={dt.divider} />

          {/* Disclaimer */}
          <View style={dt.section}>
            <View style={dt.disclaimerBox}>
              <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.25)" />
              <Text style={dt.disclaimerTxt}>
                Bu eşleşme doğrulanmış kehanet değil, sembolik benzerlik analizidir.
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
  hero:          { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 8, marginHorizontal: 24, marginTop: 24, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)' },
  heroScore:     { fontSize: 52, fontWeight: '900', lineHeight: 56 },
  heroLevel:     { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  divider:       { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 24, marginTop: 8 },
  section:       { paddingHorizontal: 24, paddingVertical: 22, gap: 10 },
  sLabel:        { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  dateTag:       { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: 'rgba(255,255,255,0.35)' },
  dreamTxt:      { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.84)', lineHeight: 23, fontStyle: 'italic' },
  eventTxt:      { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },
  bridge:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 24, marginVertical: 4 },
  bridgeLine:    { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  bridgePill:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  bridgeTxt:     { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  tags:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tag:           { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  tagTxt:        { fontSize: 13, fontWeight: '700' },
  disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  disclaimerTxt: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.32)', lineHeight: 19 },
});
