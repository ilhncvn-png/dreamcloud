import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import {
  fetchUsers, fetchUserById, fetchUserDreams,
  fetchUserTimeline, fetchUserIntelligenceProfile,
} from '../api/admin.api';
import type { AdminUser, AdminDream } from '../types/admin.types';
import type {
  TimelineWeekEmotion, TimelineSymbol, TimelineResonance, TimelineFrequency,
} from '../api/admin.api';

/* ── Colors / constants ──────────────────────────────────────────────── */
const EMO_COLOR: Record<string, string> = {
  joy: '#38D68A', sadness: '#60A5FA', fear: '#FF4A5E', anger: '#FF8C42',
  anxiety: '#FFB800', love: '#FF4D8F', confusion: '#CC80FF', peace: '#00CFFF',
  excitement: '#FFB800', grief: '#7B6FFF', wonder: '#A78BFA', hope: '#38D68A',
};
const RES_COLOR: Record<string, string> = {
  cosmic: '#FFD700', deep: '#CC80FF', surface: '#00CFFF', dormant: '#5A5A84',
};
const CAT_COLOR: Record<string, string> = {
  Lucid: '#FFD700', Shadow: '#CC80FF', Transformation: '#38D68A',
  Nightmare: '#FF4A5E', Prophetic: '#00CFFF', Recurring: '#FFB800',
  Adventure: '#7B6FFF', Romance: '#FF4D8F',
};
const FLOAT_SYMS = ['🌙', '⭐', '💭', '🔮', '✨', '🌊', '🦋', '🌌', '🌸', '🔔'];

const emoColor  = (e: string) => EMO_COLOR[e?.toLowerCase()] ?? '#7B6FFF';
const resColor  = (l: string) => RES_COLOR[l?.toLowerCase()] ?? '#5A5A84';
const catColor  = (c: string) => CAT_COLOR[c] ?? '#7B6FFF';
const fmtDate   = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtShort  = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
const initials  = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ── CountUp ─────────────────────────────────────────────────────────── */
function CountUp({ to, dur = 900, decimals = 0 }: { to: number; dur?: number; decimals?: number }) {
  const [v, setV] = useState(0);
  const fr = useRef(0); const pr = useRef(0);
  useEffect(() => {
    const s = performance.now(), from = pr.current; pr.current = to;
    cancelAnimationFrame(fr.current);
    const t = (now: number) => {
      const p = Math.min((now - s) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      setV(parseFloat((from + (to - from) * e).toFixed(decimals)));
      if (p < 1) fr.current = requestAnimationFrame(t);
    };
    fr.current = requestAnimationFrame(t);
    return () => cancelAnimationFrame(fr.current);
  }, [to, dur, decimals]);
  return <>{decimals > 0 ? v.toFixed(decimals) : v.toLocaleString()}</>;
}

/* ── Debounce hook ───────────────────────────────────────────────────── */
function useDebounce<T>(val: T, ms: number): T {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return d;
}

/* ── Avatar ──────────────────────────────────────────────────────────── */
function Avatar({ url, name, size = 48, hex = '#CC80FF' }: { url: string | null; name: string; size?: number; hex?: string }) {
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: `linear-gradient(135deg, ${hex}30, ${hex}10)`,
      border: `1.5px solid ${hex}30`,
      fontSize: size * 0.35, fontFamily: 'monospace', fontWeight: 700, color: hex,
    }}>
      {initials(name || '?')}
    </div>
  );
}

/* ── Search Bar ──────────────────────────────────────────────────────── */
function SearchBar({ onSelect }: { onSelect: (id: string) => void }) {
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 300);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['ut-search', dq],
    queryFn: () => fetchUsers(1, 6, dq),
    enabled: dq.length >= 2,
  });

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const users: AdminUser[] = data?.items ?? [];

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl relative" style={{
        background: 'rgba(6,4,16,0.97)', border: '1px solid rgba(204,128,255,0.2)',
        boxShadow: '0 0 40px rgba(204,128,255,0.06)',
      }}>
        <span style={{ color: '#CC80FF', fontSize: 18 }}>◎</span>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => q.length >= 2 && setOpen(true)}
          placeholder="Search by User ID, Username or Email…"
          className="flex-1 bg-transparent text-[13px] font-mono focus:outline-none"
          style={{ color: 'rgba(232,232,255,0.9)', caretColor: '#CC80FF' }}
        />
        {q && (
          <button onClick={() => { setQ(''); setOpen(false); }}
            className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.25)' }}>✕</button>
        )}
        {/* Typing hint */}
        {q.length < 2 && (
          <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.15)' }}>
            Type at least 2 characters
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && users.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50" style={{
          background: 'rgba(6,4,16,0.99)', border: '1px solid rgba(204,128,255,0.18)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          animation: 'ut-slide-down 0.2s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          {users.map((u, i) => (
            <button key={u.id} onClick={() => { onSelect(u.id); setQ(u.username); setOpen(false); }}
              className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors"
              style={{
                borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(204,128,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar url={u.avatarUrl} name={u.displayName || u.username} size={32} hex="#CC80FF" />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[12px] font-bold" style={{ color: '#E8E8FF' }}>
                  {u.displayName || u.username}
                </p>
                <p className="font-mono text-[10px]" style={{ color: 'rgba(232,232,255,0.35)' }}>
                  @{u.username} · {u.email}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-[11px] font-bold" style={{ color: '#CC80FF' }}>
                  {u.dreamCount}
                </p>
                <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>dreams</p>
              </div>
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: u.isActive ? '#38D68A' : '#5A5A84' }} />
            </button>
          ))}
        </div>
      )}

      {open && dq.length >= 2 && users.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl px-5 py-4 z-50" style={{
          background: 'rgba(6,4,16,0.99)', border: '1px solid rgba(204,128,255,0.12)',
        }}>
          <p className="font-mono text-[11px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
            No dreamers found for "{dq}"
          </p>
        </div>
      )}
    </div>
  );
}

/* ── User Profile Header ─────────────────────────────────────────────── */
function UserProfileHeader({ userId }: { userId: string }) {
  const { data: user } = useQuery({ queryKey: ['ut-user', userId], queryFn: () => fetchUserById(userId) });
  const { data: intel } = useQuery({ queryKey: ['ut-intel', userId], queryFn: () => fetchUserIntelligenceProfile(userId) });

  if (!user) return null;
  const name = user.displayName || user.username;
  const topEmo = intel?.topEmotions[0];
  const topSym = intel?.topSymbols[0];

  const statItems = [
    { label: 'DREAMS',    val: user.dreamCount,            color: '#00CFFF', fmt: false },
    { label: 'MATCHES',   val: intel?.totalMatches ?? 0,   color: '#CC80FF', fmt: false },
    { label: 'AVG SCORE', val: intel?.avgDreamScore ?? 0,  color: '#FFB800', fmt: true  },
    { label: 'RESONANCE', val: intel?.avgResonance ?? 0,   color: '#38D68A', fmt: true  },
    { label: 'FOLLOWERS', val: user.followerCount,          color: '#7B6FFF', fmt: false },
    { label: 'LIKES',     val: intel?.totalLikes ?? 0,     color: '#FF4D8F', fmt: false },
  ];

  return (
    <div className="os-card overflow-hidden mb-5" style={{
      background: 'linear-gradient(135deg, rgba(6,4,16,0.99) 0%, rgba(20,12,40,0.99) 100%)',
      border: '1px solid rgba(204,128,255,0.14)',
      boxShadow: '0 0 60px rgba(204,128,255,0.05)',
      animation: 'ut-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      {/* Scan line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1, zIndex: 10, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent, rgba(204,128,255,0.3), transparent)',
        animation: 'ut-scan 10s ease-in-out infinite',
      }} />

      <div className="flex items-center gap-6 px-8 py-6 relative">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar url={user.avatarUrl} name={name} size={72} hex="#CC80FF" />
          <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[rgba(6,4,16,0.99)]"
            style={{ background: user.isActive ? '#38D68A' : '#5A5A84' }} />
        </div>

        {/* Name block */}
        <div className="flex-1 min-w-0">
          <p className="font-black mb-0.5" style={{ fontSize: 22, color: '#E8E8FF', letterSpacing: '-0.02em' }}>
            {name}
          </p>
          <p className="font-mono text-[11px] mb-2" style={{ color: 'rgba(232,232,255,0.4)' }}>
            @{user.username} · {user.email}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {user.locationCountry && (
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full"
                style={{ color: '#00CFFF', background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.2)' }}>
                📍 {user.locationCity ? `${user.locationCity}, ` : ''}{user.locationCountry}
              </span>
            )}
            <span className="font-mono text-[9px] px-2 py-0.5 rounded-full"
              style={{ color: 'rgba(232,232,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              Joined {fmtDate(user.createdAt)}
            </span>
            {topEmo && (
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full capitalize"
                style={{ color: emoColor(topEmo.emotion), background: `${emoColor(topEmo.emotion)}10`, border: `1px solid ${emoColor(topEmo.emotion)}25` }}>
                ♡ {topEmo.emotion}
              </span>
            )}
            {topSym && (
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full capitalize"
                style={{ color: '#CC80FF', background: 'rgba(204,128,255,0.08)', border: '1px solid rgba(204,128,255,0.2)' }}>
                ◈ {topSym.symbol}
              </span>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          {statItems.map(({ label, val, color, fmt }) => (
            <div key={label} className="text-center px-3 py-2.5 rounded-xl" style={{
              background: `${color}06`, border: `1px solid ${color}12`,
            }}>
              <p className="font-mono font-black text-[18px] leading-none mb-0.5" style={{ color }}>
                <CountUp to={Number(val)} decimals={fmt ? 1 : 0} />
              </p>
              <p className="font-mono text-[7px] font-bold tracking-widest" style={{ color: `${color}60` }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Dream Timeline ──────────────────────────────────────────────────── */
const DreamTimeline = memo(function DreamTimeline({ userId }: { userId: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ['ut-dreams', userId],
    queryFn: () => fetchUserDreams(userId, 1, 40),
  });
  const dreams: AdminDream[] = data?.items ?? [];

  if (!dreams.length) return (
    <div className="flex items-center justify-center h-40">
      <p className="font-mono text-[11px]" style={{ color: 'rgba(232,232,255,0.2)' }}>No dreams yet.</p>
    </div>
  );

  return (
    <div className="relative" style={{ paddingLeft: 40 }}>
      {/* Timeline spine */}
      <div style={{
        position: 'absolute', left: 15, top: 8, bottom: 8, width: 1,
        background: 'linear-gradient(to bottom, rgba(204,128,255,0.5), rgba(204,128,255,0.05))',
      }} />

      {dreams.map((d, i) => {
        const isExp = expanded === d.id;
        const color = catColor(d.category);
        const isNew = i === 0;
        return (
          <div key={d.id} className="relative mb-3"
            style={{ animation: `ut-fade-up ${0.15 + i * 0.04}s cubic-bezier(0.22,1,0.36,1) both` }}>
            {/* Timeline dot */}
            <div style={{
              position: 'absolute', left: -32, top: 16, zIndex: 2,
              width: 10, height: 10, borderRadius: '50%', background: color,
              boxShadow: isNew ? `0 0 14px ${color}` : `0 0 5px ${color}60`,
              animation: isNew ? 'ut-dot-pulse 2s ease-out' : 'none',
            }} />
            {/* Date on spine */}
            <div style={{
              position: 'absolute', left: -120, top: 12, width: 72,
              textAlign: 'right',
            }}>
              <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
                {fmtShort(d.createdAt)}
              </span>
            </div>

            {/* Dream card */}
            <div
              className="rounded-xl overflow-hidden cursor-pointer transition-all"
              style={{
                background: isExp ? `${color}08` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isExp ? color + '25' : 'rgba(255,255,255,0.05)'}`,
                boxShadow: isExp ? `0 0 20px ${color}12` : 'none',
              }}
              onClick={() => setExpanded(isExp ? null : d.id)}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Category badge */}
                <span className="font-mono text-[8px] font-black px-2 py-0.5 rounded-full shrink-0"
                  style={{ color, background: `${color}12`, border: `1px solid ${color}20` }}>
                  {d.category}
                </span>

                {/* Title */}
                <p className="flex-1 font-mono text-[12px] font-bold truncate"
                  style={{ color: isExp ? color : 'rgba(232,232,255,0.75)' }}>
                  {d.title || 'Untitled Dream'}
                </p>

                {/* Metrics */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>
                    ♡ {d.likeCount}
                  </span>
                  <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.18)' }}>
                    ◎ {d.viewCount}
                  </span>
                  <span style={{
                    fontSize: 8, color: 'rgba(232,232,255,0.2)',
                    transform: isExp ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.25s',
                    display: 'inline-block',
                  }}>▼</span>
                </div>
              </div>

              {/* Expanded */}
              {isExp && (
                <div className="px-4 pb-4 grid grid-cols-3 gap-2 pt-1" style={{
                  borderTop: `1px solid ${color}12`,
                  animation: 'ut-fade-up 0.25s ease-out both',
                }}>
                  {[
                    { label: 'VISIBILITY', val: d.visibility      },
                    { label: 'COMMENTS',   val: d.commentCount     },
                    { label: 'SAVES',      val: d.saveCount        },
                    { label: 'VIEWS',      val: d.viewCount        },
                    { label: 'LIKES',      val: d.likeCount        },
                    { label: 'DATE',       val: fmtDate(d.createdAt) },
                  ].map(({ label, val }) => (
                    <div key={label} className="p-2 rounded-lg" style={{ background: `${color}06` }}>
                      <p className="font-mono text-[7px] mb-0.5" style={{ color: `${color}60` }}>{label}</p>
                      <p className="font-mono text-[10px] font-bold" style={{ color }}>{val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* ── Emotion Journey Chart ───────────────────────────────────────────── */
const EmotionChart = memo(function EmotionChart({ rows }: { rows: TimelineWeekEmotion[] }) {
  const W = 700, H = 200, PL = 40, PB = 28, PT = 16, PR = 16;
  const cW = W - PL - PR, cH = H - PT - PB;

  const weeks = useMemo(() => [...new Set(rows.map(r => r.week))].sort(), [rows]);
  const emotions = useMemo(() => {
    const tot: Record<string, number> = {};
    for (const r of rows) tot[r.emotion] = (tot[r.emotion] ?? 0) + r.count;
    return Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([e]) => e);
  }, [rows]);

  const byWE = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const r of rows) { m[r.week] = m[r.week] ?? {}; m[r.week]![r.emotion] = r.count; }
    return m;
  }, [rows]);

  const maxV = Math.max(...rows.map(r => r.count), 1);
  const xS = (i: number) => PL + (weeks.length > 1 ? (i / (weeks.length - 1)) * cW : cW / 2);
  const yS = (v: number) => PT + cH - (v / maxV) * cH;

  const paths = useMemo(() => emotions.map(emo => {
    const pts = weeks.map((w, i) => ({ x: xS(i), y: yS(byWE[w]?.[emo] ?? 0) }));
    return {
      emo,
      pts,
      d: pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    };
  }), [emotions, weeks, byWE]);

  const [hov, setHov] = useState<{ x: number; y: number; label: string } | null>(null);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}
        onMouseLeave={() => setHov(null)}>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(v => {
          const y = yS(v * maxV);
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={W - PR} y2={y}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <text x={PL - 5} y={y + 3} textAnchor="end"
                fill="rgba(232,232,255,0.2)" fontSize="7" fontFamily="monospace">
                {Math.round(v * maxV)}
              </text>
            </g>
          );
        })}

        {/* Week labels */}
        {weeks.filter((_, i) => i % Math.max(1, Math.ceil(weeks.length / 8)) === 0).map(w => {
          const i = weeks.indexOf(w);
          return (
            <text key={w} x={xS(i)} y={H - 4} textAnchor="middle"
              fill="rgba(232,232,255,0.18)" fontSize="7" fontFamily="monospace">
              {fmtShort(w)}
            </text>
          );
        })}

        {/* Emotion lines */}
        {paths.map(({ emo, d }, pi) => {
          const c = emoColor(emo);
          return (
            <g key={emo}>
              <path d={d} fill="none" stroke={c} strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: `ut-path-in ${0.8 + pi * 0.15}s ease-out both` }} />
            </g>
          );
        })}

        {/* Dots (hover targets) */}
        {paths.map(({ emo, pts }) => {
          const c = emoColor(emo);
          return pts.map((p, i) => {
            const cnt = byWE[weeks[i]]?.[emo] ?? 0;
            if (!cnt) return null;
            return (
              <circle key={`${emo}-${i}`} cx={p.x} cy={p.y} r="3" fill={c}
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHov({ x: p.x, y: p.y, label: `${emo}: ${cnt}  (${fmtShort(weeks[i])})` })}
              />
            );
          });
        })}

        {/* Hover tooltip */}
        {hov && (
          <g>
            <line x1={hov.x} y1={PT} x2={hov.x} y2={H - PB}
              stroke="rgba(232,232,255,0.08)" strokeWidth="1" strokeDasharray="3 4" />
            <rect x={Math.min(hov.x + 6, W - 140)} y={hov.y - 18} width="130" height="18" rx="4"
              fill="rgba(6,4,16,0.95)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            <text x={Math.min(hov.x + 12, W - 134)} y={hov.y - 5}
              fill="rgba(232,232,255,0.8)" fontSize="9" fontFamily="monospace">{hov.label}</text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 px-1">
        {emotions.map(emo => (
          <div key={emo} className="flex items-center gap-1.5">
            <div style={{ width: 14, height: 2, borderRadius: 1, background: emoColor(emo) }} />
            <span className="font-mono text-[9px] capitalize" style={{ color: 'rgba(232,232,255,0.45)' }}>{emo}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ── Symbol Bubbles ──────────────────────────────────────────────────── */
const SymbolBubbles = memo(function SymbolBubbles({ rows }: { rows: TimelineSymbol[] }) {
  const symbols = useMemo(() => {
    const tot: Record<string, number> = {};
    for (const r of rows) tot[r.manifestation] = (tot[r.manifestation] ?? 0) + r.count;
    return Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 18);
  }, [rows]);

  const max = symbols[0]?.[1] ?? 1;
  const COLORS = ['#CC80FF', '#00CFFF', '#FFB800', '#38D68A', '#FF4D8F', '#7B6FFF'];

  return (
    <div className="flex flex-wrap gap-2 p-2">
      {symbols.map(([sym, cnt], i) => {
        const pct = cnt / max;
        const size = 28 + pct * 44;
        const c = COLORS[i % COLORS.length]!;
        return (
          <div key={sym}
            title={`${sym}: ${cnt} dreams`}
            className="flex items-center justify-center rounded-full font-mono font-black capitalize text-center transition-all"
            style={{
              width: size, height: size, fontSize: Math.max(7, size * 0.22),
              background: `${c}12`, border: `1px solid ${c}25`, color: c,
              flexShrink: 0, cursor: 'default',
              animation: `ut-float-${i % 4} ${8 + i * 0.9}s ${i * 0.3}s ease-in-out infinite`,
              boxShadow: pct > 0.7 ? `0 0 14px ${c}25` : 'none',
              willChange: 'transform',
            }}>
            {sym.slice(0, size > 52 ? 8 : 5)}
          </div>
        );
      })}
    </div>
  );
});

/* ── Resonance Graph ─────────────────────────────────────────────────── */
const ResonanceGraph = memo(function ResonanceGraph({ rows }: { rows: TimelineResonance[] }) {
  const W = 440, H = 160, PL = 36, PB = 20, PT = 12, PR = 12;
  const pts = rows.slice(-60);
  const maxS = Math.max(...pts.map(r => r.score_pct), 1);
  const cW = W - PL - PR, cH = H - PT - PB;

  const xS = (i: number) => PL + (pts.length > 1 ? (i / (pts.length - 1)) * cW : cW / 2);
  const yS = (v: number) => PT + cH - (v / maxS) * cH;

  const linePath = pts.map((r, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(r.score_pct).toFixed(1)}`).join(' ');
  const areaPath = pts.length
    ? `${linePath} L${xS(pts.length - 1).toFixed(1)},${(PT + cH).toFixed(1)} L${PL.toFixed(1)},${(PT + cH).toFixed(1)} Z`
    : '';

  const peakIdx = pts.reduce((mi, r, i, a) => r.score_pct > (a[mi]?.score_pct ?? 0) ? i : mi, 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="res-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CC80FF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#CC80FF" stopOpacity="0.01" />
        </linearGradient>
        <filter id="res-glow"><feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      {/* Grid */}
      {[0, 0.5, 1].map(v => {
        const y = yS(v * maxS);
        return (
          <g key={v}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={PL - 4} y={y + 3} textAnchor="end"
              fill="rgba(232,232,255,0.2)" fontSize="7" fontFamily="monospace">
              {Math.round(v * maxS)}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      {areaPath && <path d={areaPath} fill="url(#res-fill)" />}

      {/* Line */}
      {linePath && (
        <path d={linePath} fill="none" stroke="#CC80FF" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round"
          filter="url(#res-glow)"
          style={{ animation: 'ut-path-in 1.4s ease-out both' }} />
      )}

      {/* Dots colored by resonance level */}
      {pts.map((r, i) => (
        <circle key={i} cx={xS(i)} cy={yS(r.score_pct)} r={i === peakIdx ? 4 : 2}
          fill={resColor(r.resonance_level)}
          filter={i === peakIdx ? 'url(#res-glow)' : undefined}
          opacity={i === peakIdx ? 1 : 0.65}
        />
      ))}

      {/* Peak label */}
      {pts[peakIdx] && (
        <g>
          <text x={xS(peakIdx)} y={yS(pts[peakIdx]!.score_pct) - 8} textAnchor="middle"
            fill="#FFD700" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
            ★ {pts[peakIdx]!.score_pct.toFixed(0)}%
          </text>
        </g>
      )}

      {/* Legend */}
      {['cosmic', 'deep', 'surface', 'dormant'].map((lvl, i) => (
        <g key={lvl}>
          <circle cx={PL + i * 64} cy={H - 4} r="3" fill={resColor(lvl)} />
          <text x={PL + i * 64 + 6} y={H - 0.5} fill="rgba(232,232,255,0.25)"
            fontSize="7" fontFamily="monospace">{lvl}</text>
        </g>
      ))}
    </svg>
  );
});

/* ── Dream Calendar ──────────────────────────────────────────────────── */
const DreamCalendar = memo(function DreamCalendar({ rows }: { rows: TimelineFrequency[] }) {
  const max = Math.max(...rows.map(r => r.count), 1);
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {rows.map((r, i) => {
          const pct = r.count / max;
          const alpha = pct === 0 ? 0.04 : 0.1 + pct * 0.7;
          return (
            <div key={i} title={`${r.count} dreams · ${fmtShort(r.week)}`}
              className="relative group"
              style={{ cursor: r.count > 0 ? 'pointer' : 'default' }}>
              <div style={{
                width: 14, height: 14, borderRadius: 3,
                background: `rgba(0,207,255,${alpha})`,
                boxShadow: pct > 0.6 ? `0 0 8px rgba(0,207,255,${pct * 0.5})` : 'none',
                border: `1px solid rgba(0,207,255,${alpha * 0.6})`,
                transition: 'all 0.2s',
              }} />
              {r.count > 0 && (
                <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 pointer-events-none">
                  <div className="font-mono text-[8px] whitespace-nowrap px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(6,4,16,0.97)', border: '1px solid rgba(0,207,255,0.25)', color: '#00CFFF' }}>
                    {r.count} dreams · {fmtShort(r.week)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.25)' }}>Less</span>
        {[0.04, 0.2, 0.45, 0.65, 0.85].map(a => (
          <div key={a} style={{
            width: 12, height: 12, borderRadius: 2,
            background: `rgba(0,207,255,${a})`, border: `1px solid rgba(0,207,255,${a*0.7})`,
          }} />
        ))}
        <span className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.25)' }}>More</span>
      </div>
    </div>
  );
});

/* ── AI Analysis ─────────────────────────────────────────────────────── */
function AIAnalysis({ emotions, symbols, resonance, freq }: {
  emotions: TimelineWeekEmotion[];
  symbols: TimelineSymbol[];
  resonance: TimelineResonance[];
  freq: TimelineFrequency[];
}) {
  const observations = useMemo(() => {
    const obs: string[] = [];
    // Derive from real data
    const emoTotals: Record<string, number> = {};
    for (const r of emotions) emoTotals[r.emotion] = (emoTotals[r.emotion] ?? 0) + r.count;
    const topEmo = Object.entries(emoTotals).sort((a,b)=>b[1]-a[1])[0];
    const symTotals: Record<string, number> = {};
    for (const r of symbols) symTotals[r.manifestation] = (symTotals[r.manifestation] ?? 0) + r.count;
    const topSym = Object.entries(symTotals).sort((a,b)=>b[1]-a[1])[0];
    const avgRes = resonance.length ? resonance.reduce((s,r)=>s+r.score_pct,0)/resonance.length : 0;
    const peakRes = resonance.length ? Math.max(...resonance.map(r=>r.score_pct)) : 0;

    if (topEmo) obs.push(`"${topEmo[0].charAt(0).toUpperCase()+topEmo[0].slice(1)}" is the most recurring emotional state across this dreamer's journey.`);
    if (topSym) obs.push(`The symbol "${topSym[0]}" appears ${topSym[1]} times — a consistent presence in the subconscious narrative.`);
    if (avgRes > 70) obs.push('Exceptionally high collective resonance — this dreamer aligns strongly with the shared dream field.');
    else if (avgRes > 45) obs.push('Moderate collective resonance indicates a developing connection to the shared consciousness network.');
    if (peakRes > 90) obs.push(`Peak resonance of ${peakRes.toFixed(0)}% detected — a moment of profound collective alignment.`);
    if (freq.length >= 6) {
      const recent = freq.slice(-4).reduce((s,f)=>s+f.count,0)/4;
      const early = freq.slice(0,4).reduce((s,f)=>s+f.count,0)/4;
      if (recent > early * 1.4) obs.push('Dream frequency has been accelerating in recent weeks — increasing subconscious activity.');
      else if (recent < early * 0.6) obs.push('Dream activity has decreased recently — a period of consolidation or integration.');
    }
    obs.push('The subconscious narrative shows increasing symbolic complexity over the observed period.');
    obs.push('Multiple archetype transitions detected — psychological evolution is active.');
    obs.push('Symbol patterns suggest ongoing integration of shadow and conscious elements.');
    return obs.slice(0, 6);
  }, [emotions, symbols, resonance, freq]);

  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i+1) % observations.length); setFade(true); }, 320);
    }, 6000);
    return () => clearInterval(t);
  }, [observations.length]);

  return (
    <div className="flex flex-col gap-3">
      {/* Rotating observation */}
      <div className="p-4 rounded-xl" style={{
        background: 'rgba(204,128,255,0.05)', border: '1px solid rgba(204,128,255,0.14)',
        minHeight: 80,
        opacity: fade ? 1 : 0, transition: 'opacity 0.32s',
      }}>
        <div className="flex items-start gap-2">
          <span style={{ color: '#CC80FF', fontSize: 10, marginTop: 1 }}>◈</span>
          <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.78)' }}>
            {observations[idx]}
          </p>
        </div>
        <div className="flex gap-1 mt-3">
          {observations.map((_, i) => (
            <div key={i} style={{
              width: i===idx ? 16 : 4, height: 2, borderRadius: 1,
              background: i===idx ? '#CC80FF' : 'rgba(204,128,255,0.2)',
              transition: 'all 0.32s',
            }} />
          ))}
        </div>
      </div>

      {/* All observations list */}
      <div className="space-y-2">
        {observations.map((obs, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl transition-all"
            style={{
              background: i === idx ? 'rgba(204,128,255,0.06)' : 'transparent',
              border: `1px solid ${i===idx ? 'rgba(204,128,255,0.15)' : 'transparent'}`,
            }}>
            <span style={{ color: '#CC80FF', fontSize: 8, marginTop: 2, opacity: i===idx ? 1 : 0.3 }}>●</span>
            <p className="font-mono text-[10px] leading-relaxed" style={{
              color: i===idx ? 'rgba(232,232,255,0.7)' : 'rgba(232,232,255,0.28)',
            }}>{obs}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Milestone cards ─────────────────────────────────────────────────── */
function MilestoneCards({ resonance, freq, symbols }: {
  resonance: TimelineResonance[]; freq: TimelineFrequency[]; symbols: TimelineSymbol[];
}) {
  const milestones = useMemo(() => {
    const ms: Array<{ icon: string; title: string; value: string; color: string }> = [];
    if (freq.length) {
      ms.push({ icon: '🌙', title: 'First Dream Week', value: fmtShort(freq[0]!.week), color: '#00CFFF' });
      const peak = freq.reduce((p, c) => c.count > p.count ? c : p);
      ms.push({ icon: '⚡', title: 'Most Active Week', value: `${peak.count} dreams · ${fmtShort(peak.week)}`, color: '#FFB800' });
    }
    if (resonance.length) {
      const peak = resonance.reduce((p, c) => c.score_pct > p.score_pct ? c : p);
      ms.push({ icon: '★', title: 'Peak Resonance', value: `${peak.score_pct.toFixed(0)}% · ${peak.resonance_level}`, color: '#FFD700' });
    }
    const symTotals: Record<string, number> = {};
    for (const r of symbols) symTotals[r.manifestation] = (symTotals[r.manifestation] ?? 0) + r.count;
    const topSym = Object.entries(symTotals).sort((a,b)=>b[1]-a[1])[0];
    if (topSym) {
      ms.push({ icon: '◈', title: 'Dominant Symbol', value: `${topSym[0]} · ${topSym[1]}×`, color: '#CC80FF' });
    }
    return ms;
  }, [resonance, freq, symbols]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {milestones.map(({ icon, title, value, color }) => (
        <div key={title} className="p-4 rounded-xl" style={{
          background: `${color}06`, border: `1px solid ${color}18`,
        }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: 14 }}>{icon}</span>
            <p className="font-mono text-[8px] font-bold tracking-widest" style={{ color, opacity: 0.7 }}>{title}</p>
          </div>
          <p className="font-mono text-[12px] font-black" style={{ color }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────────────────────── */
const EmptyState = memo(function EmptyState() {
  const syms = useMemo(() => FLOAT_SYMS.map((s, i) => ({
    sym: s, x: 5 + (i / FLOAT_SYMS.length) * 90, y: 20 + Math.sin(i * 1.1) * 40,
    dur: 8 + i * 0.7, delay: i * 0.5,
  })), []);
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-8 relative overflow-hidden">
      {/* Floating symbols */}
      {syms.map(({ sym, x, y, dur, delay }) => (
        <div key={sym} style={{
          position: 'absolute', left: `${x}%`, top: `${y}%`,
          fontSize: 20, opacity: 0.07,
          animation: `ut-float-0 ${dur}s ${delay}s ease-in-out infinite`,
          willChange: 'transform',
        }}>{sym}</div>
      ))}

      {/* Neural rings */}
      <div className="relative" style={{ width: 140, height: 140 }}>
        {[0, 1, 2].map(k => (
          <div key={k} style={{
            position: 'absolute', inset: k * 20, borderRadius: '50%',
            border: '1px solid rgba(204,128,255,0.12)',
            animation: `ut-spin-${k%2} ${18+k*8}s linear infinite`,
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, animation: 'ut-float-0 4s ease-in-out infinite',
        }}>💭</div>
      </div>

      <div className="text-center" style={{ maxWidth: 360 }}>
        <p className="font-mono text-[11px] font-bold tracking-widest mb-3" style={{ color: '#CC80FF' }}>
          SUBCONSCIOUS ARCHIVE
        </p>
        <p className="text-[14px] font-bold mb-2" style={{ color: 'rgba(232,232,255,0.7)' }}>
          Search for a dreamer
        </p>
        <p className="font-mono text-[11px]" style={{ color: 'rgba(232,232,255,0.3)' }}>
          Explore the evolution of their subconscious — emotions, symbols, resonance and dream patterns over time.
        </p>
      </div>
    </div>
  );
});

/* ── Main ──────────────────────────────────────────────────────────────── */
export default function UserTimeline() {
  const [userId, setUserId] = useState<string | null>(null);

  const { data: timeline, isLoading: tlLoading } = useQuery({
    queryKey: ['ut-timeline', userId],
    queryFn: () => fetchUserTimeline(userId!),
    enabled: !!userId,
  });

  const hasData = !!timeline;

  return (
    <div className="section-system relative">
      <style>{`
        @keyframes ut-fade-up    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ut-slide-down { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ut-path-in    { from{opacity:0} to{opacity:1} }
        @keyframes ut-dot-pulse  { 0%{box-shadow:0 0 0 0 currentColor} 70%{box-shadow:0 0 0 10px transparent} 100%{box-shadow:none} }
        @keyframes ut-scan       { 0%{top:-2px;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
        @keyframes ut-float-0    { 0%,100%{transform:translateY(0px)}    50%{transform:translateY(-8px)} }
        @keyframes ut-float-1    { 0%,100%{transform:translateY(-4px)}   50%{transform:translateY(6px)} }
        @keyframes ut-float-2    { 0%,100%{transform:translateY(3px)}    50%{transform:translateY(-10px)} }
        @keyframes ut-float-3    { 0%,100%{transform:translateY(-6px)}   50%{transform:translateY(4px)} }
        @keyframes ut-spin-0     { to{transform:rotate(360deg)} }
        @keyframes ut-spin-1     { to{transform:rotate(-360deg)} }
        @keyframes ut-heartbeat  { 0%,100%{opacity:0.9;transform:scale(1)} 50%{opacity:0.2;transform:scale(1.5)} }
      `}</style>

      <Header
        title="User Dream Timeline"
        subtitle="A dreamer's subconscious archive — emotions, symbols, resonance and psychological evolution"
        section="system"
        actions={
          userId ? (
            <button onClick={() => setUserId(null)}
              className="font-mono text-[9px] px-3 py-1.5 rounded-full transition-all"
              style={{ color: 'rgba(232,232,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              ← New Search
            </button>
          ) : undefined
        }
      />

      {/* ── SEARCH ──────────────────────────────────────────────────── */}
      {!userId && (
        <div className="mb-6" style={{ animation: 'ut-fade-up 0.4s ease-out both' }}>
          <SearchBar onSelect={setUserId} />
        </div>
      )}

      {/* ── EMPTY STATE ─────────────────────────────────────────────── */}
      {!userId && <EmptyState />}

      {/* ── LOADING ─────────────────────────────────────────────────── */}
      {userId && tlLoading && (
        <div className="flex items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(204,128,255,0.15)', borderTopColor: '#CC80FF' }} />
          <p className="font-mono text-[11px] tracking-widest" style={{ color: '#CC80FF' }}>
            LOADING DREAM ARCHIVE…
          </p>
        </div>
      )}

      {/* ── CONTENT ─────────────────────────────────────────────────── */}
      {userId && hasData && !tlLoading && (
        <>
          {/* Profile Header */}
          <UserProfileHeader userId={userId} />

          {/* Compact search bar to switch user */}
          <div className="mb-5">
            <SearchBar onSelect={setUserId} />
          </div>

          {/* ── ROW 1: Timeline + Analysis ────────────────────────── */}
          <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '1fr 340px' }}>

            {/* Dream Timeline */}
            <div className="os-card overflow-hidden">
              <div className="os-panel-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
                    <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
                  </div>
                  <p className="os-title" style={{ color: '#CC80FF' }}>DREAM TIMELINE</p>
                </div>
                <span className="font-mono text-[9px] text-dc-muted">NEWEST FIRST</span>
              </div>
              <div style={{ maxHeight: 560, overflowY: 'auto', padding: '16px 16px 16px 80px',
                scrollbarWidth: 'thin', scrollbarColor: 'rgba(204,128,255,0.2) transparent' }}>
                <DreamTimeline userId={userId} />
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-5">

              {/* Resonance Graph */}
              <div className="os-card overflow-hidden">
                <div className="os-panel-header">
                  <p className="os-title" style={{ color: '#CC80FF' }}>RESONANCE HISTORY</p>
                </div>
                <div className="p-4">
                  {timeline.resonanceHistory.length > 0
                    ? <ResonanceGraph rows={timeline.resonanceHistory} />
                    : <p className="font-mono text-[10px] text-center py-6" style={{ color: 'rgba(232,232,255,0.2)' }}>No resonance data</p>
                  }
                </div>
              </div>

              {/* Milestones */}
              <div className="os-card overflow-hidden">
                <div className="os-panel-header">
                  <p className="os-title" style={{ color: '#FFD700' }}>DREAM MILESTONES</p>
                </div>
                <div className="p-4">
                  <MilestoneCards
                    resonance={timeline.resonanceHistory}
                    freq={timeline.dreamFrequency}
                    symbols={timeline.symbolEvolution}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 2: Emotion Journey ────────────────────────────── */}
          {timeline.emotionHistory.length > 0 && (
            <div className="os-card overflow-hidden mb-5">
              <div className="os-panel-header flex items-center justify-between">
                <p className="os-title" style={{ color: '#38D68A' }}>EMOTION JOURNEY</p>
                <span className="font-mono text-[9px] text-dc-muted">WEEKLY · TOP 5 EMOTIONS</span>
              </div>
              <div className="p-5">
                <EmotionChart rows={timeline.emotionHistory} />
              </div>
            </div>
          )}

          {/* ── ROW 3: Symbols + AI Analysis ─────────────────────── */}
          <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '1fr 320px' }}>

            {/* Symbol Bubbles */}
            <div className="os-card overflow-hidden">
              <div className="os-panel-header flex items-center justify-between">
                <p className="os-title" style={{ color: '#CC80FF' }}>SYMBOL UNIVERSE</p>
                <span className="font-mono text-[9px] text-dc-muted">SIZE = FREQUENCY</span>
              </div>
              <div className="p-5" style={{ minHeight: 160 }}>
                {timeline.symbolEvolution.length > 0
                  ? <SymbolBubbles rows={timeline.symbolEvolution} />
                  : <p className="font-mono text-[10px] text-center py-8" style={{ color: 'rgba(232,232,255,0.2)' }}>No symbol data</p>
                }
              </div>
            </div>

            {/* AI Analysis */}
            <div className="ai-reading-panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="relative">
                  <span className="w-1.5 h-1.5 rounded-full block" style={{ background: '#CC80FF' }} />
                  <span className="absolute inset-0 rounded-full animate-status-ping" style={{ background: '#CC80FF' }} />
                </div>
                <p className="os-title" style={{ color: '#CC80FF' }}>AI LIFE ANALYSIS</p>
              </div>
              <AIAnalysis
                emotions={timeline.emotionHistory}
                symbols={timeline.symbolEvolution}
                resonance={timeline.resonanceHistory}
                freq={timeline.dreamFrequency}
              />
            </div>
          </div>

          {/* ── ROW 4: Dream Calendar ─────────────────────────────── */}
          {timeline.dreamFrequency.length > 0 && (
            <div className="os-card overflow-hidden mb-5">
              <div className="os-panel-header flex items-center justify-between">
                <p className="os-title" style={{ color: '#00CFFF' }}>DREAM CALENDAR</p>
                <span className="font-mono text-[9px] text-dc-muted">
                  {timeline.dreamFrequency.reduce((s, r) => s + r.count, 0)} TOTAL · {timeline.dreamFrequency.length} WEEKS
                </span>
              </div>
              <div className="p-5 overflow-x-auto">
                <DreamCalendar rows={timeline.dreamFrequency} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
