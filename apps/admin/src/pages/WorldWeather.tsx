import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchWorldWeather } from '../api/admin.api';
import type { EmotionClimate, MoodForecastPoint, IntensityBand, ClimateState } from '../api/admin.api';

// ── Config ─────────────────────────────────────────────────────────────────────

const DAY_OPTIONS = [
  { label: '3g', value: 3 }, { label: '7g', value: 7 },
  { label: '14g', value: 14 }, { label: '30g', value: 30 },
];

const CLIMATE_CFG: Record<ClimateState, { label: string; color: string; desc: string; icon: string }> = {
  TURBULENT: { label: 'Çalkantılı',   color: '#FF3060', desc: 'Yüksek duygusal baskı — negatif sinyaller baskın',     icon: '⛈' },
  TENSE:     { label: 'Gergin',       color: '#FF8C00', desc: 'Dikkat: negatif duygular yükselişte',                   icon: '⚡' },
  RADIANT:   { label: 'Işıltılı',     color: '#FFB800', desc: 'Platform pozitif enerjiyle dolu',                        icon: '☀' },
  BALANCED:  { label: 'Dengeli',      color: '#00E87A', desc: 'Duygular istikrarlı ve harmonik dağılımda',             icon: '◎' },
  NEUTRAL:   { label: 'Nötr',         color: '#5A5A84', desc: 'Belirgin bir duygusal yön yok',                         icon: '○' },
};

const EMOTION_COLORS: Record<string, string> = {
  joy: '#00E87A', sadness: '#60A5FA', fear: '#FF3060', anger: '#FF8C00',
  anxiety: '#FFB800', love: '#FF4D8F', confusion: '#A78BFA', peace: '#00CFFF',
  excitement: '#FFB800', grief: '#7B8FFF',
};
function emoColor(e: string) { return EMOTION_COLORS[e?.toLowerCase() ?? ''] ?? '#A78BFA'; }

const INTENSITY_ORDER = ['low', 'moderate', 'high', 'intense', 'overwhelming'];
const INTENSITY_COLORS = ['#00E87A', '#00CFFF', '#FFB800', '#FF8C00', '#FF3060'];

function weekLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'short' })}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ClimateState_({ state, pressureScore, positivityScore }: {
  state: ClimateState; pressureScore: number; positivityScore: number;
}) {
  const cfg = CLIMATE_CFG[state];
  return (
    <div className="dc-card p-6 flex items-start gap-5"
      style={{ borderColor: `${cfg.color}30`, borderWidth: '1px' }}>
      <div className="text-5xl" style={{ color: cfg.color }}>{cfg.icon}</div>
      <div className="flex-1 space-y-3">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-dc-muted mb-1">Duygusal İklim</p>
          <p className="text-2xl font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
          <p className="text-dc-muted text-xs mt-1">{cfg.desc}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-dc-muted text-[10px] font-bold uppercase tracking-widest">Basınç</span>
              <span className="text-xs font-bold font-mono" style={{ color: '#FF3060' }}>{pressureScore.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-dc-bg rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pressureScore}%`, background: 'linear-gradient(90deg, #FF8C00, #FF3060)' }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-dc-muted text-[10px] font-bold uppercase tracking-widest">Pozitiflik</span>
              <span className="text-xs font-bold font-mono" style={{ color: '#00E87A' }}>{positivityScore.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-dc-bg rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${positivityScore}%`, background: 'linear-gradient(90deg, #00CFFF, #00E87A)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmotionClimatePanel({ rows }: { rows: EmotionClimate[] }) {
  const max = Math.max(...rows.map(r => r.count), 1);
  return (
    <div className="dc-card p-5 space-y-3">
      <h3 className="text-dc-text text-sm font-bold">Duygu İklimi Dağılımı</h3>
      <div className="space-y-2.5">
        {rows.map(r => {
          const color = emoColor(r.emotion);
          const barPct = Math.round((r.count / max) * 100);
          return (
            <div key={r.emotion} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-dc-text text-xs capitalize font-medium" style={{ color }}>{r.emotion}</span>
                <div className="flex items-center gap-3">
                  <span className="text-dc-muted text-[10px] font-mono">{Number(r.pct).toFixed(1)}%</span>
                  <span className="text-dc-muted text-[10px]">yoğ. {Number(r.avg_intensity).toFixed(1)}/5</span>
                </div>
              </div>
              <div className="h-1.5 bg-dc-bg rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MoodForecastPanel({ rows }: { rows: MoodForecastPoint[] }) {
  const last = rows[rows.length - 1];
  const forecast = last ? {
    emotion: last.emotion,
    color: emoColor(last.emotion),
    confidence: Math.min(90, 50 + rows.filter(r => r.emotion === last.emotion).length * 10),
  } : null;

  return (
    <div className="dc-card p-5 space-y-3">
      <h3 className="text-dc-text text-sm font-bold">Mod Tahmini</h3>
      <div className="flex items-end gap-2 overflow-x-auto pb-2">
        {rows.map((r, i) => {
          const color = emoColor(r.emotion);
          const isLast = i === rows.length - 1;
          return (
            <div key={i} className="shrink-0 flex flex-col items-center gap-1 group relative">
              <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-[9px] font-bold gap-0.5 transition-all group-hover:scale-110"
                style={{
                  background: `${color}${isLast ? '33' : '18'}`,
                  color,
                  border: `1px solid ${color}${isLast ? '60' : '30'}`,
                  boxShadow: isLast ? `0 0 12px ${color}40` : 'none',
                }}>
                <span className="capitalize text-[8px] leading-tight text-center px-1 break-words w-full text-center">{r.emotion.slice(0, 5)}</span>
                <span className="font-mono">{r.cnt}</span>
              </div>
              <p className="text-[8px] text-dc-muted font-mono whitespace-nowrap">{weekLabel(r.week)}</p>
            </div>
          );
        })}
      </div>
      {forecast && (
        <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-dc-muted text-[10px] mb-1">Tahmini baskın mod:</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold capitalize" style={{ color: forecast.color }}>{forecast.emotion}</span>
            <div className="flex-1 h-1 bg-dc-bg rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${forecast.confidence}%`, background: forecast.color }} />
            </div>
            <span className="text-[10px] font-mono" style={{ color: forecast.color }}>{forecast.confidence}% olasılık</span>
          </div>
        </div>
      )}
    </div>
  );
}

function IntensityPanel({ rows }: { rows: IntensityBand[] }) {
  const ordered = INTENSITY_ORDER
    .map(intensity => rows.find(r => r.intensity === intensity) ?? { intensity, count: 0, pct: 0 });
  const max = Math.max(...ordered.map(r => r.count), 1);
  return (
    <div className="dc-card p-5 space-y-3">
      <h3 className="text-dc-text text-sm font-bold">Duygusal Yoğunluk Dağılımı</h3>
      <div className="flex items-end gap-3 h-28">
        {ordered.map((r, i) => {
          const h = Math.max(4, Math.round((r.count / max) * 100));
          const color = INTENSITY_COLORS[i] ?? '#5A5A84';
          return (
            <div key={r.intensity} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="w-full rounded-t-sm" style={{ height: `${h}px`, background: `${color}CC` }} />
              <span className="text-[9px] text-dc-muted capitalize text-center leading-tight">{r.intensity.slice(0, 3)}</span>
              <span className="text-[9px] font-bold font-mono" style={{ color }}>{Number(r.pct).toFixed(0)}%</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 pointer-events-none">
                <div className="bg-dc-surface border text-[10px] px-2 py-1 rounded whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  {r.intensity}: {r.count} sinyal
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function WorldWeather() {
  const [days, setDays] = useState(7);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['world-weather', days],
    queryFn: () => fetchWorldWeather(days),
    refetchInterval: 60_000,
  });

  return (
    <div className="section-system relative">
      <Header
        title="Dream Weather Engine"
        subtitle="Duygusal iklim, basınç endeksi ve mod tahmini"
        section="system"
        actions={
          <div className="flex items-center gap-1.5">
            {DAY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setDays(opt.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                style={days === opt.value ? {
                  background: 'rgba(255,184,0,0.1)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.3)',
                } : {
                  background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
        {isFetching && !data && (
          <div className="flex items-center justify-center h-40 text-dc-muted text-sm animate-pulse">Hava durumu hesaplanıyor...</div>
        )}
        {isError && <div className="dc-card p-5 text-center text-dc-muted text-sm">Veri yüklenemedi.</div>}

        {data && (
          <>
            <ClimateState_ state={data.climateState} pressureScore={data.pressureScore} positivityScore={data.positivityScore} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EmotionClimatePanel rows={data.climate} />
              <IntensityPanel rows={data.intensityDist} />
            </div>
            <MoodForecastPanel rows={data.forecast} />
            <p className="text-dc-muted/50 text-[10px] text-right font-mono">{new Date(data.analyzedAt).toLocaleString('tr-TR')} · {days}g pencere</p>
          </>
        )}
      </div>
    </div>
  );
}
