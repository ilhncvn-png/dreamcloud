import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useRef } from 'react';
import Header from '../components/Header';
import { fetchDreamGenome } from '../api/admin.api';
import type { DreamGenomeData } from '../types/admin.types';

type GenomeTrait = DreamGenomeData['dominantTraits'][number];

/* ── Color palette ───────────────────────────────────────────────────── */

const CAT_HEX: Record<string, string> = {
  lucid:      '#CC80FF',
  emotional:  '#38D68A',
  symbol:     '#FFB800',
  narrative:  '#00CFFF',
  archetype:  '#FF8CF7',
  frequency:  '#FF5C5C',
  theme:      '#7B6FFF',
  clarity:    '#80E8FF',
  default:    '#CC80FF',
};
function catHex(cat: string) {
  const k = cat.toLowerCase();
  for (const [key, hex] of Object.entries(CAT_HEX)) if (k.includes(key)) return hex;
  return CAT_HEX.default;
}

/* ── CountUp ─────────────────────────────────────────────────────────── */

function CountUp({ to, duration = 1100 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(to);
  const raf = useRef(0), t0 = useRef<number | null>(null);
  useEffect(() => {
    t0.current = null;
    const run = (ts: number) => {
      if (!t0.current) t0.current = ts;
      const p = Math.min((ts - t0.current) / duration, 1);
      const e = 1 - (1 - p) ** 3;
      setVal(Math.round(e * to));
      if (p < 1) raf.current = requestAnimationFrame(run);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);
  return <>{val}</>;
}

/* ── DNA Helix ───────────────────────────────────────────────────────── */

function DNAHelix({ traits, selectedTrait }: {
  traits: Array<{ trait: string; value: number; category: string }>;
  selectedTrait: string | null;
}) {
  const W = 280, H = 480;
  const cx = W / 2, steps = 90, turns = 5.5;
  const freq = (2 * Math.PI * turns) / steps;
  const amp = 82, yStep = (H - 60) / steps;

  const leftPts:  { x: number; y: number }[] = [];
  const rightPts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = i * freq;
    const y = 30 + i * yStep;
    leftPts.push({ x: cx + Math.sin(a) * amp, y });
    rightPts.push({ x: cx - Math.sin(a) * amp, y });
  }
  const leftLine  = leftPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const rightLine = rightPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const rungs: { x1: number; y: number; x2: number; hex: string; opacity: number; isSel: boolean }[] = [];
  for (let i = 2; i < steps; i += 4) {
    const a    = i * freq;
    const y    = 30 + i * yStep;
    const tIdx = Math.floor((i / steps) * traits.length) % Math.max(traits.length, 1);
    const tr   = traits[tIdx];
    const hex  = tr ? catHex(tr.category) : '#CC80FF';
    const op   = tr ? 0.22 + (tr.value / 100) * 0.72 : 0.4;
    const isSel = !!tr && tr.trait === selectedTrait;
    rungs.push({ x1: cx + Math.sin(a) * amp, y, x2: cx - Math.sin(a) * amp, hex, opacity: isSel ? 1 : op, isSel });
  }

  // Particles floating off the helix
  const particles = Array.from({ length: 14 }, (_, i) => {
    const rIdx = Math.floor((i / 14) * rungs.length);
    const r = rungs[rIdx] ?? rungs[0];
    if (!r) return null;
    const side = i % 2 === 0;
    return { x: side ? r.x1 : r.x2, y: r.y, hex: r.hex, dur: 5 + i * 0.45, off: i * 0.38 };
  }).filter(Boolean) as { x: number; y: number; hex: string; dur: number; off: number }[];

  // Sequence labels
  const seqLabels = [
    { y: 80,  label: 'SEQ-001' }, { y: 180, label: 'GEN-Ψ7' },
    { y: 280, label: 'SEQ-042' }, { y: 380, label: 'GEN-Δ3' },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: W, maxHeight: H }}>
      <defs>
        <linearGradient id="dnaAtmo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#CC80FF" stopOpacity="0.1" />
          <stop offset="50%"  stopColor="#7B6FFF" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#CC80FF" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="dnaL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#CC80FF" />
          <stop offset="50%"  stopColor="#7B6FFF" />
          <stop offset="100%" stopColor="#CC80FF" />
        </linearGradient>
        <linearGradient id="dnaR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#00CFFF" />
          <stop offset="50%"  stopColor="#38D68A" />
          <stop offset="100%" stopColor="#00CFFF" />
        </linearGradient>
        <linearGradient id="dnaScan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(123,111,255,0)" />
          <stop offset="50%"  stopColor="rgba(123,111,255,0.35)" />
          <stop offset="100%" stopColor="rgba(123,111,255,0)" />
        </linearGradient>
        <filter id="dnaGlw">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="dnaGlwBig">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <polyline id="dlp" points={leftLine} />
        <polyline id="drp" points={rightLine} />
      </defs>

      {/* Background atmosphere */}
      <rect x="0" y="0" width={W} height={H} fill="url(#dnaAtmo)" rx="12" />

      {/* Slow breathing glow at center */}
      <ellipse cx={cx} cy={H / 2} rx="60" ry={H * 0.45} fill="rgba(123,111,255,0.03)">
        <animate attributeName="rx" values="50;80;50" dur="8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;1;0.5" dur="8s" repeatCount="indefinite" />
      </ellipse>

      {/* Sequence labels (floating) */}
      {seqLabels.map((s, i) => (
        <text key={i} x="6" y={s.y} fill="rgba(123,111,255,0.3)" fontSize="7" fontFamily="monospace">
          <animate attributeName="opacity" values="0.15;0.45;0.15"
            dur={`${5 + i * 0.8}s`} begin={`${i * 0.6}s`} repeatCount="indefinite" />
          {s.label}
        </text>
      ))}

      {/* Horizontal scan lines */}
      {[0, 1].map(n => (
        <rect key={n} x="0" y="0" width={W} height="28" fill="url(#dnaScan)" opacity="0">
          <animate attributeName="y" values={`${-28};${H};${-28}`} dur={`${10 + n * 3}s`} begin={`${n * 5}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.05;0.95;1" dur={`${10 + n * 3}s`} begin={`${n * 5}s`} repeatCount="indefinite" />
        </rect>
      ))}

      {/* Vertical edge guide lines */}
      <line x1="8" y1="0" x2="8" y2={H} stroke="rgba(204,128,255,0.06)" strokeWidth="0.5" strokeDasharray="3 8">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="6s" repeatCount="indefinite" />
      </line>
      <line x1={W - 8} y1="0" x2={W - 8} y2={H} stroke="rgba(0,207,255,0.06)" strokeWidth="0.5" strokeDasharray="3 8">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="6s" begin="3s" repeatCount="indefinite" />
      </line>

      {/* Floating particles emitted from rungs */}
      {particles.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="1.4" fill={p.hex} opacity="0">
          <animate attributeName="opacity" values="0;0.6;0" dur={`${p.dur}s`} begin={`${p.off}s`} repeatCount="indefinite" />
          <animate attributeName="cx" values={`${p.x};${p.x + (i % 2 === 0 ? 18 : -18)};${p.x + (i % 2 === 0 ? 30 : -30)}`}
            dur={`${p.dur}s`} begin={`${p.off}s`} repeatCount="indefinite" />
          <animate attributeName="cy" values={`${p.y};${p.y - 12};${p.y - 24}`}
            dur={`${p.dur}s`} begin={`${p.off}s`} repeatCount="indefinite" />
          <animate attributeName="r" values="1.4;0.6;0" dur={`${p.dur}s`} begin={`${p.off}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Base pair rungs */}
      {rungs.map((r, i) => (
        <g key={i} filter={r.isSel ? 'url(#dnaGlwBig)' : undefined}>
          <line x1={r.x1} y1={r.y} x2={r.x2} y2={r.y}
            stroke={r.hex} strokeWidth={r.isSel ? 2.5 : 1.5} opacity={r.opacity}>
            {!r.isSel && (
              <animate attributeName="opacity" values={`${r.opacity};${Math.min(1, r.opacity + 0.25)};${r.opacity}`}
                dur={`${4 + i * 0.18}s`} repeatCount="indefinite" />
            )}
          </line>
          {/* Travelling light on rung */}
          <circle cy={r.y} r="1.8" fill={r.hex} opacity="0">
            <animate attributeName="cx" values={`${r.x1};${r.x2}`} dur={`${1.5 + (i % 4) * 0.3}s`}
              begin={`${i * 0.22}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.8;0" dur={`${1.5 + (i % 4) * 0.3}s`}
              begin={`${i * 0.22}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={r.x1} cy={r.y} r={r.isSel ? 4 : 2.5} fill={r.hex} opacity={r.opacity + 0.1} />
          <circle cx={r.x2} cy={r.y} r={r.isSel ? 4 : 2.5} fill={r.hex} opacity={r.opacity + 0.1} />
        </g>
      ))}

      {/* Strand lines */}
      <polyline points={leftLine}  fill="none" stroke="url(#dnaL)" strokeWidth="2.5"
        strokeLinejoin="round" filter="url(#dnaGlw)" opacity="0.9" />
      <polyline points={rightLine} fill="none" stroke="url(#dnaR)" strokeWidth="2.5"
        strokeLinejoin="round" filter="url(#dnaGlw)" opacity="0.9" />

      {/* Energy pulses — 4 total */}
      {[
        { path: '#dlp', color: '#CC80FF', dur: '4s',   begin: '0s' },
        { path: '#drp', color: '#00CFFF', dur: '4s',   begin: '2s' },
        { path: '#dlp', color: '#FF8CF7', dur: '5.5s', begin: '1.5s' },
        { path: '#drp', color: '#38D68A', dur: '5.5s', begin: '3.5s' },
      ].map((pulse, i) => (
        <circle key={i} r={i < 2 ? 5 : 3.5} fill={pulse.color} opacity="0" filter="url(#dnaGlw)">
          <animateMotion dur={pulse.dur} begin={pulse.begin} repeatCount="indefinite">
            <mpath href={pulse.path} />
          </animateMotion>
          <animate attributeName="opacity" values="0;0.95;0.95;0"
            keyTimes="0;0.08;0.92;1" dur={pulse.dur} begin={pulse.begin} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Corner scan brackets */}
      {[
        { x: 2,     y: 2,      d: 'M 2,14 L 2,2 L 14,2' },
        { x: W - 2, y: 2,      d: `M ${W - 14},2 L ${W - 2},2 L ${W - 2},14` },
        { x: 2,     y: H - 2,  d: `M 2,${H - 14} L 2,${H - 2} L 14,${H - 2}` },
        { x: W - 2, y: H - 2,  d: `M ${W - 14},${H - 2} L ${W - 2},${H - 2} L ${W - 2},${H - 14}` },
      ].map((b, i) => (
        <path key={i} d={b.d} fill="none" stroke="rgba(204,128,255,0.3)" strokeWidth="1">
          <animate attributeName="opacity" values="0.2;0.7;0.2" dur="4s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
        </path>
      ))}
    </svg>
  );
}

/* ── Gene Network SVG ────────────────────────────────────────────────── */

function GeneNetwork({
  traits,
  selectedTrait,
  onSelect,
}: {
  traits: Array<{ trait: string; value: number; category: string }>;
  selectedTrait: string | null;
  onSelect: (t: string) => void;
}) {
  const W = 460, H = 300, CX = W / 2, CY = H / 2, R = 105;
  const nodes = traits.slice(0, 9).map((t, i) => {
    const angle = (i / Math.min(traits.length, 9)) * 2 * Math.PI - Math.PI / 2;
    return { ...t, x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle), hex: catHex(t.category) };
  });
  const nodeMap: Record<string, typeof nodes[0]> = {};
  nodes.forEach(n => { nodeMap[n.trait] = n; });

  // Edges: same category connect
  const edges: Array<{ ax: number; ay: number; bx: number; by: number; hex: string; strength: number; isActive: boolean }> = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].category === nodes[j].category) {
        const isActive = !!selectedTrait && (nodes[i].trait === selectedTrait || nodes[j].trait === selectedTrait);
        edges.push({
          ax: nodes[i].x, ay: nodes[i].y,
          bx: nodes[j].x, by: nodes[j].y,
          hex: nodes[i].hex,
          strength: Math.round((nodes[i].value + nodes[j].value) / 2),
          isActive,
        });
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
      <defs>
        <radialGradient id="gnBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#CC80FF" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#7B6FFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={CX} cy={CY} rx="115" ry="80" fill="url(#gnBg)" />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(204,128,255,0.05)"
        strokeWidth="0.5" strokeDasharray="3 7">
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`} dur="90s" repeatCount="indefinite" />
      </circle>

      {/* Base edges */}
      {edges.map((e, i) => (
        <line key={`b${i}`} x1={e.ax} y1={e.ay} x2={e.bx} y2={e.by}
          stroke={e.hex} strokeWidth={e.isActive ? 1.5 : 0.6} opacity={e.isActive ? 0.6 : 0.15} />
      ))}

      {/* Flowing energy on active edges */}
      {edges.filter(e => e.isActive).map((e, i) => (
        <line key={`f${i}`} x1={e.ax} y1={e.ay} x2={e.bx} y2={e.by}
          stroke={e.hex} strokeWidth="3" opacity="0.7" strokeDasharray="6 20" strokeLinecap="round">
          <animate attributeName="strokeDashoffset" from="0" to="-26"
            dur={`${Math.max(0.5, (100 - e.strength) / 70)}s`} repeatCount="indefinite" />
        </line>
      ))}

      {/* Nodes */}
      {nodes.map((n, i) => {
        const isSel = n.trait === selectedTrait;
        const r = 8 + (n.value / 100) * 12;
        return (
          <g key={n.trait} style={{ cursor: 'pointer' }} onClick={() => onSelect(n.trait)}>
            <circle cx={n.x} cy={n.y} r={r + 10} fill={n.hex} opacity={isSel ? 0.2 : 0.06}>
              {isSel && (
                <animate attributeName="r" values={`${r + 8};${r + 18};${r + 8}`} dur="2.2s" repeatCount="indefinite" />
              )}
            </circle>
            <circle cx={n.x} cy={n.y} r={r} fill={n.hex} opacity={isSel ? 1 : 0.75} />
            {isSel && (
              <circle cx={n.x} cy={n.y} r={r + 5} fill="none" stroke={n.hex} strokeWidth="1.2" opacity="0.5">
                <animate attributeName="r" values={`${r + 4};${r + 14};${r + 4}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            {n.value >= 70 && !isSel && (
              <circle cx={n.x} cy={n.y} r={r + 3} fill="none" stroke={n.hex} strokeWidth="0.7" opacity="0">
                <animate attributeName="r" values={`${r + 2};${r + 10};${r + 2}`} dur={`${3.5 + i * 0.3}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur={`${3.5 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            )}
            <text x={n.x} y={n.y + r + 11} textAnchor="middle"
              fill={isSel ? n.hex : 'rgba(232,232,255,0.45)'}
              fontSize={isSel ? '7.5' : '6.5'} fontFamily="monospace" fontWeight={isSel ? 'bold' : 'normal'}>
              {n.trait.replace(/_/g, ' ').slice(0, 10)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────── */

export default function DreamGenome() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dream-genome'], queryFn: fetchDreamGenome, refetchInterval: 60_000,
  });

  // ── State ────────────────────────────────────────────────────────────────
  const [selectedTrait, setSelectedTrait] = useState<string | null>(null);
  const [liveEvents,    setLiveEvents]    = useState<string[]>([]);
  const [, setTick]                       = useState(0);
  const eventCursor = useRef(0);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 8_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!data?.dominantTraits?.length) return;
    const EVENTS = [
      'Lucid dreaming frequency elevated — genome shift detected',
      'Shadow archetype sequence mutation registered',
      'Emotional resonance spike in collective gene pool',
      'Narrative complexity index crossing threshold',
      'Symbol density increasing — gene expression amplifying',
      'Dormant frequency traits reactivating',
      'Clarity gene suppression detected in upper quartile',
      'New archetype pattern encoded — genome evolving',
    ];
    const id = setInterval(() => {
      const msg = EVENTS[eventCursor.current % EVENTS.length];
      eventCursor.current++;
      setLiveEvents(prev => [msg, ...prev].slice(0, 8));
    }, 4_500);
    return () => clearInterval(id);
  }, [data]);

  // ── Memos ────────────────────────────────────────────────────────────────
  const sortedTraits = useMemo((): GenomeTrait[] => {
    if (!data) return [];
    return [...data.dominantTraits].sort((a, b) => b.value - a.value);
  }, [data]);

  const dominantTrait  = useMemo(() => sortedTraits[0] ?? null, [sortedTraits]);
  const secondaryTrait = useMemo(() => sortedTraits[1] ?? null, [sortedTraits]);
  const domHex  = dominantTrait  ? catHex(dominantTrait.category)  : '#CC80FF';
  const sec2Hex = secondaryTrait ? catHex(secondaryTrait.category) : '#7B6FFF';

  const avgScore    = useMemo(() => sortedTraits.length ? Math.round(sortedTraits.reduce((s, t) => s + t.value, 0) / sortedTraits.length) : 0, [sortedTraits]);
  const activeCount = useMemo(() => sortedTraits.filter(t => t.value >= 60).length, [sortedTraits]);
  const dormCount   = useMemo(() => sortedTraits.filter(t => t.value < 40).length, [sortedTraits]);

  const selectedTraitData = useMemo(
    () => !selectedTrait ? null : sortedTraits.find(t => t.trait === selectedTrait) ?? null,
    [selectedTrait, sortedTraits],
  );

  const genomeSignatureData = useMemo(() => {
    if (!data) return null;
    const stability  = Math.min(99, Math.round(50 + data.diversityScore * 0.3 + data.complexityScore * 0.2));
    const confidence = Math.min(99, Math.round(55 + data.diversityScore * 0.25 + activeCount * 2));
    const density    = Math.min(99, Math.round(40 + sortedTraits.length * 2.8));
    const mutLevel   = Math.round((100 - stability) * 0.8);
    const evoStage   = mutLevel > 50 ? 'PEAK' : mutLevel > 30 ? 'MID' : mutLevel > 15 ? 'EARLY' : 'STABLE';
    const rank       = Math.round(100 - (data.diversityScore * 0.3 + data.complexityScore * 0.4 + avgScore * 0.3) / 3);
    return {
      primary:    dominantTrait?.trait.replace(/_/g,' ').toUpperCase() ?? '—',
      secondary:  secondaryTrait?.trait.replace(/_/g,' ').toUpperCase() ?? '—',
      mutLevel,
      evoStage,
      stability,
      confidence,
      density,
      rank: Math.max(1, rank),
    };
  }, [data, sortedTraits, dominantTrait, secondaryTrait, avgScore, activeCount]);

  const mutations = useMemo(() => {
    if (!data) return [] as { trait: string; category: string; hex: string; strength: number; speed: number; stability: number; confidence: number; prediction: string }[];
    return sortedTraits.slice(0, 6).map((t) => {
      const strength   = Math.min(99, t.value);
      const speed      = Math.round(30 + (t.value / 100) * 60);
      const stability  = Math.round(100 - strength * 0.6);
      const confidence = Math.round(55 + data.diversityScore * 0.25);
      const prediction = t.value > 75 ? 'DOMINANT' : t.value > 50 ? 'AMPLIFYING' : t.value > 30 ? 'LATENT' : 'RECESSIVE';
      return { trait: t.trait.replace(/_/g,' '), category: t.category, hex: catHex(t.category), strength, speed, stability, confidence, prediction };
    });
  }, [data, sortedTraits]);

  const evolutionTimeline = useMemo(() => {
    if (!data || !dominantTrait) return [] as { label: string; pct: number; confidence: number; vals: number[] }[];
    const base  = dominantTrait.value;
    const drift = (data.complexityScore - 50) * 0.1;
    return [
      { label: '24 SAAT', pct: Math.min(99, Math.round(base + drift * 0.3)),   confidence: 88, vals: [base, base + drift * 0.1, base + drift * 0.2, base + drift * 0.3] },
      { label: '7 GÜN',   pct: Math.min(99, Math.round(base + drift * 0.9)),   confidence: 76, vals: [base, base + drift * 0.3, base + drift * 0.6, base + drift * 0.9] },
      { label: '30 GÜN',  pct: Math.min(99, Math.round(base + drift * 2.5)),   confidence: 64, vals: [base, base + drift, base + drift * 1.8, base + drift * 2.5] },
      { label: '90 GÜN',  pct: Math.min(99, Math.round(base + drift * 6)),     confidence: 49, vals: [base, base + drift * 2, base + drift * 4, base + drift * 6] },
    ];
  }, [data, dominantTrait]);

  const aiPredictions = useMemo(() => {
    if (!data || !dominantTrait) return [] as { label: string; value: string; color: string; confidence: number; icon: string }[];
    const conf = Math.round(55 + data.diversityScore * 0.3);
    const evo  = Math.round(40 + data.complexityScore * 0.4);
    return [
      { label: 'NEXT DOMINANT',    value: secondaryTrait?.trait.replace(/_/g,' ') ?? dominantTrait.trait.replace(/_/g,' '), color: sec2Hex,   confidence: conf,     icon: '↑' },
      { label: 'EXPECTED MUTATION',value: data.complexityScore > 60 ? 'HIGH COMPLEXITY' : 'MODERATE SHIFT',                 color: '#FF8CF7',  confidence: conf - 8, icon: '⟳' },
      { label: 'GENOME BALANCE',   value: data.diversityScore >= 70 ? 'DIVERSE' : data.diversityScore >= 40 ? 'MODERATE' : 'CONVERGENT',      color: data.diversityScore >= 70 ? '#38D68A' : data.diversityScore >= 40 ? '#FFB800' : '#FF4A5E', confidence: conf + 5, icon: '◎' },
      { label: 'INSTABILITY RISK', value: (100 - (genomeSignatureData?.stability ?? 75)) > 35 ? 'ELEVATED' : 'LOW',        color: (100 - (genomeSignatureData?.stability ?? 75)) > 35 ? '#FF4A5E' : '#38D68A', confidence: conf - 4, icon: '⚠' },
      { label: 'EVOLUTION PROB.',  value: `${evo}%`,                                                                        color: '#CC80FF',  confidence: conf - 10, icon: '→' },
      { label: 'ANALYSIS CONF.',   value: `${conf}%`,                                                                       color: '#80E8FF',  confidence: conf,      icon: '◈' },
    ];
  }, [data, dominantTrait, secondaryTrait, sec2Hex, genomeSignatureData]);

  const aiReadingSections = useMemo(() => {
    if (!data || !dominantTrait) return [] as { label: string; body: string; icon: string }[];
    const dom      = dominantTrait.trait.replace(/_/g,' ');
    const conf     = Math.round(55 + data.diversityScore * 0.3);
    const emoPositive = data.emotionGenes.find(e => e.type === 'positive')?.pct ?? 0;
    const emoNeg  = data.emotionGenes.find(e => e.type === 'negative')?.pct ?? 0;
    const target   = selectedTraitData ?? dominantTrait;
    const tName    = target.trait.replace(/_/g,' ');
    const tHex     = catHex(target.category);
    void tHex;

    return [
      {
        label: 'CURRENT GENOME STATE',
        body: `${dom} ekspresyonu dominant konumda — aktivasyon skoru ${dominantTrait.value}/100. Alan ${data.diversityScore >= 70 ? 'yüksek çeşitlilik' : data.diversityScore >= 40 ? 'orta çeşitlilik' : 'baskın yakınsama'} gösteriyor. Diversity ${data.diversityScore}, Complexity ${data.complexityScore}.`,
        icon: '◈',
      },
      {
        label: 'DOMINANT MUTATION',
        body: selectedTraitData
          ? `${tName} mutasyonu aktif — strength ${target.value}/100, kategori ${target.category}. Bu traiti gözlemleyin.`
          : `${dom} ana mutasyon odağı; secondary olarak ${secondaryTrait?.trait.replace(/_/g,' ') ?? '—'} yükseliyor.`,
        icon: '⟳',
      },
      {
        label: 'COLLECTIVE BEHAVIOR',
        body: `Kolektif genom ${emoPositive}% pozitif, ${emoNeg}% negatif duygusal kodlama taşıyor. ${activeCount} trait aktif ekspresyon seviyesinde — kolektif bilinç ${activeCount > 5 ? 'yüksek' : 'orta'} yoğunlukta.`,
        icon: '◉',
      },
      {
        label: 'EMOTIONAL CODING',
        body: `Duygusal gen dağılımı ${emoPositive > emoNeg ? `pozitif ağırlıklı (%${emoPositive})` : `negatif baskılı (%${emoNeg})`}. ${dominantTrait.category === 'emotional' ? 'Duygusal arketip baskın — empati amplifikasyonu yüksek.' : 'Duygusal kodlama sekonder seviyede aktif.'}`,
        icon: '◆',
      },
      {
        label: 'DREAM EVOLUTION',
        body: `Rüya genomu ${data.complexityScore > 60 ? 'hızlı' : data.complexityScore > 40 ? 'orta' : 'yavaş'} evrim sürecinde. Complexity ${data.complexityScore} — ${sortedTraits.length} aktif trait kolektif rüya matrisini şekillendiriyor.`,
        icon: '→',
      },
      {
        label: 'FUTURE ADAPTATION',
        body: `${data.diversityScore >= 70 ? 'Yüksek çeşitlilik adaptasyon hızını artırıyor' : 'Düşük çeşitlilik baskın trail etrafında konsolidasyona işaret ediyor'}. Evrim olasılığı %${Math.round(40 + data.complexityScore * 0.4)} — sonraki 30 gün kritik pencere.`,
        icon: '◎',
      },
      {
        label: 'RECOMMENDED OBSERVATION',
        body: `${selectedTraitData ? `${tName} traitini yakından izleyin — kategori ${target.category}, değer ${target.value}/100.` : `${dom} ve ${secondaryTrait?.trait.replace(/_/g,' ') ?? '—'} arası etkileşimi gözlemleyin.`} Güven skoru: %${conf}.`,
        icon: '⬡',
      },
    ];
  }, [data, dominantTrait, secondaryTrait, sortedTraits, activeCount, selectedTraitData]);

  // ── Early returns ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="section-intelligence relative">
        <Header title="Dream Genome" subtitle="" section="intelligence" />
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-2 mx-auto mb-4 animate-spin"
              style={{ borderColor: 'rgba(204,128,255,0.15)', borderTopColor: '#CC80FF' }} />
            <p className="text-[10px] font-mono tracking-widest" style={{ color: '#CC80FF' }}>
              GENOME SEQUENCING…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="section-intelligence relative">
        <Header title="Dream Genome" subtitle="" section="intelligence" />
        <div className="rounded-xl p-8 text-center"
          style={{ background: 'rgba(204,128,255,0.04)', border: '1px solid rgba(204,128,255,0.15)' }}>
          <p className="text-dc-error text-sm">Genome veri akışı kesildi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-intelligence relative" style={{
      background: 'radial-gradient(ellipse at 35% 15%, rgba(20,8,40,0.9) 0%, rgba(6,6,20,0) 55%)',
    }}>
      <style>{`
        @keyframes dg-slide-in { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dg-fade-in  { from{opacity:0} to{opacity:1} }
        @keyframes dg-blink    { 0%,100%{opacity:1} 50%{opacity:0.18} }
        @keyframes dg-breathe  { 0%,100%{text-shadow:0 0 8px currentColor} 50%{text-shadow:0 0 22px currentColor,0 0 40px currentColor} }
        @keyframes dg-float    { 0%,100%{transform:translateY(0) perspective(600px) rotateY(0deg)} 25%{transform:translateY(-4px) perspective(600px) rotateY(3deg)} 75%{transform:translateY(2px) perspective(600px) rotateY(-3deg)} }
        @keyframes dg-bar-travel { from{left:-30%} to{left:120%} }
        @keyframes dg-scan-h   { 0%{transform:translateY(-100%)} 100%{transform:translateY(2000%)} }
        .dg-slide-in { animation: dg-slide-in 0.35s ease-out forwards; }
        .dg-fade-in  { animation: dg-fade-in 0.5s ease-out forwards; }
        .dg-blink    { animation: dg-blink 1.8s ease-in-out infinite; }
        .dg-breathe  { animation: dg-breathe 4s ease-in-out infinite; }
        .dg-dna-float { animation: dg-float 12s ease-in-out infinite; will-change: transform; }
        .dg-trait-row { cursor: pointer; transition: background 0.18s, box-shadow 0.18s; }
        .dg-trait-row:hover { background: rgba(204,128,255,0.07) !important; box-shadow: 0 0 0 1px rgba(204,128,255,0.2) !important; }
        .dg-trait-row:hover .dg-travel-light { animation: dg-bar-travel 1.8s ease-in-out infinite; }
        .dg-bar-wrap { position:relative; overflow:hidden; }
        .dg-travel-light {
          position: absolute; top: 0; height: 100%; width: 30%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          pointer-events: none; left: -30%;
        }
        .dg-intel-bar { transition: width 1.6s cubic-bezier(0.22,1,0.36,1); }
        .dg-label-glow { transition: text-shadow 0.3s; }
        .dg-label-glow:hover { text-shadow: 0 0 10px currentColor; }
      `}</style>

      <Header
        title="Dream Genome"
        subtitle="Kolektif rüya genomu analizi — bilinç imzası ve gen ekspresyonu"
        section="intelligence"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
            </div>
            <span className="font-mono text-[9px] font-bold tracking-widest dg-breathe" style={{ color: '#CC80FF' }}>
              GENOME ACTIVE · {sortedTraits.length} TRAITS
            </span>
            <span className="font-mono text-[9px] font-bold" style={{ color: 'rgba(232,232,255,0.22)' }}>
              {data.genomeSignature}
            </span>
          </div>
        }
      />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="os-card overflow-hidden mb-4" style={{
        background: 'linear-gradient(135deg, rgba(14,6,32,0.99) 0%, rgba(8,6,20,0.99) 100%)',
        border:     '1px solid rgba(204,128,255,0.12)',
        boxShadow:  '0 0 80px rgba(123,111,255,0.06), 0 8px 40px rgba(0,0,0,0.7)',
        minHeight:  480,
      }}>
        <div className="flex">
          {/* Living DNA + scan overlay */}
          <div className="relative p-8 flex items-center justify-center dg-dna-float" style={{ minWidth: 310 }}>
            {/* Lab scan effect overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-l-xl">
              {/* Horizontal scan line */}
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, rgba(204,128,255,0.4), transparent)',
                animation: 'dg-scan-h 10s linear infinite',
              }} />
              {/* Gene marker floating labels */}
              {['Ψ-LUCID', 'Δ-EMO', 'Σ-SYM', 'Λ-ARC'].map((label, i) => (
                <div key={label} style={{
                  position: 'absolute',
                  left: i % 2 === 0 ? 8 : undefined,
                  right: i % 2 === 1 ? 8 : undefined,
                  top: `${22 + i * 18}%`,
                  fontFamily: 'monospace',
                  fontSize: 8,
                  color: 'rgba(204,128,255,0.35)',
                  animation: `dg-blink ${3 + i * 0.7}s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                }}>
                  {label}
                </div>
              ))}
            </div>
            <DNAHelix traits={sortedTraits} selectedTrait={selectedTrait} />
          </div>

          {/* Genome state panel */}
          <div className="flex-1 p-8 flex flex-col justify-center gap-5"
            style={{ borderLeft: '1px solid rgba(204,128,255,0.08)' }}>

            <div>
              <p className="os-label mb-2">DOMINANT TRAIT</p>
              <p className="font-black capitalize leading-none mb-2 dg-breathe" style={{
                fontSize: 38, color: domHex, textShadow: `0 0 30px ${domHex}60`,
              }}>
                {dominantTrait?.trait.replace(/_/g,' ') ?? '—'}
              </p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-black" style={{ color: domHex }}>
                  <CountUp to={dominantTrait?.value ?? 0} />
                </span>
                <span className="text-[10px] font-mono text-dc-muted">/ 100 strength</span>
                <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold capitalize"
                  style={{ background: `${domHex}15`, border: `1px solid ${domHex}30`, color: domHex }}>
                  {dominantTrait?.category}
                </span>
              </div>
            </div>

            {/* Vitals */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'AVG SCORE',  val: avgScore,               color: '#CC80FF' },
                { label: 'ACTIVE',     val: activeCount,            color: '#38D68A' },
                { label: 'DORMANT',    val: dormCount,              color: '#5A5A84' },
                { label: 'COMPLEXITY', val: data.complexityScore,   color: '#FFB800' },
              ].map(({ label, val, color }) => (
                <div key={label} className="p-3 rounded-xl"
                  style={{ background: `${color}06`, border: `1px solid ${color}14` }}>
                  <p className="os-label mb-1">{label}</p>
                  <p className="font-mono font-black text-xl dg-breathe" style={{ color }}>
                    <CountUp to={val} />
                  </p>
                </div>
              ))}
            </div>

            {/* Genome Signature */}
            <div className="p-4 rounded-xl font-mono"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(204,128,255,0.12)' }}>
              <p className="os-label mb-2">GENOME SIGNATURE</p>
              <p className="text-lg font-black tracking-[0.25em] dg-breathe" style={{
                color: '#CC80FF', textShadow: '0 0 20px rgba(204,128,255,0.5)',
              }}>
                {data.genomeSignature}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full dg-blink" style={{ background: '#CC80FF' }} />
                  <span className="text-[9px] text-dc-muted">DIV · <CountUp to={data.diversityScore} /></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full dg-blink" style={{ background: '#FFB800', animationDelay: '0.5s' }} />
                  <span className="text-[9px] text-dc-muted">COMP · <CountUp to={data.complexityScore} /></span>
                </div>
              </div>
            </div>

            {/* Top traits chips */}
            <div>
              <p className="os-label mb-2">TOP ACTIVE TRAITS</p>
              <div className="flex flex-wrap gap-2">
                {sortedTraits.slice(0, 6).map(t => {
                  const hex   = catHex(t.category);
                  const isSel = selectedTrait === t.trait;
                  return (
                    <span key={t.trait}
                      className="px-3 py-1 rounded-full font-mono text-[9px] font-bold capitalize dg-label-glow"
                      onClick={() => setSelectedTrait(isSel ? null : t.trait)}
                      style={{
                        background: isSel ? `${hex}25` : `${hex}10`,
                        border:     `1px solid ${isSel ? hex + '55' : hex + '25'}`,
                        color:      hex, cursor: 'pointer',
                        boxShadow:  isSel ? `0 0 12px ${hex}30` : 'none',
                      }}>
                      {t.trait.replace(/_/g,' ')} · <CountUp to={t.value} />
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GENOME SIGNATURE STRIP ────────────────────────────────────────── */}
      {genomeSignatureData && (
        <div className="grid grid-cols-8 gap-3 mb-5">
          {[
            { label: 'PRIMARY GENOME',   val: genomeSignatureData.primary,    color: domHex,    display: 'text' },
            { label: 'SECONDARY GENOME', val: genomeSignatureData.secondary,  color: sec2Hex,   display: 'text' },
            { label: 'MUTATION LEVEL',   val: genomeSignatureData.mutLevel,   color: '#FF8CF7', display: 'num'  },
            { label: 'EVOLUTION STAGE',  val: genomeSignatureData.evoStage,   color: '#FFB800', display: 'text' },
            { label: 'GENOME STABILITY', val: genomeSignatureData.stability,  color: '#38D68A', display: 'num'  },
            { label: 'GENOME CONF.',     val: genomeSignatureData.confidence, color: '#00CFFF', display: 'num'  },
            { label: 'PATTERN DENSITY',  val: genomeSignatureData.density,    color: '#7B6FFF', display: 'num'  },
            { label: 'COLLECTIVE RANK',  val: `#${genomeSignatureData.rank}`, color: '#CC80FF', display: 'text' },
          ].map(({ label, val, color, display }) => (
            <div key={label} className="os-card p-3"
              style={{ background: 'rgba(10,6,24,0.97)', border: `1px solid ${color}18` }}>
              <p className="os-label mb-1.5" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</p>
              <p className="font-mono font-black text-sm truncate dg-breathe" style={{ color }}>
                {display === 'num' ? <CountUp to={val as number} /> : val}
                {display === 'num' && (label.includes('LEVEL') || label.includes('STABILITY') || label.includes('CONF') || label.includes('DENSITY')) ? '%' : ''}
              </p>
              {display === 'num' && (
                <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="h-full rounded-full dg-intel-bar"
                    style={{ width: `${val}%`, background: `linear-gradient(90deg, ${color}50, ${color})` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── AI GENOME READING + TRAIT EXPRESSION ─────────────────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-5">

        {/* AI Reading — 7 sections */}
        <div className="col-span-2 ai-reading-panel p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
            </div>
            <p className="os-title dg-breathe" style={{ color: '#CC80FF' }}>AI GENOME READING</p>
            {selectedTraitData && (
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded ml-auto dg-fade-in"
                style={{ background: `${catHex(selectedTraitData.category)}18`, color: catHex(selectedTraitData.category) }}>
                {selectedTraitData.trait.toUpperCase().replace(/_/g,' ')}
              </span>
            )}
          </div>

          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 420 }} key={selectedTrait ?? 'def'}>
            {aiReadingSections.map(({ label, body, icon }, i) => (
              <div key={label} className="dg-slide-in" style={{ animationDelay: `${i * 0.07}s`,
                ...(i > 0 ? { borderTop: '1px solid rgba(204,128,255,0.08)', paddingTop: 10 } : {}) }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px]" style={{ color: '#CC80FF' }}>{icon}</span>
                  <p className="os-label" style={{ color: 'rgba(204,128,255,0.5)' }}>{label}</p>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.72)' }}>{body}</p>
              </div>
            ))}
          </div>

          <p className="text-[9px] font-mono mt-auto" style={{ color: 'rgba(123,111,255,0.28)' }}>
            GENOME_SEQ v3.0 ▪ DREAMCLOUD OS ▪ {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Trait Expression bars */}
        <div className="col-span-3 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <p className="os-title">TRAİT EKSPRESYON HARİTASI</p>
            <span className="text-[9px] font-mono text-dc-muted">
              {selectedTrait ? `▶ ${selectedTrait.toUpperCase().replace(/_/g,' ')}` : 'TIK → ANALIZ'}
            </span>
          </div>
          {sortedTraits.map((t, i) => {
            const hex    = catHex(t.category);
            const tier   = t.value >= 80 ? 'DOMINANT' : t.value >= 60 ? 'ACTIVE' : t.value >= 40 ? 'LATENT' : 'RECESSIVE';
            const isSel  = selectedTrait === t.trait;
            const conf   = Math.round(55 + t.value * 0.35);
            const volat  = Math.round(20 + (100 - t.value) * 0.5);
            const pred   = t.value >= 70 ? '↑ GROWING' : t.value >= 40 ? '→ STABLE' : '↓ FADING';
            return (
              <div key={t.trait}
                className="dg-trait-row p-3.5 rounded-xl"
                onClick={() => setSelectedTrait(isSel ? null : t.trait)}
                style={{
                  background: isSel ? `${hex}12` : `${hex}05`,
                  border:     `1px solid ${isSel ? hex + '40' : t.value >= 65 ? hex + '20' : 'rgba(255,255,255,0.04)'}`,
                  boxShadow:  isSel ? `0 0 20px ${hex}15` : 'none',
                }}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold font-mono capitalize px-1.5 py-0.5 rounded"
                      style={{ background: `${hex}12`, color: hex }}>{t.category}</span>
                    <span className="text-[11px] font-bold font-mono capitalize dg-label-glow"
                      style={{ color: 'rgba(232,232,255,0.78)' }}>
                      {t.trait.replace(/_/g,' ')}
                    </span>
                    {isSel && (
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded dg-fade-in"
                        style={{ background: `${hex}20`, color: hex }}>▶ ACTIVE</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                      style={{ background: `${hex}10`, border: `1px solid ${hex}25`, color: hex }}>{tier}</span>
                    <span className="font-mono font-black text-sm" style={{ color: hex }}>
                      <CountUp to={t.value} />
                    </span>
                  </div>
                </div>
                {/* Bar with travelling light */}
                <div className="signal-bar dg-bar-wrap">
                  <div className="signal-bar-fill dg-intel-bar" style={{
                    width: `${t.value}%`,
                    background: `linear-gradient(90deg, ${hex}40, ${hex})`,
                    boxShadow: `0 0 ${isSel ? 14 : 7}px ${hex}50`,
                    transition: `width 1.5s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s`,
                  }} />
                  <div className="dg-travel-light" />
                </div>
                {/* Expanded stats on selection */}
                {isSel && (
                  <div className="flex items-center gap-5 mt-2.5 dg-fade-in">
                    {[
                      { label: 'CONF', val: `${conf}%`, color: '#38D68A' },
                      { label: 'VOL',  val: `${volat}%`, color: '#FFB800' },
                      { label: 'PRED', val: pred,        color: hex },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className="os-label">{label}</span>
                        <span className="font-mono text-[10px] font-bold" style={{ color }}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── GENE NETWORK + MUTATION DETECTOR ─────────────────────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-5">

        {/* Gene Network */}
        <div className="col-span-3 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">GEN AĞI</p>
            <span className="text-[9px] font-mono text-dc-muted">
              {selectedTrait ? `▶ ${selectedTrait.toUpperCase().replace(/_/g,' ')}` : 'TIK → PATHWAY'}
            </span>
          </div>
          <div className="p-5">
            <GeneNetwork traits={sortedTraits} selectedTrait={selectedTrait}
              onSelect={t => setSelectedTrait(prev => prev === t ? null : t)} />
            <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {Object.entries(CAT_HEX).filter(([k]) => k !== 'default').map(([cat, hex]) => {
                const has = sortedTraits.some(t => t.category === cat);
                if (!has) return null;
                return (
                  <div key={cat} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: hex }} />
                    <span className="text-[8px] font-mono capitalize" style={{ color: 'rgba(232,232,255,0.35)' }}>{cat}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mutation Detector */}
        <div className="col-span-2 os-card overflow-hidden">
          <div className="os-panel-header flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full dg-blink" style={{ background: '#FF8CF7', boxShadow: '0 0 6px #FF8CF7' }} />
            <p className="os-title">MUTASYON DEDEKTÖRÜ</p>
          </div>
          <div className="p-5 space-y-3">
            {mutations.map((m, i) => {
              const predColor = m.prediction === 'DOMINANT' ? '#FF8CF7' : m.prediction === 'AMPLIFYING' ? '#FFB800' : m.prediction === 'LATENT' ? '#5A5A84' : '#3E3E62';
              return (
                <div key={m.trait}
                  className="p-3 rounded-xl dg-slide-in"
                  style={{ animationDelay: `${i * 0.1}s`, background: `${m.hex}06`, border: `1px solid ${m.hex}18` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.hex }} />
                      <span className="font-mono text-[10px] capitalize font-bold" style={{ color: 'rgba(232,232,255,0.8)' }}>
                        {m.trait}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: `${predColor}18`, color: predColor, border: `1px solid ${predColor}30` }}>
                      {m.prediction}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'STR',  val: m.strength,   color: m.hex },
                      { label: 'SPD',  val: m.speed,      color: '#FFB800' },
                      { label: 'STAB', val: m.stability,  color: m.stability > 60 ? '#38D68A' : '#FF4A5E' },
                    ].map(({ label, val, color }) => (
                      <div key={label}>
                        <p className="os-label" style={{ fontSize: 8 }}>{label}</p>
                        <p className="font-mono font-bold text-xs" style={{ color }}>
                          <CountUp to={val} />%
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="h-full rounded-full dg-intel-bar"
                      style={{ width: `${m.strength}%`, background: `linear-gradient(90deg, ${m.hex}40, ${m.hex})` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── EVOLUTION TIMELINE + AI PREDICTIONS ──────────────────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-5">

        {/* Evolution Timeline */}
        <div className="col-span-3 os-card overflow-hidden">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">GENOMİK EVRİM ZAMANÇİZELGESİ</p>
            <span className="text-[9px] font-mono" style={{ color: '#CC80FF' }}>
              {dominantTrait?.trait.replace(/_/g,' ').toUpperCase() ?? '—'}
            </span>
          </div>
          <div className="p-5 space-y-4">
            {evolutionTimeline.map(({ label, pct, confidence, vals }, i) => {
              const safeVals = vals.map(v => Math.max(0, Math.min(100, v)));
              const max      = Math.max(...safeVals);
              const min      = Math.min(...safeVals);
              const range    = max - min || 1;
              const pts      = safeVals.map((v, vi) => {
                const x = (vi / (safeVals.length - 1)) * 200;
                const y = 20 - ((v - min) / range) * 18;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              });
              const last = pts[pts.length - 1].split(',');
              const dirColor = pct > (dominantTrait?.value ?? 50) ? '#38D68A' : pct < (dominantTrait?.value ?? 50) ? '#FF4A5E' : '#5A5A84';
              return (
                <div key={label} className="dg-slide-in" style={{ animationDelay: `${i * 0.12}s` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#CC80FF' }} />
                      <span className="os-label">{label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-mono font-bold" style={{ color: dirColor }}>
                        {pct > (dominantTrait?.value ?? 50) ? '↑' : '↓'} <CountUp to={pct} />%
                      </span>
                      <span className="text-[9px] font-mono text-dc-muted">conf {confidence}%</span>
                      <svg width="200" height="22" viewBox="0 0 200 22">
                        <polyline points={pts.join(' ')} fill="none" stroke={dirColor}
                          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                        <circle cx={last[0]} cy={last[1]} r="2.5" fill={dirColor} />
                      </svg>
                    </div>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="h-full rounded-full dg-intel-bar"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${dirColor}40, ${dirColor})` }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[8px] font-mono text-dc-muted">şu an: {dominantTrait?.value ?? 0}%</span>
                    <span className="text-[8px] font-mono text-dc-muted">tahmin: {pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Predictions */}
        <div className="col-span-2 os-card overflow-hidden">
          <div className="os-panel-header flex items-center gap-2">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
            </div>
            <p className="os-title">AI TAHMİN MOToru</p>
          </div>
          <div className="p-5 space-y-3">
            {aiPredictions.map(({ label, value, color, confidence, icon }, i) => (
              <div key={label}
                className="p-3 rounded-xl dg-slide-in"
                style={{ animationDelay: `${i * 0.1}s`, background: `${color}06`, border: `1px solid ${color}15` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]" style={{ color }}>{icon}</span>
                    <p className="os-label">{label}</p>
                  </div>
                  <span className="text-[9px] font-mono text-dc-muted">%{confidence}</span>
                </div>
                <p className="font-mono font-black text-sm capitalize dg-breathe" style={{ color }}>
                  {value}
                </p>
                <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="h-full rounded-full dg-intel-bar"
                    style={{ width: `${confidence}%`, background: `linear-gradient(90deg, ${color}40, ${color})` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── LIVE GENOME EVENTS ────────────────────────────────────────────── */}
      <div className="os-card mb-5 overflow-hidden">
        <div className="os-panel-header flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full dg-blink" style={{ background: '#CC80FF', boxShadow: '0 0 6px #CC80FF' }} />
          <p className="os-title">CANLI GENOM OLAYLARI</p>
        </div>
        <div className="p-5">
          {liveEvents.length === 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg animate-pulse"
                  style={{ background: 'rgba(204,128,255,0.04)' }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {liveEvents.map((ev, i) => (
                <div key={`${ev}-${i}`}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg dg-slide-in"
                  style={{ background: 'rgba(204,128,255,0.04)', border: '1px solid rgba(204,128,255,0.08)', opacity: 1 - i * 0.08 }}>
                  <span className="text-[9px] shrink-0 dg-blink" style={{ color: '#CC80FF', animationDelay: `${i * 0.3}s` }}>⬡</span>
                  <p className="text-[10px] leading-relaxed" style={{ color: `rgba(232,232,255,${0.75 - i * 0.06})` }}>{ev}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SYMBOL GENES + TOP COMBINATIONS ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">
        <div className="os-card overflow-hidden">
          <div className="os-panel-header flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FFB800', boxShadow: '0 0 4px #FFB800' }} />
            <p className="os-title">SEMBOL GEN DAĞILIMI</p>
          </div>
          <div className="p-5 space-y-3">
            {data.symbolGenes.slice(0, 6).map((sg, i) => (
              <div key={sg.category} className="dg-slide-in" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[9px] font-mono text-dc-muted capitalize w-20 shrink-0 dg-label-glow">{sg.category}</span>
                  <div className="flex-1 signal-bar dg-bar-wrap">
                    <div className="signal-bar-fill dg-intel-bar" style={{
                      width: `${Math.min(sg.frequency, 100)}%`,
                      background: 'linear-gradient(90deg, rgba(255,184,0,0.4), #FFB800)',
                      boxShadow:  '0 0 6px rgba(255,184,0,0.5)',
                    }} />
                    <div className="dg-travel-light" />
                  </div>
                  <span className="font-mono text-[10px] font-bold w-8 text-right" style={{ color: '#FFB800' }}>
                    <CountUp to={sg.frequency} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="os-card overflow-hidden">
          <div className="os-panel-header flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#7B6FFF', boxShadow: '0 0 4px #7B6FFF' }} />
            <p className="os-title">SEMBOL-DUYGU REZONANS</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {data.topCombinations.slice(0, 6).map((c, i) => {
              const eHex = c.emotion === 'positive' ? '#38D68A' : c.emotion === 'negative' ? '#FF4A5E' : '#5A5A84';
              return (
                <div key={i} className="flex items-center justify-between px-5 py-3 data-row dg-slide-in"
                  style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] capitalize dg-label-glow" style={{ color: '#FFB800' }}>{c.symbolCat}</span>
                    <span className="text-dc-muted text-[9px]">×</span>
                    <span className="font-mono text-[10px] capitalize" style={{ color: eHex }}>{c.emotion}</span>
                  </div>
                  <span className="font-mono font-bold text-xs" style={{ color: '#7B6FFF' }}>
                    <CountUp to={c.count} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
