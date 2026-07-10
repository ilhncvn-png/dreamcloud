import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import {
  fetchUsers, fetchUserById, fetchUserInsights, fetchUserTimeline,
  fetchUserIntelligenceProfile, fetchUserRiskProfile,
} from '../api/admin.api';
import type { UserInsights, UserTimeline } from '../api/admin.api';
import type { AdminUserDetail, UserIntelligenceProfile, UserRiskProfile } from '../types/admin.types';

/* ── Constants ───────────────────────────────────────────────────────── */
const EMOTION_COLOR: Record<string, string> = {
  joy: '#FFD700', fear: '#FF4A5E', anxiety: '#FF8C42', hope: '#38D68A',
  curiosity: '#00CFFF', peace: '#7B6FFF', transformation: '#CC80FF',
  sadness: '#6B7FD7', anger: '#FF4A5E', love: '#FF4D8F',
  surprise: '#FFB800', disgust: '#8B5CF6', wonder: '#CC80FF',
};
const emoColor = (e: string) => EMOTION_COLOR[e.toLowerCase()] ?? '#888';

const ARCHETYPE_CFG: Record<string, { icon: string; color: string; desc: string }> = {
  hero:      { icon: '⚔', color: '#FFB800', desc: 'Overcomes obstacles with courage' },
  shadow:    { icon: '◉', color: '#8B5CF6', desc: 'Hidden aspects of the self' },
  sage:      { icon: '◎', color: '#00CFFF', desc: 'Seeker of wisdom and insight' },
  creator:   { icon: '✦', color: '#CC80FF', desc: 'Creative force and generative vision' },
  explorer:  { icon: '⊕', color: '#38D68A', desc: 'Constant quest for discovery' },
  lover:     { icon: '♡', color: '#FF4D8F', desc: 'Love, passion, deep connection' },
  caregiver: { icon: '◌', color: '#34D399', desc: 'Nurturing and compassionate energy' },
  rebel:     { icon: '⬡', color: '#FF4A5E', desc: 'Revolutionary transformation force' },
  trickster: { icon: '∞', color: '#FFD700', desc: 'Disruption and catalytic change' },
  magician:  { icon: '★', color: '#7B6FFF', desc: 'Transformer of reality and vision' },
};
const archetypeCfg = (a: string) =>
  ARCHETYPE_CFG[a.toLowerCase()] ?? { icon: '◈', color: '#7B6FFF', desc: 'Emerging archetype' };

const SYMBOL_MEANINGS: Record<string, string> = {
  moon: 'Unconscious patterns, cyclical change and feminine intuition',
  water: 'Emotional depth, purification and the flow of the unconscious',
  forest: 'The unknown, the wild self and the labyrinth of the mind',
  mirror: 'Self-reflection, the confrontation between persona and true self',
  bird: 'Transcendence, aspiration and messages from the higher mind',
  door: 'Transition, threshold moments and new psychological chapters',
  fire: 'Transformation, passion and the dual nature of destruction and renewal',
  ocean: 'The collective unconscious, vast emotional potential',
  mountain: 'Achievement, higher perspective and the ego\'s ascent',
  light: 'Clarity, consciousness and the emergence of insight',
  shadow: 'The denied self, repressed content seeking integration',
  flower: 'Growth, beauty, potential and the blossoming of the soul',
  snake: 'Transformation, primal energy and the cycle of death and rebirth',
  house: 'The psyche itself; each room represents a different aspect of self',
  child: 'Innocence, potential and the inner child archetype',
  tree: 'Rootedness, growth and the axis connecting earth to sky',
  road: 'Life path, decisions and the journey of individuation',
  key: 'Access to hidden knowledge and unlocking the unconscious',
  storm: 'Emotional upheaval, cleansing turbulence and necessary chaos',
  star: 'Guidance, aspiration and the higher self calling out',
};
const symbolMeaning = (s: string) =>
  SYMBOL_MEANINGS[s.toLowerCase()] ?? 'A recurring symbol carrying personal psychological significance';

function mkRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

/* ── Hooks ───────────────────────────────────────────────────────────── */
function useDebounce<T>(v: T, ms: number): T {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

/* ── CountUp ─────────────────────────────────────────────────────────── */
function CountUp({ target, decimals = 0, duration = 1400 }: { target: number; decimals?: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current; prev.current = target;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setVal(from + (target - from) * e);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{Number(val.toFixed(decimals))}</>;
}

/* ── Avatar ──────────────────────────────────────────────────────────── */
function Avatar({ user, size = 56 }: { user: AdminUserDetail; size?: number }) {
  const colors = ['#7B6FFF', '#CC80FF', '#FF4D8F', '#38D68A', '#FFB800', '#00CFFF'];
  const color  = colors[(user.username.charCodeAt(0) ?? 0) % colors.length]!;
  const initials = (user.displayName ?? user.username).slice(0, 2).toUpperCase();
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt={user.username}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}40` }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: `${color}18`,
      border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700, color, fontFamily: 'monospace',
    }}>{initials}</div>
  );
}

/* ── User Search ─────────────────────────────────────────────────────── */
function UserSearch({ onSelect }: { onSelect: (id: string) => void }) {
  const [q, setQ]     = useState('');
  const [open, setOpen] = useState(false);
  const dq             = useDebounce(q, 300);
  const ref            = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['da-search', dq],
    queryFn: () => fetchUsers(1, 6, dq),
    enabled: dq.length >= 2,
    retry: 0,
  });

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const results = data?.items ?? [];
  const colors = ['#7B6FFF', '#CC80FF', '#FF4D8F', '#38D68A', '#FFB800', '#00CFFF'];

  return (
    <div ref={ref} className="relative mb-6">
      <div className="flex items-center gap-4 px-6 py-4 rounded-2xl" style={{
        background: 'rgba(6,4,16,0.98)', border: '1px solid rgba(123,111,255,0.22)',
        boxShadow: '0 0 50px rgba(123,111,255,0.06)',
      }}>
        <span style={{ color: '#7B6FFF', fontSize: 20 }}>◎</span>
        <input value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => q.length >= 2 && setOpen(true)}
          placeholder="Search by username, email, display name or user ID…"
          className="flex-1 bg-transparent font-mono text-[13px] focus:outline-none"
          style={{ color: 'rgba(232,232,255,0.9)', caretColor: '#7B6FFF' }}
        />
        {q && <button onClick={() => { setQ(''); setOpen(false); }}
          className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.3)' }}>✕</button>}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50"
          style={{ background: 'rgba(6,4,16,0.99)', border: '1px solid rgba(123,111,255,0.18)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.65)', animation: 'da-slide-down 0.2s cubic-bezier(0.22,1,0.36,1) both' }}>
          {results.map((u, i) => {
            const color = colors[(u.username.charCodeAt(0) ?? 0) % colors.length]!;
            const initials = (u.displayName ?? u.username).slice(0, 2).toUpperCase();
            return (
              <button key={u.id} onClick={() => { onSelect(u.id); setQ(u.username); setOpen(false); }}
                className="w-full flex items-center gap-4 px-5 py-3 text-left"
                style={{ borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(123,111,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${color}40` }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}18`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color, fontFamily: 'monospace' }}>{initials}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[12px] font-bold truncate" style={{ color: '#E8E8FF' }}>
                    {u.displayName ?? u.username}
                  </p>
                  <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.35)' }}>
                    @{u.username} · {u.email}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-[10px] font-bold" style={{ color: color }}>{u.dreamCount}</p>
                  <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.25)' }}>dreams</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {open && dq.length >= 2 && !results.length && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl px-6 py-4 z-50"
          style={{ background: 'rgba(6,4,16,0.99)', border: '1px solid rgba(123,111,255,0.12)' }}>
          <p className="font-mono text-[11px]" style={{ color: 'rgba(232,232,255,0.3)' }}>No users found for "{dq}"</p>
        </div>
      )}
    </div>
  );
}

/* ── User Overview Header ────────────────────────────────────────────── */
function UserHeader({ user, insights }: { user: AdminUserDetail; insights: UserInsights | undefined }) {
  const daysSince = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000);
  const topEmo    = insights?.topEmotions[0]?.emotion;
  const topArch   = insights?.topArchetypes[0]?.archetype;
  const archCfg   = topArch ? archetypeCfg(topArch) : null;

  const stats = [
    { label: 'DREAMS',      val: user.dreamCount,           color: '#7B6FFF', decimals: 0 },
    { label: 'FOLLOWERS',   val: user.followerCount,        color: '#CC80FF', decimals: 0 },
    { label: 'FOLLOWING',   val: user.followingCount,       color: '#00CFFF', decimals: 0 },
    { label: 'CONNECTIONS', val: insights?.resonanceStats.total ?? 0,     color: '#38D68A', decimals: 0 },
    { label: 'AVG SCORE',   val: Number((insights?.dreamStats.avgDreamScore ?? 0).toFixed(1)),  color: '#FFB800', decimals: 1 },
    { label: 'RESONANCE',   val: Number((insights?.resonanceStats.avgScore ?? 0).toFixed(1)),   color: '#FF4D8F', decimals: 1 },
  ];

  return (
    <div className="os-card relative overflow-hidden mb-6" style={{
      background: 'linear-gradient(135deg, rgba(6,4,16,0.99) 0%, rgba(20,10,40,0.99) 100%)',
      border: '1px solid rgba(123,111,255,0.14)',
      animation: 'da-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      {/* Scan line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1, pointerEvents: 'none', zIndex: 2,
        background: 'linear-gradient(90deg,transparent,rgba(123,111,255,0.35),transparent)',
        animation: 'da-scan 14s ease-in-out infinite',
      }} />

      <div className="px-7 py-6 flex items-start gap-7">
        {/* Avatar + status */}
        <div className="relative shrink-0">
          <Avatar user={user} size={72} />
          <span style={{
            position: 'absolute', bottom: 2, right: 2, width: 12, height: 12,
            borderRadius: '50%', background: user.isActive ? '#38D68A' : '#FF4A5E',
            border: '2px solid rgba(6,4,16,0.99)',
            boxShadow: `0 0 8px ${user.isActive ? '#38D68A' : '#FF4A5E'}`,
            animation: 'da-heartbeat 2s ease-in-out infinite',
          }} />
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            {archCfg && (
              <span className="font-mono text-[8px] font-black px-2 py-0.5 rounded-full"
                style={{ color: archCfg.color, background: `${archCfg.color}12`, border: `1px solid ${archCfg.color}25` }}>
                {archCfg.icon} {topArch?.toUpperCase()}
              </span>
            )}
            {topEmo && (
              <span className="font-mono text-[8px] px-2 py-0.5 rounded-full capitalize"
                style={{ color: emoColor(topEmo), background: `${emoColor(topEmo)}12`, border: `1px solid ${emoColor(topEmo)}25` }}>
                ♡ {topEmo}
              </span>
            )}
            <span className="font-mono text-[8px] px-2 py-0.5 rounded-full"
              style={{ color: '#38D68A', background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.2)' }}>
              {daysSince} days on DreamCloud
            </span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#E8E8FF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {user.displayName ?? user.username}
          </h2>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.4)' }}>@{user.username}</span>
            <span className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{user.email}</span>
            {user.locationCountry && (
              <span className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
                {user.locationCity ? `${user.locationCity}, ` : ''}{user.locationCountry}
              </span>
            )}
            {user.lastLoginAt && (
              <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>
                last active {new Date(user.lastLoginAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          {user.bio && (
            <p className="font-mono text-[10px] mt-2 line-clamp-2 italic" style={{ color: 'rgba(232,232,255,0.28)' }}>
              "{user.bio}"
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          {stats.map(({ label, val, color, decimals }) => (
            <div key={label} className="text-center px-3 py-2 rounded-xl" style={{
              background: `${color}05`, border: `1px solid ${color}12`, minWidth: 72,
            }}>
              <p className="font-mono font-black" style={{ fontSize: 20, color, lineHeight: 1 }}>
                <CountUp target={val} decimals={decimals} />
              </p>
              <p className="font-mono text-[7px] mt-0.5 font-bold tracking-widest" style={{ color: `${color}55` }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Join date bar */}
      <div className="px-7 pb-4 flex items-center gap-6">
        <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.2)' }}>
          JOINED {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <span className="font-mono text-[8px]" style={{ color: user.isActive ? '#38D68A' : '#FF4A5E' }}>
          {user.isActive ? '● ACTIVE' : '○ INACTIVE'}
        </span>
      </div>
    </div>
  );
}

/* ── Rotating AI Insights ────────────────────────────────────────────── */
function RotatingInsights({ insights }: { insights: UserInsights }) {
  const cards = insights.insights;
  const [idx, setIdx]   = useState(0);
  const [fade, setFade] = useState(true);

  const allObs = useMemo(() => {
    const base = cards.map(c => c.body);
    const extra: string[] = [];
    const { dreamStats: ds, resonanceStats: rs } = insights;
    if (ds.totalDreams > 30)  extra.push(`With ${ds.totalDreams} recorded dreams, this user demonstrates sustained deep engagement with their unconscious.`);
    if (rs.peakScore > 80)    extra.push(`Peak resonance score of ${rs.peakScore.toFixed(1)}% — a rare level of collective synchronization.`);
    if (rs.avgScore > 60)     extra.push(`Average resonance of ${rs.avgScore.toFixed(1)}% places this dreamer in the upper tier of collective alignment.`);
    const topEmo = insights.topEmotions[0];
    if (topEmo) extra.push(`"${topEmo.emotion}" is the dominant emotional register across ${topEmo.count} recorded dreams.`);
    const topSym = insights.topSymbols[0];
    if (topSym) extra.push(`The symbol "${topSym.manifestation}" appears ${topSym.count} times — a deeply personal archetypal motif.`);
    return [...base, ...extra].filter(Boolean);
  }, [cards, insights]);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % allObs.length); setFade(true); }, 280);
    }, 5500);
    return () => clearInterval(t);
  }, [allObs.length]);

  const card = cards[idx % cards.length];

  return (
    <div className="ai-reading-panel flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#7B6FFF' }} />
          <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#7B6FFF' }} />
        </div>
        <p className="os-title" style={{ color: '#7B6FFF' }}>AI SUBCONSCIOUS REPORT</p>
      </div>

      {/* Active observation */}
      <div className="p-4 rounded-xl mb-3 flex-1" style={{
        background: card ? `${card.color}08` : 'rgba(123,111,255,0.05)',
        border: `1px solid ${card ? card.color + '18' : 'rgba(123,111,255,0.14)'}`,
        opacity: fade ? 1 : 0, transition: 'opacity 0.28s', minHeight: 90,
      }}>
        <p className="font-mono text-[10px] font-bold mb-2" style={{ color: card?.color ?? '#7B6FFF' }}>
          {card?.title ?? 'ANALYSIS'}
        </p>
        <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.78)' }}>
          {allObs[idx]}
        </p>
        <div className="flex gap-1 mt-3">
          {allObs.map((_, i) => (
            <div key={i} style={{
              width: i === idx ? 14 : 3, height: 2, borderRadius: 1,
              background: i === idx ? '#7B6FFF' : 'rgba(123,111,255,0.18)',
              transition: 'all 0.28s',
            }} />
          ))}
        </div>
      </div>

      {/* Card list */}
      <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 220, scrollbarWidth: 'thin', scrollbarColor: 'rgba(123,111,255,0.2) transparent' }}>
        {cards.map((c, i) => (
          <div key={c.type} className="px-3 py-2 rounded-lg cursor-pointer"
            style={{
              background: i === idx % cards.length ? `${c.color}08` : 'transparent',
              border: `1px solid ${i === idx % cards.length ? c.color + '18' : 'transparent'}`,
              transition: 'all 0.2s',
            }}
            onClick={() => setIdx(i)}>
            <div className="flex items-center gap-2">
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
              <p className="font-mono text-[8.5px] font-bold tracking-wider" style={{ color: c.color }}>{c.title}</p>
            </div>
            <p className="font-mono text-[9px] mt-0.5 line-clamp-2" style={{ color: 'rgba(232,232,255,0.32)' }}>{c.body.slice(0, 72)}…</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Dream DNA (7-axis radial) ───────────────────────────────────────── */
const DreamDNA = memo(function DreamDNA({
  insights, intel,
}: { insights: UserInsights; intel: UserIntelligenceProfile | undefined }) {
  const W = 240, H = 240, CX = W / 2, CY = H / 2, R = 85;
  const axes = [
    { label: 'Creativity',   val: Math.min((insights.dreamStats.avgDreamScore ?? 50) / 100, 1), color: '#CC80FF', angle: -90 },
    { label: 'Emotion',      val: Math.min(insights.topEmotions.length / 5, 1),                 color: '#FF4D8F', angle: -38 },
    { label: 'Symbol Div.',  val: Math.min(insights.topSymbols.length / 8, 1),                  color: '#FFB800', angle: 14  },
    { label: 'Collective',   val: Math.min((insights.resonanceStats.avgScore ?? 0) / 100, 1),   color: '#38D68A', angle: 66  },
    { label: 'Complexity',   val: Math.min((intel?.analyzedDreams ?? 0) / Math.max(insights.dreamStats.totalDreams, 1), 1), color: '#7B6FFF', angle: 118 },
    { label: 'Resonance',    val: Math.min((insights.resonanceStats.peakScore ?? 0) / 100, 1),  color: '#00CFFF', angle: 170 },
    { label: 'Narrative',    val: Math.min(insights.dreamStats.totalDreams / 40, 1),            color: '#FFB800', angle: 222 },
  ];
  const pt = (a: number, r: number) => ({
    x: CX + r * Math.cos(a * Math.PI / 180),
    y: CY + r * Math.sin(a * Math.PI / 180),
  });
  const polygon = axes.map(a => { const p = pt(a.angle, a.val * R); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }}>
      <defs>
        <filter id="dna-g"><feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="dna-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7B6FFF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7B6FFF" stopOpacity="0.03" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(v => {
        const pts = axes.map(a => { const p = pt(a.angle, v * R); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
        return <polygon key={v} points={pts} fill={v === 1 ? 'url(#dna-fill)' : 'none'} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />;
      })}
      {axes.map(a => { const p = pt(a.angle, R); return <line key={a.label} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />; })}
      <polygon points={polygon} fill="rgba(123,111,255,0.14)" stroke="#7B6FFF" strokeWidth="1.3" filter="url(#dna-g)"
        style={{ animation: 'da-fade-up 1.2s ease-out both' }} />
      {axes.map(a => {
        const p = pt(a.angle, a.val * R);
        const lp = pt(a.angle, R + 18);
        return (
          <g key={a.label}>
            <circle cx={p.x} cy={p.y} r="4.5" fill={a.color} filter="url(#dna-g)" opacity="0.9">
              <animate attributeName="r" values="4;5.5;4" dur="3s" repeatCount="indefinite" />
            </circle>
            <text x={lp.x} y={lp.y + 3} textAnchor="middle"
              fill={a.color} fontSize="7" fontFamily="monospace" opacity="0.7">{a.label}</text>
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r="6" fill="#7B6FFF" opacity="0.8">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
});

/* ── Personality Model (Archetypes) ─────────────────────────────────── */
function PersonalityModel({ insights }: { insights: UserInsights }) {
  const [hov, setHov] = useState<string | null>(null);
  const total = insights.topArchetypes.reduce((s, a) => s + a.count, 0) || 1;

  if (!insights.topArchetypes.length) return (
    <div className="flex items-center justify-center h-32">
      <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No archetype data recorded yet</p>
    </div>
  );

  return (
    <div className="space-y-2.5">
      {insights.topArchetypes.slice(0, 6).map((a, i) => {
        const cfg = archetypeCfg(a.archetype);
        const pct = Math.round((a.count / total) * 100);
        const isHov = hov === a.archetype;
        return (
          <div key={a.archetype} className="cursor-pointer"
            onMouseEnter={() => setHov(a.archetype)}
            onMouseLeave={() => setHov(null)}
            style={{ animation: `da-fade-up ${0.3 + i * 0.08}s both` }}>
            <div className="flex items-center gap-3 mb-1">
              <span style={{ color: cfg.color, fontSize: 11, width: 14 }}>{cfg.icon}</span>
              <span className="font-mono text-[10px] font-bold capitalize flex-1" style={{ color: isHov ? cfg.color : 'rgba(232,232,255,0.7)' }}>
                {a.archetype}
              </span>
              <span className="font-mono text-[9px] font-black" style={{ color: cfg.color }}>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${cfg.color}10` }}>
              <div className="h-full rounded-full" style={{
                width: `${pct}%`, background: `linear-gradient(90deg,${cfg.color}80,${cfg.color})`,
                boxShadow: isHov ? `0 0 10px ${cfg.color}80` : 'none',
                transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
                animation: `da-bar-in 0.8s ${i * 0.1}s cubic-bezier(0.22,1,0.36,1) both`,
              }} />
            </div>
            {isHov && (
              <p className="font-mono text-[8.5px] mt-1" style={{ color: `${cfg.color}70` }}>{cfg.desc}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Emotional Evolution Chart ───────────────────────────────────────── */
const EmotionChart = memo(function EmotionChart({ timeline }: { timeline: UserTimeline }) {
  const W = 680, H = 200, PL = 32, PR = 12, PT = 14, PB = 28;
  const [hovX, setHovX] = useState<number | null>(null);

  const { weeks, emotions, grid } = useMemo(() => {
    const allWeeks = [...new Set(timeline.emotionHistory.map(r => r.week))].sort().slice(-10);
    const allEmos  = [...new Set(timeline.emotionHistory.map(r => r.emotion))].slice(0, 5);
    const g: Record<string, Record<string, number>> = {};
    for (const { week, emotion, count } of timeline.emotionHistory) {
      (g[week] = g[week] ?? {})[emotion] = count;
    }
    return { weeks: allWeeks, emotions: allEmos, grid: g };
  }, [timeline.emotionHistory]);

  if (!weeks.length || !emotions.length) return (
    <div className="flex items-center justify-center" style={{ height: H }}>
      <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No emotion timeline data</p>
    </div>
  );

  const maxVal = Math.max(...Object.values(grid).flatMap(w => Object.values(w)), 1);
  const xPos = (i: number) => PL + (i / (weeks.length - 1)) * (W - PL - PR);
  const yPos = (v: number) => PT + (1 - v / maxVal) * (H - PT - PB);

  const lines = emotions.map(emo => {
    const pts = weeks.map((wk, i) => `${xPos(i).toFixed(1)},${yPos(grid[wk]?.[emo] ?? 0).toFixed(1)}`);
    return { emo, d: `M${pts.join('L')}` };
  });

  const hovWeekIdx = hovX !== null ? Math.round(((hovX - PL) / (W - PL - PR)) * (weeks.length - 1)) : null;
  const hovWeek    = hovWeekIdx !== null ? weeks[Math.max(0, Math.min(hovWeekIdx, weeks.length - 1))] : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', cursor: 'crosshair' }}
      onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setHovX((e.clientX - r.left) / r.width * W); }}
      onMouseLeave={() => setHovX(null)}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(v => (
        <line key={v} x1={PL} x2={W - PR} y1={yPos(v * maxVal)} y2={yPos(v * maxVal)}
          stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      ))}
      {/* Emotion lines */}
      {lines.map(({ emo, d }) => (
        <path key={emo} d={d} fill="none" stroke={emoColor(emo)} strokeWidth="1.5"
          opacity="0.75" strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {/* Hover crosshair */}
      {hovWeek && hovWeekIdx !== null && (
        <>
          <line x1={xPos(hovWeekIdx)} x2={xPos(hovWeekIdx)} y1={PT} y2={H - PB}
            stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" strokeDasharray="3 4" />
          {emotions.map(emo => {
            const v = grid[hovWeek]?.[emo] ?? 0;
            if (!v) return null;
            return <circle key={emo} cx={xPos(hovWeekIdx)} cy={yPos(v)} r="3.5" fill={emoColor(emo)} opacity="0.95" />;
          })}
          {/* Tooltip */}
          <rect x={Math.min(xPos(hovWeekIdx) + 6, W - 110)} y={PT} width={100} height={emotions.length * 14 + 18}
            fill="rgba(6,4,16,0.95)" rx="5" stroke="rgba(123,111,255,0.2)" strokeWidth="0.7" />
          <text x={Math.min(xPos(hovWeekIdx) + 12, W - 104)} y={PT + 11}
            fill="rgba(232,232,255,0.4)" fontSize="7" fontFamily="monospace">
            {(hovWeek ?? '').slice(0, 10)}
          </text>
          {emotions.map((emo, ei) => {
            const v = grid[hovWeek]?.[emo] ?? 0;
            return (
              <g key={emo}>
                <circle cx={Math.min(xPos(hovWeekIdx) + 13, W - 103)} cy={PT + 20 + ei * 14} r="2.5" fill={emoColor(emo)} />
                <text x={Math.min(xPos(hovWeekIdx) + 19, W - 97)} y={PT + 24 + ei * 14}
                  fill="rgba(232,232,255,0.65)" fontSize="7.5" fontFamily="monospace" textAnchor="start">
                  {emo}: {v}
                </text>
              </g>
            );
          })}
        </>
      )}
      {/* X labels */}
      {weeks.filter((_, i) => i % 2 === 0).map((wk, i) => (
        <text key={wk} x={xPos(i * 2)} y={H - 6} textAnchor="middle"
          fill="rgba(232,232,255,0.2)" fontSize="7" fontFamily="monospace">
          {wk.slice(5)}
        </text>
      ))}
      {/* Legend */}
      {emotions.map((emo, i) => (
        <g key={emo}>
          <rect x={PL + i * 80} y={H - PB + 14} width={6} height={6} rx="1" fill={emoColor(emo)} opacity="0.8" />
          <text x={PL + i * 80 + 10} y={H - PB + 20} fill={emoColor(emo)} fontSize="7.5" fontFamily="monospace" opacity="0.75" textAnchor="start">{emo}</text>
        </g>
      ))}
    </svg>
  );
});

/* ── Recurring Symbol Cards ──────────────────────────────────────────── */
function SymbolCards({ insights, timeline }: { insights: UserInsights; timeline: UserTimeline }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const max = Math.max(...insights.topSymbols.map(s => s.count), 1);

  const SYMBOL_COLORS = ['#CC80FF', '#FFB800', '#38D68A', '#00CFFF', '#FF4D8F', '#7B6FFF', '#FF4A5E', '#34D399'];

  const withTrend = useMemo(() => {
    return insights.topSymbols.slice(0, 8).map((s, si) => {
      const weeks = [...new Set(timeline.symbolEvolution.map(r => r.week))].sort();
      const recentWks = weeks.slice(-3);
      const earlyWks  = weeks.slice(-6, -3);
      const recent = timeline.symbolEvolution.filter(r => r.manifestation === s.manifestation && recentWks.includes(r.week))
        .reduce((sum, r) => sum + r.count, 0);
      const early  = timeline.symbolEvolution.filter(r => r.manifestation === s.manifestation && earlyWks.includes(r.week))
        .reduce((sum, r) => sum + r.count, 0);
      const trend: 'up' | 'down' | 'stable' = recent > early + 1 ? 'up' : recent < early - 1 ? 'down' : 'stable';
      const confidence = 0.55 + (si < 3 ? 0.4 : si < 6 ? 0.25 : 0.1);
      return { ...s, trend, confidence, color: SYMBOL_COLORS[si % SYMBOL_COLORS.length]! };
    });
  }, [insights.topSymbols, timeline.symbolEvolution, SYMBOL_COLORS]);

  return (
    <div className="grid grid-cols-4 gap-3">
      {withTrend.map((s, i) => {
        const isExp = expanded === s.manifestation;
        const trendIcon = s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→';
        const trendColor = s.trend === 'up' ? '#38D68A' : s.trend === 'down' ? '#FF4A5E' : '#FFB800';
        return (
          <div key={s.manifestation}
            className="os-card cursor-pointer transition-all"
            style={{
              border: `1px solid ${isExp ? s.color + '30' : s.color + '12'}`,
              background: isExp ? `${s.color}08` : 'rgba(255,255,255,0.01)',
              animation: `da-fade-up ${0.2 + i * 0.07}s both`,
            }}
            onClick={() => setExpanded(isExp ? null : s.manifestation)}>
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] font-bold capitalize" style={{ color: s.color }}>
                  ◈ {s.manifestation}
                </span>
                <span style={{ color: trendColor, fontSize: 11 }}>{trendIcon}</span>
              </div>
              {/* Frequency bar */}
              <div className="h-1 rounded-full mb-2" style={{ background: `${s.color}12` }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${(s.count / max) * 100}%`,
                  background: `linear-gradient(90deg,${s.color}60,${s.color})`,
                  transition: 'width 0.6s',
                }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
                  {s.count}× frequency
                </span>
                <span className="font-mono text-[7px] px-1.5 py-0.5 rounded-full"
                  style={{ color: trendColor, background: `${trendColor}10` }}>
                  {(s.confidence * 100).toFixed(0)}% AI
                </span>
              </div>
            </div>
            {isExp && (
              <div className="px-3 pb-3 pt-0">
                <div style={{ height: 1, background: `${s.color}18`, marginBottom: 10 }} />
                <p className="font-mono text-[9px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.55)' }}>
                  {symbolMeaning(s.manifestation)}
                </p>
                <p className="font-mono text-[8px] mt-2" style={{ color: `${s.color}60` }}>
                  Trend: <span style={{ color: trendColor }}>{s.trend === 'up' ? 'Increasing frequency' : s.trend === 'down' ? 'Declining frequency' : 'Stable pattern'}</span>
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Archetype Evolution Timeline ────────────────────────────────────── */
function ArchetypeTimeline({ insights }: { insights: UserInsights }) {
  const archs = insights.topArchetypes.slice(0, 5);
  if (!archs.length) return (
    <div className="flex items-center justify-center h-24">
      <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No archetype evolution data</p>
    </div>
  );
  return (
    <div className="flex flex-col gap-0">
      {archs.map((a, i) => {
        const cfg = archetypeCfg(a.archetype);
        return (
          <div key={a.archetype} className="flex items-center gap-3"
            style={{ animation: `da-fade-up ${0.3 + i * 0.1}s both` }}>
            <div className="flex flex-col items-center">
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: `${cfg.color}15`,
                border: `1.5px solid ${cfg.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: cfg.color, flexShrink: 0,
              }}>{cfg.icon}</div>
              {i < archs.length - 1 && (
                <div style={{ width: 1, height: 28, background: `linear-gradient(to bottom, ${cfg.color}40, transparent)` }} />
              )}
            </div>
            <div className="pb-2">
              <p className="font-mono text-[10px] font-bold capitalize" style={{ color: 'rgba(232,232,255,0.75)' }}>{a.archetype}</p>
              <p className="font-mono text-[8px]" style={{ color: `${cfg.color}60` }}>{a.count} dream appearances</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Collective Comparison ───────────────────────────────────────────── */
function CollectiveComparison({ insights }: {
  insights: UserInsights; intel?: UserIntelligenceProfile
}) {
  const rs = insights.resonanceStats;
  const PLATFORM_AVGS = { avgScore: 42, peakScore: 68, totalConnections: 8, dreamScore: 55 };

  const bars = [
    { label: 'Resonance Score',     user: rs.avgScore,          platform: PLATFORM_AVGS.avgScore,          color: '#7B6FFF', unit: '%' },
    { label: 'Peak Alignment',      user: rs.peakScore,         platform: PLATFORM_AVGS.peakScore,         color: '#CC80FF', unit: '%' },
    { label: 'Connections',         user: rs.total,             platform: PLATFORM_AVGS.totalConnections,  color: '#38D68A', unit: '' },
    { label: 'Dream Score',         user: insights.dreamStats.avgDreamScore, platform: PLATFORM_AVGS.dreamScore, color: '#FFB800', unit: '' },
    { label: 'Symbol Diversity',    user: insights.topSymbols.length,        platform: 4,                       color: '#00CFFF', unit: '' },
    { label: 'Archetype Range',     user: insights.topArchetypes.length,     platform: 3,                       color: '#FF4D8F', unit: '' },
  ];

  return (
    <div className="space-y-3">
      {bars.map(({ label, user, platform, color, unit }) => {
        const max      = Math.max(user, platform, 1);
        const userPct  = Math.min((user / max) * 100, 100);
        const platPct  = Math.min((platform / max) * 100, 100);
        const above    = user > platform;
        return (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] font-black" style={{ color: above ? '#38D68A' : '#FF4A5E' }}>
                  {above ? '▲' : '▼'} {Number(user).toFixed(Number(user) % 1 === 0 ? 0 : 1)}{unit}
                </span>
                <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.2)' }}>
                  avg {Number(platform).toFixed(0)}{unit}
                </span>
              </div>
            </div>
            <div className="relative h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {/* Platform average */}
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2,
                width: `${platPct}%`, background: 'rgba(255,255,255,0.08)',
              }} />
              {/* User bar */}
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2,
                width: `${userPct}%`, background: `linear-gradient(90deg,${color}60,${color})`,
                boxShadow: `0 0 8px ${color}40`, transition: 'width 0.6s',
              }} />
            </div>
          </div>
        );
      })}
      <p className="font-mono text-[7.5px] mt-3" style={{ color: 'rgba(232,232,255,0.15)' }}>
        Platform averages are estimated baseline values for comparison.
      </p>
    </div>
  );
}

/* ── AI Risk & Wellness ──────────────────────────────────────────────── */
function RiskWellness({ risk, insights }: { risk: UserRiskProfile; insights: UserInsights }) {
  const levelColor = { low: '#38D68A', medium: '#FFB800', high: '#FF8C42', critical: '#FF4A5E' };
  const lc = levelColor[risk.riskLevel];

  const indicators = [
    { label: 'Dream Activity',       val: risk.dreamCount > 30 ? 'High' : risk.dreamCount > 10 ? 'Moderate' : 'Low',    color: '#7B6FFF',  icon: '◎' },
    { label: 'Emotional Range',      val: insights.topEmotions.length > 4 ? 'Diverse' : 'Focused',                       color: '#FF4D8F',  icon: '♡' },
    { label: 'Collective Sync',      val: insights.resonanceStats.avgScore > 60 ? 'Strong' : insights.resonanceStats.avgScore > 35 ? 'Moderate' : 'Developing', color: '#38D68A', icon: '⊕' },
    { label: 'Symbol Consistency',   val: insights.topSymbols.length > 5 ? 'Rich Pattern' : 'Emerging',                  color: '#CC80FF',  icon: '◈' },
    { label: 'Creative Output',      val: risk.dreamCount > 20 ? 'High' : 'Steady',                                       color: '#FFB800',  icon: '✦' },
    { label: 'Moderation Signal',    val: risk.hiddenCount > 5 ? 'Elevated' : risk.hiddenCount > 0 ? 'Minor' : 'Clean',  color: risk.hiddenCount > 5 ? '#FF4A5E' : '#38D68A', icon: '◌' },
  ];

  return (
    <div>
      {/* Risk level badge */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: `${lc}08`, border: `1px solid ${lc}20` }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: lc, boxShadow: `0 0 10px ${lc}` }} />
        <p className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: lc }}>
          {risk.riskLevel} risk profile
        </p>
        <div className="flex-1" />
        <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
          score {risk.overallScore.toFixed(0)}
        </span>
      </div>

      {/* Pattern indicators */}
      <div className="grid grid-cols-2 gap-2">
        {indicators.map(({ label, val, color, icon }) => (
          <div key={label} className="px-3 py-2.5 rounded-xl" style={{ background: `${color}06`, border: `1px solid ${color}14` }}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span style={{ color, fontSize: 9 }}>{icon}</span>
              <p className="font-mono text-[7.5px] font-bold tracking-wider" style={{ color: `${color}70` }}>{label.toUpperCase()}</p>
            </div>
            <p className="font-mono text-[10px] font-bold" style={{ color: 'rgba(232,232,255,0.7)' }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="font-mono text-[7.5px] mt-3 leading-relaxed" style={{ color: 'rgba(232,232,255,0.18)' }}>
        ⚠ These are AI-generated pattern observations derived from dream activity data. They do not constitute clinical, psychological or medical conclusions and should not be used as such.
      </p>
    </div>
  );
}

/* ── Predictive Insights ─────────────────────────────────────────────── */
function PredictiveInsights({ insights, timeline }: { insights: UserInsights; timeline: UserTimeline }) {
  const predictions = useMemo(() => {
    const preds: Array<{ text: string; confidence: number; color: string }> = [];
    const { dreamStats: ds, resonanceStats: rs, topEmotions, topSymbols, topArchetypes } = insights;

    const emoPositive = ['joy', 'hope', 'peace', 'curiosity', 'wonder', 'love'];
    const emoNegative = ['fear', 'anxiety', 'sadness', 'anger'];
    const hasPositiveDominance = topEmotions.some(e => emoPositive.includes(e.emotion.toLowerCase()) && e.count > 3);
    const hasNegativeDominance = topEmotions.some(e => emoNegative.includes(e.emotion.toLowerCase()) && e.count > 5);

    if (rs.avgScore > 55)
      preds.push({ text: 'Collective resonance is strengthening — this dreamer is increasingly synchronized with the broader network.', confidence: 0.78, color: '#38D68A' });
    if (hasPositiveDominance)
      preds.push({ text: 'Positive emotional themes are dominant. Emotional recovery and growth patterns are likely to continue.', confidence: 0.71, color: '#FFB800' });
    if (hasNegativeDominance)
      preds.push({ text: 'Stress and anxiety-related symbols may continue appearing. Emotional processing work is ongoing.', confidence: 0.65, color: '#FF8C42' });
    if (topArchetypes[0]?.archetype.toLowerCase() === 'creator' || topArchetypes[0]?.archetype.toLowerCase() === 'explorer')
      preds.push({ text: 'Creative and exploratory dream themes are likely to deepen in complexity and narrative richness.', confidence: 0.68, color: '#CC80FF' });
    if (topSymbols.some(s => ['water', 'ocean', 'river'].includes(s.manifestation.toLowerCase())))
      preds.push({ text: 'Water-related symbols suggest emotional depth processing. These are expected to evolve into transformation themes.', confidence: 0.63, color: '#00CFFF' });
    if (ds.totalDreams > 20)
      preds.push({ text: 'With sustained dream logging, pattern consistency is expected to increase in the next 30 days.', confidence: 0.74, color: '#7B6FFF' });
    if (ds.avgDreamScore > 65)
      preds.push({ text: 'Dream complexity is above average. Lucid dreaming frequency is likely to increase gradually.', confidence: 0.60, color: '#CC80FF' });
    if (topArchetypes.length > 3)
      preds.push({ text: 'Multiple active archetypes suggest an individuation phase. Dominant archetype may shift within 60 days.', confidence: 0.55, color: '#FFB800' });

    if (!preds.length)
      preds.push({ text: 'Insufficient data for confident predictions. Continue logging dreams for personalized forecasts.', confidence: 0.4, color: '#7B6FFF' });

    return preds.slice(0, 5);
  }, [insights, timeline]);

  return (
    <div className="grid grid-cols-1 gap-3">
      {predictions.map(({ text, confidence, color }, i) => (
        <div key={i} className="flex items-start gap-4 p-4 rounded-xl"
          style={{ background: `${color}05`, border: `1px solid ${color}14`, animation: `da-fade-up ${0.2 + i * 0.08}s both` }}>
          <div className="shrink-0 mt-0.5">
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: `${color}12`,
              border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color,
            }}>◈</div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.72)' }}>{text}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-1 rounded-full overflow-hidden" style={{ width: 80, background: `${color}15` }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${confidence * 100}%`, background: color }} />
              </div>
              <span className="font-mono text-[7.5px]" style={{ color: `${color}60` }}>
                {(confidence * 100).toFixed(0)}% probability
              </span>
            </div>
          </div>
        </div>
      ))}
      <p className="font-mono text-[7.5px] text-right" style={{ color: 'rgba(232,232,255,0.15)' }}>
        Predictive insights are probabilistic AI pattern forecasts, not certainties. Updated as new dreams are recorded.
      </p>
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────────────────────── */
const EmptyState = memo(function EmptyState() {
  const rng = useMemo(() => mkRng(42), []);
  const particles = useMemo(() => Array.from({ length: 28 }, () => ({
    x: rng() * 96 + 2, y: rng() * 85 + 5,
    size: 1 + rng() * 3, dur: 8 + rng() * 16, off: rng() * 10,
  })), [rng]);
  const syms = ['◈', '☽', '✦', '∞', '⊕', '★', '◎', '♡', '⬡', '◌', '⟨', '◊'];

  return (
    <div className="flex flex-col items-center justify-center py-32 relative overflow-hidden" style={{ minHeight: 480 }}>
      {/* Background particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: '50%',
          background: '#7B6FFF', opacity: 0.08,
          animation: `da-float-p ${p.dur}s ${p.off}s ease-in-out infinite`,
          willChange: 'transform',
        }} />
      ))}

      {/* Floating symbols */}
      {syms.map((s, i) => (
        <div key={s} style={{
          position: 'absolute',
          left: `${8 + i * 7.5}%`, top: `${15 + Math.sin(i * 0.8) * 55}%`,
          fontSize: 16 + (i % 3) * 6, opacity: 0.05, color: '#7B6FFF',
          animation: `da-float ${12 + i}s ${i * 0.7}s ease-in-out infinite`,
          willChange: 'transform',
        }}>{s}</div>
      ))}

      {/* Central AI core */}
      <div className="relative mb-10" style={{ width: 180, height: 180 }}>
        {[0, 1, 2, 3].map(k => (
          <div key={k} style={{
            position: 'absolute', inset: k * 20, borderRadius: '50%',
            border: '1px solid rgba(123,111,255,0.08)',
            animation: `da-spin-${k % 2} ${18 + k * 9}s linear infinite`,
          }} />
        ))}
        {[0, 1, 2].map(k => (
          <div key={k} style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 90 - k * 22, height: 90 - k * 22, borderRadius: '50%',
              border: `1px solid rgba(123,111,255,${0.06 + k * 0.04})`,
              animation: `da-breathe ${4 + k * 1.5}s ${k * 0.8}s ease-in-out infinite`,
            }} />
          </div>
        ))}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 42, animation: 'da-breathe 5s ease-in-out infinite',
        }}>◎</div>
      </div>

      <div className="text-center relative z-10" style={{ maxWidth: 420 }}>
        <p className="font-mono text-[11px] font-bold tracking-[0.25em] mb-4" style={{ color: '#7B6FFF' }}>
          AI SUBCONSCIOUS LABORATORY
        </p>
        <p style={{ fontSize: 17, fontWeight: 700, color: 'rgba(232,232,255,0.65)', marginBottom: 10 }}>
          Select a dreamer to generate a comprehensive subconscious intelligence report.
        </p>
        <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.22)' }}>
          Search by username, email, display name or user ID. The AI will analyze emotional evolution, symbolic patterns, archetype dynamics and collective alignment.
        </p>
      </div>
    </div>
  );
});

/* ── Loading skeleton ────────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-32 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(123,111,255,0.1)', borderTopColor: '#7B6FFF' }} />
        <div className="absolute inset-2 rounded-full border animate-spin"
          style={{ borderColor: 'rgba(204,128,255,0.1)', borderTopColor: '#CC80FF', animationDirection: 'reverse', animationDuration: '0.8s' }} />
      </div>
      <div>
        <p className="font-mono text-[11px] font-bold tracking-widest mb-1" style={{ color: '#7B6FFF' }}>
          GENERATING INTELLIGENCE REPORT
        </p>
        <p className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
          Analyzing emotional patterns, archetypes and collective alignment…
        </p>
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────── */
export default function DreamAssistant() {
  const [userId, setUserId] = useState<string | null>(null);

  const { data: user,     isLoading: uLoading  } = useQuery({ queryKey: ['da-user',     userId], queryFn: () => fetchUserById(userId!),                  enabled: !!userId, retry: 1 });
  const { data: insights, isLoading: iLoading  } = useQuery({ queryKey: ['da-insights', userId], queryFn: () => fetchUserInsights(userId!),              enabled: !!userId, retry: 1 });
  const { data: timeline, isLoading: tLoading  } = useQuery({ queryKey: ['da-timeline', userId], queryFn: () => fetchUserTimeline(userId!),              enabled: !!userId, retry: 0 });
  const { data: intel                           } = useQuery({ queryKey: ['da-intel',    userId], queryFn: () => fetchUserIntelligenceProfile(userId!),  enabled: !!userId, retry: 0 });
  const { data: risk                            } = useQuery({ queryKey: ['da-risk',     userId], queryFn: () => fetchUserRiskProfile(userId!),          enabled: !!userId, retry: 0 });

  const isLoading = uLoading || iLoading;
  const hasData   = !!user && !!insights;

  return (
    <div className="section-system relative">
      <style>{`
        @keyframes da-fade-up    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes da-slide-down { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes da-scan       { 0%{top:-2px;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
        @keyframes da-float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes da-float-p    { 0%,100%{transform:translate(0,0)} 33%{transform:translate(4px,-6px)} 66%{transform:translate(-3px,5px)} }
        @keyframes da-breathe    { 0%,100%{opacity:0.15;transform:scale(1)} 50%{opacity:0.35;transform:scale(1.08)} }
        @keyframes da-heartbeat  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.25)} }
        @keyframes da-spin-0     { to{transform:rotate(360deg)} }
        @keyframes da-spin-1     { to{transform:rotate(-360deg)} }
        @keyframes da-bar-in     { from{width:0} }
      `}</style>

      <Header
        title="AI Dream Assistant"
        subtitle="Advanced subconscious intelligence — emotional evolution, archetype dynamics, collective alignment"
        section="system"
        actions={userId ? (
          <button onClick={() => setUserId(null)}
            className="font-mono text-[9px] px-3 py-1.5 rounded-full"
            style={{ color: 'rgba(232,232,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            ← New Search
          </button>
        ) : undefined}
      />

      {/* Search bar — always visible */}
      <UserSearch onSelect={setUserId} />

      {/* Empty state */}
      {!userId && <EmptyState />}

      {/* Loading */}
      {userId && isLoading && <LoadingState />}

      {/* Full report */}
      {hasData && !isLoading && (
        <>
          {/* User header */}
          <UserHeader user={user} insights={insights} />

          {/* ── ROW 1: AI Insights + DNA + Personality ─────────── */}
          <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '1fr 260px 260px' }}>

            {/* AI Subconscious Report */}
            <div className="os-card p-5" style={{ animation: 'da-fade-up 0.4s both' }}>
              <RotatingInsights insights={insights} />
            </div>

            {/* Dream DNA */}
            <div className="os-card overflow-hidden" style={{ animation: 'da-fade-up 0.5s both' }}>
              <div className="os-panel-header">
                <p className="os-title" style={{ color: '#CC80FF' }}>DREAM DNA</p>
              </div>
              <div className="p-3 flex flex-col items-center">
                <DreamDNA insights={insights} intel={intel} />
                <p className="font-mono text-[8px] text-center mt-1" style={{ color: 'rgba(232,232,255,0.2)' }}>
                  Multidimensional subconscious fingerprint
                </p>
              </div>
            </div>

            {/* Personality Model */}
            <div className="os-card overflow-hidden" style={{ animation: 'da-fade-up 0.6s both' }}>
              <div className="os-panel-header">
                <p className="os-title" style={{ color: '#FFB800' }}>PERSONALITY MODEL</p>
              </div>
              <div className="p-4">
                <PersonalityModel insights={insights} />
              </div>
            </div>
          </div>

          {/* ── ROW 2: Emotional Evolution (full width) ──────────── */}
          {timeline && !tLoading && timeline.emotionHistory.length > 0 && (
            <div className="os-card overflow-hidden mb-5" style={{ animation: 'da-fade-up 0.5s both' }}>
              <div className="os-panel-header flex items-center justify-between">
                <p className="os-title" style={{ color: '#FF4D8F' }}>EMOTIONAL EVOLUTION</p>
                <span className="font-mono text-[9px] text-dc-muted">
                  {[...new Set(timeline.emotionHistory.map(r => r.week))].length} weeks of data
                </span>
              </div>
              <div className="px-3 pt-2 pb-3">
                <EmotionChart timeline={timeline} />
              </div>
            </div>
          )}

          {/* ── ROW 3: Symbol Cards ──────────────────────────────── */}
          {insights.topSymbols.length > 0 && (
            <div className="os-card overflow-hidden mb-5" style={{ animation: 'da-fade-up 0.55s both' }}>
              <div className="os-panel-header flex items-center justify-between">
                <p className="os-title" style={{ color: '#CC80FF' }}>RECURRING SYMBOL ANALYSIS</p>
                <span className="font-mono text-[9px] text-dc-muted">
                  {insights.topSymbols.length} symbols · click to expand
                </span>
              </div>
              <div className="p-4">
                <SymbolCards insights={insights} timeline={timeline ?? { emotionHistory: [], symbolEvolution: [], resonanceHistory: [], dreamFrequency: [], totals: null }} />
              </div>
            </div>
          )}

          {/* ── ROW 4: Archetype + Collective + Risk ─────────────── */}
          <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="os-card overflow-hidden">
              <div className="os-panel-header">
                <p className="os-title" style={{ color: '#FFB800' }}>ARCHETYPE EVOLUTION</p>
              </div>
              <div className="p-4">
                <ArchetypeTimeline insights={insights} />
              </div>
            </div>

            <div className="os-card overflow-hidden">
              <div className="os-panel-header">
                <p className="os-title" style={{ color: '#38D68A' }}>COLLECTIVE COMPARISON</p>
              </div>
              <div className="p-4">
                <CollectiveComparison insights={insights} intel={intel} />
              </div>
            </div>

            {risk ? (
              <div className="os-card overflow-hidden">
                <div className="os-panel-header">
                  <p className="os-title" style={{ color: '#00CFFF' }}>AI RISK & WELLNESS</p>
                </div>
                <div className="p-4">
                  <RiskWellness risk={risk} insights={insights} />
                </div>
              </div>
            ) : (
              <div className="os-card overflow-hidden flex items-center justify-center">
                <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.2)' }}>Loading wellness data…</p>
              </div>
            )}
          </div>

          {/* ── ROW 5: Predictive Insights ───────────────────────── */}
          <div className="os-card overflow-hidden mb-5" style={{ animation: 'da-fade-up 0.6s both' }}>
            <div className="os-panel-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#7B6FFF' }} />
                  <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#7B6FFF' }} />
                </div>
                <p className="os-title" style={{ color: '#7B6FFF' }}>FUTURE DREAM TENDENCIES</p>
              </div>
              <span className="font-mono text-[8px] px-2 py-0.5 rounded-full"
                style={{ color: '#7B6FFF', background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.2)' }}>
                AI FORECAST
              </span>
            </div>
            <div className="p-5">
              <PredictiveInsights insights={insights} timeline={timeline ?? { emotionHistory: [], symbolEvolution: [], resonanceHistory: [], dreamFrequency: [], totals: null }} />
            </div>
          </div>

          {/* ── Bottom stats row ─────────────────────────────────── */}
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: 'TOTAL DREAMS',   val: insights.dreamStats.totalDreams,              color: '#7B6FFF', dec: 0 },
              { label: 'AVG SCORE',      val: insights.dreamStats.avgDreamScore,             color: '#CC80FF', dec: 1 },
              { label: 'PEAK RESONANCE', val: insights.resonanceStats.peakScore,             color: '#38D68A', dec: 1 },
              { label: 'CONNECTIONS',    val: insights.resonanceStats.total,                 color: '#FFB800', dec: 0 },
              { label: 'ANALYZED',       val: intel?.analyzedDreams ?? 0,                   color: '#00CFFF', dec: 0 },
              { label: 'TOTAL MATCHES',  val: intel?.totalMatches   ?? 0,                   color: '#FF4D8F', dec: 0 },
            ].map(({ label, val, color, dec }) => (
              <div key={label} className="os-card p-3 text-center" style={{ background: `${color}05`, border: `1px solid ${color}12` }}>
                <p className="font-mono font-black text-[22px] leading-none mb-1" style={{ color }}>
                  <CountUp target={Number(val)} decimals={dec} />
                </p>
                <p className="font-mono text-[7px] font-bold tracking-widest" style={{ color: `${color}50` }}>{label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
