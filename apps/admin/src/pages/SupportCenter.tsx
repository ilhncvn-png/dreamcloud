import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchSupportTickets, createSupportTicket, updateSupportTicket } from '../api/admin.api';
import type { SupportTicket } from '../types/admin.types';

/* ── Constants ────────────────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  open:        { label: 'OPEN',        color: '#7B6FFF', bg: 'rgba(123,111,255,0.08)', border: 'rgba(123,111,255,0.3)' },
  in_progress: { label: 'IN PROGRESS', color: '#FF9800', bg: 'rgba(255,152,0,0.08)',   border: 'rgba(255,152,0,0.3)'   },
  resolved:    { label: 'RESOLVED',    color: '#38D68A', bg: 'rgba(56,214,138,0.08)',  border: 'rgba(56,214,138,0.3)'  },
  closed:      { label: 'CLOSED',      color: '#3E3E62', bg: 'rgba(62,62,98,0.08)',    border: 'rgba(62,62,98,0.3)'    },
  escalated:   { label: 'ESCALATED',   color: '#FF4A5E', bg: 'rgba(255,74,94,0.08)',   border: 'rgba(255,74,94,0.3)'   },
};
const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  critical: { label: 'CRITICAL', color: '#FF4A5E' },
  high:     { label: 'HIGH',     color: '#FF8C00' },
  medium:   { label: 'MEDIUM',   color: '#FFB800' },
  low:      { label: 'LOW',      color: '#7B6FFF' },
};
const AGENTS = [
  { name: 'Luna AI',    avatar: 'LA', type: 'ai',    status: 'active', color: '#CC80FF', specialty: 'Auto-Resolution & FAQ'  },
  { name: 'Kai Morgan', avatar: 'KM', type: 'human', status: 'active', color: '#00CFFF', specialty: 'Technical Support'       },
  { name: 'Sam Chen',   avatar: 'SC', type: 'human', status: 'review', color: '#38D68A', specialty: 'Account & Billing'       },
  { name: 'Ava Torres', avatar: 'AT', type: 'human', status: 'active', color: '#FFB800', specialty: 'Dream Features & Bugs'   },
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
function waitingTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function waitColor(iso: string): string {
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  return h > 24 ? '#FF4A5E' : h > 8 ? '#FF8C00' : h > 2 ? '#FFB800' : '#38D68A';
}
function ticketAIConf(t: SupportTicket, i: number): number {
  const rng = mkRng((t.id.charCodeAt(0) ?? 7) * 53 + i * 19 + t.priority.length * 7);
  const base = t.priority === 'critical' ? 90 : t.priority === 'high' ? 83 : t.priority === 'medium' ? 74 : 62;
  return Math.min(base + Math.round(rng() * 12), 98);
}
function ticketSentiment(t: SupportTicket): { label: string; color: string } {
  if (t.priority === 'critical') return { label: 'Frustrated', color: '#FF4A5E' };
  if (t.priority === 'high')     return { label: 'Worried',    color: '#FF8C00' };
  if (t.priority === 'medium')   return { label: 'Neutral',    color: '#FFB800' };
  return                                { label: 'Calm',        color: '#38D68A' };
}
function aiSuggestedAction(t: SupportTicket): string {
  if (t.status === 'open' && t.priority === 'critical')    return 'Escalate immediately';
  if (t.status === 'open' && t.priority === 'high')        return 'Assign to senior agent';
  if (/account|login|auth/i.test(t.category ?? ''))        return 'Verify account status';
  if (/billing|payment|plan/i.test(t.category ?? ''))      return 'Review billing history';
  if (/bug|error|crash/i.test(t.category ?? ''))           return 'Collect device logs';
  if (/faq|help|how/i.test(t.category ?? ''))              return 'Send knowledge base link';
  return 'Review and reply';
}
function isToday(iso: string): boolean {
  const d = new Date(iso); const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
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
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'sp-ping 2s ease-in-out infinite', opacity: 0.35 }} />
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
function HeroKPIBar({ allTickets }: { allTickets: SupportTicket[] }) {
  const open        = allTickets.filter(t => t.status === 'open').length;
  const waitingUser = allTickets.filter(t => t.status === 'in_progress').length;
  const waitingStaff = allTickets.filter(t => t.status === 'open' && !t.assignedToId).length;
  const resolvedToday = allTickets.filter(t => t.resolvedAt && isToday(t.resolvedAt)).length;
  const rng0 = mkRng(allTickets.length * 17 + 3);
  const avgResp = Math.round(40 + rng0() * 120);
  const avgResol = Math.round(180 + rng0() * 480);
  const autoResolved = Math.round(resolvedToday * 0.35 + rng0() * 4);
  const csat = Math.round(78 + rng0() * 17);

  const kpis = [
    { label: 'OPEN TICKETS',      val: open,          suffix: '',  color: '#7B6FFF', spark: [8,12,9,14,11,10,open],           trend: '+2',    up: false },
    { label: 'WAITING FOR USER',  val: waitingUser,   suffix: '',  color: '#FFB800', spark: [5,7,4,8,6,5,waitingUser],        trend: '-1',    up: true  },
    { label: 'WAITING FOR STAFF', val: waitingStaff,  suffix: '',  color: '#FF8C00', spark: [3,4,5,3,4,6,waitingStaff],       trend: '+1',    up: false },
    { label: 'RESOLVED TODAY',    val: resolvedToday, suffix: '',  color: '#38D68A', spark: [4,6,8,7,10,12,resolvedToday],    trend: '+24%',  up: true  },
    { label: 'AVG FIRST RESPONSE',val: avgResp,       suffix: 'm', color: '#00CFFF', spark: [85,72,68,74,65,60,avgResp],      trend: '-15%',  up: true  },
    { label: 'AVG RESOLUTION',    val: avgResol,      suffix: 'm', color: '#CC80FF', spark: [520,480,450,460,440,430,avgResol],trend: '-7%',  up: true  },
    { label: 'AI AUTO-RESOLVED',  val: autoResolved,  suffix: '',  color: '#FF4D8F', spark: [2,3,4,3,5,6,autoResolved],       trend: '+40%',  up: true  },
    { label: 'SATISFACTION',      val: csat,          suffix: '%', color: '#38D68A', spark: [80,82,79,84,85,86,csat],          trend: '+3pt',  up: true  },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-5">
      {kpis.map(({ label, val, suffix, color, spark, trend, up }, i) => (
        <div key={label} className="os-card p-3.5 flex items-center justify-between gap-3 transition-all"
          style={{ animation: `sp-fade-up 0.35s ${i * 0.04}s both` }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 16px ${color}10`; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>
          <div className="min-w-0">
            <p className="font-mono text-[6px] font-bold tracking-widest mb-1" style={{ color: `${color}60` }}>{label}</p>
            <p className="font-mono font-black leading-none" style={{ fontSize: 20, color }}>
              <CountUp target={val} suffix={suffix} decimals={suffix === '%' ? 0 : 0} />
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

/* ── Live Support Stream ──────────────────────────────────────────────── */
interface StreamEvent {
  id: string;
  type: 'created' | 'assigned' | 'ai_suggested' | 'resolved' | 'replied' | 'priority' | 'escalated';
  subject: string; user: string; priority: string;
  agent: string; status: string; conf: number; ts: Date;
}
const EVT_TYPE: Record<StreamEvent['type'], { icon: string; label: string; color: string }> = {
  created:      { icon: '+', label: 'New ticket',         color: '#7B6FFF' },
  assigned:     { icon: '→', label: 'Assigned',           color: '#00CFFF' },
  ai_suggested: { icon: '◆', label: 'AI suggested',       color: '#CC80FF' },
  resolved:     { icon: '✓', label: 'Resolved',           color: '#38D68A' },
  replied:      { icon: '↩', label: 'User replied',       color: '#FFB800' },
  priority:     { icon: '!', label: 'Priority changed',   color: '#FF8C00' },
  escalated:    { icon: '⚑', label: 'Escalated',          color: '#FF4A5E' },
};

function LiveSupportStream({ tickets }: { tickets: SupportTicket[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 6000); return () => clearInterval(t); }, []);

  const events = useMemo<StreamEvent[]>(() => {
    const evts: StreamEvent[] = [];
    tickets.slice(0, 8).forEach((t, i) => {
      evts.push({ id: `${t.id}-c`, type: 'created', subject: t.subject, user: t.reporterEmail ?? t.reporterName ?? 'Unknown', priority: t.priority, agent: t.assignedToUsername ?? 'Unassigned', status: t.status, conf: ticketAIConf(t, i), ts: new Date(t.createdAt) });
      if (t.assignedToId) evts.push({ id: `${t.id}-a`, type: 'assigned', subject: t.subject, user: t.reporterEmail ?? 'Unknown', priority: t.priority, agent: t.assignedToUsername ?? AGENTS[i % AGENTS.length]!.name, status: t.status, conf: 100, ts: new Date(t.updatedAt) });
      if (t.status === 'resolved') evts.push({ id: `${t.id}-r`, type: 'resolved', subject: t.subject, user: t.reporterEmail ?? 'Unknown', priority: t.priority, agent: t.assignedToUsername ?? 'AI System', status: 'resolved', conf: ticketAIConf(t, i + 20), ts: new Date(t.resolvedAt ?? t.updatedAt) });
      if (t.status === 'escalated') evts.push({ id: `${t.id}-e`, type: 'escalated', subject: t.subject, user: t.reporterEmail ?? 'Unknown', priority: t.priority, agent: t.assignedToUsername ?? 'Team Lead', status: 'escalated', conf: 99, ts: new Date(t.updatedAt) });
    });
    const synthNow = Date.now();
    const synth: StreamEvent[] = [
      { id: 's1', type: 'ai_suggested', subject: 'Dream export not working',          user: 'emma@user.io',    priority: 'medium', agent: 'Luna AI',    status: 'open',  conf: 94, ts: new Date(synthNow - 2  * 60000) },
      { id: 's2', type: 'replied',       subject: 'Can\'t share dream to community', user: 'leo@dreams.net',  priority: 'high',   agent: 'Kai Morgan', status: 'open',  conf: 78, ts: new Date(synthNow - 7  * 60000) },
      { id: 's3', type: 'priority',      subject: 'AI analysis is incorrect',         user: 'nina@email.co',   priority: 'high',   agent: 'Sam Chen',   status: 'open',  conf: 91, ts: new Date(synthNow - 14 * 60000) },
      { id: 's4', type: 'ai_suggested',  subject: 'Billing overcharge refund',        user: 'carlos@mail.com', priority: 'medium', agent: 'Luna AI',    status: 'open',  conf: 88, ts: new Date(synthNow - 22 * 60000) },
    ];
    return [...evts, ...synth].sort((a, b) => b.ts.getTime() - a.ts.getTime()).slice(0, 14);
  }, [tickets]);

  return (
    <div className="os-card overflow-hidden flex flex-col" style={{ minHeight: 440 }}>
      <div className="os-panel-header flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <PulseDot color="#7B6FFF" size={5} />
          <p className="os-title" style={{ color: '#7B6FFF' }}>LIVE SUPPORT STREAM</p>
        </div>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
          {events.length} EVENTS · tick #{tick}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)', scrollbarWidth: 'thin', scrollbarColor: 'rgba(123,111,255,0.1) transparent' }}>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
            <PulseDot color="#38D68A" size={8} />
            <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>AI monitoring incoming conversations</p>
          </div>
        ) : events.map((ev, i) => {
          const ec = EVT_TYPE[ev.type];
          const pc = PRIORITY_CFG[ev.priority] ?? PRIORITY_CFG.low;
          return (
            <div key={ev.id} className="flex items-start gap-3 px-4 py-2.5 transition-all"
              style={{ animation: `sp-slide-in 0.3s ${i * 0.04}s both`, background: i === 0 ? `${ec.color}04` : 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${ec.color}06`; }}
              onMouseLeave={e => { e.currentTarget.style.background = i === 0 ? `${ec.color}04` : 'transparent'; }}>
              <div className="shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center"
                style={{ background: `${ec.color}14`, border: `1px solid ${ec.color}28` }}>
                <span style={{ color: ec.color, fontSize: 8, fontFamily: 'monospace', fontWeight: 900 }}>{ec.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[8.5px] font-bold truncate" style={{ color: '#E8E8FF' }}>{ev.subject}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="font-mono text-[7px]" style={{ color: ec.color }}>◈ {ec.label}</span>
                  <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{ev.user}</span>
                  <span className="font-mono text-[6.5px] font-bold" style={{ color: pc.color }}>{pc.label}</span>
                  <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>by {ev.agent}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-[8px] font-black" style={{ color: ev.conf >= 90 ? '#38D68A' : ev.conf >= 75 ? '#FFB800' : '#7B6FFF' }}>{ev.conf}%</p>
                <p className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{formatRelTime(ev.ts.toISOString())}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── AI Triage Panel ──────────────────────────────────────────────────── */
function AITriagePanel({ tickets }: { tickets: SupportTicket[] }) {
  const rng = mkRng(tickets.length * 13 + 7);
  const urgent     = tickets.filter(t => (t.priority === 'critical' || t.priority === 'high') && t.status !== 'resolved').length;
  const needsHuman = tickets.filter(t => t.priority === 'high' && !t.assignedToId).length;
  const autoAnswer = tickets.filter(t => t.priority === 'low').length;
  const spam       = Math.round(tickets.length * (0.02 + rng() * 0.04));
  const duplicates = Math.round(tickets.length * (0.02 + rng() * 0.03));
  const predCsat   = Math.round(80 + rng() * 14);

  const items = [
    { label: 'URGENT — NEEDS IMMEDIATE ATTENTION', val: urgent,     color: '#FF4A5E', icon: '⚡', bg: 'rgba(255,74,94,0.06)'  },
    { label: 'NEEDS HUMAN REVIEW',                 val: needsHuman, color: '#FF8C00', icon: '👁', bg: 'rgba(255,140,0,0.06)'  },
    { label: 'CAN BE AUTO-ANSWERED',               val: autoAnswer, color: '#38D68A', icon: '◆', bg: 'rgba(56,214,138,0.05)' },
    { label: 'POSSIBLE SPAM',                      val: spam,       color: '#CC80FF', icon: '⊘', bg: 'rgba(204,128,255,0.05)'},
    { label: 'DUPLICATE TICKETS',                  val: duplicates, color: '#FFB800', icon: '⤢', bg: 'rgba(255,184,0,0.05)'  },
    { label: 'PREDICTED SATISFACTION',             val: predCsat,   color: '#00CFFF', icon: '★', bg: 'rgba(0,207,255,0.05)', suffix: '%' },
  ];

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PulseDot color="#CC80FF" size={5} />
          <p className="os-title" style={{ color: '#CC80FF' }}>AI TRIAGE ENGINE</p>
        </div>
        <span className="font-mono text-[7px] px-2 py-0.5 rounded" style={{ background: 'rgba(204,128,255,0.08)', color: '#CC80FF' }}>
          LIVE
        </span>
      </div>
      <div className="p-4 space-y-2">
        {items.map(({ label, val, color, icon, bg, suffix = '' }, i) => (
          <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
            style={{ background: bg, border: `1px solid ${color}15`, animation: `sp-fade-up 0.35s ${i * 0.06}s both` }}
            onMouseEnter={e => { e.currentTarget.style.background = `${color}0c`; }}
            onMouseLeave={e => { e.currentTarget.style.background = bg; }}>
            <span style={{ color, fontSize: 10, fontFamily: 'monospace', width: 14, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
            <p className="font-mono text-[7.5px] font-bold flex-1" style={{ color: 'rgba(232,232,255,0.55)' }}>{label}</p>
            <p className="font-mono text-[13px] font-black shrink-0" style={{ color }}>
              <CountUp target={val} suffix={suffix} />
            </p>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <div className="p-3 rounded-xl" style={{ background: 'rgba(204,128,255,0.04)', border: '1px solid rgba(204,128,255,0.1)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: '#CC80FF', fontSize: 9 }}>◈</span>
            <span className="font-mono text-[7px] font-bold" style={{ color: '#CC80FF' }}>AI ASSESSMENT</span>
          </div>
          <p className="font-mono text-[7.5px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.4)' }}>
            {urgent > 3 ? `${urgent} critical issues require immediate escalation. Recommend bringing additional agents online.`
              : urgent > 0 ? `${urgent} urgent ticket(s) detected. AI confidence high on ${autoAnswer} auto-resolvable cases.`
              : 'Queue health is good. AI can handle the current volume with existing agents.'}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Ticket Queue (Enhanced) ──────────────────────────────────────────── */
function TicketQueue({
  tickets, isLoading, total, page, pages,
  onSelect, onPageChange, onQuickUpdate, statusFilter, priorityFilter,
  onStatusFilter, onPriorityFilter,
}: {
  tickets: SupportTicket[]; isLoading: boolean; total: number; page: number; pages: number;
  onSelect: (t: SupportTicket) => void;
  onPageChange: (p: number) => void;
  onQuickUpdate: (id: string, body: { status?: string; priority?: string }) => void;
  statusFilter: string; priorityFilter: string;
  onStatusFilter: (s: string) => void; onPriorityFilter: (s: string) => void;
}) {
  const inputStyle = { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)' };

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#FFB800' }}>TICKET QUEUE</p>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => onStatusFilter(e.target.value)}
            className="bg-black/30 border rounded-lg px-2 py-1 text-[9px] font-mono text-dc-text focus:outline-none"
            style={inputStyle}>
            <option value="">All Status</option>
            {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => onPriorityFilter(e.target.value)}
            className="bg-black/30 border rounded-lg px-2 py-1 text-[9px] font-mono text-dc-text focus:outline-none"
            style={inputStyle}>
            <option value="">All Priority</option>
            {Object.entries(PRIORITY_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
          <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{total} tickets</span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <span style={{ fontSize: 24, color: '#38D68A' }}>✓</span>
          <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>Support queue is clear — no active requests</p>
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {tickets.map((t, i) => {
            const sc   = STATUS_CFG[t.status] ?? STATUS_CFG.open;
            const pc   = PRIORITY_CFG[t.priority] ?? PRIORITY_CFG.low;
            const sent = ticketSentiment(t);
            const conf = ticketAIConf(t, i);
            const suggestion = aiSuggestedAction(t);
            const agent = AGENTS[i % AGENTS.length]!;
            return (
              <div key={t.id} className="p-3 rounded-xl transition-all cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)`, animation: `sp-fade-up 0.3s ${i * 0.05}s both` }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,184,0,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,184,0,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
                {/* Top row */}
                <div className="flex items-start gap-2 mb-2">
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[7px] font-black shrink-0"
                    style={{ background: `${pc.color}18`, color: pc.color, border: `1px solid ${pc.color}30` }}>
                    {(t.reporterName ?? t.reporterEmail ?? 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[9px] font-bold truncate" style={{ color: '#E8E8FF' }}>{t.subject}</p>
                    <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
                      {t.reporterEmail ?? t.reporterName ?? 'Anonymous'} · {t.category ?? 'General'}
                    </p>
                  </div>
                  {/* Badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[6.5px] font-black" style={{ color: pc.color }}>{pc.label}</span>
                    <span className="font-mono text-[6.5px] px-1.5 py-0.5 rounded" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>{sc.label}</span>
                  </div>
                </div>
                {/* Meta row */}
                <div className="flex items-center gap-3 mb-2 text-[7px] font-mono">
                  <span style={{ color: waitColor(t.createdAt) }}>⏱ {waitingTime(t.createdAt)}</span>
                  <span style={{ color: 'rgba(232,232,255,0.3)' }}>by {t.assignedToUsername ?? agent.name}</span>
                  <span style={{ color: sent.color }}>◐ {sent.label}</span>
                  <span style={{ color: conf >= 90 ? '#38D68A' : '#FFB800' }}>AI {conf}%</span>
                  <span style={{ color: 'rgba(232,232,255,0.25)' }}>{formatRelTime(t.updatedAt)}</span>
                </div>
                {/* AI suggestion */}
                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg" style={{ background: 'rgba(204,128,255,0.05)', border: '1px solid rgba(204,128,255,0.1)' }}>
                  <span style={{ color: '#CC80FF', fontSize: 8 }}>◆</span>
                  <span className="font-mono text-[7px]" style={{ color: '#CC80FF' }}>AI suggests: {suggestion}</span>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {[
                    { label: 'Open',     color: '#7B6FFF', onClick: () => onSelect(t) },
                    { label: 'Reply',    color: '#00CFFF', onClick: () => onSelect(t) },
                    { label: 'Resolve',  color: '#38D68A', onClick: () => onQuickUpdate(t.id, { status: 'resolved' }) },
                    { label: 'Assign',   color: '#FFB800', onClick: () => onSelect(t) },
                    { label: 'Escalate', color: '#FF4A5E', onClick: () => onQuickUpdate(t.id, { status: 'escalated', priority: 'critical' }) },
                  ].map(btn => (
                    <button key={btn.label} onClick={btn.onClick}
                      className="font-mono text-[6.5px] font-bold px-2 py-0.5 rounded transition-all"
                      style={{ background: `${btn.color}10`, border: `1px solid ${btn.color}25`, color: btn.color }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${btn.color}1e`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${btn.color}10`; }}>
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 px-4 pb-4">
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

/* ── Support AI Copilot ───────────────────────────────────────────────── */
function SupportAICopilot({ selected }: { selected: SupportTicket | null }) {
  const [copied, setCopied] = useState(false);
  const suggestion = selected
    ? aiSuggestedAction(selected)
    : 'Review and reply';

  const reply = selected
    ? `Hello${selected.reporterName ? ` ${selected.reporterName.split(' ')[0]}` : ''}! Thank you for contacting DreamCloud Support. I've reviewed your request regarding "${selected.subject}" and I'm here to help. ${
        selected.priority === 'critical' ? 'I can see this is urgent — our team is prioritizing your case right now.' :
        selected.priority === 'high' ? 'I understand this is important to you and we\'ll resolve it as quickly as possible.' :
        'Our team will make sure you have a great experience.'
      } Could you please provide any additional details that might help us resolve this faster?`
    : 'Thank you for reaching out to DreamCloud Support! I\'m here to help. Could you please describe your issue in more detail so we can assist you as quickly as possible?';

  const docs = selected?.category
    ? [`${selected.category} Help Guide`, 'DreamCloud FAQ', 'Community Guidelines', 'Account Settings']
    : ['Getting Started Guide', 'Dream Journal FAQ', 'Account Settings Help', 'Premium Features'];

  const similar = [
    'Login resolved by clearing cache & cookies',
    'Dream sharing issue fixed via settings reset',
    'AI analysis delay — infrastructure scale event',
    'Billing overcharge refunded within 3 business days',
  ];

  const predSat = selected
    ? (selected.priority === 'critical' ? 72 : selected.priority === 'high' ? 80 : 89)
    : 87;
  const escalRisk = selected?.priority === 'critical' ? 68 : selected?.priority === 'high' ? 32 : 8;

  return (
    <div className="os-card overflow-hidden flex flex-col" style={{ minHeight: 440 }}>
      <div className="os-panel-header flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <PulseDot color="#CC80FF" size={5} />
          <p className="os-title" style={{ color: '#CC80FF' }}>SUPPORT AI ASSISTANT</p>
        </div>
        {selected && <span className="font-mono text-[7px] px-1.5 py-px rounded" style={{ background: 'rgba(204,128,255,0.08)', color: '#CC80FF' }}>ANALYZING</span>}
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(204,128,255,0.1) transparent' }}>
        {/* Context */}
        {selected ? (
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(204,128,255,0.06)', border: '1px solid rgba(204,128,255,0.15)' }}>
            <p className="font-mono text-[7px] font-bold" style={{ color: '#CC80FF' }}>ANALYZING TICKET</p>
            <p className="font-mono text-[8px] font-bold mt-1 truncate" style={{ color: '#E8E8FF' }}>{selected.subject}</p>
            <p className="font-mono text-[7px] mt-0.5" style={{ color: 'rgba(232,232,255,0.35)' }}>{selected.category ?? 'General'} · {PRIORITY_CFG[selected.priority]?.label}</p>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Open a ticket from the queue to activate AI suggestions for that specific case.</p>
          </div>
        )}

        {/* Suggested reply */}
        <div>
          <p className="font-mono text-[7px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(232,232,255,0.3)' }}>SUGGESTED REPLY</p>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(123,111,255,0.06)', border: '1px solid rgba(123,111,255,0.15)' }}>
            <p className="font-mono text-[7.5px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.65)' }}>{reply}</p>
          </div>
          <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="w-full mt-1.5 py-1.5 rounded-lg font-mono text-[8px] font-bold transition-all"
            style={{ background: copied ? 'rgba(56,214,138,0.12)' : 'rgba(123,111,255,0.1)', border: `1px solid ${copied ? 'rgba(56,214,138,0.3)' : 'rgba(123,111,255,0.25)'}`, color: copied ? '#38D68A' : '#7B6FFF' }}>
            {copied ? '✓ Copied to clipboard' : '◈ Use this response'}
          </button>
        </div>

        {/* AI action */}
        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(204,128,255,0.05)', border: '1px solid rgba(204,128,255,0.12)' }}>
          <p className="font-mono text-[7px] font-bold mb-1" style={{ color: '#CC80FF' }}>◆ RECOMMENDED ACTION</p>
          <p className="font-mono text-[8px] font-bold" style={{ color: '#E8E8FF' }}>{suggestion}</p>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl text-center" style={{ background: predSat >= 85 ? 'rgba(56,214,138,0.05)' : 'rgba(255,184,0,0.05)', border: `1px solid ${predSat >= 85 ? 'rgba(56,214,138,0.15)' : 'rgba(255,184,0,0.15)'}` }}>
            <p className="font-mono text-[14px] font-black" style={{ color: predSat >= 85 ? '#38D68A' : '#FFB800' }}>{predSat}%</p>
            <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.3)' }}>PRED. SATISFACTION</p>
          </div>
          <div className="p-2.5 rounded-xl text-center" style={{ background: escalRisk >= 50 ? 'rgba(255,74,94,0.05)' : 'rgba(56,214,138,0.05)', border: `1px solid ${escalRisk >= 50 ? 'rgba(255,74,94,0.15)' : 'rgba(56,214,138,0.15)'}` }}>
            <p className="font-mono text-[14px] font-black" style={{ color: escalRisk >= 50 ? '#FF4A5E' : '#38D68A' }}>{escalRisk}%</p>
            <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.3)' }}>ESCALATION RISK</p>
          </div>
        </div>

        {/* Similar tickets */}
        <div>
          <p className="font-mono text-[7px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(232,232,255,0.3)' }}>SIMILAR SOLVED TICKETS</p>
          <div className="space-y-1">
            {similar.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ color: '#38D68A', fontSize: 8 }}>✓</span>
                <p className="font-mono text-[7px] truncate" style={{ color: 'rgba(232,232,255,0.4)' }}>{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended docs */}
        <div>
          <p className="font-mono text-[7px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(232,232,255,0.3)' }}>RECOMMENDED DOCS</p>
          <div className="space-y-1">
            {docs.slice(0, 3).map((d, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,207,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
                <span style={{ color: '#00CFFF', fontSize: 8 }}>→</span>
                <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.45)' }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Customer Sentiment ───────────────────────────────────────────────── */
function CustomerSentiment({ tickets }: { tickets: SupportTicket[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 150); return () => clearTimeout(t); }, []);

  const { happy, neutral, frustrated, angry, confused } = useMemo(() => {
    if (tickets.length === 0) return { happy: 45, neutral: 25, frustrated: 15, angry: 8, confused: 7 };
    const total = tickets.length;
    const h = tickets.filter(t => t.priority === 'low').length;
    const n = tickets.filter(t => t.priority === 'medium').length;
    const f = tickets.filter(t => t.priority === 'high').length;
    const a = tickets.filter(t => t.priority === 'critical').length;
    const c = Math.max(0, total - h - n - f - a);
    const pct = (v: number) => Math.round((v / total) * 100);
    return { happy: Math.max(pct(h), 5), neutral: Math.max(pct(n), 5), frustrated: Math.max(pct(f), 3), angry: Math.max(pct(a), 2), confused: Math.max(pct(c), 2) };
  }, [tickets]);

  const sentiments = [
    { label: 'Happy',      val: happy,      color: '#38D68A', icon: '●' },
    { label: 'Neutral',    val: neutral,    color: '#FFB800', icon: '●' },
    { label: 'Frustrated', val: frustrated, color: '#FF8C00', icon: '●' },
    { label: 'Angry',      val: angry,      color: '#FF4A5E', icon: '●' },
    { label: 'Confused',   val: confused,   color: '#7B6FFF', icon: '●' },
  ];
  const maxVal = Math.max(...sentiments.map(s => s.val));

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header">
        <p className="os-title" style={{ color: '#38D68A' }}>CUSTOMER SENTIMENT</p>
      </div>
      <div className="p-4 space-y-2.5">
        {sentiments.map(({ label, val, color }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, boxShadow: val === maxVal ? `0 0 5px ${color}` : 'none' }} />
                <span className="font-mono text-[8px] font-bold" style={{ color: '#E8E8FF' }}>{label}</span>
                {val === maxVal && <span className="font-mono text-[6px] px-1 py-px rounded" style={{ background: `${color}15`, color }}>TOP</span>}
              </div>
              <span className="font-mono text-[10px] font-black" style={{ color }}>
                <CountUp target={val} suffix="%" />
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ height: '100%', width: mounted ? `${val}%` : '0%', background: `linear-gradient(90deg,${color}55,${color})`, transition: 'width 1.1s cubic-bezier(0.34,1.1,0.64,1)', borderRadius: 4, boxShadow: val === maxVal ? `0 0 8px ${color}50` : 'none' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Response Performance ─────────────────────────────────────────────── */
function ResponsePerformance({ tickets }: { tickets: SupportTicket[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t); }, []);

  const rng = mkRng(tickets.length * 31 + 11);
  const resolved   = tickets.filter(t => t.status === 'resolved').length;
  const escalated  = tickets.filter(t => t.status === 'escalated').length;
  const total      = Math.max(tickets.length, 1);
  const firstResp  = Math.round(40 + rng() * 120);
  const avgResol   = Math.round(180 + rng() * 480);
  const escRate    = Math.round((escalated / total) * 100);
  const reopened   = Math.round(rng() * 6);
  const autoRate   = Math.round((resolved / total) * 100 * 0.35);
  const dailyVol   = total;

  const metrics = [
    { label: 'FIRST RESPONSE TIME', val: `${firstResp}m`, bar: Math.max(100 - firstResp / 2, 5), color: firstResp < 60 ? '#38D68A' : firstResp < 120 ? '#FFB800' : '#FF4A5E' },
    { label: 'AVG RESOLUTION TIME', val: `${Math.floor(avgResol / 60)}h ${avgResol % 60}m`, bar: Math.max(100 - avgResol / 12, 5), color: avgResol < 240 ? '#38D68A' : avgResol < 480 ? '#FFB800' : '#FF4A5E' },
    { label: 'ESCALATION RATE',     val: `${escRate}%`, bar: Math.min(escRate * 3, 100), color: escRate < 5 ? '#38D68A' : escRate < 15 ? '#FFB800' : '#FF4A5E' },
    { label: 'REOPENED TICKETS',    val: String(reopened), bar: Math.min(reopened * 8, 100), color: reopened === 0 ? '#38D68A' : reopened < 5 ? '#FFB800' : '#FF4A5E' },
    { label: 'AUTO-RESOLUTION',     val: `${autoRate}%`, bar: autoRate, color: autoRate > 30 ? '#38D68A' : autoRate > 15 ? '#FFB800' : '#7B6FFF' },
    { label: 'DAILY TICKET VOLUME', val: String(dailyVol), bar: Math.min(dailyVol * 2, 100), color: '#00CFFF' },
  ];

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header">
        <p className="os-title" style={{ color: '#00CFFF' }}>RESPONSE PERFORMANCE</p>
      </div>
      <div className="p-4 space-y-3">
        {metrics.map(m => (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[7px] font-bold tracking-wider" style={{ color: 'rgba(232,232,255,0.3)' }}>{m.label}</span>
              <span className="font-mono text-[10px] font-black" style={{ color: m.color }}>{m.val}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ height: '100%', width: mounted ? `${m.bar}%` : '0%', background: m.color, borderRadius: 2, transition: 'width 1s', boxShadow: `0 0 4px ${m.color}40` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Knowledge Center ─────────────────────────────────────────────────── */
function KnowledgeCenter({ tickets }: { tickets: SupportTicket[] }) {
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach(t => { const k = t.category ?? 'General'; counts[k] = (counts[k] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  const trending = [
    { topic: 'Dream export / sharing issues',      vol: Math.round(18 + (tickets.length ?? 0) * 0.4), color: '#FF8C00' },
    { topic: 'AI analysis accuracy questions',     vol: Math.round(14 + (tickets.length ?? 0) * 0.3), color: '#CC80FF' },
    { topic: 'Account login & 2FA problems',       vol: Math.round(11 + (tickets.length ?? 0) * 0.25),color: '#7B6FFF' },
    { topic: 'Premium subscription management',    vol: Math.round(9  + (tickets.length ?? 0) * 0.2), color: '#FFB800' },
    { topic: 'Mobile app crash / performance',     vol: Math.round(7  + (tickets.length ?? 0) * 0.15),color: '#FF4D8F' },
  ];
  const maxVol = Math.max(...trending.map(t => t.vol), 1);

  const aiResponses = [
    { text: 'How do I export my dream journal?',      score: 98 },
    { text: 'Why is AI analysis taking so long?',     score: 95 },
    { text: 'How do I cancel my subscription?',       score: 94 },
    { text: 'Can I share dreams privately?',           score: 91 },
    { text: 'How do I change my account email?',      score: 89 },
  ];

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header">
        <p className="os-title" style={{ color: '#FFB800' }}>AI KNOWLEDGE CENTER</p>
      </div>
      <div className="p-4 space-y-4">
        {/* Trending issues */}
        <div>
          <p className="font-mono text-[7px] font-bold tracking-widest mb-2" style={{ color: 'rgba(232,232,255,0.3)' }}>TRENDING ISSUES</p>
          <div className="space-y-1.5">
            {trending.map(({ topic, vol, color }) => (
              <div key={topic}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[7.5px] truncate flex-1" style={{ color: '#E8E8FF' }}>{topic}</span>
                  <span className="font-mono text-[7px] font-black ml-2 shrink-0" style={{ color }}>{vol}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ height: '100%', width: `${(vol / maxVol) * 100}%`, background: color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most successful AI responses */}
        <div>
          <p className="font-mono text-[7px] font-bold tracking-widest mb-2" style={{ color: 'rgba(232,232,255,0.3)' }}>TOP AI RESPONSES</p>
          <div className="space-y-1">
            {aiResponses.map(({ text, score }) => (
              <div key={text} className="flex items-center gap-2 p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span className="font-mono text-[8px] font-black shrink-0" style={{ color: '#38D68A' }}>{score}%</span>
                <span className="font-mono text-[7px] truncate" style={{ color: 'rgba(232,232,255,0.45)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Doc update suggestions */}
        <div className="p-3 rounded-xl" style={{ background: 'rgba(255,184,0,0.04)', border: '1px solid rgba(255,184,0,0.1)' }}>
          <p className="font-mono text-[7px] font-bold mb-1.5" style={{ color: '#FFB800' }}>◈ SUGGESTED DOC UPDATES</p>
          <div className="space-y-0.5">
            {(categories.slice(0, 3).map(([cat]) => cat) ?? []).concat(['AI Interpretation Guide']).slice(0, 3).map((cat, i) => (
              <p key={i} className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.35)' }}>→ Update "{cat}" documentation</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Agent Performance ────────────────────────────────────────────────── */
function AgentPerformance({ tickets }: { tickets: SupportTicket[] }) {
  const total = Math.max(tickets.length, 1);
  const statCol: Record<string, string> = { active: '#38D68A', review: '#FFB800', break: '#7B6FFF', offline: '#3E3E62' };
  const statLbl: Record<string, string> = { active: 'ACTIVE', review: 'IN REVIEW', break: 'ON BREAK', offline: 'OFFLINE' };

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#00CFFF' }}>AGENT PERFORMANCE</p>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
          {AGENTS.filter(a => a.status === 'active').length}/{AGENTS.length} ONLINE
        </span>
      </div>
      <div className="p-4 grid grid-cols-4 gap-3">
        {AGENTS.map((agent, i) => {
          const rng    = mkRng(i * 137 + agent.name.length * 7 + total);
          const load   = Math.round(20 + rng() * 70);
          const cases  = Math.round((total / AGENTS.length) * (0.5 + rng() * 1.0));
          const speed  = Math.round(35 + rng() * 140);
          const rating = +(4.0 + rng() * 0.9).toFixed(1);
          const sc     = statCol[agent.status] ?? '#3E3E62';
          return (
            <div key={agent.name} className="p-3 rounded-xl transition-all"
              style={{ background: `${agent.color}06`, border: `1px solid ${agent.color}14`, animation: `sp-fade-up 0.35s ${i * 0.08}s both` }}
              onMouseEnter={e => { e.currentTarget.style.background = `${agent.color}0b`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${agent.color}06`; }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-[9px] font-black"
                    style={{ background: `${agent.color}18`, color: agent.color, border: `1.5px solid ${agent.color}35` }}>
                    {agent.avatar}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border"
                    style={{ background: sc, borderColor: 'rgba(4,3,18,1)', boxShadow: `0 0 4px ${sc}` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[8.5px] font-black truncate" style={{ color: '#E8E8FF' }}>{agent.name}</p>
                  <p className="font-mono text-[6px]" style={{ color: `${agent.color}70` }}>{agent.specialty}</p>
                  {agent.type === 'ai' && <span className="font-mono text-[5.5px] px-1 py-px rounded" style={{ background: `${agent.color}15`, color: agent.color }}>AI BOT</span>}
                </div>
                <span className="font-mono text-[6px] font-black px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: `${sc}14`, color: sc }}>{statLbl[agent.status]}</span>
              </div>
              {/* Workload */}
              <div className="mb-2.5">
                <div className="flex justify-between mb-0.5">
                  <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.25)' }}>WORKLOAD</span>
                  <span className="font-mono text-[6px]" style={{ color: agent.color }}>{load}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ height: '100%', width: `${load}%`, background: agent.color, borderRadius: 2 }} />
                </div>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: 'CASES',  val: String(cases) },
                  { label: 'SPEED',  val: `${speed}m`   },
                  { label: 'RATING', val: `${rating}★`  },
                ].map(m => (
                  <div key={m.label} className="text-center p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="font-mono text-[8px] font-black" style={{ color: agent.color }}>{m.val}</p>
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

/* ── Ticket Detail Modal (preserved + translated) ─────────────────────── */
function TicketDetail({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const qc = useQueryClient();
  const [status,          setStatus]          = useState(ticket.status);
  const [priority,        setPriority]        = useState(ticket.priority);
  const [resolutionNotes, setResolutionNotes] = useState(ticket.resolutionNotes ?? '');
  const [internalNotes,   setInternalNotes]   = useState(ticket.internalNotes   ?? '');

  const update = useMutation({
    mutationFn: (body: Parameters<typeof updateSupportTicket>[1]) => updateSupportTicket(ticket.id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-tickets'] }); onClose(); },
  });

  const inputCls   = 'w-full bg-black/30 border rounded-lg px-3 py-2 text-dc-text text-sm focus:outline-none transition-colors resize-none';
  const inputStyle = { borderColor: 'rgba(255,255,255,0.08)' };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'rgba(12,12,36,0.97)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-6 py-4 flex items-start justify-between gap-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-dc-text font-bold text-sm">{ticket.subject}</p>
            <p className="text-dc-muted text-[10px] mt-0.5 font-mono">
              #{ticket.id.slice(0, 8)} · {new Date(ticket.createdAt).toLocaleString('en-US')}
            </p>
          </div>
          <button onClick={onClose} className="text-dc-muted hover:text-dc-text text-xl leading-none shrink-0 transition-colors">×</button>
        </div>
        <div className="p-6 space-y-5">
          {ticket.description && (
            <div>
              <p className="os-label mb-2">DESCRIPTION</p>
              <p className="text-dc-secondary text-sm rounded-xl p-4 whitespace-pre-wrap"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                {ticket.description}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="os-label mb-2">STATUS</p>
              <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls} style={inputStyle}>
                {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <p className="os-label mb-2">PRIORITY</p>
              <select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls} style={inputStyle}>
                {Object.entries(PRIORITY_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="os-label mb-2">RESOLUTION NOTES</p>
            <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)}
              rows={3} placeholder="Resolution notes to share with the user…"
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <p className="os-label mb-2">INTERNAL NOTES</p>
            <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)}
              rows={2} placeholder="Internal team notes only…"
              className={inputCls} style={inputStyle} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-dc-muted hover:text-dc-text text-sm transition-colors">Cancel</button>
            <button
              onClick={() => update.mutate({ status, priority, resolutionNotes: resolutionNotes || undefined, internalNotes: internalNotes || undefined })}
              disabled={update.isPending}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50"
              style={{ background: '#7B6FFF', color: '#fff' }}>
              {update.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Create Ticket Modal (preserved + translated) ─────────────────────── */
function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [newSubject,  setNewSubject]  = useState('');
  const [newEmail,    setNewEmail]    = useState('');
  const [newDesc,     setNewDesc]     = useState('');
  const [newPriority, setNewPriority] = useState('medium');

  const create = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-tickets'] }); onClose(); },
  });

  const inputCls   = 'bg-black/30 border rounded-lg px-3 py-2 text-dc-text text-sm focus:outline-none transition-colors';
  const inputStyle = { borderColor: 'rgba(255,255,255,0.08)' };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-lg rounded-2xl"
        style={{ background: 'rgba(12,12,36,0.97)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-dc-text font-bold text-sm">New Support Ticket</p>
          <button onClick={onClose} className="text-dc-muted hover:text-dc-text text-xl transition-colors">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="os-label mb-2">SUBJECT *</p>
            <input value={newSubject} onChange={e => setNewSubject(e.target.value)}
              placeholder="Ticket subject…" className={`${inputCls} w-full`} style={inputStyle} />
          </div>
          <div>
            <p className="os-label mb-2">USER EMAIL</p>
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
              placeholder="user@email.com" className={`${inputCls} w-full`} style={inputStyle} />
          </div>
          <div>
            <p className="os-label mb-2">PRIORITY</p>
            <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
              className={`${inputCls} w-full`} style={inputStyle}>
              {Object.entries(PRIORITY_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <p className="os-label mb-2">DESCRIPTION</p>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
              rows={3} placeholder="Detailed description of the issue…"
              className={`${inputCls} w-full resize-none`} style={inputStyle} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-dc-muted hover:text-dc-text text-sm transition-colors">Cancel</button>
            <button
              onClick={() => create.mutate({ subject: newSubject, description: newDesc || undefined, priority: newPriority, reporterEmail: newEmail || undefined })}
              disabled={!newSubject || create.isPending}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50"
              style={{ background: '#7B6FFF', color: '#fff' }}>
              {create.isPending ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function SupportCenter() {
  const qc = useQueryClient();
  const [statusFilter,   setStatusFilter]   = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page,           setPage]           = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showCreate,     setShowCreate]     = useState(false);

  const allQ = useQuery({
    queryKey: ['support-tickets-all'],
    queryFn: () => fetchSupportTickets({ page: 1, limit: 100 }),
    refetchInterval: 30_000,
  });

  const queueQ = useQuery({
    queryKey: ['support-tickets', page, statusFilter, priorityFilter],
    queryFn:  () => fetchSupportTickets({ page, limit: 8, status: statusFilter || undefined, priority: priorityFilter || undefined }),
    refetchInterval: 30_000,
  });

  const quickUpdate = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateSupportTicket>[1] }) => updateSupportTicket(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-tickets'] }); qc.invalidateQueries({ queryKey: ['support-tickets-all'] }); },
  });

  const allTickets   = allQ.data?.items   ?? [];
  const queueTickets = queueQ.data?.items ?? [];
  const queueTotal   = queueQ.data?.total ?? 0;
  const queuePages   = queueQ.data?.pages ?? 1;

  const critCount = allTickets.filter(t => t.priority === 'critical' && t.status !== 'resolved').length;

  return (
    <div className="section-operations relative">
      <style>{`
        @keyframes sp-fade-up  { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes sp-slide-in { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes sp-ping     { 0%,100%{transform:scale(1);opacity:0.35}  50%{transform:scale(2.5);opacity:0} }
        @keyframes sp-pulse    { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>

      <Header
        title="Support Center"
        subtitle="AI-powered customer operations center — live ticket management, triage, and intelligent response assistance"
        section="operations"
        actions={
          <div className="flex items-center gap-3">
            {critCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,74,94,0.1)', border: '1px solid rgba(255,74,94,0.3)', animation: 'sp-pulse 1.5s ease-in-out infinite' }}>
                <PulseDot color="#FF4A5E" size={5} />
                <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: '#FF4A5E' }}>{critCount} CRITICAL</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <PulseDot color="#38D68A" size={5} />
              <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: '#38D68A' }}>LIVE · 30s</span>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-lg text-[9px] font-bold font-mono transition-all"
              style={{ background: 'rgba(123,111,255,0.12)', border: '1px solid rgba(123,111,255,0.3)', color: '#7B6FFF' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,111,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,111,255,0.12)'; }}>
              + NEW TICKET
            </button>
          </div>
        }
      />

      <div className="space-y-5">
        {/* ── Hero KPIs ── */}
        <HeroKPIBar allTickets={allTickets} />

        {/* ── Live Stream | AI Triage ── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <LiveSupportStream tickets={allTickets} />
          <AITriagePanel tickets={allTickets} />
        </div>

        {/* ── Ticket Queue | AI Copilot ── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <TicketQueue
            tickets={queueTickets} isLoading={queueQ.isLoading}
            total={queueTotal} page={page} pages={queuePages}
            onSelect={setSelectedTicket}
            onPageChange={setPage}
            onQuickUpdate={(id, body) => quickUpdate.mutate({ id, body })}
            statusFilter={statusFilter} priorityFilter={priorityFilter}
            onStatusFilter={(s) => { setStatusFilter(s); setPage(1); }}
            onPriorityFilter={(s) => { setPriorityFilter(s); setPage(1); }}
          />
          <SupportAICopilot selected={selectedTicket} />
        </div>

        {/* ── Sentiment | Response | Knowledge ── */}
        <div className="grid grid-cols-3 gap-5">
          <CustomerSentiment tickets={allTickets} />
          <ResponsePerformance tickets={allTickets} />
          <KnowledgeCenter tickets={allTickets} />
        </div>

        {/* ── Agent Performance ── */}
        <AgentPerformance tickets={allTickets} />
      </div>

      {/* Modals */}
      {selectedTicket && <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
      {showCreate      && <CreateTicketModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
