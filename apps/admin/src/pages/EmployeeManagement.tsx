import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '../api/admin.api';
import type { EmployeeEntry } from '../types/admin.types';

// ── Utilities ──────────────────────────────────────────────────────────────────

function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function hashStr(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function CountUp({ target, suffix = '', decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current; prev.current = target;
    const t0 = performance.now(); let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - t0) / 800, 1);
      setV(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{v.toFixed(decimals)}{suffix}</>;
}
function Sparkline({ values, color, w = 52, h = 20 }: { values: number[]; color: string; w?: number; h?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.1), min = Math.min(...values), range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - 2 - ((v - min) / range) * (h - 5)}`).join(' ');
  const last = values[values.length - 1]!;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h, flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.4} opacity={0.7} />
      <circle cx={(values.length - 1) * step} cy={h - 2 - ((last - min) / range) * (h - 5)} r={2} fill={color} />
    </svg>
  );
}
function fmt(s: string | null | undefined, withTime = false) {
  if (!s) return '—';
  const o: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) { o.hour = '2-digit'; o.minute = '2-digit'; }
  return new Date(s).toLocaleDateString('en-US', o);
}
function timeAgo(s: string | null | undefined): string {
  if (!s) return 'Never';
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<string, { label: string; color: string; dept: string }> = {
  super_admin:     { label: 'Super Admin',    color: '#FF4D8F', dept: 'Executive'    },
  admin:           { label: 'Admin',          color: '#CC80FF', dept: 'Executive'    },
  moderator:       { label: 'Moderator',      color: '#FFB800', dept: 'Moderation'   },
  analyst:         { label: 'Analyst',        color: '#38D68A', dept: 'Intelligence' },
  growth_manager:  { label: 'Growth Manager', color: '#FF8C00', dept: 'Growth'       },
  support_agent:   { label: 'Support',        color: '#00CFFF', dept: 'Support'      },
  finance_manager: { label: 'Finance',        color: '#7B6FFF', dept: 'Finance'      },
};

const STATUS_CFG = {
  online:  { label: 'Online',  color: '#38D68A' },
  away:    { label: 'Away',    color: '#FFB800' },
  busy:    { label: 'Busy',    color: '#FF4A5E' },
  offline: { label: 'Offline', color: 'rgba(232,232,255,0.22)' },
} as const;
type OnlineStatus = keyof typeof STATUS_CFG;

const TASKS = [
  'Reviewing moderation queue', 'Support ticket #4821', 'Appeal review: @darkwave',
  'AI signal analysis', 'Community health report', 'Dream quality review',
  'User risk assessment', 'Policy documentation', 'Team capacity planning', 'Onboarding review',
];
const SHIFT_OPTS = ['Morning', 'Afternoon', 'Night', 'Flexible'] as const;
const LANGUAGES  = ['English', 'Turkish', 'German', 'French', 'Spanish', 'Japanese', 'Portuguese'];

const PERMS_MATRIX: Record<string, boolean[]> = {
  super_admin:     [true, true, true, true, true, true, true, true, true, true, true, true],
  admin:           [true, true, true, true, true, false, true, true, true, true, true, false],
  moderator:       [true, false, true, true, false, false, false, false, false, false, false, false],
  analyst:         [true, false, false, true, false, false, false, false, false, false, false, false],
  growth_manager:  [true, false, false, true, true, false, false, true, false, false, false, false],
  support_agent:   [true, false, true, false, false, false, false, false, false, false, false, false],
  finance_manager: [true, false, false, true, true, true, false, false, false, false, false, false],
};

const PERM_LABELS = [
  'Dream Mgmt', 'User Mgmt', 'Moderation', 'Analytics',
  'Business', 'Finance', 'System', 'Settings', 'API', 'AI Control', 'Role Edit', 'Audit Logs',
];

const ACHIEVEMENT_POOL = [
  { key: 'top_mod',     label: 'Top Moderator',     icon: '◆', color: '#FFB800' },
  { key: 'fastest',     label: 'Fastest Responder',  icon: '⚡', color: '#00CFFF' },
  { key: 'accuracy',    label: 'Highest Accuracy',   icon: '✦', color: '#38D68A' },
  { key: 'guardian',    label: 'Community Guardian', icon: '◉', color: '#CC80FF' },
  { key: 'analyst',     label: 'Dream Analyst',      icon: '◎', color: '#7B6FFF' },
  { key: 'hero',        label: 'Support Hero',       icon: '♥', color: '#FF4D8F' },
  { key: 'security',    label: 'Security Expert',    icon: '⬡', color: '#FF4A5E' },
];

// ── Synthetic Data ─────────────────────────────────────────────────────────────

interface SynthData {
  status: OnlineStatus;
  dept: string;
  weeklyActions: number;
  casesSolved: number;
  avgResTime: number;
  accuracy: number;
  performance: number;
  permLevel: number;
  burnout: 'low' | 'medium' | 'high';
  shift: string;
  aiAgreement: number;
  task: string;
  timeOnline: number;
  openCases: number;
  pending: number;
  critical: number;
  languages: string[];
  achievements: typeof ACHIEVEMENT_POOL;
  perfSpark: number[];
}

function synthEmp(emp: EmployeeEntry): SynthData {
  const rng  = mkRng(hashStr(emp.id));
  const rs   = Array.from({ length: 20 }, () => rng());
  const statuses: OnlineStatus[] = ['online', 'online', 'online', 'away', 'busy', 'offline'];
  const status: OnlineStatus = emp.isActive ? (statuses[Math.floor(rs[0]! * statuses.length)] ?? 'offline') : 'offline';
  const accuracy  = Math.round(70 + rs[4]! * 29);
  const avgRes    = Math.round(3 + rs[3]! * 30);
  const casesSolved = Math.round(emp.actionCount * (0.35 + rs[2]! * 0.45));
  const achv: typeof ACHIEVEMENT_POOL = [];
  if (accuracy > 94) achv.push(ACHIEVEMENT_POOL[2]!);
  if (avgRes < 6)    achv.push(ACHIEVEMENT_POOL[1]!);
  if (emp.actionCount > 800) achv.push(ACHIEVEMENT_POOL[3]!);
  if (emp.role === 'moderator' && casesSolved > 400) achv.push(ACHIEVEMENT_POOL[0]!);
  if (emp.role === 'analyst')  achv.push(ACHIEVEMENT_POOL[4]!);
  if (emp.role === 'support_agent')  achv.push(ACHIEVEMENT_POOL[5]!);
  if (['super_admin', 'admin'].includes(emp.role)) achv.push(ACHIEVEMENT_POOL[6]!);
  const base = Math.round(58 + rs[5]! * 41);
  return {
    status,
    dept:          (ROLE_CFG[emp.role] ?? ROLE_CFG['moderator']!).dept,
    weeklyActions: Math.round(emp.actionsToday * (4.5 + rs[1]! * 3.5)),
    casesSolved,
    avgResTime:    avgRes,
    accuracy,
    performance:   base,
    permLevel:     Math.min(5, 1 + Math.floor(rs[6]! * 5)),
    burnout:       rs[7]! < 0.08 ? 'high' : rs[7]! < 0.28 ? 'medium' : 'low',
    shift:         SHIFT_OPTS[Math.floor(rs[8]! * 4)] ?? 'Flexible',
    aiAgreement:   Math.round(76 + rs[9]! * 23),
    task:          TASKS[Math.floor(rs[10]! * TASKS.length)] ?? TASKS[0]!,
    timeOnline:    Math.round(rs[11]! * 480),
    openCases:     Math.round(rs[12]! * 14),
    pending:       Math.round(rs[13]! * 7),
    critical:      Math.floor(rs[14]! * 3),
    languages:     LANGUAGES.slice(0, 1 + Math.floor(rs[15]! * 3)),
    achievements:  [...new Map(achv.map(a => [a.key, a])).values()].slice(0, 3),
    perfSpark:     Array.from({ length: 7 }, (_, i) => Math.round(base * (0.7 + rs[16 + (i % 4)]! * 0.45))),
  };
}

// ── Executive KPIs ─────────────────────────────────────────────────────────────

function ExecutiveKPIs({ employees }: { employees: EmployeeEntry[] }) {
  const synths   = employees.map(e => synthEmp(e));
  const total    = employees.length;
  const online   = synths.filter(s => s.status === 'online').length;
  const mods     = employees.filter(e => e.role === 'moderator').length;
  const support  = employees.filter(e => e.role === 'support_agent').length;
  const devs     = employees.filter(e => ['analyst', 'growth_manager'].includes(e.role)).length;
  const admins   = employees.filter(e => ['admin', 'super_admin'].includes(e.role)).length;
  const aiOps    = employees.filter(e => e.role === 'finance_manager').length; // placeholder
  const avgRes   = synths.length ? Math.round(synths.reduce((s, x) => s + x.avgResTime, 0) / synths.length) : 0;
  const open     = synths.reduce((s, x) => s + x.openCases, 0);
  const resolved = employees.reduce((s, e) => s + e.actionsToday, 0);
  const avgAcc   = synths.length ? Math.round(synths.reduce((s, x) => s + x.accuracy, 0) / synths.length) : 0;
  const avgPerf  = synths.length ? Math.round(synths.reduce((s, x) => s + x.performance, 0) / synths.length) : 0;
  const rng = mkRng(0x5B3E);
  const KPIS = [
    { label: 'Total Staff',       value: total,    color: '#CC80FF', spark: [8,9,10,10,11,11,total]   },
    { label: 'Online Now',        value: online,   color: '#38D68A', spark: [3,4,4,5,4,5,online]      },
    { label: 'Moderators',        value: mods,     color: '#FFB800', spark: [4,4,5,5,5,5,mods]        },
    { label: 'Support Team',      value: support,  color: '#00CFFF', spark: [2,2,3,3,3,3,support]     },
    { label: 'Developers',        value: devs,     color: '#38D68A', spark: [1,1,2,2,2,2,devs]        },
    { label: 'Administrators',    value: admins,   color: '#FF4D8F', spark: [1,1,1,2,2,2,admins]      },
    { label: 'AI Operators',      value: aiOps || Math.round(rng() * 3), color: '#7B6FFF', spark: [0,0,1,1,1,1,1] },
    { label: 'Avg Response Time', value: avgRes,   color: avgRes < 10 ? '#38D68A' : '#FFB800', suffix: 'm', spark: [18,15,14,12,11,10,avgRes] },
    { label: 'Open Assignments',  value: open,     color: '#FF8C00', spark: [20,22,18,24,21,22,open]  },
    { label: 'Resolved Today',    value: resolved, color: '#38D68A', spark: [80,90,95,100,110,120,resolved] },
    { label: 'Mod Accuracy',      value: avgAcc,   color: '#CC80FF', suffix: '%', spark: [80,82,85,85,87,88,avgAcc] },
    { label: 'Avg Performance',   value: avgPerf,  color: '#7B6FFF', spark: [70,72,74,76,76,78,avgPerf] },
  ];
  return (
    <div className="grid grid-cols-6 gap-2.5 mb-4" style={{ animation: 'wf-fade-up 0.35s ease both' }}>
      {KPIS.map(({ label, value, color, spark, suffix }, i) => (
        <div key={label} className="os-card p-3 flex flex-col gap-1.5" style={{ animation: `wf-fade-up 0.35s ${i * 0.04}s ease both`, borderColor: `${color}18` }}>
          <span className="font-mono text-[6px] font-bold uppercase tracking-widest" style={{ color: 'rgba(232,232,255,0.2)' }}>{label}</span>
          <div className="flex items-end justify-between">
            <span className="font-mono text-xl font-black leading-none" style={{ color }}>
              <CountUp target={value} suffix={suffix ?? ''} />
            </span>
            <Sparkline values={spark} color={color} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Team Health Widget ─────────────────────────────────────────────────────────

function TeamHealthWidget({ employees }: { employees: EmployeeEntry[] }) {
  const synths = employees.map(e => synthEmp(e));
  const rng    = mkRng(0x8A5F);
  const avail  = synths.length ? Math.round(synths.filter(s => s.status !== 'offline').length / synths.length * 100) : 0;
  const load   = synths.length ? Math.round(synths.reduce((s, x) => s + x.openCases, 0) / synths.length) : 0;
  const queue  = synths.reduce((s, x) => s + x.pending, 0);
  const burnHigh = synths.filter(s => s.burnout === 'high').length;
  const avgRes = synths.length ? Math.round(synths.reduce((s, x) => s + x.avgResTime, 0) / synths.length) : 0;
  const qual   = Math.round(84 + rng() * 12);

  const metrics = [
    { label: 'Staff Availability',    value: `${avail}%`,      color: avail > 70 ? '#38D68A' : '#FFB800' },
    { label: 'Current Workload',      value: `${load} tasks/person`, color: load > 8 ? '#FF4A5E' : '#FFB800' },
    { label: 'Avg Queue Size',        value: String(queue),    color: queue > 50 ? '#FF4A5E' : '#38D68A' },
    { label: 'Burnout Risk',          value: burnHigh > 0 ? `${burnHigh} at risk` : 'Low', color: burnHigh > 0 ? '#FF4A5E' : '#38D68A' },
    { label: 'Avg Resolution Time',   value: `${avgRes}m`,     color: avgRes < 12 ? '#38D68A' : '#FFB800' },
    { label: 'Response Quality',      value: `${qual}%`,       color: '#CC80FF' },
  ];

  return (
    <div className="flex gap-3 mb-4" style={{ animation: 'wf-fade-up 0.4s ease both' }}>
      {metrics.map(({ label, value, color }) => (
        <div key={label} className="flex-1 os-card px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-black leading-none" style={{ color }}>{value}</p>
            <p className="font-mono text-[6px] font-bold uppercase tracking-wider mt-0.5 truncate" style={{ color: 'rgba(232,232,255,0.2)' }}>{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Filter Bar ─────────────────────────────────────────────────────────────────

type FilterState = {
  search: string;
  role: string;
  dept: string;
  status: 'all' | OnlineStatus;
  performance: 'all' | 'excellent' | 'good' | 'poor';
  shift: 'all' | 'Morning' | 'Afternoon' | 'Night' | 'Flexible';
};

function FilterBar({ filters, setFilters }: { filters: FilterState; setFilters: (f: FilterState) => void }) {
  const [input, setInput] = useState(filters.search);
  const sel = (k: keyof FilterState, v: string) => setFilters({ ...filters, [k]: v });
  const cls = "bg-dc-bg border border-dc-border rounded-lg px-2 py-1.5 text-dc-text font-mono font-bold focus:outline-none cursor-pointer";
  const activeCount = [filters.role !== 'all', filters.dept !== 'all', filters.status !== 'all', filters.performance !== 'all', filters.shift !== 'all', !!filters.search].filter(Boolean).length;

  return (
    <div className="os-card px-3 py-2.5 mb-4 flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 flex-1 min-w-[180px] max-w-xs">
        <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>⌕</span>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sel('search', input.trim()); }}
          placeholder="Name, email, department…"
          className="flex-1 bg-transparent text-dc-text text-xs focus:outline-none placeholder-dc-muted" style={{ fontSize: 11 }} />
        {input && <button onClick={() => { setInput(''); sel('search', ''); }} className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>✕</button>}
      </div>
      <button onClick={() => sel('search', input.trim())}
        className="font-mono text-[7.5px] font-bold px-3 py-1.5 rounded-lg"
        style={{ background: 'rgba(204,128,255,0.12)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.25)' }}>
        Search
      </button>
      <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <select className={cls} style={{ fontSize: 8 }} value={filters.role} onChange={e => sel('role', e.target.value)}>
        <option value="all">All Roles</option>
        {Object.entries(ROLE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <select className={cls} style={{ fontSize: 8 }} value={filters.dept} onChange={e => sel('dept', e.target.value)}>
        <option value="all">All Depts</option>
        {['Executive', 'Moderation', 'Intelligence', 'Growth', 'Support', 'Finance'].map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select className={cls} style={{ fontSize: 8 }} value={filters.status} onChange={e => sel('status', e.target.value)}>
        <option value="all">All Status</option>
        <option value="online">Online</option>
        <option value="away">Away</option>
        <option value="busy">Busy</option>
        <option value="offline">Offline</option>
      </select>
      <select className={cls} style={{ fontSize: 8 }} value={filters.performance} onChange={e => sel('performance', e.target.value)}>
        <option value="all">All Performance</option>
        <option value="excellent">Excellent (90+)</option>
        <option value="good">Good (70–89)</option>
        <option value="poor">Needs Attention (&lt;70)</option>
      </select>
      <select className={cls} style={{ fontSize: 8 }} value={filters.shift} onChange={e => sel('shift', e.target.value)}>
        <option value="all">All Shifts</option>
        <option value="Morning">Morning</option>
        <option value="Afternoon">Afternoon</option>
        <option value="Night">Night</option>
        <option value="Flexible">Flexible</option>
      </select>
      {activeCount > 0 && (
        <button onClick={() => { setFilters({ search: '', role: 'all', dept: 'all', status: 'all', performance: 'all', shift: 'all' }); setInput(''); }}
          className="font-mono text-[7px] px-2.5 py-1.5 rounded-lg border"
          style={{ color: '#FF4A5E', background: 'rgba(255,74,94,0.08)', borderColor: 'rgba(255,74,94,0.2)' }}>
          Clear {activeCount}
        </button>
      )}
    </div>
  );
}

// ── Employee Table ─────────────────────────────────────────────────────────────

function EmployeeTable({ employees, selected, onSelect }: { employees: EmployeeEntry[]; selected: EmployeeEntry | null; onSelect: (e: EmployeeEntry | null) => void }) {
  return (
    <div className="os-card overflow-hidden mb-4">
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#CC80FF' }}>WORKFORCE ROSTER</p>
        <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{employees.length} staff · click row to inspect</p>
      </div>
      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Employee', 'Role', 'Status', 'Today', 'Weekly', 'Cases', 'Avg Res.', 'Accuracy', 'Performance', 'Last Login', 'Assignment', 'Actions'].map(h => (
                <th key={h} className="text-left font-mono py-2 px-3" style={{ fontSize: 6.5, color: 'rgba(232,232,255,0.22)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr><td colSpan={12} className="text-center py-10 font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.25)' }}>No staff match your filters.</td></tr>
            )}
            {employees.map((emp) => {
              const s   = synthEmp(emp);
              const rc  = ROLE_CFG[emp.role] ?? ROLE_CFG['moderator']!;
              const sc  = STATUS_CFG[s.status];
              const isSelected = selected?.id === emp.id;
              const burnColor = s.burnout === 'high' ? '#FF4A5E' : s.burnout === 'medium' ? '#FFB800' : undefined;

              return (
                <tr key={emp.id} onClick={() => onSelect(isSelected ? null : emp)}
                  className="cursor-pointer transition-colors hover:bg-white/[0.015]"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isSelected ? 'rgba(204,128,255,0.04)' : undefined }}>

                  {/* Employee */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-[160px]">
                      {emp.avatarUrl ? (
                        <img src={emp.avatarUrl} alt={emp.username} className="w-7 h-7 rounded-full shrink-0 object-cover" style={{ border: `1px solid ${rc.color}30` }} />
                      ) : (
                        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black uppercase" style={{ background: `${rc.color}14`, color: rc.color, border: `1px solid ${rc.color}28` }}>
                          {(emp.displayName ?? emp.username).charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono text-[8px] font-bold truncate" style={{ color: '#E8E8FF', maxWidth: 100 }}>{emp.displayName ?? `@${emp.username}`}</p>
                          {burnColor && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: burnColor }} title={`${s.burnout} burnout risk`} />}
                        </div>
                        <p className="font-mono text-[6.5px] truncate" style={{ color: 'rgba(232,232,255,0.3)', maxWidth: 110 }}>{emp.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap" style={{ color: rc.color, background: `${rc.color}12`, border: `1px solid ${rc.color}22` }}>{rc.label}</span>
                      <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{s.dept}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc.color, animation: s.status === 'online' ? 'wf-pulse 1.8s infinite' : undefined }} />
                      <span className="font-mono text-[7px] font-bold" style={{ color: sc.color }}>{sc.label}</span>
                    </div>
                  </td>

                  {/* Today */}
                  <td className="px-3 py-2.5 font-mono text-[8px] font-black text-center" style={{ color: emp.actionsToday > 0 ? '#38D68A' : 'rgba(232,232,255,0.3)' }}>
                    {emp.actionsToday}
                  </td>

                  {/* Weekly */}
                  <td className="px-3 py-2.5 font-mono text-[7.5px] font-bold text-center" style={{ color: '#CC80FF' }}>
                    {s.weeklyActions}
                  </td>

                  {/* Cases */}
                  <td className="px-3 py-2.5 font-mono text-[7.5px] font-bold text-center" style={{ color: '#00CFFF' }}>
                    {s.casesSolved.toLocaleString()}
                  </td>

                  {/* Avg resolution */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[7.5px] font-bold" style={{ color: s.avgResTime < 10 ? '#38D68A' : s.avgResTime < 20 ? '#FFB800' : '#FF4A5E' }}>{s.avgResTime}m</span>
                  </td>

                  {/* Accuracy */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[7.5px] font-black" style={{ color: s.accuracy >= 90 ? '#38D68A' : s.accuracy >= 78 ? '#FFB800' : '#FF4A5E' }}>{s.accuracy}%</span>
                      <div className="w-10 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${s.accuracy}%`, background: s.accuracy >= 90 ? '#38D68A' : '#FFB800' }} />
                      </div>
                    </div>
                  </td>

                  {/* Performance */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkline values={s.perfSpark} color={s.performance >= 80 ? '#38D68A' : '#FFB800'} w={40} h={16} />
                      <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.4)' }}>{s.performance}</span>
                    </div>
                  </td>

                  {/* Last Login */}
                  <td className="px-3 py-2.5 font-mono text-[7px] whitespace-nowrap" style={{ color: 'rgba(232,232,255,0.35)' }}>
                    {timeAgo(emp.lastLoginAt)}
                  </td>

                  {/* Current Assignment */}
                  <td className="px-3 py-2.5">
                    <p className="font-mono text-[6.5px] truncate" style={{ color: 'rgba(232,232,255,0.4)', maxWidth: 120 }}>{s.task}</p>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onSelect(isSelected ? null : emp)}
                        className="font-mono text-[6px] px-2 py-1 rounded-lg border transition-colors"
                        style={{ color: '#CC80FF', background: 'rgba(204,128,255,0.08)', borderColor: 'rgba(204,128,255,0.2)' }}>
                        Profile
                      </button>
                      <button className="font-mono text-[6px] px-2 py-1 rounded-lg border transition-colors"
                        style={{ color: 'rgba(232,232,255,0.3)', borderColor: 'rgba(255,255,255,0.07)' }}>
                        ···
                      </button>
                    </div>
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

// ── Profile Drawer ─────────────────────────────────────────────────────────────

type DrawerTab = 'profile' | 'performance' | 'workload' | 'permissions';

function ProfileDrawer({ emp, onClose, onFlash }: { emp: EmployeeEntry; onClose: () => void; onFlash: (msg: string) => void }) {
  const [tab, setTab] = useState<DrawerTab>('profile');
  const s   = synthEmp(emp);
  const rc  = ROLE_CFG[emp.role] ?? ROLE_CFG['moderator']!;
  const sc  = STATUS_CFG[s.status];
  const perms = PERMS_MATRIX[emp.role] ?? PERMS_MATRIX['moderator']!;

  const AI_REVIEW = s.performance >= 90
    ? 'Excellent moderation consistency. Decision quality is outstanding. Fast response time, high appeal accuracy.'
    : s.performance >= 75
    ? 'Good overall performance. Accuracy improving week-over-week. Slight increase in resolution time noted.'
    : s.burnout === 'high'
    ? 'Potential burnout detected. Response quality declining. Recommend reduced queue allocation and check-in.'
    : 'Performance is below target. Needs review. Recommend additional training and mentorship pairing.';

  const TIMELINE_EVENTS = [
    { icon: '◆', text: `Joined DreamCloud as ${rc.label}`, date: fmt(emp.createdAt), color: rc.color },
    ...(emp.actionsToday > 0 ? [{ icon: '✓', text: `${emp.actionsToday} moderation actions today`, date: 'Today', color: '#38D68A' }] : []),
    { icon: '⌂', text: `Last login from known device`, date: timeAgo(emp.lastLoginAt), color: '#00CFFF' },
    { icon: '⚑', text: `Currently working: ${s.task}`, date: 'Now', color: '#FFB800' },
  ];

  const TABS: Array<{ key: DrawerTab; label: string; color: string }> = [
    { key: 'profile',     label: 'Profile',     color: '#CC80FF' },
    { key: 'performance', label: 'Performance', color: '#38D68A' },
    { key: 'workload',    label: 'Workload',    color: '#00CFFF' },
    { key: 'permissions', label: 'Permissions', color: '#7B6FFF' },
  ];

  const PERF_METRICS = [
    { label: 'Actions Today',   value: emp.actionsToday, suffix: '',  color: '#38D68A' },
    { label: 'Weekly Actions',  value: s.weeklyActions,  suffix: '',  color: '#CC80FF' },
    { label: 'Cases Solved',    value: s.casesSolved,    suffix: '',  color: '#00CFFF' },
    { label: 'Avg Resolution',  value: s.avgResTime,     suffix: 'm', color: '#FFB800' },
    { label: 'Accuracy',        value: s.accuracy,       suffix: '%', color: s.accuracy >= 90 ? '#38D68A' : '#FFB800' },
    { label: 'AI Agreement',    value: s.aiAgreement,    suffix: '%', color: '#7B6FFF' },
    { label: 'Performance',     value: s.performance,    suffix: '',  color: s.performance >= 80 ? '#38D68A' : '#FFB800' },
    { label: 'Total Actions',   value: emp.actionCount,  suffix: '',  color: '#CC80FF' },
  ];

  return (
    <div className="fixed right-0 top-0 bottom-0 z-40 w-[420px] overflow-y-auto shadow-2xl"
      style={{ background: '#0D0D1A', borderLeft: '1px solid rgba(204,128,255,0.18)', animation: 'wf-slide-left 0.22s ease both' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ background: '#0D0D1A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          {emp.avatarUrl ? (
            <img src={emp.avatarUrl} alt={emp.username} className="w-9 h-9 rounded-xl object-cover shrink-0" style={{ border: `1px solid ${rc.color}30` }} />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm uppercase shrink-0" style={{ background: `${rc.color}14`, color: rc.color, border: `1px solid ${rc.color}28` }}>
              {(emp.displayName ?? emp.username).charAt(0)}
            </div>
          )}
          <div>
            <p className="font-mono text-[9px] font-black" style={{ color: '#E8E8FF' }}>{emp.displayName ?? emp.username}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
              <span className="font-mono text-[6.5px]" style={{ color: sc.color }}>{sc.label}</span>
              <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>·</span>
              <span className="font-mono text-[6.5px] font-bold" style={{ color: rc.color }}>{rc.label}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg font-mono text-[10px] hover:bg-white/5" style={{ color: 'rgba(232,232,255,0.3)' }}>✕</button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 p-1 mx-4 mt-4 mb-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(({ key, label, color }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 font-mono text-[7px] font-bold py-1.5 rounded-lg transition-all"
            style={tab === key ? { color, background: `${color}12`, border: `1px solid ${color}22` } : { color: 'rgba(232,232,255,0.28)', background: 'transparent', border: '1px solid transparent' }}>
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="px-4 pb-8 space-y-3">

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <>
            {/* Bio / Info */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(232,232,255,0.3)' }}>IDENTITY</p>
              {[
                { label: 'Email',       value: emp.email },
                { label: 'Username',    value: `@${emp.username}` },
                { label: 'Department',  value: s.dept },
                { label: 'Shift',       value: s.shift },
                { label: 'Languages',   value: s.languages.join(', ') },
                { label: 'Joined',      value: fmt(emp.createdAt) },
                { label: 'Last Login',  value: fmt(emp.lastLoginAt, true) },
                { label: 'Active',      value: emp.isActive ? 'Yes' : 'No' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
                  <span className="font-mono text-[7.5px] font-medium text-right" style={{ color: 'rgba(232,232,255,0.65)' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Achievements */}
            {s.achievements.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,184,0,0.04)', border: '1px solid rgba(255,184,0,0.14)' }}>
                <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-3" style={{ color: '#FFB800' }}>ACHIEVEMENTS</p>
                <div className="flex flex-wrap gap-2">
                  {s.achievements.map(a => (
                    <div key={a.key} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: `${a.color}10`, border: `1px solid ${a.color}25` }}>
                      <span style={{ color: a.color, fontSize: 10 }}>{a.icon}</span>
                      <span className="font-mono text-[7px] font-bold" style={{ color: a.color }}>{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Timeline */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(232,232,255,0.3)' }}>RECENT ACTIVITY</p>
              <div className="relative">
                <div className="absolute left-2.5 top-0 bottom-0 w-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                {TIMELINE_EVENTS.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 pl-7 pb-3 relative">
                    <div className="absolute left-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px]" style={{ background: `${ev.color}12`, border: `1px solid ${ev.color}25`, color: ev.color, top: 0 }}>{ev.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[7.5px] font-bold" style={{ color: '#E8E8FF' }}>{ev.text}</p>
                      <p className="font-mono text-[6.5px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{ev.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(232,232,255,0.3)' }}>QUICK ACTIONS</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Assign Queue', color: '#00CFFF' }, { label: 'Reset Password', color: '#FFB800' },
                  { label: 'Force Logout', color: '#FF8C00' }, { label: 'Export Activity', color: '#38D68A' },
                  { label: 'Transfer Dept', color: '#CC80FF' }, { label: 'Suspend Access', color: '#FF4A5E' },
                ].map(({ label, color }) => (
                  <button key={label} onClick={() => onFlash(`${label} — action logged.`)}
                    className="font-mono text-[6.5px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors"
                    style={{ color, background: `${color}08`, borderColor: `${color}22` }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── PERFORMANCE TAB ── */}
        {tab === 'performance' && (
          <>
            <div className="rounded-xl p-4" style={{ background: 'rgba(56,214,138,0.04)', border: '1px solid rgba(56,214,138,0.14)' }}>
              <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-3" style={{ color: '#38D68A' }}>PERFORMANCE METRICS</p>
              <div className="grid grid-cols-2 gap-2">
                {PERF_METRICS.map(({ label, value, suffix, color }) => (
                  <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="font-mono text-[13px] font-black" style={{ color }}>{value.toLocaleString()}{suffix}</p>
                    <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(232,232,255,0.3)' }}>WEEKLY PERFORMANCE TREND</p>
              <Sparkline values={s.perfSpark} color={s.performance >= 80 ? '#38D68A' : '#FFB800'} w={360} h={44} />
              <div className="flex items-center justify-between mt-2">
                <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>7 days ago</span>
                <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>Today: {s.perfSpark[s.perfSpark.length - 1]}</span>
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(123,111,255,0.05)', border: '1px solid rgba(123,111,255,0.15)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#7B6FFF', animation: 'wf-pulse 1.5s infinite' }} />
                <p className="font-mono text-[7px] font-bold uppercase tracking-wider" style={{ color: '#7B6FFF' }}>AI PERFORMANCE REVIEW</p>
              </div>
              <p className="font-mono text-[7.5px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.55)' }}>{AI_REVIEW}</p>
            </div>
            {s.burnout !== 'low' && (
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: s.burnout === 'high' ? 'rgba(255,74,94,0.07)' : 'rgba(255,184,0,0.06)', border: `1px solid ${s.burnout === 'high' ? 'rgba(255,74,94,0.2)' : 'rgba(255,184,0,0.15)'}` }}>
                <span className="text-[10px] shrink-0">⚠</span>
                <p className="font-mono text-[7px] leading-relaxed" style={{ color: s.burnout === 'high' ? 'rgba(255,74,94,0.8)' : 'rgba(255,184,0,0.75)' }}>
                  {s.burnout === 'high' ? 'Burnout risk detected. Consider reassigning workload and scheduling a 1:1 review.' : 'Moderate workload stress detected. Monitor closely over next 7 days.'}
                </p>
              </div>
            )}
          </>
        )}

        {/* ── WORKLOAD TAB ── */}
        {tab === 'workload' && (
          <>
            <div className="rounded-xl p-4" style={{ background: 'rgba(0,207,255,0.04)', border: '1px solid rgba(0,207,255,0.14)' }}>
              <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-3" style={{ color: '#00CFFF' }}>CURRENT QUEUE</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Open Cases',    value: s.openCases,    color: '#00CFFF' },
                  { label: 'Pending',       value: s.pending,      color: '#FFB800' },
                  { label: 'Critical',      value: s.critical,     color: s.critical > 0 ? '#FF4A5E' : '#38D68A' },
                  { label: 'Time Online',   value: s.timeOnline,   color: '#CC80FF', suffix: 'm' },
                ].map(({ label, value, color, suffix }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="font-mono text-base font-black" style={{ color }}>{value}{suffix ?? ''}</p>
                    <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(232,232,255,0.3)' }}>CURRENT ASSIGNMENT</p>
              <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#00CFFF', animation: 'wf-pulse 1.5s infinite' }} />
                  <p className="font-mono text-[8px] font-bold" style={{ color: '#E8E8FF' }}>{s.task}</p>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {[
                    { label: 'Shift', value: s.shift, color: '#FFB800' },
                    { label: 'Perm Level', value: `L${s.permLevel}`, color: '#CC80FF' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center gap-1">
                      <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}:</span>
                      <span className="font-mono text-[7px] font-bold" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(232,232,255,0.3)' }}>SHIFT SCHEDULE</p>
              {[
                { label: 'Current Shift', value: `${s.shift} Shift — Active` },
                { label: 'Next Shift',    value: 'Tomorrow, same window' },
                { label: 'Availability',  value: emp.isActive ? 'Available' : 'Inactive' },
                { label: 'Est. Finish',   value: `~${s.pending * s.avgResTime}m remaining` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
                  <span className="font-mono text-[7.5px] font-medium" style={{ color: 'rgba(232,232,255,0.65)' }}>{value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── PERMISSIONS TAB ── */}
        {tab === 'permissions' && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(123,111,255,0.2)' }}>
            <div className="px-4 py-3" style={{ background: 'rgba(123,111,255,0.08)', borderBottom: '1px solid rgba(123,111,255,0.15)' }}>
              <p className="font-mono text-[7px] font-bold uppercase tracking-wider" style={{ color: '#7B6FFF' }}>PERMISSION MATRIX — {rc.label.toUpperCase()}</p>
            </div>
            <div className="p-3 space-y-1.5">
              {PERM_LABELS.map((label, i) => {
                const hasPermission = perms[i] ?? false;
                return (
                  <div key={label} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.55)' }}>{label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-3.5 rounded-full flex items-center px-0.5 transition-all" style={{ background: hasPermission ? 'rgba(56,214,138,0.3)' : 'rgba(255,255,255,0.06)' }}>
                        <div className="w-2.5 h-2.5 rounded-full transition-all" style={{ background: hasPermission ? '#38D68A' : 'rgba(232,232,255,0.15)', transform: hasPermission ? 'translateX(14px)' : 'translateX(0)' }} />
                      </div>
                      <span className="font-mono text-[6.5px] font-bold w-8" style={{ color: hasPermission ? '#38D68A' : 'rgba(232,232,255,0.2)' }}>{hasPermission ? 'Granted' : 'Denied'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>Permission changes require super_admin approval and are logged in audit trail.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Team Analytics ─────────────────────────────────────────────────────────────

function TeamAnalytics({ employees }: { employees: EmployeeEntry[] }) {
  const synths = employees.map(e => synthEmp(e));
  const rng    = mkRng(0x6C1A);

  const depts = Object.entries(
    employees.reduce<Record<string, number>>((acc, e) => {
      const d = (ROLE_CFG[e.role] ?? ROLE_CFG['moderator']!).dept;
      acc[d] = (acc[d] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const maxDept = Math.max(...depts.map(([, c]) => c), 1);

  const DEPT_COLORS: Record<string, string> = { Executive: '#FF4D8F', Moderation: '#FFB800', Intelligence: '#38D68A', Growth: '#FF8C00', Support: '#00CFFF', Finance: '#7B6FFF' };

  const top5 = [...employees]
    .map((e, i) => ({ emp: e, s: synths[i]! }))
    .sort((a, b) => b.s.performance - a.s.performance)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      {/* Top performers */}
      <div className="os-card p-4" style={{ animation: 'wf-fade-up 0.6s ease both' }}>
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#38D68A' }}>TOP PERFORMERS</p>
        {employees.length === 0 ? <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>No data</p> : (
          <div className="space-y-2">
            {top5.map(({ emp, s }, rank) => {
              const rc = ROLE_CFG[emp.role] ?? ROLE_CFG['moderator']!;
              return (
                <div key={emp.id} className="flex items-center gap-2">
                  <span className="font-mono text-[8px] font-black w-4 shrink-0" style={{ color: rank < 3 ? '#FFB800' : 'rgba(232,232,255,0.25)' }}>#{rank + 1}</span>
                  <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-black uppercase" style={{ background: `${rc.color}12`, color: rc.color }}>
                    {(emp.displayName ?? emp.username).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[7.5px] font-bold truncate" style={{ color: '#E8E8FF' }}>{emp.displayName ?? emp.username}</p>
                    <div className="h-0.5 rounded-full mt-0.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full" style={{ width: `${s.performance}%`, background: '#38D68A' }} />
                    </div>
                  </div>
                  <span className="font-mono text-[8px] font-black shrink-0" style={{ color: '#38D68A' }}>{s.performance}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Department breakdown */}
      <div className="os-card p-4" style={{ animation: 'wf-fade-up 0.65s ease both' }}>
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>DEPARTMENTS</p>
        <div className="space-y-2">
          {depts.map(([dept, count]) => {
            const color = DEPT_COLORS[dept] ?? '#7B6FFF';
            return (
              <div key={dept}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{dept}</span>
                  <span className="font-mono text-[8px] font-black" style={{ color }}>{count}</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round((count / maxDept) * 100)}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key stats */}
      <div className="os-card p-4" style={{ animation: 'wf-fade-up 0.7s ease both' }}>
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#7B6FFF' }}>TEAM INTELLIGENCE</p>
        <div className="space-y-0">
          {[
            { label: 'Avg AI Agreement', value: synths.length ? `${Math.round(synths.reduce((s, x) => s + x.aiAgreement, 0) / synths.length)}%` : '—', color: '#7B6FFF' },
            { label: 'High Burnout Risk', value: String(synths.filter(s => s.burnout === 'high').length), color: '#FF4A5E' },
            { label: 'Night Shift Staff', value: String(synths.filter(s => s.shift === 'Night').length), color: '#CC80FF' },
            { label: 'Online Rate',      value: synths.length ? `${Math.round(synths.filter(s => s.status === 'online').length / synths.length * 100)}%` : '—', color: '#38D68A' },
            { label: 'Total Open Cases', value: String(synths.reduce((s, x) => s + x.openCases, 0)), color: '#FF8C00' },
            { label: 'Critical Cases',   value: String(synths.reduce((s, x) => s + x.critical, 0)), color: synths.some(s => s.critical > 0) ? '#FF4A5E' : '#38D68A' },
            { label: 'Avg Accuracy',     value: synths.length ? `${Math.round(synths.reduce((s, x) => s + x.accuracy, 0) / synths.length)}%` : '—', color: '#00CFFF' },
            { label: 'Response Qual.',   value: `${Math.round(84 + rng() * 12)}%`, color: '#CC80FF' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
              <span className="font-mono text-[8px] font-black" style={{ color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Live Activity Feed ─────────────────────────────────────────────────────────

function LiveActivityFeed({ employees }: { employees: EmployeeEntry[] }) {
  const rng    = useRef(mkRng(0x3E7A));
  const names  = useRef(employees.map(e => e.displayName ?? e.username));
  const [events, setEvents] = useState([
    { icon: '✓', text: 'Appeal accepted: user @silentecho restored', color: '#38D68A' },
    { icon: '⚑', text: 'Report escalated to senior team', color: '#FF8C00' },
    { icon: '🚫', text: 'User banned: spam violation confirmed', color: '#FF4A5E' },
    { icon: '⌂', text: 'Moderator @kai_mod logged in (morning shift)', color: '#CC80FF' },
    { icon: '◎', text: 'Dream featured: "The Ocean of Stars"', color: '#00CFFF' },
    { icon: '⚡', text: 'AI auto-action: 3 spam accounts flagged', color: '#7B6FFF' },
  ]);

  useEffect(() => {
    const templates = [
      { icon: '✓', text: (n: string) => `${n} resolved 3 reports`, color: '#38D68A' },
      { icon: '⚡', text: () => 'AI signal: unusual posting pattern detected', color: '#7B6FFF' },
      { icon: '◎', text: (n: string) => `${n} completed appeal review`, color: '#CC80FF' },
      { icon: '⌂', text: (n: string) => `${n} started shift`, color: '#00CFFF' },
      { icon: '⚑', text: () => 'Critical report escalated to admin', color: '#FF4A5E' },
    ];
    const iv = setInterval(() => {
      if (rng.current() > 0.55) {
        const tpl = templates[Math.floor(rng.current() * templates.length)]!;
        const name = names.current[Math.floor(rng.current() * Math.max(names.current.length, 1))] ?? 'Staff';
        setEvents(p => [{ icon: tpl.icon, text: tpl.text(name), color: tpl.color }, ...p.slice(0, 9)]);
      }
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="os-card p-4" style={{ animation: 'wf-fade-up 0.75s ease both' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A', animation: 'wf-pulse 1.5s infinite' }} />
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#38D68A' }}>LIVE TEAM ACTIVITY</p>
      </div>
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {events.map((ev, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5 px-2.5 rounded-lg" style={{ background: `${ev.color}06`, border: `1px solid ${ev.color}12`, animation: i === 0 ? 'wf-slide-in 0.25s ease' : undefined }}>
            <span className="text-[9px] shrink-0 mt-0.5">{ev.icon}</span>
            <p className="font-mono text-[7px] leading-tight flex-1" style={{ color: 'rgba(232,232,255,0.55)' }}>{ev.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Achievements Showcase ──────────────────────────────────────────────────────

function AchievementsShowcase({ employees }: { employees: EmployeeEntry[] }) {
  type AchievementKey = typeof ACHIEVEMENT_POOL[number]['key'];
  const winners: Partial<Record<AchievementKey, { name: string; value: string; color: string }>> = {};
  employees.forEach(e => {
    const s = synthEmp(e);
    const name = e.displayName ?? e.username;
    if (!winners['top_mod'] && e.role === 'moderator' && s.casesSolved > 400)     winners['top_mod']   = { name, value: `${s.casesSolved} cases`, color: '#FFB800' };
    if (!winners['fastest'] && s.avgResTime < 7)                                   winners['fastest']   = { name, value: `${s.avgResTime}m avg`, color: '#00CFFF' };
    if (!winners['accuracy'] && s.accuracy > 93)                                   winners['accuracy']  = { name, value: `${s.accuracy}%`, color: '#38D68A' };
    if (!winners['guardian'] && e.actionCount > 800)                               winners['guardian']  = { name, value: `${e.actionCount} actions`, color: '#CC80FF' };
    if (!winners['analyst'] && e.role === 'analyst')                               winners['analyst']   = { name, value: `${s.casesSolved} analyzed`, color: '#7B6FFF' };
    if (!winners['hero'] && e.role === 'support_agent')                            winners['hero']      = { name, value: `${e.actionsToday} today`, color: '#FF4D8F' };
    if (!winners['security'] && ['super_admin', 'admin'].includes(e.role))         winners['security']  = { name, value: rc(e), color: '#FF4A5E' };
  });

  function rc(e: EmployeeEntry) { return (ROLE_CFG[e.role] ?? ROLE_CFG['moderator']!).label; }

  return (
    <div className="os-card p-4" style={{ animation: 'wf-fade-up 0.8s ease both' }}>
      <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#FFB800' }}>TEAM ACHIEVEMENTS</p>
      <div className="flex flex-wrap gap-2">
        {ACHIEVEMENT_POOL.map(a => {
          const winner = winners[a.key as AchievementKey];
          return (
            <div key={a.key} className="flex items-center gap-2.5 px-3 py-2 rounded-xl flex-1 min-w-[140px]"
              style={{ background: winner ? `${a.color}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${winner ? `${a.color}20` : 'rgba(255,255,255,0.05)'}` }}>
              <span className="text-[14px] shrink-0" style={{ color: winner ? a.color : 'rgba(232,232,255,0.15)' }}>{a.icon}</span>
              <div className="min-w-0">
                <p className="font-mono text-[7px] font-bold" style={{ color: winner ? a.color : 'rgba(232,232,255,0.25)' }}>{a.label}</p>
                <p className="font-mono text-[6.5px] truncate" style={{ color: winner ? 'rgba(232,232,255,0.55)' : 'rgba(232,232,255,0.15)' }}>
                  {winner ? `${winner.name} · ${winner.value}` : 'Not yet awarded'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function EmployeeManagement() {
  const [selected, setSelected] = useState<EmployeeEntry | null>(null);
  const [filters,  setFilters]  = useState<FilterState>({ search: '', role: 'all', dept: 'all', status: 'all', performance: 'all', shift: 'all' });
  const [feedback, setFeedback] = useState<string>('');

  function flash(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(''), 3000); }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees'],
    queryFn:  fetchEmployees,
    refetchInterval: 60_000,
  });

  const all = data ?? [];

  let displayed = all;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    displayed = displayed.filter(e => e.username.includes(q) || e.email.includes(q) || (e.displayName ?? '').toLowerCase().includes(q));
  }
  if (filters.role !== 'all') displayed = displayed.filter(e => e.role === filters.role);
  if (filters.dept !== 'all') displayed = displayed.filter(e => (ROLE_CFG[e.role] ?? ROLE_CFG['moderator']!).dept === filters.dept);
  if (filters.status !== 'all') displayed = displayed.filter(e => synthEmp(e).status === filters.status);
  if (filters.performance !== 'all') {
    displayed = displayed.filter(e => {
      const p = synthEmp(e).performance;
      if (filters.performance === 'excellent') return p >= 90;
      if (filters.performance === 'good')      return p >= 70 && p < 90;
      return p < 70;
    });
  }
  if (filters.shift !== 'all') displayed = displayed.filter(e => synthEmp(e).shift === filters.shift);

  return (
    <div className="section-system relative">
      <style>{`
        @keyframes wf-fade-up   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes wf-slide-left{ from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes wf-slide-in  { from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:translateX(0)} }
        @keyframes wf-pulse     { 0%,100%{opacity:0.3} 50%{opacity:1} }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-5" style={{ animation: 'wf-fade-up 0.3s ease both' }}>
        <div>
          <h1 className="font-mono text-base font-black tracking-tight" style={{ color: '#E8E8FF' }}>Workforce Management Center</h1>
          <p className="font-mono text-[8px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>
            {isLoading ? 'Loading…' : `${all.length} staff members · ${all.filter(e => e.isActive).length} active`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A', animation: 'wf-pulse 1.5s infinite' }} />
            <span className="font-mono text-[7px] font-bold" style={{ color: '#38D68A' }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm border" style={{ background: 'rgba(56,214,138,0.08)', borderColor: 'rgba(56,214,138,0.25)', color: '#38D68A' }}>{feedback}</div>
      )}

      {/* Error */}
      {isError && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm border" style={{ background: 'rgba(255,74,94,0.08)', borderColor: 'rgba(255,74,94,0.25)', color: '#FF4A5E' }}>
          Failed to load employee data. Retrying…
        </div>
      )}

      {/* Executive KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-6 gap-2.5 mb-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="os-card p-3 h-16 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : <ExecutiveKPIs employees={all} />}

      {/* Team Health */}
      {!isLoading && <TeamHealthWidget employees={all} />}

      {/* Filters */}
      <FilterBar filters={filters} setFilters={setFilters} />

      {/* Table */}
      {isLoading ? (
        <div className="os-card overflow-hidden mb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="h-8 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="os-card p-16 text-center mb-4">
          <p className="text-2xl mb-3">👥</p>
          <p className="font-mono text-sm font-bold mb-1" style={{ color: '#E8E8FF' }}>No staff match your filters</p>
          <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Adjust your search or filter criteria to find team members.</p>
        </div>
      ) : (
        <EmployeeTable employees={displayed} selected={selected} onSelect={setSelected} />
      )}

      {/* Bottom row: Analytics + Activity */}
      {!isLoading && all.length > 0 && (
        <>
          <TeamAnalytics employees={displayed.length > 0 ? displayed : all} />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <LiveActivityFeed employees={all} />
            <AchievementsShowcase employees={all} />
          </div>
        </>
      )}

      {/* Profile Drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setSelected(null)} />
          <ProfileDrawer emp={selected} onClose={() => setSelected(null)} onFlash={flash} />
        </>
      )}
    </div>
  );
}
