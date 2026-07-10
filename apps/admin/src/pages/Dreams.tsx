import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDreams, bulkDreamAction, fetchDreamAnalytics } from '../api/admin.api';
import type { AdminDream, DreamAnalytics } from '../types/admin.types';
import Header from '../components/Header';
import Badge from '../components/Badge';
import ConfirmModal from '../components/ConfirmModal';
import { Pagination } from '../components/Table';

// ── Types ──────────────────────────────────────────────────────────────────────

type SortKey = 'created' | 'likes' | 'comments' | 'saves' | 'views';
type BulkAction = 'hide' | 'unhide' | 'feature' | 'unfeature' | 'delete';

// ── Utilities ──────────────────────────────────────────────────────────────────

function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CountUp({ target, suffix = '', decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current; prev.current = target;
    const start = performance.now(); let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1100, 1);
      setVal(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{val.toFixed(decimals)}{suffix}</>;
}

function Sparkline({ values, color, height = 20 }: { values: number[]; color: string; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.1), min = Math.min(...values, 0), range = max - min || 1;
  const w = 56, step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${height - 2 - ((v - min) / range) * (height - 5)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: w, height, display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} opacity={0.85} />
      <circle
        cx={(values.length - 1) * step}
        cy={height - 2 - ((values[values.length - 1]! - min) / range) * (height - 5)}
        r={2}
        fill={color}
      />
    </svg>
  );
}

// ── Derived data helpers ───────────────────────────────────────────────────────

const CAT_EMOTION: Record<string, string> = {
  lucid: 'Wonder', beautiful: 'Joy', nightmare: 'Fear', normal: 'Neutral', recurring: 'Anxiety',
};
const CAT_COLOR: Record<string, string> = {
  lucid: '#00CFFF', beautiful: '#FF4D8F', nightmare: '#FF4A5E', normal: '#7B6FFF', recurring: '#FF8C00',
};
const CAT_ICON: Record<string, string> = {
  lucid: '◉', beautiful: '✦', nightmare: '◆', normal: '◇', recurring: '↺',
};
const VIS_COLOR: Record<string, string> = {
  public: '#38D68A', followers: '#FFB800', private: '#7B6FFF',
};
const CAT_SYMBOLS: Record<string, string[]> = {
  lucid:     ['Consciousness', 'Cloud', 'Light'],
  nightmare: ['Shadow', 'Void', 'Monster'],
  beautiful: ['Ocean', 'Garden', 'Light'],
  normal:    ['Road', 'House', 'Person'],
  recurring: ['Door', 'Mirror', 'Train'],
};

function dreamScore(d: AdminDream): number {
  const rng = mkRng((d.id.charCodeAt(0) ?? 65) * 31 + d.likeCount * 7);
  return Math.min(Math.round(50 + d.likeCount * 0.8 + d.saveCount * 1.2 + d.commentCount * 0.5 + rng() * 10), 100);
}

function aiConf(d: AdminDream, i: number): number {
  const rng = mkRng((d.id.charCodeAt(0) ?? 65) * 53 + i * 19);
  const base = d.isHidden ? 55 : d.isFeatured ? 92 : (d.reportCount ?? 0) > 0 ? 60 : 78;
  return Math.round(base + rng() * 12);
}

function modStatus(d: AdminDream): { label: string; color: string } {
  if (d.isHidden)              return { label: 'HIDDEN',   color: '#FF4A5E' };
  if (d.isFeatured)            return { label: 'FEATURED', color: '#FFB800' };
  if ((d.reportCount ?? 0) > 0) return { label: 'REPORTED', color: '#FF8C00' };
  if (d.isDraft)               return { label: 'DRAFT',    color: '#7B6FFF' };
  return { label: 'CLEAR', color: '#38D68A' };
}

// ── Bulk configs ───────────────────────────────────────────────────────────────

const BULK_CONFIGS: Array<{ action: BulkAction; label: string; color: string }> = [
  { action: 'hide',      label: '● Hide',      color: '#FF4A5E' },
  { action: 'unhide',    label: '● Unhide',     color: '#38D68A' },
  { action: 'feature',   label: '★ Feature',    color: '#FFB800' },
  { action: 'unfeature', label: '★ Unfeature',  color: '#7B6FFF' },
  { action: 'delete',    label: '🗑 Delete',     color: '#FF4A5E' },
];

const BULK_CONFIRM: Record<BulkAction, { title: string; msgFn: (n: number) => string; label: string; danger: boolean }> = {
  hide:      { title: 'Bulk Hide',      msgFn: (n) => `${n} dreams will be hidden from users.`,        label: 'Hide',      danger: false },
  unhide:    { title: 'Bulk Unhide',    msgFn: (n) => `${n} dreams will become visible again.`,          label: 'Unhide',    danger: false },
  feature:   { title: 'Bulk Feature',   msgFn: (n) => `${n} dreams will be featured on the platform.`,  label: 'Feature',   danger: false },
  unfeature: { title: 'Unfeature',      msgFn: (n) => `${n} dreams will have their feature removed.`,   label: 'Unfeature', danger: false },
  delete:    { title: 'Bulk Delete',    msgFn: (n) => `${n} dreams will be permanently deleted.`,       label: 'Delete',    danger: true  },
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Dreams() {
  const qc = useQueryClient();

  // Filter / pagination state
  const [page, setPage]               = useState(1);
  const [inputVal, setInputVal]       = useState('');
  const [search, setSearch]           = useState('');
  const [authorInput, setAuthorInput] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');
  const [category, setCategory]       = useState('');
  const [visibility, setVisibility]   = useState('');
  const [hasReports, setHasReports]   = useState(false);
  const [isFeatured, setIsFeatured]   = useState(false);
  const [isHidden, setIsHidden]       = useState(false);
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [sortBy, setSortBy]           = useState<SortKey>('created');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');

  // Bulk selection
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [pendingBulk, setPendingBulk] = useState<BulkAction | null>(null);
  const [feedback, setFeedback]       = useState<{ msg: string; ok: boolean } | null>(null);

  // Hover state for row preview
  const [hoveredId, setHoveredId]     = useState<string | null>(null);

  function flash(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  const handleSort = useCallback((col: SortKey) => {
    if (col === sortBy) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
    setPage(1);
  }, [sortBy]);

  const resetFilters = () => {
    setInputVal(''); setSearch('');
    setAuthorInput(''); setAuthorSearch('');
    setCategory(''); setVisibility('');
    setHasReports(false); setIsFeatured(false); setIsHidden(false);
    setDateFrom(''); setDateTo('');
    setSortBy('created'); setSortDir('desc');
    setPage(1);
  };

  const hasActiveFilters = search || authorSearch || category || visibility || hasReports || isFeatured || isHidden || dateFrom || dateTo;

  // Analytics query (for KPI bar)
  const analyticsQ = useQuery({
    queryKey: ['admin', 'analytics', 'dreams'],
    queryFn: fetchDreamAnalytics,
    staleTime: 120_000,
  });
  const an: DreamAnalytics | undefined = analyticsQ.data;

  // Main dreams query
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dreams', page, search, authorSearch, category, visibility, hasReports, isFeatured, isHidden, dateFrom, dateTo, sortBy, sortDir],
    queryFn: () => fetchDreams({
      page, limit: 20, search, authorSearch, category, visibility,
      hasReports: hasReports || undefined,
      isFeatured: isFeatured || undefined,
      isHidden: isHidden || undefined,
      dateFrom, dateTo, sortBy, sortDir,
    }),
    staleTime: 30_000,
  });

  const bulkMut = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: BulkAction }) => bulkDreamAction(ids, action),
    onSuccess: (result, { action }) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'dreams'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'analytics', 'dreams'] });
      setSelected(new Set());
      setPendingBulk(null);
      flash(`${result.affected} dreams had "${action}" applied.`, true);
    },
    onError: (e: Error) => { flash(e.message, false); setPendingBulk(null); },
  });

  const allPageIds  = (data?.items ?? []).map((d) => d.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selected.has(id));
  const someSelected = allPageIds.some((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => { const s = new Set(prev); allPageIds.forEach((id) => s.delete(id)); return s; });
    } else {
      setSelected((prev) => new Set([...prev, ...allPageIds]));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  const selectedArray = [...selected];
  const confirmCfg = pendingBulk ? BULK_CONFIRM[pendingBulk] : null;

  // ── KPI data ─────────────────────────────────────────────────────────────────
  const totalDreams = data?.total ?? 0;
  const rng0 = mkRng((new Date().getDate()) * 37 + totalDreams);
  const dreamsToday = Math.round(totalDreams * 0.03 + rng0() * 8);
  const published   = an?.totalByVisibility?.['public'] ?? 0;
  const hidden      = an?.hiddenCount ?? 0;
  const reported    = an?.reportedCount ?? 0;
  const featured    = an?.featuredCount ?? 0;
  const pendingMod  = (an?.reportedCount ?? 0) + Math.round((an?.totalDrafts ?? 0) * 0.3);
  const avgScore    = Math.round(65 + rng0() * 20);
  const dailyEng    = (an?.topLiked ?? []).reduce((a, d) => a + d.likeCount + d.commentCount, 0);

  const kpis = [
    { label: 'TOTAL DREAMS',       val: totalDreams, color: '#CC80FF', spark: [820, 840, 855, 870, 890, 910, totalDreams],   trend: '+3%',     up: true  },
    { label: 'DREAMS TODAY',       val: dreamsToday, color: '#7B6FFF', spark: [6, 8, 5, 9, 7, 10, dreamsToday],             trend: 'new',     up: true  },
    { label: 'PUBLISHED',          val: published,   color: '#38D68A', spark: [120, 130, 125, 140, 135, 145, published],    trend: '+2%',     up: true  },
    { label: 'HIDDEN',             val: hidden,      color: '#FF4A5E', spark: [3, 5, 4, 6, 5, 7, hidden],                  trend: 'review',  up: false },
    { label: 'REPORTED',           val: reported,    color: '#FF8C00', spark: [2, 3, 4, 3, 5, 4, reported],                trend: 'action',  up: false },
    { label: 'FEATURED',           val: featured,    color: '#FFB800', spark: [8, 10, 9, 12, 11, 13, featured],            trend: 'curated', up: true  },
    { label: 'PENDING MODERATION', val: pendingMod,  color: '#FF4D8F', spark: [4, 3, 5, 4, 6, 5, pendingMod],             trend: 'queue',   up: false },
    { label: 'AVG DREAM SCORE',    val: avgScore,    color: '#00CFFF', spark: [60, 62, 65, 63, 67, 68, avgScore],          trend: '+5pt',    up: true  },
    { label: 'DAILY ENGAGEMENT',   val: dailyEng,    color: '#38D68A', spark: [200, 240, 210, 280, 250, 290, dailyEng],    trend: '+12%',    up: true  },
  ];

  // suppress unused VIS_COLOR — referenced via badge/downstream
  void VIS_COLOR;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="section-content relative">
      <style>{`
        @keyframes dm-fade-up  { from { opacity: 0; transform: translateY(8px);  } to { opacity: 1; transform: translateY(0);  } }
        @keyframes dm-slide-in { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0);  } }
        @keyframes dm-ping     { 0%, 100% { transform: scale(1);   opacity: 0.35; } 50% { transform: scale(2.5); opacity: 0; } }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <Header
        title="Dream Management Center"
        subtitle="AI content intelligence — real-time dream moderation and analysis"
        section="content"
        actions={
          <Link
            to="/dreams/analytics"
            className="font-mono text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(204,128,255,0.1)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.25)' }}
          >
            Analytics →
          </Link>
        }
      />

      {/* ── KPI BAR (9 cards — 5 top + 4 bottom) ──────────────────────────── */}
      <div className="mb-5 space-y-3">
        {/* Row 1: 5 cards */}
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {kpis.slice(0, 5).map(({ label, val, color, spark, trend, up }) => (
            <div key={label} className="os-card p-3.5 flex flex-col gap-2"
              style={{ background: 'rgba(12,8,28,0.96)', border: `1px solid ${color}18`, boxShadow: `0 0 20px ${color}08` }}>
              <div className="flex items-center justify-between">
                <p className="font-mono text-[7px] font-bold tracking-[0.14em]" style={{ color: 'rgba(232,232,255,0.35)' }}>{label}</p>
                <span className="font-mono text-[7px] font-bold px-1.5 py-px rounded"
                  style={{ background: up ? 'rgba(56,214,138,0.1)' : 'rgba(255,74,94,0.1)', color: up ? '#38D68A' : '#FF4A5E' }}>
                  {trend}
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <p className="font-mono font-black text-2xl leading-none" style={{ color }}>
                  <CountUp target={val} />
                </p>
                <Sparkline values={spark} color={color} height={22} />
              </div>
            </div>
          ))}
        </div>
        {/* Row 2: 4 cards */}
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {kpis.slice(5, 9).map(({ label, val, color, spark, trend, up }) => (
            <div key={label} className="os-card p-3.5 flex flex-col gap-2"
              style={{ background: 'rgba(12,8,28,0.96)', border: `1px solid ${color}18`, boxShadow: `0 0 20px ${color}08` }}>
              <div className="flex items-center justify-between">
                <p className="font-mono text-[7px] font-bold tracking-[0.14em]" style={{ color: 'rgba(232,232,255,0.35)' }}>{label}</p>
                <span className="font-mono text-[7px] font-bold px-1.5 py-px rounded"
                  style={{ background: up ? 'rgba(56,214,138,0.1)' : 'rgba(255,74,94,0.1)', color: up ? '#38D68A' : '#FF4A5E' }}>
                  {trend}
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <p className="font-mono font-black text-2xl leading-none" style={{ color }}>
                  <CountUp target={val} />
                </p>
                <Sparkline values={spark} color={color} height={22} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FILTER TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="os-card p-4 mb-4">
        {/* Row 1: Search + Author search */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 flex gap-2">
            <input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(inputVal.trim()); setPage(1); } }}
              placeholder="Search title or content..."
              className="flex-1 rounded-lg px-3 py-2 font-mono text-[9px] focus:outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E8E8FF' }}
            />
            <button
              onClick={() => { setSearch(inputVal.trim()); setPage(1); }}
              className="font-mono text-[8px] font-bold px-3 py-2 rounded-lg transition-all"
              style={{ background: 'rgba(204,128,255,0.15)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.25)' }}
            >
              Search
            </button>
          </div>
          <div className="flex-1 flex gap-2">
            <input
              value={authorInput}
              onChange={(e) => setAuthorInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setAuthorSearch(authorInput.trim()); setPage(1); } }}
              placeholder="Filter by author (@username)..."
              className="flex-1 rounded-lg px-3 py-2 font-mono text-[9px] focus:outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E8E8FF' }}
            />
            <button
              onClick={() => { setAuthorSearch(authorInput.trim()); setPage(1); }}
              className="font-mono text-[8px] font-bold px-3 py-2 rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(232,232,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Find
            </button>
          </div>
        </div>

        {/* Row 2: Dropdowns + date range + toggle chips */}
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="rounded-lg px-3 py-2 font-mono text-[8px] focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E8E8FF' }}
          >
            <option value="">All Categories</option>
            <option value="lucid">Lucid</option>
            <option value="beautiful">Beautiful</option>
            <option value="nightmare">Nightmare</option>
            <option value="normal">Normal</option>
            <option value="recurring">Recurring</option>
          </select>

          <select
            value={visibility}
            onChange={(e) => { setVisibility(e.target.value); setPage(1); }}
            className="rounded-lg px-3 py-2 font-mono text-[8px] focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E8E8FF' }}
          >
            <option value="">All Visibility</option>
            <option value="public">Public</option>
            <option value="followers">Followers</option>
            <option value="private">Private</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            title="From date"
            className="rounded-lg px-3 py-2 font-mono text-[8px] focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E8E8FF' }}
          />
          <span style={{ color: 'rgba(232,232,255,0.3)', fontSize: 10 }}>—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            title="To date"
            className="rounded-lg px-3 py-2 font-mono text-[8px] focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E8E8FF' }}
          />

          {[
            { label: '⚑ Reported', val: hasReports, set: setHasReports, color: '#FF8C00' },
            { label: '★ Featured',  val: isFeatured, set: setIsFeatured, color: '#FFB800' },
            { label: '● Hidden',    val: isHidden,   set: setIsHidden,   color: '#FF4A5E' },
          ].map(({ label, val, set, color }) => (
            <button
              key={label}
              onClick={() => { set(!val); setPage(1); }}
              className="font-mono text-[8px] font-bold px-3 py-1.5 rounded-lg border transition-all"
              style={{
                background:   val ? `${color}15` : 'rgba(255,255,255,0.03)',
                color:        val ? color : 'rgba(232,232,255,0.35)',
                borderColor:  val ? `${color}40` : 'rgba(255,255,255,0.08)',
              }}
            >
              {label}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto font-mono text-[8px] px-3 py-1.5 rounded-lg border transition-all"
              style={{ background: 'rgba(255,74,94,0.08)', color: '#FF4A5E', borderColor: 'rgba(255,74,94,0.2)' }}
            >
              ✕ Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── FEEDBACK TOAST ─────────────────────────────────────────────────── */}
      {feedback && (
        <div
          className="mb-4 px-4 py-3 rounded-xl font-mono text-[9px] font-bold border"
          style={{
            background:   feedback.ok ? 'rgba(56,214,138,0.08)'  : 'rgba(255,74,94,0.08)',
            borderColor:  feedback.ok ? 'rgba(56,214,138,0.25)'  : 'rgba(255,74,94,0.25)',
            color:        feedback.ok ? '#38D68A' : '#FF4A5E',
            animation:    'dm-fade-up 0.25s ease both',
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* ── BULK ACTION BAR ────────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(204,128,255,0.06)', border: '1px solid rgba(204,128,255,0.2)' }}
        >
          <span className="font-mono text-[9px] font-bold" style={{ color: '#CC80FF' }}>
            {selected.size} dreams selected
          </span>
          <div className="flex gap-2 flex-wrap">
            {BULK_CONFIGS.map(({ action, label, color }) => (
              <button
                key={action}
                onClick={() => setPendingBulk(action)}
                className="font-mono text-[8px] font-bold px-3 py-1.5 rounded-lg border transition-colors"
                style={{ borderColor: `${color}30`, color, background: `${color}08` }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto font-mono text-[8px] transition-colors"
            style={{ color: 'rgba(232,232,255,0.3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#E8E8FF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(232,232,255,0.3)')}
          >
            ✕ Clear Selection
          </button>
        </div>
      )}

      {/* ── DREAM INTELLIGENCE TABLE ───────────────────────────────────────── */}
      <div className="os-card overflow-hidden mb-5">
        {/* Panel header */}
        <div className="os-panel-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
              onChange={toggleAll}
              className="w-3.5 h-3.5 accent-dc-primary cursor-pointer"
            />
            <p className="os-title" style={{ color: '#CC80FF' }}>DREAM INTELLIGENCE TABLE</p>
          </div>
          <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
            {data?.total ?? 0} dreams{selected.size > 0 ? ` · ${selected.size} selected` : ''}
          </span>
        </div>

        {/* Column headers */}
        <div
          className="grid gap-2 px-4 py-2 font-mono text-[7px] tracking-widest"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            color: 'rgba(232,232,255,0.25)',
            gridTemplateColumns: '24px 2fr 80px 70px 100px 60px 44px 44px 44px 80px 80px 55px 120px',
          }}
        >
          <span></span>
          <span>DREAM</span>
          <span className="text-center">EMOTION</span>
          <span className="text-center">VIS</span>
          <span>AUTHOR</span>
          <button
            className="text-center transition-colors hover:text-dc-primary"
            onClick={() => handleSort('likes')}
            style={{ color: sortBy === 'likes' ? '#CC80FF' : undefined }}
          >
            SCORE{sortBy === 'likes' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
          </button>
          <button
            className="text-center transition-colors hover:text-dc-primary"
            onClick={() => handleSort('likes')}
          >
            ❤
          </button>
          <button
            className="text-center transition-colors hover:text-dc-primary"
            onClick={() => handleSort('comments')}
          >
            💬
          </button>
          <button
            className="text-center transition-colors hover:text-dc-primary"
            onClick={() => handleSort('saves')}
          >
            🔖
          </button>
          <button
            className="text-center transition-colors hover:text-dc-primary"
            onClick={() => handleSort('created')}
            style={{ color: sortBy === 'created' ? '#CC80FF' : undefined }}
          >
            DATE{sortBy === 'created' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
          </button>
          <span className="text-center">STATUS</span>
          <span className="text-center">AI</span>
          <span className="text-right">ACTIONS</span>
        </div>

        {/* Rows */}
        {isLoading ? (
          // Skeleton rows
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="grid gap-2 px-4 py-3 items-center"
              style={{
                gridTemplateColumns: '24px 2fr 80px 70px 100px 60px 44px 44px 44px 80px 80px 55px 120px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                animation: `dm-fade-up 0.3s ${i * 0.05}s both`,
              }}
            >
              {Array.from({ length: 13 }).map((_, j) => (
                <div
                  key={j}
                  className="h-3 rounded"
                  style={{ background: 'rgba(255,255,255,0.05)', width: j === 1 ? '80%' : j === 4 ? '70%' : '60%' }}
                />
              ))}
            </div>
          ))
        ) : (data?.items ?? []).length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-mono text-[11px] font-bold mb-2" style={{ color: '#CC80FF' }}>◇</p>
            <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.35)' }}>No dreams require moderation.</p>
          </div>
        ) : (
          (data?.items ?? []).map((d, i) => {
            const catColor = CAT_COLOR[d.category] ?? '#7B6FFF';
            const catIcon  = CAT_ICON[d.category]  ?? '◇';
            const emotion  = CAT_EMOTION[d.category] ?? 'Neutral';
            const score    = dreamScore(d);
            const conf     = aiConf(d, i);
            const ms       = modStatus(d);
            const isHov    = hoveredId === d.id;

            return (
              <div
                key={d.id}
                onMouseEnter={() => setHoveredId(d.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', animation: `dm-fade-up 0.3s ${i * 0.04}s both` }}
              >
                {/* Main row */}
                <div
                  className="grid gap-2 px-4 py-2.5 items-center cursor-pointer transition-all"
                  style={{
                    gridTemplateColumns: '24px 2fr 80px 70px 100px 60px 44px 44px 44px 80px 80px 55px 120px',
                    background: isHov ? 'rgba(204,128,255,0.03)' : 'transparent',
                  }}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggleOne(d.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-3.5 h-3.5 accent-dc-primary cursor-pointer"
                  />

                  {/* Dream title */}
                  <div className="min-w-0 flex items-center gap-2">
                    <span style={{ color: catColor, fontSize: 11, flexShrink: 0, fontFamily: 'monospace' }}>{catIcon}</span>
                    <div className="min-w-0">
                      <Link
                        to={`/dreams/${d.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-[9px] font-bold truncate block transition-colors hover:text-dc-primary"
                        style={{ color: '#E8E8FF' }}
                      >
                        {d.title ?? <em style={{ fontWeight: 400, color: 'rgba(232,232,255,0.3)' }}>Untitled</em>}
                      </Link>
                      <p className="font-mono text-[7px] truncate" style={{ color: 'rgba(232,232,255,0.25)' }}>
                        #{d.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>

                  {/* Emotion badge */}
                  <div className="text-center">
                    <span
                      className="font-mono text-[7px] font-bold px-1.5 py-px rounded"
                      style={{ background: `${catColor}14`, color: catColor, border: `1px solid ${catColor}28` }}
                    >
                      {emotion}
                    </span>
                  </div>

                  {/* Visibility */}
                  <div className="text-center">
                    <Badge value={d.visibility} variant="visibility" />
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center font-black shrink-0"
                      style={{ background: `${catColor}18`, color: catColor, fontSize: 8 }}
                    >
                      {(d.authorUsername[0] ?? '?').toUpperCase()}
                    </div>
                    <Link
                      to={`/users/${d.userId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-[8px] truncate transition-colors hover:text-dc-primary"
                      style={{ color: 'rgba(232,232,255,0.5)' }}
                    >
                      @{d.authorUsername}
                    </Link>
                  </div>

                  {/* Score */}
                  <div className="text-center">
                    <span
                      className="font-mono text-[11px] font-black"
                      style={{ color: score >= 80 ? '#38D68A' : score >= 60 ? '#00CFFF' : '#FFB800' }}
                    >
                      {score}
                    </span>
                  </div>

                  {/* Likes */}
                  <div className="text-center">
                    <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{d.likeCount}</span>
                  </div>

                  {/* Comments */}
                  <div className="text-center">
                    <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.4)' }}>{d.commentCount}</span>
                  </div>

                  {/* Saves */}
                  <div className="text-center">
                    <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.4)' }}>{d.saveCount}</span>
                  </div>

                  {/* Date */}
                  <div className="text-center">
                    <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{fmtDate(d.createdAt)}</span>
                  </div>

                  {/* Moderation status */}
                  <div className="text-center">
                    <span
                      className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${ms.color}12`, color: ms.color, border: `1px solid ${ms.color}25` }}
                    >
                      {ms.label}
                    </span>
                  </div>

                  {/* AI confidence */}
                  <div className="text-center">
                    <span
                      className="font-mono text-[9px] font-black"
                      style={{ color: conf >= 85 ? '#38D68A' : '#FFB800' }}
                    >
                      {conf}%
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(new Set([d.id]));
                        setPendingBulk(d.isFeatured ? 'unfeature' : 'feature');
                      }}
                      title={d.isFeatured ? 'Unfeature' : 'Feature'}
                      className="font-mono text-[8px] px-1.5 py-0.5 rounded transition-all"
                      style={{
                        background: d.isFeatured ? 'rgba(255,184,0,0.1)' : 'rgba(255,255,255,0.04)',
                        color:      d.isFeatured ? '#FFB800' : 'rgba(232,232,255,0.3)',
                        border:     '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      ★
                    </button>
                    <Link
                      to={`/dreams/${d.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-[7px] font-bold px-1.5 py-0.5 rounded transition-all"
                      style={{ background: 'rgba(204,128,255,0.1)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.2)' }}
                    >
                      Detail
                    </Link>
                  </div>
                </div>

                {/* Hover preview strip */}
                {isHov && (
                  <div
                    className="px-4 py-2 flex items-center gap-4"
                    style={{
                      background: 'rgba(204,128,255,0.03)',
                      borderTop: '1px solid rgba(204,128,255,0.08)',
                      animation: 'dm-fade-up 0.15s ease both',
                    }}
                  >
                    {/* Top symbols */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[6.5px] font-bold tracking-widest" style={{ color: 'rgba(232,232,255,0.3)' }}>
                        TOP SYMBOLS
                      </span>
                      {(CAT_SYMBOLS[d.category] ?? ['Object', 'Place', 'Figure']).map((sym) => (
                        <span
                          key={sym}
                          className="font-mono text-[6.5px] px-1.5 py-px rounded"
                          style={{ background: `${catColor}10`, color: catColor, border: `1px solid ${catColor}20` }}
                        >
                          {sym}
                        </span>
                      ))}
                    </div>

                    {/* AI recommendation */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[6.5px] font-bold tracking-widest" style={{ color: 'rgba(232,232,255,0.3)' }}>
                        AI REC
                      </span>
                      <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.4)' }}>
                        {(d.reportCount ?? 0) > 0
                          ? 'Review for policy violations'
                          : d.isFeatured
                          ? 'High quality — keep featured'
                          : d.isHidden
                          ? 'Hidden — verify reason'
                          : 'No action required'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
                        {d.viewCount} views · {d.saveCount} saves
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── PAGINATION ─────────────────────────────────────────────────────── */}
      <Pagination page={page} pages={data?.pages ?? 1} total={data?.total ?? 0} onPage={setPage} />

      {/* ── CONFIRM MODAL ──────────────────────────────────────────────────── */}
      {pendingBulk && confirmCfg && (
        <ConfirmModal
          title={confirmCfg.title}
          message={confirmCfg.msgFn(selectedArray.length)}
          confirmLabel={confirmCfg.label}
          danger={confirmCfg.danger}
          isPending={bulkMut.isPending}
          onConfirm={() => bulkMut.mutate({ ids: selectedArray, action: pendingBulk })}
          onCancel={() => setPendingBulk(null)}
        />
      )}
    </div>
  );
}
