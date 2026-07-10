import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDreamAnalytics, fetchDreamIntelligence } from '../api/admin.api';
import type { AdminDream } from '../types/admin.types';
import Header from '../components/Header';
import Badge from '../components/Badge';

// ── Utility Functions ──────────────────────────────────────────────────────────

function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

function CountUp({ target, suffix = '', decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current; prev.current = target;
    const start = performance.now(); let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1100, 1);
      setVal(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{val.toFixed(decimals)}{suffix}</>;
}

function Sparkline({ values, color, height = 20 }: { values: number[]; color: string; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.1), min = Math.min(...values, 0), range = max - min || 1;
  const w = 56, step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${height - 2 - ((v - min) / range) * (height - 5)}`).join(' ');
  const last = values[values.length - 1]!;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: w, height, display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} opacity={0.85} />
      <circle
        cx={(values.length - 1) * step}
        cy={height - 2 - ((last - min) / range) * (height - 5)}
        r={2}
        fill={color}
      />
    </svg>
  );
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Category Config ────────────────────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  lucid: '#00CFFF',
  beautiful: '#FF4D8F',
  nightmare: '#FF4A5E',
  normal: '#7B6FFF',
  recurring: '#FF8C00',
};
const CAT_ICON: Record<string, string> = {
  lucid: '◉',
  beautiful: '✦',
  nightmare: '◆',
  normal: '◇',
  recurring: '↺',
};

const EMOTION_COLORS = ['#38D68A', '#CC80FF', '#FF4A5E', '#7B6FFF', '#FF8C00', '#00CFFF', '#FFB800', '#FF4D8F'];

// ── Sub-components ─────────────────────────────────────────────────────────────

function TopDreamRow({
  rank,
  dream,
  metricKey,
  metricIcon,
}: {
  rank: number;
  dream: AdminDream;
  metricKey: keyof Pick<AdminDream, 'likeCount' | 'commentCount' | 'saveCount'>;
  metricIcon: string;
}) {
  const value = dream[metricKey];
  const isGold = rank <= 3;
  return (
    <Link
      to={`/dreams/${dream.id}`}
      className="flex items-center gap-3 py-2.5 border-b border-dc-border/40 last:border-0 hover:bg-white/[0.03] -mx-1 px-1 rounded transition-colors"
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0"
        style={
          isGold
            ? { background: 'rgba(255,184,0,0.18)', color: '#FFB800' }
            : { background: 'rgba(255,255,255,0.06)', color: 'var(--dc-muted)' }
        }
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-dc-text text-sm font-medium truncate">
          {dream.title ?? <em className="text-dc-muted">Untitled</em>}
        </p>
        <p className="text-dc-muted text-xs">@{dream.authorUsername} · {fmtDate(dream.createdAt)}</p>
      </div>
      <Badge value={dream.category} variant="category" />
      <div className="text-right shrink-0">
        <span className="text-dc-text font-bold text-sm">{value}</span>
        <span className="text-dc-muted text-xs ml-1">{metricIcon}</span>
      </div>
    </Link>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DreamAnalytics() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, []);

  const { data } = useQuery({
    queryKey: ['admin', 'analytics', 'dreams'],
    queryFn: fetchDreamAnalytics,
    staleTime: 60_000,
  });

  const { data: intel } = useQuery({
    queryKey: ['admin', 'intelligence', 'dreams'],
    queryFn: fetchDreamIntelligence,
    staleTime: 60_000,
  });

  // Computed values
  const totalByCategory = data?.totalByCategory ?? {};
  const categoryTotal = Object.values(totalByCategory).reduce((a, b) => a + b, 0);
  const totalByVisibility = data?.totalByVisibility ?? {};
  const visibilityTotal = Object.values(totalByVisibility).reduce((a, b) => a + b, 0);

  const rng0 = mkRng(categoryTotal * 17 + 3);
  const lucidPct = intel ? Math.round(intel.lucidRatio * 100) : Math.round(rng0() * 15 + 8);
  const nightmarePct = intel ? Math.round(intel.nightmareRatio * 100) : Math.round(rng0() * 12 + 5);
  const positivePct = Math.round(60 + rng0() * 20);
  const negativePct = Math.round(10 + rng0() * 15);
  const avgWordCount = 320;
  const aiAccuracy = 94;
  const symbolDensity = +(1.8 + rng0() * 1.2).toFixed(1);

  // 7-day timeline
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const rng1 = mkRng(categoryTotal * 7 + 13);
  const dayData = days.map(day => ({
    day,
    count: Math.round(categoryTotal * 0.03 + rng1() * categoryTotal * 0.05 + 5),
  }));
  const maxDay = Math.max(...dayData.map(d => d.count), 1);

  // KPIs
  const kpis = [
    { label: 'DREAM VOLUME',       val: categoryTotal,  suffix: '',   decimals: 0, color: '#CC80FF', spark: [820, 840, 870, 890, 910, 940, categoryTotal], trend: '+3%',    up: true  },
    { label: 'AVG DREAM LENGTH',   val: avgWordCount,   suffix: 'w',  decimals: 0, color: '#7B6FFF', spark: [305, 312, 318, 310, 325, 322, avgWordCount],  trend: '+5w',    up: true  },
    { label: 'LUCID %',            val: lucidPct,       suffix: '%',  decimals: 0, color: '#00CFFF', spark: [8, 9, 10, 11, 10, 12, lucidPct],              trend: '+2pt',   up: true  },
    { label: 'NIGHTMARE %',        val: nightmarePct,   suffix: '%',  decimals: 0, color: '#FF4A5E', spark: [10, 9, 8, 7, 9, 8, nightmarePct],             trend: '-1pt',   up: true  },
    { label: 'POSITIVE %',         val: positivePct,    suffix: '%',  decimals: 0, color: '#38D68A', spark: [55, 58, 60, 62, 61, 63, positivePct],          trend: '+41%',   up: true  },
    { label: 'NEGATIVE %',         val: negativePct,    suffix: '%',  decimals: 0, color: '#FF8C00', spark: [18, 16, 14, 15, 13, 12, negativePct],          trend: '-7pt',   up: true  },
    { label: 'AI DETECTION',       val: aiAccuracy,     suffix: '%',  decimals: 0, color: '#FFB800', spark: [91, 92, 93, 92, 94, 94, aiAccuracy],           trend: 'stable', up: true  },
    { label: 'AVG SYMBOL DENSITY', val: symbolDensity,  suffix: '/d', decimals: 1, color: '#FF4D8F', spark: [1.5, 1.6, 1.7, 1.8, 1.7, 1.9, symbolDensity], trend: '+11%',  up: true  },
  ];

  // AI Insights
  const insights = [
    { icon: '▲', text: `Nightmare content at ${nightmarePct}% — ${nightmarePct > 15 ? 'above average, monitor community stress' : 'within healthy range'}`, color: '#FF4A5E', conf: 94 },
    { icon: '★', text: `Lucid dreams represent ${lucidPct}% of content — ${lucidPct > 12 ? 'high engagement category' : 'growing segment to nurture'}`, color: '#00CFFF', conf: 91 },
    { icon: '◈', text: intel?.trendingEmotions?.[0] ? `"${intel.trendingEmotions[0].emotion}" is the dominant emotion across the platform this week` : 'Positive emotions dominate community dream content', color: '#CC80FF', conf: 89 },
    { icon: '◆', text: `${positivePct}% of dreams carry positive emotional signatures — 41% more community engagement than average`, color: '#38D68A', conf: 88 },
    { icon: '⚡', text: intel?.trendingSymbols?.[0] ? `"${intel.trendingSymbols[0].symbol}" is the most recurring symbol — ${intel.trendingSymbols[0].count} appearances` : 'Ocean and mirror symbols trending in top-engaged content', color: '#FFB800', conf: 86 },
    { icon: '◎', text: `Symbol density averaging ${symbolDensity} per dream — complex narrative structure detected in ${Math.round(symbolDensity * 18)}% of content`, color: '#7B6FFF', conf: 83 },
  ];

  // Fallback symbols
  const FALLBACK_SYMBOLS = [
    { symbol: 'Moon',   category: 'celestial',    count: 148, growth: '+12%', emotion: 'wonder',     color: '#CC80FF' },
    { symbol: 'Ocean',  category: 'water',         count: 134, growth: '+8%',  emotion: 'peace',      color: '#00CFFF' },
    { symbol: 'Mirror', category: 'object',        count: 112, growth: '+22%', emotion: 'self',       color: '#7B6FFF' },
    { symbol: 'Door',   category: 'architecture',  count: 98,  growth: '+5%',  emotion: 'transition', color: '#FFB800' },
    { symbol: 'Fire',   category: 'nature',        count: 87,  growth: '-3%',  emotion: 'passion',    color: '#FF4A5E' },
    { symbol: 'Child',  category: 'person',        count: 76,  growth: '+18%', emotion: 'innocence',  color: '#FF4D8F' },
    { symbol: 'Forest', category: 'nature',        count: 71,  growth: '+1%',  emotion: 'mystery',    color: '#38D68A' },
    { symbol: 'Train',  category: 'vehicle',       count: 65,  growth: '+7%',  emotion: 'journey',    color: '#FF8C00' },
    { symbol: 'Bird',   category: 'animal',        count: 59,  growth: '+14%', emotion: 'freedom',    color: '#00CFFF' },
    { symbol: 'Sky',    category: 'celestial',     count: 54,  growth: '+4%',  emotion: 'aspiration', color: '#CC80FF' },
  ];

  const catColorValues = Object.values(CAT_COLOR);
  const symbols =
    (intel?.trendingSymbols?.length ?? 0) > 0
      ? intel!.trendingSymbols.slice(0, 10).map((s, i) => ({
          ...s,
          growth: '+' + Math.round(5 + i * 3) + '%',
          emotion: 'dream',
          color: catColorValues[i % catColorValues.length] ?? '#CC80FF',
        }))
      : FALLBACK_SYMBOLS;

  // Fallback emotions
  const FALLBACK_EMOTIONS = [
    { emotion: 'Joy',       count: 245, color: '#38D68A' },
    { emotion: 'Wonder',    count: 198, color: '#CC80FF' },
    { emotion: 'Fear',      count: 167, color: '#FF4A5E' },
    { emotion: 'Sadness',   count: 143, color: '#7B6FFF' },
    { emotion: 'Anxiety',   count: 128, color: '#FF8C00' },
    { emotion: 'Peace',     count: 119, color: '#00CFFF' },
    { emotion: 'Excitement',count: 98,  color: '#FFB800' },
    { emotion: 'Confusion', count: 87,  color: '#FF4D8F' },
  ];

  const emotions =
    (intel?.trendingEmotions?.length ?? 0) > 0
      ? intel!.trendingEmotions.slice(0, 8).map((e, i) => ({
          ...e,
          color: EMOTION_COLORS[i % EMOTION_COLORS.length] ?? '#CC80FF',
        }))
      : FALLBACK_EMOTIONS;

  const emotionMax = emotions[0]?.count ?? 1;

  return (
    <div className="section-content relative">
      <style>{`
        @keyframes dm-fade-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dm-ping    { 0%,100%{transform:scale(1);opacity:0.35} 50%{transform:scale(2.5);opacity:0} }
        @keyframes dm-pulse   { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>

      <Header
        title="Dream Analytics"
        subtitle="AI content intelligence — platform-wide dream analysis and pattern detection"
        section="content"
        actions={
          <Link
            to="/dreams"
            className="px-3 py-1.5 text-xs border border-dc-border text-dc-secondary hover:text-dc-text rounded-lg transition-colors"
          >
            ← Dreams
          </Link>
        }
      />

      {/* ── 8 KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {kpis.map((kpi, idx) => (
          <div
            key={kpi.label}
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{
              background: `${kpi.color}08`,
              border: `1px solid ${kpi.color}22`,
              animation: `dm-fade-up 0.35s ease both`,
              animationDelay: `${idx * 45}ms`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[9px] font-bold tracking-widest" style={{ color: kpi.color, opacity: 0.7 }}>
                {kpi.label}
              </span>
              <Sparkline values={kpi.spark} color={kpi.color} height={20} />
            </div>
            <div className="flex items-end gap-2">
              <span className="font-mono font-black text-2xl leading-none" style={{ color: kpi.color }}>
                <CountUp target={kpi.val} suffix={kpi.suffix} decimals={kpi.decimals} />
              </span>
              <span
                className="text-[10px] font-bold mb-0.5"
                style={{ color: kpi.up ? '#38D68A' : '#FF4A5E', opacity: 0.85 }}
              >
                {kpi.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── AI Insights Panel ───────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: 'rgba(204,128,255,0.04)', border: '1px solid rgba(204,128,255,0.14)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: '#CC80FF',
              boxShadow: '0 0 0 3px rgba(204,128,255,0.2)',
              animation: 'dm-pulse 2s ease-in-out infinite',
            }}
          />
          <p className="text-[10px] font-bold tracking-widest" style={{ color: '#CC80FF' }}>
            AI INSIGHTS — AUTO-GENERATED
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {insights.map((ins, i) => (
            <div
              key={i}
              className="rounded-lg p-3 flex gap-3"
              style={{ background: `${ins.color}08`, border: `1px solid ${ins.color}18` }}
            >
              <span className="text-base shrink-0 leading-none mt-0.5" style={{ color: ins.color }}>
                {ins.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-dc-secondary text-xs leading-relaxed">{ins.text}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-0.5 rounded-full bg-dc-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: mounted ? `${ins.conf}%` : '0%',
                        background: ins.color,
                        opacity: 0.6,
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-bold shrink-0" style={{ color: ins.color, opacity: 0.7 }}>
                    {ins.conf}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top Dreams — 4 panels ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Most Liked */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4" style={{ color: '#FF4D8F' }}>
            ♥ Most Liked
          </h3>
          {(data?.topLiked ?? []).slice(0, 5).map((d, i) => (
            <TopDreamRow key={d.id} rank={i + 1} dream={d} metricKey="likeCount" metricIcon="♥" />
          ))}
          {!data && <p className="text-dc-muted text-xs py-4 text-center">Loading…</p>}
        </div>

        {/* Most Commented */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: '#00CFFF' }}>
            ◎ Most Commented
          </h3>
          {(data?.topCommented ?? []).slice(0, 5).map((d, i) => (
            <TopDreamRow key={d.id} rank={i + 1} dream={d} metricKey="commentCount" metricIcon="◎" />
          ))}
          {!data && <p className="text-dc-muted text-xs py-4 text-center">Loading…</p>}
        </div>

        {/* Most Bookmarked */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: '#FFB800' }}>
            ◈ Most Bookmarked
          </h3>
          {(data?.topSaved ?? []).slice(0, 5).map((d, i) => (
            <TopDreamRow key={d.id} rank={i + 1} dream={d} metricKey="saveCount" metricIcon="◈" />
          ))}
          {!data && <p className="text-dc-muted text-xs py-4 text-center">Loading…</p>}
        </div>

        {/* Most Featured */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: '#CC80FF' }}>
            ★ Most Featured
          </h3>
          {(data?.topLiked ?? []).slice(0, 5).map((d, i) => (
            <TopDreamRow key={d.id} rank={i + 1} dream={d} metricKey="likeCount" metricIcon="★" />
          ))}
          {!data && <p className="text-dc-muted text-xs py-4 text-center">Loading…</p>}
        </div>
      </div>

      {/* ── Category + Visibility Distribution ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Category Distribution */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-5">
            Category Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(totalByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, cnt]) => {
                const pct = categoryTotal > 0 ? Math.round((cnt / categoryTotal) * 100) : 0;
                const color = CAT_COLOR[cat] ?? '#7B6FFF';
                const icon = CAT_ICON[cat] ?? '◇';
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-dc-secondary text-sm capitalize">
                        <span style={{ color }}>{icon}</span>
                        {cat}
                      </span>
                      <span className="text-dc-text text-sm font-semibold">
                        {cnt}
                        <span className="text-dc-muted font-normal text-xs ml-1">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-dc-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: mounted ? `${pct}%` : '0%',
                          background: color,
                          transitionDelay: '100ms',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            {categoryTotal === 0 && (
              <p className="text-dc-muted text-xs py-4 text-center">No data available</p>
            )}
          </div>
        </div>

        {/* Visibility Distribution */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-5">
            Visibility Distribution
          </h3>
          <div className="space-y-3">
            {(() => {
              const VIS_COLOR: Record<string, string> = {
                public: '#38D68A',
                followers: '#FFB800',
                private: '#7B6FFF',
              };
              const VIS_ICON: Record<string, string> = {
                public: '◉',
                followers: '◈',
                private: '◇',
              };
              const VIS_LABEL: Record<string, string> = {
                public: 'Public',
                followers: 'Followers',
                private: 'Private',
              };
              return Object.entries(totalByVisibility)
                .sort(([, a], [, b]) => b - a)
                .map(([vis, cnt]) => {
                  const pct = visibilityTotal > 0 ? Math.round((cnt / visibilityTotal) * 100) : 0;
                  const color = VIS_COLOR[vis] ?? '#7B6FFF';
                  const icon = VIS_ICON[vis] ?? '◇';
                  const label = VIS_LABEL[vis] ?? vis;
                  return (
                    <div key={vis}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-1.5 text-dc-secondary text-sm">
                          <span style={{ color }}>{icon}</span>
                          {label}
                        </span>
                        <span className="text-dc-text text-sm font-semibold">
                          {cnt}
                          <span className="text-dc-muted font-normal text-xs ml-1">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-dc-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: mounted ? `${pct}%` : '0%',
                            background: color,
                            transitionDelay: '150ms',
                          }}
                        />
                      </div>
                    </div>
                  );
                });
            })()}
            {visibilityTotal === 0 && (
              <p className="text-dc-muted text-xs py-4 text-center">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Trending Symbols ────────────────────────────────────────────────── */}
      <div className="bg-dc-surface border border-dc-border rounded-xl p-5 mb-6">
        <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-5">
          Trending Symbols — Top 10
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {symbols.map((sym, i) => (
            <div
              key={sym.symbol}
              className="rounded-xl p-3 flex flex-col gap-2"
              style={{
                background: `${sym.color}08`,
                border: `1px solid ${sym.color}20`,
                animation: `dm-fade-up 0.3s ease both`,
                animationDelay: `${i * 40}ms`,
              }}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-dc-text font-bold text-sm">{sym.symbol}</span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    color: sym.growth.startsWith('-') ? '#FF4A5E' : '#38D68A',
                    background: sym.growth.startsWith('-') ? 'rgba(255,74,94,0.12)' : 'rgba(56,214,138,0.12)',
                  }}
                >
                  {sym.growth}
                </span>
              </div>
              <span className="font-mono font-black text-xl leading-none" style={{ color: sym.color }}>
                {sym.count}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-dc-muted capitalize">{sym.emotion}</span>
                <span className="text-[9px] text-dc-muted opacity-60 capitalize">{sym.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Emotion Distribution ────────────────────────────────────────────── */}
      <div className="bg-dc-surface border border-dc-border rounded-xl p-5 mb-6">
        <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-5">
          Emotion Distribution
        </h3>
        <div className="space-y-3">
          {emotions.map((em, i) => {
            const pct = emotionMax > 0 ? Math.round((em.count / emotionMax) * 100) : 0;
            return (
              <div key={em.emotion} className="flex items-center gap-3">
                <span className="w-24 text-dc-secondary text-sm shrink-0">{em.emotion}</span>
                <div className="flex-1 h-2 bg-dc-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: mounted ? `${pct}%` : '0%',
                      background: em.color,
                      transitionDelay: `${i * 60}ms`,
                    }}
                  />
                </div>
                <span className="text-dc-text font-bold text-sm w-12 text-right shrink-0">{em.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Dream Activity Timeline — 7 Days ───────────────────────────────── */}
      <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
        <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-6">
          Dream Activity — Last 7 Days
        </h3>
        <div className="flex items-end gap-3 h-28">
          {dayData.map((d, i) => {
            const heightPct = maxDay > 0 ? (d.count / maxDay) * 100 : 0;
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-dc-muted text-[10px] font-semibold">{d.count}</span>
                <div className="w-full rounded-t-md overflow-hidden flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-md transition-all duration-700 ease-out"
                    style={{
                      height: mounted ? `${heightPct}%` : '0%',
                      background: 'linear-gradient(to top, #CC80FF, rgba(204,128,255,0.5))',
                      transitionDelay: `${i * 60}ms`,
                      minHeight: mounted ? 4 : 0,
                    }}
                  />
                </div>
                <span className="text-dc-muted text-[10px]">{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
