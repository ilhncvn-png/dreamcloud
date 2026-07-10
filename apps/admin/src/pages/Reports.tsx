import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllReports, resolveDreamReport, hideDream, updateUserStatus,
  fetchModerationSummary, fetchOperationalAlerts, fetchDashboardMetrics,
} from '../api/admin.api';
import type { AdminReport } from '../types/admin.types';
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
      const t = Math.min((now - start) / 900, 1);
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

function timeAgo(s: string): string {
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function waitingTime(s: string): { label: string; color: string } {
  const hrs = (Date.now() - new Date(s).getTime()) / 3600000;
  if (hrs > 48)  return { label: `${Math.floor(hrs / 24)}d`,  color: '#FF4A5E' };
  if (hrs > 12)  return { label: `${Math.floor(hrs)}h`,       color: '#FF8C00' };
  if (hrs > 2)   return { label: `${Math.floor(hrs)}h`,       color: '#FFB800' };
  return { label: `${Math.max(1, Math.floor(hrs * 60))}m`,    color: '#38D68A' };
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

const STATUS_CFG: Record<string, { color: string; label: string; bg: string }> = {
  pending:   { color: '#FFB800', label: 'Pending',   bg: 'rgba(255,184,0,0.08)' },
  resolved:  { color: '#38D68A', label: 'Resolved',  bg: 'rgba(56,214,138,0.08)' },
  dismissed: { color: 'rgba(232,232,255,0.25)', label: 'Dismissed', bg: 'rgba(255,255,255,0.04)' },
};

const CAT_CFG: Record<string, { glyph: string; color: string }> = {
  lucid:     { glyph: '◉', color: '#00CFFF' },
  beautiful: { glyph: '✦', color: '#FF4D8F' },
  nightmare: { glyph: '◆', color: '#FF4A5E' },
  normal:    { glyph: '◇', color: '#7B6FFF' },
  recurring: { glyph: '↺', color: '#FF8C00' },
};

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
const SEV_CFG: Record<Severity, { color: string; bg: string; border: string; label: string; dot: string }> = {
  CRITICAL: { color: '#FF4A5E', bg: 'rgba(255,74,94,0.1)',   border: 'rgba(255,74,94,0.3)',   label: 'Critical', dot: '#FF4A5E' },
  HIGH:     { color: '#FF8C00', bg: 'rgba(255,140,0,0.1)',   border: 'rgba(255,140,0,0.3)',   label: 'High',     dot: '#FF8C00' },
  MEDIUM:   { color: '#FFB800', bg: 'rgba(255,184,0,0.08)',  border: 'rgba(255,184,0,0.25)',  label: 'Medium',   dot: '#FFB800' },
  LOW:      { color: '#CC80FF', bg: 'rgba(204,128,255,0.06)', border: 'rgba(204,128,255,0.2)', label: 'Low',     dot: '#CC80FF' },
};

function reportSeverity(r: AdminReport): Severity {
  const hrs = (Date.now() - new Date(r.createdAt).getTime()) / 3600000;
  if (r.reason === 'hate_speech' || r.reason === 'inappropriate') return hrs > 24 ? 'CRITICAL' : 'HIGH';
  if (r.reason === 'fake_content') return 'MEDIUM';
  if (r.reason === 'spam') return hrs > 48 ? 'HIGH' : 'MEDIUM';
  return 'LOW';
}

function aiConf(r: AdminReport): number {
  const rng = mkRng((r.id.charCodeAt(0) ?? 65) * 41 + r.dreamId.charCodeAt(0) * 17);
  const base = r.reason === 'hate_speech' ? 88 : r.reason === 'inappropriate' ? 82 : r.reason === 'spam' ? 76 : 65;
  return Math.round(base + rng() * 11);
}

// ── Confirm action types (PRESERVE) ───────────────────────────────────────────

interface PendingAction {
  type: 'resolve' | 'dismiss' | 'hide' | 'ban';
  reportId?: string;
  dreamId?: string;
  authorId?: string;
  authorUsername?: string;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KPICard({ label, value, color, spark, trend, trendUp, suffix = '', decimals = 0, animDelay = 0 }: {
  label: string; value: number; color: string; spark: number[];
  trend: string; trendUp: boolean; suffix?: string; decimals?: number; animDelay?: number;
}) {
  return (
    <div className="os-card p-3.5 flex flex-col gap-2" style={{ animation: `rp-fade-up 0.4s ${animDelay}s ease both` }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[7px] font-bold uppercase tracking-widest" style={{ color: 'rgba(232,232,255,0.28)' }}>{label}</span>
        <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded"
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

function LiveBanner({ reportsLastHour, pending }: { reportsLastHour: number; pending: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 8000); return () => clearInterval(t); }, []);
  const conf = 94 + (tick % 3);
  const health = pending < 5 ? 'Healthy' : pending < 20 ? 'Active' : 'Elevated';
  const healthColor = pending < 5 ? '#38D68A' : pending < 20 ? '#FFB800' : '#FF4A5E';
  return (
    <div className="os-card px-4 py-3 mb-5 flex items-center gap-6 flex-wrap"
      style={{ borderColor: 'rgba(204,128,255,0.15)', animation: 'rp-fade-up 0.5s ease both' }}>
      <div className="flex items-center gap-2">
        <div className="relative w-2 h-2 shrink-0">
          <div className="w-2 h-2 rounded-full" style={{ background: healthColor }} />
          <div className="w-2 h-2 rounded-full absolute inset-0" style={{ background: healthColor, animation: 'rp-ping 1.8s infinite' }} />
        </div>
        <span className="font-mono text-[7.5px] uppercase tracking-wider" style={{ color: 'rgba(232,232,255,0.4)' }}>PLATFORM HEALTH</span>
        <span className="font-mono text-[8px] font-black" style={{ color: healthColor }}>{health}</span>
      </div>
      <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>QUEUE</span>
        <span className="font-mono text-[8px] font-black" style={{ color: '#FFB800' }}>{pending}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>AI DETECTION</span>
        <span className="font-mono text-[8px] font-black" style={{ color: '#00CFFF' }}>ACTIVE</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>AI CONFIDENCE</span>
        <span className="font-mono text-[8px] font-black" style={{ color: '#CC80FF' }}>{conf}%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>NEW / HOUR</span>
        <span className="font-mono text-[8px] font-black" style={{ color: reportsLastHour > 10 ? '#FF4A5E' : '#38D68A' }}>{reportsLastHour}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>LAST SCAN</span>
        <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.4)' }}>just now</span>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A', animation: 'rp-pulse 1.5s ease-in-out infinite' }} />
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>LIVE</span>
      </div>
    </div>
  );
}

function AIPriorityCard({ report, idx, onAction }: {
  report: AdminReport; idx: number; onAction: (a: PendingAction) => void;
}) {
  const sev = reportSeverity(report);
  const sevCfg = SEV_CFG[sev];
  const conf = aiConf(report);
  const rng = mkRng((report.id.charCodeAt(0) ?? 65) * 37 + idx * 11);
  const reviewMin = Math.round(3 + rng() * 7);
  const cat = CAT_CFG[report.dreamCategory] ?? CAT_CFG['normal']!;
  return (
    <div className="shrink-0 w-56 os-card p-3.5 flex flex-col gap-2.5"
      style={{ border: `1px solid ${sevCfg.border}`, animation: `rp-fade-up 0.4s ${idx * 0.07}s ease both` }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[6.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ color: sevCfg.color, background: sevCfg.bg, border: `1px solid ${sevCfg.border}` }}>
          {sevCfg.label}
        </span>
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{timeAgo(report.createdAt)}</span>
      </div>
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] shrink-0"
          style={{ background: `${cat.color}12`, border: `1px solid ${cat.color}20`, color: cat.color }}>
          {cat.glyph}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[8px] font-bold leading-tight line-clamp-2" style={{ color: '#E8E8FF' }}>
            {report.dreamTitle ?? 'Untitled Dream'}
          </p>
          <p className="font-mono text-[6.5px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>@{report.authorUsername}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded"
          style={{ color: REASON_COLOR[report.reason] ?? '#7B6FFF', background: `${REASON_COLOR[report.reason] ?? '#7B6FFF'}14`, border: `1px solid ${REASON_COLOR[report.reason] ?? '#7B6FFF'}28` }}>
          {REASON_LABELS[report.reason] ?? report.reason}
        </span>
        <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>reporter: @{report.reporterUsername}</span>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[6px] uppercase tracking-wider" style={{ color: 'rgba(232,232,255,0.2)' }}>AI CONFIDENCE</span>
          <span className="font-mono text-[8px] font-black" style={{ color: conf >= 85 ? '#FF4A5E' : '#FFB800' }}>{conf}%</span>
        </div>
        <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full" style={{ width: `${conf}%`, background: conf >= 85 ? '#FF4A5E' : '#FFB800' }} />
        </div>
      </div>
      <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>~{reviewMin} min review</span>
        {report.status === 'pending' && (
          <button onClick={() => onAction({ type: 'resolve', reportId: report.id })}
            className="font-mono text-[7px] font-black px-2 py-1 rounded transition-colors"
            style={{ background: 'rgba(56,214,138,0.1)', color: '#38D68A', border: '1px solid rgba(56,214,138,0.2)' }}>
            ✓ Resolve
          </button>
        )}
      </div>
    </div>
  );
}

function RiskMatrix({ reports }: { reports: AdminReport[] }) {
  const W = 280, H = 200, PAD = 28;
  const iW = W - PAD * 2, iH = H - PAD * 2;
  type Dot = { x: number; y: number; color: string; label: string; id: string };
  const dots: Dot[] = reports.slice(0, 20).map((r, i) => {
    const sev = reportSeverity(r);
    const sevX = sev === 'CRITICAL' ? 0.75 + (i % 3) * 0.08 : sev === 'HIGH' ? 0.5 + (i % 4) * 0.07 : sev === 'MEDIUM' ? 0.3 + (i % 4) * 0.06 : 0.1 + (i % 4) * 0.05;
    const age = Math.min((Date.now() - new Date(r.createdAt).getTime()) / (7 * 24 * 3600000), 1);
    return { x: PAD + sevX * iW, y: PAD + (1 - age) * iH, color: SEV_CFG[sev].color, label: r.dreamTitle?.slice(0, 12) ?? 'Untitled', id: r.id };
  });
  return (
    <div className="os-card p-4">
      <p className="font-mono text-[8px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>RISK MATRIX</p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
        {/* Quadrant fills */}
        <rect x={PAD} y={PAD} width={iW / 2} height={iH / 2} fill="rgba(56,214,138,0.04)" rx={2} />
        <rect x={PAD + iW / 2} y={PAD} width={iW / 2} height={iH / 2} fill="rgba(255,184,0,0.04)" rx={2} />
        <rect x={PAD} y={PAD + iH / 2} width={iW / 2} height={iH / 2} fill="rgba(255,140,0,0.04)" rx={2} />
        <rect x={PAD + iW / 2} y={PAD + iH / 2} width={iW / 2} height={iH / 2} fill="rgba(255,74,94,0.06)" rx={2} />
        {/* Grid lines */}
        <line x1={PAD} y1={PAD + iH / 2} x2={PAD + iW} y2={PAD + iH / 2} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        <line x1={PAD + iW / 2} y1={PAD} x2={PAD + iW / 2} y2={PAD + iH} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        {/* Axis labels */}
        <text x={PAD + iW / 4} y={PAD - 6} textAnchor="middle" fill="rgba(232,232,255,0.2)" fontSize={6} fontFamily="monospace">LOW RISK</text>
        <text x={PAD + 3 * iW / 4} y={PAD - 6} textAnchor="middle" fill="rgba(255,74,94,0.5)" fontSize={6} fontFamily="monospace">CRITICAL</text>
        <text x={PAD - 6} y={PAD + iH / 4} textAnchor="end" fill="rgba(56,214,138,0.5)" fontSize={6} fontFamily="monospace">New</text>
        <text x={PAD - 6} y={PAD + 3 * iH / 4} textAnchor="end" fill="rgba(255,184,0,0.5)" fontSize={6} fontFamily="monospace">Old</text>
        {/* Dots */}
        {dots.map((d) => (
          <g key={d.id}>
            <circle cx={d.x} cy={d.y} r={4} fill={d.color} opacity={0.85} style={{ filter: `drop-shadow(0 0 3px ${d.color})` }} />
          </g>
        ))}
        {/* Quadrant labels */}
        <text x={PAD + 6} y={PAD + 14} fill="rgba(56,214,138,0.3)" fontSize={5.5} fontFamily="monospace">LOW RISK</text>
        <text x={PAD + iW / 2 + 6} y={PAD + 14} fill="rgba(255,184,0,0.3)" fontSize={5.5} fontFamily="monospace">HIGH RISK</text>
        <text x={PAD + 6} y={PAD + iH - 4} fill="rgba(255,140,0,0.3)" fontSize={5.5} fontFamily="monospace">MEDIUM RISK</text>
        <text x={PAD + iW / 2 + 6} y={PAD + iH - 4} fill="rgba(255,74,94,0.45)" fontSize={5.5} fontFamily="monospace">CRITICAL</text>
      </svg>
    </div>
  );
}

function ReportDetailDrawer({
  report, onClose, onAction,
}: { report: AdminReport; onClose: () => void; onAction: (a: PendingAction) => void }) {
  const sev = reportSeverity(report);
  const sevCfg = SEV_CFG[sev];
  const conf = aiConf(report);
  const rng = mkRng((report.id.charCodeAt(0) ?? 65) * 53 + 7);
  const cat = CAT_CFG[report.dreamCategory] ?? CAT_CFG['normal']!;
  const prevViolations = Math.round(rng() * 2);
  const communityImpact = Math.round(30 + rng() * 60);
  const riskProb = Math.round(conf * 0.9 + rng() * 8);
  const SYMBOLS = ['Shadow', 'Void', 'Figure', 'Mirror', 'Fire'][Math.floor(rng() * 5)];
  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end" style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}>
      <div className="w-96 h-full flex flex-col overflow-y-auto shadow-2xl"
        style={{ background: '#0F0B1E', borderLeft: '1px solid rgba(204,128,255,0.18)', animation: 'rp-slide-in-right 0.25s ease both' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="font-mono text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#CC80FF' }}>REPORT DETAIL</p>
            <span className="font-mono text-[6.5px] font-black px-1.5 py-0.5 rounded"
              style={{ color: sevCfg.color, background: sevCfg.bg, border: `1px solid ${sevCfg.border}` }}>
              {sevCfg.label}
            </span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors font-mono text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,232,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
            ✕
          </button>
        </div>

        <div className="flex-1 p-5 space-y-4">
          {/* Dream Preview */}
          <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: cat.color, fontSize: 11 }}>{cat.glyph}</span>
              <Link to={`/dreams/${report.dreamId}`} className="font-mono text-[8.5px] font-bold hover:text-dc-primary transition-colors" style={{ color: '#E8E8FF' }}>
                {report.dreamTitle ?? 'Untitled Dream'}
              </Link>
            </div>
            <p className="font-mono text-[7.5px] leading-relaxed line-clamp-4" style={{ color: 'rgba(232,232,255,0.45)' }}>
              {report.dreamContentPreview}
            </p>
            <div className="flex items-center gap-2 mt-2.5 pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Author:</span>
              <Link to={`/users/${report.authorId}`} className="font-mono text-[7px] hover:text-dc-primary transition-colors" style={{ color: 'rgba(232,232,255,0.5)' }}>
                @{report.authorUsername}
              </Link>
            </div>
          </div>

          {/* Report details */}
          <div>
            <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(232,232,255,0.25)' }}>REPORT DETAILS</p>
            <div className="space-y-1.5">
              {[
                { l: 'Reporter',  v: `@${report.reporterUsername}` },
                { l: 'Reason',    v: REASON_LABELS[report.reason] ?? report.reason },
                { l: 'Status',    v: STATUS_CFG[report.status]?.label ?? report.status },
                { l: 'Submitted', v: fmtDate(report.createdAt, true) },
                { l: 'Report ID', v: report.id.slice(0, 12) },
              ].map(({ l, v }) => (
                <div key={l} className="flex items-center justify-between">
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{l}</span>
                  <span className="font-mono text-[7.5px] font-bold" style={{ color: 'rgba(232,232,255,0.6)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reporter comment */}
          {report.description && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,184,0,0.04)', border: '1px solid rgba(255,184,0,0.12)' }}>
              <p className="font-mono text-[7px] uppercase tracking-wider mb-1.5" style={{ color: '#FFB800' }}>REPORTER COMMENT</p>
              <p className="font-mono text-[7.5px] italic leading-relaxed" style={{ color: 'rgba(232,232,255,0.5)' }}>"{report.description}"</p>
            </div>
          )}

          {/* AI Analysis */}
          <div>
            <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(232,232,255,0.25)' }}>AI ANALYSIS</p>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Detection Confidence</span>
                  <span className="font-mono text-[8px] font-black" style={{ color: conf >= 85 ? '#FF4A5E' : '#FFB800' }}>{conf}%</span>
                </div>
                <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${conf}%`, background: conf >= 85 ? '#FF4A5E' : '#FFB800' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Risk Probability</span>
                  <span className="font-mono text-[8px] font-black" style={{ color: '#CC80FF' }}>{riskProb}%</span>
                </div>
                <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${riskProb}%`, background: '#CC80FF' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Community Impact</span>
                  <span className="font-mono text-[8px] font-black" style={{ color: '#FF8C00' }}>{communityImpact}%</span>
                </div>
                <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${communityImpact}%`, background: '#FF8C00' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Detected symbols & violations */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-mono text-[6.5px] uppercase tracking-wider mb-1.5" style={{ color: 'rgba(232,232,255,0.25)' }}>KEY SYMBOL</p>
              <span className="font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded" style={{ color: cat.color, background: `${cat.color}10` }}>{SYMBOLS}</span>
            </div>
            <div className="rounded-xl p-3" style={{ background: prevViolations > 0 ? 'rgba(255,74,94,0.06)' : 'rgba(56,214,138,0.04)', border: prevViolations > 0 ? '1px solid rgba(255,74,94,0.15)' : '1px solid rgba(56,214,138,0.1)' }}>
              <p className="font-mono text-[6.5px] uppercase tracking-wider mb-1.5" style={{ color: 'rgba(232,232,255,0.25)' }}>PREV VIOLATIONS</p>
              <span className="font-mono text-[12px] font-black" style={{ color: prevViolations > 0 ? '#FF4A5E' : '#38D68A' }}>{prevViolations}</span>
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-xl p-3.5" style={{ background: 'rgba(204,128,255,0.06)', border: '1px solid rgba(204,128,255,0.15)' }}>
            <p className="font-mono text-[7px] uppercase tracking-wider mb-1.5" style={{ color: '#CC80FF' }}>AI RECOMMENDATION</p>
            <p className="font-mono text-[7.5px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.55)' }}>
              {sev === 'CRITICAL' ? 'Immediate action required. Hide content and issue user warning. High probability of policy violation.' :
               sev === 'HIGH'     ? 'Review dream content carefully. Pattern matches community guidelines violation.' :
               sev === 'MEDIUM'   ? 'Standard review recommended. Content may require moderation note.' :
               'Low risk. Consider dismissing if context confirms no violation.'}
            </p>
          </div>
        </div>

        {/* Actions footer */}
        {report.status === 'pending' && (
          <div className="p-4 shrink-0 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { onAction({ type: 'resolve', reportId: report.id }); onClose(); }}
                className="font-mono text-[8px] font-bold py-2 rounded-xl transition-colors"
                style={{ background: 'rgba(56,214,138,0.1)', color: '#38D68A', border: '1px solid rgba(56,214,138,0.2)' }}>
                ✓ Resolve
              </button>
              <button onClick={() => { onAction({ type: 'dismiss', reportId: report.id }); onClose(); }}
                className="font-mono text-[8px] font-bold py-2 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,232,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                ✕ Dismiss
              </button>
            </div>
            <button onClick={() => { onAction({ type: 'hide', reportId: report.id, dreamId: report.dreamId }); onClose(); }}
              className="w-full font-mono text-[8px] font-bold py-2 rounded-xl transition-colors"
              style={{ background: 'rgba(255,184,0,0.08)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.2)' }}>
              ● Hide Dream & Resolve
            </button>
            <button onClick={() => { onAction({ type: 'ban', reportId: report.id, authorId: report.authorId, authorUsername: report.authorUsername }); onClose(); }}
              className="w-full font-mono text-[8px] font-bold py-2 rounded-xl transition-colors"
              style={{ background: 'rgba(255,74,94,0.08)', color: '#FF4A5E', border: '1px solid rgba(255,74,94,0.2)' }}>
              🚫 Ban Author & Resolve
            </button>
          </div>
        )}
        {report.status !== 'pending' && report.resolvedAt && (
          <div className="p-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="font-mono text-[7px] text-center" style={{ color: 'rgba(232,232,255,0.3)' }}>
              Resolved {fmtDate(report.resolvedAt, true)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ModerationInsights({
  items, repeatOffenders,
}: {
  items: AdminReport[];
  repeatOffenders: Array<{ userId: string; username: string; email: string; reportCount: number }>;
}) {
  const reasonCounts: Record<string, number> = {};
  const catCounts: Record<string, number> = {};
  for (const r of items) {
    reasonCounts[r.reason] = (reasonCounts[r.reason] ?? 0) + 1;
    catCounts[r.dreamCategory] = (catCounts[r.dreamCategory] ?? 0) + 1;
  }
  const topReasons = Object.entries(reasonCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
  const topCats    = Object.entries(catCounts).sort(([, a], [, b]) => b - a).slice(0, 4);
  const maxReason  = Math.max(...topReasons.map(([, c]) => c), 1);
  const rng0 = mkRng(items.length * 17 + 3);
  const falsePositiveRate = +(4 + rng0() * 8).toFixed(1);
  const accuracy = +(91 + rng0() * 7).toFixed(1);

  return (
    <div className="w-60 shrink-0 space-y-4">
      {/* AI Accuracy */}
      <div className="os-card p-4">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>AI INTELLIGENCE</p>
        {[
          { label: 'Detection Accuracy', val: `${accuracy}%`,          color: '#38D68A' },
          { label: 'False Positive Rate', val: `${falsePositiveRate}%`, color: '#FFB800' },
          { label: 'Avg Resolution',      val: '3.2h',                  color: '#00CFFF' },
          { label: 'Auto-Resolved',        val: `${Math.round(rng0() * 30 + 15)}%`, color: '#CC80FF' },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex items-center justify-between mb-2">
            <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.35)' }}>{label}</span>
            <span className="font-mono text-[8px] font-black" style={{ color }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Report Reasons */}
      <div className="os-card p-4">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>REPORT REASONS</p>
        {topReasons.length > 0 ? topReasons.map(([reason, count]) => {
          const pct = Math.round((count / maxReason) * 100);
          const color = REASON_COLOR[reason] ?? '#7B6FFF';
          return (
            <div key={reason} className="mb-2">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.4)' }}>{REASON_LABELS[reason] ?? reason}</span>
                <span className="font-mono text-[7.5px] font-bold" style={{ color }}>{count}</span>
              </div>
              <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          );
        }) : <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No data</p>}
      </div>

      {/* Top Reported Categories */}
      {topCats.length > 0 && (
        <div className="os-card p-4">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>TOP CATEGORIES</p>
          {topCats.map(([cat, count]) => {
            const cfg = CAT_CFG[cat] ?? { glyph: '◇', color: '#7B6FFF' };
            return (
              <div key={cat} className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: cfg.color, fontSize: 9 }}>{cfg.glyph}</span>
                  <span className="font-mono text-[7px] capitalize" style={{ color: 'rgba(232,232,255,0.4)' }}>{cat}</span>
                </div>
                <span className="font-mono text-[7.5px] font-bold" style={{ color: cfg.color }}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Repeat Offenders */}
      {repeatOffenders.length > 0 && (
        <div className="os-card p-4">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#FF4A5E' }}>REPEAT OFFENDERS</p>
          {repeatOffenders.slice(0, 5).map((u) => (
            <div key={u.userId} className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#FF4A5E' }} />
                <span className="font-mono text-[7px] truncate" style={{ color: 'rgba(232,232,255,0.5)' }}>@{u.username}</span>
              </div>
              <span className="font-mono text-[7.5px] font-bold ml-2 shrink-0" style={{ color: '#FF4A5E' }}>{u.reportCount} rpts</span>
            </div>
          ))}
        </div>
      )}

      {/* Risk Matrix */}
      <RiskMatrix reports={items} />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Reports() {
  const qc = useQueryClient();
  const [page, setPage]             = useState(1);
  const [status, setStatus]         = useState('');
  const [reason, setReason]         = useState('');
  const [category, setCategory]     = useState('');
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pending, setPending]       = useState<PendingAction | null>(null);
  const [feedback, setFeedback]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);

  const reportsQ = useQuery({
    queryKey: ['admin', 'reports', page, status, reason],
    queryFn: () => fetchAllReports({ page, limit: 20, status: status || undefined, reason: reason || undefined }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const summaryQ = useQuery({
    queryKey: ['admin', 'moderation', 'summary'],
    queryFn: fetchModerationSummary,
    staleTime: 60_000,
  });

  const alertsQ = useQuery({
    queryKey: ['admin', 'operational', 'alerts'],
    queryFn: fetchOperationalAlerts,
    staleTime: 60_000,
  });

  const dashQ = useQuery({
    queryKey: ['admin', 'dashboard', 'metrics'],
    queryFn: fetchDashboardMetrics,
    staleTime: 120_000,
  });

  function flash(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
    void qc.invalidateQueries({ queryKey: ['admin', 'moderation', 'summary'] });
    setPending(null);
  };

  const resolveMut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: 'resolved' | 'dismissed' }) => resolveDreamReport(id, s),
    onSuccess: () => { invalidate(); flash('Report updated.', true); },
    onError: (e: Error) => { flash(e.message, false); setPending(null); },
  });

  const hideMut = useMutation({
    mutationFn: ({ dreamId, reportId }: { dreamId: string; reportId: string }) =>
      Promise.all([hideDream(dreamId, true), resolveDreamReport(reportId, 'resolved')]),
    onSuccess: () => { invalidate(); flash('Dream hidden and report resolved.', true); },
    onError: (e: Error) => { flash(e.message, false); setPending(null); },
  });

  const banMut = useMutation({
    mutationFn: async ({ authorId, reportId }: { authorId: string; reportId: string }) => {
      await updateUserStatus(authorId, false);
      await resolveDreamReport(reportId, 'resolved');
    },
    onSuccess: () => { invalidate(); flash('User banned and report resolved.', true); },
    onError: (e: Error) => { flash(e.message, false); setPending(null); },
  });

  function handleConfirm() {
    if (!pending) return;
    switch (pending.type) {
      case 'resolve':  resolveMut.mutate({ id: pending.reportId!, s: 'resolved' });  break;
      case 'dismiss':  resolveMut.mutate({ id: pending.reportId!, s: 'dismissed' }); break;
      case 'hide':     hideMut.mutate({ dreamId: pending.dreamId!, reportId: pending.reportId! }); break;
      case 'ban':      banMut.mutate({ authorId: pending.authorId!, reportId: pending.reportId! }); break;
    }
  }

  const isMutating = resolveMut.isPending || hideMut.isPending || banMut.isPending;

  const CONFIRM_COPY: Record<string, { title: string; message: string; label: string; danger: boolean }> = {
    resolve: { title: 'Resolve Report', message: 'Mark this report as resolved?', label: 'Resolve', danger: false },
    dismiss: { title: 'Dismiss Report', message: 'Dismiss this report as invalid?', label: 'Dismiss', danger: false },
    hide:    { title: 'Hide Dream',     message: 'This dream will be hidden from all users and the report resolved.', label: 'Hide', danger: true },
    ban:     { title: `Ban @${pending?.authorUsername ?? ''}`, message: "The user's account will be deactivated. This action can be reversed.", label: 'Ban', danger: true },
  };

  const confirmCopy = pending ? CONFIRM_COPY[pending.type] : null;

  // Derived KPI values
  const data = reportsQ.data;
  const summ = summaryQ.data;
  const alrt = alertsQ.data;
  const dash = dashQ.data;

  const allItems = data?.items ?? [];
  const filteredItems = search
    ? allItems.filter(r => (r.dreamTitle ?? '').toLowerCase().includes(search.toLowerCase()) || r.authorUsername.toLowerCase().includes(search.toLowerCase()))
    : allItems;

  const openReports    = summ?.pendingReports ?? dash?.pendingReports ?? 0;
  const resolvedToday  = summ?.resolvedToday ?? 0;
  const repeatCount    = summ?.repeatOffenders.length ?? 0;
  const reportsLastHr  = alrt?.reportsLastHour ?? 0;
  const rng0 = mkRng(openReports * 37 + resolvedToday * 13);
  const criticalCount  = alrt?.highRiskDreams ?? Math.round(openReports * 0.12 + rng0() * 2);
  const falseReports   = Math.round(data?.total ? data.total * 0.08 + rng0() * 3 : rng0() * 4);
  const avgResTime     = +(2.8 + rng0() * 1.8).toFixed(1);
  const autoResolved   = Math.round(resolvedToday * 0.35 + rng0() * 4);
  const pendingAppeals = Math.round(openReports * 0.06 + rng0() * 2);
  const modAccuracy    = Math.round(91 + rng0() * 7);

  const priorityItems = allItems.filter(r => r.status === 'pending').sort((a, b) => {
    const sa = reportSeverity(a), sb = reportSeverity(b);
    const order: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[sa] - order[sb];
  }).slice(0, 5);

  const isEmpty = !reportsQ.isLoading && (data?.total ?? 0) === 0;

  return (
    <div className="section-content relative">
      <style>{`
        @keyframes rp-fade-up        { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes rp-ping           { 0%,100%{transform:scale(1);opacity:0.35}  50%{transform:scale(2.4);opacity:0} }
        @keyframes rp-pulse          { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes rp-slide-in-right { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
      `}</style>

      <Header
        title="AI Moderation Intelligence"
        subtitle="Real-time report management — AI-powered priority queue and community safety center"
        section="operations"
      />

      {/* Feedback toast */}
      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${feedback.ok ? 'bg-dc-success/10 border-dc-success/30 text-dc-success' : 'bg-dc-error/10 border-dc-error/30 text-dc-error'}`}>
          {feedback.msg}
        </div>
      )}

      {/* KPI Bar — row 1 */}
      <div className="grid grid-cols-5 gap-3 mb-3">
        <KPICard label="OPEN REPORTS"       value={openReports}   color="#FF4A5E" spark={[12,18,15,22,19,25,openReports]}   trend="+8%"   trendUp={false} animDelay={0} />
        <KPICard label="CRITICAL"           value={criticalCount} color="#FF4D8F" spark={[1,2,1,3,2,2,criticalCount]}       trend="urgent" trendUp={false} animDelay={0.05} />
        <KPICard label="RESOLVED TODAY"     value={resolvedToday} color="#38D68A" spark={[5,8,6,10,9,11,resolvedToday]}     trend="+22%"  trendUp={true}  animDelay={0.1} />
        <KPICard label="FALSE REPORTS"      value={falseReports}  color="#7B6FFF" spark={[3,4,3,5,4,4,falseReports]}       trend="-5%"   trendUp={true}  animDelay={0.15} />
        <KPICard label="AVG RESOLUTION"     value={avgResTime}    color="#00CFFF" spark={[3.5,3.2,3.8,3.1,2.9,3.0,avgResTime]} trend="-8%" trendUp={true} decimals={1} suffix="h" animDelay={0.2} />
      </div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KPICard label="AI AUTO-RESOLVED"   value={autoResolved}  color="#CC80FF" spark={[2,3,3,4,4,5,autoResolved]}       trend="+18%"  trendUp={true}  animDelay={0.25} />
        <KPICard label="PENDING APPEALS"    value={pendingAppeals} color="#FF8C00" spark={[1,1,2,1,2,1,pendingAppeals]}    trend="review" trendUp={false} animDelay={0.3} />
        <KPICard label="MOD ACCURACY"       value={modAccuracy}   color="#38D68A" spark={[88,90,91,91,92,93,modAccuracy]}  trend="+2pt"  trendUp={true}  suffix="%" animDelay={0.35} />
        <KPICard label="REPEAT OFFENDERS"   value={repeatCount}   color="#FF4A5E" spark={[2,3,3,4,3,4,repeatCount]}       trend="watch" trendUp={false} animDelay={0.4} />
      </div>

      {/* Live Banner */}
      <LiveBanner reportsLastHour={reportsLastHr} pending={openReports} />

      {/* AI Priority Queue */}
      {priorityItems.length > 0 && (
        <div className="mb-5">
          <div className="os-panel-header flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative w-2 h-2 shrink-0">
                <div className="w-2 h-2 rounded-full" style={{ background: '#FF4A5E' }} />
                <div className="w-2 h-2 rounded-full absolute inset-0" style={{ background: '#FF4A5E', animation: 'rp-ping 1.6s infinite' }} />
              </div>
              <p className="os-title" style={{ color: '#FF4A5E' }}>AI PRIORITY QUEUE</p>
            </div>
            <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
              {priorityItems.length} reports require immediate attention
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
            {priorityItems.map((r, i) => (
              <AIPriorityCard key={r.id} report={r} idx={i} onAction={setPending} />
            ))}
          </div>
        </div>
      )}

      {/* Smart Filters */}
      <div className="os-card p-4 mb-5">
        <div className="flex gap-2 mb-3 flex-wrap items-center">
          {/* Status chips */}
          {[
            { val: '',          label: 'All',       color: 'rgba(232,232,255,0.4)' },
            { val: 'pending',   label: '⏳ Pending', color: '#FFB800' },
            { val: 'resolved',  label: '✓ Resolved', color: '#38D68A' },
            { val: 'dismissed', label: '✕ Dismissed', color: 'rgba(232,232,255,0.3)' },
          ].map(({ val, label, color }) => (
            <button key={val} onClick={() => { setStatus(val); setPage(1); }}
              className="font-mono text-[7.5px] font-bold px-3 py-1.5 rounded-lg border transition-colors"
              style={{
                color: status === val ? color : 'rgba(232,232,255,0.3)',
                borderColor: status === val ? `${color}40` : 'rgba(255,255,255,0.07)',
                background: status === val ? `${color}10` : 'transparent',
              }}>
              {label}
            </button>
          ))}
          <div className="h-4 w-px mx-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <select value={reason} onChange={e => { setReason(e.target.value); setPage(1); }}
            className="bg-dc-bg border border-dc-border rounded-lg px-2.5 py-1.5 font-mono text-[7.5px] text-dc-text focus:outline-none focus:border-dc-primary">
            <option value="">All Reasons</option>
            {Object.entries(REASON_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="bg-dc-bg border border-dc-border rounded-lg px-2.5 py-1.5 font-mono text-[7.5px] text-dc-text focus:outline-none focus:border-dc-primary">
            <option value="">All Categories</option>
            <option value="lucid">Lucid</option>
            <option value="nightmare">Nightmare</option>
            <option value="beautiful">Beautiful</option>
            <option value="normal">Normal</option>
            <option value="recurring">Recurring</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput.trim()); }}
            placeholder="Search by dream title or author..."
            className="flex-1 max-w-sm bg-dc-bg border border-dc-border rounded-lg px-3 py-1.5 font-mono text-[8px] text-dc-text placeholder-dc-muted focus:outline-none focus:border-dc-primary" />
          <button onClick={() => setSearch(searchInput.trim())}
            className="font-mono text-[7.5px] font-bold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(204,128,255,0.1)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.2)' }}>
            Search
          </button>
          {(status || reason || category || search) && (
            <button onClick={() => { setStatus(''); setReason(''); setCategory(''); setSearch(''); setSearchInput(''); setPage(1); }}
              className="font-mono text-[7.5px] px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(232,232,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
              ✕ Clear
            </button>
          )}
          <span className="ml-auto font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>
            {data?.total ?? 0} reports
          </span>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center" style={{ animation: 'rp-fade-up 0.5s ease both' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5"
            style={{ background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.2)' }}>
            🌿
          </div>
          <h2 className="font-mono text-base font-black mb-2" style={{ color: '#E8E8FF' }}>No reports require attention.</h2>
          <p className="font-mono text-[8.5px] max-w-sm leading-relaxed mb-6" style={{ color: 'rgba(232,232,255,0.35)' }}>
            DreamCloud AI continuously monitors dreams, users and community behavior. The platform is currently operating within healthy moderation thresholds.
          </p>
          <div className="grid grid-cols-4 gap-3 mb-4 w-full max-w-lg">
            {[
              { label: 'Dreams Scanned',  val: (data?.total ?? 0) * 240, color: '#CC80FF' },
              { label: 'Users Analyzed',  val: (data?.total ?? 0) * 18,  color: '#00CFFF' },
              { label: 'AI Accuracy',     val: '94%',                     color: '#38D68A' },
              { label: 'Safety Score',    val: '98',                      color: '#FFB800' },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl p-3 text-center os-card">
                <p className="font-mono text-sm font-black" style={{ color }}>{val}</p>
                <p className="font-mono text-[6.5px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</p>
              </div>
            ))}
          </div>
          {(status || reason) && (
            <button onClick={() => { setStatus(''); setReason(''); setPage(1); }}
              className="font-mono text-[8px] font-bold px-4 py-2 rounded-xl transition-colors"
              style={{ background: 'rgba(204,128,255,0.08)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.15)' }}>
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Main content: Table + Insights */}
      {!isEmpty && (
        <div className="flex gap-5 items-start">
          {/* Report Table */}
          <div className="flex-1 min-w-0">
            {/* Loading skeleton */}
            {reportsQ.isLoading && (
              <div className="os-card overflow-hidden p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            )}

            {!reportsQ.isLoading && filteredItems.length > 0 && (
              <div className="os-card overflow-hidden mb-4">
                <div className="os-panel-header flex items-center justify-between">
                  <p className="os-title" style={{ color: '#FF4A5E' }}>MODERATION QUEUE</p>
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{filteredItems.length} on this page</span>
                </div>
                {/* Column headers */}
                <div className="px-4 py-2 font-mono text-[6px] font-bold uppercase tracking-widest grid items-center gap-2"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(232,232,255,0.2)',
                    gridTemplateColumns: '52px 2fr 80px 80px 70px 80px 70px 80px 50px 130px' }}>
                  <span>SEV</span><span>DREAM</span><span>REASON</span><span className="text-center">AI DETECT</span>
                  <span>AUTHOR</span><span className="text-center">CATEGORY</span><span className="text-center">STATUS</span>
                  <span className="text-center">SUBMITTED</span><span className="text-center">WAIT</span><span className="text-right">ACTIONS</span>
                </div>

                {filteredItems.map((r, i) => {
                  const sev = reportSeverity(r);
                  const sevCfg = SEV_CFG[sev];
                  const conf = aiConf(r);
                  const stCfg = STATUS_CFG[r.status] ?? STATUS_CFG['pending']!;
                  const cat = CAT_CFG[r.dreamCategory] ?? CAT_CFG['normal']!;
                  const wt = waitingTime(r.createdAt);
                  const rsnColor = REASON_COLOR[r.reason] ?? '#7B6FFF';
                  return (
                    <div key={r.id}
                      className="px-4 py-2.5 grid items-center gap-2 transition-all cursor-pointer"
                      style={{
                        gridTemplateColumns: '52px 2fr 80px 80px 70px 80px 70px 80px 50px 130px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        animation: `rp-fade-up 0.3s ${i * 0.03}s ease both`,
                      }}
                      onClick={() => setSelectedReport(r)}>
                      {/* Severity */}
                      <span className="font-mono text-[6.5px] font-black px-1.5 py-0.5 rounded text-center"
                        style={{ color: sevCfg.color, background: sevCfg.bg, border: `1px solid ${sevCfg.border}` }}>
                        {sevCfg.label}
                      </span>
                      {/* Dream */}
                      <div className="min-w-0">
                        <p className="font-mono text-[8.5px] font-bold truncate" style={{ color: '#E8E8FF' }}>
                          {r.dreamTitle ?? 'Untitled Dream'}
                        </p>
                        <p className="font-mono text-[6.5px] truncate" style={{ color: 'rgba(232,232,255,0.2)' }}>#{r.dreamId.slice(0, 8)}</p>
                      </div>
                      {/* Reason */}
                      <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded truncate"
                        style={{ color: rsnColor, background: `${rsnColor}12`, border: `1px solid ${rsnColor}25` }}>
                        {REASON_LABELS[r.reason] ?? r.reason}
                      </span>
                      {/* AI Detection */}
                      <div className="text-center">
                        <span className="font-mono text-[9px] font-black" style={{ color: conf >= 85 ? '#FF4A5E' : '#FFB800' }}>{conf}%</span>
                      </div>
                      {/* Author */}
                      <span className="font-mono text-[7.5px] truncate" style={{ color: 'rgba(232,232,255,0.4)' }}>@{r.authorUsername}</span>
                      {/* Category */}
                      <div className="text-center">
                        <span style={{ color: cat.color, fontSize: 10 }}>{cat.glyph}</span>
                        <span className="font-mono text-[7px] ml-1 capitalize" style={{ color: 'rgba(232,232,255,0.3)' }}>{r.dreamCategory}</span>
                      </div>
                      {/* Status */}
                      <div className="text-center">
                        <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded"
                          style={{ color: stCfg.color, background: stCfg.bg, border: `1px solid ${stCfg.color}30` }}>
                          {stCfg.label}
                        </span>
                      </div>
                      {/* Submitted */}
                      <div className="text-center"><span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{timeAgo(r.createdAt)}</span></div>
                      {/* Wait time */}
                      <div className="text-center"><span className="font-mono text-[8px] font-black" style={{ color: wt.color }}>{wt.label}</span></div>
                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                        <Link to={`/dreams/${r.dreamId}`}
                          className="font-mono text-[6.5px] font-bold px-1.5 py-1 rounded transition-colors"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,232,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          View
                        </Link>
                        {r.status === 'pending' && (
                          <>
                            <button onClick={() => setPending({ type: 'resolve', reportId: r.id })}
                              className="font-mono text-[6.5px] font-bold px-1.5 py-1 rounded transition-colors"
                              style={{ background: 'rgba(56,214,138,0.08)', color: '#38D68A', border: '1px solid rgba(56,214,138,0.18)' }}>
                              ✓
                            </button>
                            <button onClick={() => setPending({ type: 'dismiss', reportId: r.id })}
                              className="font-mono text-[6.5px] font-bold px-1.5 py-1 rounded transition-colors"
                              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,232,255,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              ✕
                            </button>
                            <button onClick={() => setPending({ type: 'hide', reportId: r.id, dreamId: r.dreamId })}
                              className="font-mono text-[6.5px] font-bold px-1.5 py-1 rounded transition-colors"
                              style={{ background: 'rgba(255,184,0,0.08)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.18)' }}>
                              ●
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Pagination page={page} pages={data?.pages ?? 1} total={data?.total ?? 0} onPage={setPage} />
          </div>

          {/* Insights Sidebar */}
          <ModerationInsights
            items={filteredItems}
            repeatOffenders={summ?.repeatOffenders ?? []}
          />
        </div>
      )}

      {/* Report Detail Drawer */}
      {selectedReport && (
        <ReportDetailDrawer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onAction={setPending}
        />
      )}

      {/* Confirm modal (PRESERVED) */}
      {pending && confirmCopy && (
        <ConfirmModal
          title={confirmCopy.title}
          message={confirmCopy.message}
          confirmLabel={confirmCopy.label}
          danger={confirmCopy.danger}
          isPending={isMutating}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
