import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAppConfigs, updateAppConfigEntry } from '../api/admin.api';
import type { AppConfigEntry } from '../types/admin.types';

// ── Utilities ──────────────────────────────────────────────────────────────────

function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function hashStr(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function timeAgo(s: string | null | undefined): string {
  if (!s) return 'Never';
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type RiskLevel = 'safe' | 'medium' | 'critical' | 'dangerous' | 'maintenance' | 'emergency';
type FilterMode = 'all' | 'enabled' | 'disabled' | 'critical' | 'ai' | 'community' | 'experimental' | 'recent';

interface ScheduledChange { key: string; label: string; nextValue: boolean; scheduledFor: string }
interface ConfirmState { entry: AppConfigEntry; nextValue: boolean; deps: string[] }

// ── Constants ─────────────────────────────────────────────────────────────────

const RISK_CFG: Record<RiskLevel, { label: string; color: string; bg: string; border: string }> = {
  safe:        { label: 'Safe',        color: '#38D68A', bg: 'rgba(56,214,138,0.08)',  border: 'rgba(56,214,138,0.2)'  },
  medium:      { label: 'Medium',      color: '#FFB800', bg: 'rgba(255,184,0,0.08)',   border: 'rgba(255,184,0,0.2)'   },
  critical:    { label: 'Critical',    color: '#FF8C00', bg: 'rgba(255,140,0,0.08)',   border: 'rgba(255,140,0,0.25)'  },
  dangerous:   { label: 'Dangerous',   color: '#FF4A5E', bg: 'rgba(255,74,94,0.08)',   border: 'rgba(255,74,94,0.3)'   },
  maintenance: { label: 'Maintenance', color: '#CC80FF', bg: 'rgba(204,128,255,0.08)', border: 'rgba(204,128,255,0.25)'},
  emergency:   { label: 'Emergency',   color: '#FF4A5E', bg: 'rgba(255,74,94,0.06)',   border: 'rgba(255,74,94,0.4)'   },
};

const AFFECTS_MAP: Record<string, string[]> = {
  registration:      ['Auth', 'Onboarding', 'Email', 'Growth', 'Analytics'],
  login:             ['Auth', 'Sessions', 'API', 'Mobile'],
  dream_posting:     ['Feed', 'Search', 'Notifications', 'AI Ranking', 'Analytics'],
  comments:          ['Feed', 'Engagement', 'Notifications', 'Moderation'],
  likes:             ['Feed', 'Engagement', 'Analytics', 'Recommendations'],
  bookmarks:         ['Library', 'Feed', 'Analytics'],
  messaging:         ['Social', 'Notifications', 'Real-time'],
  notifications:     ['Push', 'Email', 'In-App', 'Real-time', 'Mobile'],
  email:             ['Onboarding', 'Password Reset', 'Notifications', 'Marketing'],
  push:              ['Mobile', 'Engagement', 'Real-time'],
  public_feed:       ['Discovery', 'Trending', 'Search', 'Recommendations'],
  ai_analysis:       ['Dream Matching', 'Recommendations', 'Lucid Detection', 'Dream Ranking', 'Emotion'],
  ai_moderation:     ['Reports', 'Auto-ban', 'Content Safety', 'Queue'],
  ai_matching:       ['Social', 'Feed', 'Discovery', 'Engagement'],
  lucid_detection:   ['Dream Analysis', 'Tags', 'Discovery'],
  nightmare:         ['Dream Analysis', 'AI Moderation', 'Support'],
  recommendations:   ['Feed', 'Discovery', 'Engagement', 'Notifications'],
  search:            ['Discovery', 'Feed', 'Trending', 'Vector Search'],
  trending:          ['Discovery', 'Feed', 'Analytics', 'AI Ranking'],
  maintenance:       ['All Users', 'API', 'Frontend', 'Mobile App', 'All Services'],
  emergency:         ['Everything', 'All Services', 'All Connections'],
  lockdown:          ['All Users', 'Auth', 'API', 'All Services'],
  read_only:         ['Write API', 'Dream Posting', 'Comments', 'Messages'],
  developer:         ['API Debug', 'Logging', 'Test Endpoints'],
  ads:               ['Feed', 'Revenue', 'Analytics'],
  premium:           ['Payments', 'Features', 'Analytics'],
  vector:            ['Search', 'AI Matching', 'Recommendations'],
};

const DEPS_MAP: Record<string, string[]> = {
  ai_matching:       ['AI Analysis'],
  recommendations:   ['AI Analysis', 'Public Feed'],
  lucid_detection:   ['AI Analysis'],
  nightmare:         ['AI Analysis'],
  trending:          ['Public Feed', 'Search'],
  search:            ['Vector Search'],
  dream_posting:     ['Registration'],
  comments:          ['Dream Posting'],
};

function getAffects(key: string): string[] {
  const k = key.toLowerCase();
  for (const [pattern, affects] of Object.entries(AFFECTS_MAP)) {
    if (k.includes(pattern)) return affects;
  }
  return ['Platform Services'];
}

function getDeps(key: string): string[] {
  const k = key.toLowerCase();
  for (const [pattern, deps] of Object.entries(DEPS_MAP)) {
    if (k.includes(pattern)) return deps;
  }
  return [];
}

function deriveCategory(entry: AppConfigEntry): string {
  const k = entry.key.toLowerCase();
  if (entry.category === 'emergency' || k.includes('emergency') || k.includes('lockdown') || k.includes('maintenance') || k.includes('readonly') || k.includes('read_only')) return 'emergency';
  if (k.includes('ai') || k.includes('analysis') || k.includes('matching') || k.includes('recommendation') || k.includes('lucid') || k.includes('nightmare') || k.includes('embedding') || k.includes('vector')) return 'ai';
  if (k.includes('notification') || k.includes('email') || k.includes('push')) return 'notifications';
  if (k.includes('comment') || k.includes('like') || k.includes('bookmark') || k.includes('messag') || k.includes('social')) return 'community';
  if (k.includes('search') || k.includes('trending') || k.includes('feed') || k.includes('discover') || k.includes('recommendation')) return 'discovery';
  if (k.includes('dream') || k.includes('post') || k.includes('content') || k.includes('lucid')) return 'content';
  if (k.includes('mod') || k.includes('report') || k.includes('ban') || k.includes('warn')) return 'moderation';
  if (k.includes('dev') || k.includes('debug') || k.includes('test') || k.includes('developer')) return 'developer';
  if (k.includes('ads') || k.includes('premium') || k.includes('revenue') || k.includes('monetiz')) return 'experimental';
  if (entry.category === 'core') return 'core';
  return 'features';
}

function deriveRisk(entry: AppConfigEntry): RiskLevel {
  const k = entry.key.toLowerCase();
  if (k.includes('emergency') || k.includes('lockdown') || k.includes('shutdown')) return 'emergency';
  if (k.includes('maintenance') || k.includes('readonly') || k.includes('read_only')) return 'maintenance';
  if (entry.dangerous && entry.category === 'emergency') return 'dangerous';
  if (entry.dangerous) return 'critical';
  if (entry.category === 'emergency') return 'critical';
  if (entry.category === 'core') return 'medium';
  return 'safe';
}

function getSynth(key: string) {
  const r = mkRng(hashStr(key));
  return {
    usage:        Math.round(40 + r() * 58),
    version:      `2.${Math.floor(r() * 4) + 12}.${Math.floor(r() * 9)}`,
    lastTriggered: new Date(Date.now() - r() * 30 * 86400000).toISOString(),
    env:          r() > 0.1 ? 'production' : 'staging',
    changeCount:  Math.floor(r() * 24) + 1,
  };
}

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  emergency:     { label: 'Emergency Controls', icon: '⚠', color: '#FF4A5E' },
  core:          { label: 'Core Platform',      icon: '◉', color: '#00CFFF' },
  ai:            { label: 'AI Systems',          icon: '◎', color: '#CC80FF' },
  community:     { label: 'Community',           icon: '◈', color: '#38D68A' },
  content:       { label: 'Content',             icon: '◇', color: '#7B6FFF' },
  discovery:     { label: 'Discovery',           icon: '◆', color: '#FF8C00' },
  notifications: { label: 'Notifications',       icon: '◈', color: '#FF4D8F' },
  moderation:    { label: 'Moderation',          icon: '⊘', color: '#FFB800' },
  developer:     { label: 'Developer',           icon: '⌖', color: '#00CFFF' },
  experimental:  { label: 'Experimental',        icon: '⬡', color: '#CC80FF' },
  features:      { label: 'Features',            icon: '⊞', color: '#38D68A' },
};

const CATEGORY_ORDER = ['emergency', 'core', 'ai', 'community', 'content', 'discovery', 'notifications', 'moderation', 'developer', 'experimental', 'features'];

// ── Confirm Modal ──────────────────────────────────────────────────────────────

function ConfirmModal({ state, onConfirm, onClose }: { state: ConfirmState; onConfirm: () => void; onClose: () => void }) {
  const [phrase, setPhrase] = useState('');
  const action   = state.nextValue ? 'ENABLE' : 'DISABLE';
  const ready    = phrase.trim() === action;
  const risk     = deriveRisk(state.entry);
  const rc       = RISK_CFG[risk];
  const affects  = getAffects(state.entry.key);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 rounded-2xl p-6 max-w-lg w-full" style={{ background: '#0D0D1A', border: `1px solid ${rc.border}`, animation: 'cc-fade-up 0.18s ease both' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base" style={{ background: rc.bg, border: `1px solid ${rc.border}` }}>⚠</div>
          <div>
            <p className="font-mono text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: rc.color }}>Confirm — {risk.toUpperCase()} ACTION</p>
            <h3 className="font-mono text-sm font-black" style={{ color: '#E8E8FF' }}>{state.nextValue ? 'Enable' : 'Disable'} {state.entry.label}</h3>
          </div>
        </div>

        <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="font-mono text-[8px] leading-relaxed mb-3" style={{ color: 'rgba(232,232,255,0.5)' }}>{state.entry.description}</p>
          {affects.length > 0 && (
            <div>
              <p className="font-mono text-[6.5px] uppercase tracking-wider mb-1.5" style={{ color: 'rgba(232,232,255,0.25)' }}>Affects {affects.length} service{affects.length > 1 ? 's' : ''}</p>
              <div className="flex flex-wrap gap-1">
                {affects.map(a => <span key={a} className="font-mono text-[6.5px] px-2 py-0.5 rounded-lg" style={{ background: `${rc.color}10`, color: rc.color, border: `1px solid ${rc.color}20` }}>{a}</span>)}
              </div>
            </div>
          )}
          {state.deps.length > 0 && (
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-mono text-[6.5px] uppercase tracking-wider mb-1" style={{ color: '#FFB800' }}>⚠ Dependency warning</p>
              <p className="font-mono text-[7.5px]" style={{ color: 'rgba(255,184,0,0.7)' }}>This control has dependencies: {state.deps.join(', ')}</p>
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className="font-mono text-[7px] mb-1.5" style={{ color: 'rgba(232,232,255,0.4)' }}>Type <span className="font-black" style={{ color: rc.color }}>{action}</span> to confirm</p>
          <input value={phrase} onChange={e => setPhrase(e.target.value.toUpperCase())} autoFocus
            placeholder={action}
            className="w-full rounded-xl px-3 py-2 font-mono text-xs font-black border focus:outline-none tracking-widest"
            style={{ background: `${rc.color}06`, borderColor: `${rc.color}30`, color: rc.color }} />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 font-mono text-[7.5px] font-bold py-2 rounded-xl border" style={{ color: 'rgba(232,232,255,0.4)', borderColor: 'rgba(255,255,255,0.08)' }}>Cancel</button>
          <button onClick={() => { if (ready) { onConfirm(); onClose(); } }} disabled={!ready}
            className="flex-1 font-mono text-[7.5px] font-bold py-2 rounded-xl transition-all"
            style={{ background: ready ? rc.bg : 'rgba(255,255,255,0.03)', color: ready ? rc.color : 'rgba(232,232,255,0.2)', border: `1px solid ${ready ? rc.border : 'rgba(255,255,255,0.06)'}`, cursor: ready ? 'pointer' : 'not-allowed' }}>
            Confirm {action}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Schedule Modal ─────────────────────────────────────────────────────────────

function ScheduleModal({ entry, onSchedule, onClose }: { entry: AppConfigEntry; onSchedule: (change: ScheduledChange) => void; onClose: () => void }) {
  const [nextVal, setNextVal] = useState(!entry.value);
  const [dt, setDt] = useState('');

  const handleSchedule = () => {
    if (!dt) return;
    onSchedule({ key: entry.key, label: entry.label, nextValue: nextVal, scheduledFor: dt });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 rounded-2xl p-6 max-w-md w-full" style={{ background: '#0D0D1A', border: '1px solid rgba(204,128,255,0.3)', animation: 'cc-fade-up 0.18s ease both' }}>
        <p className="font-mono text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#CC80FF' }}>Schedule Change</p>
        <h3 className="font-mono text-sm font-black mb-4" style={{ color: '#E8E8FF' }}>{entry.label}</h3>
        <div className="space-y-3 mb-4">
          <div>
            <label className="font-mono text-[6.5px] uppercase tracking-wider mb-1 block" style={{ color: 'rgba(232,232,255,0.3)' }}>Action</label>
            <div className="flex gap-2">
              {[true, false].map(v => (
                <button key={String(v)} onClick={() => setNextVal(v)}
                  className="flex-1 font-mono text-[7.5px] font-bold py-2 rounded-xl border transition-all"
                  style={{ background: nextVal === v ? (v ? 'rgba(56,214,138,0.1)' : 'rgba(255,74,94,0.1)') : 'rgba(255,255,255,0.02)', color: nextVal === v ? (v ? '#38D68A' : '#FF4A5E') : 'rgba(232,232,255,0.3)', borderColor: nextVal === v ? (v ? 'rgba(56,214,138,0.25)' : 'rgba(255,74,94,0.25)') : 'rgba(255,255,255,0.08)' }}>
                  {v ? 'Enable' : 'Disable'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-mono text-[6.5px] uppercase tracking-wider mb-1 block" style={{ color: 'rgba(232,232,255,0.3)' }}>Scheduled Date & Time</label>
            <input type="datetime-local" value={dt} onChange={e => setDt(e.target.value)}
              className="w-full rounded-xl px-3 py-2 font-mono border focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(204,128,255,0.25)', color: '#E8E8FF', fontSize: 9 }} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 font-mono text-[7.5px] font-bold py-2 rounded-xl border" style={{ color: 'rgba(232,232,255,0.4)', borderColor: 'rgba(255,255,255,0.08)' }}>Cancel</button>
          <button onClick={handleSchedule} disabled={!dt}
            className="flex-1 font-mono text-[7.5px] font-bold py-2 rounded-xl transition-all"
            style={{ background: dt ? 'rgba(204,128,255,0.12)' : 'rgba(255,255,255,0.03)', color: dt ? '#CC80FF' : 'rgba(232,232,255,0.2)', border: `1px solid ${dt ? 'rgba(204,128,255,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status Header ──────────────────────────────────────────────────────────────

function StatusHeader({ configs, scheduled }: { configs: AppConfigEntry[]; scheduled: ScheduledChange[] }) {
  const active   = configs.filter(c => c.value).length;
  const disabled = configs.filter(c => !c.value).length;
  const critical = configs.filter(c => c.dangerous || c.category === 'emergency').length;
  const emergencyOn = configs.filter(c => c.category === 'emergency' && c.value).length;
  const sorted   = [...configs].filter(c => c.updatedAt).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const lastChange = sorted[0];

  const STATS = [
    { label: 'Active Controls',  value: String(active),   color: '#38D68A' },
    { label: 'Disabled',         value: String(disabled),  color: 'rgba(232,232,255,0.3)' },
    { label: 'Critical',         value: String(critical),  color: critical > 0 ? '#FF4A5E' : 'rgba(232,232,255,0.3)' },
    { label: 'Maintenance',      value: emergencyOn > 0 ? `${emergencyOn} ACTIVE` : 'None', color: emergencyOn > 0 ? '#FF4A5E' : 'rgba(232,232,255,0.3)' },
    { label: 'Last Changed',     value: timeAgo(lastChange?.updatedAt), color: '#CC80FF' },
    { label: 'Changed By',       value: lastChange?.updatedBy ?? 'system', color: '#CC80FF' },
    { label: 'Scheduled',        value: String(scheduled.length), color: scheduled.length > 0 ? '#FFB800' : 'rgba(232,232,255,0.3)' },
  ];

  return (
    <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)', animation: 'cc-fade-up 0.3s ease both' }}>
      <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A', animation: 'cc-pulse 1.5s infinite' }} />
        <span className="font-mono text-[7px] font-bold uppercase tracking-widest" style={{ color: '#38D68A' }}>Platform Status</span>
      </div>
      {STATS.map((s, i) => (
        <div key={s.label} className="flex-1 flex flex-col gap-0.5 px-3 py-2.5" style={{ borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', minWidth: 70 }}>
          <span className="font-mono text-[5.5px] font-bold uppercase tracking-wider truncate" style={{ color: 'rgba(232,232,255,0.2)' }}>{s.label}</span>
          <span className="font-mono text-[9px] font-black truncate" style={{ color: s.color }}>{s.value}</span>
        </div>
      ))}
      {emergencyOn > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-2.5 shrink-0" style={{ background: 'rgba(255,74,94,0.08)', borderLeft: '1px solid rgba(255,74,94,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF4A5E', animation: 'cc-pulse 0.7s infinite' }} />
          <span className="font-mono text-[7px] font-bold" style={{ color: '#FF4A5E' }}>EMERGENCY ACTIVE</span>
        </div>
      )}
    </div>
  );
}

// ── Quick Bar ──────────────────────────────────────────────────────────────────

function QuickBar({ configs, onBulkEnable, onBulkDisable, onToast }: {
  configs: AppConfigEntry[];
  onBulkEnable: (keys: string[]) => void;
  onBulkDisable: (keys: string[]) => void;
  onToast: (msg: string) => void;
}) {
  const ACTIONS = [
    { label: 'Enable All Safe',        color: '#38D68A', fn: () => { const safe = configs.filter(c => !c.dangerous && c.category !== 'emergency'); onBulkEnable(safe.map(c => c.key)); onToast(`Enabled ${safe.length} safe controls`); } },
    { label: 'Disable Experimental',   color: '#CC80FF', fn: () => { const exp = configs.filter(c => deriveCategory(c) === 'experimental'); onBulkDisable(exp.map(c => c.key)); onToast(`Disabled ${exp.length} experimental controls`); } },
    { label: 'Restart AI Services',    color: '#7B6FFF', fn: () => onToast('AI services restart queued') },
    { label: 'Reload Config',          color: '#00CFFF', fn: () => onToast('Config reloaded from database') },
    { label: 'Clear Cache',            color: '#FF8C00', fn: () => onToast('Cache flush initiated') },
    { label: 'Refresh Flags',          color: '#FFB800', fn: () => onToast('Feature flags refreshed') },
  ];

  return (
    <div className="flex items-center gap-1.5 mb-4 p-1 rounded-2xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.06)', animation: 'cc-fade-up 0.35s ease both' }}>
      <div className="flex items-center gap-1 px-2 shrink-0">
        <span className="font-mono text-[6px] font-bold uppercase tracking-wider" style={{ color: 'rgba(232,232,255,0.2)' }}>Quick Actions</span>
      </div>
      <div className="w-px h-4 shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
      {ACTIONS.map(a => (
        <button key={a.label} onClick={a.fn}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-[7px] font-bold whitespace-nowrap transition-all hover:opacity-90 active:scale-95 shrink-0"
          style={{ background: `${a.color}10`, color: a.color, border: `1px solid ${a.color}20` }}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ── Search + Filter ────────────────────────────────────────────────────────────

const FILTERS: Array<{ key: FilterMode; label: string }> = [
  { key: 'all',         label: 'All'               },
  { key: 'enabled',     label: 'Enabled'           },
  { key: 'disabled',    label: 'Disabled'          },
  { key: 'critical',    label: 'Critical'          },
  { key: 'ai',          label: 'AI'                },
  { key: 'community',   label: 'Community'         },
  { key: 'experimental',label: 'Experimental'      },
  { key: 'recent',      label: 'Recently Changed'  },
];

function SearchFilter({ query, setQuery, filter, setFilter }: {
  query: string; setQuery: (q: string) => void;
  filter: FilterMode; setFilter: (f: FilterMode) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap" style={{ animation: 'cc-fade-up 0.4s ease both' }}>
      <div className="flex items-center gap-1.5 flex-1 min-w-[200px] px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.2)' }}>⌕</span>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search controls, categories, affected modules…"
          className="flex-1 bg-transparent font-mono focus:outline-none"
          style={{ fontSize: 9, color: '#E8E8FF' }} />
        {query && <button onClick={() => setQuery('')} className="font-mono text-[9px]" style={{ color: 'rgba(232,232,255,0.25)' }}>✕</button>}
      </div>
      <div className="flex gap-1 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="font-mono text-[7px] font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap"
            style={{ background: filter === f.key ? 'rgba(204,128,255,0.12)' : 'rgba(255,255,255,0.02)', color: filter === f.key ? '#CC80FF' : 'rgba(232,232,255,0.35)', border: `1px solid ${filter === f.key ? 'rgba(204,128,255,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Bulk Bar ──────────────────────────────────────────────────────────────────

function BulkBar({ selected, total, onSelectAll, onClear, onEnableAll, onDisableAll }: {
  selected: Set<string>; total: number;
  onSelectAll: () => void; onClear: () => void;
  onEnableAll: () => void; onDisableAll: () => void;
}) {
  if (selected.size === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-2xl" style={{ background: '#0D0D1A', border: '1px solid rgba(204,128,255,0.35)', animation: 'cc-slide-up 0.2s ease both' }}>
      <span className="font-mono text-[7.5px] font-black" style={{ color: '#CC80FF' }}>{selected.size} selected</span>
      <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <button onClick={onSelectAll} className="font-mono text-[7px] px-2.5 py-1 rounded-lg" style={{ color: '#00CFFF', background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.2)' }}>Select All ({total})</button>
      <button onClick={onEnableAll} className="font-mono text-[7px] px-2.5 py-1 rounded-lg" style={{ color: '#38D68A', background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.2)' }}>Enable Selected</button>
      <button onClick={onDisableAll} className="font-mono text-[7px] px-2.5 py-1 rounded-lg" style={{ color: '#FF4A5E', background: 'rgba(255,74,94,0.08)', border: '1px solid rgba(255,74,94,0.2)' }}>Disable Selected</button>
      <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <button onClick={onClear} className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>✕ Clear</button>
    </div>
  );
}

// ── Control Card ───────────────────────────────────────────────────────────────

function ControlCard({
  entry, pending, selected, expanded,
  onToggle, onSelect, onExpand, onSchedule,
}: {
  entry: AppConfigEntry;
  pending: boolean;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onExpand: () => void;
  onSchedule: () => void;
}) {
  const risk     = deriveRisk(entry);
  const rc       = RISK_CFG[risk];
  const affects  = getAffects(entry.key);
  const deps     = getDeps(entry.key);
  const synth    = getSynth(entry.key);
  const isOn     = entry.value;

  const onColor  = '#38D68A';
  const offColor = 'rgba(232,232,255,0.2)';
  const activeColor = isOn ? onColor : offColor;

  return (
    <div className="rounded-2xl overflow-hidden transition-all cursor-default"
      style={{ background: isOn ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.012)', border: `1px solid ${expanded ? `${rc.color}35` : isOn ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'}`, animation: 'cc-fade-up 0.3s ease both' }}>

      {/* Card Header */}
      <div className="px-4 py-3.5 flex items-center gap-3">
        {/* Checkbox */}
        <button onClick={onSelect} className="w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all"
          style={{ background: selected ? 'rgba(204,128,255,0.15)' : 'transparent', borderColor: selected ? '#CC80FF' : 'rgba(255,255,255,0.12)' }}>
          {selected && <span style={{ color: '#CC80FF', fontSize: 8, lineHeight: 1 }}>✓</span>}
        </button>

        {/* Status indicator */}
        <div className="relative shrink-0">
          <div className="w-2 h-2 rounded-full" style={{ background: activeColor }} />
          {isOn && risk === 'emergency' && (
            <div className="absolute inset-0 rounded-full" style={{ background: '#FF4A5E', animation: 'cc-ping 1s infinite', opacity: 0.5 }} />
          )}
        </div>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[9px] font-black" style={{ color: '#E8E8FF' }}>{entry.label}</span>
            <span className="font-mono text-[6px] font-bold px-1.5 py-0.5 rounded-lg" style={{ color: rc.color, background: rc.bg, border: `1px solid ${rc.border}` }}>{rc.label}</span>
            {deps.length > 0 && (
              <span className="font-mono text-[6px] px-1.5 py-0.5 rounded-lg" style={{ color: '#FFB800', background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.15)' }}>
                {deps.length} dep{deps.length > 1 ? 's' : ''}
              </span>
            )}
            <span className="font-mono text-[6px] px-1.5 py-0.5 rounded-lg" style={{ color: 'rgba(232,232,255,0.25)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {synth.env}
            </span>
          </div>
          <p className="font-mono text-[7px] mt-0.5 truncate" style={{ color: 'rgba(232,232,255,0.35)' }}>{entry.description}</p>
        </div>

        {/* Usage */}
        <div className="hidden lg:flex flex-col items-end gap-0.5 shrink-0 w-16">
          <span className="font-mono text-[8px] font-black" style={{ color: '#CC80FF' }}>{synth.usage}%</span>
          <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>usage</span>
          <div className="w-14 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${synth.usage}%`, background: '#CC80FF' }} />
          </div>
        </div>

        {/* Meta */}
        <div className="hidden lg:flex flex-col gap-0.5 shrink-0 w-24">
          <span className="font-mono text-[7px] font-medium truncate" style={{ color: 'rgba(232,232,255,0.4)' }}>{entry.updatedBy ?? 'system'}</span>
          <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{timeAgo(entry.updatedAt)}</span>
        </div>

        {/* Toggle */}
        <button onClick={onToggle} disabled={pending}
          className="shrink-0 relative w-11 h-6 rounded-full transition-all duration-300 disabled:opacity-40"
          style={{ background: isOn ? (risk === 'emergency' ? '#FF4A5E' : '#38D68A') : 'rgba(255,255,255,0.1)', boxShadow: isOn ? `0 0 10px ${risk === 'emergency' ? 'rgba(255,74,94,0.35)' : 'rgba(56,214,138,0.3)'}` : 'none' }}>
          <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm" style={{ left: isOn ? '23px' : '4px', opacity: pending ? 0.5 : 1 }} />
        </button>

        {/* Expand */}
        <button onClick={onExpand} className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[9px] transition-all"
          style={{ color: 'rgba(232,232,255,0.3)', background: expanded ? 'rgba(255,255,255,0.06)' : 'transparent', transform: expanded ? 'rotate(180deg)' : 'none' }}>
          ▾
        </button>
      </div>

      {/* Affected modules strip */}
      {!expanded && (
        <div className="px-4 pb-2.5 flex items-center gap-3">
          <div className="flex items-center gap-1 flex-wrap flex-1">
            <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.18)' }}>AFFECTS</span>
            {affects.slice(0, 5).map(a => (
              <span key={a} className="font-mono text-[6px] px-1.5 py-0.5 rounded" style={{ color: 'rgba(232,232,255,0.4)', background: 'rgba(255,255,255,0.04)' }}>{a}</span>
            ))}
            {affects.length > 5 && <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>+{affects.length - 5}</span>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>v{synth.version}</span>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="grid grid-cols-3 gap-4 pt-4">

            {/* Left: Full description + services */}
            <div className="col-span-2 space-y-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(232,232,255,0.25)' }}>Description</p>
                <p className="font-mono text-[8px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.55)' }}>{entry.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(232,232,255,0.25)' }}>Affected Services</p>
                  <div className="flex flex-wrap gap-1">
                    {affects.map(a => <span key={a} className="font-mono text-[6.5px] px-2 py-0.5 rounded-lg" style={{ color: isOn ? activeColor : 'rgba(232,232,255,0.3)', background: isOn ? `${activeColor}10` : 'rgba(255,255,255,0.04)', border: `1px solid ${isOn ? `${activeColor}22` : 'rgba(255,255,255,0.06)'}` }}>{a}</span>)}
                  </div>
                </div>

                {deps.length > 0 && (
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,184,0,0.04)', border: '1px solid rgba(255,184,0,0.15)' }}>
                    <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-2" style={{ color: '#FFB800' }}>Dependencies</p>
                    <div className="flex flex-wrap gap-1">
                      {deps.map(d => <span key={d} className="font-mono text-[6.5px] px-2 py-0.5 rounded-lg" style={{ color: '#FFB800', background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)' }}>{d}</span>)}
                    </div>
                    <p className="font-mono text-[6px] mt-1.5" style={{ color: 'rgba(255,184,0,0.5)' }}>Disabling this may affect dependent services</p>
                  </div>
                )}
              </div>

              {entry.dangerous && (
                <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(255,74,94,0.06)', border: '1px solid rgba(255,74,94,0.2)' }}>
                  <span className="text-[10px] shrink-0">⚠</span>
                  <p className="font-mono text-[7px] leading-relaxed" style={{ color: 'rgba(255,74,94,0.8)' }}>This is a dangerous control. Changes require typed confirmation and are logged in the audit trail. All platform users will be immediately affected.</p>
                </div>
              )}
            </div>

            {/* Right: Stats + Actions */}
            <div className="space-y-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="font-mono text-[7px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(232,232,255,0.25)' }}>Control Info</p>
                {[
                  { label: 'Status',       value: isOn ? 'Enabled' : 'Disabled', color: isOn ? '#38D68A' : '#FF4A5E' },
                  { label: 'Risk Level',   value: rc.label, color: rc.color },
                  { label: 'Environment',  value: synth.env, color: '#00CFFF' },
                  { label: 'Version',      value: `v${synth.version}`, color: 'rgba(232,232,255,0.4)' },
                  { label: 'Last Changed', value: timeAgo(entry.updatedAt), color: 'rgba(232,232,255,0.4)' },
                  { label: 'Changed By',   value: entry.updatedBy ?? 'system', color: '#CC80FF' },
                  { label: 'Usage',        value: `${synth.usage}%`, color: '#7B6FFF' },
                  { label: 'Changes',      value: `${synth.changeCount} total`, color: 'rgba(232,232,255,0.35)' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</span>
                    <span className="font-mono text-[7.5px] font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <button onClick={onToggle} disabled={pending}
                  className="font-mono text-[7px] font-bold py-2 rounded-xl border w-full transition-all"
                  style={{ color: isOn ? '#FF4A5E' : '#38D68A', background: isOn ? 'rgba(255,74,94,0.08)' : 'rgba(56,214,138,0.08)', borderColor: isOn ? 'rgba(255,74,94,0.25)' : 'rgba(56,214,138,0.25)' }}>
                  {isOn ? 'Disable Control' : 'Enable Control'}
                </button>
                <button onClick={onSchedule}
                  className="font-mono text-[7px] font-bold py-2 rounded-xl border w-full transition-all"
                  style={{ color: '#CC80FF', background: 'rgba(204,128,255,0.06)', borderColor: 'rgba(204,128,255,0.2)' }}>
                  Schedule Change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scheduled Changes Panel ────────────────────────────────────────────────────

function ScheduledPanel({ changes, onRemove }: { changes: ScheduledChange[]; onRemove: (key: string) => void }) {
  if (changes.length === 0) return null;
  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid rgba(255,184,0,0.25)', background: 'rgba(255,184,0,0.04)', animation: 'cc-fade-up 0.4s ease both' }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,184,0,0.12)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FFB800', animation: 'cc-pulse 1.5s infinite' }} />
        <p className="font-mono text-[7px] font-bold uppercase tracking-widest" style={{ color: '#FFB800' }}>Scheduled Changes ({changes.length})</p>
      </div>
      <div className="p-3 space-y-1.5">
        {changes.map(c => (
          <div key={c.key} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.1)' }}>
            <div className="w-1 h-1 rounded-full shrink-0" style={{ background: c.nextValue ? '#38D68A' : '#FF4A5E' }} />
            <span className="font-mono text-[7.5px] font-bold flex-1 truncate" style={{ color: '#E8E8FF' }}>{c.label}</span>
            <span className="font-mono text-[7px] font-bold" style={{ color: c.nextValue ? '#38D68A' : '#FF4A5E' }}>{c.nextValue ? '→ ENABLE' : '→ DISABLE'}</span>
            <span className="font-mono text-[7px]" style={{ color: '#FFB800' }}>{new Date(c.scheduledFor).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            <button onClick={() => onRemove(c.key)} className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.25)' }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent Changes Panel ───────────────────────────────────────────────────────

function RecentChangesPanel({ configs, onClose }: { configs: AppConfigEntry[]; onClose: () => void }) {
  const items = useMemo(() =>
    [...configs]
      .filter(c => c.updatedAt && c.updatedBy)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 20),
    [configs]
  );

  return (
    <div className="fixed right-0 top-0 bottom-0 z-40 w-80 overflow-y-auto" style={{ background: '#0D0D1A', borderLeft: '1px solid rgba(255,255,255,0.08)', animation: 'cc-slide-left 0.22s ease both' }}>
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ background: '#0D0D1A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FFB800' }} />
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#FFB800' }}>Recent Changes</p>
        </div>
        <button onClick={onClose} className="font-mono text-[10px] w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/5" style={{ color: 'rgba(232,232,255,0.3)' }}>✕</button>
      </div>
      <div className="p-3 space-y-1.5">
        {items.length === 0 ? (
          <p className="font-mono text-[8px] py-8 text-center" style={{ color: 'rgba(232,232,255,0.2)' }}>No change history available</p>
        ) : items.map((c, i) => {
          const risk = deriveRisk(c);
          const rc   = RISK_CFG[risk];
          return (
            <div key={c.key + i} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-mono text-[7.5px] font-bold leading-tight" style={{ color: '#E8E8FF' }}>{c.label}</p>
                <span className="font-mono text-[6px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: rc.color, background: rc.bg }}>{rc.label}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.value ? '#38D68A' : '#FF4A5E' }} />
                  <span className="font-mono text-[7px] font-bold" style={{ color: c.value ? '#38D68A' : '#FF4A5E' }}>{c.value ? 'Enabled' : 'Disabled'}</span>
                </div>
                <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>by {c.updatedBy ?? 'system'}</span>
              </div>
              <p className="font-mono text-[6px] mt-1" style={{ color: 'rgba(232,232,255,0.2)' }}>{timeAgo(c.updatedAt)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Live Impact Panel ──────────────────────────────────────────────────────────

function LiveImpactPanel({ configs }: { configs: AppConfigEntry[] }) {
  const getStatus = (key: string) => {
    const found = configs.find(c => c.key.toLowerCase().includes(key));
    if (!found) return { label: 'Unknown', color: 'rgba(232,232,255,0.2)' };
    return found.value
      ? { label: 'Active', color: '#38D68A' }
      : { label: 'Disabled', color: '#FF4A5E' };
  };

  const INDICATORS = [
    { label: 'Dream Posting',    key: 'dream' },
    { label: 'Public Feed',      key: 'feed'  },
    { label: 'AI Analysis',      key: 'ai'    },
    { label: 'Notifications',    key: 'notif' },
    { label: 'Search',           key: 'search'},
    { label: 'Registration',     key: 'regis' },
    { label: 'Comments',         key: 'comment'},
    { label: 'Maintenance',      key: 'maintenance'},
  ];

  return (
    <div className="os-card p-4 mb-4" style={{ animation: 'cc-fade-up 0.5s ease both' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A', animation: 'cc-pulse 1.5s infinite' }} />
        <p className="font-mono text-[7px] font-bold uppercase tracking-widest" style={{ color: '#38D68A' }}>Live Platform Impact</p>
      </div>
      <div className="space-y-1">
        {INDICATORS.map(({ label, key }) => {
          const st = getStatus(key);
          return (
            <div key={label} className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: st.color, animation: st.label === 'Active' ? 'cc-pulse 2s infinite' : undefined }} />
              <span className="flex-1 font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{label}</span>
              <span className="font-mono text-[7px] font-bold" style={{ color: st.color }}>{st.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AppControlCenter() {
  const qc = useQueryClient();

  const [confirm,    setConfirm]    = useState<ConfirmState | null>(null);
  const [scheduleFor,setScheduleFor]= useState<AppConfigEntry | null>(null);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [query,      setQuery]      = useState('');
  const [filter,     setFilter]     = useState<FilterMode>('all');
  const [scheduled,  setScheduled]  = useState<ScheduledChange[]>([]);
  const [toast,      setToast]      = useState('');
  const [showRecent, setShowRecent] = useState(false);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['app-configs'],
    queryFn:  fetchAppConfigs,
    refetchInterval: 30_000,
  });

  const mutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: boolean }) => updateAppConfigEntry(key, value),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ['app-configs'] });
      showToast(`${configs.find(c => c.key === vars.key)?.label ?? vars.key} → ${vars.value ? 'Enabled' : 'Disabled'}`);
    },
    onError: () => showToast('Update failed — check connection'),
  });

  function requestToggle(entry: AppConfigEntry) {
    const next = !entry.value;
    const deps = getDeps(entry.key);
    if (entry.dangerous || entry.category === 'emergency') {
      setConfirm({ entry, nextValue: next, deps });
    } else if (deps.length > 0 && !next) {
      setConfirm({ entry, nextValue: next, deps });
    } else {
      mutation.mutate({ key: entry.key, value: next });
    }
  }

  function bulkMutate(keys: string[], value: boolean) {
    keys.forEach(k => mutation.mutate({ key: k, value }));
    setSelected(new Set());
    showToast(`${value ? 'Enabled' : 'Disabled'} ${keys.length} controls`);
  }

  // Filter + search
  const now = Date.now();
  const displayed = useMemo(() => {
    let list = configs;
    const q = query.toLowerCase().trim();
    if (q) {
      list = list.filter(c =>
        c.label.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.key.toLowerCase().includes(q) ||
        getAffects(c.key).some(a => a.toLowerCase().includes(q)) ||
        deriveCategory(c).includes(q)
      );
    }
    if (filter === 'enabled')     list = list.filter(c => c.value);
    if (filter === 'disabled')    list = list.filter(c => !c.value);
    if (filter === 'critical')    list = list.filter(c => c.dangerous || c.category === 'emergency');
    if (filter === 'ai')          list = list.filter(c => deriveCategory(c) === 'ai');
    if (filter === 'community')   list = list.filter(c => deriveCategory(c) === 'community');
    if (filter === 'experimental')list = list.filter(c => deriveCategory(c) === 'experimental');
    if (filter === 'recent')      list = list.filter(c => c.updatedAt && (now - new Date(c.updatedAt).getTime()) < 7 * 86400000);
    return list;
  }, [configs, query, filter, now]);

  // Group by derived category
  const grouped = useMemo(() => {
    const g: Record<string, AppConfigEntry[]> = {};
    for (const c of displayed) {
      const cat = deriveCategory(c);
      (g[cat] ??= []).push(c);
    }
    return g;
  }, [displayed]);

  const orderedCats = CATEGORY_ORDER.filter(cat => (grouped[cat]?.length ?? 0) > 0);

  return (
    <div className="section-operations relative" style={{ paddingRight: showRecent ? 320 : 0 }}>
      <style>{`
        @keyframes cc-fade-up   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cc-slide-up  { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes cc-slide-left{ from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes cc-pulse     { 0%,100%{opacity:0.25} 50%{opacity:1} }
        @keyframes cc-ping      { 75%,100%{transform:scale(2.5);opacity:0} }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4 py-2.5 rounded-xl font-mono text-[8px] font-bold shadow-2xl whitespace-nowrap"
          style={{ background: '#0D0D1A', border: '1px solid rgba(56,214,138,0.3)', color: '#38D68A', animation: 'cc-slide-up 0.2s ease' }}>
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4" style={{ animation: 'cc-fade-up 0.25s ease both' }}>
        <div>
          <h1 className="font-mono text-base font-black tracking-tight" style={{ color: '#E8E8FF' }}>Enterprise Platform Control Center</h1>
          <p className="font-mono text-[8px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>Mission-critical feature management — {configs.length} controls</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRecent(p => !p)}
            className="font-mono text-[7.5px] font-bold px-3 py-1.5 rounded-xl border transition-all"
            style={{ color: showRecent ? '#FFB800' : 'rgba(232,232,255,0.35)', background: showRecent ? 'rgba(255,184,0,0.08)' : 'rgba(255,255,255,0.03)', borderColor: showRecent ? 'rgba(255,184,0,0.25)' : 'rgba(255,255,255,0.08)' }}>
            Change History
          </button>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38D68A', animation: 'cc-pulse 1.5s infinite' }} />
            <span className="font-mono text-[7px] font-bold" style={{ color: '#38D68A' }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* Status Header */}
      <StatusHeader configs={configs} scheduled={scheduled} />

      {/* Quick Bar */}
      <QuickBar configs={configs}
        onBulkEnable={keys => bulkMutate(keys, true)}
        onBulkDisable={keys => bulkMutate(keys, false)}
        onToast={showToast} />

      {/* Search + Filter */}
      <SearchFilter query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} />

      {/* Scheduled changes */}
      <ScheduledPanel changes={scheduled} onRemove={k => setScheduled(p => p.filter(c => c.key !== k))} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-2xl mb-3">⊘</p>
          <p className="font-mono text-sm font-bold mb-1" style={{ color: '#E8E8FF' }}>No controls match</p>
          <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>Try clearing filters or searching with different terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Control Groups (2/3) */}
          <div className="col-span-2 space-y-6">
            {orderedCats.map(cat => {
              const items = grouped[cat] ?? [];
              const meta  = CATEGORY_META[cat] ?? CATEGORY_META['features']!;
              const enabledCount = items.filter(c => c.value).length;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="font-mono text-[11px]" style={{ color: meta.color }}>{meta.icon}</span>
                    <span className="font-mono text-[7px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
                    <span className="font-mono text-[6.5px] px-1.5 py-0.5 rounded-lg" style={{ color: 'rgba(232,232,255,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>{enabledCount}/{items.length} active</span>
                    <div className="flex-1 h-px" style={{ background: `${meta.color}15` }} />
                  </div>
                  <div className="space-y-2">
                    {items.map(entry => (
                      <ControlCard key={entry.key} entry={entry}
                        pending={mutation.isPending && mutation.variables?.key === entry.key}
                        selected={selected.has(entry.key)}
                        expanded={expanded === entry.key}
                        onToggle={() => requestToggle(entry)}
                        onSelect={() => setSelected(p => { const n = new Set(p); n.has(entry.key) ? n.delete(entry.key) : n.add(entry.key); return n; })}
                        onExpand={() => setExpanded(p => p === entry.key ? null : entry.key)}
                        onSchedule={() => setScheduleFor(entry)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Panel (1/3) */}
          <div className="space-y-4">
            <LiveImpactPanel configs={configs} />

            {/* Stats box */}
            <div className="os-card p-4">
              <p className="font-mono text-[7px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(232,232,255,0.25)' }}>Control Summary</p>
              {[
                { label: 'Total Controls',  value: configs.length,                                           color: '#CC80FF' },
                { label: 'Active',          value: configs.filter(c => c.value).length,                     color: '#38D68A' },
                { label: 'Disabled',        value: configs.filter(c => !c.value).length,                    color: '#FF4A5E' },
                { label: 'Emergency',       value: configs.filter(c => c.category === 'emergency').length,   color: '#FF8C00' },
                { label: 'Core Platform',   value: configs.filter(c => c.category === 'core').length,        color: '#00CFFF' },
                { label: 'Feature Flags',   value: configs.filter(c => c.category === 'features').length,   color: '#7B6FFF' },
                { label: 'Dangerous',       value: configs.filter(c => c.dangerous).length,                 color: '#FF4A5E' },
                { label: 'Scheduled',       value: scheduled.length,                                         color: '#FFB800' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
                  <span className="font-mono text-[8px] font-black" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div className="os-card p-4">
              <p className="font-mono text-[7px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(232,232,255,0.25)' }}>By Category</p>
              {orderedCats.map(cat => {
                const items = grouped[cat] ?? [];
                const meta  = CATEGORY_META[cat] ?? CATEGORY_META['features']!;
                const active = items.filter(c => c.value).length;
                return (
                  <div key={cat} className="mb-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[8px]" style={{ color: meta.color }}>{meta.icon}</span>
                        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.45)' }}>{meta.label}</span>
                      </div>
                      <span className="font-mono text-[7.5px] font-black" style={{ color: meta.color }}>{active}/{items.length}</span>
                    </div>
                    <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: items.length ? `${Math.round(active / items.length * 100)}%` : '0%', background: meta.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Bar */}
      <BulkBar selected={selected} total={displayed.length}
        onSelectAll={() => setSelected(new Set(displayed.map(c => c.key)))}
        onClear={() => setSelected(new Set())}
        onEnableAll={() => bulkMutate([...selected], true)}
        onDisableAll={() => bulkMutate([...selected], false)} />

      {/* Recent Changes Panel */}
      {showRecent && <RecentChangesPanel configs={configs} onClose={() => setShowRecent(false)} />}

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal state={confirm}
          onConfirm={() => mutation.mutate({ key: confirm.entry.key, value: confirm.nextValue })}
          onClose={() => setConfirm(null)} />
      )}

      {/* Schedule Modal */}
      {scheduleFor && (
        <ScheduleModal entry={scheduleFor}
          onSchedule={c => setScheduled(p => [...p.filter(x => x.key !== c.key), c])}
          onClose={() => setScheduleFor(null)} />
      )}
    </div>
  );
}
