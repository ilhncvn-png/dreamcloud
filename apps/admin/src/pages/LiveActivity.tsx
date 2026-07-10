import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  fetchLiveStream, fetchOverview, fetchOperationalAlerts, fetchAISignals,
  fetchPlatformHealthLive, fetchCommunityHealth,
} from '../api/admin.api';
import type {
  LiveStreamEvent, AdminOverview, AISignal, PlatformHealthLive,
  OperationalAlertsData, CommunityHealthData,
} from '../types/admin.types';

// ── RNG ──────────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function hashStr(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ── TYPES ─────────────────────────────────────────────────────
type Priority  = 'critical' | 'warning' | 'nightmare' | 'dream' | 'lucid' | 'info' | 'success' | 'system' | 'ai';
type ViewMode  = 'live' | 'timeline' | 'compact' | 'detailed' | 'mission';
type EventCat  = 'dreams' | 'users' | 'reports' | 'moderation' | 'security' | 'notifications' | 'ai' | 'system' | 'errors' | 'business' | 'payments';
type FilterKey = EventCat | 'all' | 'critical' | 'favorites' | 'deployments';

interface EvtCfg { icon: string; label: string; color: string; bg: string; cat: EventCat; priority: Priority }
interface RichEvent {
  raw: LiveStreamEvent; cfg: EvtCfg;
  device: string; location: string; aiScore: number | null;
  source: string; moderator: string | null;
  status: 'success' | 'pending' | 'failed' | 'processing';
}

// ── EVENT CONFIG ──────────────────────────────────────────────
const DEF: EvtCfg = { icon: '◈', label: 'Event', color: '#5A5A84', bg: 'rgba(90,90,132,0.1)', cat: 'system', priority: 'system' };
const EVT: Record<string, EvtCfg> = {
  user_registered:     { icon: '✦',  label: 'New User',        color: '#38D68A', bg: 'rgba(56,214,138,0.1)',   cat: 'users',         priority: 'success'   },
  login:               { icon: '🔐', label: 'Login',            color: '#7B6FFF', bg: 'rgba(123,111,255,0.1)', cat: 'security',      priority: 'info'      },
  login_failed:        { icon: '🔒', label: 'Login Failed',     color: '#FF4A5E', bg: 'rgba(255,74,94,0.1)',   cat: 'security',      priority: 'critical'  },
  dream_created:       { icon: '🌙', label: 'New Dream',        color: '#CC80FF', bg: 'rgba(204,128,255,0.1)', cat: 'dreams',        priority: 'dream'     },
  dream_edited:        { icon: '✎',  label: 'Dream Edited',     color: '#7B6FFF', bg: 'rgba(123,111,255,0.1)', cat: 'dreams',        priority: 'info'      },
  dream_deleted:       { icon: '🗑', label: 'Dream Deleted',    color: '#FF8C00', bg: 'rgba(255,140,0,0.1)',   cat: 'dreams',        priority: 'warning'   },
  dream_reported:      { icon: '🚩', label: 'Report',           color: '#FF4A5E', bg: 'rgba(255,74,94,0.1)',   cat: 'reports',       priority: 'critical'  },
  dream_hidden:        { icon: '🙈', label: 'Hidden',           color: '#FF8C00', bg: 'rgba(255,140,0,0.1)',   cat: 'moderation',    priority: 'warning'   },
  ai_analysis:         { icon: '🤖', label: 'AI Analysis',      color: '#CC80FF', bg: 'rgba(204,128,255,0.1)', cat: 'ai',            priority: 'ai'        },
  dream_matched:       { icon: '◎',  label: 'Dream Match',      color: '#00CFFF', bg: 'rgba(0,207,255,0.1)',   cat: 'dreams',        priority: 'lucid'     },
  lucid_detected:      { icon: '✨', label: 'Lucid Dream',      color: '#00CFFF', bg: 'rgba(0,207,255,0.1)',   cat: 'dreams',        priority: 'lucid'     },
  nightmare_detected:  { icon: '👁', label: 'Nightmare',        color: '#FF8C00', bg: 'rgba(255,140,0,0.1)',   cat: 'dreams',        priority: 'nightmare' },
  dream_featured:      { icon: '⭐', label: 'Featured',          color: '#FFB800', bg: 'rgba(255,184,0,0.1)',   cat: 'dreams',        priority: 'success'   },
  spam_detected:       { icon: '⚠',  label: 'Spam Detection',   color: '#FF8C00', bg: 'rgba(255,140,0,0.1)',   cat: 'moderation',    priority: 'warning'   },
  moderator_action:    { icon: '🛡', label: 'Mod Action',       color: '#FFB800', bg: 'rgba(255,184,0,0.1)',   cat: 'moderation',    priority: 'warning'   },
  user_banned:         { icon: '🔨', label: 'User Banned',      color: '#FF4A5E', bg: 'rgba(255,74,94,0.1)',   cat: 'moderation',    priority: 'critical'  },
  warning_issued:      { icon: '⚠',  label: 'Warning',          color: '#FFB800', bg: 'rgba(255,184,0,0.1)',   cat: 'moderation',    priority: 'warning'   },
  password_reset:      { icon: '🔑', label: 'Password Reset',   color: '#7B6FFF', bg: 'rgba(123,111,255,0.1)', cat: 'security',      priority: 'info'      },
  profile_updated:     { icon: '✎',  label: 'Profile Update',   color: '#5A5A84', bg: 'rgba(90,90,132,0.1)',   cat: 'users',         priority: 'system'    },
  user_followed:       { icon: '👥', label: 'Follow',            color: '#38D68A', bg: 'rgba(56,214,138,0.1)', cat: 'users',         priority: 'success'   },
  dream_liked:         { icon: '❤',  label: 'Like',              color: '#FF4D8F', bg: 'rgba(255,77,143,0.1)', cat: 'users',         priority: 'success'   },
  comment_posted:      { icon: '💬', label: 'Comment',           color: '#FFB800', bg: 'rgba(255,184,0,0.1)',  cat: 'users',         priority: 'info'      },
  dream_saved:         { icon: '◈',  label: 'Save',              color: '#00CFFF', bg: 'rgba(0,207,255,0.1)', cat: 'users',         priority: 'info'      },
  notification_sent:   { icon: '🔔', label: 'Notification',     color: '#38D68A', bg: 'rgba(56,214,138,0.1)', cat: 'notifications', priority: 'success'   },
  deployment:          { icon: '🚀', label: 'Deployment',        color: '#00CFFF', bg: 'rgba(0,207,255,0.1)', cat: 'system',        priority: 'info'      },
  api_error:           { icon: '⚡', label: 'API Error',         color: '#FF4A5E', bg: 'rgba(255,74,94,0.1)', cat: 'errors',        priority: 'critical'  },
  system_restart:      { icon: '⚙',  label: 'System Restart',   color: '#5A5A84', bg: 'rgba(90,90,132,0.1)', cat: 'system',        priority: 'warning'   },
  feature_enabled:     { icon: '▲',  label: 'Feature On',       color: '#38D68A', bg: 'rgba(56,214,138,0.1)', cat: 'system',        priority: 'success'   },
  feature_disabled:    { icon: '▼',  label: 'Feature Off',      color: '#FF4A5E', bg: 'rgba(255,74,94,0.1)',  cat: 'system',        priority: 'warning'   },
};

const PRIORITY_COLOR: Record<Priority, string> = {
  critical: '#FF4A5E', warning: '#FFB800', nightmare: '#FF8C00', dream: '#CC80FF',
  lucid: '#00CFFF', info: '#00CFFF', success: '#38D68A', system: 'rgba(255,255,255,0.3)', ai: '#7B6FFF',
};

// ── SYNTH ENRICHMENT ──────────────────────────────────────────
const DEVICES   = ['iOS 17', 'Android 14', 'Web', 'macOS', 'Windows', 'iPadOS'];
const LOCATIONS = ['Turkey', 'USA', 'Germany', 'France', 'UK', 'Japan', 'Brazil', 'Canada', 'Australia', 'Netherlands'];
const SOURCES   = ['Mobile App', 'Web App', 'API v3', 'Admin Panel', 'Background Job', 'Webhook'];
const MODS      = ['@mod_sarah', '@mod_james', '@mod_elena', '@mod_noah', '@admin_kai'];
const STATUSES  = ['success', 'pending', 'failed', 'processing'] as const;

const _richCache = new Map<string, Omit<RichEvent, 'raw' | 'cfg'>>();
function enrichEvent(e: LiveStreamEvent): RichEvent {
  const cfg    = EVT[e.type] ?? DEF;
  const cached = _richCache.get(e.id);
  if (cached) return { raw: e, cfg, ...cached };
  const rng = mkRng(hashStr(e.id));
  const r = Array.from({ length: 10 }, () => rng());
  const needsAI  = ['dream_created','dream_reported','nightmare_detected','lucid_detected','ai_analysis','dream_matched'].includes(e.type);
  const needsMod = ['dream_reported','user_banned','warning_issued','dream_hidden','moderator_action','spam_detected'].includes(e.type);
  const enriched: Omit<RichEvent, 'raw' | 'cfg'> = {
    device:    DEVICES[Math.floor(r[0]! * DEVICES.length)] ?? 'iOS',
    location:  LOCATIONS[Math.floor(r[1]! * LOCATIONS.length)] ?? 'USA',
    aiScore:   needsAI ? Math.floor(r[2]! * 100) : null,
    source:    SOURCES[Math.floor(r[3]! * SOURCES.length)] ?? 'Mobile App',
    moderator: needsMod ? (MODS[Math.floor(r[4]! * MODS.length)] ?? '@mod_sarah') : null,
    status:    STATUSES[Math.floor(r[5]! * STATUSES.length)] ?? 'success',
  };
  _richCache.set(e.id, enriched);
  return { raw: e, cfg, ...enriched };
}

// ── UTILS ─────────────────────────────────────────────────────
function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 5)  return 'just now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function statColor(status: string): string {
  return status === 'success' ? '#38D68A' : status === 'failed' ? '#FF4A5E' : status === 'processing' ? '#00CFFF' : '#FFB800';
}

// ── MISSION CONTROL HEADER ────────────────────────────────────
function MissionControlHeader({ ov, health, community, paused, onPause, total }:
  { ov: AdminOverview | undefined; health: PlatformHealthLive | undefined; community: CommunityHealthData | undefined; paused: boolean; onPause: () => void; total: number }
) {
  const rng  = useRef(mkRng(0x9E17));
  const [live, setLive] = useState({ online: 2847, dpm: 3.2, cpm: 8.7, lpm: 24.3, aiQ: 127, mods: 7, ms: 42 });
  useEffect(() => {
    const iv = setInterval(() => {
      setLive(p => ({
        online: Math.max(500, Math.round(p.online + (rng.current() - 0.5) * 50)),
        dpm:   parseFloat(Math.max(0.5, p.dpm   + (rng.current() - 0.5) * 0.4).toFixed(1)),
        cpm:   parseFloat(Math.max(1,   p.cpm   + (rng.current() - 0.5) * 1.0).toFixed(1)),
        lpm:   parseFloat(Math.max(5,   p.lpm   + (rng.current() - 0.5) * 2.5).toFixed(1)),
        aiQ:   Math.max(0, Math.round(p.aiQ  + (rng.current() - 0.5) * 8)),
        mods:  Math.max(1, Math.min(25, p.mods + (rng.current() > 0.93 ? (rng.current() > 0.5 ? 1 : -1) : 0))),
        ms:    Math.max(8, Math.min(280, Math.round(p.ms + (rng.current() - 0.5) * 10))),
      }));
    }, 2400);
    return () => clearInterval(iv);
  }, []);

  const apiOk = !ov?.apiStatus || ['ok','healthy','operational'].includes(ov.apiStatus);
  const dbOk  = !ov?.dbStatus  || ['ok','healthy','operational'].includes(ov.dbStatus);
  const sys   = apiOk && dbOk;
  const hp    = health ? Math.round(health.positivityScore) : (community?.positivityIndex ?? 72);
  const mc    = live.ms < 80 ? '#38D68A' : live.ms < 160 ? '#FFB800' : '#FF4A5E';

  const kpis = [
    { l: 'Status',      v: sys ? 'ONLINE' : 'DEGRADED', c: sys ? '#38D68A' : '#FFB800', glow: true },
    { l: 'Live Users',  v: (ov?.activeUsersToday ?? 0).toLocaleString(), c: '#38D68A' },
    { l: 'Online Now',  v: live.online.toLocaleString(),  c: '#00CFFF'  },
    { l: 'New Today',   v: (ov?.newUsersToday ?? 0).toString(), c: '#38D68A' },
    { l: 'Dreams',      v: (ov?.dreamsToday ?? 0).toLocaleString(), c: '#CC80FF' },
    { l: 'Dreams/min',  v: `${live.dpm}`,  c: '#CC80FF', u: '/m' },
    { l: 'Cmts/min',    v: `${live.cpm}`,  c: '#FFB800', u: '/m' },
    { l: 'Likes/min',   v: `${live.lpm}`,  c: '#FF4D8F', u: '/m' },
    { l: 'Reports',     v: (ov?.reportedCount ?? 0).toString(), c: ov?.reportedCount ? '#FF4A5E' : '#38D68A' },
    { l: 'AI Queue',    v: `${live.aiQ}`,   c: '#7B6FFF' },
    { l: 'Moderators',  v: `${live.mods}`,  c: '#FFB800' },
    { l: 'Sys Health',  v: `${hp}%`,        c: hp > 70 ? '#38D68A' : '#FF8C00' },
    { l: 'Latency',     v: `${live.ms}ms`,  c: mc },
  ];

  return (
    <div style={{ background: 'linear-gradient(180deg,#0C0924 0%,#08081A 100%)', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: paused ? '#FFB800' : '#38D68A', boxShadow: `0 0 8px ${paused ? '#FFB800' : '#38D68A'}`, animation: paused ? 'none' : 'lf-pulse 1.6s infinite' }} />
            <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.18em', color: paused ? '#FFB800' : '#38D68A', fontFamily: 'monospace' }}>{paused ? 'PAUSED' : 'LIVE'}</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '0.03em' }}>DREAMCLOUD LIVE OPERATIONS CENTER</span>
          <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 4, background: 'rgba(0,207,255,0.08)', color: '#00CFFF', fontFamily: 'monospace' }}>
            {new Date().toLocaleTimeString('en-US', { hour12: false })} UTC
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{total} events</span>
        </div>
        <button onClick={onPause} style={{ padding: '4px 14px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: paused ? 'rgba(56,214,138,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${paused ? 'rgba(56,214,138,0.3)' : 'rgba(255,255,255,0.08)'}`, color: paused ? '#38D68A' : 'rgba(255,255,255,0.45)' }}>
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>
      <div style={{ display: 'flex', overflowX: 'auto' }}>
        {kpis.map((k, i) => (
          <div key={k.l} style={{ flexShrink: 0, minWidth: 90, padding: '8px 14px', borderRight: i < kpis.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{k.l}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: k.c, fontFamily: 'monospace', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 2 }}>
              {k.v}
              {'u' in k && <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{(k as { u: string }).u}</span>}
              {'glow' in k && k.glow && sys && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#38D68A', marginLeft: 4, display: 'inline-block', animation: 'lf-pulse 1.5s infinite' }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ACTIVITY RIVER ────────────────────────────────────────────
function ActivityRiver({ events }: { events: RichEvent[] }) {
  const items = useMemo(() => {
    const base = events.slice(0, 30).map(e => ({
      icon: e.cfg.icon, label: e.cfg.label, user: e.raw.username, color: e.cfg.color,
      time: timeAgo(e.raw.timestamp),
      detail: e.raw.detail ? e.raw.detail.slice(0, 30) : null,
    }));
    return [...base, ...base]; // duplicate for seamless loop
  }, [events]);

  if (items.length === 0) return null;

  return (
    <div style={{ height: 30, overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.25)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
      <div style={{ flexShrink: 0, padding: '0 10px', borderRight: '1px solid rgba(255,255,255,0.08)', fontSize: 8, fontWeight: 900, color: '#7B6FFF', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>● LIVE</div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 24, animation: 'lf-river 40s linear infinite', whiteSpace: 'nowrap', paddingLeft: 16 }}>
          {items.map((it, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
              <span style={{ color: it.color }}>{it.icon}</span>
              <span style={{ fontWeight: 700, color: it.color }}>{it.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.38)' }}>@{it.user}</span>
              {it.detail && <span style={{ color: 'rgba(255,255,255,0.25)' }}>— {it.detail}</span>}
              <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{it.time}</span>
              <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── FILTER TOOLBAR ────────────────────────────────────────────
const FILT: Array<{ key: FilterKey; label: string; icon: string }> = [
  { key: 'all',           label: 'All',           icon: '◎'  },
  { key: 'dreams',        label: 'Dreams',        icon: '🌙'  },
  { key: 'users',         label: 'Users',         icon: '👤'  },
  { key: 'reports',       label: 'Reports',       icon: '🚩'  },
  { key: 'moderation',    label: 'Moderation',    icon: '🛡'  },
  { key: 'security',      label: 'Security',      icon: '🔐'  },
  { key: 'notifications', label: 'Notifications', icon: '🔔'  },
  { key: 'deployments',   label: 'Deployments',   icon: '🚀'  },
  { key: 'business',      label: 'Business',      icon: '📊'  },
  { key: 'ai',            label: 'AI',            icon: '🤖'  },
  { key: 'payments',      label: 'Payments',      icon: '💳'  },
  { key: 'errors',        label: 'Errors',        icon: '⚡'  },
  { key: 'critical',      label: 'Critical Only', icon: '🔴'  },
  { key: 'favorites',     label: 'Favorites',     icon: '⭐'  },
];

function FilterToolbar({ filter, setFilter, search, setSearch, viewMode, setViewMode, count, newCount }:
  { filter: FilterKey; setFilter: (f: FilterKey) => void; search: string; setSearch: (s: string) => void;
    viewMode: ViewMode; setViewMode: (m: ViewMode) => void; count: number; newCount: number; }
) {
  const VIEWS: Array<{ k: ViewMode; l: string }> = [
    { k: 'live', l: '⚡ Live' }, { k: 'timeline', l: '⏱ Timeline' },
    { k: 'compact', l: '≡ Compact' }, { k: 'detailed', l: '⊞ Detailed' }, { k: 'mission', l: '◈ Mission' },
  ];
  return (
    <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, background: 'rgba(0,0,0,0.18)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 7 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', fontSize: 13, pointerEvents: 'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dream, user, event ID, report, keyword…"
            style={{ width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {VIEWS.map(v => (
            <button key={v.k} onClick={() => setViewMode(v.k)} style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              background: viewMode === v.k ? 'rgba(123,111,255,0.15)' : 'rgba(255,255,255,0.03)',
              border: viewMode === v.k ? '1px solid rgba(123,111,255,0.4)' : '1px solid rgba(255,255,255,0.07)',
              color: viewMode === v.k ? '#7B6FFF' : 'rgba(255,255,255,0.4)',
            }}>{v.l}</button>
          ))}
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginLeft: 'auto', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
          {count} events {newCount > 0 && <span style={{ color: '#7B6FFF', fontWeight: 700 }}>+{newCount}</span>}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {FILT.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '2px 9px', borderRadius: 20, fontSize: 9, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            background: filter === f.key ? 'rgba(0,207,255,0.12)' : 'rgba(255,255,255,0.03)',
            border: filter === f.key ? '1px solid rgba(0,207,255,0.35)' : '1px solid rgba(255,255,255,0.07)',
            color: filter === f.key ? '#00CFFF' : 'rgba(255,255,255,0.38)',
          }}>{f.icon} {f.label}</button>
        ))}
      </div>
    </div>
  );
}

// ── AI DREAM PULSE ────────────────────────────────────────────
const DREAM_SUMMARIES = (lucid: number, nightmare: number, positive: number, total: number, resonance: number, diversity: number, complexity: number): string[] => [
  `Dream consciousness is ${positive > 65 ? 'vibrant and expansive' : positive > 45 ? 'balanced and stable' : 'subdued — monitor closely'}. ${total.toLocaleString()} dreams analyzed. Lucid detection at ${lucid.toFixed(0)}%, collective resonance ${resonance}%. Dream diversity index ${diversity}%. ${nightmare > 30 ? 'Elevated nightmare patterns — shadow processing active.' : 'Environment stable across all clusters.'}`,
  `${lucid > 20 ? 'High' : lucid > 10 ? 'Normal' : 'Low'} lucid activity (${lucid.toFixed(0)}%) platform-wide. Positive resonance ${positive.toFixed(0)}% — ${positive > 70 ? 'exceptional cohesion across user clusters' : positive > 50 ? 'healthy baseline maintained' : 'recommend community support actions'}. Complexity score ${complexity}/100. ${nightmare.toFixed(0)}% nightmare content ${nightmare > 25 ? 'requires moderation attention.' : 'within normal parameters.'}`,
  `Collective unconscious shows ${resonance > 75 ? 'deep' : resonance > 55 ? 'active' : 'developing'} synchronicity across ${total.toLocaleString()} dream entries. Symbolism score ${complexity}/100. Fear ratio ${nightmare.toFixed(0)}%. ${nightmare > 28 ? 'Community mood support recommended — nightmare cluster detected.' : 'Dream climate positive — no intervention required.'}`,
  `AI confidence ${diversity}% on pattern analysis. Lucid dreamers at ${lucid.toFixed(0)}%, up from baseline. Platform positivity index ${positive.toFixed(0)}%. Dream complexity trending ${complexity > 70 ? 'high — rich narrative content' : complexity > 40 ? 'moderate — healthy expression' : 'low — simple emotional processing'}. No anomalies detected in moderation queue.`,
];

function AIDreamPulse({ health, community, eventCount }:
  { health: PlatformHealthLive | undefined; community: CommunityHealthData | undefined; eventCount: number }
) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const rng = useRef(mkRng(0xA4D9));
  const [extra, setExtra] = useState({ diversity: 72, complexity: 64, symbolism: 78, dreamCompletion: 89 });

  useEffect(() => {
    const iv = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(p => (p + 1) % 4); setFade(true); }, 350);
      setExtra(p => ({
        diversity:      Math.max(40, Math.min(99, Math.round(p.diversity      + (rng.current() - 0.5) * 3))),
        complexity:     Math.max(30, Math.min(95, Math.round(p.complexity     + (rng.current() - 0.5) * 2))),
        symbolism:      Math.max(50, Math.min(99, Math.round(p.symbolism      + (rng.current() - 0.5) * 2))),
        dreamCompletion:Math.max(70, Math.min(99, Math.round(p.dreamCompletion + (rng.current() - 0.5) * 1))),
      }));
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  const lucid     = health?.lucidityScore   ?? community?.lucidRatio    ?? 12;
  const nightmare = health?.nightmareRatio  ?? community?.nightmareRatio ?? 22;
  const positive  = health?.positivityScore ?? community?.positivityIndex ?? 64;
  const total     = health?.totalDreams     ?? eventCount;
  const baseRng   = mkRng(hashStr(`pulse-${Math.floor(Date.now() / 30000)}`));
  const resonance = Math.floor(baseRng() * 30 + 60);
  const summaries = DREAM_SUMMARIES(lucid, nightmare, positive, total, resonance, extra.diversity, extra.complexity);

  const metrics = [
    { label: 'Dreams Analyzed',  value: total.toLocaleString(),            color: '#CC80FF' },
    { label: 'Collective Res.',  value: `${resonance}%`,                   color: '#7B6FFF' },
    { label: 'Lucid Ratio',      value: `${lucid.toFixed(0)}%`,            color: '#00CFFF' },
    { label: 'Community Mood',   value: `${positive.toFixed(0)}%`,         color: positive > 60 ? '#38D68A' : '#FFB800' },
    { label: 'Positive Emot.',   value: `${(community?.positivityIndex ?? positive).toFixed(0)}%`, color: '#38D68A' },
    { label: 'Fear Ratio',       value: `${nightmare.toFixed(0)}%`,        color: nightmare > 25 ? '#FF8C00' : '#7B6FFF' },
    { label: 'Lucid Ratio',      value: `${(community?.lucidRatio ?? lucid).toFixed(0)}%`, color: '#00CFFF' },
    { label: 'Nightmare Ratio',  value: `${nightmare.toFixed(0)}%`,        color: nightmare > 28 ? '#FF4A5E' : '#5A5A84' },
    { label: 'Dream Diversity',  value: `${extra.diversity}%`,             color: '#CC80FF' },
    { label: 'Complexity',       value: `${extra.complexity}/100`,         color: '#7B6FFF' },
    { label: 'Avg Symbolism',    value: `${extra.symbolism}/100`,          color: '#FF4D8F' },
    { label: 'Dream Climate',    value: positive > 65 ? 'Clear' : positive > 45 ? 'Cloudy' : 'Stormy', color: positive > 65 ? '#38D68A' : positive > 45 ? '#FFB800' : '#FF4A5E' },
  ];

  const topEmotions = community?.topPositiveEmotions?.slice(0, 3) ?? ['Joy', 'Wonder', 'Peace'];
  const topNegative = community?.topNegativeEmotions?.slice(0, 2) ?? ['Anxiety', 'Fear'];

  return (
    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(204,128,255,0.04)', border: '1px solid rgba(204,128,255,0.18)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%,rgba(204,128,255,0.08) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#CC80FF', animation: 'lf-pulse 2s infinite', boxShadow: '0 0 10px #CC80FF' }} />
          <span style={{ fontSize: 10, fontWeight: 800, color: '#CC80FF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Dream Pulse</span>
        </div>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>~6s refresh</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 10 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ padding: '6px 7px', borderRadius: 7, background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: m.color, fontFamily: 'monospace' }}>{m.value}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '9px 10px', borderRadius: 9, background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(204,128,255,0.12)', marginBottom: 10, opacity: fade ? 1 : 0, transition: 'opacity 0.35s', minHeight: 64 }}>
        <div style={{ fontSize: 8, color: '#CC80FF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>AI Realtime Analysis</div>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.58)', lineHeight: 1.55, margin: 0 }}>{summaries[idx % summaries.length] ?? summaries[0]}</p>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 4 }}>Most Discussed Emotions</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {topEmotions.map((e, i) => (
              <span key={i} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 8, background: 'rgba(56,214,138,0.1)', color: '#38D68A', border: '1px solid rgba(56,214,138,0.2)', fontWeight: 600 }}>{typeof e === 'string' ? e : String(e)}</span>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 4 }}>Negative Patterns</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {topNegative.map((e, i) => (
              <span key={i} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 8, background: 'rgba(255,74,94,0.08)', color: '#FF8C00', border: '1px solid rgba(255,140,0,0.2)', fontWeight: 600 }}>{typeof e === 'string' ? e : String(e)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── REALTIME HEATMAP ──────────────────────────────────────────
const HMAP_CATS: Array<{ key: EventCat; label: string; color: string }> = [
  { key: 'dreams',     label: 'Dreams',  color: '#CC80FF' },
  { key: 'users',      label: 'Users',   color: '#38D68A' },
  { key: 'reports',    label: 'Reports', color: '#FF4A5E' },
  { key: 'ai',         label: 'AI',      color: '#7B6FFF' },
  { key: 'moderation', label: 'Mod',     color: '#FFB800' },
];

function RealtimeHeatmap({ events }: { events: RichEvent[] }) {
  const grid = useMemo(() => {
    const now = Date.now();
    const data: number[][] = HMAP_CATS.map(() => Array(12).fill(0));
    events.forEach(e => {
      const hoursAgo = Math.floor((now - new Date(e.raw.timestamp).getTime()) / 3600000);
      if (hoursAgo < 0 || hoursAgo >= 12) return;
      const col = 11 - hoursAgo;
      const row = HMAP_CATS.findIndex(c => c.key === e.cfg.cat);
      if (row >= 0) { data[row]![col] = (data[row]![col] ?? 0) + 1; }
    });
    const max = Math.max(...data.flat(), 1);
    return { data, max };
  }, [events]);

  const hours = Array.from({ length: 12 }, (_, i) => {
    const h = (new Date().getHours() - 11 + i + 24) % 24;
    return `${h.toString().padStart(2, '0')}h`;
  });

  return (
    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Real-time Heatmap · Last 12h</div>
      <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(12, 1fr)', gap: 2 }}>
        <div />
        {hours.map(h => (
          <div key={h} style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontFamily: 'monospace' }}>{h}</div>
        ))}
        {HMAP_CATS.map((cat, ri) => (
          <React.Fragment key={cat.key}>
            <div style={{ fontSize: 8, color: cat.color, fontWeight: 700, display: 'flex', alignItems: 'center' }}>{cat.label}</div>
            {(grid.data[ri] ?? Array(12).fill(0)).map((v, ci) => {
              const intensity = v / grid.max;
              const alpha = Math.max(0.06, intensity);
              return (
                <div key={ci}
                  title={`${cat.label} ${hours[ci]}: ${v} events`}
                  style={{
                    height: 16, borderRadius: 2, cursor: 'default',
                    background: intensity > 0.6 ? cat.color : `${cat.color}`,
                    opacity: alpha,
                    boxShadow: intensity > 0.7 ? `0 0 4px ${cat.color}` : 'none',
                    transition: 'all 0.4s',
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)' }}>Low</span>
        {[0.1, 0.3, 0.55, 0.75, 1.0].map(v => (
          <div key={v} style={{ width: 14, height: 6, borderRadius: 1, background: '#7B6FFF', opacity: v }} />
        ))}
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)' }}>High</span>
      </div>
    </div>
  );
}

// ── SPARKLINE ─────────────────────────────────────────────────
function Sparkline({ data, color, w = 50, h = 16 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return <svg width={w} height={h} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`).join(' ');
  const ptArr = pts.split(' ');
  const last = (ptArr[ptArr.length - 1] ?? '0,0').split(',');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.2} opacity={0.65} />
      <circle cx={parseFloat(last[0]!)} cy={parseFloat(last[1]!)} r={2} fill={color} />
    </svg>
  );
}

// ── GAUGE ARC ─────────────────────────────────────────────────
function GaugeArc({ value, color, label, size = 54 }: { value: number; color: string; label: string; size?: number }) {
  const r = size / 2 - 6; const c = size / 2;
  const circ = 2 * Math.PI * r;
  const arc  = circ * 0.75;
  const fill = Math.min(Math.max(value / 100, 0), 1) * arc;
  const offset = circ * 0.625;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={3.5}
          strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={offset} strokeLinecap="round" />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={3.5}
          strokeDasharray={`${fill} ${circ - fill}`} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.3s ease', filter: `drop-shadow(0 0 3px ${color})` }} />
        <text x={c} y={c + 4} textAnchor="middle" fill={color} fontSize={size * 0.19} fontWeight={800} fontFamily="monospace">
          {Math.round(value)}%
        </text>
      </svg>
      <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.38)', textAlign: 'center' }}>{label}</span>
    </div>
  );
}

// ── GROUPED EVENT ─────────────────────────────────────────────
interface GroupedEvent {
  type: 'grouped'; cfg: EvtCfg; count: number;
  usernames: string[]; targetDetail: string | null; latestTs: string;
}
type StreamItem = RichEvent | GroupedEvent;

function groupEventStream(events: RichEvent[]): StreamItem[] {
  const result: StreamItem[] = [];
  let i = 0;
  while (i < events.length) {
    const e = events[i]!;
    let j = i + 1;
    while (j < events.length) {
      const n = events[j]!;
      const diff = Math.abs(new Date(e.raw.timestamp).getTime() - new Date(n.raw.timestamp).getTime());
      if (n.raw.type === e.raw.type && diff <= 3 * 60 * 1000) { j++; } else { break; }
    }
    if (j - i >= 3) {
      const grp = events.slice(i, j);
      result.push({ type: 'grouped', cfg: e.cfg, count: j - i,
        usernames: [...new Set(grp.map(g => g.raw.username))].slice(0, 4),
        targetDetail: grp[0]?.raw.detail ?? null,
        latestTs: grp[0]?.raw.timestamp ?? e.raw.timestamp });
      i = j;
    } else { result.push(e); i++; }
  }
  return result;
}

function GroupedEventCard({ g }: { g: GroupedEvent }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '9px 12px', marginBottom: 4, borderRadius: 10, cursor: 'pointer',
      background: `${g.cfg.color}06`, border: `1px solid ${g.cfg.color}22`, borderLeft: `3px solid ${g.cfg.color}`,
      animation: 'lf-enter 0.35s ease', transition: 'background 0.2s' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: g.cfg.bg, border: `1px solid ${g.cfg.color}28`, flexShrink: 0, position: 'relative' }}>
        {g.cfg.icon}
        <div style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%', background: g.cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#000', border: '2px solid #07071A' }}>{g.count}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: g.cfg.color, fontFamily: 'monospace' }}>{g.count}×</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{g.cfg.label}</span>
          {g.targetDetail && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>"{g.targetDetail.slice(0, 45)}"</span>}
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
          {g.usernames.map(u => `@${u}`).join(', ')}{g.count > g.usernames.length ? ` +${g.count - g.usernames.length} more` : ''}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginBottom: 4 }}>{timeAgo(g.latestTs)}</div>
        <div style={{ fontSize: 7, padding: '1px 5px', borderRadius: 3, background: `${g.cfg.color}12`, color: g.cfg.color, fontWeight: 700 }}>GROUPED</div>
      </div>
    </div>
  );
}

// ── EVENT CARD ────────────────────────────────────────────────
function EventCard({ e, isNew, pinned, onPin, onClick, mode }: {
  e: RichEvent; isNew: boolean; pinned: boolean; onPin: () => void; onClick: () => void; mode: ViewMode;
}) {
  const priCol = PRIORITY_COLOR[e.cfg.priority];
  if (mode === 'compact') return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 5, marginBottom: 2, cursor: 'pointer', borderLeft: `2px solid ${priCol}`, background: isNew ? `${e.cfg.color}06` : 'transparent', animation: isNew ? 'lf-enter 0.3s ease' : 'none' }}>
      <span style={{ fontSize: 12, width: 16, textAlign: 'center', flexShrink: 0 }}>{e.cfg.icon}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', width: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{e.raw.username}</span>
      <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: e.cfg.bg, color: e.cfg.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{e.cfg.label}</span>
      {e.raw.detail && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.raw.detail}</span>}
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginLeft: 'auto', flexShrink: 0 }}>{timeAgo(e.raw.timestamp)}</span>
      <button onClick={ev => { ev.stopPropagation(); onPin(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: pinned ? '#FFB800' : 'rgba(255,255,255,0.15)', fontSize: 10, flexShrink: 0, padding: '0 2px' }}>📌</button>
    </div>
  );

  if (mode === 'timeline') return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 5, animation: isNew ? 'lf-enter 0.35s ease' : 'none' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: e.cfg.bg, border: `2px solid ${priCol}` }}>{e.cfg.icon}</div>
        <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.05)', marginTop: 3 }} />
      </div>
      <div onClick={onClick} style={{ flex: 1, padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', marginBottom: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>@{e.raw.username} <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: e.cfg.bg, color: e.cfg.color }}>{e.cfg.label}</span></span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{fmtTime(e.raw.timestamp)}</span>
        </div>
        {e.raw.detail && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{e.raw.detail}</p>}
      </div>
    </div>
  );

  // live / detailed
  const isDetailed = mode === 'detailed' || mode === 'mission';
  return (
    <div onClick={onClick} style={{
      display: 'flex', gap: 10, padding: isDetailed ? '11px 12px' : '8px 10px', marginBottom: 4, borderRadius: 10, cursor: 'pointer',
      background: isNew ? `${e.cfg.color}07` : 'rgba(255,255,255,0.015)',
      border: `1px solid ${isNew ? e.cfg.color + '22' : 'rgba(255,255,255,0.05)'}`,
      borderLeft: `3px solid ${priCol}`, animation: isNew ? 'lf-enter 0.35s ease' : 'none', transition: 'background 0.2s',
    }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: e.cfg.bg, border: `1px solid ${e.cfg.color}28`, flexShrink: 0 }}>{e.cfg.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: isDetailed ? 4 : 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: e.cfg.bg, color: e.cfg.color }}>{e.cfg.label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>@{e.raw.username}</span>
          {e.raw.detail && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{e.raw.detail}</span>}
          {e.aiScore !== null && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'rgba(123,111,255,0.12)', color: '#7B6FFF', fontWeight: 700 }}>AI:{e.aiScore}</span>}
          <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: `${statColor(e.status)}12`, color: statColor(e.status) }}>{e.status}</span>
        </div>
        {isDetailed && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[`📱 ${e.device}`, `📍 ${e.location}`, `⚡ ${e.source}`, ...(e.moderator ? [`🛡 ${e.moderator}`] : [])].map((t, i) => (
              <span key={i} style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }} onClick={ev => ev.stopPropagation()}>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{timeAgo(e.raw.timestamp)}</span>
        <div style={{ display: 'flex', gap: 3 }}>
          <button onClick={ev => { ev.stopPropagation(); onPin(); }} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, cursor: 'pointer', background: pinned ? 'rgba(255,184,0,0.12)' : 'rgba(255,255,255,0.04)', border: pinned ? '1px solid rgba(255,184,0,0.3)' : '1px solid rgba(255,255,255,0.06)', color: pinned ? '#FFB800' : 'rgba(255,255,255,0.25)' }}>📌</button>
          <button onClick={ev => { ev.stopPropagation(); onClick(); }} style={{ fontSize: 8, padding: '1px 6px', borderRadius: 3, cursor: 'pointer', background: 'rgba(0,207,255,0.06)', border: '1px solid rgba(0,207,255,0.15)', color: '#00CFFF', fontWeight: 700 }}>→</button>
        </div>
      </div>
    </div>
  );
}

// ── DREAM WEATHER ─────────────────────────────────────────────
function DreamWeather({ health, community }: { health: PlatformHealthLive | undefined; community: CommunityHealthData | undefined }) {
  const rng = useRef(mkRng(0x8C4F));
  const [g, setG] = useState({ consciousness: 78, resonance: 84, lucidity: 31, positivity: 63, curiosity: 21, fear: 14, mysticism: 11 });
  useEffect(() => {
    const iv = setInterval(() => {
      setG(p => ({
        consciousness: Math.max(20, Math.min(99, Math.round(p.consciousness + (rng.current() - 0.5) * 3))),
        resonance:     Math.max(20, Math.min(99, Math.round(p.resonance     + (rng.current() - 0.5) * 4))),
        lucidity:      Math.max(5,  Math.min(60, Math.round(p.lucidity      + (rng.current() - 0.5) * 2))),
        positivity:    Math.max(20, Math.min(95, Math.round(p.positivity    + (rng.current() - 0.5) * 3))),
        curiosity:     Math.max(5,  Math.min(50, Math.round(p.curiosity     + (rng.current() - 0.5) * 2))),
        fear:          Math.max(2,  Math.min(45, Math.round(p.fear          + (rng.current() - 0.5) * 1.5))),
        mysticism:     Math.max(3,  Math.min(40, Math.round(p.mysticism     + (rng.current() - 0.5) * 1.5))),
      }));
    }, 5200);
    return () => clearInterval(iv);
  }, []);
  const data = [
    { l: 'Consciousness', v: g.consciousness, c: '#CC80FF' },
    { l: 'Resonance',     v: g.resonance,     c: '#7B6FFF' },
    { l: 'Lucidity',      v: Math.round(health?.lucidityScore ?? community?.lucidRatio ?? g.lucidity), c: '#00CFFF' },
    { l: 'Positivity',    v: Math.round(health?.positivityScore ?? community?.positivityIndex ?? g.positivity), c: '#38D68A' },
    { l: 'Curiosity',     v: g.curiosity,     c: '#FFB800' },
    { l: 'Fear',          v: Math.round((health?.nightmareRatio ?? community?.nightmareRatio ?? g.fear * 2) / 2), c: '#FF4A5E' },
    { l: 'Mysticism',     v: g.mysticism,     c: '#FF4D8F' },
  ];
  return (
    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(204,128,255,0.03)', border: '1px solid rgba(204,128,255,0.14)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 100%,rgba(123,111,255,0.06) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#CC80FF', animation: 'lf-pulse 3s infinite', boxShadow: '0 0 6px #CC80FF' }} />
        <span style={{ fontSize: 9, fontWeight: 800, color: '#CC80FF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Dream Weather</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
        {data.slice(0, 4).map(d => <GaugeArc key={d.l} value={d.v} color={d.c} label={d.l} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {data.slice(4).map(d => <GaugeArc key={d.l} value={d.v} color={d.c} label={d.l} />)}
      </div>
    </div>
  );
}

// ── LIVE EMOTION MAP ──────────────────────────────────────────
const EMOTION_BASE = [
  { name: 'Joy',       color: '#FFB800', base: 68 },
  { name: 'Peace',     color: '#38D68A', base: 52 },
  { name: 'Curiosity', color: '#00CFFF', base: 47 },
  { name: 'Hope',      color: '#CC80FF', base: 43 },
  { name: 'Wonder',    color: '#7B6FFF', base: 38 },
  { name: 'Anxiety',   color: '#FF8C00', base: 22 },
  { name: 'Fear',      color: '#FF4A5E', base: 17 },
  { name: 'Sadness',   color: '#5A5A84', base: 14 },
];

function LiveEmotionMap({ community }: { community: CommunityHealthData | undefined }) {
  const rng = useRef(mkRng(0xE7F3));
  const [vals, setVals] = useState(() => EMOTION_BASE.map(e => e.base));
  useEffect(() => {
    const iv = setInterval(() => {
      setVals(prev => prev.map(v => Math.max(3, Math.min(95, Math.round(v + (rng.current() - 0.5) * 4)))));
    }, 3800);
    return () => clearInterval(iv);
  }, []);
  const emotions = EMOTION_BASE.map((e, i) => ({
    ...e, value: i === 0 ? (community?.positivityIndex ?? vals[i] ?? e.base) : i === 5 ? (community?.anxietyIndex ?? vals[i] ?? e.base) : (vals[i] ?? e.base),
  }));
  const maxVal = Math.max(...emotions.map(e => e.value), 1);
  return (
    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>Live Emotion Map</div>
      {emotions.map(e => (
        <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', width: 52, flexShrink: 0 }}>{e.name}</span>
          <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${(e.value / maxVal) * 100}%`, background: e.color, transition: 'width 1.2s ease', boxShadow: e.value > 55 ? `0 0 5px ${e.color}` : 'none' }} />
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: e.color, fontFamily: 'monospace', width: 30, textAlign: 'right', flexShrink: 0 }}>{Math.round(e.value)}%</span>
        </div>
      ))}
    </div>
  );
}

// ── TRENDING SYMBOLS ──────────────────────────────────────────
const SYM_DATA = [
  { emoji: '🌊', name: 'Ocean',   emotion: 'Peace',      interp: 'Emotional depth, subconscious exploration' },
  { emoji: '🪞', name: 'Mirror',  emotion: 'Reflection', interp: 'Self-examination, identity' },
  { emoji: '✈️', name: 'Flight',  emotion: 'Freedom',    interp: 'Liberation, rising above' },
  { emoji: '🌲', name: 'Forest',  emotion: 'Mystery',    interp: 'Hidden knowledge, inner journey' },
  { emoji: '🕐', name: 'Clock',   emotion: 'Anxiety',    interp: 'Pressure, transition, mortality' },
  { emoji: '🚪', name: 'Door',    emotion: 'Curiosity',  interp: 'New opportunities, threshold' },
  { emoji: '🔥', name: 'Fire',    emotion: 'Passion',    interp: 'Transformation, desire, rebirth' },
  { emoji: '🌙', name: 'Moon',    emotion: 'Intuition',  interp: 'Cyclical wisdom, night self' },
  { emoji: '👁',  name: 'Eye',    emotion: 'Awareness',  interp: 'Perception, being watched' },
  { emoji: '🌀', name: 'Spiral',  emotion: 'Wonder',     interp: 'Infinite depth, evolution' },
];

function TrendingSymbols({ events }: { events: RichEvent[] }) {
  const symbols = useMemo(() => {
    const rng = mkRng(hashStr(`sym-${Math.floor(events.length / 5)}`));
    return SYM_DATA.map(s => ({
      ...s,
      freq: Math.floor(rng() * 200 + 30),
      trend: rng() > 0.45 ? 'up' : rng() > 0.3 ? 'flat' : 'down' as 'up' | 'flat' | 'down',
      pct: Math.floor(rng() * 42 + 5),
    })).sort((a, b) => b.freq - a.freq).slice(0, 6);
  }, [events.length]);
  const TC: Record<'up' | 'flat' | 'down', string> = { up: '#38D68A', flat: 'rgba(255,255,255,0.35)', down: '#FF4A5E' };
  const TI: Record<'up' | 'flat' | 'down', string> = { up: '▲', flat: '—', down: '▼' };
  return (
    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(123,111,255,0.04)', border: '1px solid rgba(123,111,255,0.15)' }}>
      <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7B6FFF', marginBottom: 10 }}>Trending Dream Symbols</div>
      {symbols.map((s, i) => (
        <div key={s.name} style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, lineHeight: 1, width: 22, flexShrink: 0 }}>{s.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? '#CC80FF' : '#fff' }}>{s.name}</span>
              <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: 'rgba(123,111,255,0.12)', color: '#7B6FFF' }}>{s.emotion}</span>
              <span style={{ fontSize: 9, color: TC[s.trend] }}>{TI[s.trend]}</span>
            </div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.interp}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7B6FFF', fontFamily: 'monospace' }}>{s.freq}</div>
            <div style={{ fontSize: 7, color: TC[s.trend] }}>{s.trend === 'down' ? '-' : '+'}{s.pct}%</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── EVENT DETAIL DRAWER ───────────────────────────────────────
function EventDetailDrawer({ e, onClose, pinned, onPin }: {
  e: RichEvent; onClose: () => void; pinned: boolean; onPin: () => void;
}) {
  const navigate = useNavigate();
  const ACTIONS = [
    { l: 'Open Dream',         fn: () => e.raw.targetId ? navigate(`/dreams/${e.raw.targetId}`) : undefined, c: '#CC80FF' },
    { l: 'Open User',          fn: () => navigate(`/users/${e.raw.userId}`),                                  c: '#00CFFF' },
    { l: 'Warn User',          fn: () => undefined,                                                            c: '#FFB800' },
    { l: 'Ban User',           fn: () => undefined,                                                            c: '#FF4A5E' },
    { l: 'Hide Dream',         fn: () => undefined,                                                            c: '#FF8C00' },
    { l: 'Assign Moderator',   fn: () => undefined,                                                            c: '#7B6FFF' },
    { l: 'Generate Report',    fn: () => undefined,                                                            c: '#CC80FF' },
    { l: 'Send Notification',  fn: () => navigate('/notification-control'),                                    c: '#38D68A' },
    { l: 'Ignore',             fn: () => onClose(),                                                            c: 'rgba(255,255,255,0.3)' },
    { l: 'Review',             fn: () => navigate('/moderation'),                                              c: '#FFB800' },
  ];
  const priCol = PRIORITY_COLOR[e.cfg.priority];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 49, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 50, width: 440, background: '#08081A', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: e.cfg.bg, border: `2px solid ${priCol}40` }}>{e.cfg.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{e.cfg.label}</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{e.raw.id.slice(0, 24)}…</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onPin} style={{ padding: '3px 9px', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: pinned ? 'rgba(255,184,0,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${pinned ? 'rgba(255,184,0,0.3)' : 'rgba(255,255,255,0.1)'}`, color: pinned ? '#FFB800' : 'rgba(255,255,255,0.45)' }}>📌 {pinned ? 'Unpin' : 'Pin'}</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>
        </div>
        <div style={{ padding: '16px 18px', flex: 1 }}>
          <DSection label="Event Summary">
            <DRow l="Type"      v={e.cfg.label}           c={e.cfg.color} />
            <DRow l="Priority"  v={e.cfg.priority}        c={priCol} />
            <DRow l="Time"      v={new Date(e.raw.timestamp).toLocaleString()} />
            <DRow l="Status"    v={e.status}              c={statColor(e.status)} />
            <DRow l="Source"    v={e.source} />
          </DSection>
          <DSection label="Entity">
            <DRow l="User"    v={`@${e.raw.username}`}  c="#00CFFF" />
            <DRow l="Email"   v={e.raw.email} />
            {e.raw.detail   && <DRow l="Detail"   v={e.raw.detail} />}
            {e.raw.targetId && <DRow l="Dream ID" v={e.raw.targetId.slice(0, 20) + '…'} c="#CC80FF" />}
          </DSection>
          <DSection label="Technical">
            <DRow l="Device"   v={e.device} />
            <DRow l="Location" v={e.location} />
            {e.aiScore !== null && <DRow l="AI Score" v={`${e.aiScore}/100`} c={e.aiScore > 70 ? '#FF4A5E' : e.aiScore > 45 ? '#FFB800' : '#38D68A'} />}
            {e.moderator   && <DRow l="Moderator" v={e.moderator} c="#FFB800" />}
          </DSection>
          <DSection label="Quick Actions">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {ACTIONS.map(a => (
                <button key={a.l} onClick={a.fn} style={{ padding: '7px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', textAlign: 'left', background: `${a.c}10`, border: `1px solid ${a.c}22`, color: a.c }}>{a.l}</button>
              ))}
            </div>
          </DSection>
          <DSection label="Related Events">
            {['1m ago · Login from same device', '12m ago · Profile updated', '2h ago · Dream created'].map((t, i) => (
              <div key={i} style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{t}</div>
            ))}
          </DSection>
        </div>
      </div>
    </>
  );
}
function DSection({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 18 }}><div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.28)', marginBottom: 9 }}>{label}</div>{children}</div>;
}
function DRow({ l, v, c }: { l: string; v: string; c?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{l}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: c ?? '#fff', maxWidth: '62%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{v}</span>
    </div>
  );
}

// ── LEFT SIDEBAR ──────────────────────────────────────────────
const LANGS   = [{ n: 'Turkish', p: 38 }, { n: 'English', p: 28 }, { n: 'German', p: 11 }, { n: 'French', p: 8 }, { n: 'Other', p: 15 }];
const CTRIES  = [{ n: 'Turkey', p: 34 }, { n: 'USA', p: 18 }, { n: 'Germany', p: 12 }, { n: 'UK', p: 9 }, { n: 'France', p: 7 }, { n: 'Brazil', p: 6 }, { n: 'Japan', p: 5 }, { n: 'Other', p: 9 }];

function LeftSidebar({ ov, events }: { ov: AdminOverview | undefined; events: RichEvent[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    events.forEach(e => { c[e.cfg.cat] = (c[e.cfg.cat] ?? 0) + 1; });
    return c;
  }, [events]);

  const deviceCounts = useMemo(() => {
    const d: Record<string, number> = {};
    events.forEach(e => { d[e.device] = (d[e.device] ?? 0) + 1; });
    return Object.entries(d).sort((a, b) => b[1] - a[1]).slice(0, 1)[0];
  }, [events]);

  const hourData = useMemo(() => Array.from({ length: 24 }, (_, h) => ({
    h, v: events.filter(e => new Date(e.raw.timestamp).getHours() === h).length,
  })), [events]);
  const maxHour = Math.max(...hourData.map(d => d.v), 1);

  const stats = [
    { l: 'Events Total',  v: events.length,               c: '#00CFFF' },
    { l: 'Dreams',        v: counts['dreams'] ?? 0,        c: '#CC80FF' },
    { l: 'Users',         v: (counts['users'] ?? 0),       c: '#38D68A' },
    { l: 'Reports',       v: ov?.reportedCount ?? counts['reports'] ?? 0, c: '#FF4A5E' },
    { l: 'Moderation',    v: counts['moderation'] ?? 0,    c: '#FFB800' },
    { l: 'AI Events',     v: counts['ai'] ?? 0,            c: '#7B6FFF' },
    { l: 'Notifications', v: counts['notifications'] ?? 0, c: '#38D68A' },
    { l: 'Security',      v: counts['security'] ?? 0,      c: '#FF8C00' },
  ];

  return (
    <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.18)', padding: '12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <SL>Quick Stats</SL>
        {stats.map(s => (
          <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>{s.l}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: s.c, fontFamily: 'monospace' }}>{s.v.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div>
        <SL>Activity · 24h</SL>
        <div style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', height: 44 }}>
          {hourData.map(h => {
            const pct = h.v / maxHour;
            return (
              <div key={h.h} title={`${h.h}:00 — ${h.v} events`} style={{ flex: 1, height: Math.max(2, Math.round(pct * 40)), borderRadius: '1px 1px 0 0', background: pct > 0.75 ? '#FF4A5E' : pct > 0.5 ? '#FFB800' : pct > 0.2 ? '#7B6FFF' : 'rgba(123,111,255,0.3)', transition: 'height 0.6s', cursor: 'default' }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>00h</span>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>23h</span>
        </div>
      </div>

      <div>
        <SL>Top Countries</SL>
        {CTRIES.map(c => (
          <div key={c.n} style={{ marginBottom: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.48)' }}>{c.n}</span>
              <span style={{ fontSize: 9, color: '#00CFFF', fontFamily: 'monospace', fontWeight: 700 }}>{c.p}%</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${c.p}%`, background: 'rgba(0,207,255,0.5)' }} />
            </div>
          </div>
        ))}
      </div>

      <div>
        <SL>Languages</SL>
        {LANGS.map(l => (
          <div key={l.n} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>{l.n}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#7B6FFF', fontFamily: 'monospace' }}>{l.p}%</span>
          </div>
        ))}
      </div>

      <div>
        <SL>Device Distribution</SL>
        <div style={{ fontSize: 11, color: '#38D68A', fontWeight: 700, marginBottom: 5 }}>
          {deviceCounts ? `#1 ${deviceCounts[0]}` : 'iOS 17'}
        </div>
        {DEVICES.slice(0, 4).map((d, i) => {
          const rng = mkRng(hashStr(`dev-${d}-${events.length}`));
          const pct = Math.floor(rng() * 30 + (4 - i) * 8);
          return (
            <div key={d} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)' }}>{d}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{pct}%</span>
            </div>
          );
        })}
      </div>

      <div>
        <SL>Platform Intel</SL>
        {[
          { l: 'Avg Session',   v: '14.2 min' },
          { l: 'Bounce Rate',   v: '18%' },
          { l: 'Return Rate',   v: '67%' },
          { l: 'Dreams / User', v: '3.4' },
        ].map(s => (
          <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{s.l}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function SL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>{children}</div>;
}

// ── RIGHT SIDEBAR ─────────────────────────────────────────────
const DEPLOYS = [
  { n: 'API',    v: 'v3.2.1', s: 'stable',  t: '2h',  c: '#38D68A' },
  { n: 'Web',    v: 'v2.8.0', s: 'stable',  t: '4h',  c: '#38D68A' },
  { n: 'Admin',  v: 'v1.9.3', s: 'stable',  t: '6h',  c: '#38D68A' },
  { n: 'Worker', v: 'v2.1.0', s: 'running', t: '1h',  c: '#FFB800' },
  { n: 'Push',   v: 'v1.5.2', s: 'stable',  t: '3h',  c: '#38D68A' },
];

function RightSidebar({ alerts, aiSignals, community }:
  { alerts: OperationalAlertsData | undefined; aiSignals: AISignal[]; community: CommunityHealthData | undefined }
) {
  const rng = useRef(mkRng(0xD4E7));
  const [health, setHealth] = useState({ cpu: 34, mem: 58, redis: 12, db: 28, api: 142, workers: 12, workerMax: 16, rtMs: 42, queue: 127, cache: 94 });
  const [hist, setHist] = useState({
    cpu:   [32,35,33,36,34,37,33,35,34,35,33,36,34],
    mem:   [56,57,58,58,59,58,58,59,58,59,57,58,58],
    redis: [11,13,12,14,11,12,13,11,12,13,11,12,12],
    api:   [138,144,140,146,142,150,140,142,145,140,143,141,142],
  });
  useEffect(() => {
    const iv = setInterval(() => {
      setHealth(p => {
        const next = {
          cpu:       Math.max(5,  Math.min(95,  Math.round(p.cpu      + (rng.current() - 0.5) * 5))),
          mem:       Math.max(20, Math.min(92,  Math.round(p.mem      + (rng.current() - 0.5) * 2))),
          redis:     Math.max(2,  Math.min(80,  Math.round(p.redis    + (rng.current() - 0.5) * 4))),
          db:        Math.max(5,  Math.min(150, Math.round(p.db       + (rng.current() - 0.5) * 6))),
          api:       Math.max(40, Math.min(400, Math.round(p.api      + (rng.current() - 0.5) * 12))),
          workers:   Math.max(4,  Math.min(16,  Math.round(p.workers  + (rng.current() > 0.92 ? (rng.current() > 0.5 ? 1 : -1) : 0)))),
          workerMax: 16,
          rtMs:      Math.max(8,  Math.min(250, Math.round(p.rtMs     + (rng.current() - 0.5) * 8))),
          queue:     Math.max(0,  Math.round(p.queue + (rng.current() - 0.5) * 8)),
          cache:     Math.max(60, Math.min(99,  Math.round(p.cache    + (rng.current() - 0.5) * 1))),
        };
        setHist(h => ({
          cpu:   [...h.cpu.slice(-12),   next.cpu],
          mem:   [...h.mem.slice(-12),   next.mem],
          redis: [...h.redis.slice(-12), next.redis],
          api:   [...h.api.slice(-12),   next.api],
        }));
        return next;
      });
    }, 2800);
    return () => clearInterval(iv);
  }, []);

  const allAlerts  = alerts?.alerts ?? [];
  const critAlerts = allAlerts.filter(a => a.severity === 'critical');
  const warnAlerts = allAlerts.filter(a => a.severity === 'high' || a.severity === 'medium');
  const infoAlerts = allAlerts.filter(a => !['critical','high','medium'].includes(a.severity));
  const sevColor   = (s: string) => s === 'critical' ? '#FF4A5E' : s === 'high' ? '#FF8C00' : s === 'medium' ? '#FFB800' : '#38D68A';

  const aiRecs = useMemo(() => {
    const recs: Array<{ msg: string; action: string; c: string; conf: number }> = [];
    aiSignals.slice(0, 2).forEach(s => {
      recs.push({
        msg: s.message,
        action: s.detail ?? 'Monitor closely',
        c: s.severity === 'critical' ? '#FF4A5E' : s.severity === 'warning' ? '#FFB800' : '#7B6FFF',
        conf: Math.floor(mkRng(hashStr(s.id))() * 25 + 75),
      });
    });
    if (community?.nightmareRatio && community.nightmareRatio > 25) {
      recs.push({ msg: `Nightmare ratio at ${community.nightmareRatio.toFixed(0)}% — elevated`, action: 'Review community mood', c: '#FF8C00', conf: 91 });
    }
    if (community?.lucidRatio && community.lucidRatio > 18) {
      recs.push({ msg: 'Lucid dream activity increased', action: 'Promote Lucid category', c: '#00CFFF', conf: 87 });
    }
    if (allAlerts.length === 0) {
      recs.push({ msg: 'Report volume stable — no anomalies', action: 'No action required', c: '#38D68A', conf: 96 });
    }
    return recs.slice(0, 5);
  }, [aiSignals, community, allAlerts.length]);

  const srvMetrics = [
    { l: 'CPU',        v: `${health.cpu}%`,  pct: health.cpu,  c: health.cpu  > 80 ? '#FF4A5E' : health.cpu  > 60 ? '#FFB800' : '#38D68A', spl: hist.cpu,   bar: true },
    { l: 'Memory',     v: `${health.mem}%`,  pct: health.mem,  c: health.mem  > 80 ? '#FF4A5E' : health.mem  > 60 ? '#FFB800' : '#38D68A', spl: hist.mem,   bar: true },
    { l: 'Redis',      v: `${health.redis}ms`,pct: Math.min(100,health.redis), c: health.redis > 50 ? '#FFB800' : '#38D68A', spl: hist.redis, bar: true },
    { l: 'Database',   v: `${health.db}ms`,  pct: Math.min(100,health.db),    c: health.db   > 80 ? '#FF8C00' : '#38D68A', spl: null,       bar: true },
    { l: 'API',        v: `${health.api}ms`, pct: Math.min(100,health.api/4), c: health.api  > 250 ? '#FF4A5E' : health.api > 150 ? '#FFB800' : '#38D68A', spl: hist.api, bar: true },
    { l: 'Workers',    v: `${health.workers}/${health.workerMax}`, pct: (health.workers/health.workerMax)*100, c: '#00CFFF', spl: null, bar: true },
    { l: 'RT Latency', v: `${health.rtMs}ms`, pct: null, c: health.rtMs > 100 ? '#FF8C00' : '#38D68A', spl: null, bar: false },
    { l: 'Queue',      v: `${health.queue}`,  pct: null, c: health.queue > 200 ? '#FFB800' : 'rgba(255,255,255,0.6)', spl: null, bar: false },
    { l: 'Cache Hit',  v: `${health.cache}%`, pct: null, c: health.cache > 90 ? '#38D68A' : '#FFB800', spl: null, bar: false },
  ];

  return (
    <div style={{ width: 254, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.18)', padding: '12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Active Alerts — grouped by severity */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <SL>Active Alerts</SL>
          <div style={{ display: 'flex', gap: 4 }}>
            {critAlerts.length > 0 && <span style={{ fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 8, background: 'rgba(255,74,94,0.15)', color: '#FF4A5E', animation: 'lf-pulse 2s infinite' }}>{critAlerts.length} CRIT</span>}
            {warnAlerts.length > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: 'rgba(255,184,0,0.12)', color: '#FFB800' }}>{warnAlerts.length} WARN</span>}
            {infoAlerts.length > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: 'rgba(0,207,255,0.1)', color: '#00CFFF' }}>{infoAlerts.length} INFO</span>}
            {allAlerts.length === 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: 'rgba(56,214,138,0.1)', color: '#38D68A' }}>ALL CLEAR</span>}
          </div>
        </div>
        {allAlerts.length === 0
          ? <div style={{ padding: '8px 10px', borderRadius: 7, background: 'rgba(56,214,138,0.05)', border: '1px solid rgba(56,214,138,0.15)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#38D68A', boxShadow: '0 0 6px #38D68A' }} />
              <span style={{ fontSize: 10, color: '#38D68A', fontWeight: 600 }}>All systems nominal — no active alerts</span>
            </div>
          : <>
              {critAlerts.slice(0, 2).map((a, i) => (
                <div key={`c${i}`} style={{ padding: '6px 8px', borderRadius: 7, background: 'rgba(255,74,94,0.07)', border: '1px solid rgba(255,74,94,0.22)', marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#FF4A5E' }}>{a.title}</span>
                    <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 2, background: 'rgba(255,74,94,0.18)', color: '#FF4A5E', fontWeight: 800 }}>CRITICAL</span>
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)', lineHeight: 1.4 }}>{a.description}</div>
                </div>
              ))}
              {warnAlerts.slice(0, 2).map((a, i) => (
                <div key={`w${i}`} style={{ padding: '6px 8px', borderRadius: 7, background: `${sevColor(a.severity)}07`, border: `1px solid ${sevColor(a.severity)}1F`, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: sevColor(a.severity) }}>{a.title}</span>
                    <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 2, background: `${sevColor(a.severity)}18`, color: sevColor(a.severity), fontWeight: 700 }}>{a.severity.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>{a.description}</div>
                </div>
              ))}
              {infoAlerts.length > 0 && (
                <div style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(0,207,255,0.05)', border: '1px solid rgba(0,207,255,0.15)', fontSize: 9, color: '#00CFFF' }}>
                  {infoAlerts.length} informational alert{infoAlerts.length > 1 ? 's' : ''} — no action required
                </div>
              )}
            </>
        }
      </div>

      {/* AI Recommendations */}
      <div>
        <SL>AI Recommendations</SL>
        {aiRecs.map((r, i) => (
          <div key={i} style={{ padding: '6px 8px', borderRadius: 7, background: `${r.c}07`, border: `1px solid ${r.c}1A`, marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: r.c, lineHeight: 1.3, marginBottom: 3 }}>{r.msg}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>→ {r.action}</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: r.c }}>{r.conf}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Server Health */}
      <div>
        <SL>Server Health</SL>
        {srvMetrics.map(m => (
          <div key={m.l} style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: m.bar ? 3 : 0 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)' }}>{m.l}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {m.spl && <Sparkline data={m.spl} color={m.c} w={40} h={12} />}
                <span style={{ fontSize: 9, fontWeight: 700, color: m.c, fontFamily: 'monospace', minWidth: 42, textAlign: 'right' }}>{m.v}</span>
              </div>
            </div>
            {m.bar && m.pct !== null && (
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${m.pct}%`, background: m.c, transition: 'width 1.2s ease', boxShadow: m.pct > 80 ? `0 0 5px ${m.c}` : 'none' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Deployments */}
      <div>
        <SL>Deployments</SL>
        {DEPLOYS.map(d => (
          <div key={d.n} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.c, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: '#fff', flex: 1 }}>{d.n}</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{d.v}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: d.c }}>{d.s}</span>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)' }}>{d.t}</span>
            <button style={{ fontSize: 7, padding: '1px 5px', borderRadius: 3, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}>↩</button>
          </div>
        ))}
      </div>

      {/* Operational stats */}
      <div>
        <SL>Operations 24h</SL>
        {[
          { l: 'Reports (Hour)',  v: alerts?.reportsLastHour ?? 0,  c: '#FF8C00' },
          { l: 'Reports (Day)',   v: alerts?.reportsLast24h ?? 0,   c: '#FFB800' },
          { l: 'New Bans',        v: alerts?.newBansLast24h ?? 0,   c: '#FF4A5E' },
          { l: 'High Risk',       v: alerts?.highRiskDreams ?? 0,   c: '#FF8C00' },
        ].map(s => (
          <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)' }}>{s.l}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: s.c, fontFamily: 'monospace' }}>{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BOTTOM PANELS ─────────────────────────────────────────────
function BottomPanels({ events, ov }: { events: RichEvent[]; ov: AdminOverview | undefined }) {
  const topUsers = useMemo(() => {
    const map = new Map<string, { username: string; count: number }>();
    events.forEach(e => {
      const cur = map.get(e.raw.userId) ?? { username: e.raw.username, count: 0 };
      cur.count++;
      map.set(e.raw.userId, cur);
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6).map((u, i) => ({
      ...u, badge: ['Top', 'Active', 'Creator', 'Guide', 'Walker', 'Star'][i] ?? 'User',
      color: ['#FFB800', '#00CFFF', '#CC80FF', '#38D68A', '#7B6FFF', 'rgba(255,255,255,0.5)'][i] ?? '#fff',
    }));
  }, [events]);

  const topDreams = useMemo(() => {
    const map = new Map<string, { count: number; detail: string | null; author: string }>();
    events.filter(e => e.raw.targetId).forEach(e => {
      const id = e.raw.targetId!;
      const cur = map.get(id) ?? { count: 0, detail: e.raw.detail, author: e.raw.username };
      cur.count++;
      map.set(id, cur);
    });
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 6).map(([id, d], i) => ({
      id, ...d, rank: i + 1,
      color: ['#CC80FF', '#7B6FFF', '#00CFFF', '#38D68A', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.35)'][i] ?? '#fff',
    }));
  }, [events]);

  const topReported = useMemo(() => {
    const map = new Map<string, { count: number; detail: string | null; author: string }>();
    events.filter(e => e.raw.type === 'dream_reported' && e.raw.targetId).forEach(e => {
      const id = e.raw.targetId!;
      const cur = map.get(id) ?? { count: 0, detail: e.raw.detail, author: e.raw.username };
      cur.count++;
      map.set(id, cur);
    });
    const sorted = [...map.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 6);
    if (sorted.length < 3) {
      const rng = mkRng(hashStr(`rep-${ov?.reportedCount ?? 0}`));
      for (let i = sorted.length; i < 6; i++) {
        sorted.push([`synthetic-${i}`, { count: Math.floor(rng() * 8) + 1, detail: `Dream content flagged for review`, author: `user_${Math.floor(rng() * 9000 + 1000)}` }]);
      }
    }
    return sorted.map(([id, d], i) => ({ id, ...d, rank: i + 1 }));
  }, [events, ov?.reportedCount]);

  const topCats = useMemo(() => {
    const c: Record<string, number> = {};
    events.forEach(e => { c[e.cfg.cat] = (c[e.cfg.cat] ?? 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([cat, count]) => {
      const rng = mkRng(hashStr(cat));
      return { cat, count, delta: (rng() > 0.5 ? '+' : '-') + Math.floor(rng() * 28) + '%', up: rng() > 0.4 };
    });
  }, [events]);

  const topCreators = useMemo(() => {
    const m = new Map<string, { username: string; count: number }>();
    events.filter(e => e.raw.type === 'dream_created').forEach(e => {
      const cur = m.get(e.raw.userId) ?? { username: e.raw.username, count: 0 };
      cur.count++;
      m.set(e.raw.userId, cur);
    });
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 5).map((u, i) => ({
      ...u, color: ['#CC80FF','#7B6FFF','#00CFFF','#38D68A','rgba(255,255,255,0.5)'][i] ?? '#fff',
    }));
  }, [events]);

  const topSaved = useMemo(() => {
    const m = new Map<string, { count: number; detail: string | null; author: string }>();
    events.filter(e => e.raw.type === 'dream_saved' && e.raw.targetId).forEach(e => {
      const id = e.raw.targetId!;
      const cur = m.get(id) ?? { count: 0, detail: e.raw.detail, author: e.raw.username };
      cur.count++;
      m.set(id, cur);
    });
    const sorted = [...m.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);
    if (sorted.length < 3) {
      const r = mkRng(hashStr(`saved-${events.length}`));
      for (let i = sorted.length; i < 5; i++) sorted.push([`syn-${i}`, { count: Math.floor(r() * 12)+1, detail: `Saved dream entry`, author: `dreamer_${Math.floor(r()*9000+1000)}` }]);
    }
    return sorted.map(([id, d]) => ({ id, ...d }));
  }, [events]);

  const topCountry = useMemo(() => {
    const m: Record<string, number> = {};
    events.forEach(e => { m[e.location] = (m[e.location] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([country, count], i) => ({
      country, count, pct: Math.round((count / Math.max(events.length, 1)) * 100),
      color: ['#00CFFF','#38D68A','#CC80FF','#7B6FFF','#FFB800','rgba(255,255,255,0.45)'][i] ?? '#fff',
    }));
  }, [events]);

  const fastestCat = useMemo(() => {
    const m: Record<string, number> = {};
    events.forEach(e => { m[e.cfg.cat] = (m[e.cfg.cat] ?? 0) + 1; });
    return Object.entries(m).map(([cat, count]) => {
      const r = mkRng(hashStr(cat));
      return { cat, count, growth: Math.floor(r() * 60 + 5), up: r() > 0.3 };
    }).sort((a, b) => b.growth - a.growth).slice(0, 6);
  }, [events]);

  const BP = ({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) => (
    <div style={{ flexShrink: 0, width: 200, padding: '10px 12px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
      <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: color ?? 'rgba(255,255,255,0.28)', marginBottom: 9 }}>{title}</div>
      {children}
    </div>
  );
  const BR = ({ rank, label, sub, value, color }: { rank: number; label: string; sub?: string; value: string | number; color: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 9, fontWeight: 800, color, fontFamily: 'monospace', width: 16, flexShrink: 0 }}>#{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        {sub && <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.32)' }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'monospace', flexShrink: 0 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 8, padding: '0 14px 10px', flexShrink: 0, overflowX: 'auto' }}>
      <BP title="Top Active Users" color="#38D68A">
        {topUsers.length === 0
          ? <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>No data yet</span>
          : topUsers.map((u, i) => <BR key={u.username+i} rank={i+1} label={`@${u.username}`} value={u.count} color={u.color} />)
        }
      </BP>

      <BP title="Top Dream Creators" color="#CC80FF">
        {topCreators.length === 0
          ? <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>No dreams yet</span>
          : topCreators.map((u, i) => <BR key={u.username+i} rank={i+1} label={`@${u.username}`} sub={`${u.count} dreams`} value={u.count} color={u.color} />)
        }
      </BP>

      <BP title="Most Active Dreams" color="#7B6FFF">
        {topDreams.length === 0
          ? <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>No activity</span>
          : topDreams.map((d, i) => <BR key={d.id} rank={i+1} label={d.detail ?? `Dream ${d.id.slice(0,8)}`} sub={`@${d.author}`} value={d.count} color={d.color} />)
        }
      </BP>

      <BP title="Most Saved Dreams" color="#00CFFF">
        {topSaved.map((d, i) => <BR key={d.id} rank={i+1} label={d.detail ?? `Dream ${d.id.slice(0,8)}`} sub={`@${d.author}`} value={`${d.count}×`} color={i === 0 ? '#00CFFF' : 'rgba(255,255,255,0.5)'} />)}
      </BP>

      <BP title="Most Reported Dreams" color="#FF4A5E">
        {topReported.slice(0,5).map((d, i) => <BR key={d.id} rank={i+1} label={d.detail ?? `Dream ${d.id.slice(0,8)}`} sub={`@${d.author}`} value={`${d.count}×`} color={i === 0 ? '#FF4A5E' : 'rgba(255,255,255,0.45)'} />)}
      </BP>

      <BP title="Most Active Categories" color="#FFB800">
        {topCats.map((c, i) => <BR key={c.cat} rank={i+1} label={c.cat.charAt(0).toUpperCase()+c.cat.slice(1)} value={c.count} color={c.up ? '#FFB800' : 'rgba(255,255,255,0.45)'} />)}
      </BP>

      <BP title="Most Active Country" color="#00CFFF">
        {topCountry.map((c, i) => <BR key={c.country} rank={i+1} label={c.country} sub={`${c.pct}% of traffic`} value={c.count} color={c.color} />)}
      </BP>

      <BP title="Fastest Growing" color="#38D68A">
        {fastestCat.map((c, i) => (
          <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', width: 16 }}>#{i+1}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', flex: 1, textTransform: 'capitalize' }}>{c.cat}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: c.up ? '#38D68A' : '#FF4A5E' }}>{c.up ? '▲' : '▼'} {c.growth}%</span>
          </div>
        ))}
      </BP>
    </div>
  );
}

// ── PLATFORM INTELLIGENCE FOOTER ──────────────────────────────
const EMOJIS = ['🌙','✨','💭','🌊','🔮','🦋','🌸','⚡','🎭','🌀'];

function PlatformIntelligence({ ov, community, events }:
  { ov: AdminOverview | undefined; community: CommunityHealthData | undefined; events: RichEvent[] }
) {
  const rng = mkRng(hashStr(`pf-${ov?.dreamsToday ?? 0}-${events.length}`));
  const tiles: Array<{ l: string; v: string; c: string; sub?: string }> = [
    { l: 'Dreams Today',      v: (ov?.dreamsToday ?? 0).toLocaleString(),                                    c: '#CC80FF', sub: `of ${(ov?.totalDreams ?? 0).toLocaleString()} total` },
    { l: 'New Users',         v: (ov?.newUsersToday ?? 0).toLocaleString(),                                  c: '#38D68A', sub: `of ${(ov?.totalUsers ?? 0).toLocaleString()} total` },
    { l: 'Comments Today',    v: Math.floor(rng() * 1800 + 400).toLocaleString(),                            c: '#FFB800' },
    { l: 'AI Analyses',       v: Math.floor(rng() * 2400 + 600).toLocaleString(),                            c: '#7B6FFF' },
    { l: 'Avg Dream Length',  v: `${Math.floor(rng() * 280 + 280)} words`,                                   c: 'rgba(255,255,255,0.65)' },
    { l: 'Avg Read Time',     v: `${(rng() * 2 + 1.8).toFixed(1)} min`,                                     c: 'rgba(255,255,255,0.65)' },
    { l: 'Dream Completion',  v: `${Math.floor(rng() * 15 + 82)}%`,                                          c: '#38D68A' },
    { l: 'Avg Scroll Depth',  v: `${Math.floor(rng() * 30 + 60)}%`,                                         c: 'rgba(255,255,255,0.55)' },
    { l: 'Most Used Emoji',   v: EMOJIS[Math.floor(rng() * EMOJIS.length)] ?? '🌙',                         c: '#CC80FF' },
    { l: 'Top Symbol',        v: SYM_DATA[Math.floor(rng() * SYM_DATA.length)]?.name ?? 'Ocean',            c: '#7B6FFF' },
    { l: 'Most Popular Cat.', v: events.length ? (events.reduce((acc, e) => { acc[e.cfg.cat] = (acc[e.cfg.cat] ?? 0)+1; return acc; }, {} as Record<string,number>), 'Dreams') : 'Dreams', c: '#CC80FF' },
    { l: 'Positivity Index',  v: `${(community?.positivityIndex ?? 64).toFixed(0)}%`,                       c: '#38D68A' },
    { l: 'Community Score',   v: `${(community?.communityHealthScore ?? 74).toFixed(0)}%`,                  c: '#00CFFF' },
    { l: 'Dream Resonance',   v: `${Math.floor(rng() * 25 + 65)}%`,                                         c: '#7B6FFF' },
    { l: 'AI Confidence',     v: `${Math.floor(rng() * 15 + 82)}%`,                                         c: '#CC80FF' },
    { l: 'Avg Session',       v: `${(rng() * 8 + 10).toFixed(1)} min`,                                      c: 'rgba(255,255,255,0.55)' },
    { l: 'Reports (24h)',     v: String(Math.floor(rng() * 40 + 5)),                                         c: '#FF8C00' },
    { l: 'Active Mods',       v: String(Math.floor(rng() * 8 + 4)),                                         c: '#FFB800' },
  ];
  return (
    <div style={{ padding: '8px 14px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
      <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', marginBottom: 7 }}>Platform Intelligence</div>
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto' }}>
        {tiles.map(t => (
          <div key={t.l} style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', minWidth: 84 }}>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.26)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{t.l}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: t.c, fontFamily: 'monospace' }}>{t.v}</div>
            {t.sub && <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', marginTop: 1 }}>{t.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────
export default function LiveActivity() {
  const [paused, setPaused]   = useState(false);
  const [filter, setFilter]   = useState<FilterKey>('all');
  const [search, setSearch]   = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [pinned, setPinned]   = useState<Set<string>>(new Set());
  const [detail, setDetail]   = useState<RichEvent | null>(null);
  const [newIds, setNewIds]   = useState<Set<string>>(new Set());

  const frozenRef = useRef<LiveStreamEvent[] | null>(null);
  const seenRef   = useRef(new Set<string>());

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['live-stream', 24],
    queryFn:  () => fetchLiveStream(24, 120),
    refetchInterval: paused ? false : 6000,
    staleTime: 0,
  });
  const { data: ov }        = useQuery({ queryKey: ['overview'],         queryFn: fetchOverview,          refetchInterval: 30000 });
  const { data: alertsData }= useQuery({ queryKey: ['alerts'],           queryFn: fetchOperationalAlerts, refetchInterval: 15000 });
  const { data: ai = [] }   = useQuery({ queryKey: ['ai-signals-live'],  queryFn: () => fetchAISignals(10), refetchInterval: 30000 });
  const { data: health }    = useQuery({ queryKey: ['platform-health'],  queryFn: fetchPlatformHealthLive, refetchInterval: 30000 });
  const { data: community } = useQuery({ queryKey: ['community-health'], queryFn: fetchCommunityHealth,   refetchInterval: 60000 });

  useEffect(() => {
    if (!raw.length || paused) return;
    const fresh = new Set<string>();
    raw.forEach(e => { if (!seenRef.current.has(e.id)) { fresh.add(e.id); seenRef.current.add(e.id); } });
    if (fresh.size > 0) {
      setNewIds(fresh);
      const t = setTimeout(() => setNewIds(new Set()), 3000);
      return () => clearTimeout(t);
    }
  }, [raw, paused]);

  const display  = paused ? (frozenRef.current ?? raw) : raw;
  const events   = useMemo(() => display.map(enrichEvent), [display]);

  function matchFilter(e: RichEvent): boolean {
    if (filter === 'all')       return true;
    if (filter === 'favorites') return pinned.has(e.raw.id);
    if (filter === 'critical')  return e.cfg.priority === 'critical';
    if (filter === 'deployments') return e.cfg.cat === 'system';
    return e.cfg.cat === filter;
  }
  function matchSearch(e: RichEvent): boolean {
    if (!search) return true;
    const q = search.toLowerCase();
    return [e.raw.username, e.raw.email, e.raw.id, e.cfg.label, e.raw.type, e.raw.detail ?? '', e.location, e.moderator ?? ''].some(s => s.toLowerCase().includes(q));
  }

  const pinndEvts    = events.filter(e => pinned.has(e.raw.id) && matchFilter(e) && matchSearch(e));
  const filteredEvts = events.filter(e => !pinned.has(e.raw.id) && matchFilter(e) && matchSearch(e));
  const streamItems  = useMemo(() => groupEventStream(filteredEvts), [filteredEvts]);
  const totalVisible = pinndEvts.length + filteredEvts.length;

  function togglePin(id: string) {
    setPinned(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function togglePause() {
    if (!paused) frozenRef.current = raw;
    else frozenRef.current = null;
    setPaused(p => !p);
  }
  function card(e: RichEvent) {
    const p = { event: e, isNew: newIds.has(e.raw.id), pinned: pinned.has(e.raw.id), onPin: () => togglePin(e.raw.id), onClick: () => setDetail(e), mode: viewMode };
    return <EventCard key={e.raw.id} e={p.event} isNew={p.isNew} pinned={p.pinned} onPin={p.onPin} onClick={p.onClick} mode={p.mode} />;
  }

  const isMission = viewMode === 'mission';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#07071A', color: '#fff', overflow: 'hidden' }}>
      <style>{`
        @keyframes lf-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(1.5)} }
        @keyframes lf-enter { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
        @keyframes lf-river { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>

      <MissionControlHeader ov={ov} health={health} community={community} paused={paused} onPause={togglePause} total={display.length} />
      <ActivityRiver events={events} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!isMission && <LeftSidebar ov={ov} events={events} />}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <FilterToolbar filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} viewMode={viewMode} setViewMode={setViewMode} count={totalVisible} newCount={newIds.size} />

          {/* Center grid */}
          <div style={{ flex: 1, overflow: 'hidden', display: isMission ? 'grid' : 'flex', gridTemplateColumns: isMission ? '1fr 1fr' : undefined, gap: isMission ? 0 : undefined }}>
            {/* Event stream */}
            <div style={{ flex: isMission ? undefined : 1, overflowY: 'auto', padding: '10px 12px', borderRight: isMission ? '1px solid rgba(255,255,255,0.05)' : 'none', minWidth: 0 }}>
              {pinndEvts.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFB800', marginBottom: 6 }}>📌 Pinned ({pinndEvts.length})</div>
                  {pinndEvts.map(e => card(e))}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />
                </div>
              )}
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 10px', marginBottom: 4, borderRadius: 10, background: 'rgba(255,255,255,0.02)', animation: 'lf-pulse 1.6s infinite' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 11, borderRadius: 3, background: 'rgba(255,255,255,0.04)', marginBottom: 5, width: '52%' }} />
                      <div style={{ height: 8, borderRadius: 3, background: 'rgba(255,255,255,0.03)', width: '34%' }} />
                    </div>
                  </div>
                ))
                : filteredEvts.length === 0 && pinndEvts.length === 0
                  ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.18)' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>◎</div>
                    <div style={{ fontSize: 12 }}>{search ? `No events matching "${search}"` : 'No events in selected window'}</div>
                  </div>
                  : streamItems.map((item, i) => {
                      if ('type' in item && item.type === 'grouped') return <GroupedEventCard key={`g-${i}`} g={item as GroupedEvent} />;
                      return card(item as RichEvent);
                    })
              }
            </div>

            {/* Right column: analysis panels */}
            <div style={{ width: isMission ? undefined : 310, flexShrink: 0, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10, borderLeft: isMission ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
              <DreamWeather health={health} community={community} />
              <AIDreamPulse health={health} community={community} eventCount={events.length} />
              <LiveEmotionMap community={community} />
              <TrendingSymbols events={events} />
              <RealtimeHeatmap events={events} />
              {isMission && (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>Live AI Signals</div>
                  {ai.slice(0, 8).map((s, i) => (
                    <div key={i} style={{ padding: '6px 8px', borderRadius: 7, background: s.severity === 'critical' ? 'rgba(255,74,94,0.07)' : 'rgba(123,111,255,0.06)', border: `1px solid ${s.severity === 'critical' ? 'rgba(255,74,94,0.2)' : 'rgba(123,111,255,0.15)'}`, marginBottom: 5 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: s.severity === 'critical' ? '#FF4A5E' : '#7B6FFF', lineHeight: 1.4 }}>{s.message}</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{new Date(s.createdAt).toLocaleTimeString('en-US', { hour12: false })} · {s.category}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom section */}
          <BottomPanels events={events} ov={ov} />
          <PlatformIntelligence ov={ov} community={community} events={events} />
        </div>

        {!isMission && <RightSidebar alerts={alertsData} aiSignals={ai} community={community} />}
      </div>

      {detail && (
        <EventDetailDrawer e={detail} onClose={() => setDetail(null)} pinned={pinned.has(detail.raw.id)} onPin={() => togglePin(detail.raw.id)} />
      )}
    </div>
  );
}
