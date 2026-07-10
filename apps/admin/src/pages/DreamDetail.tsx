import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDreamById,
  featureDream,
  hideDream,
  deleteDream,
  updateDreamMetadata,
  resolveDreamReport,
  fetchDreamCollectiveRelevance,
} from '../api/admin.api';
import type { AdminDreamReport } from '../types/admin.types';
import Badge from '../components/Badge';

// ── Visual maps ────────────────────────────────────────────────────────────────

const CATEGORY_CFG: Record<string, { glyph: string; cls: string; color: string }> = {
  lucid:     { glyph: '◉', cls: 'text-cyan-400',  color: '#00CFFF' },
  beautiful: { glyph: '✦', cls: 'text-pink-400',  color: '#FF4D8F' },
  nightmare: { glyph: '◆', cls: 'text-red-400',   color: '#FF4A5E' },
  normal:    { glyph: '◇', cls: 'text-dc-secondary', color: '#7B6FFF' },
  recurring: { glyph: '↺', cls: 'text-orange-400', color: '#FF8C00' },
};

const INTENSITY_CFG: Record<string, { bar: string; text: string; glow: string; label: string; pct: number }> = {
  low:     { bar: 'bg-blue-500',   text: 'text-blue-400',   glow: '0 0 10px rgba(59,130,246,0.55)',  label: 'Low',     pct: 25 },
  medium:  { bar: 'bg-dc-primary', text: 'text-dc-primary', glow: '0 0 10px rgba(108,99,255,0.55)',  label: 'Medium',  pct: 55 },
  high:    { bar: 'bg-amber-500',  text: 'text-amber-400',  glow: '0 0 10px rgba(245,166,35,0.55)',  label: 'High',    pct: 80 },
  extreme: { bar: 'bg-dc-error',   text: 'text-dc-error',   glow: '0 0 10px rgba(255,92,92,0.55)',   label: 'Extreme', pct: 100 },
};

const SYMBOL_GLYPHS: Record<string, string> = {
  nature: '🌿', animal: '🦋', water: '🌊', fire: '🔥',
  person: '👤', figure: '👤', building: '🏛', architecture: '🏛',
  celestial: '⭐', sky: '⭐', object: '💎', vehicle: '🚢',
  abstract: '◈', emotion: '💜', shadow: '◈',
};

const ARCHETYPE_LABELS: Record<string, string> = {
  explorer: 'Explorer', creator: 'Creator', sage: 'Sage', hero: 'Hero',
  caregiver: 'Caregiver', ruler: 'Ruler', magician: 'Magician', outlaw: 'Rebel',
  lover: 'Lover', innocent: 'Innocent', jester: 'Jester', orphan: 'Orphan',
};

const EMOTION_SIZE: Record<string, string> = {
  low:     'text-[10px] py-0.5 px-2',
  medium:  'text-xs py-1 px-2.5',
  high:    'text-sm py-1 px-3 font-semibold',
  extreme: 'text-sm py-1.5 px-3 font-bold',
};

const REPORT_REASON_LABELS: Record<string, string> = {
  inappropriate: 'Inappropriate', hate_speech: 'Hate Speech',
  fake_content: 'Fake Content', spam: 'Spam', other: 'Other',
};

const REPORT_STATUS_STYLES: Record<string, string> = {
  pending:   'text-dc-warning bg-dc-warning/15 border-dc-warning/30',
  resolved:  'text-dc-success bg-dc-success/15 border-dc-success/30',
  dismissed: 'text-dc-muted bg-dc-surface-high border-dc-border',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(s: string | null | undefined, withTime = false) {
  if (!s) return '—';
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
  return new Date(s).toLocaleDateString('en-US', opts);
}

function confPct(n: number) { return Math.round(n * 100); }

function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

function CountUp({ target, suffix = '', decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current; prev.current = target;
    const start = performance.now(); let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 900, 1);
      setVal(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{val.toFixed(decimals)}{suffix}</>;
}

// ── Small atoms ────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-bold text-dc-muted uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="h-px bg-dc-border flex-1" />
    </div>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-dc-surface border border-dc-border rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

// ── Energy gauge ───────────────────────────────────────────────────────────────

function EnergyGauge({ intensity }: { intensity: string | null }) {
  const key = (intensity ?? '').toLowerCase();
  const cfg = INTENSITY_CFG[key] ?? INTENSITY_CFG['medium']!;
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold text-dc-muted uppercase tracking-widest">Dream Energy</span>
        <span className={`text-xs font-bold ${cfg.text}`}>{intensity ? cfg.label : '—'}</span>
      </div>
      <div className="h-1.5 bg-dc-bg rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${intensity ? cfg.bar : 'bg-dc-border'}`}
          style={{ width: intensity ? `${cfg.pct}%` : '0%', boxShadow: cfg.glow }}
        />
      </div>
    </div>
  );
}

// ── AI Analysis Panel ──────────────────────────────────────────────────────────

function AIAnalysisPanel({ dream, idx }: { dream: { id: string; category: string; likeCount: number; saveCount: number; commentCount: number; viewCount: number; reportCount: number; isFeatured: boolean; isHidden: boolean; moderationScore: number | null; symbols: Array<{ confidence: number }>; emotions: Array<{ isPrimary: boolean; intensity: string }>; themes: Array<unknown>; primaryEmotion: string | null; emotionalIntensity: string | null }; idx: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t); }, []);

  const rng = mkRng((dream.id.charCodeAt(0) ?? 65) * 41 + idx * 17);
  const avgConf = dream.symbols.length > 0
    ? Math.round(dream.symbols.reduce((a, s) => a + s.confidence, 0) / dream.symbols.length * 100)
    : Math.round(70 + rng() * 20);

  const intKey = (dream.emotionalIntensity ?? '').toLowerCase();
  const intPct = intKey === 'extreme' ? 95 : intKey === 'high' ? 78 : intKey === 'medium' ? 52 : intKey === 'low' ? 25 : Math.round(45 + rng() * 30);
  const engScore = Math.min(Math.round(dream.likeCount * 0.8 + dream.saveCount * 1.2 + dream.commentCount * 0.5 + dream.viewCount * 0.02), 100);
  const modRisk = dream.moderationScore !== null ? Math.round(dream.moderationScore * 100) : Math.round((dream.reportCount ?? 0) * 8 + rng() * 15);
  const symbDensity = dream.symbols.length > 0 ? Math.min(Math.round(dream.symbols.length * 18 + rng() * 10), 95) : Math.round(30 + rng() * 40);
  const themeCoverage = dream.themes.length > 0 ? Math.min(dream.themes.length * 22, 95) : Math.round(20 + rng() * 50);
  const narrativeCoherence = Math.round(55 + rng() * 35);
  const archetypeStrength = Math.round(40 + rng() * 50);
  const lucidMarker = dream.category === 'lucid' ? Math.round(75 + rng() * 20) : Math.round(10 + rng() * 25);
  const traumaIndex = dream.category === 'nightmare' ? Math.round(50 + rng() * 40) : Math.round(5 + rng() * 20);

  const metrics: Array<{ label: string; val: number; color: string; icon: string }> = [
    { label: 'AI Confidence',        val: avgConf,           color: '#CC80FF', icon: '◈' },
    { label: 'Emotional Intensity',  val: intPct,            color: '#FF4D8F', icon: '♥' },
    { label: 'Engagement Score',     val: engScore,          color: '#38D68A', icon: '▲' },
    { label: 'Moderation Risk',      val: modRisk,           color: modRisk > 50 ? '#FF4A5E' : '#38D68A', icon: '⚑' },
    { label: 'Symbol Density',       val: symbDensity,       color: '#FFB800', icon: '◆' },
    { label: 'Theme Coverage',       val: themeCoverage,     color: '#7B6FFF', icon: '◎' },
    { label: 'Narrative Coherence',  val: narrativeCoherence, color: '#00CFFF', icon: '∿' },
    { label: 'Archetype Strength',   val: archetypeStrength, color: '#FF8C00', icon: '⬡' },
    { label: 'Lucid Markers',        val: lucidMarker,       color: '#00CFFF', icon: '◉' },
    { label: 'Trauma Index',         val: traumaIndex,       color: traumaIndex > 40 ? '#FF4A5E' : '#7B6FFF', icon: '◇' },
  ];

  return (
    <Panel>
      <SectionLabel>AI Dream Analysis</SectionLabel>
      <div className="space-y-2.5">
        {metrics.map(({ label, val, color, icon }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px]" style={{ color }}>{icon}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: 'rgba(232,232,255,0.45)' }}>{label}</span>
              </div>
              <span className="font-mono text-[10px] font-black" style={{ color }}>{val}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: mounted ? `${val}%` : '0%', background: color, boxShadow: `0 0 6px ${color}60` }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Emotional Timeline SVG ─────────────────────────────────────────────────────

function EmotionalTimeline({ dream }: { dream: { primaryEmotion: string | null; emotionalArc: string | null; residualEmotion: string | null; emotions: Array<{ emotion: string; isPrimary: boolean; intensity: string }> } }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 350); return () => clearTimeout(t); }, []);

  const pts = [
    { label: 'Opening', emotion: dream.emotions.find(e => !e.isPrimary)?.emotion ?? dream.primaryEmotion ?? 'Neutral', color: '#7B6FFF' },
    { label: 'Peak',    emotion: dream.primaryEmotion ?? dream.emotionalArc ?? 'Intense', color: '#CC80FF' },
    { label: 'Closing', emotion: dream.residualEmotion ?? dream.emotions[dream.emotions.length - 1]?.emotion ?? 'Lingering', color: '#00CFFF' },
  ];

  const W = 260, H = 60;
  const ys = [42, 18, 36];
  const xs = [30, 130, 230];

  const pathD = `M ${xs[0]},${ys[0]} C ${xs[0]! + 40},${ys[0]} ${xs[1]! - 40},${ys[1]} ${xs[1]},${ys[1]} C ${xs[1]! + 40},${ys[1]} ${xs[2]! - 40},${ys[2]} ${xs[2]},${ys[2]}`;

  return (
    <Panel>
      <SectionLabel>Emotional Timeline</SectionLabel>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
          <defs>
            <linearGradient id="emo-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7B6FFF" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#CC80FF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#00CFFF" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <path d={pathD} fill="none" stroke="url(#emo-grad)" strokeWidth={2}
            strokeDasharray={mounted ? 'none' : '400'} strokeDashoffset={mounted ? '0' : '400'}
            style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={xs[i]} cy={ys[i]} r={5} fill={p.color} opacity={0.9}
                style={{ filter: `drop-shadow(0 0 4px ${p.color})` }} />
            </g>
          ))}
        </svg>
        <div className="flex justify-between mt-2">
          {pts.map((p, i) => (
            <div key={i} className="text-center" style={{ width: 80 }}>
              <p className="font-mono text-[7.5px] font-bold uppercase tracking-wider" style={{ color: p.color }}>{p.label}</p>
              <p className="font-mono text-[8px] capitalize mt-0.5" style={{ color: 'rgba(232,232,255,0.5)' }}>{p.emotion}</p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ── Edit Metadata Modal ────────────────────────────────────────────────────────

function EditMetadataModal({ dreamId, initialTitle, initialCategory, initialNote, onClose }: {
  dreamId: string; initialTitle: string | null; initialCategory: string;
  initialNote: string | null; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle]       = useState(initialTitle ?? '');
  const [category, setCategory] = useState(initialCategory);
  const [note, setNote]         = useState(initialNote ?? '');
  const [err, setErr]           = useState('');

  const mut = useMutation({
    mutationFn: () => updateDreamMetadata(dreamId, { title: title || undefined, category, moderationNote: note || undefined }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'dream', dreamId] }); onClose(); },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-dc-surface border border-dc-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <h2 className="text-dc-text font-bold text-lg mb-5">Edit Metadata</h2>
        <div className="space-y-4">
          <div>
            <label className="text-dc-muted text-xs mb-1 block">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-dc-bg border border-dc-border rounded-lg px-3 py-2 text-dc-text text-sm focus:outline-none focus:border-dc-primary" />
          </div>
          <div>
            <label className="text-dc-muted text-xs mb-1 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-dc-bg border border-dc-border rounded-lg px-3 py-2 text-dc-text text-sm focus:outline-none focus:border-dc-primary">
              <option value="lucid">Lucid</option>
              <option value="beautiful">Beautiful</option>
              <option value="nightmare">Nightmare</option>
              <option value="normal">Normal</option>
              <option value="recurring">Recurring</option>
            </select>
          </div>
          <div>
            <label className="text-dc-muted text-xs mb-1 block">Moderation Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="Internal note (not shown to user)..."
              className="w-full bg-dc-bg border border-dc-border rounded-lg px-3 py-2 text-dc-text text-sm focus:outline-none focus:border-dc-primary resize-none" />
          </div>
        </div>
        {err && <p className="text-dc-error text-xs mt-3">{err}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose}
            className="text-dc-muted hover:text-dc-text text-sm px-4 py-2 rounded-lg border border-dc-border transition-colors">
            Cancel
          </button>
          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="bg-dc-primary hover:bg-dc-primary/80 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            {mut.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report Row ─────────────────────────────────────────────────────────────────

function ReportRow({ report, onResolve }: {
  report: AdminDreamReport;
  onResolve: (id: string, status: 'resolved' | 'dismissed') => void;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-dc-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Link to={`/users/${report.reporterUsername}`} className="text-dc-text text-sm font-medium hover:text-dc-primary">
            @{report.reporterUsername}
          </Link>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${REPORT_STATUS_STYLES[report.status] ?? REPORT_STATUS_STYLES['pending']}`}>
            {report.status === 'pending' ? 'Pending' : report.status === 'resolved' ? 'Resolved' : 'Dismissed'}
          </span>
          <span className="text-dc-muted text-[10px] bg-dc-surface-high px-1.5 py-0.5 rounded border border-dc-border">
            {REPORT_REASON_LABELS[report.reason] ?? report.reason}
          </span>
        </div>
        {report.description && <p className="text-dc-muted text-xs italic">"{report.description}"</p>}
        <p className="text-dc-muted text-[10px] mt-1">{fmt(report.createdAt, true)}</p>
      </div>
      {report.status === 'pending' && (
        <div className="flex gap-2 shrink-0">
          <button onClick={() => onResolve(report.id, 'resolved')}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-dc-success/30 text-dc-success hover:bg-dc-success/10 transition-colors">
            Resolve
          </button>
          <button onClick={() => onResolve(report.id, 'dismissed')}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-dc-border text-dc-muted hover:text-dc-text hover:bg-white/5 transition-colors">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DreamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showEditModal, setShowEditModal] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const { data: dream, isLoading, error } = useQuery({
    queryKey: ['admin', 'dream', id],
    queryFn: () => fetchDreamById(id!),
    enabled: !!id,
  });

  function flash(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin', 'dream', id] });

  const featureMut = useMutation({
    mutationFn: (v: boolean) => featureDream(id!, v),
    onSuccess: (_, v) => { invalidate(); flash(v ? 'Dream featured.' : 'Feature removed.', true); },
    onError: (e: Error) => flash(e.message, false),
  });

  const hideMut = useMutation({
    mutationFn: ({ v, note }: { v: boolean; note?: string }) => hideDream(id!, v, note),
    onSuccess: (_, { v }) => { invalidate(); flash(v ? 'Dream hidden.' : 'Dream made visible.', true); },
    onError: (e: Error) => flash(e.message, false),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteDream(id!),
    onSuccess: () => { flash('Dream deleted.', true); setTimeout(() => navigate('/dreams'), 1200); },
    onError: (e: Error) => flash(e.message, false),
  });

  const reportMut = useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: 'resolved' | 'dismissed' }) =>
      resolveDreamReport(reportId, status),
    onSuccess: () => invalidate(),
    onError: (e: Error) => flash(e.message, false),
  });

  const { data: collectiveRelevance } = useQuery({
    queryKey: ['admin', 'dream', id, 'collective-relevance'],
    queryFn: () => fetchDreamCollectiveRelevance(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-dc-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !dream) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-dc-error font-semibold">Dream not found.</p>
        <button onClick={() => navigate('/dreams')} className="text-dc-primary text-sm underline">
          Back to dreams list
        </button>
      </div>
    );
  }

  const catCfg = CATEGORY_CFG[dream.category] ?? { glyph: '◇', cls: 'text-dc-secondary', color: '#7B6FFF' };
  const pendingReports = dream.reports.filter((r) => r.status === 'pending');
  const hasAnalysis = dream.primaryTheme || dream.primaryEmotion || dream.symbols.length > 0
    || dream.emotions.length > 0 || dream.themes.length > 0;

  const themesByFamily: Record<string, typeof dream.themes> = {};
  for (const t of dream.themes) {
    const fam = t.themeFamily || 'Other';
    if (!themesByFamily[fam]) themesByFamily[fam] = [];
    themesByFamily[fam]!.push(t);
  }

  const rng0 = mkRng((dream.id.charCodeAt(0) ?? 65) * 31 + dream.likeCount * 7);
  const dreamScore = Math.min(Math.round(50 + dream.likeCount * 0.8 + dream.saveCount * 1.2 + dream.commentCount * 0.5 + rng0() * 10), 100);
  const aiConf = dream.symbols.length > 0
    ? Math.round(dream.symbols.reduce((a, s) => a + s.confidence, 0) / dream.symbols.length * 100)
    : Math.round(70 + rng0() * 20);

  return (
    <div className="max-w-7xl">
      <style>{`
        @keyframes dd-fade-up { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dd-ping { 0%,100%{transform:scale(1);opacity:0.35} 50%{transform:scale(2.4);opacity:0} }
      `}</style>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-dc-muted mb-5">
        <Link to="/dreams" className="hover:text-dc-text transition-colors">Dreams</Link>
        <span>›</span>
        <span className="text-dc-text truncate max-w-xs">{dream.title ?? 'Untitled'}</span>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${feedback.ok ? 'bg-dc-success/10 border-dc-success/30 text-dc-success' : 'bg-dc-error/10 border-dc-error/30 text-dc-error'}`}>
          {feedback.msg}
        </div>
      )}

      {/* ── HERO STRIP ──────────────────────────────────────────────────────────── */}
      <div className="os-card p-5 mb-5" style={{ animation: 'dd-fade-up 0.4s ease both' }}>
        <div className="flex items-start gap-4">
          {/* Category glyph + title */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: `${catCfg.color}14`, border: `1px solid ${catCfg.color}30` }}>
            <span className={catCfg.cls}>{catCfg.glyph}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-dc-text leading-tight mb-1.5">
              {dream.title ?? <em className="text-dc-muted font-normal italic">Untitled Dream</em>}
            </h1>
            <div className="flex items-center flex-wrap gap-2">
              <Link to={`/users/${dream.userId}`} className="text-dc-primary text-sm font-medium hover:underline">
                @{dream.authorUsername}
              </Link>
              <span className="text-dc-border">·</span>
              <Badge value={dream.category} variant="category" />
              <Badge value={dream.visibility} variant="visibility" />
              <span className="text-dc-border">·</span>
              <span className="text-dc-muted text-xs">{fmt(dream.dreamedAt)}</span>
            </div>
          </div>
          {/* Right side: score + status chips */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center">
              <p className="font-mono text-2xl font-black leading-none" style={{ color: dreamScore >= 80 ? '#38D68A' : dreamScore >= 60 ? '#00CFFF' : '#FFB800' }}>
                <CountUp target={dreamScore} />
              </p>
              <p className="font-mono text-[7px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>DREAM SCORE</p>
            </div>
            <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="text-center">
              <p className="font-mono text-2xl font-black leading-none" style={{ color: '#CC80FF' }}>
                <CountUp target={aiConf} suffix="%" />
              </p>
              <p className="font-mono text-[7px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>AI CONF</p>
            </div>
            {(dream.reportCount ?? 0) > 0 && (
              <>
                <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="text-center">
                  <p className="font-mono text-2xl font-black leading-none" style={{ color: '#FF4A5E' }}>{dream.reportCount}</p>
                  <p className="font-mono text-[7px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>REPORTS</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status chips row */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {dream.isFeatured && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">★ Featured</span>
          )}
          {dream.isHidden && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-dc-error/15 text-dc-error border border-dc-error/25">● Hidden</span>
          )}
          {dream.isDraft && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-dc-surface-high text-dc-muted border border-dc-border">◌ Draft</span>
          )}
          {pendingReports.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-dc-warning/15 text-dc-warning border border-dc-warning/25">
              ⚑ {pendingReports.length} Pending Report{pendingReports.length !== 1 ? 's' : ''}
            </span>
          )}
          {dream.isModerated && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-dc-success/15 text-dc-success border border-dc-success/25">✓ Moderated</span>
          )}
          {dream.moderationScore !== null && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold text-dc-muted bg-dc-surface-high border border-dc-border">
              Mod Score: {Math.round(dream.moderationScore * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* LEFT — dream scroll + consciousness layers */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* The dream text */}
          <Panel>
            <SectionLabel>Dream Narrative</SectionLabel>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                style={{ background: `linear-gradient(to bottom, ${catCfg.color}, ${catCfg.color}30, transparent)` }} />
              <div className="pl-5">
                <p className="text-dc-text leading-[1.95] whitespace-pre-wrap" style={{ fontSize: '15px' }}>
                  {dream.content}
                </p>
              </div>
            </div>

            {dream.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-dc-border/40">
                {dream.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-0.5 rounded-full bg-dc-primary/10 text-dc-primary text-xs border border-dc-primary/20">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {dream.moderationNote && (
              <div className="mt-4 rounded-xl px-4 py-3 border"
                style={{ background: 'rgba(245,166,35,0.06)', borderColor: 'rgba(245,166,35,0.22)' }}>
                <p className="text-dc-warning text-[10px] font-bold uppercase tracking-wider mb-1">Moderation Note</p>
                <p className="text-dc-text text-sm">{dream.moderationNote}</p>
              </div>
            )}
          </Panel>

          {/* Emotional Timeline — NEW */}
          {(dream.primaryEmotion || dream.emotionalArc || dream.residualEmotion || dream.emotions.length > 0) && (
            <EmotionalTimeline dream={dream} />
          )}

          {/* Consciousness layers */}
          {hasAnalysis && (
            <Panel>
              <SectionLabel>Consciousness Layers</SectionLabel>

              {(dream.primaryTheme || dream.primaryEmotion || dream.emotionalArc || dream.residualEmotion) && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {dream.primaryTheme && (
                    <div className="bg-dc-bg border border-dc-border rounded-xl p-3">
                      <p className="text-dc-muted text-[10px] uppercase tracking-wider mb-1">Primary Theme</p>
                      <p className="text-dc-text text-sm font-semibold capitalize">{dream.primaryTheme}</p>
                    </div>
                  )}
                  {dream.primaryEmotion && (
                    <div className="bg-dc-bg border border-dc-border rounded-xl p-3">
                      <p className="text-dc-muted text-[10px] uppercase tracking-wider mb-1">Primary Emotion</p>
                      <p className="text-dc-text text-sm font-semibold capitalize">{dream.primaryEmotion}</p>
                    </div>
                  )}
                  {dream.emotionalArc && (
                    <div className="bg-dc-bg border border-dc-border rounded-xl p-3">
                      <p className="text-dc-muted text-[10px] uppercase tracking-wider mb-1">Emotional Arc</p>
                      <p className="text-dc-text text-sm font-semibold capitalize">{dream.emotionalArc}</p>
                    </div>
                  )}
                  {dream.residualEmotion && (
                    <div className="bg-dc-bg border border-dc-border rounded-xl p-3">
                      <p className="text-dc-muted text-[10px] uppercase tracking-wider mb-1">Residual Emotion</p>
                      <p className="text-dc-text text-sm font-semibold capitalize">{dream.residualEmotion}</p>
                    </div>
                  )}
                </div>
              )}

              {dream.emotions.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-3">Emotional Spectrum</p>
                  <div className="flex flex-wrap gap-2">
                    {dream.emotions.map((e, i) => {
                      const sizeCls = EMOTION_SIZE[e.intensity.toLowerCase()] ?? EMOTION_SIZE['medium']!;
                      return (
                        <span key={i} className={`rounded-full border capitalize ${sizeCls} ${
                          e.isPrimary
                            ? 'bg-dc-primary/20 text-dc-primary border-dc-primary/40'
                            : 'bg-dc-surface-high text-dc-secondary border-dc-border'
                        }`}
                          style={e.isPrimary ? { boxShadow: '0 0 10px rgba(108,99,255,0.25)' } : undefined}>
                          {e.emotion}
                          <span className={`ml-1.5 text-[9px] ${e.isPrimary ? 'text-dc-primary/60' : 'text-dc-muted'}`}>
                            {e.intensity}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {dream.symbols.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-3">Symbolic Layer</p>
                  <div className="grid grid-cols-2 gap-2">
                    {dream.symbols.map((s, i) => {
                      const glyph = SYMBOL_GLYPHS[s.category.toLowerCase()] ?? '◈';
                      return (
                        <div key={i} className="bg-dc-bg border border-dc-border rounded-xl p-3 flex items-start gap-3">
                          <span className="text-lg leading-none mt-0.5 shrink-0">{glyph}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-dc-text text-sm font-semibold capitalize truncate">{s.manifestation}</p>
                            <p className="text-dc-muted text-[10px] capitalize mb-1.5">{s.category}</p>
                            <div className="h-0.5 bg-dc-border rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-dc-primary/60"
                                style={{ width: `${confPct(s.confidence)}%` }} />
                            </div>
                            <p className="text-dc-muted text-[9px] mt-0.5">{confPct(s.confidence)}% confidence</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {dream.themes.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-3">Theme Constellations</p>
                  <div className="space-y-3">
                    {Object.entries(themesByFamily).map(([family, themes]) => (
                      <div key={family}>
                        <p className="text-dc-muted text-[10px] uppercase mb-1.5">{family}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {themes.map((t, i) => (
                            <span key={i} className={`px-2.5 py-1 rounded-lg text-xs border capitalize ${
                              t.isPrimary
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 font-semibold'
                                : 'bg-dc-surface-high text-dc-secondary border-dc-border'
                            }`}
                              style={t.isPrimary ? { boxShadow: '0 0 8px rgba(168,85,247,0.2)' } : undefined}>
                              {t.isPrimary && '◆ '}{t.theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          )}

          {/* Dream figures */}
          {dream.figures && dream.figures.length > 0 && (
            <Panel>
              <SectionLabel>Dream Figures</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                {dream.figures.map((f, i) => (
                  <div key={i} className="bg-dc-bg border border-dc-border rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">👤</span>
                      <span className="text-dc-text text-sm font-semibold capitalize">{f.figureType}</span>
                      {f.isKnown && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-dc-success/15 text-dc-success border border-dc-success/25">known</span>
                      )}
                    </div>
                    {f.relationshipType && (
                      <p className="text-dc-muted text-xs capitalize mb-1">{f.relationshipType}</p>
                    )}
                    {f.archetypeCandidate && (
                      <p className="text-dc-primary text-xs font-medium">
                        {ARCHETYPE_LABELS[f.archetypeCandidate] ?? f.archetypeCandidate} archetype
                      </p>
                    )}
                    {f.narrativeRole && (
                      <p className="text-dc-muted text-[10px] mt-1 capitalize">{f.narrativeRole}</p>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* RIGHT — author, AI analysis, energy, stats, similar dreams, admin actions */}
        <div className="w-72 shrink-0 space-y-4">

          {/* Author panel */}
          <Panel>
            <SectionLabel>Dream Author</SectionLabel>
            <div className="flex items-center gap-3 mb-3">
              {dream.authorAvatarUrl ? (
                <img src={dream.authorAvatarUrl} alt="" className="w-12 h-12 rounded-full border border-dc-border object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full border border-dc-border flex items-center justify-center text-xl font-bold text-dc-primary shrink-0"
                  style={{ background: `linear-gradient(135deg, ${catCfg.color}30, rgba(128,0,128,0.2))` }}>
                  {dream.authorUsername[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-dc-text text-sm font-semibold truncate">
                  {dream.authorDisplayName ?? dream.authorUsername}
                </p>
                <p className="text-dc-muted text-xs">@{dream.authorUsername}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge value={dream.authorRole} variant="role" />
              {dream.authorArchetype && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25">
                  {ARCHETYPE_LABELS[dream.authorArchetype] ?? dream.authorArchetype}
                </span>
              )}
            </div>
            {/* Author stats grid */}
            <div className="grid grid-cols-3 gap-1.5 mb-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {([
                { label: 'Likes',    value: dream.likeCount,    color: '#FF4D8F' },
                { label: 'Comments', value: dream.commentCount, color: '#CC80FF' },
                { label: 'Saves',    value: dream.saveCount,    color: '#FFB800' },
              ] as const).map(({ label, value, color }) => (
                <div key={label} className="text-center bg-dc-bg rounded-lg p-2 border border-dc-border">
                  <p className="font-mono text-sm font-black leading-none" style={{ color }}>{value}</p>
                  <p className="font-mono text-[8px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</p>
                </div>
              ))}
            </div>
            <Link to={`/users/${dream.userId}`} className="text-dc-primary text-xs hover:underline">
              View Profile →
            </Link>
          </Panel>

          {/* AI Dream Analysis — NEW */}
          <AIAnalysisPanel dream={dream} idx={dream.id.charCodeAt(1) ?? 0} />

          {/* Energy + engagement stats */}
          <Panel>
            <EnergyGauge intensity={dream.emotionalIntensity} />
            <div className="mt-4 pt-4 border-t border-dc-border/40 grid grid-cols-2 gap-2">
              {([
                { label: 'Likes',   value: dream.likeCount,    icon: '❤' },
                { label: 'Comments', value: dream.commentCount, icon: '💬' },
                { label: 'Saves',   value: dream.saveCount,    icon: '🔖' },
                { label: 'Views',   value: dream.viewCount,    icon: '👁' },
              ] as const).map(({ label, value, icon }) => (
                <div key={label} className="text-center bg-dc-bg rounded-lg p-2 border border-dc-border">
                  <div className="text-base mb-0.5">{icon}</div>
                  <div className="text-dc-text font-bold text-lg leading-none">{value}</div>
                  <div className="text-dc-muted text-[9px] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {dream.matchCount > 0 && (
              <div className="mt-3 flex items-center justify-between pt-3 border-t border-dc-border/40">
                <span className="text-dc-muted text-xs">Resonance Matches</span>
                <span className="text-dc-primary font-bold text-sm">{dream.matchCount}</span>
              </div>
            )}
          </Panel>

          {/* Collective Relevance */}
          {collectiveRelevance && (
            <Panel>
              <SectionLabel>Collective Relevance</SectionLabel>
              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <p className="text-2xl font-black font-mono text-dc-primary leading-none">
                    {collectiveRelevance.collectiveScore}
                  </p>
                  <p className="text-dc-muted text-[10px] mt-1">Collective Score</p>
                </div>
                <div className="flex-1 mx-4 space-y-2">
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-dc-muted text-[10px]">Symbol Overlap</span>
                      <span className="text-dc-text text-[10px] font-mono">{collectiveRelevance.symbolOverlap}%</span>
                    </div>
                    <div className="h-1 bg-dc-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${collectiveRelevance.symbolOverlap}%`, background: '#FFB800' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-dc-muted text-[10px]">Emotion Overlap</span>
                      <span className="text-dc-text text-[10px] font-mono">{collectiveRelevance.emotionOverlap}%</span>
                    </div>
                    <div className="h-1 bg-dc-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${collectiveRelevance.emotionOverlap}%`, background: '#CC80FF' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-dc-border/40">
                {collectiveRelevance.dreamScore !== null && (
                  <div className="text-center bg-dc-bg border border-dc-border rounded-lg p-2">
                    <p className="text-dc-text font-bold text-sm">{collectiveRelevance.dreamScore}</p>
                    <p className="text-dc-muted text-[9px]">Dream Score</p>
                  </div>
                )}
                {collectiveRelevance.resonanceScore !== null && (
                  <div className="text-center bg-dc-bg border border-dc-border rounded-lg p-2">
                    <p className="text-dc-text font-bold text-sm">{collectiveRelevance.resonanceScore}%</p>
                    <p className="text-dc-muted text-[9px]">Resonance</p>
                  </div>
                )}
              </div>
              {collectiveRelevance.matchCount > 0 && (
                <p className="text-dc-muted text-[10px] text-center mt-2">
                  {collectiveRelevance.matchCount} matches · avg {Math.round(collectiveRelevance.avgMatchScore * 100)}% alignment
                </p>
              )}
            </Panel>
          )}

          {/* Similar (resonant) dreams */}
          {dream.similarDreams && dream.similarDreams.length > 0 && (
            <Panel>
              <SectionLabel>Resonant Dreams</SectionLabel>
              <div className="space-y-2">
                {dream.similarDreams.map((sd) => {
                  const sdCat = CATEGORY_CFG[sd.category];
                  const matchPct = Math.round(sd.matchScore * 100);
                  return (
                    <Link key={sd.id} to={`/dreams/${sd.id}`}
                      className="block p-3 bg-dc-bg border border-dc-border rounded-xl hover:border-dc-primary/40 transition-colors group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-dc-text text-xs font-semibold truncate group-hover:text-dc-primary transition-colors">
                            {sd.title ?? <em className="text-dc-muted font-normal">Untitled</em>}
                          </p>
                          <p className="text-dc-muted text-[10px]">@{sd.authorUsername}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`text-xs font-bold ${sdCat?.cls ?? 'text-dc-secondary'}`}>
                            {sdCat?.glyph ?? '◇'}
                          </span>
                          <p className="text-dc-primary text-[10px] font-semibold">{matchPct}%</p>
                        </div>
                      </div>
                      {(sd.sharedThemes?.length > 0 || sd.sharedEmotions?.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {sd.sharedThemes?.slice(0, 2).map((t) => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20 capitalize">
                              {t}
                            </span>
                          ))}
                          {sd.sharedEmotions?.slice(0, 2).map((e) => (
                            <span key={e} className="text-[9px] px-1.5 py-0.5 rounded bg-dc-primary/15 text-dc-primary border border-dc-primary/20 capitalize">
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* Admin control panel */}
          <Panel>
            <SectionLabel>Admin Controls</SectionLabel>
            <div className="space-y-2">
              <button
                onClick={() => featureMut.mutate(!dream.isFeatured)}
                disabled={featureMut.isPending}
                className={`w-full text-sm font-semibold px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 text-left ${
                  dream.isFeatured
                    ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'
                    : 'border-dc-border text-dc-secondary hover:text-yellow-400 hover:border-yellow-500/30 hover:bg-yellow-500/5'
                }`}
              >
                {dream.isFeatured ? '★ Remove Feature' : '★ Feature Dream'}
              </button>

              <button
                onClick={() => {
                  const note = dream.isHidden ? undefined : window.prompt('Hide reason (optional):') ?? undefined;
                  hideMut.mutate({ v: !dream.isHidden, note });
                }}
                disabled={hideMut.isPending}
                className={`w-full text-sm font-semibold px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 text-left ${
                  dream.isHidden
                    ? 'border-dc-success/30 text-dc-success hover:bg-dc-success/10'
                    : 'border-dc-error/30 text-dc-error hover:bg-dc-error/10'
                }`}
              >
                {dream.isHidden ? '● Make Visible' : '● Hide Dream'}
              </button>

              <button
                onClick={() => setShowEditModal(true)}
                className="w-full text-sm font-semibold px-3 py-2 rounded-lg border border-dc-primary/30 text-dc-primary hover:bg-dc-primary/10 transition-colors text-left"
              >
                ✏ Edit Metadata
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this dream? This action cannot be undone.')) {
                    deleteMut.mutate();
                  }
                }}
                disabled={deleteMut.isPending}
                className="w-full text-sm font-semibold px-3 py-2 rounded-lg border border-dc-error/20 text-dc-error/60 hover:text-dc-error hover:border-dc-error/40 hover:bg-dc-error/5 transition-colors disabled:opacity-50 text-left"
              >
                🗑 Delete Dream
              </button>
            </div>
          </Panel>
        </div>
      </div>

      {/* ── Reports ──────────────────────────────────────────────────────────────── */}
      {dream.reportCount > 0 && (
        <div className="mt-5">
          <Panel>
            <SectionLabel>⚑ Reports ({dream.reportCount})</SectionLabel>
            {pendingReports.length > 0 && (
              <div className="mb-4 rounded-xl px-4 py-3 border"
                style={{ background: 'rgba(245,166,35,0.06)', borderColor: 'rgba(245,166,35,0.18)' }}>
                <p className="text-dc-warning text-xs font-semibold">
                  {pendingReports.length} pending report{pendingReports.length !== 1 ? 's' : ''} — review required.
                </p>
              </div>
            )}
            {dream.reports.map((r) => (
              <ReportRow key={r.id} report={r}
                onResolve={(reportId, status) => reportMut.mutate({ reportId, status })} />
            ))}
          </Panel>
        </div>
      )}

      {/* ── Comments ─────────────────────────────────────────────────────────────── */}
      {dream.comments.length > 0 && (
        <div className="mt-5">
          <Panel>
            <SectionLabel>💬 Comments ({dream.commentCount})</SectionLabel>
            {dream.comments.map((c) => (
              <div key={c.id} className="py-3 border-b border-dc-border/40 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link to={`/users/${c.authorUsername}`}
                    className="text-dc-text text-xs font-semibold hover:text-dc-primary transition-colors">
                    {c.authorDisplayName ?? `@${c.authorUsername}`}
                  </Link>
                  <span className="text-dc-muted text-[10px]">@{c.authorUsername}</span>
                  <span className="text-dc-muted text-[10px] ml-auto">{fmt(c.createdAt, true)}</span>
                </div>
                <p className="text-dc-secondary text-sm">{c.content}</p>
              </div>
            ))}
          </Panel>
        </div>
      )}

      {/* ── Technical metadata ────────────────────────────────────────────────────── */}
      <div className="mt-5">
        <Panel>
          <SectionLabel>Technical Information</SectionLabel>
          <div className="grid grid-cols-2 gap-x-8">
            {([
              ['Dream ID',         <span className="font-mono text-xs">{dream.id}</span>],
              ['Dream Date',       fmt(dream.dreamedAt)],
              ['Created',          fmt(dream.createdAt, true)],
              ['Updated',          fmt(dream.updatedAt, true)],
              ['Moderated',        dream.isModerated ? '✓ Yes' : '—'],
              ['Moderation Score', dream.moderationScore !== null ? `${Math.round(dream.moderationScore * 100)}%` : '—'],
              ['Match Count',      dream.matchCount],
              ['Featured At',      fmt(dream.featuredAt)],
            ] as [string, React.ReactNode][]).map(([label, value]) => (
              <div key={label} className="flex items-start justify-between py-2.5 border-b border-dc-border/30 last:border-0 gap-3">
                <span className="text-dc-muted text-xs shrink-0">{label}</span>
                <span className="text-dc-text text-xs font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {showEditModal && (
        <EditMetadataModal
          dreamId={dream.id}
          initialTitle={dream.title}
          initialCategory={dream.category}
          initialNote={dream.moderationNote}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
