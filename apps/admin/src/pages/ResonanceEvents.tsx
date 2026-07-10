import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchDreamConnections, fetchUserResonanceScores } from '../api/admin.api';
import type { DreamConnection, UserResonanceScore } from '../types/admin.types';

// ── Config ─────────────────────────────────────────────────────────────────────

const LEVEL_CFG: Record<string, { color: string; bg: string; border: string; glyph: string; label: string }> = {
  cosmic:  { color: '#FFB800', bg: 'rgba(255,184,0,0.08)',   border: 'rgba(255,184,0,0.28)',   glyph: '✦', label: 'COSMİK' },
  deep:    { color: '#CC80FF', bg: 'rgba(204,128,255,0.08)', border: 'rgba(204,128,255,0.28)', glyph: '◎', label: 'DERİN' },
  surface: { color: '#00CFFF', bg: 'rgba(0,207,255,0.08)',   border: 'rgba(0,207,255,0.28)',   glyph: '◈', label: 'YÜZEY' },
  dormant: { color: '#5A5A84', bg: 'rgba(90,90,132,0.06)',   border: 'rgba(90,90,132,0.18)',   glyph: '○', label: 'UYUKLAYAN' },
};

function fmt(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1)  return `${Math.floor(diff / 60_000)}dk önce`;
  if (h < 24) return `${h}s önce`;
  return `${Math.floor(h / 24)}g önce`;
}

// ── Resonance event card ───────────────────────────────────────────────────────

function ResonanceCard({ conn }: { conn: DreamConnection }) {
  const cfg = LEVEL_CFG[conn.resonance_level] ?? LEVEL_CFG.surface;
  const scoreArc = Math.round(conn.match_score_pct * 2.83); // 100 → 283 (SVG circumference ≈ 283)

  return (
    <div className="rounded-2xl p-5 border transition-all hover:scale-[1.01]"
      style={{ background: cfg.bg, borderColor: cfg.border, boxShadow: `0 4px 20px ${cfg.color}08` }}>

      {/* Score ring */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative shrink-0 w-14 h-14">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
            <circle cx="18" cy="18" r="15.5" fill="none"
              stroke={cfg.color} strokeWidth="2.5"
              strokeDasharray={`${Math.round(scoreArc / 10)} 97.4`}
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-black font-mono" style={{ color: cfg.color }}>
              {conn.match_score_pct}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm" style={{ color: cfg.color }}>{cfg.glyph}</span>
            <span className="text-[9px] font-bold tracking-widest font-mono" style={{ color: cfg.color }}>
              {cfg.label} REZONANS
            </span>
          </div>
          <p className="text-dc-text text-xs font-semibold">
            @{conn.user_a}
            <span className="text-dc-muted font-normal mx-1">↔</span>
            @{conn.user_b}
          </p>
          <p className="text-dc-muted text-[10px] font-mono mt-0.5">{fmt(conn.created_at)}</p>
        </div>
      </div>

      {/* Dreams */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Link to={`/dreams/${conn.dream_a_id}`}
          className="p-2 rounded-lg text-[10px] truncate text-dc-secondary hover:text-dc-text transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          🌙 {conn.dream_a_title ?? 'Başlıksız rüya'}
        </Link>
        <Link to={`/dreams/${conn.dream_b_id}`}
          className="p-2 rounded-lg text-[10px] truncate text-dc-secondary hover:text-dc-text transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          🌙 {conn.dream_b_title ?? 'Başlıksız rüya'}
        </Link>
      </div>

      {/* Shared elements */}
      <div className="space-y-1.5">
        {conn.shared_symbols.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[8px] text-dc-muted font-mono uppercase w-12 shrink-0">Sembol</span>
            {conn.shared_symbols.slice(0, 4).map(s => (
              <span key={s} className="text-[9px] px-1.5 py-0.5 rounded capitalize"
                style={{ color: '#FFB800', background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)' }}>
                {s}
              </span>
            ))}
          </div>
        )}
        {conn.shared_emotions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[8px] text-dc-muted font-mono uppercase w-12 shrink-0">Duygu</span>
            {conn.shared_emotions.slice(0, 4).map(e => (
              <span key={e} className="text-[9px] px-1.5 py-0.5 rounded capitalize"
                style={{ color: '#CC80FF', background: 'rgba(204,128,255,0.1)', border: '1px solid rgba(204,128,255,0.25)' }}>
                {e}
              </span>
            ))}
          </div>
        )}
        {conn.shared_themes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[8px] text-dc-muted font-mono uppercase w-12 shrink-0">Tema</span>
            {conn.shared_themes.slice(0, 4).map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded capitalize"
                style={{ color: '#00CFFF', background: 'rgba(0,207,255,0.1)', border: '1px solid rgba(0,207,255,0.25)' }}>
                {t}
              </span>
            ))}
          </div>
        )}
        {conn.shared_archetypes && conn.shared_archetypes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[8px] text-dc-muted font-mono uppercase w-12 shrink-0">Arketip</span>
            {conn.shared_archetypes.slice(0, 3).map(a => (
              <span key={a} className="text-[9px] px-1.5 py-0.5 rounded capitalize"
                style={{ color: '#FF8CF7', background: 'rgba(255,140,247,0.1)', border: '1px solid rgba(255,140,247,0.25)' }}>
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── User resonance row ─────────────────────────────────────────────────────────

function UserResonanceRow({ u }: { u: UserResonanceScore }) {
  const cfg = LEVEL_CFG[u.resonance_level] ?? LEVEL_CFG.dormant;
  return (
    <div className="grid grid-cols-12 gap-3 items-center px-5 py-3.5 data-row border-b"
      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="col-span-5 flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
          {cfg.glyph}
        </div>
        <div className="min-w-0">
          <Link to={`/users/${u.user_id}`}
            className="text-dc-text text-[11px] font-semibold truncate block hover:text-dc-primary transition-colors">
            @{u.username}
          </Link>
          <p className="text-dc-muted text-[9px]">{u.dream_count} rüya</p>
        </div>
      </div>
      <div className="col-span-2 text-center">
        <p className="font-mono font-black text-sm" style={{ color: cfg.color }}>
          %{u.collective_alignment}
        </p>
        <p className="text-dc-muted text-[9px]">kolektif</p>
      </div>
      <div className="col-span-2 text-center">
        <p className="font-mono font-bold text-sm text-dc-text">{u.connection_count}</p>
        <p className="text-dc-muted text-[9px]">bağlantı</p>
      </div>
      <div className="col-span-2 text-center">
        <p className="font-mono font-bold text-sm" style={{ color: '#00E87A' }}>
          %{Math.round(u.dream_uniqueness_score)}
        </p>
        <p className="text-dc-muted text-[9px]">özgünlük</p>
      </div>
      <div className="col-span-1 flex justify-end">
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded font-mono"
          style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

const LEVEL_FILTERS = [
  { value: '',       label: 'Tümü'   },
  { value: 'cosmic', label: '✦ Kozmik' },
  { value: 'deep',   label: '◎ Derin' },
  { value: 'surface',label: '◈ Yüzey' },
];

export default function ResonanceEvents() {
  const [levelFilter, setLevelFilter] = useState('');
  const [userPage, setUserPage] = useState(1);

  const { data: connections, isLoading: connLoading } = useQuery({
    queryKey: ['resonance-events', levelFilter],
    queryFn:  () => fetchDreamConnections(1, 60, levelFilter === 'cosmic' ? 80 : levelFilter === 'deep' ? 60 : 0),
  });

  const { data: userScores } = useQuery({
    queryKey: ['user-resonance', userPage],
    queryFn:  () => fetchUserResonanceScores(userPage, 20),
  });

  const filtered = levelFilter
    ? (connections?.items ?? []).filter(c => c.resonance_level === levelFilter)
    : (connections?.items ?? []);

  return (
    <div className="section-system relative">
      <Header
        title="Resonance Events"
        subtitle="Rüyalar arası güçlü rezonans olayları ve kullanıcı rezonans profilleri"
        section="system"
      />

      {/* Hero stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {Object.entries(LEVEL_CFG).map(([level, cfg]) => {
          const count = (connections?.items ?? []).filter(c => c.resonance_level === level).length;
          return (
            <div key={level} className="os-card p-4 cursor-pointer transition-all"
              style={levelFilter === level ? { background: cfg.bg, borderColor: cfg.border } : {}}
              onClick={() => setLevelFilter(levelFilter === level ? '' : level)}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: cfg.color }}>{cfg.glyph}</span>
                <span className="text-[9px] font-bold tracking-widest font-mono" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-2xl font-black font-mono" style={{ color: cfg.color }}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-5">
        {LEVEL_FILTERS.map(f => {
          const cfg = f.value ? LEVEL_CFG[f.value] : null;
          const active = levelFilter === f.value;
          return (
            <button key={f.value} onClick={() => setLevelFilter(f.value)}
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
        <span className="ml-auto text-[10px] text-dc-muted font-mono">{filtered.length} olay</span>
      </div>

      {/* Two-column */}
      <div className="flex gap-5 items-start">
        {/* Resonance cards */}
        <div className="flex-1 min-w-0">
          {connLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 rounded-2xl animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.025)' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-5xl mb-4 opacity-20">◎</p>
              <p className="text-dc-muted">Bu seviyede rezonans olayı yok</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filtered.slice(0, 20).map(conn => (
                <ResonanceCard key={conn.id} conn={conn} />
              ))}
            </div>
          )}
        </div>

        {/* User resonance scores */}
        <div className="w-80 shrink-0">
          <div className="os-card overflow-hidden">
            <div className="os-panel-header">
              <p className="os-title">KULLANICI REZONANS</p>
            </div>
            <div className="os-panel-header grid grid-cols-12 gap-3 !py-2">
              <span className="os-label col-span-5">KULLANICI</span>
              <span className="os-label col-span-2 text-center">KOLEKTİF</span>
              <span className="os-label col-span-2 text-center">BAĞLANTI</span>
              <span className="os-label col-span-2 text-center">ÖZGÜN</span>
              <span className="os-label col-span-1" />
            </div>

            {(userScores?.items ?? []).length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-dc-muted text-xs">Henüz hesaplanmış veri yok.</p>
                <p className="text-dc-muted text-[10px] mt-1">Dream Connections sayfasından "Rezonans Hesapla" düğmesini kullanın.</p>
              </div>
            ) : (
              (userScores?.items ?? []).map(u => (
                <UserResonanceRow key={u.id} u={u} />
              ))
            )}

            {(userScores?.pages ?? 0) > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <button disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}
                  className="text-xs text-dc-muted hover:text-dc-text disabled:opacity-30 transition-colors">
                  ← Önceki
                </button>
                <span className="text-[10px] text-dc-muted font-mono">{userPage}/{userScores?.pages}</span>
                <button disabled={userPage >= (userScores?.pages ?? 1)} onClick={() => setUserPage(p => p + 1)}
                  className="text-xs text-dc-muted hover:text-dc-text disabled:opacity-30 transition-colors">
                  Sonraki →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
