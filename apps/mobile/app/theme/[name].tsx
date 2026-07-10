import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getSignalsToday } from '@/api/signals.api';
import { EMOTION_LABEL } from '@/utils/dreamLanguage';
import type { DreamSignals, SignalItem } from '@/types/signal.types';

// ── Static maps (mirrored from explore.tsx) ───────────────────────────────────

const THEME_TR: Record<string, string> = {
  transformation: 'Dönüşüm', threshold: 'Eşik', flying: 'Uçuş',
  falling: 'Düşüş', pursuit: 'Takip', loss: 'Kayıp',
  reunion: 'Kavuşma', discovery: 'Keşif', confrontation: 'Yüzleşme',
  protection: 'Koruma', entrapment: 'Sıkışma', exposure: 'Açığa Çıkma',
  chase: 'Kovalama', water: 'Su', fire: 'Ateş',
  descent: 'İniş', ascent: 'Yükseliş', school: 'Okul',
  death: 'Ölüm', birth: 'Doğum', journey: 'Yolculuk',
};

const SYMBOL_TR: Record<string, string> = {
  threshold: 'Eşik', shadow: 'Gölge', flood: 'Sel', abyss: 'Uçurum',
  guide: 'Rehber', labyrinth: 'Labirent', door: 'Kapı', mirror_self: 'Ayna',
  tree: 'Ağaç', water: 'Su', key: 'Anahtar', light: 'Işık', fire: 'Ateş',
  flying: 'Uçuş', falling: 'Düşüş', sea: 'Deniz', old_house: 'Eski Ev',
  animal: 'Hayvan', child: 'Çocuk', chase: 'Takip', vehicle: 'Araç',
  transformation: 'Dönüşüm',
};

const ARCHETYPE_TR: Record<string, string> = {
  shadow: 'Gölge', anima: 'Anima', animus: 'Animus',
  wise_elder: 'Bilge', trickster: 'Düzenbaz', guide: 'Rehber',
  hero: 'Kahraman', child: 'İlahi Çocuk', great_mother: 'Büyük Ana',
  explorer: 'Kaşif', guardian: 'Koruyucu',
};

const ARCHETYPE_EMOJI: Record<string, string> = {
  shadow: '🌑', anima: '🌸', animus: '⚡', wise_elder: '🌿',
  trickster: '🎭', guide: '🌟', hero: '🦅', child: '✨',
  great_mother: '🌙', explorer: '🧭', guardian: '🛡️',
};

const THEME_DESC: Record<string, string> = {
  transformation: 'Köklü değişimin ve yeniden doğuşun deneyimi. Kim olduğunun dönüştüğünü hissettiğin rüyalar.',
  threshold:      'İki dünya arasındaki geçiş anı. Karar noktasında bekleyen bilinç.',
  flying:         'Yer çekiminden ve sınırlamalardan kurtuluşun sembolik özgürlüğü.',
  falling:        'Kontrol kaybının en ham biçimi. Bilinmeyene doğru serbest düşüşün korkusu.',
  pursuit:        'Kaçınılmaz olanla yüzleşmeme. Geçmişin ya da geleceğin takibi.',
  loss:           'Neyin yitirildiğinin ağır bilinciyle yaşanan yas, özlem ve boşluk.',
  reunion:        'Ayrılığın yarattığı özlemin kavuşmayla kapandığı derin duygusal an.',
  discovery:      'Bilinmeyenin kapısını açmak. Sürpriz, merak ve aydınlanma.',
  confrontation:  'Yüzleşmenin kaçınılmazlığı. İç ve dış çatışmanın doruğu.',
  protection:     'Sevilen şeyleri tehditten sakınma içgüdüsü. Koruyuculuk dürtüsü.',
  entrapment:     'Çıkış yolu bulamama. Sıkışmışlık, çaresizlik ve tünelin sonundaki karanlık.',
  exposure:       'Gizlinin açığa çıkması. Savunmasız kalma ve çıplaklık korkusu.',
  chase:          'Hem kaçan hem kovalayan olmak. Hız, baskı ve kaçış.',
  water:          'Bilinçaltının en derin metaforu. Duygusal akış ve dönüşüm suyun içinde.',
  fire:           'Tutkuyu, yıkımı ve yeniden doğuşu kucaklayan ilk ve son element.',
  descent:        'Karanlığa, bilinçaltına ve korkuya doğru zorunlu iniş.',
  ascent:         'Yükselme, aydınlanma ve üstesinden gelmenin rüya hali.',
  death:          'Sonlanmanın ve yeniden başlangıcın derin sembolik döngüsü.',
  birth:          'Her şeyin başladığı yer. Yeniden doğuş ve sonsuz olasılıkların kapısı.',
  journey:        'İç ve dış yolculuğun bilinçte bıraktığı derin iz.',
};

const THEME_PSYCHOLOGICAL: Record<string, string> = {
  transformation: `Kolektif bilinçdışında dönüşüm, bütünleşme sürecinin simgesidir. Kendiliğin doğası, eski kalıplardan sıyrılarak yeni biçimler alır. Bu rüyalar genellikle hayatta kritik geçiş dönemlerine işaret eder.`,
  threshold:      `Eşik, karar noktasının sembolik temsilidir. İki farklı durumu birbirinden ayıran bu sınır, psikolojide geçiş ritüellerinin merkezi kavramıdır. Geçiş törenlerindeki ara durum bu temayla örtüşür.`,
  flying:         `Uçuş rüyaları genellikle bilinçdışındaki özgürlük arzusunu ya da durumların üzerinde kontrol sahibi olma isteğini yansıtır. Libidinal enerjiyle ya da spiritüel yükselişle ilişkilendirilir.`,
  falling:        `Düşüş rüyaları evrensel ve en yaygın rüya türlerinden biridir. Kontrol kaybı, güvensizlik ve kaygının sembolik dili olarak yorumlanır. Yerçekimine teslim olmayla ilgili bilinçdışı mekanizmaları gösterir.`,
  pursuit:        `Takip rüyaları, kaçınılan şeyin içsel bir yüzleşme talebi olduğunu simgeler. Arketip anlamda Gölge figürünün peşinden koşmasını temsil eder; bilinçaltında bastırılan enerjilerin geri dönüşüdür.`,
  loss:           `Kayıp rüyaları, yas süreçlerini veya hayatın bir döneminin kapandığını işler. Bağlanma nesnesinin geçici ya da kalıcı kaybının bilinçdışı düzlemde işlenmesidir.`,
  reunion:        `Kavuşma, ayrılıktan sonra bütünleşmenin arketip deneyimidir. Psikolojik anlamda, uzun süredir baskılanmış ya da ihmal edilmiş bir parçanın benliğe geri döndüğünü simgeler.`,
  discovery:      `Keşif rüyaları, bilinçdışının araştırma ve genişleme dürtüsünü yansıtır. Yeni bir şeyin bulunması çoğunlukla benliğin bilinmeyen potansiyellerinin ortaya çıkmasını temsil eder.`,
  confrontation:  `Yüzleşme, baskılanmış enerjilerin gün yüzüne çıkmasıdır. Kolektif bilinçdışı teorisinde bu entegrasyon sürecinin özüdür: Gölge ile karşılaşmadan bütünleşme olmaz.`,
  protection:     `Koruma rüyaları, temel bağlanma ihtiyaçlarını ve tehdit karşısındaki savunma mekanizmalarını yansıtır. Sevilen nesneyi koruma içgüdüsü, psikolojik bağlanma teorisinin merkezindedir.`,
  water:          `Su, bilinçdışının en evrensel sembolüdür. Kolektif bilinçdışını, duyguları ve dönüşümün akışkan doğasını temsil eder. Okyanuslar benliğin sınırsızlığını, göller ise iç dünyayı simgeler.`,
  fire:           `Ateş, tutku, yıkım ve yeniden doğuşun arketipal sembolüdür. Simyasal gelenekte arınarak yanma sürecini simgeler. Hem yaratır hem yok eder.`,
  death:          `Ölüm rüyaları nadiren gerçek ölümü simgeler; daha çok bir dönemin kapanmasını, dönüşümü ya da eski kimliğin sona ermesini temsil eder. Kolektif bilinçdışındaki en güçlü dönüşüm arketipidir.`,
  birth:          `Doğum, yeniden başlangıcın ve sonsuz potansiyelin sembolüdür. Psikolojik anlamda yeni bir bilinç düzeyinin ya da benlik halinin doğuşunu temsil eder.`,
  journey:        `Yolculuk, bireyleşme sürecinin en temel metaforudur. Her yolculuk aynı zamanda iç dünyada bir keşiftir; varış noktası değil, yol önem taşır.`,
  descent:        `İniş rüyaları bilinçdışının derinliklerine yapılan yolculuğu simgeler. Katabasis olarak bilinen bu süreç, antik mitolojiden modern psikolojiye uzanan spiritüel geleneklerde dönüşümün ön koşuludur.`,
  ascent:         `Yükseliş, aydınlanma ve özgürleşmenin sembolidir. Mitolojide kahramanların zaferi, psikolojide ise benliğin daha yüksek bir bütünleşme düzeyine ulaşmasını temsil eder.`,
  entrapment:     `Sıkışma rüyaları, çıkış yolu bulunamayan bilinçdışı kalıpları simgeler. Bireyin gerçekten ya da algısal olarak içinde kıstırıldığı durumları psikolojik düzlemde yansıtır.`,
  exposure:       `Açığa çıkma, mahremiyet ve savunmasızlık kaygısının simgesidir. Gözetlenme korkusu veya gerçeğin gün yüzüne çıkacağı endişesi bu temayla ilişkilidir.`,
  chase:          `Kovalama, hem kaçanın hem de koşanın aynı bilinçdışı enerjinin iki kutbu olduğunu gösterir. Genellikle yüzleşilmeyen bir iç çatışmanın sembolik dışavurumudur.`,
  school:         `Okul rüyaları, değerlendirme kaygısını, yeterliliği ve toplumsal beklentileri yansıtır. Hazırlıksız yakalanma korkusu, en evrensel arketip deneyimlerinden biridir.`,
};

const THEME_RELATED: Record<string, { emotions: string[]; symbols: string[] }> = {
  transformation: { emotions: ['wonder', 'hope', 'fear'],   symbols: ['fire', 'threshold', 'mirror_self'] },
  threshold:      { emotions: ['anxiety', 'wonder', 'awe'], symbols: ['door', 'key', 'bridge'] },
  flying:         { emotions: ['joy', 'wonder', 'peace'],   symbols: ['flying', 'light'] },
  falling:        { emotions: ['fear', 'anxiety'],          symbols: ['falling', 'abyss'] },
  pursuit:        { emotions: ['fear', 'despair'],          symbols: ['chase', 'shadow'] },
  loss:           { emotions: ['grief', 'longing'],         symbols: ['threshold', 'shadow', 'tree'] },
  reunion:        { emotions: ['joy', 'longing', 'peace'],  symbols: ['light', 'door'] },
  discovery:      { emotions: ['wonder', 'awe'],            symbols: ['key', 'door', 'light'] },
  confrontation:  { emotions: ['fear', 'anger'],            symbols: ['shadow', 'mirror_self', 'abyss'] },
  protection:     { emotions: ['love', 'fear'],             symbols: ['guide', 'tree', 'old_house'] },
  water:          { emotions: ['peace', 'longing', 'awe'],  symbols: ['water', 'sea', 'flood'] },
  fire:           { emotions: ['passion', 'fear'],          symbols: ['fire', 'light'] },
  death:          { emotions: ['fear', 'peace', 'wonder'],  symbols: ['threshold', 'door', 'shadow'] },
  journey:        { emotions: ['wonder', 'longing'],        symbols: ['vehicle', 'door', 'guide'] },
};

const THEME_ARCHETYPES: Record<string, string[]> = {
  discovery:      ['explorer', 'child', 'guide', 'wise_elder'],
  transformation: ['hero', 'trickster', 'shadow'],
  confrontation:  ['shadow', 'animus', 'hero'],
  journey:        ['explorer', 'guide', 'wise_elder'],
  threshold:      ['hero', 'guide', 'guardian'],
  protection:     ['guardian', 'great_mother', 'wise_elder'],
  loss:           ['anima', 'shadow', 'great_mother'],
  reunion:        ['anima', 'great_mother', 'child'],
  water:          ['anima', 'great_mother'],
  fire:           ['animus', 'hero'],
  birth:          ['great_mother', 'child'],
  death:          ['shadow', 'wise_elder'],
  ascent:         ['hero', 'animus'],
  descent:        ['shadow', 'trickster'],
  exposure:       ['shadow', 'trickster'],
  entrapment:     ['trickster', 'guardian'],
  pursuit:        ['shadow', 'hero'],
  flying:         ['explorer', 'hero'],
  falling:        ['shadow', 'anima'],
  school:         ['child', 'wise_elder'],
};

// ── Utility ───────────────────────────────────────────────────────────────────

function findSignal(signals: SignalItem[], name: string): SignalItem | undefined {
  return signals.find(s => s.name === name);
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ThemeDetailScreen() {
  const router        = useRouter();
  const { name }      = useLocalSearchParams<{ name: string }>();

  const { data: signals } = useQuery<DreamSignals>({
    queryKey: ['signals', 'today'],
    queryFn:  getSignalsToday,
    staleTime: 10 * 60 * 1000,
  });

  const liveTheme   = signals ? findSignal(signals.themes   ?? [], name) : undefined;
  const liveArchs   = signals?.archetypes ?? [];
  const liveSymbols = signals?.symbols    ?? [];

  const trName      = (THEME_TR[name]   ?? name).toUpperCase();
  const desc        = THEME_DESC[name];
  const psych       = THEME_PSYCHOLOGICAL[name];
  const related     = THEME_RELATED[name];
  const archetypes  = THEME_ARCHETYPES[name] ?? [];

  const isRising    = liveTheme?.trend === 'rising' || liveTheme?.trend === 'new';
  const isNew       = liveTheme?.trend === 'new';

  // Related symbols from tonight's live data — filter to those in THEME_RELATED
  const relatedSymbolNames = new Set(related?.symbols ?? []);
  const liveRelatedSymbols = liveSymbols.filter(s => relatedSymbolNames.has(s.name));

  // Related archetypes from tonight's live data
  const archSet   = new Set(archetypes);
  const liveArchNames = liveArchs.filter(a => archSet.has(a.name));

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Pressable style={s.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
        <Text style={s.backText}>Temalar</Text>
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Identity block — meaning FIRST ── */}
        <View style={s.identityBlock}>
          <Text style={s.eyebrow}>TEMA KİMLİĞİ</Text>
          <View style={s.accentLine} />
          <Text style={s.themeName}>{trName}</Text>
          {desc && <Text style={s.desc}>{desc}</Text>}
        </View>

        <View style={s.sep} />

        {/* ── Psychological meaning ── */}
        {psych && (
          <>
            <View style={s.section}>
              <Text style={s.sectionLabel}>PSİKOLOJİK ANLAM</Text>
              <Text style={s.psychText}>{psych}</Text>
            </View>
            <View style={s.sep} />
          </>
        )}

        {/* ── Tonight's pulse — data comes AFTER meaning ── */}
        {liveTheme && (
          <>
            <View style={s.section}>
              <Text style={s.sectionLabel}>BU GECEKİ YOĞUNLUK</Text>
              <View style={s.pulseRow}>
                <View style={s.pulseStatus}>
                  <View style={[s.pulseDot, { backgroundColor: isNew ? '#FBBF24' : '#34D399' }]} />
                  <Text style={[s.pulseStatusText, { color: isNew ? '#FBBF24' : '#34D399' }]}>
                    {isNew ? 'İLK GECE' : 'AKTİF'}
                  </Text>
                </View>
                <Text style={s.pulseCount}>{liveTheme.count} rüya</Text>
                {isRising && liveTheme.trendPct > 0 && (
                  <View style={s.trendBadge}>
                    <Ionicons name="trending-up" size={10} color="#34D399" />
                    <Text style={s.trendBadgeText}>+{liveTheme.trendPct}%</Text>
                  </View>
                )}
              </View>
              <Text style={s.trendNote}>
                {isNew
                  ? 'Bu tema bugün kolektif bilinçte ilk kez yüzeye çıkıyor.'
                  : isRising
                    ? 'Bu tema bugün normalin üzerinde yoğunluk gösteriyor.'
                    : 'Bu tema bu gece aktif, ama sakin seyrediyor.'}
              </Text>
            </View>
            <View style={s.sep} />
          </>
        )}

        {/* ── Connected emotions ── */}
        {related?.emotions && related.emotions.length > 0 && (
          <>
            <View style={s.section}>
              <Text style={s.sectionLabel}>BAĞLI DUYGULAR</Text>
              <View style={s.emotionList}>
                {related.emotions.map(e => (
                  <View key={e} style={s.emotionItem}>
                    <View style={s.emotionDot} />
                    <Text style={s.emotionName}>{EMOTION_LABEL[e] ?? e}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={s.sep} />
          </>
        )}

        {/* ── Connected symbols ── */}
        {related?.symbols && related.symbols.length > 0 && (
          <>
            <View style={s.section}>
              <Text style={s.sectionLabel}>BAĞLI SEMBOLLER</Text>
              <View style={s.symbolList}>
                {related.symbols.map(sym => {
                  const live = liveRelatedSymbols.find(ls => ls.name === sym);
                  return (
                    <View key={sym} style={s.symbolItem}>
                      <Text style={s.symbolName}>{SYMBOL_TR[sym] ?? sym}</Text>
                      {live && (
                        <Text style={s.symbolCount}>{live.count} rüya</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={s.sep} />
          </>
        )}

        {/* ── Connected archetypes ── */}
        {archetypes.length > 0 && (
          <>
            <View style={s.section}>
              <Text style={s.sectionLabel}>BAĞLI ARKETİPLER</Text>
              <View style={s.archList}>
                {archetypes.map(arch => {
                  const live      = liveArchNames.find(a => a.name === arch);
                  const trArch    = ARCHETYPE_TR[arch] ?? arch;
                  const emoji     = ARCHETYPE_EMOJI[arch] ?? '◆';
                  const isActive  = !!live;
                  return (
                    <Pressable
                      key={arch}
                      style={({ pressed }) => [s.archCard, { opacity: pressed ? 0.78 : 1 }]}
                      onPress={() => router.push(`/archetype/${arch}` as any)}
                    >
                      <Text style={s.archEmoji}>{emoji}</Text>
                      <View style={s.archBody}>
                        <Text style={s.archName}>{trArch}</Text>
                        {isActive && live && (
                          <Text style={s.archLive}>{live.count} rüyada aktif</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.22)" />
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={s.sep} />
          </>
        )}

        {/* ── Trend signal ── */}
        {liveTheme && (
          <>
            <View style={s.section}>
              <Text style={s.sectionLabel}>TREND DURUMU</Text>
              <View style={s.trendRow}>
                <Ionicons
                  name={
                    liveTheme.trend === 'rising' || liveTheme.trend === 'new'
                      ? 'trending-up'
                      : liveTheme.trend === 'falling'
                        ? 'trending-down'
                        : 'remove'
                  }
                  size={18}
                  color={
                    liveTheme.trend === 'rising' || liveTheme.trend === 'new'
                      ? '#34D399'
                      : liveTheme.trend === 'falling'
                        ? '#F87171'
                        : 'rgba(255,255,255,0.25)'
                  }
                />
                <Text style={s.trendLabel}>
                  {liveTheme.trend === 'new'     ? 'İlk beliriş'  :
                   liveTheme.trend === 'rising'  ? 'Yükseliyor'   :
                   liveTheme.trend === 'falling' ? 'Azalıyor'     :
                   'Sabit seyrediyor'}
                </Text>
                {liveTheme.trendPct > 0 && (
                  <Text style={[s.trendPct, {
                    color: liveTheme.trend === 'falling' ? '#F87171' : '#34D399',
                  }]}>
                    {liveTheme.trend === 'falling' ? '-' : '+'}{liveTheme.trendPct}%
                  </Text>
                )}
              </View>
            </View>
            <View style={s.sep} />
          </>
        )}

        {/* ── Discover CTA ── */}
        <View style={s.ctaBlock}>
          <Pressable
            style={({ pressed }) => [s.cta, { opacity: pressed ? 0.80 : 1 }]}
            onPress={() => router.push('/(tabs)/explore' as any)}
          >
            <Text style={s.ctaText}>Bu Temayı Kolektifte Keşfet</Text>
            <Ionicons name="compass-outline" size={16} color="#A78BFA" />
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  back:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 14 },
  backText:    { fontSize: 13, color: Colors.textSecondary },

  // Identity
  identityBlock: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 30 },
  eyebrow:       { fontSize: 9, fontWeight: '900', letterSpacing: 2.8, color: 'rgba(167,139,250,0.42)', marginBottom: 16 },
  accentLine:    { width: 28, height: 1.5, backgroundColor: 'rgba(167,139,250,0.28)', marginBottom: 24 },
  themeName:     { fontSize: 44, fontWeight: '900', color: 'rgba(255,255,255,0.94)', letterSpacing: 4, lineHeight: 52, marginBottom: 18 },
  desc:          { fontSize: 16, color: 'rgba(255,255,255,0.62)', lineHeight: 26 },

  sep:          { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 24, marginVertical: 0 },
  section:      { paddingHorizontal: 24, paddingVertical: 24, gap: 14 },
  sectionLabel: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },

  // Psychological
  psychText:    { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 24 },

  // Tonight's pulse
  pulseRow:       { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pulseStatus:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pulseDot:       { width: 7, height: 7, borderRadius: 3.5 },
  pulseStatusText:{ fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  pulseCount:     { fontSize: 28, fontWeight: '900', color: 'rgba(255,255,255,0.90)' },
  trendBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  trendBadgeText: { fontSize: 10, fontWeight: '800', color: '#34D399' },
  trendNote:      { fontSize: 12.5, color: 'rgba(255,255,255,0.38)', lineHeight: 19 },

  // Emotions
  emotionList:  { gap: 10 },
  emotionItem:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emotionDot:   { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(244,114,182,0.60)' },
  emotionName:  { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },

  // Symbols
  symbolList:   { gap: 8 },
  symbolItem:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  symbolName:   { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.72)' },
  symbolCount:  { fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: '600' },

  // Archetypes
  archList:   { gap: 8 },
  archCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  archEmoji:  { fontSize: 24 },
  archBody:   { flex: 1, gap: 2 },
  archName:   { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.82)' },
  archLive:   { fontSize: 10, color: '#34D399', fontWeight: '600' },

  // Trend
  trendRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trendLabel: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.80)' },
  trendPct:   { fontSize: 16, fontWeight: '900' },

  // CTA
  ctaBlock: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 8 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.22)', borderRadius: 14,
    paddingVertical: 16,
  },
  ctaText: { fontSize: 14, fontWeight: '700', color: '#A78BFA' },
});
