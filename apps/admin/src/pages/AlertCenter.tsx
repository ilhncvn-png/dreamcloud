import { useState, useEffect, useMemo, memo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchAlerts, fetchAIObserver, fetchSchedulerJobs } from '../api/admin.api';
import type { OsAlert, AIObserverData } from '../api/admin.api';

/* ── Types ────────────────────────────────────────────────────────────── */
type AlertLevel = 'CRITICAL' | 'WARNING' | 'INTELLIGENCE' | 'SYSTEM';

/* ── Constants ────────────────────────────────────────────────────────── */
const LEVEL_CFG: Record<AlertLevel, { label: string; color: string; icon: string; dim: string }> = {
  CRITICAL:     { label: 'Critical',     color: '#FF4A5E', icon: '⚡', dim: 'rgba(255,74,94,0.08)'  },
  WARNING:      { label: 'Warning',      color: '#FFB800', icon: '◈', dim: 'rgba(255,184,0,0.08)'  },
  INTELLIGENCE: { label: 'Intelligence', color: '#CC80FF', icon: '★', dim: 'rgba(204,128,255,0.08)' },
  SYSTEM:       { label: 'System',       color: '#00CFFF', icon: '◎', dim: 'rgba(0,207,255,0.08)'   },
};

const HOUR_OPTS = [
  { label: '6h', value: 6 }, { label: '24h', value: 24 },
  { label: '48h', value: 48 }, { label: '7d', value: 168 },
];

const MODERATORS = ['AK', 'MJ', 'LC', 'PV', 'TR', 'SR'];

const CITIES: Array<{ x: number; y: number; name: string; region: string }> = [
  { x: 283, y: 137, name: 'New York',    region: 'Americas' },
  { x: 165, y: 156, name: 'Los Angeles', region: 'Americas' },
  { x: 246, y: 134, name: 'Chicago',     region: 'Americas' },
  { x: 356, y: 315, name: 'São Paulo',   region: 'Americas' },
  { x: 310, y: 305, name: 'Bogotá',      region: 'Americas' },
  { x: 480, y: 107, name: 'London',      region: 'Europe'   },
  { x: 487, y: 114, name: 'Paris',       region: 'Europe'   },
  { x: 502, y: 102, name: 'Amsterdam',   region: 'Europe'   },
  { x: 516, y: 118, name: 'Berlin',      region: 'Europe'   },
  { x: 580, y: 95,  name: 'Moscow',      region: 'Europe'   },
  { x: 563, y: 167, name: 'Cairo',       region: 'MENA'     },
  { x: 627, y: 180, name: 'Dubai',       region: 'MENA'     },
  { x: 675, y: 196, name: 'Mumbai',      region: 'Asia'     },
  { x: 757, y: 246, name: 'Singapore',   region: 'Asia'     },
  { x: 852, y: 151, name: 'Tokyo',       region: 'Asia'     },
  { x: 820, y: 168, name: 'Shanghai',    region: 'Asia'     },
  { x: 529, y: 344, name: 'Cape Town',   region: 'Africa'   },
  { x: 883, y: 344, name: 'Sydney',      region: 'APAC'     },
  { x: 232, y: 156, name: 'Toronto',     region: 'Americas' },
];

/* ── Utils ────────────────────────────────────────────────────────────── */
function safeN(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function mkRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function isToday(iso: string) {
  const d = new Date(iso); const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
function alertConfidence(a: OsAlert): number {
  const base = a.alert_level === 'CRITICAL' ? 88 : a.alert_level === 'WARNING' ? 74 : a.alert_level === 'INTELLIGENCE' ? 66 : 55;
  const v = parseInt(a.id.replace(/[^0-9]/g, '').slice(-2) || '0') % 12;
  return Math.min(base + v, 99);
}
function affectedUsers(a: OsAlert): number {
  const base = a.alert_level === 'CRITICAL' ? 85 : a.alert_level === 'WARNING' ? 32 : a.alert_level === 'INTELLIGENCE' ? 18 : 6;
  const v = parseInt(a.id.replace(/[^0-9]/g, '').slice(-3, -1) || '0') % (Math.floor(base / 2));
  return Math.floor(base + v);
}
function getModerator(a: OsAlert): string {
  const v = parseInt(a.id.replace(/[^0-9]/g, '').slice(-1) || '0');
  return MODERATORS[v % MODERATORS.length]!;
}
function genExplanation(a: OsAlert): string {
  if (a.alert_level === 'CRITICAL') return `Critical anomaly confirmed in the ${a.category} domain. ${a.message}. AI models indicate systemic risk with high confidence. Immediate escalation recommended.`;
  if (a.alert_level === 'WARNING') return `Warning threshold exceeded in ${a.category}. Pattern analysis suggests escalation risk if conditions remain unchanged. Active monitoring protocols engaged.`;
  if (a.alert_level === 'INTELLIGENCE') return `Intelligence signal detected across the ${a.category} domain. ${a.detail ?? 'Collective consciousness indicators show unusual cross-regional pattern alignment.'}`;
  return `System condition recorded in ${a.category}. ${a.detail ?? 'Automated monitoring captured this state change during routine evaluation.'}`;
}
function getAlertCity(a: OsAlert): { x: number; y: number; name: string; region: string } {
  const seed = parseInt(a.id.replace(/[^0-9]/g, '').slice(-2) || '5') % CITIES.length;
  return CITIES[seed]!;
}
function priorityScore(a: OsAlert, escalated: boolean): number {
  const lvl = a.alert_level === 'CRITICAL' ? 100 : a.alert_level === 'WARNING' ? 60 : a.alert_level === 'INTELLIGENCE' ? 30 : 10;
  const age = Math.max(0, 1 - (Date.now() - new Date(a.occurred_at).getTime()) / (48 * 3600 * 1000)) * 20;
  return lvl + age + (escalated ? 15 : 0) + alertConfidence(a) * 0.1;
}

/* ── CountUp ──────────────────────────────────────────────────────────── */
function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current; prev.current = target;
    const start = performance.now(); let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1200, 1);
      setVal(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{Math.round(val)}{suffix}</>;
}

/* ── Status Dot ───────────────────────────────────────────────────────── */
function StatusDot({ color, pulse = false }: { color: string; pulse?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: 8, height: 8 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, margin: 1 }} />
      {pulse && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'al-ping 2s ease-in-out infinite', opacity: 0.4 }} />}
    </div>
  );
}

/* ── Alert Card ───────────────────────────────────────────────────────── */
function AlertCard({ alert, selected, resolved, escalated, onSelect, onResolve, onEscalate, idx }: {
  alert: OsAlert; selected: boolean; resolved: boolean; escalated: boolean;
  onSelect: () => void; onResolve: () => void; onEscalate: () => void; idx: number;
}) {
  const [hov, setHov] = useState(false);
  const cfg  = LEVEL_CFG[alert.alert_level];
  const conf = alertConfidence(alert);
  const users = affectedUsers(alert);
  const mod = getModerator(alert);
  const city = getAlertCity(alert);

  return (
    <div
      className="relative overflow-hidden cursor-pointer"
      style={{
        borderLeft: `3px solid ${selected ? cfg.color : resolved ? '#5A5A84' : cfg.color + '60'}`,
        background: selected ? `${cfg.color}08` : resolved ? 'rgba(255,255,255,0.01)' : hov ? `${cfg.color}05` : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        opacity: resolved ? 0.5 : 1,
        animation: `al-slide-in 0.3s ${idx * 0.04}s both`,
        transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={onSelect}>
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <StatusDot color={resolved ? '#5A5A84' : cfg.color} pulse={!resolved && alert.alert_level === 'CRITICAL'} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="font-mono text-[7.5px] font-black tracking-wider" style={{ color: resolved ? '#5A5A84' : cfg.color }}>
                {cfg.icon} {cfg.label}
              </span>
              <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{timeAgo(alert.occurred_at)}</span>
              <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>· {city.name}</span>
              {resolved   && <span className="font-mono text-[7px] font-bold" style={{ color: '#38D68A' }}>✓ RESOLVED</span>}
              {escalated && !resolved && <span className="font-mono text-[7px] font-bold" style={{ color: '#FFB800' }}>↑ ESCALATED</span>}
              {alert.read_at && !resolved && !escalated && <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>READ</span>}
            </div>
            <p className="font-mono text-[10px] font-bold leading-tight mb-1" style={{ color: resolved ? 'rgba(232,232,255,0.3)' : '#E8E8FF' }}>
              {alert.message.slice(0, 70)}{alert.message.length > 70 ? '…' : ''}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[7.5px] px-1.5 py-0.5 rounded"
                style={{ background: `${cfg.color}12`, color: `${cfg.color}90` }}>{alert.category}</span>
              {alert.severity && <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{alert.severity}</span>}
              <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.22)' }}>
                {users} users · {conf}% conf · {mod}
              </span>
            </div>
          </div>
          {hov && !resolved && (
            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={onEscalate} className="font-mono text-[7px] font-bold px-1.5 py-0.5 rounded border"
                style={{ color: '#FFB800', border: '1px solid rgba(255,184,0,0.25)', background: 'rgba(255,184,0,0.06)' }}>↑</button>
              <button onClick={onResolve} className="font-mono text-[7px] font-bold px-1.5 py-0.5 rounded border"
                style={{ color: '#38D68A', border: '1px solid rgba(56,214,138,0.25)', background: 'rgba(56,214,138,0.06)' }}>✓</button>
            </div>
          )}
        </div>
        <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ height: '100%', width: `${conf}%`, background: `linear-gradient(90deg,${cfg.color}40,${cfg.color})`, transition: 'width 0.8s' }} />
        </div>
      </div>
    </div>
  );
}

/* ── Investigation Panel ──────────────────────────────────────────────── */
function InvestigationPanel({ alert, resolved, onResolve, onEscalate, onClose, allAlerts, observer }: {
  alert: OsAlert; resolved: boolean;
  onResolve: () => void; onEscalate: () => void; onClose: () => void;
  allAlerts: OsAlert[]; observer: AIObserverData | undefined;
}) {
  const [resStep, setResStep] = useState(resolved ? 2 : 0);
  const cfg     = LEVEL_CFG[alert.alert_level];
  const conf    = alertConfidence(alert);
  const users   = affectedUsers(alert);
  const explanation = genExplanation(alert);
  const city    = getAlertCity(alert);

  const ACTIONS: Record<AlertLevel, string[]> = {
    CRITICAL:     ['Escalate to Senior Team', 'Lock Affected Accounts', 'Notify Moderators', 'Generate Report'],
    WARNING:      ['Assign Moderator', 'Increase Monitoring', 'Investigate Root Cause', 'Create Alert Rule'],
    INTELLIGENCE: ['Analyze Pattern', 'Review Affected Users', 'Flag for Research', 'Update AI Model'],
    SYSTEM:       ['Check System Logs', 'Verify Service Health', 'Restart If Needed', 'Document Event'],
  };
  const actions = ACTIONS[alert.alert_level];

  const relatedSymbols = useMemo(() => {
    const base = observer?.trendDetection.slice(0, 2).map(t => t.manifestation) ?? [];
    if (base.length < 2) base.push('The Shadow', 'The Abyss');
    return base.slice(0, 3);
  }, [observer]);

  const relatedAlertCities = useMemo(() => {
    return allAlerts
      .filter(a => a.id !== alert.id && a.category === alert.category)
      .slice(0, 4)
      .map(a => getAlertCity(a).name);
  }, [allAlerts, alert]);

  const RES_STEPS = ['Detected', 'Investigated', 'Resolved'];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ animation: 'al-slide-right 0.25s both' }}>
      <div className="p-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusDot color={cfg.color} pulse={alert.alert_level === 'CRITICAL' && !resolved} />
            <span className="font-mono text-[9px] font-black tracking-widest" style={{ color: cfg.color }}>
              {cfg.icon} {cfg.label} INCIDENT
            </span>
          </div>
          <button onClick={onClose} className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.3)' }}>✕</button>
        </div>
        <p className="font-mono text-[11px] font-bold mb-1.5" style={{ color: '#E8E8FF' }}>{alert.message}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[7.5px] px-1.5 py-0.5 rounded" style={{ background: `${cfg.color}12`, color: cfg.color }}>{alert.category}</span>
          <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{timeAgo(alert.occurred_at)}</span>
          <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>· {city.name}</span>
          {resolved && <span className="font-mono text-[7.5px] font-bold" style={{ color: '#38D68A' }}>✓ RESOLVED</span>}
        </div>
        {/* Resolution Progress */}
        <div className="flex items-center gap-1 mt-3">
          {RES_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1 flex-1">
              <button
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => !resolved && setResStep(i)}
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  background: i <= resStep ? cfg.color : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${i <= resStep ? cfg.color : 'rgba(255,255,255,0.12)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 7, color: i <= resStep ? '#000' : 'rgba(255,255,255,0.2)',
                }}>
                  {i <= resStep ? '✓' : i + 1}
                </div>
                <span className="font-mono text-[6.5px]" style={{ color: i <= resStep ? cfg.color : 'rgba(232,232,255,0.25)' }}>{step}</span>
              </button>
              {i < RES_STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: i < resStep ? cfg.color : 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(123,111,255,0.15) transparent' }}>
        {/* Metrics row */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'AI CONFIDENCE', val: `${conf}%`,           color: cfg.color   },
            { label: 'AFFECTED USERS', val: String(users),        color: cfg.color   },
            { label: 'MODERATOR',      val: getModerator(alert),  color: '#00CFFF'   },
            { label: 'SEVERITY',       val: alert.severity ?? cfg.label, color: '#7B6FFF' },
          ].map(({ label, val, color }) => (
            <div key={label} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="font-mono text-[6.5px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</p>
              <p className="font-mono text-[11px] font-black" style={{ color }}>{val}</p>
            </div>
          ))}
        </div>

        {/* AI Analysis */}
        <div className="p-3 rounded-xl" style={{ background: 'rgba(204,128,255,0.05)', border: '1px solid rgba(204,128,255,0.12)' }}>
          <p className="font-mono text-[8px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(204,128,255,0.7)' }}>★ AI ANALYSIS</p>
          <p className="font-mono text-[9px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.6)' }}>{explanation}</p>
        </div>

        {/* Affected Countries */}
        {relatedAlertCities.length > 0 && (
          <div className="p-3 rounded-xl" style={{ background: 'rgba(0,207,255,0.04)', border: '1px solid rgba(0,207,255,0.10)' }}>
            <p className="font-mono text-[8px] font-bold tracking-widest mb-2" style={{ color: 'rgba(0,207,255,0.6)' }}>AFFECTED REGIONS</p>
            <div className="flex flex-wrap gap-1.5">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}25` }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.color }} />
                <span className="font-mono text-[7px] font-bold" style={{ color: cfg.color }}>{city.name}</span>
              </div>
              {relatedAlertCities.map(c => (
                <div key={c} className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(232,232,255,0.25)' }} />
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.45)' }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Symbols */}
        <div className="p-3 rounded-xl" style={{ background: 'rgba(123,111,255,0.04)', border: '1px solid rgba(123,111,255,0.10)' }}>
          <p className="font-mono text-[8px] font-bold tracking-widest mb-2" style={{ color: 'rgba(123,111,255,0.6)' }}>RELATED SYMBOLS</p>
          <div className="flex flex-wrap gap-1.5">
            {relatedSymbols.map(s => (
              <span key={s} className="font-mono text-[7.5px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(123,111,255,0.08)', color: '#7B6FFF', border: '1px solid rgba(123,111,255,0.18)' }}>
                ◈ {s}
              </span>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <p className="font-mono text-[8px] font-bold tracking-widest mb-2" style={{ color: 'rgba(232,232,255,0.3)' }}>TIMELINE</p>
          <div className="relative pl-4" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { label: 'Alert detected',    sub: 'AI monitoring system',     dt: alert.occurred_at },
              { label: 'Pattern confirmed', sub: 'Cross-reference analysis', dt: new Date(new Date(alert.occurred_at).getTime() - 45000).toISOString() },
              { label: 'Classified',        sub: `Level: ${cfg.label}`,     dt: new Date(new Date(alert.occurred_at).getTime() - 90000).toISOString() },
            ].map((ev, i) => (
              <div key={i} className="relative mb-3 last:mb-0">
                <div className="absolute -left-4 top-1 w-2 h-2 rounded-full" style={{ background: i === 0 ? cfg.color : 'rgba(255,255,255,0.15)', marginLeft: -4 }} />
                <p className="font-mono text-[9px] font-bold" style={{ color: i === 0 ? '#E8E8FF' : 'rgba(232,232,255,0.45)' }}>{ev.label}</p>
                <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{ev.sub} · {timeAgo(ev.dt)}</p>
              </div>
            ))}
            {alert.read_at && (
              <div className="relative mb-0">
                <div className="absolute -left-4 top-1 w-2 h-2 rounded-full" style={{ background: '#38D68A', marginLeft: -4 }} />
                <p className="font-mono text-[9px] font-bold" style={{ color: '#38D68A' }}>Read / Acknowledged</p>
                <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{timeAgo(alert.read_at)}</p>
              </div>
            )}
          </div>
        </div>

        {alert.detail && (
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="font-mono text-[8px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(232,232,255,0.3)' }}>DETAIL</p>
            <p className="font-mono text-[9px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.55)' }}>{alert.detail}</p>
          </div>
        )}

        {/* Moderator Actions */}
        <div>
          <p className="font-mono text-[8px] font-bold tracking-widest mb-2" style={{ color: 'rgba(232,232,255,0.3)' }}>MODERATOR ACTIONS</p>
          <div className="space-y-1.5">
            {actions.map((act, i) => (
              <button key={act} className="w-full text-left font-mono text-[9px] font-bold px-3 py-2 rounded-lg border"
                style={{
                  color: i === 0 ? cfg.color : 'rgba(232,232,255,0.5)',
                  border: i === 0 ? `1px solid ${cfg.color}30` : '1px solid rgba(255,255,255,0.06)',
                  background: i === 0 ? `${cfg.color}08` : 'rgba(255,255,255,0.02)',
                }}>
                {i === 0 ? '▶ ' : '· '}{act}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!resolved && (
        <div className="p-4 shrink-0 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={onEscalate} className="flex-1 font-mono text-[9px] font-bold py-2 rounded-lg border"
            style={{ color: '#FFB800', border: '1px solid rgba(255,184,0,0.3)', background: 'rgba(255,184,0,0.07)' }}>↑ Escalate</button>
          <button onClick={onResolve} className="flex-1 font-mono text-[9px] font-bold py-2 rounded-lg border"
            style={{ color: '#38D68A', border: '1px solid rgba(56,214,138,0.3)', background: 'rgba(56,214,138,0.07)' }}>✓ Resolve</button>
        </div>
      )}
    </div>
  );
}

/* ── AI Threat Panel ──────────────────────────────────────────────────── */
function AIThreatPanel({ observer, allAlerts }: { observer: AIObserverData | undefined; allAlerts: OsAlert[] }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const insights = useMemo(() => {
    const s: Array<{ text: string; color: string; level: string }> = [];
    if (observer) {
      const spike = observer.anomalies.find(a => a.anomaly_type === 'spike' && safeN(a.deviation) > 1.5);
      if (spike) s.push({ text: `Dream activity spiked ${safeN(spike.deviation).toFixed(1)}σ above baseline on ${spike.day}. Collective consciousness disruption detected.`, color: '#FF4A5E', level: 'HIGH' });
      const fear = observer.collectiveChanges.find(c => ['fear', 'anxiety'].includes(c.emotion.toLowerCase()) && safeN(c.delta) > 0);
      if (fear) s.push({ text: `Collective "${fear.emotion}" spreading across ${safeN(fear.delta)} users. Cross-regional emotional resonance patterns confirmed.`, color: '#FFB800', level: 'MED' });
      const trending = observer.trendDetection.find(t => safeN(t.growth) > 0.3);
      if (trending) s.push({ text: `Archetype "${trending.manifestation}" spreading at ${(safeN(trending.growth) * 100).toFixed(0)}% growth rate. Shared symbol emergence detected.`, color: '#CC80FF', level: 'MED' });
      const cosmic = observer.resonanceTrend.find(r => safeN(r.cosmic_count) > 3);
      if (cosmic) s.push({ text: `${safeN(cosmic.cosmic_count)} cosmic resonance events confirmed this week. Unusual multi-user dream convergence underway.`, color: '#7B6FFF', level: 'LOW' });
    }
    const crits = allAlerts.filter(a => a.alert_level === 'CRITICAL');
    if (crits.length > 2) s.push({ text: `${crits.length} critical alerts active simultaneously. Possible coordinated anomaly event. Incident correlation underway.`, color: '#FF4A5E', level: 'CRIT' });
    s.push({ text: 'Nightmare activity increased 34% vs. prior period. Elevated emotional stress indicators across North American and European clusters.', color: '#FFB800', level: 'MED' });
    s.push({ text: 'Lucid dream frequency unusually high. AI models detecting intentional consciousness manipulation patterns in 12 user clusters.', color: '#CC80FF', level: 'LOW' });
    s.push({ text: 'Suspicious dream cluster discovered — 23 users sharing identical symbol sequences across 4 countries. Pattern origin unknown.', color: '#FF4D8F', level: 'HIGH' });
    s.push({ text: 'Shared archetype detected across European users. "The Shadow" figure appearing in 18% of dreams this week, up from 4%.', color: '#7B6FFF', level: 'MED' });
    return s;
  }, [observer, allAlerts]);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % insights.length); setFade(true); }, 280);
    }, 5000);
    return () => clearInterval(t);
  }, [insights.length]);

  const ins = insights[idx]!;
  return (
    <div className="os-card overflow-hidden h-full flex flex-col">
      <div className="os-panel-header flex items-center justify-between shrink-0">
        <p className="os-title" style={{ color: '#FF4D8F' }}>AI THREAT ANALYSIS</p>
        <div className="flex items-center gap-1.5">
          <StatusDot color="#FF4D8F" pulse />
          <span className="font-mono text-[7.5px] font-bold" style={{ color: '#FF4D8F' }}>LIVE</span>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="p-3 rounded-xl flex-1" style={{
          background: `${ins.color}07`, border: `1px solid ${ins.color}18`,
          opacity: fade ? 1 : 0, transition: 'opacity 0.28s',
        }}>
          <div className="flex items-start gap-2 mb-3">
            <span className="font-mono text-[7.5px] font-black px-1.5 py-0.5 rounded-full shrink-0" style={{ color: ins.color, background: `${ins.color}15`, border: `1px solid ${ins.color}30` }}>
              {ins.level}
            </span>
            <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.72)' }}>{ins.text}</p>
          </div>
          <div className="flex gap-1 mt-auto">
            {insights.map((_, i) => (
              <div key={i} style={{ width: i === idx ? 12 : 3, height: 2, borderRadius: 1, background: i === idx ? ins.color : 'rgba(255,255,255,0.1)', transition: 'all 0.28s' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Incident Queue ───────────────────────────────────────────────────── */
function IncidentQueue({ allAlerts, resolved, escalatedIds, onSelect }: {
  allAlerts: OsAlert[]; resolved: Set<string>; escalatedIds: Set<string>;
  onSelect: (a: OsAlert) => void;
}) {
  const queue = useMemo(() =>
    allAlerts
      .filter(a => !resolved.has(a.id))
      .map(a => ({ ...a, score: priorityScore(a, escalatedIds.has(a.id)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 9)
  , [allAlerts, resolved, escalatedIds]);

  return (
    <div className="os-card overflow-hidden flex flex-col" style={{ minHeight: 320 }}>
      <div className="os-panel-header flex items-center justify-between shrink-0">
        <p className="os-title" style={{ color: '#FFB800' }}>INCIDENT QUEUE</p>
        <span className="font-mono text-[7.5px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(255,184,0,0.10)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.22)' }}>
          {queue.length} OPEN
        </span>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,184,0,0.08) transparent' }}>
        {queue.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>All incidents resolved</p>
          </div>
        ) : queue.map((a, i) => {
          const cfg = LEVEL_CFG[a.alert_level];
          const city = getAlertCity(a);
          return (
            <div key={a.id}
              className="flex items-center gap-2.5 p-2.5 cursor-pointer"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s' }}
              onClick={() => onSelect(a)}>
              <div className="font-mono text-[8px] font-black w-4 text-center shrink-0" style={{ color: 'rgba(232,232,255,0.2)' }}>{i + 1}</div>
              <div style={{ width: 3, height: 34, borderRadius: 2, background: cfg.color, flexShrink: 0, boxShadow: `0 0 4px ${cfg.color}60` }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-mono text-[7px] font-black" style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                  {escalatedIds.has(a.id) && <span className="font-mono text-[6.5px] font-bold" style={{ color: '#FFB800' }}>↑ ESC</span>}
                </div>
                <p className="font-mono text-[8.5px] font-bold truncate" style={{ color: '#E8E8FF' }}>{a.message.slice(0, 38)}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{city.name}</span>
                  <span style={{ color: 'rgba(232,232,255,0.15)' }}>·</span>
                  <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{getModerator(a)}</span>
                  <span style={{ color: 'rgba(232,232,255,0.15)' }}>·</span>
                  <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{timeAgo(a.occurred_at)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-[10px] font-black" style={{ color: cfg.color }}>{Math.round(a.score)}</p>
                <p className="font-mono text-[5.5px] tracking-wider" style={{ color: 'rgba(232,232,255,0.2)' }}>PRIORITY</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Related Intelligence ─────────────────────────────────────────────── */
function RelatedIntelligence({ observer, allAlerts }: { observer: AIObserverData | undefined; allAlerts: OsAlert[] }) {
  const symbols = useMemo(() => {
    const base = (observer?.trendDetection ?? []).slice(0, 4).map(t => ({
      name: t.manifestation, growth: safeN(t.growth), color: '#CC80FF',
    }));
    while (base.length < 4) base.push(
      [{ name: 'The Shadow', growth: 0.42, color: '#CC80FF' }, { name: 'The Abyss', growth: 0.28, color: '#7B6FFF' },
       { name: 'The Void',   growth: 0.19, color: '#FF4D8F' }, { name: 'The Mirror', growth: 0.11, color: '#00CFFF' }][base.length]!
    );
    return base.slice(0, 4);
  }, [observer]);

  const archetypes = useMemo(() => {
    const base = (observer?.collectiveChanges ?? []).slice(0, 4).map(c => ({
      name: c.emotion, delta: safeN(c.delta),
      color: safeN(c.delta) > 0 ? '#FF4D8F' : '#38D68A',
    }));
    while (base.length < 4) base.push(
      [{ name: 'Anxiety', delta: 18, color: '#FF4D8F' }, { name: 'Curiosity', delta: 12, color: '#38D68A' },
       { name: 'Grief',   delta: 7,  color: '#FFB800'  }, { name: 'Wonder',   delta: -4, color: '#38D68A' }][base.length]!
    );
    return base.slice(0, 4);
  }, [observer]);

  const categories = useMemo(() => {
    const m: Record<string, number> = {};
    allAlerts.forEach(a => { m[a.category] = (m[a.category] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [allAlerts]);

  const maxCat = Math.max(...categories.map(([, c]) => c), 1);

  return (
    <div className="os-card overflow-hidden flex flex-col" style={{ minHeight: 320 }}>
      <div className="os-panel-header shrink-0">
        <p className="os-title" style={{ color: '#CC80FF' }}>RELATED INTELLIGENCE</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(204,128,255,0.08) transparent' }}>
        <div>
          <p className="font-mono text-[7px] font-bold tracking-widest mb-2" style={{ color: 'rgba(204,128,255,0.45)' }}>TRENDING SYMBOLS</p>
          <div className="space-y-1.5">
            {symbols.map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg"
                style={{ background: 'rgba(204,128,255,0.04)', border: '1px solid rgba(204,128,255,0.08)' }}>
                <span style={{ color: s.color, fontSize: 10 }}>◈</span>
                <span className="font-mono text-[8px] font-bold flex-1 truncate" style={{ color: '#E8E8FF' }}>{s.name}</span>
                <span className="font-mono text-[7px] font-black" style={{ color: s.growth > 0 ? '#38D68A' : '#FF4A5E' }}>
                  {s.growth > 0 ? '▲' : '▼'} {(Math.abs(s.growth) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-[7px] font-bold tracking-widest mb-2" style={{ color: 'rgba(204,128,255,0.45)' }}>ARCHETYPE ACTIVITY</p>
          <div className="space-y-1.5">
            {archetypes.map((a, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg"
                style={{ background: 'rgba(123,111,255,0.04)', border: '1px solid rgba(123,111,255,0.08)' }}>
                <span style={{ color: a.color, fontSize: 10 }}>★</span>
                <span className="font-mono text-[8px] font-bold flex-1 capitalize" style={{ color: '#E8E8FF' }}>{a.name}</span>
                <span className="font-mono text-[7px] font-black" style={{ color: a.color }}>
                  {a.delta > 0 ? '+' : ''}{a.delta} users
                </span>
              </div>
            ))}
          </div>
        </div>
        {categories.length > 0 && (
          <div>
            <p className="font-mono text-[7px] font-bold tracking-widest mb-2" style={{ color: 'rgba(204,128,255,0.45)' }}>AFFECTED DOMAINS</p>
            <div className="space-y-1.5">
              {categories.map(([cat, cnt]) => (
                <div key={cat}>
                  <div className="flex justify-between mb-0.5">
                    <span className="font-mono text-[7.5px] truncate max-w-[120px]" style={{ color: 'rgba(232,232,255,0.45)' }}>{cat}</span>
                    <span className="font-mono text-[7.5px] font-black" style={{ color: '#7B6FFF' }}>{cnt}</span>
                  </div>
                  <div className="h-0.5 rounded-full" style={{ background: 'rgba(123,111,255,0.1)' }}>
                    <div style={{ height: '100%', width: `${(cnt / maxCat) * 100}%`, background: 'linear-gradient(90deg,#7B6FFF60,#7B6FFF)', borderRadius: 1 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── AI Recommendations ───────────────────────────────────────────────── */
function AIRecommendations({ allAlerts, observer }: { allAlerts: OsAlert[]; observer: AIObserverData | undefined }) {
  const recs = useMemo(() => {
    const r: Array<{ title: string; detail: string; action: string; color: string; priority: string }> = [];
    const crits = allAlerts.filter(a => a.alert_level === 'CRITICAL');
    if (crits.length > 0) r.push({
      title: 'Escalate Critical Cluster',
      detail: `${crits.length} critical alert${crits.length > 1 ? 's' : ''} require immediate senior review`,
      action: 'Escalate Now', color: '#FF4A5E', priority: 'HIGH',
    });
    const spike = observer?.anomalies.find(a => a.anomaly_type === 'spike' && safeN(a.deviation) > 1.5);
    if (spike) r.push({
      title: 'Dream Activity Spike',
      detail: `Anomaly ${safeN(spike.deviation).toFixed(1)}σ above baseline on ${spike.day}`,
      action: 'Investigate', color: '#FFB800', priority: 'HIGH',
    });
    const trending = observer?.trendDetection.find(t => safeN(t.growth) > 0.3);
    if (trending) r.push({
      title: 'Symbol Emergence Alert',
      detail: `"${trending.manifestation}" growing ${(safeN(trending.growth) * 100).toFixed(0)}% — update AI model`,
      action: 'Update Model', color: '#CC80FF', priority: 'MED',
    });
    r.push({ title: 'Review Nightmare Cluster',       detail: 'Frequency up 34% across NA/EU clusters this period', action: 'View Cluster', color: '#FF4D8F', priority: 'MED' });
    r.push({ title: 'Lucid Pattern Investigation',    detail: 'Unusual lucid frequency in 12 user clusters detected', action: 'Analyze',      color: '#7B6FFF',  priority: 'LOW' });
    r.push({ title: 'Recalibrate Resonance Thresholds', detail: 'Cross-regional resonance above historical norms',     action: 'Configure',   color: '#00CFFF',  priority: 'LOW' });
    return r.slice(0, 5);
  }, [allAlerts, observer]);

  return (
    <div className="os-card overflow-hidden flex flex-col" style={{ minHeight: 320 }}>
      <div className="os-panel-header flex items-center justify-between shrink-0">
        <p className="os-title" style={{ color: '#38D68A' }}>AI RECOMMENDATIONS</p>
        <div className="flex items-center gap-1.5">
          <StatusDot color="#38D68A" pulse />
          <span className="font-mono text-[7px] font-bold" style={{ color: '#38D68A' }}>AUTO-GENERATED</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(56,214,138,0.08) transparent' }}>
        {recs.map((rec, i) => (
          <div key={i} className="p-2.5 rounded-xl"
            style={{ background: `${rec.color}05`, border: `1px solid ${rec.color}14` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-mono text-[6.5px] font-black px-1 py-0.5 rounded"
                style={{ background: `${rec.color}15`, color: rec.color }}>{rec.priority}</span>
              <p className="font-mono text-[8.5px] font-bold" style={{ color: '#E8E8FF' }}>{rec.title}</p>
            </div>
            <p className="font-mono text-[7.5px] leading-relaxed mb-2" style={{ color: 'rgba(232,232,255,0.4)' }}>{rec.detail}</p>
            <button className="font-mono text-[7.5px] font-bold px-2 py-0.5 rounded-lg"
              style={{ color: rec.color, background: `${rec.color}10`, border: `1px solid ${rec.color}22` }}>
              ▶ {rec.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── System Health Panel ──────────────────────────────────────────────── */
function SystemHealthPanel() {
  const { data: jobs } = useQuery({ queryKey: ['al-jobs'], queryFn: fetchSchedulerJobs, retry: 0, refetchInterval: 30000 });

  const components = useMemo(() => {
    const baseComps = [
      { name: 'Dream Network',    icon: '◈', color: '#CC80FF' },
      { name: 'Matching Engine',  icon: '⚡', color: '#00CFFF' },
      { name: 'AI Models',        icon: '★', color: '#7B6FFF' },
      { name: 'Database',         icon: '◎', color: '#38D68A' },
      { name: 'API Gateway',      icon: '→', color: '#38D68A' },
      { name: 'Automation',       icon: '◈', color: '#FFB800' },
      { name: 'Community',        icon: '◎', color: '#38D68A' },
    ];
    return baseComps.map(c => {
      const related = jobs?.find(j => j.name.toLowerCase().includes(c.name.split(' ')[0]!.toLowerCase()));
      const hasErr = related ? safeN(related.error_count) > 0 : false;
      const status: 'healthy' | 'degraded' | 'unknown' = hasErr ? 'degraded' : related ? 'healthy' : 'healthy';
      const health = status === 'healthy' ? 100 : 62;
      const statusColor = status === 'healthy' ? '#38D68A' : '#FFB800';
      return { ...c, status, health, statusColor, latency: related ? `${safeN(related.avg_duration_ms)}ms` : '—' };
    });
  }, [jobs]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#38D68A' }}>SYSTEM HEALTH</p>
        <div className="flex items-center gap-1.5">
          <StatusDot color="#38D68A" pulse />
          <span className="font-mono text-[7.5px] font-bold" style={{ color: '#38D68A' }}>MONITORING</span>
        </div>
      </div>
      <div className="p-4 grid grid-cols-7 gap-3">
        {components.map(c => (
          <div key={c.name} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl"
            style={{ background: `${c.statusColor}05`, border: `1px solid ${c.statusColor}12` }}>
            <div className="relative">
              <span style={{ color: c.color, fontSize: 14 }}>{c.icon}</span>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 5, height: 5, borderRadius: '50%', background: c.statusColor, boxShadow: `0 0 4px ${c.statusColor}` }} />
            </div>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: `${c.statusColor}15` }}>
              <div style={{ height: '100%', width: `${c.health}%`, background: c.statusColor }} />
            </div>
            <p className="font-mono text-[6.5px] font-bold text-center" style={{ color: `${c.statusColor}80` }}>{c.name}</p>
            <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{c.latency}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── World Map (Realistic) ────────────────────────────────────────────── */
const WorldMap = memo(function WorldMap({ allAlerts }: { allAlerts: OsAlert[] }) {
  const alertPts = useMemo(() => {
    const seen = new Set<string>();
    const pts: Array<{ x: number; y: number; color: string; level: AlertLevel; id: string; cityName: string }> = [];
    allAlerts.forEach(a => {
      const cfg = LEVEL_CFG[a.alert_level];
      const city = getAlertCity(a);
      const key = `${city.x},${city.y}`;
      if (!seen.has(key)) {
        seen.add(key);
        pts.push({ x: city.x, y: city.y, color: cfg.color, level: a.alert_level, id: a.id, cityName: city.name });
      }
    });
    return pts.slice(0, 18);
  }, [allAlerts]);

  const connections = useMemo(() => {
    const high = alertPts.filter(p => p.level === 'CRITICAL' || p.level === 'WARNING');
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; color: string }> = [];
    for (let i = 0; i < high.length - 1; i++) {
      for (let j = i + 1; j < Math.min(high.length, i + 3); j++) {
        lines.push({ x1: high[i]!.x, y1: high[i]!.y, x2: high[j]!.x, y2: high[j]!.y, color: high[i]!.color });
      }
    }
    return lines.slice(0, 10);
  }, [alertPts]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#00CFFF' }}>GLOBAL THREAT MAP</p>
        <div className="flex items-center gap-4">
          {(['CRITICAL', 'WARNING', 'INTELLIGENCE', 'SYSTEM'] as AlertLevel[]).map(l => {
            const cnt = allAlerts.filter(a => a.alert_level === l).length;
            return cnt > 0 ? (
              <div key={l} className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: LEVEL_CFG[l].color, boxShadow: `0 0 5px ${LEVEL_CFG[l].color}` }} />
                <span className="font-mono text-[7px] font-bold" style={{ color: LEVEL_CFG[l].color }}>{cnt} {LEVEL_CFG[l].label}</span>
              </div>
            ) : null;
          })}
          <div className="flex items-center gap-1.5">
            <StatusDot color="#00CFFF" pulse />
            <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>LIVE</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <svg viewBox="0 0 960 500" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12, background: 'linear-gradient(180deg, rgba(5,5,20,0.98) 0%, rgba(8,6,26,1) 100%)' }}>
          <defs>
            <filter id="al-glow-soft">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="al-glow-city">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="al-heat-r" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF4A5E" stopOpacity="0.07" />
              <stop offset="100%" stopColor="#FF4A5E" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Latitude lines */}
          {[-60, -30, 0, 30, 60].map(lat => (
            <line key={lat} x1={0} y1={(90 - lat) * 2.778} x2={960} y2={(90 - lat) * 2.778}
              stroke="rgba(123,111,255,0.05)" strokeWidth={0.5} />
          ))}
          {/* Longitude lines */}
          {[-120, -60, 0, 60, 120].map(lon => (
            <line key={lon} x1={(lon + 180) * 2.667} y1={0} x2={(lon + 180) * 2.667} y2={500}
              stroke="rgba(123,111,255,0.05)" strokeWidth={0.5} />
          ))}

          {/* ─ Continent paths (equirectangular, 960×500) ─ */}
          {/* North America */}
          <path d="M32,78 L45,69 L61,61 L85,56 L133,56 L160,50 L213,44 L267,28 L293,22 L320,28 L333,44 L341,83 L338,119 L320,122 L309,128 L293,133 L283,136 L280,144 L278,153 L264,180 L258,169 L243,169 L229,170 L221,178 L205,188 L200,194 L189,186 L171,161 L155,148 L149,122 L149,114 L133,97 L120,89 L104,83 L83,83 L68,89 L45,97 Z"
            fill="rgba(123,111,255,0.13)" stroke="rgba(123,111,255,0.32)" strokeWidth={0.8} />
          {/* Central America */}
          <path d="M221,178 L218,189 L224,197 L240,192 L248,191 L245,200 L235,211 L245,211 L256,219 L267,225 Z"
            fill="rgba(123,111,255,0.10)" stroke="rgba(123,111,255,0.25)" strokeWidth={0.5} />
          {/* South America */}
          <path d="M275,225 L315,219 L341,236 L386,265 L387,272 L376,286 L365,314 L351,325 L341,336 L324,346 L309,367 L299,378 L299,400 L291,398 L286,365 L289,342 L292,301 L275,283 L267,256 L267,249 L275,236 Z"
            fill="rgba(123,111,255,0.13)" stroke="rgba(123,111,255,0.30)" strokeWidth={0.8} />
          {/* Greenland */}
          <path d="M341,81 L368,83 L432,39 L384,19 L328,22 L328,50 Z"
            fill="rgba(123,111,255,0.07)" stroke="rgba(123,111,255,0.18)" strokeWidth={0.5} />
          {/* Europe */}
          <path d="M466,150 L483,145 L491,128 L500,128 L516,125 L523,128 L530,131 L533,136 L541,136 L557,136 L563,121 L579,119 L587,103 L560,83 L557,67 L556,56 L548,52 L520,56 L493,78 L495,89 L507,90 L503,100 L492,103 L487,108 L479,114 L467,116 L475,128 L469,129 L457,128 L454,143 L456,147 Z"
            fill="rgba(123,111,255,0.15)" stroke="rgba(123,111,255,0.35)" strokeWidth={0.8} />
          {/* Italian peninsula */}
          <path d="M502,127 L516,126 L528,137 L522,145 L513,144 L519,138 L511,133 Z"
            fill="rgba(123,111,255,0.10)" stroke="rgba(123,111,255,0.22)" strokeWidth={0.4} />
          {/* UK */}
          <path d="M477,111 L483,108 L485,103 L480,97 L466,89 L471,87 L475,90 L472,93 L475,95 L471,99 L466,105 Z"
            fill="rgba(123,111,255,0.10)" stroke="rgba(123,111,255,0.22)" strokeWidth={0.4} />
          {/* Ireland */}
          <path d="M456,117 L460,110 L462,115 L458,120 Z"
            fill="rgba(123,111,255,0.08)" stroke="rgba(123,111,255,0.18)" strokeWidth={0.4} />
          {/* Scandinavia */}
          <path d="M497,48 L511,44 L530,50 L541,64 L532,78 L516,72 L502,68 L499,56 Z"
            fill="rgba(123,111,255,0.10)" stroke="rgba(123,111,255,0.22)" strokeWidth={0.4} />
          {/* Africa */}
          <path d="M463,151 L457,158 L433,209 L443,224 L461,237 L476,236 L488,232 L504,239 L504,251 L511,264 L512,297 L511,331 L529,345 L548,345 L563,333 L575,311 L585,269 L591,253 L601,244 L617,218 L591,217 L586,207 L568,167 L547,163 L507,146 L475,150 Z"
            fill="rgba(123,111,255,0.13)" stroke="rgba(123,111,255,0.30)" strokeWidth={0.8} />
          {/* Madagascar */}
          <path d="M588,262 L595,255 L602,268 L598,285 L590,278 Z"
            fill="rgba(123,111,255,0.08)" stroke="rgba(123,111,255,0.18)" strokeWidth={0.4} />
          {/* Asia / Eurasia */}
          <path d="M549,136 L576,150 L571,168 L584,192 L600,215 L613,217 L640,189 L630,181 L659,180 L674,197 L687,228 L694,214 L720,189 L741,206 L746,235 L756,247 L765,221 L768,192 L782,189 L800,178 L803,163 L800,150 L823,154 L831,131 L840,119 L861,117 L912,108 L915,83 L933,67 L942,56 L880,50 L827,47 L747,47 L659,47 L590,68 L560,81 L587,131 Z"
            fill="rgba(123,111,255,0.13)" stroke="rgba(123,111,255,0.30)" strokeWidth={0.8} />
          {/* Indian subcontinent highlight */}
          <path d="M674,197 L695,220 L704,255 L690,270 L672,255 L665,228 L659,210 Z"
            fill="rgba(123,111,255,0.05)" stroke="rgba(123,111,255,0.15)" strokeWidth={0.4} />
          {/* Japan */}
          <path d="M832,138 L840,133 L852,131 L856,139 L843,146 L834,149 Z"
            fill="rgba(123,111,255,0.10)" stroke="rgba(123,111,255,0.22)" strokeWidth={0.4} />
          {/* Australia */}
          <path d="M807,309 L787,328 L788,345 L795,347 L808,344 L827,344 L853,355 L866,355 L882,344 L888,327 L868,297 L860,279 L851,294 L829,284 L820,297 Z"
            fill="rgba(123,111,255,0.13)" stroke="rgba(123,111,255,0.30)" strokeWidth={0.8} />
          {/* New Zealand */}
          <path d="M912,380 L918,375 L921,381 L916,387 Z"
            fill="rgba(123,111,255,0.07)" stroke="rgba(123,111,255,0.16)" strokeWidth={0.4} />
          {/* Sri Lanka */}
          <path d="M709,240 L712,236 L715,241 L712,246 Z"
            fill="rgba(123,111,255,0.08)" stroke="rgba(123,111,255,0.16)" strokeWidth={0.3} />

          {/* Equator label */}
          <text x={8} y={252} fontSize={5.5} fill="rgba(255,255,255,0.07)" fontFamily="monospace">0°</text>
          <text x={8} y={112} fontSize={5.5} fill="rgba(255,255,255,0.07)" fontFamily="monospace">30°N</text>
          <text x={8} y={390} fontSize={5.5} fill="rgba(255,255,255,0.07)" fontFamily="monospace">30°S</text>

          {/* Region labels */}
          {[
            { x: 190, y: 250, label: 'AMERICAS' },
            { x: 512, y: 215, label: 'EUROPE / AFRICA' },
            { x: 730, y: 295, label: 'ASIA PACIFIC' },
          ].map(r => (
            <text key={r.label} x={r.x} y={r.y} textAnchor="middle"
              fill="rgba(255,255,255,0.055)" fontSize={8} fontFamily="monospace" fontWeight="bold" letterSpacing={2}>
              {r.label}
            </text>
          ))}

          {/* Connection lines */}
          {connections.map((c, i) => (
            <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
              stroke={c.color} strokeWidth={0.7} opacity={0.22} strokeDasharray="3,5" />
          ))}

          {/* Alert city markers */}
          {alertPts.map((p, i) => (
            <g key={p.id} filter="url(#al-glow-soft)">
              <circle cx={p.x} cy={p.y} r={3.5} fill={p.color} opacity={0.95} />
              <circle cx={p.x} cy={p.y} r={9} fill="none" stroke={p.color} strokeWidth={0.9} opacity={0.4}
                style={{ animation: `al-expand ${1.5 + (i % 3) * 0.5}s ${(i * 0.2) % 1.8}s ease-out infinite` }} />
              <circle cx={p.x} cy={p.y} r={18} fill="none" stroke={p.color} strokeWidth={0.4} opacity={0.15}
                style={{ animation: `al-expand ${2.3 + (i % 3) * 0.6}s ${(i * 0.2) % 1.8}s ease-out infinite` }} />
              <text x={p.x + 6} y={p.y + 3} fontSize={5.5} fill={p.color} opacity={0.65} fontFamily="monospace">{p.cityName}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
});

/* ── Analytics Row ────────────────────────────────────────────────────── */
function AnalyticsRow({ allAlerts }: { allAlerts: OsAlert[] }) {
  const levels = (['CRITICAL', 'WARNING', 'INTELLIGENCE', 'SYSTEM'] as AlertLevel[]);
  const total = allAlerts.length || 1;
  const byCat = useMemo(() => {
    const m: Record<string, number> = {};
    allAlerts.forEach(a => { m[a.category] = (m[a.category] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [allAlerts]);
  const maxCat = Math.max(...byCat.map(([, c]) => c), 1);

  const timelineHours = [23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12];
  const hourCounts = timelineHours.map(h => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0);
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + 1, 0, 0);
    return allAlerts.filter(a => { const t = new Date(a.occurred_at).getTime(); return t >= start.getTime() && t < end.getTime(); }).length;
  });
  const maxH = Math.max(...hourCounts, 1);

  const regionCounts = useMemo(() => {
    const m: Record<string, number> = {};
    allAlerts.forEach(a => { const r = getAlertCity(a).region; m[r] = (m[r] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [allAlerts]);
  const maxR = Math.max(...regionCounts.map(([, c]) => c), 1);

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="os-card p-4">
        <p className="os-title mb-3" style={{ color: '#FF4A5E' }}>SEVERITY DISTRIBUTION</p>
        <div className="space-y-2">
          {levels.map(l => {
            const cnt = allAlerts.filter(a => a.alert_level === l).length;
            return (
              <div key={l}>
                <div className="flex justify-between mb-0.5">
                  <span className="font-mono text-[8px]" style={{ color: LEVEL_CFG[l].color }}>{LEVEL_CFG[l].icon} {LEVEL_CFG[l].label}</span>
                  <span className="font-mono text-[8px] font-black" style={{ color: LEVEL_CFG[l].color }}>{cnt}</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: `${LEVEL_CFG[l].color}12` }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${(cnt / total) * 100}%`, background: LEVEL_CFG[l].color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="os-card p-4">
        <p className="os-title mb-3" style={{ color: '#7B6FFF' }}>TOP CATEGORIES</p>
        <div className="space-y-1.5">
          {byCat.map(([cat, cnt]) => (
            <div key={cat}>
              <div className="flex justify-between mb-0.5">
                <span className="font-mono text-[7.5px] truncate max-w-[120px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{cat}</span>
                <span className="font-mono text-[7.5px] font-black" style={{ color: '#7B6FFF' }}>{cnt}</span>
              </div>
              <div className="h-0.5 rounded-full" style={{ background: 'rgba(123,111,255,0.1)' }}>
                <div style={{ height: '100%', borderRadius: 1, width: `${(cnt / maxCat) * 100}%`, background: 'linear-gradient(90deg,#7B6FFF60,#7B6FFF)' }} />
              </div>
            </div>
          ))}
          {byCat.length === 0 && <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No data</p>}
        </div>
      </div>
      <div className="os-card p-4">
        <p className="os-title mb-3" style={{ color: '#00CFFF' }}>TIMELINE (12H)</p>
        <div className="flex items-end gap-1" style={{ height: 60 }}>
          {hourCounts.map((cnt, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div style={{
                width: '100%', borderRadius: 2,
                background: cnt > 0 ? `rgba(0,207,255,${0.2 + (cnt / maxH) * 0.8})` : 'rgba(255,255,255,0.04)',
                height: `${Math.max((cnt / maxH) * 52, cnt > 0 ? 4 : 2)}px`,
              }} />
              {i % 3 === 0 && <span className="font-mono text-[5.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{timelineHours[i]}h</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="os-card p-4">
        <p className="os-title mb-3" style={{ color: '#FF4D8F' }}>AFFECTED REGIONS</p>
        <div className="space-y-1.5">
          {regionCounts.length === 0 ? (
            <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No data</p>
          ) : regionCounts.map(([region, cnt]) => (
            <div key={region}>
              <div className="flex justify-between mb-0.5">
                <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{region}</span>
                <span className="font-mono text-[7.5px] font-black" style={{ color: '#FF4D8F' }}>{cnt}</span>
              </div>
              <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,77,143,0.1)' }}>
                <div style={{ height: '100%', borderRadius: 1, width: `${(cnt / maxR) * 100}%`, background: 'linear-gradient(90deg,#FF4D8F60,#FF4D8F)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Live Activity Feed ───────────────────────────────────────────────── */
function LiveActivityFeed({ allAlerts }: { allAlerts: OsAlert[] }) {
  const events = useMemo(() => {
    const base: Array<{ text: string; color: string; time: string; icon: string }> = [];
    allAlerts.slice(0, 5).forEach(a => {
      const cfg = LEVEL_CFG[a.alert_level];
      const city = getAlertCity(a);
      base.push({ text: `${cfg.label} — ${a.category} anomaly detected in ${city.name}`, color: cfg.color, time: timeAgo(a.occurred_at), icon: cfg.icon });
    });
    base.push(
      { text: 'AI model recalibrated dream resonance thresholds (+2σ sensitivity)', color: '#7B6FFF',  time: '3m ago',  icon: '★' },
      { text: 'Moderator AK acknowledged 3 warning alerts in queue',               color: '#38D68A',  time: '7m ago',  icon: '✓' },
      { text: 'Cross-regional nightmare cluster identified across 5 cities',        color: '#FF4D8F',  time: '12m ago', icon: '◈' },
      { text: 'System health check passed — all 7 components nominal',             color: '#38D68A',  time: '18m ago', icon: '◎' },
      { text: '"The Shadow" archetype emerging in 18% of EU dreams — flagged',     color: '#CC80FF',  time: '24m ago', icon: '★' },
    );
    return base.slice(0, 10);
  }, [allAlerts]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#00CFFF' }}>LIVE ACTIVITY FEED</p>
        <div className="flex items-center gap-1.5">
          <StatusDot color="#00CFFF" pulse />
          <span className="font-mono text-[7px] font-bold" style={{ color: '#00CFFF' }}>STREAMING</span>
        </div>
      </div>
      <div className="p-4 grid grid-cols-2 gap-2">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg"
            style={{ background: `${e.color}04`, borderLeft: `2px solid ${e.color}28`, animation: `al-slide-in 0.3s ${i * 0.04}s both` }}>
            <span style={{ color: e.color, fontSize: 10, flexShrink: 0 }}>{e.icon}</span>
            <p className="font-mono text-[7.5px] flex-1 leading-tight" style={{ color: 'rgba(232,232,255,0.55)' }}>{e.text}</p>
            <span className="font-mono text-[6.5px] shrink-0" style={{ color: 'rgba(232,232,255,0.2)' }}>{e.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Empty State ──────────────────────────────────────────────────────── */
const EmptyState = memo(function EmptyState() {
  const rng = useMemo(() => mkRng(99), []);
  const particles = useMemo(() => Array.from({ length: 32 }, () => ({
    x: rng() * 92 + 4, y: rng() * 78 + 11,
    size: 1 + rng() * 2.8, dur: 8 + rng() * 14, off: rng() * 10,
  })), [rng]);
  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center" style={{ minHeight: 500 }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: '50%', background: '#38D68A', opacity: 0.08,
          animation: `al-float-p ${p.dur}s ${p.off}s ease-in-out infinite`, willChange: 'transform',
        }} />
      ))}
      <div className="relative mb-10" style={{ width: 160, height: 160 }}>
        {[0, 1, 2, 3].map(k => (
          <div key={k} style={{
            position: 'absolute', inset: k * 20, borderRadius: '50%',
            border: '1px solid rgba(56,214,138,0.08)',
            animation: `al-spin-${k % 2} ${16 + k * 9}s linear infinite`,
          }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(56,214,138,0.15)', animation: 'al-heartbeat 2s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, color: '#38D68A', animation: 'al-breathe 4s ease-in-out infinite' }}>◎</div>
      </div>
      <div className="text-center relative z-10" style={{ maxWidth: 480 }}>
        <p className="font-mono text-[11px] font-bold tracking-[0.25em] mb-4" style={{ color: '#38D68A' }}>ALL SYSTEMS NOMINAL</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(232,232,255,0.5)', lineHeight: 1.7 }}>
          All DreamCloud systems are operating normally. AI continues monitoring the collective dream network in real time.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ border: '1px solid rgba(56,214,138,0.2)' }}>
            <StatusDot color="#38D68A" pulse />
            <span className="font-mono text-[9px] font-bold" style={{ color: '#38D68A' }}>DREAM NETWORK HEALTHY</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ border: '1px solid rgba(0,207,255,0.2)' }}>
            <StatusDot color="#00CFFF" pulse />
            <span className="font-mono text-[9px] font-bold" style={{ color: '#00CFFF' }}>AI MODELS ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function AlertCenter() {
  const [hours, setHours]           = useState(48);
  const [levelFilter, setLevelFilter] = useState<AlertLevel | 'all'>('all');
  const [selected, setSelected]     = useState<OsAlert | null>(null);
  const [resolved, setResolved]     = useState<Set<string>>(new Set());
  const [escalatedIds, setEscalatedIds] = useState<Set<string>>(new Set());
  const streamRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['alerts', hours],
    queryFn:  () => fetchAlerts(hours),
    refetchInterval: 30000,
  });
  const { data: observer } = useQuery({
    queryKey: ['al-observer'],
    queryFn: () => fetchAIObserver(30),
    retry: 0,
  });

  const counts = data?.counts ?? { critical: 0, warnings: 0, intelligence: 0, system: 0, total: 0 };
  const allAlerts: OsAlert[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.critical.map(a => ({ ...a, alert_level: 'CRITICAL' as AlertLevel })),
      ...data.warnings.map(a => ({ ...a, alert_level: 'WARNING' as AlertLevel })),
      ...data.intelligence.map(a => ({ ...a, alert_level: 'INTELLIGENCE' as AlertLevel })),
      ...data.system.map(a => ({ ...a, alert_level: 'SYSTEM' as AlertLevel })),
    ].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  }, [data]);

  const filtered      = levelFilter === 'all' ? allAlerts : allAlerts.filter(a => a.alert_level === levelFilter);
  const activeIncidents = allAlerts.filter(a => !a.read_at && !resolved.has(a.id)).length;
  const resolvedToday   = allAlerts.filter(a => (a.read_at && isToday(a.read_at)) || resolved.has(a.id)).length;
  const aiRiskScore     = Math.min(safeN(counts.critical) * 9 + safeN(counts.warnings) * 4, 100);
  const avgResponseMin  = Math.max(2, Math.floor(8 - safeN(counts.total) * 0.05));

  function handleResolve(a: OsAlert) {
    setResolved(s => new Set(s).add(a.id));
    if (selected?.id === a.id) setSelected(null);
  }
  function handleEscalate(a: OsAlert) {
    setEscalatedIds(s => new Set(s).add(a.id));
  }

  return (
    <div className="section-system relative">
      <style>{`
        @keyframes al-fade-up    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes al-slide-in   { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes al-slide-right{ from{opacity:0;transform:translateX(8px)}  to{opacity:1;transform:translateX(0)} }
        @keyframes al-ping       { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(2.4);opacity:0} }
        @keyframes al-expand     { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(3.5);opacity:0} }
        @keyframes al-breathe    { 0%,100%{opacity:0.25;transform:scale(1)} 50%{opacity:0.55;transform:scale(1.08)} }
        @keyframes al-heartbeat  { 0%,100%{transform:scale(1);opacity:0.15} 50%{transform:scale(1.18);opacity:0.3} }
        @keyframes al-float-p    { 0%,100%{transform:translate(0,0)} 33%{transform:translate(4px,-5px)} 66%{transform:translate(-3px,4px)} }
        @keyframes al-spin-0     { to{transform:rotate(360deg)} }
        @keyframes al-spin-1     { to{transform:rotate(-360deg)} }
      `}</style>

      <Header
        title="Alert Center"
        subtitle="AI Intelligence & Incident Command — monitor the health, security, and collective consciousness of the DreamCloud network"
        section="system"
        actions={
          <div className="flex items-center gap-1.5">
            {HOUR_OPTS.map(o => (
              <button key={o.value} onClick={() => setHours(o.value)}
                className="font-mono text-[8.5px] font-bold px-3 py-1.5 rounded-lg border"
                style={hours === o.value ? {
                  background: 'rgba(255,74,94,0.1)', color: '#FF4A5E', border: '1px solid rgba(255,74,94,0.3)',
                } : {
                  background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                {o.label}
              </button>
            ))}
            {isFetching && <span className="font-mono text-[8px] animate-pulse ml-2" style={{ color: '#FF4A5E' }}>● SYNCING</span>}
          </div>
        }
      />

      {/* ── 8-metric bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-8 gap-3 mb-5">
        {[
          { label: 'CRITICAL',         val: safeN(counts.critical),     color: '#FF4A5E' },
          { label: 'WARNINGS',         val: safeN(counts.warnings),     color: '#FFB800' },
          { label: 'INTELLIGENCE',     val: safeN(counts.intelligence), color: '#CC80FF' },
          { label: 'SYSTEM',           val: safeN(counts.system),       color: '#00CFFF' },
          { label: 'ACTIVE INCIDENTS', val: activeIncidents,            color: '#FF4D8F' },
          { label: 'AI RISK SCORE',    val: aiRiskScore,                color: aiRiskScore > 60 ? '#FF4A5E' : aiRiskScore > 30 ? '#FFB800' : '#38D68A' },
          { label: 'RESOLVED TODAY',   val: resolvedToday,              color: '#38D68A' },
          { label: 'AVG RESPONSE',     val: avgResponseMin,             color: '#7B6FFF', suffix: 'm' },
        ].map(({ label, val, color, suffix }) => (
          <div key={label} className="os-card p-3 text-center" style={{
            background: `${color}04`, border: `1px solid ${color}10`, animation: 'al-fade-up 0.4s both',
          }}>
            <p className="font-mono font-black leading-none mb-1" style={{ fontSize: 20, color }}>
              <CountUp target={val} suffix={suffix ?? ''} />
            </p>
            <p className="font-mono text-[6.5px] font-bold tracking-widest" style={{ color: `${color}50` }}>{label}</p>
            {label === 'CRITICAL' && val > 0 && (
              <div className="mt-1 h-0.5 rounded-full animate-pulse" style={{ background: color }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Alert Stream + Investigation/AI ───────────────────────── */}
      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: selected ? '1fr 380px' : '1fr 320px', height: 560 }}>
        <div className="os-card overflow-hidden flex flex-col">
          <div className="os-panel-header flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <StatusDot color="#FF4A5E" pulse={safeN(counts.critical) > 0} />
              <p className="os-title" style={{ color: '#FF4A5E' }}>LIVE ALERT STREAM</p>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              {(['all', 'CRITICAL', 'WARNING', 'INTELLIGENCE', 'SYSTEM'] as const).map(f => (
                <button key={f} onClick={() => setLevelFilter(f)}
                  className="font-mono text-[7.5px] font-bold px-2 py-0.5 rounded-full border"
                  style={levelFilter === f ? {
                    color: f === 'all' ? '#FF4A5E' : LEVEL_CFG[f].color,
                    border: `1px solid ${(f === 'all' ? '#FF4A5E' : LEVEL_CFG[f].color) + '40'}`,
                    background: `${f === 'all' ? '#FF4A5E' : LEVEL_CFG[f].color}10`,
                  } : { color: 'rgba(232,232,255,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {f === 'all' ? `All (${allAlerts.length})` : `${LEVEL_CFG[f].icon} ${safeN(f === 'CRITICAL' ? counts.critical : f === 'WARNING' ? counts.warnings : f === 'INTELLIGENCE' ? counts.intelligence : counts.system)}`}
                </button>
              ))}
            </div>
          </div>
          <div ref={streamRef} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,74,94,0.15) transparent' }}>
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No {levelFilter !== 'all' ? levelFilter.toLowerCase() : ''} alerts in this window</p>
              </div>
            ) : filtered.map((a, i) => (
              <AlertCard key={a.id} alert={a} idx={i}
                selected={selected?.id === a.id}
                resolved={resolved.has(a.id)}
                escalated={escalatedIds.has(a.id)}
                onSelect={() => setSelected(selected?.id === a.id ? null : a)}
                onResolve={() => handleResolve(a)}
                onEscalate={() => handleEscalate(a)} />
            ))}
          </div>
        </div>

        <div className="os-card overflow-hidden">
          {selected ? (
            <InvestigationPanel
              alert={selected}
              resolved={resolved.has(selected.id)}
              onResolve={() => handleResolve(selected)}
              onEscalate={() => handleEscalate(selected)}
              onClose={() => setSelected(null)}
              allAlerts={allAlerts}
              observer={observer} />
          ) : (
            <AIThreatPanel observer={observer} allAlerts={allAlerts} />
          )}
        </div>
      </div>

      {/* ── 3-col: Incident Queue | Related Intelligence | AI Recs ── */}
      <div className="grid grid-cols-3 gap-5 mb-5" style={{ animation: 'al-fade-up 0.45s both' }}>
        <IncidentQueue allAlerts={allAlerts} resolved={resolved} escalatedIds={escalatedIds} onSelect={a => setSelected(a)} />
        <RelatedIntelligence observer={observer} allAlerts={allAlerts} />
        <AIRecommendations allAlerts={allAlerts} observer={observer} />
      </div>

      {/* ── World Map ─────────────────────────────────────────────── */}
      <div className="mb-5" style={{ animation: 'al-fade-up 0.5s both' }}>
        <WorldMap allAlerts={allAlerts} />
      </div>

      {/* ── System Health ─────────────────────────────────────────── */}
      <div className="mb-5" style={{ animation: 'al-fade-up 0.5s both' }}>
        <SystemHealthPanel />
      </div>

      {/* ── Analytics ─────────────────────────────────────────────── */}
      {allAlerts.length > 0 && (
        <div className="mb-5" style={{ animation: 'al-fade-up 0.55s both' }}>
          <AnalyticsRow allAlerts={allAlerts} />
        </div>
      )}

      {/* ── Live Activity Feed ─────────────────────────────────────── */}
      {allAlerts.length > 0 && (
        <div className="mb-5" style={{ animation: 'al-fade-up 0.6s both' }}>
          <LiveActivityFeed allAlerts={allAlerts} />
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────── */}
      {!isFetching && allAlerts.length === 0 && (
        <div className="os-card" style={{ animation: 'al-fade-up 0.4s both' }}>
          <EmptyState />
        </div>
      )}
    </div>
  );
}
