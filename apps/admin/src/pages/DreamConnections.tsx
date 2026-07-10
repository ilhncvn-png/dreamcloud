import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import {
  fetchDreamConnections,
  fetchConnectionFeed,
  computeUserResonanceScores,
} from '../api/admin.api';
import type { DreamConnection, ConnectionFeedEvent } from '../types/admin.types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1)  return `${Math.floor(diff / 60_000)}dk önce`;
  if (h < 24) return `${h}s önce`;
  return `${Math.floor(h / 24)}g önce`;
}

const LEVEL_CFG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  cosmic:  { color: '#FFB800', bg: 'rgba(255,184,0,0.1)',   border: 'rgba(255,184,0,0.3)',   label: 'COSMIC' },
  deep:    { color: '#CC80FF', bg: 'rgba(204,128,255,0.1)', border: 'rgba(204,128,255,0.3)', label: 'DEEP' },
  surface: { color: '#00CFFF', bg: 'rgba(0,207,255,0.1)',   border: 'rgba(0,207,255,0.3)',   label: 'SURFACE' },
  dormant: { color: '#5A5A84', bg: 'rgba(90,90,132,0.08)',  border: 'rgba(90,90,132,0.2)',   label: 'DORMANT' },
};

function ScoreBadge({ score, level }: { score: number; level: string }) {
  const cfg = LEVEL_CFG[level] ?? LEVEL_CFG.surface;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-mono font-black text-xl leading-none" style={{ color: cfg.color }}>
        {score}
      </span>
      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded font-mono"
        style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
        {cfg.label}
      </span>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded capitalize font-mono"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

// ── Connection row ─────────────────────────────────────────────────────────────

function ConnectionRow({ conn }: { conn: DreamConnection }) {
  const cfg = LEVEL_CFG[conn.resonance_level] ?? LEVEL_CFG.surface;
  return (
    <div className="grid grid-cols-12 gap-3 items-center px-5 py-4 data-row border-b"
      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>

      {/* Score */}
      <div className="col-span-1 flex justify-center">
        <ScoreBadge score={conn.match_score_pct} level={conn.resonance_level} />
      </div>

      {/* Dream A */}
      <div className="col-span-4 min-w-0">
        <Link to={`/dreams/${conn.dream_a_id}`}
          className="text-dc-text text-xs font-semibold truncate block hover:text-dc-primary transition-colors">
          {conn.dream_a_title ?? <em className="text-dc-muted font-normal">Başlıksız</em>}
        </Link>
        <Link to={`/users/${conn.user_a_id}`}
          className="text-dc-muted text-[10px] hover:text-dc-text transition-colors">
          @{conn.user_a}
        </Link>
      </div>

      {/* Connector */}
      <div className="col-span-1 flex flex-col items-center gap-1">
        <div className="h-px w-full" style={{ background: cfg.color, opacity: 0.4 }} />
        <span className="text-[8px] font-mono" style={{ color: cfg.color }}>◎</span>
        <div className="h-px w-full" style={{ background: cfg.color, opacity: 0.4 }} />
      </div>

      {/* Dream B */}
      <div className="col-span-4 min-w-0">
        <Link to={`/dreams/${conn.dream_b_id}`}
          className="text-dc-text text-xs font-semibold truncate block hover:text-dc-primary transition-colors">
          {conn.dream_b_title ?? <em className="text-dc-muted font-normal">Başlıksız</em>}
        </Link>
        <Link to={`/users/${conn.user_b_id}`}
          className="text-dc-muted text-[10px] hover:text-dc-text transition-colors">
          @{conn.user_b}
        </Link>
      </div>

      {/* Shared elements */}
      <div className="col-span-2 flex flex-wrap gap-1">
        {conn.shared_symbols.slice(0, 2).map(s => <Chip key={s} label={s} color="#FFB800" />)}
        {conn.shared_emotions.slice(0, 2).map(e => <Chip key={e} label={e} color="#CC80FF" />)}
        {conn.shared_themes.slice(0, 1).map(t => <Chip key={t} label={t} color="#00CFFF" />)}
      </div>

      {/* Time */}
      <div className="col-span-1 text-right">
        <p className="text-dc-muted text-[10px] font-mono">{fmt(conn.created_at)}</p>
        <p className="text-[9px] font-mono mt-0.5" style={{ color: cfg.color }}>
          {conn.shared_symbol_count}◈ {conn.shared_emotion_count}◉ {conn.shared_theme_count}∿
        </p>
      </div>
    </div>
  );
}

// ── Feed card ──────────────────────────────────────────────────────────────────

function FeedCard({ event }: { event: ConnectionFeedEvent }) {
  const cfg = LEVEL_CFG[event.resonance_level] ?? LEVEL_CFG.surface;
  return (
    <div className="p-3 rounded-xl border transition-all hover:border-opacity-60"
      style={{ background: cfg.bg, borderColor: cfg.border }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold font-mono" style={{ color: cfg.color }}>
          {event.score}% REZONANS
        </span>
        <span className="text-dc-muted text-[9px] font-mono">{fmt(event.created_at)}</span>
      </div>
      <p className="text-dc-text text-xs font-semibold">
        @{event.user_a} <span className="text-dc-muted font-normal">↔</span> @{event.user_b}
      </p>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {event.primary_symbol  && <Chip label={event.primary_symbol}  color="#FFB800" />}
        {event.primary_emotion && <Chip label={event.primary_emotion} color="#CC80FF" />}
        {event.primary_theme   && <Chip label={event.primary_theme}   color="#00CFFF" />}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

const SCORE_FILTERS = [
  { label: 'Tümü',   value: 0  },
  { label: '≥ 40%',  value: 40 },
  { label: '≥ 60%',  value: 60 },
  { label: '≥ 80%',  value: 80 },
];

export default function DreamConnections() {
  const qc = useQueryClient();
  const [page,     setPage]     = useState(1);
  const [minScore, setMinScore] = useState(0);
  const [feedback, setFeedback] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['connections', page, minScore],
    queryFn:  () => fetchDreamConnections(page, 30, minScore),
  });

  const { data: feed } = useQuery({
    queryKey: ['connection-feed'],
    queryFn:  () => fetchConnectionFeed(12),
    refetchInterval: 30_000,
  });

  const computeMut = useMutation({
    mutationFn: computeUserResonanceScores,
    onSuccess: (res) => {
      setFeedback(`✓ ${res.upserted} kullanıcı rezonans skoru güncellendi`);
      void qc.invalidateQueries({ queryKey: ['connections'] });
      setTimeout(() => setFeedback(''), 4000);
    },
  });

  const totalConnections = data?.total ?? 0;
  const highResonance    = (data?.items ?? []).filter(c => c.match_score_pct >= 70).length;

  return (
    <div className="section-system relative">
      <Header
        title="Dream Connections"
        subtitle="Rüyalar arası sembolik bağlantılar ve rezonans eşleşmeleri"
        section="system"
        actions={
          <button
            onClick={() => computeMut.mutate()}
            disabled={computeMut.isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-50"
            style={{ background: 'rgba(123,111,255,0.1)', color: '#7B6FFF', border: '1px solid rgba(123,111,255,0.3)' }}>
            {computeMut.isPending ? '◎ Hesaplanıyor...' : '◎ Rezonans Hesapla'}
          </button>
        }
      />

      {feedback && (
        <div className="mb-4 px-4 py-2.5 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(0,232,122,0.08)', border: '1px solid rgba(0,232,122,0.2)', color: '#00E87A' }}>
          {feedback}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Toplam Bağlantı', value: totalConnections, color: '#7B6FFF' },
          { label: 'Yüksek Rezonans', value: highResonance,    color: '#FFB800' },
          { label: 'Bu Sayfada',      value: data?.items.length ?? 0, color: '#00CFFF' },
          { label: 'Sayfa',           value: `${page} / ${data?.pages ?? 1}`, color: '#CC80FF' },
        ].map(s => (
          <div key={s.label} className="os-card p-4 text-center">
            <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-dc-muted text-[10px] mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-5 items-start">
        {/* Left: connections table */}
        <div className="flex-1 min-w-0">
          {/* Score filter */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-dc-muted text-xs">Min. Skor:</span>
            {SCORE_FILTERS.map(f => (
              <button key={f.value} onClick={() => { setMinScore(f.value); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                style={minScore === f.value ? {
                  background: 'rgba(123,111,255,0.12)', color: '#7B6FFF', border: '1px solid rgba(123,111,255,0.3)',
                } : {
                  background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-dc-muted text-[10px] font-mono">{totalConnections} bağlantı</span>
          </div>

          {/* Table */}
          <div className="os-card overflow-hidden">
            <div className="os-panel-header grid grid-cols-12 gap-3">
              <span className="os-label col-span-1 text-center">SKOR</span>
              <span className="os-title col-span-4">RÜYA A</span>
              <span className="os-label col-span-1 text-center">↔</span>
              <span className="os-title col-span-4">RÜYA B</span>
              <span className="os-label col-span-2">ORTAK</span>
              <span className="os-label col-span-1 text-right">ZAMAN</span>
            </div>

            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-5 py-4 animate-pulse border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div className="h-4 rounded" style={{ background: 'rgba(255,255,255,0.04)', width: '80%' }} />
                </div>
              ))
            ) : (data?.items ?? []).length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-4xl mb-3 opacity-20">◎</p>
                <p className="text-dc-muted text-sm">Henüz bağlantı yok</p>
              </div>
            ) : (
              (data?.items ?? []).map(conn => (
                <ConnectionRow key={conn.id} conn={conn} />
              ))
            )}
          </div>

          {/* Pagination */}
          {(data?.pages ?? 0) > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 text-xs rounded-lg transition-all disabled:opacity-30 text-dc-secondary hover:text-dc-text"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                ← Önceki
              </button>
              <span className="os-label">{page} / {data?.pages}</span>
              <button disabled={page >= (data?.pages ?? 1)} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 text-xs rounded-lg transition-all disabled:opacity-30 text-dc-secondary hover:text-dc-text"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                Sonraki →
              </button>
            </div>
          )}
        </div>

        {/* Right: live feed */}
        <div className="w-72 shrink-0">
          <div className="os-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative">
                <span className="w-1.5 h-1.5 rounded-full block bg-dc-success" />
                <span className="absolute inset-0 rounded-full bg-dc-success animate-status-ping" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-dc-success">Canlı Bağlantı Akışı</p>
            </div>
            <div className="space-y-2">
              {(feed ?? []).slice(0, 10).map(e => (
                <FeedCard key={e.id} event={e} />
              ))}
              {!feed?.length && (
                <p className="text-dc-muted text-xs text-center py-6">Henüz bağlantı yok</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
