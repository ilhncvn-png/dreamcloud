import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchDreamWeather } from '../api/admin.api';
import type { DreamWeatherData, WeatherCondition } from '../types/admin.types';

const WEATHER_CONFIG: Record<WeatherCondition, {
  bg: string; border: string; textColor: string; glow: string;
}> = {
  radiant:       { bg: 'from-yellow-500/10 to-amber-500/5',   border: 'border-yellow-500/30', textColor: 'text-yellow-400', glow: 'shadow-yellow-500/10' },
  clear:         { bg: 'from-sky-500/10 to-blue-500/5',       border: 'border-sky-500/30',    textColor: 'text-sky-400',    glow: 'shadow-sky-500/10' },
  partly_cloudy: { bg: 'from-slate-500/10 to-slate-600/5',    border: 'border-slate-500/30',  textColor: 'text-slate-400',  glow: '' },
  overcast:      { bg: 'from-gray-500/10 to-gray-600/5',      border: 'border-gray-500/30',   textColor: 'text-gray-400',   glow: '' },
  stormy:        { bg: 'from-dc-error/10 to-purple-900/5',    border: 'border-dc-error/30',   textColor: 'text-dc-error',   glow: 'shadow-red-500/10' },
  electric:      { bg: 'from-dc-primary/10 to-violet-900/5',  border: 'border-dc-primary/30', textColor: 'text-dc-primary', glow: 'shadow-purple-500/10' },
  foggy:         { bg: 'from-dc-muted/10 to-dc-muted/5',      border: 'border-dc-border',     textColor: 'text-dc-muted',   glow: '' },
};

const CONDITION_LABELS: Record<WeatherCondition, string> = {
  radiant:       'Işıltılı',
  clear:         'Açık',
  partly_cloudy: 'Parçalı Bulutlu',
  overcast:      'Kapalı',
  stormy:        'Fırtınalı',
  electric:      'Elektrikli',
  foggy:         'Sisli',
};

const EMOTION_TR: Record<string, string> = {
  joy: 'sevinç', excitement: 'coşku', love: 'sevgi', peace: 'huzur',
  wonder: 'hayranlık', curiosity: 'merak', hope: 'umut', bliss: 'mutluluk',
  contentment: 'tatmin', happiness: 'neşe', awe: 'huşu', gratitude: 'şükran',
  euphoria: 'öfori', fear: 'korku', anxiety: 'anksiyete', sadness: 'üzüntü',
  anger: 'öfke', terror: 'dehşet', despair: 'umutsuzluk', grief: 'keder',
  frustration: 'hayal kırıklığı', rage: 'hiddet', panic: 'panik',
  dread: 'ürperti', horror: 'dehşet', shame: 'utanç',
};

const EMOTION_EMOJI: Record<string, string> = {
  joy: '✨', excitement: '⚡', love: '💜', peace: '🌊', wonder: '🌟',
  curiosity: '🔮', hope: '🌱', bliss: '☁️', contentment: '🌙',
  happiness: '☀️', awe: '🌌', gratitude: '🌸', euphoria: '💫',
  fear: '👁', anxiety: '🌀', sadness: '💧', anger: '🔥',
  terror: '⛈', despair: '🌑', grief: '🌫', frustration: '🌪',
  rage: '🔴', panic: '⚠️', dread: '🌒', shame: '🌧',
};

const SYMBOL_ASSOCIATIONS: Record<string, string[]> = {
  pencere: ['keşif', 'geçiş anı', 'fırsatlar', 'umut'],
  kapı:    ['değişim', 'yeni başlangıç', 'karar noktası'],
  gül:     ['aşk', 'güzellik', 'duygusal açılım', 'iyileşme'],
  ayna:    ['öz-yansıma', 'kimlik', 'gerçek benlik', 'yüzleşme'],
  su:      ['bilinçdışı', 'duygusallık', 'temizlenme', 'akış'],
  ateş:    ['dönüşüm', 'tutku', 'yıkım ve yeniden doğuş'],
  çocuk:   ['masumiyet', 'iç çocuk', 'potansiyel', 'başlangıç'],
  ev:      ['güvenlik', 'benlik', 'aile', 'kökenler'],
  deniz:   ['sonsuzluk', 'bilinçdışı derinlik', 'özgürlük'],
  yol:     ['yolculuk', 'arayış', 'seçimler', 'hedef'],
  kuş:     ['özgürlük', 'ruh', 'yükseliş', 'mesaj'],
  ağaç:    ['büyüme', 'kökler', 'yaşam', 'süreklilik'],
  karanlık: ['bilinmezlik', 'korku', 'keşfedilmemiş benlik'],
  ışık:    ['uyanış', 'netlik', 'ilahi bağlantı'],
  uçmak:   ['özgürlük', 'sınırları aşma', 'yüksek bilinç'],
  düşmek:  ['kontrol kaybı', 'geçiş korkusu', 'dönüşüm eşiği'],
};

const EVENT_SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  storm:    { bg: 'bg-dc-error/10',   border: 'border-dc-error/30',   text: 'text-dc-error',   dot: 'bg-dc-error' },
  warning:  { bg: 'bg-dc-warning/10', border: 'border-dc-warning/30', text: 'text-dc-warning', dot: 'bg-dc-warning' },
  info:     { bg: 'bg-dc-primary/10', border: 'border-dc-primary/30', text: 'text-dc-primary', dot: 'bg-dc-primary' },
  positive: { bg: 'bg-dc-success/10', border: 'border-dc-success/30', text: 'text-dc-success', dot: 'bg-dc-success' },
};

const WARNING_COLORS: Record<string, string> = {
  critical: 'text-dc-error',
  high:     'text-dc-warning',
  medium:   'text-dc-primary',
  low:      'text-dc-muted',
};

function Telemetry({ label, value, unit = '%', color = 'dc-primary' }: { label: string; value: number; unit?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    'dc-success': 'bg-dc-success',
    'dc-error':   'bg-dc-error',
    'dc-warning': 'bg-dc-warning',
    'dc-primary': 'bg-dc-primary',
  };
  const barColor = colorMap[color] ?? 'bg-dc-primary';
  return (
    <div className="bg-dc-bg border border-dc-border rounded-xl p-4">
      <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-bold text-dc-text font-mono">{value}</span>
        <span className="text-dc-muted text-xs mb-1">{unit}</span>
      </div>
      <div className="w-full bg-dc-surface rounded-full h-1.5">
        <div className={`${barColor} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

const FORECAST_EMOJI: Record<WeatherCondition, string> = {
  radiant:       '☀️',
  clear:         '🌤',
  partly_cloudy: '⛅',
  overcast:      '☁️',
  stormy:        '⛈',
  electric:      '⚡',
  foggy:         '🌫',
};

// ── Intelligence helpers ─────────────────────────────────────────────────────

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildNarrative(d: DreamWeatherData): string[] {
  const lines: string[] = [];
  const topSym  = d.topSymbols?.[0] ?? null;
  const negPct  = d.negPct  ?? 0;
  const posPct  = d.posPct  ?? 0;
  const lucidPct = d.lucidPct ?? 0;

  if (negPct > 42) {
    lines.push(`Kolektif duygusal baskı kritik sınıra yaklaşıyor — %${negPct} negatif atmosfer algılandı.`);
  } else if (negPct > 30) {
    lines.push(`Kolektif duygusal baskı yükseliyor — %${negPct} negatif sinyal, %${posPct} pozitif karşı akıma rağmen belirginleşiyor.`);
  } else {
    lines.push(`Kolektif atmosfer dengeli seyrediyor — %${posPct} pozitif baskın, negatif sinyal kontrol altında.`);
  }

  const negEmotions = ['fear','anxiety','sadness','anger','terror','despair','grief','frustration','rage','panic','dread','horror','shame'];
  const emotionTR = EMOTION_TR[d.dominantEmotion ?? ''] ?? (d.dominantEmotion ?? '');
  if (negEmotions.includes(d.dominantEmotion ?? '')) {
    lines.push(`"${cap(emotionTR)}" duygusu baskın — gölge materyali yoğun işleniyor, bilinçdışı katman aktif.`);
  } else if (emotionTR) {
    lines.push(`"${cap(emotionTR)}" kolektif enerjiyi yönlendiriyor — bilinçdışı entegrasyon olumlu bir ivme taşıyor.`);
  }

  if (lucidPct > 20) {
    lines.push(`Lucid enerji güçlü — %${lucidPct} berrak bilinç ile kolektif öz-farkındalık artış gösteriyor.`);
  } else if (lucidPct < 6) {
    lines.push(`Lucid görünürlük oldukça düşük — bilinçdışı materyal baskın, bilinçli rüya penceresi kapalı.`);
  } else {
    lines.push(`Lucid görünürlük %${lucidPct} ile stabil — bilinçdışı içerik baskın olmayı sürdürüyor.`);
  }

  if (topSym && (topSym.count ?? 0) > 5) {
    lines.push(`"${cap(topSym.symbol)}" sembolü ${topSym.count} rüyada baskın olarak öne çıkıyor — kolektif bilinçdışının merkezi imgesi.`);
  }

  const hopeIndex = d.hopeIndex ?? 0;
  const turbulence = d.turbulence ?? 0;
  const nightPct   = d.nightPct   ?? 0;
  if (hopeIndex > 65 && negPct < 25) {
    lines.push(`Rezonans ve umut indeksi yüksek — önümüzdeki 12 saat içinde kolektif uyum penceresi açılması bekleniyor.`);
  } else if (turbulence > 55 || nightPct > 20) {
    lines.push(`Türbülans ve kabus baskısı devam ediyor — kolektif atmosfer stabilize olmadan önce ek dalgalanma öngörülüyor.`);
  } else {
    lines.push(`Kolektif senkronizasyon stabil seyirde — belirgin bir değişim öngörülmüyor.`);
  }

  return lines;
}

function buildAtmosphericExplanation(d: DreamWeatherData): string[] {
  const negPct   = d.negPct   ?? 0;
  const posPct   = d.posPct   ?? 0;
  const lucidPct = d.lucidPct ?? 0;
  const topSym   = d.topSymbols?.[0] ?? null;

  const conditionExplain: Partial<Record<WeatherCondition, string>> = {
    radiant:       `Kolektif pozitif enerji (%${posPct}) zirveye ulaşmış, lucid görünürlük yüksek — kolektif bilinç aydınlık bir frekansta titreşiyor.`,
    clear:         `Pozitif enerji baskın (%${posPct}), negatif baskı düşük — kolektif bilinç netleşmiş, duygusal berraklık hakim.`,
    partly_cloudy: `Pozitif (%${posPct}) ve negatif (%${negPct}) enerji dengede — kolektif atmosfer aralıklı bulutlu bir görünüm sergiliyor.`,
    overcast:      `Pozitif enerji baskın (%${posPct}) olmasına rağmen negatif yük (%${negPct}) tam bir açıklığı engelliyor — kolektif atmosfer örtülü seyrediyor.`,
    stormy:        `Negatif enerji (%${negPct}) kritik seviyede — türbülans yoğun, kolektif alan karanlık materyalin baskısı altında.`,
    electric:      `Lucid enerji (%${lucidPct}) ve elektrik alanı zirveye ulaşmış — kolektif bilinç yüksek gerilimde, uyanış aşaması aktif.`,
    foggy:         `Duygusal belirsizlik hakim — ne pozitif ne negatif baskı belirgin, kolektif alan sisli bir kararsızlık içinde.`,
  };

  const parts: string[] = [];
  if (d.condition && conditionExplain[d.condition]) {
    parts.push(conditionExplain[d.condition]!);
  }
  if (lucidPct < 7) {
    parts.push(`Lucid görünürlük son derece düşük (%${lucidPct}) — bilinçdışı katman birincil işlem modunda.`);
  } else if (lucidPct > 20) {
    parts.push(`Lucid görünürlük güçlü (%${lucidPct}) — bilinçli rüya deneyimi kolektif alanda belirginleşiyor.`);
  }
  if (topSym && (topSym.count ?? 0) > 3) {
    parts.push(`"${cap(topSym.symbol)}" sembolü ${topSym.count} rüyada baskın olarak işaretlenmiş — kolektif bilinçdışının mevcut odak noktası.`);
  }
  return parts;
}

function buildMeteoReport(d: DreamWeatherData): string {
  const condLabel  = CONDITION_LABELS[d.condition ?? 'overcast'] ?? 'belirsiz';
  const emotionTR  = EMOTION_TR[d.dominantEmotion ?? ''] ?? (d.dominantEmotion ?? '');
  const sym1       = d.topSymbols?.[0]?.symbol ?? null;
  const sym2       = d.topSymbols?.[1]?.symbol ?? null;
  const posPct     = d.posPct     ?? 0;
  const negPct     = d.negPct     ?? 0;
  const lucidPct   = d.lucidPct   ?? 0;
  const syncScore  = d.syncScore  ?? 0;
  const hopeIndex  = d.hopeIndex  ?? 0;
  const nextRes    = syncScore > 65 ? 8 : posPct > 60 ? 14 : hopeIndex > 55 ? 20 : 28;

  const sentences = [
    `Bugün kolektif atmosfer ${condLabel.toLowerCase()} koşullarında seyrediyor; ${negPct > 35 ? 'duygusal baskı belirgin' : posPct > 60 ? 'pozitif enerji belirgin şekilde baskın' : 'dengeli bir akış hakim'}.`,
    sym1
      ? `"${emotionTR ? cap(emotionTR) : '—'}" duygusu kolektif sahneyi şekillendirirken "${sym1}"${sym2 ? ` ve "${sym2}"` : ''} sembolü bilinçdışı katmanda tekrar eden imgeler olarak öne çıkıyor.`
      : emotionTR
        ? `"${cap(emotionTR)}" duygusu kolektif sahneyi şekillendiriyor, sembol dağılımı geniş ve çeşitli.`
        : `Baskın duygu tespiti henüz yeterli veri gerektiriyor.`,
    lucidPct > 18
      ? `Lucid görünürlük %${lucidPct} ile ortalamanın üzerinde — kolektif bilinç katmanında anlamlı bir açıklık mevcut.`
      : `Lucid görünürlük %${lucidPct} ile düşük — bilinçdışı materyal birincil katmanda işleniyor, bilinçli farkındalık sınırlı.`,
    `Bir sonraki olası rezonans penceresi ${nextRes} saat içinde öngörülüyor; syncScore ${syncScore} ile ${syncScore > 65 ? 'güçlü bir uyum mevcut' : syncScore > 40 ? 'orta düzeyde uyum sürüyor' : 'uyum zayıf'}.`,
    (d.events?.length ?? 0) > 0
      ? `Aktif atmosferik olay: ${d.events!.map(e => e.name).join(', ')} — kolektif alanda dikkat gerektiriyor.`
      : `Anormal atmosferik olay tespit edilmedi — sistem rutinin içinde ilerliyor.`,
  ];
  return sentences.join(' ');
}

function getForecastSentence(day: { dominantEmotion?: string; lucidProb?: number; nightmareProb?: number; condition: WeatherCondition }): string {
  const emo = EMOTION_TR[day.dominantEmotion ?? ''] ?? (day.dominantEmotion ?? '');
  if ((day.nightmareProb ?? 0) > 30) return `Gölge enerjisi baskın — ${emo} duygusuyla yoğun kabus ritmi bekleniyor.`;
  if ((day.lucidProb ?? 0) > 28) return `Lucid pencere açılıyor — bilinç berraklığı artıyor.`;
  if (day.condition === 'electric') return `Lucid enerji zirvede — kolektif uyanış yakın.`;
  if (day.condition === 'radiant' || day.condition === 'clear') return emo ? `Pozitif akış güçlü — ${emo} enerjisi baskın.` : 'Pozitif akış güçlü.';
  if (day.condition === 'stormy') return `Türbülanslı gün — duygusal dalgalanma yoğun olacak.`;
  return emo ? `${cap(emo)} duygusu hafifçe yükseliyor.` : 'Akış devam ediyor.';
}

function getHourLabel(h: { lucidCount: number; nightmareCount: number; dreamCount: number }, max: number): { label: string; color: string } {
  const total  = h.dreamCount;
  const density = max > 0 ? total / max : 0;
  const lucidR  = total > 0 ? h.lucidCount    / total : 0;
  const nightR  = total > 0 ? h.nightmareCount / total : 0;
  if (lucidR  > 0.25) return { label: 'Lucid Penceresi', color: 'text-dc-primary' };
  if (nightR  > 0.30) return { label: 'Kabus Cephesi',   color: 'text-dc-error' };
  if (density > 0.75) return { label: 'Rüya Zirvesi',    color: 'text-dc-warning' };
  if (density < 0.15) return { label: 'Sessiz Gökyüzü',  color: 'text-dc-muted' };
  if (lucidR  > 0.12) return { label: 'Bilinç Açılımı',  color: 'text-violet-400' };
  if (nightR  > 0.15) return { label: 'Gölge Dalgası',   color: 'text-red-400' };
  return { label: 'Akış Devam Ediyor', color: 'text-dc-secondary' };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DreamWeather() {
  const { data, isLoading, isError } = useQuery({
    queryKey:        ['dream-weather'],
    queryFn:         fetchDreamWeather,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="section-operators relative">
        <Header title="Dream Weather" subtitle="Kolektif bilinç durumunun atmosferik haritası" section="operators" />
        <div className="h-64 bg-dc-surface border border-dc-border rounded-2xl animate-pulse mb-5" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="section-operators relative">
        <Header title="Dream Weather" subtitle="Kolektif bilinç durumunun atmosferik haritası" section="operators" />
        <div className="bg-dc-error/10 border border-dc-error/30 rounded-xl p-6 text-dc-error text-sm">
          Dream Weather verisi yüklenemedi.
        </div>
      </div>
    );
  }

  const cfg = WEATHER_CONFIG[data.condition];

  // Derived intelligence
  const narrative    = buildNarrative(data);
  const atmosExplain = buildAtmosphericExplanation(data);
  const meteoReport  = buildMeteoReport(data);

  const topSymbols     = data.topSymbols     ?? [];
  const events         = data.events         ?? [];
  const warnings       = data.warnings       ?? [];
  const timeline       = data.timeline       ?? [];
  const totalDreams7d  = data.totalDreams7d  ?? 0;
  const hopeIndex      = data.hopeIndex      ?? 0;
  const syncScore      = data.syncScore      ?? 0;
  const negPct         = data.negPct         ?? 0;
  const lucidPct       = data.lucidPct       ?? 0;

  const topSym           = topSymbols[0] ?? null;
  const symAssociations  = topSym ? (SYMBOL_ASSOCIATIONS[topSym.symbol.toLowerCase()] ?? ['sembolik enerji', 'kolektif anlam', 'bilinçdışı mesaj']) : [];
  const symLifetime      = topSym ? Math.min(72, Math.max(12, Math.round((topSym.count ?? 0) * 1.5))) : 0;
  const maxHourlyDreams  = timeline.length > 0 ? Math.max(...timeline.map(h => h.dreamCount)) : 1;

  return (
    <div className="section-operators relative">
      <Header
        title="Dream Weather"
        subtitle="Kolektif bilinç durumunun atmosferik haritası — 7 günlük tahmin"
        section="operators"
        actions={
          <span className="flex items-center gap-1.5 text-[10px] text-dc-success font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />
            Gerçek Zamanlı
          </span>
        }
      />

      {/* ── EXISTING: Main weather display ── */}
      <div className={`mb-6 relative bg-gradient-to-br ${cfg.bg} border ${cfg.border} rounded-2xl p-8 shadow-2xl ${cfg.glow} overflow-hidden`}>
        {/* Micro-particle ambient layer */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {[0,1,2,3,4].map(i => (
            <div
              key={i}
              className="absolute rounded-full opacity-15 animate-pulse"
              style={{
                width: `${4 + i * 2}px`,
                height: `${4 + i * 2}px`,
                background: 'currentColor',
                top: `${15 + i * 16}%`,
                left: `${8 + i * 19}%`,
                animationDelay: `${i * 0.9}s`,
                animationDuration: `${3 + i * 0.7}s`,
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-8 relative">
          <div className="text-8xl leading-none select-none">{data.emoji}</div>
          <div className="flex-1">
            <p className={`text-4xl font-bold mb-1 ${cfg.textColor}`}>{CONDITION_LABELS[data.condition]}</p>
            <p className="text-dc-secondary text-sm max-w-lg">{data.description}</p>
            <div className="flex gap-3 mt-4">
              {[
                { key: data.condition, label: 'Durum' },
              ].map(() => (
                <span key="c" className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${cfg.border} ${cfg.textColor}`}>
                  {CONDITION_LABELS[data.condition]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── NEW: AI Weather Report ── */}
      <div className="mb-6 bg-dc-surface border border-dc-border rounded-xl p-6">
        <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-4">Atmosferik Rapor</p>
        <div className="space-y-2.5">
          {narrative.map((line, i) => (
            <p key={i} className={`text-sm leading-relaxed ${i === 0 ? 'text-dc-text font-medium' : 'text-dc-secondary font-light'}`}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* ── EXISTING: Telemetry grid ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Telemetry label="Sıcaklık"        value={data.temperature}   color="dc-success" />
        <Telemetry label="Görüş Mesafesi"  value={data.visibility}    color="dc-primary" />
        <Telemetry label="Türbülans"       value={data.turbulence}    color="dc-error" />
        <Telemetry label="Elektrik Alanı"  value={data.electricField} color="dc-warning" />
      </div>

      {/* ── EXISTING: Telemetry tooltips ── */}
      <div className="grid grid-cols-4 gap-4 mb-6 text-[10px] text-dc-muted">
        <p className="text-center">Pozitiflik ve lucid enerji birleşimi</p>
        <p className="text-center">Bilinç berraklığı ve odak</p>
        <p className="text-center">Anksiyete ve kabus yoğunluğu</p>
        <p className="text-center">Lucid rüya uyanış enerjisi</p>
      </div>

      {/* ── NEW: Atmospheric Explanation + Symbol Weather ── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Left: Why these conditions */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-4">Neden Bu Koşullar?</p>
          <div className="space-y-2.5">
            {atmosExplain.map((t, i) => (
              <p key={i} className={`text-[11px] leading-relaxed ${i === 0 ? 'text-dc-text font-medium' : 'text-dc-secondary'}`}>
                {t}
              </p>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-dc-border/50 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] text-dc-muted mb-1">Duygusal Basınç</p>
              <p className="text-xs font-bold text-dc-error font-mono">%{negPct} negatif yük</p>
            </div>
            <div>
              <p className="text-[9px] text-dc-muted mb-1">Lucid Görünürlük</p>
              <p className="text-xs font-bold text-dc-primary font-mono">%{lucidPct} enerji</p>
            </div>
            <div>
              <p className="text-[9px] text-dc-muted mb-1">Baskın Semboller</p>
              <p className="text-xs font-bold text-dc-text font-mono truncate">
                {topSymbols.slice(0, 3).map(s => s.symbol).join(' · ') || '—'}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-dc-muted mb-1">Rüya Akışı</p>
              <p className="text-xs font-bold text-dc-text font-mono">{totalDreams7d} / 7 gün</p>
            </div>
          </div>
        </div>

        {/* Right: Symbol Weather */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-4">Sembol Havası</p>
          {topSym ? (
            <div>
              <p className="text-[9px] font-mono text-dc-muted uppercase tracking-widest mb-1">Baskın Sembol</p>
              <p className="text-3xl font-black text-dc-text uppercase font-mono tracking-wide mb-1">
                {topSym.symbol.toUpperCase()}
              </p>
              <p className="text-[11px] text-dc-muted mb-3">{topSym.count} rüyada gözlemlendi</p>
              {symAssociations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {symAssociations.map(a => (
                    <span key={a} className="text-[9px] px-2 py-0.5 rounded-full bg-dc-primary/10 border border-dc-primary/20 text-dc-primary">
                      {a}
                    </span>
                  ))}
                </div>
              )}
              <div className="pt-3 border-t border-dc-border/50 flex items-center justify-between">
                <p className="text-[9px] text-dc-muted uppercase tracking-widest">Tahmini yaşam süresi</p>
                <p className="text-xs font-bold text-dc-warning font-mono">~{symLifetime} saat</p>
              </div>
              {topSymbols.length > 1 && (
                <div className="mt-3">
                  <p className="text-[9px] text-dc-muted mb-2">Diğer aktif semboller</p>
                  <div className="flex gap-4">
                    {topSymbols.slice(1).map(s => (
                      <div key={s.symbol} className="flex flex-col gap-0.5">
                        <p className="text-[10px] font-bold text-dc-secondary font-mono">{s.symbol}</p>
                        <p className="text-[8px] text-dc-muted">{s.count} rüya</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-dc-muted">Baskın sembol tespit edilmedi.</p>
          )}
        </div>
      </div>

      {/* ── NEW: Extended Metrics Row ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Telemetry label="Umut İndeksi"     value={hopeIndex}                              color="dc-success" />
        <Telemetry label="Rüya Yoğunluğu"   value={Math.round(totalDreams7d / 7)} unit="rüya/gün" color="dc-primary" />
        <Telemetry label="Senkronizasyon"   value={syncScore}                              color="dc-warning" />
        <Telemetry label="Negatif Yük"      value={negPct}                                 color="dc-error" />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6 text-[10px] text-dc-muted">
        <p className="text-center">Toplumsal pozitif potansiyel endeksi</p>
        <p className="text-center">7 günlük günlük ortalama rüya aktivitesi</p>
        <p className="text-center">Kolektif duygu uyum katsayısı</p>
        <p className="text-center">Aktif negatif emisyon oranı</p>
      </div>

      {/* ── NEW: Dream Events (conditional) ── */}
      {events.length > 0 && (
        <div className="mb-6">
          <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-3">Atmosferik Olaylar</p>
          <div className="grid grid-cols-3 gap-3">
            {events.map(ev => {
              const evCfg = EVENT_SEVERITY_COLORS[ev.severity] ?? EVENT_SEVERITY_COLORS.info;
              return (
                <div key={ev.id} className={`${evCfg.bg} border ${evCfg.border} rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl leading-none">{ev.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-bold ${evCfg.text} uppercase tracking-wide truncate`}>{ev.name}</p>
                      <div className={`w-1.5 h-1.5 rounded-full ${evCfg.dot} animate-pulse mt-0.5`} />
                    </div>
                  </div>
                  <p className="text-[10px] text-dc-secondary leading-relaxed">{ev.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── NEW: Live Warnings (conditional) ── */}
      {warnings.length > 0 && (
        <div className="mb-6 bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-dc-warning animate-pulse" />
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Canlı Uyarılar</p>
          </div>
          <div className="divide-y divide-dc-border/50">
            {warnings.map((w, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <span className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 w-14 shrink-0 ${WARNING_COLORS[w.level] ?? 'text-dc-muted'}`}>
                  {w.level === 'critical' ? 'KRİTİK' : w.level === 'high' ? 'YÜKSEK' : w.level === 'medium' ? 'ORTA' : 'DÜŞÜK'}
                </span>
                <p className="text-[11px] text-dc-secondary leading-relaxed">{w.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NEW: AI Meteorologist Report ── */}
      <div className="mb-6 bg-dc-surface border border-dc-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg leading-none">🔭</span>
          <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">AI Meteorolog Raporu</p>
        </div>
        <p className="text-sm text-dc-secondary leading-loose font-light max-w-4xl">{meteoReport}</p>
      </div>

      {/* ── NEW: 24-Hour Timeline ── */}
      {timeline.length > 0 && (
        <div className="mb-6 bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">24 Saatlik Zaman Çizelgesi</p>
          </div>
          <div className="p-5">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {timeline.map(h => {
                const { label, color } = getHourLabel(h, maxHourlyDreams);
                const barH = maxHourlyDreams > 0 ? Math.max(4, Math.round((h.dreamCount / maxHourlyDreams) * 44)) : 4;
                const hasLucid     = h.lucidCount     > 0;
                const hasNightmare = h.nightmareCount > 0;
                return (
                  <div key={h.hour} className="flex flex-col items-center gap-1 min-w-[56px]">
                    <p className="text-[8px] text-dc-muted font-mono">{String(h.hour).padStart(2, '0')}:00</p>
                    <div className="flex flex-col justify-end" style={{ height: '52px' }}>
                      <div
                        className="w-9 rounded-t-sm bg-dc-primary/25 border border-dc-primary/20 transition-all duration-700"
                        style={{ height: `${barH}px` }}
                      />
                    </div>
                    <p className="text-[8px] text-dc-muted font-mono">{h.dreamCount}</p>
                    <p className={`text-[7px] text-center leading-tight ${color}`} style={{ maxWidth: '56px' }}>
                      {label}
                    </p>
                    {(hasLucid || hasNightmare) && (
                      <div className="flex gap-1 mt-0.5">
                        {hasLucid     && <span className="text-[6px] text-dc-primary font-mono">L{h.lucidCount}</span>}
                        {hasNightmare && <span className="text-[6px] text-dc-error font-mono">K{h.nightmareCount}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── EXISTING: Forecast (enriched with per-day data) ── */}
      <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
          <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">7 Günlük Tahmin</p>
        </div>
        {data.forecast.length === 0 ? (
          <div className="p-6 text-center text-dc-muted text-sm">Yeterli trend verisi yok</div>
        ) : (
          <div className="flex divide-x divide-dc-border">
            {data.forecast.map((f, i) => {
              const fc       = WEATHER_CONFIG[f.condition];
              const emoTR    = EMOTION_TR[f.dominantEmotion ?? ''] ?? (f.dominantEmotion ?? '');
              const emoEmoji = EMOTION_EMOJI[f.dominantEmotion ?? ''] ?? '🌙';
              const sentence = getForecastSentence(f);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 py-4 px-2 hover:bg-white/3 transition-colors">
                  <p className="text-[9px] text-dc-muted font-mono">
                    {new Date(f.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                  </p>
                  <span className="text-2xl leading-none">{FORECAST_EMOJI[f.condition]}</span>
                  <p className={`text-[9px] font-bold ${fc.textColor}`}>{CONDITION_LABELS[f.condition]}</p>
                  <div className="w-8 bg-dc-bg rounded-full h-1">
                    <div
                      className={`${fc.textColor.replace('text-', 'bg-').replace('text-dc-', 'bg-dc-')} h-1 rounded-full`}
                      style={{ width: `${f.score}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-dc-muted">{f.score}</p>
                  {/* Enrichment */}
                  <div className="w-full border-t border-dc-border/30 pt-2 mt-0.5 flex flex-col items-center gap-1">
                    <p className="text-[9px]">
                      {emoEmoji} <span className="text-dc-secondary">{emoTR || '—'}</span>
                    </p>
                    <div className="flex gap-2 text-[7px]">
                      <span className="text-dc-primary font-mono">L%{f.lucidProb ?? 0}</span>
                      <span className="text-dc-error font-mono">K%{f.nightmareProb ?? 0}</span>
                    </div>
                    <p className="text-[7px] text-dc-muted text-center leading-tight px-1">{sentence}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
