import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import {
  fetchDreams, fetchDreamById, fetchDreamGraph, fetchDreamAnalysis,
} from '../api/admin.api';
import type { GraphNode, GraphConnection, DreamGraph } from '../api/admin.api';
import type { AdminDreamDetail, DreamAnalysisResult } from '../types/admin.types';

/* ── Type config ──────────────────────────────────────────────────────── */
const TYPE_CFG: Record<string, { color: string; icon: string; label: string; sector: number }> = {
  symbol:    { color: '#CC80FF', icon: '◈', label: 'Symbol',    sector: 0   },
  emotion:   { color: '#FF4D8F', icon: '♡', label: 'Emotion',   sector: 72  },
  archetype: { color: '#FFB800', icon: '★', label: 'Archetype', sector: 144 },
  theme:     { color: '#38D68A', icon: '◎', label: 'Theme',     sector: 216 },
  place:     { color: '#00CFFF', icon: '⊕', label: 'Place',     sector: 288 },
};

const AI_TEMPLATES = [
  (d: AdminDreamDetail) => `The dominant symbol "${d.symbols[0]?.manifestation ?? '—'}" often represents transformation and the unconscious bridge between known and unknown realms.`,
  (d: AdminDreamDetail) => `Primary emotion "${d.primaryEmotion}" at ${d.emotionalIntensity ?? 'moderate'} intensity suggests the dreamer is processing unresolved psychological material.`,
  (d: AdminDreamDetail) => `The ${d.authorArchetype ?? 'emerging'} archetype pattern indicates an active period of identity formation and psychological integration.`,
  (d: AdminDreamDetail) => `Emotional arc "${d.emotionalArc ?? 'undefined'}" reveals a narrative structure typical of shadow integration dreams in Jungian psychology.`,
  (d: AdminDreamDetail) => `Residual emotion "${d.residualEmotion ?? '—'}" upon waking suggests the unconscious continues to process this symbolic content.`,
  (d: AdminDreamDetail) => `${d.themes.filter(t=>t.isPrimary).map(t=>t.theme).join(' and ')||'Core themes'} point toward collective archetypal activation across the dream network.`,
  (d: AdminDreamDetail) => `With ${d.matchCount} resonance connections, this dream participates in a shared symbolic field among ${d.matchCount} other dreamers.`,
  (_d: AdminDreamDetail) => `The multi-layered symbol architecture of this dream suggests high psychological complexity and active unconscious elaboration.`,
];

const STORY_PHASES = ['Inception', 'Emergence', 'Conflict', 'Climax', 'Transformation', 'Resolution', 'Awakening'];

/* ── Fallback graph synthesis from dream detail ───────────────────────── */
function synthesizeGraph(dream: AdminDreamDetail): DreamGraph {
  const nodes: GraphNode[] = [
    ...dream.symbols.map((s, i) => ({
      id: `sym_${i}`, type: 'symbol' as const, label: s.manifestation ?? `Symbol ${i + 1}`,
      color: '#CC80FF', weight: Math.round((s.confidence ?? 0.5) * 100), isPrimary: i === 0,
    })),
    ...dream.emotions.map((e, i) => ({
      id: `emo_${i}`, type: 'emotion' as const, label: e.emotion ?? `Emotion ${i + 1}`,
      color: '#FF4D8F', weight: 60, isPrimary: e.isPrimary,
    })),
    ...dream.themes.map((t, i) => ({
      id: `thm_${i}`, type: 'theme' as const, label: t.theme ?? `Theme ${i + 1}`,
      color: '#38D68A', weight: 55, isPrimary: t.isPrimary,
    })),
    ...dream.figures
      .filter(f => f.archetypeCandidate)
      .map((f, i) => ({
        id: `arc_${i}`, type: 'archetype' as const, label: f.archetypeCandidate!,
        color: '#FFB800', weight: 65, isPrimary: i === 0,
      })),
  ];
  const connections: GraphConnection[] = dream.similarDreams.map(sd => ({
    id: sd.id,
    score: (sd.matchScore ?? 0) * 100,
    resonance_level: sd.resonanceLevel ?? 'low',
    other_user: sd.authorUsername,
    other_title: sd.title,
    shared_symbols: sd.sharedThemes ?? [],
    shared_emotions: sd.sharedEmotions ?? [],
  }));
  return {
    dreamId: dream.id,
    nodes,
    connections,
    summary: {
      symbolCount:    dream.symbols.length,
      emotionCount:   dream.emotions.length,
      archetypeCount: dream.figures.filter(f => f.archetypeCandidate).length,
      themeCount:     dream.themes.length,
      placeCount:     0,
      connectionCount: dream.similarDreams.length,
    },
  };
}

/* ── Seeded RNG ──────────────────────────────────────────────────────── */
function mkRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

/* ── Debounce ────────────────────────────────────────────────────────── */
function useDebounce<T>(v: T, ms: number): T {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

/* ── Graph layout ────────────────────────────────────────────────────── */
interface PlacedNode extends GraphNode { x: number; y: number; r: number; idx: number }
interface Edge { a: number; b: number; str: number }

function buildLayout(nodes: GraphNode[], W: number, H: number): { placed: PlacedNode[]; edges: Edge[] } {
  const CX = W / 2, CY = H / 2;
  const rng = mkRng(nodes.length * 997 + 13);
  const byType: Record<string, GraphNode[]> = {};
  for (const n of nodes) (byType[n.type] = byType[n.type] ?? []).push(n);

  const placed: PlacedNode[] = [];
  let idx = 0;

  for (const [type, cfg] of Object.entries(TYPE_CFG)) {
    const ns = byType[type] ?? [];
    if (!ns.length) continue;
    const baseAngle = (cfg.sector - 90) * (Math.PI / 180);
    const spread    = (65 * Math.PI) / 180;
    const rings     = [{ r: 85, max: 2 }, { r: 145, max: 4 }, { r: 205, max: 8 }];
    let ni = 0;
    for (const ring of rings) {
      const batch = ns.slice(ni, ni + ring.max);
      if (!batch.length) break;
      for (let i = 0; i < batch.length; i++) {
        const a = batch.length === 1 ? baseAngle : baseAngle - spread/2 + (i/(batch.length-1))*spread;
        const jitter = (rng() - 0.5) * 14;
        const x = CX + (ring.r + jitter) * Math.cos(a);
        const y = CY + (ring.r + jitter) * Math.sin(a);
        const w = batch[i]!.weight ?? 50;
        placed.push({ ...batch[i]!, x, y, r: 5 + (w / 100) * 12, idx: idx++ });
      }
      ni += ring.max;
    }
  }

  const edges: Edge[] = [];
  // Center → primary / heavy nodes
  for (const n of placed) {
    if (n.isPrimary || (n.weight ?? 0) > 65) {
      edges.push({ a: -1, b: n.idx, str: 0.8 });
    }
  }
  // Center → at least 1 of each type
  const seenTypes = new Set<string>();
  for (const n of placed) {
    if (!seenTypes.has(n.type)) { seenTypes.add(n.type); edges.push({ a: -1, b: n.idx, str: 0.5 }); }
  }
  // Within-type connections
  const byIdx: Record<string, number[]> = {};
  for (const n of placed) (byIdx[n.type] = byIdx[n.type] ?? []).push(n.idx);
  for (const idxs of Object.values(byIdx)) {
    for (let i = 1; i < idxs.length; i++) {
      edges.push({ a: idxs[0]!, b: idxs[i]!, str: 0.35 + i * 0.05 });
    }
  }
  // Cross-type primary connections
  const primaries = Object.keys(TYPE_CFG).map(t => byIdx[t]?.[0]).filter(v => v !== undefined) as number[];
  for (let i = 0; i < primaries.length; i++) {
    for (let j = i + 1; j < primaries.length; j++) {
      if (j - i === 1 || (i === 0 && j === primaries.length - 1)) {
        edges.push({ a: primaries[i]!, b: primaries[j]!, str: 0.6 });
      }
    }
  }

  return { placed, edges };
}

/* ── Neural Graph SVG ────────────────────────────────────────────────── */
const NeuralGraph = memo(function NeuralGraph({
  nodes, hoveredType, onHover,
}: {
  nodes: GraphNode[];
  hoveredType: string | null;
  onHover: (t: string | null) => void;
}) {
  const W = 720, H = 500, CX = W / 2, CY = H / 2;
  const [focusId, setFocusId] = useState<number | null>(null);
  const [hovId, setHovId] = useState<number | null>(null);

  const { placed, edges } = useMemo(() => buildLayout(nodes, W, H), [nodes]);

  const rng2 = useMemo(() => mkRng(placed.length * 7 + 3), [placed.length]);
  const floatData = useMemo(() => placed.map(() => ({
    ax: 3 + rng2() * 8, ay: 3 + rng2() * 7,
    dur: 8 + rng2() * 12, off: rng2() * 10,
  })), [placed, rng2]);

  const activeId = focusId ?? hovId;
  const connSet = useMemo(() => {
    if (activeId === null) return new Set<number>();
    const s = new Set<number>();
    for (const e of edges) {
      if (e.a === activeId) s.add(e.b);
      if (e.b === activeId) s.add(e.a);
      if (e.a === -1 && e.b === activeId) s.add(-1);
    }
    return s;
  }, [activeId, edges]);

  const isActive = activeId !== null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}
      onMouseLeave={() => { setHovId(null); onHover(null); }}>
      <defs>
        <radialGradient id="dg-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7B6FFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7B6FFF" stopOpacity="0" />
        </radialGradient>
        <filter id="dg-gs"><feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="dg-gm"><feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="dg-gl"><feGaussianBlur stdDeviation="11" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      {/* Atmosphere */}
      <ellipse cx={CX} cy={CY} rx="310" ry="220" fill="url(#dg-core)" />

      {/* Orbital guides */}
      {[85, 145, 205].map((r, i) => (
        <circle key={r} cx={CX} cy={CY} r={r} fill="none"
          stroke="rgba(123,111,255,0.06)" strokeWidth="0.5" strokeDasharray="4 14">
          <animateTransform attributeName="transform" type="rotate"
            values={`0 ${CX} ${CY};${i%2===0?360:-360} ${CX} ${CY}`}
            dur={`${100+i*40}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Edges */}
      {edges.map((e, i) => {
        const na = e.a === -1 ? { x: CX, y: CY } : placed[e.a];
        const nb = placed[e.b];
        if (!na || !nb) return null;
        const lit   = isActive && (e.a === activeId || e.b === activeId);
        const conn  = isActive && (connSet.has(e.a) || connSet.has(e.b));
        const dim   = isActive && !lit && !conn;
        const color = e.a === -1 ? '#7B6FFF' : (placed[e.b]?.color ?? '#5A5A84');
        const pth   = `M${na.x.toFixed(1)},${na.y.toFixed(1)} L${nb.x.toFixed(1)},${nb.y.toFixed(1)}`;
        const pdur  = 1.4 + (1 - e.str) * 3;
        return (
          <g key={i}>
            <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke={color} strokeWidth={lit ? 1.4 : 0.6}
              opacity={dim ? 0.02 : lit ? e.str * 0.7 + 0.2 : e.str * 0.12 + 0.04} />
            {!dim && (
              <circle r={lit ? 2.8 : 1.6} fill={color}
                opacity={lit ? 0.95 : 0.45}
                filter={lit ? 'url(#dg-gs)' : undefined}>
                <animateMotion dur={`${pdur}s`} begin={`${(i*0.6)%pdur}s`}
                  repeatCount="indefinite" path={pth} />
              </circle>
            )}
          </g>
        );
      })}

      {/* Satellite nodes */}
      {placed.map((n, i) => {
        const cfg   = TYPE_CFG[n.type]!;
        const hov   = n.idx === hovId;
        const foc   = n.idx === focusId;
        const conn  = connSet.has(n.idx);
        const typeFilt = hoveredType && n.type !== hoveredType;
        const dim   = (isActive && !hov && !foc && !conn) || !!typeFilt;
        const hi    = hov || foc || conn;
        const fd    = floatData[i]!;
        const fv    = [
          `${-fd.ax*0.5},${-fd.ay*0.3}`,
          `${fd.ax*0.8},${fd.ay*0.6}`,
          `${-fd.ax*0.3},${fd.ay}`,
          `${fd.ax*0.5},${-fd.ay*0.8}`,
          `${-fd.ax*0.5},${-fd.ay*0.3}`,
        ].join(';');
        return (
          <g key={n.id}
            style={{ cursor: 'pointer', opacity: dim ? 0.1 : 1, transition: 'opacity 0.3s' }}
            filter={hi ? 'url(#dg-gs)' : undefined}
            onMouseEnter={() => { setHovId(n.idx); onHover(n.type); }}
            onClick={() => setFocusId(foc ? null : n.idx)}>
            <animateTransform attributeName="transform" type="translate"
              values={fv} dur={`${fd.dur}s`} begin={`${fd.off}s`}
              repeatCount="indefinite" calcMode="spline"
              keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1" />
            {/* Halo */}
            <circle cx={n.x} cy={n.y} r={n.r + 6} fill={cfg.color}>
              <animate attributeName="opacity" values={hi ? '0.2;0.4;0.2' : '0.04;0.12;0.04'}
                dur={`${2.3 + i * 0.13}s`} repeatCount="indefinite" />
            </circle>
            {/* Body */}
            <circle cx={n.x} cy={n.y} r={n.r}
              fill={hi ? cfg.color : `${cfg.color}65`}
              stroke={hi ? cfg.color : 'none'} strokeWidth={hi ? 1.2 : 0}
              opacity={hi ? 1 : 0.7}>
              {hi && <animate attributeName="r" values={`${n.r};${n.r*1.2};${n.r}`} dur="2s" repeatCount="indefinite"/>}
            </circle>
            {/* Label */}
            <text cx={n.x} cy={n.y} x={n.x} y={n.y + n.r + 10} textAnchor="middle"
              fill={hi ? cfg.color : 'rgba(232,232,255,0.4)'}
              fontSize={hi ? 8 : 7} fontFamily="monospace" fontWeight={hi ? 'bold' : 'normal'}>
              {n.label.slice(0, 10)}
            </text>
            {/* Focus ring */}
            {foc && (
              <g>
                <circle cx={n.x} cy={n.y} r={n.r + 18} fill="none"
                  stroke={cfg.color} strokeWidth="0.7" strokeDasharray="3 7" opacity="0.6">
                  <animateTransform attributeName="transform" type="rotate"
                    values={`0 ${n.x} ${n.y};360 ${n.x} ${n.y}`}
                    dur="9s" repeatCount="indefinite" />
                </circle>
                <text x={n.x} y={n.y - n.r - 9} textAnchor="middle"
                  fill={cfg.color} fontSize="7.5" fontFamily="monospace" opacity="0.85">
                  {cfg.icon} {n.type.toUpperCase()}  {n.weight != null ? `· ${n.weight}%` : ''}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Dream center core */}
      <g filter="url(#dg-gl)" style={{ cursor: 'pointer' }}>
        {[0, 1, 2].map(k => (
          <circle key={k} cx={CX} cy={CY} r={36 + k * 20} fill="none"
            stroke="#7B6FFF" strokeWidth="0.8" opacity="0.18">
            <animate attributeName="r" values={`${36+k*20};${50+k*20};${36+k*20}`}
              dur={`${3.2+k*1.1}s`} begin={`${k*1.3}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.22;0;0.22"
              dur={`${3.2+k*1.1}s`} begin={`${k*1.3}s`} repeatCount="indefinite" />
          </circle>
        ))}
        <circle cx={CX} cy={CY} r="28" fill="#7B6FFF" opacity="0.08">
          <animate attributeName="r" values="24;36;24" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.06;0.16;0.06" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx={CX} cy={CY} r="20" fill="#7B6FFF" opacity="0.9" />
        <circle cx={CX} cy={CY} r="27" fill="none" stroke="#7B6FFF" strokeWidth="1.2" opacity="0.4">
          <animate attributeName="r" values="22;34;22" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="3.5s" repeatCount="indefinite" />
        </circle>
        <text x={CX} y={CY - 2} textAnchor="middle" dominantBaseline="middle"
          fill="rgba(6,6,20,0.9)" fontSize="7" fontFamily="monospace" fontWeight="bold">DREAM</text>
        <text x={CX} y={CY + 8} textAnchor="middle"
          fill="rgba(6,6,20,0.6)" fontSize="5" fontFamily="monospace">CORE</text>
      </g>

      {/* Node count */}
      <text x={W - 12} y={16} textAnchor="end"
        fill="rgba(123,111,255,0.4)" fontSize="8.5" fontFamily="monospace">
        {placed.length} NODES
      </text>
    </svg>
  );
});

/* ── Dream Overview Header ───────────────────────────────────────────── */
function DreamHeader({ dream, analysis }: { dream: AdminDreamDetail; analysis: DreamAnalysisResult | null }) {
  const wordCount = dream.content.split(/\s+/).length;
  const topEmo    = dream.emotions.find(e => e.isPrimary) ?? dream.emotions[0];
  const topSym    = dream.symbols[0];

  const stats = [
    { label: 'MATCH SCORE',   val: analysis?.dreamScore != null ? `${analysis.dreamScore.toFixed(0)}%` : '—',     color: '#7B6FFF' },
    { label: 'RESONANCE',     val: analysis?.resonanceScore != null ? `${analysis.resonanceScore.toFixed(0)}%` : '—', color: '#CC80FF' },
    { label: 'CONNECTIONS',   val: dream.matchCount,       color: '#38D68A' },
    { label: 'SYMBOLS',       val: dream.symbols.length,   color: '#FFB800' },
    { label: 'EMOTIONS',      val: dream.emotions.length,  color: '#FF4D8F' },
    { label: 'WORD COUNT',    val: wordCount,               color: '#00CFFF' },
  ];

  return (
    <div className="os-card overflow-hidden mb-5 relative" style={{
      background: 'linear-gradient(135deg, rgba(6,4,16,0.99) 0%, rgba(18,10,40,0.99) 100%)',
      border: '1px solid rgba(123,111,255,0.15)',
      boxShadow: '0 0 60px rgba(123,111,255,0.05)',
      animation: 'dg-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1, zIndex: 10,
        background: 'linear-gradient(90deg,transparent,rgba(123,111,255,0.4),transparent)',
        animation: 'dg-scan 12s ease-in-out infinite', pointerEvents: 'none',
      }} />

      <div className="px-7 py-5 flex items-start gap-6">
        {/* Dream identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-[9px] font-black px-2.5 py-0.5 rounded-full"
              style={{ color: '#7B6FFF', background: 'rgba(123,111,255,0.12)', border: '1px solid rgba(123,111,255,0.25)' }}>
              {dream.category}
            </span>
            {dream.isFeatured && (
              <span className="font-mono text-[8px] font-black px-2 py-0.5 rounded-full"
                style={{ color: '#FFD700', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)' }}>
                ★ FEATURED
              </span>
            )}
            {topEmo && (
              <span className="font-mono text-[9px] capitalize px-2 py-0.5 rounded-full"
                style={{ color: '#FF4D8F', background: 'rgba(255,77,143,0.08)', border: '1px solid rgba(255,77,143,0.2)' }}>
                ♡ {topEmo.emotion}
              </span>
            )}
          </div>
          <h2 className="font-black mb-1" style={{ fontSize: 22, color: '#E8E8FF', letterSpacing: '-0.02em' }}>
            {dream.title ?? 'Untitled Dream'}
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.4)' }}>
              @{dream.authorUsername}
            </span>
            <span className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
              {new Date(dream.dreamedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {topSym && (
              <span className="font-mono text-[10px]" style={{ color: '#CC80FF' }}>
                ◈ {topSym.manifestation}
              </span>
            )}
            {dream.authorArchetype && (
              <span className="font-mono text-[10px]" style={{ color: '#FFB800' }}>
                ★ {dream.authorArchetype}
              </span>
            )}
            {dream.emotionalArc && (
              <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>
                arc: {dream.emotionalArc}
              </span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          {stats.map(({ label, val, color }) => (
            <div key={label} className="text-center p-2.5 rounded-xl" style={{
              background: `${color}06`, border: `1px solid ${color}12`, minWidth: 76,
            }}>
              <p className="font-mono font-black" style={{ fontSize: 18, color, lineHeight: 1 }}>{val}</p>
              <p className="font-mono text-[7px] mt-0.5 font-bold tracking-widest" style={{ color: `${color}55` }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content preview */}
      {dream.content && (
        <div className="px-7 pb-5">
          <p className="font-mono text-[10px] leading-relaxed line-clamp-2"
            style={{ color: 'rgba(232,232,255,0.3)', fontStyle: 'italic' }}>
            "{dream.content.slice(0, 220)}{dream.content.length > 220 ? '…' : ''}"
          </p>
        </div>
      )}
    </div>
  );
}

/* ── AI Interpretation Panel ─────────────────────────────────────────── */
function AIPanel({ dream }: { dream: AdminDreamDetail }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const obs = useMemo(() => AI_TEMPLATES.map(fn => fn(dream)).filter(Boolean), [dream]);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % obs.length); setFade(true); }, 320);
    }, 6000);
    return () => clearInterval(t);
  }, [obs.length]);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="p-4 rounded-xl flex-1" style={{
        background: 'rgba(123,111,255,0.05)', border: '1px solid rgba(123,111,255,0.14)',
        opacity: fade ? 1 : 0, transition: 'opacity 0.32s', minHeight: 90,
      }}>
        <div className="flex items-start gap-2">
          <span style={{ color: '#7B6FFF', fontSize: 10, marginTop: 1 }}>◈</span>
          <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.78)' }}>
            {obs[idx]}
          </p>
        </div>
        <div className="flex gap-1 mt-3">
          {obs.map((_, i) => (
            <div key={i} style={{
              width: i === idx ? 16 : 4, height: 2, borderRadius: 1,
              background: i === idx ? '#7B6FFF' : 'rgba(123,111,255,0.2)',
              transition: 'all 0.32s',
            }} />
          ))}
        </div>
      </div>

      {/* All insights list */}
      <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 280, scrollbarWidth: 'thin', scrollbarColor: 'rgba(123,111,255,0.2) transparent' }}>
        {obs.map((o, i) => (
          <div key={i} className="px-3 py-2 rounded-xl cursor-pointer transition-all"
            style={{
              background: i === idx ? 'rgba(123,111,255,0.07)' : 'transparent',
              border: `1px solid ${i === idx ? 'rgba(123,111,255,0.18)' : 'transparent'}`,
            }}
            onClick={() => setIdx(i)}>
            <p className="font-mono text-[9.5px] leading-relaxed"
              style={{ color: i === idx ? 'rgba(232,232,255,0.7)' : 'rgba(232,232,255,0.28)' }}>
              {o.slice(0, 80)}…
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Dream Story Flow ────────────────────────────────────────────────── */
function StoryFlow({ dream }: { dream: AdminDreamDetail }) {
  const steps = useMemo(() => {
    const s: Array<{ phase: string; label: string; color: string }> = [];
    if (dream.primaryEmotion)   s.push({ phase: 'Emergence',      label: dream.primaryEmotion,                   color: '#FF4D8F' });
    if (dream.symbols[0])       s.push({ phase: 'Symbol',         label: dream.symbols[0].manifestation,         color: '#CC80FF' });
    if (dream.themes[0])        s.push({ phase: 'Theme',          label: dream.themes[0].theme,                  color: '#38D68A' });
    if (dream.figures[0])       s.push({ phase: 'Character',      label: dream.figures[0].figureType,            color: '#FFB800' });
    if (dream.emotionalArc)     s.push({ phase: 'Arc',            label: dream.emotionalArc,                     color: '#7B6FFF' });
    if (dream.authorArchetype)  s.push({ phase: 'Archetype',      label: dream.authorArchetype,                  color: '#FFB800' });
    if (dream.residualEmotion)  s.push({ phase: 'Residual',       label: dream.residualEmotion,                  color: '#00CFFF' });
    if (!s.length) STORY_PHASES.slice(0, 4).forEach((p, i) => s.push({ phase: p, label: p, color: Object.values(TYPE_CFG)[i % 5]!.color }));
    return s;
  }, [dream]);

  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-1">
      {steps.map((s, i) => (
        <div key={i} className="flex items-start gap-3">
          {/* Spine */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-full cursor-pointer transition-all"
              style={{
                width: 10, height: 10, background: s.color, flexShrink: 0, marginTop: 2,
                boxShadow: active === i ? `0 0 12px ${s.color}` : `0 0 4px ${s.color}60`,
                transform: active === i ? 'scale(1.3)' : 'scale(1)',
                animation: i === 0 ? 'dg-hb 1.6s ease-in-out infinite' : 'none',
              }}
              onClick={() => setActive(active === i ? null : i)}
            />
            {i < steps.length - 1 && (
              <div style={{ width: 1, height: 20, background: `linear-gradient(to bottom, ${s.color}50, transparent)` }} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-[8px] font-bold tracking-widest"
                style={{ color: `${s.color}70` }}>{s.phase.toUpperCase()}</span>
            </div>
            <p className="font-mono text-[11px] font-bold capitalize"
              style={{ color: active === i ? s.color : 'rgba(232,232,255,0.65)' }}>{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Collective Connections ──────────────────────────────────────────── */
function CollectivePanel({ connections, dream }: { connections: GraphConnection[]; dream: AdminDreamDetail }) {
  const topConn = connections.slice(0, 5);
  const scoreColor = (s: number) => s >= 80 ? '#FFD700' : s >= 60 ? '#CC80FF' : s >= 40 ? '#00CFFF' : '#5A5A84';

  return (
    <div className="flex flex-col gap-3">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'SIMILAR DREAMS',   val: dream.matchCount,              color: '#7B6FFF' },
          { label: 'SIMILAR USERS',    val: connections.length,             color: '#CC80FF' },
          { label: 'SHARED SYMBOLS',   val: dream.symbols.length,           color: '#FFB800' },
          { label: 'SHARED EMOTIONS',  val: dream.emotions.length,          color: '#FF4D8F' },
        ].map(({ label, val, color }) => (
          <div key={label} className="p-2.5 rounded-xl text-center" style={{
            background: `${color}06`, border: `1px solid ${color}14`,
          }}>
            <p className="font-mono font-black text-[17px] leading-none mb-0.5" style={{ color }}>{val}</p>
            <p className="font-mono text-[7px] font-bold tracking-widest" style={{ color: `${color}50` }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Connection list */}
      {topConn.length > 0 && (
        <div className="space-y-2">
          {topConn.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl transition-all" style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] font-bold truncate" style={{ color: 'rgba(232,232,255,0.75)' }}>
                  {c.other_title ?? 'Untitled Dream'}
                </p>
                <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>@{c.other_user}</p>
              </div>
              <div className="text-center shrink-0">
                <p className="font-mono font-black text-[14px] leading-none" style={{ color: scoreColor(c.score) }}>
                  {c.score.toFixed(0)}%
                </p>
                <p className="font-mono text-[7px]" style={{ color: scoreColor(c.score), opacity: 0.7 }}>
                  {c.resonance_level}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Dream DNA radial chart ──────────────────────────────────────────── */
function DreamDNA({ dream, analysis }: { dream: AdminDreamDetail; analysis: DreamAnalysisResult | null }) {
  const W = 220, H = 220, CX = W / 2, CY = H / 2, R = 80;
  const axes = [
    { label: 'Symbols',   val: Math.min(dream.symbols.length  / 10, 1),  color: '#CC80FF', angle: -90 },
    { label: 'Emotions',  val: Math.min(dream.emotions.length / 8, 1),   color: '#FF4D8F', angle: -18 },
    { label: 'Themes',    val: Math.min(dream.themes.length   / 6, 1),   color: '#38D68A', angle: 54  },
    { label: 'Score',     val: Math.min((analysis?.dreamScore ?? 50)/100, 1), color: '#FFB800', angle: 126 },
    { label: 'Resonance', val: Math.min((analysis?.resonanceScore ?? 50)/100, 1), color: '#7B6FFF', angle: 198 },
  ];

  const point = (angle: number, r: number) => ({
    x: CX + r * Math.cos(angle * Math.PI / 180),
    y: CY + r * Math.sin(angle * Math.PI / 180),
  });

  const polygon = axes.map(a => {
    const p = point(a.angle, a.val * R);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }}>
      <defs>
        <filter id="dna-glow"><feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(v => {
        const pts = axes.map(a => { const p = point(a.angle, v * R); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
        return <polygon key={v} points={pts} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />;
      })}
      {/* Spokes */}
      {axes.map(a => {
        const p = point(a.angle, R);
        return <line key={a.label} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />;
      })}
      {/* Data polygon */}
      <polygon points={polygon} fill="rgba(123,111,255,0.12)" stroke="#7B6FFF" strokeWidth="1.2"
        filter="url(#dna-glow)"
        style={{ animation: 'dg-fade-up 1s ease-out both' }} />
      {/* Axis dots */}
      {axes.map(a => {
        const p = point(a.angle, a.val * R);
        const lp = point(a.angle, R + 16);
        return (
          <g key={a.label}>
            <circle cx={p.x} cy={p.y} r="4" fill={a.color} filter="url(#dna-glow)" opacity="0.9" />
            <text x={lp.x} y={lp.y + 3} textAnchor="middle"
              fill={a.color} fontSize="7.5" fontFamily="monospace" opacity="0.75">{a.label}</text>
          </g>
        );
      })}
      {/* Center */}
      <circle cx={CX} cy={CY} r="5" fill="#7B6FFF" opacity="0.7">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ── Symbol Clusters ─────────────────────────────────────────────────── */
function SymbolClusters({ dream }: { dream: AdminDreamDetail }) {
  const grouped = useMemo(() => {
    const g: Record<string, typeof dream.symbols> = {};
    for (const s of dream.symbols) (g[s.category] = g[s.category] ?? []).push(s);
    return g;
  }, [dream.symbols]);

  const cats = Object.entries(grouped);
  if (!cats.length) return null;
  const CLUSTER_COLORS = ['#CC80FF', '#FFB800', '#38D68A', '#00CFFF', '#FF4D8F', '#7B6FFF'];

  return (
    <div className="flex flex-wrap gap-4">
      {cats.map(([cat, syms], ci) => {
        const color = CLUSTER_COLORS[ci % CLUSTER_COLORS.length]!;
        return (
          <div key={cat} className="p-3 rounded-xl" style={{
            background: `${color}06`, border: `1px solid ${color}18`, minWidth: 140,
          }}>
            <p className="font-mono text-[8px] font-bold tracking-widest mb-2" style={{ color, opacity: 0.7 }}>
              {cat.toUpperCase()}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {syms.map(s => (
                <span key={s.manifestation}
                  className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full capitalize"
                  style={{ color, background: `${color}12`, border: `1px solid ${color}20` }}>
                  {s.manifestation}
                  {s.confidence < 1 && <span style={{ opacity: 0.5, marginLeft: 3 }}>{(s.confidence*100).toFixed(0)}%</span>}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Search ──────────────────────────────────────────────────────────── */
function DreamSearch({ onSelect }: { onSelect: (id: string) => void }) {
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 300);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['dg-search', dq],
    queryFn: () => fetchDreams({ search: dq, limit: 6 }),
    enabled: dq.length >= 2,
  });

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const results = data?.items ?? [];

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl" style={{
        background: 'rgba(6,4,16,0.98)', border: '1px solid rgba(123,111,255,0.22)',
        boxShadow: '0 0 40px rgba(123,111,255,0.06)',
      }}>
        <span style={{ color: '#7B6FFF', fontSize: 18 }}>◈</span>
        <input value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => q.length >= 2 && setOpen(true)}
          placeholder="Search by Dream ID, title, username, symbol or keyword…"
          className="flex-1 bg-transparent font-mono text-[13px] focus:outline-none"
          style={{ color: 'rgba(232,232,255,0.9)', caretColor: '#7B6FFF' }}
        />
        {q && <button onClick={() => { setQ(''); setOpen(false); }} className="font-mono text-[10px]"
          style={{ color: 'rgba(232,232,255,0.25)' }}>✕</button>}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50" style={{
          background: 'rgba(6,4,16,0.99)', border: '1px solid rgba(123,111,255,0.18)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          animation: 'dg-slide-down 0.2s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          {results.map((d, i) => (
            <button key={d.id} onClick={() => { onSelect(d.id); setQ(d.title ?? d.id); setOpen(false); }}
              className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors"
              style={{ borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(123,111,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-mono text-[10px] font-bold"
                style={{ background: 'rgba(123,111,255,0.12)', color: '#7B6FFF' }}>◈</div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[12px] font-bold truncate" style={{ color: '#E8E8FF' }}>
                  {d.title ?? 'Untitled Dream'}
                </p>
                <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.35)' }}>
                  @{d.authorUsername} · {d.category}
                </p>
              </div>
              <span className="font-mono text-[9px] shrink-0" style={{ color: 'rgba(232,232,255,0.25)' }}>
                {new Date(d.createdAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && dq.length >= 2 && !results.length && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl px-5 py-4 z-50"
          style={{ background: 'rgba(6,4,16,0.99)', border: '1px solid rgba(123,111,255,0.12)' }}>
          <p className="font-mono text-[11px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
            No dreams found for "{dq}"
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────────────────────── */
const EmptyState = memo(function EmptyState() {
  const floats = useMemo(() => ['◈', '☽', '✦', '∞', '⊕', '★', '◎', '♡', '⬡', '◌'].map((s, i) => ({
    s, x: 5 + i * 9.5, y: 20 + Math.sin(i * 0.9) * 50, dur: 10 + i * 0.8, delay: i * 0.6,
  })), []);

  return (
    <div className="flex flex-col items-center justify-center py-28 gap-8 relative overflow-hidden">
      {floats.map(({ s, x, y, dur, delay }) => (
        <div key={s} style={{
          position: 'absolute', left: `${x}%`, top: `${y}%`,
          fontSize: 18, opacity: 0.06, color: '#7B6FFF',
          animation: `dg-float ${dur}s ${delay}s ease-in-out infinite`, willChange: 'transform',
        }}>{s}</div>
      ))}

      {/* Breathing neural network */}
      <div className="relative" style={{ width: 160, height: 160 }}>
        {[0, 1, 2, 3].map(k => (
          <div key={k} style={{
            position: 'absolute', inset: k * 18, borderRadius: '50%',
            border: '1px solid rgba(123,111,255,0.1)',
            animation: `dg-spin-${k % 2} ${20 + k * 8}s linear infinite`,
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, animation: 'dg-breathe 4s ease-in-out infinite',
        }}>◈</div>
      </div>

      <div className="text-center" style={{ maxWidth: 380 }}>
        <p className="font-mono text-[11px] font-bold tracking-widest mb-3" style={{ color: '#7B6FFF' }}>
          NEURAL DREAM EXPLORER
        </p>
        <p className="text-[15px] font-bold mb-2" style={{ color: 'rgba(232,232,255,0.7)' }}>
          Select a dream to explore its neural structure
        </p>
        <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.28)' }}>
          Enter a dream ID, title, or search by author, symbol, or keyword to visualize the AI's interpretation as an interactive neural graph.
        </p>
      </div>
    </div>
  );
});

/* ── Layer filter bar ────────────────────────────────────────────────── */
function LayerFilter({ active, onChange }: { active: string | null; onChange: (t: string | null) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[8px] text-dc-muted tracking-widest mr-1">LAYER</span>
      <button onClick={() => onChange(null)}
        className="dg-layer-btn font-mono text-[9px] font-bold px-3 py-1.5 border rounded-full transition-all"
        style={{
          color: !active ? '#7B6FFF' : 'rgba(232,232,255,0.35)',
          borderColor: !active ? 'rgba(123,111,255,0.4)' : 'rgba(255,255,255,0.07)',
          background: !active ? 'rgba(123,111,255,0.1)' : 'rgba(255,255,255,0.02)',
        }}>All</button>
      {Object.entries(TYPE_CFG).map(([type, cfg]) => (
        <button key={type} onClick={() => onChange(active === type ? null : type)}
          className="dg-layer-btn font-mono text-[9px] font-bold px-3 py-1.5 border rounded-full transition-all"
          style={{
            color: active === type ? cfg.color : 'rgba(232,232,255,0.35)',
            borderColor: active === type ? `${cfg.color}40` : 'rgba(255,255,255,0.07)',
            background: active === type ? `${cfg.color}10` : 'rgba(255,255,255,0.02)',
          }}>
          {cfg.icon} {cfg.label}
        </button>
      ))}
    </div>
  );
}

/* ── Error state ─────────────────────────────────────────────────────── */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div style={{ fontSize: 40, opacity: 0.25, color: '#FF4A5E' }}>◈</div>
      <div className="text-center" style={{ maxWidth: 340 }}>
        <p className="font-mono text-[11px] font-bold tracking-widest mb-3" style={{ color: '#FF4A5E' }}>
          GRAPH LOAD FAILED
        </p>
        <p className="text-[14px] font-bold mb-2" style={{ color: 'rgba(232,232,255,0.55)' }}>
          Unable to load the neural graph for this dream.
        </p>
        <p className="font-mono text-[10px] mb-5" style={{ color: 'rgba(232,232,255,0.2)' }}>
          The dream data could not be retrieved. Please check the API connection and try again.
        </p>
        <button onClick={onRetry}
          className="font-mono text-[10px] font-bold px-5 py-2.5 rounded-xl transition-all"
          style={{ background: 'rgba(255,74,94,0.1)', color: '#FF4A5E', border: '1px solid rgba(255,74,94,0.3)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,74,94,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,74,94,0.1)')}>
          ↺ RETRY
        </button>
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────── */
export default function DreamGraphExplorer() {
  const [dreamId, setDreamId]       = useState<string | null>(null);
  const [hovType, setHovType]       = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  // Fail fast: retry once, then surface the error instead of retrying for 7+ seconds
  const { data: graph, isLoading: gLoading, refetch: refetchGraph } = useQuery({
    queryKey: ['dg-graph', dreamId],
    queryFn: () => fetchDreamGraph(dreamId!),
    enabled: !!dreamId,
    retry: 1,
  });
  const { data: dream, isLoading: dLoading, isError: dError, refetch: refetchDream } = useQuery({
    queryKey: ['dg-detail', dreamId],
    queryFn: () => fetchDreamById(dreamId!),
    enabled: !!dreamId,
    retry: 1,
  });
  const { data: analysis } = useQuery({
    queryKey: ['dg-analysis', dreamId],
    queryFn: () => fetchDreamAnalysis(dreamId!),
    enabled: !!dreamId,
    retry: 0,
  });

  // Synthesize graph from dream detail if the graph endpoint fails or returns no nodes
  const effectiveGraph = useMemo<DreamGraph | null>(() => {
    if (graph && graph.nodes.length > 0) return graph;
    if (dream) return synthesizeGraph(dream);
    return null;
  }, [graph, dream]);

  // Loading: only block content on the dream detail fetch (graph can degrade gracefully)
  const isLoading = dLoading;
  // Content ready as soon as dream detail loads; graph (real or synthesized) follows
  const hasData   = !!dream && !!effectiveGraph;
  // True error: dream detail itself failed (graph failure is handled by fallback)
  const hasFatalError = dError && !dream;

  const handleRetry = useCallback(() => {
    void refetchDream();
    void refetchGraph();
  }, [refetchDream, refetchGraph]);

  const visibleNodes = useMemo(() =>
    effectiveGraph ? (activeLayer ? effectiveGraph.nodes.filter(n => n.type === activeLayer) : effectiveGraph.nodes) : [],
  [effectiveGraph, activeLayer]);

  return (
    <div className="section-system relative">
      <style>{`
        @keyframes dg-fade-up    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dg-slide-down { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dg-scan       { 0%{top:-2px;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
        @keyframes dg-float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes dg-breathe    { 0%,100%{opacity:0.15;transform:scale(1)} 50%{opacity:0.35;transform:scale(1.08)} }
        @keyframes dg-hb         { 0%,100%{box-shadow:0 0 4px currentColor} 50%{box-shadow:0 0 14px currentColor} }
        @keyframes dg-spin-0     { to{transform:rotate(360deg)} }
        @keyframes dg-spin-1     { to{transform:rotate(-360deg)} }
        .dg-layer-btn { transition: all 0.18s; }
        .dg-layer-btn:hover { opacity: 0.85; }
      `}</style>

      <Header
        title="Dream Graph Explorer"
        subtitle="Neural AI visualization — explore the hidden architecture of a dream"
        section="system"
        actions={
          dreamId ? (
            <button onClick={() => setDreamId(null)}
              className="font-mono text-[9px] px-3 py-1.5 rounded-full"
              style={{ color: 'rgba(232,232,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              ← New Search
            </button>
          ) : undefined
        }
      />

      {/* Search */}
      <div className="mb-5">
        <DreamSearch onSelect={setDreamId} />
      </div>

      {/* Empty state */}
      {!dreamId && <EmptyState />}

      {/* Loading */}
      {dreamId && isLoading && (
        <div className="flex items-center justify-center py-28 gap-4">
          <div className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(123,111,255,0.15)', borderTopColor: '#7B6FFF' }} />
          <p className="font-mono text-[11px] tracking-widest" style={{ color: '#7B6FFF' }}>
            LOADING NEURAL GRAPH…
          </p>
        </div>
      )}

      {/* Fatal error state */}
      {dreamId && !isLoading && hasFatalError && (
        <ErrorState onRetry={handleRetry} />
      )}

      {/* Content */}
      {hasData && !isLoading && (
        <>
          {/* Dream header */}
          <DreamHeader dream={dream} analysis={analysis ?? null} />

          {/* ── HERO: Graph + AI Panel ──────────────────────────── */}
          <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '1fr 300px' }}>

            {/* Neural Graph */}
            <div className="os-card overflow-hidden" style={{
              background: 'linear-gradient(135deg, rgba(4,2,14,0.99) 0%, rgba(12,6,28,0.99) 100%)',
              border: '1px solid rgba(123,111,255,0.1)',
            }}>
              <div className="os-panel-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#7B6FFF' }} />
                    <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#7B6FFF' }} />
                  </div>
                  <p className="os-title" style={{ color: '#7B6FFF' }}>NEURAL DREAM GRAPH</p>
                </div>
                <div className="flex items-center gap-3">
                  {hovType && (
                    <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: TYPE_CFG[hovType]?.color, background: `${TYPE_CFG[hovType]?.color}12`, border: `1px solid ${TYPE_CFG[hovType]?.color}25` }}>
                      {TYPE_CFG[hovType]?.icon} {TYPE_CFG[hovType]?.label}
                    </span>
                  )}
                  {!graph && !gLoading && (
                    <span className="font-mono text-[8px] px-2 py-0.5 rounded-full"
                      style={{ color: '#FFB800', background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)' }}>
                      ⚡ synthesized
                    </span>
                  )}
                  <span className="font-mono text-[9px] text-dc-muted">
                    {visibleNodes.length} / {effectiveGraph?.nodes.length ?? 0} nodes
                  </span>
                </div>
              </div>

              {/* Layer filter */}
              <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <LayerFilter active={activeLayer} onChange={setActiveLayer} />
              </div>

              {/* Graph */}
              <div className="p-2 relative">
                {gLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(6,4,16,0.8)', border: '1px solid rgba(123,111,255,0.2)' }}>
                      <div className="w-3 h-3 rounded-full border border-solid animate-spin"
                        style={{ borderColor: 'rgba(123,111,255,0.2)', borderTopColor: '#7B6FFF' }} />
                      <span className="font-mono text-[8px]" style={{ color: '#7B6FFF' }}>FETCHING GRAPH…</span>
                    </div>
                  </div>
                )}
                <NeuralGraph nodes={visibleNodes} hoveredType={hovType} onHover={setHovType} />
              </div>
            </div>

            {/* AI Interpretation */}
            <div className="flex flex-col gap-4">
              <div className="ai-reading-panel p-5 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative">
                    <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#7B6FFF' }} />
                    <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#7B6FFF' }} />
                  </div>
                  <p className="os-title" style={{ color: '#7B6FFF' }}>AI INTERPRETATION</p>
                </div>
                <AIPanel dream={dream} />
              </div>

              {/* Dream DNA */}
              <div className="os-card p-4" style={{ border: '1px solid rgba(123,111,255,0.12)' }}>
                <p className="os-title mb-3" style={{ color: '#7B6FFF' }}>DREAM DNA</p>
                <div className="flex items-center justify-center">
                  <DreamDNA dream={dream} analysis={analysis ?? null} />
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 2: Story Flow + Connections ─────────────────── */}
          <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="os-card overflow-hidden">
              <div className="os-panel-header">
                <p className="os-title" style={{ color: '#CC80FF' }}>DREAM STORY FLOW</p>
              </div>
              <div className="p-5">
                <StoryFlow dream={dream} />
              </div>
            </div>

            <div className="os-card overflow-hidden">
              <div className="os-panel-header flex items-center justify-between">
                <p className="os-title" style={{ color: '#38D68A' }}>COLLECTIVE CONNECTIONS</p>
                <span className="font-mono text-[9px] text-dc-muted">{effectiveGraph?.connections.length ?? 0} RESONANCES</span>
              </div>
              <div className="p-4">
                <CollectivePanel connections={effectiveGraph?.connections ?? []} dream={dream} />
              </div>
            </div>
          </div>

          {/* ── ROW 3: Symbol Clusters ──────────────────────────── */}
          {dream.symbols.length > 0 && (
            <div className="os-card overflow-hidden mb-5">
              <div className="os-panel-header flex items-center justify-between">
                <p className="os-title" style={{ color: '#FFB800' }}>SYMBOL CLUSTERS</p>
                <span className="font-mono text-[9px] text-dc-muted">
                  {dream.symbols.length} SYMBOLS · {Object.keys(
                    dream.symbols.reduce((a,s) => ({...a,[s.category]:1}), {})
                  ).length} CATEGORIES
                </span>
              </div>
              <div className="p-5">
                <SymbolClusters dream={dream} />
              </div>
            </div>
          )}

          {/* ── ROW 4: Summary stats grid ────────────────────────── */}
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: 'SYMBOLS',    val: effectiveGraph?.summary.symbolCount    ?? 0, color: '#CC80FF' },
              { label: 'EMOTIONS',   val: effectiveGraph?.summary.emotionCount   ?? 0, color: '#FF4D8F' },
              { label: 'ARCHETYPES', val: effectiveGraph?.summary.archetypeCount ?? 0, color: '#FFB800' },
              { label: 'THEMES',     val: effectiveGraph?.summary.themeCount     ?? 0, color: '#38D68A' },
              { label: 'PLACES',     val: effectiveGraph?.summary.placeCount     ?? 0, color: '#00CFFF' },
              { label: 'RESONANCES', val: effectiveGraph?.summary.connectionCount ?? 0, color: '#7B6FFF' },
            ].map(({ label, val, color }) => (
              <div key={label} className="os-card p-3 text-center" style={{
                background: `${color}05`, border: `1px solid ${color}12`,
              }}>
                <p className="font-mono font-black text-[22px] leading-none mb-1" style={{ color }}>{val}</p>
                <p className="font-mono text-[7px] font-bold tracking-widest" style={{ color: `${color}50` }}>{label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
