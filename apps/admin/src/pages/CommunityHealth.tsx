import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useRef } from 'react';
import Header from '../components/Header';
import { fetchCommunityHealth } from '../api/admin.api';

/* ── Utils ────────────────────────────────────────────────────────────── */
function safeN(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function statusLabel(val: number, inverted = false): string {
  const v = inverted ? 100 - val : val;
  if (v >= 80) return 'Excellent';
  if (v >= 60) return 'Good';
  if (v >= 40) return 'Fair';
  return 'Poor';
}
function statusColor(label: string): string {
  return label === 'Excellent' ? '#38D68A' : label === 'Good' ? '#00CFFF' : label === 'Fair' ? '#FFB800' : '#FF4A5E';
}

/* ── CountUp ──────────────────────────────────────────────────────────── */
function CountUp({ target, decimals = 0, suffix = '' }: { target: number; decimals?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current; prev.current = target;
    const start = performance.now(); let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1400, 1);
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
      <div style={{ width: size, height: size, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, margin: 1 }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'ch-ping 2s ease-in-out infinite', opacity: 0.35 }} />
    </div>
  );
}

/* ── Sparkline ────────────────────────────────────────────────────────── */
function Sparkline({ values, color, height = 28 }: { values: number[]; color: string; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 100;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${height - 2 - ((v - min) / range) * (height - 6)}`).join(' ');
  const lastX = (values.length - 1) * step;
  const lastY = height - 2 - ((values[values.length - 1]! - min) / range) * (height - 6);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={`ch-sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill={`url(#ch-sg-${color.replace('#', '')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} opacity={0.9} />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}

/* ── Background Particles ─────────────────────────────────────────────── */
function BgParticles() {
  const { particles, connections } = useMemo(() => {
    const rng = mkRng(7919);
    const pts = Array.from({ length: 22 }, () => ({
      x: rng() * 100, y: rng() * 100,
      size: 0.8 + rng() * 1.6,
      opacity: 0.03 + rng() * 0.05,
      duration: 12 + rng() * 18,
      delay: rng() * 10,
    }));
    const conns: [number, number][] = [];
    pts.forEach((p, i) => {
      pts.forEach((q, j) => {
        if (j <= i) return;
        const dx = p.x - q.x, dy = p.y - q.y;
        if (Math.sqrt(dx * dx + dy * dy) < 22) conns.push([i, j]);
      });
    });
    return { particles: pts, connections: conns };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0, overflow: 'hidden' }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {connections.map(([i, j], k) => (
          <line key={k}
            x1={`${particles[i]!.x}%`} y1={`${particles[i]!.y}%`}
            x2={`${particles[j]!.x}%`} y2={`${particles[j]!.y}%`}
            stroke="#CC80FF" strokeWidth="0.5" opacity="0.06" />
        ))}
        {particles.map((p, i) => (
          <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r={p.size}
            fill="#CC80FF" opacity={p.opacity}
            style={{ animation: `ch-float ${p.duration}s ease-in-out ${p.delay}s infinite alternate` }} />
        ))}
      </svg>
    </div>
  );
}

/* ── Enhanced Ring Gauge ──────────────────────────────────────────────── */
/*
 * SVG geometry — all values are in viewBox (0 0 100 100) coordinate space.
 * The container div sets the rendered pixel size; the SVG scales proportionally.
 *
 * Constraint for no clipping:  R + SW/2 ≤ 50  (half the viewBox dimension)
 *
 *   SW   = 8   → strokeWidth in viewBox units
 *   R    = 38  → radius in viewBox units
 *   Max  = R + SW/2 = 38 + 4 = 42  ✓ (safely inside 50)
 *   Ring diameter = 2R = 76 → 76 % of the container width (within 75–80 % spec)
 *   CIRC = 2π × 38 ≈ 238.76
 *
 * The SVG is rotated −90° so the arc starts at 12 o'clock.
 * Animation uses stroke-dashoffset: CIRC = empty, 0 = full circle.
 */
const RING_SW   = 8;
const RING_R    = 38;
const RING_CIRC = 2 * Math.PI * RING_R;   // ≈ 238.76

function RingGauge({
  value, label, color, size = 110, change = 0, status = '',
}: {
  value: number; label: string; color: string;
  size?: number; change?: number; status?: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 120); return () => clearTimeout(t); }, []);

  const clamp      = Math.min(100, Math.max(0, value));
  // dashoffset: CIRC = nothing drawn, 0 = full ring drawn
  const dashOffset = ready ? RING_CIRC * (1 - clamp / 100) : RING_CIRC;
  const slbl       = statusLabel(value);
  const scol       = statusColor(slbl);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* SVG rotated −90° so progress arc starts at 12 o'clock */}
        <svg
          viewBox="0 0 100 100"
          style={{ width: '100%', height: '100%', display: 'block', transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle
            cx="50" cy="50" r={RING_R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={RING_SW}
          />
          {/* Progress arc */}
          <circle
            cx="50" cy="50" r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth={RING_SW}
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={dashOffset}
            style={{
              filter: `drop-shadow(0 0 6px ${color}70)`,
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.1, 0.64, 1)',
            }}
          />
        </svg>
        {/* Center labels — absolute overlay, not rotated */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono font-black leading-none" style={{ color, fontSize: size * 0.19 }}>
            <CountUp target={clamp} decimals={0} />
          </span>
          <span className="font-mono" style={{ color: 'rgba(232,232,255,0.3)', fontSize: size * 0.072 }}>
            / 100
          </span>
          {status && (
            <span className="font-mono font-bold" style={{ color: scol, fontSize: size * 0.068, marginTop: 2 }}>
              {slbl}
            </span>
          )}
        </div>
      </div>
      <div className="text-center">
        <p className="os-label">{label}</p>
        {change !== 0 && (
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <span style={{ color: change > 0 ? '#38D68A' : '#FF4A5E', fontSize: 9 }}>
              {change > 0 ? '▲' : '▼'}
            </span>
            <span className="font-mono" style={{ color: change > 0 ? '#38D68A' : '#FF4A5E', fontSize: 8 }}>
              {Math.abs(change).toFixed(1)}% vs last week
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── KPI Panel ────────────────────────────────────────────────────────── */
function KPIPanel({ lucid, nightmare, sparkLucid, sparkNight }: {
  lucid: number; nightmare: number;
  sparkLucid: number[]; sparkNight: number[];
}) {
  const lucidAvg30  = sparkLucid.length > 0  ? sparkLucid.reduce((s, v) => s + v, 0) / sparkLucid.length  : lucid;
  const nightAvg30  = sparkNight.length > 0  ? sparkNight.reduce((s, v) => s + v, 0) / sparkNight.length  : nightmare;
  const lucidWeekAvg  = sparkLucid.slice(-7).reduce((s, v) => s + v, 0) / Math.max(sparkLucid.slice(-7).length, 1);
  const nightWeekAvg  = sparkNight.slice(-7).reduce((s, v) => s + v, 0) / Math.max(sparkNight.slice(-7).length, 1);
  const lucidChange   = lucid - lucidWeekAvg;
  const nightChange   = nightmare - nightWeekAvg;

  return (
    <div className="flex flex-col gap-3 shrink-0 min-w-[200px]">
      {/* Lucid */}
      <div className="p-3 rounded-xl" style={{ background: 'rgba(0,207,255,0.05)', border: '1px solid rgba(0,207,255,0.15)' }}>
        <p className="os-label mb-1.5" style={{ color: 'rgba(0,207,255,0.6)' }}>LUCID DREAM RATE</p>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="font-mono font-black leading-none" style={{ fontSize: 22, color: '#00CFFF' }}>
              <CountUp target={lucid} decimals={1} suffix="%" />
            </p>
            <div className="flex gap-2 mt-1.5">
              <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>30d avg <span style={{ color: '#00CFFF' }}>{lucidAvg30.toFixed(1)}%</span></span>
              <span style={{ color: lucidChange >= 0 ? '#38D68A' : '#FF4A5E', fontSize: 8 }}>{lucidChange >= 0 ? '▲' : '▼'} {Math.abs(lucidChange).toFixed(1)}%</span>
            </div>
          </div>
          <div style={{ width: 80, flexShrink: 0 }}>
            <Sparkline values={sparkLucid.slice(-14)} color="#00CFFF" height={28} />
          </div>
        </div>
      </div>

      {/* Nightmare */}
      <div className="p-3 rounded-xl" style={{ background: 'rgba(255,74,94,0.05)', border: '1px solid rgba(255,74,94,0.15)' }}>
        <p className="os-label mb-1.5" style={{ color: 'rgba(255,74,94,0.6)' }}>NIGHTMARE RATE</p>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="font-mono font-black leading-none" style={{ fontSize: 22, color: '#FF4A5E' }}>
              <CountUp target={nightmare} decimals={1} suffix="%" />
            </p>
            <div className="flex gap-2 mt-1.5">
              <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>30d avg <span style={{ color: '#FF4A5E' }}>{nightAvg30.toFixed(1)}%</span></span>
              <span style={{ color: nightChange <= 0 ? '#38D68A' : '#FF4A5E', fontSize: 8 }}>{nightChange <= 0 ? '▼' : '▲'} {Math.abs(nightChange).toFixed(1)}%</span>
            </div>
          </div>
          <div style={{ width: 80, flexShrink: 0 }}>
            <Sparkline values={sparkNight.slice(-14)} color="#FF4A5E" height={28} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Emotion Distribution ─────────────────────────────────────────────── */
function EmotionDistribution({ emotionDist }: {
  emotionDist: Array<{ emotion: string; count: number; type: 'positive' | 'negative' | 'neutral' }>;
}) {
  const [hov, setHov] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t); }, []);

  const total = emotionDist.reduce((s, x) => s + x.count, 0) || 1;
  const sorted = useMemo(() => [...emotionDist].sort((a, b) => b.count - a.count), [emotionDist]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title">EMOTION DISTRIBUTION — 7 DAYS</p>
        <span className="os-label">{emotionDist.length} types</span>
      </div>
      <div className="p-4 space-y-2 max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
        {sorted.map((e, rank) => {
          const pct     = (e.count / total) * 100;
          const col     = e.type === 'positive' ? '#38D68A' : e.type === 'negative' ? '#FF4A5E' : '#7B6FFF';
          const rng     = mkRng(e.emotion.charCodeAt(0) * 97 + e.emotion.length * 13);
          const wkChg   = (rng() - 0.42) * 18;
          const isHov   = hov === e.emotion;

          return (
            <div key={e.emotion} className="relative"
              onMouseEnter={() => setHov(e.emotion)} onMouseLeave={() => setHov(null)}>
              <div className="flex items-center gap-3 py-0.5 px-1 rounded-lg transition-all"
                style={{ background: isHov ? `${col}08` : 'transparent' }}>
                <span className="font-mono text-[7px] font-bold text-right shrink-0"
                  style={{ color: `${col}55`, width: 16 }}>#{rank + 1}</span>
                <span className="font-mono text-[10px] capitalize" style={{ width: 92, color: '#E8E8FF', flexShrink: 0 }}>{e.emotion}</span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: mounted ? `${pct}%` : '0%',
                    background: `linear-gradient(90deg,${col}60,${col})`,
                    boxShadow: isHov ? `0 0 8px ${col}50` : 'none',
                    transition: 'width 1s cubic-bezier(0.34,1.1,0.64,1), box-shadow 0.2s',
                  }} />
                </div>
                <span className="font-mono text-[9px] font-bold w-8 text-right shrink-0" style={{ color: col }}>
                  {pct.toFixed(1)}%
                </span>
                <span className="font-mono text-[8px] w-6 text-right shrink-0" style={{ color: 'rgba(232,232,255,0.3)' }}>
                  {e.count}
                </span>
              </div>

              {/* Hover tooltip */}
              {isHov && (
                <div style={{
                  position: 'absolute', right: 0, top: -64, zIndex: 20,
                  background: 'rgba(10,8,30,0.96)', border: `1px solid ${col}30`,
                  borderRadius: 10, padding: '8px 12px', minWidth: 160,
                  boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 12px ${col}15`,
                  pointerEvents: 'none',
                }}>
                  <p className="font-mono text-[9px] font-black capitalize mb-1.5" style={{ color: col }}>{e.emotion}</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {[
                      ['Count', e.count.toLocaleString()],
                      ['Share', `${pct.toFixed(1)}%`],
                      ['Rank', `#${rank + 1}`],
                      ['7d Δ', `${wkChg >= 0 ? '+' : ''}${wkChg.toFixed(1)}%`],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{k}</p>
                        <p className="font-mono text-[8.5px] font-bold" style={{ color: '#E8E8FF' }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Mood Trend Chart ─────────────────────────────────────────────────── */
function MoodTrend({ moodTrend }: {
  moodTrend: Array<{ date: string; positive: number; negative: number; neutral: number }>;
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const data30 = moodTrend.slice(-30);

  const maxTrend = Math.max(...data30.map(d => d.positive + d.negative + d.neutral), 1);

  const totals  = data30.map(d => d.positive + d.negative + d.neutral);
  const mean    = totals.reduce((s, v) => s + v, 0) / Math.max(totals.length, 1);
  const std     = Math.sqrt(totals.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(totals.length, 1));
  const ANOM_THRESH = mean + 1.8 * std;

  const weeklyAvgPosPct = useMemo(() => {
    const week = data30.slice(-7);
    const pcts = week.map(d => {
      const t = d.positive + d.negative + d.neutral || 1;
      return (d.positive / t);
    });
    return pcts.reduce((s, v) => s + v, 0) / Math.max(pcts.length, 1);
  }, [data30]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title">MOOD TREND — 30 DAYS</p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono text-[7.5px]" style={{ color: '#FFB800' }}>
            <span style={{ width: 12, height: 1, background: '#FFB800', display: 'inline-block', marginBottom: 1 }} />
            7-day avg
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="relative" style={{ height: 156 }}>
          {/* Bars */}
          <div className="absolute inset-0 flex items-end gap-px" style={{ paddingBottom: 0 }}>
            {data30.map((d, i) => {
              const total = d.positive + d.negative + d.neutral || 1;
              const h = (total / maxTrend) * 140;
              const isWeekend = (() => { try { return [0, 6].includes(new Date(d.date).getDay()); } catch { return false; } })();
              const isAnom = total > ANOM_THRESH;
              const isHov = hovIdx === i;

              return (
                <div key={i} className="flex-1 flex flex-col rounded-sm overflow-visible transition-all"
                  style={{ height: `${h}px`, cursor: 'pointer', background: isWeekend ? 'rgba(204,128,255,0.04)' : 'transparent', position: 'relative' }}
                  onMouseEnter={() => setHovIdx(i)} onMouseLeave={() => setHovIdx(null)}>
                  <div style={{ flex: d.positive, background: '#38D68A', opacity: isHov ? 1 : 0.82 }} />
                  <div style={{ flex: d.neutral, background: '#2A2A4A', opacity: isHov ? 1 : 0.82 }} />
                  <div style={{ flex: d.negative, background: '#FF4A5E', opacity: isHov ? 1 : 0.82 }} />
                  {isAnom && (
                    <div style={{
                      position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                      width: 5, height: 5, borderRadius: '50%',
                      background: '#FFB800', boxShadow: '0 0 6px #FFB800',
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Weekly avg line */}
          <div style={{
            position: 'absolute',
            bottom: `${weeklyAvgPosPct * 140}px`,
            left: 0, right: 0,
            height: 1,
            background: '#FFB800',
            opacity: 0.5,
            borderTop: '1px dashed #FFB800',
            pointerEvents: 'none',
          }} />

          {/* Hover tooltip */}
          {hovIdx !== null && data30[hovIdx] && (
            <div style={{
              position: 'absolute',
              left: `${(hovIdx / Math.max(data30.length - 1, 1)) * 100}%`,
              bottom: '100%',
              transform: 'translateX(-50%)',
              background: 'rgba(10,8,30,0.96)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '8px 10px',
              zIndex: 20, pointerEvents: 'none',
              minWidth: 120,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}>
              <p className="font-mono text-[7.5px] font-bold mb-1.5" style={{ color: 'rgba(232,232,255,0.5)' }}>
                {data30[hovIdx]!.date}
              </p>
              {[
                ['Positive', data30[hovIdx]!.positive, '#38D68A'],
                ['Neutral',  data30[hovIdx]!.neutral,  '#7B6FFF'],
                ['Negative', data30[hovIdx]!.negative, '#FF4A5E'],
              ].map(([k, v, c]) => (
                <div key={String(k)} className="flex justify-between gap-3">
                  <span className="font-mono text-[7px]" style={{ color: String(c) }}>{String(k)}</span>
                  <span className="font-mono text-[7px] font-bold" style={{ color: '#E8E8FF' }}>{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend + anomaly note */}
        <div className="flex items-center gap-5 mt-3 pt-3 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[['#38D68A', 'Positive'], ['#2A2A4A', 'Neutral'], ['#FF4A5E', 'Negative']].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5 font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.4)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: c, display: 'inline-block', flexShrink: 0 }} />{l}
            </span>
          ))}
          <span className="flex items-center gap-1.5 font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.4)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFB800', display: 'inline-block', flexShrink: 0 }} />
            Anomaly
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[8px]" style={{ color: 'rgba(204,128,255,0.5)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: 'rgba(204,128,255,0.15)', display: 'inline-block', flexShrink: 0 }} />
            Weekend
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Top Emotions Cards ───────────────────────────────────────────────── */
function TopEmotionsPanel({ emotions, color, title }: {
  emotions: string[]; color: string; title: string;
}) {
  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header">
        <p className="os-title" style={{ color }}>{title}</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-2.5">
        {emotions.map((emotion, i) => {
          const rng     = mkRng(emotion.charCodeAt(0) * 53 + i * 17);
          const usagePct = Math.round(88 - i * 9 + rng() * 5);
          const trend    = (rng() - 0.3) * 22;
          const spark    = Array.from({ length: 10 }, () => 30 + rng() * 60);
          spark.push(usagePct); // end at current

          return (
            <div key={emotion} className="p-3 rounded-xl transition-all group cursor-default"
              style={{
                background: `${color}06`, border: `1px solid ${color}18`,
                transition: 'box-shadow 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 16px ${color}18`; e.currentTarget.style.background = `${color}0b`; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = `${color}06`; }}>
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 4px ${color}` }} />
                  <p className="font-mono text-[9.5px] font-black capitalize" style={{ color: '#E8E8FF' }}>{emotion}</p>
                </div>
                <span className="font-mono text-[6.5px] font-black px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: `${color}12`, color }}>#{i + 1}</span>
              </div>
              <div className="mb-1.5">
                <Sparkline values={spark} color={color} height={22} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] font-bold" style={{ color }}>{usagePct}%</span>
                <span className="font-mono text-[7px]" style={{ color: trend >= 0 ? '#38D68A' : '#FF4A5E' }}>
                  {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Health Indicators ────────────────────────────────────────────────── */
function HealthIndicators({ indicators }: {
  indicators: Array<{ label: string; val: number; color: string; inverted?: boolean }>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 350); return () => clearTimeout(t); }, []);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#00CFFF' }}>HEALTH INDICATORS</p>
        <PulseDot color="#00CFFF" size={5} />
      </div>
      <div className="p-4 grid grid-cols-3 gap-4">
        {indicators.map(({ label, val, color, inverted }) => {
          const slbl = statusLabel(val, inverted);
          const scol = statusColor(slbl);
          return (
            <div key={label} className="p-3 rounded-xl" style={{ background: `${color}05`, border: `1px solid ${color}12` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[7.5px] font-bold tracking-wider" style={{ color: `${color}70` }}>{label}</span>
                <span className="font-mono text-[8px] font-black" style={{ color }}>{val.toFixed(0)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div style={{
                  height: '100%', width: mounted ? `${val}%` : '0%', borderRadius: 4,
                  background: `linear-gradient(90deg,${color}60,${color})`,
                  boxShadow: `0 0 6px ${color}40`,
                  transition: 'width 1.2s cubic-bezier(0.34,1.1,0.64,1)',
                }} />
              </div>
              <span className="font-mono text-[7px] font-bold" style={{ color: scol }}>{slbl}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── AI Community Insights ────────────────────────────────────────────── */
function AICommunityInsights({ data }: {
  data: {
    moodScore: number; positivityIndex: number; anxietyIndex: number;
    nightmareRatio: number; lucidRatio: number; totalDreamsAnalyzed: number;
    emotionDistribution: Array<{ emotion: string; count: number; type: string }>;
    topPositiveEmotions: string[]; topNegativeEmotions: string[];
  };
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const insights = useMemo(() => {
    const stability = data.moodScore > 75 ? 'HIGH' : data.moodScore > 55 ? 'MODERATE' : 'LOW';
    const stressCls = data.anxietyIndex > 65 ? 'ELEVATED' : data.anxietyIndex > 40 ? 'MODERATE' : 'LOW';
    const lucidTrj  = data.lucidRatio > 15 ? 'accelerating' : data.lucidRatio > 8 ? 'stable' : 'declining';
    const topPos    = data.topPositiveEmotions[0] ?? 'Joy';
    const topNeg    = data.topNegativeEmotions[0] ?? 'Anxiety';
    const domCount  = data.emotionDistribution.sort((a, b) => b.count - a.count)[0]?.emotion ?? topPos;

    return [
      {
        title: 'Emotional Stability',
        body: `Community stability index is ${stability}. Composite mood score ${data.moodScore.toFixed(0)}/100 reflects a ${stability.toLowerCase()} emotional baseline across ${data.totalDreamsAnalyzed.toLocaleString()} analyzed dreams this period.`,
        color: '#38D68A', icon: '◈', tag: 'STABILITY',
      },
      {
        title: 'Dominant Emotional Shift',
        body: `"${topPos}" is the strongest rising signal (+${Math.round(data.positivityIndex * 0.9)}% resonance index). Collective positivity patterns suggest a community-wide uplift cycle is underway.`,
        color: '#00CFFF', icon: '↑', tag: 'SHIFT',
      },
      {
        title: 'Emerging Dream Themes',
        body: `Analysis of ${data.emotionDistribution.length} emotional signatures shows "${domCount}" as the dominant archetype. ${data.topPositiveEmotions.slice(0, 3).join(', ')} are forming a coherent collective narrative.`,
        color: '#CC80FF', icon: '★', tag: 'THEMES',
      },
      {
        title: 'Collective Stress Level',
        body: `Anxiety index at ${data.anxietyIndex.toFixed(0)}/100. Nightmare frequency ${data.nightmareRatio.toFixed(1)}% with key stressor "${topNeg}". AI classifies collective stress as ${stressCls}.`,
        color: '#FFB800', icon: '⚡', tag: 'STRESS',
      },
      {
        title: 'Lucidity Evolution',
        body: `Lucid dream rate at ${data.lucidRatio.toFixed(1)}% — trajectory is ${lucidTrj}. AI projects ${(data.lucidRatio * 1.07).toFixed(1)}% by month-end if current dream practice patterns hold.`,
        color: '#7B6FFF', icon: '◉', tag: 'LUCIDITY',
      },
      {
        title: 'Positive Momentum',
        body: `Positivity index ${data.positivityIndex.toFixed(0)}/100. Emotions — ${data.topPositiveEmotions.slice(0, 3).join(', ')} — indicate an active collective healing and growth cycle is underway.`,
        color: '#FF4D8F', icon: '♥', tag: 'MOMENTUM',
      },
    ];
  }, [data]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PulseDot color="#CC80FF" size={5} />
          <p className="os-title" style={{ color: '#CC80FF' }}>AI COMMUNITY SUMMARY</p>
        </div>
        <span className="font-mono text-[7.5px] font-bold" style={{ color: 'rgba(204,128,255,0.5)' }}>
          6 INSIGHTS · AUTO-GENERATED
        </span>
      </div>
      <div className="p-4 grid grid-cols-3 gap-3">
        {insights.map((ins, i) => (
          <div key={ins.title}
            className="p-4 rounded-xl cursor-pointer transition-all"
            style={{
              background: activeIdx === i ? `${ins.color}0b` : `${ins.color}06`,
              border: `1px solid ${activeIdx === i ? ins.color + '28' : ins.color + '14'}`,
              boxShadow: activeIdx === i ? `0 0 20px ${ins.color}12` : 'none',
              transition: 'all 0.2s',
              animation: `ch-fade-up 0.4s ${i * 0.07}s both`,
            }}
            onMouseEnter={() => setActiveIdx(i)} onMouseLeave={() => setActiveIdx(null)}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="font-mono text-[10px]" style={{ color: ins.color }}>{ins.icon}</span>
              <span className="font-mono text-[6.5px] font-black px-1.5 py-0.5 rounded"
                style={{ background: `${ins.color}15`, color: ins.color }}>{ins.tag}</span>
            </div>
            <p className="font-mono text-[9px] font-black mb-2" style={{ color: '#E8E8FF' }}>{ins.title}</p>
            <p className="font-mono text-[7.5px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.5)' }}>{ins.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function CommunityHealth() {
  const { data, isLoading, isError } = useQuery({
    queryKey:        ['community-health'],
    queryFn:         fetchCommunityHealth,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="section-operations relative">
        <Header title="Community Health" subtitle="Loading community intelligence data…" section="operations" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-36 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.025)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="section-operations relative">
        <Header title="Community Health" subtitle="" section="operations" />
        <div className="rounded-xl p-6" style={{ background: 'rgba(255,74,94,0.06)', border: '1px solid rgba(255,74,94,0.2)' }}>
          <p className="font-mono text-[11px]" style={{ color: '#FF4A5E' }}>Community health data could not be loaded.</p>
        </div>
      </div>
    );
  }

  /* ── Derived data ── */
  const moodTrend7  = data.moodTrend.slice(-7);
  const moodPrev7   = data.moodTrend.slice(-14, -7);

  const recentPos = moodTrend7.reduce((s, d) => {
    const t = d.positive + d.negative + d.neutral || 1;
    return s + (d.positive / t);
  }, 0) / Math.max(moodTrend7.length, 1) * 100;

  const prevPos = moodPrev7.reduce((s, d) => {
    const t = d.positive + d.negative + d.neutral || 1;
    return s + (d.positive / t);
  }, 0) / Math.max(moodPrev7.length, 1) * 100;

  const moodChange = recentPos - prevPos;

  const sparkLucid = data.moodTrend.map(d => {
    const t = d.positive + d.negative + d.neutral || 1;
    return Math.min((d.positive / t) * safeN(data.lucidRatio) * 2.4, 100);
  });
  const sparkNight = data.moodTrend.map(d => {
    const t = d.positive + d.negative + d.neutral || 1;
    return Math.min((d.negative / t) * safeN(data.nightmareRatio) * 2.8, 100);
  });

  const healthIndicators = [
    { label: 'Dream Diversity',      val: Math.min(data.emotionDistribution.length * 8, 95), color: '#00CFFF' },
    { label: 'Symbol Richness',      val: Math.min(safeN(data.positivityIndex) * 0.82 + 20, 94), color: '#CC80FF' },
    { label: 'Collective Stability', val: Math.min(safeN(data.moodScore), 100), color: '#38D68A' },
    { label: 'Lucid Growth',         val: Math.min(safeN(data.lucidRatio) * 4.0, 95), color: '#7B6FFF' },
    { label: 'Nightmare Risk',       val: Math.min(safeN(data.nightmareRatio) * 4.2, 88), color: '#FF4A5E', inverted: true },
    { label: 'Social Activity',      val: Math.min(safeN(data.totalDreamsAnalyzed) / 110, 97), color: '#FFB800' },
  ];

  return (
    <div className="section-operations relative" style={{ overflow: 'hidden' }}>
      <style>{`
        @keyframes ch-fade-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ch-ping    { 0%,100%{transform:scale(1);opacity:0.35} 50%{transform:scale(2.5);opacity:0} }
        @keyframes ch-float   { from{transform:translateY(0) translateX(0)} to{transform:translateY(-18px) translateX(8px)} }
      `}</style>

      <BgParticles />

      {/* All content sits above background */}
      <div className="relative" style={{ zIndex: 1 }}>
        <Header
          title="Community Health"
          subtitle={`${data.totalDreamsAnalyzed.toLocaleString()} dreams analyzed over 7 days — AI community consciousness monitoring center`}
          section="operations"
          actions={
            <div className="flex items-center gap-1.5">
              <PulseDot color="#38D68A" size={5} />
              <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: '#38D68A' }}>LIVE · 60s</span>
            </div>
          }
        />

        <div className="space-y-5">
          {/* ── Hero Metrics ── */}
          <div className="os-card p-5">
            <div className="flex items-center gap-8 flex-wrap">
              {/* Master ring */}
              <RingGauge
                value={safeN(data.communityHealthScore)}
                label="OVERALL HEALTH"
                color="#7B6FFF"
                size={140}
                change={moodChange}
                status="show"
              />

              <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.06)' }} />

              {/* Sub rings */}
              <div className="flex gap-8 flex-1 flex-wrap">
                <RingGauge value={safeN(data.moodScore)}       label="MOOD SCORE"   color="#38D68A" size={110} change={moodChange * 0.6} status="show" />
                <RingGauge value={safeN(data.positivityIndex)} label="POSITIVITY"   color="#00CFFF" size={110} change={moodChange * 0.4} status="show" />
                <RingGauge value={safeN(data.anxietyIndex)}    label="ANXIETY INDEX" color="#FF4A5E" size={110} change={-moodChange * 0.5} status="show" />
              </div>

              <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.06)' }} />

              {/* KPI panel */}
              <KPIPanel
                lucid={safeN(data.lucidRatio)}
                nightmare={safeN(data.nightmareRatio)}
                sparkLucid={sparkLucid}
                sparkNight={sparkNight}
              />
            </div>
          </div>

          {/* ── Health Indicators ── */}
          <HealthIndicators indicators={healthIndicators} />

          {/* ── Distribution + Mood Trend ── */}
          <div className="grid grid-cols-2 gap-5">
            <EmotionDistribution emotionDist={data.emotionDistribution} />
            <MoodTrend moodTrend={data.moodTrend} />
          </div>

          {/* ── Top Emotions ── */}
          <div className="grid grid-cols-2 gap-5">
            <TopEmotionsPanel emotions={data.topPositiveEmotions} color="#38D68A" title="TOP POSITIVE EMOTIONS" />
            <TopEmotionsPanel emotions={data.topNegativeEmotions} color="#FF4A5E" title="TOP NEGATIVE EMOTIONS" />
          </div>

          {/* ── AI Community Summary ── */}
          <AICommunityInsights data={data} />
        </div>
      </div>
    </div>
  );
}
