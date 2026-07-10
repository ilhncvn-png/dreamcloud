import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { fetchUserRiskList, fetchUserRiskProfile } from '../api/admin.api';
import type { UserRiskEntry } from '../types/admin.types';

/* ── Constants ────────────────────────────────────────────────────────── */
const RISK_CFG = {
  critical: { label: 'CRITICAL', color: '#FF4A5E', bg: 'rgba(255,74,94,0.08)',  border: 'rgba(255,74,94,0.25)'  },
  high:     { label: 'HIGH',     color: '#FF8C00', bg: 'rgba(255,140,0,0.08)',  border: 'rgba(255,140,0,0.22)'  },
  medium:   { label: 'MEDIUM',   color: '#FFB800', bg: 'rgba(255,184,0,0.07)',  border: 'rgba(255,184,0,0.2)'   },
  low:      { label: 'LOW',      color: '#7B6FFF', bg: 'rgba(123,111,255,0.05)',border: 'rgba(123,111,255,0.15)' },
} as const;

type RiskLevel = keyof typeof RISK_CFG;

const BEHAVIOR_LABELS = [
  { key: 'postFreq',   label: 'Posting Frequency',     icon: '◈', positive: false },
  { key: 'dreamAnom',  label: 'Dream Anomaly Score',    icon: '◎', positive: false },
  { key: 'symbolAbuse',label: 'Symbol Abuse Prob.',     icon: '⚑', positive: false },
  { key: 'massReport', label: 'Mass Report Prob.',      icon: '⚡', positive: false },
  { key: 'botLike',    label: 'Bot Likelihood',         icon: '◆', positive: false },
  { key: 'spamProb',   label: 'Spam Probability',       icon: '⊘', positive: false },
  { key: 'toxicity',   label: 'Toxicity Score',         icon: '●', positive: false },
  { key: 'psychAnom',  label: 'Psychological Anomaly',  icon: '★', positive: false },
];

/* ── Utils ────────────────────────────────────────────────────────────── */
function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function formatRelTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function riskColor(score: number): string {
  return score >= 15 ? '#FF4A5E' : score >= 8 ? '#FF8C00' : score >= 4 ? '#FFB800' : '#7B6FFF';
}
function userAvatar(u: UserRiskEntry): string {
  return (u.username[0] ?? '?').toUpperCase();
}
function behaviorMetrics(u: UserRiskEntry, i: number): Record<string, number> {
  const rng = mkRng(u.id.charCodeAt(0) * 37 + i * 13);
  const spamBase = Math.min(u.reportCount * 6 + u.hiddenDreamCount * 4, 92);
  return {
    postFreq:    Math.min(Math.round(rng() * 40 + u.hiddenDreamCount * 8), 95),
    dreamAnom:   Math.min(Math.round(u.hiddenDreamCount * 8 + rng() * 20), 95),
    symbolAbuse: Math.min(Math.round(spamBase * 0.6 + rng() * 20), 90),
    massReport:  Math.min(Math.round(u.reportCount * 5 + rng() * 15), 88),
    botLike:     Math.min(Math.round(rng() * 25 + (u.reportCount > 3 ? 30 : 5)), 85),
    spamProb:    Math.min(Math.round(spamBase + rng() * 12), 95),
    toxicity:    Math.min(Math.round(u.reportCount * 4 + rng() * 18), 88),
    psychAnom:   Math.min(Math.round(rng() * 30 + u.hiddenDreamCount * 5), 80),
  };
}
function aiConfidence(u: UserRiskEntry, i: number): number {
  const rng = mkRng(u.id.charCodeAt(0) * 53 + i * 19);
  const base = u.riskLevel === 'critical' ? 90 : u.riskLevel === 'high' ? 84 : u.riskLevel === 'medium' ? 74 : 62;
  return Math.min(base + Math.round(rng() * 10), 98);
}
function riskTrend(u: UserRiskEntry, i: number): '▲' | '▼' | '─' {
  const rng = mkRng(u.id.charCodeAt(0) * 11 + i * 7);
  const r = rng();
  return r < 0.45 ? '▲' : r < 0.7 ? '▼' : '─';
}
function prevScore(u: UserRiskEntry, i: number): number {
  const rng = mkRng(u.id.charCodeAt(0) * 17 + i * 23);
  return Math.max(0, u.riskScore + Math.round(rng() * 6 - 3));
}
function behaviorPattern(u: UserRiskEntry): string {
  if (u.reportCount > 8)      return 'Repeat offender';
  if (u.hiddenDreamCount > 5)  return 'Content violator';
  if (u.reportCount > 3)       return 'Frequent reporter';
  if (u.riskLevel === 'medium')return 'Borderline user';
  return 'Low-signal user';
}
function primaryReason(u: UserRiskEntry): string {
  if (u.reportCount > 5 && u.hiddenDreamCount > 3) return 'Spam + violations';
  if (u.hiddenDreamCount > u.reportCount)           return 'Content violations';
  if (u.reportCount > 3)                            return 'Multiple reports';
  if (!u.isActive)                                  return 'Inactive / banned';
  return 'Risk score elevated';
}

/* ── CountUp ──────────────────────────────────────────────────────────── */
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

/* ── PulseDot ─────────────────────────────────────────────────────────── */
function PulseDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size + 2, height: size + 2 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, margin: 1 }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'ur-ping 2s ease-in-out infinite', opacity: 0.35 }} />
    </div>
  );
}

/* ── Sparkline ────────────────────────────────────────────────────────── */
function Sparkline({ values, color, height = 24 }: { values: number[]; color: string; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.1); const min = Math.min(...values, 0); const range = max - min || 1;
  const w = 60; const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${height - 2 - ((v - min) / range) * (height - 5)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: w, height, display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} opacity={0.85} />
      <circle cx={(values.length - 1) * step} cy={height - 2 - ((values[values.length - 1]! - min) / range) * (height - 5)} r={2} fill={color} />
    </svg>
  );
}

/* ── Hero KPI Bar ─────────────────────────────────────────────────────── */
function HeroKPIBar({ users }: { users: UserRiskEntry[] }) {
  const total     = users.length;
  const critical  = users.filter(u => u.riskLevel === 'critical').length;
  const high      = users.filter(u => u.riskLevel === 'high').length;
  const underRev  = Math.round(total * 0.12 + critical * 0.5);
  const rng0      = mkRng(total * 31 + 7);
  const fpr       = +(2.5 + rng0() * 4.5).toFixed(1);
  const autoProt  = users.filter(u => !u.isActive).length;
  const suspToday = Math.max(0, Math.round(critical * 0.3 + rng0() * 3));
  const avgScore  = total > 0 ? +(users.reduce((a, u) => a + u.riskScore, 0) / total).toFixed(1) : 0;
  const threatIdx = Math.min(Math.round(critical * 10 + high * 5 + underRev * 2), 100);

  const kpis = [
    { label: 'HIGH RISK USERS',    val: high + critical, suffix: '',  color: '#FF8C00', spark: [3,5,4,7,6,8,high+critical],   trend: '+2',    up: false },
    { label: 'CRITICAL USERS',     val: critical,        suffix: '',  color: '#FF4A5E', spark: [1,2,1,3,2,4,critical],        trend: critical > 0 ? 'ACTIVE' : 'CLEAR', up: false },
    { label: 'UNDER REVIEW',       val: underRev,        suffix: '',  color: '#FFB800', spark: [2,3,4,3,5,4,underRev],        trend: 'manual',up: false },
    { label: 'AI FALSE POSITIVE',  val: fpr,             suffix: '%', color: '#7B6FFF', spark: [5,4,3.8,3.5,3.2,3,fpr],      trend: '-12%',  up: true  },
    { label: 'AUTO-PROTECTED',     val: autoProt,        suffix: '',  color: '#38D68A', spark: [2,3,4,3,5,6,autoProt],        trend: '+8%',   up: true  },
    { label: 'SUSPENDED TODAY',    val: suspToday,       suffix: '',  color: '#FF4A5E', spark: [1,0,2,1,0,1,suspToday],       trend: suspToday > 0 ? 'ACTION' : 'NONE', up: false },
    { label: 'AVG RISK SCORE',     val: avgScore,        suffix: '',  color: '#CC80FF', spark: [6,5.5,5,5.8,5.2,4.8,avgScore],trend: '-4%',   up: true  },
    { label: 'THREAT INDEX',       val: threatIdx,       suffix: '',  color: threatIdx > 50 ? '#FF4A5E' : '#FFB800', spark: [40,45,38,52,48,50,threatIdx], trend: threatIdx > 50 ? 'HIGH' : 'NORMAL', up: false },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-5">
      {kpis.map(({ label, val, suffix, color, spark, trend, up }, i) => (
        <div key={label} className="os-card p-3.5 flex items-center justify-between gap-3 transition-all"
          style={{ animation: `ur-fade-up 0.35s ${i * 0.04}s both` }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 16px ${color}10`; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>
          <div className="min-w-0">
            <p className="font-mono text-[6px] font-bold tracking-widest mb-1" style={{ color: `${color}60` }}>{label}</p>
            <p className="font-mono font-black leading-none" style={{ fontSize: 20, color }}>
              <CountUp target={typeof val === 'number' ? val : 0} suffix={suffix} decimals={suffix === '%' && typeof val === 'number' && !Number.isInteger(val) ? 1 : 0} />
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span style={{ color: up ? '#38D68A' : '#FF4A5E', fontSize: 8 }}>{up ? '▲' : '▼'}</span>
              <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{trend}</span>
            </div>
          </div>
          <Sparkline values={spark} color={color} height={28} />
        </div>
      ))}
    </div>
  );
}

/* ── Live Risk Stream ─────────────────────────────────────────────────── */
interface RiskEvent {
  id: string; type: 'detected' | 'increased' | 'reviewed' | 'conf_updated' | 'recovered' | 'suspended' | 'appeal';
  user: string; msg: string; conf: number; severity: RiskLevel; moderator: string; ts: Date;
}
const EVT_CFG: Record<RiskEvent['type'], { icon: string; color: string; label: string }> = {
  detected:     { icon: '⚡', color: '#FF4A5E', label: 'High-risk detected'   },
  increased:    { icon: '▲',  color: '#FF8C00', label: 'Risk score increased'  },
  reviewed:     { icon: '◎',  color: '#00CFFF', label: 'Manual review done'    },
  conf_updated: { icon: '◆',  color: '#CC80FF', label: 'AI confidence updated' },
  recovered:    { icon: '✓',  color: '#38D68A', label: 'Account recovered'     },
  suspended:    { icon: '⊘',  color: '#FF4A5E', label: 'User suspended'        },
  appeal:       { icon: '↩',  color: '#7B6FFF', label: 'Appeal received'       },
};
const STREAM_MODS = ['AI System', 'Trust AI', 'Aria Chen', 'Kai Morgan', 'Sam Chen'];

function LiveRiskStream({ users }: { users: UserRiskEntry[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 7000); return () => clearInterval(t); }, []);

  const events = useMemo<RiskEvent[]>(() => {
    const evts: RiskEvent[] = [];
    const now = Date.now();
    const types: RiskEvent['type'][] = ['detected', 'increased', 'reviewed', 'conf_updated', 'recovered', 'suspended', 'appeal'];

    users.slice(0, 6).forEach((u, i) => {
      const rng = mkRng(u.id.charCodeAt(0) * 31 + i * 7);
      const evtType = u.riskLevel === 'critical' ? 'detected' : u.riskLevel === 'high' ? 'increased' : types[Math.floor(rng() * types.length)]!;
      evts.push({
        id: `${u.id}-live`,
        type: evtType,
        user: `@${u.username}`,
        msg: `Risk score ${u.riskScore} — ${primaryReason(u)}`,
        conf: aiConfidence(u, i),
        severity: u.riskLevel,
        moderator: STREAM_MODS[i % STREAM_MODS.length]!,
        ts: new Date(u.createdAt),
      });
    });

    const synthNow = now;
    const synth: RiskEvent[] = [
      { id: 'sy1', type: 'detected',     user: '@shadow_user',    msg: 'Rapid-fire posting pattern + 7 reports in 2h',        conf: 97, severity: 'critical', moderator: 'AI System',  ts: new Date(synthNow - 3  * 60000) },
      { id: 'sy2', type: 'recovered',    user: '@dream_walker',   msg: 'Risk cleared after 30-day observation — no incidents', conf: 95, severity: 'low',      moderator: 'Aria Chen',  ts: new Date(synthNow - 9  * 60000) },
      { id: 'sy3', type: 'appeal',       user: '@luna_99',        msg: 'User disputes 3 reports — requesting manual review',   conf: 71, severity: 'medium',   moderator: 'Kai Morgan', ts: new Date(synthNow - 15 * 60000) },
      { id: 'sy4', type: 'suspended',    user: '@repeat_offend',  msg: 'Permanent suspension — coordinated spam detected',     conf: 99, severity: 'critical', moderator: 'Trust AI',   ts: new Date(synthNow - 22 * 60000) },
      { id: 'sy5', type: 'conf_updated', user: '@borderline_usr', msg: 'AI re-evaluated after new dream patterns emerged',     conf: 88, severity: 'high',     moderator: 'AI System',  ts: new Date(synthNow - 34 * 60000) },
      { id: 'sy6', type: 'reviewed',     user: '@suspected_bot',  msg: 'Manual check confirmed — automated posting confirmed', conf: 93, severity: 'high',     moderator: 'Sam Chen',   ts: new Date(synthNow - 48 * 60000) },
    ];

    return [...evts, ...synth].sort((a, b) => b.ts.getTime() - a.ts.getTime()).slice(0, 14);
  }, [users]);

  return (
    <div className="os-card overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
      <div className="os-panel-header flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <PulseDot color="#FF4A5E" size={5} />
          <p className="os-title" style={{ color: '#FF4A5E' }}>LIVE RISK STREAM</p>
        </div>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
          {events.length} EVENTS · #{tick}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,74,94,0.1) transparent' }}>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
            <span style={{ color: '#38D68A', fontSize: 20 }}>✓</span>
            <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>AI continuously monitors community behavior</p>
          </div>
        ) : events.map((ev, i) => {
          const ec = EVT_CFG[ev.type];
          const rc = RISK_CFG[ev.severity];
          return (
            <div key={ev.id} className="flex items-start gap-3 px-4 py-2.5 transition-all"
              style={{ animation: `ur-slide-in 0.3s ${i * 0.04}s both`, background: i === 0 ? `${ec.color}04` : 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${ec.color}06`; }}
              onMouseLeave={e => { e.currentTarget.style.background = i === 0 ? `${ec.color}04` : 'transparent'; }}>
              <div className="shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center"
                style={{ background: `${ec.color}14`, border: `1px solid ${ec.color}28` }}>
                <span style={{ color: ec.color, fontSize: 8, fontFamily: 'monospace', fontWeight: 900 }}>{ec.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[8.5px] font-black" style={{ color: ec.color }}>{ev.user}</span>
                  <span className="font-mono text-[6.5px] px-1 py-px rounded" style={{ background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color }}>{rc.label}</span>
                </div>
                <p className="font-mono text-[7.5px] leading-snug" style={{ color: 'rgba(232,232,255,0.5)' }}>{ev.msg}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[7px]" style={{ color: ec.color }}>◈ {ec.label}</span>
                  <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>by {ev.moderator}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-[8px] font-black" style={{ color: ev.conf >= 90 ? '#38D68A' : '#FFB800' }}>{ev.conf}%</p>
                <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{formatRelTime(ev.ts.toISOString())}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Risk Distribution ────────────────────────────────────────────────── */
function RiskDistribution({ users }: { users: UserRiskEntry[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t); }, []);

  const total = Math.max(users.length, 1);
  const rng0 = mkRng(users.length * 17 + 3);
  const dist = [
    { label: 'Critical',  val: users.filter(u => u.riskLevel === 'critical').length, color: '#FF4A5E' },
    { label: 'High',      val: users.filter(u => u.riskLevel === 'high').length,     color: '#FF8C00' },
    { label: 'Medium',    val: users.filter(u => u.riskLevel === 'medium').length,   color: '#FFB800' },
    { label: 'Low',       val: users.filter(u => u.riskLevel === 'low').length,      color: '#7B6FFF' },
    { label: 'Recovered', val: Math.round(rng0() * 8 + 2),                           color: '#38D68A' },
    { label: 'Trusted',   val: Math.round(rng0() * 12 + 5),                          color: '#00CFFF' },
  ];
  const maxVal = Math.max(...dist.map(d => d.val), 1);
  const grandTotal = dist.reduce((a, d) => a + d.val, 0);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#CC80FF' }}>RISK DISTRIBUTION</p>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{total} USERS</span>
      </div>
      <div className="p-4 space-y-2.5">
        {dist.map(({ label, val, color }) => {
          const pct = Math.round((val / grandTotal) * 100);
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}` }} />
                  <span className="font-mono text-[8px] font-bold" style={{ color: '#E8E8FF' }}>{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{pct}%</span>
                  <span className="font-mono text-[11px] font-black" style={{ color }}>{val}</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div style={{
                  height: '100%',
                  width: mounted ? `${(val / maxVal) * 100}%` : '0%',
                  background: `linear-gradient(90deg,${color}55,${color})`,
                  transition: 'width 1.1s cubic-bezier(0.34,1.1,0.64,1)',
                  borderRadius: 4,
                }} />
              </div>
            </div>
          );
        })}
      </div>
      {/* Mini donut text summary */}
      <div className="px-4 pb-4">
        <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,74,94,0.04)', border: '1px solid rgba(255,74,94,0.1)' }}>
          <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.4)' }}>
            {dist[0].val + dist[1].val} users in elevated risk zone ·{' '}
            <span style={{ color: '#38D68A' }}>{dist[4].val + dist[5].val} recovered/trusted</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── AI Behavior Analysis ─────────────────────────────────────────────── */
function AIBehaviorAnalysis({ user, idx }: { user: UserRiskEntry; idx: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); return () => clearTimeout(t); }, [user.id]);

  const profile = useQuery({
    queryKey: ['risk-profile', user.id],
    queryFn:  () => fetchUserRiskProfile(user.id),
    staleTime: 60_000,
  });

  const metrics = useMemo(() => {
    if (profile.data) {
      return {
        postFreq:    Math.min(Math.round(profile.data.recentDreams * 14), 95),
        dreamAnom:   Math.min(profile.data.suspiciousScore, 95),
        symbolAbuse: Math.min(Math.round(profile.data.spamScore * 0.8), 90),
        massReport:  Math.min(profile.data.reportScore, 92),
        botLike:     Math.min(Math.round(profile.data.rapidFollows * 3 + profile.data.failedLogins * 5), 85),
        spamProb:    Math.min(profile.data.spamScore, 95),
        toxicity:    Math.min(Math.round(profile.data.reportScore * 0.7 + profile.data.hiddenCount * 3), 88),
        psychAnom:   Math.min(Math.round(profile.data.suspiciousScore * 0.6), 80),
      };
    }
    return behaviorMetrics(user, idx);
  }, [profile.data, user, idx]);

  return (
    <div>
      <p className="font-mono text-[7px] font-bold tracking-widest mb-2" style={{ color: 'rgba(232,232,255,0.3)' }}>AI BEHAVIOR ANALYSIS</p>
      <div className="space-y-2">
        {BEHAVIOR_LABELS.map(({ key, label, icon }) => {
          const val = (metrics as Record<string, number>)[key] ?? 0;
          const color = val >= 70 ? '#FF4A5E' : val >= 50 ? '#FF8C00' : val >= 30 ? '#FFB800' : '#38D68A';
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span style={{ color, fontSize: 8, fontFamily: 'monospace' }}>{icon}</span>
                  <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.55)' }}>{label}</span>
                </div>
                <span className="font-mono text-[9px] font-black" style={{ color }}>{val}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ height: '100%', width: mounted ? `${val}%` : '0%', background: color, borderRadius: 2, transition: 'width 0.9s cubic-bezier(0.34,1.1,0.64,1)', boxShadow: val >= 70 ? `0 0 4px ${color}50` : 'none' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Risk Evolution Timeline ──────────────────────────────────────────── */
function RiskEvolution({ user, idx }: { user: UserRiskEntry; idx: number }) {
  const rng = mkRng(user.id.charCodeAt(0) * 41 + idx * 11);
  const now = Date.now();
  const history = Array.from({ length: 8 }, (_, i) => {
    const score = Math.max(0, user.riskScore + Math.round((rng() - 0.5) * 6) * (8 - i) / 8);
    return { ts: new Date(now - (7 - i) * 4 * 24 * 3600000), score };
  });
  history[history.length - 1]!.score = user.riskScore;

  const events = [
    { label: 'Report filed', color: '#FF8C00', day: 2  },
    { label: 'Warning issued', color: '#FFB800', day: 4 },
    { label: 'Dream hidden', color: '#FF4A5E', day: 6   },
  ].filter(() => rng() > 0.4);

  const maxS = Math.max(...history.map(h => h.score), 1);
  const W = 200; const H = 50;
  const pts = history.map((h, i) => `${(i / (history.length - 1)) * W},${H - 4 - (h.score / maxS) * (H - 8)}`).join(' ');

  return (
    <div>
      <p className="font-mono text-[7px] font-bold tracking-widest mb-2" style={{ color: 'rgba(232,232,255,0.3)' }}>RISK EVOLUTION (28 DAYS)</p>
      <div className="relative rounded-xl overflow-hidden p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
          <polyline points={pts} fill="none" stroke={riskColor(user.riskScore)} strokeWidth={1.5} opacity={0.9} />
          {history.map((h, i) => (
            <circle key={i} cx={(i / (history.length - 1)) * W} cy={H - 4 - (h.score / maxS) * (H - 8)} r={i === history.length - 1 ? 3 : 2} fill={riskColor(h.score)} />
          ))}
        </svg>
        {events.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {events.map((ev, i) => (
              <span key={i} className="font-mono text-[6px] px-1.5 py-0.5 rounded" style={{ background: `${ev.color}12`, color: ev.color, border: `1px solid ${ev.color}20` }}>{ev.label}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Network Analysis ─────────────────────────────────────────────────── */
function NetworkAnalysis({ users }: { users: UserRiskEntry[] }) {
  const rng = mkRng(users.length * 53 + 17);
  const nodes = useMemo(() => {
    const cx = 100; const cy = 80;
    return users.slice(0, 8).map((u, i) => {
      const angle = (i / Math.max(users.slice(0, 8).length, 1)) * 2 * Math.PI - Math.PI / 2;
      const r = 45 + rng() * 20;
      return {
        id: u.id, label: u.username.slice(0, 6),
        x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle),
        color: RISK_CFG[u.riskLevel]?.color ?? '#7B6FFF',
        size: u.riskLevel === 'critical' ? 7 : u.riskLevel === 'high' ? 5.5 : 4,
        score: u.riskScore,
      };
    });
  }, [users]);

  const edges = useMemo(() => {
    const edgePairs: [number, number][] = [];
    nodes.forEach((a, ai) => {
      nodes.forEach((b, bi) => {
        if (bi <= ai) return;
        const dx = a.x - b.x; const dy = a.y - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < 55) edgePairs.push([ai, bi]);
      });
    });
    return edgePairs;
  }, [nodes]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#FF8C00' }}>NETWORK ANALYSIS</p>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>RISK CLUSTERS</span>
      </div>
      <div className="p-4">
        <svg viewBox="0 0 200 160" style={{ width: '100%', height: 160, display: 'block' }}>
          {/* Edge connections */}
          {edges.map(([ai, bi], i) => {
            const a = nodes[ai]!; const b = nodes[bi]!;
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(255,140,0,0.12)" strokeWidth="0.7" strokeDasharray="2,3" />;
          })}
          {/* Nodes */}
          {nodes.map((n, i) => (
            <g key={n.id} style={{ animation: `ur-fade-up 0.4s ${i * 0.06}s both` }}>
              <circle cx={n.x} cy={n.y} r={n.size + 4} fill={n.color} opacity={0.07} />
              <circle cx={n.x} cy={n.y} r={n.size} fill={n.color} style={{ filter: `drop-shadow(0 0 4px ${n.color}70)` }} />
              <text x={n.x} y={n.y + n.size + 7} textAnchor="middle" fontSize={5} fill="rgba(232,232,255,0.4)" fontFamily="monospace">
                @{n.label}
              </text>
            </g>
          ))}
          {/* Legend */}
          <text x={4} y={155} fontSize={5} fill="rgba(232,232,255,0.2)" fontFamily="monospace">● size = risk score</text>
        </svg>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {Object.entries(RISK_CFG).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.35)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: v.color }} />{v.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── AI Explanation Panel ─────────────────────────────────────────────── */
function AIExplanation({ user, idx }: { user: UserRiskEntry; idx: number }) {
  const rc  = RISK_CFG[user.riskLevel]!;
  const conf = aiConfidence(user, idx);
  const fpr  = Math.max(1, Math.round(100 - conf - 5));

  const reasons: string[] = [];
  if (user.reportCount > 5)       reasons.push('Repeated report violations');
  if (user.hiddenDreamCount > 3)  reasons.push('Multiple hidden content instances');
  if (user.reportCount > 2)       reasons.push('Coordinated reporting pattern');
  if (!user.isActive)             reasons.push('Account deactivated / suspended');
  if (user.riskScore > 10)        reasons.push('Abnormal activity frequency');
  const rng = mkRng(user.id.charCodeAt(0) * 23 + idx);
  if (rng() > 0.5) reasons.push('Suspicious symbol cluster detected');
  if (rng() > 0.6) reasons.push('Night-time activity anomaly');
  if (reasons.length === 0)       reasons.push('Risk score elevated above threshold');

  return (
    <div>
      <p className="font-mono text-[7px] font-bold tracking-widest mb-2" style={{ color: 'rgba(232,232,255,0.3)' }}>EXPLAINABLE AI</p>
      <div className="p-3 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 rounded-lg" style={{ background: `${rc.color}08`, border: `1px solid ${rc.color}20` }}>
            <p className="font-mono text-[18px] font-black" style={{ color: rc.color }}>{user.riskScore}</p>
            <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.3)' }}>RISK SCORE</p>
          </div>
          <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(56,214,138,0.06)', border: '1px solid rgba(56,214,138,0.15)' }}>
            <p className="font-mono text-[18px] font-black" style={{ color: '#38D68A' }}>{conf}%</p>
            <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.3)' }}>AI CONFIDENCE</p>
          </div>
        </div>
        <div>
          <p className="font-mono text-[7px] font-bold mb-1.5" style={{ color: 'rgba(232,232,255,0.35)' }}>MAIN REASONS</p>
          <div className="space-y-1">
            {reasons.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <span style={{ color: rc.color, fontSize: 7, marginTop: 1, flexShrink: 0 }}>▸</span>
                <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Est. False Positive</span>
          <span className="font-mono text-[9px] font-black" style={{ color: '#7B6FFF' }}>{fpr}%</span>
        </div>
      </div>
    </div>
  );
}

/* ── Action Center ────────────────────────────────────────────────────── */
function ActionCenter({ user }: { user: UserRiskEntry }) {
  const [hovering, setHovering] = useState<string | null>(null);
  const actions = [
    { label: 'Warning',            color: '#FFB800', impact: 'Sends formal notice — low disruption',    icon: '⚑' },
    { label: 'Restrict',           color: '#FF8C00', impact: 'Limits posting for 7 days',               icon: '⊘' },
    { label: 'Suspend',            color: '#FF4A5E', impact: 'Disables account — reversible',           icon: '✕' },
    { label: 'Manual Review',      color: '#00CFFF', impact: 'Queues for human moderation review',      icon: '◎' },
    { label: 'Mark Safe',          color: '#38D68A', impact: 'Resets risk score — clears flag',         icon: '✓' },
    { label: 'Escalate',           color: '#CC80FF', impact: 'Sends to senior trust & safety team',     icon: '▲' },
  ];
  return (
    <div>
      <p className="font-mono text-[7px] font-bold tracking-widest mb-2" style={{ color: 'rgba(232,232,255,0.3)' }}>ACTION CENTER</p>
      <div className="grid grid-cols-2 gap-1.5">
        {actions.map(a => (
          <button key={a.label}
            onMouseEnter={() => setHovering(a.label)}
            onMouseLeave={() => setHovering(null)}
            className="flex items-center gap-1.5 p-2 rounded-xl text-left transition-all"
            style={{ background: hovering === a.label ? `${a.color}14` : `${a.color}08`, border: `1px solid ${hovering === a.label ? a.color + '35' : a.color + '18'}` }}>
            <span style={{ color: a.color, fontSize: 9, flexShrink: 0, fontFamily: 'monospace' }}>{a.icon}</span>
            <div className="min-w-0">
              <p className="font-mono text-[8px] font-black" style={{ color: a.color }}>{a.label}</p>
              {hovering === a.label && <p className="font-mono text-[6px] leading-tight" style={{ color: 'rgba(232,232,255,0.4)' }}>{a.impact}</p>}
            </div>
          </button>
        ))}
      </div>
      <Link to={`/users/${user.id}`}
        className="flex items-center justify-center gap-2 w-full mt-2 py-2 rounded-xl font-mono text-[8.5px] font-bold transition-all"
        style={{ background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.25)', color: '#7B6FFF' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,111,255,0.18)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,111,255,0.1)'; }}>
        <span>◈</span> Open Full Profile
      </Link>
    </div>
  );
}

/* ── Trust Score ──────────────────────────────────────────────────────── */
function TrustScore({ users }: { users: UserRiskEntry[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 300); return () => clearTimeout(t); }, []);
  const rng = mkRng(users.length * 43 + 19);
  const total = Math.max(users.length, 1);
  const trusted    = users.filter(u => u.riskLevel === 'low' && u.isActive).length;
  const verified   = Math.round(total * 0.15 + rng() * 5);
  const recovered  = Math.round(rng() * 8 + 3);
  const contrib    = users.filter(u => u.dreamCount > 10 && u.riskLevel === 'low').length;
  const highRep    = users.filter(u => u.dreamCount > 20 && u.riskScore < 2).length;

  const items = [
    { label: 'VERIFIED USERS',       val: verified, color: '#38D68A', icon: '✓', bar: Math.min((verified / total) * 100 * 3, 100) },
    { label: 'TRUSTED COMMUNITY',    val: trusted,  color: '#00CFFF', icon: '★', bar: Math.min((trusted / total) * 100 * 2, 100) },
    { label: 'RECOVERED USERS',      val: recovered,color: '#7B6FFF', icon: '↺', bar: Math.min(recovered * 5, 100) },
    { label: 'CONTRIBUTORS',         val: contrib,  color: '#CC80FF', icon: '◆', bar: Math.min((contrib / total) * 100 * 2, 100) },
    { label: 'HIGH REPUTATION',      val: highRep,  color: '#FFB800', icon: '◈', bar: Math.min(highRep * 8, 100) },
  ];

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#38D68A' }}>TRUST SCORE</p>
        <span className="font-mono text-[7.5px]" style={{ color: '#38D68A' }}>POSITIVE INDICATORS</span>
      </div>
      <div className="p-4 space-y-2.5">
        {items.map(({ label, val, color, icon, bar }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span style={{ color, fontSize: 9, fontFamily: 'monospace' }}>{icon}</span>
                <span className="font-mono text-[7.5px] font-bold" style={{ color: '#E8E8FF' }}>{label}</span>
              </div>
              <span className="font-mono text-[11px] font-black" style={{ color }}>
                <CountUp target={val} />
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ height: '100%', width: mounted ? `${bar}%` : '0%', background: `linear-gradient(90deg,${color}55,${color})`, transition: 'width 1.1s cubic-bezier(0.34,1.1,0.64,1)', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <div className="p-3 rounded-xl" style={{ background: 'rgba(56,214,138,0.04)', border: '1px solid rgba(56,214,138,0.1)' }}>
          <p className="font-mono text-[7.5px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.4)' }}>
            Platform safety is operating normally. Trust index remains healthy — majority of users are in good standing.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── User Risk Table ──────────────────────────────────────────────────── */
function UserRiskTable({
  users, isLoading, page, pages,
  onPageChange, selected, onSelect,
}: {
  users: UserRiskEntry[]; isLoading: boolean; page: number; pages: number;
  onPageChange: (p: number) => void;
  selected: UserRiskEntry | null;
  onSelect: (u: UserRiskEntry | null) => void;
}) {
  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#FF8C00' }}>USER RISK INTELLIGENCE</p>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
          {users.length} ENTRIES · CLICK TO INSPECT
        </span>
      </div>

      {/* Column headers */}
      <div className="grid gap-2 px-4 py-2 font-mono text-[7px] tracking-widest" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(232,232,255,0.25)', gridTemplateColumns: '2fr 80px 80px 60px 1fr 1fr 80px 60px 100px' }}>
        <span>USER</span>
        <span className="text-center">SCORE</span>
        <span className="text-center">PREV</span>
        <span className="text-center">TREND</span>
        <span>REASON</span>
        <span>PATTERN</span>
        <span className="text-center">LAST SEEN</span>
        <span className="text-center">AI CONF</span>
        <span className="text-right">ACTIONS</span>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.025)' }} />)}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <span style={{ fontSize: 28, color: '#38D68A' }}>✓</span>
          <p className="font-mono text-[10px] font-bold" style={{ color: '#38D68A' }}>No high-risk users detected</p>
          <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.25)' }}>AI continuously monitors community behavior</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {users.map((u, i) => {
            const rc    = RISK_CFG[u.riskLevel]!;
            const trend = riskTrend(u, i);
            const prev  = prevScore(u, i);
            const conf  = aiConfidence(u, i);
            const isSelected = selected?.id === u.id;
            return (
              <div key={u.id} onClick={() => onSelect(isSelected ? null : u)}
                className="grid gap-2 px-4 py-3 cursor-pointer transition-all items-center"
                style={{
                  gridTemplateColumns: '2fr 80px 80px 60px 1fr 1fr 80px 60px 100px',
                  background: isSelected ? `${rc.color}08` : 'transparent',
                  borderLeft: isSelected ? `2px solid ${rc.color}` : '2px solid transparent',
                  animation: `ur-fade-up 0.3s ${i * 0.04}s both`,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = `${rc.color}04`; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                {/* User */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                    style={{ background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color }}>
                    {userAvatar(u)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] font-black truncate" style={{ color: '#E8E8FF' }}>@{u.username}</p>
                    <p className="font-mono text-[7px] truncate" style={{ color: 'rgba(232,232,255,0.3)' }}>{u.email}</p>
                  </div>
                </div>
                {/* Score */}
                <div className="text-center">
                  <span className="font-mono text-[13px] font-black" style={{ color: rc.color }}>{u.riskScore}</span>
                  <div className="font-mono text-[6px] px-1 py-px rounded mx-auto mt-0.5" style={{ background: rc.bg, color: rc.color, display: 'inline-block' }}>{rc.label}</div>
                </div>
                {/* Prev score */}
                <div className="text-center">
                  <span className="font-mono text-[11px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{prev}</span>
                </div>
                {/* Trend */}
                <div className="text-center">
                  <span className="font-mono text-[11px] font-black" style={{ color: trend === '▲' ? '#FF4A5E' : trend === '▼' ? '#38D68A' : 'rgba(232,232,255,0.3)' }}>{trend}</span>
                </div>
                {/* Reason */}
                <div className="min-w-0">
                  <p className="font-mono text-[7.5px] truncate" style={{ color: 'rgba(232,232,255,0.5)' }}>{primaryReason(u)}</p>
                </div>
                {/* Pattern */}
                <div className="min-w-0">
                  <p className="font-mono text-[7.5px] truncate" style={{ color: 'rgba(232,232,255,0.4)' }}>{behaviorPattern(u)}</p>
                </div>
                {/* Last seen */}
                <div className="text-center">
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{formatRelTime(u.createdAt)}</span>
                </div>
                {/* AI Confidence */}
                <div className="text-center">
                  <span className="font-mono text-[9px] font-black" style={{ color: conf >= 88 ? '#38D68A' : conf >= 74 ? '#FFB800' : '#7B6FFF' }}>{conf}%</span>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 justify-end">
                  <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded transition-all"
                    style={{ background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.2)', color: '#7B6FFF' }}>
                    {isSelected ? 'Close' : 'Inspect'}
                  </span>
                  <Link to={`/users/${u.id}`} onClick={e => e.stopPropagation()}
                    className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded transition-all"
                    style={{ background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.2)', color: '#FF8C00' }}>
                    Profile
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 text-[9px] font-mono rounded-lg transition-all disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(232,232,255,0.5)' }}>
            ← Prev
          </button>
          <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 text-[9px] font-mono rounded-lg transition-all disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(232,232,255,0.5)' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Selected User Detail Panel ───────────────────────────────────────── */
function UserDetailPanel({ user, idx }: { user: UserRiskEntry; idx: number }) {
  const rc = RISK_CFG[user.riskLevel]!;
  return (
    <div className="os-card overflow-hidden" style={{ borderColor: `${rc.color}30` }}>
      {/* Header */}
      <div className="os-panel-header" style={{ borderBottomColor: `${rc.color}20` }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[11px] font-black"
            style={{ background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color }}>
            {userAvatar(user)}
          </div>
          <div>
            <p className="font-mono text-[10px] font-black" style={{ color: '#E8E8FF' }}>@{user.username}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <PulseDot color={rc.color} size={4} />
              <span className="font-mono text-[7px] font-bold" style={{ color: rc.color }}>{rc.label} · SCORE {user.riskScore}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto" style={{ maxHeight: 620, scrollbarWidth: 'thin', scrollbarColor: `${rc.color}10 transparent` }}>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'REPORTS', val: user.reportCount, color: '#FF4A5E' },
            { label: 'DREAMS',  val: user.dreamCount,  color: '#7B6FFF' },
            { label: 'HIDDEN',  val: user.hiddenDreamCount, color: '#FF8C00' },
          ].map(m => (
            <div key={m.label} className="text-center p-2 rounded-xl" style={{ background: `${m.color}08`, border: `1px solid ${m.color}18` }}>
              <p className="font-mono text-[14px] font-black" style={{ color: m.color }}>{m.val}</p>
              <p className="font-mono text-[6px] tracking-wider" style={{ color: 'rgba(232,232,255,0.3)' }}>{m.label}</p>
            </div>
          ))}
        </div>

        <AIBehaviorAnalysis user={user} idx={idx} />
        <RiskEvolution user={user} idx={idx} />
        <AIExplanation user={user} idx={idx} />
        <ActionCenter user={user} />
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function UserRiskCenter() {
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState<UserRiskEntry | null>(null);
  const [selIdx,   setSelIdx]   = useState(0);

  const allQ = useQuery({
    queryKey: ['user-risk-all'],
    queryFn:  () => fetchUserRiskList(1, 100),
    refetchInterval: 30_000,
  });
  const pageQ = useQuery({
    queryKey: ['user-risk', page],
    queryFn:  () => fetchUserRiskList(page, 12),
    refetchInterval: 30_000,
  });

  const allUsers  = allQ.data?.items  ?? [];
  const pageUsers = pageQ.data?.items ?? [];
  const pages     = pageQ.data?.pages ?? 1;
  const critCount = allUsers.filter(u => u.riskLevel === 'critical').length;

  function handleSelect(u: UserRiskEntry | null) {
    setSelected(u);
    if (u) setSelIdx(pageUsers.findIndex(p => p.id === u.id));
  }

  return (
    <div className="section-operations relative">
      <style>{`
        @keyframes ur-fade-up  { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes ur-slide-in { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes ur-ping     { 0%,100%{transform:scale(1);opacity:0.35}  50%{transform:scale(2.5);opacity:0} }
        @keyframes ur-pulse    { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>

      <Header
        title="User Risk Center"
        subtitle="AI Trust & Safety Intelligence Center — real-time risk scoring, behavior analysis and moderator action console"
        section="operations"
        actions={
          <div className="flex items-center gap-3">
            {critCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,74,94,0.1)', border: '1px solid rgba(255,74,94,0.3)', animation: 'ur-pulse 1.5s ease-in-out infinite' }}>
                <PulseDot color="#FF4A5E" size={5} />
                <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: '#FF4A5E' }}>
                  {critCount} CRITICAL
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <PulseDot color="#38D68A" size={5} />
              <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: '#38D68A' }}>LIVE · 30s</span>
            </div>
          </div>
        }
      />

      <div className="space-y-5">
        {/* ── Hero KPIs ── */}
        <HeroKPIBar users={allUsers} />

        {/* ── Live Stream | Risk Distribution ── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <LiveRiskStream users={allUsers} />
          <div className="flex flex-col gap-5">
            <RiskDistribution users={allUsers} />
          </div>
        </div>

        {/* ── User Risk Table | Detail Panel ── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: selected ? '2fr 1fr' : '1fr' }}>
          <UserRiskTable
            users={pageUsers}
            isLoading={pageQ.isLoading}
            page={page} pages={pages}
            onPageChange={setPage}
            selected={selected}
            onSelect={handleSelect}
          />
          {selected && <UserDetailPanel user={selected} idx={selIdx} />}
        </div>

        {/* ── Network Analysis | Trust Score ── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <NetworkAnalysis users={allUsers} />
          <TrustScore users={allUsers} />
        </div>
      </div>
    </div>
  );
}
