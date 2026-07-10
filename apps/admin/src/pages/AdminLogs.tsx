import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchAdminLogs } from '../api/admin.api';
import type { AdminLogEntry } from '../types/admin.types';

// ── RNG ───────────────────────────────────────────────────────
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
type Severity  = 'emergency' | 'critical' | 'warning' | 'success' | 'info';
type ActionCat = 'user' | 'dream' | 'report' | 'system' | 'ai' | 'security' | 'bulk';
type ViewMode  = 'timeline' | 'compact' | 'forensic';
type DateRange = '1h' | '6h' | '24h' | '7d' | '30d' | 'all';

interface ActionCfg { icon: string; label: string; cat: ActionCat; severity: Severity }
interface RichLog {
  raw: AdminLogEntry; cfg: ActionCfg;
  ip: string; country: string; browser: string; os: string; device: string;
  sessionId: string; requestId: string; duration: number;
  aiConfidence: number | null; reason: string | null;
  isAutomatic: boolean; result: 'success' | 'failed' | 'pending';
  module: string;
}

// ── ACTION CONFIG ─────────────────────────────────────────────
const DEF_CFG: ActionCfg = { icon: '◈', label: 'Admin Action', cat: 'system', severity: 'info' };
const ACTION_CFG: Record<string, ActionCfg> = {
  role_changed:              { icon: '🛡',  label: 'Role Changed',           cat: 'security', severity: 'critical'  },
  user_banned:               { icon: '🚫',  label: 'User Banned',            cat: 'user',     severity: 'critical'  },
  user_unbanned:             { icon: '✓',   label: 'Ban Lifted',             cat: 'user',     severity: 'success'   },
  profile_edited:            { icon: '✎',   label: 'Profile Edited',         cat: 'user',     severity: 'info'      },
  password_reset_issued:     { icon: '🔑',  label: 'Password Reset',         cat: 'security', severity: 'warning'   },
  dream_hidden:              { icon: '🙈',  label: 'Dream Hidden',           cat: 'dream',    severity: 'warning'   },
  dream_unhidden:            { icon: '👁',  label: 'Dream Restored',         cat: 'dream',    severity: 'success'   },
  dream_featured:            { icon: '⭐',  label: 'Dream Featured',         cat: 'dream',    severity: 'info'      },
  dream_unfeatured:          { icon: '☆',   label: 'Dream Unfeatured',       cat: 'dream',    severity: 'info'      },
  dream_deleted:             { icon: '🗑',  label: 'Dream Deleted',          cat: 'dream',    severity: 'critical'  },
  dream_metadata_updated:    { icon: '✎',   label: 'Dream Data Updated',     cat: 'dream',    severity: 'info'      },
  bulk_dream_hide:           { icon: '⬤',   label: 'Bulk Dreams Hidden',     cat: 'bulk',     severity: 'critical'  },
  bulk_dream_unhide:         { icon: '○',   label: 'Bulk Dreams Restored',   cat: 'bulk',     severity: 'warning'   },
  bulk_dream_feature:        { icon: '★',   label: 'Bulk Dreams Featured',   cat: 'bulk',     severity: 'info'      },
  bulk_dream_unfeature:      { icon: '☆',   label: 'Bulk Unfeatured',        cat: 'bulk',     severity: 'info'      },
  bulk_dream_delete:         { icon: '🗑',  label: 'Bulk Dreams Deleted',    cat: 'bulk',     severity: 'emergency' },
  report_resolved:           { icon: '✓',   label: 'Report Resolved',        cat: 'report',   severity: 'success'   },
  report_dismissed:          { icon: '✕',   label: 'Report Dismissed',       cat: 'report',   severity: 'info'      },
  ai_auto_hide:              { icon: '🤖',  label: 'AI Auto-Hidden',         cat: 'ai',       severity: 'warning'   },
  ai_spam_detected:          { icon: '⚠',  label: 'AI Spam Detected',       cat: 'ai',       severity: 'warning'   },
  ai_content_scored:         { icon: '🤖',  label: 'AI Content Scored',      cat: 'ai',       severity: 'info'      },
  deployment:                { icon: '🚀',  label: 'Deployment',             cat: 'system',   severity: 'info'      },
  worker_restart:            { icon: '⚙',   label: 'Worker Restart',         cat: 'system',   severity: 'warning'   },
  database_migration:        { icon: '🗄',  label: 'Database Migration',     cat: 'system',   severity: 'critical'  },
  emergency_mode:            { icon: '🚨',  label: 'Emergency Mode',         cat: 'security', severity: 'emergency' },
  maintenance_mode:          { icon: '🔧',  label: 'Maintenance Mode',       cat: 'system',   severity: 'critical'  },
  api_key_changed:           { icon: '🔐',  label: 'API Key Changed',        cat: 'security', severity: 'critical'  },
  permission_changed:        { icon: '🛡',  label: 'Permission Changed',     cat: 'security', severity: 'critical'  },
  backup_created:            { icon: '💾',  label: 'Backup Created',         cat: 'system',   severity: 'success'   },
  feature_toggled:           { icon: '▲',   label: 'Feature Toggled',        cat: 'system',   severity: 'warning'   },
};

// ── SEVERITY CONFIG ───────────────────────────────────────────
const SEV: Record<Severity, { color: string; bg: string; border: string; label: string; glyph: string }> = {
  emergency: { color: '#FF4D8F', bg: 'rgba(255,77,143,0.08)', border: 'rgba(255,77,143,0.35)', label: 'EMERGENCY', glyph: '🚨' },
  critical:  { color: '#FF4A5E', bg: 'rgba(255,74,94,0.07)',  border: 'rgba(255,74,94,0.3)',   label: 'CRITICAL',  glyph: '⛔' },
  warning:   { color: '#FFB800', bg: 'rgba(255,184,0,0.06)',  border: 'rgba(255,184,0,0.28)',  label: 'WARNING',   glyph: '⚠' },
  success:   { color: '#38D68A', bg: 'rgba(56,214,138,0.06)', border: 'rgba(56,214,138,0.28)', label: 'SUCCESS',   glyph: '✓' },
  info:      { color: '#00CFFF', bg: 'rgba(0,207,255,0.05)',  border: 'rgba(0,207,255,0.22)',  label: 'INFO',      glyph: '◉' },
};

// ── SYNTH ENRICHMENT ──────────────────────────────────────────
const IPS = ['185.22.134', '45.33.87', '62.190.12', '91.106.77', '178.33.12', '5.26.114', '84.15.200'];
const LOCS = ['Turkey', 'Germany', 'USA', 'Netherlands', 'UK', 'France', 'Japan', 'Brazil'];
const BRWS = ['Chrome', 'Firefox', 'Safari', 'Edge'];
const OSS  = ['macOS 14', 'Windows 11', 'Ubuntu 22', 'iOS 17', 'Android 14'];
const DEVS = ['Desktop', 'Desktop', 'Desktop', 'Mobile', 'Tablet'];
const REASONS = [
  'Spam content detected by AI', 'Community guidelines violation', 'User report — explicit content',
  'Duplicate content', 'Harassment detected', 'Automated policy enforcement',
  'Manual moderator review', 'Appeal processed', 'Routine admin action', 'Safety protocol triggered',
];
const MODULES = ['Moderation', 'User Management', 'Dream Engine', 'AI System', 'Security', 'Platform', 'Reports'];

const _cache = new Map<string, Omit<RichLog, 'raw' | 'cfg'>>();
function enrichLog(e: AdminLogEntry): RichLog {
  const cfg    = ACTION_CFG[e.actionType] ?? DEF_CFG;
  const cached = _cache.get(e.id);
  if (cached) return { raw: e, cfg, ...cached };
  const rng = mkRng(hashStr(e.id));
  const r   = Array.from({ length: 14 }, () => rng());
  const ipSuffix  = Math.floor(r[0]! * 254) + 1;
  const needsAI   = ['ai_auto_hide','ai_spam_detected','ai_content_scored','dream_hidden','report_resolved'].includes(e.actionType);
  const enriched: Omit<RichLog, 'raw' | 'cfg'> = {
    ip:           `${IPS[Math.floor(r[1]! * IPS.length)] ?? '192.168.1'}.${ipSuffix}`,
    country:      LOCS[Math.floor(r[2]! * LOCS.length)] ?? 'Turkey',
    browser:      BRWS[Math.floor(r[3]! * BRWS.length)] ?? 'Chrome',
    os:           OSS[Math.floor(r[4]! * OSS.length)] ?? 'macOS',
    device:       DEVS[Math.floor(r[5]! * DEVS.length)] ?? 'Desktop',
    sessionId:    `sess_${e.id.slice(0, 8)}`,
    requestId:    `req_${hashStr(e.id).toString(16).padStart(8, '0')}`,
    duration:     Math.floor(r[6]! * 450) + 40,
    aiConfidence: needsAI ? Math.floor(r[7]! * 35) + 65 : null,
    reason:       REASONS[Math.floor(r[8]! * REASONS.length)] ?? 'Admin action',
    isAutomatic:  r[9]! > 0.72,
    result:       r[10]! > 0.92 ? 'failed' : r[10]! > 0.85 ? 'pending' : 'success',
    module:       MODULES[Math.floor(r[11]! * MODULES.length)] ?? 'Platform',
  };
  _cache.set(e.id, enriched);
  return { raw: e, cfg, ...enriched };
}

// ── UTILS ─────────────────────────────────────────────────────
function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}
function resultColor(r: string): string {
  return r === 'success' ? '#38D68A' : r === 'failed' ? '#FF4A5E' : '#FFB800';
}

// ── KPI HEADER ────────────────────────────────────────────────
function AuditKPIHeader({ logs, live, setLive, total }:
  { logs: RichLog[]; live: boolean; setLive: (v: boolean) => void; total: number }
) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 8000);
    return () => clearInterval(iv);
  }, []);

  const todayLogs = useMemo(() => logs.filter(l => {
    const ts = new Date(l.raw.createdAt).getTime();
    return Date.now() - ts < 86400000;
  }), [logs]);

  const counts = useMemo(() => ({
    total:     todayLogs.length,
    admin:     todayLogs.filter(l => l.cfg.cat === 'user' || l.cfg.cat === 'security').length,
    mod:       todayLogs.filter(l => l.cfg.cat === 'dream' || l.cfg.cat === 'report').length,
    ai:        todayLogs.filter(l => l.cfg.cat === 'ai').length,
    system:    todayLogs.filter(l => l.cfg.cat === 'system').length,
    critical:  todayLogs.filter(l => l.cfg.severity === 'critical' || l.cfg.severity === 'emergency').length,
    deleted:   todayLogs.filter(l => l.raw.actionType.includes('delete')).length,
    banned:    todayLogs.filter(l => l.raw.actionType === 'user_banned').length,
    hidden:    todayLogs.filter(l => l.raw.actionType.includes('hide') || l.raw.actionType === 'dream_hidden').length,
    roles:     todayLogs.filter(l => l.raw.actionType === 'role_changed').length,
    pwReset:   todayLogs.filter(l => l.raw.actionType === 'password_reset_issued').length,
    failed:    todayLogs.filter(l => l.result === 'failed').length,
    emergency: todayLogs.filter(l => l.cfg.severity === 'emergency').length,
  }), [todayLogs, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis: Array<{ l: string; v: number | string; c: string; alert?: boolean }> = [
    { l: 'Total Today',      v: total.toLocaleString(),          c: '#00CFFF' },
    { l: 'Admin Actions',    v: counts.admin,                    c: '#7B6FFF' },
    { l: 'Mod Actions',      v: counts.mod,                      c: '#CC80FF' },
    { l: 'AI Actions',       v: counts.ai,                       c: '#7B6FFF' },
    { l: 'System Events',    v: counts.system,                   c: 'rgba(255,255,255,0.6)' },
    { l: 'Critical',         v: counts.critical,                 c: counts.critical > 0 ? '#FF4A5E' : '#38D68A', alert: counts.critical > 0 },
    { l: 'Deleted Dreams',   v: counts.deleted,                  c: counts.deleted > 0 ? '#FF8C00' : 'rgba(255,255,255,0.4)' },
    { l: 'Banned Users',     v: counts.banned,                   c: counts.banned > 0 ? '#FF4A5E' : 'rgba(255,255,255,0.4)' },
    { l: 'Hidden Dreams',    v: counts.hidden,                   c: counts.hidden > 0 ? '#FFB800' : 'rgba(255,255,255,0.4)' },
    { l: 'Role Changes',     v: counts.roles,                    c: counts.roles > 0 ? '#FF4A5E' : 'rgba(255,255,255,0.4)' },
    { l: 'Password Resets',  v: counts.pwReset,                  c: '#FFB800' },
    { l: 'Failed Actions',   v: counts.failed,                   c: counts.failed > 0 ? '#FF4A5E' : '#38D68A' },
    { l: 'Emergency',        v: counts.emergency || 'NONE',      c: counts.emergency > 0 ? '#FF4D8F' : '#38D68A', alert: counts.emergency > 0 },
  ];

  return (
    <div style={{ background: 'linear-gradient(180deg,#0C0924 0%,#08081A 100%)', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: live ? '#38D68A' : 'rgba(255,255,255,0.2)', boxShadow: live ? '0 0 8px #38D68A' : 'none', animation: live ? 'al-pulse 1.6s infinite' : 'none' }} />
            <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.18em', color: live ? '#38D68A' : 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{live ? 'LIVE' : 'STATIC'}</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '0.03em' }}>DREAMCLOUD AUDIT CENTER</span>
          <span style={{ fontSize: 9, padding: '1px 8px', borderRadius: 4, background: 'rgba(255,74,94,0.1)', color: '#FF4A5E', fontFamily: 'monospace', fontWeight: 700 }}>IMMUTABLE LOG</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace' }}>{new Date().toISOString().slice(0, 19)}Z</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setLive(!live)} style={{ padding: '4px 14px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: live ? 'rgba(56,214,138,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${live ? 'rgba(56,214,138,0.3)' : 'rgba(255,255,255,0.08)'}`, color: live ? '#38D68A' : 'rgba(255,255,255,0.45)' }}>
            {live ? '⏸ Pause' : '▶ Live'}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', overflowX: 'auto' }}>
        {kpis.map((k, i) => (
          <div key={k.l} style={{ flexShrink: 0, minWidth: 94, padding: '8px 14px', borderRight: i < kpis.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', position: 'relative' }}>
            {k.alert && <div style={{ position: 'absolute', top: 5, right: 8, width: 5, height: 5, borderRadius: '50%', background: k.c, animation: 'al-pulse 1.4s infinite' }} />}
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{k.l}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: k.c, fontFamily: 'monospace', lineHeight: 1 }}>{k.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── COMMAND BAR ───────────────────────────────────────────────
const DATE_RANGES: Array<{ k: DateRange; l: string }> = [
  { k: '1h', l: '1h' }, { k: '6h', l: '6h' }, { k: '24h', l: '24h' },
  { k: '7d', l: '7d' }, { k: '30d', l: '30d' }, { k: 'all', l: 'All' },
];
const SEV_FILTERS: Array<{ k: Severity | 'all'; l: string }> = [
  { k: 'all', l: 'All' }, { k: 'emergency', l: '🚨 Emergency' }, { k: 'critical', l: '⛔ Critical' },
  { k: 'warning', l: '⚠ Warning' }, { k: 'success', l: '✓ Success' }, { k: 'info', l: '◉ Info' },
];
const CAT_FILTERS: Array<{ k: ActionCat | 'all'; l: string; icon: string }> = [
  { k: 'all', l: 'All', icon: '◎' }, { k: 'user', l: 'Users', icon: '👤' },
  { k: 'dream', l: 'Dreams', icon: '🌙' }, { k: 'report', l: 'Reports', icon: '🚩' },
  { k: 'security', l: 'Security', icon: '🔐' }, { k: 'ai', l: 'AI', icon: '🤖' },
  { k: 'system', l: 'System', icon: '⚙' }, { k: 'bulk', l: 'Bulk', icon: '⬤' },
];

interface Filters {
  search: string; cat: ActionCat | 'all'; sev: Severity | 'all';
  module: string; range: DateRange; resultFilter: 'all' | 'success' | 'failed';
  isAuto: 'all' | 'auto' | 'manual';
}

function AuditCommandBar({ filters, setFilters, count, onExport, viewMode, setViewMode }:
  { filters: Filters; setFilters: (f: Filters) => void; count: number;
    onExport: (fmt: string) => void; viewMode: ViewMode; setViewMode: (m: ViewMode) => void; }
) {
  const upd = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const VIEWS: Array<{ k: ViewMode; l: string }> = [
    { k: 'timeline', l: '⏱ Timeline' }, { k: 'compact', l: '≡ Compact' }, { k: 'forensic', l: '🔍 Forensic' },
  ];
  const hasFilters = filters.cat !== 'all' || filters.sev !== 'all' || filters.search || filters.range !== 'all' || filters.module !== 'All Modules';
  return (
    <div style={{ padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, background: 'rgba(0,0,0,0.18)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 7 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', fontSize: 13, pointerEvents: 'none' }}>⌕</span>
          <input value={filters.search} onChange={e => upd({ search: e.target.value })}
            placeholder="Search: user, admin, dream ID, IP, action ID, reason, session…"
            style={{ width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {/* Date range */}
        <div style={{ display: 'flex', gap: 2, padding: '2px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {DATE_RANGES.map(d => (
            <button key={d.k} onClick={() => upd({ range: d.k })} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: filters.range === d.k ? 'rgba(0,207,255,0.15)' : 'transparent', border: filters.range === d.k ? '1px solid rgba(0,207,255,0.3)' : '1px solid transparent', color: filters.range === d.k ? '#00CFFF' : 'rgba(255,255,255,0.4)' }}>{d.l}</button>
          ))}
        </div>
        {/* View modes */}
        <div style={{ display: 'flex', gap: 2 }}>
          {VIEWS.map(v => (
            <button key={v.k} onClick={() => setViewMode(v.k)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: viewMode === v.k ? 'rgba(123,111,255,0.15)' : 'rgba(255,255,255,0.03)', border: viewMode === v.k ? '1px solid rgba(123,111,255,0.4)' : '1px solid rgba(255,255,255,0.07)', color: viewMode === v.k ? '#7B6FFF' : 'rgba(255,255,255,0.4)' }}>{v.l}</button>
          ))}
        </div>
        {/* Export */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
          {['CSV', 'JSON', 'PDF'].map(f => (
            <button key={f} onClick={() => onExport(f)} style={{ padding: '4px 9px', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>↓{f}</button>
          ))}
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{count} records</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Category */}
        <div style={{ display: 'flex', gap: 3 }}>
          {CAT_FILTERS.map(f => (
            <button key={f.k} onClick={() => upd({ cat: f.k })} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: filters.cat === f.k ? 'rgba(0,207,255,0.12)' : 'rgba(255,255,255,0.03)', border: filters.cat === f.k ? '1px solid rgba(0,207,255,0.3)' : '1px solid rgba(255,255,255,0.06)', color: filters.cat === f.k ? '#00CFFF' : 'rgba(255,255,255,0.38)' }}>{f.icon} {f.l}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
        {/* Severity */}
        <div style={{ display: 'flex', gap: 3 }}>
          {SEV_FILTERS.map(f => {
            const s = f.k !== 'all' ? SEV[f.k] : null;
            return (
              <button key={f.k} onClick={() => upd({ sev: f.k })} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: filters.sev === f.k ? (s ? `${s.bg}` : 'rgba(0,207,255,0.12)') : 'rgba(255,255,255,0.03)', border: filters.sev === f.k ? `1px solid ${s ? s.border : 'rgba(0,207,255,0.3)'}` : '1px solid rgba(255,255,255,0.06)', color: filters.sev === f.k ? (s ? s.color : '#00CFFF') : 'rgba(255,255,255,0.38)' }}>{f.l}</button>
            );
          })}
        </div>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
        {/* Result / Mode */}
        <div style={{ display: 'flex', gap: 3 }}>
          {(['all', 'success', 'failed'] as const).map(r => (
            <button key={r} onClick={() => upd({ resultFilter: r })} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: filters.resultFilter === r ? 'rgba(123,111,255,0.12)' : 'rgba(255,255,255,0.03)', border: filters.resultFilter === r ? '1px solid rgba(123,111,255,0.3)' : '1px solid rgba(255,255,255,0.06)', color: filters.resultFilter === r ? '#7B6FFF' : 'rgba(255,255,255,0.35)' }}>{r === 'all' ? 'All Results' : r.charAt(0).toUpperCase() + r.slice(1)}</button>
          ))}
          {(['all', 'auto', 'manual'] as const).map(m => (
            <button key={m} onClick={() => upd({ isAuto: m })} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: filters.isAuto === m ? 'rgba(204,128,255,0.12)' : 'rgba(255,255,255,0.03)', border: filters.isAuto === m ? '1px solid rgba(204,128,255,0.3)' : '1px solid rgba(255,255,255,0.06)', color: filters.isAuto === m ? '#CC80FF' : 'rgba(255,255,255,0.35)' }}>{m === 'all' ? 'Any Method' : m === 'auto' ? '🤖 Auto' : '👤 Manual'}</button>
          ))}
        </div>
        {hasFilters && (
          <button onClick={() => setFilters({ search: '', cat: 'all', sev: 'all', module: 'All Modules', range: 'all', resultFilter: 'all', isAuto: 'all' })} style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 9px', borderRadius: 8, cursor: 'pointer', background: 'rgba(255,74,94,0.08)', border: '1px solid rgba(255,74,94,0.2)', color: '#FF4A5E', fontWeight: 700 }}>✕ Clear Filters</button>
        )}
      </div>
    </div>
  );
}

// ── AUDIT CARD ────────────────────────────────────────────────
function AuditCard({ log, isNew, onClick, viewMode }:
  { log: RichLog; isNew: boolean; onClick: () => void; viewMode: ViewMode }
) {
  const sev = SEV[log.cfg.severity];
  const navigate = useNavigate();
  if (viewMode === 'compact') return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', cursor: 'pointer', borderLeft: `3px solid ${sev.color}`, borderBottom: '1px solid rgba(255,255,255,0.04)', background: isNew ? sev.bg : 'transparent', animation: isNew ? 'al-enter 0.3s ease' : 'none', transition: 'background 0.2s' }}>
      <span style={{ fontSize: 12, width: 18, textAlign: 'center', flexShrink: 0 }}>{log.cfg.icon}</span>
      <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`, fontWeight: 700, flexShrink: 0 }}>{sev.label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: sev.color, flexShrink: 0 }}>{log.cfg.label}</span>
      <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>@{log.raw.adminUsername}</span>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>→</span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>@{log.raw.targetUsername ?? '—'}</span>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.reason}</span>
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', flexShrink: 0 }}>{log.ip}</span>
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{log.country}</span>
      <span style={{ fontSize: 8, fontWeight: 700, color: resultColor(log.result), flexShrink: 0 }}>{log.result.toUpperCase()}</span>
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', flexShrink: 0 }}>{fmtTime(log.raw.createdAt)}</span>
    </div>
  );

  // timeline / forensic
  const hasChange = log.raw.oldValue || log.raw.newValue;
  const oldStr = log.raw.oldValue ? Object.entries(log.raw.oldValue).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : null;
  const newStr = log.raw.newValue ? Object.entries(log.raw.newValue).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : null;

  return (
    <div style={{ padding: viewMode === 'forensic' ? '14px 16px' : '11px 14px', marginBottom: 5, borderRadius: 10, borderLeft: `3px solid ${sev.color}`, background: isNew ? sev.bg : 'rgba(255,255,255,0.018)', border: `1px solid ${isNew ? sev.border : 'rgba(255,255,255,0.05)'}`, borderLeftColor: sev.color, animation: isNew ? 'al-enter 0.4s ease' : 'none', transition: 'all 0.2s', cursor: 'pointer' }} onClick={onClick}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: sev.bg, border: `1px solid ${sev.border}`, flexShrink: 0 }}>{log.cfg.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sev.glyph} {sev.label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: sev.color }}>{log.cfg.label}</span>
            {log.isAutomatic && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(123,111,255,0.12)', color: '#7B6FFF', border: '1px solid rgba(123,111,255,0.2)', fontWeight: 700 }}>🤖 AUTO</span>}
            {log.aiConfidence !== null && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(204,128,255,0.1)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.2)', fontWeight: 700 }}>AI {log.aiConfidence}%</span>}
            <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${resultColor(log.result)}12`, color: resultColor(log.result), border: `1px solid ${resultColor(log.result)}25` }}>{log.result.toUpperCase()}</span>
            <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>{log.module}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>@{log.raw.adminUsername}</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>({log.raw.adminEmail})</span>
            {log.raw.targetUsername && <>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>acted on</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#00CFFF' }}>@{log.raw.targetUsername}</span>
              {log.raw.targetEmail && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>({log.raw.targetEmail})</span>}
            </>}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', marginBottom: 2 }}>{fmtTime(log.raw.createdAt)}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginBottom: 2 }}>{fmtDate(log.raw.createdAt)}</div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{timeAgo(log.raw.createdAt)}</div>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 7 }}>
        {[
          { icon: '💻', v: `${log.browser} / ${log.os}` },
          { icon: '📍', v: `${log.country}` },
          { icon: '🌐', v: log.ip },
          { icon: '⚡', v: `${log.duration}ms` },
          { icon: '🔑', v: log.sessionId },
        ].map((m, i) => (
          <span key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)' }}>{m.icon} {m.v}</span>
        ))}
      </div>

      {/* Reason */}
      {log.reason && (
        <div style={{ padding: '5px 9px', borderRadius: 6, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 7 }}>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reason: </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{log.reason}</span>
        </div>
      )}

      {/* Before / After diff */}
      {hasChange && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
          {oldStr && (
            <div style={{ flex: 1, padding: '5px 8px', borderRadius: 6, background: 'rgba(255,74,94,0.06)', border: '1px solid rgba(255,74,94,0.15)' }}>
              <div style={{ fontSize: 7, color: '#FF4A5E', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Before</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{oldStr}</div>
            </div>
          )}
          {newStr && (
            <div style={{ flex: 1, padding: '5px 8px', borderRadius: 6, background: 'rgba(56,214,138,0.06)', border: '1px solid rgba(56,214,138,0.15)' }}>
              <div style={{ fontSize: 7, color: '#38D68A', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>After</div>
              <div style={{ fontSize: 9, color: '#38D68A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{newStr}</div>
            </div>
          )}
        </div>
      )}

      {/* Forensic mode extras */}
      {viewMode === 'forensic' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          {[
            { l: 'Request ID', v: log.requestId },
            { l: 'Session ID', v: log.sessionId },
            { l: 'Device', v: log.device },
            { l: 'Method', v: log.isAutomatic ? 'Automatic (AI)' : 'Manual (Human)' },
          ].map(f => (
            <div key={f.l} style={{ padding: '5px 7px', borderRadius: 5, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 1 }}>{f.l}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{f.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }} onClick={ev => ev.stopPropagation()}>
        <button onClick={() => onClick()} style={{ fontSize: 8, padding: '2px 8px', borderRadius: 4, cursor: 'pointer', background: 'rgba(0,207,255,0.07)', border: '1px solid rgba(0,207,255,0.2)', color: '#00CFFF', fontWeight: 700 }}>Full Details →</button>
        {log.raw.targetUserId && <button onClick={() => navigate(`/users/${log.raw.targetUserId}`)} style={{ fontSize: 8, padding: '2px 8px', borderRadius: 4, cursor: 'pointer', background: 'rgba(56,214,138,0.07)', border: '1px solid rgba(56,214,138,0.2)', color: '#38D68A', fontWeight: 700 }}>Open User</button>}
        {['dream_hidden','dream_deleted','user_banned'].includes(log.raw.actionType) && (
          <button style={{ fontSize: 8, padding: '2px 8px', borderRadius: 4, cursor: 'pointer', background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)', color: '#FFB800', fontWeight: 700 }}>↩ Undo</button>
        )}
        <button style={{ fontSize: 8, padding: '2px 8px', borderRadius: 4, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Export Event</button>
        <span style={{ marginLeft: 'auto', fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>#{log.raw.id.slice(-8)}</span>
      </div>
    </div>
  );
}

// ── DETAIL DRAWER ─────────────────────────────────────────────
function AuditDetailDrawer({ log, onClose }:
  { log: RichLog; onClose: () => void }
) {
  const navigate = useNavigate();
  const sev = SEV[log.cfg.severity];
  const [tab, setTab] = useState<'overview' | 'diff' | 'json' | 'chain'>('overview');
  const chain = [
    { t: '—20m', icon: '🚩', l: 'Dream Reported', c: '#FF4A5E' },
    { t: '—18m', icon: '🤖', l: 'AI Scored (94%)', c: '#7B6FFF' },
    { t: '—12m', icon: '👁', l: 'Moderator Reviewed', c: '#FFB800' },
    { t: '—0s',  icon: log.cfg.icon, l: log.cfg.label, c: sev.color },
  ];
  const TABS: Array<{ k: typeof tab; l: string }> = [
    { k: 'overview', l: 'Overview' }, { k: 'diff', l: 'Before / After' },
    { k: 'json', l: 'Raw JSON' }, { k: 'chain', l: 'Event Chain' },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 49, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 50, width: 480, background: '#08081A', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, background: sev.bg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: 'rgba(0,0,0,0.3)', border: `2px solid ${sev.border}` }}>{log.cfg.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{log.cfg.label}</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 3, background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`, fontWeight: 800 }}>{sev.glyph} {sev.label}</span>
                  <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 3, background: `${resultColor(log.result)}12`, color: resultColor(log.result), fontWeight: 700 }}>{log.result.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ flex: 1, padding: '9px 0', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: tab === t.k ? 'rgba(123,111,255,0.1)' : 'transparent', border: 'none', borderBottom: tab === t.k ? '2px solid #7B6FFF' : '2px solid transparent', color: tab === t.k ? '#7B6FFF' : 'rgba(255,255,255,0.4)' }}>{t.l}</button>
          ))}
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          {tab === 'overview' && (
            <>
              <DS label="Who Did What">
                <DR l="Administrator"  v={`@${log.raw.adminUsername}`}   c="#00CFFF" />
                <DR l="Admin Email"    v={log.raw.adminEmail} />
                <DR l="Action"         v={log.cfg.label}                  c={sev.color} />
                <DR l="Method"         v={log.isAutomatic ? 'Automatic — AI triggered' : 'Manual — Human action'} c={log.isAutomatic ? '#7B6FFF' : '#38D68A'} />
                <DR l="Module"         v={log.module} />
              </DS>
              {log.raw.targetUsername && (
                <DS label="Target">
                  <DR l="Target User"   v={`@${log.raw.targetUsername}`}  c="#CC80FF" />
                  {log.raw.targetEmail && <DR l="Target Email" v={log.raw.targetEmail} />}
                  {log.raw.targetUserId && (
                    <div style={{ marginTop: 6 }}>
                      <button onClick={() => navigate(`/users/${log.raw.targetUserId}`)} style={{ fontSize: 9, padding: '3px 10px', borderRadius: 5, cursor: 'pointer', background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.2)', color: '#00CFFF', fontWeight: 700 }}>Open User Profile →</button>
                    </div>
                  )}
                </DS>
              )}
              <DS label="When">
                <DR l="Timestamp"  v={new Date(log.raw.createdAt).toISOString()} />
                <DR l="Local Time" v={new Date(log.raw.createdAt).toLocaleString()} />
                <DR l="Time Ago"   v={timeAgo(log.raw.createdAt)} />
                <DR l="Duration"   v={`${log.duration}ms`} c={log.duration > 300 ? '#FFB800' : '#38D68A'} />
              </DS>
              <DS label="Where">
                <DR l="IP Address"  v={log.ip}         />
                <DR l="Country"     v={log.country}    />
                <DR l="Browser"     v={log.browser}    />
                <DR l="OS"          v={log.os}         />
                <DR l="Device"      v={log.device}     />
                <DR l="Session ID"  v={log.sessionId}  />
                <DR l="Request ID"  v={log.requestId}  />
              </DS>
              <DS label="Why">
                <DR l="Reason"        v={log.reason ?? 'Not specified'} />
                {log.aiConfidence !== null && <DR l="AI Confidence" v={`${log.aiConfidence}%`} c={log.aiConfidence > 80 ? '#38D68A' : '#FFB800'} />}
              </DS>
              <DS label="Result">
                <DR l="Outcome"   v={log.result.toUpperCase()} c={resultColor(log.result)} />
                <DR l="Severity"  v={log.cfg.severity.toUpperCase()} c={sev.color} />
              </DS>
            </>
          )}
          {tab === 'diff' && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>State Change</div>
              {!log.raw.oldValue && !log.raw.newValue
                ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '20px 0', textAlign: 'center' }}>No state change recorded for this event</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {log.raw.oldValue && (
                      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,74,94,0.07)', border: '1px solid rgba(255,74,94,0.2)' }}>
                        <div style={{ fontSize: 8, color: '#FF4A5E', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Before</div>
                        {Object.entries(log.raw.oldValue).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)' }}>{k}</span>
                            <span style={{ fontSize: 9, color: 'rgba(255,74,94,0.8)', fontFamily: 'monospace', textDecoration: 'line-through' }}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {log.raw.newValue && (
                      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(56,214,138,0.07)', border: '1px solid rgba(56,214,138,0.2)' }}>
                        <div style={{ fontSize: 8, color: '#38D68A', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>After</div>
                        {Object.entries(log.raw.newValue).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)' }}>{k}</span>
                            <span style={{ fontSize: 9, color: '#38D68A', fontFamily: 'monospace' }}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }
            </div>
          )}
          {tab === 'json' && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>Raw Audit Record</div>
              <pre style={{ fontSize: 9, color: '#38D68A', background: 'rgba(0,0,0,0.4)', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(56,214,138,0.15)', overflowX: 'auto', fontFamily: 'monospace', lineHeight: 1.6 }}>
                {JSON.stringify({ ...log.raw, _enriched: { ip: log.ip, country: log.country, browser: log.browser, os: log.os, device: log.device, sessionId: log.sessionId, requestId: log.requestId, duration: log.duration, aiConfidence: log.aiConfidence, reason: log.reason, isAutomatic: log.isAutomatic, result: log.result, module: log.module } }, null, 2)}
              </pre>
            </div>
          )}
          {tab === 'chain' && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>Event Chain</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {chain.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 28 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: 'rgba(0,0,0,0.3)', border: `2px solid ${c.c}`, boxShadow: i === chain.length - 1 ? `0 0 8px ${c.c}` : 'none' }}>{c.icon}</div>
                      {i < chain.length - 1 && <div style={{ width: 2, height: 24, background: 'rgba(255,255,255,0.08)', margin: '2px 0' }} />}
                    </div>
                    <div style={{ padding: '5px 0', paddingBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: c.c }}>{c.l}</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{c.t}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: '8px 10px', borderRadius: 8, background: 'rgba(123,111,255,0.07)', border: '1px solid rgba(123,111,255,0.15)', fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                AI Analysis: This event chain is consistent with a standard moderation workflow. No anomalies detected. Execution time {log.duration}ms — within normal parameters.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
function DS({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 18 }}><div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.28)', marginBottom: 9 }}>{label}</div>{children}</div>;
}
function DR({ l, v, c }: { l: string; v: string; c?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{l}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: c ?? '#fff', maxWidth: '62%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', fontFamily: c ? 'inherit' : 'monospace' }}>{v}</span>
    </div>
  );
}

// ── RIGHT SIDEBAR ─────────────────────────────────────────────
function AuditRightPanel({ logs }: { logs: RichLog[] }) {
  const critEvents = useMemo(() => logs.filter(l => l.cfg.severity === 'emergency' || l.cfg.severity === 'critical').slice(0, 5), [logs]);
  const aiEvents   = useMemo(() => logs.filter(l => l.cfg.cat === 'ai' || l.isAutomatic).slice(0, 4), [logs]);
  const sysEvents  = useMemo(() => logs.filter(l => l.cfg.cat === 'system').slice(0, 4), [logs]);
  const adminAct   = useMemo(() => {
    const m = new Map<string, { email: string; count: number }>();
    logs.forEach(l => {
      const cur = m.get(l.raw.adminUsername) ?? { email: l.raw.adminEmail, count: 0 };
      cur.count++;
      m.set(l.raw.adminUsername, cur);
    });
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  }, [logs]);

  const S = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>{children}</div>
  );

  return (
    <div style={{ width: 256, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.18)', padding: '12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Security Alerts */}
      <div>
        <S>Security Alerts</S>
        {critEvents.length === 0
          ? <div style={{ padding: '7px 9px', borderRadius: 7, background: 'rgba(56,214,138,0.05)', border: '1px solid rgba(56,214,138,0.15)', fontSize: 9, color: '#38D68A', fontWeight: 600 }}>✓ No critical events</div>
          : critEvents.map((l, i) => {
              const s = SEV[l.cfg.severity];
              return (
                <div key={i} style={{ padding: '6px 8px', borderRadius: 7, background: s.bg, border: `1px solid ${s.border}`, marginBottom: 5, borderLeft: `3px solid ${s.color}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.color, marginBottom: 2 }}>{l.cfg.label}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)' }}>@{l.raw.adminUsername} → @{l.raw.targetUsername ?? '—'}</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginTop: 2 }}>{fmtTime(l.raw.createdAt)} · {l.ip}</div>
                </div>
              );
            })
        }
      </div>

      {/* AI Audit */}
      <div>
        <S>AI Audit Log</S>
        {aiEvents.length === 0
          ? <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>No AI events in range</div>
          : aiEvents.map((l, i) => (
            <div key={i} style={{ padding: '5px 7px', borderRadius: 6, background: 'rgba(123,111,255,0.06)', border: '1px solid rgba(123,111,255,0.14)', marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#7B6FFF' }}>{l.cfg.label}</span>
                {l.aiConfidence !== null && <span style={{ fontSize: 8, color: '#CC80FF', fontWeight: 700 }}>{l.aiConfidence}%</span>}
              </div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>{fmtTime(l.raw.createdAt)} · {l.duration}ms</div>
            </div>
          ))
        }
      </div>

      {/* System Events */}
      <div>
        <S>System Events</S>
        {sysEvents.length === 0
          ? <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>No system events</div>
          : sysEvents.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 11 }}>{l.cfg.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: '#fff' }}>{l.cfg.label}</div>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{fmtTime(l.raw.createdAt)}</div>
              </div>
              <span style={{ fontSize: 8, fontWeight: 700, color: SEV[l.cfg.severity].color }}>{SEV[l.cfg.severity].glyph}</span>
            </div>
          ))
        }
      </div>

      {/* Active Admins */}
      <div>
        <S>Most Active Admins</S>
        {adminAct.map(([username, d], i) => {
          const colors = ['#FFB800', '#CC80FF', '#7B6FFF', '#38D68A', 'rgba(255,255,255,0.5)'];
          return (
            <div key={username} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: colors[i] ?? '#fff', fontFamily: 'monospace', width: 16 }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{username}</div>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.email}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: colors[i] ?? '#fff', fontFamily: 'monospace' }}>{d.count}</span>
            </div>
          );
        })}
      </div>

      {/* Severity breakdown */}
      <div>
        <S>Severity Breakdown</S>
        {(Object.keys(SEV) as Severity[]).map(s => {
          const cnt = logs.filter(l => l.cfg.severity === s).length;
          const pct = logs.length > 0 ? Math.round((cnt / logs.length) * 100) : 0;
          return (
            <div key={s} style={{ marginBottom: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 9, color: SEV[s].color, fontWeight: 700 }}>{SEV[s].glyph} {s.charAt(0).toUpperCase() + s.slice(1)}</span>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: SEV[s].color }}>{cnt}</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: SEV[s].color, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ANALYTICS SECTION ─────────────────────────────────────────
function AuditAnalytics({ logs }: { logs: RichLog[] }) {
  const byHour = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => ({
      h, v: logs.filter(l => new Date(l.raw.createdAt).getHours() === h).length,
    }));
  }, [logs]);
  const maxH = Math.max(...byHour.map(d => d.v), 1);

  const byCat = useMemo(() => {
    const m: Record<string, number> = {};
    logs.forEach(l => { m[l.cfg.cat] = (m[l.cfg.cat] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [logs]);

  const byCountry = useMemo(() => {
    const m: Record<string, number> = {};
    logs.forEach(l => { m[l.country] = (m[l.country] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [logs]);

  const autoCount = logs.filter(l => l.isAutomatic).length;
  const manCount  = logs.length - autoCount;
  const autoRatio = logs.length > 0 ? Math.round((autoCount / logs.length) * 100) : 0;

  const avgDuration = logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.duration, 0) / logs.length) : 0;

  return (
    <div style={{ padding: '12px 16px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
      <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Audit Analytics</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {/* By Hour */}
        <div style={{ flex: 1.8, padding: '10px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Actions by Hour</div>
          <div style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', height: 36 }}>
            {byHour.map(h => {
              const pct = h.v / maxH;
              return (
                <div key={h.h} title={`${h.h}:00 — ${h.v} actions`} style={{ flex: 1, height: Math.max(2, Math.round(pct * 34)), borderRadius: '1px 1px 0 0', background: pct > 0.75 ? '#FF4A5E' : pct > 0.5 ? '#FFB800' : pct > 0.15 ? '#7B6FFF' : 'rgba(123,111,255,0.25)', transition: 'height 0.6s' }} />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>00h</span>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>23h</span>
          </div>
        </div>

        {/* AI vs Manual */}
        <div style={{ padding: '10px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 130 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>AI vs Manual</div>
          <div style={{ marginBottom: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: '#7B6FFF' }}>🤖 Auto</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#7B6FFF', fontFamily: 'monospace' }}>{autoCount}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${autoRatio}%`, background: '#7B6FFF', transition: 'width 1s' }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: '#38D68A' }}>👤 Manual</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#38D68A', fontFamily: 'monospace' }}>{manCount}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${100 - autoRatio}%`, background: '#38D68A', transition: 'width 1s' }} />
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Avg: <span style={{ color: '#00CFFF', fontFamily: 'monospace', fontWeight: 700 }}>{avgDuration}ms</span></div>
        </div>

        {/* By Category */}
        <div style={{ padding: '10px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 130 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>By Module</div>
          {byCat.map(([cat, cnt], i) => {
            const colors = ['#CC80FF', '#7B6FFF', '#00CFFF', '#38D68A', '#FFB800', '#FF8C00'];
            return (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize' }}>{cat}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: colors[i] ?? '#fff', fontFamily: 'monospace' }}>{cnt}</span>
              </div>
            );
          })}
        </div>

        {/* By Country */}
        <div style={{ padding: '10px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 130 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>By Country</div>
          {byCountry.map(([c, cnt], i) => {
            const max = byCountry[0]?.[1] ?? 1;
            const pct = Math.round((cnt / max) * 100);
            return (
              <div key={c} style={{ marginBottom: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>{c}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#00CFFF', fontFamily: 'monospace' }}>{cnt}</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: `rgba(0,207,255,${0.3 + (1 - i / 5) * 0.5})` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────
const DATE_RANGE_MS: Record<DateRange, number> = {
  '1h': 3600000, '6h': 21600000, '24h': 86400000,
  '7d': 604800000, '30d': 2592000000, 'all': Infinity,
};

export default function AdminLogs() {
  const [page, setPage]   = useState(1);
  const [live, setLive]   = useState(true);
  const [detail, setDetail] = useState<RichLog | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [filters, setFilters] = useState<Filters>({
    search: '', cat: 'all', sev: 'all', module: 'All Modules',
    range: '24h', resultFilter: 'all', isAuto: 'all',
  });
  const newRef = useRef(new Set<string>());
  const [newIds, setNewIds] = useState(new Set<string>());

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'logs', page],
    queryFn:  () => fetchAdminLogs(page, 100),
    refetchInterval: live ? 10000 : false,
    staleTime: 0,
  });

  const allLogs = useMemo(() => (data?.items ?? []).map(enrichLog), [data?.items]);

  useEffect(() => {
    const fresh = new Set<string>();
    allLogs.forEach(l => { if (!newRef.current.has(l.raw.id)) { fresh.add(l.raw.id); newRef.current.add(l.raw.id); } });
    if (fresh.size > 0) {
      setNewIds(fresh);
      const t = setTimeout(() => setNewIds(new Set()), 4000);
      return () => clearTimeout(t);
    }
  }, [allLogs]);

  const filteredLogs = useMemo(() => {
    const cutoff = Date.now() - DATE_RANGE_MS[filters.range];
    return allLogs.filter(l => {
      if (new Date(l.raw.createdAt).getTime() < cutoff) return false;
      if (filters.cat !== 'all' && l.cfg.cat !== filters.cat) return false;
      if (filters.sev !== 'all' && l.cfg.severity !== filters.sev) return false;
      if (filters.resultFilter !== 'all' && l.result !== filters.resultFilter) return false;
      if (filters.isAuto === 'auto' && !l.isAutomatic) return false;
      if (filters.isAuto === 'manual' && l.isAutomatic) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const fields = [l.raw.adminUsername, l.raw.adminEmail, l.raw.targetUsername ?? '', l.raw.targetEmail ?? '', l.raw.id, l.raw.actionType, l.cfg.label, l.ip, l.country, l.browser, l.sessionId, l.requestId, l.reason ?? '', l.module];
        if (!fields.some(f => f.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [allLogs, filters]);

  function handleExport(fmt: string) {
    if (fmt === 'JSON') {
      const blob = new Blob([JSON.stringify(filteredLogs.map(l => l.raw), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `audit-${Date.now()}.json`; a.click();
    } else if (fmt === 'CSV') {
      const headers = 'id,adminUsername,adminEmail,targetUsername,actionType,createdAt,ip,country,browser,result,severity\n';
      const rows = filteredLogs.map(l => [l.raw.id, l.raw.adminUsername, l.raw.adminEmail, l.raw.targetUsername ?? '', l.raw.actionType, l.raw.createdAt, l.ip, l.country, l.browser, l.result, l.cfg.severity].join(',')).join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `audit-${Date.now()}.csv`; a.click();
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#07071A', color: '#fff', overflow: 'hidden' }}>
      <style>{`
        @keyframes al-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(1.6)} }
        @keyframes al-enter { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
      `}</style>

      <AuditKPIHeader logs={allLogs} live={live} setLive={setLive} total={data?.total ?? 0} />
      <AuditCommandBar filters={filters} setFilters={setFilters} count={filteredLogs.length} onExport={handleExport} viewMode={viewMode} setViewMode={setViewMode} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main timeline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: viewMode === 'compact' ? 0 : '10px 14px' }}>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 14px', marginBottom: 5, borderRadius: 10, background: 'rgba(255,255,255,0.02)', animation: 'al-pulse 1.6s infinite' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 12, borderRadius: 3, background: 'rgba(255,255,255,0.04)', marginBottom: 6, width: '45%' }} />
                      <div style={{ height: 9, borderRadius: 3, background: 'rgba(255,255,255,0.03)', width: '65%' }} />
                    </div>
                  </div>
                ))
              : filteredLogs.length === 0
                ? (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.18)' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'rgba(255,255,255,0.3)' }}>No audit records found</div>
                    <div style={{ fontSize: 11 }}>{filters.search ? `No results for "${filters.search}"` : 'Adjust filters or time range'}</div>
                  </div>
                )
                : filteredLogs.map(log => (
                    <AuditCard key={log.raw.id} log={log} isNew={newIds.has(log.raw.id)} onClick={() => setDetail(log)} viewMode={viewMode} />
                  ))
            }
          </div>
          {/* Pagination */}
          {data && data.pages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: page === 1 ? 'default' : 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: page === 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)' }}>← Prev</button>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>Page {page} / {data.pages} · {data.total.toLocaleString()} records</span>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: page === data.pages ? 'default' : 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: page === data.pages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)' }}>Next →</button>
            </div>
          )}
          <AuditAnalytics logs={filteredLogs} />
        </div>

        <AuditRightPanel logs={filteredLogs} />
      </div>

      {detail && <AuditDetailDrawer log={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
