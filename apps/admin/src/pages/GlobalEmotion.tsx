import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchGlobalEmotion } from '../api/admin.api';
import type { GlobalEmotionData } from '../types/admin.types';

// ── Design tokens ────────────────────────────────────────────────────────────

const TYPE_STYLES = {
  positive: { bar: 'bg-dc-success', badge: 'bg-dc-success/10 border-dc-success/30 text-dc-success', dot: 'bg-dc-success' },
  negative: { bar: 'bg-dc-error',   badge: 'bg-dc-error/10 border-dc-error/30 text-dc-error',       dot: 'bg-dc-error'   },
  neutral:  { bar: 'bg-dc-muted',   badge: 'bg-dc-muted/10 border-dc-border text-dc-muted',         dot: 'bg-dc-muted'   },
};

const HOUR_LABELS = ['00','01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];

const EMOTION_TR: Record<string, string> = {
  joy: 'Sevinç', peace: 'Huzur', fear: 'Korku', curiosity: 'Merak', hope: 'Umut',
  love: 'Sevgi', anxiety: 'Anksiyete', sadness: 'Üzüntü', excitement: 'Coşku',
  anger: 'Öfke', bliss: 'Mutluluk', wonder: 'Hayranlık', awe: 'Huşu',
  gratitude: 'Şükran', euphoria: 'Öfori', terror: 'Dehşet', despair: 'Umutsuzluk',
  grief: 'Keder', frustration: 'Hayal Kırıklığı', rage: 'Hiddet', panic: 'Panik',
  dread: 'Ürperti', horror: 'Dehşet', shame: 'Utanç', contentment: 'Tatmin',
  happiness: 'Neşe', confusion: 'Karmaşa', longing: 'Özlem', intensity: 'Yoğunluk',
  bittersweet: 'Tatlı Acı', unease: 'Huzursuzluk', clarity: 'Netlik',
};

const EMOTION_ADJECTIVE: Record<string, string> = {
  joy: 'JOYFUL', peace: 'PEACEFUL', fear: 'UNCERTAIN', curiosity: 'CURIOUS',
  hope: 'HOPEFUL', love: 'LOVING', anxiety: 'RESTLESS', sadness: 'MELANCHOLIC',
  excitement: 'INSPIRED', anger: 'TURBULENT', bliss: 'BLISSFUL', wonder: 'IN WONDER',
  awe: 'IN AWE', gratitude: 'GRATEFUL', euphoria: 'EUPHORIC', terror: 'FEARFUL',
  despair: 'SEARCHING', grief: 'PROCESSING', frustration: 'RESTLESS',
  contentment: 'AT PEACE', happiness: 'JOYFUL', confusion: 'UNCERTAIN',
};

const EMOTION_EMOJI: Record<string, string> = {
  joy: '✨', peace: '🌊', fear: '👁', curiosity: '🔮', hope: '🌱',
  love: '💜', anxiety: '🌀', sadness: '💧', excitement: '⚡', anger: '🔥',
  bliss: '☁️', wonder: '🌟', awe: '🌌', gratitude: '🌸', euphoria: '💫',
  terror: '⛈', despair: '🌑', grief: '🌫', frustration: '🌪', rage: '🔴',
  panic: '⚠️', dread: '🌒', shame: '🌧', contentment: '🌙', happiness: '☀️',
};

const PRESSURE_CONFIG = {
  low:      { label: 'DÜŞÜK',  color: 'text-dc-success', bg: 'bg-dc-success/10', border: 'border-dc-success/30' },
  medium:   { label: 'ORTA',   color: 'text-dc-warning', bg: 'bg-dc-warning/10', border: 'border-dc-warning/30' },
  high:     { label: 'YÜKSEK', color: 'text-dc-error',   bg: 'bg-dc-error/10',   border: 'border-dc-error/30'   },
  critical: { label: 'KRİTİK', color: 'text-dc-error',   bg: 'bg-dc-error/20',   border: 'border-dc-error/50'   },
};

const DOMINANCE_CONFIG: Record<string, { label: string; color: string }> = {
  strong:   { label: 'Güçlü',    color: 'text-dc-success' },
  growing:  { label: 'Yükselen', color: 'text-dc-primary' },
  stable:   { label: 'Stabil',   color: 'text-dc-secondary' },
  fading:   { label: 'Azalan',   color: 'text-dc-warning' },
  emerging: { label: 'Yeni',     color: 'text-violet-400' },
};

const RISK_COLORS = {
  low:    { text: 'text-dc-success', bg: 'bg-dc-success/10', border: 'border-dc-success/30' },
  medium: { text: 'text-dc-warning', bg: 'bg-dc-warning/10', border: 'border-dc-warning/30' },
  high:   { text: 'text-dc-error',   bg: 'bg-dc-error/10',   border: 'border-dc-error/30'   },
};

const EVENT_COLORS = {
  positive: { bg: 'bg-dc-success/10', border: 'border-dc-success/30', text: 'text-dc-success', dot: 'bg-dc-success' },
  warning:  { bg: 'bg-dc-warning/10', border: 'border-dc-warning/30', text: 'text-dc-warning', dot: 'bg-dc-warning' },
  info:     { bg: 'bg-dc-primary/10', border: 'border-dc-primary/30', text: 'text-dc-primary', dot: 'bg-dc-primary' },
  critical: { bg: 'bg-dc-error/10',   border: 'border-dc-error/30',   text: 'text-dc-error',   dot: 'bg-dc-error'   },
};

const HEALTH_STATUS_TR = { excellent: 'Mükemmel', healthy: 'Sağlıklı', fair: 'Orta', poor: 'Zayıf', critical: 'Kritik' };
const HEALTH_STATUS_COLORS = { excellent: 'text-dc-success', healthy: 'text-dc-success', fair: 'text-dc-warning', poor: 'text-dc-error', critical: 'text-dc-error' };
const HEALTH_TREND_TR = { improving: '↑ İyileşiyor', stable: '→ Stabil', declining: '↓ Gerileme' };
const HEALTH_TREND_COLORS = { improving: 'text-dc-success', stable: 'text-dc-secondary', declining: 'text-dc-error' };

const WORLD_REGIONS = [
  { name: 'Avrupa', icon: '🌍' }, { name: 'Kuzey Amerika', icon: '🌎' },
  { name: 'Asya', icon: '🌏' }, { name: 'Güney Amerika', icon: '🌎' },
  { name: 'Orta Doğu', icon: '🌍' }, { name: 'Afrika', icon: '🌍' },
];

const POS_EMOTIONS = ['joy','excitement','love','peace','wonder','curiosity','hope','bliss','contentment','happiness','awe','gratitude','euphoria'];
const NEG_EMOTIONS = ['fear','anxiety','sadness','anger','terror','despair','grief','frustration','rage','panic','dread','horror','shame'];

function emotionType(e: string): 'positive' | 'negative' | 'neutral' {
  return POS_EMOTIONS.includes(e) ? 'positive' : NEG_EMOTIONS.includes(e) ? 'negative' : 'neutral';
}

function trEmotion(e: string) { return EMOTION_TR[e] ?? e.charAt(0).toUpperCase() + e.slice(1); }
function adjective(e: string) { return EMOTION_ADJECTIVE[e] ?? e.toUpperCase(); }

// ── Intelligence generators ──────────────────────────────────────────────────

function buildGlobalStatus(d: GlobalEmotionData): { lines: string[]; resonance: 'YÜKSEK' | 'ORTA' | 'DÜŞÜK' } {
  const lines: string[] = [];
  const emo    = trEmotion(d.dominantEmotion);
  const posPct = d.posPct ?? 0;
  const negPct = d.negPct ?? 0;

  if (posPct > 60 && (d.change24h ?? 0) >= 0) {
    lines.push(`İnsanlık bugün duygusal açıdan stabil ve pozitif seyrediyor.`);
  } else if (negPct > 40) {
    lines.push(`İnsanlık bugün kolektif bir duygusal gerilim taşıyor.`);
  } else {
    lines.push(`İnsanlık bugün dengeli bir duygusal akış içinde.`);
  }

  lines.push(`${emo}, kolektif bilinçte baskın duygu konumunu korumaya devam ediyor.`);

  if ((d.coherence ?? 0) > 50) {
    lines.push(`Kolektif senkronizasyon artış gösteriyor — toplumsal uyum güçlü.`);
  } else {
    lines.push(`Kolektif senkronizasyon orta düzeyde — duygusal çeşitlilik gözlemleniyor.`);
  }

  const fearD = d.distribution.find(e => e.emotion === 'fear');
  if (fearD) {
    if ((fearD.trend24h ?? 0) < -3) lines.push(`Korku kolektif alandan çekilmeye devam ediyor — tarihi ortalamanın altında.`);
    else if ((fearD.trend24h ?? 0) > 3) lines.push(`Korku seviyesi hafif yükseliyor — dikkat gerektiriyor.`);
    else lines.push(`Korku stabil ve kontrol altında seyrediyor.`);
  }

  const resonance: 'YÜKSEK' | 'ORTA' | 'DÜŞÜK' = posPct > 60 && (d.coherence ?? 0) > 50 ? 'YÜKSEK' : posPct > 45 ? 'ORTA' : 'DÜŞÜK';
  return { lines, resonance };
}

function buildAIReport(d: GlobalEmotionData): string[] {
  const emoTR   = trEmotion(d.dominantEmotion);
  const growing = d.fastestGrowing ? trEmotion(d.fastestGrowing) : null;
  const decr    = d.fastestDecreasing ? trEmotion(d.fastestDecreasing) : null;
  const sync    = trEmotion(d.mostSynchronized ?? d.dominantEmotion);
  const lines: string[] = [];

  if ((d.posPct ?? 0) > 55 && (d.change24h ?? 0) >= 0) {
    lines.push(`Kolektif duygusal enerji istikrarlı bir şekilde yükseliyor. ${emoTR} baskın frekansta kalmayı sürdürüyor.`);
  } else if ((d.negPct ?? 0) > 40) {
    lines.push(`Kolektif duygusal baskı yükselmiş durumda. ${emoTR} hâkim olsa da negatif akımlar güçlü.`);
  } else {
    lines.push(`Kolektif duygusal enerji stabilize olmaya devam ediyor. ${emoTR} baskın konumunu koruyor.`);
  }

  if (growing && decr) {
    lines.push(`${growing} son 6 saatte belirgin şekilde yükselirken, ${decr} kolektif alandan yavaşça çekiliyor.`);
  } else if (growing) {
    lines.push(`${growing} kolektif alanda hızla güçleniyor — yeni duygusal bir ivme oluşabilir.`);
  }

  if (sync && sync !== emoTR) {
    lines.push(`${sync} ve ${emoTR} beraber yayılmaya devam ediyor — iki duygu arasında güçlü kolektif bağ gözlemleniyor.`);
  }

  const nextCondition = (d.posPct ?? 0) > 60 && (d.change24h ?? 0) >= 3 ? 'Açık' : (d.posPct ?? 0) > 55 ? 'Parçalı Bulutlu' : (d.negPct ?? 0) > 35 ? 'Fırtınalı' : 'Kapalı';
  lines.push(`Bu trend sürdüğü takdirde Dream Weather'ın yarın ${nextCondition} koşullarına geçmesi bekleniyor.`);

  return lines;
}

function buildLiveActivities(d: GlobalEmotionData): Array<{ icon: string; text: string; tag: string }> {
  const acts: Array<{ icon: string; text: string; tag: string }> = [];
  d.distribution.slice(0, 6).forEach(em => {
    const tr24 = em.trend24h ?? 0;
    if (tr24 > 4)  acts.push({ icon: em.type === 'positive' ? '✨' : '⚠️', text: `Yeni ${trEmotion(em.emotion)} kümesi tespit edildi`, tag: 'Yeni' });
    else if (tr24 < -4) acts.push({ icon: '🌊', text: `${trEmotion(em.emotion)} kümesi çözülüyor`, tag: 'Azalıyor' });
    else if (em.dominance === 'strong') acts.push({ icon: '📊', text: `${trEmotion(em.emotion)} aktivitesi güçlü seyiriyor`, tag: 'Aktif' });
  });
  d.events?.slice(0, 2).forEach(ev => acts.push({ icon: ev.icon, text: `${ev.name} aktif`, tag: 'Olay' }));
  if (acts.length < 4) acts.push({ icon: '🔮', text: 'Kolektif uyum indeksi hesaplanıyor', tag: 'Sistem' });
  if (acts.length < 5) acts.push({ icon: '🌐', text: 'Rezonans ağı güncellendi', tag: 'Sistem' });
  if (acts.length < 6) acts.push({ icon: '⚡', text: 'Duygu kümeleri yeniden haritalandı', tag: 'Sistem' });
  return acts.slice(0, 6);
}

// ── Small components ─────────────────────────────────────────────────────────

function GaugeRing({ value, label, color = '#6C63FF' }: { value: number; label: string; color?: string }) {
  const clamp = Math.min(100, Math.max(0, value));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="#2D2D4E" strokeWidth="7" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${clamp * 2.011} 201.1`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-dc-text font-bold text-base leading-none">{clamp}</span>
          <span className="text-dc-muted text-[8px]">/100</span>
        </div>
      </div>
      <p className="text-dc-secondary text-[10px] text-center font-medium">{label}</p>
    </div>
  );
}

function Sparkline({ values, color = '#6C63FF' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const W = 80; const H = 20;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * W,
    H - ((v - min) / (max - min)) * (H - 2) - 1,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={W} height={H} className="overflow-visible opacity-80">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2" fill={color} />
    </svg>
  );
}

function TrendArrow({ value, label }: { value: number; label: string }) {
  const color = value > 0 ? 'text-dc-success' : value < 0 ? 'text-dc-error' : 'text-dc-muted';
  const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '→';
  return (
    <div className="flex flex-col">
      <span className="text-[8px] text-dc-muted uppercase tracking-widest">{label}</span>
      <span className={`text-sm font-bold font-mono ${color}`}>
        {arrow} {value > 0 ? '+' : ''}{value}
      </span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GlobalEmotion() {
  const { data, isLoading, isError } = useQuery({
    queryKey:        ['global-emotion'],
    queryFn:         fetchGlobalEmotion,
    refetchInterval: 60_000,
  });

  // ── Cycling emotion animation ──────────────────────────────────────────────
  const [emoIdx,     setEmoIdx]     = useState(0);
  const [emoVisible, setEmoVisible] = useState(true);

  const topEmotions = useMemo(() => {
    if (!data) return ['joy'];
    return data.distribution.slice(0, 5).map(d => d.emotion);
  }, [data]);

  useEffect(() => {
    if (topEmotions.length < 2) return;
    const interval = setInterval(() => {
      setEmoVisible(false);
      setTimeout(() => { setEmoIdx(i => (i + 1) % topEmotions.length); setEmoVisible(true); }, 450);
    }, 3200);
    return () => clearInterval(interval);
  }, [topEmotions.length]);

  // ── Live activity cycling ─────────────────────────────────────────────────
  const [activityList, setActivityList] = useState<Array<{ icon: string; text: string; tag: string; ts: number }>>([]);
  useEffect(() => {
    if (!data) return;
    const base = buildLiveActivities(data).map((a, i) => ({ ...a, ts: Date.now() - (5 - i) * 8000 }));
    setActivityList(base);
    const CYCLE_TEXTS = [
      { icon: '🔮', text: 'Sembolik rezonans analizi güncellendi', tag: 'Sistem' },
      { icon: '⚡', text: 'Duygu kümesi eşleştirmesi tamamlandı', tag: 'Sistem' },
      { icon: '🌐', text: 'Kolektif uyum indeksi hesaplandı', tag: 'Sistem' },
      { icon: '📊', text: 'Yeni rüya verisi entegre edildi', tag: 'Veri' },
    ];
    let ci = 0;
    const t = setInterval(() => {
      setActivityList(prev => [{ ...CYCLE_TEXTS[ci % CYCLE_TEXTS.length], ts: Date.now() }, ...prev.slice(0, 5)]);
      ci++;
    }, 9000);
    return () => clearInterval(t);
  }, [data]);

  if (isLoading) {
    return (
      <div className="section-operators relative">
        <Header title="Global Emotion" subtitle="Platformun gerçek zamanlı kolektif duygu durumu" section="operators" />
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-dc-surface border border-dc-border rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="section-operators relative">
        <Header title="Global Emotion" subtitle="Platformun gerçek zamanlı kolektif duygu durumu" section="operators" />
        <div className="bg-dc-error/10 border border-dc-error/30 rounded-xl p-6 text-dc-error text-sm">
          Global duygu verisi yüklenemedi.
        </div>
      </div>
    );
  }

  // Derived values
  const dom        = TYPE_STYLES[data.dominantType];
  const maxPct     = Math.max(...data.distribution.map(d => d.pct), 1);
  const pressure   = PRESSURE_CONFIG[data.emotionalPressure ?? 'low'];
  const aiReport   = buildAIReport(data);
  const status     = buildGlobalStatus(data);
  const posPct     = data.posPct     ?? 0;
  const negPct     = data.negPct     ?? 0;
  const neutralPct = data.neutralPct ?? Math.max(0, 100 - posPct - negPct);
  const change24h  = data.change24h  ?? 0;
  const maxHourly  = (data.hourlyBreakdown?.length ?? 0) > 0
    ? Math.max(...data.hourlyBreakdown.map(h => h.dreamCount), 1) : 1;

  const currentCycleEmotion = topEmotions[emoIdx] ?? data.dominantEmotion;

  // World snapshot — assign positive emotions by region
  const posEmotions = data.distribution.filter(d => d.type === 'positive');
  const worldRegions = WORLD_REGIONS.map((r, i) => ({
    ...r,
    emotion: posEmotions[i % Math.max(posEmotions.length, 1)]?.emotion ?? 'peace',
  }));

  // Sparkline values from history
  const sparkValues = (data.history?.length ?? 0) > 1
    ? data.history.map(h => h.posPct)
    : [posPct - 4, posPct - 2, posPct + 1, posPct - 1, posPct + 2, posPct - 1, posPct];

  // Shifts
  const byTrend      = [...data.distribution].sort((a, b) => (b.trend24h ?? 0) - (a.trend24h ?? 0));
  const biggestRise  = byTrend[0];
  const biggestDrop  = byTrend[byTrend.length - 1];
  const byVariance   = data.distribution.filter(d => d.count > 2);
  const mostStable   = [...byVariance].sort((a, b) => Math.abs(a.trend24h ?? 0) - Math.abs(b.trend24h ?? 0))[0];
  const mostVolatile = [...byVariance].sort((a, b) => Math.abs(b.trend24h ?? 0) - Math.abs(a.trend24h ?? 0))[0];

  const totalDreams   = data.totalDreamsAnalyzed ?? 0;
  const totalSymbols  = data.totalSymbolsProcessed ?? 0;
  const clusters      = data.activeEmotionClusters ?? data.distribution.length;

  return (
    <div className="section-operators relative">
      <Header
        title="Global Emotion"
        subtitle="Platformun kolektif duygu durumu — bilinç haritası"
        section="operators"
        actions={
          <span className="flex items-center gap-1.5 text-[10px] text-dc-success font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />
            Canlı · Son 7 Gün
          </span>
        }
      />

      {/* ── EXISTING: Hero card (enriched with "Today Humanity Feels...") ── */}
      <div className="mb-6 bg-dc-surface border border-dc-border rounded-2xl p-6">
        {/* "Today Humanity Feels..." cycling headline */}
        <div className="mb-5 pb-4 border-b border-dc-border/50">
          <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-1">Bugün İnsanlık Hissediyor...</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none" style={{ transition: 'opacity 0.45s', opacity: emoVisible ? 1 : 0 }}>
              {EMOTION_EMOJI[currentCycleEmotion] ?? '✨'}
            </span>
            <p
              className="text-[28px] font-black tracking-wider"
              style={{
                transition: 'opacity 0.45s',
                opacity: emoVisible ? 1 : 0,
                color: emotionType(currentCycleEmotion) === 'positive' ? '#4CAF87' : emotionType(currentCycleEmotion) === 'negative' ? '#FF4D6D' : '#8B8BA7',
                fontFamily: 'monospace',
              }}
            >
              {adjective(currentCycleEmotion)}
            </p>
          </div>
        </div>

        {/* Main hero layout (existing) */}
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-3 min-w-[180px]">
            <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">Global Duygu</p>
            <div>
              <p className="text-[9px] font-mono text-dc-muted mb-0.5 uppercase tracking-widest">Baskın Duygu</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none">{EMOTION_EMOJI[data.dominantEmotion] ?? '🌙'}</span>
                <p className="text-3xl font-bold text-dc-text capitalize" style={{ animationDuration: '3s' }}>
                  {trEmotion(data.dominantEmotion).toUpperCase()}
                </p>
              </div>
              <span className={`mt-2 inline-block text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${dom.badge}`}>
                {data.dominantType === 'positive' ? 'Pozitif' : data.dominantType === 'negative' ? 'Negatif' : 'Nötr'}
              </span>
            </div>
            <div className="space-y-1 pt-1">
              <div className="flex gap-2 text-[10px] font-mono font-bold">
                <span className="text-dc-success">%{posPct} Pozitif</span>
                <span className="text-dc-muted">·</span>
                <span className="text-dc-error">%{negPct} Negatif</span>
                <span className="text-dc-muted">·</span>
                <span className="text-dc-muted">%{neutralPct} Nötr</span>
              </div>
              <div className="flex gap-1 text-[9px]">
                <span className={`px-2 py-0.5 rounded-full border font-bold ${pressure.bg} ${pressure.border} ${pressure.color}`}>
                  Baskı: {pressure.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 border-l border-dc-border pl-8 flex gap-8 justify-center">
            <GaugeRing value={data.energyLevel} label="Enerji Seviyesi" color="#6C63FF" />
            <GaugeRing value={data.coherence}   label="Topluluk Uyumu"  color="#4CAF87" />
            <GaugeRing value={data.confidence ?? 80} label="Güven Skoru" color="#F5A623" />
          </div>

          <div className="border-l border-dc-border pl-8 space-y-2 min-w-[200px]">
            <div>
              <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-0.5">24s Değişim</p>
              <p className={`text-sm font-bold font-mono ${change24h >= 0 ? 'text-dc-success' : 'text-dc-error'}`}>
                {change24h >= 0 ? '↑' : '↓'} {change24h >= 0 ? '+' : ''}{change24h}%
              </p>
            </div>
            <div>
              <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-0.5">En Senkronize</p>
              <p className="text-[11px] font-semibold text-dc-text">{trEmotion(data.mostSynchronized ?? data.dominantEmotion)}</p>
            </div>
            {data.fastestGrowing && (
              <div>
                <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-0.5">En Hızlı Büyüyen</p>
                <p className="text-[11px] font-semibold text-dc-success">↑ {trEmotion(data.fastestGrowing)}</p>
              </div>
            )}
            {data.fastestDecreasing && (
              <div>
                <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-0.5">En Hızlı Azalan</p>
                <p className="text-[11px] font-semibold text-dc-error">↓ {trEmotion(data.fastestDecreasing)}</p>
              </div>
            )}
            <div>
              <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-0.5">Güven</p>
              <p className="text-[11px] font-semibold text-dc-text font-mono">%{data.confidence ?? 80}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── NEW: Global Emotional Status banner ── */}
      <div className="mb-6 bg-gradient-to-br from-dc-primary/8 to-violet-900/5 border border-dc-primary/20 rounded-xl p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base leading-none">🌍</span>
              <p className="text-[9px] font-bold text-dc-primary uppercase tracking-widest">Global Duygusal Durum</p>
            </div>
            <div className="space-y-1.5">
              {status.lines.map((line, i) => (
                <p key={i} className={`leading-relaxed ${i === 0 ? 'text-sm font-medium text-dc-text' : 'text-[11px] text-dc-secondary font-light'}`}>
                  {line}
                </p>
              ))}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-1">Rezonans Olasılığı</p>
            <p className={`text-2xl font-black font-mono ${status.resonance === 'YÜKSEK' ? 'text-dc-success' : status.resonance === 'ORTA' ? 'text-dc-warning' : 'text-dc-muted'}`}>
              {status.resonance}
            </p>
            <div className={`mt-1 w-2 h-2 rounded-full ml-auto ${status.resonance === 'YÜKSEK' ? 'bg-dc-success' : status.resonance === 'ORTA' ? 'bg-dc-warning' : 'bg-dc-muted'} animate-pulse`} />
          </div>
        </div>
      </div>

      {/* ── NEW: Global Emotion Index + World Snapshot (2-col) ── */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Global Emotion Index */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">Global Duygu İndeksi</p>
          <div className="flex items-end gap-4 mb-3">
            <div>
              <p className="text-5xl font-black text-dc-text font-mono leading-none">{data.globalEmotionIndex ?? data.healthScore}</p>
              <p className="text-[9px] text-dc-muted mt-1">100 üzerinden kompozit skor</p>
            </div>
            <div className="mb-1">
              <Sparkline values={sparkValues} color="#6C63FF" />
            </div>
          </div>
          <div className="flex gap-5 mb-4">
            <TrendArrow value={data.indexTrendDay  ?? change24h} label="Bugün" />
            <TrendArrow value={data.indexTrendWeek ?? 0}         label="Bu Hafta" />
            <TrendArrow value={data.indexTrendMonth ?? 0}        label="Bu Ay" />
          </div>
          <p className="text-[10px] text-dc-muted leading-relaxed border-t border-dc-border/50 pt-3">
            {(data.globalEmotionIndex ?? data.healthScore) >= 70
              ? 'Kolektif duygusal enerji yüksek — pozitif rezonans güçlü.'
              : (data.globalEmotionIndex ?? data.healthScore) >= 50
              ? 'Kolektif enerji orta düzeyde stabil — denge sürdürülüyor.'
              : 'Kolektif duygusal baskı yüksek — dengeleme süreci devam ediyor.'}
          </p>
        </div>

        {/* World Emotional Snapshot */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">Dünya Duygusal Anlık Görüntüsü</p>
          <div className="grid grid-cols-2 gap-2">
            {worldRegions.map((r) => {
              const emoColor = emotionType(r.emotion) === 'positive' ? 'bg-dc-success' : emotionType(r.emotion) === 'negative' ? 'bg-dc-error' : 'bg-dc-muted';
              return (
                <div key={r.name} className="flex items-center gap-2 p-2.5 bg-dc-bg/50 rounded-lg border border-dc-border/40 hover:border-dc-border transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${emoColor} animate-pulse`} style={{ animationDuration: `${2 + Math.random()}s` }} />
                  <div className="min-w-0">
                    <p className="text-[9px] text-dc-muted truncate">{r.icon} {r.name}</p>
                    <p className="text-[10px] font-semibold text-dc-text">{trEmotion(r.emotion)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[8px] text-dc-muted mt-3 pt-3 border-t border-dc-border/50">
            DreamCloud bölgesel sinyal haritası · Gerçek zamanlı duygu dağılımından türetildi
          </p>
        </div>
      </div>

      {/* ── EXISTING: AI Emotional Report ── */}
      <div className="mb-6 bg-dc-surface border border-dc-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg leading-none">🧠</span>
          <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">AI Duygusal Rapor</p>
        </div>
        <div className="space-y-2">
          {aiReport.map((line, i) => (
            <p key={i} className={`text-sm leading-relaxed ${i === 0 ? 'text-dc-text font-medium' : 'text-dc-secondary font-light'}`}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* ── NEW: Emotional Shifts (compact 4-cell) ── */}
      <div className="mb-5 grid grid-cols-4 gap-3">
        {biggestRise && (
          <div className="bg-dc-surface border border-dc-border rounded-xl p-4">
            <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-2">En Büyük Artış</p>
            <p className="text-sm font-bold text-dc-success">{trEmotion(biggestRise.emotion)}</p>
            <p className="text-xs font-bold font-mono text-dc-success">+{biggestRise.trend24h ?? 0}%</p>
          </div>
        )}
        {biggestDrop && (
          <div className="bg-dc-surface border border-dc-border rounded-xl p-4">
            <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-2">En Büyük Düşüş</p>
            <p className="text-sm font-bold text-dc-error">{trEmotion(biggestDrop.emotion)}</p>
            <p className="text-xs font-bold font-mono text-dc-error">{biggestDrop.trend24h ?? 0}%</p>
          </div>
        )}
        {mostStable && (
          <div className="bg-dc-surface border border-dc-border rounded-xl p-4">
            <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-2">En Stabil</p>
            <p className="text-sm font-bold text-dc-secondary">{trEmotion(mostStable.emotion)}</p>
            <p className="text-[10px] text-dc-muted">→ Sabit akış</p>
          </div>
        )}
        {mostVolatile && (
          <div className="bg-dc-surface border border-dc-border rounded-xl p-4">
            <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-2">En Oynak</p>
            <p className="text-sm font-bold text-dc-warning">{trEmotion(mostVolatile.emotion)}</p>
            <p className="text-[10px] text-dc-warning font-mono">±{Math.abs(mostVolatile.trend24h ?? 0)}%</p>
          </div>
        )}
      </div>

      {/* ── EXISTING: Emotional Balance + Health Score (enriched) ── */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Emotional Balance */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">Duygusal Denge</p>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-semibold text-dc-success uppercase tracking-wide">Pozitif</span>
                <span className="text-sm font-bold text-dc-success font-mono">%{posPct}</span>
              </div>
              <div className="w-full bg-dc-bg rounded-full h-2">
                <div className="bg-dc-success h-2 rounded-full transition-all duration-700" style={{ width: `${posPct}%` }} />
              </div>
              <p className="text-[9px] text-dc-muted mt-1">Pozitif duygular baskın — kolektif alan açık.</p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-semibold text-dc-error uppercase tracking-wide">Negatif</span>
                <span className="text-sm font-bold text-dc-error font-mono">%{negPct}</span>
              </div>
              <div className="w-full bg-dc-bg rounded-full h-2">
                <div className="bg-dc-error h-2 rounded-full transition-all duration-700" style={{ width: `${negPct}%` }} />
              </div>
              <p className="text-[9px] text-dc-muted mt-1">{negPct > 35 ? 'Kolektif baskı yüksek — izleme sürdürülüyor.' : 'Kontrol altında — belirgin bir risk yok.'}</p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-semibold text-dc-muted uppercase tracking-wide">Nötr</span>
                <span className="text-sm font-bold text-dc-muted font-mono">%{neutralPct}</span>
              </div>
              <div className="w-full bg-dc-bg rounded-full h-2">
                <div className="bg-dc-muted h-2 rounded-full transition-all duration-700" style={{ width: `${neutralPct}%` }} />
              </div>
              <p className="text-[9px] text-dc-muted mt-1">İşleme sürecindeki duygusal içerik.</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-dc-border/50 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-0.5">Pozitif Trend</p>
              <p className={`text-xs font-bold font-mono ${change24h >= 0 ? 'text-dc-success' : 'text-dc-error'}`}>
                {change24h >= 0 ? '↑' : '↓'}{Math.abs(change24h)}% 24s
              </p>
            </div>
            <div>
              <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-0.5">Net Değişim</p>
              <p className={`text-xs font-bold font-mono ${change24h >= 0 ? 'text-dc-success' : 'text-dc-error'}`}>
                {change24h >= 0 ? '+' : ''}{change24h}
              </p>
            </div>
            <div>
              <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-0.5">Negatif Trend</p>
              <p className="text-xs font-bold font-mono text-dc-muted">%{negPct} negatif baskı</p>
            </div>
            <div>
              <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-0.5">Oynaklık</p>
              <p className="text-xs font-bold font-mono text-dc-warning">%{data.volatility ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Health Score — enriched with Confidence Explanation */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">Kolektif Duygusal Sağlık</p>
          <div className="flex items-center gap-6 mb-4">
            <div className="relative flex-shrink-0">
              <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#2D2D4E" strokeWidth="7" />
                <circle cx="40" cy="40" r="32" fill="none"
                  stroke={data.healthScore >= 65 ? '#4CAF87' : data.healthScore >= 50 ? '#F5A623' : '#FF4D6D'}
                  strokeWidth="7" strokeDasharray={`${data.healthScore * 2.011} 201.1`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-bold text-xl leading-none ${HEALTH_STATUS_COLORS[data.healthStatus ?? 'healthy']}`}>{data.healthScore}</span>
                <span className="text-dc-muted text-[8px]">/100</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <div>
                <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-0.5">Durum</p>
                <p className={`text-sm font-bold ${HEALTH_STATUS_COLORS[data.healthStatus ?? 'healthy']}`}>{HEALTH_STATUS_TR[data.healthStatus ?? 'healthy']}</p>
              </div>
              <div>
                <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-0.5">Trend</p>
                <p className={`text-sm font-bold ${HEALTH_TREND_COLORS[data.healthTrend ?? 'stable']}`}>{HEALTH_TREND_TR[data.healthTrend ?? 'stable']}</p>
              </div>
              <div>
                <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-0.5">Güven %{data.confidence ?? 80}</p>
                <p className="text-[9px] text-dc-muted">{data.confidence ?? 80 >= 85 ? 'Çok yüksek güven' : 'Güvenilir tahmin'}</p>
              </div>
            </div>
          </div>
          {/* Confidence Explanation */}
          <div className="pt-3 border-t border-dc-border/50">
            <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-2">Güven Skoru Nasıl Hesaplanıyor?</p>
            <div className="space-y-1">
              {[
                { icon: '📊', text: `${totalDreams.toLocaleString()} rüya analizi` },
                { icon: '🔮', text: `${clusters} aktif duygu kümesi` },
                { icon: '✨', text: `${totalSymbols.toLocaleString()} sembol grubu` },
                { icon: '📈', text: (data.volatility ?? 0) < 30 ? 'Düşük oynaklık' : 'Orta oynaklık' },
                { icon: '🌐', text: (data.coherence ?? 0) > 50 ? 'Yüksek senkronizasyon' : 'Orta senkronizasyon' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] leading-none">{item.icon}</span>
                  <p className="text-[9px] text-dc-secondary">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── EXISTING: Distribution + Hourly flow ── */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Duygu Dağılımı</p>
          </div>
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {data.distribution.map((d) => {
              const s  = TYPE_STYLES[d.type];
              const dc = DOMINANCE_CONFIG[d.dominance ?? 'stable'];
              const tr = d.trend24h ?? 0;
              return (
                <div key={d.emotion} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                  <span className="text-dc-secondary text-[10px] capitalize w-20 truncate">{trEmotion(d.emotion)}</span>
                  <div className="flex-1 bg-dc-bg rounded-full h-1.5">
                    <div className={`${s.bar} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${(d.pct / maxPct) * 100}%` }} />
                  </div>
                  <span className="text-dc-muted text-[9px] w-7 text-right shrink-0 font-mono">{d.pct}%</span>
                  <span className={`text-[8px] w-10 text-right shrink-0 font-mono ${tr > 0 ? 'text-dc-success' : tr < 0 ? 'text-dc-error' : 'text-dc-muted'}`}>
                    {tr > 0 ? `↑${tr}%` : tr < 0 ? `↓${Math.abs(tr)}%` : '→'}
                  </span>
                  <span className={`text-[7px] w-14 text-right shrink-0 font-mono ${dc.color}`}>{dc.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high flex items-center justify-between">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Saatlik Duygu Akışı</p>
          </div>
          <div className="p-4">
            {(data.hourlyBreakdown?.length ?? 0) > 0 ? (
              <>
                <div className="flex items-end gap-0.5 h-40 mb-2">
                  {HOUR_LABELS.map((h) => {
                    const hb = data.hourlyBreakdown?.find(e => e.hour === parseInt(h));
                    if (!hb || hb.dreamCount === 0) return (
                      <div key={h} className="flex-1 flex flex-col justify-end">
                        <div className="w-full bg-dc-border/15 rounded-sm" style={{ height: '3px' }} />
                      </div>
                    );
                    const totalH = hb.dreamCount;
                    const barTotal = Math.max(6, Math.round((totalH / maxHourly) * 140));
                    const posH = Math.round((hb.posCount / totalH) * barTotal);
                    const negH = Math.round((hb.negCount / totalH) * barTotal);
                    const neuH = Math.max(0, barTotal - posH - negH);
                    return (
                      <div key={h} className="flex-1 flex flex-col justify-end gap-0" title={`${h}:00 — ${trEmotion(hb.dominant)} (${totalH} rüya)`}>
                        {negH > 0 && <div className="w-full bg-dc-error/70 rounded-t-sm" style={{ height: `${negH}px` }} />}
                        {neuH > 0 && <div className="w-full bg-dc-muted/50" style={{ height: `${neuH}px` }} />}
                        {posH > 0 && <div className="w-full bg-dc-success rounded-b-sm" style={{ height: `${posH}px` }} />}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[8px] text-dc-muted font-mono">
                  <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
                </div>
                <div className="flex gap-3 mt-3 justify-center">
                  <span className="flex items-center gap-1 text-[9px] text-dc-success"><span className="w-1.5 h-1.5 rounded-sm bg-dc-success" />Pozitif</span>
                  <span className="flex items-center gap-1 text-[9px] text-dc-muted"><span className="w-1.5 h-1.5 rounded-sm bg-dc-muted" />Nötr</span>
                  <span className="flex items-center gap-1 text-[9px] text-dc-error"><span className="w-1.5 h-1.5 rounded-sm bg-dc-error/70" />Negatif</span>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-dc-muted text-sm">Yeterli saatlik veri yok</div>
            )}
          </div>
        </div>
      </div>

      {/* ── EXISTING: Emotional Events ── */}
      {(data.events?.length ?? 0) > 0 && (
        <div className="mb-5">
          <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-3">Duygusal Olaylar</p>
          <div className="grid grid-cols-3 gap-3">
            {data.events!.map(ev => {
              const ec = EVENT_COLORS[ev.severity] ?? EVENT_COLORS.info;
              return (
                <div key={ev.id} className={`${ec.bg} border ${ec.border} rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl leading-none">{ev.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-bold ${ec.text} uppercase tracking-wide truncate`}>{ev.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${ec.dot} animate-pulse`} />
                        <span className="text-[8px] text-dc-muted">{ev.duration}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-dc-secondary leading-relaxed">{ev.description}</p>
                  <p className="text-[8px] text-dc-muted mt-2 font-mono">{ev.affectedDreams} rüya etkilendi</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EXISTING: Correlations + AI Insights (expanded) ── */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Duygusal Korelasyonlar</p>
          </div>
          <div className="p-4 space-y-4">
            {(data.correlations?.length ?? 0) === 0 && <p className="text-dc-muted text-sm">Yeterli korelasyon verisi yok.</p>}
            {data.correlations?.slice(0, 3).map(corr => (
              <div key={corr.emotion}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm leading-none">{EMOTION_EMOJI[corr.emotion] ?? '🌙'}</span>
                  <p className="text-[10px] font-bold text-dc-text uppercase tracking-wide">{trEmotion(corr.emotion)}</p>
                  <span className="text-[8px] text-dc-muted ml-1">ile güçlü korelasyon:</span>
                </div>
                <div className="space-y-1 pl-5">
                  {corr.correlates.slice(0, 3).map(c => (
                    <div key={c.emotion} className="flex items-center gap-2">
                      <span className={`text-[8px] ${c.direction === 'positive' ? 'text-dc-success' : 'text-dc-error'} w-3`}>
                        {c.direction === 'positive' ? '+' : '−'}
                      </span>
                      <span className="text-[10px] text-dc-secondary capitalize w-20">{trEmotion(c.emotion)}</span>
                      <div className="flex-1 bg-dc-bg rounded-full h-1">
                        <div className={`${c.direction === 'positive' ? 'bg-dc-success' : 'bg-dc-error'} h-1 rounded-full transition-all duration-700`}
                          style={{ width: `${c.strength}%` }} />
                      </div>
                      <span className="text-[9px] text-dc-muted font-mono w-8 text-right">%{c.strength}</span>
                    </div>
                  ))}
                  {corr.correlates.length === 0 && <p className="text-[9px] text-dc-muted">Korelasyon verisi yok.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Observations — expanded */}
        <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high flex items-center justify-between">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">AI Gözlem Motoru</p>
            <span className="text-[8px] text-dc-success font-bold uppercase flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-dc-success animate-pulse" />Canlı
            </span>
          </div>
          <div className="p-4 space-y-2.5">
            {(data.insights ?? []).map((insight, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-dc-primary mt-1.5 shrink-0 animate-pulse"
                  style={{ animationDelay: `${i * 0.35}s`, animationDuration: `${2 + i * 0.2}s` }} />
                <p className="text-[11px] text-dc-secondary leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── NEW: Live Activity Feed ── */}
      <div className="mb-5 bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high flex items-center justify-between">
          <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Canlı Aktivite</p>
          <span className="flex items-center gap-1.5 text-[8px] text-dc-success font-bold uppercase">
            <span className="w-1 h-1 rounded-full bg-dc-success animate-pulse" />Otomatik Güncelleme
          </span>
        </div>
        <div className="divide-y divide-dc-border/40">
          {activityList.slice(0, 6).map((act, i) => (
            <div key={`${act.ts}-${i}`} className="px-5 py-2.5 flex items-center gap-3 hover:bg-white/2 transition-colors"
              style={{ opacity: 1, transition: 'opacity 0.5s' }}>
              <span className="text-base leading-none shrink-0">{act.icon}</span>
              <p className="text-[11px] text-dc-secondary flex-1">{act.text}</p>
              <span className="text-[8px] text-dc-muted font-mono shrink-0 px-1.5 py-0.5 bg-dc-bg rounded border border-dc-border/50">
                {act.tag}
              </span>
              <span className="text-[8px] text-dc-muted font-mono shrink-0">
                {i === 0 ? 'şimdi' : `${i * 8}s`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── NEW: Emotional History Timeline ── */}
      {(data.history?.length ?? 0) > 0 && (
        <div className="mb-5 bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Duygusal Geçmiş</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dc-border/50">
                  <th className="text-left px-5 py-2.5 text-[8px] font-bold text-dc-muted uppercase tracking-widest">Dönem</th>
                  <th className="text-left px-4 py-2.5 text-[8px] font-bold text-dc-muted uppercase tracking-widest">Baskın Duygu</th>
                  <th className="text-left px-4 py-2.5 text-[8px] font-bold text-dc-muted uppercase tracking-widest">Ort. Pozitiflik</th>
                  <th className="text-left px-4 py-2.5 text-[8px] font-bold text-dc-muted uppercase tracking-widest">Ort. Negatiflik</th>
                  <th className="text-left px-4 py-2.5 text-[8px] font-bold text-dc-muted uppercase tracking-widest">Duygusal Skor</th>
                  <th className="px-4 py-2.5 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-dc-border/30">
                {data.history.map((h) => (
                  <tr key={h.period} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-bold text-dc-text">{h.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm leading-none">{EMOTION_EMOJI[h.dominantEmotion] ?? '🌙'}</span>
                        <span className="text-[10px] text-dc-secondary">{trEmotion(h.dominantEmotion)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-dc-bg rounded-full h-1">
                          <div className="bg-dc-success h-1 rounded-full" style={{ width: `${h.posPct}%` }} />
                        </div>
                        <span className="text-[9px] text-dc-success font-mono">%{h.posPct}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-dc-bg rounded-full h-1">
                          <div className="bg-dc-error h-1 rounded-full" style={{ width: `${h.negPct}%` }} />
                        </div>
                        <span className="text-[9px] text-dc-error font-mono">%{h.negPct}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold font-mono ${h.emotionalScore >= 65 ? 'text-dc-success' : h.emotionalScore >= 50 ? 'text-dc-warning' : 'text-dc-error'}`}>
                        {h.emotionalScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Sparkline values={[h.posPct * 0.9, h.posPct, h.posPct * 1.05, h.posPct * 0.95, h.posPct]} color={h.posPct >= 55 ? '#4CAF87' : '#F5A623'} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EXISTING: 7-day Forecast ── */}
      {(data.forecast?.length ?? 0) > 0 && (
        <div className="mb-5 bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">7 Günlük Duygusal Tahmin</p>
          </div>
          <div className="flex divide-x divide-dc-border">
            {data.forecast!.map((f, i) => {
              const rc    = RISK_COLORS[f.risk];
              const emo   = trEmotion(f.dominantEmotion);
              const emoji = EMOTION_EMOJI[f.dominantEmotion] ?? '🌙';
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 py-5 px-2 hover:bg-white/3 transition-colors">
                  <p className="text-[8px] text-dc-muted font-mono">
                    {new Date(f.date).toLocaleDateString('tr-TR', { weekday: 'short' }).toUpperCase()}
                  </p>
                  <p className="text-[8px] text-dc-muted font-mono">
                    {new Date(f.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                  </p>
                  <span className="text-2xl leading-none mt-1">{emoji}</span>
                  <p className="text-[9px] font-bold text-dc-text text-center">{emo}</p>
                  <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border ${rc.bg} ${rc.border} ${rc.text}`}>
                    {f.risk === 'low' ? 'Düşük' : f.risk === 'medium' ? 'Orta' : 'Yüksek'}
                  </span>
                  <p className="text-[8px] text-dc-muted text-center leading-tight px-1 mt-0.5">{f.prediction}</p>
                  <p className="text-[7px] text-dc-muted/70 text-center leading-tight px-1 italic">{f.comment}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── NEW: DreamCloud Signature Footer ── */}
      <div className="bg-dc-surface border border-dc-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-dc-primary/20 border border-dc-primary/30 flex items-center justify-center">
            <span className="text-dc-primary text-sm leading-none">⚡</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-dc-text uppercase tracking-widest">DreamCloud Emotional Engine</p>
            <p className="text-[9px] text-dc-muted">Kolektif Bilinç Analiz Sistemi · v2.0</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />
            <span className="text-[9px] text-dc-success font-bold uppercase tracking-widest">Aktif</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            'Dream Intelligence', 'Kolektif Sembol Ağı', 'Duygu Analiz Motoru',
            'Arketip Zekası', 'Rezonans Tespiti', 'Dream Weather',
          ].map((system, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 bg-dc-bg rounded-lg border border-dc-border/50 hover:border-dc-border transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-dc-success shrink-0" />
              <span className="text-[9px] text-dc-secondary">{system}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-3 pt-4 border-t border-dc-border/50">
          {[
            { label: 'Analiz Edilen Rüya', value: totalDreams > 0 ? totalDreams.toLocaleString() : '—' },
            { label: 'İşlenen Sembol',     value: totalSymbols > 0 ? totalSymbols.toLocaleString() : '—' },
            { label: 'Duygu Kümesi',       value: clusters.toString() },
            { label: 'Aktif Rezonans',     value: `%${data.coherence}` },
            { label: 'AI Güveni',          value: `%${data.confidence ?? 80}` },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-xs font-bold text-dc-text font-mono">{stat.value}</p>
              <p className="text-[8px] text-dc-muted mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <p className="text-[8px] text-dc-muted/50 text-center mt-4">
          Powered by Dream Intelligence · Collective Symbol Network · Emotion Analysis Engine · Archetype Intelligence · Resonance Detection
        </p>
      </div>
    </div>
  );
}
