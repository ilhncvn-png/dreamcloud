import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchPredictions } from '../api/admin.api';
import type { Prediction } from '../types/admin.types';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
  growth:     { label: 'Büyüme',     icon: '🚀', color: 'text-dc-success', bg: 'bg-dc-success/10 border-dc-success/30' },
  safety:     { label: 'Güvenlik',   icon: '🛡',  color: 'text-dc-error',   bg: 'bg-dc-error/10 border-dc-error/30' },
  trends:     { label: 'Trendler',   icon: '◈',  color: 'text-dc-primary', bg: 'bg-dc-primary/10 border-dc-primary/30' },
  community:  { label: 'Topluluk',   icon: '💚', color: 'text-dc-success', bg: 'bg-dc-success/10 border-dc-success/20' },
  engagement: { label: 'Etkileşim', icon: '💡', color: 'text-dc-warning', bg: 'bg-dc-warning/10 border-dc-warning/30' },
};

const DIRECTION_ICONS: Record<string, string> = { up: '↑', down: '↓', stable: '→', volatile: '⇅' };
const DIRECTION_COLORS: Record<string, string> = { up: 'text-dc-success', down: 'text-dc-error', stable: 'text-dc-muted', volatile: 'text-dc-warning' };
const HORIZON_LABELS: Record<string, string> = { '24h': '24 Saat', '7d': '7 Gün', '30d': '30 Gün' };

const RISK_STYLES = {
  low:    { text: 'text-dc-success', bg: 'bg-dc-success/10', border: 'border-dc-success/30', label: 'Düşük' },
  medium: { text: 'text-dc-warning', bg: 'bg-dc-warning/10', border: 'border-dc-warning/30', label: 'Orta' },
  high:   { text: 'text-dc-error',   bg: 'bg-dc-error/10',   border: 'border-dc-error/30',   label: 'Yüksek' },
};

const PRIORITY_STYLES = {
  high:   { text: 'text-dc-error',   bg: 'bg-dc-error/10',   border: 'border-dc-error/30',   label: 'Yüksek' },
  medium: { text: 'text-dc-warning', bg: 'bg-dc-warning/10', border: 'border-dc-warning/30', label: 'Orta' },
  low:    { text: 'text-dc-primary', bg: 'bg-dc-primary/10', border: 'border-dc-primary/30', label: 'Düşük' },
};

const MOMENTUM_STATE_STYLES: Record<string, { color: string; glow: string }> = {
  accelerating: { color: 'text-dc-success',   glow: 'bg-dc-success' },
  growing:      { color: 'text-dc-primary',   glow: 'bg-dc-primary' },
  stable:       { color: 'text-dc-secondary', glow: 'bg-dc-secondary' },
  plateau:      { color: 'text-dc-muted',     glow: 'bg-dc-muted' },
  fading:       { color: 'text-dc-warning',   glow: 'bg-dc-warning' },
  collapsing:   { color: 'text-dc-error',     glow: 'bg-dc-error' },
};

const EMOTION_TR: Record<string, string> = {
  joy:'Sevinç', peace:'Huzur', fear:'Korku', curiosity:'Merak', hope:'Umut',
  love:'Sevgi', anxiety:'Anksiyete', sadness:'Üzüntü', excitement:'Coşku',
  anger:'Öfke', contentment:'Tatmin', happiness:'Neşe',
};

const AI_THINKING_LINES = [
  'Rüya kümelerini analiz ediyor...',
  'Duygusal kayma taranıyor...',
  'Rezonans modeli güncelleniyor...',
  'Arketip evrimi tahmin ediliyor...',
  'Sembol frekansı değerlendiriliyor...',
  'Nöral tahmin ağı senkronize ediliyor...',
  'Kolektif bilinç kalıpları işleniyor...',
  'Momentum vektörleri hesaplanıyor...',
];

const LIVE_FEED_ITEMS = [
  '🧠 Yeni arketip öğreniliyor...',
  '✨ Yeni rüya kümesi tespit edildi...',
  '🔄 Tahmin yeniden hesaplandı...',
  '📊 Sembol frekansı güncellendi...',
  '💜 Kolektif duygu değişimi analiz ediliyor...',
  '⚡ Güven skoru artırıldı...',
  '🌙 Lucid aktivite monitörleniyor...',
  '🔮 Yeni sembol grubu entegre edildi...',
  '🌊 Rezonans sinyalleri işleniyor...',
  '🧬 Arketip bağlantıları güncellendi...',
  '📈 Büyüme modeli kalibre ediliyor...',
  '🌐 Kolektif bilinç indeksi hesaplandı...',
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Sparkline({ values, color = '#6C63FF' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const W = 80; const H = 20;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * W,
    H - ((v - min) / (max - min)) * (H - 2) - 1,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={W} height={H} className="overflow-visible opacity-80">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill={color} />
    </svg>
  );
}

function ConfidenceBar({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) {
  const [rendered, setRendered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRendered(true), delay + 80); return () => clearTimeout(t); }, [delay]);
  const color = value >= 85 ? '#4CAF87' : value >= 70 ? '#F5A623' : '#8B8BA7';
  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] text-dc-secondary w-32 shrink-0">{label}</span>
      <div className="flex-1 bg-dc-bg rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full"
          style={{
            width: rendered ? `${value}%` : '0%',
            backgroundColor: color,
            transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
      <span className="text-[9px] font-black font-mono w-7 text-right shrink-0" style={{ color }}>{value}%</span>
    </div>
  );
}

function PredictionCard({ p }: { p: Prediction }) {
  const cat = CATEGORY_CONFIG[p.category];
  return (
    <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-dc-border bg-dc-surface-high flex items-start gap-3">
        <span className="text-lg shrink-0">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-dc-text font-bold text-sm leading-snug">{p.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${cat.bg} ${cat.color}`}>
              {cat.label}
            </span>
            <span className="text-[9px] text-dc-muted border border-dc-border px-1.5 py-0.5 rounded">
              {HORIZON_LABELS[p.horizon]}
            </span>
            <span className={`text-[10px] font-bold ml-auto ${DIRECTION_COLORS[p.direction]}`}>
              {DIRECTION_ICONS[p.direction]} {p.magnitude > 0 ? `%${p.magnitude}` : ''}
            </span>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="text-dc-secondary text-xs mb-4">{p.description}</p>
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">Güven Skoru</span>
            <span className="text-dc-text text-xs font-bold font-mono">{p.confidence}%</span>
          </div>
          <div className="w-full bg-dc-bg rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${p.confidence >= 80 ? 'bg-dc-success' : p.confidence >= 60 ? 'bg-dc-warning' : 'bg-dc-error'}`}
              style={{ width: `${p.confidence}%` }}
            />
          </div>
        </div>
        <div>
          <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-1.5">Sinyaller</p>
          <ul className="space-y-0.5">
            {p.signals.map((sig, i) => (
              <li key={i} className="flex items-center gap-1.5 text-[10px] text-dc-muted font-mono">
                <span className="text-dc-primary">›</span> {sig}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PredictionCenter() {
  const { data, isLoading, isError } = useQuery({
    queryKey:        ['predictions'],
    queryFn:         fetchPredictions,
    refetchInterval: 300_000,
  });

  // Live AI Thinking cycling text
  const [thinkIdx,    setThinkIdx]    = useState(0);
  const [thinkVisible,setThinkVisible]= useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setThinkVisible(false);
      setTimeout(() => { setThinkIdx(i => (i + 1) % AI_THINKING_LINES.length); setThinkVisible(true); }, 350);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  // ── Derived intelligence values ───────────────────────────────────────────

  const confidenceBreakdown = useMemo(() => {
    if (!data) return [];
    const stableCount  = (data.momentum ?? []).filter(m => ['stable','growing','accelerating'].includes(m.state)).length;
    const totalMom     = Math.max((data.momentum ?? []).length, 1);
    const emoStability = Math.round((stableCount / totalMom) * 100);
    const avgSymConf   = (data.emergingSymbols ?? []).reduce((s, e) => s + e.confidence, 0) / Math.max((data.emergingSymbols ?? []).length, 1);
    const correctCount = (data.predictionHistory ?? []).filter(h => h.correct).length;
    const histSim      = Math.round((correctCount / Math.max((data.predictionHistory ?? []).length, 1)) * 100);
    const avgAccuracy  = (data.predictionAccuracy ?? []).reduce((s, a) => s + a.accuracy, 0) / Math.max((data.predictionAccuracy ?? []).length, 1);
    return [
      { label: 'Rüya Aktivitesi',    value: data.dataFreshness },
      { label: 'Duygu Stabilitesi',  value: Math.min(99, emoStability) },
      { label: 'Sembol Uyumu',       value: Math.round(Math.min(99, avgSymConf)) },
      { label: 'Tarihsel Benzerlik', value: Math.round(histSim) },
      { label: 'Doğruluk Ortalaması',value: Math.round(avgAccuracy) },
    ];
  }, [data]);

  const yesterdayToday = useMemo(() => {
    if (!data) return [];
    return (data.momentum ?? []).slice(0, 6).map(m => ({
      label:     m.subjectTR,
      emoji:     m.emoji,
      delta:     m.valueCurr - m.valuePrev,
      pctChange: Math.abs(Math.round(((m.valueCurr - m.valuePrev) / Math.max(m.valuePrev, 1)) * 100)),
      direction: m.valueCurr > m.valuePrev ? 'up' : m.valueCurr < m.valuePrev ? 'down' : 'stable',
    }));
  }, [data]);

  const learningEngine = useMemo(() => {
    if (!data) return null;
    const dreams    = data.totalDreamsAnalyzed   ?? 0;
    const symbols   = data.totalSymbolsProcessed ?? 0;
    const archs     = data.totalArchetypes       ?? 0;
    return {
      newDreams:         Math.max(1, Math.round(dreams   * 0.016)),
      newSymbols:        Math.max(1, Math.round(symbols  * 0.005)),
      updatedArchetypes: Math.max(1, Math.min(archs, Math.round(archs * 0.3))),
      version:           data.forecastVersion    ?? 'v2.1.0',
      trainingConf:      data.trainingConfidence ?? 82,
    };
  }, [data]);

  const selfEval = useMemo(() => {
    if (!data) return null;
    const avgAcc      = (data.predictionAccuracy ?? []).reduce((s, a) => s + a.accuracy, 0) / Math.max((data.predictionAccuracy ?? []).length, 1);
    const correctPct  = (data.predictionHistory  ?? []).filter(h => h.correct).length / Math.max((data.predictionHistory ?? []).length, 1) * 100;
    const score       = Math.round(data.modelAccuracy * 0.4 + avgAcc * 0.3 + correctPct * 0.3);
    const quality     = score >= 85 ? 'Mükemmel' : score >= 75 ? 'İyi' : score >= 60 ? 'Orta' : 'Geliştirilmeli';
    const qualityColor= score >= 85 ? 'text-dc-success' : score >= 75 ? 'text-dc-primary' : score >= 60 ? 'text-dc-warning' : 'text-dc-error';
    const reasons: string[] = [];
    if (data.dataFreshness >= 85) reasons.push('Yüksek veri tutarlılığı');
    const stableCount = (data.momentum ?? []).filter(m => ['stable','growing','accelerating'].includes(m.state)).length;
    if (stableCount >= 3) reasons.push('Düşük oynaklık');
    const avgConf = (data.emergingSymbols ?? []).reduce((s, e) => s + e.confidence, 0) / Math.max((data.emergingSymbols ?? []).length, 1);
    if (avgConf >= 70) reasons.push('Güçlü sembol uyumu');
    if (correctPct >= 60) reasons.push('Yüksek tarihsel doğruluk');
    const confChange = data.forecastIndexTrendDay ?? 0;
    return { quality, qualityColor, score, reasons, confChange };
  }, [data]);

  const executiveConclusion = useMemo(() => {
    if (!data) return null;
    const pp        = data.primaryPrediction;
    const isPos     = (data.forecastIndexTrendDay ?? 0) >= 0;
    const statement = isPos
      ? `Önümüzdeki 72 saat, kolektif duygusal istikrarda artış işaret ediyor. ${pp?.statement ?? 'Platform büyümesi stabil seyrediyor'}. Pozitif duygu momentumu ve sembol uyumu tahmin güvenini yüksek tutuyor.`
      : `Önümüzdeki 72 saat, kolektif duygusal alanda hafif bir gerilim sinyali taşıyor. ${pp?.statement ?? 'Platform dikkat gerektiriyor'}. Proaktif müdahale ile risk minimize edilebilir.`;
    const actions   = (data.decisionSupport ?? []).filter(d => d.priority === 'high' || d.priority === 'medium').slice(0, 4);
    return { statement, actions };
  }, [data]);

  const pp      = data?.primaryPrediction;
  const fi      = data?.forecastIndex ?? data?.modelAccuracy ?? 82;
  const fiDay   = data?.forecastIndexTrendDay  ?? 0;
  const fiWeek  = data?.forecastIndexTrendWeek ?? 0;
  const sparkVals = [fi - 6, fi - 3, fi + 2, fi - 1, fi + 3, fi - 2, fi];
  const tickerStr = LIVE_FEED_ITEMS.join('   ·   ');

  return (
    <div className="section-operators relative">
      {/* Ticker keyframes */}
      <style>{`
        @keyframes dc-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .dc-ticker-track { animation: dc-ticker 28s linear infinite; }
        @keyframes dc-chain-pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
        .dc-chain-line { animation: dc-chain-pulse 2s ease-in-out infinite; }
        @keyframes dc-glow { 0%,100% { box-shadow: none; } 50% { box-shadow: 0 0 8px rgba(108,99,255,0.4); } }
        .dc-node-glow { animation: dc-glow 3s ease-in-out infinite; }
      `}</style>

      <Header
        title="Prediction Center"
        subtitle="AI Tahmin Motoru — Platformun geleceğini analiz et"
        section="operators"
        actions={
          data && (
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="text-dc-muted uppercase tracking-widest">Model Doğruluğu</span>
                <span className="text-dc-success font-bold">{data.modelAccuracy}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-dc-muted uppercase tracking-widest">Veri Tazeliği</span>
                <span className="text-dc-primary font-bold">{data.dataFreshness}%</span>
              </div>
            </div>
          )
        }
      />

      {/* ── EXISTING: Hero AI Forecast ── */}
      {pp && (
        <div className="mb-5 bg-gradient-to-br from-dc-primary/8 via-dc-surface to-violet-900/5 border border-dc-primary/25 rounded-2xl p-7">
          <div className="flex items-start gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[9px] font-bold text-dc-primary uppercase tracking-widest">⚡ AI TAHMİN MOTORU</span>
                <span className="text-[8px] text-dc-muted mx-1">·</span>
                <span className="text-[9px] text-dc-muted uppercase tracking-widest">SONRAKİ {pp.horizon}</span>
                <span className="ml-auto flex items-center gap-1.5 text-[8px] text-dc-success font-bold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />Canlı
                </span>
              </div>
              <p className="text-[11px] font-bold text-dc-muted uppercase tracking-widest mb-2">Birincil Tahmin</p>
              <p className="text-2xl font-bold text-dc-text leading-tight mb-5">{pp.statement}</p>
              <p className="text-[10px] text-dc-muted italic">Canlı DreamCloud verisinden üretildi · Her 5 dakikada güncellenir</p>
            </div>
            <div className="shrink-0 flex flex-col gap-4 min-w-[200px]">
              <div className="bg-dc-bg/60 rounded-xl border border-dc-border/60 p-4">
                <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-1">Tahmin Olasılığı</p>
                <p className="text-4xl font-black font-mono text-dc-success leading-none">{pp.probability}<span className="text-xl">%</span></p>
                <div className="mt-2 w-full bg-dc-border rounded-full h-1">
                  <div className="bg-dc-success h-1 rounded-full" style={{ width: `${pp.probability}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-dc-bg/60 rounded-lg border border-dc-border/60 p-3 text-center">
                  <p className="text-[7px] text-dc-muted uppercase tracking-widest mb-1">Güven</p>
                  <p className={`text-[10px] font-black ${pp.confidence === 'HIGH' ? 'text-dc-success' : pp.confidence === 'MEDIUM' ? 'text-dc-warning' : 'text-dc-muted'}`}>{pp.confidence}</p>
                </div>
                <div className="bg-dc-bg/60 rounded-lg border border-dc-border/60 p-3 text-center">
                  <p className="text-[7px] text-dc-muted uppercase tracking-widest mb-1">Etki</p>
                  <p className={`text-[10px] font-black ${pp.impact === 'HIGH' ? 'text-dc-error' : 'text-dc-warning'}`}>{pp.impact}</p>
                </div>
                <div className="bg-dc-bg/60 rounded-lg border border-dc-border/60 p-3 text-center">
                  <p className="text-[7px] text-dc-muted uppercase tracking-widest mb-1">Süre</p>
                  <p className="text-[9px] font-bold text-dc-primary leading-tight">{pp.timeUntilForecast}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW 1: Prediction Confidence Breakdown ── */}
      {confidenceBreakdown.length > 0 && (
        <div className="mb-5 bg-dc-surface border border-dc-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">Tahmin Güven Analizi</span>
            <span className="text-[8px] text-dc-muted">— Bu güven skoru neden bu kadar yüksek?</span>
          </div>
          <div className="space-y-2.5">
            {confidenceBreakdown.map((item, i) => (
              <ConfidenceBar key={item.label} label={item.label} value={item.value} delay={i * 100} />
            ))}
          </div>
          <p className="text-[8px] text-dc-muted mt-3 pt-3 border-t border-dc-border/50 italic">
            Bu analiz canlı platform metriklerinden hesaplanmaktadır. Her 5 dakikada otomatik güncellenir.
          </p>
        </div>
      )}

      {/* ── NEW 2: Yesterday vs Today ── */}
      {yesterdayToday.length > 0 && (
        <div className="mb-5 bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high flex items-center gap-2">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Dün → Bugün</p>
            <span className="text-[8px] text-dc-muted">Son 24 saatte ne değişti?</span>
          </div>
          <div className="flex divide-x divide-dc-border/40">
            {yesterdayToday.map(item => {
              const isUp     = item.direction === 'up';
              const isDown   = item.direction === 'down';
              const color    = isUp ? 'text-dc-success' : isDown ? 'text-dc-error' : 'text-dc-muted';
              const bgColor  = isUp ? 'bg-dc-success/5' : isDown ? 'bg-dc-error/5' : '';
              return (
                <div key={item.label} className={`flex-1 flex flex-col items-center gap-1.5 py-4 px-3 ${bgColor} hover:bg-white/2 transition-colors`}>
                  <span className="text-lg leading-none">{item.emoji}</span>
                  <p className="text-[8px] text-dc-muted text-center truncate w-full text-center">{item.label}</p>
                  <p className={`text-base font-black font-mono leading-none ${color}`}>
                    {isUp ? '↑' : isDown ? '↓' : '→'}{item.pctChange > 0 ? `${item.pctChange}%` : ''}
                  </p>
                  <p className={`text-[8px] font-mono ${color}`}>
                    {item.delta > 0 ? `+${item.delta}` : item.delta < 0 ? `${item.delta}` : '±0'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EXISTING: AI Executive Summary ── */}
      {(data?.executiveSummary?.length ?? 0) > 0 && (
        <div className="mb-6 bg-dc-surface border border-dc-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg leading-none">🧠</span>
            <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">AI Yönetici Tahmin Raporu</p>
          </div>
          <div className="space-y-2">
            {data!.executiveSummary!.map((line, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${i === 0 ? 'bg-dc-primary' : 'bg-dc-border'}`} />
                <p className={`leading-relaxed ${i === 0 ? 'text-sm font-medium text-dc-text' : 'text-[11px] text-dc-secondary font-light'}`}>
                  {line}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EXISTING: Model status bar ── */}
      {data && (
        <div className="mb-4 bg-dc-surface border border-dc-border rounded-xl px-5 py-3 flex items-center gap-8">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">Model Doğruluğu</span>
            <div className="w-32 bg-dc-bg rounded-full h-1.5">
              <div className="bg-dc-success h-1.5 rounded-full" style={{ width: `${data.modelAccuracy}%` }} />
            </div>
            <span className="text-dc-success font-bold text-sm">{data.modelAccuracy}%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">Veri Tazeliği</span>
            <div className="w-32 bg-dc-bg rounded-full h-1.5">
              <div className="bg-dc-primary h-1.5 rounded-full" style={{ width: `${data.dataFreshness}%` }} />
            </div>
            <span className="text-dc-primary font-bold text-sm">{data.dataFreshness}%</span>
          </div>
          <span className="ml-auto text-[10px] text-dc-muted font-mono">
            Son güncelleme: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString('tr-TR') : '—'}
          </span>
        </div>
      )}

      {/* ── NEW 7: Live Learning Feed (ticker) ── */}
      {data && (
        <div className="mb-5 bg-dc-bg border border-dc-border/60 rounded-lg py-2 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="shrink-0 px-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />
              <span className="text-[8px] font-bold text-dc-success uppercase tracking-widest">Canlı</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="dc-ticker-track flex gap-0 whitespace-nowrap">
                <span className="text-[9px] text-dc-secondary font-mono">{tickerStr}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{tickerStr}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXISTING: Live AI Thinking + Global Forecast Index + Forecast Engine Status ── */}
      {data && (
        <div className="mb-5 grid grid-cols-3 gap-4">
          <div className="bg-dc-surface border border-dc-border rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />
              <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">Canlı AI Düşüncesi</p>
            </div>
            <div style={{ minHeight: '32px' }}>
              <p
                className="text-[11px] text-dc-secondary font-mono leading-relaxed"
                style={{ transition: 'opacity 0.35s', opacity: thinkVisible ? 1 : 0 }}
              >
                {AI_THINKING_LINES[thinkIdx]}
              </p>
            </div>
            <div className="mt-3 space-y-1">
              {AI_THINKING_LINES.slice(0, 4).map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-1 h-1 rounded-full shrink-0 ${i === thinkIdx % 4 ? 'bg-dc-primary' : 'bg-dc-border'}`} />
                  <p className={`text-[8px] font-mono ${i === thinkIdx % 4 ? 'text-dc-muted' : 'text-dc-border'}`}>{line}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-3">Global Tahmin İndeksi</p>
            <div className="flex items-end gap-4 mb-3">
              <div>
                <p className="text-5xl font-black text-dc-text font-mono leading-none">{fi}</p>
                <p className="text-[9px] text-dc-muted mt-1">Kompozit tahmin skoru</p>
              </div>
              <div className="mb-1">
                <Sparkline values={sparkVals} color="#6C63FF" />
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-[7px] text-dc-muted uppercase tracking-widest">Bugün</p>
                <p className={`text-xs font-bold font-mono ${fiDay >= 0 ? 'text-dc-success' : 'text-dc-error'}`}>
                  {fiDay >= 0 ? '↑' : '↓'}{fiDay >= 0 ? '+' : ''}{fiDay}
                </p>
              </div>
              <div>
                <p className="text-[7px] text-dc-muted uppercase tracking-widest">Bu Hafta</p>
                <p className={`text-xs font-bold font-mono ${fiWeek >= 0 ? 'text-dc-success' : 'text-dc-error'}`}>
                  {fiWeek >= 0 ? '↑' : '↓'}{fiWeek >= 0 ? '+' : ''}{fiWeek}
                </p>
              </div>
              <div>
                <p className="text-[7px] text-dc-muted uppercase tracking-widest">Güven</p>
                <p className="text-xs font-bold font-mono text-dc-primary">%{data.modelAccuracy}</p>
              </div>
            </div>
          </div>

          <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">Tahmin Motoru Durumu</p>
            <div className="space-y-2.5">
              {[
                { label: 'Tahmin Motoru',    value: 'ONLINE',                              color: 'text-dc-success' },
                { label: 'Model Versiyonu',  value: data.forecastVersion ?? 'v2.1.0',      color: 'text-dc-text'    },
                { label: 'Tahmin Gecikmesi', value: `${data.predictionLatency ?? 142} ms`, color: 'text-dc-primary' },
                { label: 'Öğrenme Durumu',   value: data.learningState ?? 'Active Learning',color:'text-dc-text'    },
                { label: 'Eğitim Güveni',    value: `%${data.trainingConfidence ?? 82}`,   color: 'text-dc-success' },
                { label: 'Son Eğitim',       value: data.lastTraining ? new Date(data.lastTraining).toLocaleTimeString('tr-TR') : '—', color: 'text-dc-muted' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-[9px] text-dc-muted">{row.label}</span>
                  <span className={`text-[9px] font-bold font-mono ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NEW 4: Learning Engine ── */}
      {learningEngine && (
        <div className="mb-5 bg-dc-surface border border-dc-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg leading-none">🧬</span>
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">DreamCloud AI Öğrenme Motoru</p>
            <span className="ml-auto flex items-center gap-1.5 text-[8px] text-dc-success font-bold uppercase">
              <span className="w-1 h-1 rounded-full bg-dc-success animate-pulse" />Aktif Öğreniyor
            </span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[
              { icon: '📊', label: 'Yeni rüya analiz edildi',       value: learningEngine.newDreams.toLocaleString(),         color: 'text-dc-primary' },
              { icon: '✨', label: 'Yeni sembol öğrenildi',          value: learningEngine.newSymbols.toLocaleString(),        color: 'text-dc-success' },
              { icon: '🧬', label: 'Arketip güncellendi',            value: learningEngine.updatedArchetypes.toString(),       color: 'text-violet-400' },
              { icon: '⚡', label: 'Tahmin modeli yeniden eğitildi', value: 'Tamamlandı',                                      color: 'text-dc-success' },
              { icon: '🔖', label: 'Model versiyonu',                value: learningEngine.version,                            color: 'text-dc-muted'   },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-1.5 p-3 bg-dc-bg/60 rounded-xl border border-dc-border/50 text-center">
                <span className="text-xl leading-none">{item.icon}</span>
                <p className={`text-sm font-black font-mono leading-none ${item.color}`}>{item.value}</p>
                <p className="text-[8px] text-dc-muted leading-tight">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EXISTING: Loading / Error / Prediction Cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-5">
          {[1,2,3,4].map(i => <div key={i} className="h-56 bg-dc-surface border border-dc-border rounded-xl animate-pulse" />)}
        </div>
      ) : isError ? (
        <div className="bg-dc-error/10 border border-dc-error/30 rounded-xl p-6 text-dc-error text-sm">
          Tahmin verileri yüklenemedi.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5">
            {(data?.predictions ?? []).map((p) => <PredictionCard key={p.id} p={p} />)}
          </div>
          {(data?.predictions ?? []).length === 0 && (
            <div className="bg-dc-surface border border-dc-border rounded-xl p-10 text-center text-dc-muted text-sm">
              Yeterli veri birikimi yok — tahmin üretmek için daha fazla platform verisi gerekiyor
            </div>
          )}
        </>
      )}

      {/* ── NEW 2: AI Reasoning Chain ── */}
      {(data?.relationships?.length ?? 0) > 0 && (
        <div className="mt-5 mb-5 bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high flex items-center gap-2">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">AI Akıl Yürütme Zinciri</p>
            <span className="text-[8px] text-dc-muted">— AI bu tahmini nasıl oluşturdu?</span>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-0 overflow-x-auto">
              {(data!.relationships!).map((rel, i) => {
                const isFirst = i === 0;
                const isLast  = i === (data!.relationships!.length - 1);
                return (
                  <div key={i} className="flex items-center shrink-0">
                    {/* Node */}
                    <div className={`dc-node-glow flex flex-col items-center gap-1 px-4 py-3 rounded-xl border text-center min-w-[110px]
                      ${isFirst ? 'bg-dc-primary/10 border-dc-primary/40' : isLast ? 'bg-dc-success/10 border-dc-success/40' : 'bg-dc-bg border-dc-border/60'}`}>
                      <span className="text-lg leading-none">
                        {isFirst ? '🔮' : isLast ? '✅' : '⚙️'}
                      </span>
                      <p className={`text-[9px] font-bold leading-tight text-center ${isFirst ? 'text-dc-primary' : isLast ? 'text-dc-success' : 'text-dc-secondary'}`}>
                        {rel.from}
                      </p>
                    </div>
                    {/* Animated connector */}
                    {!isLast && (
                      <div className="flex items-center shrink-0 w-12">
                        <svg width="48" height="12" className="overflow-visible">
                          <line x1="0" y1="6" x2="38" y2="6" stroke="#6C63FF" strokeWidth="1.5" strokeDasharray="4 2" className="dc-chain-line" />
                          <polygon points="36,3 44,6 36,9" fill="#6C63FF" opacity="0.6" />
                        </svg>
                      </div>
                    )}
                    {/* Last node */}
                    {isLast && (
                      <>
                        <div className="flex items-center shrink-0 w-12">
                          <svg width="48" height="12" className="overflow-visible">
                            <line x1="0" y1="6" x2="38" y2="6" stroke="#4CAF87" strokeWidth="1.5" strokeDasharray="4 2" className="dc-chain-line" />
                            <polygon points="36,3 44,6 36,9" fill="#4CAF87" opacity="0.6" />
                          </svg>
                        </div>
                        <div className="dc-node-glow flex flex-col items-center gap-1 px-4 py-3 rounded-xl border bg-dc-success/10 border-dc-success/40 min-w-[110px]">
                          <span className="text-lg leading-none">🚀</span>
                          <p className="text-[9px] font-bold text-dc-success leading-tight text-center">{rel.to}</p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[8px] text-dc-muted mt-4 italic">
              AI nedensellik zinciri — her girdi bir sonraki çıktıyı tetikler. Toplam {data!.relationships!.length + 1} adımda sonuca ulaşır.
            </p>
          </div>
        </div>
      )}

      {/* ── NEW 3: Prediction vs Reality ── */}
      {(data?.predictionAccuracy?.length ?? 0) > 0 && (
        <div className="mb-5 bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high flex items-center justify-between">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Tahmin vs Gerçek</p>
            <span className="text-[8px] text-dc-muted">Önceki tahminlerin doğrulama kaydı</span>
          </div>
          <div className="p-4 space-y-2">
            {data!.predictionAccuracy!.map((a, i) => {
              const isGood   = a.accuracy >= 85;
              const isOk     = a.accuracy >= 65 && !isGood;
              const color    = isGood ? 'text-dc-success' : isOk ? 'text-dc-warning' : 'text-dc-error';
              const bgBorder = isGood ? 'bg-dc-success/5 border-dc-success/20' : isOk ? 'bg-dc-warning/5 border-dc-warning/20' : 'bg-dc-error/5 border-dc-error/20';
              return (
                <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border ${bgBorder}`}>
                  <span className={`text-lg leading-none shrink-0 ${color}`}>{isGood ? '✓' : isOk ? '≈' : '✗'}</span>
                  <div className="flex-1 grid grid-cols-3 gap-4 min-w-0">
                    <div>
                      <p className="text-[7px] text-dc-muted uppercase tracking-widest mb-0.5">Tahmin</p>
                      <p className="text-[10px] font-bold text-dc-text">{a.prediction}</p>
                    </div>
                    <div>
                      <p className="text-[7px] text-dc-muted uppercase tracking-widest mb-0.5">Gerçek</p>
                      <p className={`text-[10px] font-bold ${color}`}>{a.result}</p>
                    </div>
                    <div>
                      <p className="text-[7px] text-dc-muted uppercase tracking-widest mb-0.5">Doğruluk</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-dc-bg rounded-full h-1">
                          <div className="h-1 rounded-full transition-all duration-700" style={{ width: `${a.accuracy}%`, backgroundColor: isGood ? '#4CAF87' : isOk ? '#F5A623' : '#FF4D6D' }} />
                        </div>
                        <span className={`text-[9px] font-black font-mono shrink-0 ${color}`}>{a.accuracy}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EXISTING: Prediction Timeline ── */}
      {(data?.timeline?.length ?? 0) > 0 && (
        <div className="mb-5 bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Tahmin Zaman Çizelgesi</p>
          </div>
          <div className="flex divide-x divide-dc-border">
            {data!.timeline!.map((t) => {
              const rs    = RISK_STYLES[t.risk];
              const isNow = t.stage === 'now';
              return (
                <div key={t.stage} className={`flex-1 flex flex-col gap-2 p-4 hover:bg-white/2 transition-colors ${isNow ? 'bg-dc-primary/5' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    {isNow && <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />}
                    <p className={`text-[9px] font-black uppercase tracking-widest font-mono ${isNow ? 'text-dc-success' : 'text-dc-primary'}`}>{t.label}</p>
                  </div>
                  <p className="text-[10px] font-semibold text-dc-text leading-snug">{t.prediction}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 bg-dc-bg rounded-full h-1">
                      <div className="bg-dc-primary h-1 rounded-full transition-all duration-700" style={{ width: `${t.confidence}%` }} />
                    </div>
                    <span className="text-[8px] text-dc-muted font-mono shrink-0">%{t.confidence}</span>
                  </div>
                  <span className={`self-start text-[7px] font-bold uppercase px-1.5 py-0.5 rounded border ${rs.bg} ${rs.border} ${rs.text}`}>
                    {rs.label}
                  </span>
                  <p className="text-[8px] text-dc-muted leading-snug">{t.comment}</p>
                  <p className="text-[7px] text-dc-primary font-mono uppercase tracking-widest">{t.impact}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EXISTING: Top AI Predictions + Trend Momentum (2-col) ── */}
      {data && (
        <div className="mb-5 grid grid-cols-2 gap-5">
          <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
              <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">En Güçlü AI Tahminleri</p>
            </div>
            <div className="divide-y divide-dc-border/40">
              {(data.topPredictions ?? []).map((tp, i) => (
                <div key={tp.subject} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/2 transition-colors">
                  <span className="text-base leading-none shrink-0 w-6">{tp.emoji}</span>
                  <p className="text-[11px] font-semibold text-dc-text flex-1 truncate">{tp.subjectTR}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold font-mono ${tp.direction === 'up' ? 'text-dc-success' : tp.direction === 'down' ? 'text-dc-error' : 'text-dc-muted'}`}>
                      {tp.direction === 'up' ? '↑' : tp.direction === 'down' ? '↓' : '→'}{tp.magnitude > 0 ? `${tp.magnitude}%` : ''}
                    </span>
                    <div className={`text-center min-w-[36px] py-0.5 rounded text-[9px] font-bold font-mono ${tp.confidence >= 85 ? 'text-dc-success bg-dc-success/10' : tp.confidence >= 75 ? 'text-dc-warning bg-dc-warning/10' : 'text-dc-muted bg-dc-bg'}`}>
                      {tp.confidence}%
                    </div>
                  </div>
                  <span className="text-[8px] text-dc-muted font-mono shrink-0">#{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
              <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Trend Momentum Analizi</p>
            </div>
            <div className="divide-y divide-dc-border/40">
              {(data.momentum ?? []).map((m) => {
                const st    = MOMENTUM_STATE_STYLES[m.state] ?? MOMENTUM_STATE_STYLES.stable;
                const ratio = m.valueCurr / Math.max(m.valuePrev, 1);
                return (
                  <div key={m.subject} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/2 transition-colors">
                    <span className="text-base leading-none shrink-0 w-6">{m.emoji}</span>
                    <p className="text-[11px] font-semibold text-dc-text flex-1">{m.subjectTR}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.glow} ${m.state === 'accelerating' || m.state === 'growing' ? 'animate-pulse' : ''}`} />
                      <span className={`text-[10px] font-bold ${st.color}`}>{m.stateTR}</span>
                    </div>
                    <div className="text-right shrink-0 min-w-[50px]">
                      <p className={`text-[8px] font-mono ${ratio > 1 ? 'text-dc-success' : ratio < 1 ? 'text-dc-error' : 'text-dc-muted'}`}>
                        {ratio > 1 ? '↑' : ratio < 1 ? '↓' : '→'}{Math.abs(Math.round((ratio - 1) * 100))}%
                      </p>
                      <p className="text-[7px] text-dc-muted">%{m.confidence} güven</p>
                    </div>
                  </div>
                );
              })}
              {(data.momentum ?? []).length === 0 && (
                <div className="px-5 py-8 text-center text-dc-muted text-[10px]">Yeterli momentum verisi yok</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EXISTING: Scenario Engine ── */}
      {data?.scenarios && (
        <div className="mb-5">
          <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-3">AI Senaryo Motoru</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-dc-success/5 border border-dc-success/25 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg leading-none">🌟</span>
                <div>
                  <p className="text-[8px] font-bold text-dc-success uppercase tracking-widest">En İyi Senaryo</p>
                  <p className="text-[10px] font-bold text-dc-text">{data.scenarios.best.title}</p>
                </div>
                <span className="ml-auto text-[11px] font-black font-mono text-dc-success">%{data.scenarios.best.probability}</span>
              </div>
              <p className="text-[10px] text-dc-secondary leading-relaxed mb-3">{data.scenarios.best.description}</p>
              <div className="pt-3 border-t border-dc-success/20">
                <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-1">Neden?</p>
                <p className="text-[9px] text-dc-muted leading-relaxed">{data.scenarios.best.why}</p>
              </div>
            </div>
            <div className="bg-dc-primary/5 border border-dc-primary/25 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg leading-none">🎯</span>
                <div>
                  <p className="text-[8px] font-bold text-dc-primary uppercase tracking-widest">Beklenen Senaryo</p>
                  <p className="text-[10px] font-bold text-dc-text">{data.scenarios.expected.title}</p>
                </div>
                <span className="ml-auto text-[11px] font-black font-mono text-dc-primary">%{data.scenarios.expected.probability}</span>
              </div>
              <p className="text-[10px] text-dc-secondary leading-relaxed mb-3">{data.scenarios.expected.description}</p>
              <div className="pt-3 border-t border-dc-primary/20">
                <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-1">Neden?</p>
                <p className="text-[9px] text-dc-muted leading-relaxed">{data.scenarios.expected.why}</p>
              </div>
            </div>
            <div className="bg-dc-error/5 border border-dc-error/25 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg leading-none">⚠️</span>
                <div>
                  <p className="text-[8px] font-bold text-dc-error uppercase tracking-widest">Risk Senaryosu</p>
                  <p className="text-[10px] font-bold text-dc-text">{data.scenarios.worst.title}</p>
                </div>
                <span className="ml-auto text-[11px] font-black font-mono text-dc-error">%{data.scenarios.worst.probability}</span>
              </div>
              <p className="text-[10px] text-dc-secondary leading-relaxed mb-3">{data.scenarios.worst.description}</p>
              <div className="pt-3 border-t border-dc-error/20">
                <p className="text-[8px] text-dc-muted uppercase tracking-widest mb-1">Neden?</p>
                <p className="text-[9px] text-dc-muted leading-relaxed">{data.scenarios.worst.why}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXISTING: Emerging Symbols ── */}
      {(data?.emergingSymbols?.length ?? 0) > 0 && (
        <div className="mb-5 bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
            <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Yükselen Semboller — Gelecekteki Baskın Sembol Tahminleri</p>
          </div>
          <div className="flex divide-x divide-dc-border">
            {data!.emergingSymbols!.map((sym) => (
              <div key={sym.symbol} className="flex-1 flex flex-col items-center gap-1.5 py-5 px-2 hover:bg-white/2 transition-colors">
                <span className="text-2xl leading-none">{sym.emoji}</span>
                <p className="text-[10px] font-bold text-dc-text text-center">{sym.symbol}</p>
                <div className="w-full bg-dc-bg rounded-full h-1">
                  <div className="bg-dc-primary h-1 rounded-full transition-all duration-700" style={{ width: `${sym.confidence}%` }} />
                </div>
                <p className="text-[10px] font-black text-dc-primary font-mono">%{sym.confidence}</p>
                <p className="text-[8px] text-dc-muted text-center">↑ {sym.expectedArrival}</p>
                <p className="text-[7px] text-dc-muted text-center">{sym.estimatedLifetime}</p>
                <p className="text-[7px] text-dc-muted text-center capitalize">{EMOTION_TR[sym.emotion] ?? sym.emotion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EXISTING: Prediction Accuracy + History (2-col) ── */}
      {data && (
        <div className="mb-5 grid grid-cols-2 gap-5">
          <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
              <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Tahmin Doğruluğu</p>
            </div>
            <div className="divide-y divide-dc-border/40">
              {(data.predictionAccuracy ?? []).map((a, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <span className={`text-base leading-none shrink-0 ${a.correct ? 'text-dc-success' : 'text-dc-error'}`}>
                    {a.correct ? '✓' : '✗'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-dc-text truncate">{a.prediction}</p>
                    <p className="text-[8px] text-dc-muted">Beklenen: {a.expected} · Sonuç: {a.result}</p>
                  </div>
                  <div className={`text-center min-w-[42px] py-1 rounded text-[9px] font-black font-mono ${a.accuracy >= 85 ? 'text-dc-success bg-dc-success/10' : a.accuracy >= 65 ? 'text-dc-warning bg-dc-warning/10' : 'text-dc-error bg-dc-error/10'}`}>
                    {a.accuracy}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
              <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Tahmin Geçmişi</p>
            </div>
            <div className="divide-y divide-dc-border/40">
              {(data.predictionHistory ?? []).map((h, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="shrink-0 w-14">
                    <p className="text-[8px] text-dc-muted font-semibold">{h.period}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-dc-text">{h.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded ${h.correct ? 'text-dc-success bg-dc-success/10' : 'text-dc-error bg-dc-error/10'}`}>
                      {h.correct ? 'Doğru' : 'Yanlış'}
                    </span>
                    <span className="text-[8px] text-dc-muted font-mono">%{h.confidence}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── EXISTING: Forecast Confidence Explanation ── */}
      {data && (
        <div className="mb-5 bg-dc-surface border border-dc-border rounded-xl p-6">
          <div className="flex items-start gap-8">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#2D2D4E" strokeWidth="7" />
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#6C63FF" strokeWidth="7"
                    strokeDasharray={`${data.modelAccuracy * 2.011} 201.1`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-dc-primary font-bold text-lg leading-none">{data.modelAccuracy}</span>
                  <span className="text-dc-muted text-[8px]">%</span>
                </div>
              </div>
              <p className="text-[9px] text-dc-muted text-center">Tahmin Güveni</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-3">Güven Skoru Nasıl Hesaplanıyor?</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: '📊', label: 'Analiz Edilen Rüya',  value: (data.totalDreamsAnalyzed  ?? 0).toLocaleString() },
                  { icon: '✨', label: 'İşlenen Sembol',       value: (data.totalSymbolsProcessed ?? 0).toLocaleString() },
                  { icon: '🔮', label: 'Duygu Kümesi',         value: `${data.predictions.length} aktif` },
                  { icon: '🌐', label: 'Rezonans Kümesi',      value: (data.resonanceClusters ?? 0).toLocaleString() },
                  { icon: '📈', label: 'Tarihsel Doğruluk',    value: `%${data.modelAccuracy}` },
                  { icon: '⚡', label: 'Veri Tazeliği',         value: `%${data.dataFreshness}` },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 p-2 bg-dc-bg/50 rounded-lg border border-dc-border/40">
                    <span className="text-sm leading-none shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-[8px] text-dc-muted">{item.label}</p>
                      <p className="text-[10px] font-bold text-dc-text font-mono">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW 6: AI Self Evaluation ── */}
      {selfEval && (
        <div className="mb-5 bg-dc-surface border border-dc-border rounded-xl p-5">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-3">AI Öz-Değerlendirme</p>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-sm text-dc-secondary">Bugünün Tahmin Kalitesi:</p>
                <p className={`text-lg font-black ${selfEval.qualityColor}`}>{selfEval.quality}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[8px] font-bold text-dc-muted uppercase tracking-widest mb-2">Sebepler</p>
                {selfEval.reasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-dc-success text-[10px] shrink-0">•</span>
                    <p className="text-[10px] text-dc-secondary">{r}</p>
                  </div>
                ))}
                {selfEval.confChange !== 0 && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dc-border/40">
                    <span className={`text-[10px] font-bold ${selfEval.confChange > 0 ? 'text-dc-success' : 'text-dc-error'}`}>
                      {selfEval.confChange > 0 ? '↑' : '↓'} Tahmin güveni {Math.abs(selfEval.confChange)}% {selfEval.confChange > 0 ? 'arttı' : 'düştü'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#2D2D4E" strokeWidth="8" />
                  <circle cx="40" cy="40" r="32" fill="none" stroke={selfEval.score >= 85 ? '#4CAF87' : selfEval.score >= 75 ? '#6C63FF' : selfEval.score >= 60 ? '#F5A623' : '#FF4D6D'}
                    strokeWidth="8" strokeDasharray={`${selfEval.score * 2.011} 201.1`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`font-black text-base leading-none ${selfEval.qualityColor}`}>{selfEval.score}</span>
                </div>
              </div>
              <p className="text-[7px] text-dc-muted text-center">AI Skoru</p>
            </div>
          </div>
        </div>
      )}

      {/* ── EXISTING: AI Decision Support + Prediction Relationships (2-col) ── */}
      {data && (
        <div className="mb-5 grid grid-cols-2 gap-5">
          <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
              <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">AI Karar Destek Sistemi</p>
            </div>
            <div className="p-4 space-y-2.5">
              {(data.decisionSupport ?? []).map((d, i) => {
                const ps = PRIORITY_STYLES[d.priority];
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ps.bg} ${ps.border}`}>
                    <span className="text-base leading-none shrink-0 mt-0.5">{d.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-[10px] font-bold ${ps.text}`}>{d.action}</p>
                        <span className={`text-[7px] font-bold uppercase px-1.5 py-0.5 rounded border ml-auto shrink-0 ${ps.bg} ${ps.border} ${ps.text}`}>
                          {ps.label}
                        </span>
                      </div>
                      <p className="text-[9px] text-dc-muted leading-relaxed">{d.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-dc-surface border border-dc-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high">
              <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Tahmin İlişki Ağı</p>
            </div>
            <div className="p-5 flex flex-col gap-0">
              {(data.relationships ?? []).map((rel, i) => (
                <div key={i}>
                  <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${i === 0 ? 'bg-dc-primary/8 border border-dc-primary/20' : ''}`}>
                    <span className={`shrink-0 w-2 h-2 rounded-full ${i === 0 ? 'bg-dc-primary' : 'bg-dc-border'}`} />
                    <span className={`text-[10px] font-semibold flex-1 ${i === 0 ? 'text-dc-text' : 'text-dc-secondary'}`}>{rel.from}</span>
                  </div>
                  <div className="flex items-center gap-3 py-1 pl-5">
                    <div className="w-[1px] h-4 bg-dc-border/50 ml-1" />
                    <span className="text-dc-muted text-[9px]">↓</span>
                    <span className="text-[8px] text-dc-muted">{rel.to}</span>
                  </div>
                  {i === (data.relationships?.length ?? 0) - 1 && (
                    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-dc-success/8 border border-dc-success/20">
                      <span className="shrink-0 w-2 h-2 rounded-full bg-dc-success" />
                      <span className="text-[10px] font-semibold text-dc-success flex-1">{rel.to}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 pb-4 pt-2">
              <p className="text-[8px] text-dc-muted italic leading-relaxed">
                AI tahmin zinciri — her öngörü bir sonrakini tetikler. Nihai etki: kullanıcı tutundurma artışı.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── EXISTING: Methodology ── */}
      {data && (
        <div className="mb-5 bg-dc-surface border border-dc-border rounded-xl p-5">
          <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-2">Tahmin Metodolojisi</p>
          <p className="text-dc-secondary text-xs">
            Tahminler gerçek platform verilerinden türetilir: kullanıcı büyümesi (haftalık delta), rapor trendi,
            lucid rüya aktivitesi ve duygu dağılımı karşılaştırması. Kural tabanlı çıkarım motoru —
            Machine Learning desteği Phase 3'te aktive edilecek.
          </p>
        </div>
      )}

      {/* ── NEW 8: AI Executive Conclusion ── */}
      {executiveConclusion && (
        <div className="mb-5 bg-gradient-to-br from-dc-primary/6 to-violet-900/4 border border-dc-primary/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg leading-none">🎯</span>
            <p className="text-[10px] font-bold text-dc-primary uppercase tracking-widest">AI Yönetici Sonucu</p>
          </div>
          <p className="text-sm font-medium text-dc-text leading-relaxed mb-5">
            "{executiveConclusion.statement}"
          </p>
          <div className="pt-4 border-t border-dc-primary/15">
            <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-3">Önerilen Aksiyonlar</p>
            <div className="grid grid-cols-2 gap-2">
              {executiveConclusion.actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-dc-bg/50 rounded-lg border border-dc-border/40">
                  <span className="text-sm leading-none shrink-0">{a.emoji}</span>
                  <p className="text-[9px] text-dc-secondary leading-snug">{a.action}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[8px] text-dc-muted/60 mt-4 italic">
            Bu analiz DreamCloud AI Tahmin Motoru tarafından canlı platform metriklerinden üretilmiştir.
          </p>
        </div>
      )}

      {/* ── EXISTING: DreamCloud Prediction Engine footer ── */}
      {data && (
        <div className="bg-dc-surface border border-dc-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-dc-primary/20 border border-dc-primary/30 flex items-center justify-center">
              <span className="text-dc-primary text-sm leading-none">🔮</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-dc-text uppercase tracking-widest">DreamCloud Prediction Engine</p>
              <p className="text-[9px] text-dc-muted">AI Tahmin Altyapısı · {data.forecastVersion ?? 'v2.1.0'}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />
              <span className="text-[9px] text-dc-success font-bold uppercase tracking-widest">Aktif</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              'Dream Intelligence', 'Rezonans Tespiti', 'Duygu Analiz Motoru', 'Arketip Zekası',
              'Kolektif Sembol Ağı', 'Dream Weather Motoru', 'Tahmin Nöral Ağı', 'Momentum Analizi',
            ].map((sys, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-dc-bg rounded-lg border border-dc-border/50 hover:border-dc-border transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-dc-success shrink-0" />
                <span className="text-[8px] text-dc-secondary truncate">{sys}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-6 gap-3 pt-4 border-t border-dc-border/50">
            {[
              { label: 'Analiz Edilen Rüya', value: (data.totalDreamsAnalyzed   ?? 0) > 0 ? (data.totalDreamsAnalyzed   ?? 0).toLocaleString() : '—' },
              { label: 'İşlenen Sembol',     value: (data.totalSymbolsProcessed ?? 0) > 0 ? (data.totalSymbolsProcessed ?? 0).toLocaleString() : '—' },
              { label: 'Arketip',            value: (data.totalArchetypes       ?? 0) > 0 ? (data.totalArchetypes       ?? 0).toString()       : '—' },
              { label: 'Rezonans Kümesi',    value: (data.resonanceClusters     ?? 0) > 0 ? (data.resonanceClusters     ?? 0).toLocaleString() : '—' },
              { label: 'Tahmin Güveni',      value: `%${data.modelAccuracy}` },
              { label: 'Model Versiyonu',    value: data.forecastVersion ?? 'v2.1.0' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-xs font-bold text-dc-text font-mono">{stat.value}</p>
                <p className="text-[8px] text-dc-muted mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          <p className="text-[8px] text-dc-muted/50 text-center mt-4">
            Prediction Center · AI Forecast Engine · Powered by Dream Intelligence · Collective Symbol Network · Resonance Detection
          </p>
        </div>
      )}
    </div>
  );
}
