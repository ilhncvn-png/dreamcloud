import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEngagementAnalytics } from '../api/admin.api';
import Header from '../components/Header';

function MiniBar({ date, count, max, color }: { date: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const d   = new Date(date);
  const dayLabel = d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-dc-border/30 last:border-0">
      <span className="text-dc-muted text-[10px] w-14 shrink-0">{dayLabel}</span>
      <div className="flex-1 h-2 bg-dc-bg rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-dc-text text-xs font-semibold w-8 text-right shrink-0">{count}</span>
    </div>
  );
}

export default function Engagement() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'engagement', days],
    queryFn: () => fetchEngagementAnalytics(days),
    staleTime: 5 * 60_000,
  });

  const maxDream = Math.max(...(data?.dailyDreams ?? []).map((d) => d.count), 1);

  return (
    <div className="section-business relative">
      <Header
        title="Etkileşim Analitik"
        subtitle="Beğeni, yorum, kaydetme ve rüya oluşturma metrikleri"
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

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Toplam Beğeni',    value: data?.totalLikes         ?? 0, cls: 'text-pink-400',      icon: '❤' },
          { label: 'Toplam Yorum',     value: data?.totalComments      ?? 0, cls: 'text-dc-warning',    icon: '💬' },
          { label: 'Toplam Kaydetme',  value: data?.totalSaves         ?? 0, cls: 'text-dc-primary',    icon: '🔖' },
          { label: 'Toplam Rüya',      value: data?.totalDreams        ?? 0, cls: 'text-dc-text',       icon: '🌙' },
        ].map(({ label, value, cls, icon }) => (
          <div key={label} className="bg-dc-surface border border-dc-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span>{icon}</span>
              <p className="text-dc-muted text-xs">{label}</p>
            </div>
            <p className={`font-bold text-2xl ${cls}`}>{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Avg per dream */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">Rüya Başına Ortalama</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-pink-400 font-bold text-3xl">{data?.avgLikesPerDream ?? 0}</p>
              <p className="text-dc-muted text-xs mt-1">Beğeni / Rüya</p>
            </div>
            <div className="text-center">
              <p className="text-dc-warning font-bold text-3xl">{data?.avgCommentsPerDream ?? 0}</p>
              <p className="text-dc-muted text-xs mt-1">Yorum / Rüya</p>
            </div>
          </div>
        </div>

        <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
          <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">Etkileşim Oranı</h3>
          <div className="space-y-3">
            {[
              { label: 'Beğeni Oranı',    value: data?.totalDreams ? Math.round((data.totalLikes    / data.totalDreams) * 100) : 0, color: 'bg-pink-500/60' },
              { label: 'Yorum Oranı',     value: data?.totalDreams ? Math.round((data.totalComments / data.totalDreams) * 100) : 0, color: 'bg-yellow-500/60' },
              { label: 'Kaydetme Oranı',  value: data?.totalDreams ? Math.round((data.totalSaves    / data.totalDreams) * 100) : 0, color: 'bg-dc-primary/60' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-dc-muted text-xs w-24 shrink-0">{label}</span>
                <div className="flex-1 h-2 bg-dc-bg rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
                </div>
                <span className="text-dc-text text-xs font-semibold w-8 text-right shrink-0">{value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily dreams chart */}
      <div className="bg-dc-surface border border-dc-border rounded-xl p-5 mb-5">
        <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">
          🌙 Günlük Rüya Oluşturma (Son {days}G)
        </h3>
        {isLoading ? (
          <div className="h-60 animate-pulse bg-dc-surface-high rounded-lg" />
        ) : (data?.dailyDreams ?? []).length === 0 ? (
          <div className="text-center py-16">
            <span className="text-3xl">🌙</span>
            <p className="text-dc-muted text-sm mt-3">Bu dönemde rüya verisi yok</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            <div className="max-h-64 overflow-y-auto pr-1">
              {[...(data?.dailyDreams ?? [])].reverse().slice(0, Math.ceil((data?.dailyDreams ?? []).length / 2)).map((d) => (
                <MiniBar key={d.date} date={d.date} count={d.count} max={maxDream} color="bg-dc-primary/60" />
              ))}
            </div>
            <div className="max-h-64 overflow-y-auto pr-1">
              {[...(data?.dailyDreams ?? [])].reverse().slice(Math.ceil((data?.dailyDreams ?? []).length / 2)).map((d) => (
                <MiniBar key={d.date} date={d.date} count={d.count} max={maxDream} color="bg-dc-primary/60" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Placeholder */}
      <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
        <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">📋 Phase 2'de Planlanıyor</h3>
        <div className="grid grid-cols-4 gap-3">
          {['Günlük Beğeni Trendi', 'Günlük Yorum Trendi', 'Viral Rüya Tespiti', 'Etkileşim Cohort',
            'Saatlik Aktivite', 'Haftalık Özet', 'Kullanıcı Segmenti Analizi', 'Push Notification Analitik'].map((item) => (
            <div key={item} className="flex items-center gap-2 bg-dc-bg border border-dc-border rounded-lg px-3 py-2.5 text-dc-muted text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-dc-border shrink-0" /> {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
