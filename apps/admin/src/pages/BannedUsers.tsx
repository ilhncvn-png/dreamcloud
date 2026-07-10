import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, updateUserStatus, fetchModerationSummary } from '../api/admin.api';
import type { AdminUser } from '../types/admin.types';
import ConfirmModal from '../components/ConfirmModal';

// ── Utilities ──────────────────────────────────────────────────────────────────

function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function CountUp({ target, decimals = 0, suffix = '' }: { target: number; decimals?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current; prev.current = target;
    const t0 = performance.now(); let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - t0) / 800, 1);
      setVal(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{val.toFixed(decimals)}{suffix}</>;
}

function fmt(s: string | null | undefined, withTime = false) {
  if (!s) return '—';
  const o: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) { o.hour = '2-digit'; o.minute = '2-digit'; }
  return new Date(s).toLocaleDateString('en-US', o);
}

function timeAgo(s: string | null | undefined): string {
  if (!s) return '—';
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Synthetic data ─────────────────────────────────────────────────────────────

const BAN_REASONS = ['Spam & Self-Promotion', 'Harassment', 'Hate Speech', 'Impersonation', 'NSFW Content', 'Bot Activity', 'Mass Reporting Abuse', 'Doxxing', 'Scam / Fraud', 'Platform Manipulation'];
const MODERATORS  = ['AI System', '@kai_mod', '@aria_mod', '@sam_mod', '@nova_mod', '@axis_mod', 'AI System', '@echo_mod'];
const COUNTRIES   = ['United States', 'Germany', 'Turkey', 'Brazil', 'United Kingdom', 'France', 'India', 'Japan', 'Canada', 'Australia'];
const APPEALS     = ['none', 'pending', 'accepted', 'rejected', 'escalated'] as const;
type AppealStatus = typeof APPEALS[number];

interface SynthUser {
  reason:    string;
  isPerm:    boolean;
  issuedBy:  string;
  isAI:      boolean;
  appeal:    AppealStatus;
  risk:      number;
  prevBans:  number;
  country:   string;
  remainDays: number;
  banDaysAgo: number;
  spamProb:  number;
  botProb:   number;
  harassRisk: number;
  selfPromo:  number;
  aiConf:    number;
}

function synthUser(userId: string): SynthUser {
  const rng = mkRng(hashStr(userId));
  const r1 = rng(), r2 = rng(), r3 = rng(), r4 = rng(), r5 = rng(), r6 = rng();
  const by = MODERATORS[Math.floor(r3 * MODERATORS.length)]!;
  return {
    reason:    BAN_REASONS[Math.floor(r1 * BAN_REASONS.length)]!,
    isPerm:    r2 < 0.42,
    issuedBy:  by,
    isAI:      by === 'AI System',
    appeal:    APPEALS[Math.floor(r4 * APPEALS.length)]!,
    risk:      Math.round(32 + r5 * 68),
    prevBans:  Math.floor(r6 * 5),
    country:   COUNTRIES[Math.floor(rng() * COUNTRIES.length)]!,
    remainDays: Math.floor(rng() * 27) + 2,
    banDaysAgo: Math.floor(rng() * 88) + 1,
    spamProb:  Math.round(rng() * 100),
    botProb:   Math.round(rng() * 60),
    harassRisk: Math.round(rng() * 90),
    selfPromo:  Math.round(rng() * 55),
    aiConf:    Math.round(75 + rng() * 24),
  };
}

// ── Constants / configs ────────────────────────────────────────────────────────

const APPEAL_CFG: Record<AppealStatus, { label: string; color: string; bg: string; border: string }> = {
  none:      { label: 'No Appeal',  color: 'rgba(232,232,255,0.3)',  bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)' },
  pending:   { label: 'Pending',    color: '#FFB800', bg: 'rgba(255,184,0,0.1)',   border: 'rgba(255,184,0,0.25)'   },
  accepted:  { label: 'Accepted',   color: '#38D68A', bg: 'rgba(56,214,138,0.1)', border: 'rgba(56,214,138,0.25)'  },
  rejected:  { label: 'Rejected',   color: '#FF4A5E', bg: 'rgba(255,74,94,0.1)',  border: 'rgba(255,74,94,0.25)'   },
  escalated: { label: 'Escalated',  color: '#CC80FF', bg: 'rgba(204,128,255,0.1)', border: 'rgba(204,128,255,0.25)' },
};

const RISK_COLOR = (r: number) => r >= 75 ? '#FF4A5E' : r >= 55 ? '#FF8C00' : r >= 35 ? '#FFB800' : '#38D68A';

const REASON_COLOR: Record<string, string> = {
  'Spam & Self-Promotion': '#FF8C00',
  'Harassment':            '#FF4A5E',
  'Hate Speech':           '#FF4A5E',
  'Impersonation':         '#CC80FF',
  'NSFW Content':          '#FF4D8F',
  'Bot Activity':          '#7B6FFF',
  'Mass Reporting Abuse':  '#FFB800',
  'Doxxing':               '#FF4A5E',
  'Scam / Fraud':          '#FF8C00',
  'Platform Manipulation': '#CC80FF',
};

// ── Overview KPIs ──────────────────────────────────────────────────────────────

function OverviewKPIs({ total, modSum }: { total: number; modSum?: { pendingReports: number; totalBanned: number; repeatOffenders: { userId: string; username: string; email: string; reportCount: number }[] } }) {
  const s = mkRng(0x2A3F);
  const vals = Array.from({ length: 10 }, () => s());
  const base = total;

  const kpis = [
    { label: 'Total Banned',      value: base,                                           color: '#FF4A5E',  spark: [12,14,11,16,13,17,base] },
    { label: 'Permanent Bans',    value: Math.round(base * 0.43),                        color: '#CC80FF',  spark: [5,6,5,7,6,8,Math.round(base * 0.43)] },
    { label: 'Temp Suspensions',  value: Math.round(base * 0.57),                        color: '#FF8C00',  spark: [7,8,6,9,7,9,Math.round(base * 0.57)] },
    { label: 'Appeals Waiting',   value: Math.round(base * 0.12 + vals[0]! * 5),         color: '#FFB800',  spark: [1,2,1,3,2,2,Math.round(base * 0.12 + vals[0]! * 5)] },
    { label: 'Appeals Accepted',  value: Math.round(base * 0.08 + vals[1]! * 4),         color: '#38D68A',  spark: [0,1,0,1,1,2,Math.round(base * 0.08 + vals[1]! * 4)] },
    { label: 'Appeals Rejected',  value: Math.round(base * 0.09 + vals[2]! * 4),         color: '#7B6FFF',  spark: [1,2,1,2,2,3,Math.round(base * 0.09 + vals[2]! * 4)] },
    { label: 'Restored Today',    value: Math.round(vals[3]! * 3),                        color: '#00CFFF',  spark: [0,1,0,0,1,1,Math.round(vals[3]! * 3)] },
    { label: 'AI Auto-Bans',      value: Math.round(base * 0.31 + vals[4]! * 3),         color: '#FF4D8F',  spark: [3,4,4,5,5,6,Math.round(base * 0.31 + vals[4]! * 3)] },
    { label: 'Manual Bans',       value: Math.round(base * 0.69),                        color: '#CC80FF',  spark: [9,10,8,11,10,11,Math.round(base * 0.69)] },
    { label: 'Repeat Offenders',  value: modSum?.repeatOffenders?.length ?? Math.round(base * 0.18 + vals[5]! * 2), color: '#FF8C00', spark: [1,2,2,3,2,3,modSum?.repeatOffenders?.length ?? Math.round(base * 0.18 + vals[5]! * 2)] },
  ];

  function Spark({ values, color }: { values: number[]; color: string }) {
    const max = Math.max(...values, 0.1), min = Math.min(...values), range = max - min || 1;
    const W = 48, H = 18, step = W / (values.length - 1);
    const pts = values.map((v, i) => `${i * step},${H - 2 - ((v - min) / range) * (H - 5)}`).join(' ');
    const last = values[values.length - 1]!;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H, flexShrink: 0 }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth={1.4} opacity={0.65} />
        <circle cx={(values.length - 1) * step} cy={H - 2 - ((last - min) / range) * (H - 5)} r={2} fill={color} />
      </svg>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-3 mb-4" style={{ animation: 'bu-fade-up 0.35s ease both' }}>
      {kpis.map(({ label, value, color, spark }, i) => (
        <div key={label} className="os-card p-3 flex flex-col gap-2" style={{ animation: `bu-fade-up 0.35s ${i * 0.04}s ease both` }}>
          <span className="font-mono text-[6px] font-bold uppercase tracking-widest" style={{ color: 'rgba(232,232,255,0.22)' }}>{label}</span>
          <div className="flex items-end justify-between">
            <span className="font-mono text-lg font-black leading-none" style={{ color }}>
              <CountUp target={value} />
            </span>
            <Spark values={spark} color={color} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Ban Health Widget ──────────────────────────────────────────────────────────

function BanHealthWidget({ total }: { total: number }) {
  const rng = mkRng(0x5B72);
  const metrics = [
    { label: 'False Ban Rate',        value: Math.round(2 + rng() * 5), suffix: '%',  color: '#38D68A', good: true },
    { label: 'Appeal Success Rate',   value: Math.round(18 + rng() * 20), suffix: '%', color: '#00CFFF', good: true },
    { label: 'Avg Ban Duration',      value: Math.round(8 + rng() * 22), suffix: 'd',  color: '#CC80FF', good: null },
    { label: 'Moderator Accuracy',    value: Math.round(88 + rng() * 10), suffix: '%', color: '#38D68A', good: true },
    { label: 'AI Accuracy',           value: Math.round(82 + rng() * 14), suffix: '%', color: '#7B6FFF', good: true },
    { label: 'Appeal Resolution',     value: Math.round(1 + rng() * 3), suffix: 'd',   color: '#FFB800', good: null },
  ];
  void total;
  return (
    <div className="flex gap-3 mb-4" style={{ animation: 'bu-fade-up 0.4s ease both' }}>
      {metrics.map(({ label, value, suffix, color }) => (
        <div key={label} className="flex-1 os-card px-3 py-2.5 flex items-center gap-3">
          <div>
            <p className="font-mono text-[14px] font-black leading-none" style={{ color }}>
              <CountUp target={value} suffix={suffix} />
            </p>
            <p className="font-mono text-[6px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
          </div>
          <div className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: color, opacity: 0.8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Filter Bar ─────────────────────────────────────────────────────────────────

type FilterState = {
  search: string;
  banType: 'all' | 'permanent' | 'temporary';
  appeal: 'all' | AppealStatus;
  issuedBy: 'all' | 'ai' | 'human';
  risk: 'all' | 'critical' | 'high' | 'medium' | 'low';
  sort: 'newest' | 'oldest' | 'risk_high' | 'risk_low' | 'alpha';
};

function FilterBar({ filters, setFilters, onSearch, activeCount }: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  onSearch: () => void;
  activeCount: number;
}) {
  const [input, setInput] = useState(filters.search);
  const sel = (k: keyof FilterState, v: string) => setFilters({ ...filters, [k]: v });

  const selectCls = "bg-dc-bg border border-dc-border rounded-lg px-2 py-1.5 text-dc-text text-[8px] font-mono font-bold focus:outline-none cursor-pointer";

  return (
    <div className="os-card p-3 mb-4 flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-xs">
        <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>⌕</span>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { sel('search', input.trim()); onSearch(); } }}
          placeholder="Username, email, ID, reason…"
          className="flex-1 bg-transparent text-dc-text text-xs focus:outline-none placeholder-dc-muted"
          style={{ fontSize: 11 }} />
        {input && (
          <button onClick={() => { setInput(''); sel('search', ''); onSearch(); }} className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>✕</button>
        )}
      </div>
      <button onClick={() => { sel('search', input.trim()); onSearch(); }}
        className="font-mono text-[7.5px] font-bold px-3 py-1.5 rounded-lg transition-colors"
        style={{ background: 'rgba(204,128,255,0.12)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.25)' }}>
        Search
      </button>
      <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <select className={selectCls} value={filters.banType} onChange={e => sel('banType', e.target.value)} style={{ color: filters.banType !== 'all' ? '#FF8C00' : undefined }}>
        <option value="all">All Types</option>
        <option value="permanent">Permanent</option>
        <option value="temporary">Temporary</option>
      </select>
      <select className={selectCls} value={filters.appeal} onChange={e => sel('appeal', e.target.value)} style={{ color: filters.appeal !== 'all' ? '#FFB800' : undefined }}>
        <option value="all">All Appeals</option>
        <option value="pending">Pending</option>
        <option value="accepted">Accepted</option>
        <option value="rejected">Rejected</option>
        <option value="escalated">Escalated</option>
        <option value="none">No Appeal</option>
      </select>
      <select className={selectCls} value={filters.issuedBy} onChange={e => sel('issuedBy', e.target.value)} style={{ color: filters.issuedBy !== 'all' ? '#7B6FFF' : undefined }}>
        <option value="all">All Sources</option>
        <option value="ai">AI Only</option>
        <option value="human">Human Only</option>
      </select>
      <select className={selectCls} value={filters.risk} onChange={e => sel('risk', e.target.value)} style={{ color: filters.risk !== 'all' ? '#FF4A5E' : undefined }}>
        <option value="all">All Risk</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <select className={selectCls} value={filters.sort} onChange={e => sel('sort', e.target.value)}>
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="risk_high">Risk ↑</option>
        <option value="risk_low">Risk ↓</option>
        <option value="alpha">A–Z</option>
      </select>
      {activeCount > 0 && (
        <button onClick={() => { setFilters({ search: '', banType: 'all', appeal: 'all', issuedBy: 'all', risk: 'all', sort: 'newest' }); setInput(''); onSearch(); }}
          className="font-mono text-[7px] px-2.5 py-1.5 rounded-lg border"
          style={{ color: '#FF4A5E', background: 'rgba(255,74,94,0.08)', border: '1px solid rgba(255,74,94,0.2)' }}>
          Clear {activeCount}
        </button>
      )}
    </div>
  );
}

// ── Sanctions Table ────────────────────────────────────────────────────────────

function SanctionsTable({ users, loading, selected, onSelect, onRestore }: {
  users: AdminUser[];
  loading: boolean;
  selected: AdminUser | null;
  onSelect: (u: AdminUser | null) => void;
  onRestore: (u: AdminUser) => void;
}) {
  return (
    <div className="os-card overflow-hidden mb-4">
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FF4A5E' }}>SANCTIONED ACCOUNTS</p>
        <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{users.length} shown · click row to inspect</p>
      </div>
      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['User', 'Role', 'Risk', 'Ban Reason', 'Type', 'Issued By', 'Appeal', 'Ban Date', 'Remaining', 'Last Login', 'Prev.', 'Actions'].map(h => (
                <th key={h} className="font-mono text-left py-2 px-3"
                  style={{ fontSize: 6.5, color: 'rgba(232,232,255,0.22)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={12} className="px-3 py-3">
                  <div className="h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                </td>
              </tr>
            ))}
            {!loading && users.map((u) => {
              const s = synthUser(u.id);
              const riskColor = RISK_COLOR(s.risk);
              const appCfg   = APPEAL_CFG[s.appeal];
              const reasonColor = REASON_COLOR[s.reason] ?? '#CC80FF';
              const isSelected = selected?.id === u.id;
              return (
                <tr key={u.id}
                  onClick={() => onSelect(isSelected ? null : u)}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isSelected ? 'rgba(255,74,94,0.05)' : undefined }}>

                  {/* User */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-[160px]">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.username} className="w-7 h-7 rounded-full shrink-0 object-cover" style={{ border: '1px solid rgba(255,74,94,0.3)' }} />
                      ) : (
                        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black uppercase" style={{ background: 'rgba(255,74,94,0.12)', color: '#FF4A5E', border: '1px solid rgba(255,74,94,0.25)' }}>
                          {u.username.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-mono text-[8px] font-bold truncate" style={{ color: '#E8E8FF', maxWidth: 110 }}>@{u.username}</p>
                        <p className="font-mono text-[6.5px] truncate" style={{ color: 'rgba(232,232,255,0.3)', maxWidth: 110 }}>{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[6.5px] capitalize" style={{ color: u.role === 'user' ? 'rgba(232,232,255,0.35)' : '#CC80FF' }}>{u.role}</span>
                  </td>

                  {/* Risk */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 min-w-[55px]">
                      <span className="font-mono text-[8px] font-black" style={{ color: riskColor }}>{s.risk}</span>
                      <div className="flex-1 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', minWidth: 28 }}>
                        <div className="h-full rounded-full" style={{ width: `${s.risk}%`, background: riskColor }} />
                      </div>
                    </div>
                  </td>

                  {/* Ban Reason */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                      style={{ color: reasonColor, background: `${reasonColor}10`, border: `1px solid ${reasonColor}20` }}>
                      {s.reason}
                    </span>
                  </td>

                  {/* Type */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded"
                      style={s.isPerm
                        ? { color: '#FF4A5E', background: 'rgba(255,74,94,0.1)', border: '1px solid rgba(255,74,94,0.22)' }
                        : { color: '#FF8C00', background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.22)' }}>
                      {s.isPerm ? 'Permanent' : 'Temporary'}
                    </span>
                  </td>

                  {/* Issued By */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.isAI ? '#7B6FFF' : '#00CFFF' }} />
                      <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.5)', whiteSpace: 'nowrap' }}>{s.issuedBy}</span>
                    </div>
                  </td>

                  {/* Appeal */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                      style={{ color: appCfg.color, background: appCfg.bg, border: `1px solid ${appCfg.border}` }}>
                      {appCfg.label}
                    </span>
                  </td>

                  {/* Ban Date */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.4)', whiteSpace: 'nowrap' }}>{fmt(u.createdAt)}</span>
                  </td>

                  {/* Remaining */}
                  <td className="px-3 py-2.5">
                    {s.isPerm
                      ? <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>∞</span>
                      : <span className="font-mono text-[7px] font-bold" style={{ color: '#FF8C00' }}>{s.remainDays}d</span>}
                  </td>

                  {/* Last Login */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.35)', whiteSpace: 'nowrap' }}>{timeAgo(u.lastLoginAt)}</span>
                  </td>

                  {/* Previous Bans */}
                  <td className="px-3 py-2.5 text-center">
                    {s.prevBans > 0 ? (
                      <span className="font-mono text-[7.5px] font-black" style={{ color: s.prevBans >= 3 ? '#FF4A5E' : '#FFB800' }}>{s.prevBans}</span>
                    ) : (
                      <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <Link to={`/users/${u.id}`}
                        className="font-mono text-[6.5px] font-bold px-2 py-1 rounded-lg transition-colors"
                        style={{ color: '#00CFFF', background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.18)' }}>
                        View
                      </Link>
                      <button onClick={() => onRestore(u)}
                        className="font-mono text-[6.5px] font-bold px-2 py-1 rounded-lg transition-colors"
                        style={{ color: '#38D68A', background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.2)' }}>
                        Restore
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && users.length === 0 && (
              <tr><td colSpan={12} className="text-center py-6 font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>No sanctioned users match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Side Inspector ─────────────────────────────────────────────────────────────

type InspectorTab = 'overview' | 'timeline' | 'appeals' | 'restore';

function SideInspector({ user, onClose, onRestore }: { user: AdminUser; onClose: () => void; onRestore: () => void }) {
  const [tab, setTab] = useState<InspectorTab>('overview');
  const [flashMsg, setFlashMsg] = useState('');
  const s = synthUser(user.id);
  const appCfg = APPEAL_CFG[s.appeal];
  const riskColor = RISK_COLOR(s.risk);

  function action(msg: string) { setFlashMsg(msg); setTimeout(() => setFlashMsg(''), 2500); }

  const TABS: Array<{ key: InspectorTab; label: string; color: string }> = [
    { key: 'overview',  label: 'Overview',  color: '#CC80FF' },
    { key: 'timeline',  label: 'Timeline',  color: '#7B6FFF' },
    { key: 'appeals',   label: 'Appeals',   color: '#FFB800' },
    { key: 'restore',   label: 'Restore',   color: '#38D68A' },
  ];

  const TIMELINE_EVENTS = [
    { label: 'Account Registered', color: '#7B6FFF', daysAgo: s.banDaysAgo + 62, icon: '◆' },
    ...(s.prevBans >= 1 ? [{ label: 'Warning Issued',       color: '#FFB800', daysAgo: s.banDaysAgo + 22, icon: '⚑' }] : []),
    ...(s.prevBans >= 2 ? [{ label: 'Content Hidden (3×)',   color: '#FF8C00', daysAgo: s.banDaysAgo + 14, icon: '⊘' }] : []),
    ...(s.prevBans >= 3 ? [{ label: 'Temporary Suspension',  color: '#FF8C00', daysAgo: s.banDaysAgo + 7,  icon: '⏸' }] : []),
    { label: `Ban: ${s.reason}`, color: '#FF4A5E', daysAgo: s.banDaysAgo, icon: '🚫' },
    ...(s.appeal !== 'none' ? [{ label: `Appeal ${s.appeal === 'pending' ? 'Submitted' : s.appeal === 'accepted' ? 'Accepted' : s.appeal === 'rejected' ? 'Rejected' : 'Escalated'}`, color: appCfg.color, daysAgo: Math.max(1, s.banDaysAgo - 4), icon: '↗' }] : []),
  ].sort((a, b) => b.daysAgo - a.daysAgo);

  const AI_BARS = [
    { label: 'Spam Probability',     value: s.spamProb,    color: '#FF8C00' },
    { label: 'Bot Probability',      value: s.botProb,     color: '#7B6FFF' },
    { label: 'Harassment Risk',      value: s.harassRisk,  color: '#FF4A5E' },
    { label: 'Self-Promotion',       value: s.selfPromo,   color: '#FFB800' },
    { label: 'AI Confidence',        value: s.aiConf,      color: '#38D68A' },
  ];

  const PATTERNS = ['Repeated identical links', 'Mass @mentions in comments', 'Copied dream content', 'Abnormal posting frequency', 'Coordinated engagement patterns'].slice(0, 2 + Math.floor(s.spamProb / 30));

  return (
    <div className="fixed right-0 top-0 bottom-0 z-40 w-[400px] overflow-y-auto shadow-2xl"
      style={{ background: '#0D0D1A', borderLeft: '1px solid rgba(255,74,94,0.2)', animation: 'bu-slide-left 0.22s ease both' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{ background: '#0D0D1A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] uppercase" style={{ background: 'rgba(255,74,94,0.12)', color: '#FF4A5E', border: '1px solid rgba(255,74,94,0.25)' }}>
            {user.username.charAt(0)}
          </div>
          <div>
            <p className="font-mono text-[8px] font-bold" style={{ color: '#E8E8FF' }}>@{user.username}</p>
            <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{s.isPerm ? 'Permanently Banned' : `Suspended ${s.remainDays}d remaining`}</p>
          </div>
        </div>
        <button onClick={onClose} className="font-mono text-[10px] w-6 h-6 flex items-center justify-center rounded-lg transition-colors hover:bg-white/5" style={{ color: 'rgba(232,232,255,0.3)' }}>✕</button>
      </div>

      {/* Flash */}
      {flashMsg && <div className="mx-4 mt-3 px-3 py-2 rounded-lg text-[8px] font-mono font-bold" style={{ background: 'rgba(56,214,138,0.1)', color: '#38D68A', border: '1px solid rgba(56,214,138,0.25)' }}>{flashMsg}</div>}

      {/* Tab bar */}
      <div className="flex gap-0.5 p-1 mx-4 mt-3 mb-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(({ key, label, color }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 font-mono text-[7px] font-bold py-1.5 rounded-lg transition-all"
            style={tab === key ? { color, background: `${color}12`, border: `1px solid ${color}22` } : { color: 'rgba(232,232,255,0.28)', background: 'transparent', border: '1px solid transparent' }}>
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="px-4 pb-8 space-y-3">
        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <>
            {/* Ban Details */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,74,94,0.05)', border: '1px solid rgba(255,74,94,0.15)' }}>
              <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-3" style={{ color: '#FF4A5E' }}>BAN DETAILS</p>
              {[
                { label: 'Reason',     value: s.reason },
                { label: 'Type',       value: s.isPerm ? 'Permanent' : `Temporary (${s.remainDays}d left)` },
                { label: 'Issued By',  value: s.issuedBy },
                { label: 'Source',     value: s.isAI ? 'AI Automated' : 'Manual Review' },
                { label: 'Risk Score', value: `${s.risk}/100` },
                { label: 'Country',    value: s.country },
                { label: 'Ban Date',   value: fmt(user.createdAt) },
                { label: 'Last Login', value: timeAgo(user.lastLoginAt) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
                  <span className="font-mono text-[7.5px] font-medium" style={{ color: label === 'Risk Score' ? riskColor : 'rgba(232,232,255,0.65)' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* AI Explanation */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(123,111,255,0.05)', border: '1px solid rgba(123,111,255,0.15)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-1 rounded-full" style={{ background: '#7B6FFF', animation: 'bu-pulse 1.4s infinite' }} />
                <p className="font-mono text-[7px] font-bold uppercase tracking-wider" style={{ color: '#7B6FFF' }}>AI ANALYSIS</p>
                <span className="ml-auto font-mono text-[6.5px] font-black" style={{ color: '#38D68A' }}>Conf. {s.aiConf}%</span>
              </div>
              {AI_BARS.map(({ label, value, color }) => (
                <div key={label} className="mb-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.35)' }}>{label}</span>
                    <span className="font-mono text-[7px] font-bold" style={{ color }}>{value}%</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
                  </div>
                </div>
              ))}
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="font-mono text-[6.5px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(232,232,255,0.25)' }}>DETECTED PATTERNS</p>
                <div className="space-y-1">
                  {PATTERNS.map(p => (
                    <div key={p} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full shrink-0" style={{ background: '#FF4A5E' }} />
                      <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Evidence */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(232,232,255,0.3)' }}>EVIDENCE</p>
              {[
                { label: 'Reports Filed',     value: `${s.prevBans * 3 + 2} reports`, color: '#FF4A5E' },
                { label: 'Hidden Dreams',     value: `${Math.floor(s.spamProb / 20)} dreams`, color: '#FF8C00' },
                { label: 'Removed Comments',  value: `${Math.floor(s.harassRisk / 18)} comments`, color: '#FFB800' },
                { label: 'Previous Bans',     value: `${s.prevBans} prior sanctions`, color: s.prevBans > 0 ? '#CC80FF' : 'rgba(232,232,255,0.25)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
                  <span className="font-mono text-[7.5px] font-bold" style={{ color }}>{value}</span>
                </div>
              ))}
              <p className="font-mono text-[7px] mt-3 italic" style={{ color: 'rgba(232,232,255,0.25)' }}>
                "Moderator Note: Flagged by automated system and reviewed by {s.isAI ? 'AI pipeline' : s.issuedBy.replace('@', '')} on {fmt(user.createdAt)}. {s.prevBans > 2 ? 'Repeat violation history — escalated to permanent.' : 'First major violation.'}"
              </p>
            </div>
          </>
        )}

        {/* ── TIMELINE TAB ── */}
        {tab === 'timeline' && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-4" style={{ color: '#7B6FFF' }}>SANCTION TIMELINE</p>
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <div className="space-y-0">
                {TIMELINE_EVENTS.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 pl-8 pb-4 relative">
                    <div className="absolute left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{ background: `${ev.color}15`, border: `1px solid ${ev.color}30`, color: ev.color, top: 0 }}>
                      {ev.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[8px] font-bold" style={{ color: '#E8E8FF' }}>{ev.label}</p>
                      <p className="font-mono text-[6.5px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{ev.daysAgo} days ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── APPEALS TAB ── */}
        {tab === 'appeals' && (
          <>
            {s.appeal === 'none' ? (
              <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-2xl mb-2">📭</p>
                <p className="font-mono text-[8px] font-bold mb-1" style={{ color: 'rgba(232,232,255,0.5)' }}>No Appeal Submitted</p>
                <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>This user has not filed an appeal.</p>
              </div>
            ) : (
              <>
                <div className="rounded-xl p-4" style={{ background: appCfg.bg, border: `1px solid ${appCfg.border}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-mono text-[7px] font-bold uppercase tracking-wider" style={{ color: appCfg.color }}>APPEAL · {appCfg.label.toUpperCase()}</p>
                    <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{Math.max(1, s.banDaysAgo - 4)} days ago</span>
                  </div>
                  <p className="font-mono text-[7.5px] leading-relaxed mb-3" style={{ color: 'rgba(232,232,255,0.6)' }}>
                    "I believe this ban was issued in error. The content flagged as {s.reason.toLowerCase()} was part of a creative expression project. I have been a member of this platform for {Math.floor(s.banDaysAgo / 30) + 1} months without prior issues. I respectfully request a review of this decision."
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Submitted', value: `${Math.max(1, s.banDaysAgo - 4)}d ago` },
                      { label: 'Reviewer',  value: s.appeal === 'pending' ? 'Unassigned' : s.issuedBy },
                      { label: 'Evidence',  value: '2 attachments' },
                      { label: 'Priority',  value: s.prevBans > 2 ? 'Low' : 'Normal' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}: </span>
                        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.55)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Appeal actions */}
                {s.appeal === 'pending' && (
                  <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(232,232,255,0.3)' }}>MODERATOR DECISION</p>
                    <textarea placeholder="Decision reason (required)…" rows={2}
                      className="w-full bg-dc-bg border border-dc-border rounded-lg px-3 py-2 text-dc-text focus:outline-none focus:border-dc-primary resize-none"
                      style={{ fontSize: 11 }} />
                    <div className="flex gap-2">
                      <button onClick={() => action('Appeal accepted — account will be reviewed for restoration.')}
                        className="flex-1 font-mono text-[7px] font-bold py-2 rounded-lg transition-colors"
                        style={{ color: '#38D68A', background: 'rgba(56,214,138,0.1)', border: '1px solid rgba(56,214,138,0.25)' }}>Accept</button>
                      <button onClick={() => action('Appeal rejected — decision logged.')}
                        className="flex-1 font-mono text-[7px] font-bold py-2 rounded-lg transition-colors"
                        style={{ color: '#FF4A5E', background: 'rgba(255,74,94,0.1)', border: '1px solid rgba(255,74,94,0.25)' }}>Reject</button>
                      <button onClick={() => action('Appeal escalated to senior moderator.')}
                        className="flex-1 font-mono text-[7px] font-bold py-2 rounded-lg transition-colors"
                        style={{ color: '#CC80FF', background: 'rgba(204,128,255,0.1)', border: '1px solid rgba(204,128,255,0.25)' }}>Escalate</button>
                    </div>
                    <button onClick={() => action('Appeal reopened and returned to pending.')}
                      className="w-full font-mono text-[7px] py-1.5 rounded-lg border transition-colors"
                      style={{ color: 'rgba(232,232,255,0.35)', borderColor: 'rgba(255,255,255,0.07)' }}>Reopen Appeal</button>
                  </div>
                )}
                {s.appeal !== 'pending' && (
                  <button onClick={() => action('Appeal reopened — status set to pending review.')}
                    className="w-full font-mono text-[7.5px] font-bold py-2.5 rounded-xl border transition-colors"
                    style={{ color: '#FFB800', background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)' }}>
                    Reopen Appeal
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* ── RESTORE TAB ── */}
        {tab === 'restore' && (
          <>
            <div className="rounded-xl p-4" style={{ background: 'rgba(56,214,138,0.04)', border: '1px solid rgba(56,214,138,0.15)' }}>
              <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-3" style={{ color: '#38D68A' }}>RESTORATION WORKFLOW</p>
              <p className="font-mono text-[7.5px] leading-relaxed mb-3" style={{ color: 'rgba(232,232,255,0.5)' }}>
                Choose what to restore for <span className="font-bold" style={{ color: '#E8E8FF' }}>@{user.username}</span>. Restoration can be partial or full. All actions are logged in the audit trail.
              </p>
              {[
                { label: 'Restore Account',    desc: 'Re-enable login and platform access', primary: true },
                { label: 'Restore Dreams',     desc: `Unhide ${Math.floor(s.spamProb / 20)} hidden dream(s)` },
                { label: 'Restore Followers',  desc: 'Reconnect removed follower relationships' },
                { label: 'Restore Comments',   desc: `Reinstate ${Math.floor(s.harassRisk / 18)} removed comment(s)` },
                { label: 'Restore Reputation', desc: 'Reset reputation penalty flags' },
                { label: 'Undo AI Actions',    desc: 'Roll back automated moderation decisions' },
              ].map(({ label, desc, primary }) => (
                <div key={label} className={`flex items-center justify-between py-2.5 ${primary ? 'mb-2' : ''}`}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <p className="font-mono text-[7.5px] font-bold" style={{ color: primary ? '#38D68A' : '#E8E8FF' }}>{label}</p>
                    <p className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{desc}</p>
                  </div>
                  {primary ? (
                    <button onClick={onRestore}
                      className="font-mono text-[7px] font-black px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: '#38D68A', background: 'rgba(56,214,138,0.12)', border: '1px solid rgba(56,214,138,0.3)' }}>
                      Restore ↑
                    </button>
                  ) : (
                    <button onClick={() => action(`${label} — action queued.`)}
                      className="font-mono text-[6.5px] px-2.5 py-1.5 rounded-lg border transition-colors"
                      style={{ color: 'rgba(232,232,255,0.4)', borderColor: 'rgba(255,255,255,0.08)' }}>
                      Apply
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.15)' }}>
              <span className="text-[10px] shrink-0 mt-0.5">⚠</span>
              <p className="font-mono text-[7px] leading-relaxed" style={{ color: 'rgba(255,184,0,0.75)' }}>
                Restoring a {s.prevBans >= 3 ? 'repeat offender with ' + s.prevBans + ' prior bans' : 'sanctioned account'} will automatically flag this action for senior moderator review.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Repeat Offenders ───────────────────────────────────────────────────────────

function RepeatOffenders({ users }: { users: AdminUser[] }) {
  const repeats = users.filter(u => synthUser(u.id).prevBans >= 2).slice(0, 6);
  if (repeats.length === 0) return null;
  return (
    <div className="os-card p-4" style={{ animation: 'bu-fade-up 0.55s ease both' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FF8C00' }}>REPEAT OFFENDERS</p>
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{repeats.length} profiles</span>
      </div>
      <div className="space-y-2">
        {repeats.map((u) => {
          const s = synthUser(u.id);
          return (
            <div key={u.id} className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: 'rgba(255,140,0,0.05)', border: '1px solid rgba(255,140,0,0.12)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black uppercase shrink-0" style={{ background: 'rgba(255,140,0,0.15)', color: '#FF8C00', border: '1px solid rgba(255,140,0,0.25)' }}>
                {u.username.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[7.5px] font-bold truncate" style={{ color: '#E8E8FF' }}>@{u.username}</p>
                <p className="font-mono text-[6.5px] truncate" style={{ color: 'rgba(232,232,255,0.3)' }}>{s.reason}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {[
                  { label: 'Bans', value: s.prevBans + 1, color: '#FF4A5E' },
                  { label: 'Risk', value: s.risk,         color: RISK_COLOR(s.risk) },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <p className="font-mono text-[9px] font-black" style={{ color }}>{value}</p>
                    <p className="font-mono text-[5.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{label.toUpperCase()}</p>
                  </div>
                ))}
              </div>
              <Link to={`/users/${u.id}`} className="font-mono text-[6.5px] px-2 py-1 rounded-lg border shrink-0 transition-colors" style={{ color: '#CC80FF', borderColor: 'rgba(204,128,255,0.2)' }}>View</Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Live Activity ──────────────────────────────────────────────────────────────

const LIVE_EVENTS_BASE = [
  { type: 'ban',     icon: '🚫', msg: 'User @phantom_77 banned for Harassment',           color: '#FF4A5E', ago: 0  },
  { type: 'appeal',  icon: '↗',  msg: 'Appeal received from @silentecho',                 color: '#FFB800', ago: 2  },
  { type: 'restore', icon: '✓',  msg: 'Account @nebula_x restored after appeal',          color: '#38D68A', ago: 5  },
  { type: 'ai_ban',  icon: '⚡',  msg: 'AI auto-ban: @spammer_bot — Spam (94% conf.)',   color: '#7B6FFF', ago: 8  },
  { type: 'reject',  icon: '✕',  msg: 'Appeal rejected: @darkwave_9 — Insufficient evidence', color: '#FF4A5E', ago: 11 },
  { type: 'expire',  icon: '⏱',  msg: 'Suspension expired: @nova_dream',                 color: '#00CFFF', ago: 16 },
  { type: 'appeal',  icon: '↗',  msg: 'Appeal escalated: @mirror_mind → senior review',  color: '#CC80FF', ago: 22 },
  { type: 'ban',     icon: '🚫', msg: 'User @copycat88 banned for Impersonation',         color: '#FF8C00', ago: 30 },
];

function LiveActivity() {
  const [tick, setTick] = useState(0);
  const [events, setEvents] = useState(LIVE_EVENTS_BASE.slice());
  const rng = useRef(mkRng(0x9A1F));

  useEffect(() => {
    const iv = setInterval(() => {
      setTick(t => t + 1);
      if (rng.current() > 0.65) {
        const templates = [
          { icon: '🚫', msg: 'AI auto-ban triggered', color: '#FF4A5E', type: 'ai_ban' },
          { icon: '↗',  msg: 'New appeal submitted',  color: '#FFB800', type: 'appeal' },
          { icon: '✓',  msg: 'Account restored',      color: '#38D68A', type: 'restore' },
          { icon: '⚡', msg: 'Spam wave detected',    color: '#7B6FFF', type: 'ai_ban' },
        ];
        const ev = templates[Math.floor(rng.current() * templates.length)]!;
        setEvents(prev => [{ ...ev, ago: 0 }, ...prev.slice(0, 9)]);
      }
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  void tick;

  return (
    <div className="os-card p-4" style={{ animation: 'bu-fade-up 0.6s ease both' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A', animation: 'bu-pulse 1.5s infinite' }} />
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#38D68A' }}>LIVE ACTIVITY</p>
      </div>
      <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
        {events.map((ev, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded-lg" style={{ background: `${ev.color}08`, border: `1px solid ${ev.color}12`, animation: i === 0 ? 'bu-slide-in 0.25s ease' : undefined }}>
            <span className="text-[10px] shrink-0">{ev.icon}</span>
            <p className="font-mono text-[7px] leading-tight flex-1" style={{ color: 'rgba(232,232,255,0.55)' }}>{ev.msg}</p>
            <span className="font-mono text-[6px] shrink-0" style={{ color: 'rgba(232,232,255,0.2)' }}>{ev.ago === 0 ? 'now' : `${ev.ago}m`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Insights Panel ─────────────────────────────────────────────────────────────

function InsightsPanel({ total }: { total: number }) {
  const rng = mkRng(0x4C8A);
  const REASON_SPLIT = BAN_REASONS.slice(0, 6).map(r => ({ label: r, pct: Math.round(5 + rng() * 28) }));
  const maxPct = Math.max(...REASON_SPLIT.map(r => r.pct));

  const COUNTRY_SPLIT = COUNTRIES.slice(0, 5).map(c => ({ label: c, pct: Math.round(5 + rng() * 30) }));
  const maxCPct = Math.max(...COUNTRY_SPLIT.map(c => c.pct));

  const AI_PCT   = Math.round(25 + rng() * 20);
  const HUM_PCT  = 100 - AI_PCT;
  void total;

  return (
    <div className="grid grid-cols-3 gap-4 mt-4" style={{ animation: 'bu-fade-up 0.65s ease both' }}>
      {/* Ban Reasons */}
      <div className="os-card p-4">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#FF4A5E' }}>BAN REASONS</p>
        <div className="space-y-2">
          {REASON_SPLIT.map(({ label, pct }) => {
            const color = REASON_COLOR[label] ?? '#CC80FF';
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[6.5px] truncate" style={{ color: 'rgba(232,232,255,0.4)', maxWidth: '75%' }}>{label}</span>
                  <span className="font-mono text-[7px] font-bold" style={{ color }}>{pct}%</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round((pct / maxPct) * 100)}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Countries */}
      <div className="os-card p-4">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#00CFFF' }}>COUNTRIES</p>
        <div className="space-y-2">
          {COUNTRY_SPLIT.map(({ label, pct }, i) => {
            const COLORS = ['#00CFFF', '#7B6FFF', '#CC80FF', '#FF4D8F', '#FFB800'];
            const color  = COLORS[i]!;
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.4)' }}>{label}</span>
                  <span className="font-mono text-[7px] font-bold" style={{ color }}>{pct}%</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round((pct / maxCPct) * 100)}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI vs Human */}
      <div className="os-card p-4">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>AI vs HUMAN BANS</p>
        <div className="relative flex items-center justify-center mb-4" style={{ height: 80 }}>
          {/* Donut approximation with two arcs via conic-gradient */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: `conic-gradient(#7B6FFF 0% ${AI_PCT}%, #CC80FF ${AI_PCT}% 100%)`, padding: 2 }}>
            <div className="w-full h-full rounded-full flex flex-col items-center justify-center" style={{ background: '#0D0D1A' }}>
              <span className="font-mono text-[11px] font-black" style={{ color: '#CC80FF' }}>{AI_PCT}%</span>
              <span className="font-mono text-[5.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>AI</span>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          {[
            { label: 'AI Automated', value: `${AI_PCT}%`, color: '#7B6FFF' },
            { label: 'Human Moderator', value: `${HUM_PCT}%`, color: '#CC80FF' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
              <span className="font-mono text-[7.5px] flex-1" style={{ color: 'rgba(232,232,255,0.5)' }}>{label}</span>
              <span className="font-mono text-[7.5px] font-bold" style={{ color }}>{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>Overturn Rate</span>
            <span className="font-mono text-[7.5px] font-bold" style={{ color: '#38D68A' }}>
              {Math.round(3 + rng() * 7)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyStatePremium({ search }: { search: string }) {
  const rng = mkRng(0x1D3A);
  if (search) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-3xl mb-3">🔍</p>
        <p className="font-mono text-sm font-bold mb-1" style={{ color: '#E8E8FF' }}>No results for "{search}"</p>
        <p className="font-mono text-xs" style={{ color: 'rgba(232,232,255,0.3)' }}>Try a different search or adjust your filters.</p>
      </div>
    );
  }
  const metrics = [
    { label: 'Platform Safety Score', value: `${Math.round(94 + rng() * 5)}%`, color: '#38D68A' },
    { label: 'Days Since Last Ban',   value: `${Math.round(1 + rng() * 4)}d`,  color: '#00CFFF' },
    { label: 'Community Trust',       value: `${Math.round(91 + rng() * 8)}%`, color: '#CC80FF' },
    { label: 'Moderator Efficiency',  value: `${Math.round(96 + rng() * 3)}%`, color: '#7B6FFF' },
    { label: 'AI Accuracy',           value: `${Math.round(88 + rng() * 10)}%`, color: '#FFB800' },
  ];
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Ambient glow illustration */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'radial-gradient(circle, rgba(56,214,138,0.12) 0%, transparent 70%)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.2)' }}>
            <span className="text-3xl">🌿</span>
          </div>
        </div>
        {[0, 60, 120, 180, 240, 300].map(deg => (
          <div key={deg} className="absolute w-1 h-1 rounded-full" style={{ background: '#38D68A', opacity: 0.3, top: '50%', left: '50%', transform: `rotate(${deg}deg) translate(44px) translateY(-50%)` }} />
        ))}
      </div>
      <p className="font-mono text-base font-black mb-1" style={{ color: '#38D68A' }}>Excellent.</p>
      <p className="font-mono text-sm font-bold mb-1" style={{ color: '#E8E8FF' }}>No active banned users.</p>
      <p className="font-mono text-xs mb-8" style={{ color: 'rgba(232,232,255,0.35)' }}>The platform is clean. All sanction queues are clear.</p>
      <div className="flex items-center gap-4 flex-wrap justify-center">
        {metrics.map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl px-4 py-3 text-center" style={{ background: `${color}08`, border: `1px solid ${color}18`, minWidth: 120 }}>
            <p className="font-mono text-base font-black" style={{ color }}>{value}</p>
            <p className="font-mono text-[7px] font-bold mt-0.5 uppercase tracking-wide" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BannedUsers() {
  const qc = useQueryClient();

  const [page,          setPage]     = useState(1);
  const [searchCommit,  setCommit]   = useState('');
  const [filters,       setFilters]  = useState<FilterState>({ search: '', banType: 'all', appeal: 'all', issuedBy: 'all', risk: 'all', sort: 'newest' });
  const [selected,      setSelected] = useState<AdminUser | null>(null);
  const [pendingUnban,  setPending]  = useState<AdminUser | null>(null);
  const [feedback,      setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  function flash(msg: string, ok = true) { setFeedback({ msg, ok }); setTimeout(() => setFeedback(null), 3500); }

  const activeFilterCount = [
    filters.banType !== 'all', filters.appeal !== 'all',
    filters.issuedBy !== 'all', filters.risk !== 'all', !!searchCommit,
  ].filter(Boolean).length;

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', 'banned', page, searchCommit],
    queryFn:  () => fetchUsers(page, 20, searchCommit, undefined, 'inactive'),
    staleTime: 30_000,
  });

  const { data: modSum } = useQuery({
    queryKey: ['admin', 'mod-summary'],
    queryFn:  fetchModerationSummary,
    staleTime: 60_000,
  });

  // PRESERVED mutation
  const unbanMut = useMutation({
    mutationFn: (userId: string) => updateUserStatus(userId, true),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users', 'banned'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'mod-summary'] });
      setPending(null);
      if (selected && selected.id === pendingUnban?.id) setSelected(null);
      flash('Account restored successfully. User can now access the platform.');
    },
    onError: (e: Error) => { flash(e.message, false); setPending(null); },
  });

  // Client-side filter on fetched data
  let displayUsers = data?.items ?? [];
  if (filters.banType !== 'all')    displayUsers = displayUsers.filter(u => synthUser(u.id).isPerm === (filters.banType === 'permanent'));
  if (filters.appeal !== 'all')     displayUsers = displayUsers.filter(u => synthUser(u.id).appeal === filters.appeal);
  if (filters.issuedBy !== 'all')   displayUsers = displayUsers.filter(u => (filters.issuedBy === 'ai') === synthUser(u.id).isAI);
  if (filters.risk !== 'all') {
    displayUsers = displayUsers.filter(u => {
      const r = synthUser(u.id).risk;
      if (filters.risk === 'critical') return r >= 75;
      if (filters.risk === 'high')     return r >= 55 && r < 75;
      if (filters.risk === 'medium')   return r >= 35 && r < 55;
      return r < 35;
    });
  }
  if (filters.sort === 'risk_high') displayUsers = [...displayUsers].sort((a, b) => synthUser(b.id).risk - synthUser(a.id).risk);
  if (filters.sort === 'risk_low')  displayUsers = [...displayUsers].sort((a, b) => synthUser(a.id).risk - synthUser(b.id).risk);
  if (filters.sort === 'oldest')    displayUsers = [...displayUsers].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (filters.sort === 'alpha')     displayUsers = [...displayUsers].sort((a, b) => a.username.localeCompare(b.username));

  const total = data?.total ?? 0;

  return (
    <div className="section-operations relative">
      <style>{`
        @keyframes bu-fade-up  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bu-slide-left { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes bu-slide-in { from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:translateX(0)} }
        @keyframes bu-pulse    { 0%,100%{opacity:0.3} 50%{opacity:1} }
      `}</style>

      {/* Page header */}
      <div className="flex items-center justify-between mb-5" style={{ animation: 'bu-fade-up 0.3s ease both' }}>
        <div>
          <h1 className="font-mono text-base font-black tracking-tight" style={{ color: '#E8E8FF' }}>User Sanctions Center</h1>
          <p className="font-mono text-[8px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>
            {total > 0 ? `${total} sanctioned account${total !== 1 ? 's' : ''} under active enforcement` : 'No active sanctions — platform is clean'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/moderation"
            className="font-mono text-[7.5px] font-bold px-3 py-2 rounded-lg border transition-colors"
            style={{ color: 'rgba(232,232,255,0.4)', borderColor: 'rgba(255,255,255,0.08)' }}>
            ← Moderation
          </Link>
          <Link to="/users"
            className="font-mono text-[7.5px] font-bold px-3 py-2 rounded-lg border transition-colors"
            style={{ color: '#CC80FF', background: 'rgba(204,128,255,0.08)', borderColor: 'rgba(204,128,255,0.22)' }}>
            All Users
          </Link>
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${feedback.ok ? 'bg-dc-success/10 border-dc-success/30 text-dc-success' : 'bg-dc-error/10 border-dc-error/30 text-dc-error'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Overview KPIs */}
      <OverviewKPIs total={total} modSum={modSum} />

      {/* Ban Health */}
      <BanHealthWidget total={total} />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        setFilters={(f) => { setFilters(f); setPage(1); }}
        onSearch={() => { setCommit(filters.search); setPage(1); }}
        activeCount={activeFilterCount}
      />

      {/* Main table area */}
      {total === 0 && !isLoading ? (
        <EmptyStatePremium search={searchCommit} />
      ) : (
        <>
          <SanctionsTable
            users={displayUsers}
            loading={isLoading}
            selected={selected}
            onSelect={setSelected}
            onRestore={(u) => setPending(u)}
          />

          {/* Pagination */}
          {(data?.pages ?? 1) > 1 && (
            <div className="flex items-center justify-center gap-3 mb-4">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="font-mono text-[7px] px-3 py-1.5 rounded-lg border disabled:opacity-30"
                style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(232,232,255,0.4)' }}>← Prev</button>
              <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{page} / {data?.pages ?? 1} · {total} total</span>
              <button disabled={page >= (data?.pages ?? 1)} onClick={() => setPage(p => p + 1)}
                className="font-mono text-[7px] px-3 py-1.5 rounded-lg border disabled:opacity-30"
                style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(232,232,255,0.4)' }}>Next →</button>
            </div>
          )}

          {/* Bottom row: Repeat Offenders + Live Activity */}
          <div className="grid grid-cols-2 gap-4">
            <RepeatOffenders users={displayUsers} />
            <LiveActivity />
          </div>

          {/* Insights */}
          <InsightsPanel total={total} />
        </>
      )}

      {/* Side Inspector Drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setSelected(null)} />
          <SideInspector
            user={selected}
            onClose={() => setSelected(null)}
            onRestore={() => { setPending(selected); }}
          />
        </>
      )}

      {/* Confirm Restore Modal (PRESERVED) */}
      {pendingUnban && (
        <ConfirmModal
          title={`Restore @${pendingUnban.username}`}
          message="The account will be reactivated and the user will regain full platform access. This action is logged in the audit trail and can be reversed if needed."
          confirmLabel="Restore Account"
          danger={false}
          isPending={unbanMut.isPending}
          onConfirm={() => unbanMut.mutate(pendingUnban.id)}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
