import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getSignalsToday } from '@/api/signals.api';
import { Colors } from '@/constants/colors';
import { EMOTION_LABEL } from '@/utils/dreamLanguage';

// ── Static archetype data ─────────────────────────────────────────────────────

const ARCHETYPE_TR: Record<string, string> = {
  shadow: 'Gölge', anima: 'Anima', animus: 'Animus',
  wise_elder: 'Bilge', trickster: 'Düzenbaz', guide: 'Rehber',
  hero: 'Kahraman', child: 'İlahi Çocuk', great_mother: 'Büyük Ana',
  explorer: 'Kaşif', guardian: 'Koruyucu',
};

const ARCHETYPE_EN: Record<string, string> = {
  shadow: 'The Shadow', anima: 'The Anima', animus: 'The Animus',
  wise_elder: 'The Sage', trickster: 'The Trickster', guide: 'The Guide',
  hero: 'The Hero', child: 'The Divine Child', great_mother: 'The Great Mother',
  explorer: 'The Explorer', guardian: 'The Guardian',
};

const ARCHETYPE_SUBTITLE: Record<string, string> = {
  shadow:      'Karanlığın Yüzü',   anima: 'Dişilin Sesi',      animus: 'Erilin Gücü',
  wise_elder:  'Bilgeliğin Bekçisi', trickster: 'Kaosun Ruhu',  guide: 'Yolun Işığı',
  hero:        'İradenin Zirvesi',  child: 'Masumiyetin Özü',
  great_mother:'Yaşamın Kaynağı',   explorer: 'Sınırların Ötesi', guardian: 'Değerlerin Kalkanı',
};

const ARCHETYPE_LONG_DESC: Record<string, string> = {
  shadow:      'Kabul edilmemiş her şeyin barındığı yer. Reddedilen, bastırılan ve aydınlığa çıkmaya çalışan bilinçaltı yüzü. Onunla yüzleşmek, bütünleşmenin ilk adımıdır.',
  anima:       'Eril bilinçteki dişil ruh. Duygu, sezgi ve yaratıcılığın iç sesi. Rüyalarda kadın figürleri aracılığıyla konuşur — her biri bir mesaj taşır.',
  animus:      'Dişil bilinçteki eril enerji. Mantık, yapı ve öz ifadenin içsel gücü. Erkek figürleri aracılığıyla kendini gösterir.',
  wise_elder:  'Deneyimin billurlaştığı form. Rehberlik, içgörü ve derin anlayışın simgesi. Yaşlı figürler, mağaralar ve gizemli sesler aracılığıyla belirir.',
  trickster:   'Kuralları kıran, sınırları zorlayan yaratıcı kaosun ruhu. Saçma görünen şeylerin ardında dönüştürücü bir bilgelik gizlidir.',
  guide:       'Karanlıkta yolu gösterenin simgesi. Güvenilir varlıklar, ışıklar ve yönlendirici sesler aracılığıyla belirir. Yolculuğun habercisi.',
  hero:        'Zorlukları aşmaya yönelik irade. Mücadele, test ve kazanım döngüsünü yaşayan bilinç. Her zaferde biraz daha güçlenir.',
  child:       'Masumiyetin ve yeniden başlangıcın simgesi. Huşu, merak ve keşfin saf hali. Rüyalarda kayıp çocuk ya da özgür çocuk olarak belirir.',
  great_mother:'Besleyen, dönüştüren ve yutucu olan. Yaşamın kaynağı ve yeniden dönüşünü simgeler. Toprak, deniz ve büyük figürlerle belirir.',
  explorer:    'Ufkun ötesindeki bilinmeyeni arayan bilinç. Sınırların çağrısına cevap veren ruh. Her yeni kapı yeni bir boyutu açar.',
  guardian:    'Sınırları ve değerleri koruyan güç. Tehdit karşısında savunmaya geçen bilinç. Duvarlar, kalkanlar ve bekçi figürleri aracılığıyla belirir.',
};

const ARCHETYPE_EMOJI: Record<string, string> = {
  shadow: '🌑', anima: '🌸', animus: '⚡', wise_elder: '🌿',
  trickster: '🎭', guide: '🌟', hero: '🦅', child: '✨',
  great_mother: '🌙', explorer: '🧭', guardian: '🛡️',
};

const ARCHETYPE_COLOR: Record<string, string> = {
  shadow:      '#6366F1', anima: '#EC4899', animus: '#3B82F6',
  wise_elder:  '#10B981', trickster: '#F59E0B', guide: '#8B5CF6',
  hero:        '#EF4444', child: '#F472B6', great_mother: '#7C3AED',
  explorer:    '#059669', guardian: '#1D4ED8',
};

const ARCHETYPE_EMOTIONS: Record<string, string[]> = {
  shadow:      ['fear', 'grief', 'anxiety'],
  anima:       ['love', 'longing', 'wonder'],
  animus:      ['passion', 'anger', 'hope'],
  wise_elder:  ['peace', 'awe', 'wonder'],
  trickster:   ['joy', 'anxiety', 'wonder'],
  guide:       ['peace', 'hope', 'wonder'],
  hero:        ['fear', 'hope', 'courage'],
  child:       ['joy', 'wonder', 'fear'],
  great_mother:['love', 'peace', 'grief'],
  explorer:    ['wonder', 'joy', 'awe'],
  guardian:    ['love', 'fear', 'peace'],
};

const ARCHETYPE_SYMBOLS: Record<string, string[]> = {
  shadow:      ['shadow', 'abyss', 'mirror_self'],
  anima:       ['water', 'mirror_self', 'tree'],
  animus:      ['fire', 'threshold', 'vehicle'],
  wise_elder:  ['tree', 'light', 'old_house'],
  trickster:   ['labyrinth', 'door', 'mirror_self'],
  guide:       ['light', 'key', 'door'],
  hero:        ['fire', 'bridge', 'threshold'],
  child:       ['light', 'door', 'child'],
  great_mother:['tree', 'water', 'sea'],
  explorer:    ['door', 'key', 'vehicle'],
  guardian:    ['bridge', 'threshold', 'old_house'],
};

const ARCHETYPE_THEMES: Record<string, string[]> = {
  shadow:      ['confrontation', 'exposure', 'descent'],
  anima:       ['reunion', 'water', 'loss'],
  animus:      ['confrontation', 'ascent', 'fire'],
  wise_elder:  ['journey', 'discovery', 'protection'],
  trickster:   ['exposure', 'transformation', 'entrapment'],
  guide:       ['journey', 'discovery', 'threshold'],
  hero:        ['transformation', 'confrontation', 'ascent'],
  child:       ['discovery', 'protection', 'birth'],
  great_mother:['protection', 'water', 'birth'],
  explorer:    ['journey', 'discovery', 'threshold'],
  guardian:    ['protection', 'confrontation', 'threshold'],
};

const ARCHETYPE_RELATED: Record<string, { other: string; bond: string }[]> = {
  shadow:      [{ other: 'hero',         bond: 'İlerlemenin kaçınılmaz iç diyalogu' }, { other: 'trickster', bond: 'Karanlığın iki dönüştürücü yüzü' }],
  anima:       [{ other: 'animus',       bond: 'Birbirini arayan karşıt güçler' },     { other: 'great_mother', bond: 'Dişil enerjinin iki ayrı tonu' }],
  animus:      [{ other: 'anima',        bond: 'Birbirini arayan karşıt güçler' },     { other: 'hero',     bond: 'Erilin iki farklı yüzü' }],
  wise_elder:  [{ other: 'child',        bond: 'Bilgelik masumiyette yeniden doğar' }, { other: 'guide',    bond: 'Bilgeliğin eyleme dönüşümü' }],
  trickster:   [{ other: 'shadow',       bond: 'Karanlığın iki dönüştürücü yüzü' },   { other: 'child',    bond: 'Kuralsız oyunun saf ve dönüştürücü hali' }],
  guide:       [{ other: 'wise_elder',   bond: 'Bilgeliğin eyleme dönüşümü' },         { other: 'explorer', bond: 'Arayış yolu bulunca anlam kazanır' }],
  hero:        [{ other: 'shadow',       bond: 'İlerlemenin kaçınılmaz iç diyalogu' }, { other: 'guardian', bond: 'İlerleme ile koruma arasındaki gerilim' }],
  child:       [{ other: 'great_mother', bond: 'Kaynağın besleyici sarması' },          { other: 'wise_elder', bond: 'Bilgelik masumiyette yeniden doğar' }],
  great_mother:[{ other: 'child',        bond: 'Kaynağın besleyici sarması' },          { other: 'anima',    bond: 'Dişil enerjinin iki ayrı tonu' }],
  explorer:    [{ other: 'guide',        bond: 'Arayış yolu bulunca anlam kazanır' },  { other: 'child',    bond: 'Merakın iki farklı, derin ifadesi' }],
  guardian:    [{ other: 'hero',         bond: 'İlerleme ile koruma arasındaki gerilim' }, { other: 'great_mother', bond: 'Koruma içgüdüsünün iki farklı kökeni' }],
};

const SYMBOL_TR: Record<string, string> = {
  threshold: 'Eşik', shadow: 'Gölge', flood: 'Sel', abyss: 'Uçurum',
  guide: 'Rehber', labyrinth: 'Labirent', door: 'Kapı', mirror_self: 'Ayna',
  tree: 'Ağaç', water: 'Su', key: 'Anahtar', light: 'Işık', fire: 'Ateş',
  flying: 'Uçuş', falling: 'Düşüş', sea: 'Deniz', old_house: 'Eski Ev',
  animal: 'Hayvan', child: 'Çocuk', chase: 'Takip', vehicle: 'Araç',
  transformation: 'Dönüşüm', bridge: 'Köprü',
};

const THEME_TR: Record<string, string> = {
  transformation: 'Dönüşüm', threshold: 'Eşik', flying: 'Uçuş',
  falling: 'Düşüş', pursuit: 'Takip', loss: 'Kayıp',
  reunion: 'Kavuşma', discovery: 'Keşif', confrontation: 'Yüzleşme',
  protection: 'Koruma', entrapment: 'Sıkışma', exposure: 'Açığa Çıkma',
  chase: 'Kovalama', water: 'Su', fire: 'Ateş',
  descent: 'İniş', ascent: 'Yükseliş', birth: 'Doğum', journey: 'Yolculuk',
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ArchetypeDetailScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();

  const { data: signals, isLoading } = useQuery({
    queryKey: ['signals', 'today'], queryFn: getSignalsToday, staleTime: 5 * 60 * 1000,
  });

  if (!name || !ARCHETYPE_TR[name]) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Colors.textMuted, fontSize: 14 }}>Arketip bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = ARCHETYPE_TR[name];
  const enName      = ARCHETYPE_EN[name]    ?? name;
  const subtitle    = ARCHETYPE_SUBTITLE[name];
  const longDesc    = ARCHETYPE_LONG_DESC[name];
  const emoji       = ARCHETYPE_EMOJI[name] ?? '🌙';
  const color       = ARCHETYPE_COLOR[name] ?? '#A78BFA';
  const emotions    = ARCHETYPE_EMOTIONS[name]  ?? [];
  const symbols     = ARCHETYPE_SYMBOLS[name]   ?? [];
  const themes      = ARCHETYPE_THEMES[name]    ?? [];
  const related     = ARCHETYPE_RELATED[name]   ?? [];

  const liveSignal  = (signals?.archetypes ?? []).find(a => a.name === name);
  const isActive    = (liveSignal?.count ?? 0) > 0;
  const isRising    = liveSignal?.trend === 'rising';
  const isNew       = liveSignal?.trend === 'new';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Pressable style={s.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
        <Text style={s.backText}>Geri</Text>
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── IDENTITY HERO ──────────────────────────────────────────────── */}
        <View style={s.identitySection}>
          <Text style={s.heroEmoji}>{emoji}</Text>
          <Text style={[s.enName, { color: `${color}70` }]}>{enName.toUpperCase()}</Text>
          <Text style={s.heroName}>{displayName}</Text>
          {subtitle && <Text style={[s.heroSubtitle, { color }]}>{subtitle}</Text>}
          <View style={[s.identityDivider, { backgroundColor: `${color}30` }]} />
          {longDesc && <Text style={s.heroDesc}>{longDesc}</Text>}
        </View>

        {/* ── TONIGHT'S ACTIVITY ─────────────────────────────────────────── */}
        {isLoading ? (
          <View style={s.activityLoading}>
            <ActivityIndicator size="small" color={color} />
          </View>
        ) : (
          <View style={[s.activitySection, { borderColor: `${color}22` }]}>
            <View style={[s.activityBar, { backgroundColor: color }]} />
            <View style={s.activityBody}>
              <View style={s.activityStatus}>
                <View style={[s.statusDot, { backgroundColor: isActive ? '#34D399' : 'rgba(255,255,255,0.18)' }]} />
                <Text style={[s.statusText, { color: isActive ? '#34D399' : 'rgba(255,255,255,0.35)' }]}>
                  {isActive ? `Bu gece ${liveSignal!.count} rüyacının bilincinde aktif` : 'Bu gece sessiz — bir sonraki uyanışını bekliyor'}
                </Text>
              </View>
              {isActive && (
                <View style={s.activityStats}>
                  {isNew && (
                    <View style={[s.badge, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
                      <Text style={[s.badgeText, { color }]}>BU GECE UYANDI</Text>
                    </View>
                  )}
                  {isRising && (
                    <View style={s.trendRow}>
                      <Ionicons name="trending-up" size={12} color="#34D399" />
                      <Text style={s.trendText}>+{liveSignal!.trendPct}% büyüme</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── EMOTIONAL PROFILE ──────────────────────────────────────────── */}
        {emotions.length > 0 && (
          <View style={s.profileSection}>
            <View style={s.profileHeader}>
              <View style={[s.profileAccent, { backgroundColor: '#F472B6' }]} />
              <Text style={s.profileTitle}>DUYGUSAL PROFİL</Text>
            </View>
            <Text style={s.profileSub}>Bu arketip bu duyguları uyandırır</Text>
            <View style={s.chipRow}>
              {emotions.map(e => (
                <View key={e} style={[s.chip, { borderColor: 'rgba(244,114,182,0.30)', backgroundColor: 'rgba(244,114,182,0.07)' }]}>
                  <Text style={[s.chipLabel, { color: '#F472B6' }]}>DUYGU</Text>
                  <Text style={[s.chipName, { color: 'rgba(255,255,255,0.85)' }]}>{EMOTION_LABEL[e] ?? e}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── SYMBOL PROFILE ─────────────────────────────────────────────── */}
        {symbols.length > 0 && (
          <View style={s.profileSection}>
            <View style={s.profileHeader}>
              <View style={[s.profileAccent, { backgroundColor: '#60A5FA' }]} />
              <Text style={s.profileTitle}>SEMBOL PROFİLİ</Text>
            </View>
            <Text style={s.profileSub}>Bu arketip bu semboller aracılığıyla belirir</Text>
            <View style={s.chipRow}>
              {symbols.map(sym => (
                <View key={sym} style={[s.chip, { borderColor: 'rgba(96,165,250,0.30)', backgroundColor: 'rgba(96,165,250,0.07)' }]}>
                  <Text style={[s.chipLabel, { color: '#60A5FA' }]}>SEMBOL</Text>
                  <Text style={[s.chipName, { color: 'rgba(255,255,255,0.85)' }]}>{SYMBOL_TR[sym] ?? sym}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── DREAM THEMES ───────────────────────────────────────────────── */}
        {themes.length > 0 && (
          <View style={s.profileSection}>
            <View style={s.profileHeader}>
              <View style={[s.profileAccent, { backgroundColor: '#A78BFA' }]} />
              <Text style={s.profileTitle}>RÜYA TEMALARIbağlı</Text>
            </View>
            <Text style={s.profileSub}>Bu arketiple en çok örtüşen rüya temaları</Text>
            <View style={s.themeList}>
              {themes.map(t => (
                <View key={t} style={s.themeRow}>
                  <View style={[s.themeDot, { backgroundColor: '#A78BFA' }]} />
                  <Text style={s.themeName}>{THEME_TR[t] ?? t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── RELATED ARCHETYPES ─────────────────────────────────────────── */}
        {related.length > 0 && (
          <View style={s.profileSection}>
            <View style={s.profileHeader}>
              <View style={[s.profileAccent, { backgroundColor: '#FBBF24' }]} />
              <Text style={s.profileTitle}>BAĞLANTILI ARKETİPLER</Text>
            </View>
            <Text style={s.profileSub}>Bu kuvvetin yankılandığı diğer bilinçaltı güçleri</Text>
            <View style={s.relatedList}>
              {related.map(rel => {
                const relColor = ARCHETYPE_COLOR[rel.other] ?? '#A78BFA';
                const relEmoji = ARCHETYPE_EMOJI[rel.other] ?? '🌙';
                const relName  = ARCHETYPE_TR[rel.other]    ?? rel.other;
                return (
                  <Pressable
                    key={rel.other}
                    style={({ pressed }) => [s.relatedCard, { borderColor: `${relColor}22`, opacity: pressed ? 0.80 : 1 }]}
                    onPress={() => router.push(`/archetype/${rel.other}` as any)}
                  >
                    <View style={[s.relatedLeft, { backgroundColor: `${relColor}14` }]}>
                      <Text style={s.relatedEmoji}>{relEmoji}</Text>
                    </View>
                    <View style={s.relatedBody}>
                      <Text style={[s.relatedName, { color: relColor }]}>{relName}</Text>
                      <Text style={s.relatedBond}>{rel.bond}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── DISCOVER IN DREAMS CTA ─────────────────────────────────────── */}
        <View style={s.discoverSection}>
          <View style={[s.discoverBorder, { borderColor: `${color}25` }]}>
            <Text style={s.discoverTitle}>Bu Güçle Bağlantılı Rüyaları Keşfet</Text>
            <Text style={s.discoverSub}>
              {displayName} arketipinin belirdiği rüyaları ara ve diğer rüyacılarla bağlantı kur.
            </Text>
            <Pressable
              style={({ pressed }) => [s.discoverBtn, { backgroundColor: color, opacity: pressed ? 0.82 : 1 }]}
              onPress={() => router.push(`/(tabs)/explore` as any)}
            >
              <Ionicons name="search-outline" size={14} color="rgba(255,255,255,0.90)" />
              <Text style={s.discoverBtnText}>{displayName.toUpperCase()} RÜYALARINI ARA</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },

  backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 14 },
  backText:   { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },

  // Identity hero
  identitySection: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 6 },
  heroEmoji:       { fontSize: 72, marginBottom: 10 },
  enName:          { fontSize: 9, fontWeight: '900', letterSpacing: 2.4 },
  heroName:        { fontSize: 44, fontWeight: '900', color: 'rgba(255,255,255,0.96)', letterSpacing: -1.5, lineHeight: 50, marginTop: 2 },
  heroSubtitle:    { fontSize: 13, fontWeight: '600', letterSpacing: 0.2, marginTop: 2 },
  identityDivider: { width: '100%', height: 1, marginVertical: 18 },
  heroDesc:        { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 24, fontWeight: '400', letterSpacing: -0.1 },

  // Tonight's activity
  activityLoading: { height: 60, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginBottom: 10 },
  activitySection: {
    marginHorizontal: 20, marginBottom: 10, borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', overflow: 'hidden',
  },
  activityBar:    { width: 3 },
  activityBody:   { flex: 1, padding: 14, gap: 8 },
  activityStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot:      { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  statusText:     { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 18 },
  activityStats:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge:          { borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText:      { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 },
  trendRow:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trendText:      { fontSize: 12, fontWeight: '800', color: '#34D399' },

  // Profile sections
  profileSection: { marginHorizontal: 20, marginBottom: 8, paddingTop: 24 },
  profileHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  profileAccent:  { width: 3, height: 14, borderRadius: 1.5 },
  profileTitle:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2, color: 'rgba(255,255,255,0.30)' },
  profileSub:     { fontSize: 11.5, color: 'rgba(255,255,255,0.42)', marginBottom: 14, fontWeight: '400', lineHeight: 17 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:    { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 3 },
  chipLabel:{ fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  chipName: { fontSize: 13, fontWeight: '700' },

  themeList: { gap: 10 },
  themeRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  themeDot:  { width: 5, height: 5, borderRadius: 2.5 },
  themeName: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },

  relatedList: { gap: 8 },
  relatedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#05041A', borderRadius: 14, borderWidth: 1, padding: 14,
  },
  relatedLeft:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  relatedEmoji: { fontSize: 22 },
  relatedBody:  { flex: 1, gap: 3 },
  relatedName:  { fontSize: 14, fontWeight: '800' },
  relatedBond:  { fontSize: 11, color: 'rgba(255,255,255,0.40)', lineHeight: 15 },

  // Discover CTA
  discoverSection: { marginHorizontal: 20, marginTop: 28, marginBottom: 8 },
  discoverBorder:  { borderWidth: 1, borderRadius: 18, padding: 20, gap: 10 },
  discoverTitle:   { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.88)', lineHeight: 22 },
  discoverSub:     { fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 19 },
  discoverBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, marginTop: 4 },
  discoverBtnText: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.8 },
});
