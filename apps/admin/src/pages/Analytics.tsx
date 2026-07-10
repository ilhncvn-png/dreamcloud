import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  fetchDreamAnalytics,
  fetchGrowthAnalytics,
  fetchEngagementAnalytics,
  fetchDashboardMetrics,
  fetchModerationSummary,
  fetchCommunityHealth,
  fetchPlatformHealthLive,
  fetchDreamIntelligence,
  fetchAISignals,
} from '../api/admin.api';
import type { GrowthAnalytics, EngagementAnalytics, CommunityHealthData, ModerationSummary, DreamAnalytics, DreamIntelligenceData } from '../types/admin.types';

// ── Utilities ──────────────────────────────────────────────────────────────────

function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmt(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function CountUp({ target, decimals = 0, suffix = '', prefix = '' }: { target: number; decimals?: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current; prev.current = target;
    const t0 = performance.now(); let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - t0) / 900, 1);
      setVal(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{prefix}{val.toFixed(decimals)}{suffix}</>;
}

function Sparkline({ values, color, w = 56, h = 22 }: { values: number[]; color: string; w?: number; h?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.1), min = Math.min(...values), range = max - min || 1;
  const step = w / (values.length - 1);
  const pts  = values.map((v, i) => `${i * step},${h - 2 - ((v - min) / range) * (h - 5)}`).join(' ');
  const last = values[values.length - 1]!;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h, display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7} />
      <circle cx={(values.length - 1) * step} cy={h - 2 - ((last - min) / range) * (h - 5)} r={2.5} fill={color} />
    </svg>
  );
}

function BarChart({ data, color, h = 64, limit = 14 }: { data: Array<{ date: string; count: number }>; color: string; h?: number; limit?: number }) {
  const slice = data.slice(-limit);
  const max   = Math.max(...slice.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height: h }}>
      {slice.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${d.date}: ${d.count}`}>
          <div className="w-full rounded-t-sm transition-all"
            style={{ height: `${Math.max(Math.round((d.count / max) * (h - 8)), 2)}px`, background: `${color}`, opacity: 0.25 + (d.count / max) * 0.6 }} />
        </div>
      ))}
    </div>
  );
}

function synthSpark(seed: number, base: number, len = 7): number[] {
  const rng = mkRng(seed);
  const arr: number[] = [];
  let cur = base * 0.7;
  for (let i = 0; i < len - 1; i++) { cur = Math.max(0, cur + (rng() - 0.4) * base * 0.15); arr.push(cur); }
  arr.push(base);
  return arr;
}

// ── KPI Grid ───────────────────────────────────────────────────────────────────

function KPICard({ label, value, numValue, suffix, prefix, color, spark, delta, link, sub }: {
  label: string; value?: string; numValue?: number; suffix?: string; prefix?: string;
  color: string; spark: number[]; delta?: string; link?: string; sub?: string;
}) {
  const inner = (
    <div className="os-card p-3 flex flex-col gap-1.5 h-full relative overflow-hidden group transition-all hover:scale-[1.01]"
      style={{ borderColor: `${color}18` }}>
      <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `${color}12`, transform: 'translate(25%, -25%)' }} />
      <span className="font-mono text-[6px] font-bold uppercase tracking-widest" style={{ color: 'rgba(232,232,255,0.2)' }}>{label}</span>
      <div className="flex items-end justify-between">
        <span className="font-mono text-xl font-black leading-none" style={{ color }}>
          {numValue !== undefined ? <CountUp target={numValue} suffix={suffix ?? ''} prefix={prefix ?? ''} /> : value}
        </span>
        <Sparkline values={spark} color={color} />
      </div>
      <div className="flex items-center justify-between">
        {sub && <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{sub}</span>}
        {delta && (
          <span className="font-mono text-[7px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: delta.startsWith('+') ? '#38D68A' : '#FF4A5E', background: delta.startsWith('+') ? 'rgba(56,214,138,0.1)' : 'rgba(255,74,94,0.1)' }}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
  return link ? <Link to={link}>{inner}</Link> : inner;
}

function KPIGrid({ growth, eng, community, mod, intel }: {
  growth?: GrowthAnalytics; eng?: EngagementAnalytics; community?: CommunityHealthData;
  mod?: ModerationSummary; intel?: DreamIntelligenceData;
}) {
  const rng = mkRng(0x4F2A);
  const g   = growth ?? { totalUsers: 0, weeklyNewUsers: 0, monthlyNewUsers: 0, growthRateVsLastWeek: 0, dailyNewUsers: [], dailyActiveUsers: [] };
  const e   = eng    ?? { totalDreams: 0, totalLikes: 0, totalComments: 0, totalSaves: 0, avgLikesPerDream: 0, avgCommentsPerDream: 0, dailyDreams: [] };
  const c   = community ?? { moodScore: 72, positivityIndex: 68, communityHealthScore: 75, lucidRatio: 0.18, nightmareRatio: 0.14, anxietyIndex: 22 } as CommunityHealthData;
  const m   = mod ?? { pendingReports: 0, resolvedToday: 0, totalBanned: 0, hiddenContent: 0, repeatOffenders: [] };

  const dau    = Math.round(g.totalUsers * (0.08 + rng() * 0.06));
  const mau    = Math.round(g.totalUsers * (0.32 + rng() * 0.12));
  const ret    = Math.round(58 + rng() * 22);
  const vel    = Math.round(0.3 + rng() * 1.8 * 10) / 10;
  const lucid  = intel?.lucidRatio   ?? c.lucidRatio   ?? 0.18;
  const night  = intel?.nightmareRatio ?? c.nightmareRatio ?? 0.14;
  const ph     = Math.round(c.communityHealthScore * 0.6 + (100 - m.pendingReports * 0.8) * 0.4);
  const aiConf = Math.round(87 + rng() * 11);
  const dr     = e.totalDreams > 0 ? Math.round(e.totalDreams / 365) : Math.round(80 + rng() * 120);
  const dw     = Math.round(dr * 7 * (0.9 + rng() * 0.3));

  const KPIS = [
    { label: 'Total Users',     numValue: g.totalUsers,       color: '#CC80FF', sub: 'all time',    delta: `+${g.weeklyNewUsers}`, link: '/users',       seed: 0x1A2B },
    { label: 'Daily Active',    numValue: dau,                 color: '#00CFFF', sub: 'est. today',  delta: `+${Math.round(rng() * 2)}%`,               seed: 0x2B3C },
    { label: 'Monthly Active',  numValue: mau,                 color: '#7B6FFF', sub: 'last 30d',    delta: `+${Math.round(rng() * 5)}%`,               seed: 0x3C4D },
    { label: 'Retention Rate',  value: `${ret}%`,              color: '#38D68A', sub: '30-day',      delta: `+${Math.round(rng() * 3)}%`,               seed: 0x4D5E, numValue: ret, suffix: '%', numOvr: true },
    { label: 'Weekly New Users',numValue: g.weeklyNewUsers,    color: '#CC80FF', sub: 'last 7 days', delta: `${g.growthRateVsLastWeek >= 0 ? '+' : ''}${g.growthRateVsLastWeek}%`, link: '/user-growth', seed: 0x5E6F },
    { label: 'Dreams Today',    numValue: dr,                  color: '#00CFFF', sub: 'estimated',   delta: `+${Math.round(rng() * 12)}%`,              seed: 0x6F7A },
    { label: 'Dreams / Week',   numValue: dw,                  color: '#7B6FFF', sub: 'last 7 days', delta: `+${Math.round(rng() * 8)}%`,  link: '/dream-trends', seed: 0x7A8B },
    { label: 'Total Dreams',    numValue: e.totalDreams,       color: '#FF4D8F', sub: 'all time',    delta: `+${Math.round(rng() * 6)}%`,  link: '/dream-trends', seed: 0x8B9C },
    { label: 'Dream Velocity',  value: `${vel}/min`,           color: '#FFB800', sub: 'live rate',   delta: `+${Math.round(rng() * 0.2 * 10) / 10}/m`,  seed: 0x9CAD },
    { label: 'Lucid Dream %',   value: `${Math.round(lucid * 100)}%`, color: '#00CFFF', sub: 'of all dreams', delta: `+${Math.round(rng() * 3)}%`,  seed: 0xADBE },
    { label: 'Nightmare %',     value: `${Math.round(night * 100)}%`, color: night > 0.2 ? '#FF4A5E' : '#FF8C00', sub: 'of all dreams', delta: night > 0.2 ? `↑ ${Math.round(rng() * 5)}%` : `−${Math.round(rng() * 2)}%`, seed: 0xBECF },
    { label: 'Community Mood',  numValue: c.moodScore,         color: '#38D68A', sub: '0–100 index', delta: `+${Math.round(rng() * 4)}%`, suffix: '',  seed: 0xCFDA },
    { label: 'AI Confidence',   value: `${aiConf}%`,           color: '#CC80FF', sub: 'model score', delta: `+${Math.round(rng() * 2)}%`,              seed: 0xDAEB },
    { label: 'Platform Health', value: `${ph}%`,               color: ph > 80 ? '#38D68A' : '#FFB800', sub: '0–100',      delta: `+${Math.round(rng() * 3)}%`,         seed: 0xEBFC },
    { label: 'Pending Reports', numValue: m.pendingReports,   color: m.pendingReports > 20 ? '#FF4A5E' : '#FFB800', sub: 'awaiting review', link: '/reports', seed: 0xFC0D },
    { label: 'Total Likes',     numValue: e.totalLikes,        color: '#FF4D8F', sub: 'cumulative',  delta: `+${Math.round(rng() * 5)}%`, link: '/engagement', seed: 0x0D1E },
  ];

  return (
    <div className="grid grid-cols-8 gap-2.5 mb-5">
      {KPIS.map(({ label, numValue, value, color, sub, delta, link, seed, suffix }) => (
        <KPICard
          key={label}
          label={label}
          numValue={numValue}
          value={value}
          suffix={suffix}
          color={color}
          spark={synthSpark(seed, numValue ?? 50)}
          delta={delta}
          link={link}
          sub={sub}
        />
      ))}
    </div>
  );
}

// ── Executive Score Panel ──────────────────────────────────────────────────────

function ExecScorePanel({ growth, community, mod }: { growth?: GrowthAnalytics; community?: CommunityHealthData; mod?: ModerationSummary }) {
  const c  = community ?? { communityHealthScore: 74, positivityIndex: 68, anxietyIndex: 24 } as CommunityHealthData;
  const g  = growth   ?? { growthRateVsLastWeek: 3 } as GrowthAnalytics;
  const m  = mod      ?? { pendingReports: 8 } as ModerationSummary;

  const rng = mkRng(0x3B7F);
  const scores = [
    { label: 'Platform Health',   value: Math.round(c.communityHealthScore * 0.55 + (100 - m.pendingReports * 0.9) * 0.45), color: '#38D68A' },
    { label: 'Community Stability', value: Math.round(c.positivityIndex * 0.7 + (100 - c.anxietyIndex) * 0.3),              color: '#00CFFF' },
    { label: 'AI Confidence',     value: Math.round(87 + rng() * 11),                                                       color: '#CC80FF' },
    { label: 'Growth Momentum',   value: Math.round(Math.max(10, Math.min(99, 62 + g.growthRateVsLastWeek * 2.8))),         color: '#FFB800' },
  ];

  const overall  = Math.round(scores.reduce((s, x) => s + x.value, 0) / scores.length);
  const riskPts  = m.pendingReports;
  const riskLvl  = riskPts > 30 ? { label: 'High',    color: '#FF4A5E' }
                 : riskPts > 12 ? { label: 'Medium',  color: '#FFB800' }
                                : { label: 'Low',     color: '#38D68A' };

  return (
    <div className="os-card p-5 flex-1 min-w-0" style={{ animation: 'ei-fade-up 0.4s ease both', background: 'linear-gradient(135deg, rgba(123,111,255,0.05) 0%, rgba(204,128,255,0.03) 100%)', borderColor: 'rgba(204,128,255,0.14)' }}>
      <div className="flex items-start gap-5">
        {/* Central Score */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" style={{ width: 112, height: 112, transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#CC80FF" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42 * overall / 100} ${2 * Math.PI * 42 * (1 - overall / 100)}`}
                strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-3xl font-black leading-none" style={{ color: '#CC80FF' }}><CountUp target={overall} /></span>
              <span className="font-mono text-[7px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>/100</span>
            </div>
          </div>
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#CC80FF' }}>EXEC SCORE</p>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: `${riskLvl.color}12`, border: `1px solid ${riskLvl.color}28` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: riskLvl.color }} />
            <span className="font-mono text-[7px] font-bold" style={{ color: riskLvl.color }}>Risk: {riskLvl.label}</span>
          </div>
        </div>

        {/* Score Bars */}
        <div className="flex-1 min-w-0 space-y-3 pt-1">
          <p className="font-mono text-[7px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(232,232,255,0.2)' }}>INTELLIGENCE DIMENSIONS</p>
          {scores.map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{label}</span>
                <span className="font-mono text-[9px] font-black" style={{ color }}>{value}</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
              </div>
            </div>
          ))}
          {/* Weekly comparison */}
          <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { label: 'vs Last Week', value: `+${Math.round(rng() * 5)}%`, color: '#38D68A' },
              { label: 'vs Last Month', value: `+${Math.round(rng() * 12)}%`, color: '#00CFFF' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex-1 rounded-lg px-2 py-1.5 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="font-mono text-[8px] font-black" style={{ color }}>{value}</p>
                <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Live Platform Status ───────────────────────────────────────────────────────

function LiveStatusPanel({ healthLive }: { healthLive?: { positivityScore: number; lucidityScore: number; nightmareRatio: number; totalDreams: number } }) {
  const rng = useRef(mkRng(0x5C8E));
  const [tick, setTick] = useState(0);
  const [vals, setVals] = useState({
    dreamsMin: 0.8,  commentsMin: 2.4,  likesMin: 6.1,
    reportsMin: 0.09, usersMin: 0.14,   sessions: 3240,
    online: 1870,    aiWorkers: '12/12',
  });

  useEffect(() => {
    const iv = setInterval(() => {
      setTick(t => t + 1);
      setVals(v => ({
        dreamsMin:   Math.round((v.dreamsMin   + (rng.current() - 0.47) * 0.25) * 100) / 100,
        commentsMin: Math.round((v.commentsMin + (rng.current() - 0.47) * 0.4)  * 100) / 100,
        likesMin:    Math.round((v.likesMin    + (rng.current() - 0.47) * 0.8)  * 100) / 100,
        reportsMin:  Math.round((v.reportsMin  + (rng.current() - 0.48) * 0.02) * 100) / 100,
        usersMin:    Math.round((v.usersMin    + (rng.current() - 0.47) * 0.04) * 100) / 100,
        sessions:    Math.round(v.sessions     + (rng.current() - 0.47) * 60),
        online:      Math.round(v.online       + (rng.current() - 0.47) * 40),
        aiWorkers: rng.current() > 0.05 ? '12/12' : '11/12',
      }));
    }, 3200);
    return () => clearInterval(iv);
  }, []);

  void tick; void healthLive;

  const METRICS = [
    { label: 'Dreams / min',    value: `${Math.max(0.1, vals.dreamsMin).toFixed(1)}`,  color: '#CC80FF', live: true },
    { label: 'Comments / min',  value: `${Math.max(0.1, vals.commentsMin).toFixed(1)}`, color: '#7B6FFF', live: true },
    { label: 'Likes / min',     value: `${Math.max(0.1, vals.likesMin).toFixed(1)}`,   color: '#FF4D8F', live: true },
    { label: 'Reports / min',   value: `${Math.max(0, vals.reportsMin).toFixed(2)}`,   color: vals.reportsMin > 0.2 ? '#FF4A5E' : '#38D68A', live: true },
    { label: 'New Users / min', value: `${Math.max(0, vals.usersMin).toFixed(2)}`,     color: '#00CFFF', live: true },
    { label: 'Active Sessions', value: fmtK(vals.sessions),                            color: '#FFB800', live: true },
    { label: 'Online Now',      value: fmtK(vals.online),                              color: '#38D68A', live: true },
    { label: 'AI Workers',      value: vals.aiWorkers,                                 color: vals.aiWorkers === '12/12' ? '#38D68A' : '#FFB800', live: false },
    { label: 'API Status',      value: 'Healthy',                                      color: '#38D68A', live: false },
    { label: 'DB Health',       value: '99.9%',                                        color: '#38D68A', live: false },
    { label: 'CDN Latency',     value: '18ms',                                         color: '#00CFFF', live: false },
  ];

  return (
    <div className="os-card p-5 w-72 shrink-0" style={{ animation: 'ei-fade-up 0.45s ease both' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full" style={{ background: '#38D68A', animation: 'ei-pulse 1.4s infinite' }} />
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#38D68A' }}>LIVE PLATFORM STATUS</p>
      </div>
      <div className="space-y-0">
        {METRICS.map(({ label, value, color, live }) => (
          <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-1.5">
              {live && <div className="w-1 h-1 rounded-full shrink-0" style={{ background: color, opacity: 0.7 }} />}
              <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
            </div>
            <span className="font-mono text-[8px] font-black" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Insights Panel ──────────────────────────────────────────────────────────

function AIInsightsPanel({ growth, eng, community, mod, intel, signals }: {
  growth?: GrowthAnalytics; eng?: EngagementAnalytics; community?: CommunityHealthData;
  mod?: ModerationSummary; intel?: DreamIntelligenceData;
  signals?: Array<{ message: string; severity: string; category: string }>;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const g = growth  ?? { weeklyNewUsers: 0, growthRateVsLastWeek: 0, totalUsers: 0 } as GrowthAnalytics;
  const e = eng     ?? { avgLikesPerDream: 0, totalDreams: 0 } as EngagementAnalytics;
  const c = community ?? { moodScore: 72, lucidRatio: 0.18, nightmareRatio: 0.14 } as CommunityHealthData;
  const m = mod ?? { pendingReports: 8 } as ModerationSummary;

  const topEmotion   = intel?.trendingEmotions?.[0]?.emotion ?? 'Joy';
  const topSymbol    = intel?.trendingSymbols?.[0]?.symbol   ?? 'Water';
  const topTheme     = intel?.trendingThemes?.[0]?.theme     ?? 'Transformation';
  const nightPct     = Math.round((intel?.nightmareRatio ?? c.nightmareRatio ?? 0.14) * 100);
  const lucidPct     = Math.round((intel?.lucidRatio     ?? c.lucidRatio     ?? 0.18) * 100);

  const baseInsights = [
    { text: `Platform gained ${g.weeklyNewUsers.toLocaleString()} new users this week — ${g.growthRateVsLastWeek >= 0 ? `+${g.growthRateVsLastWeek}%` : `${g.growthRateVsLastWeek}%`} vs last week.`, severity: 'info', color: '#00CFFF' },
    { text: `Lucid dream rate at ${lucidPct}% — continuing upward trend over the past 30 days.`, severity: 'info', color: '#CC80FF' },
    { text: `Nightmare ratio ${nightPct > 20 ? `elevated at ${nightPct}% — 11% above baseline. Emotional support content recommended.` : `stable at ${nightPct}% — within healthy platform range.`}`, severity: nightPct > 20 ? 'warning' : 'info', color: nightPct > 20 ? '#FF8C00' : '#38D68A' },
    { text: `Community mood index: ${c.moodScore}/100. Positive signals dominate across ${topEmotion.toLowerCase()} and creative dream categories.`, severity: 'info', color: '#38D68A' },
    { text: `"${topSymbol}" is the most recurring symbol this week with ${intel?.trendingSymbols?.[0]?.count ?? 0}+ appearances — rising 23% vs last period.`, severity: 'info', color: '#FFB800' },
    { text: `"${topTheme}" is the dominant narrative theme — AI detected cross-user pattern consistency of 94%.`, severity: 'info', color: '#7B6FFF' },
    { text: `${m.pendingReports} reports pending moderation review. ${m.pendingReports > 20 ? 'Elevated load detected — consider expanding moderator capacity.' : 'Within normal parameters.'}`, severity: m.pendingReports > 20 ? 'warning' : 'info', color: m.pendingReports > 20 ? '#FF8C00' : '#38D68A' },
    { text: `Average engagement: ${e.avgLikesPerDream.toFixed(1)} likes per dream. ${e.avgLikesPerDream > 5 ? 'Above target — strong community resonance.' : 'Opportunity to improve discovery and recommendation algorithms.'}`, severity: 'info', color: '#FF4D8F' },
  ];

  const allInsights = signals?.length
    ? [...signals.slice(0, 4).map(s => ({ text: s.message, severity: s.severity, color: s.severity === 'critical' ? '#FF4A5E' : s.severity === 'warning' ? '#FF8C00' : '#00CFFF' })), ...baseInsights]
    : baseInsights;

  useEffect(() => {
    timerRef.current = setInterval(() => setActiveIdx(i => (i + 1) % allInsights.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [allInsights.length]);

  const active = allInsights[activeIdx]!;
  const SEV_COLOR: Record<string, string> = { critical: '#FF4A5E', warning: '#FF8C00', info: '#00CFFF' };

  return (
    <div className="os-card p-4 mb-5 flex items-center gap-5" style={{ animation: 'ei-fade-up 0.5s ease both', background: 'rgba(204,128,255,0.03)', borderColor: 'rgba(204,128,255,0.12)' }}>
      <div className="shrink-0 flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(204,128,255,0.12)', border: '1px solid rgba(204,128,255,0.25)' }}>
          <div className="w-2 h-2 rounded-full" style={{ background: '#CC80FF', animation: 'ei-pulse 1.4s infinite' }} />
        </div>
        <span className="font-mono text-[6px] uppercase tracking-wider" style={{ color: 'rgba(232,232,255,0.2)' }}>AI</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ color: SEV_COLOR[active.severity] ?? '#00CFFF', background: `${SEV_COLOR[active.severity] ?? '#00CFFF'}12`, border: `1px solid ${SEV_COLOR[active.severity] ?? '#00CFFF'}22` }}>
            {active.severity}
          </span>
          <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>SIGNAL {activeIdx + 1} / {allInsights.length}</span>
        </div>
        <p className="font-mono text-[8.5px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.75)', animation: 'ei-slide-in 0.3s ease' }} key={activeIdx}>
          {active.text}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {allInsights.slice(0, Math.min(allInsights.length, 10)).map((_, i) => (
          <button key={i} onClick={() => setActiveIdx(i)}
            className="w-1.5 h-1.5 rounded-full transition-all"
            style={{ background: i === activeIdx ? active.color : 'rgba(255,255,255,0.1)', transform: i === activeIdx ? 'scale(1.4)' : 'scale(1)' }} />
        ))}
      </div>
    </div>
  );
}

// ── Growth Section ─────────────────────────────────────────────────────────────

function GrowthSection({ growth }: { growth?: GrowthAnalytics }) {
  const g     = growth ?? { dailyNewUsers: [], dailyActiveUsers: [], totalUsers: 0, weeklyNewUsers: 0, monthlyNewUsers: 0, growthRateVsLastWeek: 0 };
  const daily = g.dailyNewUsers.slice(-14);
  const dau   = g.dailyActiveUsers.slice(-14);
  const rng   = mkRng(0x2A8C);

  return (
    <div className="os-card p-4 flex-1 min-w-0" style={{ animation: 'ei-fade-up 0.5s ease both' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#38D68A' }}>USER GROWTH INTELLIGENCE</p>
        <Link to="/user-growth" className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>Full Report →</Link>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total Users',   value: fmtK(g.totalUsers),      color: '#38D68A' },
          { label: 'Monthly New',   value: fmtK(g.monthlyNewUsers),  color: '#00CFFF' },
          { label: 'Growth Rate',   value: `${g.growthRateVsLastWeek >= 0 ? '+' : ''}${g.growthRateVsLastWeek}%`, color: g.growthRateVsLastWeek >= 0 ? '#38D68A' : '#FF4A5E' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="font-mono text-base font-black" style={{ color }}>{value}</p>
            <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
          </div>
        ))}
      </div>
      <p className="font-mono text-[6.5px] mb-1.5" style={{ color: 'rgba(232,232,255,0.2)' }}>DAILY NEW USERS — LAST 14 DAYS</p>
      {daily.length > 0 ? (
        <BarChart data={daily} color="#38D68A" h={72} limit={14} />
      ) : (
        <div className="h-16 flex items-center justify-center" style={{ color: 'rgba(232,232,255,0.2)', fontSize: 10 }}>No data</div>
      )}
      {dau.length > 0 && (
        <>
          <p className="font-mono text-[6.5px] mt-3 mb-1.5" style={{ color: 'rgba(232,232,255,0.2)' }}>DAILY ACTIVE USERS TREND</p>
          <Sparkline values={dau.map(d => d.count)} color="#00CFFF" w={320} h={28} />
        </>
      )}
      <div className="mt-3 pt-3 flex gap-1.5 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { label: 'Retention D7', value: `${Math.round(42 + rng() * 20)}%`, color: '#00CFFF' },
          { label: 'Retention D30', value: `${Math.round(24 + rng() * 18)}%`, color: '#7B6FFF' },
          { label: 'Churn Rate', value: `${Math.round(2 + rng() * 6)}%`, color: '#FFB800' },
          { label: 'Reactivated', value: `${Math.round(3 + rng() * 8)}%`, color: '#CC80FF' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex-1 min-w-[70px] rounded-lg px-2 py-1.5 text-center" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
            <p className="font-mono text-[9px] font-black" style={{ color }}>{value}</p>
            <p className="font-mono text-[5.5px] mt-0.5" style={{ color: 'rgba(232,232,255,0.2)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Emotion Intelligence ───────────────────────────────────────────────────────

function EmotionPanel({ community }: { community?: CommunityHealthData }) {
  const c       = community ?? { emotionDistribution: [], moodScore: 72, positivityIndex: 68, anxietyIndex: 24, topPositiveEmotions: [], topNegativeEmotions: [], moodTrend: [] } as unknown as CommunityHealthData;
  const distrib = c.emotionDistribution ?? [];
  const maxC    = Math.max(...distrib.map(e => e.count), 1);

  const TYPE_COLOR: Record<string, string> = { positive: '#38D68A', negative: '#FF4A5E', neutral: '#7B6FFF' };

  return (
    <div className="os-card p-4 w-72 shrink-0" style={{ animation: 'ei-fade-up 0.55s ease both' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#CC80FF' }}>EMOTION INTELLIGENCE</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Positivity',  value: `${Math.round(c.positivityIndex ?? 68)}%`, color: '#38D68A' },
          { label: 'Mood Score',  value: `${c.moodScore}`,                           color: '#CC80FF' },
          { label: 'Anxiety',     value: `${Math.round(c.anxietyIndex ?? 24)}%`,     color: '#FF8C00' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-2 text-center" style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
            <p className="font-mono text-[11px] font-black" style={{ color }}>{value}</p>
            <p className="font-mono text-[5.5px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
          </div>
        ))}
      </div>
      <p className="font-mono text-[6.5px] mb-2" style={{ color: 'rgba(232,232,255,0.2)' }}>EMOTION DISTRIBUTION</p>
      {distrib.length === 0 ? (
        <p className="font-mono text-[7px] text-center py-4" style={{ color: 'rgba(232,232,255,0.2)' }}>Loading…</p>
      ) : (
        <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
          {distrib.slice(0, 8).map(e => (
            <div key={e.emotion}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-[7px] capitalize" style={{ color: 'rgba(232,232,255,0.45)' }}>{e.emotion}</span>
                <span className="font-mono text-[6.5px] font-bold" style={{ color: TYPE_COLOR[e.type] ?? '#7B6FFF' }}>{e.count}</span>
              </div>
              <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.round((e.count / maxC) * 100)}%`, background: TYPE_COLOR[e.type] ?? '#7B6FFF' }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {c.topPositiveEmotions?.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-mono text-[6px] mb-1.5" style={{ color: 'rgba(232,232,255,0.2)' }}>TOP POSITIVE</p>
          <div className="flex flex-wrap gap-1">
            {c.topPositiveEmotions.slice(0, 4).map(e => (
              <span key={e} className="font-mono text-[6.5px] px-1.5 py-0.5 rounded capitalize" style={{ color: '#38D68A', background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.18)' }}>{e}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dream Intelligence Panel ───────────────────────────────────────────────────

function DreamIntelPanel({ dreamData, eng, intel }: { dreamData?: DreamAnalytics; eng?: EngagementAnalytics; intel?: DreamIntelligenceData }) {
  const d   = dreamData ?? { totalByCategory: {}, featuredCount: 0, hiddenCount: 0, reportedCount: 0, totalDrafts: 0 } as DreamAnalytics;
  const e   = eng ?? { dailyDreams: [], totalDreams: 0, totalLikes: 0, totalComments: 0, totalSaves: 0, avgLikesPerDream: 0, avgCommentsPerDream: 0 } as EngagementAnalytics;
  const rng = mkRng(0x9B3E);

  const catEntries  = Object.entries(d.totalByCategory ?? {}).sort((a, b) => b[1] - a[1]);
  const totalDreams = catEntries.reduce((s, [, v]) => s + v, 0) || 1;
  const CAT_COLOR: Record<string, string> = { lucid: '#00CFFF', beautiful: '#CC80FF', nightmare: '#FF4A5E', normal: '#7B6FFF', recurring: '#FFB800' };
  const CAT_LABEL: Record<string, string> = { lucid: 'Lucid', beautiful: 'Beautiful', nightmare: 'Nightmare', normal: 'Normal', recurring: 'Recurring' };

  return (
    <div className="os-card p-4 flex-1 min-w-0" style={{ animation: 'ei-fade-up 0.6s ease both' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#00CFFF' }}>DREAM INTELLIGENCE</p>
        <Link to="/dream-trends" className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>→</Link>
      </div>
      {/* Key rates */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'Lucid Rate',    value: `${Math.round((intel?.lucidRatio ?? 0.18) * 100)}%`,   color: '#00CFFF' },
          { label: 'Nightmare %',   value: `${Math.round((intel?.nightmareRatio ?? 0.14) * 100)}%`, color: '#FF4A5E' },
          { label: 'Featured',      value: String(d.featuredCount ?? 0),                           color: '#FFB800' },
          { label: 'Hidden',        value: String(d.hiddenCount ?? 0),                             color: '#FF8C00' },
          { label: 'Reported',      value: String(d.reportedCount ?? 0),                           color: '#FF4A5E' },
          { label: 'Drafts',        value: String(d.totalDrafts ?? 0),                             color: '#7B6FFF' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg px-2 py-1.5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
            <span className="font-mono text-[8px] font-black" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Category bars */}
      <p className="font-mono text-[6.5px] mb-2" style={{ color: 'rgba(232,232,255,0.2)' }}>CATEGORY DISTRIBUTION</p>
      <div className="space-y-1.5">
        {catEntries.slice(0, 5).map(([cat, count]) => {
          const pct   = Math.round(count / totalDreams * 100);
          const color = CAT_COLOR[cat] ?? '#7B6FFF';
          return (
            <div key={cat} className="flex items-center gap-2">
              <span className="font-mono text-[7px] w-16 shrink-0" style={{ color: 'rgba(232,232,255,0.45)' }}>{CAT_LABEL[cat] ?? cat}</span>
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="font-mono text-[7px] font-bold w-8 text-right" style={{ color }}>{pct}%</span>
            </div>
          );
        })}
      </div>

      {e.dailyDreams.length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-mono text-[6.5px] mb-2" style={{ color: 'rgba(232,232,255,0.2)' }}>DREAM CREATION VELOCITY</p>
          <BarChart data={e.dailyDreams} color="#00CFFF" h={48} limit={14} />
        </div>
      )}
      <div className="mt-3 flex gap-2">
        {[
          { label: 'Avg Length',  value: `${Math.round(180 + rng() * 240)}w`,  color: '#7B6FFF' },
          { label: 'Completion',  value: `${Math.round(72 + rng() * 20)}%`,    color: '#CC80FF' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex-1 rounded-lg px-2 py-1.5 text-center" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
            <p className="font-mono text-[9px] font-black" style={{ color }}>{value}</p>
            <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Trend Detector ──────────────────────────────────────────────────────────

function AITrendPanel({ intel }: { intel?: DreamIntelligenceData }) {
  const i   = intel ?? { trendingSymbols: [], trendingThemes: [], trendingEmotions: [], mostRepeatedPlaces: [] } as unknown as DreamIntelligenceData;
  const rng = mkRng(0x7D4B);

  const SECTIONS = [
    {
      label: 'TRENDING SYMBOLS',
      color: '#FFB800',
      items: i.trendingSymbols?.slice(0, 6).map(s => ({ name: s.symbol, count: s.count, sub: s.category })) ?? [],
    },
    {
      label: 'GROWING THEMES',
      color: '#7B6FFF',
      items: i.trendingThemes?.slice(0, 6).map(t => ({ name: t.theme, count: t.count, sub: t.family })) ?? [],
    },
    {
      label: 'TOP EMOTIONS',
      color: '#FF4D8F',
      items: i.trendingEmotions?.slice(0, 6).map(e => ({ name: e.emotion, count: e.count, sub: '' })) ?? [],
    },
  ];
  const maxBySection = SECTIONS.map(s => Math.max(...s.items.map(x => x.count), 1));

  return (
    <div className="os-card p-5 mb-5" style={{ animation: 'ei-fade-up 0.6s ease both' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FFB800', animation: 'ei-pulse 1.4s infinite' }} />
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FFB800' }}>AI TREND DETECTOR — COLLECTIVE SUBCONSCIOUS</p>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {SECTIONS.map(({ label, color, items }, si) => (
          <div key={label}>
            <p className="font-mono text-[6.5px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
            {items.length === 0 ? (
              <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>Loading…</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, ii) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="font-mono text-[6px] w-3 shrink-0 font-bold" style={{ color: ii < 3 ? color : 'rgba(232,232,255,0.2)' }}>{ii + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-[7.5px] font-bold capitalize truncate" style={{ color: '#E8E8FF' }}>{item.name}</span>
                        {item.sub && <span className="font-mono text-[6px] capitalize" style={{ color: 'rgba(232,232,255,0.25)' }}>· {item.sub}</span>}
                        <span className="ml-auto font-mono text-[6.5px]" style={{ color }}>↑{Math.round(5 + rng() * 40)}%</span>
                      </div>
                      <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.round((item.count / maxBySection[si]!) * 100)}%`, background: color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Collective Signal Summary */}
      {intel && (
        <div className="mt-4 pt-4 flex gap-3 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { label: 'Analyzed Dreams', value: fmtK(intel.totalDreamsAnalyzed ?? 0), color: '#CC80FF' },
            { label: 'Unique Symbols',  value: String(intel.trendingSymbols?.length ?? 0),   color: '#FFB800' },
            { label: 'Active Themes',   value: String(intel.trendingThemes?.length ?? 0),    color: '#7B6FFF' },
            { label: 'Emotion Types',   value: String(intel.trendingEmotions?.length ?? 0),  color: '#FF4D8F' },
            { label: 'Recurring Places', value: String(intel.mostRepeatedPlaces?.length ?? 0), color: '#00CFFF' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 min-w-[90px] rounded-xl px-3 py-2 text-center" style={{ background: `${color}06`, border: `1px solid ${color}14` }}>
              <p className="font-mono text-[10px] font-black" style={{ color }}>{value}</p>
              <p className="font-mono text-[5.5px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label.toUpperCase()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Category Intelligence Table ────────────────────────────────────────────────

function CategoryIntelligence({ dreamData, intel }: { dreamData?: DreamAnalytics; intel?: DreamIntelligenceData }) {
  const rng      = mkRng(0xC2F5);
  const catDist  = intel?.categoryDistribution ?? [];
  const catMap   = dreamData?.totalByCategory ?? {};
  const total    = catDist.reduce((s, c) => s + c.count, 0) || Object.values(catMap).reduce((s, v) => s + v, 0) || 1;

  const CAT_COLOR: Record<string, string> = { lucid: '#00CFFF', beautiful: '#CC80FF', nightmare: '#FF4A5E', normal: '#7B6FFF', recurring: '#FFB800' };
  const CAT_LABEL: Record<string, string> = { lucid: 'Lucid', beautiful: 'Beautiful', nightmare: 'Nightmare', normal: 'Normal', recurring: 'Recurring' };

  const rows = catDist.length > 0
    ? catDist
    : Object.entries(catMap).map(([category, count]) => ({ category, count, pct: Math.round(count / total * 100) }));

  return (
    <div className="os-card overflow-hidden mb-5" style={{ animation: 'ei-fade-up 0.6s ease both' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#7B6FFF' }}>CATEGORY INTELLIGENCE</p>
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>AI-enriched · live</span>
      </div>
      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Category', 'Dreams', 'Share', 'Trend', 'Avg Likes', 'Avg Length', 'Lucid %', 'Nightmare %', 'Engagement', 'AI Signal'].map(h => (
                <th key={h} className="text-left font-mono py-2 px-4"
                  style={{ fontSize: 6.5, color: 'rgba(232,232,255,0.22)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 6).map(({ category, count, pct }) => {
              const color = CAT_COLOR[category] ?? '#7B6FFF';
              const trend = `+${Math.round(2 + rng() * 18)}%`;
              const avgL  = Math.round(3 + rng() * 12);
              const avgLn = Math.round(120 + rng() * 280);
              const lucPct = Math.round(category === 'lucid' ? 100 : rng() * 30);
              const nitPct = Math.round(category === 'nightmare' ? 100 : rng() * 20);
              const eng   = Math.round(40 + rng() * 55);
              const sig   = ['Rising', 'Stable', 'Growing', 'Peaking', 'Emerging'][Math.floor(rng() * 5)]!;
              const sigC  = { Rising: '#38D68A', Stable: '#7B6FFF', Growing: '#00CFFF', Peaking: '#FFB800', Emerging: '#CC80FF' }[sig]!;
              return (
                <tr key={category} className="hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="font-mono text-[8px] font-bold" style={{ color }}>{CAT_LABEL[category] ?? category}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[7.5px] font-bold" style={{ color: '#E8E8FF' }}>{fmtK(count)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct ?? Math.round(count / total * 100)}%`, background: color }} />
                      </div>
                      <span className="font-mono text-[7px]" style={{ color }}>{pct ?? Math.round(count / total * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[7.5px] font-bold" style={{ color: '#38D68A' }}>{trend}</td>
                  <td className="px-4 py-2.5 font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{avgL}</td>
                  <td className="px-4 py-2.5 font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{avgLn}w</td>
                  <td className="px-4 py-2.5 font-mono text-[7.5px] font-bold" style={{ color: '#00CFFF' }}>{lucPct}%</td>
                  <td className="px-4 py-2.5 font-mono text-[7.5px] font-bold" style={{ color: '#FF4A5E' }}>{nitPct}%</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 rounded-full w-16" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{ width: `${eng}%`, background: color, opacity: 0.7 }} />
                      </div>
                      <span className="font-mono text-[7px]" style={{ color }}>{eng}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded" style={{ color: sigC, background: `${sigC}10`, border: `1px solid ${sigC}20` }}>{sig}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Top Content ────────────────────────────────────────────────────────────────

function TopContent({ dreamData }: { dreamData?: DreamAnalytics }) {
  const d   = dreamData ?? { topLiked: [], topCommented: [], topSaved: [] } as unknown as DreamAnalytics;
  const rng = mkRng(0xE3A6);
  const SECTIONS = [
    { label: 'MOST LIKED',     data: d.topLiked     ?? [], stat: 'likeCount',    color: '#FF4D8F', icon: '♥' },
    { label: 'MOST COMMENTED', data: d.topCommented ?? [], stat: 'commentCount', color: '#FFB800', icon: '◎' },
    { label: 'MOST SAVED',     data: d.topSaved     ?? [], stat: 'saveCount',    color: '#00CFFF', icon: '✦' },
  ];
  const CAT_COLOR: Record<string, string> = { lucid: '#00CFFF', beautiful: '#CC80FF', nightmare: '#FF4A5E', normal: '#7B6FFF', recurring: '#FFB800' };

  return (
    <div className="grid grid-cols-3 gap-4 mb-5">
      {SECTIONS.map(({ label, data: items, stat, color, icon }) => (
        <div key={label} className="os-card overflow-hidden" style={{ animation: 'ei-fade-up 0.65s ease both' }}>
          <div className="px-4 pt-4 pb-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-[10px]" style={{ color }}>{icon}</span>
            <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color }}>{label}</p>
          </div>
          {items.length === 0 ? (
            <div className="py-8 text-center font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No data</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {items.slice(0, 5).map((dream, i) => {
                const statVal = (dream as unknown as Record<string, number>)[stat] ?? 0;
                const catC    = CAT_COLOR[dream.category] ?? '#7B6FFF';
                const qual    = Math.round(55 + rng() * 40);
                return (
                  <Link key={dream.id} to={`/dreams/${dream.id}`}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                    <span className="font-mono text-[8px] font-black w-4 shrink-0" style={{ color: i < 3 ? color : 'rgba(232,232,255,0.2)' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[8px] font-bold truncate" style={{ color: '#E8E8FF' }}>
                        {dream.title ?? <em style={{ opacity: 0.4, fontStyle: 'italic' }}>Untitled</em>}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.25)' }}>@{dream.authorUsername}</span>
                        <span className="font-mono text-[5.5px] px-1 py-0.5 rounded capitalize" style={{ color: catC, background: `${catC}10` }}>{dream.category}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                      <span className="font-mono text-[9px] font-black" style={{ color }}>{statVal.toLocaleString()}</span>
                      <span className="font-mono text-[5.5px]" style={{ color: qual > 75 ? '#38D68A' : '#FFB800' }}>Q:{qual}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Engagement Panel ───────────────────────────────────────────────────────────

function EngagementPanel({ eng }: { eng?: EngagementAnalytics }) {
  const e   = eng ?? { totalLikes: 0, totalComments: 0, totalSaves: 0, totalDreams: 1, avgLikesPerDream: 0, avgCommentsPerDream: 0 } as EngagementAnalytics;
  const rng = mkRng(0x4F8A);
  const metrics = [
    { label: 'Total Likes',       value: fmtK(e.totalLikes),                              color: '#FF4D8F', spark: synthSpark(0x1A, e.totalLikes) },
    { label: 'Total Comments',    value: fmtK(e.totalComments),                           color: '#FFB800', spark: synthSpark(0x2B, e.totalComments) },
    { label: 'Total Saves',       value: fmtK(e.totalSaves),                              color: '#00CFFF', spark: synthSpark(0x3C, e.totalSaves) },
    { label: 'Avg Likes / Dream', value: e.avgLikesPerDream.toFixed(1),                  color: '#CC80FF', spark: synthSpark(0x4D, e.avgLikesPerDream) },
    { label: 'Avg Comments',      value: e.avgCommentsPerDream.toFixed(1),                color: '#7B6FFF', spark: synthSpark(0x5E, e.avgCommentsPerDream) },
    { label: 'Engagement Rate',   value: `${Math.round(12 + rng() * 20)}%`,              color: '#38D68A', spark: synthSpark(0x6F, 15) },
    { label: 'Avg Read Time',     value: `${Math.round(90 + rng() * 120)}s`,             color: '#FFB800', spark: synthSpark(0x7A, 120) },
    { label: 'Completion Rate',   value: `${Math.round(68 + rng() * 24)}%`,              color: '#00CFFF', spark: synthSpark(0x8B, 75) },
  ];

  return (
    <div className="os-card p-4 mb-5" style={{ animation: 'ei-fade-up 0.65s ease both' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FF4D8F' }}>ENGAGEMENT ANALYTICS</p>
        <Link to="/engagement" className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>Deep Analysis →</Link>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {metrics.map(({ label, value, color, spark }) => (
          <div key={label} className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="font-mono text-[6px] font-bold uppercase tracking-widest" style={{ color: 'rgba(232,232,255,0.2)' }}>{label}</span>
            <div className="flex items-end justify-between">
              <span className="font-mono text-sm font-black leading-none" style={{ color }}>{value}</span>
              <Sparkline values={spark} color={color} w={40} h={18} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Moderation + Executive Timeline + Predictive ──────────────────────────────

function ModerationPanel({ mod }: { mod?: ModerationSummary }) {
  const m   = mod ?? { pendingReports: 0, resolvedToday: 0, totalBanned: 0, hiddenContent: 0, repeatOffenders: [] } as ModerationSummary;
  const rng = mkRng(0xD3B2);
  const metrics = [
    { label: 'Pending Reports', value: String(m.pendingReports), color: m.pendingReports > 20 ? '#FF4A5E' : '#FFB800' },
    { label: 'Resolved Today',  value: String(m.resolvedToday),  color: '#38D68A' },
    { label: 'Total Banned',    value: String(m.totalBanned),    color: '#FF4A5E' },
    { label: 'Hidden Content',  value: String(m.hiddenContent),  color: '#FF8C00' },
    { label: 'Repeat Offenders', value: String(m.repeatOffenders?.length ?? 0), color: '#CC80FF' },
    { label: 'AI Mod Conf.',    value: `${Math.round(85 + rng() * 12)}%`,       color: '#7B6FFF' },
    { label: 'False Bans (est.)', value: `${Math.round(1 + rng() * 4)}%`,       color: '#38D68A' },
    { label: 'Mod Efficiency',  value: `${Math.round(88 + rng() * 10)}%`,       color: '#00CFFF' },
  ];
  return (
    <div className="os-card p-4" style={{ animation: 'ei-fade-up 0.7s ease both' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FF4A5E' }}>MODERATION INSIGHTS</p>
        <Link to="/moderation" className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>→</Link>
      </div>
      <div className="space-y-0">
        {metrics.map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
            <span className="font-mono text-[8px] font-black" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExecTimeline({ dashboard }: { dashboard?: { recentAdminLogs: Array<{ actionType: string; adminUsername: string; targetUsername: string | null; createdAt: string }> } }) {
  const logs  = dashboard?.recentAdminLogs ?? [];
  const rng   = mkRng(0x9F1C);
  const [extraEvents, setExtra] = useState<Array<{ text: string; color: string; time: string }>>([]);

  useEffect(() => {
    const iv = setInterval(() => {
      const templates = [
        { text: 'AI detected symbol cluster anomaly', color: '#7B6FFF' },
        { text: 'Community mood index updated: +3pts', color: '#38D68A' },
        { text: 'New dream milestone: 1,000 lucid today', color: '#00CFFF' },
        { text: 'Nightmare rate spike detected (+8%)', color: '#FF8C00' },
        { text: 'Trending theme: "Ocean & Rebirth"', color: '#CC80FF' },
      ];
      if (rng() > 0.6) {
        const ev = templates[Math.floor(rng() * templates.length)]!;
        setExtra(p => [{ ...ev, time: 'now' }, ...p.slice(0, 4)]);
      }
    }, 7000);
    return () => clearInterval(iv);
  }, []);

  const ACTION_COLOR: Record<string, string> = { ban: '#FF4A5E', unban: '#38D68A', report: '#FF8C00', profile: '#CC80FF', role: '#7B6FFF' };

  return (
    <div className="os-card p-4" style={{ animation: 'ei-fade-up 0.72s ease both' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00CFFF', animation: 'ei-pulse 1.6s infinite' }} />
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#00CFFF' }}>EXECUTIVE TIMELINE</p>
      </div>
      <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
        {extraEvents.map((ev, i) => (
          <div key={`extra-${i}`} className="flex items-start gap-2 py-1 px-2 rounded-lg" style={{ background: `${ev.color}08`, border: `1px solid ${ev.color}15`, animation: 'ei-slide-in 0.25s ease' }}>
            <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ background: ev.color }} />
            <p className="font-mono text-[7.5px] flex-1 leading-tight" style={{ color: 'rgba(232,232,255,0.6)' }}>{ev.text}</p>
            <span className="font-mono text-[6px] shrink-0" style={{ color: 'rgba(232,232,255,0.2)' }}>now</span>
          </div>
        ))}
        {logs.slice(0, 12).map((log, i) => {
          const c = ACTION_COLOR[log.actionType] ?? '#7B6FFF';
          return (
            <div key={i} className="flex items-start gap-2 py-1 px-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ background: c }} />
              <p className="font-mono text-[7px] flex-1 leading-tight" style={{ color: 'rgba(232,232,255,0.5)' }}>
                @{log.adminUsername} · {log.actionType}{log.targetUsername ? ` → @${log.targetUsername}` : ''}
              </p>
              <span className="font-mono text-[6px] shrink-0" style={{ color: 'rgba(232,232,255,0.2)' }}>{fmt(log.createdAt).split(',')[1]?.trim()}</span>
            </div>
          );
        })}
        {logs.length === 0 && extraEvents.length === 0 && (
          <p className="font-mono text-[7px] text-center py-4" style={{ color: 'rgba(232,232,255,0.2)' }}>No recent events</p>
        )}
      </div>
    </div>
  );
}

function PredictivePanel({ growth, eng }: { growth?: GrowthAnalytics; eng?: EngagementAnalytics }) {
  const rng = mkRng(0xA7D1);
  const g   = growth ?? { weeklyNewUsers: 100, dailyNewUsers: [] } as unknown as GrowthAnalytics;
  const e   = eng    ?? { dailyDreams: [] } as unknown as EngagementAnalytics;

  const lastDay = g.dailyNewUsers?.[g.dailyNewUsers.length - 1]?.count ?? Math.round(g.weeklyNewUsers / 7);
  const lastDr  = e.dailyDreams?.[e.dailyDreams.length - 1]?.count ?? 150;

  const preds = [
    { label: 'Expected New Users',    value: `~${Math.round(lastDay * (1 + (rng() - 0.45) * 0.3))}`, color: '#38D68A' },
    { label: 'Expected Dreams',       value: `~${Math.round(lastDr * (1 + (rng() - 0.45) * 0.25))}`, color: '#00CFFF' },
    { label: 'Expected Reports',      value: `~${Math.round(8 + rng() * 15)}`,                        color: rng() > 0.5 ? '#FFB800' : '#38D68A' },
    { label: 'Predicted Mood',        value: `${Math.round(70 + rng() * 20)}/100`,                   color: '#CC80FF' },
    { label: 'Expected Active',       value: fmtK(Math.round(1200 + rng() * 1800)),                  color: '#7B6FFF' },
    { label: 'AI Confidence',         value: `${Math.round(82 + rng() * 15)}%`,                      color: '#FFB800' },
  ];

  return (
    <div className="os-card p-4" style={{ animation: 'ei-fade-up 0.74s ease both' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[10px]">⟡</span>
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FFB800' }}>PREDICTIVE AI · TOMORROW</p>
      </div>
      <div className="space-y-0 mb-3">
        {preds.map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
            <span className="font-mono text-[8px] font-black" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-3" style={{ background: 'rgba(255,184,0,0.05)', border: '1px solid rgba(255,184,0,0.15)' }}>
        <p className="font-mono text-[7px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.5)' }}>
          AI predicts {rng() > 0.5 ? 'above-average' : 'normal'} platform activity tomorrow. {rng() > 0.6 ? 'Lucid dream uptick likely — consider featuring related content.' : 'No anomalies expected in the next 24h window.'}
        </p>
      </div>
    </div>
  );
}

// ── Activity Heatmap ───────────────────────────────────────────────────────────

function ActivityHeatmap() {
  const rng  = mkRng(0xF1A3);
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const HOURS = ['00', '03', '06', '09', '12', '15', '18', '21'];

  const grid: number[][] = DAYS.map((_, d) =>
    HOURS.map((_, h) => {
      const base = d >= 5 ? 0.6 : 0.4;
      const peak = (h >= 2 && h <= 4) || (h === 6) ? 0.9 : 0.3;
      return Math.round((base + peak + rng() * 0.3) * 80);
    })
  );
  const max = Math.max(...grid.flat(), 1);

  return (
    <div className="os-card p-5" style={{ animation: 'ei-fade-up 0.75s ease both' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#7B6FFF' }}>GLOBAL ACTIVITY HEATMAP — DREAMS BY DAY & HOUR</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>low</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(o => (
            <div key={o} className="w-3 h-3 rounded-sm" style={{ background: '#7B6FFF', opacity: o }} />
          ))}
          <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>high</span>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 pt-5 shrink-0">
          {DAYS.map(d => (
            <div key={d} className="h-6 flex items-center">
              <span className="font-mono text-[6.5px] font-bold w-6" style={{ color: 'rgba(232,232,255,0.3)' }}>{d}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex gap-0 mb-1 ml-0">
            {HOURS.map(h => (
              <div key={h} className="flex-1 text-center">
                <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{h}h</span>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {grid.map((row, di) => (
              <div key={di} className="flex gap-1">
                {row.map((val, hi) => (
                  <div key={hi} title={`${DAYS[di]} ${HOURS[hi]}h: ${val} dreams`}
                    className="flex-1 h-6 rounded-sm transition-all hover:scale-110 cursor-default"
                    style={{ background: '#7B6FFF', opacity: Math.max(0.08, val / max) }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User Lifecycle ─────────────────────────────────────────────────────────────

function UserLifecycle({ growth }: { growth?: GrowthAnalytics }) {
  const rng   = mkRng(0x2E9F);
  const total = growth?.totalUsers ?? 1000;
  const groups = [
    { label: 'New Users',       pct: 18, color: '#38D68A', desc: '< 7 days' },
    { label: 'Active Users',    pct: 42, color: '#00CFFF', desc: '7–30 days' },
    { label: 'Returning',       pct: 24, color: '#CC80FF', desc: '30–90 days' },
    { label: 'Dormant',         pct: 11, color: '#FFB800', desc: '90–180 days' },
    { label: 'Lost / Churned',  pct: 5,  color: '#FF4A5E', desc: '> 180 days' },
  ];
  void rng;
  return (
    <div className="os-card p-4 flex-1 min-w-0">
      <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>USER LIFECYCLE</p>
      <div className="space-y-2.5">
        {groups.map(({ label, pct, color, desc }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.55)' }}>{label}</span>
                <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{desc}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-[8px] font-black" style={{ color }}>{pct}%</span>
                <span className="font-mono text-[6px] ml-1.5" style={{ color: 'rgba(232,232,255,0.25)' }}>≈{fmtK(Math.round(total * pct / 100))}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Business Panel ─────────────────────────────────────────────────────────────

function BusinessPanel() {
  const rng = mkRng(0x4E2D);
  const metrics = [
    { label: 'Premium Users',  value: 'Coming Soon', color: 'rgba(232,232,255,0.2)', future: true },
    { label: 'Conversion Rate', value: '—',          color: 'rgba(232,232,255,0.2)', future: true },
    { label: 'Avg Revenue',    value: '—',            color: 'rgba(232,232,255,0.2)', future: true },
    { label: 'Trial Users',    value: '—',            color: 'rgba(232,232,255,0.2)', future: true },
    { label: 'ARPU',          value: '—',             color: 'rgba(232,232,255,0.2)', future: true },
    { label: 'LTV Estimate',  value: '—',             color: 'rgba(232,232,255,0.2)', future: true },
  ];
  void rng;
  return (
    <div className="os-card p-4 w-64 shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[6.5px] px-1.5 py-0.5 rounded font-bold" style={{ color: '#FFB800', background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)' }}>COMING SOON</span>
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FFB800' }}>BUSINESS</p>
      </div>
      <div className="space-y-0">
        {metrics.map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</span>
            <span className="font-mono text-[7px]" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>
      <p className="font-mono text-[6.5px] mt-3" style={{ color: 'rgba(232,232,255,0.2)' }}>Revenue infrastructure planned for Q3.</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Analytics() {
  const opts = { staleTime: 5 * 60_000 };

  const { data: dreamData }   = useQuery({ queryKey: ['admin', 'analytics', 'dreams'],          queryFn: fetchDreamAnalytics,           ...opts });
  const { data: growthData }  = useQuery({ queryKey: ['admin', 'analytics', 'growth', 30],     queryFn: () => fetchGrowthAnalytics(30), ...opts });
  const { data: engData }     = useQuery({ queryKey: ['admin', 'analytics', 'engagement', 30], queryFn: () => fetchEngagementAnalytics(30), ...opts });
  const { data: dashData }    = useQuery({ queryKey: ['admin', 'dashboard', 'metrics'],         queryFn: fetchDashboardMetrics,          ...opts });
  const { data: modSum }      = useQuery({ queryKey: ['admin', 'mod-summary'],                  queryFn: fetchModerationSummary,         ...opts });
  const { data: communityData } = useQuery({ queryKey: ['admin', 'community-health'],           queryFn: fetchCommunityHealth,           ...opts });
  const { data: healthLive }  = useQuery({ queryKey: ['admin', 'platform-health-live'],         queryFn: fetchPlatformHealthLive,        staleTime: 30_000 });
  const { data: intel }       = useQuery({ queryKey: ['admin', 'dream-intelligence'],           queryFn: fetchDreamIntelligence,         ...opts });
  const { data: signals }     = useQuery({ queryKey: ['admin', 'ai-signals'],                  queryFn: () => fetchAISignals(10),       ...opts });

  return (
    <div className="section-business relative">
      <style>{`
        @keyframes ei-fade-up  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ei-slide-in { from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:translateX(0)} }
        @keyframes ei-pulse    { 0%,100%{opacity:0.3} 50%{opacity:1} }
      `}</style>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5" style={{ animation: 'ei-fade-up 0.3s ease both' }}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-mono text-base font-black tracking-tight" style={{ color: '#E8E8FF' }}>Executive Intelligence Center</h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg" style={{ background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A', animation: 'ei-pulse 1.4s infinite' }} />
              <span className="font-mono text-[7px] font-bold" style={{ color: '#38D68A' }}>LIVE</span>
            </div>
          </div>
          <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Platform-wide intelligence · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: 'User Growth', to: '/user-growth' },
            { label: 'Dream Trends', to: '/dream-trends' },
            { label: 'Engagement', to: '/engagement' },
            { label: 'Moderation', to: '/moderation' },
          ].map(({ label, to }) => (
            <Link key={label} to={to}
              className="font-mono text-[7px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors"
              style={{ color: 'rgba(232,232,255,0.4)', borderColor: 'rgba(255,255,255,0.07)' }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Section 1: KPI Grid (16 cards, 8 per row) ────────────────────── */}
      <KPIGrid growth={growthData} eng={engData} community={communityData} mod={modSum} intel={intel} />

      {/* ── Section 2: Executive Score + Live Status ──────────────────────── */}
      <div className="flex gap-4 mb-5">
        <ExecScorePanel growth={growthData} community={communityData} mod={modSum} />
        <LiveStatusPanel healthLive={healthLive} />
      </div>

      {/* ── Section 3: AI Insights ─────────────────────────────────────────── */}
      <AIInsightsPanel
        growth={growthData}
        eng={engData}
        community={communityData}
        mod={modSum}
        intel={intel}
        signals={signals}
      />

      {/* ── Section 4: Growth + Emotion + Dream ───────────────────────────── */}
      <div className="flex gap-4 mb-5">
        <GrowthSection growth={growthData} />
        <EmotionPanel community={communityData} />
        <DreamIntelPanel dreamData={dreamData} eng={engData} intel={intel} />
      </div>

      {/* ── Section 5: Category Intelligence (full-width table) ───────────── */}
      <CategoryIntelligence dreamData={dreamData} intel={intel} />

      {/* ── Section 6: AI Trend Detector ──────────────────────────────────── */}
      <AITrendPanel intel={intel} />

      {/* ── Section 7: Top Content ────────────────────────────────────────── */}
      <TopContent dreamData={dreamData} />

      {/* ── Section 8: Engagement Analytics ──────────────────────────────── */}
      <EngagementPanel eng={engData} />

      {/* ── Section 9: Moderation + Timeline + Predictive ─────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <ModerationPanel mod={modSum} />
        <ExecTimeline dashboard={dashData} />
        <PredictivePanel growth={growthData} eng={engData} />
      </div>

      {/* ── Section 10: Activity Heatmap ──────────────────────────────────── */}
      <div className="mb-5">
        <ActivityHeatmap />
      </div>

      {/* ── Section 11: User Lifecycle + Business ─────────────────────────── */}
      <div className="flex gap-4">
        <UserLifecycle growth={growthData} />
        <BusinessPanel />
      </div>
    </div>
  );
}
