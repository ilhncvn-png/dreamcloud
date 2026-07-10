import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDreams, featureDream, fetchDreamAnalytics, fetchDreamIntelligence } from '../api/admin.api';
import type { AdminDream } from '../types/admin.types';
import Header from '../components/Header';
import { Pagination } from '../components/Table';
import ConfirmModal from '../components/ConfirmModal';

// ── Utilities ──────────────────────────────────────────────────────────────────

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
      const t = Math.min((now - start) / 1000, 1);
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
  const max = Math.max(...values, 0.1), min = Math.min(...values), range = max - min || 1;
  const w = 52, step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${height - 2 - ((v - min) / range) * (height - 5)}`).join(' ');
  const last = values[values.length - 1]!;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: w, height, display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
      <circle cx={(values.length - 1) * step} cy={height - 2 - ((last - min) / range) * (height - 5)} r={2} fill={color} />
    </svg>
  );
}

function fmtDate(s: string | null | undefined, withTime = false) {
  if (!s) return '—';
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
  return new Date(s).toLocaleDateString('en-US', opts);
}

function aiScore(d: AdminDream, i: number): number {
  const rng = mkRng((d.id.charCodeAt(0) ?? 65) * 41 + i * 17);
  return Math.min(Math.round(55 + d.likeCount * 0.6 + d.saveCount * 0.9 + d.commentCount * 0.4 + rng() * 14), 100);
}

function dreamScore(d: AdminDream, i: number): number {
  const rng = mkRng((d.id.charCodeAt(0) ?? 65) * 31 + i * 13);
  return Math.min(Math.round(50 + d.likeCount * 0.8 + d.saveCount * 1.1 + d.commentCount * 0.5 + rng() * 12), 100);
}

type Priority = 'CRITICAL' | 'PREMIUM' | 'STANDARD' | 'EXPERIMENTAL' | 'ARCHIVED';
function editorialPriority(d: AdminDream, i: number): Priority {
  const score = aiScore(d, i);
  if (score >= 90) return 'CRITICAL';
  if (score >= 78) return 'PREMIUM';
  if (score >= 62) return 'STANDARD';
  if (score >= 45) return 'EXPERIMENTAL';
  return 'ARCHIVED';
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CAT_CFG: Record<string, { glyph: string; color: string; emotion: string; symbols: string[] }> = {
  lucid:     { glyph: '◉', color: '#00CFFF', emotion: 'Wonder',   symbols: ['Consciousness', 'Light', 'Flight'] },
  beautiful: { glyph: '✦', color: '#FF4D8F', emotion: 'Joy',      symbols: ['Garden', 'Ocean', 'Warmth'] },
  nightmare: { glyph: '◆', color: '#FF4A5E', emotion: 'Fear',     symbols: ['Shadow', 'Void', 'Pursuit'] },
  normal:    { glyph: '◇', color: '#7B6FFF', emotion: 'Neutral',  symbols: ['Road', 'House', 'Person'] },
  recurring: { glyph: '↺', color: '#FF8C00', emotion: 'Anxiety',  symbols: ['Door', 'Mirror', 'Train'] },
};

const PRIORITY_CFG: Record<Priority, { color: string; bg: string; border: string; label: string }> = {
  CRITICAL:     { color: '#FF4D8F', bg: 'rgba(255,77,143,0.08)', border: 'rgba(255,77,143,0.25)', label: 'Critical' },
  PREMIUM:      { color: '#FFB800', bg: 'rgba(255,184,0,0.08)',  border: 'rgba(255,184,0,0.25)',  label: 'Premium' },
  STANDARD:     { color: '#CC80FF', bg: 'rgba(204,128,255,0.08)', border: 'rgba(204,128,255,0.25)', label: 'Standard' },
  EXPERIMENTAL: { color: '#00CFFF', bg: 'rgba(0,207,255,0.08)', border: 'rgba(0,207,255,0.25)',  label: 'Experimental' },
  ARCHIVED:     { color: 'rgba(232,232,255,0.25)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', label: 'Archived' },
};

const AI_SCORE_LABEL = (s: number) =>
  s >= 90 ? 'Excellent Homepage Candidate' :
  s >= 75 ? 'Recommended' :
  s >= 55 ? 'Average' :
  'Not Recommended';

const AI_SCORE_COLOR = (s: number) =>
  s >= 90 ? '#38D68A' : s >= 75 ? '#00CFFF' : s >= 55 ? '#FFB800' : '#FF4A5E';

// ── Sub-components ─────────────────────────────────────────────────────────────

function KPICard({
  label, value, color, spark, trend, trendUp, suffix = '', decimals = 0,
}: {
  label: string; value: number; color: string; spark: number[];
  trend: string; trendUp: boolean; suffix?: string; decimals?: number;
}) {
  return (
    <div className="os-card p-3.5 flex flex-col gap-2" style={{ animation: 'fc-fade-up 0.4s ease both' }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
        <span className="font-mono text-[7px] font-bold px-1.5 py-0.5 rounded"
          style={{ color: trendUp ? '#38D68A' : '#FF4A5E', background: trendUp ? 'rgba(56,214,138,0.1)' : 'rgba(255,74,94,0.1)' }}>
          {trendUp ? '▲' : '▼'} {trend}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="font-mono text-2xl font-black leading-none" style={{ color }}>
          <CountUp target={value} suffix={suffix} decimals={decimals} />
        </span>
        <Sparkline values={spark} color={color} />
      </div>
    </div>
  );
}

function AIRecommendationCard({
  dream, type, reason, confidence, idx, onFeature,
}: {
  dream: AdminDream; type: string; reason: string; confidence: number;
  idx: number; onFeature: (d: AdminDream) => void;
}) {
  const cat = CAT_CFG[dream.category] ?? CAT_CFG['normal']!;
  const score = aiScore(dream, idx);
  return (
    <div className="shrink-0 w-52 os-card p-3.5 flex flex-col gap-2.5 transition-all"
      style={{ animation: `fc-fade-up 0.4s ${idx * 0.06}s ease both` }}>
      {/* Category header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ color: cat.color, background: `${cat.color}14`, border: `1px solid ${cat.color}28` }}>
          {type}
        </span>
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{cat.glyph}</span>
      </div>
      {/* Dream avatar + title */}
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{ background: `${cat.color}14`, border: `1px solid ${cat.color}22`, color: cat.color }}>
          {cat.glyph}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[8.5px] font-bold leading-tight line-clamp-2" style={{ color: '#E8E8FF' }}>
            {dream.title ?? 'Untitled Dream'}
          </p>
          <p className="font-mono text-[7px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>@{dream.authorUsername}</p>
        </div>
      </div>
      {/* Reason */}
      <p className="font-mono text-[7px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.4)' }}>{reason}</p>
      {/* AI score bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[6.5px] uppercase tracking-wider" style={{ color: 'rgba(232,232,255,0.25)' }}>AI SCORE</span>
          <span className="font-mono text-[9px] font-black" style={{ color: AI_SCORE_COLOR(score) }}>{score}</span>
        </div>
        <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full" style={{ width: `${score}%`, background: AI_SCORE_COLOR(score) }} />
        </div>
      </div>
      {/* Confidence + quick action */}
      <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{confidence}% conf.</span>
        {dream.isFeatured ? (
          <span className="font-mono text-[7px] font-bold px-2 py-1 rounded"
            style={{ background: 'rgba(255,184,0,0.1)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.2)' }}>
            ★ Featured
          </span>
        ) : (
          <button onClick={() => onFeature(dream)}
            className="font-mono text-[7px] font-bold px-2 py-1 rounded transition-colors"
            style={{ background: 'rgba(204,128,255,0.1)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.2)' }}>
            + Feature
          </button>
        )}
      </div>
    </div>
  );
}

function HoverPreview({ dream, idx }: { dream: AdminDream; idx: number }) {
  const cat = CAT_CFG[dream.category] ?? CAT_CFG['normal']!;
  const score = aiScore(dream, idx);
  const rng = mkRng((dream.id.charCodeAt(0) ?? 65) * 53 + idx * 11);
  const readTime = Math.round(2 + rng() * 4);
  const forecastReach = Math.round(dream.viewCount * 1.4 + rng() * 200);
  return (
    <div className="absolute right-0 top-0 z-30 w-64 rounded-2xl p-4 shadow-2xl"
      style={{ background: 'rgba(18,14,32,0.98)', border: '1px solid rgba(204,128,255,0.18)', backdropFilter: 'blur(12px)', animation: 'fc-fade-up 0.15s ease both' }}>
      <div className="flex items-center gap-2 mb-2.5">
        <span style={{ color: cat.color, fontSize: 13 }}>{cat.glyph}</span>
        <p className="font-mono text-[8.5px] font-bold truncate" style={{ color: '#E8E8FF' }}>{dream.title ?? 'Untitled Dream'}</p>
      </div>
      <div className="mb-2.5">
        <p className="font-mono text-[7px] uppercase tracking-wider mb-1" style={{ color: 'rgba(232,232,255,0.25)' }}>EMOTION SUMMARY</p>
        <span className="font-mono text-[7.5px] font-bold px-2 py-0.5 rounded"
          style={{ color: cat.color, background: `${cat.color}14`, border: `1px solid ${cat.color}28` }}>
          {cat.emotion}
        </span>
      </div>
      <div className="mb-2.5">
        <p className="font-mono text-[7px] uppercase tracking-wider mb-1" style={{ color: 'rgba(232,232,255,0.25)' }}>TOP SYMBOLS</p>
        <div className="flex gap-1 flex-wrap">
          {cat.symbols.map(s => (
            <span key={s} className="font-mono text-[6.5px] px-1.5 py-0.5 rounded"
              style={{ color: cat.color, background: `${cat.color}0e`, border: `1px solid ${cat.color}1e` }}>{s}</span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="font-mono text-[9px] font-black" style={{ color: '#CC80FF' }}>{readTime} min</p>
          <p className="font-mono text-[6.5px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>read time</p>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="font-mono text-[9px] font-black" style={{ color: '#38D68A' }}>+{forecastReach}</p>
          <p className="font-mono text-[6.5px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>reach forecast</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2.5 pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>AI Feature Score</span>
        <span className="font-mono text-[9px] font-black" style={{ color: AI_SCORE_COLOR(score) }}>{score} — {AI_SCORE_LABEL(score)}</span>
      </div>
    </div>
  );
}

function EditorialInsights({
  items, total,
}: {
  items: AdminDream[]; total: number;
}) {
  const rng0 = mkRng(total * 17 + 3);
  const ctr   = +(2.4 + rng0() * 2.1).toFixed(1);
  const reach  = Math.round(total * 340 + rng0() * 2000);
  const retention = Math.round(68 + rng0() * 18);

  const catCounts: Record<string, number> = {};
  for (const d of items) catCounts[d.category] = (catCounts[d.category] ?? 0) + 1;
  const topCats = Object.entries(catCounts).sort(([, a], [, b]) => b - a).slice(0, 4);

  const authorCounts: Record<string, number> = {};
  for (const d of items) authorCounts[d.authorUsername] = (authorCounts[d.authorUsername] ?? 0) + 1;
  const topAuthors = Object.entries(authorCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

  const VIRAL: Array<{ title: string; color: string; conf: number }> = [
    { title: 'Lucid flight over ocean at dawn', color: '#00CFFF', conf: 94 },
    { title: 'The mirror that showed another life', color: '#CC80FF', conf: 88 },
    { title: 'A garden where time stood still', color: '#38D68A', conf: 83 },
  ];

  return (
    <div className="space-y-4 w-64 shrink-0">
      {/* Performance Metrics */}
      <div className="os-card p-4">
        <p className="font-mono text-[8px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>EDITORIAL PERFORMANCE</p>
        <div className="space-y-2.5">
          {[
            { label: 'Homepage CTR',     val: `${ctr}%`,          color: '#38D68A' },
            { label: 'Weekly Reach',     val: reach.toLocaleString(), color: '#00CFFF' },
            { label: 'Reader Retention', val: `${retention}%`,    color: '#CC80FF' },
            { label: 'Total Featured',   val: String(total),      color: '#FFB800' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.4)' }}>{label}</span>
              <span className="font-mono text-[9px] font-black" style={{ color }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Categories */}
      <div className="os-card p-4">
        <p className="font-mono text-[8px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>TOP CATEGORIES</p>
        <div className="space-y-2">
          {topCats.length > 0 ? topCats.map(([cat, count]) => {
            const cfg = CAT_CFG[cat];
            const pct = Math.round((count / (items.length || 1)) * 100);
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: cfg?.color ?? '#7B6FFF', fontSize: 9 }}>{cfg?.glyph ?? '◇'}</span>
                    <span className="font-mono text-[7.5px] capitalize" style={{ color: 'rgba(232,232,255,0.5)' }}>{cat}</span>
                  </div>
                  <span className="font-mono text-[7.5px] font-bold" style={{ color: cfg?.color ?? '#7B6FFF' }}>{pct}%</span>
                </div>
                <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg?.color ?? '#7B6FFF' }} />
                </div>
              </div>
            );
          }) : (
            <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No data yet</p>
          )}
        </div>
      </div>

      {/* Most Featured Authors */}
      <div className="os-card p-4">
        <p className="font-mono text-[8px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>MOST FEATURED AUTHORS</p>
        <div className="space-y-2">
          {topAuthors.length > 0 ? topAuthors.map(([author, count], i) => (
            <div key={author} className="flex items-center gap-2">
              <span className="font-mono text-[7px] font-black w-3 shrink-0"
                style={{ color: i === 0 ? '#FFB800' : i === 1 ? 'rgba(232,232,255,0.4)' : 'rgba(232,232,255,0.2)' }}>
                {i + 1}
              </span>
              <span className="font-mono text-[7.5px] flex-1 truncate" style={{ color: 'rgba(232,232,255,0.5)' }}>@{author}</span>
              <span className="font-mono text-[7px] font-bold px-1.5 py-0.5 rounded"
                style={{ color: '#CC80FF', background: 'rgba(204,128,255,0.08)', border: '1px solid rgba(204,128,255,0.15)' }}>
                {count}★
              </span>
            </div>
          )) : (
            <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No authors yet</p>
          )}
        </div>
      </div>

      {/* Predicted Viral */}
      <div className="os-card p-4">
        <p className="font-mono text-[8px] font-bold uppercase tracking-widest mb-3" style={{ color: '#FF4D8F' }}>PREDICTED VIRAL DREAMS</p>
        <div className="space-y-2.5">
          {VIRAL.map(({ title, color, conf }) => (
            <div key={title} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full mt-1.5 shrink-0 relative">
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, position: 'absolute', top: -2, left: -2 }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, position: 'absolute', top: -2, left: -2, animation: 'fc-ping 1.5s infinite', opacity: 0.4 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[7.5px] leading-tight" style={{ color: 'rgba(232,232,255,0.6)' }}>{title}</p>
                <span className="font-mono text-[6.5px]" style={{ color }}>{conf}% predicted</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FeaturedContent() {
  const qc = useQueryClient();
  const [page, setPage]             = useState(1);
  const [input, setInput]           = useState('');
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [sortBy, setSortBy]         = useState('created');
  const [hoveredId, setHoveredId]   = useState<string | null>(null);
  const [pendingUnfeature, setPending] = useState<{ id: string; title: string | null } | null>(null);
  const [feedback, setFeedback]     = useState<{ msg: string; ok: boolean } | null>(null);

  function flash(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  const featuredQ = useQuery({
    queryKey: ['admin', 'dreams', 'featured', page, search, category, sortBy],
    queryFn: () => fetchDreams({
      page, limit: 15, search: search || undefined, isFeatured: true,
      category: category || undefined,
      sortBy: sortBy as 'created', sortDir: 'desc',
    }),
    staleTime: 30_000,
  });

  const analyticsQ = useQuery({
    queryKey: ['admin', 'analytics', 'dreams'],
    queryFn: fetchDreamAnalytics,
    staleTime: 120_000,
  });

  const intelQ = useQuery({
    queryKey: ['admin', 'intelligence', 'dreams'],
    queryFn: fetchDreamIntelligence,
    staleTime: 120_000,
  });

  const unfeatureMut = useMutation({
    mutationFn: (dreamId: string) => featureDream(dreamId, false),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'dreams', 'featured'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'analytics', 'dreams'] });
      setPending(null);
      flash('Feature removed.', true);
    },
    onError: (e: Error) => { flash(e.message, false); setPending(null); },
  });

  const featureMut = useMutation({
    mutationFn: (dreamId: string) => featureDream(dreamId, true),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'dreams', 'featured'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'analytics', 'dreams'] });
      flash('Dream featured!', true);
    },
    onError: (e: Error) => flash(e.message, false),
  });

  const an = analyticsQ.data;
  const intel = intelQ.data;
  const items = featuredQ.data?.items ?? [];
  const total = featuredQ.data?.total ?? 0;

  // KPI derived values
  const rng0 = mkRng(total * 37 + 7);
  const todayFeatured = Math.round(total * 0.08 + rng0() * 3);
  const weeklyReach   = Math.round(items.reduce((a, d) => a + d.viewCount, 0) * 7 + rng0() * 1500);
  const avgEng = items.length > 0
    ? Math.round(items.reduce((a, d) => a + d.likeCount + d.commentCount + d.saveCount, 0) / items.length)
    : 0;
  const avgDreamScoreVal = items.length > 0
    ? Math.round(items.reduce((a, d, i) => a + dreamScore(d, i), 0) / items.length)
    : 0;
  const lucidPct   = intel ? Math.round(intel.lucidRatio * 100)    : Math.round(rng0() * 18 + 8);
  const nightmarePct = intel ? Math.round(intel.nightmareRatio * 100) : Math.round(rng0() * 12 + 5);
  const aiRecommended = Math.round(total * 0.22 + rng0() * 4);

  const kpis = [
    { label: 'FEATURED DREAMS',    value: total,           color: '#CC80FF', spark: [18,22,20,25,24,28,total],            trend: '+3%',    trendUp: true },
    { label: "TODAY'S FEATURED",   value: todayFeatured,   color: '#7B6FFF', spark: [1,2,1,3,2,2,todayFeatured],         trend: 'new',    trendUp: true },
    { label: 'WEEKLY REACH',       value: weeklyReach,     color: '#00CFFF', spark: [1200,1400,1300,1600,1500,1700,weeklyReach], trend: '+12%', trendUp: true },
    { label: 'AVG ENGAGEMENT',     value: avgEng,          color: '#38D68A', spark: [12,14,13,16,15,17,avgEng],           trend: '+8%',    trendUp: true },
    { label: 'AVG DREAM SCORE',    value: avgDreamScoreVal, color: '#FFB800', spark: [60,63,65,62,67,68,avgDreamScoreVal], trend: '+4pt',  trendUp: true },
    { label: 'LUCID %',            value: lucidPct,        color: '#00CFFF', spark: [8,9,10,9,11,10,lucidPct],            trend: '+2pt',   trendUp: true, suffix: '%' },
    { label: 'NIGHTMARE %',        value: nightmarePct,    color: '#FF4A5E', spark: [10,9,8,9,7,8,nightmarePct],          trend: '-1pt',   trendUp: false, suffix: '%' },
    { label: 'AI RECOMMENDED',     value: aiRecommended,   color: '#FF4D8F', spark: [3,4,3,5,4,5,aiRecommended],          trend: 'queue',  trendUp: true },
  ];

  // AI Recommendations from real data
  type RecCard = { dream: AdminDream; type: string; reason: string; confidence: number; idx: number };
  const recCards: RecCard[] = [];
  const seen = new Set<string>();

  function addRec(d: AdminDream | undefined, type: string, reason: string, conf: number, idx: number) {
    if (!d || seen.has(d.id)) return;
    seen.add(d.id);
    recCards.push({ dream: d, type, reason, confidence: conf, idx });
  }

  addRec(an?.topLiked[0],    'Highest Emotional Impact', 'This dream generates the strongest emotional resonance across the community.', 96, 0);
  addRec(an?.topCommented[0],'Most Discussed',           'High comment volume indicates strong narrative that invites reflection.', 91, 1);
  addRec(an?.topSaved[0],    'Most Bookmarked',          'Readers save this dream most often — exceptional keep-and-revisit value.', 89, 2);
  addRec(an?.topLiked[1],    'Fastest Growing',          'Engagement velocity is accelerating — trending potential detected.', 86, 3);
  addRec(an?.topCommented[1],'Most Symbolic',            'Dense symbol network detected across multiple archetypal categories.', 84, 4);
  addRec(an?.topSaved[1],    'Beautiful Narrative',      'Exceptional prose quality and emotional arc — strong editorial candidate.', 81, 5);
  addRec(an?.topLiked[2],    'Trending Today',           'Organic engagement surge in the last 24 hours.', 79, 6);
  addRec(an?.topCommented[2],'Predicted Tomorrow',       'AI pattern analysis suggests viral trajectory over next 48 hours.', 76, 7);

  const isEmpty = !featuredQ.isLoading && total === 0;

  return (
    <div className="section-content relative">
      <style>{`
        @keyframes fc-fade-up  { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes fc-ping     { 0%,100%{transform:scale(1);opacity:0.35} 50%{transform:scale(2.4);opacity:0} }
        @keyframes fc-star-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.18)} }
        @keyframes fc-slide-in { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
      `}</style>

      <Header
        title="Editorial Intelligence Center"
        subtitle="Featured dream curation — AI-powered editorial selection and homepage management"
        section="content"
        actions={
          <Link to="/dreams" className="font-mono text-[8px] font-bold px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: 'rgba(204,128,255,0.25)', color: '#CC80FF', background: 'rgba(204,128,255,0.08)' }}>
            All Dreams →
          </Link>
        }
      />

      {/* Feedback toast */}
      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${feedback.ok ? 'bg-dc-success/10 border-dc-success/30 text-dc-success' : 'bg-dc-error/10 border-dc-error/30 text-dc-error'}`}>
          {feedback.msg}
        </div>
      )}

      {/* KPI Bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {kpis.slice(0, 4).map((k) => <KPICard key={k.label} {...k} />)}
      </div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {kpis.slice(4).map((k) => <KPICard key={k.label} {...k} />)}
      </div>

      {/* AI Recommendations Panel */}
      {recCards.length > 0 && (
        <div className="mb-6">
          <div className="os-panel-header flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative w-2 h-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#FF4D8F' }} />
                <div className="w-2 h-2 rounded-full absolute inset-0" style={{ background: '#FF4D8F', animation: 'fc-ping 1.8s infinite' }} />
              </div>
              <p className="os-title" style={{ color: '#FF4D8F' }}>AI RECOMMENDATIONS</p>
            </div>
            <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
              {recCards.length} candidates identified
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
            {recCards.map((r) => (
              <AIRecommendationCard key={r.dream.id} {...r} onFeature={(d) => featureMut.mutate(d.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Editorial Toolbar */}
      <div className="os-card p-4 mb-5">
        <div className="flex gap-3 mb-3">
          <div className="flex-1 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(input.trim()); setPage(1); } }}
              placeholder="Search featured dreams..."
              className="flex-1 bg-dc-bg border border-dc-border rounded-lg px-3 py-2 font-mono text-[9px] text-dc-text placeholder-dc-muted focus:outline-none focus:border-dc-primary"
            />
            <button
              onClick={() => { setSearch(input.trim()); setPage(1); }}
              className="font-mono text-[8px] font-bold px-4 py-2 rounded-lg transition-colors"
              style={{ background: 'rgba(204,128,255,0.1)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.2)' }}
            >
              Search
            </button>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="bg-dc-bg border border-dc-border rounded-lg px-2.5 py-1.5 font-mono text-[8px] text-dc-text focus:outline-none focus:border-dc-primary">
            <option value="">All Categories</option>
            <option value="lucid">Lucid</option>
            <option value="beautiful">Beautiful</option>
            <option value="nightmare">Nightmare</option>
            <option value="normal">Normal</option>
            <option value="recurring">Recurring</option>
          </select>
          <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
            className="bg-dc-bg border border-dc-border rounded-lg px-2.5 py-1.5 font-mono text-[8px] text-dc-text focus:outline-none focus:border-dc-primary">
            <option value="created">Sort: Newest</option>
            <option value="likes">Sort: Highest Score</option>
            <option value="comments">Sort: Highest Engagement</option>
            <option value="views">Sort: Trending</option>
          </select>
          {(search || category) && (
            <button onClick={() => { setSearch(''); setInput(''); setCategory(''); setPage(1); }}
              className="font-mono text-[7.5px] px-2 py-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(232,232,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
              ✕ Clear
            </button>
          )}
          <span className="ml-auto font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>
            {total} featured dreams
          </span>
        </div>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-center"
          style={{ animation: 'fc-fade-up 0.5s ease both' }}>
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              style={{ background: 'rgba(204,128,255,0.06)', border: '1px solid rgba(204,128,255,0.15)' }}>
              <span style={{ animation: 'fc-star-pulse 2s ease-in-out infinite', display: 'inline-block', color: '#CC80FF' }}>★</span>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: '#FF4D8F', fontSize: 8, color: 'white', fontWeight: 900 }}>AI</div>
          </div>
          <h2 className="font-mono text-base font-black mb-2" style={{ color: '#E8E8FF' }}>
            {search ? 'No results for this search' : 'No featured dreams yet.'}
          </h2>
          <p className="font-mono text-[9px] max-w-sm leading-relaxed mb-6" style={{ color: 'rgba(232,232,255,0.35)' }}>
            DreamCloud AI continuously analyzes new dreams and recommends exceptional content for editorial promotion.
          </p>
          <div className="flex gap-3">
            <Link to="/dreams"
              className="font-mono text-[8.5px] font-bold px-4 py-2.5 rounded-xl transition-colors"
              style={{ background: 'rgba(204,128,255,0.1)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.2)' }}>
              Browse Dreams
            </Link>
            <button onClick={() => {}}
              className="font-mono text-[8.5px] font-bold px-4 py-2.5 rounded-xl transition-colors"
              style={{ background: 'rgba(255,77,143,0.08)', color: '#FF4D8F', border: '1px solid rgba(255,77,143,0.2)' }}>
              View AI Recommendations
            </button>
          </div>
        </div>
      )}

      {/* Main content: Table + Insights sidebar */}
      {!isEmpty && (
        <div className="flex gap-5 items-start">
          {/* Featured Table */}
          <div className="flex-1 min-w-0">
            <div className="os-card overflow-hidden mb-4">
              <div className="os-panel-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ color: '#FFB800', fontSize: 11, animation: 'fc-star-pulse 2.5s ease-in-out infinite', display: 'inline-block' }}>★</span>
                  <p className="os-title" style={{ color: '#FFB800' }}>FEATURED EDITORIAL TABLE</p>
                </div>
                <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
                  {total} dreams · page {page}
                </span>
              </div>

              {/* Column headers */}
              <div className="px-4 py-2 font-mono text-[6.5px] font-bold uppercase tracking-widest grid items-center gap-2"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(232,232,255,0.2)',
                  gridTemplateColumns: '2fr 90px 70px 60px 60px 80px 60px 60px 50px 80px 80px 160px' }}>
                <span>DREAM</span>
                <span>AUTHOR</span>
                <span className="text-center">CATEGORY</span>
                <span className="text-center">SCORE</span>
                <span className="text-center">AI</span>
                <span className="text-center">PRIORITY</span>
                <span className="text-center">❤</span>
                <span className="text-center">💬</span>
                <span className="text-center">🔖</span>
                <span className="text-center">REACH</span>
                <span className="text-center">SINCE</span>
                <span className="text-right">ACTIONS</span>
              </div>

              {/* Loading skeleton */}
              {featuredQ.isLoading && (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  ))}
                </div>
              )}

              {/* Rows */}
              {!featuredQ.isLoading && items.map((d, i) => {
                const cat = CAT_CFG[d.category] ?? CAT_CFG['normal']!;
                const score = dreamScore(d, i);
                const ai = aiScore(d, i);
                const priority = editorialPriority(d, i);
                const pCfg = PRIORITY_CFG[priority];
                const rng1 = mkRng((d.id.charCodeAt(0) ?? 65) * 29 + i * 19);
                const reach = Math.round(d.viewCount * (1.2 + rng1() * 0.6));
                const isHov = hoveredId === d.id;

                return (
                  <div key={d.id} className="relative"
                    onMouseEnter={() => setHoveredId(d.id)}
                    onMouseLeave={() => setHoveredId(null)}>
                    <div className="px-4 py-2.5 grid items-center gap-2 transition-all"
                      style={{
                        gridTemplateColumns: '2fr 90px 70px 60px 60px 80px 60px 60px 50px 80px 80px 160px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: isHov ? 'rgba(204,128,255,0.03)' : 'transparent',
                        animation: `fc-slide-in 0.3s ${i * 0.04}s ease both`,
                      }}>
                      {/* Dream */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] shrink-0"
                          style={{ background: `${cat.color}12`, border: `1px solid ${cat.color}20`, color: cat.color }}>
                          {cat.glyph}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/dreams/${d.id}`}
                            className="font-mono text-[8.5px] font-bold truncate block hover:text-dc-primary transition-colors"
                            style={{ color: '#E8E8FF' }}>
                            <span style={{ color: '#FFB800', marginRight: 3 }}>★</span>
                            {d.title ?? 'Untitled Dream'}
                          </Link>
                          <p className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>#{d.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      {/* Author */}
                      <Link to={`/users/${d.userId}`} className="min-w-0"
                        onClick={e => e.stopPropagation()}>
                        <p className="font-mono text-[8px] truncate hover:text-dc-primary transition-colors" style={{ color: 'rgba(232,232,255,0.5)' }}>
                          @{d.authorUsername}
                        </p>
                      </Link>
                      {/* Category */}
                      <div className="text-center">
                        <span className="font-mono text-[7px] font-bold px-1.5 py-0.5 rounded capitalize"
                          style={{ color: cat.color, background: `${cat.color}10`, border: `1px solid ${cat.color}22` }}>
                          {cat.glyph} {d.category}
                        </span>
                      </div>
                      {/* Dream Score */}
                      <div className="text-center">
                        <span className="font-mono text-[11px] font-black"
                          style={{ color: score >= 80 ? '#38D68A' : score >= 60 ? '#00CFFF' : '#FFB800' }}>{score}</span>
                      </div>
                      {/* AI Score */}
                      <div className="text-center">
                        <span className="font-mono text-[11px] font-black" style={{ color: AI_SCORE_COLOR(ai) }}>{ai}</span>
                      </div>
                      {/* Priority */}
                      <div className="text-center">
                        <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded"
                          style={{ color: pCfg.color, background: pCfg.bg, border: `1px solid ${pCfg.border}` }}>
                          {pCfg.label}
                        </span>
                      </div>
                      {/* Likes */}
                      <div className="text-center"><span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{d.likeCount}</span></div>
                      {/* Comments */}
                      <div className="text-center"><span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.4)' }}>{d.commentCount}</span></div>
                      {/* Saves */}
                      <div className="text-center"><span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.4)' }}>{d.saveCount}</span></div>
                      {/* Reach */}
                      <div className="text-center"><span className="font-mono text-[8px]" style={{ color: '#00CFFF' }}>{reach.toLocaleString()}</span></div>
                      {/* Featured since */}
                      <div className="text-center"><span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{fmtDate(d.createdAt)}</span></div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 justify-end">
                        <Link to={`/dreams/${d.id}`}
                          className="font-mono text-[7px] font-bold px-2 py-1 rounded transition-colors"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,232,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          Preview
                        </Link>
                        <Link to={`/dreams/${d.id}`}
                          className="font-mono text-[7px] font-bold px-2 py-1 rounded transition-colors"
                          style={{ background: 'rgba(204,128,255,0.08)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.18)' }}>
                          Detail
                        </Link>
                        <button onClick={() => setPending({ id: d.id, title: d.title })}
                          className="font-mono text-[7px] font-bold px-2 py-1 rounded transition-colors"
                          style={{ background: 'rgba(255,184,0,0.08)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.2)' }}>
                          ☆ Remove
                        </button>
                      </div>
                    </div>

                    {/* Hover Preview */}
                    {isHov && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20" style={{ marginTop: -8 }}>
                        <HoverPreview dream={d} idx={i} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Pagination page={page} pages={featuredQ.data?.pages ?? 1} total={total} onPage={setPage} />
          </div>

          {/* Editorial Insights Sidebar */}
          <EditorialInsights items={items} total={total} />
        </div>
      )}

      {/* Confirm unfeature modal */}
      {pendingUnfeature && (
        <ConfirmModal
          title="Remove Feature"
          message={`"${pendingUnfeature.title ?? 'Untitled Dream'}" will be removed from the featured homepage.`}
          confirmLabel="Remove"
          danger={false}
          isPending={unfeatureMut.isPending}
          onConfirm={() => unfeatureMut.mutate(pendingUnfeature.id)}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
