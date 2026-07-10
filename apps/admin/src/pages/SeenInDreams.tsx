import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchSeenInDreams, computeSeenInDreams } from '../api/admin.api';
import type { SeenInDream } from '../types/admin.types';

// ── Config ─────────────────────────────────────────────────────────────────────

const TYPE_CFG: Record<string, { color: string; bg: string; border: string; glyph: string; label: string }> = {
  symbol:   { color: '#FFB800', bg: 'rgba(255,184,0,0.08)',   border: 'rgba(255,184,0,0.25)',   glyph: '◈', label: 'SEMBOL'  },
  figure:   { color: '#CC80FF', bg: 'rgba(204,128,255,0.08)', border: 'rgba(204,128,255,0.25)', glyph: '◉', label: 'FİGÜR'   },
  location: { color: '#00CFFF', bg: 'rgba(0,207,255,0.08)',   border: 'rgba(0,207,255,0.25)',   glyph: '⊕', label: 'MEKAN'   },
};

// ── Pattern card ───────────────────────────────────────────────────────────────

function PatternCard({ item }: { item: SeenInDream }) {
  const cfg = TYPE_CFG[item.pattern_type] ?? TYPE_CFG.symbol;
  const confPct = Math.min(100, Math.round(item.confidence_score));

  return (
    <div className="rounded-xl border p-4 transition-all hover:scale-[1.01]"
      style={{ background: cfg.bg, borderColor: cfg.border }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span style={{ color: cfg.color }} className="text-sm">{cfg.glyph}</span>
            <span className="text-[8px] font-bold tracking-widest font-mono" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
          <p className="text-dc-text text-sm font-semibold capitalize truncate">{item.pattern_value}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono font-black text-xl leading-none" style={{ color: cfg.color }}>
            {item.user_count}
          </p>
          <p className="text-dc-muted text-[9px]">rüyacı</p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-dc-muted text-[9px] uppercase tracking-wider">Güven</span>
          <span className="text-[10px] font-mono font-bold" style={{ color: cfg.color }}>%{confPct}</span>
        </div>
        <div className="h-1 bg-dc-bg rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${confPct}%`, background: cfg.color }} />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-[10px] mb-3">
        <span className="text-dc-muted">{item.dream_count} rüyada görüldü</span>
        <span className="text-dc-muted font-mono">
          {new Date(item.last_seen_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
        </span>
      </div>

      {/* Sample usernames */}
      {item.sample_usernames && item.sample_usernames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.sample_usernames.slice(0, 5).map(u => (
            <span key={u} className="text-[9px] px-1.5 py-0.5 rounded font-mono"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              @{u}
            </span>
          ))}
          {item.sample_usernames.length > 5 && (
            <span className="text-[9px] text-dc-muted px-1.5 py-0.5">
              +{item.sample_usernames.length - 5}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { value: undefined, label: 'Tümü'       },
  { value: 'symbol',  label: '◈ Semboller' },
  { value: 'figure',  label: '◉ Figürler'  },
  { value: 'location',label: '⊕ Mekanlar'  },
];

export default function SeenInDreams() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [feedback,   setFeedback]   = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['seen-in-dreams', typeFilter],
    queryFn:  () => fetchSeenInDreams(typeFilter, 100),
  });

  const computeMut = useMutation({
    mutationFn: computeSeenInDreams,
    onSuccess: (res) => {
      setFeedback(`✓ ${res.upserted} sembol / figür / mekan tespiti güncellendi`);
      void refetch();
      setTimeout(() => setFeedback(''), 4000);
    },
  });

  const items   = data ?? [];
  const symbols  = items.filter(i => i.pattern_type === 'symbol');
  const figures  = items.filter(i => i.pattern_type === 'figure');
  const locations = items.filter(i => i.pattern_type === 'location');

  return (
    <div className="section-system relative">
      <Header
        title="Seen In Dreams"
        subtitle="Birden fazla rüyacıda tespit edilen ortak semboller, figürler ve mekanlar"
        section="system"
        actions={
          <button
            onClick={() => computeMut.mutate()}
            disabled={computeMut.isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-50"
            style={{ background: 'rgba(255,184,0,0.1)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.3)' }}>
            {computeMut.isPending ? '◈ Taranıyor...' : '◈ Tespitleri Güncelle'}
          </button>
        }
      />

      {feedback && (
        <div className="mb-4 px-4 py-2.5 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(0,232,122,0.08)', border: '1px solid rgba(0,232,122,0.2)', color: '#00E87A' }}>
          {feedback}
        </div>
      )}

      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { type: 'symbol',   label: 'Ortak Sembol',  count: symbols.length,   color: '#FFB800' },
          { type: 'figure',   label: 'Ortak Figür',   count: figures.length,   color: '#CC80FF' },
          { type: 'location', label: 'Ortak Mekan',   count: locations.length, color: '#00CFFF' },
        ].map(s => {
          const cfg = TYPE_CFG[s.type];
          const top = items.filter(i => i.pattern_type === s.type).sort((a, b) => b.user_count - a.user_count)[0];
          return (
            <div key={s.type} className="os-card p-4 cursor-pointer transition-all"
              style={typeFilter === s.type ? { background: cfg.bg, borderColor: cfg.border } : {}}
              onClick={() => setTypeFilter(typeFilter === s.type ? undefined : s.type)}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: cfg.color }}>{cfg.glyph}</span>
                <span className="text-[9px] font-bold tracking-widest font-mono" style={{ color: cfg.color }}>
                  {s.label.toUpperCase()}
                </span>
              </div>
              <p className="text-3xl font-black font-mono mb-2" style={{ color: cfg.color }}>{s.count}</p>
              {top && (
                <p className="text-dc-muted text-[10px]">
                  En yaygın: <span className="text-dc-text capitalize">{top.pattern_value}</span>
                  <span className="font-mono ml-1">({top.user_count} rüyacı)</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-5">
        {TYPE_FILTERS.map(f => {
          const cfg = f.value ? TYPE_CFG[f.value] : null;
          const active = typeFilter === f.value;
          return (
            <button key={f.value ?? 'all'} onClick={() => setTypeFilter(f.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
              style={active && cfg ? {
                background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
              } : active ? {
                background: 'rgba(123,111,255,0.1)', color: '#7B6FFF', border: '1px solid rgba(123,111,255,0.3)',
              } : {
                background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
              {f.label}
            </button>
          );
        })}
        <span className="ml-auto text-[10px] text-dc-muted font-mono">{items.length} tespit</span>
      </div>

      {/* Pattern grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.025)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-5xl mb-4 opacity-20">◈</p>
          <p className="text-dc-muted mb-2">Henüz tespit yok.</p>
          <p className="text-dc-muted text-sm">Yukarıdaki "Tespitleri Güncelle" düğmesini kullanın.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {items.map(item => (
            <PatternCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
