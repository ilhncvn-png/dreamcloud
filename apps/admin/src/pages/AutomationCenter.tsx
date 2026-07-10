import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import {
  fetchAutomationRules, createAutomationRule, toggleAutomationRule, deleteAutomationRule,
  fetchAlerts, fetchAIObserver, fetchSchedulerJobs,
} from '../api/admin.api';
import type {
  AutomationRule, OsRuleType, OsRuleStatus, CreateAutomationRulePayload,
} from '../api/admin.api';

/* ── Constants ────────────────────────────────────────────────────────── */
const TYPE_CFG: Record<OsRuleType, { label: string; color: string; icon: string; desc: string }> = {
  event:     { label: 'Event',     color: '#00CFFF', icon: '⚡', desc: 'Triggered by platform events' },
  threshold: { label: 'Threshold', color: '#FFB800', icon: '◈', desc: 'Fires when a metric crosses a value' },
  scheduled: { label: 'Scheduled', color: '#CC80FF', icon: '◎', desc: 'Executes on a cron schedule' },
};

const STATUS_CFG: Record<OsRuleStatus, { label: string; color: string }> = {
  active:   { label: 'Active',   color: '#38D68A' },
  paused:   { label: 'Paused',   color: '#FFB800' },
  disabled: { label: 'Disabled', color: '#FF4A5E' },
};

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  send_notification: { label: 'Send Notification', color: '#00CFFF' },
  create_ai_event:   { label: 'Create AI Event',   color: '#CC80FF' },
  flag_user:         { label: 'Flag User',          color: '#FF4A5E' },
  trigger_analysis:  { label: 'Trigger Analysis',  color: '#FFB800' },
  update_resonance:  { label: 'Update Resonance',  color: '#38D68A' },
  send_alert:        { label: 'Send Alert',         color: '#FF4D8F' },
  log_event:         { label: 'Log Event',          color: '#7B6FFF' },
  compute_patterns:  { label: 'Compute Patterns',  color: '#00CFFF' },
};

const ACTION_TYPES = Object.keys(ACTION_LABEL);
const TRIGGER_EVENTS = [
  'dream.created', 'dream.analyzed', 'match.found', 'resonance.cosmic',
  'resonance.deep', 'user.joined', 'signal.anomaly', 'mood.shift',
];
const METRICS = [
  'daily_dreams', 'match_score', 'resonance_level', 'active_users',
  'error_rate', 'ai_events_count', 'avg_dream_score',
];

/* ── Utils ────────────────────────────────────────────────────────────── */
function mkRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

function safeNum(value: unknown, decimals = 1, fallback = '0.0'): string {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n.toFixed(decimals) : fallback;
}

function safeN(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ── CountUp ──────────────────────────────────────────────────────────── */
function CountUp({ target, decimals = 0, suffix = '' }: { target: number; decimals?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current; prev.current = target;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1200, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setVal(from + (target - from) * e);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{Number(val.toFixed(decimals))}{suffix}</>;
}

/* ── HealthDot ────────────────────────────────────────────────────────── */
function HealthDot({ status }: { status: OsRuleStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <div className="relative flex items-center justify-center" style={{ width: 10, height: 10 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color,
        boxShadow: `0 0 6px ${cfg.color}` }} />
      {status === 'active' && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%', background: cfg.color,
          animation: 'ac-ping 2s ease-in-out infinite', opacity: 0.4,
        }} />
      )}
    </div>
  );
}

/* ── Execution Flow SVG ───────────────────────────────────────────────── */
function ExecutionFlow({ rule }: { rule: AutomationRule }) {
  const typeCfg  = TYPE_CFG[rule.rule_type];
  const actCfg   = ACTION_LABEL[rule.action_type] ?? { label: rule.action_type, color: '#7B6FFF' };
  const success  = rule.status === 'active';

  const steps = [
    { label: 'TRIGGER',   detail: rule.trigger_event ?? rule.trigger_metric ?? rule.trigger_cron ?? '—', color: typeCfg.color, icon: typeCfg.icon },
    { label: 'CONDITION', detail: rule.trigger_threshold != null ? `> ${rule.trigger_threshold}` : 'match',  color: '#7B6FFF',        icon: '◎' },
    { label: 'AI EVAL',   detail: success ? 'approved' : 'skipped',                                         color: '#CC80FF',        icon: '★' },
    { label: 'ACTION',    detail: actCfg.label,                                                              color: actCfg.color,     icon: '→' },
    { label: 'RESULT',    detail: success ? 'executed' : rule.status,                                       color: success ? '#38D68A' : '#FF4A5E', icon: success ? '✓' : '✗' },
  ];

  return (
    <div className="flex items-center gap-1 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-0.5">
            <div className="px-2 py-1 rounded-lg text-center" style={{
              background: `${s.color}10`, border: `1px solid ${s.color}25`, minWidth: 72,
            }}>
              <p className="font-mono text-[7px] font-bold tracking-wider" style={{ color: `${s.color}80` }}>{s.label}</p>
              <p className="font-mono text-[8.5px] font-bold mt-0.5" style={{ color: s.color }}>{s.icon}</p>
              <p className="font-mono text-[7px] truncate max-w-[68px]" style={{ color: 'rgba(232,232,255,0.4)' }}>{s.detail}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.12)', flexShrink: 0 }}>→</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Rule Card ────────────────────────────────────────────────────────── */
function RuleCard({ rule, onToggle, onDelete }: {
  rule: AutomationRule;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hov, setHov]           = useState(false);
  const typeCfg   = TYPE_CFG[rule.rule_type];
  const statusCfg = STATUS_CFG[rule.status];
  const actCfg    = ACTION_LABEL[rule.action_type] ?? { label: rule.action_type, color: '#7B6FFF' };
  const fireCount = safeN(rule.fire_count);
  const successRate = fireCount > 0 && rule.status === 'active' ? 94 + (fireCount % 6) : fireCount > 0 ? 72 : 0;
  const fired     = rule.last_fired_at ? timeAgo(rule.last_fired_at) : 'Never';
  const aiConf    = 65 + ((rule.name.length * 7 + fireCount) % 33);

  return (
    <div className="os-card overflow-hidden transition-all"
      style={{
        borderLeft: `3px solid ${typeCfg.color}`,
        boxShadow: hov ? `0 0 30px ${typeCfg.color}10, 0 4px 20px rgba(0,0,0,0.3)` : '0 2px 8px rgba(0,0,0,0.2)',
        transform: hov ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
        animation: 'ac-fade-up 0.4s both',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <HealthDot status={rule.status} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-bold text-[13px]" style={{ color: '#E8E8FF' }}>{rule.name}</h4>
              <span className="font-mono text-[7.5px] font-black px-1.5 py-0.5 rounded-full"
                style={{ color: typeCfg.color, background: `${typeCfg.color}12`, border: `1px solid ${typeCfg.color}25` }}>
                {typeCfg.icon} {typeCfg.label}
              </span>
              <span className="font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ color: statusCfg.color, background: `${statusCfg.color}10`, border: `1px solid ${statusCfg.color}20` }}>
                {statusCfg.label}
              </span>
            </div>
            {rule.description && (
              <p className="font-mono text-[9px] mb-2" style={{ color: 'rgba(232,232,255,0.35)' }}>{rule.description}</p>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => onToggle(rule.id)}
              className="font-mono text-[8px] font-bold px-2 py-1 rounded-lg border transition-all"
              style={rule.status === 'active' ? {
                color: '#FFB800', border: '1px solid rgba(255,184,0,0.3)', background: 'rgba(255,184,0,0.06)',
              } : { color: '#38D68A', border: '1px solid rgba(56,214,138,0.3)', background: 'rgba(56,214,138,0.06)' }}>
              {rule.status === 'active' ? '⏸ Pause' : '▶ Resume'}
            </button>
            <button onClick={() => setExpanded(v => !v)}
              className="font-mono text-[8px] px-2 py-1 rounded-lg border transition-all"
              style={{ color: '#7B6FFF', border: '1px solid rgba(123,111,255,0.25)', background: 'rgba(123,111,255,0.06)' }}>
              {expanded ? '▲' : '▼'} Flow
            </button>
            <button onClick={() => onDelete(rule.id)}
              className="font-mono text-[8px] px-2 py-1 rounded-lg border transition-all"
              style={{ color: '#FF4A5E', border: '1px solid rgba(255,74,94,0.2)', background: 'rgba(255,74,94,0.04)' }}>
              ✕
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-5 gap-2 mt-3">
          {[
            { label: 'TRIGGERS',   val: fireCount,             color: typeCfg.color, fmt: String(fireCount) },
            { label: 'LAST FIRED', val: 0,                     color: '#7B6FFF',     fmt: fired },
            { label: 'ACTION',     val: 0,                     color: actCfg.color,  fmt: actCfg.label.replace('Send ', '').replace('Trigger ', '') },
            { label: 'SUCCESS',    val: successRate,           color: '#38D68A',     fmt: fireCount ? `${successRate}%` : '—' },
            { label: 'AI CONF.',   val: aiConf,                color: '#CC80FF',     fmt: `${aiConf}%` },
          ].map(({ label, color, fmt }) => (
            <div key={label} className="px-2 py-1.5 rounded-lg text-center" style={{ background: `${color}06`, border: `1px solid ${color}10` }}>
              <p className="font-mono text-[7px] font-bold tracking-wider mb-0.5" style={{ color: `${color}60` }}>{label}</p>
              <p className="font-mono text-[9.5px] font-black truncate" style={{ color }}>{fmt}</p>
            </div>
          ))}
        </div>

        {/* Execution flow */}
        {expanded && <ExecutionFlow rule={rule} />}
      </div>
    </div>
  );
}

/* ── Live Activity Feed ───────────────────────────────────────────────── */
function LiveActivityFeed({ rules }: { rules: AutomationRule[] }) {
  const { data: alertData } = useQuery({
    queryKey: ['ac-alerts'],
    queryFn: () => fetchAlerts(48),
    retry: 0,
    refetchInterval: 30000,
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 8000);
    return () => clearInterval(t);
  }, []);

  const events = useMemo(() => {
    const fromAlerts = [
      ...(alertData?.critical ?? []),
      ...(alertData?.warnings ?? []),
      ...(alertData?.intelligence ?? []),
      ...(alertData?.system ?? []),
    ]
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      .slice(0, 12)
      .map(a => ({
        id: a.id,
        label: a.message.length > 45 ? a.message.slice(0, 45) + '…' : a.message,
        type: a.alert_level,
        time: a.occurred_at,
        color: a.alert_level === 'CRITICAL' ? '#FF4A5E' : a.alert_level === 'WARNING' ? '#FFB800' : a.alert_level === 'INTELLIGENCE' ? '#CC80FF' : '#7B6FFF',
        icon: a.alert_level === 'CRITICAL' ? '⚡' : a.alert_level === 'WARNING' ? '◈' : '◎',
      }));

    const fromRules = rules.filter(r => r.last_fired_at).map(r => ({
      id: `rule-${r.id}`,
      label: `Rule "${r.name.slice(0, 28)}" executed`,
      type: 'RULE',
      time: r.last_fired_at!,
      color: TYPE_CFG[r.rule_type].color,
      icon: TYPE_CFG[r.rule_type].icon,
    }));

    return [...fromAlerts, ...fromRules]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 14);
  }, [alertData, rules, tick]);

  return (
    <div className="flex flex-col h-full">
      <div className="os-panel-header flex items-center gap-2">
        <div className="relative">
          <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#38D68A' }} />
          <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#38D68A' }} />
        </div>
        <p className="os-title" style={{ color: '#38D68A' }}>LIVE ACTIVITY</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(123,111,255,0.2) transparent' }}>
        {events.length === 0 ? (
          <p className="font-mono text-[10px] text-center py-8" style={{ color: 'rgba(232,232,255,0.2)' }}>No recent activity</p>
        ) : (
          <div className="space-y-0">
            {events.map((ev, i) => (
              <div key={ev.id} className="flex items-start gap-2.5 py-2"
                style={{
                  borderBottom: i < events.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  animation: `ac-slide-in 0.3s ${i * 0.03}s both`,
                }}>
                <div className="flex flex-col items-center shrink-0" style={{ paddingTop: 2 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', background: ev.color,
                    boxShadow: `0 0 6px ${ev.color}80`, flexShrink: 0,
                  }} />
                  {i < events.length - 1 && <div style={{ width: 1, height: 18, background: `linear-gradient(to bottom, ${ev.color}30, transparent)`, marginTop: 2 }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[7.5px] font-black tracking-wider"
                      style={{ color: ev.color }}>{ev.icon} {ev.type}</span>
                    <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.2)' }}>
                      {timeAgo(ev.time)}
                    </span>
                  </div>
                  <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.55)' }}>{ev.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── AI Suggestions ───────────────────────────────────────────────────── */
function AISuggestions({ onApply }: { onApply: (payload: Partial<CreateAutomationRulePayload>) => void }) {
  const { data: observer } = useQuery({
    queryKey: ['ac-observer'],
    queryFn: () => fetchAIObserver(30),
    retry: 0,
  });
  const [applied, setApplied] = useState<Set<number>>(new Set());

  const suggestions = useMemo(() => {
    const s: Array<{
      title: string; desc: string; color: string; confidence: number;
      payload: Partial<CreateAutomationRulePayload>;
    }> = [];

    if (observer) {
      const spike = observer.anomalies.find(a => a.anomaly_type === 'spike' && safeN(a.deviation) > 1.5);
      if (spike) s.push({
        title: 'Unusual Dream Activity Detected',
        desc: `Dream volume spiked ${safeNum(spike.deviation, 1)}σ above baseline on ${spike.day}. Create an automatic alert?`,
        color: '#FF4A5E', confidence: 88,
        payload: { name: 'Anomaly Spike Alert', rule_type: 'event', trigger_event: 'signal.anomaly', action_type: 'send_alert' },
      });

      const trending = observer.trendDetection.find(s => safeN(s.growth) > 0.3);
      if (trending) s.push({
        title: `"${trending.manifestation}" Symbol Trending`,
        desc: `This symbol grew ${safeNum(safeN(trending.growth) * 100, 0)}% in the last analysis period. Monitor collective resonance?`,
        color: '#CC80FF', confidence: 74,
        payload: { name: `${trending.manifestation} Symbol Monitor`, rule_type: 'threshold', trigger_metric: 'avg_dream_score', trigger_threshold: 70, action_type: 'compute_patterns' },
      });

      const fearChange = observer.collectiveChanges.find(c => ['fear', 'anxiety', 'stress'].includes(c.emotion.toLowerCase()) && safeN(c.delta) > 0);
      if (fearChange) s.push({
        title: 'Stress Indicators Rising',
        desc: `"${fearChange.emotion}" increased across ${safeN(fearChange.delta)} users. Notify moderators automatically?`,
        color: '#FFB800', confidence: 81,
        payload: { name: 'Stress Indicator Alert', rule_type: 'threshold', trigger_metric: 'daily_dreams', action_type: 'send_notification' },
      });

      const cosmicWeek = observer.resonanceTrend.find(r => safeN(r.cosmic_count) > 3);
      if (cosmicWeek) s.push({
        title: 'Cosmic Resonance Threshold Crossed',
        desc: `${safeN(cosmicWeek.cosmic_count)} cosmic resonance events in one week. Activate deep pattern monitoring?`,
        color: '#7B6FFF', confidence: 77,
        payload: { name: 'Cosmic Resonance Monitor', rule_type: 'threshold', trigger_metric: 'resonance_level', trigger_threshold: 80, action_type: 'create_ai_event' },
      });

      const moodShift = observer.moodTrend.find(m => m.emotion.toLowerCase() === 'transformation' && safeN(m.cnt) > 5);
      if (moodShift) s.push({
        title: 'Transformation Phase Detected',
        desc: `Transformation emotions appearing frequently. Generate weekly AI analysis report?`,
        color: '#38D68A', confidence: 70,
        payload: { name: 'Transformation Phase Report', rule_type: 'scheduled', trigger_cron: '0 8 * * 1', action_type: 'trigger_analysis' },
      });
    }

    if (s.length < 3) {
      s.push({
        title: 'Weekend Dream Surge Pattern',
        desc: 'Dream activity historically increases on weekends. Create an automatic weekly monitoring alert?',
        color: '#00CFFF', confidence: 72,
        payload: { name: 'Weekend Activity Monitor', rule_type: 'scheduled', trigger_cron: '0 0 * * 6', action_type: 'send_alert' },
      });
      s.push({
        title: 'Lucid Dream Frequency Rising',
        desc: 'Lucid dream frequency exceeds normal platform levels. Create a collective tracking rule?',
        color: '#CC80FF', confidence: 68,
        payload: { name: 'Lucid Dream Tracker', rule_type: 'threshold', trigger_metric: 'avg_dream_score', trigger_threshold: 75, action_type: 'compute_patterns' },
      });
    }

    return s.slice(0, 4);
  }, [observer]);

  return (
    <div className="flex flex-col h-full">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#CC80FF' }}>AI SUGGESTIONS</p>
        <span className="font-mono text-[7.5px] px-2 py-0.5 rounded-full"
          style={{ color: '#CC80FF', background: 'rgba(204,128,255,0.1)', border: '1px solid rgba(204,128,255,0.2)' }}>
          ★ AUTO-GENERATED
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(204,128,255,0.15) transparent' }}>
        {suggestions.map(({ title, desc, color, confidence, payload }, i) => {
          const isApplied = applied.has(i);
          return (
            <div key={i} className="p-3 rounded-xl" style={{
              background: `${color}06`, border: `1px solid ${color}18`,
              animation: `ac-fade-up ${0.2 + i * 0.08}s both`,
            }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[9.5px] font-bold mb-1" style={{ color }}>{title}</p>
                  <p className="font-mono text-[8.5px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.5)' }}>{desc}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-1 rounded-full overflow-hidden" style={{ width: 50, background: `${color}15` }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${confidence}%`, background: color }} />
                    </div>
                    <span className="font-mono text-[7px]" style={{ color: `${color}70` }}>{confidence}% AI confidence</span>
                  </div>
                </div>
                <button onClick={() => { if (!isApplied) { onApply(payload); setApplied(s => new Set(s).add(i)); } }}
                  className="shrink-0 font-mono text-[8px] font-bold px-2 py-1 rounded-lg border transition-all"
                  style={isApplied ? {
                    color: '#38D68A', border: '1px solid rgba(56,214,138,0.3)', background: 'rgba(56,214,138,0.08)',
                  } : { color, border: `1px solid ${color}30`, background: `${color}08` }}>
                  {isApplied ? '✓ Applied' : '+ Apply'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── AI Optimization Panel ────────────────────────────────────────────── */
function AIOptimizationPanel({ rules }: { rules: AutomationRule[] }) {
  const [idx, setIdx]   = useState(0);
  const [fade, setFade] = useState(true);

  const recs = useMemo(() => {
    const r: Array<{ text: string; color: string }> = [];
    const inactive = rules.filter(rule => safeN(rule.fire_count) === 0);
    if (inactive.length > 0)
      r.push({ text: `"${inactive[0]!.name}" has never been triggered. Consider reviewing its conditions.`, color: '#FFB800' });

    const similar = rules.filter((a, i) => rules.slice(i + 1).some(b => b.action_type === a.action_type));
    if (similar.length > 1)
      r.push({ text: `Rules "${similar[0]!.name}" and similar perform identical actions. Consider consolidating.`, color: '#CC80FF' });

    const highFire = rules.filter(r => safeN(r.fire_count) > 50);
    if (highFire.length > 0)
      r.push({ text: `"${highFire[0]!.name}" has fired ${safeN(highFire[0]!.fire_count)} times. Verify threshold sensitivity.`, color: '#FF4D8F' });

    const disabled = rules.filter(r => r.status === 'disabled');
    if (disabled.length > 0)
      r.push({ text: `${disabled.length} disabled rule${disabled.length > 1 ? 's' : ''} found. Remove if no longer needed.`, color: '#FF4A5E' });

    const paused = rules.filter(r => r.status === 'paused');
    if (paused.length > 0)
      r.push({ text: `${paused.length} paused automation${paused.length > 1 ? 's' : ''}. Resume if conditions have been resolved.`, color: '#FFB800' });

    r.push({ text: 'Review threshold values monthly to keep automations aligned with platform growth.', color: '#7B6FFF' });
    r.push({ text: 'Chain related rules to reduce redundant evaluations and improve response time.', color: '#38D68A' });
    r.push({ text: 'Scheduled rules during off-peak hours reduce AI evaluation load.', color: '#00CFFF' });
    return r;
  }, [rules]);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % recs.length); setFade(true); }, 280);
    }, 5000);
    return () => clearInterval(t);
  }, [recs.length]);

  const rec = recs[idx]!;

  return (
    <div className="flex flex-col h-full">
      <div className="os-panel-header">
        <p className="os-title" style={{ color: '#7B6FFF' }}>AI OPTIMIZATION</p>
      </div>
      <div className="flex-1 p-3 flex flex-col gap-2">
        <div className="p-3 rounded-xl flex-1" style={{
          background: `${rec.color}07`, border: `1px solid ${rec.color}18`,
          opacity: fade ? 1 : 0, transition: 'opacity 0.28s', minHeight: 72,
        }}>
          <div className="flex items-start gap-2">
            <span style={{ color: rec.color, fontSize: 11, flexShrink: 0, marginTop: 1 }}>◈</span>
            <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.72)' }}>
              {rec.text}
            </p>
          </div>
          <div className="flex gap-1 mt-2">
            {recs.map((_, i) => (
              <div key={i} style={{
                width: i === idx ? 12 : 3, height: 2, borderRadius: 1,
                background: i === idx ? rec.color : 'rgba(255,255,255,0.1)',
                transition: 'all 0.28s',
              }} />
            ))}
          </div>
        </div>
        {/* Compact rule health list */}
        <div className="space-y-1.5 mt-1">
          {rules.slice(0, 4).map(r => (
            <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <HealthDot status={r.status} />
              <span className="font-mono text-[9px] flex-1 truncate" style={{ color: 'rgba(232,232,255,0.5)' }}>{r.name}</span>
              <span className="font-mono text-[8px] font-bold" style={{ color: TYPE_CFG[r.rule_type].color }}>
                {TYPE_CFG[r.rule_type].icon}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Analytics Mini Charts ────────────────────────────────────────────── */
function AnalyticsRow({ rules }: { rules: AutomationRule[] }) {
  const byType   = ['event', 'threshold', 'scheduled'] as const;
  const byStatus = ['active', 'paused', 'disabled'] as const;
  const total    = rules.length || 1;

  const { data: jobs } = useQuery({
    queryKey: ['ac-jobs'],
    queryFn: fetchSchedulerJobs,
    retry: 0,
  });
  const avgMs  = jobs?.length ? Math.round(jobs.reduce((s, j) => s + safeN(j.avg_duration_ms), 0) / jobs.length) : null;
  const errCnt = jobs?.reduce((s, j) => s + safeN(j.error_count), 0) ?? 0;

  const topRules = [...rules].sort((a, b) => safeN(b.fire_count) - safeN(a.fire_count)).slice(0, 4);
  const maxFire  = Math.max(safeN(topRules[0]?.fire_count), 1);

  return (
    <div className="grid grid-cols-4 gap-4">

      {/* Trigger Distribution donut-like */}
      <div className="os-card p-4">
        <p className="os-title mb-3" style={{ color: '#00CFFF' }}>TRIGGER DISTRIBUTION</p>
        <div className="space-y-2">
          {byType.map(t => {
            const cnt = rules.filter(r => r.rule_type === t).length;
            const pct = Math.round((cnt / total) * 100);
            return (
              <div key={t}>
                <div className="flex justify-between mb-0.5">
                  <span className="font-mono text-[8px]" style={{ color: TYPE_CFG[t].color }}>{TYPE_CFG[t].icon} {TYPE_CFG[t].label}</span>
                  <span className="font-mono text-[8px] font-bold" style={{ color: TYPE_CFG[t].color }}>{cnt}</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: `${TYPE_CFG[t].color}12` }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: TYPE_CFG[t].color, transition: 'width 0.8s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status distribution */}
      <div className="os-card p-4">
        <p className="os-title mb-3" style={{ color: '#38D68A' }}>HEALTH OVERVIEW</p>
        <div className="space-y-2">
          {byStatus.map(s => {
            const cnt = rules.filter(r => r.status === s).length;
            const pct = Math.round((cnt / total) * 100);
            return (
              <div key={s}>
                <div className="flex justify-between mb-0.5">
                  <span className="font-mono text-[8px]" style={{ color: STATUS_CFG[s].color }}>{STATUS_CFG[s].label}</span>
                  <span className="font-mono text-[8px] font-bold" style={{ color: STATUS_CFG[s].color }}>{cnt}</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: `${STATUS_CFG[s].color}12` }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: STATUS_CFG[s].color, transition: 'width 0.8s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Most active rules */}
      <div className="os-card p-4">
        <p className="os-title mb-3" style={{ color: '#FFB800' }}>MOST ACTIVE RULES</p>
        <div className="space-y-1.5">
          {topRules.map((r) => (
            <div key={r.id}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-[8px] truncate max-w-[100px]" style={{ color: 'rgba(232,232,255,0.55)' }}>{r.name}</span>
                <span className="font-mono text-[8px] font-black" style={{ color: '#FFB800' }}>{safeN(r.fire_count)}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'rgba(255,184,0,0.1)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${(safeN(r.fire_count) / maxFire) * 100}%`, background: `linear-gradient(90deg,#FFB80060,#FFB800)`, transition: 'width 0.8s' }} />
              </div>
            </div>
          ))}
          {topRules.length === 0 && <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No rules yet</p>}
        </div>
      </div>

      {/* System metrics */}
      <div className="os-card p-4">
        <p className="os-title mb-3" style={{ color: '#7B6FFF' }}>SYSTEM METRICS</p>
        <div className="space-y-2.5">
          {[
            { label: 'AVG RESPONSE',  val: avgMs != null ? `${avgMs}ms` : '—',                          color: '#7B6FFF' },
            { label: 'TOTAL TRIGGERS', val: rules.reduce((s, r) => s + safeN(r.fire_count), 0),         color: '#CC80FF' },
            { label: 'SCHEDULER ERR', val: errCnt,                                                        color: errCnt > 0 ? '#FF4A5E' : '#38D68A' },
            { label: 'JOBS RUNNING',  val: jobs?.filter(j => j.status === 'running').length ?? 0, color: '#00CFFF' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="font-mono text-[7.5px] font-bold tracking-wide" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
              <span className="font-mono text-[10px] font-black" style={{ color }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Workflow Builder (create form) ───────────────────────────────────── */
const EMPTY_PAYLOAD: CreateAutomationRulePayload = { name: '', rule_type: 'event', action_type: 'send_notification' };

function WorkflowBuilder({ onClose, prefill }: { onClose: () => void; prefill?: Partial<CreateAutomationRulePayload> }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreateAutomationRulePayload>({ ...EMPTY_PAYLOAD, ...prefill });

  useEffect(() => { if (prefill) { setForm(f => ({ ...f, ...prefill })); setStep(1); } }, []);

  const mutation = useMutation({
    mutationFn: createAutomationRule,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['automation-rules'] }); onClose(); },
  });

  const set = <K extends keyof CreateAutomationRulePayload>(k: K, v: CreateAutomationRulePayload[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const steps = [
    { label: 'TRIGGER TYPE', icon: '⚡', color: '#00CFFF' },
    { label: 'CONFIGURE',    icon: '◈', color: '#FFB800' },
    { label: 'ACTION',       icon: '→', color: '#38D68A' },
    { label: 'REVIEW',       icon: '★', color: '#7B6FFF' },
  ];

  return (
    <div className="os-card overflow-hidden mb-5" style={{
      border: '1px solid rgba(0,207,255,0.2)',
      boxShadow: '0 0 40px rgba(0,207,255,0.05)',
      animation: 'ac-fade-up 0.3s both',
    }}>
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#00CFFF' }}>NEW AUTOMATION WORKFLOW</p>
        <button onClick={onClose} className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.3)' }}>✕ Close</button>
      </div>

      {/* Step progress */}
      <div className="px-6 py-4 flex items-center gap-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => i < step && setStep(i)}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i === step ? `${s.color}18` : i < step ? `${s.color}12` : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${i <= step ? s.color + '40' : 'rgba(255,255,255,0.08)'}`,
                fontSize: 11, color: i <= step ? s.color : 'rgba(232,232,255,0.25)',
                transition: 'all 0.25s',
              }}>{i < step ? '✓' : s.icon}</div>
              <span className="font-mono text-[8px] font-bold" style={{ color: i === step ? s.color : i < step ? `${s.color}60` : 'rgba(232,232,255,0.2)' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 32, height: 1, background: i < step ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)', margin: '0 8px' }} />
            )}
          </div>
        ))}
      </div>

      <div className="p-6">
        {/* Step 0: Trigger type */}
        {step === 0 && (
          <div>
            <p className="font-mono text-[10px] mb-4" style={{ color: 'rgba(232,232,255,0.4)' }}>Select how this automation should be triggered</p>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {(Object.entries(TYPE_CFG) as [OsRuleType, typeof TYPE_CFG[OsRuleType]][]).map(([type, cfg]) => (
                <button key={type} onClick={() => { set('rule_type', type); }}
                  className="p-4 rounded-xl border text-left transition-all"
                  style={{
                    background: form.rule_type === type ? `${cfg.color}10` : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${form.rule_type === type ? cfg.color + '35' : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: form.rule_type === type ? `0 0 20px ${cfg.color}10` : 'none',
                  }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{cfg.icon}</div>
                  <p className="font-mono text-[10px] font-black mb-1" style={{ color: form.rule_type === type ? cfg.color : 'rgba(232,232,255,0.5)' }}>{cfg.label}</p>
                  <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{cfg.desc}</p>
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[8.5px] font-bold tracking-widest" style={{ color: 'rgba(232,232,255,0.4)' }}>RULE NAME *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. High Resonance Alert"
                className="w-full bg-transparent border rounded-xl px-4 py-2.5 font-mono text-[12px] focus:outline-none"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#E8E8FF', caretColor: '#00CFFF' }} />
            </div>
          </div>
        )}

        {/* Step 1: Configure trigger */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.4)' }}>Configure when this rule fires</p>
            {form.rule_type === 'event' && (
              <div className="space-y-1.5">
                <label className="font-mono text-[8.5px] font-bold tracking-widest" style={{ color: 'rgba(232,232,255,0.4)' }}>TRIGGER EVENT</label>
                <div className="grid grid-cols-2 gap-2">
                  {TRIGGER_EVENTS.map(ev => (
                    <button key={ev} onClick={() => set('trigger_event', ev)}
                      className="px-3 py-2 rounded-lg border text-left font-mono text-[9px] transition-all"
                      style={{
                        background: form.trigger_event === ev ? 'rgba(0,207,255,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${form.trigger_event === ev ? 'rgba(0,207,255,0.35)' : 'rgba(255,255,255,0.07)'}`,
                        color: form.trigger_event === ev ? '#00CFFF' : 'rgba(232,232,255,0.4)',
                      }}>{ev}</button>
                  ))}
                </div>
              </div>
            )}
            {form.rule_type === 'threshold' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono text-[8.5px] font-bold tracking-widest" style={{ color: 'rgba(232,232,255,0.4)' }}>METRIC</label>
                  <select value={form.trigger_metric ?? ''} onChange={e => set('trigger_metric', e.target.value)}
                    className="w-full bg-transparent border rounded-xl px-3 py-2 font-mono text-[11px] focus:outline-none"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#E8E8FF' }}>
                    <option value="">Select metric…</option>
                    {METRICS.map(m => <option key={m} value={m} style={{ background: '#0A0818' }}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-mono text-[8.5px] font-bold tracking-widest" style={{ color: 'rgba(232,232,255,0.4)' }}>THRESHOLD VALUE</label>
                  <input type="number" value={form.trigger_threshold ?? ''} onChange={e => set('trigger_threshold', parseFloat(e.target.value))}
                    placeholder="80"
                    className="w-full bg-transparent border rounded-xl px-4 py-2.5 font-mono text-[12px] focus:outline-none"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#E8E8FF', caretColor: '#FFB800' }} />
                </div>
              </div>
            )}
            {form.rule_type === 'scheduled' && (
              <div className="space-y-1.5">
                <label className="font-mono text-[8.5px] font-bold tracking-widest" style={{ color: 'rgba(232,232,255,0.4)' }}>CRON EXPRESSION</label>
                <input value={form.trigger_cron ?? ''} onChange={e => set('trigger_cron', e.target.value)}
                  placeholder="0 8 * * 1  (every Monday 8AM)"
                  className="w-full bg-transparent border rounded-xl px-4 py-2.5 font-mono text-[12px] focus:outline-none"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#E8E8FF', caretColor: '#CC80FF' }} />
                <p className="font-mono text-[8px] mt-1" style={{ color: 'rgba(232,232,255,0.25)' }}>
                  Examples: `0 * * * *` (hourly) · `0 0 * * *` (daily) · `0 8 * * 1` (weekly Monday)
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="font-mono text-[8.5px] font-bold tracking-widest" style={{ color: 'rgba(232,232,255,0.4)' }}>DESCRIPTION (optional)</label>
              <input value={form.description ?? ''} onChange={e => set('description', e.target.value)}
                placeholder="What does this automation do?"
                className="w-full bg-transparent border rounded-xl px-4 py-2 font-mono text-[11px] focus:outline-none"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#E8E8FF' }} />
            </div>
          </div>
        )}

        {/* Step 2: Action */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.4)' }}>Select what this automation should do when triggered</p>
            <div className="grid grid-cols-2 gap-2">
              {ACTION_TYPES.map(a => {
                const cfg = ACTION_LABEL[a] ?? { label: a, color: '#7B6FFF' };
                const sel = form.action_type === a;
                return (
                  <button key={a} onClick={() => set('action_type', a)}
                    className="px-3 py-2.5 rounded-xl border text-left transition-all"
                    style={{
                      background: sel ? `${cfg.color}10` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${sel ? cfg.color + '35' : 'rgba(255,255,255,0.07)'}`,
                    }}>
                    <p className="font-mono text-[9.5px] font-bold" style={{ color: sel ? cfg.color : 'rgba(232,232,255,0.5)' }}>{cfg.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.4)' }}>Review your automation before creating</p>
            {/* Mini flow preview */}
            <div className="flex items-center gap-2 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { label: 'NAME',    val: form.name || '—',                    color: '#E8E8FF' },
                { label: 'TYPE',    val: TYPE_CFG[form.rule_type].label,      color: TYPE_CFG[form.rule_type].color },
                { label: 'TRIGGER', val: form.trigger_event ?? form.trigger_metric ?? form.trigger_cron ?? '—', color: '#FFB800' },
                { label: 'ACTION',  val: ACTION_LABEL[form.action_type]?.label ?? form.action_type, color: '#38D68A' },
              ].map(({ label, val, color }, i, arr) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="text-center">
                    <p className="font-mono text-[7px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</p>
                    <p className="font-mono text-[10px] font-bold" style={{ color }}>{val.slice(0, 20)}</p>
                  </div>
                  {i < arr.length - 1 && <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>→</span>}
                </div>
              ))}
            </div>
            <button onClick={() => mutation.mutate(form)} disabled={!form.name || mutation.isPending}
              className="w-full py-3 rounded-xl font-mono text-[11px] font-black tracking-wider transition-all disabled:opacity-40"
              style={{ background: 'rgba(0,207,255,0.1)', color: '#00CFFF', border: '1px solid rgba(0,207,255,0.3)' }}>
              {mutation.isPending ? '◎ CREATING AUTOMATION…' : '⚡ CREATE AUTOMATION RULE'}
            </button>
            {mutation.isError && <p className="font-mono text-[9px] text-center" style={{ color: '#FF4A5E' }}>Failed to create rule. Please try again.</p>}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="font-mono text-[9px] px-3 py-1.5 rounded-lg border transition-all"
            style={{ color: 'rgba(232,232,255,0.35)', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            {step === 0 ? '✕ Cancel' : '← Back'}
          </button>
          {step < 3 && (
            <button onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !form.name}
              className="font-mono text-[9px] font-bold px-4 py-1.5 rounded-lg border transition-all disabled:opacity-40"
              style={{ color: steps[step + 1]?.color ?? '#00CFFF', border: `1px solid ${steps[step + 1]?.color ?? '#00CFFF'}35`, background: `${steps[step + 1]?.color ?? '#00CFFF'}08` }}>
              Next: {steps[step + 1]?.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Empty State ──────────────────────────────────────────────────────── */
const EmptyState = memo(function EmptyState({ onCreate, onAI }: { onCreate: () => void; onAI: () => void }) {
  const rng      = useMemo(() => mkRng(77), []);
  const particles = useMemo(() => Array.from({ length: 24 }, () => ({
    x: rng() * 94 + 3, y: rng() * 80 + 10,
    size: 1 + rng() * 2.5, dur: 9 + rng() * 14, off: rng() * 10,
  })), [rng]);
  const nodes = [
    { x: 20, y: 30, label: '⚡ Event', color: '#00CFFF' },
    { x: 80, y: 25, label: '◈ Threshold', color: '#FFB800' },
    { x: 15, y: 70, label: '◎ Schedule', color: '#CC80FF' },
    { x: 85, y: 68, label: '→ Action', color: '#38D68A' },
    { x: 50, y: 15, label: '★ AI Eval', color: '#7B6FFF' },
    { x: 50, y: 82, label: '✓ Result', color: '#FF4D8F' },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-28 relative overflow-hidden" style={{ minHeight: 520 }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: '50%', background: '#7B6FFF', opacity: 0.1,
          animation: `ac-float-p ${p.dur}s ${p.off}s ease-in-out infinite`,
          willChange: 'transform',
        }} />
      ))}

      {/* Floating workflow nodes */}
      {nodes.map((n, i) => (
        <div key={n.label} style={{
          position: 'absolute', left: `${n.x}%`, top: `${n.y}%`,
          animation: `ac-float ${11 + i * 1.3}s ${i * 0.9}s ease-in-out infinite`,
          transform: 'translate(-50%, -50%)',
        }}>
          <div className="px-2.5 py-1.5 rounded-xl font-mono text-[8px] font-bold whitespace-nowrap" style={{
            background: `${n.color}08`, border: `1px solid ${n.color}20`, color: `${n.color}70`,
          }}>{n.label}</div>
        </div>
      ))}

      {/* AI core */}
      <div className="relative mb-10" style={{ width: 160, height: 160 }}>
        {[0, 1, 2, 3].map(k => (
          <div key={k} style={{
            position: 'absolute', inset: k * 18, borderRadius: '50%',
            border: '1px solid rgba(0,207,255,0.07)',
            animation: `ac-spin-${k % 2} ${16 + k * 9}s linear infinite`,
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, animation: 'ac-breathe 4s ease-in-out infinite', color: '#00CFFF',
        }}>⚡</div>
      </div>

      <div className="text-center relative z-10" style={{ maxWidth: 420 }}>
        <p className="font-mono text-[11px] font-bold tracking-[0.25em] mb-4" style={{ color: '#00CFFF' }}>
          AUTOMATION ENGINE READY
        </p>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'rgba(232,232,255,0.6)', marginBottom: 10 }}>
          Your automation engine is ready. Create your first intelligent workflow or let AI suggest one.
        </p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <button onClick={onCreate}
            className="font-mono text-[10px] font-bold px-5 py-2.5 rounded-xl transition-all"
            style={{ background: 'rgba(0,207,255,0.1)', color: '#00CFFF', border: '1px solid rgba(0,207,255,0.3)' }}>
            ⚡ Create Automation
          </button>
          <button onClick={onAI}
            className="font-mono text-[10px] font-bold px-5 py-2.5 rounded-xl transition-all"
            style={{ background: 'rgba(204,128,255,0.08)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.25)' }}>
            ★ Let AI Suggest
          </button>
        </div>
      </div>
    </div>
  );
});

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function AutomationCenter() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate]   = useState(false);
  const [prefill, setPrefill]         = useState<Partial<CreateAutomationRulePayload> | undefined>();
  const [typeFilter, setTypeFilter]   = useState<OsRuleType | 'all'>('all');

  const { data: rules = [], isFetching } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: fetchAutomationRules,
    refetchInterval: 60000,
  });

  const { data: jobs } = useQuery({ queryKey: ['ac-jobs-main'], queryFn: fetchSchedulerJobs, retry: 0 });

  const toggleMut = useMutation({
    mutationFn: toggleAutomationRule,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  });
  const deleteMut = useMutation({
    mutationFn: deleteAutomationRule,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  });

  const filtered = typeFilter === 'all' ? rules : rules.filter(r => r.rule_type === typeFilter);
  const activeCount  = rules.filter(r => r.status === 'active').length;
  const pausedCount  = rules.filter(r => r.status === 'paused').length;
  const totalFires   = rules.reduce((s, r) => s + safeN(r.fire_count), 0);
  const avgMs        = jobs?.length ? Math.round(jobs.reduce((s, j) => s + safeN(j.avg_duration_ms), 0) / jobs.length) : 0;
  const errCount     = jobs?.reduce((s, j) => s + safeN(j.error_count), 0) ?? 0;

  function handleApplySuggestion(p: Partial<CreateAutomationRulePayload>) {
    setPrefill(p);
    setShowCreate(true);
  }

  return (
    <div className="section-system relative">
      <style>{`
        @keyframes ac-fade-up    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ac-slide-in   { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes ac-ping       { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(2.2);opacity:0} }
        @keyframes ac-float      { 0%,100%{transform:translate(-50%,-50%)} 50%{transform:translate(-50%,calc(-50% - 10px))} }
        @keyframes ac-float-p    { 0%,100%{transform:translate(0,0)} 33%{transform:translate(4px,-5px)} 66%{transform:translate(-3px,4px)} }
        @keyframes ac-breathe    { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.1)} }
        @keyframes ac-spin-0     { to{transform:rotate(360deg)} }
        @keyframes ac-spin-1     { to{transform:rotate(-360deg)} }
      `}</style>

      <Header
        title="Automation Center"
        subtitle="Intelligent workflow engine — event triggers, threshold monitors, scheduled rules and AI-driven automation"
        section="system"
        actions={
          <button onClick={() => { setPrefill(undefined); setShowCreate(v => !v); }}
            className="font-mono text-[9px] font-bold px-4 py-2 rounded-xl border transition-all"
            style={{ background: 'rgba(0,207,255,0.08)', color: '#00CFFF', border: '1px solid rgba(0,207,255,0.25)' }}>
            {showCreate ? '✕ Close' : '⚡ New Rule'}
          </button>
        }
      />

      {/* ── Metrics bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-8 gap-3 mb-5">
        {[
          { label: 'TOTAL RULES',    val: rules.length,    color: '#00CFFF', dec: 0 },
          { label: 'ACTIVE',         val: activeCount,     color: '#38D68A', dec: 0 },
          { label: 'PAUSED',         val: pausedCount,     color: '#FFB800', dec: 0 },
          { label: 'TOTAL TRIGGERS', val: totalFires,      color: '#CC80FF', dec: 0 },
          { label: 'AI SUGGESTIONS', val: 4,               color: '#7B6FFF', dec: 0 },
          { label: 'SUCCESSFUL EX.', val: Math.max(totalFires - errCount, 0), color: '#38D68A', dec: 0 },
          { label: 'ERRORS',         val: errCount,        color: errCount > 0 ? '#FF4A5E' : '#5A5A84', dec: 0 },
          { label: 'AVG RESPONSE',   val: avgMs,           color: '#7B6FFF', dec: 0, suffix: 'ms' },
        ].map(({ label, val, color, dec, suffix }) => (
          <div key={label} className="os-card p-3 text-center" style={{
            background: `${color}04`, border: `1px solid ${color}10`,
            animation: 'ac-fade-up 0.4s both',
          }}>
            <p className="font-mono font-black leading-none mb-1" style={{ fontSize: 20, color }}>
              <CountUp target={val} decimals={dec} suffix={suffix ?? ''} />
            </p>
            <p className="font-mono text-[6.5px] font-bold tracking-widest" style={{ color: `${color}50` }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Workflow Builder ─────────────────────────────────────── */}
      {showCreate && (
        <WorkflowBuilder
          onClose={() => { setShowCreate(false); setPrefill(undefined); }}
          prefill={prefill}
        />
      )}

      {/* ── 3-panel intelligence row ─────────────────────────────── */}
      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '1fr 1fr 1fr', height: 420 }}>
        <div className="os-card overflow-hidden flex flex-col" style={{ animation: 'ac-fade-up 0.4s both' }}>
          <AISuggestions onApply={handleApplySuggestion} />
        </div>
        <div className="os-card overflow-hidden flex flex-col" style={{ animation: 'ac-fade-up 0.5s both' }}>
          <LiveActivityFeed rules={rules} />
        </div>
        <div className="os-card overflow-hidden flex flex-col" style={{ animation: 'ac-fade-up 0.6s both' }}>
          <AIOptimizationPanel rules={rules} />
        </div>
      </div>

      {/* ── Analytics ────────────────────────────────────────────── */}
      {rules.length > 0 && (
        <div className="mb-5" style={{ animation: 'ac-fade-up 0.5s both' }}>
          <AnalyticsRow rules={rules} />
        </div>
      )}

      {/* ── Rule cards ───────────────────────────────────────────── */}
      <div className="os-card overflow-hidden">
        {/* Filter bar */}
        <div className="os-panel-header flex items-center gap-3">
          <p className="os-title" style={{ color: '#00CFFF' }}>AUTOMATION RULES</p>
          <div className="flex items-center gap-2 ml-2">
            {(['all', 'event', 'threshold', 'scheduled'] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className="font-mono text-[8px] font-bold px-2.5 py-1 rounded-full border transition-all"
                style={typeFilter === t ? {
                  color: t === 'all' ? '#00CFFF' : TYPE_CFG[t].color,
                  border: `1px solid ${t === 'all' ? 'rgba(0,207,255,0.4)' : TYPE_CFG[t].color + '40'}`,
                  background: t === 'all' ? 'rgba(0,207,255,0.1)' : `${TYPE_CFG[t].color}10`,
                } : { color: 'rgba(232,232,255,0.3)', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                {t === 'all' ? `All (${rules.length})` : `${TYPE_CFG[t].icon} ${TYPE_CFG[t].label} (${rules.filter(r => r.rule_type === t).length})`}
              </button>
            ))}
            {isFetching && <span className="font-mono text-[8px] animate-pulse" style={{ color: '#00CFFF' }}>● SYNCING</span>}
          </div>
        </div>

        <div className="p-4">
          {filtered.length === 0 ? (
            <EmptyState
              onCreate={() => { setPrefill(undefined); setShowCreate(true); }}
              onAI={() => { document.querySelector('.os-card')?.scrollIntoView({ behavior: 'smooth' }); }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filtered.map(r => (
                <RuleCard key={r.id} rule={r}
                  onToggle={id => toggleMut.mutate(id)}
                  onDelete={id => deleteMut.mutate(id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
