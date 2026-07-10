import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchCollectiveSignals } from '../api/admin.api';
import type { CollectiveSignals } from '../types/admin.types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function growthColor(growth: number): string {
  if (growth > 10) return '#00E87A';
  if (growth > 3)  return '#FFB800';
  if (growth < 0)  return '#FF4A5E';
  return '#5A5A84';
}

function shiftColor(shift: number | null): string {
  if (shift === null || shift === 0) return '#5A5A84';
  if (shift > 20)  return '#00E87A';
  if (shift > 5)   return '#FFB800';
  if (shift < -20) return '#FF4A5E';
  if (shift < -5)  return '#FF8C00';
  return '#00CFFF';
}

// ── Emerging symbol bar ────────────────────────────────────────────────────────

function SymbolBar({
  manifestation, current_count, prior_count, growth, maxGrowth,
}: {
  manifestation: string; current_count: number; prior_count: number;
  growth: number; maxGrowth: number;
}) {
  const barPct = maxGrowth > 0 ? Math.max(5, Math.round((current_count / maxGrowth) * 100)) : 5;
  const color  = growthColor(growth);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0"
      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="w-28 shrink-0">
        <p className="text-dc-text text-xs font-semibold capitalize truncate">{manifestation}</p>
        <p className="text-dc-muted text-[9px] font-mono">{prior_count} → {current_count}</p>
      </div>
      <div className="flex-1 h-1.5 bg-dc-bg rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: color }} />
      </div>
      <div className="w-14 text-right shrink-0">
        <span className="text-xs font-bold font-mono" style={{ color }}>
          {growth >= 0 ? '+' : ''}{growth}
        </span>
      </div>
    </div>
  );
}

// ── Emotion shift row ──────────────────────────────────────────────────────────

function EmotionRow({
  emotion, current_count, prior_count: _p, shift_pct, maxCount,
}: {
  emotion: string; current_count: number; prior_count: number;
  shift_pct: number | null; maxCount: number;
}) {
  void _p;
  const barPct = maxCount > 0 ? Math.round((current_count / maxCount) * 100) : 0;
  const color  = shiftColor(shift_pct);
  return (
    <div className="grid grid-cols-12 gap-3 items-center py-2.5 border-b last:border-0"
      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="col-span-3">
        <p className="text-dc-text text-xs capitalize font-semibold">{emotion}</p>
      </div>
      <div className="col-span-5">
        <div className="h-1.5 bg-dc-bg rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: '#CC80FF' }} />
        </div>
      </div>
      <div className="col-span-2 text-center">
        <span className="text-dc-text text-xs font-mono">{current_count}</span>
      </div>
      <div className="col-span-2 text-right">
        <span className="text-xs font-bold font-mono" style={{ color }}>
          {shift_pct !== null
            ? `${shift_pct >= 0 ? '+' : ''}${shift_pct}%`
            : 'Yeni'}
        </span>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

const DAY_OPTIONS = [
  { value: 3,  label: '3 Gün'  },
  { value: 7,  label: '7 Gün'  },
  { value: 14, label: '14 Gün' },
  { value: 30, label: '30 Gün' },
];

export default function CollectiveSignals() {
  const [days, setDays] = useState(7);

  const { data, isLoading } = useQuery({
    queryKey: ['collective-signals', days],
    queryFn:  () => fetchCollectiveSignals(days),
    staleTime: 60_000,
  });

  const maxGrowth = data
    ? Math.max(...(data.emergingSymbols.map(s => s.current_count)), 1)
    : 1;
  const maxEmoCount = data
    ? Math.max(...(data.emotionalShifts.map(e => e.current_count)), 1)
    : 1;

  return (
    <div className="section-system relative">
      <Header
        title="Collective Signals"
        subtitle="Platform genelinde yükselen semboller, duygusal kayışlar ve tekrarlayan temalar"
        section="system"
        actions={
          <div className="flex items-center gap-1.5">
            {DAY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setDays(opt.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                style={days === opt.value ? {
                  background: 'rgba(0,232,122,0.1)', color: '#00E87A', border: '1px solid rgba(0,232,122,0.3)',
                } : {
                  background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 os-card animate-pulse" />
          ))}
        </div>
      ) : !data ? null : (
        <>
          {/* Hero stats */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Rezonans Olayı',   value: data.resonanceTotal,     color: '#7B6FFF' },
              { label: 'Güçlü Rezonans',   value: data.highResonanceCount, color: '#FFB800' },
              { label: 'Ort. Skor',        value: `${data.resonanceAvgScore}%`, color: '#00CFFF' },
              { label: 'Aktif Küme',       value: data.clusterCount,       color: '#00E87A' },
            ].map(s => (
              <div key={s.label} className="os-card p-4 text-center">
                <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
                <p className="text-dc-muted text-[10px] mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-5 mb-5">
            {/* Emerging symbols */}
            <div className="os-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <span style={{ color: '#FFB800' }}>✦</span>
                <h3 className="text-xs font-bold text-dc-muted uppercase tracking-wider">
                  Yükselen Semboller
                </h3>
                <span className="text-[9px] text-dc-muted font-mono ml-auto">son {data.days}g</span>
              </div>
              {data.emergingSymbols.length === 0 ? (
                <p className="text-dc-muted text-xs py-4 text-center">Bu dönemde yeterli veri yok</p>
              ) : (
                data.emergingSymbols.map(s => (
                  <SymbolBar key={s.manifestation} {...s} maxGrowth={maxGrowth} />
                ))
              )}
            </div>

            {/* Emotional shifts */}
            <div className="os-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <span style={{ color: '#CC80FF' }}>◉</span>
                <h3 className="text-xs font-bold text-dc-muted uppercase tracking-wider">
                  Duygusal Dinamikler
                </h3>
                <span className="text-[9px] text-dc-muted font-mono ml-auto">önceki dönemle kıyaslama</span>
              </div>
              <div className="grid grid-cols-12 gap-3 mb-2">
                <span className="col-span-3 text-[8px] text-dc-muted uppercase tracking-wider">Duygu</span>
                <span className="col-span-5 text-[8px] text-dc-muted uppercase tracking-wider">Yoğunluk</span>
                <span className="col-span-2 text-[8px] text-dc-muted uppercase tracking-wider text-center">Sayı</span>
                <span className="col-span-2 text-[8px] text-dc-muted uppercase tracking-wider text-right">Değişim</span>
              </div>
              {data.emotionalShifts.length === 0 ? (
                <p className="text-dc-muted text-xs py-4 text-center">Bu dönemde yeterli veri yok</p>
              ) : (
                data.emotionalShifts.map(e => (
                  <EmotionRow key={e.emotion} {...e} maxCount={maxEmoCount} />
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Recurring themes */}
            <div className="os-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <span style={{ color: '#00CFFF' }}>∿</span>
                <h3 className="text-xs font-bold text-dc-muted uppercase tracking-wider">
                  Tekrarlayan Temalar
                </h3>
              </div>
              {data.recurringThemes.length === 0 ? (
                <p className="text-dc-muted text-xs py-4 text-center">Bu dönemde yeterli tema yok</p>
              ) : (
                <div className="space-y-0">
                  {data.recurringThemes.map((t, i) => (
                    <div key={t.theme}
                      className="flex items-center gap-3 py-2.5 border-b last:border-0"
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <span className="text-[9px] font-mono text-dc-muted w-4 shrink-0">#{i + 1}</span>
                      <p className="text-dc-text text-xs font-semibold capitalize flex-1 truncate">{t.theme}</p>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-dc-muted text-[10px] font-mono">{t.dream_count} rüya</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                          style={{ color: '#00CFFF', background: 'rgba(0,207,255,0.1)', border: '1px solid rgba(0,207,255,0.2)' }}>
                          {t.user_count} rüyacı
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cluster intelligence */}
            <div className="os-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <span style={{ color: '#00E87A' }}>◆</span>
                <h3 className="text-xs font-bold text-dc-muted uppercase tracking-wider">
                  Küme İstihbaratı
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  {
                    label: 'Aktif Küme',
                    value: data.clusterCount,
                    sub: 'dream cluster',
                    color: '#00E87A',
                  },
                  {
                    label: 'Küme Üyesi',
                    value: data.clusterMembers,
                    sub: 'rüyacı',
                    color: '#00CFFF',
                  },
                  {
                    label: 'Güçlü Rezonans',
                    value: data.highResonanceCount,
                    sub: `≥ 70% eşleşme · son ${data.days}g`,
                    color: '#FFB800',
                  },
                  {
                    label: 'Toplam Bağlantı',
                    value: data.resonanceTotal,
                    sub: `ort. skor ${data.resonanceAvgScore}%`,
                    color: '#7B6FFF',
                  },
                ].map(s => (
                  <div key={s.label}
                    className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ background: `${s.color}08`, borderColor: `${s.color}22` }}>
                    <div>
                      <p className="text-dc-text text-xs font-semibold">{s.label}</p>
                      <p className="text-dc-muted text-[10px]">{s.sub}</p>
                    </div>
                    <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
