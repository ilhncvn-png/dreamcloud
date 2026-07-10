import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchGrowthAnalytics } from '../api/admin.api';
import Header from '../components/Header';

function fmt(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
       : n >= 1_000     ? `${(n / 1_000).toFixed(1)}K`
       : String(n);
}

function MiniBar({ date, count, max, label }: { date: string; count: number; max: number; label: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const d   = new Date(date);
  const dayLabel = d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-dc-border/30 last:border-0">
      <span className="text-dc-muted text-[10px] w-14 shrink-0">{dayLabel}</span>
      <div className="flex-1 h-2 bg-dc-bg rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${label === 'new' ? 'bg-dc-primary/70' : 'bg-dc-success/60'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-dc-text text-xs font-semibold w-8 text-right shrink-0">{count}</span>
    </div>
  );
}

export default function UserGrowth() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'growth', days],
    queryFn: () => fetchGrowthAnalytics(days),
    staleTime: 5 * 60_000,
  });

  const maxNew    = Math.max(...(data?.dailyNewUsers    ?? []).map((d) => d.count), 1);
  const maxActive = Math.max(...(data?.dailyActiveUsers ?? []).map((d) => d.count), 1);
  const growthRate = data?.growthRateVsLastWeek ?? 0;

  return (
    <div className="section-business relative">
      <Header
        title="Kullanıcı Büyümesi"
        subtitle="Günlük kayıt ve aktif kullanıcı trendleri"
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
          { label: 'Toplam Kullanıcı',   value: fmt(data?.totalUsers      ?? 0), sub: 'kayıtlı hesap' },
          { label: `${days}G Yeni`,       value: fmt(data?.monthlyNewUsers ?? 0), sub: `son ${days} gün` },
          { label: 'Bu Hafta Yeni',       value: fmt(data?.weeklyNewUsers  ?? 0), sub: 'son 7 gün' },
          {
            label:  'Büyüme Oranı',
            value:  `${growthRate > 0 ? '+' : ''}${growthRate}%`,
            sub:    'geçen haftaya göre',
            cls:    growthRate > 0 ? 'text-dc-success' : growthRate < 0 ? 'text-dc-error' : 'text-dc-text',
          },
        ].map(({ label, value, sub, cls }) => (
          <div key={label} className="bg-dc-surface border border-dc-border rounded-xl p-5">
            <p className="text-dc-muted text-xs mb-1">{label}</p>
            <p className={`font-bold text-2xl ${cls ?? 'text-dc-text'}`}>{value}</p>
            {sub && <p className="text-dc-muted text-[10px] mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-5">
          {[0, 1].map((i) => <div key={i} className="bg-dc-surface border border-dc-border rounded-xl p-5 h-80 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {/* Daily new users */}
          <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
            <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">
              📈 Günlük Yeni Kayıtlar
            </h3>
            {(data?.dailyNewUsers ?? []).length === 0 ? (
              <div className="text-center py-16">
                <span className="text-3xl">📈</span>
                <p className="text-dc-muted text-sm mt-3">Bu dönemde yeni kayıt yok</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto pr-1">
                {[...(data?.dailyNewUsers ?? [])].reverse().map((d) => (
                  <MiniBar key={d.date} date={d.date} count={d.count} max={maxNew} label="new" />
                ))}
              </div>
            )}
          </div>

          {/* Daily active users */}
          <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
            <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">
              ⚡ Günlük Aktif Kullanıcılar
            </h3>
            {(data?.dailyActiveUsers ?? []).length === 0 ? (
              <div className="text-center py-16">
                <span className="text-3xl">⚡</span>
                <p className="text-dc-muted text-sm mt-3">Bu dönemde aktif kullanıcı verisi yok</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto pr-1">
                {[...(data?.dailyActiveUsers ?? [])].reverse().map((d) => (
                  <MiniBar key={d.date} date={d.date} count={d.count} max={maxActive} label="active" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Retention placeholder */}
      <div className="mt-5 bg-dc-surface border border-dc-border rounded-xl p-5">
        <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">📋 Phase 2'de Planlanıyor</h3>
        <div className="grid grid-cols-3 gap-3">
          {['D1/D7/D30 Retention', 'Coğrafi Dağılım', 'Dil Dağılımı', 'Kayıt Kaynağı', 'Churn Analizi', 'Cohort Analizi'].map((item) => (
            <div key={item} className="flex items-center gap-2 bg-dc-bg border border-dc-border rounded-lg px-3 py-2.5 text-dc-muted text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-dc-border shrink-0" /> {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
