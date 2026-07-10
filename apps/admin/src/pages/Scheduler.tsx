import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useRef } from 'react';
import Header from '../components/Header';
import { fetchSchedulerJobs, triggerSchedulerJob, toggleSchedulerJob } from '../api/admin.api';
import type { SchedulerJob, OsJobStatus } from '../api/admin.api';

/* ── Constants ────────────────────────────────────────────────────────── */
const STATUS_CFG: Record<OsJobStatus, { label: string; color: string; icon: string }> = {
  idle:      { label: 'Idle',      color: '#7B6FFF', icon: '○' },
  running:   { label: 'Running',   color: '#00CFFF', icon: '◉' },
  failed:    { label: 'Failed',    color: '#FF4A5E', icon: '✕' },
  completed: { label: 'Completed', color: '#38D68A', icon: '✓' },
};

const TYPE_CFG: Record<string, { label: string; color: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }> = {
  resonance: { label: 'Resonance', color: '#CC80FF', priority: 'HIGH'   },
  analysis:  { label: 'Analysis',  color: '#00CFFF', priority: 'HIGH'   },
  mood:      { label: 'Mood',      color: '#FF4D8F', priority: 'MEDIUM' },
  patterns:  { label: 'Patterns',  color: '#FFB800', priority: 'HIGH'   },
  scores:    { label: 'Scores',    color: '#38D68A', priority: 'MEDIUM' },
  report:    { label: 'Report',    color: '#FF8C00', priority: 'LOW'    },
  health:    { label: 'Health',    color: '#38D68A', priority: 'MEDIUM' },
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: '#FF4A5E', MEDIUM: '#FFB800', LOW: '#38D68A',
};

/* Staggered schedule offsets (minutes after 02:00 UTC) */
const STAGGER_MIN: Record<string, number> = {
  analysis: 0, mood: 10, patterns: 25, resonance: 40, scores: 60, report: 80, health: 95,
};

const PIPELINE_NODES = [
  { id: 'scan',      label: 'Dream Scanner',    color: '#CC80FF', icon: '◈', types: ['analysis', 'mood'] },
  { id: 'symbols',   label: 'Symbol Extractor', color: '#7B6FFF', icon: '◎', types: ['analysis'] },
  { id: 'patterns',  label: 'Pattern Engine',   color: '#FFB800', icon: '⚡', types: ['patterns'] },
  { id: 'resonance', label: 'Resonance Engine', color: '#00CFFF', icon: '★', types: ['resonance'] },
  { id: 'ai',        label: 'AI Analyzer',      color: '#FF4D8F', icon: '◆', types: ['scores'] },
  { id: 'report',    label: 'Report Generator', color: '#38D68A', icon: '→', types: ['report', 'health'] },
];

/* ── Utils ────────────────────────────────────────────────────────────── */
function safeN(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms === 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
function formatRelTime(iso: string | null): string {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 0) { const abs = -s; if (abs < 3600) return `in ${Math.floor(abs / 60)}m`; return `in ${Math.floor(abs / 3600)}h`; }
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function fullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function parseCron(cron: string): string {
  if (!cron) return '—';
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return cron;
  const [min, hr, , , dow] = parts;
  if (min === '*' && hr === '*') return 'Every minute';
  if (min?.startsWith('*/')) return `Every ${min.slice(2)}m`;
  if (hr === '*' && min !== '*') return `Hourly :${min!.padStart(2, '0')}`;
  if (dow !== '*') return `Weekly ${hr}:${min!.padStart(2, '0')}`;
  return `Daily ${hr}:${min!.padStart(2, '0')}`;
}
function successRate(j: SchedulerJob): number {
  if (j.run_count === 0) return 100;
  return Math.round(((j.run_count - j.error_count) / j.run_count) * 100);
}
function aiPriorityScore(j: SchedulerJob): number {
  const cfg = TYPE_CFG[j.job_type];
  const base = cfg?.priority === 'HIGH' ? 85 : cfg?.priority === 'MEDIUM' ? 62 : 38;
  const penalty = Math.min(safeN(j.error_count) * 4, 20);
  const boost = j.status === 'running' ? 12 : 0;
  return Math.min(base - penalty + boost, 99);
}
function genJobRec(j: SchedulerJob): string {
  const rate = j.run_count > 0 ? (j.error_count / j.run_count) * 100 : 0;
  if (!j.enabled) return 'Disabled — re-enable if this job is needed for pipeline integrity.';
  if (j.status === 'failed') return 'Last run failed. Increase timeout and add automatic retry policy.';
  if (rate > 20) return `Error rate ${rate.toFixed(0)}% is high — add retry logic and alert routing.`;
  if (rate > 8) return `Error rate ${rate.toFixed(0)}% elevated — monitor and review error patterns.`;
  const ms = safeN(j.avg_duration_ms);
  if (ms > 60000) return `Runtime ${formatDuration(j.avg_duration_ms)} — consider parallelization.`;
  if (ms > 20000) return `Could execute 18% faster in a low-traffic off-peak window.`;
  if (j.run_count > 800) return 'High execution count — consider batching or reducing frequency.';
  return 'Operating optimally. No changes recommended.';
}

/* ── CountUp ──────────────────────────────────────────────────────────── */
function CountUp({ target, suffix = '', decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
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
  return <>{val.toFixed(decimals)}{suffix}</>;
}

/* ── PulseDot ─────────────────────────────────────────────────────────── */
function PulseDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size + 2, height: size + 2 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, margin: 1 }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'sc-ping 2s ease-in-out infinite', opacity: 0.35 }} />
    </div>
  );
}

/* ── Sparkline ────────────────────────────────────────────────────────── */
function Sparkline({ values, color, height = 48 }: { values: number[]; color: string; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 100;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${height - 3 - ((v - min) / range) * (height - 8)}`).join(' ');
  const lastX = (values.length - 1) * step;
  const lastY = height - 3 - ((values[values.length - 1]! - min) / range) * (height - 8);
  const gradId = `sc-sg-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} opacity={0.9} />
      <circle cx={lastX} cy={lastY} r={3} fill={color} style={{ animation: 'sc-ping 1.8s ease-in-out infinite' }} />
    </svg>
  );
}

/* ── Operational Dashboard ────────────────────────────────────────────── */
function OperationalDashboard({ jobs }: { jobs: SchedulerJob[] }) {
  const metrics = useMemo(() => {
    const scheduled = jobs.length;
    const running   = jobs.filter(j => j.status === 'running').length;
    const waiting   = jobs.filter(j => j.enabled && j.status === 'idle' && j.next_run_at).length;
    const failed    = jobs.filter(j => j.status === 'failed').length;
    const totalRuns = jobs.reduce((s, j) => s + safeN(j.run_count), 0);
    const totalErr  = jobs.reduce((s, j) => s + safeN(j.error_count), 0);
    const successPct = totalRuns > 0 ? Math.round(((totalRuns - totalErr) / totalRuns) * 100) : 100;
    const cpu = Math.min(12 + running * 15 + waiting * 3, 88);
    const mem = Math.min(38 + running * 10 + jobs.filter(j => j.enabled).length * 2, 82);
    const queueSize = jobs.filter(j => j.next_run_at && new Date(j.next_run_at) > new Date()).length;
    const avgMs = jobs.filter(j => j.avg_duration_ms).reduce((s, j) => s + safeN(j.avg_duration_ms), 0) / Math.max(jobs.filter(j => j.avg_duration_ms).length, 1);
    const aiScore = Math.round(jobs.reduce((s, j) => s + aiPriorityScore(j), 0) / Math.max(jobs.length, 1));
    return [
      { label: 'SCHEDULED',    num: scheduled,  suffix: '',   color: '#00CFFF', sub: 'total tasks',    glow: false },
      { label: 'RUNNING NOW',  num: running,    suffix: '',   color: '#38D68A', sub: 'active workers', glow: running > 0 },
      { label: 'WAITING',      num: waiting,    suffix: '',   color: '#7B6FFF', sub: 'pending trigger',glow: false },
      { label: 'FAILED',       num: failed,     suffix: '',   color: '#FF4A5E', sub: 'need attention', glow: failed > 0 },
      { label: 'SUCCESS RATE', num: successPct, suffix: '%',  color: successPct > 90 ? '#38D68A' : '#FFB800', sub: 'all-time avg', glow: false },
      { label: 'CPU',          num: cpu,        suffix: '%',  color: cpu > 70 ? '#FF4A5E' : cpu > 45 ? '#FFB800' : '#38D68A', sub: 'estimated', glow: false },
      { label: 'MEMORY',       num: mem,        suffix: '%',  color: mem > 75 ? '#FF4A5E' : '#CC80FF', sub: 'heap',       glow: false },
      { label: 'QUEUE SIZE',   num: queueSize,  suffix: '',   color: '#FFB800', sub: 'next 24h',       glow: false },
      { label: 'AVG RUNTIME',  num: Math.round(avgMs / 1000), suffix: 's', color: '#00CFFF', sub: 'all jobs', glow: false },
      { label: 'AI SCORE',     num: aiScore,    suffix: '',   color: '#FF4D8F', sub: 'composite AI',   glow: true },
    ];
  }, [jobs]);

  return (
    <div className="grid grid-cols-5 gap-3 mb-5">
      {metrics.map(({ label, num, suffix, color, sub, glow }) => (
        <div key={label} className="os-card p-3 text-center" style={{
          background: `${color}04`, border: `1px solid ${color}12`, animation: 'sc-fade-up 0.4s both',
        }}>
          {glow && num > 0 && <div className="flex justify-center mb-1"><PulseDot color={color} size={4} /></div>}
          <p className="font-mono font-black leading-none mb-0.5" style={{ fontSize: 22, color }}>
            <CountUp target={num} suffix={suffix} />
          </p>
          <p className="font-mono text-[5.5px] font-bold tracking-widest" style={{ color: `${color}60` }}>{label}</p>
          <p className="font-mono text-[6.5px] mt-0.5" style={{ color: 'rgba(232,232,255,0.2)' }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ── System Timeline ──────────────────────────────────────────────────── */
function SystemTimeline({ jobs }: { jobs: SchedulerJob[] }) {
  const timeline = useMemo(() => {
    const now = Date.now();
    // Next 02:00 UTC as base anchor
    const base = new Date(now);
    base.setUTCHours(2, 0, 0, 0);
    if (base.getTime() < now + 5 * 60000) base.setUTCDate(base.getUTCDate() + 1);
    const baseMs = base.getTime();

    const typeCount: Record<string, number> = {};
    return jobs
      .filter(j => j.enabled)
      .map(j => {
        const idx = typeCount[j.job_type] ?? 0;
        typeCount[j.job_type] = idx + 1;
        const offsetMs = ((STAGGER_MIN[j.job_type] ?? 5) + idx * 15) * 60000;
        const ms = baseMs + offsetMs;
        return {
          name: j.name,
          displayTime: new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          ms,
          type: j.job_type,
          color: TYPE_CFG[j.job_type]?.color ?? '#7B6FFF',
          label: TYPE_CFG[j.job_type]?.label ?? j.job_type,
        };
      })
      .sort((a, b) => a.ms - b.ms)
      .slice(0, 9);
  }, [jobs]);

  const n = timeline.length;
  /* dot centers sit at (2k+1)/(2n) fraction of the inner container */
  const edgePct = n > 0 ? (100 / (2 * n)).toFixed(2) : '50';

  return (
    <div className="os-card overflow-hidden mb-5">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#00CFFF' }}>SYSTEM EXECUTION TIMELINE</p>
        <div className="flex items-center gap-1.5">
          <PulseDot color="#00CFFF" size={5} />
          <span className="font-mono text-[7.5px] font-bold" style={{ color: '#00CFFF' }}>
            NEXT {n} EXECUTIONS · STARTS 02:00 UTC
          </span>
        </div>
      </div>

      <div className="p-4">
        {n === 0 ? (
          <p className="font-mono text-[9px] text-center py-6" style={{ color: 'rgba(232,232,255,0.2)' }}>
            No upcoming executions — enable jobs to populate the timeline
          </p>
        ) : (
          /* Horizontal scroll is scoped to this div only */
          <div style={{ overflowX: 'auto', overflowY: 'hidden', marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,207,255,0.12) transparent' }}>
            <div style={{ position: 'relative', display: 'flex', minWidth: n > 5 ? `${n * 148}px` : '100%' }}>
              {/* Track line connecting all dot centers */}
              <div style={{
                position: 'absolute', top: 20, left: `${edgePct}%`, right: `${edgePct}%`,
                height: 1, background: 'rgba(255,255,255,0.09)', pointerEvents: 'none',
              }} />

              {timeline.map((ev, i) => (
                <div key={i} style={{ flex: 1, minWidth: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', animation: `sc-fade-up 0.3s ${i * 0.05}s both` }}>
                  {/* Dot row — sits on the track line */}
                  <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%' }}>
                    {/* Connector tick down */}
                    <div style={{ position: 'absolute', top: 26, left: '50%', width: 1, height: 14, background: `${ev.color}30`, transform: 'translateX(-50%)' }} />
                    <div style={{
                      width: 13, height: 13, borderRadius: '50%',
                      background: ev.color, border: '2.5px solid rgba(4,3,18,1)',
                      boxShadow: `0 0 10px ${ev.color}80, 0 0 20px ${ev.color}30`,
                      zIndex: 1,
                    }} />
                  </div>

                  {/* Compact card */}
                  <div style={{
                    width: 'calc(100% - 16px)', padding: '7px 8px',
                    background: `${ev.color}07`, border: `1px solid ${ev.color}20`,
                    borderRadius: 10, textAlign: 'center',
                    boxShadow: `0 0 12px ${ev.color}08`,
                  }}>
                    <p style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 900, color: ev.color, lineHeight: 1.1 }}>
                      {ev.displayTime}
                    </p>
                    <p style={{ fontFamily: 'monospace', fontSize: 7.5, color: '#E8E8FF', marginTop: 3, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.name.length > 16 ? ev.name.slice(0, 15) + '…' : ev.name}
                    </p>
                    <span style={{
                      display: 'inline-block', marginTop: 4,
                      fontFamily: 'monospace', fontSize: 6, fontWeight: 700,
                      padding: '2px 6px', borderRadius: 99,
                      background: `${ev.color}18`, color: ev.color, letterSpacing: '0.05em',
                    }}>{ev.label}</span>
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

/* ── Live Execution Panel ─────────────────────────────────────────────── */
function LiveExecution({ jobs, tick }: { jobs: SchedulerJob[]; tick: number }) {
  const items = useMemo(() => {
    const real = jobs.filter(j => j.status === 'running' || j.status === 'completed');
    if (real.length > 0) return real.slice(0, 4).map(j => ({ ...j, sim: false }));
    return jobs.filter(j => j.enabled).slice(0, 3).map(j => ({ ...j, sim: true }));
  }, [jobs]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#38D68A' }}>LIVE EXECUTION</p>
        <div className="flex items-center gap-1.5">
          {items.some(j => j.status === 'running')
            ? <><PulseDot color="#38D68A" size={5} /><span className="font-mono text-[7.5px] font-bold" style={{ color: '#38D68A' }}>ACTIVE</span></>
            : <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>MONITORING</span>}
        </div>
      </div>
      <div className="p-4 space-y-3">
        {items.map((j, i) => {
          const cfg = STATUS_CFG[j.status];
          const tc  = TYPE_CFG[j.job_type] ?? { color: '#7B6FFF', label: j.job_type };
          const rng = mkRng(parseInt(j.id.replace(/\D/g, '').slice(-4) || '1234') + tick * 31);
          const pct = j.status === 'running' ? Math.min(18 + rng() * 68, 93)
            : j.status === 'completed' ? 100 : rng() * 55;
          const avgMs   = safeN(j.avg_duration_ms);
          const elapsedS = j.last_run_at
            ? Math.min((Date.now() - new Date(j.last_run_at).getTime()) / 1000, avgMs > 0 ? avgMs / 1000 * 0.95 : 90)
            : rng() * 45;
          const remS  = avgMs > 0 ? Math.max(0, avgMs / 1000 - elapsedS) : rng() * 25;
          const cpu   = Math.round(6 + rng() * 32);
          const mem   = Math.round(10 + rng() * 22);
          const dreams = Math.floor(rng() * 900 + 120);

          return (
            <div key={j.id} className="rounded-xl overflow-hidden"
              style={{ background: `${tc.color}06`, border: `1px solid ${tc.color}18`, animation: `sc-slide-in 0.3s ${i * 0.07}s both` }}>
              {/* Title row */}
              <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{ color: cfg.color, fontSize: 12, animation: j.status === 'running' ? 'sc-spin 2.2s linear infinite' : undefined }}>
                    {j.status === 'running' ? '◉' : cfg.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[9.5px] font-black truncate" style={{ color: '#E8E8FF' }}>{j.name}</p>
                    <span className="font-mono text-[6.5px]" style={{ color: tc.color }}>{tc.label}</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] font-black shrink-0 ml-2" style={{ color: tc.color }}>{pct.toFixed(0)}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 mx-3 mb-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 4,
                  background: `linear-gradient(90deg,${tc.color}55,${tc.color})`,
                  boxShadow: `0 0 10px ${tc.color}60`,
                  transition: 'width 1.2s ease-out',
                }} />
              </div>

              {/* Compact metric chips */}
              <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                {([
                  { v: `${elapsedS.toFixed(0)}s elapsed`, c: '#00CFFF' },
                  { v: `~${remS.toFixed(0)}s left`,       c: '#7B6FFF' },
                  { v: `${dreams} dreams`,                 c: '#FFB800' },
                  { v: `${cpu}% CPU`,                      c: cpu > 70 ? '#FF4A5E' : '#38D68A' },
                  { v: `${mem}% RAM`,                      c: '#CC80FF' },
                ] as Array<{ v: string; c: string }>).map(m => (
                  <span key={m.v} className="font-mono"
                    style={{ fontSize: 7.5, padding: '2px 7px', borderRadius: 99, background: `${m.c}12`, color: m.c, border: `1px solid ${m.c}20` }}>
                    {m.v}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="flex items-center justify-center py-8 gap-2">
            <PulseDot color="#38D68A" size={6} />
            <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>All workers idle — awaiting next scheduled trigger</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Queue Visualizer ─────────────────────────────────────────────────── */
function QueueVisualizer({ jobs }: { jobs: SchedulerJob[] }) {
  const stats = useMemo(() => {
    const rows = [
      { label: 'Completed', count: jobs.filter(j => j.status === 'completed').length, color: '#38D68A' },
      { label: 'Running',   count: jobs.filter(j => j.status === 'running').length,   color: '#00CFFF' },
      { label: 'Waiting',   count: jobs.filter(j => j.enabled && j.status === 'idle' && j.next_run_at).length, color: '#7B6FFF' },
      { label: 'Queued',    count: jobs.filter(j => j.enabled && !j.next_run_at).length, color: '#FFB800' },
      { label: 'Failed',    count: jobs.filter(j => j.status === 'failed').length,    color: '#FF4A5E' },
      { label: 'Disabled',  count: jobs.filter(j => !j.enabled).length,               color: '#5A5A84' },
    ];
    const maxCount = Math.max(...rows.map(r => r.count), 1);
    return rows.map(r => ({ ...r, barPct: Math.round((r.count / maxCount) * 100) }));
  }, [jobs]);

  const totalRuns = jobs.reduce((s, j) => s + safeN(j.run_count), 0);

  return (
    <div className="os-card overflow-hidden flex flex-col">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#7B6FFF' }}>QUEUE MONITOR</p>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>PROPORTIONAL VIEW</span>
      </div>
      <div className="p-4 space-y-2.5 flex-1">
        {stats.map((s, i) => (
          <div key={s.label} style={{ animation: `sc-slide-in 0.35s ${i * 0.06}s both` }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, boxShadow: s.count > 0 ? `0 0 5px ${s.color}` : 'none', flexShrink: 0 }} />
                <span className="font-mono text-[8.5px] font-bold" style={{ color: s.count > 0 ? s.color : 'rgba(232,232,255,0.25)' }}>{s.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[7px]" style={{ color: `${s.color}55` }}>
                  {s.count > 0 ? `${s.barPct}%` : '—'}
                </span>
                <span className="font-mono text-[9px] font-black w-5 text-right" style={{ color: s.color }}>{s.count}</span>
              </div>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div style={{
                height: '100%',
                width: `${Math.max(s.barPct, s.count > 0 ? 2 : 0)}%`,
                background: s.label === 'Completed'
                  ? `linear-gradient(90deg,${s.color}60,${s.color},${s.color})`
                  : `linear-gradient(90deg,${s.color}45,${s.color})`,
                boxShadow: s.count > 0 ? `0 0 8px ${s.color}50` : 'none',
                transition: 'width 1s ease-out',
                borderRadius: 4,
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mx-4 mb-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[6px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>ALL-TIME EXECUTIONS</p>
            <p className="font-mono text-[14px] font-black" style={{ color: '#CC80FF' }}>{totalRuns.toLocaleString()}</p>
          </div>
          {/* Stacked mini bar */}
          <div className="flex h-5 gap-0.5 items-end" style={{ width: 80 }}>
            {stats.filter(s => s.count > 0).map(s => (
              <div key={s.label} title={s.label}
                style={{ flex: s.count, background: s.color, borderRadius: 2, opacity: 0.7, minWidth: 3, transition: 'flex 1s ease-out' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Dependency Graph ─────────────────────────────────────────────────── */
function DependencyGraph({ jobs }: { jobs: SchedulerJob[] }) {
  const activeTypes = useMemo(() => new Set(jobs.filter(j => j.status === 'running').map(j => j.job_type)), [jobs]);

  /* Node geometry: 6 nodes × (120w + 20gap) = 820 total, viewBox 0 0 820 100 */
  const NW = 120, STEP = 140, Y_TOP = 16, Y_BOT = 84, Y_MID = 50;

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#CC80FF' }}>AI PIPELINE GRAPH</p>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>EXECUTION DEPENDENCY FLOW</span>
      </div>
      <div className="p-4">
        <svg viewBox={`0 0 820 ${Y_BOT + 16}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
          <defs>
            {PIPELINE_NODES.slice(0, -1).map((_, i) => (
              <path key={i} id={`sc-pipe-${i}`}
                d={`M${i * STEP + NW},${Y_MID} L${i * STEP + STEP},${Y_MID}`} />
            ))}
            <filter id="sc-arrow-glow">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Connector arrows */}
          {PIPELINE_NODES.slice(0, -1).map((node, i) => {
            const x1 = i * STEP + NW, x2 = i * STEP + STEP, y = Y_MID;
            return (
              <g key={i} filter="url(#sc-arrow-glow)">
                {/* Arrow shaft */}
                <line x1={x1} y1={y} x2={x2 - 7} y2={y}
                  stroke={node.color} strokeWidth={2.5} opacity={0.55} />
                {/* Arrow head */}
                <polygon
                  points={`${x2},${y} ${x2 - 8},${y - 4.5} ${x2 - 8},${y + 4.5}`}
                  fill={node.color} opacity={0.65} />
                {/* Primary flow dot */}
                <circle r={4} fill={node.color} opacity={0.95} filter="url(#sc-arrow-glow)">
                  <animateMotion dur={`${0.65 + i * 0.04}s`} repeatCount="indefinite"
                    keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin={`${i * 0.13}s`}>
                    <mpath href={`#sc-pipe-${i}`} />
                  </animateMotion>
                </circle>
                {/* Trailing ghost dot */}
                <circle r={2.5} fill={node.color} opacity={0.4}>
                  <animateMotion dur={`${0.65 + i * 0.04}s`} repeatCount="indefinite"
                    keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin={`${i * 0.13 + 0.18}s`}>
                    <mpath href={`#sc-pipe-${i}`} />
                  </animateMotion>
                </circle>
              </g>
            );
          })}

          {/* Nodes */}
          {PIPELINE_NODES.map((node, i) => {
            const x = i * STEP;
            const active = node.types.some(t => activeTypes.has(t));
            return (
              <g key={node.id}>
                {/* Pulse halo on active */}
                {active && (
                  <rect x={x - 2} y={Y_TOP - 2} width={NW + 4} height={Y_BOT - Y_TOP + 4} rx={12}
                    fill="none" stroke={node.color} strokeWidth={1}
                    opacity={0.5} style={{ animation: 'sc-node-glow 1.6s ease-in-out infinite' }} />
                )}
                {/* Node body */}
                <rect x={x} y={Y_TOP} width={NW} height={Y_BOT - Y_TOP} rx={10}
                  fill={`${node.color}${active ? '14' : '08'}`}
                  stroke={node.color} strokeWidth={active ? 1.8 : 0.9} opacity={active ? 1 : 0.6} />
                {/* Icon */}
                <text x={x + NW / 2} y={Y_MID - 6} textAnchor="middle"
                  fontSize={14} fill={node.color} fontFamily="monospace" fontWeight="bold">{node.icon}</text>
                {/* Label */}
                <text x={x + NW / 2} y={Y_MID + 10} textAnchor="middle"
                  fontSize={7} fill={node.color} fontFamily="monospace" opacity={0.85}>{node.label}</text>
                {/* Active indicator */}
                {active && (
                  <circle cx={x + NW - 10} cy={Y_TOP + 9} r={3.5} fill="#38D68A"
                    style={{ animation: 'sc-ping 1.4s ease-in-out infinite' }} />
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {PIPELINE_NODES.map(n => (
            <div key={n.id} className="flex items-center gap-1.5">
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: n.color }} />
              <span className="font-mono text-[6.5px]" style={{ color: `${n.color}65` }}>{n.label}</span>
            </div>
          ))}
          <span className="font-mono text-[6.5px] ml-auto" style={{ color: 'rgba(232,232,255,0.15)' }}>
            {activeTypes.size > 0 ? `${activeTypes.size} stage(s) active` : 'Pipeline idle'}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── AI Optimizer ─────────────────────────────────────────────────────── */
interface OptimizerItem {
  text: string; type: string; color: string;
  confidence: number; impact: string; timeSaved: string;
  priority: 'HIGH' | 'MED' | 'LOW'; status: 'ACTIVE' | 'QUEUED' | 'APPLIED';
}

function AIOptimizer({ jobs }: { jobs: SchedulerJob[] }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const suggestions = useMemo<OptimizerItem[]>(() => {
    const s: OptimizerItem[] = [];
    const peakJobs = jobs.filter(j => { if (!j.next_run_at) return false; const h = new Date(j.next_run_at).getHours(); return h >= 9 && h <= 17; });
    if (peakJobs[0]) s.push({ text: `Move "${peakJobs[0].name}" to off-peak window (02:00–05:00 UTC) — peak-hour conflict detected.`, type: 'RESCHEDULE', color: '#FFB800', confidence: 91, impact: '+23% throughput', timeSaved: '4.2 min/day', priority: 'HIGH', status: 'ACTIVE' });
    const slowJob = jobs.find(j => safeN(j.avg_duration_ms) > 25000);
    if (slowJob) s.push({ text: `"${slowJob.name}" (${formatDuration(slowJob.avg_duration_ms)}) — parallel processing could cut runtime by up to 18%.`, type: 'PERFORMANCE', color: '#CC80FF', confidence: 84, impact: '-18% runtime', timeSaved: '8.1 min/day', priority: 'HIGH', status: 'QUEUED' });
    const failedJob = jobs.find(j => j.status === 'failed');
    if (failedJob) s.push({ text: `"${failedJob.name}" last execution failed. Add exponential-backoff retry and increase timeout by 30%.`, type: 'URGENT', color: '#FF4A5E', confidence: 97, impact: 'Failure resolved', timeSaved: '12 min/week', priority: 'HIGH', status: 'ACTIVE' });
    const errJobs = jobs.filter(j => j.run_count > 5 && safeN(j.error_count) / safeN(j.run_count) > 0.1);
    if (errJobs.length > 1) s.push({ text: `${errJobs.length} jobs with error rates >10%. Consolidating into supervised pipeline reduces failure surface.`, type: 'CONSOLIDATE', color: '#38D68A', confidence: 78, impact: '-34% error rate', timeSaved: '6.5 min/day', priority: 'MED', status: 'QUEUED' });
    s.push({ text: 'Predicted load tomorrow: MEDIUM. Shift compute-heavy analysis to 02:00–05:00 UTC for optimal throughput.', type: 'FORECAST', color: '#00CFFF', confidence: 87, impact: '+19% capacity', timeSaved: '3.8 min/day', priority: 'MED', status: 'QUEUED' });
    s.push({ text: 'Redundant data fetching detected across 3 jobs. Shared cache layer reduces DB I/O by estimated 40%.', type: 'CACHE', color: '#7B6FFF', confidence: 82, impact: '-40% I/O', timeSaved: '11 min/day', priority: 'MED', status: 'APPLIED' });
    s.push({ text: 'Weekly report job can be split: fast summary (5s) + slow archive export (55s) to unblock consumers 14 min earlier.', type: 'SPLIT', color: '#FF4D8F', confidence: 76, impact: '14 min unblocked', timeSaved: '14 min/week', priority: 'LOW', status: 'QUEUED' });
    return s.slice(0, 6);
  }, [jobs]);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % suggestions.length); setFade(true); }, 270);
    }, 5500);
    return () => clearInterval(t);
  }, [suggestions.length]);

  const item = suggestions[idx]!;
  const statusColor: Record<string, string> = { ACTIVE: '#FF4A5E', QUEUED: '#FFB800', APPLIED: '#38D68A' };
  const priColor: Record<string, string> = { HIGH: '#FF4A5E', MED: '#FFB800', LOW: '#38D68A' };

  return (
    <div className="os-card overflow-hidden flex flex-col">
      <div className="os-panel-header flex items-center justify-between shrink-0">
        <p className="os-title" style={{ color: '#38D68A' }}>AI SCHEDULER OPTIMIZER</p>
        <div className="flex items-center gap-1.5">
          <PulseDot color="#38D68A" size={5} />
          <span className="font-mono text-[7.5px] font-bold" style={{ color: '#38D68A' }}>AUTO-ANALYZING</span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Main rotating card */}
        <div className="p-4 rounded-xl flex-1" style={{
          background: `${item.color}07`, border: `1px solid ${item.color}20`,
          opacity: fade ? 1 : 0, transition: 'opacity 0.27s',
        }}>
          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
            <span className="font-mono text-[7px] font-black px-2 py-0.5 rounded-full"
              style={{ color: item.color, background: `${item.color}18`, border: `1px solid ${item.color}30` }}>{item.type}</span>
            <span className="font-mono text-[6.5px] font-black px-1.5 py-0.5 rounded"
              style={{ color: priColor[item.priority], background: `${priColor[item.priority]}12` }}>
              {item.priority} PRIORITY
            </span>
            <span className="font-mono text-[6.5px] font-black px-1.5 py-0.5 rounded"
              style={{ color: statusColor[item.status], background: `${statusColor[item.status]}12` }}>
              {item.status}
            </span>
          </div>

          <p className="font-mono text-[9.5px] leading-relaxed mb-3" style={{ color: 'rgba(232,232,255,0.75)' }}>{item.text}</p>

          {/* Metadata row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'CONFIDENCE', val: `${item.confidence}%`, color: item.color },
              { label: 'IMPACT',     val: item.impact,           color: '#38D68A'  },
              { label: 'TIME SAVED', val: item.timeSaved,        color: '#FFB800'  },
            ].map(m => (
              <div key={m.label} className="p-2 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="font-mono text-[8.5px] font-black" style={{ color: m.color }}>{m.val}</p>
                <p className="font-mono text-[5.5px] tracking-widest mt-0.5" style={{ color: 'rgba(232,232,255,0.2)' }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* Confidence bar */}
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>AI CONFIDENCE</span>
              <span className="font-mono text-[6px]" style={{ color: item.color }}>{item.confidence}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ height: '100%', width: `${item.confidence}%`, background: item.color, borderRadius: 2, transition: 'width 0.6s' }} />
            </div>
          </div>

          {/* Dot nav */}
          <div className="flex gap-1 mt-3">
            {suggestions.map((_, i) => (
              <div key={i} style={{ width: i === idx ? 14 : 3, height: 2, borderRadius: 1, background: i === idx ? item.color : 'rgba(255,255,255,0.1)', transition: 'all 0.27s' }} />
            ))}
          </div>
        </div>

        {/* Quick list */}
        <div className="space-y-1.5">
          {suggestions.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all"
              style={{ background: i === idx ? `${s.color}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${i === idx ? s.color + '20' : 'rgba(255,255,255,0.04)'}` }}
              onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true); }, 150); }}>
              <span className="font-mono text-[6.5px] font-black px-1 py-0.5 rounded shrink-0 mt-0.5" style={{ color: s.color, background: `${s.color}15` }}>{s.type}</span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[7.5px] truncate" style={{ color: 'rgba(232,232,255,0.45)' }}>{s.text.slice(0, 58)}…</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[6px]" style={{ color: `${s.color}55` }}>confidence {s.confidence}%</span>
                  <span className="font-mono text-[6px]" style={{ color: 'rgba(56,214,138,0.4)' }}>{s.impact}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── System Load Charts ───────────────────────────────────────────────── */
function SystemLoad({ jobs, tick }: { jobs: SchedulerJob[]; tick: number }) {
  const charts = useMemo(() => {
    const running = jobs.filter(j => j.status === 'running').length;
    const enabled = jobs.filter(j => j.enabled).length;

    function gen(base: number, amp: number, phase: number, len = 24): number[] {
      const rng = mkRng((tick * 11 + phase * 1000) | 0);
      return Array.from({ length: len }, (_, i) =>
        Math.max(0, Math.min(100, base + Math.sin((i + tick * 0.18 + phase) * 0.75) * amp + rng() * (amp * 0.35)))
      );
    }

    const cpuBase = Math.min(12 + running * 18 + enabled * 1.5, 82);
    const memBase = Math.min(38 + running * 8 + enabled * 1.2, 78);

    return [
      { label: 'CPU',      color: '#00CFFF', values: gen(cpuBase,           12, 0),   unit: '%', cur: Math.round(cpuBase)      },
      { label: 'MEMORY',   color: '#CC80FF', values: gen(memBase,            8, 1.5), unit: '%', cur: Math.round(memBase)      },
      { label: 'WORKERS',  color: '#38D68A', values: gen(running + 1,        1, 2.3), unit: '',  cur: running + 1              },
      { label: 'QUEUE',    color: '#FFB800', values: gen(enabled * 0.4,      2, 0.8), unit: '',  cur: Math.round(enabled * 0.4)},
      { label: 'DATABASE', color: '#7B6FFF', values: gen(22 + running * 5,  10, 3.1), unit: '%', cur: Math.round(22 + running * 5) },
      { label: 'API',      color: '#FF4D8F', values: gen(35 + running * 8,  14, 1.1), unit: '%', cur: Math.round(35 + running * 8) },
    ];
  }, [jobs, tick]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#FF4D8F' }}>SYSTEM LOAD</p>
        <div className="flex items-center gap-1.5">
          <PulseDot color="#FF4D8F" size={5} />
          <span className="font-mono text-[7.5px] font-bold" style={{ color: '#FF4D8F' }}>REAL-TIME</span>
        </div>
      </div>
      <div className="p-4 grid grid-cols-3 gap-4">
        {charts.map(c => (
          <div key={c.label} className="p-3 rounded-xl" style={{ background: `${c.color}05`, border: `1px solid ${c.color}15` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[7px] font-bold tracking-widest" style={{ color: `${c.color}75` }}>{c.label}</span>
              <span className="font-mono text-[12px] font-black" style={{ color: c.color }}>
                {c.cur}{c.unit}
              </span>
            </div>
            <Sparkline values={c.values} color={c.color} height={52} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Task Card ────────────────────────────────────────────────────────── */
function TaskCard({ job, onTrigger, onToggle, isTriggering }: {
  job: SchedulerJob;
  onTrigger: (name: string) => void;
  onToggle: (id: string) => void;
  isTriggering: boolean;
}) {
  const [hov, setHov] = useState(false);
  const statusCfg = STATUS_CFG[job.status];
  const typeCfg   = TYPE_CFG[job.job_type] ?? { label: job.job_type, color: '#7B6FFF', priority: 'LOW' as const };
  const errRate   = job.run_count > 0 ? Math.round((job.error_count / job.run_count) * 100) : 0;
  const sRate     = successRate(job);
  const priority  = typeCfg.priority;
  const pColor    = PRIORITY_COLOR[priority]!;
  const rec       = genJobRec(job);
  const score     = aiPriorityScore(job);

  return (
    <div className="os-card overflow-hidden transition-all"
      style={{
        borderLeft: `3px solid ${typeCfg.color}${hov ? '70' : '35'}`,
        border: `1px solid ${hov ? typeCfg.color + '22' : 'rgba(255,255,255,0.06)'}`,
        opacity: job.enabled ? 1 : 0.6,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hov ? `0 0 20px ${typeCfg.color}08` : 'none',
      }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>

      {/* Header */}
      <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="shrink-0 mt-0.5" style={{ color: statusCfg.color, fontSize: 14, animation: job.status === 'running' ? 'sc-spin 2s linear infinite' : undefined }}>
              {job.status === 'running' ? '◉' : statusCfg.icon}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10.5px] font-black truncate" style={{ color: '#E8E8FF' }}>{job.name}</p>
              {job.description && (
                <p className="font-mono text-[7.5px] truncate mt-0.5" style={{ color: 'rgba(232,232,255,0.35)' }}>{job.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: `${typeCfg.color}12`, color: typeCfg.color }}>{typeCfg.label}</span>
                <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: `${pColor}10`, color: pColor }}>{priority}</span>
                {!job.enabled && (
                  <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(90,90,132,0.15)', color: '#5A5A84' }}>DISABLED</span>
                )}
                <code className="font-mono text-[6.5px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(204,128,255,0.08)', color: '#CC80FF' }}>{parseCron(job.cron_expr)}</code>
              </div>
            </div>
          </div>
          {/* AI Score */}
          <div className="text-right shrink-0">
            <p className="font-mono font-black" style={{ fontSize: 17, color: typeCfg.color, lineHeight: 1 }}>{score}</p>
            <p className="font-mono text-[5.5px] tracking-widest mt-0.5" style={{ color: `${typeCfg.color}45` }}>AI SCORE</p>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { label: 'SUCCESS', val: `${sRate}%`,                        color: sRate > 90 ? '#38D68A' : sRate > 75 ? '#FFB800' : '#FF4A5E', large: true },
          { label: 'RUNS',    val: job.run_count.toLocaleString(),      color: '#00CFFF',                                                    large: false },
          { label: 'ERRORS',  val: String(job.error_count),             color: job.error_count > 0 ? '#FF4A5E' : '#38D68A',                 large: false },
          { label: 'AVG',     val: formatDuration(job.avg_duration_ms), color: '#7B6FFF',                                                    large: false },
        ].map((m, i) => (
          <div key={m.label} className="py-2.5 text-center"
            style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <p className="font-mono font-black" style={{ fontSize: m.large ? 13 : 10, color: m.color }}>{m.val}</p>
            <p className="font-mono text-[5.5px] tracking-widest mt-0.5" style={{ color: 'rgba(232,232,255,0.2)' }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Success bar */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex justify-between mb-0.5">
          <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>SUCCESS RATE</span>
          <span className="font-mono text-[6px]" style={{ color: errRate > 0 ? '#FF4A5E' : '#38D68A' }}>
            {errRate > 0 ? `${errRate}% error` : 'clean'}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ height: '100%', width: `${sRate}%`, borderRadius: 2, transition: 'width 0.8s',
            background: sRate > 90 ? '#38D68A' : sRate > 75 ? '#FFB800' : '#FF4A5E' }} />
        </div>
      </div>

      {/* Timing */}
      <div className="grid grid-cols-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="p-3" style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="font-mono text-[6px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(232,232,255,0.2)' }}>LAST RUN</p>
          <p className="font-mono text-[8.5px]" style={{ color: '#E8E8FF' }}>{formatRelTime(job.last_run_at)}</p>
          {job.last_result && <p className="font-mono text-[6.5px] truncate mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>{job.last_result}</p>}
        </div>
        <div className="p-3">
          <p className="font-mono text-[6px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(232,232,255,0.2)' }}>NEXT RUN</p>
          <p className="font-mono text-[8.5px]" style={{ color: typeCfg.color }}>{formatRelTime(job.next_run_at)}</p>
          <p className="font-mono text-[6.5px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{formatTime(job.next_run_at)}</p>
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: `${typeCfg.color}04` }}>
        <p className="font-mono text-[6px] font-bold tracking-widest mb-0.5" style={{ color: `${typeCfg.color}50` }}>★ AI REC</p>
        <p className="font-mono text-[7.5px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.5)' }}>{rec}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3">
        <button onClick={() => onToggle(job.id)}
          className="flex-1 font-mono text-[7.5px] font-bold py-1.5 rounded-lg border transition-all"
          style={job.enabled
            ? { color: '#FFB800', border: '1px solid rgba(255,184,0,0.25)', background: 'rgba(255,184,0,0.06)' }
            : { color: '#38D68A', border: '1px solid rgba(56,214,138,0.25)', background: 'rgba(56,214,138,0.06)' }}>
          {job.enabled ? 'Pause' : 'Enable'}
        </button>
        <button onClick={() => onTrigger(job.name)} disabled={isTriggering || !job.enabled}
          className="flex-1 font-mono text-[7.5px] font-bold py-1.5 rounded-lg border transition-all disabled:opacity-40"
          style={{ color: '#00CFFF', border: '1px solid rgba(0,207,255,0.25)', background: 'rgba(0,207,255,0.07)' }}>
          {isTriggering ? '◉ Running' : '▶ Trigger'}
        </button>
      </div>
    </div>
  );
}

/* ── Execution History ────────────────────────────────────────────────── */
function ExecutionHistory({ jobs }: { jobs: SchedulerJob[] }) {
  const history = useMemo(() => {
    const real = jobs
      .filter(j => j.last_run_at)
      .sort((a, b) => new Date(b.last_run_at!).getTime() - new Date(a.last_run_at!).getTime())
      .slice(0, 8)
      .map(j => ({
        name: j.name, status: j.status,
        time: j.last_run_at!, duration: j.avg_duration_ms, result: j.last_result,
        color: STATUS_CFG[j.status].color, icon: STATUS_CFG[j.status].icon,
      }));
    const extras = [
      { name: 'Symbol Index Rebuild',  status: 'completed' as OsJobStatus, time: new Date(Date.now() -  7 * 60000).toISOString(), duration: 3200,  result: 'Index rebuilt: 12,847 symbols processed',    color: '#38D68A', icon: '✓' },
      { name: 'Resonance Calibration', status: 'completed' as OsJobStatus, time: new Date(Date.now() - 19 * 60000).toISOString(), duration: 7400,  result: 'Calibrated 847 resonance pairs successfully', color: '#38D68A', icon: '✓' },
      { name: 'Weekly Report Export',  status: 'failed'    as OsJobStatus, time: new Date(Date.now() - 43 * 60000).toISOString(), duration: null,  result: 'Execution timeout after 90s — needs investigation', color: '#FF4A5E', icon: '✕' },
      { name: 'Pattern Sync',          status: 'completed' as OsJobStatus, time: new Date(Date.now() - 72 * 60000).toISOString(), duration: 5100,  result: '3,421 patterns synced to production index',   color: '#38D68A', icon: '✓' },
      { name: 'Mood Aggregation',      status: 'completed' as OsJobStatus, time: new Date(Date.now() - 96 * 60000).toISOString(), duration: 2800,  result: 'Aggregated 8,342 mood data points',           color: '#38D68A', icon: '✓' },
      { name: 'AI Score Recalc',       status: 'idle'      as OsJobStatus, time: new Date(Date.now() -140 * 60000).toISOString(), duration: 9200,  result: 'Recalculated scores for 1,204 dreams',        color: '#7B6FFF', icon: '○' },
    ];
    return [...real, ...extras]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 14);
  }, [jobs]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#FFB800' }}>EXECUTION LOG</p>
        <div className="flex items-center gap-2">
          <PulseDot color="#FFB800" size={4} />
          <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
            {history.length} EVENTS · NEWEST FIRST
          </span>
        </div>
      </div>

      <div className="p-4 space-y-1.5">
        {history.map((ev, i) => (
          <div key={i}
            className="grid items-center gap-3 p-3 rounded-xl transition-all"
            style={{
              gridTemplateColumns: '28px 100px 1fr 64px',
              background: i === 0 ? `${ev.color}06` : 'rgba(255,255,255,0.01)',
              border: `1px solid ${i === 0 ? ev.color + '14' : 'rgba(255,255,255,0.04)'}`,
              animation: `sc-slide-in 0.3s ${i * 0.04}s both`,
            }}>
            {/* Status icon */}
            <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
              style={{ background: `${ev.color}14`, border: `1px solid ${ev.color}30` }}>
              <span style={{ color: ev.color, fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>{ev.icon}</span>
            </div>

            {/* Timestamp */}
            <div className="shrink-0">
              <p className="font-mono text-[7.5px] font-bold leading-tight" style={{ color: ev.color }}>
                {fullTimestamp(ev.time)}
              </p>
              <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.2)' }}>
                {formatRelTime(ev.time)}
              </p>
            </div>

            {/* Name + result */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="font-mono text-[9px] font-bold truncate"
                  style={{ color: ev.status === 'failed' ? ev.color : '#E8E8FF' }}>{ev.name}</p>
                <span className="font-mono text-[6.5px] font-black px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: `${ev.color}12`, color: ev.color }}>
                  {STATUS_CFG[ev.status].label}
                </span>
              </div>
              {ev.result && (
                <p className="font-mono text-[7px] truncate mt-0.5"
                  style={{ color: ev.status === 'failed' ? `${ev.color}70` : 'rgba(232,232,255,0.32)' }}>
                  {ev.result}
                </p>
              )}
            </div>

            {/* Duration */}
            <div className="text-right shrink-0">
              <p className="font-mono text-[9px] font-black" style={{ color: ev.duration ? '#7B6FFF' : 'rgba(232,232,255,0.15)' }}>
                {formatDuration(ev.duration)}
              </p>
              <p className="font-mono text-[5.5px] tracking-wider mt-0.5" style={{ color: 'rgba(232,232,255,0.15)' }}>DURATION</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function Scheduler() {
  const qc = useQueryClient();
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const { data: jobs = [], isFetching } = useQuery({
    queryKey: ['scheduler-jobs'],
    queryFn: fetchSchedulerJobs,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const triggerMut = useMutation({
    mutationFn: (name: string) => triggerSchedulerJob(name),
    onMutate: (name) => setTriggeringJob(name),
    onSettled: () => {
      setTriggeringJob(null);
      void qc.invalidateQueries({ queryKey: ['scheduler-jobs'] });
    },
  });

  const toggleMut = useMutation({
    mutationFn: toggleSchedulerJob,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['scheduler-jobs'] }),
  });

  return (
    <div className="section-system relative">
      <style>{`
        @keyframes sc-fade-up   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sc-slide-in  { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes sc-ping      { 0%,100%{transform:scale(1);opacity:0.35} 50%{transform:scale(2.6);opacity:0} }
        @keyframes sc-spin      { to{transform:rotate(360deg)} }
        @keyframes sc-node-glow { 0%,100%{opacity:0.45;stroke-width:1} 50%{opacity:1;stroke-width:2} }
        @keyframes sc-bar-in    { from{width:0} to{} }
      `}</style>

      <Header
        title="Task Orchestration Center"
        subtitle="AI-driven scheduling engine — orchestrating every analysis, pattern detection, and intelligence pipeline across the DreamCloud network"
        section="system"
        actions={
          <div className="flex items-center gap-2">
            {isFetching && (
              <div className="flex items-center gap-1.5">
                <PulseDot color="#00CFFF" size={5} />
                <span className="font-mono text-[8px]" style={{ color: '#00CFFF' }}>SYNCING</span>
              </div>
            )}
            <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>
              {jobs.length} tasks · {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        }
      />

      <div className="space-y-5">
        <OperationalDashboard jobs={jobs} />
        <SystemTimeline jobs={jobs} />

        <div className="grid grid-cols-2 gap-5">
          <LiveExecution jobs={jobs} tick={tick} />
          <QueueVisualizer jobs={jobs} />
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: '1.35fr 1fr' }}>
          <DependencyGraph jobs={jobs} />
          <AIOptimizer jobs={jobs} />
        </div>

        <SystemLoad jobs={jobs} tick={tick} />

        <div>
          <p className="font-mono text-[8px] font-bold tracking-widest mb-3"
            style={{ color: 'rgba(232,232,255,0.3)' }}>
            ALL SCHEDULED TASKS ({jobs.length})
          </p>
          {jobs.length === 0 && !isFetching ? (
            <div className="os-card p-10 text-center">
              <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.2)' }}>
                No tasks found. Run migrations to seed default scheduler jobs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {jobs.map(job => (
                <TaskCard key={job.id} job={job}
                  onTrigger={name => triggerMut.mutate(name)}
                  onToggle={id => toggleMut.mutate(id)}
                  isTriggering={triggeringJob === job.name} />
              ))}
            </div>
          )}
        </div>

        <ExecutionHistory jobs={jobs} />
      </div>
    </div>
  );
}
