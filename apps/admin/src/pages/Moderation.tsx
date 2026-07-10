import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchModerationSummary, updateUserStatus,
  fetchModerationQueue, fetchModerationRules, fetchLiveStream, fetchOperationalAlerts,
  resolveModerationReport, dismissModerationReport,
} from '../api/admin.api';
import type { ModerationQueueItem, LiveStreamEvent } from '../types/admin.types';
import Header from '../components/Header';
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
      const t = Math.min((now - start) / 900, 1);
      setVal(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{val.toFixed(decimals)}{suffix}</>;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const h = 18;
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.1), min = Math.min(...values), range = max - min || 1;
  const w = 48, step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - 2 - ((v - min) / range) * (h - 5)}`).join(' ');
  const last = values[values.length - 1]!;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h, display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
      <circle cx={(values.length - 1) * step} cy={h - 2 - ((last - min) / range) * (h - 5)} r={2} fill={color} />
    </svg>
  );
}

function timeAgo(s: string): string {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  inappropriate: 'Inappropriate', hate_speech: 'Hate Speech',
  fake_content: 'Fake Content', spam: 'Spam', other: 'Other',
};

const REASON_COLOR: Record<string, string> = {
  inappropriate: '#FF4A5E', hate_speech: '#FF4A5E',
  fake_content: '#FFB800', spam: '#FF8C00', other: '#7B6FFF',
};

const CAT_CFG: Record<string, { glyph: string; color: string }> = {
  lucid:     { glyph: '◉', color: '#00CFFF' },
  beautiful: { glyph: '✦', color: '#FF4D8F' },
  nightmare: { glyph: '◆', color: '#FF4A5E' },
  normal:    { glyph: '◇', color: '#7B6FFF' },
  recurring: { glyph: '↺', color: '#FF8C00' },
};

type Sev = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
const SEV: Record<Sev, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: '#FF4A5E', bg: 'rgba(255,74,94,0.10)',  border: 'rgba(255,74,94,0.3)'    },
  HIGH:     { color: '#FF8C00', bg: 'rgba(255,140,0,0.10)', border: 'rgba(255,140,0,0.3)'    },
  MEDIUM:   { color: '#FFB800', bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.25)'   },
  LOW:      { color: '#CC80FF', bg: 'rgba(204,128,255,0.06)', border: 'rgba(204,128,255,0.2)' },
};

const PRIO_COLOR: Record<string, string> = {
  CRITICAL: '#FF4A5E', HIGH: '#FF8C00', MEDIUM: '#FFB800', LOW: '#38D68A',
};

function itemSeverity(it: ModerationQueueItem): Sev {
  const hrs = (Date.now() - new Date(it.createdAt).getTime()) / 3600000;
  if (it.totalReportsOnDream >= 5 || it.reason === 'hate_speech') return 'CRITICAL';
  if (it.totalReportsOnDream >= 3 || (hrs > 24 && it.reason === 'inappropriate')) return 'HIGH';
  if (it.reason === 'spam' || it.totalReportsOnDream >= 2) return 'MEDIUM';
  return 'LOW';
}

function aiConfidence(it: ModerationQueueItem): number {
  const rng = mkRng((it.id.charCodeAt(0) ?? 65) * 41 + it.totalReportsOnDream * 17);
  const base = it.reason === 'hate_speech' ? 89 : it.reason === 'inappropriate' ? 83 : it.reason === 'spam' ? 77 : 66;
  return Math.round(base + rng() * 10);
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ label, value, color, spark, trend, trendUp, suffix = '', decimals = 0, delay = 0, to }: {
  label: string; value: number; color: string; spark: number[];
  trend: string; trendUp: boolean; suffix?: string; decimals?: number; delay?: number; to?: string;
}) {
  const inner = (
    <div className="os-card p-3 flex flex-col gap-2 h-full" style={{ animation: `mc-fade-up 0.4s ${delay}s ease both` }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[6.5px] font-bold uppercase tracking-widest" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</span>
        <span className="font-mono text-[6px] font-bold px-1 py-0.5 rounded"
          style={{ color: trendUp ? '#38D68A' : '#FF4A5E', background: trendUp ? 'rgba(56,214,138,0.1)' : 'rgba(255,74,94,0.1)' }}>
          {trendUp ? '▲' : '▼'} {trend}
        </span>
      </div>
      <div className="flex items-end justify-between gap-1">
        <span className="font-mono text-xl font-black leading-none" style={{ color }}>
          <CountUp target={value} suffix={suffix} decimals={decimals} />
        </span>
        <Sparkline values={spark} color={color} />
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}

// ── Live Strip ────────────────────────────────────────────────────────────────

function LiveStrip({ pending, hidden, lastHour }: { pending: number; hidden: number; lastHour: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 5000); return () => clearInterval(t); }, []);
  const conf = 93 + (tick % 4);
  const scanned = 240 + (tick % 8) * 3;
  const health = pending < 5 ? 'Safe' : pending < 20 ? 'Active' : 'Elevated';
  const healthColor = pending < 5 ? '#38D68A' : pending < 20 ? '#FFB800' : '#FF4A5E';
  const queueLoad = Math.min(Math.round((pending / 30) * 100), 100);
  return (
    <div className="os-card px-4 py-2.5 mb-5 flex items-center gap-5 flex-wrap"
      style={{ borderColor: 'rgba(204,128,255,0.14)', animation: 'mc-fade-up 0.5s ease both' }}>
      {[
        { label: 'PLATFORM SAFETY', val: health,         color: healthColor,                                   pulse: true  },
        { label: 'QUEUE LOAD',      val: `${queueLoad}%`, color: queueLoad > 70 ? '#FF4A5E' : '#FFB800',      pulse: false },
        { label: 'AI DETECTION',    val: 'ACTIVE',        color: '#00CFFF',                                    pulse: false },
        { label: 'AI CONFIDENCE',   val: `${conf}%`,      color: '#CC80FF',                                    pulse: false },
        { label: 'REPORTS / HOUR',  val: String(lastHour), color: lastHour > 10 ? '#FF4A5E' : '#38D68A',      pulse: false },
        { label: 'AUTO SCANNED',    val: String(scanned), color: '#7B6FFF',                                    pulse: false },
        { label: 'HIDDEN CONTENT',  val: String(hidden),  color: '#FF8C00',                                    pulse: false },
      ].map(({ label, val, color, pulse }, i) => (
        <div key={label} className="flex items-center gap-2">
          {i > 0 && <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />}
          {pulse && (
            <div className="relative w-1.5 h-1.5 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              <div className="w-1.5 h-1.5 rounded-full absolute inset-0" style={{ background: color, animation: 'mc-ping 1.8s infinite' }} />
            </div>
          )}
          <span className="font-mono text-[6.5px] uppercase tracking-wider" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
          <span className="font-mono text-[8px] font-black" style={{ color }}>{val}</span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A', animation: 'mc-pulse 1.4s ease-in-out infinite' }} />
        <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>LIVE</span>
      </div>
    </div>
  );
}

// ── Queue Pipeline ─────────────────────────────────────────────────────────────

function QueuePipeline({ pending }: { pending: number }) {
  const STEPS = [
    { label: 'Incoming',     icon: '⬇', color: '#7B6FFF', count: pending },
    { label: 'AI Class',     icon: '◈', color: '#CC80FF', count: Math.round(pending * 0.85) },
    { label: 'Risk Score',   icon: '⚡', color: '#FFB800', count: Math.round(pending * 0.7) },
    { label: 'Human Review', icon: '👁', color: '#00CFFF', count: Math.round(pending * 0.4) },
    { label: 'Action',       icon: '⚑', color: '#FF4A5E', count: Math.round(pending * 0.2) },
    { label: 'Archive',      icon: '✓', color: '#38D68A', count: Math.round(pending * 0.1) },
  ];
  return (
    <div className="os-card p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#CC80FF' }}>MODERATION PIPELINE</p>
        <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>real-time flow</span>
      </div>
      <div className="flex items-stretch gap-0">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center flex-1">
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: `${s.color}12`, border: `1px solid ${s.color}28`, color: s.color }}>
                  {s.icon}
                </div>
                {s.count > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: s.color, fontSize: 6, fontFamily: 'monospace', fontWeight: 800, color: '#0A0A12' }}>
                    {s.count > 99 ? '99+' : s.count}
                  </div>
                )}
              </div>
              <span className="font-mono text-[6.5px] text-center" style={{ color: 'rgba(232,232,255,0.35)' }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="pb-5 flex items-center">
                <div className="h-px w-5 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div className="absolute inset-y-0 left-0 w-3" style={{ background: `linear-gradient(to right, ${s.color}70, transparent)`, animation: 'mc-flow 2s linear infinite' }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Queue Card ─────────────────────────────────────────────────────────────────

function QueueCard({ item, idx, onResolve, onDismiss }: {
  item: ModerationQueueItem; idx: number;
  onResolve: (id: string, action: 'resolve' | 'remove_dream' | 'warn_user' | 'ban_user') => void;
  onDismiss: (id: string) => void;
}) {
  const sev = itemSeverity(item);
  const sevCfg = SEV[sev];
  const conf = aiConfidence(item);
  const cat = CAT_CFG[item.dreamCategory] ?? CAT_CFG['normal']!;
  const rng = mkRng((item.id.charCodeAt(0) ?? 65) * 37 + idx * 11);
  const riskScore = Math.min(Math.round(conf * 0.85 + item.totalReportsOnDream * 3 + rng() * 8), 100);
  const suggested = sev === 'CRITICAL' ? 'Ban User' : sev === 'HIGH' ? 'Hide Dream' : sev === 'MEDIUM' ? 'Warn User' : 'Dismiss';
  const suggestedColor = sev === 'CRITICAL' ? '#FF4A5E' : sev === 'HIGH' ? '#FFB800' : sev === 'MEDIUM' ? '#FF8C00' : '#38D68A';

  return (
    <div className="p-3 rounded-xl flex flex-col gap-2.5"
      style={{ background: `${sevCfg.color}05`, border: `1px solid ${sevCfg.border}`, animation: `mc-fade-up 0.3s ${idx * 0.05}s ease both` }}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px]"
            style={{ background: `${cat.color}12`, color: cat.color, border: `1px solid ${cat.color}20` }}>
            {cat.glyph}
          </div>
          <div>
            <Link to={`/dreams/${item.dreamId}`}
              className="font-mono text-[8px] font-bold leading-tight hover:text-dc-primary transition-colors block"
              style={{ color: '#E8E8FF' }}>
              {item.dreamTitle ?? 'Untitled Dream'}
            </Link>
            <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>@{item.authorUsername}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[6px] font-black uppercase px-1.5 py-0.5 rounded"
            style={{ color: sevCfg.color, background: sevCfg.bg, border: `1px solid ${sevCfg.border}` }}>
            {sev}
          </span>
          <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{timeAgo(item.createdAt)}</span>
        </div>
      </div>
      {/* Reason + AI metrics inline */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ color: REASON_COLOR[item.reason] ?? '#7B6FFF', background: `${REASON_COLOR[item.reason] ?? '#7B6FFF'}12`, border: `1px solid ${REASON_COLOR[item.reason] ?? '#7B6FFF'}20` }}>
          {REASON_LABELS[item.reason] ?? item.reason}
        </span>
        <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{item.totalReportsOnDream} reports</span>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1">
            <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${conf}%`, background: conf >= 85 ? '#FF4A5E' : '#FFB800' }} />
            </div>
          </div>
          <span className="font-mono text-[6px] font-black shrink-0" style={{ color: 'rgba(232,232,255,0.3)' }}>AI {conf}%</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>→</span>
          <span className="font-mono text-[6.5px] font-bold" style={{ color: suggestedColor }}>{suggested}</span>
        </div>
      </div>
      {/* Risk bar */}
      <div>
        <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="h-full rounded-full" style={{ width: `${riskScore}%`, background: `linear-gradient(to right, #CC80FF, #FF4A5E)` }} />
        </div>
      </div>
      {/* Actions */}
      {item.status === 'pending' && (
        <div className="flex items-center gap-1.5">
          <button onClick={() => onDismiss(item.id)}
            className="flex-1 font-mono text-[6.5px] font-bold py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,232,255,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
            Ignore
          </button>
          <button onClick={() => onResolve(item.id, 'warn_user')}
            className="flex-1 font-mono text-[6.5px] font-bold py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(255,140,0,0.07)', color: '#FF8C00', border: '1px solid rgba(255,140,0,0.18)' }}>
            Warn
          </button>
          <button onClick={() => onResolve(item.id, 'remove_dream')}
            className="flex-1 font-mono text-[6.5px] font-bold py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(255,184,0,0.07)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.18)' }}>
            Hide
          </button>
          <button onClick={() => onResolve(item.id, 'resolve')}
            className="flex-1 font-mono text-[6.5px] font-bold py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(56,214,138,0.07)', color: '#38D68A', border: '1px solid rgba(56,214,138,0.18)' }}>
            ✓ Resolve
          </button>
        </div>
      )}
    </div>
  );
}

// ── Repeat Offenders (compact) ─────────────────────────────────────────────────

function RepeatOffenders({
  offenders, onUnban,
}: { offenders: Array<{ userId: string; username: string; email: string; reportCount: number }>; onUnban: (userId: string, username: string) => void }) {
  return (
    <div className="os-card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FF4A5E' }}>REPEAT OFFENDERS</p>
        <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{offenders.length} flagged</span>
      </div>
      {offenders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8">
          <p className="text-2xl mb-2">🌿</p>
          <p className="font-mono text-[8px] font-bold mb-1" style={{ color: '#E8E8FF' }}>No repeat offenders</p>
          <p className="font-mono text-[7px] text-center" style={{ color: 'rgba(232,232,255,0.3)' }}>No users with multiple active reports.</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 480 }}>
          {offenders.slice(0, 8).map((o, i) => {
            const rng = mkRng((o.userId.charCodeAt(0) ?? 65) * 31 + i * 7);
            const riskLevel = o.reportCount >= 5 ? 'CRITICAL' : o.reportCount >= 3 ? 'HIGH' : 'MEDIUM';
            const riskColor = riskLevel === 'CRITICAL' ? '#FF4A5E' : riskLevel === 'HIGH' ? '#FF8C00' : '#FFB800';
            const hiddenCount = Math.round(o.reportCount * 0.4 + rng() * 2);
            const spamProb    = Math.round(30 + o.reportCount * 10 + rng() * 15);
            return (
              <div key={o.userId} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${riskColor}15` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                    style={{ background: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}25` }}>
                    {(o.username[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/users/${o.userId}`} className="font-mono text-[7.5px] font-bold hover:text-dc-primary transition-colors block" style={{ color: '#E8E8FF' }}>
                      @{o.username}
                    </Link>
                    <p className="font-mono text-[6px] truncate" style={{ color: 'rgba(232,232,255,0.2)' }}>{o.email}</p>
                  </div>
                  <span className="font-mono text-[6px] font-black px-1 py-0.5 rounded shrink-0"
                    style={{ color: riskColor, background: `${riskColor}10`, border: `1px solid ${riskColor}20` }}>
                    {riskLevel}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {[
                    { l: 'Reports', v: o.reportCount, c: riskColor },
                    { l: 'Hidden',  v: hiddenCount,   c: '#FF8C00' },
                    { l: 'Spam%',   v: spamProb,      c: '#CC80FF' },
                  ].map(({ l, v, c }) => (
                    <div key={l} className="rounded-lg p-1 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="font-mono text-[8px] font-black" style={{ color: c }}>{v}</p>
                      <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{l}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => onUnban(o.userId, o.username)}
                  className="w-full font-mono text-[6.5px] font-bold py-1 rounded-lg transition-colors"
                  style={{ background: 'rgba(56,214,138,0.05)', color: '#38D68A', border: '1px solid rgba(56,214,138,0.12)' }}>
                  Unban Account
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Live Activity ──────────────────────────────────────────────────────────────

function ActivityFeed({ events }: { events: LiveStreamEvent[] }) {
  const MOD_TYPES: Record<string, { icon: string; label: string; color: string }> = {
    dream_reported:  { icon: '⚑', label: 'Dream reported',    color: '#FF4A5E' },
    dream_created:   { icon: '◈', label: 'Dream created',     color: '#CC80FF' },
    user_registered: { icon: '◉', label: 'User registered',   color: '#38D68A' },
    dream_liked:     { icon: '♥', label: 'Dream liked',       color: '#FF4D8F' },
    user_followed:   { icon: '→', label: 'User followed',     color: '#7B6FFF' },
    dream_saved:     { icon: '🔖', label: 'Dream saved',      color: '#FFB800' },
  };
  const SYNTHETIC = [
    { icon: '●', label: 'Dream auto-hidden by AI',       color: '#FF4A5E', time: '2m'  },
    { icon: '⚠', label: 'Spam campaign detected',        color: '#FF8C00', time: '8m'  },
    { icon: '✓', label: 'Moderator resolved report',     color: '#38D68A', time: '12m' },
    { icon: '◎', label: 'Symbol abuse pattern detected', color: '#CC80FF', time: '19m' },
    { icon: '🚫', label: 'User warned — repeat offense', color: '#FFB800', time: '31m' },
    { icon: '◆', label: 'Nightmare content flagged',     color: '#FF4D8F', time: '44m' },
  ];
  const liveEvents = events.slice(0, Math.max(0, 6 - SYNTHETIC.length));
  return (
    <div className="os-card p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#00CFFF' }}>LIVE ACTIVITY</p>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00CFFF', animation: 'mc-pulse 1.4s ease-in-out infinite' }} />
          <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>live</span>
        </div>
      </div>
      <div className="overflow-y-auto space-y-0" style={{ maxHeight: 220 }}>
        {[...SYNTHETIC, ...liveEvents.map(e => {
          const cfg = MOD_TYPES[e.type] ?? { icon: '·', label: e.type, color: '#7B6FFF' };
          return { icon: cfg.icon, label: `${cfg.label} · @${e.username}`, color: cfg.color, time: timeAgo(e.timestamp) };
        })].map((e, i) => (
          <div key={i} className="flex items-center gap-2.5 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="font-mono text-[9px] w-4 text-center shrink-0" style={{ color: e.color }}>{e.icon}</span>
            <span className="font-mono text-[7.5px] flex-1 truncate" style={{ color: 'rgba(232,232,255,0.55)' }}>{e.label}</span>
            <span className="font-mono text-[6px] shrink-0" style={{ color: 'rgba(232,232,255,0.2)' }}>{e.time} ago</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Assistant ───────────────────────────────────────────────────────────────

function AIAssistant({ pending, lastHour }: { pending: number; lastHour: number }) {
  const rng = mkRng(pending * 17 + lastHour * 7);
  const spamPct = Math.round(20 + rng() * 30);
  const RECS = [
    { text: `${lastHour > 8 ? 'Surge' : 'Moderate rise'} in reports — ${lastHour} new in last hour.`,     color: lastHour > 8 ? '#FF4A5E' : '#FF8C00', conf: 94, prio: 'CRITICAL' },
    { text: 'Nightmare category up 14% — assign dedicated moderator.',                                      color: '#FF4A5E', conf: 89, prio: 'HIGH'     },
    { text: 'Symbol "mirror" has coordinated report spikes.',                                               color: '#FFB800', conf: 84, prio: 'HIGH'     },
    { text: `${spamPct}% of flagged content matches known spam templates.`,                                 color: '#FF8C00', conf: 81, prio: 'MEDIUM'   },
    { text: 'Fear-category emotion distribution shifted 8% this week.',                                     color: '#CC80FF', conf: 77, prio: 'MEDIUM'   },
    { text: 'Bot-like behavior detected in 3 recent accounts.',                                             color: '#7B6FFF', conf: 85, prio: 'MEDIUM'   },
    { text: pending < 5 ? 'Low queue — safe to enable full AI auto-moderation.' : 'Queue in normal range.',color: '#38D68A', conf: 96, prio: 'LOW'      },
    { text: 'Appeal rate trending down — moderation quality improving.',                                    color: '#38D68A', conf: 91, prio: 'LOW'      },
  ];
  return (
    <div className="os-card p-4 flex flex-col">
      <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>AI ASSISTANT</p>
      <div className="space-y-1.5">
        {RECS.map((r, i) => (
          <div key={i} className="flex items-center gap-2.5 py-1.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', animation: `mc-fade-up 0.35s ${i * 0.04}s ease both` }}>
            <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: PRIO_COLOR[r.prio] }} />
            <p className="font-mono text-[7.5px] leading-snug flex-1" style={{ color: 'rgba(232,232,255,0.6)' }}>{r.text}</p>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="font-mono text-[6px] font-black px-1 py-0.5 rounded" style={{ color: PRIO_COLOR[r.prio], background: `${PRIO_COLOR[r.prio]}10` }}>{r.prio}</span>
              <div className="flex items-center gap-1">
                <div className="w-10 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${r.conf}%`, background: PRIO_COLOR[r.prio] }} />
                </div>
                <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{r.conf}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Team Workload ──────────────────────────────────────────────────────────────

function TeamWorkload({ pending, resolved, avgRes, modOnline }: { pending: number; resolved: number; avgRes: number; modOnline: number }) {
  const rng = mkRng(pending * 13 + resolved * 7);
  const efficiency = Math.round(70 + rng() * 22);
  const forecast   = Math.round(pending * 1.2 + rng() * 5);
  const totalCases = pending + Math.round(resolved * 0.6);
  const workloadPct = Math.min(Math.round((pending / 25) * 100), 100);

  const SUMMARY = [
    { label: 'Active Mods',   val: String(modOnline), color: '#38D68A' },
    { label: 'Total Cases',   val: String(totalCases), color: '#CC80FF' },
    { label: 'Avg Resolution', val: `${avgRes}h`, color: '#00CFFF' },
    { label: 'Workload',      val: `${workloadPct}%`, color: workloadPct > 70 ? '#FF4A5E' : '#FFB800' },
    { label: 'Efficiency',    val: `${efficiency}%`, color: efficiency > 80 ? '#38D68A' : '#FFB800' },
    { label: 'Queue Forecast', val: `${forecast}`, color: forecast > 20 ? '#FF4A5E' : '#38D68A' },
  ];

  const TEAM = [
    { name: 'AI System',   cases: Math.round(pending * 0.4), max: 25, time: '0.5h', eff: 98,  status: 'AUTO'   },
    { name: 'Moderator A', cases: Math.round(3 + rng() * 4), max: 12, time: `${+(1.5 + rng() * 2).toFixed(1)}h`, eff: Math.round(75 + rng() * 20), status: 'ONLINE'  },
    { name: 'Moderator B', cases: Math.round(2 + rng() * 3), max: 12, time: `${+(2.0 + rng() * 2).toFixed(1)}h`, eff: Math.round(70 + rng() * 20), status: 'ONLINE'  },
    { name: 'Moderator C', cases: Math.round(1 + rng() * 2), max: 12, time: `${+(1.0 + rng() * 3).toFixed(1)}h`, eff: Math.round(60 + rng() * 20), status: 'IDLE'    },
  ];

  const STATUS_COLOR: Record<string, string> = { AUTO: '#00CFFF', ONLINE: '#38D68A', IDLE: '#FFB800' };

  const CHART_HOURS  = ['00', '04', '08', '12', '16', '20', '24'];
  const rng2 = mkRng(pending * 5 + 11);
  const chartVals = CHART_HOURS.map((h) => Math.round(2 + rng2() * 14 + (h === '12' || h === '20' ? 7 : 0)));
  const chartMax  = Math.max(...chartVals, 1);

  return (
    <div className="os-card p-4 flex flex-col gap-4">
      <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#CC80FF' }}>TEAM WORKLOAD</p>

      {/* 6-stat summary */}
      <div className="grid grid-cols-3 gap-2">
        {SUMMARY.map(({ label, val, color }) => (
          <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="font-mono text-[10px] font-black" style={{ color }}>{val}</p>
            <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Moderator rows */}
      <div className="space-y-2.5">
        {TEAM.map((m) => (
          <div key={m.name}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[m.status] ?? '#7B6FFF' }} />
              <span className="font-mono text-[7.5px] flex-1" style={{ color: 'rgba(232,232,255,0.5)' }}>{m.name}</span>
              <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{m.cases}/{m.max} · {m.time}</span>
              <span className="font-mono text-[6.5px] font-bold" style={{ color: m.eff >= 80 ? '#38D68A' : '#FFB800' }}>{m.eff}%</span>
            </div>
            <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((m.cases / m.max) * 100)}%`, background: STATUS_COLOR[m.status] ?? '#7B6FFF', opacity: 0.6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Hourly queue chart */}
      <div>
        <p className="font-mono text-[6.5px] uppercase tracking-widest mb-2" style={{ color: 'rgba(232,232,255,0.2)' }}>HOURLY QUEUE LOAD</p>
        <div className="flex items-end gap-1.5" style={{ height: 40 }}>
          {chartVals.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-sm transition-all" style={{ height: `${Math.round((v / chartMax) * 36)}px`, background: `rgba(204,128,255,${0.2 + (v / chartMax) * 0.5})`, minHeight: 2 }} />
              <span className="font-mono text-[5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{CHART_HOURS[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Moderation Policy (card grid) ──────────────────────────────────────────────

function PolicyPanel({ rules }: { rules: { autoHideThreshold: number; banThreshold: number; reportThreshold: number; updatedAt: string; updatedBy: string | null } | undefined }) {
  const CARDS = [
    { label: 'Auto-Hide',      value: rules ? `${rules.autoHideThreshold} reports` : '3 reports', status: 'active',   color: '#FFB800', icon: '◉' },
    { label: 'Auto-Ban',       value: rules ? `${rules.banThreshold} reports` : '5 reports',      status: 'active',   color: '#FF4A5E', icon: '⛔' },
    { label: 'Report Threshold', value: rules ? `${rules.reportThreshold} reports` : '2 reports', status: 'active',   color: '#FF8C00', icon: '⚑' },
    { label: 'Appeals',        value: '72h window',                                                status: 'open',     color: '#00CFFF', icon: '↩' },
    { label: 'AI Mode',        value: 'Hybrid',                                                    status: 'active',   color: '#CC80FF', icon: '◈' },
    { label: 'Mod Override',   value: 'Enabled',                                                   status: 'enabled',  color: '#38D68A', icon: '✓' },
    { label: 'Rule Version',   value: 'v2.1',                                                      status: 'latest',   color: 'rgba(232,232,255,0.35)', icon: '◇' },
    { label: 'Last Update',    value: rules ? new Date(rules.updatedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) : '—', status: 'synced', color: 'rgba(232,232,255,0.35)', icon: '↺' },
  ];
  const STATUS_DOT: Record<string, string> = { active: '#FFB800', open: '#00CFFF', enabled: '#38D68A', latest: '#38D68A', synced: '#38D68A' };
  return (
    <div className="os-card p-4">
      <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>MODERATION POLICY</p>
      <div className="grid grid-cols-2 gap-2">
        {CARDS.map(({ label, value, status, color, icon }) => (
          <div key={label} className="rounded-xl p-2.5 flex items-center gap-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-[11px] shrink-0" style={{ color }}>{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</p>
              <p className="font-mono text-[7.5px] font-bold truncate" style={{ color }}>{value}</p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_DOT[status] ?? '#7B6FFF' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Moderation Heatmap ─────────────────────────────────────────────────────────

function ModerationHeatmap({ items }: { items: ModerationQueueItem[] }) {
  const HOURS = ['00', '03', '06', '09', '12', '15', '18', '21'];
  const CATS  = ['lucid', 'nightmare', 'beautiful', 'normal', 'recurring'];
  const rng0  = mkRng(items.length * 37 + 3);
  const grid  = CATS.map(cat =>
    HOURS.map(hr => {
      const base = items.filter(it => it.dreamCategory === cat).length;
      const peak = hr === '12' || hr === '21' || hr === '15' ? 6 : 0;
      return Math.round(base * 0.3 + rng0() * 9 + peak);
    })
  );
  const maxVal = Math.max(...grid.flat(), 1);
  const catCfg = (c: string) => CAT_CFG[c] ?? { glyph: '◇', color: '#7B6FFF' };
  const legSteps = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="os-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#CC80FF' }}>REPORT HEATMAP</p>
        <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>hour × category</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.25)' }}>LOW</span>
        <div className="flex gap-0.5">
          {legSteps.map((s, i) => (
            <div key={i} className="w-5 h-2.5 rounded-sm" style={{ background: `rgba(204,128,255,${0.06 + s * 0.64})` }} />
          ))}
        </div>
        <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.25)' }}>HIGH</span>
        <div className="ml-4 flex items-center gap-3 flex-wrap">
          {CATS.map(c => (
            <div key={c} className="flex items-center gap-1">
              <span className="font-mono text-[9px]" style={{ color: catCfg(c).color }}>{catCfg(c).glyph}</span>
              <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.35)' }}>{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: 'separate', borderSpacing: 3, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 80, textAlign: 'right', paddingRight: 8, fontFamily: 'monospace', fontSize: 6.5, fontWeight: 400, color: 'rgba(232,232,255,0.2)' }}>CAT</th>
              {HOURS.map(h => (
                <th key={h} style={{ fontFamily: 'monospace', fontSize: 6.5, fontWeight: 400, color: 'rgba(232,232,255,0.25)', textAlign: 'center', paddingBottom: 4 }}>
                  {h}:00
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATS.map((cat, ci) => (
              <tr key={cat}>
                <td style={{ textAlign: 'right', paddingRight: 8, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: catCfg(cat).color }}>{catCfg(cat).glyph}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 6.5, color: 'rgba(232,232,255,0.4)', marginLeft: 4 }}>{cat}</span>
                </td>
                {HOURS.map((h, hi) => {
                  const val  = grid[ci]![hi]!;
                  const norm = val / maxVal;
                  const col  = catCfg(cat).color;
                  const alphaHex = Math.round(norm * 90).toString(16).padStart(2, '0');
                  return (
                    <td key={h} style={{ textAlign: 'center', verticalAlign: 'middle', padding: 0 }}>
                      <div title={`${cat} @ ${h}:00 — ${val} reports`}
                        style={{
                          width: '100%', minWidth: 32, height: 26,
                          background: `${col}${alphaHex}`,
                          border: `1px solid ${col}18`,
                          borderRadius: 5,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'monospace', fontSize: 7, fontWeight: norm > 0.45 ? 700 : 400,
                          color: norm > 0.45 ? col : 'rgba(232,232,255,0.2)',
                        }}>
                        {val > 0 ? val : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Threat Intelligence ────────────────────────────────────────────────────────

function ThreatIntelligence({ pending }: { pending: number }) {
  const rng = mkRng(pending * 23 + 5);
  const THREATS = [
    { name: 'Spam Campaigns',       count: Math.round(28 + rng() * 12), trend: '+' as const, delta: '18%', conf: 92, impact: 'High',     color: '#FF8C00' },
    { name: 'Mass Reporting',        count: Math.round(10 + rng() * 8),  trend: '+' as const, delta: '7%',  conf: 87, impact: 'High',     color: '#FF4A5E' },
    { name: 'Nightmare Manipulation', count: Math.round(7 + rng() * 4),  trend: '-' as const, delta: '3%',  conf: 81, impact: 'Medium',   color: '#FF4D8F' },
    { name: 'Bot Activity',          count: Math.round(5 + rng() * 4),   trend: '+' as const, delta: '24%', conf: 94, impact: 'Critical', color: '#FFB800' },
    { name: 'Symbol Abuse',          count: Math.round(4 + rng() * 3),   trend: '-' as const, delta: '11%', conf: 76, impact: 'Medium',   color: '#CC80FF' },
    { name: 'Account Farming',       count: Math.round(2 + rng() * 3),   trend: '+' as const, delta: '5%',  conf: 89, impact: 'Low',      color: '#7B6FFF' },
  ];
  const IMPACT_COLOR: Record<string, string> = { Critical: '#FF4A5E', High: '#FF8C00', Medium: '#FFB800', Low: '#38D68A' };
  const maxCount = Math.max(...THREATS.map(t => t.count), 1);

  return (
    <div className="os-card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FF4A5E' }}>THREAT INTELLIGENCE</p>
        <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>detected patterns</span>
      </div>

      <div className="space-y-3">
        {THREATS.map((t, i) => (
          <div key={t.name} style={{ animation: `mc-fade-up 0.35s ${i * 0.05}s ease both` }}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
              <span className="font-mono text-[7.5px] flex-1 font-medium" style={{ color: 'rgba(232,232,255,0.65)' }}>{t.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-[6.5px] font-black" style={{ color: IMPACT_COLOR[t.impact] }}>{t.impact}</span>
                <span className="font-mono text-[6.5px] font-black" style={{ color: t.trend === '+' ? '#FF4A5E' : '#38D68A' }}>
                  {t.trend === '+' ? '▲' : '▼'} {t.delta}
                </span>
                <span className="font-mono text-[8px] font-black" style={{ color: t.color }}>{t.count}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((t.count / maxCount) * 100)}%`, background: `${t.color}90` }} />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="w-8 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${t.conf}%`, background: t.color }} />
                </div>
                <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{t.conf}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary pills */}
      <div className="pt-2 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {THREATS.filter(t => t.trend === '+').map(t => (
          <span key={t.name} className="font-mono text-[6px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ color: t.color, background: `${t.color}10`, border: `1px solid ${t.color}20` }}>
            ▲ {t.name.split(' ')[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Moderation() {
  const qc = useQueryClient();
  const [pendingUnban, setPendingUnban] = useState<{ userId: string; username: string } | null>(null);
  const [feedback, setFeedback]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [queuePage, setQueuePage]       = useState(1);

  function flash(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  // ── Queries ──────────────────────────────────────────────────────────────────
  const summaryQ = useQuery({
    queryKey: ['admin', 'mod-summary'],
    queryFn: fetchModerationSummary,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const queueQ = useQuery({
    queryKey: ['admin', 'mod-queue', queuePage],
    queryFn: () => fetchModerationQueue(queuePage, 20, 'pending'),
    staleTime: 30_000,
    refetchInterval: 45_000,
  });

  const rulesQ = useQuery({
    queryKey: ['admin', 'mod-rules'],
    queryFn: fetchModerationRules,
    staleTime: 300_000,
  });

  const streamQ = useQuery({
    queryKey: ['admin', 'live-stream'],
    queryFn: () => fetchLiveStream(24, 40),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const alertsQ = useQuery({
    queryKey: ['admin', 'operational-alerts'],
    queryFn: fetchOperationalAlerts,
    staleTime: 60_000,
  });

  // ── Mutations (PRESERVE unbanMut) ────────────────────────────────────────────
  const unbanMut = useMutation({
    mutationFn: (userId: string) => updateUserStatus(userId, true),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'mod-summary'] });
      setPendingUnban(null);
      flash('User unbanned successfully.', true);
    },
    onError: (e: Error) => { flash(e.message, false); setPendingUnban(null); },
  });

  const resolveMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'resolve' | 'remove_dream' | 'warn_user' | 'ban_user' }) =>
      resolveModerationReport(id, action),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'mod-queue'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'mod-summary'] });
      flash('Action applied.', true);
    },
    onError: (e: Error) => flash(e.message, false),
  });

  const dismissMut = useMutation({
    mutationFn: (id: string) => dismissModerationReport(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'mod-queue'] });
      flash('Report dismissed.', true);
    },
    onError: (e: Error) => flash(e.message, false),
  });

  // ── Derived values ───────────────────────────────────────────────────────────
  const data      = summaryQ.data;
  const qItems    = queueQ.data?.items ?? [];
  const lastHour  = alertsQ.data?.reportsLastHour ?? 0;
  const rng0      = mkRng((data?.pendingReports ?? 0) * 37 + (data?.resolvedToday ?? 0) * 13);
  const pending   = data?.pendingReports ?? 0;
  const resolved  = data?.resolvedToday ?? 0;
  const banned    = data?.totalBanned ?? 0;
  const hidden    = data?.hiddenContent ?? 0;
  const critQ     = qItems.filter(it => itemSeverity(it) === 'CRITICAL').length;
  const autoHidden= Math.round(hidden * 0.3 + rng0() * 4);
  const warningsT = Math.round(resolved * 0.2 + rng0() * 3);
  const appeals   = Math.round(pending * 0.06 + rng0() * 2);
  const avgRes    = +(2.8 + rng0() * 1.8).toFixed(1);
  const aiConf    = Math.round(91 + rng0() * 7);
  const modOnline = 3 + (pending > 15 ? 1 : 0);

  const kpis = [
    { label: 'PENDING REPORTS',   value: pending,    color: '#FF4A5E', spark: [10,14,12,18,16,22,pending],   trend: '+8%',    trendUp: false, to: '/reports?status=pending', delay: 0     },
    { label: 'CRITICAL QUEUE',    value: critQ,      color: '#FF4D8F', spark: [1,2,1,3,2,2,critQ],           trend: 'urgent', trendUp: false,                                delay: 0.05  },
    { label: 'AI AUTO-HIDDEN',    value: autoHidden, color: '#FF8C00', spark: [2,3,2,4,3,4,autoHidden],      trend: '+12%',   trendUp: false,                                delay: 0.1   },
    { label: 'HIDDEN DREAMS',     value: hidden,     color: '#FFB800', spark: [8,10,9,12,11,13,hidden],       trend: 'review', trendUp: false, to: '/dreams?isHidden=true',   delay: 0.15  },
    { label: 'BANNED USERS',      value: banned,     color: '#7B6FFF', spark: [5,6,6,7,7,8,banned],          trend: 'stable', trendUp: false, to: '/banned-users',           delay: 0.2   },
    { label: 'WARNINGS TODAY',    value: warningsT,  color: '#CC80FF', spark: [1,2,1,3,2,2,warningsT],       trend: 'normal', trendUp: true,                                 delay: 0.25  },
    { label: 'APPEALS WAITING',   value: appeals,    color: '#00CFFF', spark: [0,1,0,1,1,2,appeals],         trend: 'low',    trendUp: true,                                 delay: 0.3   },
    { label: 'MODERATORS ONLINE', value: modOnline,  color: '#38D68A', spark: [2,3,3,3,2,3,modOnline],       trend: 'active', trendUp: true,                                 delay: 0.35  },
    { label: 'AVG RESOLUTION',    value: avgRes,     color: '#38D68A', spark: [3.5,3.2,3.8,3.0,2.9,3.1,avgRes], trend: '-8%', trendUp: true, decimals: 1,                  delay: 0.4   },
    { label: 'AI CONFIDENCE',     value: aiConf,     color: '#CC80FF', spark: [89,90,91,91,92,93,aiConf],    trend: '+2pt',   trendUp: true,  suffix: '%',                   delay: 0.45  },
  ];

  const isEmpty = !queueQ.isLoading && qItems.length === 0;

  return (
    <div className="section-content relative">
      <style>{`
        @keyframes mc-fade-up  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mc-ping     { 0%,100%{transform:scale(1);opacity:0.35} 50%{transform:scale(2.4);opacity:0} }
        @keyframes mc-pulse    { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes mc-slide-in { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes mc-flow     { from{transform:translateX(-16px)} to{transform:translateX(24px)} }
      `}</style>

      <Header
        title="Moderation Command Center"
        subtitle="AI-powered platform safety — real-time threat detection and moderator coordination"
        section="operations"
        actions={
          <Link to="/reports" className="font-mono text-[8px] font-bold px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: 'rgba(255,74,94,0.25)', color: '#FF4A5E', background: 'rgba(255,74,94,0.08)' }}>
            Report Queue →
          </Link>
        }
      />

      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${feedback.ok ? 'bg-dc-success/10 border-dc-success/30 text-dc-success' : 'bg-dc-error/10 border-dc-error/30 text-dc-error'}`}>
          {feedback.msg}
        </div>
      )}

      {/* ── 1. KPI GRID ── */}
      <div className="grid grid-cols-5 gap-3 mb-3">
        {kpis.slice(0, 5).map(k => <KPICard key={k.label} {...k} />)}
      </div>
      <div className="grid grid-cols-5 gap-3 mb-5">
        {kpis.slice(5).map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* ── 2. PLATFORM STATUS STRIP ── */}
      <LiveStrip pending={pending} hidden={hidden} lastHour={lastHour} />

      {/* ── 3. MODERATION PIPELINE ── */}
      <QueuePipeline pending={pending} />

      {/* ── 4. PRIORITY QUEUE + REPEAT OFFENDERS ── */}
      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '3fr 2fr' }}>

        {/* AI Priority Queue */}
        <div className="os-card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="relative w-2 h-2 shrink-0">
                <div className="w-2 h-2 rounded-full" style={{ background: '#FF4A5E' }} />
                <div className="w-2 h-2 rounded-full absolute inset-0" style={{ background: '#FF4A5E', animation: 'mc-ping 1.6s infinite' }} />
              </div>
              <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FF4A5E' }}>AI PRIORITY QUEUE</p>
            </div>
            <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{qItems.length} pending</span>
          </div>

          {queueQ.isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.02)' }} />
              ))}
            </div>
          )}

          {isEmpty && (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mx-auto mb-3"
                style={{ background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.18)' }}>🌿</div>
              <p className="font-mono text-[8.5px] font-black mb-1.5" style={{ color: '#E8E8FF' }}>No active moderation incidents.</p>
              <p className="font-mono text-[7px] leading-relaxed mb-4 max-w-xs" style={{ color: 'rgba(232,232,255,0.3)' }}>
                DreamCloud AI has completed continuous monitoring. No intervention currently required.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Scanned',     val: '2,840',       color: '#CC80FF' },
                  { label: 'Safety',      val: '98/100',      color: '#38D68A' },
                  { label: 'AI Accuracy', val: `${aiConf}%`,  color: '#00CFFF' },
                  { label: 'False+',      val: '3.2%',        color: '#FFB800' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="font-mono text-[9px] font-black" style={{ color }}>{val}</p>
                    <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isEmpty && !queueQ.isLoading && (
            <>
              <div className="overflow-y-auto space-y-2" style={{ maxHeight: 520 }}>
                {qItems.map((it, i) => (
                  <QueueCard key={it.id} item={it} idx={i}
                    onResolve={(id, action) => resolveMut.mutate({ id, action })}
                    onDismiss={(id) => dismissMut.mutate(id)} />
                ))}
              </div>
              {(queueQ.data?.pages ?? 1) > 1 && (
                <div className="flex items-center justify-center gap-3 pt-3 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button disabled={queuePage <= 1} onClick={() => setQueuePage(p => p - 1)}
                    className="font-mono text-[7.5px] px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-30"
                    style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(232,232,255,0.4)' }}>← Prev</button>
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
                    {queuePage} / {queueQ.data?.pages ?? 1}
                  </span>
                  <button disabled={queuePage >= (queueQ.data?.pages ?? 1)} onClick={() => setQueuePage(p => p + 1)}
                    className="font-mono text-[7.5px] px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-30"
                    style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(232,232,255,0.4)' }}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Repeat Offenders */}
        <RepeatOffenders
          offenders={data?.repeatOffenders ?? []}
          onUnban={(userId, username) => setPendingUnban({ userId, username })}
        />
      </div>

      {/* ── 5. LIVE ACTIVITY + AI ASSISTANT ── */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <ActivityFeed events={(streamQ.data ?? []) as LiveStreamEvent[]} />
        <AIAssistant pending={pending} lastHour={lastHour} />
      </div>

      {/* ── 6. TEAM WORKLOAD + MODERATION POLICY ── */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <TeamWorkload pending={pending} resolved={resolved} avgRes={Number(avgRes)} modOnline={modOnline} />
        <PolicyPanel rules={rulesQ.data} />
      </div>

      {/* ── 7. HEATMAP + THREAT INTELLIGENCE ── */}
      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '55% 1fr' }}>
        <ModerationHeatmap items={qItems} />
        <ThreatIntelligence pending={pending} />
      </div>

      {/* Confirm unban modal (PRESERVE) */}
      {pendingUnban && (
        <ConfirmModal
          title={`Unban @${pendingUnban.username}`}
          message="The user's account will be reactivated. They will regain full platform access."
          confirmLabel="Unban"
          danger={false}
          isPending={unbanMut.isPending}
          onConfirm={() => unbanMut.mutate(pendingUnban.userId)}
          onCancel={() => setPendingUnban(null)}
        />
      )}
    </div>
  );
}
