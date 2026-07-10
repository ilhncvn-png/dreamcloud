import { Colors } from '@/constants/colors';
import type { DreamAnalysisResponse } from '@/types/analysis.types';

// ── Label maps ────────────────────────────────────────────────────────────────

export const CATEGORY_LABEL: Record<string, string> = {
  lucid:     'Lucid Rüya',
  beautiful: 'Güzel Rüya',
  nightmare: 'Kabus',
  normal:    'Rüya',
};

export const EMOTION_LABEL: Record<string, string> = {
  anxiety:    'Kaygı',
  fear:       'Korku',
  sadness:    'Hüzün',
  grief:      'Yas',
  joy:        'Neşe',
  wonder:     'Merak',
  peace:      'Huzur',
  calm:       'Sükunet',
  anger:      'Öfke',
  confusion:  'Karmaşa',
  excitement: 'Heyecan',
  nostalgia:  'Özlem',
  awe:        'Hayranlık',
  dread:      'Tedirginlik',
  serenity:   'Dinginlik',
};

export const INTENSITY_LABEL: Record<string, string> = {
  high:   'Yoğun',
  medium: 'Orta',
  low:    'Hafif',
};

// ── Theme decode ──────────────────────────────────────────────────────────────

export const THEME_DECODE: Record<string, { headline: string; body: string }> = {
  threshold:      {
    headline: 'Bir eşiği aşıyordun',
    body:     'Bilinçaltın büyük bir değişime hazırlanıyordu. Kapılar, köprüler ve geçişler bu enerjinin sembolleri.',
  },
  pursuit:        {
    headline: 'Kaçış ve takip döngüsü',
    body:     'İşlenmemiş bir gerilim bilinçaltından yüzeye çıkıyordu. Kovalayan ne olursa olsun, içinden geliyordu.',
  },
  falling:        {
    headline: 'Bırakmayı öğrenmek',
    body:     'Düşme rüyaları kontrol kaybını değil, bırakmayı simgeler. Bilinçaltın seni serbest bırakmaya davet ediyordu.',
  },
  flying:         {
    headline: 'Özgürleşme arzusu',
    body:     'Kısıtlayıcı bir durumdan çıkış arayışı. Yükselme hissi, bir alan açmak istemenden kaynaklanıyor.',
  },
  entrapment:     {
    headline: 'Çıkış arıyordun',
    body:     'Sıkışma hissi bilinçaltının bir mesajı. Gerçek hayatta bir alanda hapsolmuş hissedebilirsin.',
  },
  reunion:        {
    headline: 'Yeniden bağlanma',
    body:     'Kayıp bir bağlantı ya da özlenilen bir şeyle buluşma enerjisi. Bağ kurma ihtiyacın güçlüydü.',
  },
  loss:           {
    headline: 'Bir kaybı işliyordun',
    body:     'Bilinçaltın bir yokluğu aktif olarak çözümlüyordu. Bu rüya iyileşmenin bir parçası.',
  },
  transformation: {
    headline: 'Dönüşüm içindeydin',
    body:     'Kimliğin yeniden şekilleniyordu. Eski versiyonunla vedalaşma süreci başlamış olabilir.',
  },
  confrontation:  {
    headline: 'Yüzleşme zamanıydı',
    body:     'İçsel bir çatışmayla yüzleşiyordun. Kaçmak yerine bakmayı seçen rüyalar derin bir olgunluğun işareti.',
  },
  discovery:      {
    headline: 'Bilinmeyene açıldın',
    body:     'Merak ve keşif enerjisi güçlüydü. Henüz fark etmediğin bir kapı seni bekliyor olabilir.',
  },
  protection:     {
    headline: 'Koruma güdüsü aktifti',
    body:     'Sevdiğini koruma ya da korunma ihtiyacı ön plandaydı. Bilinçaltın bir uyarı gönderiyordu.',
  },
  exposure:       {
    headline: 'Görülme korkusuyla yüzleştin',
    body:     'Gerçek benliğinin ortaya çıkma kaygısı bu rüyayı şekillendirdi. Savunmasızlık gücün olabilir.',
  },
};

// ── Emotion decode ────────────────────────────────────────────────────────────

export const EMOTION_DECODE: Record<string, { body: string; color: string }> = {
  anxiety:    { body: 'Belirsizliğin sesi. Bir şeyden emin olmak istiyor bilinçaltın.',     color: '#F87171' },
  fear:       { body: 'İçgüdüsel bir uyarı. Bir tehlike ya da kayıp hissedildi.',           color: '#F87171' },
  sadness:    { body: 'Kayıpla barışmanın yolu. Hissetmene izin ver.',                       color: '#A78BFA' },
  grief:      { body: 'Derin bir yitime alan açıldı. Kabullenmek şifanın başlangıcı.',      color: '#A78BFA' },
  joy:        { body: 'Bilinçaltının sana hediyesi. Bu enerjiyi taşı.',                     color: '#FBBF24' },
  wonder:     { body: 'Keşfin habercisi. Merakın bu rüyayı yönlendirdi.',                   color: '#FBBF24' },
  peace:      { body: 'Derin bir uyum anı. İçsel dengen güçlüydü.',                         color: '#60A5FA' },
  calm:       { body: 'Sakinliğin içinden bir mesaj. Rüyan huzur taşıyor.',                color: '#60A5FA' },
  anger:      { body: 'Sessizce ihlal edilen bir sınır. Bilinçaltın sesini yükseltti.',     color: '#FB923C' },
  confusion:  { body: 'Entegrasyonun sancısı. Anlam geliyor — zamana bırak.',              color: '#94A3B8' },
  excitement: { body: 'Beklenti ve hazırlık enerjisi aktifti.',                              color: '#34D399' },
  nostalgia:  { body: 'Geçmişten bir mesaj. Bağlanma ve köklere dönme ihtiyacı.',          color: '#C084FC' },
  awe:        { body: 'Sonsuzlukla karşılaşmanın hissi. Büyük bir şeyin varlığı sezildi.', color: '#FBBF24' },
  dread:      { body: 'Derinlerde bekleyen bir kaygı. Bilinçaltı sinyalleri kuvvetli.',     color: '#F87171' },
  serenity:   { body: 'Nadir bir iç dinginlik. Bu rüya sana bir şey bıraktı.',             color: '#60A5FA' },
};

// ── Symbol decode ─────────────────────────────────────────────────────────────

export const SYMBOL_DECODE: Record<string, { label: string; meaning: string }> = {
  threshold:      { label: 'Eşik · Geçit',     meaning: 'Kapı ve köprü sembolizmi. Bir geçişin eşiğindesin.' },
  flood:          { label: 'Sel · Taşma',       meaning: 'Bastırılmış duygular dışa taşıyordu.' },
  shadow:         { label: 'Gölge',             meaning: 'Gölge benlik aktive oldu. Kabul edilmeyi bekleyen bir yön.' },
  abyss:          { label: 'Uçurum · Derinlik', meaning: 'Bilinmezlikle yüzleşme. Derinliklere bakmaya cesaret.' },
  guide:          { label: 'Rehber',            meaning: 'İçsel rehber arketipi ortaya çıktı. Bir yönlendirme var.' },
  transformation: { label: 'Dönüşüm',          meaning: 'Metamorfoz sinyali. Değişim süreci aktif.' },
  mirror_self:    { label: 'Ayna · Yansıma',   meaning: 'Kendinle yüzleşme. İkiz benlik ya da ayna benlik.' },
  labyrinth:      { label: 'Labirent',          meaning: 'Yol arayışı. Çıkış var ama henüz görünmüyor.' },
  water:          { label: 'Su',                meaning: 'Bilinçaltının en evrensel sembolü. Duygusal derinlik.' },
  fire:           { label: 'Ateş',              meaning: 'Dönüşüm ve arınma. Yakıcı bir enerji aktifti.' },
  animal:         { label: 'Hayvan',            meaning: 'İçgüdüsel benlik ve doğal güçler ön plandaydı.' },
  child:          { label: 'Çocuk · Masumiyet', meaning: 'İç çocuk ya da yeni başlangıç enerjisi.' },
  chase:          { label: 'Takip',             meaning: 'Kaçılan ya da yüzleşilemeyen bir şey peşinde.' },
  vehicle:        { label: 'Araç · Yolculuk',  meaning: 'Hayat yolculuğunun sembolü. Kontrol ve yön.' },
  flying:         { label: 'Uçuş',             meaning: 'Özgürleşme arzusu. Sınırları aşma enerjisi.' },
  falling:        { label: 'Düşüş',            meaning: 'Kontrolü bırakma. Bilinçaltı serbest bırakmaya davet ediyor.' },
  sea:            { label: 'Deniz · Okyanus',  meaning: 'Bilinçaltının uçsuz bucaksız derinliği.' },
  door:           { label: 'Kapı',             meaning: 'Açılmayı bekleyen bir geçiş ya da fırsat.' },
  old_house:      { label: 'Eski Ev',          meaning: 'Geçmişin izleri. Kökler ve bellek.' },
};

// ── Archetype decode ──────────────────────────────────────────────────────────

export const ARCHETYPE_DECODE: Record<string, { label: string; body: string }> = {
  shadow:       { label: 'Gölge',       body: 'Bilinçaltının kabul edilmemiş yanı bu rüyada sesini duyurdu. Gölgeyle yüzleşmek bütünleşmenin başlangıcı.' },
  anima:        { label: 'Anima',       body: 'Dişil enerji ve yaratıcılık aktifti. İçsel dengeye ve beslenmeye çağrı.' },
  animus:       { label: 'Animus',      body: 'Eril güç ve kararlılık ön plandaydı. Harekete geçme ve yön belirleme isteği.' },
  hero:         { label: 'Kahraman',    body: 'Meydan okuma ve büyüme enerjisi. Bir engeli aşacak güç içinde mevcut.' },
  trickster:    { label: 'Düzenbaz',    body: 'Kaos ve dönüşüm alanı. Kuralların kırıldığı, yeniden yazıldığı bir deneyim.' },
  wise_elder:   { label: 'Bilge',       body: 'Deneyimden gelen bilgelik. Bir cevap var — yeterince sessizleşirsen duyulur.' },
  child:        { label: 'İlahi Çocuk', body: 'Masumiyet ve yeni başlangıçlar. Henüz açılmamış bir potansiyel uyanıyor.' },
  great_mother: { label: 'Büyük Ana',   body: 'Koruma ve beslenme enerjisi. Şefkat ve güç bir arada, güvenli bir alan.' },
  explorer:     { label: 'Kaşif',       body: 'Bilinmeyen alanlara yaklaşma arzusu. Sınırları geçme ve özgürleşme öne çıkıyor.' },
  guardian:     { label: 'Koruyucu',    body: 'Sevdiklerini ya da değer verdiklerini koruma güdüsü aktif.' },
};

// ── Theme-derived archetype fallback ──────────────────────────────────────────

const THEME_TO_ARCHETYPE: Record<string, string> = {
  threshold:      'explorer',
  pursuit:        'shadow',
  falling:        'child',
  flying:         'explorer',
  entrapment:     'shadow',
  reunion:        'great_mother',
  loss:           'wise_elder',
  transformation: 'hero',
  confrontation:  'hero',
  discovery:      'explorer',
  protection:     'guardian',
  exposure:       'anima',
};

const MOVEMENT_LABEL: Record<string, string> = {
  threshold:      'Geçiş',
  pursuit:        'Kaçış',
  falling:        'Bırakma',
  flying:         'Yükseliş',
  entrapment:     'Sıkışma',
  reunion:        'Birleşme',
  loss:           'Uzaklaşma',
  transformation: 'Dönüşüm',
  confrontation:  'Yüzleşme',
  discovery:      'Keşif',
  protection:     'Koruma',
  exposure:       'Açığa Çıkma',
};

// Theme-specific connectors that bridge theme body → emotion body
const THEME_CONNECTORS: Record<string, string> = {
  threshold:      'Bu eşikte hissettiklerin de önemliydi:',
  pursuit:        'Bu kaçışın arkasında taşınan şey:',
  falling:        'Bırakırken içinde gezinen:',
  flying:         'Bu uçuşu şekillendiren içsel enerji:',
  entrapment:     'Sıkışmışlık hissini pekiştiren:',
  reunion:        'Bu yeniden buluşmayı renklediren:',
  loss:           'Kaybı işlerken içinde olan:',
  transformation: 'Bu dönüşümün içsel rengi:',
  confrontation:  'Yüzleşme anındaki bilinçaltı tonu:',
  discovery:      'Bu keşfi besleyen içsel güç:',
  protection:     'Koruma güdüsünün arkasındaki duygu:',
  exposure:       'Görülme kaygısının içindeki:',
};

// ── Helper functions ──────────────────────────────────────────────────────────

export function getMoodColor(emotion: string | null): string {
  const t = (emotion ?? '').toLowerCase();
  if (/fear|anxiety|dread/.test(t)) return '#F87171';
  if (/peace|calm|serenity/.test(t)) return '#60A5FA';
  if (/joy|wonder|awe|excitement/.test(t)) return '#FBBF24';
  if (/sad|grief|nostalgia/.test(t)) return '#A78BFA';
  if (/anger/.test(t)) return '#FB923C';
  return Colors.primary;
}

export function buildMainReadingBody(theme: string | null, emotion: string | null): string {
  const themeEntry = theme ? THEME_DECODE[theme] : null;
  const emotEntry  = emotion ? EMOTION_DECODE[emotion] : null;
  const connector  = theme ? THEME_CONNECTORS[theme] : null;

  if (themeEntry && emotEntry && connector) {
    const ebody = emotEntry.body.charAt(0).toLowerCase() + emotEntry.body.slice(1);
    return `${themeEntry.body}\n\n${connector} ${ebody}`;
  }
  if (themeEntry) return themeEntry.body;
  if (emotEntry)  return emotEntry.body;
  return 'Bu rüya derin bir içsel yolculuğun ifadesiydi.';
}

export interface ArchetypeResult {
  key: string;
  isInferred: boolean;
}

export function deriveArchetype(analysis: DreamAnalysisResponse): ArchetypeResult | null {
  const figure = analysis.figures.find(
    (f) => f.archetypeCandidate && (f.archetypeConfidence ?? 0) >= 0.5,
  );
  if (figure?.archetypeCandidate) {
    return { key: figure.archetypeCandidate, isInferred: false };
  }
  const fromTheme = analysis.primaryTheme ? THEME_TO_ARCHETYPE[analysis.primaryTheme] : null;
  if (fromTheme) {
    return { key: fromTheme, isInferred: true };
  }
  return null;
}

export interface PatternItem {
  label: string;
  value: string;
}

export function buildPatternSummary(analysis: DreamAnalysisResponse): PatternItem[] {
  const items: PatternItem[] = [];

  if (analysis.primaryTheme) {
    items.push({
      label: 'Ana Tema',
      value: THEME_DECODE[analysis.primaryTheme]?.headline ?? analysis.primaryTheme.replace(/_/g, ' '),
    });
  }

  if (analysis.primaryEmotion) {
    const intensityKey = analysis.emotionalIntensity ?? '';
    const intensityStr = INTENSITY_LABEL[intensityKey] ? ` · ${INTENSITY_LABEL[intensityKey]}` : '';
    items.push({
      label: 'Baskın Duygu',
      value: (EMOTION_LABEL[analysis.primaryEmotion] ?? analysis.primaryEmotion) + intensityStr,
    });
  }

  const topSymbol = analysis.symbols.filter((s) => s.confidence >= 0.5)[0];
  if (topSymbol) {
    items.push({
      label: 'Öne Çıkan Sembol',
      value: SYMBOL_DECODE[topSymbol.symbolCategory]?.label ?? topSymbol.symbolCategory.replace(/_/g, ' '),
    });
  }

  if (analysis.primaryTheme && MOVEMENT_LABEL[analysis.primaryTheme]) {
    items.push({
      label: 'Hareket',
      value: MOVEMENT_LABEL[analysis.primaryTheme]!,
    });
  }

  // Inner conflict from secondary theme or opposing emotions
  const secondaryTheme = analysis.themes.find((t) => !t.isPrimary);
  const secondaryEmotion = analysis.emotions.find((e) => !e.isPrimary && !e.isResidual);
  if (secondaryTheme) {
    items.push({
      label: 'İç Çatışma',
      value: THEME_DECODE[secondaryTheme.theme]?.headline ?? secondaryTheme.theme.replace(/_/g, ' '),
    });
  } else if (secondaryEmotion && analysis.primaryEmotion) {
    const l1 = EMOTION_LABEL[analysis.primaryEmotion] ?? analysis.primaryEmotion;
    const l2 = EMOTION_LABEL[secondaryEmotion.emotion] ?? secondaryEmotion.emotion;
    items.push({ label: 'İç Çatışma', value: `${l1} ile ${l2}` });
  }

  // Closing tone
  const closingEmotion = analysis.emotionalArc?.to ?? analysis.residualEmotion;
  if (closingEmotion) {
    items.push({
      label: 'Kapanış Tonu',
      value: EMOTION_LABEL[closingEmotion] ?? closingEmotion,
    });
  }

  return items;
}
