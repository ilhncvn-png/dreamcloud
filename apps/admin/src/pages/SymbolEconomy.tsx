import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchSymbolEconomy } from '../api/admin.api';
import type { SymbolTrend, EmergingSymbol, ConsistentSymbol } from '../api/admin.api';

// ── Sub-components ─────────────────────────────────────────────────────────────

function TrendRow({ s, max }: { s: SymbolTrend; max: number }) {
  const rising = s.trend === 'rising';
  const color  = rising ? '#00E87A' : '#FF3060';
  const pct    = Math.max(4, Math.round((Math.abs(s.delta) / Math.max(max, 1)) * 100));
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="w-36 shrink-0">
        <p className="text-dc-text text-xs font-semibold capitalize">{s.manifestation}</p>
        <p className="text-dc-muted text-[10px] font-mono">{s.prior_count} → {s.current_count}</p>
      </div>
      <div className="flex-1 h-1.5 bg-dc-bg rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-20 text-right shrink-0">
        <span className="text-xs font-bold font-mono" style={{ color }}>
          {rising ? '+' : ''}{s.delta}
        </span>
        <p className="text-[9px] text-dc-muted font-mono">{Number(s.growth_pct) >= 0 ? '+' : ''}{Number(s.growth_pct).toFixed(1)}%</p>
      </div>
    </div>
  );
}

function EmergingCard({ s }: { s: EmergingSymbol }) {
  const confColor = s.avg_confidence >= 70 ? '#00E87A' : s.avg_confidence >= 50 ? '#FFB800' : '#60A5FA';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-dc-text text-xs font-semibold capitalize">{s.manifestation}</p>
        <p className="text-dc-muted text-[10px]">ilk kez bu hafta</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-dc-text text-xs font-mono font-bold">{s.count}</p>
          <p className="text-dc-muted text-[9px]">görünüm</p>
        </div>
        <div className="w-12 text-right">
          <span className="text-[10px] font-bold font-mono" style={{ color: confColor }}>{s.avg_confidence}%</span>
          <p className="text-dc-muted text-[9px]">güven</p>
        </div>
      </div>
    </div>
  );
}

function ConsistentRow({ s }: { s: ConsistentSymbol }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="flex-1">
        <p className="text-dc-text text-xs font-semibold capitalize">{s.manifestation}</p>
      </div>
      <p className="text-dc-muted text-xs font-mono">{s.prior_count} → {s.current_count}</p>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(0,207,255,0.12)', color: '#00CFFF' }}>
        ±{s.abs_delta}
      </span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SymbolEconomy() {
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['symbol-economy'],
    queryFn:  fetchSymbolEconomy,
    staleTime: 5 * 60_000,
  });

  const maxRisingDelta  = data ? Math.max(...data.rising.map(s => s.delta), 1) : 1;
  const maxFallingDelta = data ? Math.max(...data.falling.map(s => Math.abs(s.delta)), 1) : 1;

  return (
    <div className="section-system relative">
      <Header
        title="Symbol Economy"
        subtitle="Yükselen, düşen, ortaya çıkan ve sabit semboller — haftalık sembol ekonomisi"
        section="system"
        actions={
          <button onClick={() => void refetch()}
            className="px-4 py-2 rounded-lg text-xs font-bold border transition-all"
            style={{ background: 'rgba(0,207,255,0.08)', color: '#00CFFF', border: '1px solid rgba(0,207,255,0.25)' }}>
            {isFetching ? '...' : 'Yenile'}
          </button>
        }
      />
      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">

        {isFetching && !data && (
          <div className="flex items-center justify-center h-40 text-dc-muted text-sm animate-pulse">Sembol ekonomisi hesaplanıyor...</div>
        )}
        {isError && <div className="dc-card p-5 text-center text-dc-muted text-sm">Veri yüklenemedi.</div>}

        {/* Totals */}
        {data?.totals && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Benzersiz Sembol', val: data.totals.unique_symbols.toString(), color: '#A78BFA' },
              { label: 'Toplam Görünüm',   val: data.totals.total_appearances.toString(), color: '#00CFFF' },
              { label: 'Ort. Güven',        val: `${Number(data.totals.avg_confidence).toFixed(1)}%`, color: '#00E87A' },
            ].map(({ label, val, color }) => (
              <div key={label} className="dc-card p-4 text-center">
                <p className="text-dc-muted text-[10px] font-bold tracking-widest uppercase mb-1">{label}</p>
                <p className="text-xl font-bold font-mono" style={{ color }}>{val}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rising */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-bold" style={{ color: '#00E87A' }}>⬆ Yükselen Semboller</h3>
              <span className="text-[10px] font-mono text-dc-muted">{data?.rising.length ?? 0} sembol</span>
            </div>
            <div className="px-5 py-2">
              {(data?.rising ?? []).map(s => <TrendRow key={s.manifestation} s={s} max={maxRisingDelta} />)}
              {data?.rising.length === 0 && <p className="text-dc-muted text-sm py-4">Bu hafta yükselen sembol yok.</p>}
            </div>
          </div>

          {/* Falling */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-bold" style={{ color: '#FF3060' }}>⬇ Düşen Semboller</h3>
              <span className="text-[10px] font-mono text-dc-muted">{data?.falling.length ?? 0} sembol</span>
            </div>
            <div className="px-5 py-2">
              {(data?.falling ?? []).map(s => <TrendRow key={s.manifestation} s={s} max={maxFallingDelta} />)}
              {data?.falling.length === 0 && <p className="text-dc-muted text-sm py-4">Bu hafta düşen sembol yok.</p>}
            </div>
          </div>

          {/* Emerging */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-bold" style={{ color: '#FFB800' }}>✦ Ortaya Çıkan Semboller</h3>
              <span className="text-[10px] font-mono text-dc-muted">{data?.emerging.length ?? 0} yeni</span>
            </div>
            <div className="px-5 py-2">
              {(data?.emerging ?? []).map(s => <EmergingCard key={s.manifestation} s={s} />)}
              {data?.emerging.length === 0 && <p className="text-dc-muted text-sm py-4">Bu hafta yeni sembol yok.</p>}
            </div>
          </div>

          {/* Consistent */}
          <div className="dc-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-bold" style={{ color: '#00CFFF' }}>◎ Sabit Semboller</h3>
              <span className="text-[10px] font-mono text-dc-muted">{data?.consistent.length ?? 0} sembol</span>
            </div>
            <div className="px-5 py-2">
              {(data?.consistent ?? []).map(s => <ConsistentRow key={s.manifestation} s={s} />)}
              {data?.consistent.length === 0 && <p className="text-dc-muted text-sm py-4">Sabit sembol yok.</p>}
            </div>
          </div>
        </div>

        {data && (
          <p className="text-dc-muted/50 text-[10px] text-right font-mono">{new Date(data.fetchedAt).toLocaleString('tr-TR')} · bu hafta vs geçen hafta</p>
        )}
      </div>
    </div>
  );
}
