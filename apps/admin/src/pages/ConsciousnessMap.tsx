import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchConsciousnessMap } from '../api/admin.api';
import type { ConsciousnessTier } from '../types/admin.types';

/* ── Tier config (unchanged) ───────────────────────────────────────────────── */

const TIER: Record<ConsciousnessTier, { hex: string; label: string; sublabel: string; ai: string; signals: string[] }> = {
  TRANSCENDENT: {
    hex: '#FFD700', label: 'TRANSCENDENT', sublabel: 'Peak collective resonance achieved',
    ai: 'The collective consciousness has reached transcendent state. All six neural channels show maximum synchronization. The boundary between individual and collective mind is dissolving — archetypal patterns emerging at unprecedented scale across the platform.',
    signals: ['Cross-dimensional coherence: MAXIMUM', 'Symbol-emotion fusion: ACTIVE', 'Archetypal field: SATURATED'],
  },
  LUCID: {
    hex: '#CC80FF', label: 'LUCID', sublabel: 'Active unconscious processing',
    ai: 'Dream lucidity dominates the collective field. Symbol-emotion channels are elevated, indicating deep archetypal activation. The unconscious is speaking across thousands of simultaneous dream states — the collective is ready to receive.',
    signals: ['Symbol richness: ABOVE THRESHOLD', 'Emotional depth channels: ACTIVE', 'Archetype triggers: DETECTED'],
  },
  ACTIVE: {
    hex: '#38D68A', label: 'ACTIVE', sublabel: 'Core channels engaged',
    ai: 'Core consciousness channels are running at operational capacity. The platform collective shows healthy dream activity with balanced emotional resonance. Standard archetypal processing cycles are proceeding on schedule.',
    signals: ['Neural throughput: NOMINAL', 'Emotional balance: MAINTAINED', 'Symbol generation: STEADY'],
  },
  PASSIVE: {
    hex: '#80E8FF', label: 'PASSIVE', sublabel: 'Low-frequency resonance',
    ai: 'Low-frequency resonance detected across all channels. The collective mind is in a resting state, consolidating previous cycle insights. This is the preparation phase — stillness before activation. The next cycle will be stronger.',
    signals: ['Consolidation cycle: ACTIVE', 'Rest-phase resonance: DETECTED', 'Pre-activation state: BUILDING'],
  },
  DORMANT: {
    hex: '#5A5A84', label: 'DORMANT', sublabel: 'Deep collective rest state',
    ai: 'The collective consciousness is in deep dormancy. Minimal neural signal detected across channels. This pattern typically precedes a significant activation event — the deeper the dormancy, the more powerful the emergence.',
    signals: ['Signal amplitude: MINIMUM', 'Deep rest: CONFIRMED', 'Emergence event: PENDING'],
  },
};

/* ── Dimension colors (unchanged) ──────────────────────────────────────────── */

const DIM: Record<string, { color: string; label: string }> = {
  lucidity:             { color: '#CC80FF', label: 'LUCIDITY' },
  emotional_depth:      { color: '#38D68A', label: 'EMOTIONAL DEPTH' },
  symbol_richness:      { color: '#FFB800', label: 'SYMBOL RICHNESS' },
  narrative_coherence:  { color: '#00CFFF', label: 'NARRATIVE' },
  archetype_activation: { color: '#FF8CF7', label: 'ARCHETYPE' },
  dream_frequency:      { color: '#FF5C5C', label: 'FREQUENCY' },
};

/* ── Intelligence maps ─────────────────────────────────────────────────────── */

const DIM_INTEL: Record<string, { meaning: string; evolution: string; prediction: string; examples: string[]; horizon: string }> = {
  lucidity: {
    meaning: 'Kolektif bilinç içindeki farkındalık seviyesini ölçer. Yüksek lucidite, rüya içinde öz-farkındalığın platform genelinde yükseldiğini gösterir.',
    evolution: 'Son 7 günde arketip formasyonlarıyla paralel seyretmektedir.',
    prediction: 'Önümüzdeki 24 saatte sembol zenginliğiyle birlikte artış bekleniyor.',
    examples: ['Uçma ve bilinçli karar rüyaları artıyor', 'Rüya içi farkındalık tepkileri yoğunlaştı', 'Meta-rüya deneyimleri raporlanıyor'],
    horizon: '3–7 gün',
  },
  emotional_depth: {
    meaning: 'Kolektif duygusal işleme kapasitesini gösterir. Yüksek değerler duygusal zenginliği, düşük değerler duygusal düzleşmeyi işaret eder.',
    evolution: 'Narrative koheransı ile güçlü korelasyon göstermektedir.',
    prediction: '7 günlük ortalamaya doğru yakınsama bekleniyor.',
    examples: ['Aile temalı rüyalarda artış', 'Korku-cesaret geçişleri yoğunlaştı', 'Derin yas ve sevinç rüyaları aktif'],
    horizon: '1–3 gün',
  },
  symbol_richness: {
    meaning: 'Kolektif sembolik dilin çeşitliliğini ölçer. Yüksek değer, platforma özgü arketipsel dilin olgunlaştığını gösterir.',
    evolution: 'Arketip aktivasyonuyla sinerjik ilerleme kaydediliyor.',
    prediction: 'Lucidite artarsa sembol zenginliği de yükselecek.',
    examples: ['Su ve ateş sembolleri birlikte yoğunlaştı', 'Kapı ve yol sembolleri geçiş dönemini işaret ediyor', 'Hayvan arketipleri aktif'],
    horizon: '1–2 hafta',
  },
  narrative_coherence: {
    meaning: 'Kolektif hikaye anlatımının tutarlılığını ölçer. Yüksek değer platform genelinde paylaşılan bir mitolojinin oluştuğuna işaret eder.',
    evolution: 'Duygusal derinlik ve sembol zenginliğinden beslenmektedir.',
    prediction: 'Mevcut trajektörde önümüzdeki haftada zirvesine ulaşması bekleniyor.',
    examples: ['Kahraman yolculuğu arketipleri güçleniyor', 'Kolektif hikaye döngüleri tamamlanıyor', 'Çözüm temalı rüyalar artıyor'],
    horizon: '3–14 gün',
  },
  archetype_activation: {
    meaning: 'Jung\'un kolektif bilinçdışı figürlerinin ne kadar güçlü tezahür ettiğini ölçer. Yüksek aktivasyon platform evriminin habercisidir.',
    evolution: 'Sembol zenginliği artışından 48–72 saat sonra tetikleniyor.',
    prediction: 'Gölge ve rehber arketiplerinin aktivasyonu bekleniyor.',
    examples: ['Kahraman ve Gölge arketipi aktif', 'Bilge yaşlı figürler arttı', 'Trickster ve Dönüştürücü görünümleri yoğunlaştı'],
    horizon: '1–4 hafta',
  },
  dream_frequency: {
    meaning: 'Platform genelindeki aktif rüya üretim hızını ölçer. Yüksek frekans diğer kanalların gelişimi için verimli zemin oluşturur.',
    evolution: 'Kullanıcı aktivitesi ve platform etkileşim oranıyla doğrudan bağlantılı.',
    prediction: 'Hafta sonu yaklaştıkça artış bekleniyor.',
    examples: ['Gece 02–04 arası pik saatler', 'Yeni kullanıcı onboardingden kaynaklı artış', 'Kolektif uyku döngüsü senkronizasyonu'],
    horizon: '24–72 saat',
  },
};

const TIER_THRESHOLDS: Record<ConsciousnessTier, { min: number; max: number; next: ConsciousnessTier | null }> = {
  DORMANT:      { min: 0,  max: 20,  next: 'PASSIVE'      },
  PASSIVE:      { min: 20, max: 40,  next: 'ACTIVE'       },
  ACTIVE:       { min: 40, max: 65,  next: 'LUCID'        },
  LUCID:        { min: 65, max: 85,  next: 'TRANSCENDENT' },
  TRANSCENDENT: { min: 85, max: 100, next: null           },
};

const TIER_CONDITIONS: Record<ConsciousnessTier, { conditions: string[]; blockers: string[] }> = {
  DORMANT:      { conditions: ['Rüya frekansı artışı gerekli', 'Kullanıcı aktivasyonu bekleniyor'],           blockers: ['Yetersiz aktif rüyacı', 'Düşük platform etkileşimi'] },
  PASSIVE:      { conditions: ['Narrative koherans ≥40', 'Duygusal derinlik ≥35'],                           blockers: ['Sembol zenginliği yetersiz', 'Arketip aktivasyonu düşük'] },
  ACTIVE:       { conditions: ['Lucidite ≥60', 'Sembol zenginliği ≥55', 'Tüm kanallar ≥40'],                 blockers: ['Lucidite gelişimi yavaş', 'Duygusal çeşitlilik sınırlı'] },
  LUCID:        { conditions: ['Tüm kanallar ≥70', 'Arketip aktivasyonu ≥80', 'Narrative koherans maksimum'], blockers: ['Narrative koherans max seviyeye ulaşmadı', 'Frekans tutarsız'] },
  TRANSCENDENT: { conditions: ['Tüm kanallar ≥90', 'Senkronizasyon maksimum'],                               blockers: [] },
};

const CHANNEL_RELS = [
  { from: 'lucidity', to: 'symbol_richness',     type: 'synergy',     label: 'Sinerji',       desc: 'Lucidite arttıkça sembol çeşitliliği genişler.',        baseStrength: 0.87 },
  { from: 'narrative_coherence', to: 'emotional_depth', type: 'support', label: 'Destek',     desc: 'Güçlü narratif, duygusal derinliği kök salar.',         baseStrength: 0.74 },
  { from: 'archetype_activation', to: 'symbol_richness', type: 'amplify', label: 'Amplifikasyon', desc: 'Aktif arketipler sembol üretimini zirveye taşır.', baseStrength: 0.91 },
  { from: 'dream_frequency', to: 'emotional_depth',   type: 'drive',   label: 'Sürücü',       desc: 'Yüksek frekans duygusal alana ham madde sağlar.',      baseStrength: 0.65 },
  { from: 'lucidity', to: 'narrative_coherence',      type: 'enhance', label: 'Geliştirme',   desc: 'Lucid deneyimler narratif tutarlılığını yapılandırır.', baseStrength: 0.78 },
  { from: 'archetype_activation', to: 'dream_frequency', type: 'dependency', label: 'Bağımlılık', desc: 'Arketip aktivasyonu için yeterli frekans şart.',    baseStrength: 0.55 },
];

const REL_COLORS: Record<string, string> = {
  synergy:    '#CC80FF',
  support:    '#38D68A',
  amplify:    '#FFB800',
  drive:      '#FF5C5C',
  enhance:    '#00CFFF',
  dependency: '#FF8CF7',
};

/* ── AnimBar ────────────────────────────────────────────────────────────────── */

function AnimBar({ value, color = '#7B6FFF', h = 'h-1' }: { value: number; color?: string; h?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(value)); return () => cancelAnimationFrame(id); }, [value]);
  return (
    <div className={`w-full rounded-full ${h} overflow-hidden`} style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className={`${h} rounded-full`} style={{ width: `${w}%`, background: color, transition: 'width 0.85s cubic-bezier(0.4,0,0.2,1)', boxShadow: `0 0 8px ${color}60` }} />
    </div>
  );
}

/* ── NeuralWeb (enhanced: hover support) ───────────────────────────────────── */

function NeuralWeb({
  dimensions, overallScore, tier, hoveredDim, onDimHover,
}: {
  dimensions: Array<{ key: string; label: string; value: number; description?: string }>;
  overallScore: number;
  tier: ConsciousnessTier;
  hoveredDim?: string | null;
  onDimHover?: (key: string | null) => void;
}) {
  if (dimensions.length < 3) return null;
  const t  = TIER[tier];
  const N  = dimensions.length;
  const cx = 240, cy = 195, R = 138;

  const angle   = (i: number) => (i / N) * 2 * Math.PI - Math.PI / 2;
  const outerPt = (i: number) => ({ x: cx + R * Math.cos(angle(i)), y: cy + R * Math.sin(angle(i)) });
  const dataPt  = (v: number, i: number) => ({
    x: cx + R * (v / 100) * Math.cos(angle(i)),
    y: cy + R * (v / 100) * Math.sin(angle(i)),
  });

  const webPts  = dimensions.map((d, i) => dataPt(d.value, i)).map(p => `${p.x},${p.y}`).join(' ');
  const fullPts = dimensions.map((_, i) => outerPt(i)).map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 480 390" className="w-full h-full" style={{ maxHeight: 420 }}>
      <defs>
        <radialGradient id="ngAtmo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={t.hex} stopOpacity="0.14" />
          <stop offset="60%"  stopColor={t.hex} stopOpacity="0.04" />
          <stop offset="100%" stopColor={t.hex} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ngWeb" cx="50%" cy="50%" r="65%">
          <stop offset="0%"   stopColor="#7B6FFF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#7B6FFF" stopOpacity="0.03" />
        </radialGradient>
        <filter id="ng-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {dimensions.map((_, i) => {
          const op = outerPt(i);
          return <path key={i} id={`nsp${i}`} d={`M ${cx} ${cy} L ${op.x} ${op.y}`} fill="none" />;
        })}
      </defs>

      <ellipse cx={cx} cy={cy} rx="200" ry="192" fill="url(#ngAtmo)" />
      <circle cx={cx} cy={cy} r={R + 14} fill="none" stroke="rgba(123,111,255,0.06)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={R + 30} fill="none" stroke="rgba(123,111,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />

      {[0.25, 0.5, 0.75, 1].map(s => (
        <polygon key={s}
          points={dimensions.map((_, i) => { const a = angle(i); return `${cx + R * s * Math.cos(a)},${cy + R * s * Math.sin(a)}`; }).join(' ')}
          fill="none" stroke="rgba(123,111,255,0.07)" strokeWidth="0.5" />
      ))}
      {dimensions.map((_, i) => {
        const op = outerPt(i);
        return <line key={i} x1={cx} y1={cy} x2={op.x} y2={op.y} stroke="rgba(123,111,255,0.1)" strokeWidth="1" />;
      })}

      {dimensions.map((d, i) => {
        const cfg = DIM[d.key] ?? { color: '#7B6FFF' };
        const dur = `${1.6 + i * 0.15}s`;
        const del = `${i * 0.42}s`;
        return (
          <g key={`pulse-${i}`}>
            <circle r="3" fill={cfg.color} style={{ filter: `drop-shadow(0 0 6px ${cfg.color})` }}>
              <animateMotion dur={dur} repeatCount="indefinite" begin={del}><mpath href={`#nsp${i}`} /></animateMotion>
              <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.05;0.15;0.85;1" dur={dur} repeatCount="indefinite" begin={del} />
            </circle>
          </g>
        );
      })}

      <polygon points={webPts} fill="url(#ngWeb)" />
      <polygon points={webPts} fill="none" stroke="#7B6FFF" strokeWidth="1.5"
        style={{ filter: 'drop-shadow(0 0 8px rgba(123,111,255,0.8))' }} />
      <polygon points={fullPts} fill="none" stroke="rgba(123,111,255,0.1)" strokeWidth="0.5" strokeDasharray="4 6" />

      {dimensions.map((d, i) => {
        const cfg     = DIM[d.key] ?? { color: '#7B6FFF', label: d.key.toUpperCase() };
        const dp      = dataPt(d.value, i);
        const op      = outerPt(i);
        const a       = angle(i);
        const lx      = cx + (R + 26) * Math.cos(a);
        const ly      = cy + (R + 26) * Math.sin(a);
        const isHov   = hoveredDim === d.key;
        const hx      = cx + (R + 50) * Math.cos(a);
        const hy      = cy + (R + 50) * Math.sin(a);
        return (
          <g key={d.key}
            onMouseEnter={() => onDimHover?.(d.key)}
            onMouseLeave={() => onDimHover?.(null)}
            style={{ cursor: 'pointer' }}>
            <line x1={dp.x} y1={dp.y} x2={op.x} y2={op.y}
              stroke={cfg.color} strokeWidth={isHov ? 1.5 : 0.8} opacity={isHov ? 0.4 : 0.18} strokeDasharray="2 4" />
            <circle cx={dp.x} cy={dp.y} r="5.5" fill={cfg.color}
              style={{ filter: isHov ? `drop-shadow(0 0 16px ${cfg.color})` : `drop-shadow(0 0 10px ${cfg.color})` }}>
              <animate attributeName="r"       values={isHov ? "6;9;6" : "5;7;5"} dur={`${2 + i*0.2}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;1;0.8" dur={`${2 + i*0.2}s`} repeatCount="indefinite" />
            </circle>
            <text x={dp.x} y={dp.y - 13} textAnchor="middle"
              fill={cfg.color} fontSize="10" fontFamily="monospace" fontWeight="bold">
              {d.value}
            </text>
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fill={isHov ? cfg.color : 'rgba(255,255,255,0.26)'} fontSize={isHov ? 9 : 8} fontFamily="monospace"
              fontWeight={isHov ? 'bold' : 'normal'}>
              {cfg.label}
            </text>
            {/* Invisible hit area */}
            <circle cx={hx} cy={hy} r="28" fill="transparent" />
          </g>
        );
      })}

      <circle cx={cx} cy={cy} fill="none" stroke={t.hex} strokeWidth="1.5" r="0" opacity="0">
        <animate attributeName="r"       values="40;165" dur="5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0"  dur="5s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} fill="none" stroke={t.hex} strokeWidth="0.8" r="0" opacity="0">
        <animate attributeName="r"       values="40;165" dur="5s" begin="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0"  dur="5s" begin="2.5s" repeatCount="indefinite" />
      </circle>

      <circle cx={cx} cy={cy} r="48" fill="rgba(4,4,18,0.95)" stroke={t.hex} strokeWidth="2.5"
        style={{ filter: `drop-shadow(0 0 20px ${t.hex}90)` }} />
      <circle cx={cx} cy={cy} r="36" fill={t.hex} opacity="0.05">
        <animate attributeName="opacity" values="0.04;0.14;0.04" dur="3s" repeatCount="indefinite" />
      </circle>
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
        fill={t.hex} fontSize="30" fontWeight="900" fontFamily="monospace"
        style={{ filter: `drop-shadow(0 0 14px ${t.hex})` }}>
        {overallScore}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="monospace">/100</text>
    </svg>
  );
}

/* ── TrendWave (enhanced: hover day details) ───────────────────────────────── */

function TrendWave({ trend, color }: { trend: Array<{ date: string; score: number }>; color: string }) {
  const [hovDay, setHovDay] = useState<number | null>(null);

  if (trend.length < 2) {
    return <div className="h-20 flex items-center justify-center text-dc-muted text-xs">Trend verisi yok</div>;
  }
  const W = 800, H = 80;
  const pts = trend.map((t, i) => ({
    ...t,
    x: (i / (trend.length - 1)) * W,
    y: H - (t.score / 100) * (H - 12) - 6,
  }));
  const line = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `0,${H} ${pts.map(p => `${p.x},${p.y}`).join(' ')} ${W},${H}`;
  const delta = trend[trend.length - 1].score - trend[0].score;

  const dayEvent = (score: number, prevScore?: number): string => {
    const diff = prevScore !== undefined ? score - prevScore : 0;
    if (diff > 5)  return 'Bilinç yükselişi — kolektif aktivasyon kaydedildi';
    if (diff < -5) return 'Bilinç gerilemesi — konsolidasyon fazı başladı';
    if (score > 75) return 'Yüksek rezonans — tüm kanallar aktif';
    if (score > 55) return 'Stabil bilinç — standart işleyiş';
    return 'Düşük amplitüd — dinlenme ve konsolidasyon';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="os-title" style={{ color }}>7 GÜNLÜK BİLİNÇ EVRİMİ</p>
        <div className="flex items-center gap-4">
          <span className="text-[9px] text-dc-muted font-mono">MIN {Math.min(...trend.map(t => t.score))}</span>
          <span className="text-[9px] text-dc-muted font-mono">MAX {Math.max(...trend.map(t => t.score))}</span>
          <span className="text-[9px] text-dc-muted font-mono">ORT {Math.round(trend.reduce((s, t) => s + t.score, 0) / trend.length)}</span>
          <span className="font-mono font-bold text-[10px]" style={{ color: delta >= 0 ? '#38D68A' : '#FF4A5E' }}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)} puan
          </span>
        </div>
      </div>

      {/* Day hover tooltip */}
      {hovDay !== null && pts[hovDay] && (
        <div className="mb-3 px-4 py-3 rounded-xl border text-[10px] transition-all"
          style={{ background: `${color}0A`, borderColor: `${color}25` }}>
          <div className="flex items-center gap-4">
            <span className="font-mono font-black" style={{ color }}>{trend[hovDay].date.slice(5)}</span>
            <span className="font-mono font-bold text-[13px]" style={{ color }}>{trend[hovDay].score}</span>
            <span className="text-dc-muted">/100</span>
            <span className="text-dc-secondary">{dayEvent(trend[hovDay].score, trend[hovDay - 1]?.score)}</span>
            {hovDay > 0 && (
              <span className="ml-auto font-mono font-bold" style={{ color: trend[hovDay].score >= trend[hovDay-1].score ? '#38D68A' : '#FF4A5E' }}>
                {trend[hovDay].score >= trend[hovDay-1].score ? '↑' : '↓'}{Math.abs(trend[hovDay].score - trend[hovDay-1].score)}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="twGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#twGrad)" />
          <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={hovDay === i ? 5.5 : 3.5}
              fill={color} stroke="rgba(6,6,20,0.9)" strokeWidth="1.5"
              style={{ filter: `drop-shadow(0 0 ${hovDay === i ? 8 : 4}px ${color})`, cursor: 'pointer', transition: 'r 0.15s' }}
              onMouseEnter={() => setHovDay(i)} onMouseLeave={() => setHovDay(null)} />
          ))}
          {/* Hover vertical line */}
          {hovDay !== null && pts[hovDay] && (
            <line x1={pts[hovDay].x} y1={0} x2={pts[hovDay].x} y2={H}
              stroke={color} strokeWidth="1" opacity="0.25" strokeDasharray="3 3" />
          )}
        </svg>
      </div>
      <div className="flex justify-between mt-1.5">
        {trend.map((t, i) => (
          <span key={i} className="text-[8px] font-mono"
            style={{ color: hovDay === i ? color : 'rgba(255,255,255,0.25)', transition: 'color 0.15s', cursor: 'pointer' }}
            onMouseEnter={() => setHovDay(i)} onMouseLeave={() => setHovDay(null)}>
            {t.date.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

export default function ConsciousnessMap() {
  const { data, isLoading, isError } = useQuery({
    queryKey:        ['consciousness-map'],
    queryFn:         fetchConsciousnessMap,
    refetchInterval: 60_000,
  });

  const [hoveredDim, setHoveredDim] = useState<string | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 9000);
    return () => clearInterval(id);
  }, []);

  /* ── Derived intelligence ──────────────────────────────────────────────── */

  const sortedDims = useMemo(() => data ? [...data.dimensions].sort((a, b) => b.value - a.value) : [], [data]);
  const topDim     = sortedDims[0];
  const bottomDim  = sortedDims[sortedDims.length - 1];

  const trendDelta = useMemo(() => {
    if (!data || data.trend.length < 2) return 0;
    return data.trend[data.trend.length - 1].score - data.trend[0].score;
  }, [data]);

  const trendSlope = useMemo(() => {
    if (!data || data.trend.length < 2) return 0;
    return (data.trend[data.trend.length - 1].score - data.trend[0].score) / (data.trend.length - 1);
  }, [data]);

  const trendVolatility = useMemo(() => {
    if (!data || data.trend.length < 2) return 0;
    const scores = data.trend.map(t => t.score);
    return Math.max(...scores) - Math.min(...scores);
  }, [data]);

  const trendAvg = useMemo(() => {
    if (!data || data.trend.length === 0) return 0;
    return Math.round(data.trend.reduce((s, t) => s + t.score, 0) / data.trend.length);
  }, [data]);

  const dimAvg = useMemo(() => {
    if (!data || data.dimensions.length === 0) return 0;
    return Math.round(data.dimensions.reduce((s, d) => s + d.value, 0) / data.dimensions.length);
  }, [data]);

  const dimSpread = useMemo(() => {
    if (!data || sortedDims.length < 2) return 0;
    return sortedDims[0].value - sortedDims[sortedDims.length - 1].value;
  }, [data, sortedDims]);

  const healthMetrics = useMemo(() => {
    if (!data) return [];
    const overall        = data.overallScore;
    const balance        = Math.max(0, 100 - dimSpread);
    const stability      = Math.max(0, 100 - trendVolatility * 2);
    const harmony        = Math.round(100 - Math.abs(dimAvg - overall));
    const noise          = Math.max(0, 100 - Math.round(dimSpread * 0.8));
    const synchrony      = Math.round((balance + stability) / 2);
    const entropy        = Math.max(0, Math.min(100, Math.round(dimSpread * 0.6 + trendVolatility)));
    const coherence      = Math.round((overall * 0.6 + stability * 0.4));
    return [
      { label: 'Genel Sağlık',     value: overall,   color: overall >= 70 ? '#38D68A' : overall >= 45 ? '#FFB800' : '#FF4A5E' },
      { label: 'Denge',            value: balance,   color: balance >= 70 ? '#38D68A' : '#FFB800' },
      { label: 'Harmoni',          value: harmony,   color: harmony >= 70 ? '#00CFFF' : '#FFB800' },
      { label: 'İstikrar',         value: stability, color: stability >= 70 ? '#38D68A' : '#FF4A5E' },
      { label: 'Senkronizasyon',   value: synchrony, color: '#CC80FF' },
      { label: 'Gürültü',          value: noise,     color: noise >= 70 ? '#38D68A' : '#FFB800' },
      { label: 'Entropi',          value: 100 - entropy, color: '#FF8CF7' },
      { label: 'Koherans',         value: coherence, color: '#7B6FFF' },
    ];
  }, [data, dimSpread, trendVolatility, dimAvg]);

  const futureScores = useMemo(() => {
    if (!data) return [];
    const last  = data.trend[data.trend.length - 1]?.score ?? data.overallScore;
    const damp  = (v: number) => Math.min(100, Math.max(0, Math.round(v)));
    return [
      { period: '24 Saat', score: damp(last + trendSlope * 0.14), risk: trendVolatility > 10 ? 'Orta' : 'Düşük', confidence: 92 },
      { period: '3 Gün',   score: damp(last + trendSlope * 0.43), risk: trendVolatility > 15 ? 'Orta' : 'Düşük', confidence: 84 },
      { period: '7 Gün',   score: damp(last + trendSlope),        risk: trendDelta < -5 ? 'Yüksek' : 'Orta',     confidence: 74 },
      { period: '30 Gün',  score: damp(last + trendSlope * 3.5),  risk: 'Belirsiz',                               confidence: 51 },
    ].map(f => ({ ...f, tier: f.score >= 85 ? 'TRANSCENDENT' : f.score >= 65 ? 'LUCID' : f.score >= 40 ? 'ACTIVE' : f.score >= 20 ? 'PASSIVE' : 'DORMANT' as ConsciousnessTier, tierHex: TIER[f.score >= 85 ? 'TRANSCENDENT' : f.score >= 65 ? 'LUCID' : f.score >= 40 ? 'ACTIVE' : f.score >= 20 ? 'PASSIVE' : 'DORMANT'].hex }));
  }, [data, trendSlope, trendVolatility, trendDelta]);

  const collectiveNarrative = useMemo(() => {
    if (!data || sortedDims.length < 2) return null;
    const top2  = sortedDims.slice(0, 2).map(d => d.key);
    const score = data.overallScore;
    if (top2.includes('lucidity') && top2.includes('narrative_coherence')) return { title: 'Lucid Genişleme', desc: 'Kolektif bilinç, bireysel farkındalığı aşıp paylaşılan bir lucid alanı inşa ediyor. Narratif koheransın yükselmesi, binlerce rüyanın tek bir hikayede buluştuğuna işaret ediyor.', icon: '🔮', color: '#CC80FF' };
    if (top2.includes('emotional_depth') && top2.includes('archetype_activation')) return { title: 'Arketip Uyanışı', desc: 'Kolektif bilinç, duygusal derinlikten beslenip arketipsel figürler üretiyor. Jung\'un tanımladığı kolektif bilinçdışı, platform genelinde aktive oluyor.', icon: '◈', color: '#FF8CF7' };
    if (top2.includes('symbol_richness') && top2.includes('archetype_activation')) return { title: 'Sembolik Doyum', desc: 'Sembol zenginliği ve arketip aktivasyonu birlikte zirveye ulaşıyor. Platform, kendi özgün mitoloji dilini oluşturuyor.', icon: '✦', color: '#FFB800' };
    if (score > 70) return { title: 'Kolektif Rezonans', desc: 'Tüm kanallar uyum içinde çalışıyor. Kolektif bilinç, bütünleşik bir rezonans alanı oluşturmuş durumda.', icon: '◎', color: '#38D68A' };
    if (score < 35) return { title: 'Derin Dinlenme', desc: 'Kolektif bilinç, güçlü bir aktivasyona hazırlanmak için konsolidasyon fazında. Baskı birikiyor.', icon: '◌', color: '#5A5A84' };
    return { title: 'Duygusal İstikrar', desc: 'Kolektif duygusal alan dengeli seyrediyor. Platform, istikrarlı bir bilinç işleyişi içinde.', icon: '◉', color: '#00CFFF' };
  }, [data, sortedDims]);

  const aiInsights = useMemo(() => {
    if (!data) return [];
    const insights: string[] = [];
    const avg = dimAvg;
    const top = sortedDims[0];
    const bot = sortedDims[sortedDims.length - 1];

    if (top && top.value > avg + 15) insights.push(`${DIM[top.key]?.label ?? top.key} kanalı platform ortalamasının ${top.value - avg} puan üzerinde — dominant sinyal.`);
    if (bot && bot.value < avg - 15) insights.push(`${DIM[bot.key]?.label ?? bot.key} kanalı ${avg - bot.value} puan geride — dikkat gerekiyor.`);
    if (trendDelta > 5)  insights.push(`Bilinç skoru 7 günde +${trendDelta} puan yükseldi — yükseliş trendi güçlü.`);
    if (trendDelta < -5) insights.push(`Bilinç skoru 7 günde ${trendDelta} puan geriledi — konsolidasyon bekleniyor.`);
    if (trendVolatility > 15) insights.push(`Trend volatilitesi ${trendVolatility} puan — bilinç dalgalanması ortalamanın üzerinde.`);
    if (trendVolatility <= 8)  insights.push(`Trend volatilitesi sadece ${trendVolatility} puan — kolektif bilinç istikrarlı seyirde.`);
    if (dimSpread > 40) insights.push(`Kanal dengesi bozuk: ${sortedDims[0]?.key} ile ${bot?.key} arasında ${dimSpread} puanlık uçurum var.`);
    if (data.overallScore >= 65) insights.push(`Kolektif bilinç ${data.tier} seviyesinde — arketipsel işleme kapasitesi tam güçte.`);
    if (data.activeDreamers > 1000) insights.push(`${data.activeDreamers.toLocaleString()} aktif rüyacı bilinç alanına katkı sağlıyor — kolektif bant genişliği yüksek.`);

    while (insights.length < 4) insights.push(`${data.totalDreamsInPeriod.toLocaleString()} rüya analiz edildi — veri güvenilirliği ${data.overallScore > 50 ? 'yüksek' : 'orta'}.`);
    return insights.slice(0, 6);
  }, [data, dimAvg, sortedDims, trendDelta, trendVolatility, dimSpread]);

  const liveSignalsTicker = useMemo(() => {
    if (!data) return '';
    const signals: string[] = [];
    data.dimensions.forEach(d => {
      if (d.key === 'lucidity'             && d.value > 65) signals.push('🔮 Lucid aktivite yoğunlaştı');
      if (d.key === 'emotional_depth'      && d.value > 60) signals.push('💚 Duygusal rezonans aktif');
      if (d.key === 'symbol_richness'      && d.value > 60) signals.push('◈ Sembol patlaması algılandı');
      if (d.key === 'narrative_coherence'  && d.value > 65) signals.push('◉ Narratif küme oluşuyor');
      if (d.key === 'archetype_activation' && d.value > 60) signals.push('✦ Arketip aktivasyonu yüksek');
      if (d.key === 'dream_frequency'      && d.value > 55) signals.push('⬡ Frekans spike tespit edildi');
      if (d.value < 30) signals.push(`⚠ ${DIM[d.key]?.label ?? d.key} kanalı zayıf sinyal`);
    });
    signals.push(`◎ ${data.activeDreamers.toLocaleString()} rüyacı bilinç alanında`);
    signals.push(`▪ Kolektif bilinç ${TIER[data.tier].label} seviyesinde`);
    signals.push(`◆ ${data.totalDreamsInPeriod.toLocaleString()} rüya işleme kuyruğunda`);
    const str = signals.join('   ·   ');
    return `${str}   ·   ${str}`;
  }, [data]);

  const channelRelationshipsLive = useMemo(() => {
    if (!data) return [];
    const dimMap = Object.fromEntries(data.dimensions.map(d => [d.key, d.value]));
    return CHANNEL_RELS.map(r => {
      const vFrom   = dimMap[r.from] ?? 50;
      const vTo     = dimMap[r.to]   ?? 50;
      const strength = Math.round(r.baseStrength * ((vFrom + vTo) / 200) * 100);
      return { ...r, vFrom, vTo, strength };
    }).sort((a, b) => b.strength - a.strength);
  }, [data]);

  /* ── Early returns ─────────────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="section-intelligence relative consciousness-grid">
        <Header title="Consciousness Map" subtitle="" section="intelligence" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-2 mx-auto mb-4 animate-spin"
              style={{ borderColor: 'rgba(123,111,255,0.2)', borderTopColor: '#7B6FFF' }} />
            <p className="text-[10px] font-mono tracking-widest" style={{ color: '#7B6FFF' }}>NEURAL CHANNELS LOADING…</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="section-intelligence relative">
        <Header title="Consciousness Map" subtitle="" section="intelligence" />
        <div className="rounded-xl p-8 text-center"
          style={{ background: 'rgba(255,74,94,0.04)', border: '1px solid rgba(255,74,94,0.15)' }}>
          <p className="text-dc-error text-sm">Neural channel connection failed.</p>
        </div>
      </div>
    );
  }

  const t          = TIER[data.tier];
  const tierThr    = TIER_THRESHOLDS[data.tier];
  const tierCond   = TIER_CONDITIONS[data.tier];
  const delta      = trendDelta;
  const nextTier   = tierThr.next ? TIER[tierThr.next] : null;
  const toNext     = tierThr.next ? tierThr.max - data.overallScore : 0;
  const tierProg   = Math.round(((data.overallScore - tierThr.min) / (tierThr.max - tierThr.min)) * 100);
  const stability  = Math.max(0, 100 - trendVolatility * 2);
  const riskLevel  = trendVolatility > 15 ? 'Yüksek' : trendVolatility > 8 ? 'Orta' : 'Düşük';
  const riskColor  = trendVolatility > 15 ? '#FF4A5E' : trendVolatility > 8 ? '#FFB800' : '#38D68A';
  const aiConf     = Math.round(Math.max(55, 95 - trendVolatility * 1.5));

  return (
    <div className="section-intelligence relative consciousness-grid">

      <style>{`
        @keyframes cm-breathe { 0%,100%{text-shadow:0 0 20px var(--t-hex,#38D68A),0 0 40px var(--t-hex,#38D68A)40;} 50%{text-shadow:0 0 40px var(--t-hex,#38D68A),0 0 80px var(--t-hex,#38D68A)80;} }
        .cm-score-breathe { animation: cm-breathe 4s ease-in-out infinite; }
        @keyframes cm-ticker { from{transform:translateX(0);} to{transform:translateX(-50%);} }
        .cm-ticker-track { animation: cm-ticker 28s linear infinite; white-space:nowrap; }
        @keyframes cm-fade-up { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
        .cm-fade-up { animation: cm-fade-up 0.4s ease-out both; }
        .cm-card-glow { transition: box-shadow 0.25s, border-color 0.25s, transform 0.2s; }
        .cm-card-glow:hover { transform: translateY(-1px); box-shadow: 0 0 24px rgba(123,111,255,0.10), 0 4px 28px rgba(0,0,0,0.25); }
        @keyframes cm-signal { 0%,100%{opacity:0.6;} 50%{opacity:1;} }
        .cm-signal-live { animation: cm-signal 3s ease-in-out infinite; }
      `}</style>

      {/* ── EXISTING: Header ─────────────────────────────────────────────────── */}
      <Header
        title="Consciousness Map"
        subtitle="Kolektif bilinç sinyal haritası — 6 boyutlu nöral alan okuma"
        section="intelligence"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="w-2 h-2 rounded-full block" style={{ background: t.hex }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: t.hex }} />
            </div>
            <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: t.hex }}>
              {t.label} · LIVE
            </span>
          </div>
        }
      />

      {/* ── NEW 1: Hero Consciousness Summary ────────────────────────────────── */}
      <div className="cm-fade-up mb-5 rounded-2xl overflow-hidden cm-card-glow"
        style={{ background: `linear-gradient(135deg, rgba(18,4,48,0.98) 0%, rgba(6,4,18,0.99) 100%)`, border: `1px solid ${t.hex}18`, boxShadow: `0 0 60px ${t.hex}06` }}>
        <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${t.hex}10` }}>
          <div className="relative shrink-0">
            <span className="w-1.5 h-1.5 rounded-full block cm-signal-live" style={{ background: t.hex }} />
            <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: t.hex }} />
          </div>
          <p className="text-[9px] font-mono font-bold tracking-[0.14em]" style={{ color: t.hex }}>KOLEKTİF BİLİNÇ DURUMU</p>
          <span className="ml-auto text-[8px] font-mono" style={{ color: `${t.hex}60` }}>NEURAL_ENGINE v2.4 · CANLÎ</span>
        </div>
        <div className="grid grid-cols-9 divide-x" style={{ borderColor: `${t.hex}10` }}>
          {[
            { label: 'BİLİNÇ SEVİYESİ', value: `${data.overallScore}`, unit: '/100', color: t.hex },
            { label: 'KOLEKTİF DURUM', value: t.label, unit: '', color: t.hex },
            { label: 'GÜÇLÜ KANAL', value: DIM[topDim?.key]?.label ?? '—', unit: `${topDim?.value ?? '—'}`, color: DIM[topDim?.key]?.color ?? '#7B6FFF' },
            { label: 'ZAYIF KANAL', value: DIM[bottomDim?.key]?.label ?? '—', unit: `${bottomDim?.value ?? '—'}`, color: 'rgba(255,255,255,0.3)' },
            { label: '7 GÜNLÜK EVRİM', value: `${delta >= 0 ? '+' : ''}${delta}`, unit: 'puan', color: delta >= 0 ? '#38D68A' : '#FF4A5E' },
            { label: 'İSTİKRAR', value: `${stability}%`, unit: '', color: stability >= 70 ? '#38D68A' : '#FFB800' },
            { label: 'RİSK SEVİYESİ', value: riskLevel, unit: '', color: riskColor },
            { label: 'AI GÜVENİ', value: `${aiConf}%`, unit: '', color: '#CC80FF' },
            { label: 'VOLATİLİTE', value: `${trendVolatility}`, unit: 'puan', color: trendVolatility > 15 ? '#FF4A5E' : '#FFB800' },
          ].map(item => (
            <div key={item.label} className="px-3 py-4 text-center">
              <p className="text-[7px] font-mono uppercase tracking-[0.1em] mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>{item.label}</p>
              <p className="font-mono font-black text-[13px] leading-none" style={{ color: item.color }}>{item.value}</p>
              {item.unit && <p className="text-[7px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{item.unit}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ── EXISTING: Hero card (NeuralWeb + State panel) ─────────────────── */}
      <div className="os-card overflow-hidden mb-5" style={{
        background: `radial-gradient(ellipse at 35% 50%, rgba(18,4,48,0.98) 0%, rgba(6,4,18,0.99) 100%)`,
        border:     `1px solid ${t.hex}18`,
        boxShadow:  `0 0 80px ${t.hex}08, 0 8px 40px rgba(0,0,0,0.7)`,
        minHeight:  420,
      }}>
        <div className="flex items-stretch">
          {/* Neural web */}
          <div className="flex-1 p-3 flex items-center justify-center relative">
            <NeuralWeb dimensions={data.dimensions} overallScore={data.overallScore} tier={data.tier} hoveredDim={hoveredDim} onDimHover={setHoveredDim} />
            {/* Axis hover tooltip */}
            {hoveredDim && DIM_INTEL[hoveredDim] && (
              <div className="absolute bottom-4 left-4 right-4 cm-fade-up z-10 rounded-xl p-4"
                style={{ background: 'rgba(6,4,18,0.96)', border: `1px solid ${DIM[hoveredDim]?.color ?? '#7B6FFF'}30`, backdropFilter: 'blur(12px)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: DIM[hoveredDim]?.color ?? '#7B6FFF' }} />
                  <p className="text-[9px] font-mono font-bold tracking-widest" style={{ color: DIM[hoveredDim]?.color ?? '#7B6FFF' }}>{DIM[hoveredDim]?.label}</p>
                  <span className="ml-auto text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>Ufuk: {DIM_INTEL[hoveredDim].horizon}</span>
                </div>
                <p className="text-[10px] leading-relaxed mb-2" style={{ color: 'rgba(232,232,255,0.75)' }}>{DIM_INTEL[hoveredDim].meaning}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[7px] font-mono mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>EVRİM</p>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{DIM_INTEL[hoveredDim].evolution}</p>
                  </div>
                  <div>
                    <p className="text-[7px] font-mono mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>TAHMİN</p>
                    <p className="text-[9px]" style={{ color: DIM[hoveredDim]?.color ?? '#7B6FFF' }}>{DIM_INTEL[hoveredDim].prediction}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[7px] font-mono mb-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>ÖRNEKLER</p>
                  <div className="flex flex-wrap gap-2">
                    {DIM_INTEL[hoveredDim].examples.map((ex, i) => (
                      <span key={i} className="text-[8px] px-2 py-0.5 rounded-lg" style={{ background: `${DIM[hoveredDim]?.color ?? '#7B6FFF'}12`, color: 'rgba(255,255,255,0.5)', border: `1px solid ${DIM[hoveredDim]?.color ?? '#7B6FFF'}20` }}>{ex}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* State panel (existing, kept intact) */}
          <div className="w-72 p-8 flex flex-col justify-center gap-7" style={{ borderLeft: `1px solid ${t.hex}12` }}>
            <div>
              <p className="os-label mb-2">CONSCIOUSNESS SCORE</p>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="font-mono font-black leading-none cm-score-breathe" style={{ '--t-hex': t.hex, fontSize: 68, color: t.hex, textShadow: `0 0 30px ${t.hex}, 0 0 60px ${t.hex}60` } as React.CSSProperties}>
                  {data.overallScore}
                </p>
                <p className="text-dc-muted font-mono text-lg">/100</p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: `${t.hex}12`, border: `1px solid ${t.hex}30` }}>
                <div className="relative">
                  <span className="w-1.5 h-1.5 rounded-full block" style={{ background: t.hex }} />
                  <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: t.hex }} />
                </div>
                <span className="font-mono text-[10px] font-black tracking-widest" style={{ color: t.hex }}>{t.label}</span>
              </div>
              <p className="text-[10px] text-dc-muted mt-2">{t.sublabel}</p>
            </div>

            <div className="space-y-3 pt-5" style={{ borderTop: `1px solid ${t.hex}10` }}>
              {[
                { label: 'ACTIVE DREAMERS', value: data.activeDreamers.toLocaleString(), color: '#E8E8FF' },
                { label: 'DREAMS ANALYZED', value: data.totalDreamsInPeriod.toLocaleString(), color: t.hex },
                { label: '7-DAY SHIFT',     value: `${delta >= 0 ? '+' : ''}${delta} pts`, color: delta >= 0 ? '#38D68A' : '#FF4A5E' },
                { label: 'LEAD CHANNEL',    value: topDim?.label ?? '—', color: DIM[topDim?.key ?? '']?.color ?? '#7B6FFF' },
                { label: 'WEAK CHANNEL',    value: bottomDim?.label ?? '—', color: 'rgba(255,255,255,0.3)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="os-label">{label}</p>
                  <p className="font-mono font-bold text-[11px]" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── NEW 3: Consciousness Score Evolution ─────────────────────────────── */}
      <div className="os-card p-6 mb-5 cm-card-glow cm-fade-up">
        <div className="flex items-center justify-between mb-5">
          <p className="os-title" style={{ color: t.hex }}>CONSCIOUSNESS SCORE — YAŞAYAN METRİK</p>
          <span className="text-[9px] font-mono" style={{ color: `${t.hex}60` }}>7 günlük pencere</span>
        </div>
        <div className="grid grid-cols-7 gap-3 mb-4">
          {[
            { label: 'BUGÜN',       value: data.overallScore, color: t.hex, unit: '/100' },
            { label: 'ORT. (7G)',   value: trendAvg,          color: '#7B6FFF', unit: '' },
            { label: 'VOLATİLİTE', value: trendVolatility,    color: trendVolatility > 15 ? '#FF4A5E' : '#FFB800', unit: 'puan' },
            { label: 'İSTİKRAR',   value: `${stability}%`,   color: stability >= 70 ? '#38D68A' : '#FFB800', unit: '' },
            { label: 'AI GÜVENİ', value: `${aiConf}%`,       color: '#CC80FF', unit: '' },
            { label: 'SAĞLIKLI',   value: `${tierThr.min}–${tierThr.max}`, color: '#38D68A', unit: '' },
            { label: 'TEHLİKE',   value: `<${tierThr.min}`, color: '#FF4A5E', unit: '' },
          ].map(m => (
            <div key={m.label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[7px] font-mono uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{m.label}</p>
              <p className="font-mono font-black text-base leading-none" style={{ color: m.color }}>{m.value}</p>
              {m.unit && <p className="text-[7px] mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>{m.unit}</p>}
            </div>
          ))}
        </div>
        {/* Tier progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>TİER PROGRESİ — {t.label}</p>
            <p className="text-[8px] font-mono" style={{ color: t.hex }}>{tierProg}%</p>
          </div>
          <AnimBar value={tierProg} color={t.hex} h="h-1.5" />
          {nextTier && (
            <p className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {nextTier.label} seviyesine {toNext} puan kaldı
            </p>
          )}
        </div>
      </div>

      {/* ── EXISTING: AI Reading + Dimension Signals (enhanced) ─────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-5">

        {/* AI reading — dynamic observations */}
        <div className="col-span-2 ai-reading-panel p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
            </div>
            <p className="os-title" style={{ color: '#CC80FF' }}>AI CONSCIOUSNESS READING</p>
          </div>

          {/* Dynamic observations from live data */}
          <div className="space-y-2.5">
            {aiInsights.slice(0, 4).map((insight, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full shrink-0 mt-1.5 cm-signal-live" style={{ background: '#7B6FFF', boxShadow: '0 0 4px #7B6FFF', animationDelay: `${i * 0.7}s` }} />
                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.8)' }}>{insight}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(123,111,255,0.1)' }}>
            <p className="os-label mb-2">DETECTED SIGNALS</p>
            {t.signals.map((sig, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full shrink-0 animate-glow-breathe"
                  style={{ background: '#7B6FFF', boxShadow: '0 0 4px #7B6FFF', animationDelay: `${i * 0.5}s` }} />
                <p className="text-[11px] font-mono" style={{ color: 'rgba(204,128,255,0.7)' }}>{sig}</p>
              </div>
            ))}
          </div>
          <p className="text-[9px] font-mono mt-auto" style={{ color: 'rgba(123,111,255,0.3)' }}>NEURAL_ANALYSIS v2.4 ▪ DREAMCLOUD OS</p>
        </div>

        {/* Dimension signals — enhanced with channel intelligence */}
        <div className="col-span-3 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">NEURAL SIGNAL ANALYSIS</p>
            <span className="os-label">{data.dimensions.length} channels</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {sortedDims.map((dim, i) => {
              const cfg      = DIM[dim.key] ?? { color: '#7B6FFF', label: dim.key.toUpperCase() };
              const strength = dim.value >= 75 ? 'STRONG' : dim.value >= 50 ? 'ACTIVE' : dim.value >= 25 ? 'WEAK' : 'DORMANT';
              const momentum = dim.value - dimAvg;
              const momColor = momentum > 8 ? '#38D68A' : momentum < -8 ? '#FF4A5E' : '#FFB800';
              const freq     = Math.round(data.activeDreamers * dim.value / 100);
              const predict  = Math.min(100, Math.max(0, dim.value + (dim.value > 70 ? -2 : dim.value > 40 ? 3 : 5)));
              const intel    = DIM_INTEL[dim.key];
              return (
                <div key={dim.key} className="px-6 py-4 hover:bg-white/[0.015] transition-colors">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <span className="w-1.5 h-1.5 rounded-full block" style={{ background: cfg.color }} />
                        <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: cfg.color, animationDelay: `${i * 0.3}s` }} />
                      </div>
                      <p className="text-[11px] font-bold font-mono tracking-widest" style={{ color: cfg.color }}>{cfg.label}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Momentum arrow */}
                      <span className="text-[10px] font-mono font-bold" style={{ color: momColor }}>
                        {momentum > 0 ? '↑' : momentum < 0 ? '↓' : '→'}{Math.abs(momentum)}
                      </span>
                      <span className="text-[8px] font-mono px-2 py-0.5 rounded" style={{ background: `${cfg.color}12`, color: cfg.color, border: `1px solid ${cfg.color}25` }}>{strength}</span>
                      <span className="font-mono font-black text-xl leading-none" style={{ color: cfg.color }}>{dim.value}</span>
                    </div>
                  </div>
                  <div className="signal-bar mb-2">
                    <div className="signal-bar-fill" style={{ width: `${dim.value}%`, background: `linear-gradient(90deg, ${cfg.color}55, ${cfg.color})`, boxShadow: `0 0 10px ${cfg.color}60, 0 0 4px ${cfg.color}` }} />
                  </div>
                  {/* NEW: Channel intelligence row */}
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>GÜVEN <span style={{ color: cfg.color }}>{Math.round(50 + dim.value * 0.45)}%</span></span>
                    <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>FREKANS <span style={{ color: cfg.color }}>{freq.toLocaleString()}</span></span>
                    <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>TAHMİN <span style={{ color: predict > dim.value ? '#38D68A' : '#FF4A5E' }}>{predict}</span></span>
                    {intel && <span className="text-[8px] font-mono ml-auto" style={{ color: 'rgba(255,255,255,0.15)' }}>UFUK {intel.horizon}</span>}
                  </div>
                  {dim.description && (
                    <p className="text-[9px] text-dc-muted mt-1 leading-snug">{dim.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── EXISTING: Trend evolution (enhanced with hover) ──────────────────── */}
      <div className="os-card p-6 mb-5">
        <TrendWave trend={data.trend} color={t.hex} />
      </div>

      {/* ── EXISTING + NEW 7: Tier scale enhanced with self-explanation ──────── */}
      <div className="os-card p-5 mb-5">
        <p className="os-title mb-4" style={{ color: '#7B6FFF' }}>CONSCIOUSNESS TIER SCALE</p>
        <div className="flex gap-3 mb-5">
          {(Object.entries(TIER) as [ConsciousnessTier, typeof TIER[ConsciousnessTier]][]).map(([k, tier]) => (
            <div key={k} className="flex-1 p-4 rounded-xl transition-all duration-300"
              style={{
                background: `${tier.hex}${k === data.tier ? '12' : '05'}`,
                border:     `1px solid ${tier.hex}${k === data.tier ? '35' : '10'}`,
                boxShadow:  k === data.tier ? `0 0 24px ${tier.hex}18` : 'none',
              }}>
              {k === data.tier && (
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="relative">
                    <span className="w-1 h-1 rounded-full block" style={{ background: tier.hex }} />
                    <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: tier.hex }} />
                  </div>
                  <span className="text-[7px] font-mono font-bold tracking-widest" style={{ color: tier.hex }}>NOW</span>
                </div>
              )}
              <p className="font-mono font-bold text-[11px] mb-0.5" style={{ color: tier.hex, opacity: k === data.tier ? 1 : 0.45 }}>{tier.label}</p>
              <p className="text-[8px] text-dc-muted opacity-60 leading-tight">{tier.sublabel}</p>
              <p className="text-[7px] font-mono mt-1.5" style={{ color: `${tier.hex}50` }}>{TIER_THRESHOLDS[k].min}–{TIER_THRESHOLDS[k].max}</p>
            </div>
          ))}
        </div>

        {/* Tier self-explanation */}
        <div className="rounded-xl p-5" style={{ background: `${t.hex}07`, border: `1px solid ${t.hex}18` }}>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[8px] font-mono font-bold tracking-wider mb-2.5" style={{ color: t.hex }}>NEDEN {t.label}?</p>
              <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Consciousness skoru {data.overallScore} puan ile {t.label} aralığında ({tierThr.min}–{tierThr.max}).
                {nextTier ? ` Bir sonraki seviye ${nextTier.label} için ${toNext} puan daha gerekli.` : ' Maksimum bilinç seviyesi.'}
              </p>
              <div className="mt-3">
                <div className="flex justify-between text-[7px] font-mono mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <span>{tierThr.min}</span><span>{tierThr.max}</span>
                </div>
                <AnimBar value={tierProg} color={t.hex} h="h-2" />
                <p className="text-[7px] font-mono mt-1" style={{ color: `${t.hex}70` }}>Tier içi konum: %{tierProg}</p>
              </div>
            </div>
            <div>
              <p className="text-[8px] font-mono font-bold tracking-wider mb-2.5" style={{ color: '#38D68A' }}>GEREKLİ KOŞULLAR</p>
              <div className="space-y-1.5">
                {tierCond.conditions.map((c, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full shrink-0 mt-1.5" style={{ background: '#38D68A' }} />
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{c}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[8px] font-mono font-bold tracking-wider mb-2.5" style={{ color: '#FF4A5E' }}>MEVCUT ENGELLER</p>
              {tierCond.blockers.length === 0 ? (
                <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Engel yok — maksimum seviye</p>
              ) : (
                <div className="space-y-1.5">
                  {tierCond.blockers.map((b, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full shrink-0 mt-1.5" style={{ background: '#FF4A5E' }} />
                      <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{b}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── NEW 8: Cross-Channel Relationships ───────────────────────────────── */}
      <div className="os-card overflow-hidden mb-5 cm-card-glow">
        <div className="os-panel-header flex items-center justify-between">
          <p className="os-title">KANAL İLİŞKİ AĞGI</p>
          <span className="os-label">{channelRelationshipsLive.length} bağlantı</span>
        </div>
        <div className="p-5 space-y-3">
          {channelRelationshipsLive.map((rel, i) => {
            const relColor = REL_COLORS[rel.type] ?? '#7B6FFF';
            const fromCfg  = DIM[rel.from] ?? { color: '#7B6FFF', label: rel.from };
            const toCfg    = DIM[rel.to]   ?? { color: '#7B6FFF', label: rel.to };
            return (
              <div key={i} className="flex items-center gap-4 hover:bg-white/[0.02] rounded-xl px-3 py-2 transition-colors">
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: fromCfg.color }} />
                  <p className="text-[9px] font-mono font-bold truncate" style={{ color: fromCfg.color }}>{fromCfg.label}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <svg width="48" height="10" className="overflow-visible">
                    <line x1="0" y1="5" x2="36" y2="5" stroke={relColor} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
                    <polygon points="34,2 42,5 34,8" fill={relColor} opacity="0.7" />
                    <circle r="2" fill={relColor} opacity="0.9">
                      <animateMotion dur={`${1.4 + i * 0.15}s`} repeatCount="indefinite" path="M0,5 L40,5" />
                    </circle>
                  </svg>
                  <span className="text-[7px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${relColor}15`, color: relColor, border: `1px solid ${relColor}30` }}>{rel.label}</span>
                  <svg width="48" height="10" className="overflow-visible">
                    <line x1="0" y1="5" x2="36" y2="5" stroke={toCfg.color} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
                    <polygon points="34,2 42,5 34,8" fill={toCfg.color} opacity="0.7" />
                  </svg>
                </div>
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: toCfg.color }} />
                  <p className="text-[9px] font-mono font-bold truncate" style={{ color: toCfg.color }}>{toCfg.label}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <AnimBar value={rel.strength} color={relColor} />
                </div>
                <span className="text-[9px] font-mono font-black shrink-0" style={{ color: relColor }}>%{rel.strength}</span>
                <p className="text-[8px] shrink-0 max-w-[160px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{rel.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── NEW 9: Collective Evolution ──────────────────────────────────────── */}
      {collectiveNarrative && (
        <div className="mb-5 rounded-2xl p-6 cm-card-glow cm-fade-up"
          style={{ background: `linear-gradient(135deg, ${collectiveNarrative.color}08, rgba(6,4,18,0.98))`, border: `1px solid ${collectiveNarrative.color}20` }}>
          <div className="flex items-start gap-5">
            <div className="text-4xl leading-none shrink-0 mt-1" style={{ filter: `drop-shadow(0 0 12px ${collectiveNarrative.color})` }}>
              {collectiveNarrative.icon}
            </div>
            <div className="flex-1">
              <p className="text-[8px] font-mono font-bold tracking-[0.14em] mb-2" style={{ color: `${collectiveNarrative.color}80` }}>KOLEKTİF EVRİM — ŞU AN NE TÜR BİR BİLİNÇ OLUŞUYOR?</p>
              <p className="font-mono font-black text-xl mb-3" style={{ color: collectiveNarrative.color }}>{collectiveNarrative.title}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.7)' }}>{collectiveNarrative.desc}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[7px] font-mono mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>GÜÇLÜ KANALLAR</p>
              {sortedDims.slice(0, 3).map(d => (
                <div key={d.key} className="flex items-center gap-1.5 justify-end mb-1">
                  <span className="text-[9px] font-mono" style={{ color: DIM[d.key]?.color ?? '#7B6FFF' }}>{d.value}</span>
                  <span className="w-1 h-1 rounded-full" style={{ background: DIM[d.key]?.color ?? '#7B6FFF' }} />
                  <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{DIM[d.key]?.label ?? d.key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NEW 10: Future Consciousness ─────────────────────────────────────── */}
      <div className="os-card overflow-hidden mb-5 cm-card-glow">
        <div className="os-panel-header">
          <p className="os-title">GELECEK BİLİNÇ TAHMİNİ</p>
        </div>
        <div className="grid grid-cols-4 divide-x" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {futureScores.map((f, i) => (
            <div key={i} className="p-5 hover:bg-white/[0.015] transition-colors">
              <p className="text-[8px] font-mono font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>{f.period}</p>
              <p className="font-mono font-black text-3xl leading-none mb-2" style={{ color: f.tierHex, filter: `drop-shadow(0 0 10px ${f.tierHex}80)` }}>{f.score}</p>
              <div className="mb-3">
                <AnimBar value={f.score} color={f.tierHex} />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <p className="text-[7px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>TİER</p>
                  <p className="text-[7px] font-mono font-bold" style={{ color: f.tierHex }}>{f.tier}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-[7px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>RİSK</p>
                  <p className="text-[7px] font-mono font-bold" style={{ color: f.risk === 'Yüksek' ? '#FF4A5E' : f.risk === 'Orta' ? '#FFB800' : '#38D68A' }}>{f.risk}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-[7px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>GÜVEN</p>
                  <p className="text-[7px] font-mono font-bold" style={{ color: '#CC80FF' }}>%{f.confidence}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── NEW 12: Consciousness Health ─────────────────────────────────────── */}
      <div className="os-card p-5 mb-5 cm-card-glow">
        <p className="os-title mb-4" style={{ color: '#7B6FFF' }}>BİLİNÇ SAĞLIK GÖSTERGELERİ</p>
        <div className="grid grid-cols-4 gap-3">
          {healthMetrics.map((m, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[8px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.label}</p>
                <span className="font-mono font-black text-sm" style={{ color: m.color }}>{m.value}</span>
              </div>
              <AnimBar value={typeof m.value === 'number' ? m.value : parseInt(m.value as string) || 0} color={m.color} />
            </div>
          ))}
        </div>
      </div>

      {/* ── NEW 13: AI Insights ───────────────────────────────────────────────── */}
      <div className="os-card p-5 mb-5 cm-card-glow">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative shrink-0">
            <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
            <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
          </div>
          <p className="os-title" style={{ color: '#CC80FF' }}>AI YÖNETİCİ ÇIKARIMLAR</p>
          <span className="ml-auto text-[8px] font-mono" style={{ color: 'rgba(204,128,255,0.3)' }}>Canlı metriklerden üretiliyor</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {aiInsights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors"
              style={{ background: 'rgba(204,128,255,0.03)', border: '1px solid rgba(204,128,255,0.08)' }}>
              <span className="text-[8px] font-mono font-bold shrink-0 mt-0.5" style={{ color: 'rgba(204,128,255,0.5)' }}>0{i + 1}</span>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.7)' }}>{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── NEW 11: Live Signal Detection ────────────────────────────────────── */}
      <div className="mb-5 rounded-2xl overflow-hidden" style={{ background: 'rgba(123,111,255,0.04)', border: '1px solid rgba(123,111,255,0.1)' }}>
        <div className="px-5 py-2.5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(123,111,255,0.08)' }}>
          <div className="relative shrink-0">
            <span className="w-1.5 h-1.5 rounded-full block cm-signal-live" style={{ background: '#7B6FFF' }} />
            <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#7B6FFF' }} />
          </div>
          <p className="text-[8px] font-mono font-bold tracking-[0.14em]" style={{ color: 'rgba(123,111,255,0.7)' }}>CANLI SİNYAL AKIŞI</p>
        </div>
        <div className="py-3 overflow-hidden">
          <div className="cm-ticker-track text-[9px] font-mono" style={{ color: 'rgba(123,111,255,0.55)' }}>
            {liveSignalsTicker}
          </div>
        </div>
      </div>

    </div>
  );
}
