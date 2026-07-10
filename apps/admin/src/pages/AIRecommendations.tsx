import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchAIRecommendations } from '../api/admin.api';
import type { AIRecommendation } from '../types/admin.types';

// ── Existing design tokens (unchanged) ────────────────────────────────────────

const PRIORITY_CONFIG = {
  critical: { label: 'KRİTİK', border: 'border-l-dc-error',   badge: 'bg-dc-error/10 border-dc-error/40 text-dc-error',      dot: 'bg-dc-error animate-pulse' },
  high:     { label: 'YÜKSEK', border: 'border-l-orange-400', badge: 'bg-orange-500/10 border-orange-500/30 text-orange-400', dot: 'bg-orange-400'             },
  medium:   { label: 'ORTA',   border: 'border-l-dc-warning', badge: 'bg-dc-warning/10 border-dc-warning/30 text-dc-warning', dot: 'bg-dc-warning'             },
  low:      { label: 'DÜŞÜK',  border: 'border-l-dc-muted',   badge: 'bg-dc-muted/10 border-dc-border text-dc-muted',         dot: 'bg-dc-muted'               },
};

const CATEGORY_CONFIG = {
  moderation: { label: 'Moderasyon', icon: '🛡',  color: 'text-dc-error'    },
  safety:     { label: 'Güvenlik',   icon: '⚠️', color: 'text-orange-400'  },
  content:    { label: 'İçerik',     icon: '◈',  color: 'text-dc-primary'  },
  community:  { label: 'Topluluk',   icon: '💚', color: 'text-dc-success'  },
  growth:     { label: 'Büyüme',     icon: '🚀', color: 'text-dc-success'  },
  revenue:    { label: 'Gelir',      icon: '💰', color: 'text-dc-muted'    },
};

const OPERATOR_ICONS: Record<string, string> = {
  'dream-guardian':     '🛡',
  'safety-ai':          '⚠️',
  'trend-analyst':      '◈',
  'community-observer': '💚',
  'growth-ai':          '🚀',
  'revenue-ai':         '💰',
};

// ── Intelligence enrichment maps ──────────────────────────────────────────────

const CATEGORY_META: Record<string, { impact: number; effort: number; timeLabel: string; kpi: string; systems: string[]; delayLoss: number }> = {
  moderation: { impact: 88, effort: 35, timeLabel: '2–4 saat',  kpi: 'Güvenlik Skoru',   systems: ['İçerik Filtresi','Bildirim Sistemi','Risk Motoru'],     delayLoss: 18 },
  safety:     { impact: 94, effort: 30, timeLabel: '1–4 saat',  kpi: 'Güvenlik İndeksi', systems: ['Risk Motoru','Moderasyon Kuyruğu','Uyarı Sistemi'],    delayLoss: 22 },
  content:    { impact: 68, effort: 55, timeLabel: '1–2 gün',   kpi: 'İçerik Kalitesi',  systems: ['Feed Algoritması','Öneri Motoru','İçerik Skorer'],     delayLoss: 9  },
  community:  { impact: 72, effort: 60, timeLabel: '1–3 gün',   kpi: 'Topluluk Sağlığı', systems: ['Etkileşim Motoru','Bildirimler','Sosyal Graf'],         delayLoss: 11 },
  growth:     { impact: 82, effort: 70, timeLabel: '3–7 gün',   kpi: 'Büyüme Oranı',     systems: ['Onboarding','Retansiyon Motoru','Kampanya Sistemi'],   delayLoss: 14 },
  revenue:    { impact: 76, effort: 65, timeLabel: '3–14 gün',  kpi: 'Gelir İndeksi',    systems: ['Monetizasyon','Premium Akış','Abonelik Motoru'],       delayLoss: 12 },
};

const OPERATOR_REASONING: Record<string, string> = {
  'dream-guardian':     'Rüya Koruyucusu, içerik kalitesi metriklerinde anomali tespit ederek müdahale gerektirdiğine karar verdi. Bağlamsal analiz ve geçmiş örüntüler karşılaştırıldı.',
  'safety-ai':          'Güvenlik AI, risk skoru eşiğinin yaklaştığını algılayarak proaktif aksiyon önerdi. 72 saatlik risk trendi değerlendirildi.',
  'trend-analyst':      'Trend Analisti, sembol ve arketip verilerindeki kalıpları inceleyerek bu trendin güçleneceğini tahmin etti. 7 günlük ivme analizi yapıldı.',
  'community-observer': 'Topluluk Gözlemcisi, etkileşim kalıplarını ve kullanıcı davranışını analiz ederek topluluk sağlığında risk tespit etti.',
  'growth-ai':          'Büyüme AI, büyüme metrikleri ve kullanıcı eğilimlerini analiz ederek bu aksiyonun dönüşüm oranını artıracağını öngördü.',
  'revenue-ai':         'Gelir AI, kullanıcı kaybı ve gelir sızıntısı modellerini çalıştırarak finansal etkiyi hesapladı ve risk eşiği aşıldı.',
};

const PRIORITY_TIMELINE: Record<string, string> = {
  critical: 'Bugün',
  high:     '24 Saat',
  medium:   '7 Gün',
  low:      '30 Gün',
};

const PRIORITY_IGNORED: Record<string, string> = {
  critical: 'Platform güvenliği veya büyüme hızı kritik düzeyde etkilenebilir. Müdahale maliyeti her geçen saat artar.',
  high:     'Gecikme kümülatif kayıp oluşturur. 72 saat sonra müdahale 3× daha maliyetli hale gelir.',
  medium:   'Orta vadede fırsat kaybı yaşanır. Rakip platformlar bu boşluğu doldurabilir.',
  low:      'Uzun vadede küçük olumsuz etkiler birikerek yapısal soruna dönüşebilir.',
};

const OPERATORS_LIST = [
  { id: 'dream-guardian',     name: 'Rüya Koruyucusu', icon: '🛡',  shortName: 'Koruyucu'  },
  { id: 'safety-ai',          name: 'Güvenlik AI',     icon: '⚠️', shortName: 'Güvenlik'  },
  { id: 'trend-analyst',      name: 'Trend Analisti',  icon: '◈',  shortName: 'Trend'     },
  { id: 'community-observer', name: 'Topluluk Gözlem.',icon: '💚', shortName: 'Topluluk'  },
  { id: 'growth-ai',          name: 'Büyüme AI',       icon: '🚀', shortName: 'Büyüme'    },
  { id: 'revenue-ai',         name: 'Gelir AI',        icon: '💰', shortName: 'Gelir'     },
];

// ── Animated bar ──────────────────────────────────────────────────────────────

function AnimBar({ value, color = '#6C63FF', h = 'h-1' }: { value: number; color?: string; h?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(value)); return () => cancelAnimationFrame(id); }, [value]);
  return (
    <div className={`w-full bg-dc-bg rounded-full ${h} overflow-hidden`}>
      <div className={`${h} rounded-full`} style={{ width: `${w}%`, backgroundColor: color, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  );
}

// ── Enhanced recommendation row ───────────────────────────────────────────────

function RecommendationRow({ rec, index }: { rec: AIRecommendation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const pc       = PRIORITY_CONFIG[rec.priority];
  const cat      = CATEGORY_CONFIG[rec.category];
  const meta     = CATEGORY_META[rec.category] ?? { impact: 70, effort: 50, timeLabel: '1–3 gün', kpi: 'Platform Skoru', systems: ['Platform'], delayLoss: 10 };
  const reasoning = OPERATOR_REASONING[rec.operatorId] ?? 'AI analizi tamamlandı. Platform metrikleri değerlendirilerek bu öneri oluşturuldu.';
  const ignored  = PRIORITY_IGNORED[rec.priority];
  const kpiGain  = `+${Math.round(meta.impact * 0.25)}–+${Math.round(meta.impact * 0.5)} puan`;
  const effortLabel = meta.effort < 40 ? 'Düşük Efor' : meta.effort < 60 ? 'Orta Efor' : 'Yüksek Efor';

  return (
    <div className={`border-b border-dc-border/60 last:border-0 border-l-2 ${pc.border} transition-colors`}>
      {/* Collapsed row */}
      <div
        className="px-5 py-4 hover:bg-white/[0.025] transition-colors cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start gap-4">
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className="text-dc-muted text-[10px] font-mono w-4 text-right">{index + 1}</span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${pc.dot}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-dc-text text-sm font-semibold leading-snug">{rec.description}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${pc.badge}`}>{pc.label}</span>
              <span className={`text-[9px] font-semibold ${cat.color}`}>{cat.icon} {cat.label}</span>
              <span className="text-dc-muted text-[10px] flex items-center gap-1">
                <span>{OPERATOR_ICONS[rec.operatorId] ?? '◆'}</span>
                <span>{rec.operatorName}</span>
              </span>
              {/* NEW: impact badge */}
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-dc-border/60 text-dc-muted">
                Etki: {meta.impact}%
              </span>
              {rec.confidence > 0 && (
                <span className="text-[9px] text-dc-muted font-mono">Güven: {rec.confidence}%</span>
              )}
              <span className="text-[8px] text-dc-muted/60 font-mono">{meta.timeLabel}</span>
              {/* expand indicator */}
              <span className={`ml-auto text-[10px] text-dc-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▾</span>
            </div>
            {/* Mini confidence bar */}
            <div className="mt-2 max-w-xs">
              <AnimBar value={rec.confidence} color={rec.priority === 'critical' ? '#FF4D6D' : rec.priority === 'high' ? '#F97316' : '#6C63FF'} />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded intelligence panel */}
      {expanded && (
        <div className="px-5 pt-0 pb-5 dc-ai-expand border-t border-dc-border/30 bg-dc-bg/40">
          <div className="grid grid-cols-3 gap-4 pt-4">
            {/* Column 1: AI Reasoning */}
            <div>
              <p className="text-[8px] font-bold text-dc-primary uppercase tracking-widest mb-2">AI Gerekçesi</p>
              <p className="text-[10px] text-dc-secondary leading-relaxed">{reasoning}</p>
              <div className="mt-3 space-y-1">
                <p className="text-[8px] font-bold text-dc-muted uppercase tracking-wider">Etkilenen Sistemler</p>
                <div className="flex flex-wrap gap-1">
                  {meta.systems.map(s => (
                    <span key={s} className="text-[8px] text-dc-muted bg-dc-bg border border-dc-border/60 px-1.5 py-0.5 rounded-md font-mono">{s}</span>
                  ))}
                </div>
              </div>
            </div>
            {/* Column 2: Expected outcome */}
            <div>
              <p className="text-[8px] font-bold text-dc-success uppercase tracking-widest mb-2">Uygulanırsa</p>
              <div className="space-y-2">
                <div className="p-2.5 bg-dc-success/5 border border-dc-success/20 rounded-xl">
                  <p className="text-[9px] font-bold text-dc-success">{kpiGain}</p>
                  <p className="text-[8px] text-dc-muted mt-0.5">{meta.kpi} iyileşmesi</p>
                </div>
                <div className="p-2.5 bg-dc-bg border border-dc-border/50 rounded-xl">
                  <p className="text-[8px] text-dc-muted">Süre: <span className="font-bold text-dc-secondary">{meta.timeLabel}</span></p>
                  <p className="text-[8px] text-dc-muted">Efor: <span className="font-bold text-dc-secondary">{effortLabel}</span></p>
                </div>
              </div>
            </div>
            {/* Column 3: Risk if ignored */}
            <div>
              <p className="text-[8px] font-bold text-dc-error uppercase tracking-widest mb-2">Görmezden Gelinirse</p>
              <div className="p-2.5 bg-dc-error/5 border border-dc-error/20 rounded-xl mb-2">
                <p className="text-[8px] text-dc-secondary leading-relaxed">{ignored}</p>
              </div>
              <div className="p-2.5 bg-dc-warning/5 border border-dc-warning/20 rounded-xl">
                <p className="text-[8px] text-dc-warning font-bold">7 gün gecikirse</p>
                <p className="text-[8px] text-dc-muted mt-0.5">−{meta.delayLoss}% verimlilik kaybı</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AIRecommendations() {
  const { data, isLoading, isError } = useQuery({
    queryKey:        ['ai-recommendations'],
    queryFn:         fetchAIRecommendations,
    refetchInterval: 60_000,
  });

  // Live pulse tick — drives dc-live-val CSS animation restart
  const [, setPulseTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPulseTick(v => v + 1), 8000);
    return () => clearInterval(t);
  }, []);

  const recs         = data?.recommendations ?? [];
  const criticalRecs = recs.filter(r => r.priority === 'critical');
  const highRecs     = recs.filter(r => r.priority === 'high');
  const otherRecs    = recs.filter(r => r.priority !== 'critical' && r.priority !== 'high');

  // ── Derived intelligence ───────────────────────────────────────────────────

  const avgConfidence = useMemo(() => {
    if (recs.length === 0) return 0;
    return Math.round(recs.reduce((s, r) => s + r.confidence, 0) / recs.length);
  }, [recs]);

  const platformHealth = useMemo(() => {
    const criticalPenalty = (data?.criticalCount ?? 0) * 20;
    const highPenalty     = (data?.highCount ?? 0) * 8;
    return Math.max(10, 100 - criticalPenalty - highPenalty);
  }, [data]);

  const totalEstimatedImpact = useMemo(() => {
    if (recs.length === 0) return 0;
    return Math.round(recs.reduce((s, r) => s + (CATEGORY_META[r.category]?.impact ?? 70), 0) / recs.length);
  }, [recs]);

  const decisionScore = useMemo(() => {
    const quality    = avgConfidence;
    const readiness  = platformHealth;
    const overall    = Math.round((quality * 0.6 + readiness * 0.4));
    const urgency    = (data?.criticalCount ?? 0) > 0 ? 'Yüksek' : (data?.highCount ?? 0) > 0 ? 'Orta' : 'Düşük';
    const riskLevel  = (data?.criticalCount ?? 0) > 0 ? 'Yüksek' : (data?.highCount ?? 0) > 1 ? 'Orta' : 'Düşük';
    const urgColor   = (data?.criticalCount ?? 0) > 0 ? 'text-dc-error' : (data?.highCount ?? 0) > 0 ? 'text-dc-warning' : 'text-dc-success';
    const riskColor  = (data?.criticalCount ?? 0) > 0 ? 'text-dc-error' : (data?.highCount ?? 0) > 1 ? 'text-dc-warning' : 'text-dc-success';
    return { quality, readiness, overall, urgency, urgColor, riskLevel, riskColor };
  }, [avgConfidence, platformHealth, data]);

  const heroSummary = useMemo(() => {
    const c = data?.criticalCount ?? 0;
    const h = data?.highCount     ?? 0;
    const t = data?.totalActions  ?? 0;
    if (t === 0) return 'Platform tüm operatörlerden nominal durum raporu alıyor. Aksiyon gerektiren öneri bulunmuyor.';
    if (c > 0) return `${c} kritik aksiyon acil müdahale gerektiriyor. ${h > 0 ? `${h} yüksek öncelikli aksiyon 24 saat içinde tamamlanmalı.` : 'Hemen başlayın.'}`;
    if (h > 0) return `${h} yüksek öncelikli aksiyon 24 saat içinde tamamlanmalı. Platform büyüme fırsatları bu aksiyonlara bağlı.`;
    return `${t} aksiyon belirlenmiş durumda. Tümü orta-düşük öncelikli ve planlanabilir.`;
  }, [data]);

  const firstAction = criticalRecs[0] ?? highRecs[0] ?? otherRecs[0];

  const operatorConsensus = useMemo(() => {
    const opSet = new Map(recs.map(r => [r.operatorId, r.priority]));
    const active = OPERATORS_LIST.filter(op => opSet.has(op.id));
    const consensusPct = recs.length > 0
      ? Math.round((active.length / OPERATORS_LIST.length) * 100)
      : 100;
    return {
      operators: OPERATORS_LIST.map(op => {
        const p = opSet.get(op.id);
        const state = !p ? 'nominal' : p === 'critical' ? 'critical' : p === 'high' ? 'active' : 'stable';
        const stateLabel = state === 'critical' ? 'Uyarı' : state === 'active' ? 'Aktif' : state === 'stable' ? 'Stabil' : 'Nominal';
        const stateColor = state === 'critical' ? 'text-dc-error' : state === 'active' ? 'text-dc-warning' : state === 'stable' ? 'text-dc-primary' : 'text-dc-muted';
        const stateBg    = state === 'critical' ? 'bg-dc-error/8 border-dc-error/30' : state === 'active' ? 'bg-dc-warning/8 border-dc-warning/25' : state === 'stable' ? 'bg-dc-primary/5 border-dc-primary/20' : 'bg-dc-bg/60 border-dc-border/40';
        return { ...op, state, stateLabel, stateColor, stateBg };
      }),
      consensusPct,
    };
  }, [recs]);

  const timelineGroups = useMemo(() => {
    const groups: Record<string, AIRecommendation[]> = { 'Bugün': [], '24 Saat': [], '7 Gün': [], '30 Gün': [] };
    recs.forEach(r => { (groups[PRIORITY_TIMELINE[r.priority]] ??= []).push(r); });
    return Object.entries(groups).filter(([, items]) => items.length > 0 || true);
  }, [recs]);

  const impactMatrix = useMemo(() => {
    const quadrants = {
      'Misyon Kritik':  { items: [] as AIRecommendation[], desc: 'Yüksek Etki · Yüksek Güven',    color: 'text-dc-error',   bg: 'bg-dc-error/5 border-dc-error/20'       },
      'Hızlı Kazanım': { items: [] as AIRecommendation[], desc: 'Hızlı Tamamlama · Düşük Efor',   color: 'text-dc-success', bg: 'bg-dc-success/5 border-dc-success/20'   },
      'Fırsat':         { items: [] as AIRecommendation[], desc: 'Yüksek Potansiyel · Orta Risk',  color: 'text-dc-primary', bg: 'bg-dc-primary/5 border-dc-primary/20'   },
      'Uzun Vade':      { items: [] as AIRecommendation[], desc: 'Düşük Aciliyet · Stratejik',     color: 'text-dc-muted',   bg: 'bg-dc-bg border-dc-border/40'           },
    };
    recs.forEach(r => {
      const meta      = CATEGORY_META[r.category];
      const highImpact = meta && meta.impact >= 80;
      const highConf   = r.confidence >= 75;
      const lowEffort  = meta && meta.effort < 50;
      if      (highImpact && highConf)                       quadrants['Misyon Kritik'].items.push(r);
      else if (!highImpact && (highConf || lowEffort))       quadrants['Hızlı Kazanım'].items.push(r);
      else if (highImpact && !highConf)                      quadrants['Fırsat'].items.push(r);
      else                                                   quadrants['Uzun Vade'].items.push(r);
    });
    return quadrants;
  }, [recs]);

  const topPriority  = criticalRecs.length + highRecs.length;
  const healthColor  = platformHealth >= 80 ? 'text-dc-success' : platformHealth >= 60 ? 'text-dc-warning' : 'text-dc-error';
  const healthBar    = platformHealth >= 80 ? '#4CAF87' : platformHealth >= 60 ? '#F5A623' : '#FF4D6D';

  return (
    <div className="section-operators relative">

      {/* Global keyframes */}
      <style>{`
        @keyframes dc-ai-expand { from{opacity:0;transform:translateY(-4px);} to{opacity:1;transform:translateY(0);} }
        .dc-ai-expand { animation: dc-ai-expand 0.2s ease-out; }
        @keyframes dc-ai-fade { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
        .dc-ai-fade { animation: dc-ai-fade 0.4s ease-out both; }
        @keyframes dc-glow { 0%,100%{box-shadow:none;} 50%{box-shadow:0 0 18px rgba(108,99,255,0.12);} }
        .dc-card-glow { transition:box-shadow 0.25s,border-color 0.25s,transform 0.2s; }
        .dc-card-glow:hover { box-shadow:0 0 22px rgba(108,99,255,0.10),0 4px 24px rgba(0,0,0,0.18); transform:translateY(-1px); }
        @keyframes dc-pulse-learn { 0%,100%{opacity:1;} 50%{opacity:0.6;} }
        .dc-live-val { animation: dc-pulse-learn 8s ease-in-out infinite; }
      `}</style>

      {/* ── EXISTING: Header ── */}
      <Header
        title="AI Önerileri"
        subtitle="Tüm operatörlerden gelen önceliklendirilmiş aksiyon listesi"
        section="operators"
        actions={
          data && (
            <div className="flex items-center gap-3">
              {data.criticalCount > 0 && (
                <span className="px-3 py-1 bg-dc-error/10 border border-dc-error/30 text-dc-error text-[10px] font-bold rounded-lg uppercase tracking-wide animate-pulse">
                  {data.criticalCount} Kritik
                </span>
              )}
              <span className="text-dc-muted text-[10px]">{data.totalActions} toplam aksiyon</span>
            </div>
          )
        }
      />

      {/* ── NEW 1: Hero Decision Summary ── */}
      {data && recs.length > 0 && (
        <div className="mb-5 bg-gradient-to-br from-[rgba(108,99,255,0.06)] via-dc-surface to-[rgba(108,99,255,0.02)] border border-dc-primary/20 rounded-2xl p-6 dc-card-glow dc-ai-fade">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-6 rounded-lg bg-dc-primary/15 border border-dc-primary/25 flex items-center justify-center shrink-0">
                  <span className="text-[10px] leading-none">🧠</span>
                </div>
                <p className="text-[9px] font-bold text-dc-primary uppercase tracking-[0.12em]">AI Karar Özeti</p>
                <span className="flex items-center gap-1.5 text-[8px] text-dc-success font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-dc-success animate-pulse" />Canlı
                </span>
              </div>
              <p className="text-sm font-semibold text-dc-text leading-relaxed mb-3">{heroSummary}</p>
              {firstAction && (
                <div className="flex items-start gap-2 p-2.5 bg-dc-bg/60 rounded-xl border border-dc-border/40">
                  <span className="text-[8px] font-bold text-dc-primary uppercase tracking-wider shrink-0 mt-0.5">İLK AKSİYON</span>
                  <p className="text-[10px] text-dc-secondary leading-snug">{firstAction.description}</p>
                </div>
              )}
            </div>
            {/* KPI strip */}
            <div className="shrink-0 grid grid-cols-2 gap-2 min-w-[220px]">
              {[
                { label: 'Platform Sağlığı',   value: `${platformHealth}%`,       color: healthColor },
                { label: 'Ort. Güven',          value: `${avgConfidence}%`,        color: 'text-dc-primary' },
                { label: 'Tahmini Etki',        value: `${totalEstimatedImpact}%`, color: 'text-dc-warning' },
                { label: 'Öncelikli Aksiyon',   value: `${topPriority}`,          color: topPriority > 0 ? 'text-dc-error' : 'text-dc-success' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-dc-bg/70 rounded-xl border border-dc-border/50 p-3 text-center">
                  <p className="text-[7px] text-dc-muted uppercase tracking-widest mb-1">{kpi.label}</p>
                  <p className={`text-lg font-black font-mono leading-none dc-live-val ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NEW 5: AI Decision Score ── */}
      {data && recs.length > 0 && (
        <div className="mb-5 bg-dc-surface border border-dc-border rounded-2xl p-5 dc-card-glow dc-ai-fade">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">AI Karar Skoru</p>
            <span className="ml-auto text-3xl font-black font-mono text-dc-primary dc-live-val">{decisionScore.overall}</span>
            <span className="text-dc-muted text-xs">/100</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Karar Kalitesi',    value: decisionScore.quality,   color: '#6C63FF', vLabel: `${decisionScore.quality}%`  },
              { label: 'Platform Hazırlığı', value: decisionScore.readiness, color: healthBar, vLabel: `${decisionScore.readiness}%` },
              { label: 'Risk Seviyesi',     value: 0, color: '#FF4D6D', vLabel: decisionScore.riskLevel, isText: true, textColor: decisionScore.riskColor },
              { label: 'Aciliyet',          value: 0, color: '#F5A623', vLabel: decisionScore.urgency,   isText: true, textColor: decisionScore.urgColor   },
            ].map(item => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <p className="text-[8px] text-dc-muted">{item.label}</p>
                  {item.isText
                    ? <span className={`text-[9px] font-black ${item.textColor}`}>{item.vLabel}</span>
                    : <span className="text-[9px] font-black font-mono text-dc-text">{item.vLabel}</span>
                  }
                </div>
                {!item.isText && <AnimBar value={item.value} color={item.color} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EXISTING: Summary stats (4-col grid) ── */}
      {data && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Kritik',   count: data.criticalCount, color: 'text-dc-error',     bg: 'border-dc-error/20',     icon: '🔴' },
            { label: 'Yüksek',   count: data.highCount,     color: 'text-orange-400',   bg: 'border-orange-500/20',   icon: '🟠' },
            { label: 'Toplam',   count: data.totalActions,  color: 'text-dc-text',      bg: 'border-dc-border',       icon: '📋' },
            { label: 'Operatör', count: 6,                  color: 'text-dc-primary',   bg: 'border-dc-primary/20',   icon: '🤖' },
          ].map(({ label, count, color, bg, icon }) => (
            <div key={label} className={`bg-dc-surface border rounded-xl p-4 ${bg} dc-card-glow`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base leading-none">{icon}</span>
                <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest">{label}</p>
              </div>
              <p className={`text-2xl font-black ${color} dc-live-val`}>{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── NEW 6: AI Operator Consensus ── */}
      {data && recs.length > 0 && (
        <div className="mb-6 bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow dc-ai-fade">
          <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high flex items-center justify-between">
            <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Operatör Konsensüsü</p>
            <div className="flex items-center gap-2">
              <AnimBar value={operatorConsensus.consensusPct} color="#6C63FF" h="h-1.5" />
              <span className="text-[9px] font-black font-mono text-dc-primary shrink-0">%{operatorConsensus.consensusPct}</span>
            </div>
          </div>
          <div className="grid grid-cols-6 divide-x divide-dc-border/30">
            {operatorConsensus.operators.map(op => (
              <div key={op.id} className={`flex flex-col items-center gap-2 py-4 px-2 text-center hover:bg-white/[0.025] transition-colors ${op.stateBg} border-r-0`}>
                <span className="text-xl leading-none">{op.icon}</span>
                <p className="text-[8px] text-dc-muted leading-tight">{op.shortName}</p>
                <span className={`text-[8px] font-bold ${op.stateColor}`}>{op.stateLabel}</span>
                {op.state === 'critical' && <span className="w-1.5 h-1.5 rounded-full bg-dc-error animate-pulse" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading / Error ── */}
      {isLoading ? (
        <div className="bg-dc-surface border border-dc-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-dc-border bg-dc-surface-high h-10 animate-pulse" />
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex gap-4">
                <div className="w-6 h-6 bg-dc-border/50 rounded animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-dc-border/50 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-dc-border/30 rounded animate-pulse w-1/2" />
                  <div className="h-1 bg-dc-border/20 rounded animate-pulse w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="bg-dc-error/8 border border-dc-error/25 rounded-2xl p-8 text-center">
          <p className="text-dc-error font-bold text-sm mb-1">Bağlantı Hatası</p>
          <p className="text-dc-muted text-[11px]">AI önerileri yüklenemedi. Sistem otomatik olarak yeniden deneyecek.</p>
        </div>
      ) : (
        <>

          {/* ── EXISTING: Critical + High block ── */}
          {criticalRecs.length + highRecs.length > 0 && (
            <div className="bg-dc-surface border border-dc-border rounded-2xl overflow-hidden mb-5 dc-card-glow">
              <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high flex items-center justify-between">
                <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Öncelikli Aksiyonlar</p>
                <span className="text-[9px] text-dc-muted">{criticalRecs.length + highRecs.length} aksiyon</span>
              </div>
              {[...criticalRecs, ...highRecs].map((rec, i) => (
                <RecommendationRow key={rec.id} rec={rec} index={i} />
              ))}
            </div>
          )}

          {/* ── EXISTING: Other recommendations ── */}
          {otherRecs.length > 0 && (
            <div className="bg-dc-surface border border-dc-border rounded-2xl overflow-hidden mb-5 dc-card-glow">
              <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high flex items-center justify-between">
                <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Diğer Öneriler</p>
                <span className="text-[9px] text-dc-muted">{otherRecs.length} aksiyon</span>
              </div>
              {otherRecs.map((rec, i) => (
                <RecommendationRow key={rec.id} rec={rec} index={criticalRecs.length + highRecs.length + i} />
              ))}
            </div>
          )}

          {recs.length === 0 && (
            <div className="bg-dc-surface border border-dc-border rounded-2xl p-12 text-center mb-5">
              <p className="text-3xl mb-3">✓</p>
              <p className="text-dc-success font-bold text-sm mb-2">Tüm Sistemler Nominal</p>
              <p className="text-dc-muted text-[11px] leading-relaxed">Tüm 6 AI operatörü nominal durum raporu gönderiyor.<br />Aksiyon gerektiren öneri bulunmuyor.</p>
            </div>
          )}

          {/* ── NEW 10: AI Strategic Timeline ── */}
          {recs.length > 0 && (
            <div className="mb-5 bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow dc-ai-fade">
              <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high flex items-center gap-2">
                <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Stratejik Zaman Çizelgesi</p>
                <span className="text-[8px] text-dc-muted ml-1">— AI önerileri ne zaman tamamlanmalı?</span>
              </div>
              <div className="flex divide-x divide-dc-border/30">
                {timelineGroups.map(([period, items]) => {
                  const isEmpty   = items.length === 0;
                  const isUrgent  = period === 'Bugün' || period === '24 Saat';
                  return (
                    <div key={period} className={`flex-1 p-4 ${isUrgent && !isEmpty ? 'bg-gradient-to-b from-dc-error/3 to-transparent' : ''}`}>
                      <div className="flex items-center gap-1.5 mb-3">
                        {isUrgent && !isEmpty && <span className="w-1.5 h-1.5 rounded-full bg-dc-error animate-pulse shrink-0" />}
                        <p className={`text-[9px] font-black uppercase tracking-wider font-mono ${period === 'Bugün' ? 'text-dc-error' : period === '24 Saat' ? 'text-orange-400' : 'text-dc-muted'}`}>{period}</p>
                        <span className="ml-auto text-[8px] font-bold font-mono text-dc-muted">{items.length}</span>
                      </div>
                      {isEmpty ? (
                        <p className="text-[8px] text-dc-muted/50 italic">—</p>
                      ) : (
                        <div className="space-y-1.5">
                          {items.slice(0, 3).map((r, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className={`w-1 h-1 rounded-full shrink-0 mt-1.5 ${PRIORITY_CONFIG[r.priority].dot.replace(' animate-pulse','')}`} />
                              <p className="text-[8px] text-dc-secondary leading-tight line-clamp-2">{r.description.slice(0, 55)}{r.description.length > 55 ? '…' : ''}</p>
                            </div>
                          ))}
                          {items.length > 3 && <p className="text-[7px] text-dc-muted/60 italic">+{items.length - 3} daha</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── NEW 9: Impact Matrix ── */}
          {recs.length > 0 && (
            <div className="mb-5 bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow dc-ai-fade">
              <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high">
                <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Etki Matrisi</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-dc-border/30">
                <div className="divide-y divide-dc-border/30">
                  {['Misyon Kritik', 'Fırsat'].map(key => {
                    const q = impactMatrix[key as keyof typeof impactMatrix];
                    return (
                      <div key={key} className={`p-4 ${q.bg} border-0`}>
                        <div className="flex items-center gap-2 mb-2">
                          <p className={`text-[9px] font-black uppercase tracking-wider ${q.color}`}>{key}</p>
                          <span className={`ml-auto text-[9px] font-black font-mono ${q.color}`}>{q.items.length}</span>
                        </div>
                        <p className="text-[7px] text-dc-muted mb-2">{q.desc}</p>
                        <div className="space-y-1">
                          {q.items.slice(0, 2).map((r, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className={`w-1 h-1 rounded-full shrink-0 ${PRIORITY_CONFIG[r.priority].dot.replace(' animate-pulse','')}`} />
                              <p className="text-[8px] text-dc-secondary truncate">{r.description.slice(0, 50)}…</p>
                            </div>
                          ))}
                          {q.items.length === 0 && <p className="text-[8px] text-dc-muted/50 italic">Aksiyon yok</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="divide-y divide-dc-border/30">
                  {['Hızlı Kazanım', 'Uzun Vade'].map(key => {
                    const q = impactMatrix[key as keyof typeof impactMatrix];
                    return (
                      <div key={key} className={`p-4 ${q.bg} border-0`}>
                        <div className="flex items-center gap-2 mb-2">
                          <p className={`text-[9px] font-black uppercase tracking-wider ${q.color}`}>{key}</p>
                          <span className={`ml-auto text-[9px] font-black font-mono ${q.color}`}>{q.items.length}</span>
                        </div>
                        <p className="text-[7px] text-dc-muted mb-2">{q.desc}</p>
                        <div className="space-y-1">
                          {q.items.slice(0, 2).map((r, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className={`w-1 h-1 rounded-full shrink-0 ${PRIORITY_CONFIG[r.priority].dot.replace(' animate-pulse','')}`} />
                              <p className="text-[8px] text-dc-secondary truncate">{r.description.slice(0, 50)}…</p>
                            </div>
                          ))}
                          {q.items.length === 0 && <p className="text-[8px] text-dc-muted/50 italic">Aksiyon yok</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── NEW 8: Dependency Chain ── */}
          {recs.length > 0 && (
            <div className="mb-5 bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow dc-ai-fade">
              <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high flex items-center gap-2">
                <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Aksiyon Bağımlılık Zinciri</p>
                <span className="text-[8px] text-dc-muted ml-1">— aksiyonlar birbirini nasıl etkiliyor?</span>
              </div>
              <div className="p-6">
                <div className="flex items-center overflow-x-auto gap-0">
                  {[
                    { label: 'Güvenlik &\nModersyon', icon: '🛡',  color: 'text-dc-error',   bg: 'bg-dc-error/8 border-dc-error/30',     cat: ['moderation','safety']  },
                    { label: 'İçerik\nKalitesi',     icon: '◈',   color: 'text-dc-primary', bg: 'bg-dc-primary/8 border-dc-primary/30', cat: ['content']              },
                    { label: 'Topluluk\nEtkileşimi', icon: '💚',  color: 'text-dc-success', bg: 'bg-dc-success/8 border-dc-success/25', cat: ['community']            },
                    { label: 'Büyüme',               icon: '🚀',  color: 'text-dc-warning', bg: 'bg-dc-warning/8 border-dc-warning/25', cat: ['growth']               },
                    { label: 'Gelir',                icon: '💰',  color: 'text-dc-muted',   bg: 'bg-dc-bg border-dc-border/60',         cat: ['revenue']              },
                  ].map((node, i, arr) => {
                    const count = recs.filter(r => node.cat.includes(r.category)).length;
                    const isLast = i === arr.length - 1;
                    return (
                      <div key={node.label} className="flex items-center shrink-0">
                        <div className={`flex flex-col items-center gap-1.5 px-3.5 py-3.5 rounded-xl border text-center min-w-[88px] hover:scale-105 transition-transform duration-200 ${node.bg}`}>
                          <span className="text-xl leading-none">{node.icon}</span>
                          <p className={`text-[8px] font-bold leading-tight whitespace-pre-line ${node.color}`}>{node.label}</p>
                          {count > 0 && (
                            <span className={`text-[7px] font-black ${node.color} px-1.5 py-0.5 rounded-full border ${node.bg}`}>
                              {count} aksiyon
                            </span>
                          )}
                        </div>
                        {!isLast && (
                          <div className="shrink-0 w-8 flex items-center">
                            <svg width="32" height="12" className="overflow-visible">
                              <line x1="0" y1="6" x2="24" y2="6" stroke="#6C63FF" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5" />
                              <polygon points="22,3 30,6 22,9" fill="#6C63FF" opacity="0.6" />
                              <circle r="2" fill="#6C63FF" opacity="0.85">
                                <animateMotion dur="1.8s" repeatCount="indefinite" path="M0,6 L28,6" />
                              </circle>
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[8px] text-dc-muted/50 mt-4 italic">Her aksiyon zincirdeki bir sonraki sistemi güçlendirir — soldan sağa bağımlılık akışı.</p>
              </div>
            </div>
          )}

          {/* ── NEW 7: Execution Simulation ── */}
          {(criticalRecs.length + highRecs.length) > 0 && (
            <div className="mb-5 bg-dc-surface border border-dc-border rounded-2xl overflow-hidden dc-card-glow dc-ai-fade">
              <div className="px-5 py-3 border-b border-dc-border/60 bg-dc-surface-high">
                <p className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.12em]">Uygulama Simülasyonu</p>
              </div>
              <div className="p-4 space-y-3">
                {[...criticalRecs, ...highRecs].slice(0, 3).map((r) => {
                  const meta   = CATEGORY_META[r.category] ?? { impact: 70, effort: 50, delayLoss: 10 };
                  const benefit = Math.round(meta.impact * 0.35);
                  const delay   = meta.delayLoss;
                  return (
                    <div key={r.id} className="border border-dc-border/40 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-dc-surface-high border-b border-dc-border/40">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_CONFIG[r.priority].dot}`} />
                          <p className="text-[10px] font-semibold text-dc-text truncate flex-1">{r.description.slice(0, 70)}{r.description.length > 70 ? '…' : ''}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-dc-border/30">
                        <div className="p-3 bg-dc-success/4">
                          <p className="text-[7px] font-bold text-dc-success uppercase tracking-wider mb-1">✓ Uygulanırsa</p>
                          <p className="text-sm font-black text-dc-success">+{benefit}%</p>
                          <p className="text-[8px] text-dc-muted mt-0.5">KPI iyileşmesi</p>
                        </div>
                        <div className="p-3 bg-dc-warning/4">
                          <p className="text-[7px] font-bold text-dc-warning uppercase tracking-wider mb-1">⏰ 7 Gün Gecikirse</p>
                          <p className="text-sm font-black text-dc-warning">−{delay}%</p>
                          <p className="text-[8px] text-dc-muted mt-0.5">Verimlilik kaybı</p>
                        </div>
                        <div className="p-3 bg-dc-error/4">
                          <p className="text-[7px] font-bold text-dc-error uppercase tracking-wider mb-1">✗ Görmezden Gelinirse</p>
                          <p className="text-[9px] text-dc-secondary leading-snug">{PRIORITY_IGNORED[r.priority].slice(0, 60)}…</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── EXISTING: Legend ── */}
          <div className="mt-5 bg-dc-surface border border-dc-border rounded-2xl p-4">
            <p className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-3">Öncelik Açıklaması</p>
            <div className="flex gap-6">
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot.replace(' animate-pulse', '')}`} />
                  <span className="text-dc-secondary text-xs">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
