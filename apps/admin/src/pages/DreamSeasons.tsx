import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import { fetchDreamSeasons } from '../api/admin.api';
import type { MonthlyEra, TransitionPhase, QuarterlyProfile, CurrentSeasonItem } from '../api/admin.api';

// ── Helpers ────────────────────────────────────────────────────────────────────

const EMOTION_COLORS: Record<string, string> = {
  joy: '#00E87A', sadness: '#60A5FA', fear: '#FF3060', anger: '#FF8C00',
  anxiety: '#FFB800', love: '#FF4D8F', confusion: '#A78BFA', peace: '#00CFFF',
  excitement: '#FFB800', grief: '#7B8FFF',
};
function emoColor(e: string | undefined | null) {
  return EMOTION_COLORS[(e ?? '').toLowerCase()] ?? '#A78BFA';
}

function monthLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', { year: 'numeric', month: 'long' });
}

function quarterLabel(iso: string) {
  const d = new Date(iso);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()} Q${q}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CurrentSeasonBanner({ items, name }: { items: CurrentSeasonItem[]; name: string }) {
  const top = items[0];
  const topColor = top ? emoColor(top.emotion) : '#A78BFA';
  return (
    <div className="dc-card p-6 space-y-4" style={{ borderColor: `${topColor}30`, borderWidth: '1px' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-dc-muted text-[10px] font-bold tracking-widest uppercase">Mevcut Rüya Sezonu</p>
          <h2 className="text-xl font-bold text-dc-text">{name}</h2>
          <p className="text-dc-muted text-xs">Son 30 gün kolektif imzası</p>
        </div>
        {top && (
          <div className="text-right">
            <p className="text-[10px] text-dc-muted mb-1 font-bold uppercase tracking-widest">Baskın Duygu</p>
            <p className="text-2xl font-bold capitalize" style={{ color: topColor }}>{top.emotion}</p>
            <p className="text-dc-muted text-xs font-mono">{Number(top.pct).toFixed(1)}%</p>
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {items.map(item => {
          const color = emoColor(item.emotion);
          return (
            <div key={item.emotion} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              <span className="text-xs font-semibold capitalize" style={{ color }}>{item.emotion}</span>
              <span className="text-[10px] text-dc-muted font-mono">{Number(item.pct).toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuarterlyCard({ q }: { q: QuarterlyProfile }) {
  const emoClr  = emoColor(q.season_emotion);
  return (
    <div className="dc-card p-4 space-y-3">
      <p className="text-dc-muted text-[10px] font-bold font-mono">{quarterLabel(q.quarter)}</p>
      <div className="space-y-1.5">
        <div>
          <p className="text-dc-muted text-[9px] uppercase tracking-widest mb-0.5">Baskın Duygu</p>
          <p className="text-sm font-bold capitalize" style={{ color: emoClr }}>{q.season_emotion}</p>
        </div>
        {q.season_archetype && (
          <div>
            <p className="text-dc-muted text-[9px] uppercase tracking-widest mb-0.5">Baskın Arketip</p>
            <p className="text-xs font-semibold text-dc-text">{q.season_archetype}</p>
          </div>
        )}
      </div>
      <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="h-1 bg-dc-bg rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: '100%', background: `linear-gradient(90deg, ${emoClr}80, ${emoClr}30)` }} />
        </div>
      </div>
    </div>
  );
}

function MonthlyEraTimeline({ eras }: { eras: MonthlyEra[] }) {
  const max = Math.max(...eras.map(e => e.total_signals), 1);
  return (
    <div className="dc-card p-5 space-y-3">
      <h3 className="text-dc-text text-sm font-bold">Aylık Duygusal Çağlar</h3>
      <div className="space-y-2.5">
        {eras.map(era => {
          const color  = emoColor(era.emotion);
          const barPct = Math.max(4, Math.round((era.total_signals / max) * 100));
          return (
            <div key={era.month} className="flex items-center gap-3">
              <div className="w-32 shrink-0">
                <p className="text-dc-muted text-[10px] font-mono">{monthLabel(era.month)}</p>
              </div>
              <div className="flex-1 h-2 bg-dc-bg rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: color }} />
              </div>
              <div className="w-24 shrink-0 flex items-center gap-2">
                <span className="text-xs font-semibold capitalize" style={{ color }}>{era.emotion}</span>
                <span className="text-dc-muted text-[10px]">{Number(era.dominance_pct).toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
        {eras.length === 0 && <p className="text-dc-muted text-sm">Henüz yeterli veri yok.</p>}
      </div>
    </div>
  );
}

function TransitionPanel({ transitions }: { transitions: TransitionPhase[] }) {
  return (
    <div className="dc-card p-5 space-y-3">
      <h3 className="text-dc-text text-sm font-bold">Geçiş Fazları</h3>
      <p className="text-dc-muted text-xs">Baskın duygunun değiştiği haftalar</p>
      {transitions.length === 0 ? (
        <div className="flex items-center justify-center h-16 text-dc-muted text-sm">Bu pencerede geçiş yok — istikrarlı sezon.</div>
      ) : (
        <div className="space-y-2">
          {transitions.map((t, i) => {
            const fromColor = emoColor(t.from_emotion);
            const toColor   = emoColor(t.to_emotion);
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border"
                style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex-1">
                  <p className="text-dc-muted text-[10px] font-mono mb-1">
                    {new Date(t.week).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })} haftası
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold capitalize" style={{ color: fromColor }}>{t.from_emotion}</span>
                    <svg viewBox="0 0 16 8" className="w-8 h-4 text-dc-muted">
                      <path d="M0 4h12M8 1l4 3-4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                    </svg>
                    <span className="text-xs font-bold capitalize" style={{ color: toColor }}>{t.to_emotion}</span>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(255,184,0,0.12)', color: '#FFB800' }}>
                  Geçiş
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DreamSeasons() {
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['dream-seasons'],
    queryFn:  fetchDreamSeasons,
    staleTime: 30 * 60_000,
  });

  return (
    <div className="section-system relative">
      <Header
        title="Dream Seasons"
        subtitle="Kolektif dönemler, geçiş fazları ve duygusal çağlar"
        section="system"
        actions={
          <button onClick={() => void refetch()}
            className="px-4 py-2 rounded-lg text-xs font-bold border transition-all"
            style={{ background: 'rgba(0,232,122,0.08)', color: '#00E87A', border: '1px solid rgba(0,232,122,0.25)' }}>
            {isFetching ? '...' : 'Yenile'}
          </button>
        }
      />
      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
        {isFetching && !data && (
          <div className="flex items-center justify-center h-40 text-dc-muted text-sm animate-pulse">Sezonlar analiz ediliyor...</div>
        )}
        {isError && <div className="dc-card p-5 text-center text-dc-muted text-sm">Veri yüklenemedi.</div>}

        {data && (
          <>
            <CurrentSeasonBanner items={data.currentSeason} name={data.seasonName} />

            {/* Quarterly profiles */}
            {data.quarterlyProfile.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-dc-text text-sm font-bold px-1">Dönemsel Profiller</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.quarterlyProfile.slice(0, 4).map(q => (
                    <QuarterlyCard key={q.quarter} q={q} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MonthlyEraTimeline eras={data.monthlyEras} />
              <TransitionPanel transitions={data.transitions} />
            </div>

            <p className="text-dc-muted/50 text-[10px] text-right font-mono">
              {new Date(data.computedAt).toLocaleString('tr-TR')} itibarıyla · 12 aylık veri
            </p>
          </>
        )}
      </div>
    </div>
  );
}
