import React from 'react';
import {
  ActivityIndicator, Dimensions, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getPlaceIntelligence } from '@/api/places.api';
import type { DreamPlaceType, PlaceEmotion, PlaceIntelligence } from '@/types/place.types';

const SCREEN_W = Dimensions.get('window').width;

// ── Translation maps ──────────────────────────────────────────────────────────

const PLACE_TYPE_TR: Record<DreamPlaceType, string> = {
  LANDMARK: 'Önemli Yer', CITY: 'Şehir', COUNTRY: 'Ülke',
  NATURE: 'Doğa', HOTEL: 'Otel', RESTAURANT: 'Restoran',
  CAFE: 'Kafe', STREET: 'Sokak', BUILDING: 'Bina', UNKNOWN: 'Yer',
};

const PLACE_COLOR: Record<DreamPlaceType, string> = {
  LANDMARK: '#FBBF24', CITY: '#60A5FA', COUNTRY: '#34D399',
  NATURE: '#34D399', HOTEL: '#A78BFA', RESTAURANT: '#F472B6',
  CAFE: '#F472B6', STREET: '#94A3B8', BUILDING: '#A78BFA', UNKNOWN: '#94A3B8',
};

const EMOTION_TR: Record<string, string> = {
  joy: 'Sevinç', fear: 'Korku', anxiety: 'Kaygı', sadness: 'Üzüntü',
  wonder: 'Merak', peace: 'Huzur', despair: 'Umutsuzluk', love: 'Sevgi',
  anger: 'Öfke', hope: 'Umut', awe: 'Huşu', confusion: 'Şaşkınlık',
  excitement: 'Heyecan', guilt: 'Suçluluk', shame: 'Utanç', longing: 'Özlem',
  grief: 'Yas', pride: 'Gurur', trust: 'Güven', disgust: 'Tiksinti',
};

const SYMBOL_TR: Record<string, string> = {
  threshold: 'Eşik', shadow: 'Gölge', flood: 'Sel', abyss: 'Uçurum',
  guide: 'Rehber', labyrinth: 'Labirent', door: 'Kapı', mirror_self: 'Ayna',
  tree: 'Ağaç', water: 'Su', key: 'Anahtar', light: 'Işık', fire: 'Ateş',
  flying: 'Uçuş', falling: 'Düşüş', sea: 'Deniz', old_house: 'Eski Ev',
  animal: 'Hayvan', child: 'Çocuk', chase: 'Takip', vehicle: 'Araç',
  transformation: 'Dönüşüm',
};

const THEME_TR: Record<string, string> = {
  transformation: 'Dönüşüm', threshold: 'Eşik', flying: 'Uçuş',
  falling: 'Düşüş', pursuit: 'Takip', loss: 'Kayıp',
  reunion: 'Kavuşma', discovery: 'Keşif', confrontation: 'Yüzleşme',
  protection: 'Koruma', entrapment: 'Sıkışma', exposure: 'Açığa Çıkma',
  chase: 'Kovalama', water: 'Su', fire: 'Ateş',
  descent: 'İniş', ascent: 'Yükseliş', school: 'Okul',
  death: 'Ölüm', birth: 'Doğum', journey: 'Yolculuk',
};

const ARCHETYPE_TR: Record<string, string> = {
  shadow: 'Gölge', anima: 'Anima', animus: 'Animus',
  wise_elder: 'Bilge', trickster: 'Düzenbaz', guide: 'Rehber',
  hero: 'Kahraman', child: 'İlahi Çocuk', great_mother: 'Büyük Ana',
  explorer: 'Kaşif', guardian: 'Koruyucu',
};

const ARCHETYPE_EMOJI: Record<string, string> = {
  shadow: '🌑', anima: '🌙', animus: '⚡', wise_elder: '🦉',
  trickster: '🃏', guide: '🧭', hero: '🦅', child: '✨',
  great_mother: '🌿', explorer: '🗺', guardian: '🛡',
};

// ── Symbolic identity ─────────────────────────────────────────────────────────

const PLACE_SYMBOLIC: Record<string, { title: string; meaning: string }> = {
  istanbul:      { title: 'Kavuşmaların Şehri', meaning: 'Doğu ve batı bilinçlerinin kesiştiği kadim kavşak noktası. Her köşede iki dünyanın arasında kalmak.' },
  ankara:        { title: 'Düzenin Kalesi',     meaning: 'Otorite ve yapısal düzenin bilinçdışı yansıması. Kurumların ve kural koyucuların şehri.' },
  izmir:         { title: 'Deniz Kapısı',       meaning: 'Bilinç ile bilinçdışı arasındaki kıyı şeridi. Özgürlüğe ve ufka açılan kapı.' },
  paris:         { title: 'Erişilmez İdeal',    meaning: 'Hayal edilen ama asla tam olarak ulaşılamayan mükemmellik. Uzaktan bakılan, ama hiç hissedilemeyen şehir.' },
  london:        { title: 'Gizemli Büyükkent',  meaning: 'Sis içinde kaybolmuş kimlik ve belirsiz beklentiler. Tarihin birikiminin yarattığı ağırlık.' },
  rome:          { title: 'Geçmişin Mirası',    meaning: 'Kolektif tarihin ve derinlere uzanan köklerin mekânı. Zamanın katmanlaştığı şehir.' },
  roma:          { title: 'Geçmişin Mirası',    meaning: 'Kolektif tarihin ve derinlere uzanan köklerin mekânı. Zamanın katmanlaştığı şehir.' },
  tokyo:         { title: 'Düzen ve Kaos',      meaning: 'Modernliğin ve geleneğin arasında kalan bilinç. Sonsuz bir labirentin içinde huzur arayışı.' },
  berlin:        { title: 'Bölünmüş Bellek',    meaning: 'Tarihsel travma ve yeniden doğuşun şehri. Yıkılanın üzerine inşa edilen yeni kimlik.' },
  new_york:      { title: 'Sonsuz Olasılıklar', meaning: 'Başarı, kaygı ve sonsuz potansiyelin metropolü. Her şeyin mümkün, ama hiçbir şeyin garantisiz olduğu yer.' },
  new_york_city: { title: 'Sonsuz Olasılıklar', meaning: 'Başarı, kaygı ve sonsuz potansiyelin metropolü. Her şeyin mümkün, ama hiçbir şeyin garantisiz olduğu yer.' },
  eiffel_tower:  { title: 'Erişilmez İdeal',    meaning: 'Uzaktan bakan, hiç ulaşamayan. Hayranlığın mimarisi. Bakışın taşa ve demire dönüştüğü yer.' },
  machu_picchu:  { title: 'Kayıp Bilgelik',     meaning: 'Unutulmuş bilgeliğin ve kadim ruhun sığınağı. Yükseklikte saklı olan sır.' },
  pyramids:      { title: 'Ölümsüzlüğe Adım',  meaning: 'Zamanın ötesinde bir varoluşun taş hali. Kolektif ölümsüzlük özleminin anıtı.' },
  colosseum:     { title: 'Gücün Kalıntısı',    meaning: 'Kolektif bilinçte hâlâ çınlayan tarihsel güç. Çökmüş ama silinmemiş iktidar.' },
  taj_mahal:     { title: 'Ölümsüz Aşk',        meaning: 'Sevginin taşa dönüşmüş hali. Kayıp ve kalıcılık bir arada.' },
  amazon:        { title: 'İlk Orman',           meaning: 'Medeniyetten önceki vahşi ve arkaik yaşam. Kolektif belleğin en eski katmanı.' },
};

const PLACE_TYPE_MEANING: Record<DreamPlaceType, { title: string; meaning: string }> = {
  CITY:       { title: 'Kentsel Bilinçdışı',    meaning: 'Toplumsal anksiyete ve kentsel deneyimin kolektif sahası. Milyonların bilinçdışının paylaşıldığı zemin.' },
  COUNTRY:    { title: 'Kolektif Kimlik',        meaning: 'Köken, aidiyet ve kültürel belleğin coğrafyası. Nereden geldiğimizin ve kime ait olduğumuzun zeminini oluşturur.' },
  LANDMARK:   { title: 'Kolektif Simge',         meaning: 'Milyonlarca bireyin hayal gücünde yaşayan arketip imge. Fiziksel varlığından çok zihinsel ağırlığıyla var olur.' },
  HOTEL:      { title: 'Geçiciliğin Alanı',      meaning: 'Ne buraya ait ne oraya. Kimlik eşiğinde varoluş. Geçici ama derin izler bırakan mekânlar.' },
  RESTAURANT: { title: 'Paylaşımın Ritüeli',     meaning: 'Beslenme, bağlantı ve paylaşımın arketip mekânı. Sofranın etrafındaki kolektif deneyim.' },
  CAFE:       { title: 'Düşüncenin Sığınağı',   meaning: 'Geçici dinginlik ve derin sohbetin alanı. Dışarıya yakın ama içeride koruyucu.' },
  STREET:     { title: 'Yolculuğun Arasında',    meaning: 'Hedefler arasındaki belirsiz geçiş mekânı. Ne kalkış noktası ne varış yeri.' },
  BUILDING:   { title: 'Gizli Katmanlar',        meaning: 'Yapısal düzenin arkasındaki keşfedilmemiş odalar. Her kat, bilinçte ayrı bir anlam taşır.' },
  NATURE:     { title: 'Arkaik Alan',             meaning: 'İçgüdüsel ve kolektif belleğin yaşayan mekânı. Medeniyetten önceki bilincin sığındığı yer.' },
  UNKNOWN:    { title: 'Bilinmeyenin Çağrısı',   meaning: 'Tanımsız yerler bilinçdışının sınırlarını işaret eder. İsimlendirilemeyen yer, tanımlanamayan his.' },
};

function placeSymbolic(name: string, type: DreamPlaceType): { title: string; meaning: string } {
  const key = name.toLowerCase()
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o')
    .replace(/ı/g, 'i').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return PLACE_SYMBOLIC[key] ?? PLACE_TYPE_MEANING[type];
}

// ── Emotion color (warm→cool by valence) ─────────────────────────────────────

function emotionColor(emotion: string): string {
  const warm = ['joy', 'love', 'hope', 'excitement', 'pride', 'trust', 'wonder'];
  const cool = ['fear', 'anxiety', 'sadness', 'despair', 'guilt', 'shame', 'grief', 'anger'];
  if (warm.includes(emotion)) return '#34D399';
  if (cool.includes(emotion)) return '#60A5FA';
  return 'rgba(255,255,255,0.55)';
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PlaceDetailScreen() {
  const router  = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();

  const decodedName = name ? decodeURIComponent(name) : '';

  const { data: place, isLoading, isError } = useQuery<PlaceIntelligence | null>({
    queryKey: ['place', 'intelligence', decodedName],
    queryFn:  () => getPlaceIntelligence(decodedName),
    staleTime: 10 * 60 * 1000,
    enabled:  !!decodedName,
  });

  if (isLoading) {
    return (
      <View style={s.loadWrap}>
        <ActivityIndicator color="#A78BFA" />
        <Text style={s.loadText}>{decodedName}</Text>
      </View>
    );
  }

  if (isError || !place) {
    return (
      <View style={s.loadWrap}>
        <Ionicons name="globe-outline" size={32} color="rgba(255,255,255,0.18)" />
        <Text style={s.loadText}>Bu mekân için veri yok</Text>
        <Pressable style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.70 : 1 }]} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Geri dön</Text>
        </Pressable>
      </View>
    );
  }

  const sym        = placeSymbolic(place.name, place.type);
  const typeColor  = PLACE_COLOR[place.type];
  const subtitle   = [place.city, place.country].filter(Boolean).join(', ');
  const topEmotion = place.emotions.sort((a, b) => b.count - a.count)[0] ?? null;

  const lucidPct     = Math.round(place.lucidRatio * 100);
  const nightmarePct = Math.round(place.nightmareRatio * 100);

  const topSymbols    = place.symbols.slice(0, 6);
  const topThemes     = place.themes.slice(0, 5);
  const topArchetypes = place.archetypes.slice(0, 4);
  const maxEmotionCnt = place.emotions[0]?.count ?? 1;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Pressable style={({ pressed }) => [s.back, { opacity: pressed ? 0.70 : 1 }]} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.55)" />
        <Text style={s.backText}>Geri</Text>
      </Pressable>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── Identity Hero ──────────────────────────────────────────────── */}
      <View style={s.hero}>
        <View style={s.heroTypeRow}>
          <View style={[s.heroTypeChip, { borderColor: `${typeColor}30` }]}>
            <Text style={[s.heroTypeText, { color: typeColor }]}>{PLACE_TYPE_TR[place.type].toUpperCase()}</Text>
          </View>
        </View>
        <Text style={s.heroName}>{place.name.toUpperCase()}</Text>
        {subtitle ? <Text style={s.heroSubtitle}>{subtitle}</Text> : null}
        <Text style={[s.heroSymTitle, { color: typeColor }]}>"{sym.title}"</Text>
        <Text style={s.heroMeaning}>{sym.meaning}</Text>
      </View>

      <View style={s.sep} />

      {/* ── Tonight's Pulse ────────────────────────────────────────────── */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>BU GECENİN NABZI</Text>
        <View style={s.pulseRow}>
          <View style={s.pulseStat}>
            <Text style={[s.pulseNumber, { color: typeColor }]}>{place.dreamCount}</Text>
            <Text style={s.pulseStatLabel}>rüya</Text>
          </View>
          {lucidPct > 0 && (
            <View style={s.pulseStat}>
              <Text style={[s.pulseNumber, { color: '#A78BFA' }]}>{lucidPct}%</Text>
              <Text style={s.pulseStatLabel}>lucid</Text>
            </View>
          )}
          {nightmarePct > 0 && (
            <View style={s.pulseStat}>
              <Text style={[s.pulseNumber, { color: '#F87171' }]}>{nightmarePct}%</Text>
              <Text style={s.pulseStatLabel}>karabasan</Text>
            </View>
          )}
          <View style={s.pulseStat}>
            <Text style={[s.pulseNumber, { color: 'rgba(255,255,255,0.55)' }]}>
              {Math.round(place.dreamScore)}
            </Text>
            <Text style={s.pulseStatLabel}>etki skoru</Text>
          </View>
        </View>
        {topEmotion && (
          <Text style={s.pulseEmotionNote}>
            Dominant his: <Text style={{ color: emotionColor(topEmotion.emotion) }}>
              {EMOTION_TR[topEmotion.emotion] ?? topEmotion.emotion}
            </Text>
          </Text>
        )}
      </View>

      <View style={s.sep} />

      {/* ── Emotional Landscape ────────────────────────────────────────── */}
      {place.emotions.length > 0 && (
        <>
          <View style={s.section}>
            <Text style={s.sectionLabel}>DUYGUSAL YOĞUNLUK</Text>
            <Text style={s.sectionSub}>
              Bu mekân kolektif bilinçte hangi duyguları tetikliyor.
            </Text>
            <View style={s.emotionList}>
              {place.emotions.slice(0, 6).map((e: PlaceEmotion) => {
                const ratio  = e.count / maxEmotionCnt;
                const color  = emotionColor(e.emotion);
                return (
                  <View key={e.emotion} style={s.emotionRow}>
                    <Text style={[s.emotionName, { opacity: 0.45 + ratio * 0.55 }]}>
                      {EMOTION_TR[e.emotion] ?? e.emotion}
                    </Text>
                    <View style={s.emotionTrack}>
                      <View style={[s.emotionBar, { width: `${ratio * 100}%` as `${number}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[s.emotionPct, { color }]}>{e.percentage}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
          <View style={s.sep} />
        </>
      )}

      {/* ── Connected Symbols ──────────────────────────────────────────── */}
      {topSymbols.length > 0 && (
        <>
          <View style={s.section}>
            <Text style={s.sectionLabel}>SEMBOLLER</Text>
            <Text style={s.sectionSub}>Bu mekânda kolektif bilinçle birlikte yüzeye çıkan imgeler.</Text>
            <View style={s.symbolFlow}>
              {topSymbols.map((sym, i) => (
                <Text
                  key={sym.symbol}
                  style={[s.symbolWord, {
                    fontSize: i === 0 ? 22 : i < 2 ? 17 : 13,
                    opacity:  i === 0 ? 0.90 : i < 3 ? 0.62 : 0.38,
                  }]}
                >
                  {SYMBOL_TR[sym.symbol] ?? sym.symbol}
                  {i < topSymbols.length - 1 ? '  ' : ''}
                </Text>
              ))}
            </View>
          </View>
          <View style={s.sep} />
        </>
      )}

      {/* ── Connected Themes ───────────────────────────────────────────── */}
      {topThemes.length > 0 && (
        <>
          <View style={s.section}>
            <Text style={s.sectionLabel}>TEMA BAĞLANTILARI</Text>
            <Text style={s.sectionSub}>Bu mekânın açığa çıkardığı kolektif hikâyeler.</Text>
            <View style={s.themeList}>
              {topThemes.map((t, i) => (
                <Pressable
                  key={t.theme}
                  style={({ pressed }) => [s.themeRow, { opacity: pressed ? 0.72 : 1 }]}
                  onPress={() => router.push(`/theme/${t.theme}` as any)}
                >
                  <Text style={[s.themeName, {
                    fontSize: i === 0 ? 18 : i < 2 ? 15 : 13,
                    opacity:  i === 0 ? 0.88 : i < 3 ? 0.62 : 0.40,
                  }]}>
                    {(THEME_TR[t.theme] ?? t.theme).toUpperCase()}
                  </Text>
                  <Text style={s.themeCount}>{t.count}</Text>
                  <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.20)" />
                </Pressable>
              ))}
            </View>
          </View>
          <View style={s.sep} />
        </>
      )}

      {/* ── Connected Archetypes ───────────────────────────────────────── */}
      {topArchetypes.length > 0 && (
        <>
          <View style={s.section}>
            <Text style={s.sectionLabel}>ARKETİPSEL ENERJİ</Text>
            <Text style={s.sectionSub}>Bu mekânın tetiklediği psişik figürler.</Text>
            <View style={s.archRow}>
              {topArchetypes.map(a => {
                const emoji = ARCHETYPE_EMOJI[a.archetype] ?? '◎';
                const label = ARCHETYPE_TR[a.archetype]   ?? a.archetype;
                return (
                  <Pressable
                    key={a.archetype}
                    style={({ pressed }) => [s.archBlock, { opacity: pressed ? 0.72 : 1 }]}
                    onPress={() => router.push(`/archetype/${a.archetype}` as any)}
                  >
                    <Text style={s.archEmoji}>{emoji}</Text>
                    <Text style={s.archName}>{label}</Text>
                    <Text style={s.archCount}>{a.count} rüya</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={s.sep} />
        </>
      )}

      {/* ── Discover CTA ───────────────────────────────────────────────── */}
      <View style={s.section}>
        <Pressable
          style={({ pressed }) => [s.ctaBlock, { opacity: pressed ? 0.80 : 1 }]}
          onPress={() => router.push('/(tabs)/explore')}
        >
          <View style={s.ctaInner}>
            <Text style={s.ctaTitle}>Bilinç Atlasına Dön</Text>
            <Text style={s.ctaSub}>Kolektif coğrafyayı keşfetmeye devam et</Text>
          </View>
          <Ionicons name="compass-outline" size={22} color="#A78BFA" />
        </Pressable>
      </View>

      <View style={{ height: 48 }} />
    </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#02010F' },
  content: { paddingTop: 60 },

  loadWrap: { flex: 1, backgroundColor: '#02010F', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadText: { fontSize: 16, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  backBtn:  { marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  backBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.50)', fontWeight: '600' },

  back:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 20, marginBottom: 24 },
  backText: { fontSize: 14, color: 'rgba(255,255,255,0.40)', fontWeight: '600' },

  // Hero
  hero:          { paddingHorizontal: 24, paddingBottom: 28, gap: 12 },
  heroTypeRow:   { flexDirection: 'row' },
  heroTypeChip:  { borderWidth: 1, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  heroTypeText:  { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  heroName:      { fontSize: 38, fontWeight: '900', color: 'rgba(255,255,255,0.92)', letterSpacing: 1.5, lineHeight: 44 },
  heroSubtitle:  { fontSize: 13, color: 'rgba(255,255,255,0.32)', fontWeight: '500', marginTop: -4 },
  heroSymTitle:  { fontSize: 16, fontWeight: '700', fontStyle: 'italic', marginTop: 4 },
  heroMeaning:   { fontSize: 14, color: 'rgba(255,255,255,0.50)', lineHeight: 23 },

  sep:           { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 24 },
  section:       { paddingHorizontal: 24, paddingVertical: 24, gap: 14 },
  sectionLabel:  { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sectionSub:    { fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 19, marginTop: -6 },

  // Pulse
  pulseRow:       { flexDirection: 'row', gap: 0 },
  pulseStat:      { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 14, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.06)' },
  pulseNumber:    { fontSize: 28, fontWeight: '900', lineHeight: 32 },
  pulseStatLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.30)', fontWeight: '700', letterSpacing: 0.5 },
  pulseEmotionNote:{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: '500', marginTop: 4 },

  // Emotions
  emotionList: { gap: 11, marginTop: 4 },
  emotionRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emotionName: { width: 90, fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.90)' },
  emotionTrack:{ flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 1, overflow: 'hidden' },
  emotionBar:  { height: '100%', borderRadius: 1, opacity: 0.70 },
  emotionPct:  { width: 36, fontSize: 11, fontWeight: '700', textAlign: 'right' },

  // Symbols
  symbolFlow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'baseline' },
  symbolWord: { fontWeight: '800', color: 'rgba(255,255,255,0.90)' },

  // Themes
  themeList: { gap: 0 },
  themeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  themeName:  { flex: 1, fontWeight: '900', color: 'rgba(255,255,255,0.88)', letterSpacing: 0.8 },
  themeCount: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.30)', marginRight: 10 },

  // Archetypes
  archRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  archBlock: {
    alignItems: 'center', gap: 7, paddingVertical: 18, paddingHorizontal: 14,
    backgroundColor: '#05041A', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167,139,250,0.14)', minWidth: (SCREEN_W - 48 - 10) / 2 - 0.5,
  },
  archEmoji: { fontSize: 28 },
  archName:  { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.80)', textAlign: 'center' },
  archCount: { fontSize: 10, color: 'rgba(255,255,255,0.30)', fontWeight: '600' },

  // CTA
  ctaBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 18,
    borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.18)', backgroundColor: 'rgba(167,139,250,0.05)',
  },
  ctaInner: { flex: 1, gap: 3 },
  ctaTitle: { fontSize: 15, fontWeight: '800', color: 'rgba(255,255,255,0.80)' },
  ctaSub:   { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
});
