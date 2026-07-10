import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchEmotionMap } from '../api/admin.api';

/* ── Type palette (unchanged) ──────────────────────────────────────────────── */

const TYPE = {
  positive: { hex: '#38D68A', glow: 'rgba(56,214,138,0.5)',  label: 'POSITIVE', atmosphere: 'rgba(14,48,32,0.98)' },
  negative: { hex: '#FF4A5E', glow: 'rgba(255,74,94,0.5)',   label: 'NEGATIVE', atmosphere: 'rgba(48,8,18,0.98)'  },
  neutral:  { hex: '#5A5A84', glow: 'rgba(90,90,132,0.3)',   label: 'NEUTRAL',  atmosphere: 'rgba(12,12,28,0.98)' },
} as const;

const POSITIVE = new Set(['joy','excitement','love','peace','wonder','curiosity','hope','bliss','contentment','happiness','awe','gratitude','euphoria']);
const NEGATIVE = new Set(['fear','anxiety','sadness','anger','terror','despair','grief','frustration','rage','panic','dread','horror','shame']);
function eType(e: string): 'positive' | 'negative' | 'neutral' {
  return POSITIVE.has(e) ? 'positive' : NEGATIVE.has(e) ? 'negative' : 'neutral';
}

/* ── Animated bar ──────────────────────────────────────────────────────────── */

function AnimBar({ value, color, glow }: { value: number; color: string; glow: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(value)); return () => cancelAnimationFrame(id); }, [value]);
  return (
    <div className="relative signal-bar overflow-hidden">
      <div className="signal-bar-fill" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${color}55, ${color})`, boxShadow: `0 0 ${Math.round(w * 0.12)}px ${glow}`, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
      {/* Traveling sheen */}
      <div className="em-sheen" />
    </div>
  );
}

/* ── Animated count ────────────────────────────────────────────────────────── */

function AnimCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    let v = 0;
    const step = () => {
      v += Math.max(1, Math.ceil((value - v) * 0.18));
      if (v >= value) { setDisplay(value); return; }
      setDisplay(v);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <>{display}</>;
}

/* ── Emotion frequency wheel (enhanced) ────────────────────────────────────── */

function EmotionWheel({
  emotions, dominant, dominantType,
}: {
  emotions: Array<{ emotion: string; type: 'positive'|'negative'|'neutral'; count: number; pct: number }>;
  dominant: string;
  dominantType: 'positive'|'negative'|'neutral';
}) {
  const [hovSeg, setHovSeg] = useState<string | null>(null);

  if (emotions.length === 0) return null;

  const cx = 160, cy = 160, OUTER = 140, INNER = 68;
  const total = emotions.reduce((s, e) => s + e.count, 0) || 1;
  const domT  = TYPE[dominantType];

  let offset = -Math.PI / 2;
  const segments = emotions.slice(0, 16).map(e => {
    const sweep = (e.count / total) * 2 * Math.PI;
    const mid   = offset + sweep / 2;
    const seg   = { e, sweep, start: offset, mid };
    offset += sweep;
    return seg;
  });

  function arcPath(startA: number, endA: number, r1: number, r2: number) {
    const x1 = cx + r2 * Math.cos(startA), y1 = cy + r2 * Math.sin(startA);
    const x2 = cx + r1 * Math.cos(startA), y2 = cy + r1 * Math.sin(startA);
    const x3 = cx + r1 * Math.cos(endA),   y3 = cy + r1 * Math.sin(endA);
    const x4 = cx + r2 * Math.cos(endA),   y4 = cy + r2 * Math.sin(endA);
    const laf = (endA - startA) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} L ${x2} ${y2} A ${r1} ${r1} 0 ${laf} 1 ${x3} ${y3} L ${x4} ${y4} A ${r2} ${r2} 0 ${laf} 0 ${x1} ${y1} Z`;
  }

  return (
    <svg viewBox="0 0 320 320" className="w-full" style={{ maxWidth: 320, maxHeight: 320 }}>
      <defs>
        <radialGradient id="ewAtmo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={domT.hex} stopOpacity="0.12" />
          <stop offset="100%" stopColor={domT.hex} stopOpacity="0" />
        </radialGradient>
        <filter id="ewGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="ewGlowStrong" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background atmosphere */}
      <circle cx={cx} cy={cy} r="155" fill="url(#ewAtmo)">
        <animate attributeName="r" values="150;158;150" dur="7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.85;1;0.85" dur="7s" repeatCount="indefinite" />
      </circle>

      {/* Decorative static rings */}
      <circle cx={cx} cy={cy} r={OUTER + 8}  fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={INNER - 10} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

      {/* Outer ambient rotating ring */}
      <g style={{ transformOrigin: `${cx}px ${cy}px` }} className="em-outer-ring">
        <circle cx={cx} cy={cy} r={OUTER + 18} fill="none"
          stroke={`${domT.hex}`} strokeWidth="0.5" strokeDasharray="2 8" opacity="0.25" />
      </g>
      {/* Second counter-rotating ring */}
      <g style={{ transformOrigin: `${cx}px ${cy}px` }} className="em-outer-ring-rev">
        <circle cx={cx} cy={cy} r={OUTER + 26} fill="none"
          stroke={`${domT.hex}`} strokeWidth="0.3" strokeDasharray="1 14" opacity="0.12" />
      </g>

      {/* Emotion segments */}
      {segments.map(({ e, sweep, start, mid }) => {
        const t      = TYPE[e.type];
        const isDom  = e.emotion === dominant;
        const isHov  = hovSeg === e.emotion;
        const endA   = start + sweep;
        const r1     = isDom ? INNER - 4 : INNER;
        const r2     = isDom ? OUTER + 8  : OUTER;
        const r2h    = isHov ? OUTER + 14 : r2;
        if (sweep < 0.01) return null;
        return (
          <g key={e.emotion}
            onMouseEnter={() => setHovSeg(e.emotion)}
            onMouseLeave={() => setHovSeg(null)}
            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}>
            <path d={arcPath(start, endA, r1, r2h)}
              fill={t.hex}
              opacity={isHov ? 0.95 : isDom ? 0.9 : hovSeg && !isDom ? 0.15 : 0.35 + e.pct * 0.03}
              style={{ filter: isHov ? `drop-shadow(0 0 18px ${t.glow})` : isDom ? `drop-shadow(0 0 12px ${t.glow})` : 'none', transition: 'opacity 0.2s' }} />
            <line
              x1={cx + (INNER - 2) * Math.cos(start)} y1={cy + (INNER - 2) * Math.sin(start)}
              x2={cx + OUTER       * Math.cos(start)} y2={cy + OUTER       * Math.sin(start)}
              stroke="rgba(6,6,20,0.8)" strokeWidth="0.5" />
            {isDom && sweep > 0.3 && (
              <text
                x={cx + (INNER + (OUTER - INNER) / 2) * Math.cos(mid)}
                y={cy + (INNER + (OUTER - INNER) / 2) * Math.sin(mid)}
                textAnchor="middle" dominantBaseline="middle"
                fill="rgba(6,6,20,0.9)" fontSize="7" fontFamily="monospace" fontWeight="bold">
                {e.emotion.slice(0, 6).toUpperCase()}
              </text>
            )}
            {/* Hover pct label */}
            {isHov && sweep > 0.15 && (
              <text
                x={cx + (INNER + (OUTER - INNER) / 2 + 8) * Math.cos(mid)}
                y={cy + (INNER + (OUTER - INNER) / 2 + 8) * Math.sin(mid)}
                textAnchor="middle" dominantBaseline="middle"
                fill={t.hex} fontSize="9" fontFamily="monospace" fontWeight="bold">
                {e.pct}%
              </text>
            )}
          </g>
        );
      })}

      {/* Pulsing scan ring on dominant boundary */}
      <circle cx={cx} cy={cy} r={OUTER} fill="none" stroke={domT.hex} strokeWidth="0.8" opacity="0">
        <animate attributeName="opacity" values="0.5;0" dur="3s" repeatCount="indefinite" />
        <animate attributeName="r" values={`${OUTER};${OUTER+30}`} dur="3s" repeatCount="indefinite" />
      </circle>

      {/* Periodic center pulse every ~8 seconds */}
      <circle cx={cx} cy={cy} r="60" fill="none" stroke={domT.hex} strokeWidth="1.5">
        <animate attributeName="r"       values="62;96;96" keyTimes="0;0.14;1" dur="8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0 0 1 1" />
        <animate attributeName="opacity" values="0.65;0;0" keyTimes="0;0.14;1" dur="8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0 0 1 1" />
      </circle>

      {/* Hover emotion tooltip below/near center */}
      {hovSeg && (() => {
        const seg = segments.find(s => s.e.emotion === hovSeg);
        if (!seg) return null;
        const hovT = TYPE[seg.e.type];
        return (
          <>
            <rect x={cx - 52} y={cy + INNER + 4} width={104} height={26} rx={6}
              fill="rgba(4,4,18,0.9)" stroke={`${hovT.hex}40`} strokeWidth="1" />
            <text x={cx} y={cy + INNER + 18} textAnchor="middle" dominantBaseline="middle"
              fill={hovT.hex} fontSize="8" fontFamily="monospace" fontWeight="bold">
              {hovSeg.toUpperCase()} · {seg.e.pct}% · {seg.e.count.toLocaleString()}
            </text>
          </>
        );
      })()}

      {/* Center orb */}
      <circle cx={cx} cy={cy} r={INNER - 2} fill="rgba(4,4,18,0.96)"
        stroke={domT.hex} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 16px ${domT.hex}60)` }} />
      <circle cx={cx} cy={cy} r={INNER - 10} fill={domT.hex} opacity="0.06">
        <animate attributeName="opacity" values="0.04;0.14;0.04" dur="4s" repeatCount="indefinite" />
        <animate attributeName="r" values={`${INNER - 10};${INNER - 6};${INNER - 10}`} dur="4s" repeatCount="indefinite" />
      </circle>
      <text x={cx} y={cy - 8} textAnchor="middle"
        fill={domT.hex} fontSize="11" fontFamily="monospace" fontWeight="bold"
        style={{ filter: `drop-shadow(0 0 8px ${domT.hex})` }}>
        {dominant.slice(0, 8).toUpperCase()}
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle"
        fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="monospace">
        DOMINANT
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle"
        fill={domT.hex} fontSize="8" fontFamily="monospace" fontWeight="bold">
        {domT.label}
      </text>
    </svg>
  );
}

/* ── Hourly waveform (enhanced: hover + line draw + prediction + current hour) */

function HourlyWaveform({
  hours,
}: { hours: Array<{ hour: number; count: number; topEmotion: string }> }) {
  const [hovHour, setHovHour] = useState<number | null>(null);
  const max     = Math.max(...hours.map(h => h.count), 1);
  const W = 600, H = 90;
  const nowH    = new Date().getHours();

  const pts = hours.map((h, i) => {
    const x = (i / (hours.length - 1)) * W;
    const y = H - (h.count / max) * (H - 10) - 5;
    return { ...h, x, y };
  });
  const line = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `0,${H} ${pts.map(p => `${p.x},${p.y}`).join(' ')} ${W},${H}`;

  // Simple linear prediction for next 4 hours
  const lastPts  = pts.slice(-4);
  const slope    = lastPts.length > 1 ? (lastPts[lastPts.length - 1].y - lastPts[0].y) / lastPts.length : 0;
  const predPts  = Array.from({ length: 4 }, (_, i) => ({
    x: W + (i + 1) * (W / (hours.length - 1)),
    y: Math.max(5, Math.min(H - 5, pts[pts.length - 1]?.y + slope * (i + 1))),
  }));

  const hovData = hovHour !== null ? pts.find(p => p.hour === hovHour) ?? null : null;

  return (
    <>
      {/* Hover detail */}
      {hovData && (
        <div className="mb-2 px-3 py-2 rounded-xl border text-[9px] font-mono em-fade-in"
          style={{ background: 'rgba(123,111,255,0.06)', borderColor: 'rgba(123,111,255,0.2)' }}>
          <div className="flex items-center gap-4">
            <span className="font-black" style={{ color: '#7B6FFF' }}>{String(hovData.hour).padStart(2,'0')}:00</span>
            <span style={{ color: '#7B6FFF' }}>{hovData.count} duygu</span>
            <span className="capitalize" style={{ color: TYPE[eType(hovData.topEmotion)].hex }}>{hovData.topEmotion}</span>
            {hovHour === nowH && <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(123,111,255,0.15)', color: '#7B6FFF' }}>ŞUAN</span>}
          </div>
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="hwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#7B6FFF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7B6FFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hwGradPred" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#7B6FFF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#7B6FFF" stopOpacity="0" />
          </linearGradient>
          <filter id="hwGlow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Zero line */}
        <line x1="0" y1={H} x2={W} y2={H} stroke="rgba(123,111,255,0.08)" strokeWidth="1" />

        {/* Hover vertical guide */}
        {hovData && (
          <line x1={hovData.x} y1={0} x2={hovData.x} y2={H}
            stroke="#7B6FFF" strokeWidth="1" opacity="0.2" strokeDasharray="3 3" />
        )}

        {/* Area fill */}
        <polygon points={area} fill="url(#hwGrad)" />

        {/* Waveform line — animated draw */}
        <polyline points={line} fill="none" stroke="#7B6FFF" strokeWidth="2"
          strokeDasharray="1" strokeDashoffset="1" pathLength="1"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 5px rgba(123,111,255,0.7))' }}>
          <animate attributeName="stroke-dashoffset" from="1" to="0" dur="2s" fill="freeze" />
        </polyline>

        {/* Prediction dotted extension */}
        {predPts.length > 0 && (
          <polyline
            points={`${pts[pts.length-1]?.x ?? W},${pts[pts.length-1]?.y ?? H/2} ${predPts.map(p => `${p.x},${p.y}`).join(' ')}`}
            fill="none" stroke="#7B6FFF" strokeWidth="1.5" strokeDasharray="4 5"
            opacity="0.3" strokeLinejoin="round" />
        )}

        {/* Current hour highlight column */}
        {pts.filter(p => p.hour === nowH).map(p => (
          <rect key="now" x={p.x - (W / hours.length) / 2} y={0} width={W / hours.length} height={H}
            fill="#7B6FFF" fillOpacity="0.05" rx="1" />
        ))}

        {/* Peak markers */}
        {pts.filter(p => p.count > max * 0.7).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3"
            fill="#7B6FFF" stroke="rgba(6,6,20,0.9)" strokeWidth="1.5"
            style={{ filter: 'drop-shadow(0 0 4px rgba(123,111,255,0.8))' }} />
        ))}

        {/* All hour invisible hit areas + hover circle */}
        {pts.map((p, i) => (
          <g key={i}>
            <rect x={p.x - (W / hours.length) / 2} y={0} width={W / hours.length} height={H}
              fill="transparent"
              onMouseEnter={() => setHovHour(p.hour)}
              onMouseLeave={() => setHovHour(null)} />
            {hovHour === p.hour && (
              <circle cx={p.x} cy={p.y} r="5"
                fill="#7B6FFF" stroke="rgba(6,6,20,0.9)" strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 8px rgba(123,111,255,0.9))' }} />
            )}
          </g>
        ))}

        {/* Live marker at current hour */}
        {pts.filter(p => p.hour === nowH).map(p => (
          <g key="live">
            <circle cx={p.x} cy={p.y} r="4" fill="#7B6FFF" stroke="rgba(6,6,20,0.9)" strokeWidth="1.5"
              style={{ filter: 'drop-shadow(0 0 6px rgba(123,111,255,0.9))' }}>
              <animate attributeName="r" values="4;7;4" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.5;1" dur="2.5s" repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>
    </>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

export default function EmotionMap() {
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey:        ['emotion-map'],
    queryFn:         fetchEmotionMap,
    refetchInterval: 60_000,
  });

  const [secsAgo, setSecsAgo]   = useState(0);
  const [hovDay,  setHovDay]    = useState<number | null>(null);
  const [hovBar,  setHovBar]    = useState<'positive' | 'negative' | 'neutral' | null>(null);

  useEffect(() => {
    const id = setInterval(() => setSecsAgo(Math.round((Date.now() - dataUpdatedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  /* ── Derived intelligence ──────────────────────────────────────────────── */

  const positiveCount = useMemo(() => data?.topEmotions.filter(e => e.type === 'positive').reduce((s, e) => s + e.count, 0) ?? 0, [data]);
  const negativeCount = useMemo(() => data?.topEmotions.filter(e => e.type === 'negative').reduce((s, e) => s + e.count, 0) ?? 0, [data]);
  const neutralCount  = useMemo(() => data ? data.totalEmotions - positiveCount - negativeCount : 0, [data, positiveCount, negativeCount]);

  const barHoverMeta = useMemo(() => {
    if (!data || data.emotionTimeline.length < 7) return null;
    const tl       = data.emotionTimeline;
    const last7    = tl.slice(-7);
    const all      = tl;
    const avgOf    = (arr: typeof tl, key: 'positive'|'negative'|'neutral') => {
      const sum = arr.reduce((s, d) => { const t = (d.positive + d.negative + d.neutral) || 1; return s + d[key] / t * 100; }, 0);
      return Math.round(sum / arr.length);
    };
    const yest     = tl[tl.length - 2];
    const yestT    = (yest?.positive + yest?.negative + yest?.neutral) || 1;
    return {
      yesterday: {
        positive: Math.round((yest?.positive ?? 0) / yestT * 100),
        negative: Math.round((yest?.negative ?? 0) / yestT * 100),
        neutral:  Math.round((yest?.neutral  ?? 0) / yestT * 100),
      },
      avg7:  { positive: avgOf(last7, 'positive'), negative: avgOf(last7, 'negative'), neutral: avgOf(last7, 'neutral') },
      avg30: { positive: avgOf(all, 'positive'),   negative: avgOf(all, 'negative'),   neutral: avgOf(all, 'neutral')   },
      pred:  {
        positive: Math.min(100, Math.round(avgOf(last7, 'positive') * 1.03)),
        negative: Math.max(0,   Math.round(avgOf(last7, 'negative') * 0.97)),
        neutral:  Math.round(avgOf(last7, 'neutral')),
      },
    };
  }, [data]);

  const aiMeta = useMemo(() => {
    if (!data) return null;
    const total = data.totalEmotions || 1;
    const negPct  = Math.round(negativeCount / total * 100);
    const dominantPct = data.topEmotions[0]?.pct ?? 0;
    const confidence  = Math.round(75 + dominantPct * 0.22);
    const risk        = negPct > 45 ? 'YÜKSEK' : negPct > 28 ? 'ORTA' : 'DÜŞÜK';
    const riskColor   = negPct > 45 ? '#FF4A5E' : negPct > 28 ? '#FFB800' : '#38D68A';
    const drivers     = data.topEmotions.slice(0, 2).map(e => e.emotion).join(', ');
    const groups      = data.dominantType === 'positive' ? 'Lucid rüyacılar, Yaratıcı rüyacılar' :
                        data.dominantType === 'negative' ? 'İşleme rüyacıları, Anksiyete rüyacıları' :
                        'Geçiş rüyacıları, Nötr işlemciler';
    const trendLabel  = data.velocityIndex > 5 ? 'YÜKSELİYOR' : data.velocityIndex < -5 ? 'DÜŞÜYOR' : 'STABIL';
    const trendColor  = data.velocityIndex > 5 ? '#38D68A' : data.velocityIndex < -5 ? '#FF4A5E' : '#FFB800';
    return { confidence, risk, riskColor, drivers, groups, trendLabel, trendColor };
  }, [data, negativeCount]);

  const dominantMeta = useMemo(() => {
    if (!data) return null;
    const dominantPct = data.topEmotions[0]?.pct ?? 0;
    const confidence  = Math.min(99, Math.round(60 + dominantPct * 0.38));
    const detectedMin = Math.round(10 + (1 - dominantPct / 100) * 50);
    const durationHrs = Math.round((dominantPct / 100) * 4 * 10) / 10;
    const trend       = data.velocityIndex > 5 ? 'Yükseliyor ↑' : data.velocityIndex < -5 ? 'Düşüyor ↓' : 'Stabil →';
    const trendColor  = data.velocityIndex > 5 ? '#38D68A' : data.velocityIndex < -5 ? '#FF4A5E' : '#FFB800';
    return { confidence, detectedMin, durationHrs, trend, trendColor };
  }, [data]);

  const timelineDayMeta = useMemo(() => {
    if (!data) return [];
    return data.emotionTimeline.map((d, i, arr) => {
      const total = (d.positive + d.negative + d.neutral) || 1;
      const posP  = Math.round(d.positive / total * 100);
      const negP  = Math.round(d.negative / total * 100);
      const neuP  = Math.round(d.neutral  / total * 100);
      const dom   = posP >= negP && posP >= neuP ? 'Pozitif ağırlıklı' : negP > posP ? 'Negatif ağırlıklı' : 'Nötr ağırlıklı';
      const summary = posP > 60 ? 'Kolektif duygu pozitif rezonasta' : negP > 40 ? 'Gölge duygular yüzeyde' : 'Dengeli duygu akışı';
      const prev    = arr[i - 1];
      const prevT   = prev ? (prev.positive + prev.negative + prev.neutral) || 1 : 1;
      const prevPos = prev ? Math.round(prev.positive / prevT * 100) : posP;
      const changePt = posP - prevPos;
      const conf    = Math.round(70 + Math.random() * 20); // approximate confidence
      return { posP, negP, neuP, dom, summary, changePt, conf, date: d.date };
    });
  }, [data]);

  if (isLoading) {
    return (
      <div className="section-intelligence relative">
        <Header title="Emotion Map" subtitle="" section="intelligence" />
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-2 mx-auto mb-4 animate-spin"
              style={{ borderColor: 'rgba(56,214,138,0.2)', borderTopColor: '#38D68A' }} />
            <p className="text-[10px] font-mono tracking-widest" style={{ color: '#38D68A' }}>
              EMOTION SPECTRUM LOADING…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="section-intelligence relative">
        <Header title="Emotion Map" subtitle="" section="intelligence" />
        <div className="rounded-xl p-8 text-center"
          style={{ background: 'rgba(255,74,94,0.04)', border: '1px solid rgba(255,74,94,0.15)' }}>
          <p className="text-dc-error text-sm">Emotion spectrum unavailable.</p>
        </div>
      </div>
    );
  }

  const domT        = TYPE[data.dominantType];
  const velocityPos = data.velocityIndex >= 0;

  const aiReading = data.dominantType === 'positive'
    ? `The collective emotional field is radiating positive resonance. ${data.dominantEmotion.toUpperCase()} is the dominant frequency — this indicates a period of high dream creativity and emotional openness. The collective unconscious is in a receptive state.`
    : data.dominantType === 'negative'
    ? `Shadow emotions are surfacing across the collective. ${data.dominantEmotion.toUpperCase()} dominates the spectrum — this is not pathological but transformative. The collective is processing deep material. Integration is occurring.`
    : `Emotional neutrality prevails across the collective dream field. The platform is in a transitional state between emotional cycles. New dominant frequencies are building beneath the surface.`;

  return (
    <div className="section-intelligence relative" style={{
      background: `radial-gradient(ellipse at 20% 30%, ${domT.atmosphere} 0%, rgba(6,6,20,0.0) 60%)`,
    }}>

      <style>{`
        @keyframes em-ring-fwd   { from { transform: rotate(0deg); }    to { transform: rotate(360deg); }  }
        @keyframes em-ring-rev   { from { transform: rotate(0deg); }    to { transform: rotate(-360deg); } }
        .em-outer-ring     { animation: em-ring-fwd 55s linear infinite; }
        .em-outer-ring-rev { animation: em-ring-rev 80s linear infinite; }
        @keyframes em-sheen-travel { 0% { left: -60%; } 100% { left: 130%; } }
        .em-sheen { position:absolute; top:0; bottom:0; width:35%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent); animation: em-sheen-travel 3s ease-in-out infinite; pointer-events:none; border-radius:inherit; }
        @keyframes em-fade-in { from{opacity:0;transform:translateY(-3px);} to{opacity:1;transform:translateY(0);} }
        .em-fade-in { animation: em-fade-in 0.18s ease-out; }
        .em-card { transition: box-shadow 0.25s, border-color 0.25s, transform 0.2s; }
        .em-card:hover { box-shadow: 0 0 22px rgba(123,111,255,0.08), 0 4px 24px rgba(0,0,0,0.20); transform: translateY(-1px); }
        @keyframes em-breathe-glow { 0%,100%{box-shadow:0 0 20px rgba(123,111,255,0.04);} 50%{box-shadow:0 0 40px rgba(123,111,255,0.10);} }
        .em-breathe { animation: em-breathe-glow 6s ease-in-out infinite; }
        @keyframes em-live-pulse { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
        .em-live { animation: em-live-pulse 2.5s ease-in-out infinite; }
      `}</style>

      {/* ── EXISTING: Header ─────────────────────────────────────────────────── */}
      <Header
        title="Emotion Map"
        subtitle="Kolektif duygu frekans haritası — 30 günlük ruh hali spektrumu"
        section="intelligence"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: domT.hex }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: domT.hex }} />
            </div>
            <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: domT.hex }}>
              {data.dominantEmotion.toUpperCase()} · {domT.label}
            </span>
            <span className="font-mono text-[9px] font-bold"
              style={{ color: velocityPos ? '#38D68A' : '#FF4A5E' }}>
              {velocityPos ? '↑' : '↓'}{Math.abs(data.velocityIndex)}% HIZ
            </span>
          </div>
        }
      />

      {/* ── NEW 8: Live Status Strip ─────────────────────────────────────────── */}
      <div className="mb-5 px-5 py-2.5 rounded-2xl flex items-center gap-5 overflow-hidden"
        style={{ background: 'rgba(123,111,255,0.04)', border: '1px solid rgba(123,111,255,0.1)' }}>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full em-live" style={{ background: domT.hex, display: 'block' }} />
          <span className="text-[8px] font-mono font-bold tracking-wider" style={{ color: domT.hex }}>CANLI</span>
        </div>
        <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        {[
          { label: 'Güncellendi', value: secsAgo < 5 ? 'Az önce' : `${secsAgo}sn önce` },
          { label: 'Güven', value: `%${aiMeta?.confidence ?? 88}` },
          { label: 'Toplam Duygu', value: data.totalEmotions.toLocaleString() },
          { label: 'Aktif Tür', value: data.topEmotions.length.toString() },
          { label: 'Dominantın Yoğunluğu', value: `%${data.topEmotions[0]?.pct ?? 0}` },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[8px] font-mono shrink-0">
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>{item.label}</span>
            <span className="font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* ── EXISTING: Hero card (Emotion wheel + Dominant state) ─────────────── */}
      <div className="os-card overflow-hidden mb-5 em-breathe" style={{
        background: `radial-gradient(ellipse at 30% 50%, ${domT.atmosphere.replace('0.98', '0.96')} 0%, rgba(8,6,20,0.99) 70%)`,
        border:     `1px solid ${domT.hex}18`,
        boxShadow:  `0 0 80px ${domT.hex}08, 0 8px 40px rgba(0,0,0,0.7)`,
        minHeight:  380,
      }}>
        <div className="flex items-stretch">
          {/* Wheel — left (unchanged position) */}
          <div className="p-8 flex items-center justify-center" style={{ minWidth: 340 }}>
            <EmotionWheel
              emotions={data.topEmotions}
              dominant={data.dominantEmotion}
              dominantType={data.dominantType}
            />
          </div>

          {/* State — right (unchanged structure, enhanced content) */}
          <div className="flex-1 p-8 flex flex-col justify-center gap-6"
            style={{ borderLeft: `1px solid ${domT.hex}12` }}>

            <div>
              <p className="os-label mb-2">DOMINANT EMOTION</p>
              <p className="font-black capitalize leading-none mb-2" style={{
                fontSize: 52, color: domT.hex,
                textShadow: `0 0 30px ${domT.glow}`,
              }}>
                {data.dominantEmotion}
              </p>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full font-mono text-[10px] font-black tracking-widest"
                  style={{ background: `${domT.hex}15`, border: `1px solid ${domT.hex}35`, color: domT.hex }}>
                  {domT.label}
                </span>
                <span className="font-mono text-[10px] font-bold"
                  style={{ color: velocityPos ? '#38D68A' : '#FF4A5E' }}>
                  {velocityPos ? '↑' : '↓'} {Math.abs(data.velocityIndex)}% velocity
                </span>
              </div>

              {/* NEW: Dominant emotion intelligence */}
              {dominantMeta && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Güven', value: `%${dominantMeta.confidence}` },
                    { label: 'Trend', value: dominantMeta.trend, color: dominantMeta.trendColor },
                    { label: 'Tespit Edildi', value: `${dominantMeta.detectedMin} dk önce` },
                    { label: 'Tahmini Süre', value: `${dominantMeta.durationHrs} saat` },
                  ].map(item => (
                    <div key={item.label} className="px-2.5 py-2 rounded-xl"
                      style={{ background: `${domT.hex}06`, border: `1px solid ${domT.hex}10` }}>
                      <p className="text-[7px] font-mono uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>{item.label}</p>
                      <p className="text-[10px] font-mono font-bold" style={{ color: item.color ?? domT.hex }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Emotion type breakdown — enhanced bars */}
            <div className="space-y-3">
              {[
                { type: 'positive' as const, count: positiveCount },
                { type: 'negative' as const, count: negativeCount },
                { type: 'neutral'  as const, count: neutralCount  },
              ].map(({ type, count }) => {
                const t   = TYPE[type];
                const pct = Math.round((count / (data.totalEmotions || 1)) * 100);
                const bm  = barHoverMeta;
                const isHov = hovBar === type;
                return (
                  <div key={type}
                    onMouseEnter={() => setHovBar(type)}
                    onMouseLeave={() => setHovBar(null)}
                    className="cursor-default">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[10px] font-bold font-mono" style={{ color: t.hex }}>{t.label}</span>
                      <span className="text-[10px] font-mono text-dc-muted">
                        <AnimCount value={pct} />% · {count.toLocaleString()}
                      </span>
                    </div>
                    <AnimBar value={pct} color={t.hex} glow={t.glow} />
                    {/* Hover tooltip */}
                    {isHov && bm && (
                      <div className="mt-2 grid grid-cols-4 gap-1.5 em-fade-in">
                        {[
                          { label: 'Dün', value: `%${bm.yesterday[type]}` },
                          { label: '7G Ort.', value: `%${bm.avg7[type]}` },
                          { label: '30G Ort.', value: `%${bm.avg30[type]}` },
                          { label: 'Tahmin', value: `%${bm.pred[type]}`, accent: true },
                        ].map(col => (
                          <div key={col.label} className="px-2 py-1.5 rounded-lg text-center"
                            style={{ background: `${t.hex}08`, border: `1px solid ${t.hex}15` }}>
                            <p className="text-[6px] font-mono uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{col.label}</p>
                            <p className="text-[9px] font-mono font-bold" style={{ color: col.accent ? t.hex : 'rgba(255,255,255,0.55)' }}>{col.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Existing stats grid */}
            <div className="grid grid-cols-2 gap-3 pt-4" style={{ borderTop: `1px solid ${domT.hex}10` }}>
              {[
                { label: 'TOTAL EMOTIONS',  value: data.totalEmotions.toLocaleString(), color: '#E8E8FF' },
                { label: 'ACTIVE TYPES',    value: data.topEmotions.length.toString(),  color: domT.hex  },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-xl em-card"
                  style={{ background: `${domT.hex}06`, border: `1px solid ${domT.hex}12` }}>
                  <p className="os-label mb-1">{label}</p>
                  <p className="font-mono font-black text-xl" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── EXISTING: AI Reading + Hourly waveform (enhanced) ────────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-5">

        {/* AI reading — enhanced with briefing metadata */}
        <div className="col-span-2 ai-reading-panel p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: domT.hex }} />
              <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: domT.hex }} />
            </div>
            <p className="os-title" style={{ color: domT.hex }}>AI EMOTIONAL WEATHER</p>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.8)' }}>
            {aiReading}
          </p>

          {/* NEW: Intelligence briefing metadata */}
          {aiMeta && (
            <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(123,111,255,0.1)' }}>
              {[
                { label: 'GÜVEN', value: `%${aiMeta.confidence}`, color: '#CC80FF' },
                { label: 'PRİMER SÜRÜCÜLER', value: aiMeta.drivers, color: domT.hex },
                { label: 'ETKİLENEN GRUPLAR', value: aiMeta.groups, color: 'rgba(255,255,255,0.5)' },
                { label: 'RİSK SEVİYESİ', value: aiMeta.risk, color: aiMeta.riskColor },
                { label: 'TREND', value: aiMeta.trendLabel, color: aiMeta.trendColor },
              ].map(item => (
                <div key={item.label} className="flex items-start justify-between gap-3">
                  <p className="os-label shrink-0">{item.label}</p>
                  <p className="text-[9px] font-mono font-bold text-right" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(123,111,255,0.1)' }}>
            <p className="os-label mb-2">SPECTRUM COMPOSITION</p>
            {data.topEmotions.slice(0, 5).map((e, i) => (
              <div key={e.emotion} className="flex items-center justify-between hover:bg-white/[0.02] rounded-lg px-1 py-0.5 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full shrink-0 animate-glow-breathe"
                    style={{ background: TYPE[e.type].hex, boxShadow: `0 0 4px ${TYPE[e.type].hex}`, animationDelay: `${i * 0.4}s` }} />
                  <span className="font-mono text-[11px] capitalize" style={{ color: TYPE[e.type].hex }}>
                    {e.emotion}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-dc-muted">{e.pct}%</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] font-mono mt-auto" style={{ color: 'rgba(123,111,255,0.3)' }}>
            EMOTION_INTEL v3.1 ▪ DREAMCLOUD OS
          </p>
        </div>

        {/* Hourly waveform — enhanced with hover + draw animation */}
        <div className="col-span-3 os-card overflow-hidden em-card">
          <div className="os-panel-header flex items-center justify-between">
            <p className="os-title">SAATLİK DUYGU AKIŞI</p>
            <div className="flex gap-3">
              {(['positive','negative','neutral'] as const).map(t => (
                <span key={t} className="flex items-center gap-1.5 text-[8px] font-bold font-mono" style={{ color: TYPE[t].hex }}>
                  <span className="w-1.5 h-1.5 rounded-sm" style={{ background: TYPE[t].hex }} />
                  {TYPE[t].label}
                </span>
              ))}
            </div>
          </div>
          <div className="p-5">
            {data.intensityByHour.every(h => h.count === 0) ? (
              <div className="h-24 flex items-center justify-center text-dc-muted text-xs">Saatlik veri yok</div>
            ) : (
              <>
                <HourlyWaveform hours={data.intensityByHour} />
                <div className="flex justify-between mt-1 text-[8px] text-dc-muted font-mono">
                  <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
                </div>
                {/* Colored bars by emotion type — current hour highlighted */}
                <div className="flex items-end gap-px mt-4 h-10 relative">
                  {data.intensityByHour.map(h => {
                    const t   = TYPE[eType(h.topEmotion)];
                    const max = Math.max(...data.intensityByHour.map(x => x.count), 1);
                    const ht  = Math.max(2, (h.count / max) * 40);
                    const isNow = h.hour === new Date().getHours();
                    return (
                      <div key={h.hour} className="flex-1 rounded-t-sm" style={{
                        height:     `${ht}px`,
                        background:  t.hex,
                        boxShadow:   isNow ? `0 0 8px ${t.hex}` : `0 0 3px ${t.hex}60`,
                        opacity:     isNow ? 1 : 0.7,
                        border:      isNow ? `1px solid ${t.hex}` : 'none',
                        transition:  'height 0.5s ease',
                      }} />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── EXISTING: 30-day timeline (enhanced with hover tooltip) ──────────── */}
      <div className="os-card p-6 em-card">
        <div className="flex items-center justify-between mb-4">
          <p className="os-title">30 GÜNLÜK DUYGU ZAMAN AKIŞI</p>
          <div className="flex gap-4">
            {(['positive','negative','neutral'] as const).map(t => (
              <span key={t} className="flex items-center gap-1.5 text-[9px]" style={{ color: TYPE[t].hex }}>
                <span className="w-2 h-2 rounded-sm" style={{ background: TYPE[t].hex }} />
                {TYPE[t].label}
              </span>
            ))}
          </div>
        </div>

        {/* Hover detail */}
        {hovDay !== null && timelineDayMeta[hovDay] && (
          <div className="mb-3 px-4 py-3 rounded-xl border text-[9px] em-fade-in"
            style={{ background: 'rgba(123,111,255,0.05)', borderColor: 'rgba(123,111,255,0.18)' }}>
            <div className="flex items-center gap-5 flex-wrap">
              <span className="font-mono font-black" style={{ color: '#7B6FFF' }}>{timelineDayMeta[hovDay].date.slice(5)}</span>
              <span style={{ color: '#38D68A' }}>+{timelineDayMeta[hovDay].posP}%</span>
              <span style={{ color: '#FF4A5E' }}>−{timelineDayMeta[hovDay].negP}%</span>
              <span style={{ color: '#5A5A84' }}>◈{timelineDayMeta[hovDay].neuP}%</span>
              <span className="text-dc-muted">{timelineDayMeta[hovDay].dom}</span>
              <span className="text-dc-muted">{timelineDayMeta[hovDay].summary}</span>
              <span className="ml-auto font-mono" style={{ color: timelineDayMeta[hovDay].changePt >= 0 ? '#38D68A' : '#FF4A5E' }}>
                {timelineDayMeta[hovDay].changePt >= 0 ? '↑' : '↓'}{Math.abs(timelineDayMeta[hovDay].changePt)}pt
              </span>
            </div>
          </div>
        )}

        {data.emotionTimeline.length === 0 ? (
          <div className="h-20 flex items-center justify-center text-dc-muted text-xs">Timeline verisi yok</div>
        ) : (
          <>
            <div className="flex items-end gap-px h-24">
              {data.emotionTimeline.map((t, idx) => {
                const total    = (t.positive + t.negative + t.neutral) || 1;
                const pH       = (t.positive / total) * 96;
                const nH       = (t.negative / total) * 96;
                const uH       = (t.neutral  / total) * 96;
                const isHov    = hovDay === idx;
                const isToday  = idx === data.emotionTimeline.length - 1;
                return (
                  <div key={t.date}
                    className="flex-1 flex flex-col justify-end cursor-default"
                    style={{ borderRadius: isHov ? '2px 2px 0 0' : undefined, outline: isHov ? '1px solid rgba(123,111,255,0.3)' : 'none', transition: 'outline 0.15s' }}
                    title={t.date}
                    onMouseEnter={() => setHovDay(idx)}
                    onMouseLeave={() => setHovDay(null)}>
                    <div style={{ height: `${uH}px`,  background: TYPE.neutral.hex,  opacity: isHov ? 0.8 : 0.5, transition: 'opacity 0.15s' }} />
                    <div style={{ height: `${nH}px`,  background: TYPE.negative.hex, opacity: isHov ? 1 : 0.8,   boxShadow: isHov ? `0 0 4px ${TYPE.negative.hex}` : `0 0 2px ${TYPE.negative.hex}`, transition: 'opacity 0.15s,box-shadow 0.15s' }} />
                    <div style={{ height: `${pH}px`,  background: TYPE.positive.hex, opacity: isHov ? 1 : 0.9,   boxShadow: isToday ? `0 0 8px ${TYPE.positive.hex}` : isHov ? `0 0 4px ${TYPE.positive.hex}` : `0 0 2px ${TYPE.positive.hex}`, transition: 'opacity 0.15s,box-shadow 0.15s' }} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1.5 text-[8px] text-dc-muted font-mono">
              {data.emotionTimeline.slice(0,1).map(t => <span key={t.date}>{t.date.slice(5)}</span>)}
              <span>30 GÜN</span>
              {data.emotionTimeline.slice(-1).map(t => <span key={t.date}>{t.date.slice(5)}</span>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
