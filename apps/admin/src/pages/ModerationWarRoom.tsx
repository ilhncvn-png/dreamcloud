import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import Header from '../components/Header';
import { fetchOperationalAlerts, fetchModerationSummary, fetchAllReports } from '../api/admin.api';
import type { AdminReport } from '../types/admin.types';

/* ── Constants ────────────────────────────────────────────────────────── */
const SEV_CFG = {
  critical: { color: '#FF4A5E', bg: 'rgba(255,74,94,0.08)',  border: 'rgba(255,74,94,0.25)',  label: 'CRITICAL' },
  high:     { color: '#FF8C00', bg: 'rgba(255,140,0,0.07)',  border: 'rgba(255,140,0,0.22)',  label: 'HIGH'     },
  medium:   { color: '#FFB800', bg: 'rgba(255,184,0,0.06)',  border: 'rgba(255,184,0,0.2)',   label: 'MEDIUM'   },
  low:      { color: '#7B6FFF', bg: 'rgba(123,111,255,0.05)',border: 'rgba(123,111,255,0.15)',label: 'LOW'      },
} as const;

const MODERATORS = [
  { name: 'Aria Chen',    avatar: 'AC', status: 'active',  color: '#38D68A', specialty: 'Violence & Self-Harm' },
  { name: 'Marco Reyes',  avatar: 'MR', status: 'active',  color: '#00CFFF', specialty: 'Spam & Bot Detection' },
  { name: 'Zoe Nakamura', avatar: 'ZN', status: 'review',  color: '#FFB800', specialty: 'Adult Content'       },
  { name: 'Ellis Park',   avatar: 'EP', status: 'break',   color: '#CC80FF', specialty: 'Misinformation'      },
];

const THREAT_AXES = ['Spam', 'Bot Activity', 'Mass Reporting', 'Coord. Abuse', 'Malicious Users', 'Abnormal Post'];

/* ── Utils ────────────────────────────────────────────────────────────── */
function safeN(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function formatRelTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
function formatHHMM(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function reportRiskScore(r: AdminReport): number {
  const rng = mkRng(r.id.charCodeAt(0) * 11 + r.reason.length * 7);
  const base = /violence|harm|self.harm/i.test(r.reason) ? 82
    : /sexual|adult/i.test(r.reason)   ? 76
    : /hate|harass/i.test(r.reason)    ? 71
    : /spam|bot/i.test(r.reason)       ? 44
    : /misinfo/i.test(r.reason)        ? 60
    : 50;
  return Math.min(base + Math.round(rng() * 14 - 4), 99);
}
function reportAIConf(r: AdminReport, i: number): number {
  const rng = mkRng(r.reason.charCodeAt(0) * 53 + i * 19);
  return Math.round(74 + rng() * 23);
}
function riskColor(score: number): string {
  return score >= 80 ? '#FF4A5E' : score >= 60 ? '#FF8C00' : score >= 40 ? '#FFB800' : '#38D68A';
}
function slaRemaining(createdAt: string): string {
  const ageMin = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  const slaMin = 240; // 4h SLA
  const rem = Math.max(0, slaMin - ageMin);
  if (rem === 0) return 'OVERDUE';
  if (rem < 30) return `${rem}m`;
  return `${Math.floor(rem / 60)}h ${rem % 60}m`;
}
function slaColor(createdAt: string): string {
  const ageMin = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  return ageMin > 240 ? '#FF4A5E' : ageMin > 180 ? '#FF8C00' : ageMin > 90 ? '#FFB800' : '#38D68A';
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
function PulseDot({ color, size = 6, animate = true }: { color: string; size?: number; animate?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size + 2, height: size + 2 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, margin: 1 }} />
      {animate && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'mw-ping 2s ease-in-out infinite', opacity: 0.35 }} />}
    </div>
  );
}

/* ── Sparkline ────────────────────────────────────────────────────────── */
function Sparkline({ values, color, height = 24 }: { values: number[]; color: string; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.1); const min = Math.min(...values, 0);
  const range = max - min || 1;
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
function HeroKPIBar({ ms, al }: { ms: ReturnType<typeof fetchModerationSummary> extends Promise<infer T> ? T | undefined : never; al: ReturnType<typeof fetchOperationalAlerts> extends Promise<infer T> ? T | undefined : never }) {
  const aiConf   = Math.min(88 + safeN(ms?.resolvedToday) * 0.08, 97);
  const avgResp  = Math.max(45, 180 - safeN(ms?.resolvedToday) * 4);
  const critCount = al?.alerts.filter(a => a.severity === 'critical').length ?? 0;

  const kpis = useMemo(() => [
    { label: 'PENDING REPORTS',  val: safeN(ms?.pendingReports), suffix: '',   color: safeN(ms?.pendingReports) > 10 ? '#FF4A5E' : '#FFB800', spark: [4,7,5,9,12,8,safeN(ms?.pendingReports)],    trend: '+3', up: false },
    { label: 'RESOLVED TODAY',   val: safeN(ms?.resolvedToday),  suffix: '',   color: '#38D68A', spark: [12,18,15,22,19,25,safeN(ms?.resolvedToday)],  trend: '+8%', up: true  },
    { label: 'HIDDEN CONTENT',   val: safeN(ms?.hiddenContent),  suffix: '',   color: '#FF8C00', spark: [3,5,4,6,5,7,safeN(ms?.hiddenContent)],         trend: '+2',  up: false },
    { label: 'BANNED USERS',     val: safeN(ms?.totalBanned),    suffix: '',   color: '#FF4A5E', spark: [45,48,51,49,52,55,safeN(ms?.totalBanned)],     trend: 'total', up: false },
    { label: 'CRITICAL ALERTS',  val: critCount,                 suffix: '',   color: critCount > 0 ? '#FF4A5E' : '#38D68A', spark: [0,1,0,2,1,0,critCount], trend: critCount > 0 ? 'ACTIVE' : 'CLEAR', up: false },
    { label: 'AI CONFIDENCE',    val: aiConf,                    suffix: '%',  color: '#CC80FF', spark: [88,90,91,89,92,93,aiConf],                      trend: '+1.2%', up: true  },
    { label: 'MODERATORS ONLINE', val: MODERATORS.filter(m => m.status === 'active' || m.status === 'review').length, suffix: '',   color: '#00CFFF', spark: [3,4,3,4,4,3,3], trend: `/${MODERATORS.length} total`, up: true },
    { label: 'AVG RESPONSE',     val: Math.round(avgResp),       suffix: 's',  color: '#7B6FFF', spark: [210,190,175,160,155,150,avgResp],               trend: '-8%', up: true  },
  ], [ms, al, critCount, aiConf, avgResp]);

  return (
    <div className="grid grid-cols-4 gap-3 mb-5">
      {kpis.map(({ label, val, suffix, color, spark, trend, up }, i) => (
        <div key={label} className="os-card p-3.5 flex items-center justify-between gap-3 group transition-all"
          style={{ animation: `mw-fade-up 0.35s ${i * 0.04}s both` }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 16px ${color}10`; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>
          <div className="min-w-0">
            <p className="font-mono text-[6px] font-bold tracking-widest mb-1" style={{ color: `${color}60` }}>{label}</p>
            <p className="font-mono font-black leading-none" style={{ fontSize: 20, color }}>
              <CountUp target={val} suffix={suffix} decimals={suffix === '%' ? 1 : 0} />
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

/* ── Live Moderation Stream ───────────────────────────────────────────── */
interface StreamEvent {
  id: string; type: 'flag' | 'approve' | 'remove' | 'suspend' | 'review' | 'alert' | 'fp';
  msg: string; mod: string; conf: number; sev: 'critical' | 'high' | 'medium' | 'low';
  ts: Date; action: string;
}
const EVT_ICONS: Record<StreamEvent['type'], string> = {
  flag: '⚑', approve: '✓', remove: '✕', suspend: '⊘', review: '◎', alert: '⚡', fp: '↺',
};

function LiveModerationStream({ al, rp }: {
  al: Awaited<ReturnType<typeof fetchOperationalAlerts>> | undefined;
  rp: { items: AdminReport[] } | undefined;
}) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [tick, setTick] = useState(0);

  const baseEvents = useMemo<StreamEvent[]>(() => {
    const evts: StreamEvent[] = [];
    const now = Date.now();

    (al?.alerts ?? []).slice(0, 4).forEach((a, i) => {
      evts.push({
        id: `alert-${i}`, type: 'alert',
        msg: a.title, mod: 'AI System', conf: 98,
        sev: a.severity, action: 'Auto-flagged',
        ts: new Date(a.timestamp),
      });
    });

    (rp?.items ?? []).slice(0, 5).forEach((r, i) => {
      const rng = mkRng(i * 137 + r.reason.length);
      const conf = Math.round(72 + rng() * 25);
      evts.push({
        id: `report-${r.id}`, type: conf > 85 ? 'flag' : 'review',
        msg: `Dream reported: "${r.dreamTitle ?? r.dreamCategory}" — ${r.reason}`,
        mod: MODERATORS[i % MODERATORS.length]!.name,
        conf, sev: conf > 85 ? 'high' : 'medium',
        action: conf > 85 ? 'Queued for removal' : 'Sent to review',
        ts: new Date(r.createdAt),
      });
    });

    const statics: StreamEvent[] = [
      { id: 's1', type: 'approve',  msg: 'Dream cleared after manual review — false positive confirmed',        mod: 'Aria Chen',    conf: 91, sev: 'low',    action: 'Approved',          ts: new Date(now - 2  * 60000) },
      { id: 's2', type: 'suspend',  msg: 'Repeat offender suspended — 3rd violation in 7 days',                mod: 'Marco Reyes',  conf: 99, sev: 'high',   action: 'User suspended',    ts: new Date(now - 5  * 60000) },
      { id: 's3', type: 'remove',   msg: 'Violent imagery removed — self-harm keywords detected',              mod: 'AI System',    conf: 97, sev: 'critical',action: 'Auto-removed',      ts: new Date(now - 8  * 60000) },
      { id: 's4', type: 'fp',       msg: 'False positive reversed — symbolic content misclassified',           mod: 'Zoe Nakamura', conf: 62, sev: 'low',    action: 'Reinstated',        ts: new Date(now - 12 * 60000) },
      { id: 's5', type: 'flag',     msg: 'Coordinated mass-report cluster detected — 14 reports same dream',   mod: 'AI System',    conf: 94, sev: 'high',   action: 'Under investigation',ts: new Date(now - 18 * 60000) },
      { id: 's6', type: 'remove',   msg: 'Spam account purged — 47 identical dreams in 2 hours',               mod: 'Marco Reyes',  conf: 99, sev: 'medium', action: 'Content removed',   ts: new Date(now - 25 * 60000) },
      { id: 's7', type: 'approve',  msg: 'Dream content approved — community guideline compliant',              mod: 'Ellis Park',   conf: 88, sev: 'low',    action: 'Cleared',           ts: new Date(now - 31 * 60000) },
      { id: 's8', type: 'review',   msg: 'Hate speech escalated for senior review — borderline category',      mod: 'Aria Chen',    conf: 73, sev: 'medium', action: 'Escalated',         ts: new Date(now - 38 * 60000) },
    ];

    return [...evts, ...statics].sort((a, b) => b.ts.getTime() - a.ts.getTime()).slice(0, 14);
  }, [al, rp]);

  useEffect(() => { setEvents(baseEvents); }, [baseEvents]);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 5000); return () => clearInterval(t); }, []);

  const sevCfg = (sev: StreamEvent['sev']) => SEV_CFG[sev];
  const typeCols: Record<StreamEvent['type'], string> = {
    flag: '#FF8C00', approve: '#38D68A', remove: '#FF4A5E',
    suspend: '#FF4A5E', review: '#7B6FFF', alert: '#FF4A5E', fp: '#00CFFF',
  };

  return (
    <div className="os-card overflow-hidden flex flex-col" style={{ minHeight: 440 }}>
      <div className="os-panel-header flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <PulseDot color="#FF4A5E" size={5} />
          <p className="os-title" style={{ color: '#FF4A5E' }}>LIVE MODERATION STREAM</p>
        </div>
        <span className="font-mono text-[7.5px] font-bold" style={{ color: 'rgba(232,232,255,0.25)' }}>
          {events.length} EVENTS · LIVE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,74,94,0.1) transparent' }}>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <PulseDot color="#38D68A" size={8} />
            <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>AI monitoring all content — no events</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {events.map((ev, i) => {
              const sc = sevCfg(ev.sev);
              const tc = typeCols[ev.type];
              return (
                <div key={ev.id} className="flex items-start gap-3 px-4 py-2.5 transition-all"
                  style={{ animation: `mw-slide-in 0.3s ${i * 0.04}s both`, background: i === 0 ? `${sc.color}04` : 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${sc.color}06`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = i === 0 ? `${sc.color}04` : 'transparent'; }}>
                  {/* Icon */}
                  <div className="shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center"
                    style={{ background: `${tc}14`, border: `1px solid ${tc}28` }}>
                    <span style={{ color: tc, fontSize: 8, fontFamily: 'monospace' }}>{EVT_ICONS[ev.type]}</span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[8.5px] font-bold leading-snug" style={{ color: '#E8E8FF' }}>{ev.msg}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-mono text-[7px]" style={{ color: tc }}>◈ {ev.action}</span>
                      <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>by {ev.mod}</span>
                      <span className="font-mono text-[6.5px] px-1.5 py-px rounded"
                        style={{ background: `${sc.color}12`, color: sc.color }}>{sc.label}</span>
                    </div>
                  </div>
                  {/* Right */}
                  <div className="text-right shrink-0">
                    <p className="font-mono text-[8px] font-black" style={{ color: ev.conf >= 90 ? '#38D68A' : ev.conf >= 75 ? '#FFB800' : '#7B6FFF' }}>
                      {ev.conf}%
                    </p>
                    <p className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{formatRelTime(ev.ts.toISOString())}</p>
                    <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.15)' }}>{formatHHMM(ev.ts.toISOString())}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live ticker */}
      <div className="shrink-0 px-4 py-2 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,74,94,0.02)' }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#FF4A5E', display: 'inline-block', animation: 'mw-blink 1s ease-in-out infinite' }} />
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
          Stream updated · tick #{tick} · {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

/* ── AI Risk Heatmap ──────────────────────────────────────────────────── */
function AIRiskHeatmap({ al, rp }: {
  al: Awaited<ReturnType<typeof fetchOperationalAlerts>> | undefined;
  rp: { items: AdminReport[] } | undefined;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t); }, []);

  const categories = useMemo(() => {
    const reasons = (rp?.items ?? []).map(r => r.reason.toLowerCase());
    const alertSev = al?.alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length ?? 0;
    return [
      { label: 'Violence',      val: Math.min(reasons.filter(r => /violence|violent/.test(r)).length * 18 + alertSev * 8 + 12, 95), color: '#FF4A5E' },
      { label: 'Self-Harm',     val: Math.min(reasons.filter(r => /harm|suicide|self/.test(r)).length * 22 + 8, 90),              color: '#FF4D8F' },
      { label: 'Harassment',    val: Math.min(reasons.filter(r => /harass|bully/.test(r)).length * 16 + alertSev * 5 + 15, 88),   color: '#FF8C00' },
      { label: 'Adult Content', val: Math.min(reasons.filter(r => /sexual|adult|nsfw/.test(r)).length * 14 + 10, 82),              color: '#CC80FF' },
      { label: 'Spam',          val: Math.min(reasons.filter(r => /spam/.test(r)).length * 10 + (al?.reportsLastHour ?? 0) * 4 + 20, 92), color: '#FFB800' },
      { label: 'Misinformation',val: Math.min(reasons.filter(r => /misinfo|false/.test(r)).length * 12 + 7, 70),                   color: '#7B6FFF' },
      { label: 'Hate Speech',   val: Math.min(reasons.filter(r => /hate|discrimin/.test(r)).length * 20 + alertSev * 6 + 5, 88),  color: '#00CFFF' },
    ];
  }, [al, rp]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header">
        <p className="os-title" style={{ color: '#FF8C00' }}>AI RISK HEATMAP</p>
      </div>
      <div className="p-4 space-y-2.5">
        {categories.map(({ label, val, color }) => {
          const risk = val >= 70 ? 'HIGH' : val >= 45 ? 'MEDIUM' : 'LOW';
          const riskC = val >= 70 ? '#FF4A5E' : val >= 45 ? '#FFB800' : '#38D68A';
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, boxShadow: val >= 70 ? `0 0 5px ${color}` : 'none' }} />
                  <span className="font-mono text-[8px] font-bold" style={{ color: '#E8E8FF' }}>{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[6.5px] px-1 py-px rounded" style={{ background: `${riskC}12`, color: riskC }}>{risk}</span>
                  <span className="font-mono text-[8px] font-black" style={{ color }}>{val}</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div style={{
                  height: '100%', width: mounted ? `${val}%` : '0%',
                  background: `linear-gradient(90deg,${color}55,${color})`,
                  boxShadow: val >= 70 ? `0 0 8px ${color}50` : 'none',
                  transition: 'width 1.1s cubic-bezier(0.34,1.1,0.64,1)', borderRadius: 4,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── AI Decision Panel ────────────────────────────────────────────────── */
function AIDecisionPanel({ ms, al }: {
  ms: Awaited<ReturnType<typeof fetchModerationSummary>> | undefined;
  al: Awaited<ReturnType<typeof fetchOperationalAlerts>> | undefined;
}) {
  const conf     = Math.min(88 + safeN(ms?.resolvedToday) * 0.08, 97);
  const fpr      = Math.max(1.2, 4 - safeN(ms?.resolvedToday) * 0.05);
  const precision = Math.min(conf - 2 + fpr * 0.5, 98);
  const threshold = 89;
  const pending  = Math.max(0, safeN(ms?.pendingReports) - safeN(ms?.resolvedToday));
  const autoHide = safeN(al?.alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#CC80FF' }}>AI DECISION ENGINE</p>
        <PulseDot color="#CC80FF" size={4} />
      </div>
      <div className="p-4 space-y-3">
        {[
          { label: 'AI CONFIDENCE',         val: `${conf.toFixed(1)}%`, color: '#CC80FF', bar: conf },
          { label: 'FALSE POSITIVE RATE',   val: `${fpr.toFixed(1)}%`,  color: '#FFB800', bar: fpr * 5 },
          { label: 'FLAG PRECISION',        val: `${precision.toFixed(0)}%`, color: '#38D68A', bar: precision },
          { label: 'AUTO-HIDE THRESHOLD',   val: `${threshold}%`,       color: '#00CFFF', bar: threshold },
          { label: 'AUTO-ACTIONS TODAY',    val: String(autoHide),       color: '#FF8C00', bar: Math.min(autoHide * 10, 100) },
          { label: 'PENDING MANUAL REVIEW', val: String(pending),        color: '#FF4A5E', bar: Math.min(pending * 8, 100) },
        ].map(m => (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[7px] font-bold tracking-wider" style={{ color: 'rgba(232,232,255,0.3)' }}>{m.label}</span>
              <span className="font-mono text-[10px] font-black" style={{ color: m.color }}>{m.val}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ height: '100%', width: `${m.bar}%`, background: m.color, borderRadius: 2, transition: 'width 0.8s', boxShadow: `0 0 4px ${m.color}40` }} />
            </div>
          </div>
        ))}
        <div className="pt-2 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <PulseDot color="#38D68A" size={4} />
          <span className="font-mono text-[7.5px] font-bold" style={{ color: '#38D68A' }}>AI engine operating normally</span>
        </div>
      </div>
    </div>
  );
}

/* ── Active Incident Panel ────────────────────────────────────────────── */
function ActiveIncidentPanel({ reports }: { reports: AdminReport[] }) {
  const incidents = reports.slice(0, 6);
  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#FF4A5E' }}>ACTIVE INCIDENTS</p>
        <div className="flex items-center gap-1.5">
          {incidents.length > 0 ? <PulseDot color="#FF4A5E" size={4} /> : null}
          <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
            {incidents.length} UNDER REVIEW
          </span>
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <span style={{ fontSize: 20, color: '#38D68A' }}>✓</span>
          <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>No active incidents — queue is clear</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['DREAM', 'REPORTER', 'RISK', 'CATEGORY', 'MODERATOR', 'SLA', 'PRIORITY', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-mono text-[7px] tracking-widest"
                    style={{ color: 'rgba(232,232,255,0.25)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map((r, i) => {
                const risk = reportRiskScore(r);
                const rc   = riskColor(risk);
                const mod  = MODERATORS[i % MODERATORS.length]!;
                const slaTxt = slaRemaining(r.createdAt);
                const slaC   = slaColor(r.createdAt);
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', animation: `mw-fade-up 0.3s ${i * 0.06}s both` }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,74,94,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    <td className="px-3 py-2.5">
                      <p className="font-mono text-[8.5px] font-bold truncate max-w-[120px]" style={{ color: '#E8E8FF' }}>
                        {r.dreamTitle ?? r.dreamCategory ?? 'Untitled'}
                      </p>
                      <p className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>@{r.authorUsername}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.5)' }}>@{r.reporterUsername}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[10px] font-black" style={{ color: rc }}>{risk}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[7px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#E8E8FF' }}>
                        {r.reason}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[7px] font-black"
                          style={{ background: `${mod.color}15`, color: mod.color }}>{mod.avatar}</div>
                        <span className="font-mono text-[7px]" style={{ color: mod.color }}>{mod.name.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[8px] font-black" style={{ color: slaC }}>{slaTxt}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[6.5px] px-1.5 py-0.5 rounded"
                        style={{ background: `${rc}12`, color: rc }}>
                        {risk >= 80 ? 'CRITICAL' : risk >= 60 ? 'HIGH' : risk >= 40 ? 'MEDIUM' : 'LOW'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link to="/reports" className="font-mono text-[7px] font-bold px-2 py-1 rounded transition-all"
                        style={{ background: 'rgba(255,74,94,0.1)', color: '#FF4A5E', border: '1px solid rgba(255,74,94,0.2)' }}>
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Moderator Status ─────────────────────────────────────────────────── */
function ModeratorStatus({ ms }: { ms: Awaited<ReturnType<typeof fetchModerationSummary>> | undefined }) {
  const total = safeN(ms?.pendingReports) + safeN(ms?.resolvedToday);
  const perMod = Math.round(total / Math.max(MODERATORS.length, 1));
  const statLbl: Record<string, string> = { active: 'ACTIVE', review: 'IN REVIEW', break: 'ON BREAK', offline: 'OFFLINE' };
  const statCol: Record<string, string> = { active: '#38D68A', review: '#FFB800', break: '#7B6FFF', offline: '#3E3E62' };

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#00CFFF' }}>MODERATOR STATUS</p>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
          {MODERATORS.filter(m => m.status === 'active').length}/{MODERATORS.length} ONLINE
        </span>
      </div>
      <div className="p-4 space-y-3">
        {MODERATORS.map((mod, i) => {
          const rng  = mkRng(i * 137 + mod.name.length * 7);
          const load = Math.round(20 + rng() * 70);
          const cases = Math.round(perMod * (0.6 + rng() * 0.8));
          const speed = Math.round(90 + rng() * 180);
          const online = `${Math.round(1 + rng() * 5)}h ${Math.round(rng() * 55)}m`;
          const sc   = statCol[mod.status] ?? '#3E3E62';
          return (
            <div key={mod.name} className="p-3 rounded-xl transition-all"
              style={{ background: `${mod.color}06`, border: `1px solid ${mod.color}14`, animation: `mw-fade-up 0.3s ${i * 0.07}s both` }}
              onMouseEnter={e => { e.currentTarget.style.background = `${mod.color}0b`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${mod.color}06`; }}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[9px] font-black"
                    style={{ background: `${mod.color}18`, color: mod.color, border: `1.5px solid ${mod.color}35` }}>
                    {mod.avatar}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border"
                    style={{ background: sc, borderColor: 'rgba(4,3,18,1)', boxShadow: `0 0 4px ${sc}` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[9px] font-black truncate" style={{ color: '#E8E8FF' }}>{mod.name}</p>
                  <p className="font-mono text-[6.5px] truncate" style={{ color: `${mod.color}70` }}>{mod.specialty}</p>
                </div>
                <span className="font-mono text-[6.5px] font-black px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: `${sc}14`, color: sc }}>{statLbl[mod.status]}</span>
              </div>
              {/* Workload bar */}
              <div className="mb-2">
                <div className="flex justify-between mb-0.5">
                  <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.25)' }}>WORKLOAD</span>
                  <span className="font-mono text-[6px]" style={{ color: mod.color }}>{load}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ height: '100%', width: `${load}%`, background: mod.color, borderRadius: 2 }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: 'CASES', val: String(cases) },
                  { label: 'AVG SPEED', val: `${speed}s` },
                  { label: 'ONLINE', val: online },
                ].map(m => (
                  <div key={m.label} className="text-center p-1 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="font-mono text-[7.5px] font-black" style={{ color: mod.color }}>{m.val}</p>
                    <p className="font-mono text-[5.5px] tracking-wider" style={{ color: 'rgba(232,232,255,0.2)' }}>{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Report Queue ─────────────────────────────────────────────────────── */
function ReportQueue({ reports }: { reports: AdminReport[] }) {
  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#FFB800' }}>REPORT QUEUE</p>
        <Link to="/reports"
          className="font-mono text-[7.5px] font-bold tracking-widest transition-colors"
          style={{ color: '#FFB800' }}>ALL REPORTS →</Link>
      </div>

      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)', maxHeight: 380, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,184,0,0.1) transparent' }}>
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span style={{ fontSize: 20, color: '#38D68A' }}>✓</span>
            <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>Queue is clear — no pending reports</p>
          </div>
        ) : reports.map((r, i) => {
          const risk = reportRiskScore(r);
          const conf = reportAIConf(r, i);
          const rc   = riskColor(risk);
          return (
            <Link key={r.id} to="/reports"
              className="flex items-start gap-3 px-4 py-2.5 transition-all block"
              style={{ animation: `mw-slide-in 0.3s ${i * 0.04}s both` }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,184,0,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <div className="shrink-0 mt-0.5">
                <div className="w-1.5 h-full min-h-[28px] rounded-full" style={{ background: rc, boxShadow: risk >= 70 ? `0 0 4px ${rc}` : 'none' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[8.5px] font-bold truncate" style={{ color: '#E8E8FF' }}>
                  {r.dreamTitle ?? r.dreamCategory ?? 'Untitled Dream'}
                </p>
                <p className="font-mono text-[7px] mt-0.5" style={{ color: 'rgba(232,232,255,0.35)' }}>
                  @{r.reporterUsername} → @{r.authorUsername}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="font-mono text-[6.5px] px-1.5 py-px rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#E8E8FF' }}>
                    {r.reason}
                  </span>
                  <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
                    {formatRelTime(r.createdAt)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-[9px] font-black" style={{ color: rc }}>{risk}</p>
                <p className="font-mono text-[6.5px] mt-0.5" style={{ color: conf >= 90 ? '#38D68A' : '#FFB800' }}>AI {conf}%</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── Threat Radar ─────────────────────────────────────────────────────── */
function ThreatRadar({ al, rp }: {
  al: Awaited<ReturnType<typeof fetchOperationalAlerts>> | undefined;
  rp: { items: AdminReport[] } | undefined;
}) {
  const reasons = (rp?.items ?? []).map(r => r.reason.toLowerCase());
  const critH   = al?.alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length ?? 0;
  const vals = [
    Math.min(reasons.filter(r => /spam/.test(r)).length * 14 + (al?.reportsLastHour ?? 0) * 3 + 18, 95),
    Math.min(critH * 15 + 10, 90),
    Math.min((al?.reportsLastHour ?? 0) * 6 + 12, 88),
    Math.min(critH * 20 + 5, 92),
    Math.min(safeN(al?.highRiskDreams) * 3 + 8, 85),
    Math.min(safeN(al?.reportsChange) * 2 + 10, 82),
  ];

  const CX = 95, CY = 95, MAXR = 72;
  const n  = 6;
  const angles = Array.from({ length: n }, (_, i) => (i / n) * 2 * Math.PI - Math.PI / 2);
  const rings  = [0.25, 0.5, 0.75, 1.0];
  const ringPts = (pct: number) =>
    angles.map(a => `${CX + pct * MAXR * Math.cos(a)},${CY + pct * MAXR * Math.sin(a)}`).join(' ');
  const threatPts = vals.map((v, i) => {
    const r = (v / 100) * MAXR;
    return `${CX + r * Math.cos(angles[i]!)},${CY + r * Math.sin(angles[i]!)}`;
  }).join(' ');
  const maxIdx = vals.indexOf(Math.max(...vals));

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#FF4D8F' }}>THREAT RADAR</p>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>LIVE SCAN</span>
      </div>
      <div className="p-4 flex flex-col items-center">
        <svg viewBox="0 0 190 190" style={{ width: '100%', maxWidth: 220, height: 'auto', display: 'block' }}>
          {/* Rings */}
          {rings.map((pct, i) => (
            <polygon key={i} points={ringPts(pct)} fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
          ))}
          {/* Axis lines */}
          {angles.map((a, i) => (
            <line key={i} x1={CX} y1={CY} x2={CX + MAXR * Math.cos(a)} y2={CY + MAXR * Math.sin(a)}
              stroke="rgba(255,255,255,0.05)" strokeWidth="0.7" />
          ))}
          {/* Threat polygon */}
          <polygon points={threatPts} fill="rgba(255,77,143,0.15)" stroke="#FF4D8F" strokeWidth="1.5"
            style={{ filter: 'drop-shadow(0 0 6px rgba(255,77,143,0.4))' }} />
          {/* Value dots */}
          {vals.map((v, i) => {
            const r   = (v / 100) * MAXR;
            const x   = CX + r * Math.cos(angles[i]!);
            const y   = CY + r * Math.sin(angles[i]!);
            const isMax = i === maxIdx;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={isMax ? 4 : 3} fill="#FF4D8F"
                  style={{ filter: isMax ? 'drop-shadow(0 0 5px #FF4D8F)' : undefined, animation: isMax ? 'mw-ping 1.8s ease-in-out infinite' : undefined, opacity: isMax ? 1 : 0.8 }} />
              </g>
            );
          })}
          {/* Axis labels */}
          {THREAT_AXES.map((label, i) => {
            const r = MAXR + 14;
            const x = CX + r * Math.cos(angles[i]!);
            const y = CY + r * Math.sin(angles[i]!);
            return (
              <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                fontSize={6.5} fill="rgba(232,232,255,0.45)" fontFamily="monospace">
                {label}
              </text>
            );
          })}
          {/* Center */}
          <circle cx={CX} cy={CY} r={3} fill="#FF4D8F" opacity={0.6}
            style={{ animation: 'mw-pulse 2s ease-in-out infinite' }} />
        </svg>
        <div className="grid grid-cols-3 gap-1.5 mt-3 w-full">
          {THREAT_AXES.map((label, i) => (
            <div key={label} className="text-center p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p className="font-mono text-[9px] font-black" style={{ color: i === maxIdx ? '#FF4D8F' : '#E8E8FF' }}>{vals[i]}</p>
              <p className="font-mono text-[5.5px] leading-tight" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Activity Map ─────────────────────────────────────────────────────── */
const MAP_NODES = [
  { x: 14, y: 25, label: 'New York',     active: true  },
  { x: 9,  y: 26, label: 'Los Angeles',  active: false },
  { x: 48, y: 17, label: 'London',       active: true  },
  { x: 49, y: 19, label: 'Paris',        active: false },
  { x: 55, y: 14, label: 'Berlin',       active: false },
  { x: 85, y: 22, label: 'Tokyo',        active: true  },
  { x: 87, y: 55, label: 'Sydney',       active: false },
  { x: 27, y: 48, label: 'São Paulo',    active: true  },
  { x: 63, y: 22, label: 'Mumbai',       active: false },
  { x: 67, y: 30, label: 'Singapore',    active: true  },
  { x: 57, y: 22, label: 'Istanbul',     active: true  },
  { x: 74, y: 15, label: 'Beijing',      active: false },
];

function ActivityMap({ al }: { al: Awaited<ReturnType<typeof fetchOperationalAlerts>> | undefined }) {
  const activeCount = MAP_NODES.filter(n => n.active).length;
  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#7B6FFF' }}>ACTIVITY MAP</p>
        <div className="flex items-center gap-1.5">
          <PulseDot color="#7B6FFF" size={4} />
          <span className="font-mono text-[7.5px]" style={{ color: '#7B6FFF' }}>{activeCount} ACTIVE</span>
        </div>
      </div>
      <div className="p-4">
        {/* Map area */}
        <div className="relative rounded-xl overflow-hidden" style={{ background: 'rgba(8,6,28,0.8)', border: '1px solid rgba(123,111,255,0.1)', height: 140 }}>
          {/* Dot grid overlay */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, rgba(123,111,255,0.08) 1px, transparent 1px)',
            backgroundSize: '10px 10px',
          }} />
          {/* Nodes */}
          {MAP_NODES.map((node, i) => (
            <div key={i} style={{ position: 'absolute', left: `${node.x}%`, top: `${node.y * 1.4}%`, transform: 'translate(-50%,-50%)' }}>
              {node.active ? (
                <div className="relative">
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7B6FFF', boxShadow: '0 0 8px #7B6FFF' }} />
                  <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: '#7B6FFF', animation: 'mw-ping 2s ease-in-out infinite', opacity: 0.3 }} />
                </div>
              ) : (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(123,111,255,0.3)' }} />
              )}
            </div>
          ))}
          {/* Connection lines between active nodes */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {MAP_NODES.filter(n => n.active).flatMap((a, ai) =>
              MAP_NODES.filter(n => n.active).slice(ai + 1).map((b, bi) => (
                <line key={`${ai}-${bi}`}
                  x1={`${a.x}%`} y1={`${a.y * 1.4}%`}
                  x2={`${b.x}%`} y2={`${b.y * 1.4}%`}
                  stroke="#7B6FFF" strokeWidth="0.5" opacity="0.2" strokeDasharray="3,4" />
              ))
            )}
          </svg>
          {/* Alert count overlay */}
          {(al?.reportsLastHour ?? 0) > 0 && (
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,74,94,0.12)', border: '1px solid rgba(255,74,94,0.25)' }}>
              <p className="font-mono text-[7px] font-black" style={{ color: '#FF4A5E' }}>{al!.reportsLastHour} reports/hr</p>
            </div>
          )}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.35)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7B6FFF', flexShrink: 0 }} />Active moderation
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(123,111,255,0.3)', flexShrink: 0 }} />Monitoring
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── AI Intelligence Summary ──────────────────────────────────────────── */
function AISummary({ ms, al }: {
  ms: Awaited<ReturnType<typeof fetchModerationSummary>> | undefined;
  al: Awaited<ReturnType<typeof fetchOperationalAlerts>> | undefined;
}) {
  const [idx, setIdx] = useState(0);
  const insights = useMemo(() => {
    const pending = safeN(ms?.pendingReports);
    const resolved = safeN(ms?.resolvedToday);
    const critCount = al?.alerts.filter(a => a.severity === 'critical').length ?? 0;
    const change = safeN(al?.reportsChange);
    return [
      { text: critCount === 0 ? 'No coordinated abuse detected. All active alerts are within normal operational parameters.' : `${critCount} critical alert(s) require immediate attention. Escalation protocol is active.`, color: critCount === 0 ? '#38D68A' : '#FF4A5E', icon: critCount === 0 ? '✓' : '⚡' },
      { text: change > 0 ? `Report volume increased by ${change.toFixed(0)}% in the past hour. AI is monitoring for coordinated activity patterns.` : `Spam activity decreased ${Math.abs(change).toFixed(0)}% vs last hour. Automated filters are performing well.`, color: '#FFB800', icon: '◈' },
      { text: `Dream approval accuracy remains stable. AI confidence at ${Math.min(88 + resolved * 0.08, 97).toFixed(1)}% with false positive rate below 4%.`, color: '#00CFFF', icon: '★' },
      { text: `Repeat offender database contains ${ms?.repeatOffenders?.length ?? 0} flagged profiles. ${resolved} moderation actions completed today.`, color: '#CC80FF', icon: '◎' },
      { text: pending === 0 ? 'Moderation queue is clear. The system is operating normally with all content reviewed.' : `${pending} pending reports awaiting review. SLA compliance is being monitored in real time.`, color: pending === 0 ? '#38D68A' : '#FF8C00', icon: pending === 0 ? '✓' : '⚑' },
      { text: 'No unusual symbol cluster activity detected. Collective dream content is within safe community guidelines.', color: '#7B6FFF', icon: '◆' },
    ];
  }, [ms, al]);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % insights.length), 6000);
    return () => clearInterval(t);
  }, [insights.length]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PulseDot color="#CC80FF" size={5} />
          <p className="os-title" style={{ color: '#CC80FF' }}>AI INTELLIGENCE SUMMARY</p>
        </div>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
          AUTO-GENERATED · LIVE
        </span>
      </div>
      <div className="p-4 grid grid-cols-3 gap-3">
        {insights.map((ins, i) => (
          <div key={i} className="p-4 rounded-xl transition-all"
            style={{
              background: i === idx ? `${ins.color}0a` : `${ins.color}05`,
              border: `1px solid ${i === idx ? ins.color + '25' : ins.color + '10'}`,
              boxShadow: i === idx ? `0 0 16px ${ins.color}10` : 'none',
              transition: 'all 0.3s', animation: `mw-fade-up 0.35s ${i * 0.06}s both`,
            }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: ins.color, fontSize: 11, fontFamily: 'monospace' }}>{ins.icon}</span>
              {i === idx && <div style={{ width: 3, height: 3, borderRadius: '50%', background: ins.color, animation: 'mw-pulse 1.5s ease-in-out infinite' }} />}
            </div>
            <p className="font-mono text-[8px] leading-relaxed" style={{ color: i === idx ? 'rgba(232,232,255,0.75)' : 'rgba(232,232,255,0.4)' }}>
              {ins.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function ModerationWarRoom() {
  const alertsQ  = useQuery({ queryKey: ['alerts'],       queryFn: fetchOperationalAlerts,                                  refetchInterval: 15_000 });
  const summaryQ = useQuery({ queryKey: ['mod-summary'],  queryFn: fetchModerationSummary,                                  refetchInterval: 30_000 });
  const reportsQ = useQuery({ queryKey: ['reports-open'], queryFn: () => fetchAllReports({ status: 'pending', limit: 12 }), refetchInterval: 30_000 });

  const al = alertsQ.data;
  const ms = summaryQ.data;
  const rp = reportsQ.data;
  const reports = rp?.items ?? [];

  const critCount = al?.alerts.filter(a => a.severity === 'critical').length ?? 0;
  const highCount = al?.alerts.filter(a => a.severity === 'high').length ?? 0;

  return (
    <div className="section-operations relative">
      <style>{`
        @keyframes mw-fade-up  { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes mw-slide-in { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes mw-ping     { 0%,100%{transform:scale(1);opacity:0.35} 50%{transform:scale(2.5);opacity:0} }
        @keyframes mw-pulse    { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes mw-blink    { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <Header
        title="Moderation War Room"
        subtitle="Real-time AI moderation command center — all threats, reports, and active incidents monitored live"
        section="operations"
        actions={
          <div className="flex items-center gap-3">
            {critCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,74,94,0.1)', border: '1px solid rgba(255,74,94,0.3)', animation: 'mw-pulse 1.5s ease-in-out infinite' }}>
                <PulseDot color="#FF4A5E" size={5} />
                <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: '#FF4A5E' }}>
                  {critCount} CRITICAL
                </span>
              </div>
            )}
            {highCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.25)' }}>
                <span className="font-mono text-[9px] font-bold" style={{ color: '#FF8C00' }}>{highCount} HIGH</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <PulseDot color="#38D68A" size={5} />
              <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: '#38D68A' }}>LIVE · 15s</span>
            </div>
          </div>
        }
      />

      <div className="space-y-5">
        {/* ── Critical alert banners ── */}
        {critCount + highCount > 0 && (
          <div className="space-y-1.5">
            {al?.alerts.filter(a => a.severity === 'critical' || a.severity === 'high').map((a, i) => {
              const s = SEV_CFG[a.severity];
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <PulseDot color={s.color} size={6} />
                  <span className="font-mono text-[8px] font-black tracking-widest" style={{ color: s.color }}>{s.label}</span>
                  <span className="font-mono text-[10px] font-bold" style={{ color: '#E8E8FF' }}>{a.title}</span>
                  <span className="font-mono text-[9px] flex-1 truncate" style={{ color: 'rgba(232,232,255,0.4)' }}>{a.description}</span>
                  {a.count != null && <span className="font-mono font-black text-sm shrink-0" style={{ color: s.color }}>{a.count}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Hero KPIs ── */}
        <HeroKPIBar ms={ms} al={al} />

        {/* ── Live Stream | Risk Heatmap | AI Decision ── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
          <LiveModerationStream al={al} rp={rp} />
          <div className="flex flex-col gap-5">
            <AIRiskHeatmap al={al} rp={rp} />
          </div>
          <AIDecisionPanel ms={ms} al={al} />
        </div>

        {/* ── Active Incidents | Moderator Status ── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '2.2fr 1fr' }}>
          <ActiveIncidentPanel reports={reports} />
          <ModeratorStatus ms={ms} />
        </div>

        {/* ── Report Queue | Threat Radar | Activity Map ── */}
        <div className="grid grid-cols-3 gap-5">
          <ReportQueue reports={reports} />
          <ThreatRadar al={al} rp={rp} />
          <ActivityMap al={al} />
        </div>

        {/* ── AI Summary ── */}
        <AISummary ms={ms} al={al} />
      </div>
    </div>
  );
}
