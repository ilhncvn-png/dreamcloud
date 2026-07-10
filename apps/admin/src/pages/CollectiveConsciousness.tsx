import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, memo } from 'react';
import Header from '../components/Header';
import { fetchCollectiveConsciousness } from '../api/admin.api';
import type { CollectiveConsciousnessData, CoherenceLevel } from '../types/admin.types';

/* ── Coherence config ─────────────────────────────────────────────────── */
const COH_CFG: Record<CoherenceLevel, {
  hex: string; glow: string; label: string; sublabel: string; atmosphere: string; ai: string;
}> = {
  UNIFIED: {
    hex: '#FFD700', glow: 'rgba(255,215,0,0.5)', label: 'UNIFIED',
    sublabel: 'Maximum collective resonance',
    atmosphere: 'rgba(48,36,0,0.97)',
    ai: 'The collective mind has reached unified coherence. All dream nodes are synchronizing across a single symbolic field.',
  },
  RESONANT: {
    hex: '#CC80FF', glow: 'rgba(204,128,255,0.5)', label: 'RESONANT',
    sublabel: 'Strong harmonic alignment',
    atmosphere: 'rgba(20,12,40,0.97)',
    ai: 'The collective consciousness is resonating harmonically. Multiple symbol clusters are converging into shared narrative.',
  },
  FRAGMENTED: {
    hex: '#00CFFF', glow: 'rgba(0,207,255,0.4)', label: 'FRAGMENTED',
    sublabel: 'Distributed activation patterns',
    atmosphere: 'rgba(6,18,32,0.97)',
    ai: 'The collective field shows fragmentation — individual dream threads are diverging into unique symbolic paths.',
  },
  DISPERSED: {
    hex: '#5A5A84', glow: 'rgba(90,90,132,0.3)', label: 'DISPERSED',
    sublabel: 'Low collective signal',
    atmosphere: 'rgba(8,8,20,0.97)',
    ai: 'The collective mind is in a dispersed state. Dream energy is diffuse. New patterns are seeding beneath the surface.',
  },
};

/* ── AI observations (auto-rotated) ─────────────────────────────────── */
const AI_OBS = [
  'Kolektif duygusal uyum güçlendi — paylaşılan semboller artıyor.',
  'Hafıza ile ilgili semboller baskın hale geliyor.',
  'İki sembol kümesi birleşmeye başladı.',
  'Lucid dream sembolleri hızla yayılıyor.',
  'Beklenmedik bir rezonans birden fazla arketipte ortaya çıktı.',
  'Su ve ateş sembolleri arasında yeni bir köprü oluşuyor.',
  'Kolektif bilinç yüksek senkronizasyon fazına girdi.',
  'Gece sembolleri sabah sembollerini geride bırakıyor.',
  'Dönüşüm arketipi tüm ağda yayılıyor.',
  'Rüya enerjisi merkezi çekirdekte yoğunlaşıyor.',
];

/* ── Thought stream sequences ──────────────────────────────────────────── */
const STREAMS = [
  ['Rüya', 'Deniz', 'Ay', 'Dönüşüm', 'Anı', 'Kolektif Sembol', 'Paylaşılan Bilinç'],
  ['Karanlık', 'Orman', 'Yol', 'Kapı', 'Aydınlanma', 'Uyanış'],
  ['Ateş', 'Işık', 'Güneş', 'Altın', 'Güç', 'Arketip'],
  ['Düşmek', 'Uçmak', 'Özgürlük', 'Gökyüzü', 'Sonsuzluk', 'Sembol'],
  ['Su', 'Yansıma', 'Kimlik', 'Gölge', 'Dönüşüm', 'Bütünleşme'],
];

/* ── Seeded PRNG for stable layouts ────────────────────────────────────── */
function mkRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

/* ── Types ─────────────────────────────────────────────────────────────── */
type Sym = CollectiveConsciousnessData['sharedSymbols'][number];
interface NodeDatum { id: number; s: Sym; bx: number; by: number; r: number;
  fax: number; fay: number; fdur: number; foff: number; ring: number; }
interface EdgeDatum { from: number; to: number; str: number; }

/* ── Background particles ──────────────────────────────────────────────── */
const BgParticles = memo(function BgParticles({ hex }: { hex: string }) {
  const pts = useMemo(() => {
    const rng = mkRng(7);
    return Array.from({ length: 36 }, (_, i) => ({
      id: i, x: rng()*100, y: rng()*100, r: 0.6+rng()*1.4,
      dur: 14+rng()*18, delay: rng()*20, op: 0.04+rng()*0.08,
      ax: (rng()-0.5)*24, ay: (rng()-0.5)*20,
    }));
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {pts.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.r*2, height: p.r*2, borderRadius: '50%',
          background: hex, opacity: p.op,
          animation: `cm-pt-${p.id%6} ${p.dur}s ${p.delay}s ease-in-out infinite`,
          willChange: 'transform',
          transform: 'translateZ(0)',
        }} />
      ))}
    </div>
  );
});

/* ── Animated gauge ─────────────────────────────────────────────────────── */
function AnimGauge({ score, label, hex, delay = 0 }: { score: number; label: string; hex: string; delay?: number }) {
  const R = 36, C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(score, 100)) / 100;
  const id = `cg-${label.replace(/\s+/g,'')}-${hex.slice(1,4)}`;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg viewBox="0 0 90 90" style={{ width: 82, height: 82 }}>
          <defs>
            <filter id={id}><feGaussianBlur stdDeviation="2" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {/* Track */}
          <circle cx="45" cy="45" r={R} fill="none"
            stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
          {/* Glow ring */}
          <circle cx="45" cy="45" r={R} fill="none"
            stroke={hex} strokeWidth="7"
            strokeDasharray={`${C*pct} ${C}`}
            strokeDashoffset={C*0.25}
            transform="rotate(-90 45 45)"
            opacity="0.3" filter={`url(#${id})`} />
          {/* Main arc */}
          <circle cx="45" cy="45" r={R} fill="none"
            stroke={hex} strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={`${C*pct} ${C}`}
            strokeDashoffset={C*0.25}
            transform="rotate(-90 45 45)"
            filter={`url(#${id})`}
            style={{ animation: `cm-arc-fill 1.2s ${delay}s cubic-bezier(0.22,1,0.36,1) both` }} />
          {/* Value */}
          <text x="45" y="45" textAnchor="middle" dominantBaseline="middle"
            fill={hex} fontSize="15" fontFamily="monospace" fontWeight="bold">
            {score}
          </text>
        </svg>
        {/* Heartbeat dot */}
        <div className="absolute top-0 right-0" style={{
          width: 6, height: 6, borderRadius: '50%', background: hex,
          animation: `cm-heartbeat 1.6s ${delay}s ease-in-out infinite`,
          boxShadow: `0 0 6px ${hex}`,
        }} />
      </div>
      <p className="font-mono text-[8px] font-bold tracking-widest text-center" style={{ color: hex, opacity: 0.7 }}>
        {label}
      </p>
    </div>
  );
}

/* ── Neural Network SVG hero ────────────────────────────────────────────── */
const NeuralNetwork = memo(function NeuralNetwork({
  symbols, coherenceLevel, moodScore, hoveredSym, onHover,
}: {
  symbols: Sym[];
  coherenceLevel: CoherenceLevel;
  moodScore: number;
  hoveredSym: string | null;
  onHover: (s: string | null) => void;
}) {
  const W = 680, H = 440, CX = W / 2, CY = H / 2;
  const c = COH_CFG[coherenceLevel];
  const [focusedId, setFocusedId] = useState<number | null>(null);

  const { nodes, edges } = useMemo((): { nodes: NodeDatum[]; edges: EdgeDatum[] } => {
    const rng = mkRng(1337);
    const sorted = [...symbols].filter(s => s.symbol != null)
      .sort((a, b) => b.dreamCount - a.dreamCount).slice(0, 24);
    const maxPct = sorted[0]?.pct ?? 1;
    const rings = [{ r: 0, n: 1 }, { r: 78, n: 5 }, { r: 148, n: 9 }, { r: 212, n: 12 }];
    const nodes: NodeDatum[] = [];
    let idx = 0;
    for (let ri = 0; ri < rings.length; ri++) {
      const ring = rings[ri];
      for (let i = 0; i < ring.n && idx < sorted.length; i++, idx++) {
        const angle = ring.n === 1 ? -Math.PI / 2
          : (i / ring.n) * 2 * Math.PI - Math.PI / 2 + ri * 0.18;
        nodes.push({
          id: idx, s: sorted[idx],
          bx: CX + ring.r * Math.cos(angle),
          by: CY + ring.r * Math.sin(angle),
          r: 5 + (sorted[idx].pct / maxPct) * 13,
          fax: 3 + rng() * 9, fay: 3 + rng() * 8,
          fdur: 9 + rng() * 13, foff: rng() * 12,
          ring: ri,
        });
      }
    }
    const edges: EdgeDatum[] = [];
    // Center → inner ring
    for (let i = 1; i < Math.min(6, nodes.length); i++) {
      edges.push({ from: 0, to: i, str: nodes[i].s.pct / maxPct });
    }
    // Inner → middle ring
    for (let i = 1; i < 6 && i < nodes.length; i++) {
      for (let j = 6; j < 15 && j < nodes.length; j++) {
        const d = Math.hypot(nodes[i].bx - nodes[j].bx, nodes[i].by - nodes[j].by);
        if (d < 175) edges.push({ from: i, to: j, str: 1 - d / 175 });
      }
    }
    // Middle → outer ring (sparse)
    for (let i = 6; i < 15 && i < nodes.length; i++) {
      for (let j = 15; j < nodes.length; j++) {
        const d = Math.hypot(nodes[i].bx - nodes[j].bx, nodes[i].by - nodes[j].by);
        if (d < 110) edges.push({ from: i, to: j, str: 0.3 });
      }
    }
    return { nodes, edges };
  }, [symbols]);

  const hovId = nodes.findIndex(n => n.s.symbol === hoveredSym);
  const activeId = focusedId ?? hovId;
  const isActive = activeId >= 0;

  const connSet = useMemo(() => {
    const s = new Set<number>();
    if (!isActive) return s;
    for (const e of edges) {
      if (e.from === activeId) s.add(e.to);
      if (e.to === activeId) s.add(e.from);
    }
    return s;
  }, [activeId, isActive, edges]);

  const center = nodes[0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}
      onMouseLeave={() => onHover(null)}>
      <defs>
        <radialGradient id="cm-atmo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c.hex} stopOpacity="0.14" />
          <stop offset="55%" stopColor={c.hex} stopOpacity="0.04" />
          <stop offset="100%" stopColor={c.hex} stopOpacity="0" />
        </radialGradient>
        <filter id="cm-gs"><feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="cm-gm"><feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="cm-gl"><feGaussianBlur stdDeviation="12" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      {/* Atmospheric glow */}
      <ellipse cx={CX} cy={CY} rx="320" ry="200" fill="url(#cm-atmo)" />

      {/* Rotating orbital rings */}
      {[78, 148, 212].map((r, i) => (
        <circle key={r} cx={CX} cy={CY} r={r} fill="none"
          stroke={c.hex} strokeWidth="0.4" opacity="0.08" strokeDasharray="4 14">
          <animateTransform attributeName="transform" type="rotate"
            values={`0 ${CX} ${CY};${i % 2 === 0 ? 360 : -360} ${CX} ${CY}`}
            dur={`${90 + i * 35}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Edges + energy particles */}
      {edges.map((e, i) => {
        const n1 = nodes[e.from], n2 = nodes[e.to];
        if (!n1 || !n2) return null;
        const lit = isActive && (e.from === activeId || e.to === activeId);
        const conn = isActive && (connSet.has(e.from) || connSet.has(e.to));
        const dim = isActive && !lit && !conn;
        const ePath = `M${n1.bx},${n1.by} L${n2.bx},${n2.by}`;
        const pdur = 1.2 + (1 - e.str) * 3.5;
        return (
          <g key={i}>
            <line x1={n1.bx} y1={n1.by} x2={n2.bx} y2={n2.by}
              stroke={c.hex} strokeWidth={lit ? 1.4 : 0.6}
              opacity={dim ? 0.02 : lit ? e.str * 0.6 + 0.25 : e.str * 0.14 + 0.04} />
            {!dim && (
              <>
                <circle r={lit ? 2.8 : 1.8} fill={c.hex}
                  opacity={lit ? 0.95 : 0.5}
                  filter={lit ? 'url(#cm-gs)' : undefined}>
                  <animateMotion dur={`${pdur}s`} begin={`${(i * 0.55) % pdur}s`}
                    repeatCount="indefinite" path={ePath} />
                </circle>
                {lit && (
                  <circle r="1.2" fill="white" opacity="0.7">
                    <animateMotion dur={`${pdur * 0.7}s`} begin={`${(i * 0.3) % (pdur*0.7)}s`}
                      repeatCount="indefinite" path={ePath} />
                  </circle>
                )}
              </>
            )}
          </g>
        );
      })}

      {/* Satellite nodes */}
      {nodes.slice(1).map((n) => {
        const hov = n.id === hovId;
        const foc = n.id === focusedId;
        const conn = connSet.has(n.id);
        const dim = isActive && !hov && !foc && !conn;
        const hi = hov || foc || conn;
        const fv = [
          `${-n.fax * 0.5},${-n.fay * 0.3}`,
          `${n.fax * 0.8},${n.fay * 0.6}`,
          `${-n.fax * 0.3},${n.fay}`,
          `${n.fax * 0.5},${-n.fay * 0.8}`,
          `${-n.fax * 0.5},${-n.fay * 0.3}`,
        ].join(';');
        return (
          <g key={n.id} style={{ cursor: 'pointer', opacity: dim ? 0.12 : 1, transition: 'opacity 0.35s' }}
            filter={hi ? 'url(#cm-gs)' : undefined}
            onMouseEnter={() => onHover(n.s.symbol)}
            onClick={() => setFocusedId(foc ? null : n.id)}>
            <animateTransform attributeName="transform" type="translate"
              values={fv} dur={`${n.fdur}s`} begin={`${n.foff}s`}
              repeatCount="indefinite" calcMode="spline"
              keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1" />

            {/* Halo */}
            <circle cx={n.bx} cy={n.by} r={n.r + 6} fill={c.hex}>
              <animate attributeName="opacity" values={hi ? '0.18;0.35;0.18' : '0.03;0.1;0.03'}
                dur={`${2.2 + n.id * 0.15}s`} repeatCount="indefinite" />
            </circle>

            {/* Body */}
            <circle cx={n.bx} cy={n.by} r={n.r}
              fill={hi ? c.hex : `${c.hex}70`}
              stroke={hi ? c.hex : 'none'} strokeWidth={hi ? 1.2 : 0}
              opacity={hi ? 1 : 0.65}>
              {hi && <animate attributeName="r" values={`${n.r};${n.r * 1.18};${n.r}`}
                dur="2s" repeatCount="indefinite" />}
            </circle>

            {/* Label */}
            {(n.r > 9 || hi) && (
              <text x={n.bx} y={n.by + n.r + 10} textAnchor="middle"
                fill={hi ? c.hex : 'rgba(232,232,255,0.45)'}
                fontSize={hi ? 8 : 7} fontFamily="monospace" fontWeight={hi ? 'bold' : 'normal'}>
                {(n.s.symbol ?? '').slice(0, 9)}
              </text>
            )}

            {/* Focus orbit + metadata */}
            {foc && (
              <g>
                <circle cx={n.bx} cy={n.by} r={n.r + 18} fill="none"
                  stroke={c.hex} strokeWidth="0.7" strokeDasharray="3 7" opacity="0.55">
                  <animateTransform attributeName="transform" type="rotate"
                    values={`0 ${n.bx} ${n.by};360 ${n.bx} ${n.by}`}
                    dur="9s" repeatCount="indefinite" />
                </circle>
                <text x={n.bx} y={n.by - n.r - 9} textAnchor="middle"
                  fill={c.hex} fontSize="7" fontFamily="monospace" opacity="0.85">
                  {n.s.pct}% · {n.s.dreamCount}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Center consciousness core */}
      {center && (
        <g filter="url(#cm-gl)" style={{ cursor: 'pointer' }}
          onClick={() => setFocusedId(focusedId === 0 ? null : 0)}>
          {/* Resonance rings */}
          {[0, 1, 2].map(k => (
            <circle key={k} cx={CX} cy={CY} r={36 + k * 20} fill="none"
              stroke={c.hex} strokeWidth="0.8" opacity="0.18">
              <animate attributeName="r" values={`${36+k*20};${50+k*20};${36+k*20}`}
                dur={`${3.2 + k * 1.1}s`} begin={`${k * 1.3}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.22;0;0.22"
                dur={`${3.2 + k * 1.1}s`} begin={`${k * 1.3}s`} repeatCount="indefinite" />
            </circle>
          ))}
          {/* Ambient glow */}
          <circle cx={CX} cy={CY} r="34" fill={c.hex} opacity="0.1">
            <animate attributeName="r" values="28;44;28" dur="4.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.06;0.18;0.06" dur="4.2s" repeatCount="indefinite" />
          </circle>
          {/* Pulse ring */}
          <circle cx={CX} cy={CY} r="28" fill="none"
            stroke={c.hex} strokeWidth="1.2" opacity="0.5">
            <animate attributeName="r" values="24;38;24" dur="3.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.55;0;0.55" dur="3.6s" repeatCount="indefinite" />
          </circle>
          {/* Core */}
          <circle cx={CX} cy={CY} r="21" fill={c.hex} opacity="0.92" />
          <text x={CX} y={CY - 3} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(6,6,20,0.9)" fontSize="7" fontFamily="monospace" fontWeight="bold">
            {(center.s.symbol ?? '???').slice(0, 5).toUpperCase()}
          </text>
          <text x={CX} y={CY + 8} textAnchor="middle"
            fill="rgba(6,6,20,0.65)" fontSize="5.5" fontFamily="monospace">
            {center.s.pct}%
          </text>
        </g>
      )}

      {/* Mood overlay */}
      <text x={W - 12} y={18} textAnchor="end" fill={c.hex}
        fontSize="9" fontFamily="monospace" fontWeight="bold" opacity="0.45">
        MOOD {moodScore}
      </text>
    </svg>
  );
});

/* ── Collective thought stream ───────────────────────────────────────────── */
const ThoughtStream = memo(function ThoughtStream({ hex }: { hex: string }) {
  const [si, setSi] = useState(0);
  const [step, setStep] = useState(0);
  const [vis, setVis] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVis(false);
      setTimeout(() => {
        setStep(s => {
          const next = s + 1;
          if (next >= STREAMS[si].length) {
            setSi(i => (i + 1) % STREAMS.length);
            setStep(0);
          } else {
            setStep(next);
          }
          return next >= STREAMS[si].length ? 0 : next;
        });
        setVis(true);
      }, 300);
    }, 1400);
    return () => clearInterval(t);
  }, [si]);

  const seq = STREAMS[si];
  return (
    <div className="os-card p-4 flex flex-col gap-2" style={{
      background: 'rgba(6,4,16,0.96)', border: `1px solid ${hex}18`,
      minWidth: 180, maxWidth: 200,
    }}>
      <p className="font-mono text-[8px] font-bold tracking-widest mb-1" style={{ color: hex, opacity: 0.7 }}>
        ◎ THOUGHT STREAM
      </p>
      <div className="flex flex-col gap-0.5">
        {seq.map((w, i) => (
          <div key={`${si}-${i}`} style={{
            opacity: i <= step ? (i === step ? 1 : 0.35) : 0.08,
            transition: 'opacity 0.4s',
          }}>
            {i > 0 && (
              <div style={{
                height: 10, display: 'flex', alignItems: 'center',
                paddingLeft: 6, opacity: i <= step ? 0.3 : 0.05,
              }}>
                <span style={{ color: hex, fontSize: 8 }}>↓</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              {i === step && vis && (
                <span style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: hex, display: 'block', flexShrink: 0,
                  boxShadow: `0 0 6px ${hex}`,
                  animation: 'cm-hb 1.2s ease-in-out infinite',
                }} />
              )}
              <span className="font-mono text-[10px]" style={{
                color: i === step ? hex : 'rgba(232,232,255,0.5)',
                fontWeight: i === step ? 700 : 400,
              }}>{w}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ── AI Observations ─────────────────────────────────────────────────────── */
function AIObservations({ hex }: { hex: string }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % AI_OBS.length); setFade(true); }, 350);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ transition: 'opacity 0.35s', opacity: fade ? 1 : 0 }}>
      <div className="flex items-start gap-2 mb-2">
        <span style={{ color: hex, fontSize: 9 }}>◈</span>
        <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.8)' }}>
          {AI_OBS[idx]}
        </p>
      </div>
      <div className="flex gap-1 mt-1">
        {AI_OBS.map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 16 : 4, height: 2, borderRadius: 1,
            background: i === idx ? hex : `${hex}30`,
            transition: 'all 0.35s',
          }} />
        ))}
      </div>
    </div>
  );
}

/* ── Symbol table row ────────────────────────────────────────────────────── */
function SymbolRow({ sym, rank, hex, maxPct, isHighlighted, onHover, onClick }: {
  sym: Sym; rank: number; hex: string; maxPct: number;
  isHighlighted: boolean; onHover: (s: string | null) => void; onClick: (s: string) => void;
}) {
  const bar = (sym.pct / maxPct) * 100;
  const top3 = rank <= 3;
  return (
    <div
      className="flex items-center gap-4 px-5 py-3 transition-all cursor-pointer"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: isHighlighted ? `${hex}08` : 'transparent',
        boxShadow: isHighlighted ? `inset 0 0 0 1px ${hex}20` : 'none',
      }}
      onMouseEnter={() => onHover(sym.symbol)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(sym.symbol)}
    >
      <span className="font-mono text-xs font-black w-5 shrink-0"
        style={{ color: top3 ? hex : 'rgba(255,255,255,0.2)' }}>{rank}</span>
      <div className="flex-1">
        <div className="flex justify-between mb-1.5">
          <span className="font-mono text-xs capitalize"
            style={{ color: isHighlighted || top3 ? hex : 'rgba(232,232,255,0.65)' }}>
            {sym.symbol}
          </span>
          <span className="font-mono text-[10px] text-dc-muted">{sym.pct}% · {sym.dreamCount}</span>
        </div>
        <div className="signal-bar" style={{ height: 3 }}>
          <div className="signal-bar-fill" style={{
            width: `${bar}%`,
            background: top3 || isHighlighted
              ? `linear-gradient(90deg, ${hex}40, ${hex})`
              : 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.18))',
            boxShadow: (top3 || isHighlighted) ? `0 0 8px ${hex}50` : 'none',
            transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s',
          }} />
        </div>
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────── */
export default function CollectiveConsciousness() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['collective-consciousness'],
    queryFn: fetchCollectiveConsciousness,
    refetchInterval: 60_000,
  });

  const [hoveredSym, setHoveredSym] = useState<string | null>(null);
  const [focusedSym, setFocusedSym] = useState<string | null>(null);

  const activeSym = focusedSym ?? hoveredSym;

  const handleSymClick = (s: string) => setFocusedSym(f => f === s ? null : s);

  if (isLoading) return (
    <div className="section-intelligence relative">
      <Header title="Collective Mind" subtitle="" section="intelligence" />
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 mx-auto mb-4 animate-spin"
            style={{ borderColor: 'rgba(204,128,255,0.15)', borderTopColor: '#CC80FF' }} />
          <p className="text-[10px] font-mono tracking-widest" style={{ color: '#CC80FF' }}>
            COLLECTIVE FIELD SYNCING…
          </p>
        </div>
      </div>
    </div>
  );

  if (isError || !data) return (
    <div className="section-intelligence relative">
      <Header title="Collective Mind" subtitle="" section="intelligence" />
      <div className="rounded-xl p-8 text-center"
        style={{ background: 'rgba(204,128,255,0.04)', border: '1px solid rgba(204,128,255,0.15)' }}>
        <p className="text-dc-error text-sm">Collective field unreachable.</p>
      </div>
    </div>
  );

  const coh = COH_CFG[data.coherenceLevel];
  const maxPct = data.sharedSymbols[0]?.pct ?? 1;

  return (
    <div className="section-intelligence relative" style={{
      background: `radial-gradient(ellipse at 50% 15%, ${coh.atmosphere.replace('0.97','0.7')} 0%, rgba(6,6,20,0) 50%)`,
    }}>
      {/* Global CSS for this page */}
      <style>{`
        @keyframes cm-pt-0 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(12px,-16px)} }
        @keyframes cm-pt-1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-18px,10px)} }
        @keyframes cm-pt-2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(14px,18px)} }
        @keyframes cm-pt-3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-10px,-20px)} }
        @keyframes cm-pt-4 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,8px)} }
        @keyframes cm-pt-5 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-14px,14px)} }
        @keyframes cm-arc-fill { from { stroke-dashoffset: 999 } }
        @keyframes cm-heartbeat { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.8);opacity:0.2} }
        @keyframes cm-hb { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(1.6)} }
        @keyframes cm-obs-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cm-breathe { 0%,100%{opacity:0.6} 50%{opacity:1} }
        .cm-data-row:hover { background: rgba(255,255,255,0.025) !important; }
      `}</style>

      <Header
        title="Collective Mind"
        subtitle="Kolektif bilinç alanı — paylaşılan semboller ve rezonans haritası"
        section="intelligence"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: coh.hex }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: coh.hex }} />
            </div>
            <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: coh.hex }}>
              {coh.label} · {data.consciousnessSynchrony}% SYNC
            </span>
            <span className="font-mono text-[9px] font-bold" style={{ color: 'rgba(232,232,255,0.3)' }}>
              {data.mindToMindConnections} M2M
            </span>
          </div>
        }
      />

      {/* ── HERO: Living Neural Network ────────────────────────────────── */}
      <div className="os-card overflow-hidden mb-5 relative" style={{
        background: `linear-gradient(135deg, ${coh.atmosphere} 0%, rgba(6,4,16,0.99) 70%)`,
        border: `1px solid ${coh.hex}14`,
        boxShadow: `0 0 80px ${coh.hex}06, 0 8px 40px rgba(0,0,0,0.7)`,
      }}>
        {/* Background particles */}
        <BgParticles hex={coh.hex} />

        {/* Scan line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 10,
          background: `linear-gradient(90deg, transparent, ${coh.hex}30, transparent)`,
          animation: 'cm-pt-0 14s ease-in-out infinite', pointerEvents: 'none',
        }} />

        <div className="os-panel-header flex items-center justify-between" style={{ position: 'relative', zIndex: 5 }}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: coh.hex }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: coh.hex }} />
            </div>
            <p className="os-title" style={{ color: coh.hex }}>COLLECTIVE NEURAL NETWORK</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[9px] font-bold" style={{ color: `${coh.hex}60` }}>
              {data.sharedSymbols.length} NODES · {data.resonanceCount} RESONANCES
            </span>
            <div className="px-3 py-1 rounded-full font-mono text-[9px] font-black" style={{
              background: `${coh.hex}10`, border: `1px solid ${coh.hex}25`, color: coh.hex,
              animation: 'cm-breathe 2.5s ease-in-out infinite',
            }}>
              {coh.label}
            </div>
          </div>
        </div>

        {/* Network + side panels */}
        <div className="flex" style={{ position: 'relative', zIndex: 3 }}>
          {/* Network SVG */}
          <div className="flex-1 py-4 px-2">
            <NeuralNetwork
              symbols={data.sharedSymbols}
              coherenceLevel={data.coherenceLevel}
              moodScore={data.collectiveMoodScore}
              hoveredSym={activeSym}
              onHover={setHoveredSym}
            />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4 p-5 shrink-0" style={{ width: 280 }}>

            {/* Coherence state */}
            <div style={{ borderBottom: `1px solid ${coh.hex}12`, paddingBottom: 16 }}>
              <p className="os-label mb-2">COHERENCE STATE</p>
              <p className="font-black leading-none mb-1" style={{
                fontSize: 36, color: coh.hex,
                textShadow: `0 0 28px ${coh.glow}`,
              }}>{coh.label}</p>
              <p className="text-[10px]" style={{ color: 'rgba(232,232,255,0.4)' }}>{coh.sublabel}</p>
            </div>

            {/* Animated gauges */}
            <div className="flex gap-2 justify-around">
              <AnimGauge score={data.collectiveMoodScore}    label="MOOD"  hex={coh.hex}  delay={0}   />
              <AnimGauge score={data.consciousnessSynchrony} label="SYNC"  hex="#38D68A"  delay={0.2} />
              <AnimGauge score={data.alignmentScore}         label="ALIGN" hex="#00CFFF"  delay={0.4} />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2" style={{ borderTop: `1px solid ${coh.hex}10`, paddingTop: 12 }}>
              {[
                { label: 'SHARED SYMBOLS', value: String(data.resonanceCount),            color: coh.hex    },
                { label: 'MIND LINKS',     value: String(data.mindToMindConnections),     color: '#38D68A'  },
                { label: 'EMOTION',        value: data.collectiveEmotion,                 color: '#CC80FF'  },
                { label: 'TOP THEME',      value: data.collectiveThemes[0]?.theme ?? '—', color: '#FFB800'  },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-2.5 rounded-xl" style={{
                  background: `${color}06`, border: `1px solid ${color}12`,
                }}>
                  <p className="os-label mb-1">{label}</p>
                  <p className="font-mono font-black text-[12px] capitalize leading-tight" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Thought stream */}
            <ThoughtStream hex={coh.hex} />
          </div>
        </div>
      </div>

      {/* ── AI READING + SYMBOL TABLE ──────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-5">

        {/* AI reading */}
        <div className="col-span-2 ai-reading-panel p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: coh.hex }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: coh.hex }} />
            </div>
            <p className="os-title" style={{ color: coh.hex }}>AI COLLECTIVE ANALYSIS</p>
          </div>

          {/* Static coherence reading */}
          <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.7)' }}>
            {coh.ai}
          </p>

          {/* Rotating live observation */}
          <div className="p-3 rounded-xl" style={{
            background: `${coh.hex}06`, border: `1px solid ${coh.hex}14`,
          }}>
            <p className="os-label mb-2">LIVE OBSERVATION</p>
            <AIObservations hex={coh.hex} />
          </div>

          {/* Themes */}
          <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${coh.hex}12` }}>
            <p className="os-label mb-2">COLLECTIVE THEMES</p>
            {data.collectiveThemes.slice(0, 5).map((t, i) => (
              <div key={t.theme} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full"
                    style={{ background: coh.hex, animation: `cm-breathe ${1.5+i*0.3}s ease-in-out infinite` }} />
                  <span className="font-mono text-[11px] capitalize"
                    style={{ color: 'rgba(232,232,255,0.65)' }}>{t.theme}</span>
                </div>
                <span className="font-mono text-[10px] text-dc-muted">{t.count}</span>
              </div>
            ))}
          </div>

          <p className="text-[9px] font-mono mt-auto" style={{ color: 'rgba(123,111,255,0.3)' }}>
            COLLECTIVE_MIND v4.2 ▪ DREAMCLOUD OS
          </p>
        </div>

        {/* Symbol constellation table */}
        <div className="col-span-3 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">SYMBOL CONSTELLATION</p>
            <span className="text-[9px] font-mono text-dc-muted">
              {activeSym ? `◈ ${activeSym}` : 'HOVER TO HIGHLIGHT IN NETWORK'}
            </span>
          </div>
          <div>
            {data.sharedSymbols.filter(s => s.symbol != null).slice(0, 12).map((s, i) => (
              <SymbolRow
                key={s.symbol}
                sym={s} rank={i + 1} hex={coh.hex} maxPct={maxPct}
                isHighlighted={activeSym === s.symbol}
                onHover={setHoveredSym}
                onClick={handleSymClick}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── COHERENCE SCALE ──────────────────────────────────────────────── */}
      <div className="os-card p-5">
        <p className="os-title mb-4">COHERENCE SCALE</p>
        <div className="grid grid-cols-4 gap-4">
          {(Object.entries(COH_CFG) as [CoherenceLevel, typeof COH_CFG[CoherenceLevel]][]).map(([lvl, cfg]) => {
            const active = data.coherenceLevel === lvl;
            return (
              <div key={lvl} className="p-4 rounded-xl transition-all" style={{
                background:  active ? `${cfg.hex}10` : 'rgba(255,255,255,0.02)',
                border:      `1px solid ${active ? cfg.hex + '30' : 'rgba(255,255,255,0.05)'}`,
                boxShadow:   active ? `0 0 24px ${cfg.hex}12` : 'none',
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{
                    background: cfg.hex,
                    boxShadow: active ? `0 0 10px ${cfg.hex}` : 'none',
                    animation: active ? 'cm-breathe 2s ease-in-out infinite' : 'none',
                  }} />
                  <span className="font-mono text-[10px] font-black" style={{ color: cfg.hex }}>{cfg.label}</span>
                </div>
                <p className="text-[9px]" style={{ color: 'rgba(232,232,255,0.38)' }}>{cfg.sublabel}</p>
                {active && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full" style={{
                      background: cfg.hex, animation: 'cm-heartbeat 1.5s ease-in-out infinite',
                    }} />
                    <span className="text-[8px] font-mono" style={{ color: cfg.hex }}>ACTIVE NOW</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
