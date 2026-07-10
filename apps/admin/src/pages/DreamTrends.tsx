import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDreamAnalytics, fetchEngagementAnalytics } from '../api/admin.api';
import Header from '../components/Header';

const CATEGORY_CFG: Record<string, { label: string; color: string; glyph: string }> = {
  lucid:     { label: 'Lucid',       color: 'bg-cyan-500/70',    glyph: '◎' },
  beautiful: { label: 'Güzel',       color: 'bg-pink-500/70',    glyph: '✦' },
  nightmare: { label: 'Kabus',       color: 'bg-red-500/70',     glyph: '◆' },
  normal:    { label: 'Normal',      color: 'bg-dc-secondary/70',glyph: '○' },
  recurring: { label: 'Tekrarlayan', color: 'bg-yellow-500/70',  glyph: '↻' },
};

function MiniBar({ date, count, max }: { date: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const d   = new Date(date);
  const dayLabel = d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-dc-border/30 last:border-0">
      <span className="text-dc-muted text-[10px] w-14 shrink-0">{dayLabel}</span>
      <div className="flex-1 h-2 bg-dc-bg rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-dc-primary/60" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-dc-text text-xs font-semibold w-8 text-right shrink-0">{count}</span>
    </div>
  );
}

export default function DreamTrends() {
  const [days, setDays] = useState(30);

  const { data: analytics } = useQuery({
    queryKey: ['admin', 'analytics', 'dreams'],
    queryFn: fetchDreamAnalytics,
    staleTime: 5 * 60_000,
  });

  const { data: engagement, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'engagement', days],
    queryFn: () => fetchEngagementAnalytics(days),
    staleTime: 5 * 60_000,
  });

  const catEntries  = Object.entries(analytics?.totalByCategory ?? {}).sort((a, b) => b[1] - a[1]);
  const totalDreams = catEntries.reduce((s, [, v]) => s + v, 0) || 1;
  const maxDream    = Math.max(...(engagement?.dailyDreams ?? []).map((d) => d.count), 1);

  return (
    <div className="section-business relative">
      <Header
        title="Rüya Trendleri"
        subtitle="Kategori dağılımı ve günlük rüya oluşturma trendleri"
        section="business"
        actions={
          <div className="flex gap-1.5">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  days === d
                    ? 'bg-dc-primary/20 text-dc-primary border-dc-primary/40'
                    : 'bg-dc-surface text-dc-secondary border-dc-border hover:border-dc-primary/30 hover:text-dc-text'
                }`}
              >
                {d}G
              </button>
            ))}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Toplam Rüya',     value: engagement?.totalDreams    ?? 0 },
          { label: 'Öne Çıkan',       value: analytics?.featuredCount   ?? 0, cls: 'text-yellow-400' },
          { label: 'Gizli',           value: analytics?.hiddenCount     ?? 0, cls: 'text-dc-error' },
          { label: 'Raporlanan',      value: analytics?.reportedCount   ?? 0, cls: 'text-dc-warning' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-dc-surface border border-dc-border rounded-xl p-5">
            <p className="text-dc-muted text-xs mb-1">{label}</p>
            <p className={`font-bold text-2xl ${cls ?? 'text-dc-text'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Category distribution */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">◈ Kategori Dağılımı</h3>
          {catEntries.length === 0 ? (
            <p className="text-dc-muted text-xs text-center py-10">Veri yok</p>
          ) : (
            <div className="space-y-3">
              {catEntries.map(([cat, count]) => {
                const cfg = CATEGORY_CFG[cat] ?? { label: cat, color: 'bg-dc-primary/60', glyph: '○' };
                const pct = Math.round(count / totalDreams * 100);
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-dc-text text-xs font-medium">{cfg.glyph} {cfg.label}</span>
                      <span className="text-dc-muted text-xs">{pct}% · {count}</span>
                    </div>
                    <div className="h-3 bg-dc-bg rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily dream creation */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">
            🌙 Günlük Rüya Oluşturma (Son {days}G)
          </h3>
          {isLoading ? (
            <div className="h-60 animate-pulse bg-dc-surface-high rounded-lg" />
          ) : (engagement?.dailyDreams ?? []).length === 0 ? (
            <div className="text-center py-16">
              <span className="text-3xl">🌙</span>
              <p className="text-dc-muted text-sm mt-3">Bu dönemde rüya verisi yok</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto pr-1">
              {[...(engagement?.dailyDreams ?? [])].reverse().map((d) => (
                <MiniBar key={d.date} date={d.date} count={d.count} max={maxDream} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Placeholder modules */}
      <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
        <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">📋 Phase 2'de Planlanıyor</h3>
        <div className="grid grid-cols-4 gap-3">
          {['Duygu Trendi', 'Sembol Trendi', 'Tema Trendi', 'AI Skor Trendi',
            'Dil Dağılımı', 'Coğrafi Rüya Haritası', 'Haftalık Cohort', 'Mevsimsel Analiz'].map((item) => (
            <div key={item} className="flex items-center gap-2 bg-dc-bg border border-dc-border rounded-lg px-3 py-2.5 text-dc-muted text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-dc-border shrink-0" /> {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
