// Turkish display labels and narrative generators for dream match dimensions

// ── Label maps ────────────────────────────────────────────────────────────────

export const THEME_LABELS: Record<string, string> = {
  pursuit:        'Takip',
  threshold:      'Eşik',
  flying:         'Uçuş',
  transformation: 'Dönüşüm',
  reunion:        'Kavuşma',
  loss:           'Kayıp',
  chase:          'Kovalanma',
  falling:        'Düşme',
  water:          'Su',
  fire:           'Ateş',
  descent:        'İniş',
  ascent:         'Yükseliş',
  school:         'Okul',
  death:          'Ölüm',
  birth:          'Doğum',
  journey:        'Yolculuk',
  entrapment:     'Sıkışma',
  discovery:      'Keşif',
  confrontation:  'Yüzleşme',
  protection:     'Koruma',
  exposure:       'Açığa Çıkma',
};

export const EMOTION_LABELS: Record<string, string> = {
  fear:       'Korku',
  joy:        'Sevinç',
  peace:      'Huzur',
  loneliness: 'Yalnızlık',
  wonder:     'Merak',
  sadness:    'Hüzün',
  anger:      'Öfke',
  nostalgia:  'Özlem',
  love:       'Aşk',
  anxiety:    'Kaygı',
  excitement: 'Heyecan',
  grief:      'Yas',
  confusion:  'Karmaşa',
  calm:       'Sükunet',
  awe:        'Hayranlık',
  dread:      'Tedirginlik',
  serenity:   'Dinginlik',
};

export const SYMBOL_LABELS: Record<string, string> = {
  threshold:      'Eşik',
  shadow:         'Gölge',
  flood:          'Sel',
  abyss:          'Uçurum',
  guide:          'Rehber',
  labyrinth:      'Labirent',
  door:           'Kapı',
  mirror_self:    'Ayna',
  tree:           'Ağaç',
  water:          'Su',
  key:            'Anahtar',
  light:          'Işık',
  fire:           'Ateş',
  flying:         'Uçuş',
  falling:        'Düşüş',
  sea:            'Deniz',
  old_house:      'Eski Ev',
  animal:         'Hayvan',
  child:          'Çocuk',
  chase:          'Takip',
  vehicle:        'Araç',
  transformation: 'Dönüşüm',
};

export const LOCATION_LABELS: Record<string, string> = {
  forest:          'Orman',
  ocean:           'Okyanus',
  city:            'Şehir',
  childhood_home:  'Çocukluk Evi',
  corridor:        'Koridor',
  underground:     'Yeraltı',
  mountain:        'Dağ',
  school:          'Okul',
  hospital:        'Hastane',
  desert:          'Çöl',
  sea:             'Deniz',
  rooftop:         'Çatı',
  cave:            'Mağara',
  bridge:          'Köprü',
  unknown_city:    'Tanımsız Şehir',
  old_house:       'Eski Ev',
  temple:          'Tapınak',
  labyrinth:       'Labirent',
};

export const ARCHETYPE_LABELS: Record<string, string> = {
  shadow:       'Gölge',
  anima:        'Anima',
  animus:       'Animus',
  wise_elder:   'Bilge',
  trickster:    'Düzenbaz',
  guide:        'Rehber',
  hero:         'Kahraman',
  child:        'İlahi Çocuk',
  great_mother: 'Büyük Ana',
  explorer:     'Kaşif',
  guardian:     'Koruyucu',
};

// Symbol categories (used in dream_symbols.symbol_category)
export const SYMBOL_CATEGORY_LABELS: Record<string, string> = SYMBOL_LABELS;

// ── Utility ───────────────────────────────────────────────────────────────────

export function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

export function labelList(map: Record<string, string>, keys: string[]): string {
  return keys.map((k) => labelOf(map, k)).join(', ');
}

// ── Dimension explanation sentences ──────────────────────────────────────────

export function themeExplanation(themes: string[]): string {
  if (themes.length === 0) return '';
  const labels = themes.map((t) => labelOf(THEME_LABELS, t));
  if (labels.length === 1) return `İkiniz de "${labels[0]}" temasıyla karşılaştınız. Bu tesadüf değil — aynı bilinçaltı enerjisi iki ayrı rüyaya yansıdı.`;
  const last = labels[labels.length - 1];
  const rest = labels.slice(0, -1).join(', ');
  return `İki rüyada da "${rest}" ve "${last}" temaları ortaktı. Bilinçaltı sesiniz bu noktalarda birleşiyor.`;
}

export function emotionExplanation(emotions: string[]): string {
  if (emotions.length === 0) return '';
  const labels = emotions.map((e) => labelOf(EMOTION_LABELS, e));
  if (labels.length === 1) return `Her ikiniz de "${labels[0]}" duygusunu taşıdınız. Aynı duygunun aynı gece iki farklı rüyaya düşmesi güçlü bir rezonans sinyali.`;
  return `İki rüyada da benzer duygular titreşti: ${labels.join(', ')}. Bu ortak duygusal tablo tesadüf değil.`;
}

export function symbolExplanation(symbols: string[]): string {
  if (symbols.length === 0) return '';
  const labels = symbols.map((s) => labelOf(SYMBOL_LABELS, s));
  if (labels.length === 1) return `Her iki rüyada da "${labels[0]}" sembolü belirdi. Kolektif bilinçaltında bu sembol aynı anda iki kişiye ulaştı.`;
  return `Rüyalar şu sembolleri paylaştı: ${labels.join(', ')}. Bu semboller kolektif bilinçaltının ortak dilidir.`;
}

export function locationExplanation(locations: string[]): string {
  if (locations.length === 0) return '';
  const labels = locations.map((l) => labelOf(LOCATION_LABELS, l));
  if (labels.length === 1) return `Her ikiniz de "${labels[0]}" ortamında bir şeyler yaşadınız. Aynı mekan, farklı yolculuklar.`;
  return `Ortak mekanlar: ${labels.join(', ')}. Bilinçaltlarınız aynı sahnelere yöneldi.`;
}

export function archetypeExplanation(archetypes: string[]): string {
  if (archetypes.length === 0) return '';
  const labels = archetypes.map((a) => labelOf(ARCHETYPE_LABELS, a));
  if (labels.length === 1) return `Her iki rüyada da "${labels[0]}" arketipi sahneye çıktı. Bu evrensel figür iki bilinçaltında aynı anda uyandı.`;
  return `Ortak arketipler: ${labels.join(', ')}. Bu figürler iki rüyayı aynı kolektif enerjiyle bağlıyor.`;
}

// ── Connection narrative ──────────────────────────────────────────────────────

export interface ConnectionSignals {
  sharedThemes: string[];
  sharedEmotions: string[];
  sharedSymbols: string[];
  sharedLocations: string[];
  sharedArchetypes?: string[];
  matchScore: number;
  resonanceLevel: string;
}

/**
 * Generates a 1-2 sentence Turkish narrative explaining why two dreams are connected.
 * Used in SimilarDreams cards and match detail intros.
 */
// ── Human language resonance levels ──────────────────────────────────────────

export const RESONANCE_HUMAN_LABELS: Record<string, string> = {
  signal:    'Eko',
  resonance: 'Yankı',
  strong:    'Uyum',
  deep:      'Derin Rezonans',
  mirror:    'Ayna',
};

export const RESONANCE_COLORS: Record<string, string> = {
  signal:    '#60A5FA',
  resonance: '#A78BFA',
  strong:    '#6C63FF',
  deep:      '#F472B6',
  mirror:    '#FBBF24',
};

export const RESONANCE_DESCRIPTIONS: Record<string, string> = {
  signal:    'İki rüya arasında zayıf ama gerçek bir titreşim sezildi.',
  resonance: 'Bilinçaltlarınız aynı frekansın sesini duydu.',
  strong:    'İki rüya birden fazla düzlemde buluştu.',
  deep:      'Nadir ve güçlü bir bilinçaltı bağlantısı — aynı enerji iki ayrı rüyada belirdi.',
  mirror:    'İki rüya birbirinin aynası — kolektif bilinçaltının en nadir sinyali.',
};

// ── Collective traces ──────────────────────────────────────────────────────────

export interface CollectiveTraces {
  totalConnected: number;
  topEmotions: string[];
  topSymbols: string[];
  topThemes: string[];
}

export function buildCollectiveTraces(matches: Array<{
  sharedThemes: string[];
  sharedEmotions: string[];
  sharedSymbols: string[];
}>): CollectiveTraces {
  const emotionFreq = new Map<string, number>();
  const symbolFreq  = new Map<string, number>();
  const themeFreq   = new Map<string, number>();

  for (const m of matches) {
    for (const e of m.sharedEmotions) emotionFreq.set(e, (emotionFreq.get(e) ?? 0) + 1);
    for (const s of m.sharedSymbols)  symbolFreq.set(s,  (symbolFreq.get(s)  ?? 0) + 1);
    for (const t of m.sharedThemes)   themeFreq.set(t,   (themeFreq.get(t)   ?? 0) + 1);
  }

  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

  return {
    totalConnected: matches.length,
    topEmotions:    top(emotionFreq, 3),
    topSymbols:     top(symbolFreq,  3),
    topThemes:      top(themeFreq,   3),
  };
}

// ── Connection narrative ──────────────────────────────────────────────────────

export function buildConnectionNarrative(signals: ConnectionSignals): string {
  const sharedThemes     = signals.sharedThemes     ?? [];
  const sharedEmotions   = signals.sharedEmotions   ?? [];
  const sharedSymbols    = signals.sharedSymbols    ?? [];
  const sharedArchetypes = signals.sharedArchetypes ?? [];
  const { matchScore }   = signals;

  const topTheme     = sharedThemes[0];
  const topEmotion   = sharedEmotions[0];
  const topSymbol    = sharedSymbols[0];
  const topArchetype = sharedArchetypes[0];

  const parts: string[] = [];

  if (topTheme && topEmotion) {
    const tLabel = labelOf(THEME_LABELS, topTheme);
    const eLabel = labelOf(EMOTION_LABELS, topEmotion);
    parts.push(`"${tLabel}" teması ve "${eLabel}" duygusu iki rüyayı birbirine bağlıyor.`);
  } else if (topTheme) {
    const tLabel = labelOf(THEME_LABELS, topTheme);
    parts.push(`Her iki rüya da "${tLabel}" temasını paylaşıyor.`);
  } else if (topEmotion) {
    const eLabel = labelOf(EMOTION_LABELS, topEmotion);
    parts.push(`İki rüya da "${eLabel}" duygusunu taşıyor.`);
  }

  if (topSymbol) {
    const sLabel = labelOf(SYMBOL_LABELS, topSymbol);
    parts.push(`"${sLabel}" sembolü her iki rüyada da belirdi.`);
  } else if (topArchetype) {
    const aLabel = labelOf(ARCHETYPE_LABELS, topArchetype);
    parts.push(`"${aLabel}" arketipi ortak enerji noktası.`);
  }

  if (parts.length === 0) {
    if (matchScore >= 65) return 'Derin bilinçaltı rezonansı — iki rüya güçlü bir kolektif sinyal paylaşıyor.';
    return 'Bu rüyalar bilinçaltı düzeyinde bağlantılı.';
  }

  return parts.join(' ');
}
