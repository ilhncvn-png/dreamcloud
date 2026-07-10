import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import {
  COLLECTIVE_SIGNALS, EVENT_MATCHES, REALIZED_DREAMS, HIGH_RESONANCE_ALERTS,
  LEVEL_COLOR, LEVEL_TR,
  type CollectiveSignal, type EventMatch, type RealizedDream, type ResonanceAlert,
} from '@/data/reality-resonance.data';

// ── Separator ─────────────────────────────────────────────────────────────────

function Sep() {
  return <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 24 }} />;
}

// ── S1: Kolektif Sinyaller ────────────────────────────────────────────────────

function KolektifSinyaller() {
  const router = useRouter();
  return (
    <View style={ks.wrap}>
      <Text style={ks.sLabel}>KOLEKTİF SİNYALLER</Text>
      <Text style={ks.sSub}>Son 48 saatte tespit edilen anormal örüntüler.</Text>
      {COLLECTIVE_SIGNALS.length === 0 ? (
        <Text style={ks.emptyTxt}>Henüz kolektif alanda güçlü bir sinyal yok.</Text>
      ) : (
        <View style={ks.chips}>
          {COLLECTIVE_SIGNALS.map((s: CollectiveSignal) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [ks.chip, { opacity: pressed ? 0.72 : 1 }]}
              onPress={() => { router.push(`/reality-resonance/signal/${s.id}`); }}
              hitSlop={4}
            >
              <Text style={ks.chipIcon}>{s.icon}</Text>
              <Text style={ks.chipTxt}>{s.text}</Text>
              <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.22)" />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
const ks = StyleSheet.create({
  wrap:     { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sSub:     { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.20)' },
  chipIcon: { fontSize: 18 },
  chipTxt:  { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.78)' },
  emptyTxt: { fontSize: 13, color: 'rgba(255,255,255,0.30)', lineHeight: 20, fontStyle: 'italic' },
});

// ── S2: Olay Eşleşmeleri ──────────────────────────────────────────────────────

function OlayEslesmesiCard({ item }: { item: EventMatch }) {
  const router = useRouter();
  const color = LEVEL_COLOR[item.level] ?? '#6C63FF';
  const level = LEVEL_TR[item.level]   ?? '';
  return (
    <Pressable
      style={({ pressed }) => [oe.card, { opacity: pressed ? 0.78 : 1 }]}
      onPress={() => { router.push(`/reality-resonance/event/${item.id}`); }}
    >
      <View style={oe.block}>
        <Text style={oe.blockTag}>RÜYA SİNYALİ</Text>
        <Text style={oe.blockTxt}>{item.dreamSignal}</Text>
      </View>
      <View style={oe.connector}>
        <View style={[oe.connLine,  { backgroundColor: `${color}40` }]} />
        <View style={[oe.connBadge, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
          <Text style={[oe.connScore, { color }]}>{item.resonance}%</Text>
          <Text style={[oe.connLevel, { color: `${color}99` }]}>{level}</Text>
        </View>
        <View style={[oe.connLine,  { backgroundColor: `${color}40` }]} />
      </View>
      <View style={oe.block}>
        <Text style={oe.blockTag}>GERÇEK DÜNYA</Text>
        <Text style={oe.blockTxt}>{item.realEvent}</Text>
      </View>
      <View style={oe.chevronRow}>
        <Text style={oe.detailHint}>Rezonans detayını gör</Text>
        <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.22)" />
      </View>
    </Pressable>
  );
}

function OlayEslesmeler() {
  return (
    <View style={oe.wrap}>
      <Text style={oe.sLabel}>OLAY EŞLEŞMELERİ</Text>
      <Text style={oe.sSub}>Kolektif rüya sinyalleriyle örtüşen gerçek dünya olayları.</Text>
      {EVENT_MATCHES.length === 0 ? (
        <Text style={oe.emptyTxt}>Gerçek dünya ile eşleşen yeni bir örüntü bulunamadı.</Text>
      ) : (
        <View style={oe.list}>
          {EVENT_MATCHES.map(item => <OlayEslesmesiCard key={item.id} item={item} />)}
        </View>
      )}
    </View>
  );
}
const oe = StyleSheet.create({
  wrap:       { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:     { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sSub:       { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  list:       { gap: 0 },
  card:       { paddingVertical: 20, gap: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  block:      { gap: 6 },
  blockTag:   { fontSize: 8, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(255,255,255,0.28)' },
  blockTxt:   { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.80)', lineHeight: 20 },
  connector:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  connLine:   { flex: 1, height: 1 },
  connBadge:  { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', gap: 2 },
  connScore:  { fontSize: 18, fontWeight: '900', lineHeight: 20 },
  connLevel:  { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  chevronRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: -4 },
  detailHint: { fontSize: 10, color: 'rgba(255,255,255,0.22)', fontWeight: '600' },
  emptyTxt:   { fontSize: 13, color: 'rgba(255,255,255,0.30)', lineHeight: 20, fontStyle: 'italic' },
});

// ── S3: Gerçekleşen Rüyalar ───────────────────────────────────────────────────

function GerceklesenItem({ item, isLast }: { item: RealizedDream; isLast: boolean }) {
  const router = useRouter();
  const color = LEVEL_COLOR[item.level] ?? '#6C63FF';
  const level = LEVEL_TR[item.level]   ?? '';
  return (
    <Pressable
      style={({ pressed }) => [gr.item, { opacity: pressed ? 0.78 : 1 }]}
      onPress={() => { router.push(`/reality-resonance/${item.id}`); }}
    >
      <View style={gr.timeline}>
        <View style={[gr.dot, { backgroundColor: color }]} />
        {!isLast && <View style={gr.connector} />}
      </View>
      <View style={gr.body}>
        <Text style={gr.dateLabel}>{item.dreamDate}</Text>
        <Text style={gr.dreamTxt}>{item.dream}</Text>
        <View style={gr.midGap} />
        <Text style={gr.dateLabel}>{item.eventDate}</Text>
        <Text style={gr.eventTxt}>{item.event}</Text>
        <View style={gr.footer}>
          <View style={[gr.badge, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
            <Text style={[gr.badgeScore, { color }]}>{item.resonance}%</Text>
            <Text style={[gr.badgeLevel, { color: `${color}99` }]}>{level} Rezonans</Text>
          </View>
          <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.22)" />
        </View>
      </View>
    </Pressable>
  );
}

function GerceklesenRuyalar() {
  return (
    <View style={gr.wrap}>
      <Text style={gr.sLabel}>GERÇEKLEŞEN RÜYALAR</Text>
      <Text style={gr.sSub}>Kolektif bilinç tarafından öngörülen olaylar.</Text>
      <View style={gr.list}>
        {REALIZED_DREAMS.map((item, i) => (
          <GerceklesenItem key={item.id} item={item} isLast={i === REALIZED_DREAMS.length - 1} />
        ))}
      </View>
      <Text style={gr.disclaimer}>
        * Bu veriler demonstrasyon amaçlıdır. Gerçek zamanlı veri için API entegrasyonu gereklidir.
      </Text>
    </View>
  );
}
const gr = StyleSheet.create({
  wrap:       { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sLabel:     { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sSub:       { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  list:       { gap: 0 },
  item:       { flexDirection: 'row', gap: 16, minHeight: 100 },
  timeline:   { alignItems: 'center', width: 10, paddingTop: 4 },
  dot:        { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  connector:  { flex: 1, width: 1, backgroundColor: 'rgba(167,139,250,0.20)', marginTop: 4 },
  body:       { flex: 1, paddingBottom: 24, gap: 5 },
  dateLabel:  { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: 'rgba(255,255,255,0.35)' },
  dreamTxt:   { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.82)', lineHeight: 20, fontStyle: 'italic' },
  midGap:     { height: 10 },
  eventTxt:   { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 19 },
  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  badgeScore: { fontSize: 16, fontWeight: '900' },
  badgeLevel: { fontSize: 10, fontWeight: '700' },
  disclaimer: { fontSize: 10, color: 'rgba(255,255,255,0.20)', lineHeight: 16, fontStyle: 'italic', marginTop: 4 },
});

// ── S4: Bildirim Merkezi ──────────────────────────────────────────────────────

function AlertRow({ item }: { item: ResonanceAlert }) {
  const router = useRouter();
  const color = item.severity === 'high' ? '#FBBF24' : '#A78BFA';
  return (
    <Pressable
      style={({ pressed }) => [al.row, { opacity: pressed ? 0.72 : 1 }]}
      onPress={() => { router.push(`/reality-resonance/signal/${item.signalId}`); }}
    >
      <Ionicons name="warning-outline" size={15} color={color} style={{ opacity: 0.85, marginTop: 2 }} />
      <Text style={al.rowTxt}>{item.text}</Text>
      <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.22)" />
    </Pressable>
  );
}

function BildirimMerkezi() {
  return (
    <View style={al.wrap}>
      <View style={al.headerRow}>
        <Ionicons name="radio-outline" size={11} color="rgba(167,139,250,0.65)" />
        <Text style={al.sLabel}>YÜKSEK REZONANS UYARILARI</Text>
      </View>
      <View style={al.list}>
        {HIGH_RESONANCE_ALERTS.map(item => <AlertRow key={item.id} item={item} />)}
      </View>
    </View>
  );
}
const al = StyleSheet.create({
  wrap:      { paddingHorizontal: 24, paddingVertical: 24, gap: 16, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sLabel:    { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(167,139,250,0.45)' },
  list:      { gap: 0 },
  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rowTxt:    { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.68)', lineHeight: 21 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function RealityResonanceScreen() {
  const router     = useRouter();
  const highAlerts = HIGH_RESONANCE_ALERTS.filter(a => a.severity === 'high').length;

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
          <Text style={sc.title}>Reality Resonance</Text>
          <Text style={sc.subtitle}>ANOMALİ TESPİT SİSTEMİ</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <View style={sc.summaryBar}>
        <Text style={sc.summaryTxt}>
          {`Son 72 saatte ${COLLECTIVE_SIGNALS.length} anomali, ${EVENT_MATCHES.length} olay eşleşmesi, ${highAlerts} yüksek rezonans tespit edildi.`}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sc.scroll}>
        <KolektifSinyaller />
        <Sep />
        <OlayEslesmeler />
        <Sep />
        <GerceklesenRuyalar />
        <Sep />
        <BildirimMerkezi />
      </ScrollView>
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
  summaryBar: { paddingHorizontal: 24, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  summaryTxt: { fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 18 },
  scroll:     { paddingBottom: 0 },
});
