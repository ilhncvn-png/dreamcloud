import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchConsciousnessIndex } from '../api/admin.api';
import type { ConsciousnessState } from '../api/admin.api';

// ── Config ─────────────────────────────────────────────────────────────────────

const STATE_CFG: Record<ConsciousnessState, { label: string; color: string; desc: string; icon: string }> = {
  AWAKENED: { label: 'Uyanık',    color: '#FBBF24', desc: 'Platform yüksek kolektif farkındalık içinde',          icon: '✦' },
  RESONANT: { label: 'Rezonant',  color: '#A78BFA', desc: 'Güçlü bilinçaltı bağlantıları aktif',                  icon: '◈' },
  FORMING:  { label: 'Oluşuyor', color: '#00CFFF', desc: 'Kolektif bilinç zemin kazanıyor',                       icon: '◌' },
  DORMANT:  { label: 'Uyuşuk',   color: '#5A5A84', desc: 'Kolektif aktivite düşük — bağlantı potansiyeli var',   icon: '○' },
};

// ── Gauge ─────────────────────────────────────────────────────────────────────

function Gauge({ label, score, color }: { label: string; score: number; color: string }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="dc-card p-5 flex flex-col items-center gap-3">
      <p className="text-dc-muted text-[10px] font-bold tracking-widest uppercase">{label}</p>
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" stroke="rgba(255,255,255,0.06)" />
          <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono" style={{ color }}>{clampedScore}</span>
          <span className="text-dc-muted text-[10px]">/ 100</span>
        </div>
      </div>
    </div>
  );
}

// ── Stat Row ─────────────────────────────────────────────────────────────────

function StatRow({ label, value, color = '#00CFFF' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <span className="text-dc-muted text-xs">{label}</span>
      <span className="text-xs font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ConsciousnessIndex() {
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['consciousness-index'],
    queryFn:  fetchConsciousnessIndex,
    refetchInterval: 5 * 60_000,
  });

  return (
    <div className="section-system relative">
      <Header
        title="Consciousness Index"
        subtitle="Kolektif farkındalık, uyum skoru ve duygusal istikrar"
        section="system"
        actions={
          <button onClick={() => void refetch()}
            className="px-4 py-2 rounded-lg text-xs font-bold border transition-all"
            style={{ background: 'rgba(251,191,36,0.08)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.25)' }}>
            {isFetching ? '...' : 'Hesapla'}
          </button>
        }
      />
      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
        {isFetching && !data && (
          <div className="flex items-center justify-center h-40 text-dc-muted text-sm animate-pulse">Bilinç indeksi hesaplanıyor...</div>
        )}
        {isError && <div className="dc-card p-5 text-center text-dc-muted text-sm">Veri yüklenemedi.</div>}

        {data && (
          <>
            {/* State banner */}
            {(() => {
              const cfg = STATE_CFG[data.indexState];
              return (
                <div className="dc-card p-6 flex items-center gap-6"
                  style={{ borderColor: `${cfg.color}30`, borderWidth: '1px' }}>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-dc-muted text-[10px] font-bold tracking-widest uppercase">Kolektif Bilinç Durumu</p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl" style={{ color: cfg.color }}>{cfg.icon}</span>
                      <p className="text-3xl font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                      <span className="text-2xl font-bold font-mono text-dc-muted">#{data.overallIndex}</span>
                    </div>
                    <p className="text-dc-muted text-sm">{cfg.desc}</p>
                  </div>
                  {/* Mini index score */}
                  <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" strokeWidth="10" stroke="rgba(255,255,255,0.06)" />
                      <circle cx="50" cy="50" r="40" fill="none" strokeWidth="10"
                        stroke={cfg.color}
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - data.overallIndex / 100)}`}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 8px ${cfg.color}60)` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold font-mono" style={{ color: cfg.color }}>{data.overallIndex}</span>
                      <span className="text-[9px] text-dc-muted">INDEX</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Three gauges */}
            <div className="grid grid-cols-3 gap-4">
              <Gauge label="Kolektif Farkındalık" score={data.awarenessScore} color="#FBBF24" />
              <Gauge label="Uyum Skoru"           score={data.coherenceScore}  color="#A78BFA" />
              <Gauge label="Duygusal İstikrar"    score={data.stabilityScore}  color="#00E87A" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Resonance stats */}
              {data.resonanceStats && (
                <div className="dc-card p-5">
                  <h3 className="text-dc-text text-sm font-bold mb-3">Rezonans Aktivitesi (30g)</h3>
                  <StatRow label="Toplam Bağlantı"    value={String(data.resonanceStats['total_connections'] ?? '—')} color="#A78BFA" />
                  <StatRow label="Ort. Uyum Skoru"   value={`${Number(data.resonanceStats['avg_resonance'] ?? 0).toFixed(1)}%`} color="#A78BFA" />
                  <StatRow label="Cosmic Bağlantı"    value={String(data.resonanceStats['cosmic_count'] ?? '—')}      color="#FBBF24" />
                  <StatRow label="Deep Bağlantı"      value={String(data.resonanceStats['deep_count'] ?? '—')}        color="#A78BFA" />
                  <StatRow label="Bağlantılı Rüyacı"  value={String(data.resonanceStats['connected_dreamers'] ?? '—')} color="#00E87A" />
                </div>
              )}

              {/* Activity & platform stats */}
              {data.activityMetrics && data.platformStats && (
                <div className="dc-card p-5">
                  <h3 className="text-dc-text text-sm font-bold mb-3">Platform Aktivitesi (30g)</h3>
                  <StatRow label="Toplam Rüya"        value={String(data.activityMetrics['dreams_30d'] ?? '—')}        color="#00CFFF" />
                  <StatRow label="Aktif Rüyacı"       value={String(data.activityMetrics['active_dreamers_30d'] ?? '—')} color="#00CFFF" />
                  <StatRow label="Günlük Ort. Rüya"   value={String(data.activityMetrics['avg_daily_dreams'] ?? '—')}  color="#00CFFF" />
                  <StatRow label="Analiz Kapsamı"     value={`${data.platformStats['coverage_pct'] ?? '—'}%`}         color="#00E87A" />
                  <StatRow label="Tamamlanma Oranı"   value={`${data.platformStats['completion_pct'] ?? '—'}%`}        color="#00E87A" />
                </div>
              )}

              {/* Emotion coherence */}
              {data.emotionCoherence && (
                <div className="dc-card p-5">
                  <h3 className="text-dc-text text-sm font-bold mb-3">Duygu Uyumu (7g)</h3>
                  <StatRow label="Entropi Skoru"      value={String(data.emotionCoherence['entropy_score'] ?? '—')}    color="#A78BFA" />
                  <StatRow label="Benzersiz Duygu"    value={String(data.emotionCoherence['distinct_emotions'] ?? '—')} color="#A78BFA" />
                  <StatRow label="Baskın Duygu %"     value={`${data.emotionCoherence['dominant_pct'] ?? '—'}%`}       color="#FBBF24" />
                </div>
              )}

              {/* Stability metrics */}
              {data.stabilityMetrics && (
                <div className="dc-card p-5">
                  <h3 className="text-dc-text text-sm font-bold mb-3">Duygusal İstikrar (8h)</h3>
                  <StatRow label="Farklı Baskın Duygu" value={String(data.stabilityMetrics['unique_dominant_emotions'] ?? '—')} color="#00E87A" />
                  <StatRow label="Analiz Haftası"       value={String(data.stabilityMetrics['total_weeks'] ?? '—')}             color="#00E87A" />
                  <p className="text-dc-muted text-[10px] mt-3">
                    Daha az farklı baskın duygu = daha yüksek istikrar
                  </p>
                </div>
              )}
            </div>

            <p className="text-dc-muted/50 text-[10px] text-right font-mono">
              {new Date(data.computedAt).toLocaleString('tr-TR')} itibarıyla hesaplandı
            </p>
          </>
        )}
      </div>
    </div>
  );
}
