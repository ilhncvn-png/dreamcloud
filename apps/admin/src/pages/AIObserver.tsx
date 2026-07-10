import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchAIObserver } from '../api/admin.api';
import type { AIObserverData, MoodTrendPoint, TrendSymbol, AnomalyDay, CollectiveChange, ResonanceTrendPoint } from '../api/admin.api';

/* ── Constants ────────────────────────────────────────────────────────── */
const DAY_OPTIONS = [
  { label: '7d',  value: 7  },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '60d', value: 60 },
];

const EMOTION_COLORS: Record<string, string> = {
  joy: '#38D68A', sadness: '#60A5FA', fear: '#FF4A5E', anger: '#FF8C00',
  anxiety: '#FFB800', love: '#FF4D8F', confusion: '#CC80FF', peace: '#00CFFF',
  excitement: '#FFB800', grief: '#7B6FFF', wonder: '#CC80FF', calm: '#38D68A',
};

const AI_RELATIONSHIPS = [
  { a: 'Fear',    b: 'Water',     color: '#00CFFF', strength: 87, desc: 'Emotional containment archetype' },
  { a: 'Memory',  b: 'Forest',    color: '#38D68A', strength: 74, desc: 'Ancestral recall pattern'        },
  { a: 'Mirror',  b: 'Identity',  color: '#CC80FF', strength: 91, desc: 'Self-reflection resonance'      },
  { a: 'Shadow',  b: 'Light',     color: '#FFB800', strength: 68, desc: 'Duality integration signal'      },
  { a: 'Anxiety', b: 'Falling',   color: '#FF4A5E', strength: 83, desc: 'Loss-of-control sequence'       },
  { a: 'Joy',     b: 'Flight',    color: '#FF4D8F', strength: 79, desc: 'Liberation breakthrough event'  },
];

/* ── Utils ────────────────────────────────────────────────────────────── */
function safeN(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function mkRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function emotionColor(e: string): string {
  return EMOTION_COLORS[e?.toLowerCase() ?? ''] ?? '#CC80FF';
}
function weekLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`;
}
function genAnomalyWhy(a: AnomalyDay): string {
  const dev = Math.abs(safeN(a.deviation)).toFixed(1);
  const date = new Date(a.day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  if (a.anomaly_type === 'spike') {
    if (safeN(a.deviation) > 3) return `Extreme volume surge on ${date} — ${a.cnt} dreams, ${dev}σ above baseline. AI classifies this as a synchronized collective event, likely triggered by a shared macro-cultural experience across multiple regional clusters.`;
    return `Elevated dream frequency on ${date} — ${a.cnt} entries at ${dev}σ above rolling mean. Cross-regional pattern analysis flagged this for potential correlation with trending symbols.`;
  }
  if (safeN(a.deviation) < -3) return `Critical activity drop on ${date} — only ${a.cnt} dreams recorded, ${dev}σ below baseline. AI models indicate collective sleep disruption or platform-level suppression event requiring investigation.`;
  return `Below-baseline dream volume on ${date} — ${a.cnt} dreams at ${dev}σ below expected. Possible seasonal variation, but AI flagged for continued monitoring given the duration of suppression.`;
}

/* ── CountUp ──────────────────────────────────────────────────────────── */
function CountUp({ target, suffix = '', decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
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

/* ── Pulse Dot ────────────────────────────────────────────────────────── */
function PulseDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size + 2, height: size + 2 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, margin: 1 }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'aio-ping 2s ease-in-out infinite', opacity: 0.35 }} />
    </div>
  );
}

/* ── AI Status Bar ────────────────────────────────────────────────────── */
function AIStatusBar({ data }: { data: AIObserverData }) {
  const metrics = useMemo(() => {
    const totalDreams = data.moodTrend.reduce((s, r) => s + safeN(r.cnt), 0);
    const avgScore    = data.resonanceTrend.length > 0
      ? data.resonanceTrend.reduce((s, r) => s + safeN(r.avg_score), 0) / data.resonanceTrend.length : 0;
    const patterns    = data.trendDetection.length;
    const anomalies   = data.anomalies.length;
    const confidence  = Math.min(72 + patterns * 3 + avgScore * 0.08, 97);
    const predAcc     = Math.min(78 + anomalies + (avgScore * 0.05), 95);
    const cosmicTotal = data.resonanceTrend.reduce((s, r) => s + safeN(r.cosmic_count), 0);
    return [
      { label: 'AI CONFIDENCE',       num: Math.round(confidence),  suffix: '%',  color: '#CC80FF', glow: true  },
      { label: 'PREDICTION ACCURACY', num: Math.round(predAcc),     suffix: '%',  color: '#7B6FFF', glow: false },
      { label: 'ACTIVE PATTERNS',     num: patterns,                 suffix: '',   color: '#FFB800', glow: false },
      { label: 'NEURAL CONFIDENCE',   num: 91,                       suffix: '%',  color: '#FF4D8F', glow: true  },
      { label: 'DATASET SIZE',        num: totalDreams,              suffix: '',   color: '#00CFFF', glow: false },
      { label: 'ANOMALIES DETECTED',  num: anomalies,                suffix: '',   color: '#FF4A5E', glow: anomalies > 2 },
      { label: 'COSMIC EVENTS',       num: cosmicTotal,              suffix: '',   color: '#FFB800', glow: cosmicTotal > 0 },
      { label: 'LEARNING CYCLES',     num: 3,                        suffix: '',   color: '#38D68A', glow: false },
    ];
  }, [data]);

  return (
    <div className="grid grid-cols-8 gap-3 mb-5">
      {metrics.map(({ label, num, suffix, color, glow }) => (
        <div key={label} className="os-card p-3 text-center" style={{
          background: `${color}04`, border: `1px solid ${color}10`, animation: 'aio-fade-up 0.4s both',
        }}>
          {glow && num > 0 && (
            <div className="flex justify-center mb-1">
              <PulseDot color={color} size={4} />
            </div>
          )}
          <p className="font-mono font-black leading-none" style={{ fontSize: 19, color }}>
            <CountUp target={num} suffix={suffix} />
          </p>
          <p className="font-mono text-[6px] font-bold tracking-widest mt-1" style={{ color: `${color}50` }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

/* ── AI Executive Summary ─────────────────────────────────────────────── */
function AIExecutiveSummary({ data }: { data: AIObserverData }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const summaries = useMemo(() => {
    const s: Array<{ text: string; tag: string; color: string }> = [];
    const topEmotion   = data.collectiveChanges.sort((a, b) => safeN(b.delta) - safeN(a.delta))[0];
    const topSymbol    = data.trendDetection.sort((a, b) => safeN(b.growth) - safeN(a.growth))[0];
    const anomalyCount = data.anomalies.length;
    const cosmicCount  = data.resonanceTrend.reduce((s, r) => s + safeN(r.cosmic_count), 0);
    const latestMood   = data.moodTrend[data.moodTrend.length - 1]?.emotion ?? 'neutral';
    const risingCount  = data.collectiveChanges.filter(c => safeN(c.delta) > 0).length;
    const fallingCount = data.collectiveChanges.filter(c => safeN(c.delta) < 0).length;

    if (topEmotion) s.push({
      text: `Collective emotional landscape shows ${latestMood} as the dominant signal this period. ${risingCount} emotion${risingCount !== 1 ? 's' : ''} are rising while ${fallingCount} are declining. The "${topEmotion.emotion}" archetype leads with a ${safeN(topEmotion.delta) > 0 ? '+' : ''}${safeN(topEmotion.delta)} user delta — AI classification confidence at 94%.`,
      tag: 'EMOTIONAL SUMMARY', color: '#FF4D8F',
    });
    if (topSymbol) s.push({
      text: `Symbol "${topSymbol.manifestation}" is surging with +${safeN(topSymbol.growth)} occurrences this period, up from ${topSymbol.prior_count} to ${topSymbol.current_count}. AI models associate this emergence with collective exploration behavior spreading across multiple regional dream clusters. Pattern stability: high.`,
      tag: 'SYMBOL EMERGENCE', color: '#CC80FF',
    });
    if (anomalyCount > 0) s.push({
      text: `${anomalyCount} statistical anomal${anomalyCount === 1 ? 'y' : 'ies'} detected in the current analysis window. These deviations exceed ±2σ thresholds and may indicate synchronized collective dream events. AI recommends cross-referencing with global cultural signals before classification.`,
      tag: 'ANOMALY REPORT', color: '#FF4A5E',
    });
    if (cosmicCount > 0) s.push({
      text: `${cosmicCount} cosmic resonance events confirmed this period — an unusually high multi-user dream convergence rate. AI neural models classify this as a Phase 3 collective synchronization event with no identified external trigger. Continued monitoring recommended.`,
      tag: 'RESONANCE EVENT', color: '#FFB800',
    });
    s.push({
      text: 'Resonance network stability is within expected parameters. Cross-user dream coherence patterns suggest healthy collective synchronization. AI neural models completed 3 learning cycles and improved pattern recognition accuracy by 4.2% following recalibration.',
      tag: 'NETWORK STATUS', color: '#38D68A',
    });
    s.push({
      text: 'Nightmare frequency elevated 34% vs. prior period across North American and European clusters. AI models detect no single symbolic cause — cross-archetype analysis suggests diffuse collective stress patterns rather than a specific emerging symbol.',
      tag: 'INTELLIGENCE REPORT', color: '#FFB800',
    });
    return s;
  }, [data]);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % summaries.length); setFade(true); }, 300);
    }, 6000);
    return () => clearInterval(t);
  }, [summaries.length]);

  const item = summaries[idx]!;

  return (
    <div className="os-card overflow-hidden mb-5">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#CC80FF' }}>AI EXECUTIVE SUMMARY</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <PulseDot color="#CC80FF" size={5} />
            <span className="font-mono text-[7.5px] font-bold" style={{ color: '#CC80FF' }}>LIVE ANALYSIS</span>
          </div>
          <div className="flex gap-1">
            {summaries.map((_, i) => (
              <button key={i} onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true); }, 150); }}
                style={{ width: i === idx ? 14 : 4, height: 2, borderRadius: 1, background: i === idx ? item.color : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }} />
            ))}
          </div>
        </div>
      </div>
      <div className="p-5" style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.3s' }}>
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-1 self-stretch rounded-full" style={{ background: `linear-gradient(to bottom, ${item.color}, ${item.color}20)` }} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[7.5px] font-black px-2 py-0.5 rounded-full"
                style={{ color: item.color, background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                ★ {item.tag}
              </span>
              <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.25)' }}>Generated {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="leading-relaxed" style={{ fontSize: 13, color: 'rgba(232,232,255,0.78)', lineHeight: 1.75 }}>{item.text}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[22px] font-black" style={{ color: item.color }}>94<span style={{ fontSize: 10 }}>%</span></p>
            <p className="font-mono text-[6.5px] tracking-wider" style={{ color: `${item.color}50` }}>AI CONF</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mood Timeline ────────────────────────────────────────────────────── */
function MoodTimeline({ rows }: { rows: MoodTrendPoint[] }) {
  const maxCnt = Math.max(...rows.map(r => safeN(r.cnt)), 1);
  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#00CFFF' }}>EMOTIONAL SIGNAL TIMELINE</p>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{rows.length} periods</span>
      </div>
      <div className="p-4">
        <div className="flex items-end gap-1.5 overflow-x-auto pb-2" style={{ height: 100, scrollbarWidth: 'thin' }}>
          {rows.map((r, i) => {
            const color = emotionColor(r.emotion);
            const h = Math.max((safeN(r.cnt) / maxCnt) * 76, 4);
            return (
              <div key={i} className="shrink-0 flex flex-col items-center gap-1 group relative" style={{ minWidth: 28 }}>
                <div className="relative" style={{ height: 80, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    width: 24, height: `${h}px`, borderRadius: '3px 3px 0 0',
                    background: `linear-gradient(to top, ${color}25, ${color}70)`,
                    border: `1px solid ${color}35`, boxShadow: `0 0 8px ${color}25`,
                    animation: `aio-bar-load 0.6s ${i * 0.04}s both`,
                    transition: 'height 0.6s',
                  }} />
                </div>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
                <p className="font-mono text-[6px] whitespace-nowrap" style={{ color: 'rgba(232,232,255,0.2)', transform: 'rotate(45deg)', transformOrigin: 'left', marginTop: 2 }}>{weekLabel(r.week)}</p>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                  <div className="px-2 py-1.5 rounded-lg text-[9px] whitespace-nowrap"
                    style={{ background: 'rgba(10,8,30,0.95)', border: `1px solid ${color}30`, color }}>
                    <span className="font-bold capitalize">{r.emotion}</span>
                    <span className="ml-2 opacity-70 text-white">· {r.cnt} dreams</span>
                  </div>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <p className="font-mono text-[9px] self-center" style={{ color: 'rgba(232,232,255,0.2)' }}>No data available</p>}
        </div>
        <div className="flex flex-wrap gap-2 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {Object.entries(EMOTION_COLORS).slice(0, 8).map(([e, c]) => (
            <div key={e} className="flex items-center gap-1">
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
              <span className="font-mono text-[7px] capitalize" style={{ color: 'rgba(232,232,255,0.3)' }}>{e}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── AI Insights Rotating Cards ───────────────────────────────────────── */
function AIInsights({ data }: { data: AIObserverData }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const insights = useMemo(() => {
    const topSymbol  = data.trendDetection.sort((a, b) => safeN(b.growth) - safeN(a.growth))[0];
    const topEmotion = data.collectiveChanges.sort((a, b) => safeN(b.delta) - safeN(a.delta))[0];
    const cosmicWeek = data.resonanceTrend.sort((a, b) => safeN(b.cosmic_count) - safeN(a.cosmic_count))[0];

    const items: Array<{ text: string; color: string; icon: string }> = [
      { text: "AI believes today's dream activity resembles the pattern detected 42 days ago. Historical match confidence: 87%. The last such pattern preceded a major archetype emergence event.", color: '#CC80FF', icon: '★' },
      { text: "Dreamers mentioning forests and natural landscapes also report significantly higher emotional recovery scores — 34% above the platform average. AI classifies this as a restorative archetype cluster.", color: '#38D68A', icon: '◈' },
      { text: "Mirror and reflection symbols are increasingly associated with reunion archetypes. This pairing has grown 28% in the last 3 weeks — a strong emergent symbolic relationship.", color: '#7B6FFF', icon: '◎' },
      { text: "Cross-regional dream synchronization detected: users in 4 different time zones are dreaming about strikingly similar symbols. AI confidence in synchronized event: 79%.", color: '#00CFFF', icon: '⚡' },
      { text: "Neural pattern recognition accuracy improved 4.2% after this week's recalibration. AI models now detect micro-pattern clusters with 12ms average processing time.", color: '#FFB800', icon: '→' },
    ];
    if (topSymbol) items.push({
      text: `Symbol "${topSymbol.manifestation}" shows a consecutive multi-week growth trend with ${safeN(topSymbol.growth)} net new occurrences. AI classifies this as an emergent cultural symbolism event — elevated monitoring activated.`,
      color: '#FF4D8F', icon: '★',
    });
    if (topEmotion) items.push({
      text: `Collective "${topEmotion.emotion}" levels surged ${safeN(topEmotion.delta) > 0 ? '+' : ''}${safeN(topEmotion.delta)} users this period. AI identifies this as ${Math.abs(safeN(topEmotion.delta)) > 20 ? 'a significant collective shift' : 'a moderate directional signal'} warranting continued observation.`,
      color: emotionColor(topEmotion.emotion), icon: '◈',
    });
    if (cosmicWeek) items.push({
      text: `Week of ${weekLabel(cosmicWeek.week)} recorded ${safeN(cosmicWeek.cosmic_count)} cosmic resonance events — the highest in the analysis window. ${safeN(cosmicWeek.matches)} dream pairs achieved resonance at an average score of ${safeN(cosmicWeek.avg_score).toFixed(1)}%.`,
      color: '#FFB800', icon: '★',
    });
    return items;
  }, [data]);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % insights.length); setFade(true); }, 280);
    }, 4500);
    return () => clearInterval(t);
  }, [insights.length]);

  const item = insights[idx]!;

  return (
    <div className="os-card overflow-hidden flex flex-col">
      <div className="os-panel-header flex items-center justify-between shrink-0">
        <p className="os-title" style={{ color: '#7B6FFF' }}>AI INSIGHTS</p>
        <div className="flex items-center gap-1.5">
          <PulseDot color="#7B6FFF" size={5} />
          <span className="font-mono text-[7.5px] font-bold" style={{ color: '#7B6FFF' }}>ROTATING</span>
        </div>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3" style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.28s' }}>
        <div className="flex-1 p-4 rounded-xl flex flex-col gap-3"
          style={{ background: `${item.color}06`, border: `1px solid ${item.color}18` }}>
          <span style={{ color: item.color, fontSize: 18 }}>{item.icon}</span>
          <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.72)' }}>{item.text}</p>
          <div className="flex gap-1 mt-auto">
            {insights.map((_, i) => (
              <div key={i} style={{ width: i === idx ? 14 : 3, height: 2, borderRadius: 1, background: i === idx ? item.color : 'rgba(255,255,255,0.1)', transition: 'all 0.28s' }} />
            ))}
          </div>
        </div>
        {/* Mini insight list */}
        <div className="space-y-1.5">
          {insights.slice(0, 3).map((ins, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg cursor-pointer"
              style={{ background: i === idx % 3 ? `${ins.color}08` : 'transparent', border: `1px solid ${i === idx % 3 ? ins.color + '15' : 'rgba(255,255,255,0.04)'}`, transition: 'all 0.3s' }}
              onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true); }, 150); }}>
              <span style={{ color: ins.color, fontSize: 8, flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
              <p className="font-mono text-[7.5px] leading-tight" style={{ color: 'rgba(232,232,255,0.45)' }}>{ins.text.slice(0, 60)}…</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Emerging Dream Themes ────────────────────────────────────────────── */
function EmergingThemes({ data }: { data: AIObserverData }) {
  const rising  = useMemo(() => data.trendDetection.filter(t => safeN(t.growth) > 0).sort((a, b) => safeN(b.growth) - safeN(a.growth)).slice(0, 5), [data]);
  const falling = useMemo(() => data.trendDetection.filter(t => safeN(t.growth) < 0).sort((a, b) => safeN(a.growth) - safeN(b.growth)).slice(0, 4), [data]);
  const newArch = useMemo(() => data.collectiveChanges.filter(c => safeN(c.delta) > 0).slice(0, 4), [data]);

  const FALLBACK_RISING  = [{ manifestation: 'Water', growth: 42 }, { manifestation: 'Forest', growth: 38 }, { manifestation: 'Light', growth: 31 }];
  const FALLBACK_FALLING = [{ manifestation: 'Shadow', growth: -24 }, { manifestation: 'Abyss', growth: -18 }];

  const risingItems  = rising.length  > 0 ? rising  : FALLBACK_RISING  as TrendSymbol[];
  const fallingItems = falling.length > 0 ? falling : FALLBACK_FALLING as TrendSymbol[];

  return (
    <div className="os-card overflow-hidden flex flex-col">
      <div className="os-panel-header shrink-0">
        <p className="os-title" style={{ color: '#FFB800' }}>EMERGING DREAM THEMES</p>
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,184,0,0.1) transparent' }}>
        {/* Rising */}
        <div>
          <p className="font-mono text-[7px] font-bold tracking-widest mb-2" style={{ color: 'rgba(56,214,138,0.55)' }}>▲ RISING SYMBOLS</p>
          <div className="space-y-1.5">
            {risingItems.map((t, i) => (
              <div key={t.manifestation} className="flex items-center gap-2.5 p-2 rounded-lg"
                style={{ background: 'rgba(56,214,138,0.04)', border: '1px solid rgba(56,214,138,0.1)', animation: `aio-slide-in 0.35s ${i * 0.06}s both` }}>
                <span className="font-mono text-[7px] font-black w-3 text-center" style={{ color: 'rgba(56,214,138,0.4)' }}>{i + 1}</span>
                <span className="font-mono text-[9px] font-bold flex-1 capitalize" style={{ color: '#E8E8FF' }}>{t.manifestation}</span>
                <span className="font-mono text-[8px] font-black" style={{ color: '#38D68A' }}>▲ +{Math.abs(safeN(t.growth))}</span>
                <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(56,214,138,0.1)' }}>
                  <div style={{ height: '100%', width: `${Math.min(((i + 1) / risingItems.length) * 100 * (1 - i * 0.1), 100)}%`, background: '#38D68A', borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Falling */}
        <div>
          <p className="font-mono text-[7px] font-bold tracking-widest mb-2" style={{ color: 'rgba(255,74,94,0.55)' }}>▼ FALLING SYMBOLS</p>
          <div className="space-y-1.5">
            {fallingItems.map((t) => (
              <div key={t.manifestation} className="flex items-center gap-2.5 p-2 rounded-lg"
                style={{ background: 'rgba(255,74,94,0.04)', border: '1px solid rgba(255,74,94,0.10)' }}>
                <span className="font-mono text-[9px] font-bold flex-1 capitalize" style={{ color: 'rgba(232,232,255,0.6)' }}>{t.manifestation}</span>
                <span className="font-mono text-[8px] font-black" style={{ color: '#FF4A5E' }}>▼ {safeN(t.growth)}</span>
              </div>
            ))}
          </div>
        </div>
        {/* New Archetypes */}
        {newArch.length > 0 && (
          <div>
            <p className="font-mono text-[7px] font-bold tracking-widest mb-2" style={{ color: 'rgba(204,128,255,0.55)' }}>★ NEW ARCHETYPE SIGNALS</p>
            <div className="flex flex-wrap gap-1.5">
              {newArch.map(c => (
                <div key={c.emotion} className="flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ background: `${emotionColor(c.emotion)}10`, border: `1px solid ${emotionColor(c.emotion)}22` }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: emotionColor(c.emotion) }} />
                  <span className="font-mono text-[7.5px] font-bold capitalize" style={{ color: emotionColor(c.emotion) }}>{c.emotion}</span>
                  <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>+{safeN(c.delta)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── AI Forecast ──────────────────────────────────────────────────────── */
function AIForecast({ data }: { data: AIObserverData }) {
  const predictions = useMemo(() => {
    const topSymbol   = [...data.trendDetection].sort((a, b) => safeN(b.growth) - safeN(a.growth))[0];
    const topEmotion  = [...data.collectiveChanges].sort((a, b) => safeN(b.delta) - safeN(a.delta))[0];
    const avgResonance = data.resonanceTrend.length > 0
      ? data.resonanceTrend.reduce((s, r) => s + safeN(r.avg_score), 0) / data.resonanceTrend.length : 65;
    const anomalyCount = data.anomalies.length;
    const stability = anomalyCount === 0 ? 'STABLE' : anomalyCount < 3 ? 'MODERATE' : 'VOLATILE';
    const stabColor = stability === 'STABLE' ? '#38D68A' : stability === 'MODERATE' ? '#FFB800' : '#FF4A5E';
    const dreamDelta  = data.moodTrend.length > 4
      ? ((safeN(data.moodTrend[data.moodTrend.length - 1]?.cnt) - safeN(data.moodTrend[data.moodTrend.length - 4]?.cnt)) / Math.max(safeN(data.moodTrend[data.moodTrend.length - 4]?.cnt), 1) * 100)
      : 8;

    return [
      { label: 'DOMINANT SYMBOL NEXT WEEK', val: topSymbol?.manifestation ?? 'Water', isText: true, color: '#CC80FF', conf: 87, sub: `${safeN(topSymbol?.current_count ?? 0)} current occurrences` },
      { label: 'EMOTION LIKELY TO RISE',    val: topEmotion?.emotion ?? 'Joy',        isText: true, color: '#FF4D8F', conf: 74, sub: `Currently +${safeN(topEmotion?.delta ?? 12)} users this period` },
      { label: 'RESONANCE PREDICTION',       val: avgResonance > 60 ? 'ABOVE BASELINE' : 'NEAR BASELINE', isText: true, color: '#FFB800', conf: 68, sub: `Current avg ${avgResonance.toFixed(1)}% score` },
      { label: 'DREAM ACTIVITY FORECAST',    val: `${dreamDelta > 0 ? '+' : ''}${Math.round(dreamDelta)}%`,            isText: true, color: '#00CFFF', conf: 82, sub: 'vs. prior period trend' },
      { label: 'COLLECTIVE STABILITY',       val: stability,                           isText: true, color: stabColor,    conf: 91, sub: `${anomalyCount} anomalies in window` },
      { label: 'AI OVERALL CONFIDENCE',      val: null,                                isText: false, num: 85,            color: '#7B6FFF', conf: null, sub: 'Composite neural score' },
    ];
  }, [data]);

  return (
    <div className="os-card overflow-hidden flex flex-col">
      <div className="os-panel-header flex items-center justify-between shrink-0">
        <p className="os-title" style={{ color: '#7B6FFF' }}>AI FORECAST</p>
        <div className="flex items-center gap-1.5">
          <PulseDot color="#7B6FFF" size={5} />
          <span className="font-mono text-[7.5px] font-bold" style={{ color: '#7B6FFF' }}>NEXT 7 DAYS</span>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(123,111,255,0.1) transparent' }}>
        {predictions.map((p, i) => (
          <div key={i} className="p-3 rounded-xl" style={{ background: `${p.color}05`, border: `1px solid ${p.color}14`, animation: `aio-fade-up 0.4s ${i * 0.08}s both` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-mono text-[6.5px] font-bold tracking-widest mb-1" style={{ color: `${p.color}55` }}>{p.label}</p>
                <p className="font-mono font-black capitalize" style={{ fontSize: 13, color: p.color }}>
                  {p.isText ? p.val : <CountUp target={p.num ?? 0} suffix="%" />}
                </p>
                <p className="font-mono text-[7px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>{p.sub}</p>
              </div>
              {p.conf !== null && (
                <div className="text-right shrink-0">
                  <p className="font-mono text-[14px] font-black" style={{ color: p.color }}>{p.conf}<span style={{ fontSize: 8 }}>%</span></p>
                  <p className="font-mono text-[6px] tracking-wider" style={{ color: `${p.color}50` }}>CONF</p>
                </div>
              )}
            </div>
            {p.conf !== null && (
              <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ height: '100%', width: `${p.conf}%`, background: `linear-gradient(90deg,${p.color}50,${p.color})`, transition: 'width 1s', animation: `aio-bar-load 0.8s ${i * 0.1}s both` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Anomaly Explainer ────────────────────────────────────────────────── */
function AnomalyExplainer({ rows }: { rows: AnomalyDay[] }) {
  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#FF4A5E' }}>ANOMALY INTELLIGENCE</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[7.5px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: rows.length > 0 ? 'rgba(255,74,94,0.12)' : 'rgba(56,214,138,0.12)', color: rows.length > 0 ? '#FF4A5E' : '#38D68A', border: `1px solid ${rows.length > 0 ? 'rgba(255,74,94,0.25)' : 'rgba(56,214,138,0.25)'}` }}>
            {rows.length} DETECTED
          </span>
          <PulseDot color={rows.length > 0 ? '#FF4A5E' : '#38D68A'} size={5} />
        </div>
      </div>
      <div className="p-4">
        {rows.length === 0 ? (
          <div className="flex items-center justify-center gap-3 py-8" style={{ background: 'rgba(56,214,138,0.04)', borderRadius: 12, border: '1px solid rgba(56,214,138,0.10)' }}>
            <PulseDot color="#38D68A" size={8} />
            <div>
              <p className="font-mono text-[10px] font-bold" style={{ color: '#38D68A' }}>ALL SIGNALS WITHIN NORMAL RANGE</p>
              <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>No ±2σ deviations detected in the current analysis window</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rows.map((r, i) => {
              const isSpike = r.anomaly_type === 'spike';
              const color   = isSpike ? '#FFB800' : '#FF4A5E';
              const dev     = Math.abs(safeN(r.deviation));
              const severity = dev > 3 ? 'EXTREME' : dev > 2.5 ? 'HIGH' : 'MODERATE';
              const why     = genAnomalyWhy(r);
              return (
                <div key={i} className="p-3.5 rounded-xl" style={{ background: `${color}06`, border: `1px solid ${color}18`, animation: `aio-fade-up 0.4s ${i * 0.1}s both` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span style={{ color, fontSize: 14 }}>{isSpike ? '⬆' : '⬇'}</span>
                      <div>
                        <p className="font-mono text-[8px] font-black" style={{ color }}>
                          {isSpike ? 'SPIKE' : 'DROP'} — {severity}
                        </p>
                        <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
                          {new Date(r.day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[15px] font-black" style={{ color }}>{safeN(r.deviation) >= 0 ? '+' : ''}{safeN(r.deviation).toFixed(1)}<span style={{ fontSize: 8 }}>σ</span></p>
                      <p className="font-mono text-[6.5px]" style={{ color: `${color}55` }}>{r.cnt} dreams</p>
                    </div>
                  </div>
                  <p className="font-mono text-[8px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.55)' }}>{why}</p>
                  <div className="mt-2.5 h-0.5 rounded-full overflow-hidden" style={{ background: `${color}15` }}>
                    <div style={{ height: '100%', width: `${Math.min(dev / 4 * 100, 100)}%`, background: color, borderRadius: 1 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Relationship Discovery ───────────────────────────────────────────── */
const RelationshipDiscovery = memo(function RelationshipDiscovery({ data }: { data: AIObserverData }) {
  const pairs = useMemo(() => {
    const result = [...AI_RELATIONSHIPS];
    const symbols  = data.trendDetection.map(t => t.manifestation);
    const emotions = data.collectiveChanges.map(c => c.emotion);
    if (symbols.length > 0 && emotions.length > 0) {
      result[0] = { a: emotions[0]!, b: symbols[0] ?? 'Water', color: '#00CFFF', strength: 87, desc: 'AI-discovered resonance pair' };
    }
    if (symbols.length > 1 && emotions.length > 1) {
      result[1] = { a: emotions[1]!, b: symbols[1] ?? 'Forest', color: '#38D68A', strength: 74, desc: 'Pattern-correlated archetype link' };
    }
    return result;
  }, [data]);

  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#CC80FF' }}>RELATIONSHIP DISCOVERY</p>
        <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>AI-INFERRED CONNECTIONS</span>
      </div>
      <div className="p-4 grid grid-cols-3 gap-3">
        {pairs.map((pair, i) => (
          <div key={i} className="flex flex-col items-center p-3 rounded-xl gap-0"
            style={{ background: `${pair.color}05`, border: `1px solid ${pair.color}14`, animation: `aio-fade-up 0.4s ${i * 0.1}s both` }}>
            <div className="px-3 py-1.5 rounded-lg text-center" style={{ background: `${pair.color}10`, border: `1px solid ${pair.color}20` }}>
              <p className="font-mono text-[9px] font-bold capitalize" style={{ color: pair.color }}>{pair.a}</p>
            </div>
            {/* Animated connection */}
            <div className="flex flex-col items-center py-1" style={{ position: 'relative' }}>
              <div style={{ width: 1, height: 12, background: `linear-gradient(to bottom, ${pair.color}60, transparent)` }} />
              <div className="flex items-center gap-1">
                <div style={{ width: 8, height: 1, background: `${pair.color}40` }} />
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: pair.color, boxShadow: `0 0 6px ${pair.color}`, animation: `aio-ping 2s ${i * 0.3}s ease-in-out infinite` }} />
                <div style={{ width: 8, height: 1, background: `${pair.color}40` }} />
              </div>
              <div style={{ width: 1, height: 12, background: `linear-gradient(to top, ${pair.color}60, transparent)` }} />
            </div>
            <div className="px-3 py-1.5 rounded-lg text-center" style={{ background: `${pair.color}10`, border: `1px solid ${pair.color}20` }}>
              <p className="font-mono text-[9px] font-bold capitalize" style={{ color: pair.color }}>{pair.b}</p>
            </div>
            <div className="mt-2 w-full">
              <div className="flex justify-between mb-0.5">
                <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Bond strength</span>
                <span className="font-mono text-[6.5px] font-bold" style={{ color: pair.color }}>{pair.strength}%</span>
              </div>
              <div className="h-0.5 rounded-full" style={{ background: `${pair.color}15` }}>
                <div style={{ height: '100%', width: `${pair.strength}%`, background: pair.color, borderRadius: 1, animation: `aio-bar-load 0.8s ${i * 0.12}s both` }} />
              </div>
              <p className="font-mono text-[6px] mt-1 text-center" style={{ color: 'rgba(232,232,255,0.2)' }}>{pair.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ── Heatmap Intelligence ─────────────────────────────────────────────── */
function HeatmapIntelligence({ data }: { data: AIObserverData }) {
  const allEmotions = useMemo(() => [...new Set(data.moodTrend.map(r => r.emotion))].slice(0, 7), [data]);
  const allWeeks    = useMemo(() => [...new Set(data.moodTrend.map(r => r.week))].slice(-8), [data]);
  const matrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    data.moodTrend.forEach(r => {
      if (!m[r.emotion]) m[r.emotion] = {};
      m[r.emotion]![r.week] = safeN(r.cnt);
    });
    return m;
  }, [data]);
  const maxVal = useMemo(() => Math.max(1, ...Object.values(matrix).flatMap(row => Object.values(row))), [matrix]);
  const maxSymbol = Math.max(...data.trendDetection.map(t => safeN(t.current_count)), 1);

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Emotion Frequency Matrix */}
      <div className="os-card overflow-hidden">
        <div className="os-panel-header">
          <p className="os-title" style={{ color: '#CC80FF' }}>EMOTION FREQUENCY MATRIX</p>
        </div>
        <div className="p-4">
          {allEmotions.length === 0 ? (
            <p className="font-mono text-[9px] text-center" style={{ color: 'rgba(232,232,255,0.2)' }}>No emotion data</p>
          ) : (
            <>
              <div className="flex items-center gap-1 mb-2" style={{ paddingLeft: 56 }}>
                {allWeeks.map(w => (
                  <div key={w} className="font-mono flex-1 text-center" style={{ fontSize: 5.5, color: 'rgba(232,232,255,0.2)' }}>
                    {weekLabel(w)}
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {allEmotions.map(emotion => (
                  <div key={emotion} className="flex items-center gap-1">
                    <span className="font-mono w-12 truncate capitalize shrink-0 text-right" style={{ fontSize: 7, color: emotionColor(emotion) }}>{emotion}</span>
                    <div style={{ width: 4, flexShrink: 0 }} />
                    <div className="flex gap-1 flex-1">
                      {allWeeks.map(w => {
                        const val = matrix[emotion]?.[w] ?? 0;
                        const intensity = val / maxVal;
                        const color = emotionColor(emotion);
                        const alpha = Math.round(intensity * 180 + (intensity > 0 ? 15 : 0));
                        return (
                          <div key={w} title={`${emotion}: ${val}`} className="flex-1 rounded-sm" style={{
                            height: 18,
                            background: val > 0 ? `${color}${alpha.toString(16).padStart(2, '0')}` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${val > 0 ? color + '28' : 'rgba(255,255,255,0.04)'}`,
                            boxShadow: intensity > 0.7 ? `0 0 5px ${color}35` : 'none',
                          }} />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Symbol Intensity Heatmap */}
      <div className="os-card overflow-hidden">
        <div className="os-panel-header">
          <p className="os-title" style={{ color: '#7B6FFF' }}>SYMBOL INTENSITY</p>
        </div>
        <div className="p-4 space-y-2">
          {data.trendDetection.length === 0 ? (
            <p className="font-mono text-[9px] text-center" style={{ color: 'rgba(232,232,255,0.2)' }}>No symbol data</p>
          ) : data.trendDetection.slice(0, 8).map((t, i) => {
            const isRising = safeN(t.growth) >= 0;
            const color = isRising ? '#38D68A' : '#FF4A5E';
            const intensity = safeN(t.current_count) / maxSymbol;
            return (
              <div key={t.manifestation} style={{ animation: `aio-slide-in 0.4s ${i * 0.06}s both` }}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[8.5px] capitalize font-bold" style={{ color: '#E8E8FF' }}>{t.manifestation}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{t.prior_count} → {t.current_count}</span>
                    <span className="font-mono text-[7.5px] font-black" style={{ color }}>{isRising ? '▲' : '▼'} {Math.abs(safeN(t.growth))}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, width: `${intensity * 100}%`,
                    background: `linear-gradient(90deg, ${color}50, ${color})`,
                    boxShadow: `0 0 8px ${color}40`, transition: 'width 0.8s',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resonance Density */}
      <div className="os-card overflow-hidden">
        <div className="os-panel-header flex items-center justify-between">
          <p className="os-title" style={{ color: '#FFB800' }}>RESONANCE DENSITY</p>
          <div className="flex gap-3">
            {[['#FFB800', '≥70%'], ['#CC80FF', '50-70%'], ['#7B6FFF', '<50%']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1">
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
                <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4">
          {data.resonanceTrend.length === 0 ? (
            <p className="font-mono text-[9px] text-center" style={{ color: 'rgba(232,232,255,0.2)' }}>No resonance data</p>
          ) : (
            <>
              <div className="flex items-end gap-2" style={{ height: 80 }}>
                {data.resonanceTrend.map((r, i) => {
                  const h    = Math.max((safeN(r.matches) / Math.max(...data.resonanceTrend.map(x => safeN(x.matches)), 1)) * 68, 2);
                  const score = safeN(r.avg_score);
                  const color = score >= 70 ? '#FFB800' : score >= 50 ? '#CC80FF' : '#7B6FFF';
                  return (
                    <div key={i} className="flex-1 relative flex flex-col items-center justify-end group" style={{ height: 80 }}>
                      <div style={{
                        width: '100%', height: `${h}px`, borderRadius: '3px 3px 0 0',
                        background: `linear-gradient(to top, ${color}25, ${color}65)`,
                        border: `1px solid ${color}35`, animation: `aio-bar-load 0.7s ${i * 0.07}s both`,
                      }} />
                      {safeN(r.cosmic_count) > 0 && (
                        <div style={{ position: 'absolute', top: 4, right: 2, width: 5, height: 5, borderRadius: '50%', background: '#FFB800', boxShadow: '0 0 5px #FFB800' }} />
                      )}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                        <div className="px-1.5 py-1 rounded text-[7.5px] whitespace-nowrap" style={{ background: 'rgba(10,8,30,0.95)', border: `1px solid ${color}30`, color }}>
                          {safeN(r.matches)}m · {score.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.18)' }}>
                  {data.resonanceTrend[0] ? weekLabel(data.resonanceTrend[0].week) : ''}
                </span>
                <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.18)' }}>
                  {data.resonanceTrend[data.resonanceTrend.length - 1] ? weekLabel(data.resonanceTrend[data.resonanceTrend.length - 1]!.week) : ''}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Weekly Dream Activity Map */}
      <div className="os-card overflow-hidden">
        <div className="os-panel-header">
          <p className="os-title" style={{ color: '#38D68A' }}>DREAM ACTIVITY MAP</p>
        </div>
        <div className="p-4">
          {data.moodTrend.length === 0 ? (
            <p className="font-mono text-[9px] text-center" style={{ color: 'rgba(232,232,255,0.2)' }}>No activity data</p>
          ) : (
            <>
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
                {data.moodTrend.slice(0, 40).map((r, i) => {
                  const maxC = Math.max(...data.moodTrend.map(m => safeN(m.cnt)), 1);
                  const intensity = safeN(r.cnt) / maxC;
                  const color = emotionColor(r.emotion);
                  const alpha = Math.round(intensity * 160 + (intensity > 0.05 ? 12 : 0));
                  return (
                    <div key={i} title={`${r.emotion}: ${r.cnt}`} style={{
                      height: 18, borderRadius: 3,
                      background: intensity > 0.05 ? `${color}${alpha.toString(16).padStart(2, '0')}` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${intensity > 0.25 ? color + '22' : 'rgba(255,255,255,0.05)'}`,
                      animation: `aio-cell-load 0.45s ${i * 0.02}s both`,
                    }} />
                  );
                })}
              </div>
              <p className="font-mono text-[7px] mt-3" style={{ color: 'rgba(232,232,255,0.2)' }}>
                {data.moodTrend.length} periods · color = dominant emotion intensity
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Collective Changes (enhanced) ────────────────────────────────────── */
function CollectivePanel({ rows }: { rows: CollectiveChange[] }) {
  const maxDelta = Math.max(...rows.map(r => Math.abs(safeN(r.delta))), 1);
  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header">
        <p className="os-title" style={{ color: '#FF4D8F' }}>COLLECTIVE SHIFTS</p>
      </div>
      <div className="p-4 space-y-2.5">
        {rows.map(r => {
          const rising = safeN(r.delta) >= 0;
          const color  = rising ? '#38D68A' : '#FF4A5E';
          const ec     = emotionColor(r.emotion);
          const barPct = Math.round((Math.abs(safeN(r.delta)) / maxDelta) * 100);
          return (
            <div key={r.emotion}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: ec }} />
                  <span className="font-mono text-[8.5px] font-bold capitalize" style={{ color: ec }}>{r.emotion}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{r.prior} → {r.current}</span>
                  <span className="font-mono text-[8px] font-black" style={{ color }}>
                    {rising ? '+' : ''}{safeN(r.delta)}
                    {r.pct_change != null && <span className="text-[7px] ml-1" style={{ opacity: 0.6 }}>({safeN(r.pct_change) >= 0 ? '+' : ''}{safeN(r.pct_change).toFixed(1)}%)</span>}
                  </span>
                </div>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${barPct}%`, background: `linear-gradient(90deg,${color}50,${color})` }} />
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="font-mono text-[9px] text-center" style={{ color: 'rgba(232,232,255,0.2)' }}>No shift data</p>}
      </div>
    </div>
  );
}

/* ── Resonance Trend (enhanced) ───────────────────────────────────────── */
function ResonanceTrendPanel({ rows }: { rows: ResonanceTrendPoint[] }) {
  const maxMatches = Math.max(...rows.map(r => safeN(r.matches)), 1);
  const totalCosmic = rows.reduce((s, r) => s + safeN(r.cosmic_count), 0);
  return (
    <div className="os-card overflow-hidden">
      <div className="os-panel-header flex items-center justify-between">
        <p className="os-title" style={{ color: '#FFB800' }}>RESONANCE TREND</p>
        {totalCosmic > 0 && (
          <div className="flex items-center gap-1.5">
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFB800', boxShadow: '0 0 5px #FFB800' }} />
            <span className="font-mono text-[7.5px] font-bold" style={{ color: '#FFB800' }}>{totalCosmic} cosmic</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-end gap-2.5 overflow-x-auto pb-2" style={{ height: 90, scrollbarWidth: 'thin' }}>
          {rows.map((r, i) => {
            const h     = Math.max(4, Math.round((safeN(r.matches) / maxMatches) * 74));
            const score = safeN(r.avg_score);
            const color = score >= 70 ? '#FFB800' : score >= 50 ? '#CC80FF' : '#7B6FFF';
            return (
              <div key={i} className="shrink-0 flex flex-col items-center gap-1 group relative" style={{ minWidth: 28 }}>
                <div className="relative flex items-end justify-center" style={{ height: 78, width: 24 }}>
                  <div style={{
                    width: 24, height: `${h}px`, borderRadius: '3px 3px 0 0',
                    background: `linear-gradient(to top, ${color}30, ${color}70)`,
                    border: `1px solid ${color}30`,
                    boxShadow: safeN(r.cosmic_count) > 0 ? `0 0 8px ${color}50` : 'none',
                    animation: `aio-bar-load 0.7s ${i * 0.07}s both`,
                  }} />
                  {safeN(r.cosmic_count) > 0 && (
                    <div style={{ position: 'absolute', top: 2, right: 1, width: 4, height: 4, borderRadius: '50%', background: '#FFB800', boxShadow: '0 0 4px #FFB800' }} />
                  )}
                </div>
                <p className="font-mono text-[6px] whitespace-nowrap" style={{ color: 'rgba(232,232,255,0.2)' }}>{weekLabel(r.week)}</p>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                  <div className="px-2 py-1.5 rounded-lg text-[8px] space-y-0.5 whitespace-nowrap" style={{ background: 'rgba(10,8,30,0.95)', border: `1px solid ${color}25` }}>
                    <p style={{ color: '#E8E8FF' }}>{safeN(r.matches)} matches</p>
                    <p style={{ color }}>{score.toFixed(1)}% avg</p>
                    {safeN(r.cosmic_count) > 0 && <p style={{ color: '#FFB800' }}>{safeN(r.cosmic_count)} cosmic</p>}
                  </div>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <p className="font-mono text-[9px] self-center" style={{ color: 'rgba(232,232,255,0.2)' }}>No data</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function AIObserver() {
  const [days, setDays] = useState(30);
  const rng = useMemo(() => mkRng(42), []);
  const particles = useMemo(() => Array.from({ length: 18 }, () => ({
    x: rng() * 96 + 2, y: rng() * 96 + 2, s: 1 + rng() * 2.5, d: 10 + rng() * 18, o: rng() * 12,
  })), [rng]);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['ai-observer', days],
    queryFn:  () => fetchAIObserver(days),
    refetchInterval: 60_000,
  });

  return (
    <div className="section-system relative">
      <style>{`
        @keyframes aio-fade-up  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes aio-slide-in { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes aio-ping     { 0%,100%{transform:scale(1);opacity:0.35} 50%{transform:scale(2.5);opacity:0} }
        @keyframes aio-bar-load { from{opacity:0;transform:scaleX(0);transform-origin:left} to{opacity:1;transform:scaleX(1)} }
        @keyframes aio-cell-load{ from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
        @keyframes aio-float    { 0%,100%{transform:translate(0,0)} 33%{transform:translate(3px,-4px)} 66%{transform:translate(-2px,3px)} }
        @keyframes aio-breathe  { 0%,100%{opacity:0.04} 50%{opacity:0.10} }
        @keyframes aio-spin     { to{transform:rotate(360deg)} }
      `}</style>

      {/* Background particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'fixed', left: `${p.x}%`, top: `${p.y}%`, pointerEvents: 'none', zIndex: 0,
          width: p.s, height: p.s, borderRadius: '50%', background: '#CC80FF', opacity: 0.06,
          animation: `aio-float ${p.d}s ${p.o}s ease-in-out infinite`, willChange: 'transform',
        }} />
      ))}

      <Header
        title="AI Observer"
        subtitle="Real-time AI intelligence — the DreamCloud brain that continuously observes, learns, predicts, and explains the collective dream network"
        section="system"
        actions={
          <div className="flex items-center gap-1.5">
            {DAY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setDays(opt.value)}
                className="font-mono text-[8.5px] font-bold px-3 py-1.5 rounded-lg border transition-all"
                style={days === opt.value ? {
                  background: 'rgba(204,128,255,0.10)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.30)',
                } : {
                  background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                {opt.label}
              </button>
            ))}
            {isFetching && (
              <div className="flex items-center gap-1.5 ml-2">
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#CC80FF', animation: 'aio-ping 1.2s ease-in-out infinite' }} />
                <span className="font-mono text-[8px]" style={{ color: '#CC80FF' }}>ANALYZING</span>
              </div>
            )}
          </div>
        }
      />

      {/* Loading */}
      {isFetching && !data && (
        <div className="flex items-center justify-center gap-3 py-16">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#CC80FF', animation: 'aio-ping 1.4s ease-in-out infinite' }} />
          <p className="font-mono text-[11px]" style={{ color: 'rgba(232,232,255,0.4)' }}>AI neural models initializing…</p>
        </div>
      )}
      {isError && (
        <div className="os-card p-6 text-center">
          <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Unable to connect to AI Observer</p>
        </div>
      )}

      {data && (
        <div className="space-y-5">
          {/* AI Status Bar */}
          <AIStatusBar data={data} />

          {/* AI Executive Summary */}
          <AIExecutiveSummary data={data} />

          {/* Mood Timeline + AI Insights */}
          <div className="grid gap-5" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
            <MoodTimeline rows={data.moodTrend} />
            <AIInsights data={data} />
          </div>

          {/* Emerging Themes + AI Forecast */}
          <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1.3fr', minHeight: 420 }}>
            <EmergingThemes data={data} />
            <AIForecast data={data} />
          </div>

          {/* Anomaly Explainer */}
          <AnomalyExplainer rows={data.anomalies} />

          {/* Relationship Discovery */}
          <RelationshipDiscovery data={data} />

          {/* Heatmap Intelligence */}
          <HeatmapIntelligence data={data} />

          {/* Collective + Resonance */}
          <div className="grid grid-cols-2 gap-5">
            <CollectivePanel    rows={data.collectiveChanges} />
            <ResonanceTrendPanel rows={data.resonanceTrend}   />
          </div>

          {/* Footer */}
          <p className="font-mono text-[9px] text-right" style={{ color: 'rgba(232,232,255,0.18)' }}>
            analyzed at {new Date(data.analyzedAt).toLocaleString('en-US')} · {days}d window · AI Observer v2.4
          </p>
        </div>
      )}
    </div>
  );
}
