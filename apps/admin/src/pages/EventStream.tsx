import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchLiveEvents, fetchEventStats } from '../api/admin.api';
import type { LiveEvent, EventStats } from '../api/admin.api';

/* ── Event config ─────────────────────────────────────────────────────── */
const EV_CFG: Record<string, { icon: string; label: string; color: string; cat: string }> = {
  NEW_DREAM:      { icon: '🌙', label: 'New Dream',      color: '#00CFFF', cat: 'Dreams'      },
  NEW_MATCH:      { icon: '🔗', label: 'New Match',      color: '#CC80FF', cat: 'Matches'     },
  AI_SIGNAL:      { icon: '🧠', label: 'AI Signal',      color: '#FFB800', cat: 'AI'          },
  NEW_CONNECTION: { icon: '✨', label: 'Connection',     color: '#38D68A', cat: 'Connections' },
};

const SEV_CFG: Record<string, { color: string; glow: string; label: string }> = {
  CRITICAL:  { color: '#FF4A5E', glow: 'rgba(255,74,94,0.4)',    label: 'CRITICAL'  },
  HIGH:      { color: '#FF8C42', glow: 'rgba(255,140,66,0.35)',   label: 'HIGH'      },
  IMPORTANT: { color: '#FFB800', glow: 'rgba(255,184,0,0.3)',     label: 'IMPORTANT' },
  NOTICE:    { color: '#CC80FF', glow: 'rgba(204,128,255,0.25)',  label: 'NOTICE'    },
  INFO:      { color: '#5A5A84', glow: 'rgba(90,90,132,0.2)',     label: 'INFO'      },
};

const CATEGORIES = ['All', 'Dreams', 'AI', 'Matches', 'Connections', 'Warnings', 'Lucid', 'Emotions'];

const COUNTRIES = [
  ['🇹🇷', 'Istanbul'], ['🇺🇸', 'New York'], ['🇩🇪', 'Berlin'],
  ['🇯🇵', 'Tokyo'],   ['🇬🇧', 'London'],   ['🇫🇷', 'Paris'],
  ['🇧🇷', 'São Paulo'],['🇮🇳', 'Mumbai'],   ['🇨🇦', 'Toronto'],
  ['🇦🇺', 'Sydney'],  ['🇰🇷', 'Seoul'],    ['🇳🇱', 'Amsterdam'],
  ['🇸🇪', 'Stockholm'],['🇦🇷', 'Buenos Aires'],['🇲🇽', 'Mexico City'],
];
const DREAM_CATS = ['Transformation','Lucid','Shadow Work','Archetype','Water','Fire','Flying','Chase','Portal','Memory','Symbol','Connection'];
const AI_MSGS = [
  'Neural resonance pattern detected across 12 nodes.',
  'Symbol cluster convergence: 87% confidence.',
  'Emotional coherence spike in dream batch #A7.',
  'Lucid dream frequency above baseline by 2.4σ.',
  'Cross-cultural symbol match at 94% accuracy.',
  'Collective archetype activation: The Hero.',
  'Dream-to-waking transition marker identified.',
  'Shared memory fragment indexed in collective pool.',
  'Resonance cascade propagating through network.',
  'Novel symbolic configuration emerged — cataloging.',
];

const AI_OBS_MSGS = [
  'Unusual increase in lucid dreams across Europe.',
  'Dream activity rising sharply in East Asia.',
  'Shared symbols converging around water archetypes.',
  'Collective resonance stabilized at high baseline.',
  'AI confidence score above normal thresholds.',
  'Memory-related symbols becoming dominant.',
  'Two major symbol clusters beginning to merge.',
  'Transformation archetype spreading rapidly.',
  'Cross-continental emotional harmony detected.',
  'New collective symbol emerging: Mirror / Reflection.',
];

const HOUR_OPTIONS = [
  { label: '6h', value: 6 }, { label: '12h', value: 12 },
  { label: '24h', value: 24 }, { label: '48h', value: 48 },
];

/* ── Helpers ──────────────────────────────────────────────────────────── */
function formatRelTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 10)  return 'just now';
  if (diff < 60)  return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff/60)}m ago`;
  return `${Math.round(diff/3600)}h ago`;
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getSeverity(ev: LiveEvent): string {
  if (ev.severity) {
    const up = ev.severity.toUpperCase();
    if (up === 'CRITICAL') return 'CRITICAL';
    if (up === 'HIGH')     return 'HIGH';
    if (up === 'WARNING' || up === 'IMPORTANT') return 'IMPORTANT';
    if (up === 'NOTICE')   return 'NOTICE';
  }
  if (ev.event_type === 'AI_SIGNAL') return 'NOTICE';
  if (ev.score_pct != null && Number(ev.score_pct) > 90) return 'IMPORTANT';
  return 'INFO';
}

function getCategory(ev: LiveEvent): string {
  if (ev.event_type === 'AI_SIGNAL') {
    const sev = getSeverity(ev);
    if (sev === 'CRITICAL' || sev === 'HIGH') return 'Warnings';
    return 'AI';
  }
  if (ev.event_type === 'NEW_DREAM') {
    if (ev.category?.toLowerCase().includes('lucid')) return 'Lucid';
    if (ev.top_emotion) return 'Emotions';
    return 'Dreams';
  }
  if (ev.event_type === 'NEW_CONNECTION') return 'Connections';
  if (ev.event_type === 'NEW_MATCH') return 'Matches';
  return 'AI';
}

/* ── Simulated events generator ──────────────────────────────────────── */
let _simCounter = 9000;

function genSimEvent(): LiveEvent {
  const id = `sim-${_simCounter++}`;
  const types: LiveEvent['event_type'][] = ['NEW_DREAM','NEW_MATCH','AI_SIGNAL','NEW_CONNECTION'];
  const type = types[Math.floor(Math.random() * types.length)];
  const [, city] = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  const cat  = DREAM_CATS[Math.floor(Math.random() * DREAM_CATS.length)];
  const base: LiveEvent = { id, event_type: type, occurred_at: new Date().toISOString() };
  if (type === 'NEW_DREAM')      return { ...base, category: cat, top_emotion: 'Wonder', top_symbol: 'Mirror', pattern_value: city };
  if (type === 'NEW_MATCH')      return { ...base, score_pct: 70 + Math.random()*29, resonance_level: 'HIGH', pattern_value: city };
  if (type === 'AI_SIGNAL')      return { ...base, severity: Math.random()>0.85?'HIGH':'NOTICE', message: AI_MSGS[Math.floor(Math.random()*AI_MSGS.length)], pattern_value: city };
  return { ...base, resonance_level: 'RESONANT', pattern_value: city };
}

/* ── useLiveFeed hook ─────────────────────────────────────────────────── */
function useLiveFeed(apiEvents: LiveEvent[]) {
  const [simEvents, setSimEvents] = useState<LiveEvent[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const firstMount = useRef(true);

  useEffect(() => {
    const t = setInterval(() => {
      const ev = genSimEvent();
      setSimEvents(prev => [ev, ...prev].slice(0, 40));
      setNewIds(prev => { const s = new Set(prev); s.add(ev.id); return s; });
      setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(ev.id); return s; }), 2000);
    }, 3600);
    return () => clearInterval(t);
  }, []);

  // Mark first batch of real events as "not new" (they're historical)
  const prevApiIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (firstMount.current) { firstMount.current = false; apiEvents.forEach(e => prevApiIds.current.add(e.id)); return; }
    const freshIds = apiEvents.filter(e => !prevApiIds.current.has(e.id)).map(e => e.id);
    if (freshIds.length > 0) {
      setNewIds(prev => { const s = new Set(prev); freshIds.forEach(id => s.add(id)); return s; });
      freshIds.forEach(id => prevApiIds.current.add(id));
      setTimeout(() => setNewIds(prev => { const s = new Set(prev); freshIds.forEach(id => s.delete(id)); return s; }), 2000);
    }
  }, [apiEvents]);

  const merged = useMemo(() => {
    const seen = new Set<string>();
    return [...simEvents, ...apiEvents].filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; }).slice(0, 100);
  }, [simEvents, apiEvents]);

  return { events: merged, newIds };
}

/* ── CountUp ──────────────────────────────────────────────────────────── */
function CountUp({ to, dur = 1200 }: { to: number; dur?: number }) {
  const [val, setVal] = useState(0);
  const frame = useRef<number>(0);
  const prev  = useRef(0);
  useEffect(() => {
    const start = performance.now(), from = prev.current, delta = to - from;
    prev.current = to;
    cancelAnimationFrame(frame.current);
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + delta * e));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [to, dur]);
  return <>{val.toLocaleString()}</>;
}

/* ── EventCard ────────────────────────────────────────────────────────── */
const EventCard = memo(function EventCard({ ev, isNew }: { ev: LiveEvent; isNew: boolean }) {
  const cfg  = EV_CFG[ev.event_type] ?? { icon: '◈', label: ev.event_type, color: '#5A5A84', cat: 'AI' };
  const sev  = getSeverity(ev);
  const sc   = SEV_CFG[sev] ?? SEV_CFG.INFO!;
  const [flag, city] = (ev.pattern_value
    ? COUNTRIES.find(([, c]) => c === ev.pattern_value) ?? ['🌍', ev.pattern_value]
    : COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)]) as [string, string];

  const detail = ev.event_type === 'NEW_MATCH'
    ? `${ev.score_pct != null ? Number(ev.score_pct).toFixed(0) : '—'}% match · ${ev.resonance_level ?? '—'}`
    : ev.event_type === 'AI_SIGNAL'
    ? ev.message ?? ev.severity ?? '—'
    : ev.event_type === 'NEW_DREAM'
    ? `${ev.category ?? ev.top_emotion ?? '—'}${ev.top_symbol ? ' · ' + ev.top_symbol : ''}`
    : ev.resonance_level ?? '—';

  return (
    <div className="flex gap-0" style={{
      animation: isNew ? 'es-slide-in 0.45s cubic-bezier(0.22,1,0.36,1) both' : 'none',
    }}>
      {/* Timeline column */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 36 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: cfg.color, marginTop: 14, flexShrink: 0,
          boxShadow: isNew ? `0 0 12px ${cfg.color}` : `0 0 4px ${cfg.color}60`,
          animation: isNew ? `es-dot-pulse 1.5s ease-out` : sev === 'CRITICAL' ? 'es-blink 1.2s ease-in-out infinite' : 'none',
        }} />
        <div style={{ flex: 1, width: 1, background: `linear-gradient(to bottom, ${cfg.color}30, transparent)`, minHeight: 12 }} />
      </div>

      {/* Card body */}
      <div className="flex-1 mb-2 mr-3 rounded-xl overflow-hidden transition-all" style={{
        background: isNew ? `${cfg.color}08` : 'rgba(255,255,255,0.018)',
        border: `1px solid ${isNew ? cfg.color + '25' : 'rgba(255,255,255,0.05)'}`,
        boxShadow: sev === 'CRITICAL' ? `0 0 18px ${sc.glow}` : sev === 'HIGH' ? `0 0 10px ${sc.glow}` : 'none',
        transition: 'background 0.4s, border-color 0.4s',
      }}>
        {/* Top row */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <span style={{ fontSize: 16, lineHeight: 1 }}>{cfg.icon}</span>

          {/* Type badge */}
          <span className="font-mono text-[9px] font-black px-2 py-0.5 rounded-full" style={{
            color: cfg.color, background: `${cfg.color}14`,
            border: `1px solid ${cfg.color}25`,
          }}>{cfg.label}</span>

          {/* Severity badge */}
          {sev !== 'INFO' && (
            <span className="font-mono text-[8px] font-black px-1.5 py-0.5 rounded" style={{
              color: sc.color, background: `${sc.color}12`,
              border: `1px solid ${sc.color}25`,
              animation: sev === 'CRITICAL' ? 'es-blink 1.2s ease-in-out infinite' : 'none',
            }}>{sc.label}</span>
          )}

          <div className="flex-1" />

          {/* Location */}
          <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{flag} {city}</span>

          {/* Time */}
          <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
            {formatClock(ev.occurred_at)}
          </span>

          {isNew && (
            <span className="font-mono text-[8px] font-bold" style={{
              color: cfg.color, animation: 'es-blink 1s ease-in-out 3',
            }}>NEW</span>
          )}
        </div>

        {/* Detail row */}
        <div className="px-4 pb-3 flex items-center gap-3">
          <p className="flex-1 font-mono text-[11px]" style={{ color: 'rgba(232,232,255,0.65)' }}>{detail}</p>
          {ev.score_pct != null && ev.event_type === 'NEW_MATCH' && (
            <div className="flex items-center gap-1.5">
              <div style={{ width: 48, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{
                  height: '100%', borderRadius: 1, background: cfg.color,
                  width: `${Math.min(Number(ev.score_pct), 100)}%`,
                  boxShadow: `0 0 6px ${cfg.color}60`,
                }} />
              </div>
              <span className="font-mono text-[9px] font-bold" style={{ color: cfg.color }}>
                {Number(ev.score_pct).toFixed(0)}%
              </span>
            </div>
          )}
          <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>
            {formatRelTime(ev.occurred_at)}
          </span>
        </div>
      </div>
    </div>
  );
});

/* ── Mission Status Panel ─────────────────────────────────────────────── */
function MissionStatus({ stats, events, hours }: {
  stats: EventStats | undefined; events: LiveEvent[]; hours: number;
}) {
  const [aiState, setAiState] = useState('PROCESSING');
  const [queue, setQueue] = useState(Math.floor(Math.random() * 18) + 4);
  const [speed, setSpeed] = useState(92 + Math.floor(Math.random() * 8));
  const [obsIdx, setObsIdx] = useState(0);
  const [obsFade, setObsFade] = useState(true);

  const AI_STATES = ['PROCESSING', 'ANALYZING', 'INDEXING', 'MATCHING', 'RESONATING'];

  useEffect(() => {
    const t1 = setInterval(() => setAiState(AI_STATES[Math.floor(Math.random() * AI_STATES.length)]), 3200);
    const t2 = setInterval(() => setQueue(q => Math.max(2, Math.min(30, q + Math.floor(Math.random()*5) - 2))), 2800);
    const t3 = setInterval(() => setSpeed(s => Math.max(80, Math.min(99, s + Math.floor(Math.random()*5) - 2))), 4000);
    const t4 = setInterval(() => {
      setObsFade(false);
      setTimeout(() => { setObsIdx(i => (i + 1) % AI_OBS_MSGS.length); setObsFade(true); }, 350);
    }, 6500);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); clearInterval(t4); };
  }, []);

  const windowMin = hours * 60;
  const dreamsPerMin = stats ? (stats.total_dreams / windowMin).toFixed(1) : '—';
  const matchesPerMin = stats ? (stats.total_matches / windowMin).toFixed(2) : '—';
  const countriesOnline = useMemo(() => {
    const s = new Set(events.map(e => e.pattern_value).filter(Boolean));
    return Math.max(s.size, 14);
  }, [events]);
  const avgAnalysis = useMemo(() => 1.2 + Math.random() * 0.8, []);

  const statusItems = [
    { label: 'AI QUEUE',          value: String(queue),         color: queue > 20 ? '#FF8C42' : '#38D68A', unit: 'jobs' },
    { label: 'DREAMS / MIN',      value: dreamsPerMin,          color: '#00CFFF',  unit: '/min' },
    { label: 'MATCHES / MIN',     value: matchesPerMin,         color: '#CC80FF',  unit: '/min' },
    { label: 'COUNTRIES ONLINE',  value: String(countriesOnline), color: '#FFB800', unit: 'active' },
    { label: 'PROC SPEED',        value: `${speed}%`,           color: speed > 95 ? '#38D68A' : '#FFB800', unit: '' },
    { label: 'AVG ANALYSIS',      value: `${avgAnalysis.toFixed(1)}s`, color: '#7B6FFF', unit: '' },
  ];

  return (
    <div className="flex flex-col gap-3" style={{ width: 260, flexShrink: 0 }}>

      {/* AI Status core */}
      <div className="os-card p-4" style={{
        background: 'rgba(6,4,16,0.98)', border: '1px solid rgba(123,111,255,0.15)',
      }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <span className="w-2 h-2 rounded-full block" style={{ background: '#38D68A' }} />
            <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#38D68A' }} />
          </div>
          <p className="os-title" style={{ color: '#38D68A' }}>AI STATUS</p>
        </div>
        <div className="py-3 px-3 rounded-xl mb-3 text-center" style={{
          background: 'rgba(56,214,138,0.06)', border: '1px solid rgba(56,214,138,0.15)',
        }}>
          <p className="font-mono text-[11px] font-black" style={{
            color: '#38D68A', letterSpacing: '0.15em',
            animation: 'es-breathe 2s ease-in-out infinite',
          }}>{aiState}</p>
        </div>
        {/* Speed bar */}
        <div className="mb-1">
          <div className="flex justify-between mb-1">
            <span className="font-mono text-[8px] text-dc-muted">PROCESSING SPEED</span>
            <span className="font-mono text-[8px] font-bold" style={{ color: '#38D68A' }}>{speed}%</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg, #38D68A40, #38D68A)',
              width: `${speed}%`, transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)',
              boxShadow: '0 0 6px #38D68A50',
            }} />
          </div>
        </div>
      </div>

      {/* Status items grid */}
      <div className="grid grid-cols-2 gap-2">
        {statusItems.map(({ label, value, color, unit }) => (
          <div key={label} className="os-card p-3" style={{ background: 'rgba(6,4,16,0.95)' }}>
            <p className="font-mono text-[7.5px] text-dc-muted mb-1">{label}</p>
            <p className="font-mono text-[15px] font-black leading-none" style={{ color }}>{value}</p>
            {unit && <p className="font-mono text-[8px] mt-0.5" style={{ color: `${color}50` }}>{unit}</p>}
          </div>
        ))}
      </div>

      {/* AI Observer */}
      <div className="os-card p-4" style={{
        background: 'rgba(6,4,16,0.97)', border: '1px solid rgba(255,184,0,0.12)',
      }}>
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: '#FFB800', fontSize: 9 }}>◈</span>
          <p className="os-title" style={{ color: '#FFB800' }}>AI OBSERVER</p>
        </div>
        <div style={{ opacity: obsFade ? 1 : 0, transition: 'opacity 0.35s', minHeight: 52 }}>
          <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.7)' }}>
            {AI_OBS_MSGS[obsIdx]}
          </p>
        </div>
        <div className="flex gap-1 mt-2">
          {AI_OBS_MSGS.slice(0, 6).map((_, i) => (
            <div key={i} style={{
              width: i === obsIdx % 6 ? 14 : 4, height: 2, borderRadius: 1,
              background: i === obsIdx % 6 ? '#FFB800' : 'rgba(255,184,0,0.2)',
              transition: 'all 0.35s',
            }} />
          ))}
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="os-card p-4" style={{ background: 'rgba(6,4,16,0.95)', border: '1px solid rgba(0,207,255,0.1)' }}>
          <p className="os-title mb-3" style={{ color: '#00CFFF' }}>SESSION TOTALS</p>
          <div className="space-y-2">
            {[
              { label: 'DREAMS',  val: stats.total_dreams,    color: '#00CFFF' },
              { label: 'MATCHES', val: stats.total_matches,   color: '#CC80FF' },
              { label: 'AI JOBS', val: stats.total_ai_events, color: '#FFB800' },
              { label: 'USERS',   val: stats.active_users,    color: '#38D68A' },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-mono text-[8px] text-dc-muted">{label}</span>
                <span className="font-mono text-[12px] font-black" style={{ color }}>
                  <CountUp to={val} dur={800} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Empty state ──────────────────────────────────────────────────────── */
const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      {/* Scanner ring */}
      <div className="relative" style={{ width: 120, height: 120 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '1px solid rgba(0,207,255,0.15)',
        }} />
        <div style={{
          position: 'absolute', inset: 8, borderRadius: '50%',
          border: '1px solid rgba(0,207,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', inset: 16, borderRadius: '50%',
          border: '1px solid rgba(0,207,255,0.05)',
        }} />
        {/* Rotating scanner arm */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#00CFFF',
          animation: 'es-spin 2s linear infinite',
        }} />
        {/* Center dot */}
        <div style={{
          position: 'absolute', inset: '50%', marginLeft: -4, marginTop: -4,
          width: 8, height: 8, borderRadius: '50%', background: '#00CFFF',
          animation: 'es-heartbeat 1.4s ease-in-out infinite',
          boxShadow: '0 0 12px #00CFFF',
        }} />
      </div>
      <div className="text-center">
        <p className="font-mono text-[11px] font-bold tracking-widest mb-2" style={{ color: '#00CFFF' }}>
          MONITORING GLOBAL DREAM NETWORK
        </p>
        <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
          Awaiting incoming dream signals…
        </p>
      </div>
    </div>
  );
});

/* ── Main ──────────────────────────────────────────────────────────────── */
export default function EventStream() {
  const [hours, setHours]   = useState(24);
  const [catFilter, setCat] = useState('All');
  const feedRef = useRef<HTMLDivElement>(null);

  const { data: apiEvents = [], isFetching } = useQuery({
    queryKey: ['engine-events', hours],
    queryFn: () => fetchLiveEvents(hours, 100),
    refetchInterval: 15_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['engine-stats', hours],
    queryFn: () => fetchEventStats(hours),
    refetchInterval: 15_000,
  });

  const { events: allEvents, newIds } = useLiveFeed(apiEvents);

  // Filtered by category
  const visible = useMemo(() => {
    if (catFilter === 'All') return allEvents;
    return allEvents.filter(e => getCategory(e) === catFilter);
  }, [allEvents, catFilter]);

  // Auto-scroll to top when new event arrives
  useEffect(() => {
    if (feedRef.current && feedRef.current.scrollTop < 80) {
      feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [allEvents.length]);

  // Top stat counts from all events
  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of allEvents) m[e.event_type] = (m[e.event_type] ?? 0) + 1;
    return m;
  }, [allEvents]);

  return (
    <div className="section-system relative">
      {/* Page-level CSS */}
      <style>{`
        @keyframes es-slide-in { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes es-blink     { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes es-dot-pulse { 0%{box-shadow:0 0 0 0 currentColor,0 0 12px currentColor} 70%{box-shadow:0 0 0 10px transparent,0 0 12px currentColor} 100%{box-shadow:0 0 0 0 transparent} }
        @keyframes es-breathe   { 0%,100%{opacity:0.7;letter-spacing:0.15em} 50%{opacity:1;letter-spacing:0.2em} }
        @keyframes es-heartbeat { 0%,100%{transform:scale(1);opacity:0.9} 50%{transform:scale(1.5);opacity:0.3} }
        @keyframes es-spin      { to{transform:rotate(360deg)} }
        @keyframes es-scan-v    { 0%{top:-4px} 100%{top:calc(100% + 4px)} }
        @keyframes es-pulse-r   { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.6);opacity:0} }
        .es-cat-btn { transition: all 0.18s; border-radius: 20px; }
        .es-cat-btn:hover { background: rgba(0,207,255,0.08) !important; }
        .es-cat-btn.active { background: rgba(0,207,255,0.12) !important; border-color: rgba(0,207,255,0.4) !important; }
        .es-feed::-webkit-scrollbar { width: 2px; }
        .es-feed::-webkit-scrollbar-track { background: transparent; }
        .es-feed::-webkit-scrollbar-thumb { background: rgba(0,207,255,0.2); border-radius: 1px; }
      `}</style>

      <Header
        title="Event Stream"
        subtitle="Global dream network — real-time mission control"
        section="system"
        actions={
          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{
              background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.2)',
            }}>
              <div className="relative w-1.5 h-1.5">
                <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#38D68A' }} />
                <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#38D68A' }} />
              </div>
              <span className="font-mono text-[9px] font-bold" style={{ color: '#38D68A' }}>
                LIVE · {visible.length} EVENTS
              </span>
            </div>
            {isFetching && (
              <span className="font-mono text-[8px]" style={{ color: 'rgba(0,207,255,0.4)' }}>↻ SYNCING</span>
            )}
            {/* Time window */}
            <div className="flex items-center gap-1 ml-2">
              {HOUR_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setHours(opt.value)}
                  className="px-2.5 py-1 font-mono text-[9px] font-bold border transition-all rounded-lg"
                  style={hours === opt.value ? {
                    background: 'rgba(0,207,255,0.1)', color: '#00CFFF', borderColor: 'rgba(0,207,255,0.3)',
                  } : {
                    background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.06)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* ── TOP METRIC BAR ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'NEW DREAMS',      val: typeCounts['NEW_DREAM'] ?? 0,      color: '#00CFFF', icon: '🌙' },
          { label: 'AI SIGNALS',      val: typeCounts['AI_SIGNAL'] ?? 0,      color: '#FFB800', icon: '🧠' },
          { label: 'MATCHES',         val: typeCounts['NEW_MATCH'] ?? 0,      color: '#CC80FF', icon: '🔗' },
          { label: 'CONNECTIONS',     val: typeCounts['NEW_CONNECTION'] ?? 0, color: '#38D68A', icon: '✨' },
        ].map(({ label, val, color, icon }) => (
          <div key={label} className="os-card p-4 relative overflow-hidden" style={{
            background: 'rgba(6,4,16,0.97)', border: `1px solid ${color}15`,
          }}>
            <div className="absolute top-3 right-4 text-2xl opacity-20">{icon}</div>
            <p className="font-mono text-[8px] font-bold tracking-widest mb-2" style={{ color, opacity: 0.7 }}>{label}</p>
            <p className="font-mono font-black" style={{ fontSize: 28, color, textShadow: `0 0 20px ${color}40` }}>
              <CountUp to={val} />
            </p>
            <p className="font-mono text-[8px] mt-1" style={{ color: `${color}40` }}>last {hours}h</p>
          </div>
        ))}
      </div>

      {/* ── CATEGORY FILTER BAR ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="font-mono text-[8px] text-dc-muted tracking-widest mr-1">FILTER</span>
        {CATEGORIES.map(cat => {
          const active = catFilter === cat;
          const catCount = cat === 'All' ? allEvents.length
            : allEvents.filter(e => getCategory(e) === cat).length;
          return (
            <button key={cat} onClick={() => setCat(cat)}
              className={`es-cat-btn font-mono text-[9px] font-bold px-3 py-1.5 border${active ? ' active' : ''}`}
              style={{
                color: active ? '#00CFFF' : 'rgba(232,232,255,0.4)',
                borderColor: active ? 'rgba(0,207,255,0.35)' : 'rgba(255,255,255,0.07)',
                background: active ? 'rgba(0,207,255,0.1)' : 'rgba(255,255,255,0.02)',
              }}>
              {cat}
              {catCount > 0 && (
                <span className="ml-1.5 font-mono text-[8px] opacity-60">{catCount}</span>
              )}
            </button>
          );
        })}
        {catFilter !== 'All' && (
          <button onClick={() => setCat('All')}
            className="font-mono text-[8px] px-2 py-1"
            style={{ color: 'rgba(232,232,255,0.25)' }}>
            ✕ clear
          </button>
        )}
      </div>

      {/* ── MAIN: FEED + MISSION STATUS ─────────────────────────────────── */}
      <div className="flex gap-5">

        {/* Event timeline feed */}
        <div className="flex-1 min-w-0 os-card overflow-hidden" style={{
          background: 'rgba(4,2,12,0.99)', border: '1px solid rgba(0,207,255,0.08)',
        }}>
          {/* Feed header */}
          <div className="os-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#00CFFF' }} />
                <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#00CFFF' }} />
              </div>
              <p className="os-title" style={{ color: '#00CFFF' }}>LIVE EVENT TIMELINE</p>
            </div>
            <div className="flex items-center gap-4">
              {catFilter !== 'All' && (
                <span className="font-mono text-[9px] font-bold px-2.5 py-1 rounded-full" style={{
                  color: '#00CFFF', background: 'rgba(0,207,255,0.1)', border: '1px solid rgba(0,207,255,0.25)',
                }}>
                  {catFilter}
                </span>
              )}
              <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
                {visible.length} events
              </span>
            </div>
          </div>

          {/* Timeline feed */}
          <div ref={feedRef} className="es-feed" style={{
            height: 640, overflowY: 'auto', overflowX: 'hidden',
            padding: '12px 8px 12px 16px',
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,207,255,0.2) transparent',
          }}>
            {visible.length === 0 ? (
              <EmptyState />
            ) : (
              visible.map((ev) => (
                <EventCard key={ev.id} ev={ev} isNew={newIds.has(ev.id)} />
              ))
            )}
          </div>
        </div>

        {/* Mission status panel */}
        <MissionStatus stats={stats} events={allEvents} hours={hours} />
      </div>
    </div>
  );
}
