import type {
  ActivityLevel, DreamTraceDto, SignalType, TraceSignalDto, TraceType,
} from './dto/weather.dto';

// ── Label maps ────────────────────────────────────────────────────────────────

const THEME_LABELS: Record<string, string> = {
  pursuit: 'Takip', threshold: 'Eşik', flying: 'Uçuş',
  transformation: 'Dönüşüm', reunion: 'Kavuşma', loss: 'Kayıp',
  chase: 'Kovalanma', falling: 'Düşme', water: 'Su', fire: 'Ateş',
  descent: 'İniş', ascent: 'Yükseliş', school: 'Okul', death: 'Ölüm',
  birth: 'Doğum', journey: 'Yolculuk', entrapment: 'Sıkışma',
  discovery: 'Keşif', confrontation: 'Yüzleşme', protection: 'Koruma',
  exposure: 'Açığa Çıkma',
};

const EMOTION_LABELS: Record<string, string> = {
  fear: 'Korku', joy: 'Sevinç', peace: 'Huzur', loneliness: 'Yalnızlık',
  wonder: 'Merak', sadness: 'Hüzün', anger: 'Öfke', nostalgia: 'Özlem',
  love: 'Aşk', anxiety: 'Kaygı', excitement: 'Heyecan', grief: 'Yas',
  confusion: 'Karmaşa', calm: 'Sükunet', awe: 'Hayranlık',
  dread: 'Tedirginlik', serenity: 'Dinginlik',
};

const SYMBOL_LABELS: Record<string, string> = {
  threshold: 'Eşik', shadow: 'Gölge', flood: 'Sel', abyss: 'Uçurum',
  guide: 'Rehber', labyrinth: 'Labirent', door: 'Kapı', mirror_self: 'Ayna',
  tree: 'Ağaç', water: 'Su', key: 'Anahtar', light: 'Işık', fire: 'Ateş',
  flying: 'Uçuş', falling: 'Düşüş', sea: 'Deniz', old_house: 'Eski Ev',
  animal: 'Hayvan', child: 'Çocuk', chase: 'Takip', vehicle: 'Araç',
  transformation: 'Dönüşüm',
};

const ARCHETYPE_LABELS: Record<string, string> = {
  shadow: 'Gölge', anima: 'Anima', animus: 'Animus', wise_elder: 'Bilge',
  trickster: 'Düzenbaz', guide: 'Rehber', hero: 'Kahraman',
  child: 'İlahi Çocuk', great_mother: 'Büyük Ana', explorer: 'Kaşif',
  guardian: 'Koruyucu',
};

const LOCATION_LABELS: Record<string, string> = {
  forest: 'Orman', ocean: 'Okyanus', city: 'Şehir',
  childhood_home: 'Çocukluk Evi', corridor: 'Koridor', underground: 'Yeraltı',
  mountain: 'Dağ', school: 'Okul', hospital: 'Hastane', desert: 'Çöl',
  sea: 'Deniz', rooftop: 'Çatı', cave: 'Mağara', bridge: 'Köprü',
  unknown_city: 'Tanımsız Şehir', old_house: 'Eski Ev', temple: 'Tapınak',
  labyrinth: 'Labirent',
};

export function getLabel(type: TraceType, name: string): string {
  const maps: Partial<Record<TraceType, Record<string, string>>> = {
    theme:     THEME_LABELS,
    emotion:   EMOTION_LABELS,
    symbol:    SYMBOL_LABELS,
    archetype: ARCHETYPE_LABELS,
    location:  LOCATION_LABELS,
  };
  return maps[type]?.[name] ?? name;
}

// ── Weather title ─────────────────────────────────────────────────────────────

const THEME_TITLES: Record<string, string> = {
  discovery: 'Keşif Gecesi', threshold: 'Geçiş Gecesi',
  transformation: 'Dönüşüm Gecesi', pursuit: 'Takip Gecesi',
  flying: 'Yükseliş Gecesi', falling: 'Bırakış Gecesi',
  loss: 'Kayıp Gecesi', reunion: 'Kavuşma Gecesi',
  confrontation: 'Yüzleşme Gecesi', protection: 'Koruma Gecesi',
  water: 'Su Gecesi', fire: 'Ateş Gecesi',
  journey: 'Yolculuk Gecesi', ascent: 'Tırmanış Gecesi',
  descent: 'İniş Gecesi', death: 'Derin Gece', birth: 'Doğuş Gecesi',
};

const EMOTION_TITLES: Record<string, string> = {
  peace: 'Huzur Gecesi', fear: 'Kaygı Gecesi', wonder: 'Merak Gecesi',
  joy: 'Sevinç Gecesi', sadness: 'Hüzün Gecesi', anxiety: 'Gerilim Gecesi',
  awe: 'Hayranlık Gecesi', love: 'Aşk Gecesi', loneliness: 'Yalnızlık Gecesi',
  serenity: 'Dinginlik Gecesi', nostalgia: 'Özlem Gecesi',
};

export function generateWeatherTitle(dominant: DreamTraceDto | null, totalDreams: number): string {
  if (totalDreams < 3) return 'Sakin Gece';
  if (!dominant) return 'Kolektif Bilinç Aktif';
  if (dominant.type === 'theme')
    return THEME_TITLES[dominant.name] ?? `${getLabel('theme', dominant.name)} Gecesi`;
  if (dominant.type === 'emotion')
    return EMOTION_TITLES[dominant.name] ?? `${getLabel('emotion', dominant.name)} Gecesi`;
  return `${getLabel(dominant.type, dominant.name)} Gecesi`;
}

// ── Activity level ────────────────────────────────────────────────────────────

export function computeActivityLevel(totalDreams: number, signalCount: number): ActivityLevel {
  if (totalDreams < 5 || signalCount === 0) return 'low';
  if (totalDreams < 20 || signalCount < 3)  return 'moderate';
  if (totalDreams < 50 || signalCount < 6)  return 'high';
  return 'intense';
}

// ── Weather summary ───────────────────────────────────────────────────────────

export function generateWeatherSummary(
  topTraces:     DreamTraceDto[],
  signals:       TraceSignalDto[],
  totalDreams:   number,
  totalDreamers: number,
): string {
  const parts: string[] = [];
  const topTheme   = topTraces.find(t => t.type === 'theme');
  const topEmotion = topTraces.find(t => t.type === 'emotion');
  const topSymbol  = topTraces.find(t => t.type === 'symbol');
  const dominant   = signals.find(s => s.type === 'dominant' || s.type === 'global');
  const emerging   = signals.find(s => s.type === 'emerging');

  if (dominant) {
    parts.push(`Bu gece ${totalDreamers} rüyacının zihninde ${dominant.traceLabel.toLowerCase()} enerjisi öne çıkıyor.`);
  } else if (topTheme) {
    parts.push(`Bu gece rüya alanında ${getLabel('theme', topTheme.name).toLowerCase()} imgesi baskın.`);
  } else if (topEmotion) {
    parts.push(`${getLabel('emotion', topEmotion.name)} duygusu bu gece en yüksek tonda.`);
  } else {
    parts.push(`Bu gece ${totalDreamers} rüyacı aynı uzayda buluştu.`);
  }

  const combined = topTraces.filter(t => t.type === 'symbol' || t.type === 'theme').slice(0, 3);
  if (combined.length >= 2) {
    const labels = combined.map(t => getLabel(t.type, t.name).toLowerCase());
    const last   = labels.pop()!;
    parts.push(`${labels.join(', ')} ve ${last} imgeleri bu gece birçok rüyada tekrar ediyor.`);
  } else if (topSymbol) {
    parts.push(`${getLabel('symbol', topSymbol.name)} imgesi ${topSymbol.activeUsers} ayrı rüyada belirdi.`);
  }

  if (emerging && parts.length < 3) {
    parts.push(`${emerging.headline}.`);
  }

  return parts.join(' ');
}

export function generateWeatherDescription(level: ActivityLevel, dominant: DreamTraceDto | null): string {
  if (!dominant) {
    const LEVELS: Record<ActivityLevel, string> = {
      low:      'Kolektif bilinç bu gece sakin.',
      moderate: 'Kolektif bilinçte orta düzey aktivite.',
      high:     'Kolektif bilinç bu gece çok aktif.',
      intense:  'Kolektif bilinçte yoğun aktivite — olağandışı bir gece.',
    };
    return LEVELS[level];
  }
  return `${getLabel(dominant.type, dominant.name)}, bu gece kolektif bilinçte en güçlü sinyal.`;
}

// ── Signal language ───────────────────────────────────────────────────────────

export function generateSignalHeadline(label: string, type: SignalType): string {
  switch (type) {
    case 'emerging':  return `${label} yükseliyor`;
    case 'dominant':  return `${label} bu gece baskın`;
    case 'rare':      return `Nadir iz: ${label}`;
    case 'fading':    return `${label} zayıflıyor`;
    case 'global':    return `${label} bu gece yaygın`;
  }
}

export function generateSignalBody(label: string, type: SignalType, trace: DreamTraceDto): string {
  switch (type) {
    case 'emerging':
      return `${label} bu gece alışılmadık bir ivme kazandı. ${trace.activeUsers} ayrı rüyada bu enerji belirdi — yükselen bir dalga.`;
    case 'dominant':
      return `${label}, bu geceyi şekillendiren en güçlü tema. ${trace.currentCount} rüyada tekrar ediyor; ${trace.activeUsers} bilinç bu deneyimi paylaşıyor.`;
    case 'rare':
      return `${label} bu gece ilk kez yüzeye çıktı. Nadir görülen bu iz, ${trace.activeUsers} rüyada belirdi.`;
    case 'fading':
      return `${label} geçen döneme göre belirgin şekilde zayıflıyor. Rüya alanı bu enerjiyi geride bırakıyor olabilir.`;
    case 'global':
      return `${label} bu gece ${trace.activeUsers} ayrı rüyada belirdi. Beklenenden geniş bir yayılım — güçlü bir sinyal.`;
  }
}

// ── Pattern language ──────────────────────────────────────────────────────────

export function generatePatternHeadline(l1: string, l2: string): string {
  return `${l1} + ${l2} birlikte`;
}

export function generatePatternBody(l1: string, l2: string, count: number): string {
  return `${count} farklı rüyada ${l1.toLowerCase()} ve ${l2.toLowerCase()} birlikte görüldü. Bu birliktelik kolektif bir örüntü sinyali.`;
}

// ── Trace detail language ─────────────────────────────────────────────────────

export function generateTraceNarrative(trace: DreamTraceDto): string {
  const label  = getLabel(trace.type, trace.name);
  const parts: string[] = [];

  if (trace.type === 'theme') {
    parts.push(`"${label}" bu gece ${trace.currentCount} rüyada baş gösterdi.`);
    if (trace.growthPercent > 0)
      parts.push(`Bir önceki döneme kıyasla %${trace.growthPercent} artış gösteriyor.`);
    parts.push(`${trace.activeUsers} farklı bilinç bu temayı paylaşıyor.`);
  } else if (trace.type === 'emotion') {
    parts.push(`"${label}" duygusu bu gece ${trace.currentCount} rüyada hissedildi.`);
    parts.push(`${trace.activeUsers} kişi bu duyguyu aynı gecede yaşadı.`);
  } else if (trace.type === 'symbol') {
    parts.push(`"${label}" sembolü bu gece ${trace.currentCount} rüyada belirdi.`);
    parts.push(`${trace.activeUsers} farklı bilinçten yükselen bu sembol, kolektif bir dil oluşturuyor.`);
  } else if (trace.type === 'archetype') {
    parts.push(`"${label}" arketipi bu gece ${trace.currentCount} rüyada sahneye çıktı.`);
    parts.push(`Bu evrensel figür ${trace.activeUsers} bilinçaltında aynı anda uyandı.`);
  } else {
    parts.push(`"${label}" bu gece ${trace.currentCount} rüyada yer aldı.`);
  }

  return parts.join(' ');
}

export function generateTraceWhyImportant(trace: DreamTraceDto, signalType: SignalType | null): string {
  const label = getLabel(trace.type, trace.name);
  if (signalType === 'emerging')
    return `${label}, kolektif bilinçte yeni bir enerji dalgasının habercisi. Yükselen sinyaller çoğunlukla önümüzdeki günlerin ruhunu yansıtır.`;
  if (signalType === 'dominant')
    return `Bu gece kolektif bilinçte en güçlü iz bırakan sinyal. Dominant sinyaller, insanlığın paylaşılan bir deneyim içinde olduğunu gösterir.`;
  if (signalType === 'global')
    return `${label} bu gece beklenmedik ölçüde geniş bir yayılım gösterdi. Global sinyaller, kolektif bilinçte derin bir dalganın işareti.`;
  if (signalType === 'rare')
    return `${label} nadir görülen bir sinyal. Nadir sinyaller, kolektif bilinçaltında henüz yüzeye çıkmamış enerjilerin habercisi olabilir.`;
  if (signalType === 'fading')
    return `${label} zayıflıyor. Bu, kolektif bilincin bu enerjiden uzaklaştığını ve yeni bir aşamaya geçtiğini işaret edebilir.`;
  return `${label} bu gece ${trace.activeUsers} farklı bilinçte ortak bir iz bıraktı. Bu paylaşılan deneyim, kolektif bilinçaltının sesi.`;
}
