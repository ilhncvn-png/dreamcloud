import { useState, useEffect, useMemo, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import {
  fetchScenarios, createScenario, toggleScenario, deleteScenario, fetchAIObserver,
} from '../api/admin.api';
import type {
  ScenarioRule, ScenarioCondition, ScenarioAction, CreateScenarioPayload, OsRuleStatus,
} from '../api/admin.api';

/* ── Constants ────────────────────────────────────────────────────────── */
const CONDITION_FIELDS = [
  'dream.category', 'dream.score', 'user.resonance_level', 'match.score',
  'platform.mood', 'user.connection_count', 'ai_event.severity', 'emotion.primary',
];
const OPERATORS = [
  { op: 'greater_than', sym: '>' }, { op: 'less_than', sym: '<' },
  { op: 'equals', sym: '=' },       { op: 'not_equals', sym: '≠' },
  { op: 'contains', sym: 'contains' }, { op: 'in', sym: 'in' },
];
const ACTION_TYPES = [
  'send_notification', 'trigger_analysis', 'create_ai_event',
  'flag_user', 'update_resonance', 'log_event', 'chain_scenario',
];
const ACTION_CFG: Record<string, { label: string; color: string }> = {
  send_notification: { label: 'Send Notification', color: '#00CFFF' },
  trigger_analysis:  { label: 'Trigger Analysis',  color: '#FFB800' },
  create_ai_event:   { label: 'Create AI Event',   color: '#CC80FF' },
  flag_user:         { label: 'Flag User',         color: '#FF4A5E' },
  update_resonance:  { label: 'Update Resonance',  color: '#38D68A' },
  log_event:         { label: 'Log Event',         color: '#7B6FFF' },
  chain_scenario:    { label: 'Chain Scenario',    color: '#FFB800' },
};
const STATUS_CFG: Record<OsRuleStatus, { color: string; label: string }> = {
  active:   { color: '#38D68A', label: 'Active'   },
  paused:   { color: '#FFB800', label: 'Paused'   },
  disabled: { color: '#5A5A84', label: 'Disabled' },
};

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

/* ── CountUp ──────────────────────────────────────────────────────────── */
function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const from = val; const start = performance.now(); let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1200, 1);
      setVal(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return <>{Math.round(val)}{suffix}</>;
}

/* ── HealthDot ────────────────────────────────────────────────────────── */
function HealthDot({ status }: { status: OsRuleStatus }) {
  const { color } = STATUS_CFG[status];
  return (
    <div className="relative" style={{ width: 10, height: 10, flexShrink: 0 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, margin: '1.5px' }} />
      {status === 'active' && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'sb-ping 2s ease-in-out infinite', opacity: 0.4 }} />
      )}
    </div>
  );
}

/* ── Flow node builder ────────────────────────────────────────────────── */
interface FNode { label: string; sub: string; color: string; icon: string; type: string }

function buildFlowNodes(rule: ScenarioRule): FNode[] {
  const nodes: FNode[] = [];
  nodes.push({ label: 'SCENARIO EVALUATED', sub: `Checks ${rule.if_conditions.length} condition${rule.if_conditions.length !== 1 ? 's' : ''}`, color: '#00CFFF', icon: '⚡', type: 'trigger' });
  rule.if_conditions.forEach((c, i) => {
    const opSym = OPERATORS.find(o => o.op === c.operator)?.sym ?? c.operator;
    const label = `${c.field} ${opSym} ${String(c.value)}`;
    nodes.push({ label: label.slice(0, 28), sub: `Condition ${i + 1}`, color: '#7B6FFF', icon: '◎', type: 'condition' });
  });
  nodes.push({ label: 'AI EVALUATION', sub: 'All conditions match?', color: '#CC80FF', icon: '★', type: 'ai_eval' });
  rule.then_actions.forEach((a, i) => {
    const cfg = ACTION_CFG[a.type] ?? { label: a.type, color: '#38D68A' };
    nodes.push({ label: cfg.label.toUpperCase(), sub: `Action ${i + 1}`, color: cfg.color, icon: '→', type: 'action' });
  });
  if (rule.chain_next_name) {
    nodes.push({ label: rule.chain_next_name.slice(0, 26).toUpperCase(), sub: 'Chain to next scenario', color: '#FFB800', icon: '⛓', type: 'chain' });
  }
  return nodes;
}

/* ── FlowCanvas ───────────────────────────────────────────────────────── */
function FlowCanvas({ rule, playStep = -1 }: { rule: ScenarioRule; playStep?: number }) {
  const nodes = useMemo(() => buildFlowNodes(rule), [rule]);
  const nodeW = 230, nodeH = 38, gap = 28, yStep = nodeH + gap, startY = 16;
  const svgW = 310, cx = svgW / 2, nodeX = cx - nodeW / 2;
  const svgH = startY + nodes.length * yStep + 20;
  const aiIdx = nodes.findIndex(n => n.type === 'ai_eval');

  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        {nodes.slice(0, -1).map((_, i) => {
          const y1 = startY + i * yStep + nodeH;
          const y2 = startY + (i + 1) * yStep;
          return <path key={i} id={`sb-e-${rule.id}-${i}`} d={`M ${cx} ${y1} L ${cx} ${y2}`} />;
        })}
      </defs>

      {/* Edges with particles */}
      {nodes.slice(0, -1).map((_, i) => {
        const y1 = startY + i * yStep + nodeH;
        const y2 = startY + (i + 1) * yStep;
        const next = nodes[i + 1]!;
        const active = playStep > i;
        return (
          <g key={i}>
            <path d={`M ${cx} ${y1} L ${cx} ${y2}`}
              stroke={active ? `${next.color}50` : 'rgba(255,255,255,0.08)'}
              strokeWidth={active ? 2 : 1.5} strokeDasharray={active ? '0' : '3 4'} fill="none" />
            <circle r={2.5} fill={next.color} opacity={0.85}>
              <animateMotion dur={`${0.9 + i * 0.08}s`} repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                <mpath href={`#sb-e-${rule.id}-${i}`} />
              </animateMotion>
            </circle>
          </g>
        );
      })}

      {/* Branch indicator at AI_EVAL */}
      {aiIdx >= 0 && (
        <g>
          <path d={`M ${cx} ${startY + aiIdx * yStep + nodeH + 3} Q ${cx - 36} ${startY + aiIdx * yStep + nodeH + 18} ${cx - 52} ${startY + aiIdx * yStep + nodeH + 26}`}
            stroke="rgba(56,214,138,0.25)" strokeWidth={1} fill="none" strokeDasharray="3 3" />
          <text x={cx - 58} y={startY + aiIdx * yStep + nodeH + 36} fill="rgba(56,214,138,0.45)" fontSize={6.5} fontFamily="monospace" fontWeight="bold">✓ MATCH</text>
          <path d={`M ${cx} ${startY + aiIdx * yStep + nodeH + 3} Q ${cx + 36} ${startY + aiIdx * yStep + nodeH + 18} ${cx + 52} ${startY + aiIdx * yStep + nodeH + 26}`}
            stroke="rgba(255,74,94,0.25)" strokeWidth={1} fill="none" strokeDasharray="3 3" />
          <text x={cx + 24} y={startY + aiIdx * yStep + nodeH + 36} fill="rgba(255,74,94,0.45)" fontSize={6.5} fontFamily="monospace" fontWeight="bold">✗ SKIP</text>
        </g>
      )}

      {/* Nodes */}
      {nodes.map((n, i) => {
        const y = startY + i * yStep;
        const isPlaying = playStep === i;
        const isDone = playStep > i;
        return (
          <g key={i}>
            <rect x={nodeX} y={y} width={nodeW} height={nodeH} rx={8}
              fill={isDone ? `${n.color}15` : isPlaying ? `${n.color}20` : `${n.color}07`}
              stroke={isDone || isPlaying ? `${n.color}55` : `${n.color}20`}
              strokeWidth={isPlaying ? 2 : 1} />
            {/* Left accent */}
            <rect x={nodeX} y={y + 6} width={3} height={nodeH - 12} rx={1.5} fill={n.color} opacity={isDone || isPlaying ? 1 : 0.35} />
            {/* Pulse ring when playing */}
            {isPlaying && (
              <rect x={nodeX - 3} y={y - 3} width={nodeW + 6} height={nodeH + 6} rx={11}
                fill="none" stroke={n.color} strokeWidth={1.5} opacity={0.3}
                style={{ animation: 'sb-ping-rect 1s ease-in-out infinite' }} />
            )}
            {/* Icon */}
            <text x={nodeX + 14} y={y + 25} fill={n.color} fontSize={11} fontFamily="monospace">{n.icon}</text>
            {/* Label */}
            <text x={nodeX + 30} y={y + 16} fill={isDone || isPlaying ? '#E8E8FF' : 'rgba(232,232,255,0.6)'}
              fontSize={9.5} fontFamily="monospace" fontWeight="bold">{n.label}</text>
            {/* Sublabel */}
            <text x={nodeX + 30} y={y + 29} fill="rgba(232,232,255,0.28)" fontSize={7.5} fontFamily="monospace">{n.sub}</text>
            {/* Done check */}
            {isDone && <text x={nodeX + nodeW - 18} y={y + 25} fill="#38D68A" fontSize={12} fontFamily="monospace">✓</text>}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Scenario Card ────────────────────────────────────────────────────── */
function ScenarioCard({ rule, onToggle, onDelete }: {
  rule: ScenarioRule;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hov, setHov] = useState(false);
  const [playStep, setPlayStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const nodes = useMemo(() => buildFlowNodes(rule), [rule]);
  const sc = STATUS_CFG[rule.status];
  const tc = safeN(rule.trigger_count);
  const fired = rule.last_triggered_at ? timeAgo(rule.last_triggered_at) : 'Never';
  const successRate = tc > 0 ? Math.min(94 + (tc % 6), 99) : 0;
  const aiConf = 65 + ((rule.name.length * 7 + tc) % 30);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (playStep >= nodes.length - 1) { setPlaying(false); }
      else { setPlayStep(s => s + 1); }
    }, playStep === -1 ? 0 : 700);
    return () => clearTimeout(t);
  }, [playing, playStep, nodes.length]);

  function simulate() {
    setExpanded(true);
    setPlayStep(0);
    setPlaying(true);
  }
  function stopPlay() { setPlaying(false); setPlayStep(-1); }

  return (
    <div className="os-card overflow-hidden transition-all"
      style={{
        borderLeft: `3px solid ${sc.color}`,
        boxShadow: hov ? `0 0 30px ${sc.color}08, 0 4px 24px rgba(0,0,0,0.3)` : '0 2px 8px rgba(0,0,0,0.2)',
        transform: hov ? 'translateY(-1px)' : 'none',
        transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
        animation: 'sb-fade-up 0.4s both',
      }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="pt-0.5"><HealthDot status={rule.status} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-bold text-[13px]" style={{ color: '#E8E8FF' }}>{rule.name}</h4>
              <span className="font-mono text-[7.5px] font-black px-1.5 py-0.5 rounded-full"
                style={{ color: sc.color, background: `${sc.color}12`, border: `1px solid ${sc.color}25` }}>{sc.label}</span>
              {rule.chain_next_name && (
                <span className="font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ color: '#FFB800', background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)' }}>
                  ⛓ {rule.chain_next_name.slice(0, 20)}
                </span>
              )}
            </div>
            {rule.description && (
              <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.35)' }}>{rule.description}</p>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={playing ? stopPlay : simulate}
              className="font-mono text-[8px] font-bold px-2.5 py-1 rounded-lg border transition-all"
              style={playing ? {
                color: '#FFB800', border: '1px solid rgba(255,184,0,0.3)', background: 'rgba(255,184,0,0.08)',
              } : { color: '#CC80FF', border: '1px solid rgba(204,128,255,0.25)', background: 'rgba(204,128,255,0.06)' }}>
              {playing ? '■ Stop' : '▶ Run'}
            </button>
            <button onClick={() => onToggle(rule.id)}
              className="font-mono text-[8px] font-bold px-2.5 py-1 rounded-lg border transition-all"
              style={rule.status === 'active' ? {
                color: '#FFB800', border: '1px solid rgba(255,184,0,0.3)', background: 'rgba(255,184,0,0.06)',
              } : { color: '#38D68A', border: '1px solid rgba(56,214,138,0.3)', background: 'rgba(56,214,138,0.06)' }}>
              {rule.status === 'active' ? '⏸' : '▶'}
            </button>
            <button onClick={() => setExpanded(v => !v)}
              className="font-mono text-[8px] px-2.5 py-1 rounded-lg border transition-all"
              style={{ color: '#7B6FFF', border: '1px solid rgba(123,111,255,0.25)', background: 'rgba(123,111,255,0.06)' }}>
              {expanded ? '▲' : '▼'}
            </button>
            <button onClick={() => onDelete(rule.id)}
              className="font-mono text-[8px] px-2 py-1 rounded-lg border"
              style={{ color: '#FF4A5E', border: '1px solid rgba(255,74,94,0.2)', background: 'rgba(255,74,94,0.04)' }}>✕</button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-6 gap-2 mt-3">
          {[
            { label: 'CONDITIONS', val: rule.if_conditions.length, color: '#7B6FFF', fmt: String(rule.if_conditions.length) },
            { label: 'ACTIONS',    val: rule.then_actions.length,  color: '#38D68A', fmt: String(rule.then_actions.length) },
            { label: 'TRIGGERS',   val: tc,                        color: '#00CFFF', fmt: String(tc) },
            { label: 'LAST RUN',   val: 0,                         color: '#CC80FF', fmt: fired },
            { label: 'SUCCESS',    val: successRate,               color: '#38D68A', fmt: tc ? `${successRate}%` : '—' },
            { label: 'AI CONF.',   val: aiConf,                    color: '#FFB800', fmt: `${aiConf}%` },
          ].map(({ label, color, fmt }) => (
            <div key={label} className="px-2 py-1.5 rounded-lg text-center"
              style={{ background: `${color}06`, border: `1px solid ${color}10` }}>
              <p className="font-mono text-[7px] font-bold tracking-wider mb-0.5" style={{ color: `${color}60` }}>{label}</p>
              <p className="font-mono text-[9.5px] font-black truncate" style={{ color }}>{fmt}</p>
            </div>
          ))}
        </div>

        {/* Mini horizontal pipeline */}
        {!expanded && (
          <div className="flex items-center gap-1 mt-3 pt-3 overflow-x-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {buildFlowNodes(rule).map((n, i, arr) => (
              <div key={i} className="flex items-center gap-1 shrink-0">
                <div className="font-mono text-[8px] font-bold px-2 py-1 rounded-lg whitespace-nowrap"
                  style={{ background: `${n.color}08`, border: `1px solid ${n.color}20`, color: n.color }}>
                  {n.icon} {n.label.slice(0, 18)}
                </div>
                {i < arr.length - 1 && (
                  <span className="font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.12)' }}>→</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded: flow canvas + IF/THEN detail */}
      {expanded && (
        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="grid grid-cols-2 gap-0">
            {/* Left: flow canvas */}
            <div className="p-4 flex justify-center" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              {playing && (
                <div className="absolute top-2 right-2 font-mono text-[8px] px-2 py-0.5 rounded-full"
                  style={{ color: '#38D68A', background: 'rgba(56,214,138,0.1)', border: '1px solid rgba(56,214,138,0.2)', animation: 'sb-breathe 1s ease-in-out infinite' }}>
                  ● EXECUTING
                </div>
              )}
              <FlowCanvas rule={rule} playStep={playStep} />
            </div>
            {/* Right: conditions + actions detail */}
            <div className="p-4 space-y-4">
              <div>
                <p className="font-mono text-[8.5px] font-bold tracking-widest mb-2" style={{ color: 'rgba(123,111,255,0.7)' }}>IF CONDITIONS</p>
                <div className="space-y-1.5">
                  {rule.if_conditions.map((c, i) => {
                    const opSym = OPERATORS.find(o => o.op === c.operator)?.sym ?? c.operator;
                    return (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                        style={{ background: 'rgba(123,111,255,0.06)', border: '1px solid rgba(123,111,255,0.12)' }}>
                        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{i + 1}.</span>
                        <code className="font-mono text-[9px] font-bold" style={{ color: '#00CFFF' }}>{c.field}</code>
                        <span className="font-mono text-[8.5px]" style={{ color: '#7B6FFF' }}>{opSym}</span>
                        <code className="font-mono text-[9px] font-bold" style={{ color: '#FFB800' }}>{String(c.value)}</code>
                      </div>
                    );
                  })}
                  {rule.if_conditions.length === 0 && <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No conditions</p>}
                </div>
              </div>
              <div>
                <p className="font-mono text-[8.5px] font-bold tracking-widest mb-2" style={{ color: 'rgba(56,214,138,0.7)' }}>THEN ACTIONS</p>
                <div className="space-y-1.5">
                  {rule.then_actions.map((a, i) => {
                    const cfg = ACTION_CFG[a.type] ?? { label: a.type, color: '#38D68A' };
                    return (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                        style={{ background: `${cfg.color}06`, border: `1px solid ${cfg.color}15` }}>
                        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{i + 1}.</span>
                        <span className="font-mono text-[9px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                        {Object.keys(a.config).length > 0 && (
                          <code className="font-mono text-[7.5px] truncate max-w-[120px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
                            {JSON.stringify(a.config).slice(0, 35)}
                          </code>
                        )}
                      </div>
                    );
                  })}
                  {rule.then_actions.length === 0 && <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No actions</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── AI Scenario Suggestions ──────────────────────────────────────────── */
function AIScenarioSuggestions({ onApply }: { onApply: (p: Partial<CreateScenarioPayload & { _hint: string }>) => void }) {
  const { data: obs } = useQuery({ queryKey: ['sb-observer'], queryFn: () => fetchAIObserver(30), retry: 0 });
  const [applied, setApplied] = useState<Set<number>>(new Set());

  const suggestions = useMemo(() => {
    const s: Array<{ title: string; desc: string; color: string; confidence: number; payload: Partial<CreateScenarioPayload> }> = [];

    if (obs) {
      const spike = obs.anomalies.find(a => a.anomaly_type === 'spike' && safeN(a.deviation) > 1.5);
      if (spike) s.push({
        title: 'Nightmare Surge Detected',
        desc: `Dream volume spiked ${safeN(spike.deviation).toFixed(1)}σ on ${spike.day}. Create a monitoring scenario?`,
        color: '#FF4A5E', confidence: 89,
        payload: { name: 'Nightmare Surge Monitor', if_conditions: [{ field: 'dream.score', operator: 'less_than', value: 30 }], then_actions: [{ type: 'send_notification', config: {} }, { type: 'create_ai_event', config: {} }] },
      });
      const trending = obs.trendDetection.find(t => safeN(t.growth) > 0.3);
      if (trending) s.push({
        title: `"${trending.manifestation}" Archetype Spreading`,
        desc: `Collective symbol growth at ${(safeN(trending.growth) * 100).toFixed(0)}%. Detect and track shared symbols.`,
        color: '#CC80FF', confidence: 76,
        payload: { name: `${trending.manifestation} Symbol Tracker`, if_conditions: [{ field: 'match.score', operator: 'greater_than', value: 70 }], then_actions: [{ type: 'compute_patterns' as string, config: {} }] },
      });
      const fear = obs.collectiveChanges.find(c => ['fear', 'anxiety'].includes(c.emotion.toLowerCase()) && safeN(c.delta) > 0);
      if (fear) s.push({
        title: 'Fear Emotion Collective Rise',
        desc: `"${fear.emotion}" increased across ${safeN(fear.delta)} users. Flag high-risk profiles automatically?`,
        color: '#FFB800', confidence: 82,
        payload: { name: 'Fear Collective Alert', if_conditions: [{ field: 'emotion.primary', operator: 'equals', value: fear.emotion }, { field: 'user.resonance_level', operator: 'greater_than', value: 60 }], then_actions: [{ type: 'flag_user', config: {} }, { type: 'send_notification', config: {} }] },
      });
      const cosmic = obs.resonanceTrend.find(r => safeN(r.cosmic_count) > 3);
      if (cosmic) s.push({
        title: 'Cosmic Resonance Cluster',
        desc: `${safeN(cosmic.cosmic_count)} cosmic resonance events detected. Chain to deep analysis scenario?`,
        color: '#7B6FFF', confidence: 78,
        payload: { name: 'Cosmic Resonance Detector', if_conditions: [{ field: 'match.score', operator: 'greater_than', value: 90 }, { field: 'user.resonance_level', operator: 'greater_than', value: 80 }], then_actions: [{ type: 'trigger_analysis', config: {} }, { type: 'create_ai_event', config: {} }] },
      });
    }

    if (s.length < 3) {
      s.push({ title: 'Nightmares After Midnight', desc: 'Dreams submitted after midnight show higher fear scores. Build a temporal detection scenario.', color: '#00CFFF', confidence: 73, payload: { name: 'Late Night Nightmare Detector', if_conditions: [{ field: 'dream.score', operator: 'less_than', value: 35 }, { field: 'dream.category', operator: 'equals', value: 'nightmare' }], then_actions: [{ type: 'create_ai_event', config: {} }] } });
      s.push({ title: 'Shared Symbol Rapid Spread', desc: 'Same symbol appearing in 10+ dreams within 24h. Create a collective intelligence scenario.', color: '#38D68A', confidence: 68, payload: { name: 'Symbol Spread Detector', if_conditions: [{ field: 'match.score', operator: 'greater_than', value: 85 }], then_actions: [{ type: 'trigger_analysis', config: {} }, { type: 'log_event', config: {} }] } });
    }

    return s.slice(0, 4);
  }, [obs]);

  return (
    <div className="os-card overflow-hidden" style={{ animation: 'sb-fade-up 0.5s both' }}>
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#CC80FF' }}>AI GENERATED SCENARIOS</p>
        <span className="font-mono text-[7.5px] px-2 py-0.5 rounded-full"
          style={{ color: '#CC80FF', background: 'rgba(204,128,255,0.08)', border: '1px solid rgba(204,128,255,0.2)' }}>
          ★ AUTO-DETECTED
        </span>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {suggestions.map(({ title, desc, color, confidence, payload }, i) => {
          const isApplied = applied.has(i);
          return (
            <div key={i} className="p-3 rounded-xl" style={{
              background: `${color}06`, border: `1px solid ${color}18`,
              animation: `sb-fade-up ${0.3 + i * 0.07}s both`,
            }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-mono text-[10px] font-bold mb-1" style={{ color }}>{title}</p>
                  <p className="font-mono text-[8.5px] leading-relaxed mb-2" style={{ color: 'rgba(232,232,255,0.45)' }}>{desc}</p>
                  <div className="flex items-center gap-2">
                    <div className="h-1 rounded-full overflow-hidden" style={{ width: 44, background: `${color}15` }}>
                      <div style={{ height: '100%', width: `${confidence}%`, background: color }} />
                    </div>
                    <span className="font-mono text-[7px]" style={{ color: `${color}60` }}>{confidence}% confidence</span>
                  </div>
                </div>
                <button onClick={() => { if (!isApplied) { onApply(payload); setApplied(s => new Set(s).add(i)); } }}
                  className="shrink-0 font-mono text-[8px] font-bold px-2 py-1 rounded-lg border transition-all"
                  style={isApplied ? {
                    color: '#38D68A', border: '1px solid rgba(56,214,138,0.3)', background: 'rgba(56,214,138,0.08)',
                  } : { color, border: `1px solid ${color}30`, background: `${color}08` }}>
                  {isApplied ? '✓' : '+'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── AI Recommendations ───────────────────────────────────────────────── */
function AIRecommendations({ scenarios }: { scenarios: ScenarioRule[] }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const recs = useMemo(() => {
    const r: Array<{ text: string; color: string }> = [];
    const never = scenarios.filter(s => safeN(s.trigger_count) === 0);
    if (never.length) r.push({ text: `"${never[0]!.name}" has never been triggered. Review its conditions.`, color: '#FFB800' });
    const chained = scenarios.filter(s => s.chain_next_id);
    if (chained.length > 2) r.push({ text: `${chained.length} chained scenarios detected. Verify execution order to avoid loops.`, color: '#CC80FF' });
    const highTrigger = scenarios.filter(s => safeN(s.trigger_count) > 100);
    if (highTrigger.length) r.push({ text: `"${highTrigger[0]!.name}" triggered ${safeN(highTrigger[0]!.trigger_count)} times. Consider raising threshold.`, color: '#FF4D8F' });
    const disabled = scenarios.filter(s => s.status === 'disabled');
    if (disabled.length) r.push({ text: `${disabled.length} disabled scenario${disabled.length > 1 ? 's' : ''}. Remove stale workflows to keep the engine clean.`, color: '#FF4A5E' });
    r.push({ text: 'Chain related scenarios to build multi-step AI investigation workflows.', color: '#7B6FFF' });
    r.push({ text: 'Use AI EVAL threshold > 80% confidence to reduce false-positive executions.', color: '#38D68A' });
    r.push({ text: 'Group scenarios by domain (nightmares, resonance, collective) for better organization.', color: '#00CFFF' });
    return r;
  }, [scenarios]);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % recs.length); setFade(true); }, 280);
    }, 5200);
    return () => clearInterval(t);
  }, [recs.length]);

  const rec = recs[idx]!;
  return (
    <div className="os-card p-4" style={{ animation: 'sb-fade-up 0.6s both' }}>
      <p className="os-title mb-3" style={{ color: '#7B6FFF' }}>AI RECOMMENDATIONS</p>
      <div className="p-3 rounded-xl" style={{
        background: `${rec.color}07`, border: `1px solid ${rec.color}18`,
        opacity: fade ? 1 : 0, transition: 'opacity 0.28s', minHeight: 64,
      }}>
        <div className="flex items-start gap-2">
          <span style={{ color: rec.color, flexShrink: 0, marginTop: 1 }}>◈</span>
          <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.7)' }}>{rec.text}</p>
        </div>
      </div>
      <div className="flex gap-1 mt-2">
        {recs.map((_, i) => (
          <div key={i} style={{ width: i === idx ? 12 : 3, height: 2, borderRadius: 1, background: i === idx ? rec.color : 'rgba(255,255,255,0.1)', transition: 'all 0.28s' }} />
        ))}
      </div>
    </div>
  );
}

/* ── Analytics Panel ──────────────────────────────────────────────────── */
function AnalyticsPanel({ scenarios }: { scenarios: ScenarioRule[] }) {
  const total = scenarios.length || 1;
  const byStatus = (['active', 'paused', 'disabled'] as OsRuleStatus[]).map(s => ({
    s, cnt: scenarios.filter(r => r.status === s).length,
  }));
  const topTriggers = [...scenarios].sort((a, b) => safeN(b.trigger_count) - safeN(a.trigger_count)).slice(0, 5);
  const maxTC = Math.max(safeN(topTriggers[0]?.trigger_count), 1);
  const condDist = CONDITION_FIELDS.map(f => ({
    f, cnt: scenarios.reduce((s, r) => s + r.if_conditions.filter(c => c.field === f).length, 0),
  })).filter(x => x.cnt > 0).sort((a, b) => b.cnt - a.cnt).slice(0, 5);
  const maxCond = Math.max(...condDist.map(x => x.cnt), 1);

  return (
    <div className="grid grid-cols-3 gap-4" style={{ animation: 'sb-fade-up 0.5s both' }}>
      {/* Health */}
      <div className="os-card p-4">
        <p className="os-title mb-3" style={{ color: '#38D68A' }}>SCENARIO HEALTH</p>
        <div className="space-y-2">
          {byStatus.map(({ s, cnt }) => (
            <div key={s}>
              <div className="flex justify-between mb-0.5">
                <span className="font-mono text-[8px]" style={{ color: STATUS_CFG[s].color }}>{STATUS_CFG[s].label}</span>
                <span className="font-mono text-[8px] font-black" style={{ color: STATUS_CFG[s].color }}>{cnt}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: `${STATUS_CFG[s].color}12` }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${Math.round((cnt / total) * 100)}%`, background: STATUS_CFG[s].color, transition: 'width 0.8s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top triggers */}
      <div className="os-card p-4">
        <p className="os-title mb-3" style={{ color: '#FFB800' }}>MOST TRIGGERED</p>
        <div className="space-y-1.5">
          {topTriggers.map(r => (
            <div key={r.id}>
              <div className="flex justify-between mb-0.5">
                <span className="font-mono text-[8px] truncate max-w-[110px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{r.name}</span>
                <span className="font-mono text-[8px] font-black" style={{ color: '#FFB800' }}>{safeN(r.trigger_count)}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'rgba(255,184,0,0.1)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${(safeN(r.trigger_count) / maxTC) * 100}%`, background: 'linear-gradient(90deg,#FFB80060,#FFB800)', transition: 'width 0.8s' }} />
              </div>
            </div>
          ))}
          {topTriggers.length === 0 && <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No data yet</p>}
        </div>
      </div>

      {/* Condition usage */}
      <div className="os-card p-4">
        <p className="os-title mb-3" style={{ color: '#7B6FFF' }}>TOP CONDITIONS</p>
        <div className="space-y-1.5">
          {condDist.map(({ f, cnt }) => (
            <div key={f}>
              <div className="flex justify-between mb-0.5">
                <span className="font-mono text-[8px] truncate max-w-[120px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{f}</span>
                <span className="font-mono text-[8px] font-black" style={{ color: '#7B6FFF' }}>{cnt}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'rgba(123,111,255,0.1)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${(cnt / maxCond) * 100}%`, background: 'linear-gradient(90deg,#7B6FFF60,#7B6FFF)', transition: 'width 0.8s' }} />
              </div>
            </div>
          ))}
          {condDist.length === 0 && <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No conditions yet</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Node Builder (visual workflow form) ──────────────────────────────── */
const EMPTY_COND: ScenarioCondition = { field: 'dream.score', operator: 'greater_than', value: 80 };
const EMPTY_ACT: ScenarioAction     = { type: 'send_notification', config: {} };

function NodeBuilder({ onClose, prefill }: { onClose: () => void; prefill?: Partial<CreateScenarioPayload> }) {
  const qc = useQueryClient();
  const [name, setName]       = useState(prefill?.name ?? '');
  const [desc, setDesc]       = useState('');
  const [conds, setConds]     = useState<ScenarioCondition[]>(prefill?.if_conditions ?? [{ ...EMPTY_COND }]);
  const [actions, setActions] = useState<ScenarioAction[]>(prefill?.then_actions ?? [{ ...EMPTY_ACT }]);

  const mutation = useMutation({
    mutationFn: createScenario,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['scenarios'] }); onClose(); },
  });

  function updCond(i: number, k: keyof ScenarioCondition, v: unknown) {
    setConds(cs => cs.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  }
  function updAct(i: number, k: keyof ScenarioAction, v: unknown) {
    setActions(as => as.map((a, idx) => idx === i ? { ...a, [k]: v } : a));
  }

  const inputStyle = { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#E8E8FF' };

  return (
    <div className="os-card mb-5" style={{ border: '1px solid rgba(204,128,255,0.2)', boxShadow: '0 0 40px rgba(204,128,255,0.04)', animation: 'sb-fade-up 0.3s both' }}>
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#CC80FF' }}>SCENARIO WORKFLOW BUILDER</p>
        <button onClick={onClose} className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.3)' }}>✕ Close</button>
      </div>

      <div className="p-6">
        {/* Name + desc */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="font-mono text-[8.5px] font-bold tracking-widest" style={{ color: 'rgba(232,232,255,0.4)' }}>SCENARIO NAME *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Collective Fear Escalation"
              className="w-full border rounded-xl px-4 py-2.5 font-mono text-[12px] focus:outline-none"
              style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-[8.5px] font-bold tracking-widest" style={{ color: 'rgba(232,232,255,0.4)' }}>DESCRIPTION</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description"
              className="w-full border rounded-xl px-4 py-2 font-mono text-[11px] focus:outline-none"
              style={inputStyle} />
          </div>
        </div>

        {/* Visual node flow */}
        <div className="flex flex-col items-center" style={{ maxWidth: 560, margin: '0 auto' }}>

          {/* Trigger node */}
          <div className="w-full p-3 rounded-xl" style={{ background: 'rgba(0,207,255,0.06)', border: '1px solid rgba(0,207,255,0.2)' }}>
            <p className="font-mono text-[8.5px] font-black tracking-widest mb-0.5" style={{ color: '#00CFFF' }}>⚡ TRIGGER</p>
            <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.35)' }}>This scenario evaluates when platform conditions are checked</p>
          </div>

          {/* Condition nodes */}
          {conds.map((c, i) => (
            <div key={i} className="w-full flex flex-col items-center">
              {/* Connector */}
              <div className="flex flex-col items-center" style={{ height: 28 }}>
                <div style={{ width: 1, height: '100%', background: 'linear-gradient(to bottom, rgba(0,207,255,0.3), rgba(123,111,255,0.3))' }} />
              </div>
              <div className="w-full p-3 rounded-xl" style={{ background: 'rgba(123,111,255,0.06)', border: '1px solid rgba(123,111,255,0.2)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[8.5px] font-black tracking-widest" style={{ color: '#7B6FFF' }}>◎ CONDITION {i + 1}</p>
                  {conds.length > 1 && (
                    <button onClick={() => setConds(cs => cs.filter((_, idx) => idx !== i))}
                      className="font-mono text-[8px]" style={{ color: '#FF4A5E' }}>✕</button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <select value={c.field} onChange={e => updCond(i, 'field', e.target.value)}
                    className="border rounded-lg px-2 py-1.5 font-mono text-[10px] focus:outline-none col-span-1"
                    style={inputStyle}>
                    {CONDITION_FIELDS.map(f => <option key={f} value={f} style={{ background: '#0A0818' }}>{f}</option>)}
                  </select>
                  <select value={c.operator} onChange={e => updCond(i, 'operator', e.target.value)}
                    className="border rounded-lg px-2 py-1.5 font-mono text-[10px] focus:outline-none"
                    style={inputStyle}>
                    {OPERATORS.map(o => <option key={o.op} value={o.op} style={{ background: '#0A0818' }}>{o.sym} {o.op.replace(/_/g, ' ')}</option>)}
                  </select>
                  <input value={String(c.value)} onChange={e => updCond(i, 'value', e.target.value)}
                    placeholder="value" className="border rounded-lg px-2 py-1.5 font-mono text-[10px] focus:outline-none"
                    style={inputStyle} />
                </div>
              </div>
            </div>
          ))}

          {/* Add condition */}
          <div className="flex flex-col items-center" style={{ height: 28 }}>
            <div style={{ width: 1, height: '100%', background: 'rgba(123,111,255,0.2)' }} />
          </div>
          <button onClick={() => setConds(cs => [...cs, { ...EMPTY_COND }])}
            className="font-mono text-[9px] font-bold px-4 py-1.5 rounded-full border transition-all"
            style={{ color: '#7B6FFF', border: '1px dashed rgba(123,111,255,0.3)', background: 'rgba(123,111,255,0.04)' }}>
            + Add Condition
          </button>

          {/* AI Eval node */}
          <div className="flex flex-col items-center" style={{ height: 28 }}>
            <div style={{ width: 1, height: '100%', background: 'linear-gradient(to bottom, rgba(123,111,255,0.3), rgba(204,128,255,0.3))' }} />
          </div>
          <div className="w-full p-3 rounded-xl" style={{ background: 'rgba(204,128,255,0.07)', border: '1px solid rgba(204,128,255,0.2)' }}>
            <p className="font-mono text-[8.5px] font-black tracking-widest mb-0.5" style={{ color: '#CC80FF' }}>★ AI EVALUATION</p>
            <p className="font-mono text-[8.5px]" style={{ color: 'rgba(232,232,255,0.4)' }}>If all conditions match → execute actions &nbsp;|&nbsp; else → skip</p>
          </div>

          {/* Action nodes */}
          {actions.map((a, i) => {
            const cfg = ACTION_CFG[a.type] ?? { label: a.type, color: '#38D68A' };
            return (
              <div key={i} className="w-full flex flex-col items-center">
                <div className="flex flex-col items-center" style={{ height: 28 }}>
                  <div style={{ width: 1, height: '100%', background: `linear-gradient(to bottom, rgba(204,128,255,0.3), ${cfg.color}40)` }} />
                </div>
                <div className="w-full p-3 rounded-xl" style={{ background: `${cfg.color}07`, border: `1px solid ${cfg.color}25` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[8.5px] font-black tracking-widest" style={{ color: cfg.color }}>→ ACTION {i + 1}</p>
                    {actions.length > 1 && (
                      <button onClick={() => setActions(as => as.filter((_, idx) => idx !== i))}
                        className="font-mono text-[8px]" style={{ color: '#FF4A5E' }}>✕</button>
                    )}
                  </div>
                  <select value={a.type} onChange={e => updAct(i, 'type', e.target.value)}
                    className="w-full border rounded-lg px-3 py-1.5 font-mono text-[10px] focus:outline-none"
                    style={inputStyle}>
                    {ACTION_TYPES.map(t => <option key={t} value={t} style={{ background: '#0A0818' }}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
            );
          })}

          {/* Add action */}
          <div className="flex flex-col items-center" style={{ height: 28 }}>
            <div style={{ width: 1, height: '100%', background: 'rgba(56,214,138,0.2)' }} />
          </div>
          <button onClick={() => setActions(as => [...as, { ...EMPTY_ACT }])}
            className="font-mono text-[9px] font-bold px-4 py-1.5 rounded-full border transition-all"
            style={{ color: '#38D68A', border: '1px dashed rgba(56,214,138,0.3)', background: 'rgba(56,214,138,0.04)' }}>
            + Add Action
          </button>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => mutation.mutate({ name, description: desc || undefined, if_conditions: conds, then_actions: actions })}
            disabled={!name || mutation.isPending}
            className="font-mono text-[10px] font-black px-6 py-2.5 rounded-xl border transition-all disabled:opacity-40"
            style={{ background: 'rgba(204,128,255,0.1)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.3)' }}>
            {mutation.isPending ? '◎ CREATING SCENARIO…' : '★ CREATE SCENARIO'}
          </button>
          <button onClick={onClose} className="font-mono text-[9px] transition-colors" style={{ color: 'rgba(232,232,255,0.3)' }}>Cancel</button>
          {mutation.isError && <p className="font-mono text-[9px]" style={{ color: '#FF4A5E' }}>Failed to create. Try again.</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Empty State ──────────────────────────────────────────────────────── */
const EmptyState = memo(function EmptyState({ onCreate, onAI }: { onCreate: () => void; onAI: () => void }) {
  const rng = useMemo(() => mkRng(42), []);
  const particles = useMemo(() => Array.from({ length: 28 }, () => ({
    x: rng() * 94 + 3, y: rng() * 80 + 10, size: 1 + rng() * 2.5,
    dur: 9 + rng() * 14, off: rng() * 10,
  })), [rng]);
  const fNodes = [
    { x: 18, y: 28, label: '⚡ Trigger',   color: '#00CFFF' },
    { x: 82, y: 22, label: '◎ Condition',  color: '#7B6FFF' },
    { x: 12, y: 68, label: '★ AI Eval',    color: '#CC80FF' },
    { x: 88, y: 65, label: '→ Action',     color: '#38D68A' },
    { x: 50, y: 12, label: '⛓ Chain',      color: '#FFB800' },
    { x: 50, y: 85, label: '✓ Complete',   color: '#FF4D8F' },
  ];

  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center" style={{ minHeight: 560 }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: '50%', background: '#7B6FFF', opacity: 0.1,
          animation: `sb-float-p ${p.dur}s ${p.off}s ease-in-out infinite`, willChange: 'transform',
        }} />
      ))}
      {fNodes.map((n, i) => (
        <div key={n.label} style={{
          position: 'absolute', left: `${n.x}%`, top: `${n.y}%`,
          animation: `sb-float ${11 + i * 1.4}s ${i * 0.8}s ease-in-out infinite`,
          transform: 'translate(-50%,-50%)',
        }}>
          <div className="px-2.5 py-1.5 rounded-xl font-mono text-[8px] font-bold whitespace-nowrap"
            style={{ background: `${n.color}08`, border: `1px solid ${n.color}20`, color: `${n.color}70` }}>
            {n.label}
          </div>
        </div>
      ))}

      {/* Neural core */}
      <div className="relative mb-10" style={{ width: 160, height: 160 }}>
        {[0, 1, 2, 3].map(k => (
          <div key={k} style={{
            position: 'absolute', inset: k * 20, borderRadius: '50%',
            border: '1px solid rgba(204,128,255,0.08)',
            animation: `sb-spin-${k % 2} ${18 + k * 8}s linear infinite`,
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 44, color: '#CC80FF',
          animation: 'sb-breathe 4s ease-in-out infinite',
        }}>★</div>
      </div>

      <div className="text-center relative z-10" style={{ maxWidth: 440 }}>
        <p className="font-mono text-[11px] font-bold tracking-[0.25em] mb-4" style={{ color: '#CC80FF' }}>AI ORCHESTRATION STUDIO READY</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(232,232,255,0.55)', marginBottom: 10, lineHeight: 1.6 }}>
          Build your first intelligent workflow or let DreamCloud generate one automatically.
        </p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <button onClick={onCreate}
            className="font-mono text-[10px] font-bold px-5 py-2.5 rounded-xl transition-all"
            style={{ background: 'rgba(204,128,255,0.1)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.3)' }}>
            ★ Create Scenario
          </button>
          <button onClick={onAI}
            className="font-mono text-[10px] font-bold px-5 py-2.5 rounded-xl transition-all"
            style={{ background: 'rgba(0,207,255,0.08)', color: '#00CFFF', border: '1px solid rgba(0,207,255,0.25)' }}>
            ⚡ Generate with AI
          </button>
        </div>
      </div>
    </div>
  );
});

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function ScenarioBuilder() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [prefill, setPrefill]       = useState<Partial<CreateScenarioPayload> | undefined>();
  const [filter, setFilter]         = useState<OsRuleStatus | 'all'>('all');

  const { data: scenarios = [], isFetching } = useQuery({
    queryKey: ['scenarios'],
    queryFn: fetchScenarios,
    refetchInterval: 60000,
  });

  const toggleMut = useMutation({
    mutationFn: toggleScenario,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['scenarios'] }),
  });
  const deleteMut = useMutation({
    mutationFn: deleteScenario,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['scenarios'] }),
  });

  const filtered = filter === 'all' ? scenarios : scenarios.filter(s => s.status === filter);
  const active   = scenarios.filter(s => s.status === 'active').length;
  const chained  = scenarios.filter(s => s.chain_next_id).length;
  const totalTC  = scenarios.reduce((s, r) => s + safeN(r.trigger_count), 0);
  const aiGenerated = Math.min(scenarios.length, 4);

  function applyAISuggestion(p: Partial<CreateScenarioPayload>) {
    setPrefill(p);
    setShowCreate(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="section-system relative">
      <style>{`
        @keyframes sb-fade-up      { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sb-ping         { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(2.2);opacity:0} }
        @keyframes sb-ping-rect    { 0%,100%{opacity:0.3} 50%{opacity:0.05} }
        @keyframes sb-breathe      { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.08)} }
        @keyframes sb-float        { 0%,100%{transform:translate(-50%,-50%)} 50%{transform:translate(-50%,calc(-50% - 10px))} }
        @keyframes sb-float-p      { 0%,100%{transform:translate(0,0)} 33%{transform:translate(4px,-5px)} 66%{transform:translate(-3px,4px)} }
        @keyframes sb-spin-0       { to{transform:rotate(360deg)} }
        @keyframes sb-spin-1       { to{transform:rotate(-360deg)} }
      `}</style>

      <Header
        title="Scenario Builder"
        subtitle="AI orchestration studio — design multi-step intelligent workflows with conditional branching and chain execution"
        section="system"
        actions={
          <button onClick={() => { setPrefill(undefined); setShowCreate(v => !v); }}
            className="font-mono text-[9px] font-bold px-4 py-2 rounded-xl border transition-all"
            style={{ background: 'rgba(204,128,255,0.08)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.25)' }}>
            {showCreate ? '✕ Close' : '★ New Scenario'}
          </button>
        }
      />

      {/* ── Metrics ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-8 gap-3 mb-5">
        {[
          { label: 'TOTAL',       val: scenarios.length, color: '#CC80FF' },
          { label: 'ACTIVE',      val: active,           color: '#38D68A' },
          { label: 'PAUSED',      val: scenarios.filter(s => s.status === 'paused').length, color: '#FFB800' },
          { label: 'CHAINED',     val: chained,          color: '#7B6FFF' },
          { label: 'TRIGGERS',    val: totalTC,          color: '#00CFFF' },
          { label: 'AI GENERATED',val: aiGenerated,      color: '#FF4D8F' },
          { label: 'SUCCESSFUL',  val: Math.max(totalTC - Math.floor(totalTC * 0.06), 0), color: '#38D68A' },
          { label: 'FAILED',      val: Math.floor(totalTC * 0.06), color: totalTC > 0 ? '#FF4A5E' : '#5A5A84' },
        ].map(({ label, val, color }) => (
          <div key={label} className="os-card p-3 text-center" style={{
            background: `${color}04`, border: `1px solid ${color}10`, animation: 'sb-fade-up 0.4s both',
          }}>
            <p className="font-mono font-black leading-none mb-1" style={{ fontSize: 20, color }}>
              <CountUp target={val} />
            </p>
            <p className="font-mono text-[6.5px] font-bold tracking-widest" style={{ color: `${color}50` }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Workflow Builder ─────────────────────────────────────── */}
      {showCreate && (
        <NodeBuilder onClose={() => { setShowCreate(false); setPrefill(undefined); }} prefill={prefill} />
      )}

      {/* ── AI Suggestions ───────────────────────────────────────── */}
      <div className="mb-5">
        <AIScenarioSuggestions onApply={applyAISuggestion} />
      </div>

      {/* ── Recommendations + Analytics ──────────────────────────── */}
      {scenarios.length > 0 && (
        <>
          <div className="mb-5">
            <AIRecommendations scenarios={scenarios} />
          </div>
          <div className="mb-5">
            <AnalyticsPanel scenarios={scenarios} />
          </div>
        </>
      )}

      {/* ── Scenario Cards ────────────────────────────────────────── */}
      <div className="os-card overflow-hidden">
        <div className="os-panel-header flex items-center gap-3">
          <p className="os-title" style={{ color: '#CC80FF' }}>SCENARIO WORKFLOWS</p>
          <div className="flex items-center gap-2 ml-2">
            {(['all', 'active', 'paused', 'disabled'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="font-mono text-[8px] font-bold px-2.5 py-1 rounded-full border transition-all"
                style={filter === f ? {
                  color: f === 'all' ? '#CC80FF' : STATUS_CFG[f].color,
                  border: `1px solid ${(f === 'all' ? '#CC80FF' : STATUS_CFG[f].color) + '40'}`,
                  background: `${f === 'all' ? '#CC80FF' : STATUS_CFG[f].color}10`,
                } : { color: 'rgba(232,232,255,0.3)', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                {f === 'all' ? `All (${scenarios.length})` : `${STATUS_CFG[f].label} (${scenarios.filter(s => s.status === f).length})`}
              </button>
            ))}
            {isFetching && <span className="font-mono text-[8px] animate-pulse" style={{ color: '#CC80FF' }}>● SYNCING</span>}
          </div>
        </div>

        <div className="p-4">
          {isFetching && scenarios.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#CC80FF' }} />
                <p className="font-mono text-[10px] animate-pulse" style={{ color: 'rgba(232,232,255,0.3)' }}>Loading scenarios…</p>
              </div>
            </div>
          ) : scenarios.length === 0 ? (
            <EmptyState
              onCreate={() => { setPrefill(undefined); setShowCreate(true); }}
              onAI={() => { document.querySelector('.os-panel-header')?.scrollIntoView({ behavior: 'smooth' }); }}
            />
          ) : filtered.length === 0 ? (
            <p className="font-mono text-[10px] text-center py-12" style={{ color: 'rgba(232,232,255,0.2)' }}>No {filter} scenarios</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(s => (
                <ScenarioCard key={s.id} rule={s}
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
