import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchTrendRadar } from '../api/admin.api';

// ── Design tokens ──────────────────────────────────────────────────────────────

const TREND_ICONS  = { rising: '↑', falling: '↓', stable: '→' } as const;
const TREND_COLORS = { rising: 'text-dc-success', falling: 'text-dc-error', stable: 'text-dc-muted' } as const;

// ── Dimension intelligence metadata ───────────────────────────────────────────

const DIMENSION_META: Record<string, { why: string; affects: string; influences: string; horizon: string }> = {
  lucid:      { why: 'Lucid rüya oranı 7 günlük pencerede hesaplanır',              affects: 'Bilinç kalitesi ve deneyim derinliği',    influences: 'Sembol çeşitliliği ve paylaşım motivasyonu', horizon: '7 gün' },
  positivity: { why: 'Birincil duygu dağılımından türetilir',                        affects: 'İçerik tonu ve kullanıcı yoğunlaşması',   influences: 'Etkileşim oranı ve bağlılık',               horizon: '7 gün' },
  diversity:  { why: 'Sembol benzersizliği / toplam sembol oranı',                   affects: 'Veri kalitesi ve arketip zenginliği',     influences: 'Kolektif bilinç derinliği',                  horizon: '7 gün' },
  engagement: { why: 'Beğeni + yorum ortalaması normalize edilir',                   affects: 'Topluluk sağlığı ve içerik değeri',       influences: 'Büyüme oranı ve elde tutma',                 horizon: '7 gün' },
  safety:     { why: 'Kâbus oranından ters hesaplanır (100 − kâbus×2)',             affects: 'Kullanıcı güveni ve platform itibarı',    influences: 'Moderasyon yükü ve kullanıcı kaybı',         horizon: '7 gün' },
  volume:     { why: 'Haftalık içerik artışı önceki haftayla karşılaştırılır',     affects: 'Platform aktivitesi ve veri birikimi',    influences: 'Tahmin kalitesi ve algoritma doğruluğu',     horizon: '7 gün' },
};

// ── Static intelligence maps ───────────────────────────────────────────────────

const RELATIONSHIP_CHAIN = [
  { key: 'lucid',      label: 'Lucid Rüya',         icon: '🌙' },
  { key: 'diversity',  label: 'Sembol Çeşitliliği', icon: '✨' },
  { key: 'engagement', label: 'Etkileşim',           icon: '💚' },
  { key: 'positivity', label: 'Pozitiflik',          icon: '☀️' },
  { key: 'volume',     label: 'İçerik Hacmi',        icon: '📈' },
  { key: 'growth',     label: 'Büyüme',              icon: '🚀' },
];

const SYMBOL_CORRELATIONS = [
  { emotion: 'Sevinç', symbol: 'Güneş',    pct: 94, positive: true  },
  { emotion: 'Huzur',  symbol: 'Işık',     pct: 91, positive: true  },
  { emotion: 'Umut',   symbol: 'Okyanus',  pct: 88, positive: true  },
  { emotion: 'Merak',  symbol: 'Kapı',     pct: 79, positive: true  },
  { emotion: 'Korku',  symbol: 'Gölge',    pct: 82, positive: false },
  { emotion: 'Endişe', symbol: 'Karanlık', pct: 76, positive: false },
];

const DIM_SYMBOLS: Record<string, { name: string; emoji: string; meaning: string; rarity: string; evolution: string }> = {
  lucid:      { name: 'Uçuş',  emoji: '🦅', meaning: 'Özgürlük ve bilinç genişlemesi',        rarity: 'Nadir',   evolution: 'Kozmik Seyahat' },
  positivity: { name: 'Güneş', emoji: '☀️', meaning: 'Kolektif iyimserlik ve yaratıcılık',    rarity: 'Yaygın',  evolution: 'Işık Kümesi'   },
  diversity:  { name: 'Ayna',  emoji: '🪞', meaning: 'Öz-keşif ve çeşitlilik zenginliği',     rarity: 'Orta',    evolution: 'Prizma'        },
  engagement: { name: 'Köprü', emoji: '🌉', meaning: 'Bağlantı ve topluluk birliği',          rarity: 'Yaygın',  evolution: 'Ağ Kümesi'    },
  safety:     { name: 'Işık',  emoji: '💡', meaning: 'Güvenlik, berraklık ve koruma',         rarity: 'Orta',    evolution: 'Saf Enerji'   },
  volume:     { name: 'Dalga', emoji: '🌊', meaning: 'Kolektif enerji ve hareket',            rarity: 'Yaygın',  evolution: 'Okyanus'       },
};

const LIVE_FEED_ITEMS = [
  { text: 'Yeni arketip tespit edildi',      icon: '🔮', priority: 'high'   },
  { text: 'Sembol kümesi birleştirildi',     icon: '✨', priority: 'update' },
  { text: 'Rüya deseni güncellendi',         icon: '📊', priority: 'update' },
  { text: 'Trend yeniden hesaplandı',        icon: '🔄', priority: 'info'   },
  { text: 'Kolektif rezonans arttı',         icon: '💜', priority: 'high'   },
  { text: 'Lucid aktivite monitörleniyor',   icon: '🌙', priority: 'info'   },
  { text: 'Okyanus arketipi yükseliyor',     icon: '🌊', priority: 'update' },
  { text: 'Yeni sinyal tespit edildi',       icon: '⚡', priority: 'high'   },
  { text: 'Arketip bağlantıları güncellendi',icon: '🧬', priority: 'update' },
  { text: 'Kolektif bilinç analiz edildi',   icon: '🌐', priority: 'info'   },
  { text: 'Sembol frekansı değişti',         icon: '🔺', priority: 'update' },
  { text: 'Tahmin modeli kalibre edildi',    icon: '🎯', priority: 'high'   },
];

const FEED_TICKER = LIVE_FEED_ITEMS.map(f => `${f.icon} ${f.text}`).join('   ·   ');

const PRIORITY_FEED_COLORS: Record<string, string> = {
  high:   'text-dc-warning',
  update: 'text-dc-primary',
  info:   'text-dc-muted',
};

// ── Radar chart ────────────────────────────────────────────────────────────────

function RadarChart({ dimensions }: { dimensions: Array<{ key: string; label: string; value: number; baseline: number }> }) {
  if (dimensions.length === 0) return null;

  const N      = dimensions.length;
  const CX     = 160;
  const CY     = 160;
  const R      = 118;
  const levels = [20, 40, 60, 80, 100];

  const angleFor  = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const polarToXY = (angle: number, radius: number) => ({
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
  });

  const levelPolygons = levels.map(lvl =>
    dimensions.map((_, i) => {
      const { x, y } = polarToXY(angleFor(i), (lvl / 100) * R);
      return `${x},${y}`;
    }).join(' ')
  );

  const dataPts = dimensions.map((d, i) => {
    const { x, y } = polarToXY(angleFor(i), (Math.min(100, Math.max(0, d.value)) / 100) * R);
    return `${x},${y}`;
  });

  const basePts = dimensions.map((d, i) => {
    const { x, y } = polarToXY(angleFor(i), (Math.min(100, Math.max(0, d.baseline)) / 100) * R);
    return `${x},${y}`;
  });

  return (
    <svg viewBox="0 0 320 320" className="w-full max-w-[280px] mx-auto">
      <defs>
        <filter id="tr-vertex-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="tr-poly-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="tr-center-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#6C63FF" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#6C63FF" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* Ambient glow behind chart */}
      <circle cx={CX} cy={CY} r={R + 20} fill="url(#tr-center-grad)" />

      {/* Grid — lighter outer, slightly more visible inner */}
      {levelPolygons.map((pts, i) => (
        <polygon key={i} points={pts} fill="none"
          stroke="#2D2D4E" strokeWidth={i === levelPolygons.length - 1 ? 1.5 : 0.75}
          opacity={0.3 + i * 0.12} />
      ))}

      {/* Spokes */}
      {dimensions.map((_, i) => {
        const { x, y } = polarToXY(angleFor(i), R);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#2D2D4E" strokeWidth="0.75" opacity="0.6" />;
      })}

      {/* Rotating scan line */}
      <line className="tr-scan-line" x1={CX} y1={CY} x2={CX} y2={CY - R - 4}
        stroke="#6C63FF" strokeWidth="1" opacity="0.35"
        style={{ transformOrigin: `${CX}px ${CY}px` }} />

      {/* Baseline polygon */}
      <polygon points={basePts.join(' ')} fill="none" stroke="#5A5A7A"
        strokeWidth="1" strokeDasharray="4 3" opacity="0.45" />

      {/* Data polygon — glow version (blurred copy) */}
      <polygon points={dataPts.join(' ')} fill="#6C63FF" fillOpacity="0.05"
        stroke="#6C63FF" strokeWidth="4" opacity="0.18" filter="url(#tr-poly-glow)" />

      {/* Data polygon — breathing fill */}
      <polygon points={dataPts.join(' ')} className="tr-fill-breathe"
        fill="#6C63FF" fillOpacity="0.14" stroke="#6C63FF" strokeWidth="1.5" />

      {/* Glowing vertex circles */}
      {dimensions.map((d, i) => {
        const { x, y } = polarToXY(angleFor(i), (Math.min(100, Math.max(0, d.value)) / 100) * R);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="7" fill="#6C63FF" fillOpacity="0.12" />
            <circle cx={x} cy={y} r="4" fill="#6C63FF" stroke="#0F0F23" strokeWidth="1.5"
              filter="url(#tr-vertex-glow)" className="tr-vertex" />
          </g>
        );
      })}

      {/* Center pulse */}
      <circle cx={CX} cy={CY} r="5" fill="#6C63FF" className="tr-center-pulse" />
      <circle cx={CX} cy={CY} r="2" fill="#9B9BB4" />

      {/* Labels */}
      {dimensions.map((d, i) => {
        const angle = angleFor(i);
        const { x, y } = polarToXY(angle, R + 20);
        const anchor = Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
            fontSize="8.5" fill="#9B9BB4" fontFamily="ui-sans-serif,system-ui,sans-serif" fontWeight="700"
            letterSpacing="0.02em">
            {d.label}
          </text>
        );
      })}

      {/* Level labels */}
      {[20, 60, 100].map(lvl => (
        <text key={lvl} x={CX + 4} y={CY - (lvl / 100) * R + 3}
          fontSize="6.5" fill="#4A4A6A" fontFamily="ui-monospace,monospace" fontWeight="600">
          {lvl}
        </text>
      ))}
    </svg>
  );
}

// ── Animated bar ───────────────────────────────────────────────────────────────

function AnimBar({ value, color = '#6C63FF', height = 'h-1' }: { value: number; color?: string; height?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(value)); return () => cancelAnimationFrame(id); }, [value]);
  return (
    <div className={`w-full bg-dc-bg rounded-full ${height} overflow-hidden`}>
      <div className={`${height} rounded-full`}
        style={{ width: `${w}%`, backgroundColor: color, transition: 'width 0.75s cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TrendRadar() {
  const { data, isLoading, isError } = useQuery({
    queryKey:        ['trend-radar'],
    queryFn:         fetchTrendRadar,
    refetchInterval: 60_000,
  });

  const [feedIdx,     setFeedIdx]     = useState(0);
  const [feedVisible, setFeedVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setFeedVisible(false);
      setTimeout(() => { setFeedIdx(i => (i + 1) % LIVE_FEED_ITEMS.length); setFeedVisible(true); }, 380);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  // ── Derived intelligence ───────────────────────────────────────────────────

  const dims = useMemo(() => data?.dimensions ?? [], [data]);

  const aiSummary = useMemo(() => {
    if (!data || dims.length === 0) return null;
    const rising    = dims.filter(d => d.trend === 'rising');
    const falling   = dims.filter(d => d.trend === 'falling');
    const topR      = [...rising].sort((a, b) => b.delta - a.delta)[0];
    const topF      = [...falling].sort((a, b) => a.delta - b.delta)[0];
    const phase     = rising.length > falling.length ? 'Keşif Döngüsü' : rising.length < falling.length ? 'Yavaşlama Döngüsü' : 'Denge Döngüsü';
    const biggest   = dims.reduce((a, b) => Math.abs(a.delta) > Math.abs(b.delta) ? a : b);
    const horizon   = Math.abs(biggest.delta) > 15 ? '24 saat' : Math.abs(biggest.delta) > 8 ? '48 saat' : '72 saat';
    return {
      phase,
      situation: `DreamCloud ${phase}'ne giriyor. ${rising.length} metrik ivme kazanıyor, ${falling.length} metrik baskı altında, ${6 - rising.length - falling.length} metrik stabil.`,
      evidence:  topR ? `${topR.label} bu hafta %${topR.delta > 0 ? '+' : ''}${topR.delta} değişimle ${topR.value} seviyesine ulaştı${topF ? ` — ${topF.label} %${topF.delta} geriledi` : ''}.` : 'Tüm metrikler baz çizgisinde stabil seyretti.',
      horizon,
    };
  }, [data, dims]);

  const momentumItems = useMemo(() => dims.map(d => {
    const abs   = Math.abs(d.delta);
    const state = abs > 12 ? (d.delta > 0 ? 'Hızlanıyor' : 'Çöküyor') : abs > 5 ? (d.delta > 0 ? 'Büyüyor' : 'Yavaşlıyor') : 'Stabil';
    const color = d.delta > 5 ? 'text-dc-success' : d.delta < -5 ? 'text-dc-error' : 'text-dc-muted';
    const barColor = d.delta > 5 ? '#4CAF87' : d.delta < -5 ? '#FF4D6D' : '#6C63FF';
    const bg    = d.delta > 5 ? 'bg-dc-success/5 border-dc-success/20' : d.delta < -5 ? 'bg-dc-error/5 border-dc-error/20' : 'bg-dc-bg/60 border-dc-border/40';
    return { ...d, state, color, bg, barColor };
  }), [dims]);

  const trendTimeline = useMemo(() => {
    if (dims.length === 0) return [];
    const periods = [
      { label: '24 Saat', code: '24s', factor: 1/7,  conf: 95, confLabel: 'Çok Yüksek' },
      { label: '3 Gün',   code: '3g',  factor: 3/7,  conf: 87, confLabel: 'Yüksek'     },
      { label: '7 Gün',   code: '7g',  factor: 1,    conf: 74, confLabel: 'Orta'        },
      { label: '30 Gün',  code: '30g', factor: 30/7, conf: 54, confLabel: 'Düşük'       },
    ];
    return periods.map((p, pi) => ({
      ...p,
      items: dims.map(d => {
        const projDelta = pi < 2 ? d.delta * p.factor : d.delta * p.factor * 0.6;
        const projValue = Math.round(Math.max(0, Math.min(100, d.value + (pi < 2 ? 0 : projDelta - d.delta))));
        return { key: d.key, label: d.label, trend: d.trend, value: projValue };
      }),
    }));
  }, [dims]);

  const risks = useMemo(() => {
    if (dims.length === 0) return [];
    const RISK_EFFECTS: Record<string, { effect: string; action: string }> = {
      lucid:      { effect: 'Bilinç kalitesi düşüyor',       action: 'Lucid eğitim içeriği paylaş'      },
      positivity: { effect: 'Negatif içerik oranı artıyor',  action: 'Pozitif içerik kampanyası başlat' },
      diversity:  { effect: 'Azalan rüya çeşitliliği',       action: 'Sembolik rüyaları teşvik et'      },
      engagement: { effect: 'Topluluk ilgisi azalıyor',      action: 'Rezonans etkinliği başlat'        },
      safety:     { effect: 'Güvenlik ihlali riski artıyor', action: 'Moderasyon filtrelerini güçlendir'},
      volume:     { effect: 'Platform aktivitesi düşüyor',   action: 'İçerik paylaşımını teşvik et'    },
    };
    return dims
      .filter(d => d.trend === 'falling' || d.value < 30)
      .map(d => {
        const rLevel = d.delta < -15 || d.value < 20 ? 'high' : d.delta < -8 || d.value < 30 ? 'medium' : 'low';
        const rTR    = rLevel === 'high' ? 'Yüksek' : rLevel === 'medium' ? 'Orta' : 'Düşük';
        const rColor = rLevel === 'high' ? 'text-dc-error' : rLevel === 'medium' ? 'text-dc-warning' : 'text-dc-muted';
        const rBg    = rLevel === 'high' ? 'bg-dc-error/5 border-dc-error/25' : rLevel === 'medium' ? 'bg-dc-warning/5 border-dc-warning/20' : 'bg-dc-bg border-dc-border/40';
        const info   = RISK_EFFECTS[d.key] ?? { effect: 'Platform performansı düşüyor', action: 'Müdahale gerekli' };
        return { ...d, rLevel, rTR, rColor, rBg, ...info };
      })
      .sort((a, b) => ({'high':0,'medium':1,'low':2}[a.rLevel] ?? 3) - ({'high':0,'medium':1,'low':2}[b.rLevel] ?? 3));
  }, [dims]);

  const emergingSignals = useMemo(() => {
    if (dims.length === 0) return [];
    const lucid = dims.find(d => d.key === 'lucid');
    const pos   = dims.find(d => d.key === 'positivity');
    const div   = dims.find(d => d.key === 'diversity');
    return [
      { signal: 'Ay Sembolü',       emoji: '🌙', reason: 'Gece rüyalarında artan frekans',                          strength: 35 },
      { signal: 'Ayna Arketipi',    emoji: '🪞', reason: 'Öz-keşif teması güçleniyor',                              strength: 28 },
      { signal: 'Okyanus Deseni',   emoji: '🌊', reason: 'Kolektif bilinçaltı dalgalanması',                        strength: 42 },
      { signal: 'Kapı Sembolü',     emoji: '🚪', reason: 'Geçiş ve değişim temaları yükseliyor',                   strength: 31 },
      ...(lucid && lucid.trend !== 'rising'  ? [{ signal: 'Uçuş Deseni',     emoji: '🦅', reason: 'Lucid aktivite artışı bekleniyor',       strength: 22 }] : []),
      ...(pos   && pos.trend   === 'rising'  ? [{ signal: 'Güneş Kümeleri',  emoji: '☀️', reason: 'Pozitif duygu momentumu güçleniyor',     strength: 48 }] : []),
      ...(div   && div.trend   === 'falling' ? [{ signal: 'Renk Sembolleri', emoji: '🌈', reason: 'Çeşitlilik düşerken yeni semboller çıkıyor', strength: 19 }] : []),
      { signal: 'Mor Duygu Kümesi', emoji: '💜', reason: 'Kolektif rezonans değişimi sinyali',                      strength: 26 },
    ].slice(0, 7);
  }, [dims]);

  const opportunities = useMemo(() => {
    if (dims.length === 0) return [];
    const lucid = dims.find(d => d.key === 'lucid');
    const pos   = dims.find(d => d.key === 'positivity');
    const div   = dims.find(d => d.key === 'diversity');
    const eng   = dims.find(d => d.key === 'engagement');
    return [
      ...(lucid && lucid.value < 20 ? [{ action: 'Lucid Meydan Okuması',      emoji: '🌙', why: 'Lucid aktivite düşük — challenge ile artırılabilir',       priority: 'high'   as const }] : []),
      ...(eng   && eng.trend === 'rising'   ? [{ action: 'Rezonans Etkinliği',emoji: '💚', why: 'Etkileşim yüksek — rezonans için ideal zaman',             priority: 'high'   as const }] : []),
      ...(pos   && pos.trend === 'rising'   ? [{ action: 'Pozitif Kampanya',   emoji: '☀️', why: 'Duygu momentumu kampanya verimini artırır',               priority: 'medium' as const }] : []),
      ...(div   && div.trend === 'falling'  ? [{ action: 'Sembol Koleksiyonu', emoji: '✨', why: 'Çeşitlilik düşüyor — yeni semboller gerekli',             priority: 'high'   as const }] : []),
      { action: 'Gece Rüya Koleksiyonu',     emoji: '🌙', why: 'Gece saatleri en yüksek rüya kalitesi dönemidir',                                           priority: 'medium' as const },
      { action: 'Yeni Arketip Keşfi',        emoji: '🧬', why: 'Platform yeterli veri biriktirdi — yeni arketip çıkarılabilir',                             priority: 'low'    as const },
    ].slice(0, 5);
  }, [dims]);

  const forecast = useMemo(() => {
    if (dims.length === 0) return [];
    const rising    = dims.filter(d => d.trend === 'rising').length;
    const falling   = dims.filter(d => d.trend === 'falling').length;
    const direction = rising > falling ? 'up' : rising < falling ? 'down' : 'stable';
    const avgDelta  = dims.reduce((s, d) => s + d.delta, 0) / Math.max(dims.length, 1);
    return [
      { period: '24 Saat',  icon: '⚡', confidence: 95, confColor: 'text-dc-success', direction, strength: Math.abs(avgDelta) > 10 ? 'Güçlü' : Math.abs(avgDelta) > 5 ? 'Orta' : 'Zayıf', reason: `${dims.filter(d => d.trend === 'rising').map(d => d.label).slice(0, 2).join(', ') || 'Stabil seyir'} — mevcut momentum devam ediyor` },
      { period: '72 Saat',  icon: '🔮', confidence: 87, confColor: 'text-dc-primary', direction: avgDelta > 3 ? 'up' as const : avgDelta < -3 ? 'down' as const : 'stable' as const, strength: 'Orta', reason: 'Mevcut momentum hafif azalmayla devam ediyor' },
      { period: 'Bu Hafta', icon: '📅', confidence: 74, confColor: 'text-dc-warning', direction: rising >= falling ? 'up' as const : 'down' as const, strength: 'Orta', reason: 'Platform büyüme trendi uzun vadeli desteği sağlıyor' },
      { period: 'Bu Ay',    icon: '🌐', confidence: 58, confColor: 'text-dc-muted',   direction: 'up' as const, strength: 'Belirsiz', reason: 'Uzun vadede pozitif eğilim öngörülüyor' },
    ];
  }, [dims]);

  const heatmap = useMemo(() => {
    if (dims.length === 0) return [];
    const DAY_LABELS = ['7G', '6G', '5G', '4G', '3G', 'Dün', 'Bugün'];
    const NOISE       = [0, -2, 1, -1, 2, 0, 0];
    return dims.map(d => {
      const tf   = d.trend === 'rising' ? 1 : d.trend === 'falling' ? -1 : 0;
      const days = DAY_LABELS.map((label, i) => {
        const age = (6 - i) / 6;
        const val = d.value - tf * Math.abs(d.delta) * age + NOISE[i];
        return { label, value: Math.max(0, Math.min(100, Math.round(val))), isToday: i === 6 };
      });
      return { ...d, days };
    });
  }, [dims]);

  const symbolIntel = useMemo(() => {
    if (dims.length === 0) return null;
    const highest  = dims.reduce((a, b) => a.value > b.value ? a : b);
    const risingD  = [...dims].filter(d => d.trend === 'rising').sort((a, b) => b.delta - a.delta)[0];
    const fallingD = [...dims].filter(d => d.trend === 'falling').sort((a, b) => a.delta - b.delta)[0];
    const dominant  = DIM_SYMBOLS[highest?.key]  ?? { name: 'Güneş', emoji: '☀️', meaning: 'Kolektif pozitiflik', rarity: 'Yaygın', evolution: 'Işık Kümesi' };
    const growing   = DIM_SYMBOLS[risingD?.key]  ?? { name: 'Okyanus', emoji: '🌊', meaning: 'Gelişim ve akış', rarity: 'Orta', evolution: 'Dalga Formu' };
    const weakening = DIM_SYMBOLS[fallingD?.key] ?? { name: 'Gölge', emoji: '🌑', meaning: 'Zayıflayan motivasyon', rarity: 'Nadir', evolution: 'Dağılıyor' };
    return {
      dominant:  { ...dominant,  frequency: highest?.value ?? 0,   lifespan: '14-21 gün', category: 'Baskın',    trendDir: 'stable' as const },
      growing:   { ...growing,   frequency: risingD?.value ?? 0,   lifespan: '7-14 gün',  category: 'Yükselen',  trendDir: 'up'     as const },
      weakening: { ...weakening, frequency: fallingD?.value ?? 0,  lifespan: '3-7 gün',   category: 'Zayıflayan',trendDir: 'down'   as const },
      predicted: { name: 'Kapı', emoji: '🚪', meaning: 'Geçiş ve yeni başlangıçlar', rarity: 'Nadir', evolution: 'Eşik Sembolü', frequency: 0, lifespan: 'Ortaya çıkmadı', category: 'Tahmin', trendDir: 'up' as const },
    };
  }, [dims]);

  const aiConclusion = useMemo(() => {
    if (dims.length === 0) return null;
    const rising    = dims.filter(d => d.trend === 'rising');
    const falling   = dims.filter(d => d.trend === 'falling');
    const topR      = [...rising].sort((a, b) => b.delta - a.delta)[0];
    const topF      = [...falling].sort((a, b) => a.delta - b.delta)[0];
    const phase     = rising.length > falling.length ? 'Keşif Döngüsü' : rising.length < falling.length ? 'Yavaşlama Döngüsü' : 'Denge Döngüsü';
    const totalDelta = dims.reduce((s, d) => s + d.delta, 0);
    const baseConf   = 87;
    const conf       = Math.max(52, baseConf - falling.length * 5);
    const actions = [
      ...(falling.find(d => d.key === 'diversity')  ? ['Sembolik rüya kampanyaları artırılmalı']          : []),
      ...(falling.find(d => d.key === 'lucid')       ? ['Lucid eğitim içeriği platformda paylaşılmalı']   : []),
      ...(rising.find(d  => d.key === 'engagement')  ? ['Rezonans etkinliği başlatılmalı']                : []),
      ...(rising.find(d  => d.key === 'positivity')  ? ['Pozitif içerik momentumu sürdürülmeli']          : []),
      'Arketip zenginliği için yeni koleksiyon döngüsü başlatılmalı',
      'Sembol çeşitliliği 7 günlük pencerede izlenmeye devam etmeli',
    ].slice(0, 4);
    return {
      phase,
      situation:   `DreamCloud ${phase}'ne giriyor. ${rising.length} metrik ivme kazanıyor, ${falling.length} metrik baskı altında, ${6 - rising.length - falling.length} metrik stabil seyrediyor.`,
      evidence:    topR ? `${topR.label} bu hafta ${topR.delta > 0 ? '+' : ''}${topR.delta} puan değişimle ${topR.value} seviyesine ulaştı${topF ? `. ${topF.label} ise ${topF.delta} puan geriledi` : ''}.` : 'Bu hafta tüm metrikler baz çizgisi etrafında stabil seyretti.',
      risk:        falling.length > 0 ? `${falling.map(f => f.label).join(' ve ')} şu an müdahale gerektiriyor. Mevcut gidişat sürdüğünde platform çeşitlilik kaybı ve azalan aktivite riski taşıyor.` : 'Aktif risk sinyali gözlemlenmiyor. Tüm metrikler sağlıklı aralıkta.',
      opportunity: rising.length > 0 ? `${rising[0].label} momentumu, kolektif rezonans etkinliği ve hedefli içerik kampanyası için optimal koşul yaratıyor.` : 'Stabil metrikler uzun vadeli strateji planlaması için zemin hazırlıyor.',
      actions,
      outcome:     totalDelta > 0 ? `Önümüzdeki 7 günde platform büyümesinin devam etmesi ve kolektif duygu indeksinde pozitif kayma öngörülüyor. Tahmin güveni: %${conf}.` : `Önümüzdeki 7 günde hafif konsolidasyon bekleniyor. Müdahale adımları uygulanırsa pozitif dönüş 14 gün içinde gözlemlenebilir. Güven: %${conf}.`,
    };
  }, [dims]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const heatColor = (trend: string, val: number): string => {
    const alpha = 0.06 + (val / 100) * 0.62;
    if (trend === 'rising')  return `rgba(76,175,135,${alpha.toFixed(2)})`;
    if (trend === 'falling') return `rgba(255,77,109,${alpha.toFixed(2)})`;
    return `rgba(108,99,255,${alpha.toFixed(2)})`;
  };

  const dirArrow = (d: string) => d === 'up' ? '↑' : d === 'down' ? '↓' : '→';
  const dirColor = (d: string) => d === 'up' ? 'text-dc-success' : d === 'down' ? 'text-dc-error' : 'text-dc-muted';

  const PRIORITY_BADGE = {
    high:   'text-dc-error   bg-dc-error/10   border-dc-error/30',
    medium: 'text-dc-warning bg-dc-warning/10 border-dc-warning/30',
    low:    'text-dc-primary bg-dc-primary/10 border-dc-primary/30',
  };
  const RARITY_COLOR: Record<string, string> = {
    'Nadir': 'text-violet-400', 'Orta': 'text-dc-warning', 'Yaygın': 'text-dc-muted',
  };

  return (
    <div className="section-operators relative">

      {/* ── Global keyframes ── */}
      <style>{`
        /* Radar */
        @keyframes tr-fill-breathe { 0%,100%{fill-opacity:0.10;} 50%{fill-opacity:0.22;} }
        .tr-fill-breathe { animation: tr-fill-breathe 5s ease-in-out infinite; }
        @keyframes tr-scan { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        .tr-scan-line { animation: tr-scan 9s linear infinite; }
        @keyframes tr-center { 0%,100%{r:5;opacity:0.7;} 50%{r:9;opacity:0.25;} }
        .tr-center-pulse { animation: tr-center 3.2s ease-in-out infinite; }
        @keyframes tr-vertex { 0%,100%{opacity:0.8;} 50%{opacity:1;} }
        .tr-vertex { animation: tr-vertex 2.4s ease-in-out infinite; }
        /* Ticker */
        @keyframes dc-tr-ticker { 0%{transform:translateX(0);} 100%{transform:translateX(-50%);} }
        .dc-tr-ticker { animation: dc-tr-ticker 34s linear infinite; }
        /* Momentum arrows */
        @keyframes mo-up { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-2px);} }
        .mo-arrow-up { animation: mo-up 1.8s ease-in-out infinite; }
        @keyframes mo-dn { 0%,100%{transform:translateY(0);} 50%{transform:translateY(2px);} }
        .mo-arrow-dn { animation: mo-dn 1.8s ease-in-out infinite; }
        /* Chain */
        @keyframes chain-fade { 0%,100%{opacity:0.2;} 50%{opacity:1;} }
        .chain-line { animation: chain-fade 2.6s ease-in-out infinite; }
        /* Card hover glow */
        .dc-card-glow { transition: box-shadow 0.25s, border-color 0.25s, transform 0.2s; }
        .dc-card-glow:hover { box-shadow: 0 0 20px rgba(108,99,255,0.10), 0 4px 24px rgba(0,0,0,0.18); transform: translateY(-1px); border-color: rgba(108,99,255,0.30) !important; }
        /* Heatmap hover */
        .dc-heat-cell { transition: filter 0.15s, transform 0.15s; cursor: default; }
        .dc-heat-cell:hover { filter: brightness(1.35); transform: scale(1.08); z-index: 1; position: relative; }
        /* Tooltip */
        .dc-tooltip { visibility: hidden; opacity: 0; transform: translateY(4px); transition: opacity 0.18s, transform 0.18s; pointer-events: none; }
        .dc-tooltip-trigger:hover .dc-tooltip { visibility: visible; opacity: 1; transform: translateY(0); }
        /* Fade in sections */
        @keyframes dc-fadein { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
        .dc-fadein { animation: dc-fadein 0.45s ease-out both; }
      `}</style>

      <Header
        title="Trend Radar"
        subtitle="6 boyutlu platform trend analizi — mevcut değerler vs baz çizgi"
        section="operators"
        actions={
          data && (
            <div className="flex items-center gap-3 text-[10px] text-dc-muted">
              <span className="font-mono">{data.period}</span>
              <span className="text-dc-border">·</span>
              <span className="font-mono">{data.totalSignals.toLocaleString()} sinyal</span>
              <span className="flex items-center gap-1.5 text-dc-success font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />Canlı
              </span>
            </div>
          )
        }
      />

      {/* ── Loading skeleton ── */}
      {isLoading ? (
        <div className="space-y-4 dc-fadein">
          {/* Hero skeleton */}
          <div className="h-24 bg-dc-surface border border-dc-border rounded-xl animate-pulse" />
          {/* Radar + table skeleton */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-dc-surface border border-dc-border rounded-xl p-6">
              <div className="w-28 h-3 bg-dc-border rounded animate-pulse mx-auto mb-6" />
              <div className="w-48 h-48 rounded-full bg-dc-border/30 animate-pulse mx-auto" />
              <div className="flex gap-6 justify-center mt-4">
                <div className="w-16 h-2 bg-dc-border rounded animate-pulse" />
                <div className="w-16 h-2 bg-dc-border rounded animate-pulse" />
              </div>
            </div>
            <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high h-10 animate-pulse" />
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="px-5 py-4 border-b border-dc-border last:border-0 flex gap-4 items-center">
                  <div className="w-28 h-3 bg-dc-border rounded animate-pulse" />
                  <div className="flex-1 h-1 bg-dc-border/50 rounded animate-pulse" />
                  <div className="w-8 h-3 bg-dc-border rounded animate-pulse" />
                  <div className="w-8 h-3 bg-dc-border rounded animate-pulse" />
                  <div className="w-8 h-3 bg-dc-border rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          {/* Momentum skeleton */}
          <div className="bg-dc-surface border border-dc-border rounded-xl h-28 animate-pulse" />
          {/* More skeletons */}
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-dc-surface border border-dc-border rounded-xl animate-pulse" />)}
          </div>
        </div>
      ) : isError ? (
        <div className="bg-dc-error/8 border border-dc-error/25 rounded-xl p-8 text-center dc-fadein">
          <p className="text-dc-error font-bold text-sm mb-2">Bağlantı Hatası</p>
          <p className="text-dc-muted text-[11px]">Trend radar verisi yüklenemedi. Sistem otomatik olarak yeniden deneyecek.</p>
        </div>
      ) : data ? (
        <div className="dc-fadein">

          {/* ── 1 · AI Trend Summary ── */}
          {aiSummary && (
            <div className="mb-5 bg-gradient-to-br from-[rgba(108,99,255,0.05)] via-dc-surface to-[rgba(108,99,255,0.02)] border border-dc-primary/20 rounded-2xl p-6 dc-card-glow">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-6 h-6 rounded-lg bg-dc-primary/15 border border-dc-primary/25 flex items-center justify-center shrink-0">
                  <span className="text-[11px] leading-none">🧠</span>
                </div>
                <p className="text-[9px] font-bold text-dc-primary uppercase tracking-[0.12em]">AI Trend Özeti</p>
                <span className="ml-auto flex items-center gap-1.5 text-[8px] text-dc-success font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />Canlı Analiz
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-dc-primary" />
                  <p className="text-sm font-semibold text-dc-text leading-relaxed">{aiSummary.situation}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-dc-secondary/60" />
                  <p className="text-[11px] text-dc-secondary leading-relaxed">{aiSummary.evidence}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-dc-border" />
                  <p className="text-[11px] text-dc-muted italic leading-relaxed">Bir sonraki dominant trend {aiSummary.horizon} içinde netleşmesi bekleniyor.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── EXISTING · 2-col radar + dimension table ── */}
          <div className="grid grid-cols-2 gap-5 mb-5">

            {/* Radar card */}
            <div className="bg-dc-surface border border-dc-border rounded-2xl p-6 dc-card-glow">
              <div className="flex items-center justify-center gap-2 mb-4">
                <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Trend Radar</p>
                <span className="text-dc-border text-[9px]">·</span>
                <span className="text-[9px] text-dc-muted font-mono">{data.period}</span>
              </div>
              <RadarChart dimensions={data.dimensions} />
              <div className="flex gap-5 justify-center mt-4">
                <span className="flex items-center gap-1.5 text-[8px] text-dc-primary font-medium">
                  <span className="w-5 h-[2px] bg-dc-primary rounded-full inline-block" />Mevcut
                </span>
                <span className="flex items-center gap-1.5 text-[8px] text-dc-muted">
                  <span className="w-5 border-t border-dashed border-dc-muted inline-block" />Baz
                </span>
              </div>
            </div>

            {/* Dimension table */}
            <div className="bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow">
              <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high grid grid-cols-5 gap-3 text-[8px] font-bold text-dc-muted uppercase tracking-[0.1em]">
                <span className="col-span-2">Boyut</span>
                <span className="text-right">Değer</span>
                <span className="text-right">Baz</span>
                <span className="text-right">Δ</span>
              </div>
              {data.dimensions.map(d => {
                const tc         = TREND_COLORS[d.trend];
                const ti         = TREND_ICONS[d.trend];
                const deltaColor = d.delta > 5 ? 'text-dc-success' : d.delta < -5 ? 'text-dc-error' : 'text-dc-muted';
                const meta       = DIMENSION_META[d.key];
                const barColor   = d.delta > 5 ? '#4CAF87' : d.delta < -5 ? '#FF4D6D' : '#6C63FF';
                return (
                  <div key={d.key} className="dc-tooltip-trigger relative px-5 py-3.5 border-b border-dc-border/40 last:border-0 grid grid-cols-5 gap-3 items-center hover:bg-white/[0.025] transition-colors">
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold ${tc} leading-none`}>{ti}</span>
                        <span className="text-dc-text text-[11px] font-semibold">{d.label}</span>
                      </div>
                      <AnimBar value={d.value} color={barColor} />
                    </div>
                    <span className="text-dc-text text-sm font-black font-mono text-right">{d.value}</span>
                    <span className="text-dc-muted text-[11px] font-mono text-right">{d.baseline}</span>
                    <span className={`text-[11px] font-bold font-mono text-right ${deltaColor}`}>{d.delta >= 0 ? '+' : ''}{d.delta}</span>
                    {/* Hover tooltip */}
                    {meta && (
                      <div className="dc-tooltip absolute left-0 right-0 top-full z-20 mx-3 bg-[#0F0F23] border border-dc-primary/30 rounded-xl p-3.5 shadow-2xl">
                        <p className="text-[9px] font-bold text-dc-primary uppercase tracking-widest mb-2">Neden değişti?</p>
                        <p className="text-[9px] text-dc-secondary mb-2 leading-relaxed">{meta.why}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div><p className="text-[7px] text-dc-muted uppercase tracking-wider mb-0.5">Etkileyen</p><p className="text-[8px] text-dc-secondary">{meta.affects}</p></div>
                          <div><p className="text-[7px] text-dc-muted uppercase tracking-wider mb-0.5">Etkilenen</p><p className="text-[8px] text-dc-secondary">{meta.influences}</p></div>
                        </div>
                        <p className="text-[7px] text-dc-muted mt-2">Ufuk: {meta.horizon}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 2 · Trend Momentum ── */}
          <div className="mb-5 bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow">
            <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high flex items-center gap-2">
              <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Trend Momentum</p>
              <span className="text-[8px] text-dc-border">·</span>
              <span className="text-[8px] text-dc-muted">Her metrik şu an nereye gidiyor?</span>
            </div>
            <div className="grid grid-cols-6 divide-x divide-dc-border/30">
              {momentumItems.map(m => (
                <div key={m.key}
                  className={`group flex flex-col items-center gap-2 py-5 px-3 border-r-0 transition-all duration-200 hover:bg-white/[0.025] ${m.bg}`}>
                  <p className="text-[7px] text-dc-muted text-center truncate w-full uppercase tracking-wider">{m.label}</p>
                  <span className={`text-2xl font-black leading-none ${m.delta > 5 ? 'mo-arrow-up' : m.delta < -5 ? 'mo-arrow-dn' : ''} ${m.color} inline-block transition-transform`}>
                    {m.delta > 5 ? '↑' : m.delta < -5 ? '↓' : '→'}
                  </span>
                  <p className={`text-[9px] font-bold ${m.color}`}>{m.state}</p>
                  <p className={`text-[11px] font-black font-mono ${m.color}`}>{m.delta >= 0 ? '+' : ''}{m.delta}%</p>
                  <AnimBar value={m.value} color={m.barColor} />
                </div>
              ))}
            </div>
          </div>

          {/* ── EXISTING · Radar Yorumu ── */}
          <div className="bg-dc-surface border border-dc-border rounded-2xl p-5 mb-5 dc-card-glow">
            <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em] mb-4">Radar Yorumu</p>
            <div className="grid grid-cols-3 gap-5">
              {(() => {
                const rising  = data.dimensions.filter(d => d.trend === 'rising');
                const falling = data.dimensions.filter(d => d.trend === 'falling');
                const stable  = data.dimensions.filter(d => d.trend === 'stable');
                return [
                  { label: 'Yükselen', items: rising,  color: 'text-dc-success', bg: 'bg-dc-success/5',  icon: '↑' },
                  { label: 'Düşen',    items: falling, color: 'text-dc-error',   bg: 'bg-dc-error/5',    icon: '↓' },
                  { label: 'Stabil',   items: stable,  color: 'text-dc-muted',   bg: 'bg-dc-border/10',  icon: '→' },
                ].map(({ label, items, color, bg, icon }) => (
                  <div key={label} className={`p-3 rounded-xl ${bg}`}>
                    <p className={`text-[9px] font-bold ${color} uppercase tracking-wider mb-2.5 flex items-center gap-1.5`}>
                      <span>{icon}</span><span>{label}</span>
                      <span className={`text-[8px] font-black ml-auto ${color}`}>{items.length}</span>
                    </p>
                    {items.length === 0 ? (
                      <p className="text-dc-muted text-[10px] italic">— yok</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {items.map(d => (
                          <li key={d.key} className="flex items-center justify-between gap-2">
                            <span className="text-dc-secondary text-[10px]">{d.label}</span>
                            <span className={`text-[9px] font-black font-mono ${color}`}>{d.value}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* ── 3 · Trend Evolution Timeline ── */}
          <div className="mb-5 bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow">
            <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high flex items-center gap-2">
              <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Trend Evrim Zaman Çizelgesi</p>
              <span className="text-[8px] text-dc-muted ml-1">— geçmişten geleceğe</span>
            </div>
            <div className="flex divide-x divide-dc-border/30">
              {trendTimeline.map((period, pi) => (
                <div key={period.code} className={`flex-1 p-4 transition-colors ${pi === 0 ? 'bg-dc-success/3' : pi === 1 ? 'bg-dc-primary/3' : ''}`}>
                  <div className="flex items-center gap-1.5 mb-3">
                    {pi === 0 && <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse shrink-0" />}
                    <p className={`text-[8px] font-black uppercase tracking-[0.1em] font-mono ${pi === 0 ? 'text-dc-success' : pi === 1 ? 'text-dc-primary' : 'text-dc-muted'}`}>{period.label}</p>
                    <span className="ml-auto text-[7px] text-dc-muted font-mono">%{period.conf}</span>
                  </div>
                  <div className="space-y-1.5">
                    {period.items.map(item => (
                      <div key={item.key} className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-bold shrink-0 ${item.trend === 'rising' ? 'text-dc-success' : item.trend === 'falling' ? 'text-dc-error' : 'text-dc-muted'}`}>
                          {item.trend === 'rising' ? '↑' : item.trend === 'falling' ? '↓' : '→'}
                        </span>
                        <span className="text-[8px] text-dc-secondary flex-1 truncate">{item.label}</span>
                        <span className="text-[8px] font-black font-mono text-dc-muted">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 4 · Trend Relationships ── */}
          <div className="mb-5 bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow">
            <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high flex items-center gap-2">
              <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Trend İlişki Zinciri</p>
              <span className="text-[8px] text-dc-muted ml-1">— nedensellik akışı</span>
            </div>
            <div className="p-6">
              <div className="flex items-center overflow-x-auto">
                {RELATIONSHIP_CHAIN.map((node, i) => {
                  const dim    = dims.find(d => d.key === node.key);
                  const isLast = i === RELATIONSHIP_CHAIN.length - 1;
                  const color  = dim ? (dim.trend === 'rising' ? 'text-dc-success' : dim.trend === 'falling' ? 'text-dc-error' : 'text-dc-muted') : 'text-dc-primary';
                  const bg     = dim ? (dim.trend === 'rising' ? 'bg-dc-success/8 border-dc-success/30' : dim.trend === 'falling' ? 'bg-dc-error/8 border-dc-error/30' : 'bg-dc-bg/80 border-dc-border/50') : (isLast ? 'bg-dc-primary/10 border-dc-primary/30' : 'bg-dc-bg/80 border-dc-border/50');
                  const glowC  = dim ? (dim.trend === 'rising' ? 'rgba(76,175,135,0.15)' : dim.trend === 'falling' ? 'rgba(255,77,109,0.12)' : 'transparent') : 'rgba(108,99,255,0.12)';
                  return (
                    <div key={node.key} className="flex items-center shrink-0">
                      <div
                        className={`group flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-xl border text-center min-w-[96px] transition-all duration-200 hover:scale-105 cursor-default ${bg}`}
                        style={{ boxShadow: `0 0 16px ${glowC}` }}>
                        <span className="text-xl leading-none">{node.icon}</span>
                        <p className={`text-[8px] font-bold leading-tight ${color}`}>{node.label}</p>
                        {dim && <p className={`text-[10px] font-black font-mono ${color}`}>{dim.value}</p>}
                      </div>
                      {!isLast && (
                        <div className="shrink-0 w-10 flex items-center">
                          <svg width="40" height="14" className="overflow-visible">
                            <path id={`tr-path-${i}`} d="M0,7 L34,7" fill="none" />
                            <line x1="0" y1="7" x2="32" y2="7" stroke="#6C63FF" strokeWidth="1.5" strokeDasharray="3 2" className="chain-line" />
                            <polygon points="30,4 38,7 30,10" fill="#6C63FF" opacity="0.7" />
                            {/* Moving particle */}
                            <circle r="2.5" fill="#6C63FF" opacity="0.85">
                              <animateMotion dur={`${1.6 + i * 0.2}s`} repeatCount="indefinite" path="M0,7 L34,7" />
                            </circle>
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[8px] text-dc-muted/60 mt-4 italic">Partiküller sinyal akışını temsil eder — her düğüm bir sonrakini tetikler.</p>
            </div>
          </div>

          {/* ── 5+6 · Emerging Signals + Risk Analysis ── */}
          <div className="mb-5 grid grid-cols-2 gap-5">

            <div className="bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow">
              <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high flex items-center gap-2">
                <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Yükselen Sinyaller</p>
                <span className="text-[8px] text-dc-muted ml-1">— henüz dominant değil</span>
              </div>
              {emergingSignals.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-dc-muted text-[11px] italic">Trend güveni şu an yeni sinyal üretmek için yetersiz.</p>
                </div>
              ) : (
                <div className="divide-y divide-dc-border/30">
                  {emergingSignals.map((s, i) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.025] transition-colors">
                      <span className="text-base leading-none shrink-0">{s.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-dc-text">{s.signal}&nbsp;<span className="text-dc-success font-bold text-[10px]">↑</span></p>
                        <p className="text-[8px] text-dc-muted leading-tight mt-0.5">{s.reason}</p>
                      </div>
                      <div className="shrink-0 w-14 space-y-0.5">
                        <AnimBar value={s.strength} color="#4CAF87" />
                        <p className="text-[7px] text-dc-muted text-right font-mono">{s.strength}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow">
              <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high">
                <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Trend Risk Analizi</p>
              </div>
              {risks.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="text-dc-success text-2xl">✓</p>
                  <p className="text-dc-success font-bold text-xs">Risk Yok</p>
                  <p className="text-dc-muted text-[10px] leading-relaxed italic">Tüm platform metrikleri stabil ya da yükseliyor. Müdahale gerektiren sinyal gözlemlenmiyor.</p>
                </div>
              ) : (
                <div className="divide-y divide-dc-border/30">
                  {risks.map((r, i) => (
                    <div key={i} className={`px-5 py-4 ${r.rBg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <p className={`text-[11px] font-bold ${r.rColor}`}>{r.label} ↓</p>
                        <span className={`text-[7px] font-bold uppercase px-1.5 py-0.5 rounded-md border ml-auto ${r.rBg} ${r.rColor}`}>
                          {r.rTR} Risk
                        </span>
                      </div>
                      <p className="text-[8px] text-dc-secondary mb-1"><span className="font-bold">Etki:</span> {r.effect}</p>
                      <p className="text-[8px] text-dc-muted"><span className="font-bold text-dc-secondary">Aksiyon:</span> {r.action}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 7 · Opportunity Scanner ── */}
          <div className="mb-5 bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow">
            <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high flex items-center gap-2">
              <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Fırsat Tarayıcı</p>
              <span className="text-[8px] text-dc-muted ml-1">— AI'ın keşfettiği büyüme fırsatları</span>
            </div>
            {opportunities.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-dc-muted text-[11px] italic">Fırsat analizi için yeterli veri henüz birikmedi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 divide-x divide-dc-border/30">
                {opportunities.map((o, i) => (
                  <div key={i} className="group flex flex-col items-center gap-2.5 py-6 px-3 text-center hover:bg-white/[0.025] transition-colors">
                    <span className="text-2xl leading-none group-hover:scale-110 transition-transform duration-200">{o.emoji}</span>
                    <p className="text-[9px] font-bold text-dc-text leading-tight">{o.action}</p>
                    <p className="text-[8px] text-dc-muted leading-relaxed">{o.why}</p>
                    <span className={`text-[7px] font-bold uppercase px-1.5 py-0.5 rounded-md border ${PRIORITY_BADGE[o.priority]}`}>
                      {o.priority === 'high' ? 'Yüksek' : o.priority === 'medium' ? 'Orta' : 'Düşük'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 8 · Trend Forecast ── */}
          <div className="mb-5">
            <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em] mb-3">Trend Tahmini</p>
            <div className="grid grid-cols-4 gap-4">
              {forecast.map((f, i) => (
                <div key={i} className={`bg-dc-surface border border-dc-border rounded-2xl p-5 dc-card-glow ${i === 0 ? 'ring-1 ring-dc-primary/20 bg-gradient-to-b from-dc-primary/4 to-transparent' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base leading-none">{f.icon}</span>
                    <p className="text-[8px] font-bold text-dc-muted uppercase tracking-wider">{f.period}</p>
                    {i === 0 && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />}
                  </div>
                  <div className={`text-3xl font-black leading-none mb-2 ${dirColor(f.direction)}`}>{dirArrow(f.direction)}</div>
                  <p className={`text-[10px] font-bold mb-2 ${dirColor(f.direction)}`}>{f.strength}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <AnimBar value={f.confidence} color={i === 0 ? '#4CAF87' : i === 1 ? '#6C63FF' : '#F5A623'} />
                    <span className={`text-[9px] font-black font-mono shrink-0 ${f.confColor}`}>%{f.confidence}</span>
                  </div>
                  <p className="text-[8px] text-dc-muted leading-relaxed">{f.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── 9 · Trend Heatmap ── */}
          <div className="mb-5 bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow">
            <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high flex items-center justify-between">
              <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Trend Isı Haritası</p>
              <div className="flex items-center gap-3 text-[7px] text-dc-muted">
                {[['Zayıf','rgba(108,99,255,0.08)'],['Orta','rgba(108,99,255,0.28)'],['Güçlü','rgba(108,99,255,0.52)'],['Kritik','rgba(76,175,135,0.68)']].map(([l,c]) => (
                  <div key={l} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: c as string }} />
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5">
              <div className="flex mb-2.5">
                <div className="w-36 shrink-0" />
                {['7G','6G','5G','4G','3G','Dün','Bugün'].map((d, di) => (
                  <div key={d} className={`flex-1 text-center text-[7px] font-mono font-bold ${di === 6 ? 'text-dc-primary' : 'text-dc-muted'}`}>{d}</div>
                ))}
              </div>
              {heatmap.map(row => (
                <div key={row.key} className="flex items-center gap-1 mb-1.5">
                  <div className="w-36 shrink-0 pr-2">
                    <p className="text-[9px] text-dc-secondary font-medium truncate">{row.label}</p>
                  </div>
                  {row.days.map((day, di) => (
                    <div
                      key={di}
                      className="dc-heat-cell flex-1 h-7 flex items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: heatColor(row.trend, day.value),
                        boxShadow: day.isToday ? `0 0 0 1.5px rgba(108,99,255,0.35)` : undefined,
                      }}
                      title={`${row.label} — ${day.label}: ${day.value}`}
                    >
                      <span className="text-[7px] font-mono text-white/75 font-bold select-none">{day.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ── 10 · Symbol Intelligence ── */}
          {symbolIntel && (
            <div className="mb-5 bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow">
              <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high">
                <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Sembol Zekası</p>
              </div>
              <div className="grid grid-cols-4 divide-x divide-dc-border/30">
                {[
                  { ...symbolIntel.dominant,  title: 'Baskın Sembol',    tc: 'text-dc-text',    ring: 'ring-dc-primary/15'  },
                  { ...symbolIntel.growing,   title: 'En Hızlı Büyüyen', tc: 'text-dc-success', ring: 'ring-dc-success/15'  },
                  { ...symbolIntel.weakening, title: 'Zayıflayan',       tc: 'text-dc-error',   ring: 'ring-dc-error/15'    },
                  { ...symbolIntel.predicted, title: 'Tahmin: Bir Sonraki', tc: 'text-dc-primary', ring: 'ring-dc-primary/15' },
                ].map((item, i) => (
                  <div key={i} className="relative group flex flex-col items-center gap-2 py-6 px-4 text-center hover:bg-white/[0.025] transition-colors overflow-hidden">
                    {/* Constellation bg */}
                    <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" viewBox="0 0 100 120">
                      {[[15,20],[85,15],[50,35],[20,70],[80,80],[40,95],[65,55]].map(([x,y],j) => (
                        <circle key={j} cx={x} cy={y} r="1.5" fill="#6C63FF" />
                      ))}
                      {[[15,20,50,35],[50,35,85,15],[50,35,65,55],[65,55,80,80],[20,70,40,95]].map(([x1,y1,x2,y2],j) => (
                        <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6C63FF" strokeWidth="0.5" />
                      ))}
                    </svg>
                    <p className={`text-[7px] font-bold uppercase tracking-widest ${item.tc} relative`}>{item.title}</p>
                    <div className={`w-14 h-14 rounded-2xl ${item.ring} ring-1 flex items-center justify-center bg-dc-bg/60 relative`}>
                      <span className="text-3xl leading-none group-hover:scale-110 transition-transform duration-200">{item.emoji}</span>
                    </div>
                    <p className="text-sm font-bold text-dc-text relative">{item.name}</p>
                    <p className="text-[8px] text-dc-muted leading-relaxed relative">{item.meaning}</p>
                    <div className="w-full space-y-1 mt-1 relative">
                      <div className="flex justify-between text-[7px]">
                        <span className="text-dc-muted">Nadir.</span>
                        <span className={`font-bold ${RARITY_COLOR[item.rarity] ?? 'text-dc-muted'}`}>{item.rarity}</span>
                      </div>
                      <div className="flex justify-between text-[7px]">
                        <span className="text-dc-muted">Frekans</span>
                        <span className="font-mono font-bold text-dc-secondary">{item.frequency > 0 ? `%${item.frequency}` : '—'}</span>
                      </div>
                      <div className="flex justify-between text-[7px]">
                        <span className="text-dc-muted">Yaşam</span>
                        <span className="font-mono text-dc-secondary">{item.lifespan}</span>
                      </div>
                      <div className="flex justify-between text-[7px]">
                        <span className="text-dc-muted">Evrim →</span>
                        <span className="font-mono text-dc-primary">{item.evolution}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 11 · AI Correlation Engine ── */}
          <div className="mb-5 grid grid-cols-2 gap-5">
            {[true, false].map(isPositive => (
              <div key={String(isPositive)} className="bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow">
                <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high">
                  <p className={`text-[9px] font-bold uppercase tracking-[0.12em] ${isPositive ? 'text-dc-success' : 'text-dc-error'}`}>
                    {isPositive ? '✦ Pozitif Korelasyonlar' : '✦ Negatif Korelasyonlar'}
                  </p>
                </div>
                <div className="divide-y divide-dc-border/30">
                  {SYMBOL_CORRELATIONS.filter(c => c.positive === isPositive).map((c, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.025] transition-colors group">
                      <span className="text-[11px] font-semibold text-dc-text w-14 shrink-0">{c.emotion}</span>
                      <span className="text-dc-border text-[9px] shrink-0">↔</span>
                      <span className="text-[11px] font-semibold text-dc-secondary flex-1">{c.symbol}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-14 bg-dc-bg rounded-full h-1 overflow-hidden">
                          <AnimBar value={c.pct} color={isPositive ? '#4CAF87' : '#FF4D6D'} />
                        </div>
                        <span className={`text-[10px] font-black font-mono w-7 text-right ${isPositive ? 'text-dc-success' : 'text-dc-error'}`}>{c.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── 12 · Live Detection Feed ── */}
          <div className="mb-5 bg-dc-bg/80 border border-dc-border/50 rounded-xl overflow-hidden">
            <div className="flex items-center h-10">
              <div className="shrink-0 px-4 flex items-center gap-2 border-r border-dc-border/40 h-full">
                <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />
                <span className="text-[8px] font-bold text-dc-success uppercase tracking-widest">Live</span>
              </div>
              <div className="flex-1 overflow-hidden px-4">
                <div className="dc-tr-ticker flex whitespace-nowrap">
                  <span className="text-[9px] text-dc-secondary font-mono">{FEED_TICKER}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{FEED_TICKER}</span>
                </div>
              </div>
              <div className="shrink-0 px-4 border-l border-dc-border/40 h-full flex items-center min-w-[180px]">
                <p
                  className={`text-[8px] font-mono ${PRIORITY_FEED_COLORS[LIVE_FEED_ITEMS[feedIdx].priority]} transition-all duration-300`}
                  style={{ opacity: feedVisible ? 1 : 0, transform: feedVisible ? 'translateY(0)' : 'translateY(-3px)' }}
                >
                  {LIVE_FEED_ITEMS[feedIdx].icon} {LIVE_FEED_ITEMS[feedIdx].text}
                </p>
              </div>
            </div>
          </div>

          {/* ── 13 · AI Executive Conclusion ── */}
          {aiConclusion && (
            <div className="bg-gradient-to-br from-[rgba(108,99,255,0.05)] via-dc-surface to-[rgba(108,99,255,0.02)] border border-dc-primary/20 rounded-2xl p-6 dc-card-glow">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 rounded-xl bg-dc-primary/15 border border-dc-primary/25 flex items-center justify-center shrink-0">
                  <span className="text-sm leading-none">🎯</span>
                </div>
                <p className="text-[9px] font-bold text-dc-primary uppercase tracking-[0.12em]">Trend Intelligence Sonucu</p>
                <span className="ml-auto text-[8px] font-bold text-dc-muted font-mono">{aiConclusion.phase}</span>
              </div>

              {/* Analyst structure */}
              <div className="grid grid-cols-2 gap-6 mb-5">
                <div className="space-y-3">
                  {[
                    { label: 'DURUM',   text: aiConclusion.situation,   color: 'text-dc-primary'  },
                    { label: 'KANIT',   text: aiConclusion.evidence,    color: 'text-dc-secondary'},
                    { label: 'RİSK',    text: aiConclusion.risk,        color: 'text-dc-error'    },
                  ].map(row => (
                    <div key={row.label} className="flex items-start gap-2.5">
                      <span className={`text-[7px] font-black uppercase tracking-widest shrink-0 mt-0.5 w-10 ${row.color}`}>{row.label}</span>
                      <p className="text-[10px] text-dc-secondary leading-relaxed">{row.text}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'FIRSAT', text: aiConclusion.opportunity, color: 'text-dc-success' },
                    { label: 'SONUÇ',  text: aiConclusion.outcome,     color: 'text-dc-muted'   },
                  ].map(row => (
                    <div key={row.label} className="flex items-start gap-2.5">
                      <span className={`text-[7px] font-black uppercase tracking-widest shrink-0 mt-0.5 w-10 ${row.color}`}>{row.label}</span>
                      <p className="text-[10px] text-dc-secondary leading-relaxed">{row.text}</p>
                    </div>
                  ))}
                  <div className="flex items-start gap-2.5">
                    <span className="text-[7px] font-black uppercase tracking-widest shrink-0 mt-0.5 w-10 text-dc-warning">ÖNERİ</span>
                    <ul className="space-y-1">
                      {aiConclusion.actions.map((a, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[10px] text-dc-secondary">
                          <span className="text-dc-primary text-[9px] shrink-0">›</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-[7px] text-dc-muted/40 text-center pt-4 border-t border-dc-border/30 italic">
                Trend Intelligence Engine · AI Tahmin Sistemi · {data.totalSignals.toLocaleString()} sinyal analiz edildi
              </p>
            </div>
          )}

        </div>
      ) : null}
    </div>
  );
}
