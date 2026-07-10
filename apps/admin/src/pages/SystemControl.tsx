import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAppConfigs, updateAppConfigEntry,
  fetchFeatureFlags, updateFeatureFlag,
  fetchModerationRules, updateModerationRules,
  fetchAISignals,
  fetchAdminLogs, sendAdminNotification,
} from '../api/admin.api';
import type { AppConfigEntry, FeatureFlag, ModerationRules, AISignal, AdminLogEntry } from '../types/admin.types';

// ── Utilities ──────────────────────────────────────────────────────────────────

function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

function Sparkline({ values, color, w = 48, h = 18 }: { values: number[]; color: string; w?: number; h?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.1), min = Math.min(...values), range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - 2 - ((v - min) / range) * (h - 5)}`).join(' ');
  const lx = (values.length - 1) * step, ly = h - 2 - ((values[values.length - 1]! - min) / range) * (h - 5);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h, flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.3} opacity={0.65} />
      <circle cx={lx} cy={ly} r={2} fill={color} />
    </svg>
  );
}

function timeAgo(s: string | null | undefined): string {
  if (!s) return 'Never';
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ── Confirm Dialog ─────────────────────────────────────────────────────────────

type ConfirmAction = {
  title: string;
  body: string;
  dangerous?: boolean;
  requirePhrase?: string;
  onConfirm: () => void;
};

function ConfirmDialog({ action, onClose }: { action: ConfirmAction; onClose: () => void }) {
  const [phrase, setPhrase] = useState('');
  const ready = !action.requirePhrase || phrase.trim() === action.requirePhrase;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 rounded-2xl p-6 max-w-md w-full" style={{ background: '#0D0D1A', border: `1px solid ${action.dangerous ? 'rgba(255,74,94,0.45)' : 'rgba(255,255,255,0.12)'}`, animation: 'sc-fade-up 0.18s ease both' }}>
        <div className="flex items-center gap-2.5 mb-3">
          {action.dangerous && <span className="text-base">⚠</span>}
          <h3 className="font-mono text-sm font-black" style={{ color: action.dangerous ? '#FF4A5E' : '#E8E8FF' }}>{action.title}</h3>
        </div>
        <p className="font-mono text-[8px] leading-relaxed mb-4" style={{ color: 'rgba(232,232,255,0.5)' }}>{action.body}</p>
        {action.requirePhrase && (
          <div className="mb-4">
            <p className="font-mono text-[7px] mb-1.5" style={{ color: 'rgba(232,232,255,0.4)' }}>Type <span className="font-black" style={{ color: '#FF4A5E' }}>{action.requirePhrase}</span> to confirm</p>
            <input value={phrase} onChange={e => setPhrase(e.target.value)} autoFocus
              className="w-full rounded-xl px-3 py-2 font-mono text-xs border focus:outline-none"
              style={{ background: 'rgba(255,74,94,0.05)', borderColor: 'rgba(255,74,94,0.3)', color: '#E8E8FF' }} />
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="font-mono text-[7.5px] font-bold px-4 py-2 rounded-xl border" style={{ color: 'rgba(232,232,255,0.4)', borderColor: 'rgba(255,255,255,0.08)' }}>Cancel</button>
          <button onClick={() => { if (ready) { action.onConfirm(); onClose(); } }} disabled={!ready}
            className="font-mono text-[7.5px] font-bold px-4 py-2 rounded-xl transition-all"
            style={{ background: action.dangerous ? (ready ? 'rgba(255,74,94,0.18)' : 'rgba(255,255,255,0.03)') : 'rgba(204,128,255,0.14)', color: action.dangerous ? (ready ? '#FF4A5E' : 'rgba(232,232,255,0.18)') : '#CC80FF', border: `1px solid ${action.dangerous ? (ready ? 'rgba(255,74,94,0.4)' : 'rgba(255,255,255,0.06)') : 'rgba(204,128,255,0.3)'}`, cursor: ready ? 'pointer' : 'not-allowed' }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Global Status Bar ──────────────────────────────────────────────────────────

type LiveMetricDef = { label: string; unit: string; color: string; min: number; max: number; vol: number; good: (v: number) => boolean; fmt: (v: number) => string };

const STATUS_METRIC_DEFS: LiveMetricDef[] = [
  { label: 'Platform Health', unit: '%',  color: '#38D68A', min: 92,  max: 100, vol: 0.5,  good: v => v > 95, fmt: v => `${v.toFixed(0)}%`   },
  { label: 'System Stability',unit: '%',  color: '#38D68A', min: 96,  max: 100, vol: 0.3,  good: v => v > 97, fmt: v => `${v.toFixed(1)}%`   },
  { label: 'DB Health',       unit: '%',  color: '#00CFFF', min: 97,  max: 100, vol: 0.2,  good: v => v > 98, fmt: v => `${v.toFixed(1)}%`   },
  { label: 'API Status',      unit: '%',  color: '#38D68A', min: 98,  max: 100, vol: 0.15, good: v => v > 99, fmt: v => `${v.toFixed(2)}%`   },
  { label: 'AI Workers',      unit: '',   color: '#CC80FF', min: 3,   max: 9,   vol: 0.4,  good: v => v > 4,  fmt: v => `${v.toFixed(0)}/9`  },
  { label: 'Queue',           unit: '',   color: '#FFB800', min: 8,   max: 60,  vol: 2,    good: v => v < 40, fmt: v => `${v.toFixed(0)}`    },
  { label: 'Storage',         unit: '%',  color: '#7B6FFF', min: 38,  max: 55,  vol: 0.1,  good: v => v < 60, fmt: v => `${v.toFixed(1)}%`   },
  { label: 'CPU',             unit: '%',  color: '#FF8C00', min: 12,  max: 55,  vol: 2,    good: v => v < 45, fmt: v => `${v.toFixed(0)}%`   },
  { label: 'Memory',          unit: '%',  color: '#FFB800', min: 48,  max: 78,  vol: 1,    good: v => v < 70, fmt: v => `${v.toFixed(0)}%`   },
  { label: 'Realtime',        unit: '',   color: '#00CFFF', min: 90,  max: 420, vol: 8,    good: v => v > 50, fmt: v => `${v.toFixed(0)}`    },
  { label: 'Online Users',    unit: '',   color: '#38D68A', min: 640, max: 1800,vol: 20,   good: v => v > 100,fmt: v => `${v.toFixed(0)}`    },
  { label: 'BG Jobs',         unit: '',   color: '#CC80FF', min: 1,   max: 12,  vol: 0.6,  good: v => v < 10, fmt: v => `${v.toFixed(0)}`    },
  { label: 'Notif Queue',     unit: '',   color: '#FF8C00', min: 0,   max: 35,  vol: 1.5,  good: v => v < 25, fmt: v => `${v.toFixed(0)}`    },
  { label: 'Response',        unit: 'ms', color: '#38D68A', min: 38,  max: 140, vol: 3,    good: v => v < 100,fmt: v => `${v.toFixed(0)}ms`  },
];

function GlobalStatusBar() {
  const rng = useRef(mkRng(0xA3F7));
  const [vals, setVals] = useState<number[]>(() =>
    STATUS_METRIC_DEFS.map(d => d.min + rng.current() * (d.max - d.min))
  );
  const [sparks, setSparks] = useState<number[][]>(() =>
    STATUS_METRIC_DEFS.map(d => Array.from({ length: 7 }, () => d.min + rng.current() * (d.max - d.min)))
  );

  useEffect(() => {
    const iv = setInterval(() => {
      setVals(prev => prev.map((v, i) => {
        const d = STATUS_METRIC_DEFS[i]!;
        return clamp(v + (rng.current() - 0.5) * d.vol * 2, d.min, d.max);
      }));
      setSparks(prev => prev.map((s, i) => {
        const d = STATUS_METRIC_DEFS[i]!;
        const next = clamp((s[s.length - 1] ?? d.min) + (rng.current() - 0.5) * d.vol * 2, d.min, d.max);
        return [...s.slice(1), next];
      }));
    }, 2800);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex gap-0 mb-4 overflow-x-auto rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
      {STATUS_METRIC_DEFS.map((d, i) => {
        const v    = vals[i] ?? d.min;
        const good = d.good(v);
        const c    = good ? d.color : '#FF4A5E';
        return (
          <div key={d.label} className="flex-1 min-w-[82px] px-2.5 py-2 flex flex-col gap-1" style={{ borderRight: i < STATUS_METRIC_DEFS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full shrink-0" style={{ background: c, animation: !good ? 'sc-pulse 1.2s infinite' : undefined }} />
              <span className="font-mono text-[5.5px] font-bold uppercase tracking-wider truncate" style={{ color: 'rgba(232,232,255,0.22)' }}>{d.label}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[9px] font-black" style={{ color: c }}>{d.fmt(v)}</span>
              <Sparkline values={sparks[i]!} color={c} w={28} h={14} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Quick Toolbar ──────────────────────────────────────────────────────────────

function QuickToolbar({ onAction, onConfirm }: { onAction: (msg: string) => void; onConfirm: (a: ConfirmAction) => void }) {
  const ACTIONS = [
    { label: 'Restart AI Workers', color: '#CC80FF', icon: '⟳', dangerous: false },
    { label: 'Clear Cache',        color: '#00CFFF', icon: '✦', dangerous: false },
    { label: 'Flush Queue',        color: '#FFB800', icon: '⚡', dangerous: false },
    { label: 'Run Backup',         color: '#38D68A', icon: '◉', dangerous: false },
    { label: 'Rebuild Search',     color: '#7B6FFF', icon: '◎', dangerous: false },
    { label: 'Reindex Dreams',     color: '#FF8C00', icon: '◆', dangerous: true  },
    { label: 'Refresh Flags',      color: '#00CFFF', icon: '⊞', dangerous: false },
    { label: 'Restart Notifs',     color: '#FF4D8F', icon: '◈', dangerous: false },
  ];

  return (
    <div className="flex items-center gap-1.5 mb-4 p-1 rounded-2xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-1 px-2 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A', animation: 'sc-pulse 1.5s infinite' }} />
        <span className="font-mono text-[6px] font-bold uppercase tracking-wider" style={{ color: 'rgba(232,232,255,0.3)' }}>Quick Actions</span>
      </div>
      <div className="w-px h-5 shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
      {ACTIONS.map(a => (
        <button key={a.label}
          onClick={() => {
            if (a.dangerous) {
              onConfirm({ title: a.label, body: `This will trigger ${a.label.toLowerCase()}. This affects production systems.`, dangerous: true, onConfirm: () => onAction(`${a.label} triggered`) });
            } else {
              onAction(`${a.label} initiated`);
            }
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-[7px] font-bold whitespace-nowrap transition-all hover:opacity-90 active:scale-95 shrink-0"
          style={{ background: `${a.color}10`, color: a.color, border: `1px solid ${a.color}22` }}>
          <span>{a.icon}</span>{a.label}
        </button>
      ))}
    </div>
  );
}

// ── Platform Controls (App Configs) ───────────────────────────────────────────

const CATEGORY_CFG = {
  core:      { label: 'Core Services', color: '#00CFFF' },
  features:  { label: 'Features',      color: '#CC80FF' },
  emergency: { label: 'Emergency',     color: '#FF4A5E' },
};

function PlatformControls({ configs, onConfirm, onAction }: { configs: AppConfigEntry[]; onConfirm: (a: ConfirmAction) => void; onAction: (msg: string) => void }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: ({ key, value }: { key: string; value: boolean }) => updateAppConfigEntry(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-configs'] }),
    onError: () => onAction('Failed to update toggle — check connection'),
  });

  const categories = ['core', 'features', 'emergency'] as const;

  function toggle(c: AppConfigEntry) {
    const next = !c.value;
    if (c.dangerous || c.category === 'emergency') {
      onConfirm({
        title:  `${next ? 'Enable' : 'Disable'} ${c.label}`,
        body:   c.description + ' This is a dangerous action affecting all platform users.',
        dangerous: true,
        requirePhrase: 'CONFIRM',
        onConfirm: () => { mut.mutate({ key: c.key, value: next }); onAction(`${c.label} → ${next ? 'ON' : 'OFF'}`); },
      });
    } else {
      onConfirm({
        title: `${next ? 'Enable' : 'Disable'} ${c.label}`,
        body: c.description,
        onConfirm: () => { mut.mutate({ key: c.key, value: next }); onAction(`${c.label} → ${next ? 'ON' : 'OFF'}`); },
      });
    }
  }

  return (
    <div className="os-card overflow-hidden mb-4">
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00CFFF' }} />
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#00CFFF' }}>EXECUTIVE CONTROL PANEL</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{configs.filter(c => c.value).length}/{configs.length} active</span>
          {configs.some(c => c.category === 'emergency' && c.value) && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,74,94,0.1)', border: '1px solid rgba(255,74,94,0.25)' }}>
              <div className="w-1 h-1 rounded-full" style={{ background: '#FF4A5E', animation: 'sc-pulse 0.8s infinite' }} />
              <span className="font-mono text-[6.5px] font-bold" style={{ color: '#FF4A5E' }}>EMERGENCY ACTIVE</span>
            </div>
          )}
        </div>
      </div>
      {categories.map(cat => {
        const items = configs.filter(c => c.category === cat);
        if (!items.length) return null;
        const catCfg = CATEGORY_CFG[cat];
        return (
          <div key={cat} className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="font-mono text-[6.5px] font-bold uppercase tracking-widest mb-2.5" style={{ color: catCfg.color }}>{catCfg.label}</p>
            <div className="grid grid-cols-4 gap-2">
              {items.map(c => (
                <div key={c.key} className="rounded-xl p-3 flex flex-col gap-2 transition-all cursor-pointer group"
                  onClick={() => toggle(c)}
                  style={{ background: c.value ? `${catCfg.color}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${c.value ? `${catCfg.color}22` : 'rgba(255,255,255,0.05)'}` }}>
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-3.5 rounded-full flex items-center px-0.5 transition-all" style={{ background: c.value ? `${catCfg.color}35` : 'rgba(255,255,255,0.08)' }}>
                      <div className="w-2.5 h-2.5 rounded-full transition-all" style={{ background: c.value ? catCfg.color : 'rgba(232,232,255,0.18)', transform: c.value ? 'translateX(14px)' : 'translateX(0)' }} />
                    </div>
                    {c.dangerous && <span className="font-mono text-[5.5px] font-bold px-1 py-0.5 rounded" style={{ color: '#FF4A5E', background: 'rgba(255,74,94,0.1)' }}>!</span>}
                  </div>
                  <div>
                    <p className="font-mono text-[7.5px] font-bold leading-tight mb-0.5" style={{ color: c.value ? '#E8E8FF' : 'rgba(232,232,255,0.5)' }}>{c.label}</p>
                    <p className="font-mono text-[6px] leading-tight" style={{ color: 'rgba(232,232,255,0.2)' }}>{c.description.slice(0, 60)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{timeAgo(c.updatedAt)}</span>
                    <span className="font-mono text-[6px] font-bold" style={{ color: c.value ? catCfg.color : 'rgba(232,232,255,0.2)' }}>{c.value ? 'ON' : 'OFF'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {configs.length === 0 && (
        <div className="px-4 py-8 text-center font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.25)' }}>Loading platform controls…</div>
      )}
    </div>
  );
}

// ── Live System Monitor ────────────────────────────────────────────────────────

type RingMetric = { label: string; value: number; max: number; color: string; unit: string; spark: number[] };

function MiniRing({ pct, color, size = 36 }: { pct: number; color: string; size?: number }) {
  const r = (size - 4) / 2; const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2.5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={2.5}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x={size / 2} y={size / 2 + 3} textAnchor="middle" fontSize={8} fontFamily="monospace" fontWeight={700} fill={color}>{pct.toFixed(0)}</text>
    </svg>
  );
}

function LiveSystemMonitor() {
  const rng = useRef(mkRng(0xB2C4));
  const initMetrics = (): RingMetric[] => [
    { label: 'CPU',             value: 22, max: 100, color: '#FF8C00', unit: '%',   spark: [18,20,22,25,21,23,22] },
    { label: 'Memory',          value: 61, max: 100, color: '#FFB800', unit: '%',   spark: [58,60,62,61,63,60,61] },
    { label: 'Bandwidth',       value: 34, max: 100, color: '#00CFFF', unit: 'Mbps',spark: [28,32,35,30,38,33,34] },
    { label: 'API Requests',    value: 847, max: 5000,color: '#38D68A', unit: '/m', spark: [720,800,830,880,810,860,847] },
    { label: 'DB Queries',      value: 312, max: 2000,color: '#CC80FF', unit: '/m', spark: [280,300,320,310,330,300,312] },
    { label: 'Worker Usage',    value: 68, max: 100, color: '#7B6FFF', unit: '%',   spark: [60,65,70,68,72,65,68] },
    { label: 'Realtime',        value: 214, max: 500, color: '#00CFFF', unit: 'conn',spark: [180,200,220,210,230,205,214] },
    { label: 'Cache Hit',       value: 91, max: 100, color: '#38D68A', unit: '%',   spark: [88,90,92,91,93,90,91] },
    { label: 'Search Load',     value: 42, max: 100, color: '#FF4D8F', unit: '%',   spark: [38,40,44,42,46,40,42] },
    { label: 'Storage',         value: 44, max: 100, color: '#7B6FFF', unit: '%',   spark: [42,43,44,44,45,43,44] },
    { label: 'Resp Time',       value: 72, max: 200, color: '#38D68A', unit: 'ms',  spark: [65,70,75,68,80,70,72] },
    { label: 'Error Rate',      value: 0.3, max: 5,  color: '#FF4A5E', unit: '%',   spark: [0.2,0.3,0.4,0.3,0.5,0.3,0.3] },
  ];
  const [metrics, setMetrics] = useState<RingMetric[]>(initMetrics);

  useEffect(() => {
    const volatility = [2, 1, 3, 40, 20, 2, 10, 0.5, 2, 0.1, 4, 0.08];
    const iv = setInterval(() => {
      setMetrics(prev => prev.map((m, i) => {
        const vol = volatility[i] ?? 1;
        const next = clamp(m.value + (rng.current() - 0.5) * vol * 2, 0, m.max);
        return { ...m, value: next, spark: [...m.spark.slice(1), next] };
      }));
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="os-card p-4" style={{ animation: 'sc-fade-up 0.5s ease both' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A', animation: 'sc-pulse 1.5s infinite' }} />
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#38D68A' }}>LIVE SYSTEM MONITOR</p>
        </div>
        <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>updates every 3s</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {metrics.map(m => {
          const pct = Math.round((m.value / m.max) * 100);
          const isHigh = m.label === 'Error Rate' ? m.value > 2 : pct > 80;
          const displayColor = isHigh ? '#FF4A5E' : m.color;
          return (
            <div key={m.label} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <MiniRing pct={pct} color={displayColor} size={38} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[7.5px] font-black truncate" style={{ color: '#E8E8FF' }}>
                  {m.value < 10 ? m.value.toFixed(1) : Math.round(m.value)}{m.unit}
                </p>
                <p className="font-mono text-[6px] uppercase tracking-wide truncate" style={{ color: 'rgba(232,232,255,0.25)' }}>{m.label}</p>
                <Sparkline values={m.spark} color={displayColor} w={44} h={10} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AI Signals Panel ───────────────────────────────────────────────────────────

function AISignalsPanel({ signals }: { signals: AISignal[] }) {
  const SEV_CFG = { info: { color: '#00CFFF', icon: '◎' }, warning: { color: '#FFB800', icon: '⚠' }, critical: { color: '#FF4A5E', icon: '⛔' } };

  const SYNTH_INSIGHTS = [
    { msg: 'Database query time increasing over 3h window', sev: 'warning' as const },
    { msg: 'AI moderation confidence stable at 94.2%', sev: 'info' as const },
    { msg: 'Notification queue latency within normal range', sev: 'info' as const },
    { msg: 'CPU usage spike detected on AI worker #3', sev: 'warning' as const },
    { msg: 'Dream indexing velocity 12% below expected', sev: 'warning' as const },
    { msg: 'Cache hit rate excellent — no action needed', sev: 'info' as const },
    { msg: 'Search response times optimal', sev: 'info' as const },
    { msg: 'Storage growth rate: +0.8% this week', sev: 'info' as const },
  ];

  const display = signals.length > 0 ? signals.slice(0, 10).map(s => ({
    msg: s.message, sev: (s.severity === 'info' || s.severity === 'warning' || s.severity === 'critical') ? s.severity : 'info' as const, time: s.createdAt,
  })) : SYNTH_INSIGHTS.map((s, i) => ({ ...s, time: new Date(Date.now() - i * 120000).toISOString() }));

  return (
    <div className="os-card p-4 flex flex-col" style={{ animation: 'sc-fade-up 0.55s ease both' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7B6FFF', animation: 'sc-pulse 2s infinite' }} />
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#7B6FFF' }}>AI PLATFORM ASSISTANT</p>
      </div>
      <div className="space-y-1.5 flex-1 overflow-y-auto max-h-72">
        {display.map((s, i) => {
          const sevKey = (s.sev === 'warning' || s.sev === 'critical') ? s.sev : 'info';
          const cfg = SEV_CFG[sevKey];
          return (
            <div key={i} className="flex items-start gap-2 px-2.5 py-2 rounded-xl" style={{ background: `${cfg.color}07`, border: `1px solid ${cfg.color}18` }}>
              <span className="font-mono text-[9px] shrink-0 mt-0.5">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[7.5px] font-bold leading-tight" style={{ color: '#E8E8FF' }}>{s.msg}</p>
                <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{timeAgo(s.time)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AI Control Center ──────────────────────────────────────────────────────────

type AIService = { name: string; status: 'running' | 'paused' | 'error'; metric: string; metricLabel: string; color: string; workers: number };

function AIControlCenter({ onConfirm, onAction }: { onConfirm: (a: ConfirmAction) => void; onAction: (msg: string) => void }) {
  const initServices = (): AIService[] => [
    { name: 'Dream Analysis',      status: 'running', metric: '94.2%', metricLabel: 'Confidence', color: '#CC80FF', workers: 3 },
    { name: 'Dream Classification',status: 'running', metric: '97.1%', metricLabel: 'Accuracy',   color: '#7B6FFF', workers: 2 },
    { name: 'Emotion Detection',   status: 'running', metric: '91.8%', metricLabel: 'Confidence', color: '#FF4D8F', workers: 2 },
    { name: 'Lucid Detection',     status: 'running', metric: '88.5%', metricLabel: 'Precision',  color: '#00CFFF', workers: 1 },
    { name: 'Nightmare Detection', status: 'running', metric: '93.0%', metricLabel: 'Recall',     color: '#FF4A5E', workers: 1 },
    { name: 'Dream Matching',      status: 'running', metric: '1.2K',  metricLabel: 'matches/h',  color: '#38D68A', workers: 2 },
    { name: 'Recommendations',     status: 'running', metric: '4.8K',  metricLabel: 'recs/h',     color: '#FFB800', workers: 2 },
    { name: 'Moderation AI',       status: 'running', metric: '247',   metricLabel: 'flagged/day', color: '#FF8C00', workers: 3 },
    { name: 'Vector Search',       status: 'running', metric: '1.8M',  metricLabel: 'indexed',    color: '#00CFFF', workers: 1 },
    { name: 'Embeddings',          status: 'running', metric: '340',   metricLabel: 'gen/min',    color: '#CC80FF', workers: 2 },
  ];

  const [services, setServices] = useState<AIService[]>(initServices);

  function toggleService(name: string) {
    const svc = services.find(s => s.name === name)!;
    const next = svc.status === 'running' ? 'paused' : 'running';
    onConfirm({
      title: `${next === 'paused' ? 'Pause' : 'Resume'} ${name}`,
      body: `This will ${next === 'paused' ? 'suspend' : 'resume'} the ${name} AI service. ${next === 'paused' ? 'Platform features depending on this service will degrade.' : 'It may take 30-60s to reach full capacity.'}`,
      dangerous: next === 'paused',
      onConfirm: () => { setServices(p => p.map(s => s.name === name ? { ...s, status: next as AIService['status'] } : s)); onAction(`${name} → ${next}`); },
    });
  }

  return (
    <div className="os-card overflow-hidden mb-4" style={{ animation: 'sc-fade-up 0.6s ease both' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#CC80FF', animation: 'sc-pulse 1.8s infinite' }} />
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#CC80FF' }}>AI CONTROL CENTER</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{services.filter(s => s.status === 'running').length}/{services.length} services running</span>
          <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{services.reduce((acc, s) => acc + s.workers, 0)} workers active</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-0">
        {services.map((s, i) => {
          const running = s.status === 'running';
          return (
            <div key={s.name} className="p-3 flex flex-col gap-2" style={{ borderRight: i % 5 < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: running ? 'transparent' : 'rgba(255,74,94,0.03)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: running ? s.color : '#FF4A5E', animation: running ? 'sc-pulse 2s infinite' : undefined }} />
                  <span className="font-mono text-[6.5px] font-bold" style={{ color: running ? s.color : '#FF4A5E' }}>{running ? 'RUNNING' : 'PAUSED'}</span>
                </div>
                <button onClick={() => toggleService(s.name)} className="font-mono text-[6px] px-1.5 py-0.5 rounded border transition-colors" style={{ color: running ? '#FF4A5E' : '#38D68A', borderColor: running ? 'rgba(255,74,94,0.2)' : 'rgba(56,214,138,0.2)', background: running ? 'rgba(255,74,94,0.06)' : 'rgba(56,214,138,0.06)' }}>
                  {running ? 'Pause' : 'Resume'}
                </button>
              </div>
              <p className="font-mono text-[8px] font-black" style={{ color: '#E8E8FF' }}>{s.name}</p>
              <div>
                <p className="font-mono text-[11px] font-black" style={{ color: s.color }}>{s.metric}</p>
                <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.22)' }}>{s.metricLabel}</p>
              </div>
              <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{s.workers} worker{s.workers > 1 ? 's' : ''}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Feature Flags Panel ────────────────────────────────────────────────────────

function FeatureFlagsPanel({ flags, onConfirm, onAction }: { flags: FeatureFlag[]; onConfirm: (a: ConfirmAction) => void; onAction: (msg: string) => void }) {
  const qc  = useQueryClient();
  const mut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<FeatureFlag> }) => updateFeatureFlag(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); },
    onError: () => onAction('Feature flag update failed'),
  });

  function toggleFlag(f: FeatureFlag) {
    onConfirm({
      title: `${f.enabled ? 'Disable' : 'Enable'} ${f.name}`,
      body: f.description + ` This will ${f.enabled ? 'disable' : 'enable'} for ${f.targetAudience} (${f.rolloutPercentage}% rollout).`,
      onConfirm: () => { mut.mutate({ id: f.id, dto: { enabled: !f.enabled } }); onAction(`${f.name} → ${!f.enabled ? 'ON' : 'OFF'}`); },
    });
  }

  function updateRollout(f: FeatureFlag, pct: number) {
    mut.mutate({ id: f.id, dto: { rolloutPercentage: pct } });
    onAction(`${f.name} rollout → ${pct}%`);
  }

  return (
    <div className="os-card overflow-hidden mb-4" style={{ animation: 'sc-fade-up 0.65s ease both' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7B6FFF' }} />
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#7B6FFF' }}>FEATURE FLAGS</p>
        </div>
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{flags.filter(f => f.enabled).length}/{flags.length} enabled</span>
      </div>
      {flags.length === 0 ? (
        <p className="px-4 py-6 font-mono text-[8px] text-center" style={{ color: 'rgba(232,232,255,0.25)' }}>No feature flags configured</p>
      ) : (
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Name', 'Status', 'Rollout', 'Audience', 'Updated By', 'Last Changed'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-mono uppercase" style={{ fontSize: 6.5, color: 'rgba(232,232,255,0.22)', letterSpacing: '0.07em', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flags.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/[0.012] transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="font-mono text-[8px] font-bold" style={{ color: '#E8E8FF' }}>{f.name}</p>
                    <p className="font-mono text-[6.5px] truncate max-w-[180px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{f.description}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleFlag(f)} className="flex items-center gap-1.5 group">
                      <div className="w-7 h-3.5 rounded-full flex items-center px-0.5" style={{ background: f.enabled ? 'rgba(56,214,138,0.3)' : 'rgba(255,255,255,0.08)' }}>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: f.enabled ? '#38D68A' : 'rgba(232,232,255,0.18)', transform: f.enabled ? 'translateX(14px)' : 'translateX(0)', transition: 'all 0.2s' }} />
                      </div>
                      <span className="font-mono text-[7px] font-bold" style={{ color: f.enabled ? '#38D68A' : 'rgba(232,232,255,0.2)' }}>{f.enabled ? 'ON' : 'OFF'}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <input type="range" min={0} max={100} value={f.rolloutPercentage}
                        onChange={e => updateRollout(f, Number(e.target.value))}
                        className="w-20 accent-purple-400" style={{ accentColor: '#7B6FFF' }} />
                      <span className="font-mono text-[7.5px] font-black w-8" style={{ color: '#7B6FFF' }}>{f.rolloutPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[7px] px-2 py-0.5 rounded-lg" style={{ background: 'rgba(204,128,255,0.08)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.15)' }}>{f.targetAudience}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.35)' }}>{f.updatedBy ?? 'system'}</td>
                  <td className="px-3 py-2.5 font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{timeAgo(f.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Automation Rules Panel ─────────────────────────────────────────────────────

function AutomationRulesPanel({ rules, onAction }: { rules: ModerationRules | undefined; onAction: (msg: string) => void }) {
  const qc   = useQueryClient();
  const [draft, setDraft] = useState<Partial<ModerationRules>>({});
  const dirty = Object.keys(draft).length > 0;

  const mut = useMutation({
    mutationFn: (dto: Partial<ModerationRules>) => updateModerationRules(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['moderation-rules'] }); setDraft({}); onAction('Automation rules saved'); },
    onError: () => onAction('Failed to save rules'),
  });

  const numField = (key: keyof ModerationRules, label: string, desc: string, color: string) => {
    const val = draft[key] !== undefined ? draft[key] : rules?.[key];
    const displayVal = typeof val === 'number' ? val : 0;
    return (
      <div key={key} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${dirty && draft[key] !== undefined ? `${color}30` : 'rgba(255,255,255,0.05)'}` }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-mono text-[7.5px] font-bold" style={{ color: dirty && draft[key] !== undefined ? color : '#E8E8FF' }}>{label}</p>
          {dirty && draft[key] !== undefined && <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
        </div>
        <input type="number" value={displayVal}
          onChange={e => setDraft(p => ({ ...p, [key]: Number(e.target.value) }))}
          className="w-full bg-transparent font-mono text-sm font-black border-b pb-1 focus:outline-none"
          style={{ color, borderColor: `${color}30` }} />
        <p className="font-mono text-[6px] mt-1.5" style={{ color: 'rgba(232,232,255,0.2)' }}>{desc}</p>
      </div>
    );
  };

  return (
    <div className="os-card overflow-hidden" style={{ animation: 'sc-fade-up 0.7s ease both' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF8C00' }} />
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FF8C00' }}>AUTOMATION RULES</p>
        </div>
        {dirty && (
          <div className="flex gap-2">
            <button onClick={() => setDraft({})} className="font-mono text-[7px] px-3 py-1.5 rounded-xl border" style={{ color: 'rgba(232,232,255,0.4)', borderColor: 'rgba(255,255,255,0.1)' }}>Discard</button>
            <button onClick={() => mut.mutate(draft)} className="font-mono text-[7px] px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,140,0,0.15)', color: '#FF8C00', border: '1px solid rgba(255,140,0,0.3)' }}>Save Changes</button>
          </div>
        )}
      </div>
      <div className="p-4 grid grid-cols-3 gap-2.5">
        {numField('autoHideThreshold', 'Auto-Hide Threshold', 'Reports to auto-hide a dream', '#FFB800')}
        {numField('reportThreshold',   'Report Threshold',    'Reports to flag for review',   '#FF8C00')}
        {numField('banThreshold',      'Ban Threshold',       'Reports to trigger auto-ban',  '#FF4A5E')}
        {numField('suspiciousUserThreshold', 'Suspicious User', 'Score to flag user as suspicious', '#CC80FF')}
        {numField('aiRiskThreshold',   'AI Risk Threshold',   'Risk score to trigger AI action','#7B6FFF')}
        {numField('rateLimitPerMinute','Rate Limit / Min',    'Max actions per user per minute','#00CFFF')}
      </div>
      {rules?.updatedAt && (
        <p className="px-4 pb-3 font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.18)' }}>Last saved {timeAgo(rules.updatedAt)} by {rules.updatedBy ?? 'system'}</p>
      )}
    </div>
  );
}

// ── Announcements Panel ────────────────────────────────────────────────────────

function AnnouncementsPanel({ onAction }: { onAction: (msg: string) => void }) {
  const [title,    setTitle]    = useState('');
  const [message,  setMessage]  = useState('');
  const [type,     setType]     = useState('banner');
  const [audience, setAudience] = useState('all');
  const [sent, setSent] = useState<Array<{ title: string; type: string; at: string }>>([]);

  const mut = useMutation({
    mutationFn: () => sendAdminNotification({ type, title, message, targetAudience: audience }),
    onSuccess: () => {
      setSent(p => [{ title, type, at: new Date().toISOString() }, ...p.slice(0, 4)]);
      setTitle(''); setMessage('');
      onAction(`Announcement "${title}" sent to ${audience}`);
    },
    onError: () => onAction('Failed to send announcement'),
  });

  const TYPE_CFG: Record<string, { label: string; color: string }> = {
    banner:      { label: 'Banner',        color: '#00CFFF' },
    popup:       { label: 'Popup',         color: '#CC80FF' },
    push:        { label: 'Push Notif',    color: '#38D68A' },
    email:       { label: 'Email',         color: '#FFB800' },
    in_app:      { label: 'In-App',        color: '#7B6FFF' },
    emergency:   { label: 'Emergency',     color: '#FF4A5E' },
    maintenance: { label: 'Maintenance',   color: '#FF8C00' },
  };

  const tc = TYPE_CFG[type] ?? TYPE_CFG['banner']!;

  return (
    <div className="os-card overflow-hidden" style={{ animation: 'sc-fade-up 0.72s ease both' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF4D8F' }} />
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FF4D8F' }}>GLOBAL ANNOUNCEMENTS</p>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-mono text-[6.5px] uppercase tracking-wider mb-1 block" style={{ color: 'rgba(232,232,255,0.3)' }}>Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full rounded-xl px-2.5 py-1.5 font-mono border focus:outline-none" style={{ background: '#0D0D1A', borderColor: `${tc.color}30`, color: tc.color, fontSize: 9 }}>
              {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="font-mono text-[6.5px] uppercase tracking-wider mb-1 block" style={{ color: 'rgba(232,232,255,0.3)' }}>Target Audience</label>
            <select value={audience} onChange={e => setAudience(e.target.value)} className="w-full rounded-xl px-2.5 py-1.5 font-mono border focus:outline-none" style={{ background: '#0D0D1A', borderColor: 'rgba(255,255,255,0.1)', color: '#E8E8FF', fontSize: 9 }}>
              {['all', 'premium', 'free', 'new_users', 'admins'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="font-mono text-[6.5px] uppercase tracking-wider mb-1 block" style={{ color: 'rgba(232,232,255,0.3)' }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title…"
            className="w-full rounded-xl px-2.5 py-1.5 font-mono border focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', color: '#E8E8FF', fontSize: 9 }} />
        </div>
        <div>
          <label className="font-mono text-[6.5px] uppercase tracking-wider mb-1 block" style={{ color: 'rgba(232,232,255,0.3)' }}>Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Message content…"
            className="w-full rounded-xl px-2.5 py-1.5 font-mono border focus:outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', color: '#E8E8FF', fontSize: 9 }} />
        </div>
        <button onClick={() => mut.mutate()} disabled={!title.trim() || !message.trim() || mut.isPending}
          className="w-full font-mono text-[7.5px] font-bold py-2 rounded-xl transition-all"
          style={{ background: title && message ? `${tc.color}15` : 'rgba(255,255,255,0.03)', color: title && message ? tc.color : 'rgba(232,232,255,0.2)', border: `1px solid ${title && message ? `${tc.color}30` : 'rgba(255,255,255,0.06)'}`, cursor: title && message ? 'pointer' : 'not-allowed' }}>
          {mut.isPending ? 'Sending…' : `Send ${tc.label}`}
        </button>
        {sent.length > 0 && (
          <div className="space-y-1">
            <p className="font-mono text-[6.5px] uppercase tracking-wider" style={{ color: 'rgba(232,232,255,0.2)' }}>Recent</p>
            {sent.map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: (TYPE_CFG[s.type] ?? TYPE_CFG['banner']!).color }} />
                <p className="font-mono text-[7px] flex-1 truncate" style={{ color: 'rgba(232,232,255,0.5)' }}>{s.title}</p>
                <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{timeAgo(s.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Security Center ────────────────────────────────────────────────────────────

function SecurityCenter() {
  const rng = useRef(mkRng(0xD4E9));
  const [metrics] = useState(() => {
    const r = rng.current;
    return {
      activeSessions: Math.round(3 + r() * 8),
      failedLogins:   Math.round(r() * 25),
      apiKeys:        Math.round(2 + r() * 10),
      blockedIps:     Math.round(r() * 40),
      suspiciousActs: Math.round(r() * 5),
      mfaEnforced:    r() > 0.4,
      lastAudit:      new Date(Date.now() - r() * 7 * 86400000).toISOString(),
    };
  });

  const ITEMS = [
    { label: 'Admin Sessions',     value: String(metrics.activeSessions), color: '#38D68A', icon: '◉' },
    { label: 'Failed Logins (24h)',value: String(metrics.failedLogins),  color: metrics.failedLogins > 15 ? '#FF4A5E' : '#FFB800', icon: '⚠' },
    { label: 'Active API Keys',    value: String(metrics.apiKeys),       color: '#00CFFF', icon: '⌖' },
    { label: 'Blocked IPs',        value: String(metrics.blockedIps),    color: '#FF4A5E', icon: '⊘' },
    { label: 'Suspicious Activity',value: String(metrics.suspiciousActs),color: metrics.suspiciousActs > 2 ? '#FF4A5E' : '#FFB800', icon: '⚑' },
    { label: '2FA Enforcement',    value: metrics.mfaEnforced ? 'Required' : 'Optional', color: metrics.mfaEnforced ? '#38D68A' : '#FFB800', icon: '◈' },
    { label: 'Token Expiry',       value: '24h',                         color: '#CC80FF', icon: '◎' },
    { label: 'Last Audit',         value: timeAgo(metrics.lastAudit),   color: 'rgba(232,232,255,0.4)', icon: '◇' },
  ];

  return (
    <div className="os-card overflow-hidden" style={{ animation: 'sc-fade-up 0.75s ease both' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF4A5E' }} />
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FF4A5E' }}>SECURITY CENTER</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-2">
        {ITEMS.map(item => (
          <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-base shrink-0" style={{ color: item.color }}>{item.icon}</span>
            <div className="min-w-0">
              <p className="font-mono text-[8px] font-black" style={{ color: item.color }}>{item.value}</p>
              <p className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── System Logs Panel ──────────────────────────────────────────────────────────

const LOG_CATEGORIES = ['all', 'platform', 'database', 'ai', 'api', 'security', 'auth', 'moderation'] as const;
type LogCat = typeof LOG_CATEGORIES[number];

function SystemLogsPanel({ logs }: { logs: AdminLogEntry[] }) {
  const [cat, setCat] = useState<LogCat>('all');
  const ACTION_COLORS: Record<string, string> = {
    config_update: '#00CFFF', feature_flag_update: '#7B6FFF', ban: '#FF4A5E', unban: '#38D68A',
    role_change: '#CC80FF', status_change: '#FFB800', moderation: '#FF8C00', auth: '#38D68A',
  };

  const catFilter = (log: AdminLogEntry): boolean => {
    if (cat === 'all') return true;
    if (cat === 'security' || cat === 'auth') return log.actionType.includes('auth') || log.actionType.includes('login') || log.actionType.includes('role');
    if (cat === 'moderation') return log.actionType.includes('ban') || log.actionType.includes('mod') || log.actionType.includes('report');
    if (cat === 'platform') return log.actionType.includes('config') || log.actionType.includes('flag');
    return true;
  };

  const displayed = logs.filter(catFilter).slice(0, 12);

  return (
    <div className="os-card overflow-hidden" style={{ animation: 'sc-fade-up 0.78s ease both' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00CFFF', animation: 'sc-pulse 2.5s infinite' }} />
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#00CFFF' }}>SYSTEM LOGS</p>
        </div>
      </div>
      <div className="flex gap-0 px-3 pt-2 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {LOG_CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className="font-mono text-[6.5px] font-bold uppercase tracking-wider px-3 py-1.5 whitespace-nowrap transition-all"
            style={{ color: cat === c ? '#00CFFF' : 'rgba(232,232,255,0.25)', borderBottom: `1px solid ${cat === c ? '#00CFFF' : 'transparent'}`, marginBottom: -1 }}>
            {c}
          </button>
        ))}
      </div>
      <div className="p-3 space-y-1 max-h-64 overflow-y-auto">
        {displayed.length === 0 ? (
          <p className="py-6 text-center font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No logs for this category</p>
        ) : displayed.map(log => {
          const color = ACTION_COLORS[log.actionType] ?? '#CC80FF';
          return (
            <div key={log.id} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.012] transition-colors">
              <div className="w-1 h-1 rounded-full shrink-0 mt-1.5" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[7.5px] font-bold" style={{ color }}>{log.actionType.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{log.adminUsername}</span>
                </div>
                {log.targetUsername && <p className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>→ {log.targetUsername}</p>}
              </div>
              <span className="font-mono text-[6px] shrink-0" style={{ color: 'rgba(232,232,255,0.2)' }}>{timeAgo(log.createdAt)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Deployment Center ──────────────────────────────────────────────────────────

function DeploymentCenter() {
  const info = {
    version: 'v2.14.3', prev: 'v2.14.2', status: 'Deployed', commit: '3f2a9b8c',
    branch: 'main', deployedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    migStatus: 'Up to date', lastBuild: '4h 12m ago', buildTime: '2m 34s',
    region: 'EU-West-1',
  };

  const ROWS = [
    { label: 'Current Version',   value: info.version,     color: '#38D68A' },
    { label: 'Previous Version',  value: info.prev,        color: 'rgba(232,232,255,0.35)' },
    { label: 'Status',            value: info.status,      color: '#38D68A' },
    { label: 'Git Commit',        value: info.commit,      color: '#CC80FF' },
    { label: 'Branch',            value: info.branch,      color: '#7B6FFF' },
    { label: 'Deployed',          value: timeAgo(info.deployedAt), color: 'rgba(232,232,255,0.4)' },
    { label: 'DB Migrations',     value: info.migStatus,   color: '#38D68A' },
    { label: 'Build Time',        value: info.buildTime,   color: '#00CFFF' },
    { label: 'Region',            value: info.region,      color: '#FFB800' },
  ];

  return (
    <div className="os-card overflow-hidden" style={{ animation: 'sc-fade-up 0.8s ease both' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A' }} />
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#38D68A' }}>DEPLOYMENT</p>
      </div>
      <div className="p-4 space-y-0">
        {ROWS.map(r => (
          <div key={r.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{r.label}</span>
            <span className="font-mono text-[8px] font-black" style={{ color: r.color }}>{r.value}</span>
          </div>
        ))}
        <div className="flex gap-2 pt-3">
          <button className="flex-1 font-mono text-[7px] font-bold py-1.5 rounded-xl border" style={{ color: '#FFB800', borderColor: 'rgba(255,184,0,0.2)', background: 'rgba(255,184,0,0.06)' }}>Rollback to {info.prev}</button>
          <button className="flex-1 font-mono text-[7px] font-bold py-1.5 rounded-xl border" style={{ color: '#00CFFF', borderColor: 'rgba(0,207,255,0.2)', background: 'rgba(0,207,255,0.06)' }}>View Build Logs</button>
        </div>
      </div>
    </div>
  );
}

// ── Scheduled Tasks ────────────────────────────────────────────────────────────

type TaskStatus = 'running' | 'idle' | 'queued' | 'error';
type ScheduledTask = { name: string; status: TaskStatus; last: string; next: string; duration: string; color: string };

function ScheduledTasksPanel({ onAction }: { onAction: (msg: string) => void }) {
  const TASKS: ScheduledTask[] = [
    { name: 'Dream Indexing',    status: 'running', last: '2m ago',  next: '10m',   duration: '~8m',  color: '#CC80FF' },
    { name: 'AI Queue',          status: 'running', last: '1m ago',  next: '5m',    duration: '~3m',  color: '#7B6FFF' },
    { name: 'Email Queue',       status: 'idle',    last: '8m ago',  next: '15m',   duration: '~1m',  color: '#FFB800' },
    { name: 'Cleanup',           status: 'idle',    last: '1h ago',  next: '3h',    duration: '~12m', color: '#38D68A' },
    { name: 'Backups',           status: 'idle',    last: '4h ago',  next: '8h',    duration: '~20m', color: '#00CFFF' },
    { name: 'Analytics Sync',    status: 'queued',  last: '15m ago', next: '30m',   duration: '~5m',  color: '#FF8C00' },
    { name: 'Vector Updates',    status: 'idle',    last: '2h ago',  next: '4h',    duration: '~30m', color: '#CC80FF' },
    { name: 'Cache Refresh',     status: 'running', last: '30s ago', next: '5m',    duration: '~45s', color: '#38D68A' },
  ];
  const STATUS_CFG: Record<TaskStatus, { color: string; label: string }> = {
    running: { color: '#38D68A', label: 'Running' },
    idle:    { color: 'rgba(232,232,255,0.2)', label: 'Idle' },
    queued:  { color: '#FFB800', label: 'Queued' },
    error:   { color: '#FF4A5E', label: 'Error' },
  };

  return (
    <div className="os-card overflow-hidden" style={{ animation: 'sc-fade-up 0.82s ease both' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FFB800' }} />
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FFB800' }}>SCHEDULED TASKS</p>
      </div>
      <div className="p-3 space-y-1">
        {TASKS.map(t => {
          const sc = STATUS_CFG[t.status];
          return (
            <div key={t.name} className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/[0.012] transition-colors"
              style={{ background: t.status === 'running' ? `${t.color}06` : 'transparent', border: t.status === 'running' ? `1px solid ${t.color}15` : '1px solid transparent' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc.color, animation: t.status === 'running' ? 'sc-pulse 1.5s infinite' : undefined }} />
              <p className="flex-1 font-mono text-[7.5px] font-bold" style={{ color: t.status === 'running' ? '#E8E8FF' : 'rgba(232,232,255,0.5)' }}>{t.name}</p>
              <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{t.last}</span>
              <span className="font-mono text-[6.5px] w-8 text-right" style={{ color: 'rgba(232,232,255,0.2)' }}>+{t.next}</span>
              <span className="font-mono text-[6.5px] font-bold w-14 text-right" style={{ color: sc.color }}>{sc.label}</span>
              <button onClick={() => onAction(`${t.name} triggered manually`)} className="font-mono text-[6px] px-1.5 py-0.5 rounded border" style={{ color: t.color, borderColor: `${t.color}20`, background: `${t.color}08` }}>Run</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Backup Center ──────────────────────────────────────────────────────────────

function BackupCenter({ onConfirm, onAction }: { onConfirm: (a: ConfirmAction) => void; onAction: (msg: string) => void }) {
  const info = {
    lastDb: new Date(Date.now() - 4.2 * 3600000).toISOString(),
    lastStorage: new Date(Date.now() - 6.1 * 3600000).toISOString(),
    dbSize: '48.2 GB', storageSize: '1.2 TB', snapshots: 14,
    health: 98, retentionDays: 30,
  };

  return (
    <div className="os-card overflow-hidden" style={{ animation: 'sc-fade-up 0.84s ease both' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00CFFF' }} />
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#00CFFF' }}>BACKUP CENTER</p>
      </div>
      <div className="p-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'DB Backup',       value: timeAgo(info.lastDb),      sub: info.dbSize,   color: '#38D68A' },
            { label: 'Storage Backup',  value: timeAgo(info.lastStorage), sub: info.storageSize, color: '#00CFFF' },
            { label: 'Snapshots',       value: String(info.snapshots),    sub: `${info.retentionDays}d retention`, color: '#CC80FF' },
            { label: 'Backup Health',   value: `${info.health}%`,         sub: 'All systems go', color: '#38D68A' },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${item.color}15` }}>
              <p className="font-mono text-[11px] font-black" style={{ color: item.color }}>{item.value}</p>
              <p className="font-mono text-[6.5px] font-bold mt-0.5" style={{ color: 'rgba(232,232,255,0.5)' }}>{item.label}</p>
              <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{item.sub}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => onAction('Database backup started')} className="flex-1 font-mono text-[7px] font-bold py-2 rounded-xl border" style={{ color: '#38D68A', borderColor: 'rgba(56,214,138,0.2)', background: 'rgba(56,214,138,0.06)' }}>Run DB Backup</button>
          <button onClick={() => onConfirm({ title: 'Trigger Full Restore', body: 'This will restore the platform from the latest backup. ALL current data will be replaced. This cannot be undone.', dangerous: true, requirePhrase: 'RESTORE', onConfirm: () => onAction('Restore triggered') })}
            className="flex-1 font-mono text-[7px] font-bold py-2 rounded-xl border" style={{ color: '#FF4A5E', borderColor: 'rgba(255,74,94,0.2)', background: 'rgba(255,74,94,0.06)' }}>Emergency Restore</button>
        </div>
      </div>
    </div>
  );
}

// ── Platform Map ───────────────────────────────────────────────────────────────

function PlatformMap() {
  type NodeStatus = 'healthy' | 'degraded' | 'critical';
  type MapNode = { id: string; label: string; x: number; y: number; color: string; status: NodeStatus };
  const NODES: MapNode[] = [
    { id: 'web',    label: 'Web App',   x: 80,  y: 40,  color: '#00CFFF', status: 'healthy'  },
    { id: 'mobile', label: 'Mobile',    x: 80,  y: 130, color: '#00CFFF', status: 'healthy'  },
    { id: 'api',    label: 'API',       x: 230, y: 85,  color: '#CC80FF', status: 'healthy'  },
    { id: 'db',     label: 'Postgres',  x: 380, y: 40,  color: '#38D68A', status: 'healthy'  },
    { id: 'redis',  label: 'Redis',     x: 380, y: 130, color: '#FFB800', status: 'healthy'  },
    { id: 'ai',     label: 'AI Engine', x: 380, y: 210, color: '#7B6FFF', status: 'healthy'  },
    { id: 'rt',     label: 'Realtime',  x: 530, y: 40,  color: '#00CFFF', status: 'healthy'  },
    { id: 'search', label: 'Search',    x: 530, y: 130, color: '#CC80FF', status: 'degraded' },
    { id: 'store',  label: 'Storage',   x: 530, y: 210, color: '#FF8C00', status: 'healthy'  },
    { id: 'notif',  label: 'Notifs',    x: 230, y: 210, color: '#FF4D8F', status: 'healthy'  },
  ];
  const EDGES = [
    ['web','api'],['mobile','api'],['api','db'],['api','redis'],['api','ai'],
    ['api','rt'],['api','search'],['api','store'],['api','notif'],['ai','db'],
  ];
  const STATUS_COLOR: Record<NodeStatus, string> = { healthy: '#38D68A', degraded: '#FFB800', critical: '#FF4A5E' };

  return (
    <div className="os-card overflow-hidden" style={{ animation: 'sc-fade-up 0.86s ease both' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#CC80FF' }} />
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#CC80FF' }}>PLATFORM MAP</p>
        </div>
        <div className="flex items-center gap-3">
          {(['healthy', 'degraded', 'critical'] as NodeStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
              <span className="font-mono text-[6px] capitalize" style={{ color: 'rgba(232,232,255,0.3)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4">
        <svg viewBox="0 0 620 260" style={{ width: '100%', height: 200 }}>
          {EDGES.map(([a, b]) => {
            const na = NODES.find(n => n.id === a)!; const nb = NODES.find(n => n.id === b)!;
            return <line key={`${a}-${b}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
          })}
          {NODES.map(n => {
            const sc = STATUS_COLOR[n.status];
            return (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r={22} fill={`${n.color}10`} stroke={`${n.color}25`} strokeWidth={1.5} />
                <circle cx={n.x + 15} cy={n.y - 15} r={5} fill={sc} stroke="#0D0D1A" strokeWidth={1.5} />
                <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize={7} fontFamily="monospace" fontWeight={700} fill={n.color}>{n.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Audit History ──────────────────────────────────────────────────────────────

function AuditHistory({ logs }: { logs: AdminLogEntry[] }) {
  const ACTION_COLOR: Record<string, string> = {
    config_update: '#00CFFF', feature_flag_update: '#7B6FFF', ban: '#FF4A5E', unban: '#38D68A',
    role_change: '#CC80FF', status_change: '#FFB800', dream_hidden: '#FF8C00', dream_featured: '#38D68A',
  };

  return (
    <div className="os-card overflow-hidden" style={{ animation: 'sc-fade-up 0.88s ease both' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FFB800' }} />
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FFB800' }}>AUDIT HISTORY</p>
      </div>
      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Action', 'Admin', 'Target', 'When'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-mono uppercase" style={{ fontSize: 6.5, color: 'rgba(232,232,255,0.22)', letterSpacing: '0.06em', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No audit entries</td></tr>
            ) : logs.slice(0, 15).map(log => {
              const color = ACTION_COLOR[log.actionType] ?? '#CC80FF';
              return (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/[0.01]">
                  <td className="px-3 py-2">
                    <span className="font-mono text-[7px] font-bold" style={{ color }}>{log.actionType.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{log.adminUsername}</td>
                  <td className="px-3 py-2 font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.35)' }}>{log.targetUsername ?? log.targetEmail ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{timeAgo(log.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Emergency Panel ────────────────────────────────────────────────────────────

function EmergencyPanel({ onConfirm, onAction }: { onConfirm: (a: ConfirmAction) => void; onAction: (msg: string) => void }) {
  const ACTIONS = [
    { label: 'Emergency Maintenance', desc: 'Put the entire platform into maintenance mode. Users will see a maintenance page.', phrase: 'MAINTENANCE', color: '#FF8C00' },
    { label: 'Freeze Registrations',  desc: 'Immediately stop all new user registrations.', phrase: 'FREEZE', color: '#FFB800' },
    { label: 'Disable Dream Posting', desc: 'Stop all users from posting new dreams.', phrase: 'DISABLE', color: '#FF8C00' },
    { label: 'Disable AI Services',   desc: 'Shut down all AI services including analysis and moderation.', phrase: 'DISABLE AI', color: '#CC80FF' },
    { label: 'Disable Notifications', desc: 'Stop all notification delivery (push, email, in-app).', phrase: 'DISABLE', color: '#FF4D8F' },
    { label: 'Emergency Backup',      desc: 'Trigger an immediate full platform backup before any action.', phrase: 'BACKUP', color: '#38D68A' },
    { label: 'Read Only Mode',        desc: 'Switch platform to read-only. No writes of any kind permitted.', phrase: 'READ ONLY', color: '#7B6FFF' },
    { label: 'Emergency Shutdown',    desc: 'Complete platform shutdown. This will affect ALL users immediately and cannot be undone without manual intervention.', phrase: 'SHUTDOWN CONFIRMED', color: '#FF4A5E' },
  ];

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid rgba(255,74,94,0.3)', background: 'rgba(255,74,94,0.03)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,74,94,0.15)', background: 'rgba(255,74,94,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF4A5E', animation: 'sc-pulse 0.8s infinite' }} />
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FF4A5E' }}>EMERGENCY CONTROL PANEL</p>
        </div>
        <span className="font-mono text-[6.5px]" style={{ color: 'rgba(255,74,94,0.5)' }}>All actions require typed confirmation</span>
      </div>
      <div className="p-4 grid grid-cols-4 gap-2.5">
        {ACTIONS.map(a => (
          <button key={a.label} onClick={() =>
            onConfirm({ title: a.label, body: a.desc, dangerous: true, requirePhrase: a.phrase, onConfirm: () => onAction(`EMERGENCY: ${a.label} executed`) })
          } className="text-left p-3 rounded-xl transition-all hover:opacity-90 active:scale-95"
            style={{ background: `${a.color}06`, border: `1px solid ${a.color}22` }}>
            <p className="font-mono text-[7.5px] font-black mb-1" style={{ color: a.color }}>{a.label}</p>
            <p className="font-mono text-[6px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.3)' }}>{a.desc.slice(0, 60)}…</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SystemControl() {
  const [confirm,  setConfirm]  = useState<ConfirmAction | null>(null);
  const [toast,    setToast]    = useState('');

  function openConfirm(a: ConfirmAction) { setConfirm(a); }
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3200); }

  const { data: configs = [] } = useQuery({ queryKey: ['app-configs'],       queryFn: fetchAppConfigs,       refetchInterval: 30_000 });
  const { data: flags   = [] } = useQuery({ queryKey: ['feature-flags'],     queryFn: fetchFeatureFlags,     refetchInterval: 30_000 });
  const { data: rules        } = useQuery({ queryKey: ['moderation-rules'],  queryFn: fetchModerationRules   });
  const { data: signals = [] } = useQuery({ queryKey: ['ai-signals'],        queryFn: () => fetchAISignals(20), refetchInterval: 60_000 });
  const { data: logsPage     } = useQuery({ queryKey: ['admin-logs'],        queryFn: () => fetchAdminLogs(1, 30), refetchInterval: 30_000 });

  const logs: AdminLogEntry[] = logsPage?.items ?? [];
  const emergencyActive = configs.some(c => c.category === 'emergency' && c.value);

  return (
    <div className="section-system relative">
      <style>{`
        @keyframes sc-fade-up   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sc-slide-in  { from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:translateX(0)} }
        @keyframes sc-pulse     { 0%,100%{opacity:0.25} 50%{opacity:1} }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl font-mono text-[8px] font-bold shadow-2xl" style={{ background: '#0D0D1A', border: '1px solid rgba(56,214,138,0.3)', color: '#38D68A', animation: 'sc-slide-in 0.2s ease' }}>
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4" style={{ animation: 'sc-fade-up 0.25s ease both' }}>
        <div>
          <h1 className="font-mono text-base font-black tracking-tight" style={{ color: '#E8E8FF' }}>Platform Operations Center</h1>
          <p className="font-mono text-[8px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>DreamCloud OS — Full Platform Control</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A', animation: 'sc-pulse 1.5s infinite' }} />
            <span className="font-mono text-[7px] font-bold" style={{ color: '#38D68A' }}>ALL SYSTEMS LIVE</span>
          </div>
        </div>
      </div>

      {/* Quick toolbar */}
      <QuickToolbar onAction={showToast} onConfirm={openConfirm} />

      {/* Global Status Bar */}
      <GlobalStatusBar />

      {/* Emergency banner */}
      {emergencyActive && (
        <div className="mb-4 px-4 py-3 rounded-2xl flex items-center gap-3" style={{ background: 'rgba(255,74,94,0.07)', border: '1px solid rgba(255,74,94,0.3)', animation: 'sc-fade-up 0.3s ease both' }}>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#FF4A5E', animation: 'sc-pulse 0.8s infinite' }} />
          <div className="flex-1">
            <p className="font-mono text-[8px] font-black" style={{ color: '#FF4A5E' }}>EMERGENCY CONTROL ACTIVE</p>
            <p className="font-mono text-[7px]" style={{ color: 'rgba(255,74,94,0.6)' }}>{configs.filter(c => c.category === 'emergency' && c.value).length} emergency toggle{configs.filter(c => c.category === 'emergency' && c.value).length > 1 ? 's' : ''} enabled. Platform users may be affected.</p>
          </div>
          <span className="font-mono text-[7px] font-bold px-3 py-1.5 rounded-xl" style={{ color: '#FF4A5E', background: 'rgba(255,74,94,0.12)', border: '1px solid rgba(255,74,94,0.25)' }}>Review Controls ↓</span>
        </div>
      )}

      {/* Executive Control Panel */}
      <PlatformControls configs={configs} onConfirm={openConfirm} onAction={showToast} />

      {/* Live Monitor + AI Signals */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <div className="col-span-3"><LiveSystemMonitor /></div>
        <div className="col-span-2"><AISignalsPanel signals={signals as AISignal[]} /></div>
      </div>

      {/* AI Control Center */}
      <AIControlCenter onConfirm={openConfirm} onAction={showToast} />

      {/* Feature Flags */}
      <FeatureFlagsPanel flags={flags} onConfirm={openConfirm} onAction={showToast} />

      {/* Automation Rules + Announcements */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <AutomationRulesPanel rules={rules} onAction={showToast} />
        <AnnouncementsPanel onAction={showToast} />
      </div>

      {/* Security + Logs */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <SecurityCenter />
        <SystemLogsPanel logs={logs} />
      </div>

      {/* Deployment + Tasks + Backup */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <DeploymentCenter />
        <ScheduledTasksPanel onAction={showToast} />
        <BackupCenter onConfirm={openConfirm} onAction={showToast} />
      </div>

      {/* Platform Map + Audit */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <PlatformMap />
        <AuditHistory logs={logs} />
      </div>

      {/* Emergency Panel */}
      <EmergencyPanel onConfirm={openConfirm} onAction={showToast} />

      {/* Confirm Dialog */}
      {confirm && <ConfirmDialog action={confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
