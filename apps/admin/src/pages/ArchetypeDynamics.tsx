import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchArchetypeDynamics } from '../api/admin.api';
import type { DominantArchetype, ArchetypeChange, ArchetypeEmotionPair } from '../api/admin.api';

// ── Config ─────────────────────────────────────────────────────────────────────

const WEEK_OPTIONS = [
  { label: '4h', value: 4 }, { label: '8h', value: 8 },
  { label: '12h', value: 12 }, { label: '24h', value: 24 },
];

const ARCHETYPE_COLORS = [
  '#A78BFA', '#00CFFF', '#FFB800', '#00E87A', '#FF8C00',
  '#F472B6', '#FBBF24', '#34D399', '#60A5FA', '#FF3060',
];

const EMOTION_COLORS: Record<string, string> = {
  joy: '#00E87A', sadness: '#60A5FA', fear: '#FF3060', anger: '#FF8C00',
  anxiety: '#FFB800', love: '#FF4D8F', confusion: '#A78BFA', peace: '#00CFFF',
};
function emoColor(e: string) { return EMOTION_COLORS[e?.toLowerCase() ?? ''] ?? '#5A5A84'; }

// ── Sub-components ─────────────────────────────────────────────────────────────

function DominantCard({ a, color, rank }: { a: DominantArchetype; color: string; rank: number }) {
  return (
    <div className="dc-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-bold text-dc-muted font-mono">#{rank}</span>
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
          <h3 className="text-dc-text text-sm font-bold leading-tight">{a.archetype ?? '—'}</h3>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: `${color}18`, color }}>{Number(a.pct).toFixed(1)}%</span>
      </div>
      <div className="h-1 bg-dc-bg rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: color }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-dc-muted text-[9px] uppercase tracking-widest">Aktivasyon</p>
          <p className="text-dc-text text-xs font-bold font-mono">{a.activations}</p>
        </div>
        <div className="text-center">
          <p className="text-dc-muted text-[9px] uppercase tracking-widest">Güven</p>
          <p className="text-xs font-bold font-mono" style={{ color }}>{Number(a.avg_confidence).toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-dc-muted text-[9px] uppercase tracking-widest">Rüyacı</p>
          <p className="text-dc-text text-xs font-bold font-mono">{a.unique_dreamers}</p>
        </div>
      </div>
    </div>
  );
}

function ChangeRow({ a, rank }: { a: ArchetypeChange; rank: number }) {
  const rising = a.delta >= 0;
  const color  = rising ? '#00E87A' : '#FF3060';
  const archColor = ARCHETYPE_COLORS[rank % ARCHETYPE_COLORS.length]!;
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: archColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-dc-text text-xs font-semibold capitalize truncate">{a.archetype ?? '—'}</p>
        <p className="text-dc-muted text-[10px] font-mono">{a.prior_count} → {a.current_count}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-bold font-mono" style={{ color }}>{rising ? '+' : ''}{a.delta}</p>
        <p className="text-[9px] font-mono" style={{ color }}>{a.pct_change >= 0 ? '+' : ''}{Number(a.pct_change).toFixed(1)}%</p>
      </div>
    </div>
  );
}

function EmotionPairPanel({ pairs }: { pairs: ArchetypeEmotionPair[] }) {
  const archetypes = [...new Set(pairs.map(p => p.archetype))].slice(0, 5);
  return (
    <div className="dc-card p-5 space-y-4">
      <h3 className="text-dc-text text-sm font-bold">Arketip × Duygu Eşleşmeleri</h3>
      <div className="space-y-4">
        {archetypes.map((arch, ai) => {
          const archPairs = pairs.filter(p => p.archetype === arch).slice(0, 4);
          const archColor = ARCHETYPE_COLORS[ai % ARCHETYPE_COLORS.length]!;
          const maxCo = Math.max(...archPairs.map(p => p.co_occurrences), 1);
          return (
            <div key={arch}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ background: archColor }} />
                <p className="text-xs font-bold" style={{ color: archColor }}>{arch}</p>
              </div>
              <div className="space-y-1.5 ml-3.5">
                {archPairs.map(p => (
                  <div key={p.emotion} className="flex items-center gap-2">
                    <span className="w-20 text-[10px] capitalize" style={{ color: emoColor(p.emotion) }}>{p.emotion}</span>
                    <div className="flex-1 h-1 bg-dc-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.round(p.co_occurrences / maxCo * 100)}%`, background: emoColor(p.emotion) }} />
                    </div>
                    <span className="text-[9px] text-dc-muted font-mono w-8 text-right">{p.co_occurrences}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyTrendPanel({ rows, archetypes }: { rows: Array<{ week: string; archetype: string; count: number }>; archetypes: string[] }) {
  const weeks = [...new Set(rows.map(r => r.week))].sort().slice(-8);
  const top5  = archetypes.slice(0, 5);
  const byKey: Record<string, number> = {};
  for (const r of rows) byKey[`${r.week}__${r.archetype}`] = r.count;

  const weekLabel = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'short' })}`;
  };

  return (
    <div className="dc-card p-5 space-y-3">
      <h3 className="text-dc-text text-sm font-bold">Haftalık Arketip Trendi</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="text-dc-muted text-left py-1 pr-4 font-medium w-20 text-[10px]">Arketip</th>
              {weeks.map(w => (
                <th key={w} className="text-dc-muted text-center py-1 px-1 font-mono text-[9px] w-12">{weekLabel(w)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top5.map((arch, ai) => {
              const color = ARCHETYPE_COLORS[ai % ARCHETYPE_COLORS.length]!;
              const vals = weeks.map(w => byKey[`${w}__${arch}`] ?? 0);
              const max = Math.max(...vals, 1);
              return (
                <tr key={arch}>
                  <td className="py-1 pr-4">
                    <span className="text-[10px] font-semibold capitalize" style={{ color }}>{arch?.slice(0, 12) ?? '—'}</span>
                  </td>
                  {vals.map((v, wi) => (
                    <td key={wi} className="py-1 px-1 text-center">
                      {v > 0 ? (
                        <div className="mx-auto w-8 h-6 rounded flex items-center justify-center text-[9px] font-bold font-mono"
                          style={{ background: `${color}${Math.round((v / max) * 180).toString(16).padStart(2, '0')}`, color }}>
                          {v}
                        </div>
                      ) : (
                        <div className="mx-auto w-8 h-6 rounded bg-white/[0.02]" />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ArchetypeDynamics() {
  const [weeks, setWeeks] = useState(8);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['archetype-dynamics', weeks],
    queryFn: () => fetchArchetypeDynamics(weeks),
    staleTime: 5 * 60_000,
  });

  const archetypes = data?.dominant.map(a => a.archetype) ?? [];

  return (
    <div className="section-system relative">
      <Header
        title="Archetype Dynamics"
        subtitle="Baskın arketipler, haftalık trendler ve aktivasyon değişimleri"
        section="system"
        actions={
          <div className="flex items-center gap-1.5">
            {WEEK_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setWeeks(opt.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                style={weeks === opt.value ? {
                  background: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)',
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
          <div className="flex items-center justify-center h-40 text-dc-muted text-sm animate-pulse">Arketip dinamikleri hesaplanıyor...</div>
        )}
        {isError && <div className="dc-card p-5 text-center text-dc-muted text-sm">Veri yüklenemedi.</div>}

        {data && (
          <>
            {/* Dominant archetypes grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {data.dominant.slice(0, 10).map((a, i) => (
                <DominantCard key={a.archetype} a={a} color={ARCHETYPE_COLORS[i % ARCHETYPE_COLORS.length]!} rank={i + 1} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activation changes */}
              <div className="dc-card overflow-hidden">
                <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <h3 className="text-dc-text text-sm font-bold">Bu Hafta vs Geçen Hafta</h3>
                </div>
                <div className="px-5 py-2 max-h-80 overflow-y-auto">
                  {data.activationChanges.map((a, i) => <ChangeRow key={a.archetype ?? i} a={a} rank={i} />)}
                  {data.activationChanges.length === 0 && <p className="text-dc-muted text-sm py-4">Değişim verisi yok.</p>}
                </div>
              </div>

              <EmotionPairPanel pairs={data.archetypeEmotionMap} />
            </div>

            <WeeklyTrendPanel rows={data.weeklyTrend} archetypes={archetypes} />

            <p className="text-dc-muted/50 text-[10px] text-right font-mono">
              {new Date(data.analyzedAt).toLocaleString('tr-TR')} · {weeks} haftalık pencere
            </p>
          </>
        )}
      </div>
    </div>
  );
}
