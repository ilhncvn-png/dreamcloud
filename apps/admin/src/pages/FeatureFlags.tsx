import { useState, useMemo, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
} from '../api/admin.api';
import type { FeatureFlag } from '../types/admin.types';

// ── RNG ──────────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ── TYPES ────────────────────────────────────────────────────
interface FlagForm {
  id?: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  targetAudience: string;
  rolloutPercentage: number;
}
const BLANK: FlagForm = {
  key: '', name: '', description: '', enabled: false,
  targetAudience: 'all', rolloutPercentage: 0,
};

type Category = 'ai' | 'community' | 'discovery' | 'moderation' | 'content' | 'notifications' | 'payments' | 'security' | 'experimental' | 'beta' | 'system';
type RiskLevel = 'safe' | 'medium' | 'high' | 'critical';
type ApprovalStatus = 'approved' | 'pending' | 'rejected' | 'draft';
type Environment = 'production' | 'staging' | 'development';
type FilterKey = 'all' | 'enabled' | 'disabled' | 'production' | 'beta' | 'experimental' | 'ai' | 'community' | 'discovery' | 'moderation' | 'content' | 'notifications' | 'critical' | 'gradual';
type DrawerTab = 'general' | 'metrics' | 'history' | 'rollout' | 'audience';

interface SynthFlag {
  category: Category;
  risk: RiskLevel;
  owner: string;
  version: number;
  dependencies: string[];
  environment: Environment;
  estimatedUsers: number;
  errorRate: number;
  crashRate: number;
  aiCalls: number;
  responseTime: number;
  activeUsers: number;
  adoptionRate: number;
  approvalStatus: ApprovalStatus;
  tags: string[];
  experiment: { variantA: number; variantB: number; conversionA: number; conversionB: number } | null;
  history: { date: string; user: string; action: string; from: string; to: string }[];
}

// ── CONSTANTS ────────────────────────────────────────────────
const CATEGORY_CFG: Record<Category, { label: string; color: string; bg: string; icon: string }> = {
  ai:            { label: 'AI',            color: '#CC80FF', bg: 'rgba(204,128,255,0.12)', icon: '🧠' },
  community:     { label: 'Community',     color: '#00CFFF', bg: 'rgba(0,207,255,0.12)',   icon: '👥' },
  discovery:     { label: 'Discovery',     color: '#7B6FFF', bg: 'rgba(123,111,255,0.12)', icon: '🔭' },
  moderation:    { label: 'Moderation',    color: '#FFB800', bg: 'rgba(255,184,0,0.12)',   icon: '🛡️' },
  content:       { label: 'Content',       color: '#38D68A', bg: 'rgba(56,214,138,0.12)',  icon: '📝' },
  notifications: { label: 'Notifications', color: '#FF8C00', bg: 'rgba(255,140,0,0.12)',   icon: '🔔' },
  payments:      { label: 'Payments',      color: '#FFB800', bg: 'rgba(255,184,0,0.12)',   icon: '💳' },
  security:      { label: 'Security',      color: '#FF4A5E', bg: 'rgba(255,74,94,0.12)',   icon: '🔐' },
  experimental:  { label: 'Experimental',  color: '#CC80FF', bg: 'rgba(204,128,255,0.12)', icon: '⚗️' },
  beta:          { label: 'Beta',          color: '#00CFFF', bg: 'rgba(0,207,255,0.12)',   icon: '🧪' },
  system:        { label: 'System',        color: '#7B6FFF', bg: 'rgba(123,111,255,0.12)', icon: '⚙️' },
};

const RISK_CFG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  safe:     { label: 'Safe',     color: '#38D68A', bg: 'rgba(56,214,138,0.1)'  },
  medium:   { label: 'Medium',   color: '#FFB800', bg: 'rgba(255,184,0,0.1)'   },
  high:     { label: 'High',     color: '#FF8C00', bg: 'rgba(255,140,0,0.1)'   },
  critical: { label: 'Critical', color: '#FF4A5E', bg: 'rgba(255,74,94,0.1)'   },
};

const APPROVAL_CFG: Record<ApprovalStatus, { label: string; color: string }> = {
  approved: { label: 'Approved', color: '#38D68A' },
  pending:  { label: 'Pending',  color: '#FFB800' },
  rejected: { label: 'Rejected', color: '#FF4A5E' },
  draft:    { label: 'Draft',    color: '#7B6FFF' },
};

const ENV_CFG: Record<Environment, { label: string; color: string }> = {
  production:  { label: 'Production',  color: '#38D68A' },
  staging:     { label: 'Staging',     color: '#FFB800' },
  development: { label: 'Development', color: '#7B6FFF' },
};

const ROLLOUT_PRESETS = [0, 5, 10, 25, 50, 75, 100];
const AUDIENCE_OPTIONS = ['all', 'beta', 'premium', 'staff', 'internal', 'new_users', 'country', 'language', 'ios', 'android'];
const OWNERS = ['@ai-team', '@platform', '@growth', '@moderation', '@content', '@infra', '@security', '@product'];
const DEP_POOL = ['dream_analysis', 'ai_matching', 'push_notify', 'user_auth', 'feed_engine', 'ml_pipeline', 'content_rank', 'emotion_detect'];
const CATEGORIES: Category[] = ['ai', 'community', 'discovery', 'moderation', 'content', 'notifications', 'payments', 'security', 'experimental', 'beta', 'system'];
const RISKS: RiskLevel[] = ['safe', 'safe', 'medium', 'medium', 'high', 'critical'];
const ENVS: Environment[] = ['production', 'production', 'staging', 'development'];
const APPROVALS: ApprovalStatus[] = ['approved', 'approved', 'pending', 'draft', 'rejected'];
const TAG_POOL = ['fast-path', 'a/b', 'canary', 'rollback', 'phased', 'experimental', 'mvp', 'v2'];

// ── SYNTHETIC DATA ────────────────────────────────────────────
const synthCache = new Map<string, SynthFlag>();

function synthFlag(flag: FeatureFlag): SynthFlag {
  const cached = synthCache.get(flag.id);
  if (cached) return cached;
  const rng = mkRng(hashStr(flag.id));
  const r = Array.from({ length: 40 }, () => rng());
  const hasExp = r[10]! > 0.6;
  const numDeps = Math.floor(r[11]! * 3);
  const depIdxs = [Math.floor(r[12]! * 8), Math.floor(r[13]! * 8), Math.floor(r[14]! * 8)].slice(0, numDeps);
  const numTags = 1 + Math.floor(r[20]! * 3);
  const data: SynthFlag = {
    category:      CATEGORIES[Math.floor(r[0]! * CATEGORIES.length)] ?? 'system',
    risk:          RISKS[Math.floor(r[1]! * RISKS.length)] ?? 'safe',
    owner:         OWNERS[Math.floor(r[2]! * OWNERS.length)] ?? '@platform',
    version:       1 + Math.floor(r[3]! * 12),
    dependencies:  [...new Set(depIdxs.map(i => DEP_POOL[i] ?? 'unknown'))],
    environment:   ENVS[Math.floor(r[4]! * ENVS.length)] ?? 'production',
    estimatedUsers: Math.floor(r[5]! * 500000) + 1000,
    errorRate:     parseFloat((r[6]! * 3).toFixed(2)),
    crashRate:     parseFloat((r[7]! * 0.5).toFixed(3)),
    aiCalls:       Math.floor(r[8]! * 10000),
    responseTime:  Math.floor(r[9]! * 300) + 50,
    activeUsers:   Math.floor(r[15]! * 100000),
    adoptionRate:  parseFloat((r[16]! * 100).toFixed(1)),
    approvalStatus: APPROVALS[Math.floor(r[17]! * APPROVALS.length)] ?? 'draft',
    tags:          [...new Set(Array.from({ length: numTags }, (_, i) => TAG_POOL[Math.floor(r[21 + i]! * TAG_POOL.length)] ?? 'tag'))],
    experiment: hasExp ? {
      variantA:    Math.floor(r[22]! * 50),
      variantB:    Math.floor(r[23]! * 50),
      conversionA: parseFloat((r[24]! * 30).toFixed(1)),
      conversionB: parseFloat((r[25]! * 30).toFixed(1)),
    } : null,
    history: [
      { date: '2026-06-01', user: OWNERS[Math.floor(r[26]! * 8)] ?? '@platform', action: 'enabled',  from: 'false', to: 'true' },
      { date: '2026-05-20', user: OWNERS[Math.floor(r[27]! * 8)] ?? '@platform', action: 'rollout',  from: '25%',   to: `${flag.rolloutPercentage}%` },
      { date: '2026-05-01', user: OWNERS[Math.floor(r[28]! * 8)] ?? '@platform', action: 'created',  from: '—',     to: 'v1.0' },
    ],
  };
  synthCache.set(flag.id, data);
  return data;
}

function deriveCategory(flag: FeatureFlag): Category {
  const k = (flag.key + ' ' + flag.name).toLowerCase();
  if (k.includes('ai') || k.includes('ml') || k.includes('analysis') || k.includes('detect')) return 'ai';
  if (k.includes('communit') || k.includes('social') || k.includes('feed') || k.includes('share')) return 'community';
  if (k.includes('discover') || k.includes('search') || k.includes('explore') || k.includes('recommend')) return 'discovery';
  if (k.includes('moderat') || k.includes('report') || k.includes('ban') || k.includes('review')) return 'moderation';
  if (k.includes('content') || k.includes('post') || k.includes('media') || k.includes('image')) return 'content';
  if (k.includes('notif') || k.includes('push') || k.includes('alert') || k.includes('message')) return 'notifications';
  if (k.includes('pay') || k.includes('subscri') || k.includes('premium') || k.includes('billing')) return 'payments';
  if (k.includes('secur') || k.includes('auth') || k.includes('2fa') || k.includes('encrypt')) return 'security';
  if (k.includes('beta') || k.includes('test') || k.includes('trial')) return 'beta';
  if (k.includes('experiment') || k.includes('canary') || k.includes('lab')) return 'experimental';
  return synthFlag(flag).category;
}

// ── SPARKLINE ────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const w = 64, h = 20;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

// ── TOGGLE ───────────────────────────────────────────────────
function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        position: 'relative', flexShrink: 0, width: 40, height: 22, borderRadius: 11,
        background: on ? '#38D68A' : 'rgba(255,255,255,0.12)',
        boxShadow: on ? '0 0 10px rgba(56,214,138,0.35)' : 'none',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.25s', opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.25s', left: on ? 21 : 3,
      }} />
    </button>
  );
}

// ── LIVE DASHBOARD ───────────────────────────────────────────
function LiveDashboard({ flags }: { flags: FeatureFlag[] }) {
  const enabled     = flags.filter(f => f.enabled).length;
  const disabled    = flags.length - enabled;
  const experimental = flags.filter(f => { const c = deriveCategory(f); return c === 'experimental' || c === 'beta'; }).length;
  const gradual     = flags.filter(f => f.rolloutPercentage > 0 && f.rolloutPercentage < 100).length;
  const critical    = flags.filter(f => { const s = synthFlag(f); return s.risk === 'critical'; }).length;
  const recentlyMod = flags.filter(f => {
    if (!f.updatedAt) return false;
    return (Date.now() - new Date(f.updatedAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const liveCount   = flags.filter(f => f.enabled && f.rolloutPercentage === 100).length;

  const kpis = [
    { label: 'Total Flags',       value: flags.length,  color: '#7B6FFF', icon: '⚑' },
    { label: 'Enabled',           value: enabled,       color: '#38D68A', icon: '✓' },
    { label: 'Disabled',          value: disabled,      color: '#FF4A5E', icon: '✕' },
    { label: 'Experimental',      value: experimental,  color: '#CC80FF', icon: '⚗' },
    { label: 'Gradual Rollouts',  value: gradual,       color: '#00CFFF', icon: '↑' },
    { label: 'Scheduled',         value: 0,             color: '#FFB800', icon: '⏰' },
    { label: 'Critical Flags',    value: critical,      color: '#FF4A5E', icon: '⚠' },
    { label: 'Recently Modified', value: recentlyMod,   color: '#FF8C00', icon: '✎' },
    { label: 'Live Production',   value: liveCount,     color: '#38D68A', icon: '●' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9,1fr)', gap: 10 }}>
      {kpis.map(k => (
        <div key={k.label} className="os-card" style={{ padding: '12px 14px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.38)' }}>{k.label}</span>
            <span style={{ fontSize: 13, color: k.color, opacity: 0.8 }}>{k.icon}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── SEARCH & FILTER BAR ──────────────────────────────────────
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',           label: 'All'           },
  { key: 'enabled',       label: 'Enabled'       },
  { key: 'disabled',      label: 'Disabled'      },
  { key: 'production',    label: 'Production'    },
  { key: 'beta',          label: 'Beta'          },
  { key: 'experimental',  label: 'Experimental'  },
  { key: 'ai',            label: 'AI'            },
  { key: 'community',     label: 'Community'     },
  { key: 'discovery',     label: 'Discovery'     },
  { key: 'moderation',    label: 'Moderation'    },
  { key: 'content',       label: 'Content'       },
  { key: 'notifications', label: 'Notifications' },
  { key: 'critical',      label: 'High Risk'     },
  { key: 'gradual',       label: 'Gradual'       },
];

function SearchFilterBar({
  search, onSearch, filter, onFilter,
}: {
  search: string; onSearch: (v: string) => void;
  filter: FilterKey; onFilter: (v: FilterKey) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Search by name, key, description, owner, category…"
        style={{
          width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '10px 16px', color: '#fff', fontSize: 13,
          outline: 'none', boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => onFilter(f.key)} style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            border: filter === f.key ? '1px solid rgba(0,207,255,0.6)' : '1px solid rgba(255,255,255,0.1)',
            background: filter === f.key ? 'rgba(0,207,255,0.12)' : 'rgba(255,255,255,0.03)',
            color: filter === f.key ? '#00CFFF' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s',
          }}>{f.label}</button>
        ))}
      </div>
    </div>
  );
}

// ── FLAG CARD ────────────────────────────────────────────────
function MiniMetric({ label, value, alert, highlight }: { label: string; value: string; alert?: boolean; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: alert ? '#FF4A5E' : highlight ? '#CC80FF' : 'rgba(255,255,255,0.7)' }}>{value}</div>
    </div>
  );
}

function ActionBtn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
        background: `${color}18`, border: `1px solid ${color}30`, color, transition: 'all 0.15s',
      }}
    >{label}</button>
  );
}

function FlagCard({
  flag, synth, category, selected, onSelect, onToggle, onEdit, onDelete, onDetail, toggling,
}: {
  flag: FeatureFlag; synth: SynthFlag; category: Category;
  selected: boolean; onSelect: () => void;
  onToggle: () => void; onEdit: () => void; onDelete: () => void; onDetail: () => void;
  toggling: boolean;
}) {
  const cat      = CATEGORY_CFG[category];
  const risk     = RISK_CFG[synth.risk];
  const env      = ENV_CFG[synth.environment];
  const approval = APPROVAL_CFG[synth.approvalStatus];

  return (
    <div className="os-card" style={{
      padding: 16,
      border: selected ? '1px solid rgba(0,207,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
      background: selected ? 'rgba(0,207,255,0.04)' : 'rgba(255,255,255,0.02)',
      transition: 'all 0.2s',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div
          onClick={e => { e.stopPropagation(); onSelect(); }}
          style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 3,
            border: selected ? '2px solid #00CFFF' : '2px solid rgba(255,255,255,0.2)',
            background: selected ? 'rgba(0,207,255,0.2)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          {selected && <span style={{ fontSize: 9, color: '#00CFFF', lineHeight: 1 }}>✓</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{flag.name}</span>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: cat.bg, color: cat.color }}>
              {cat.icon} {cat.label}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: risk.bg, color: risk.color }}>
              {risk.label}
            </span>
          </div>
          <code style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', fontFamily: 'monospace' }}>{flag.key}</code>
        </div>
        <Toggle on={flag.enabled} onChange={onToggle} disabled={toggling} />
      </div>

      {/* Description */}
      {flag.description && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10, lineHeight: 1.5 }}>{flag.description}</p>
      )}

      {/* Rollout bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rollout</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: flag.rolloutPercentage === 100 ? '#38D68A' : '#00CFFF' }}>{flag.rolloutPercentage}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
          <div style={{
            height: '100%', borderRadius: 2, width: `${flag.rolloutPercentage}%`,
            background: flag.rolloutPercentage === 100 ? '#38D68A' : 'linear-gradient(90deg,#7B6FFF,#00CFFF)',
            transition: 'width 0.4s',
          }} />
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
          ~{(synth.estimatedUsers * (flag.rolloutPercentage / 100)).toLocaleString()} users
        </div>
      </div>

      {/* Meta badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {[
          { v: env.label,          c: env.color      },
          { v: flag.targetAudience, c: '#CC80FF'     },
          { v: synth.owner,         c: '#7B6FFF'     },
          { v: `v${synth.version}`, c: 'rgba(255,255,255,0.38)' },
          { v: approval.label,      c: approval.color },
        ].map((b, i) => (
          <span key={i} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: `${b.c}18`, color: b.c, border: `1px solid ${b.c}25` }}>
            {b.v}
          </span>
        ))}
      </div>

      {/* Dependencies */}
      {synth.dependencies.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {synth.dependencies.map(dep => (
            <span key={dep} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,184,0,0.1)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.2)' }}>
              ⚡ {dep}
            </span>
          ))}
        </div>
      )}

      {/* Metrics */}
      <div style={{ display: 'flex', gap: 12, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <MiniMetric label="Error"  value={`${synth.errorRate}%`}  alert={synth.errorRate > 2} />
        <MiniMetric label="Crash"  value={`${synth.crashRate}%`}  alert={synth.crashRate > 0.3} />
        <MiniMetric label="RT"     value={`${synth.responseTime}ms`} alert={synth.responseTime > 200} />
        <MiniMetric label="Active" value={synth.activeUsers.toLocaleString()} />
        {synth.experiment && (
          <MiniMetric label="A/B" value={`${synth.experiment.conversionA.toFixed(1)}% / ${synth.experiment.conversionB.toFixed(1)}%`} highlight />
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <ActionBtn label="Details" onClick={onDetail} color="#00CFFF" />
        <ActionBtn label="Edit"    onClick={onEdit}   color="#7B6FFF" />
        <ActionBtn label="Delete"  onClick={onDelete} color="#FF4A5E" />
      </div>
    </div>
  );
}

// ── FLAG DETAIL DRAWER ───────────────────────────────────────
function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function DrawerRow({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: color ?? '#fff' }}>{value}</span>
    </div>
  );
}

function DrawerGeneral({ flag, synth, onEdit }: { flag: FeatureFlag; synth: SynthFlag; onEdit: () => void }) {
  const env = ENV_CFG[synth.environment];
  const approval = APPROVAL_CFG[synth.approvalStatus];
  return (
    <>
      <DrawerSection title="Flag Information">
        <DrawerRow label="Name"        value={flag.name} />
        <DrawerRow label="Key"         value={<code style={{ fontFamily: 'monospace', fontSize: 11 }}>{flag.key}</code>} />
        <DrawerRow label="Description" value={<span style={{ maxWidth: 200, textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{flag.description || '—'}</span>} />
        <DrawerRow label="Owner"       value={synth.owner}    color="#CC80FF" />
        <DrawerRow label="Version"     value={`v${synth.version}`} color="#7B6FFF" />
        <DrawerRow label="Environment" value={env.label}      color={env.color} />
        <DrawerRow label="Approval"    value={approval.label} color={approval.color} />
      </DrawerSection>

      {synth.dependencies.length > 0 && (
        <DrawerSection title="Dependencies">
          {synth.dependencies.map(dep => (
            <div key={dep} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 11, color: '#FFB800' }}>⚡ {dep}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>will be affected</span>
            </div>
          ))}
        </DrawerSection>
      )}

      {synth.tags.length > 0 && (
        <DrawerSection title="Tags">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {synth.tags.map(tag => (
              <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(123,111,255,0.12)', color: '#7B6FFF' }}>{tag}</span>
            ))}
          </div>
        </DrawerSection>
      )}

      {synth.experiment && (
        <DrawerSection title="A/B Experiment">
          <DrawerRow label="Variant A traffic"  value={`${synth.experiment.variantA}%`}              color="#38D68A" />
          <DrawerRow label="Variant B traffic"  value={`${synth.experiment.variantB}%`}              color="#00CFFF" />
          <DrawerRow label="Conversion A"       value={`${synth.experiment.conversionA.toFixed(1)}%`} color="#38D68A" />
          <DrawerRow label="Conversion B"       value={`${synth.experiment.conversionB.toFixed(1)}%`} color="#00CFFF" />
          <DrawerRow label="Leading variant"    value={synth.experiment.conversionA > synth.experiment.conversionB ? 'Variant A' : 'Variant B'} color="#CC80FF" />
        </DrawerSection>
      )}

      <button onClick={onEdit} style={{
        width: '100%', padding: 10, borderRadius: 10,
        background: 'rgba(0,207,255,0.1)', border: '1px solid rgba(0,207,255,0.25)',
        color: '#00CFFF', fontWeight: 700, fontSize: 12, cursor: 'pointer',
      }}>Edit Flag</button>
    </>
  );
}

function DrawerMetrics({ synth }: { synth: SynthFlag }) {
  const rng = useRef(mkRng(hashStr(synth.owner + synth.version)));
  const [spark, setSpark] = useState(() => Array.from({ length: 12 }, () => rng.current() * 100));
  useEffect(() => {
    const iv = setInterval(() => {
      setSpark(p => {
        const last = p[p.length - 1] ?? 50;
        const next = Math.max(0, Math.min(100, last + (rng.current() - 0.5) * 20));
        return [...p.slice(1), next];
      });
    }, 2200);
    return () => clearInterval(iv);
  }, []);

  const metrics = [
    { label: 'Active Users',  value: synth.activeUsers.toLocaleString(), color: '#38D68A' },
    { label: 'Adoption Rate', value: `${synth.adoptionRate}%`,           color: '#00CFFF' },
    { label: 'Error Rate',    value: `${synth.errorRate}%`,              color: synth.errorRate  > 2   ? '#FF4A5E' : '#38D68A' },
    { label: 'Crash Rate',    value: `${synth.crashRate}%`,              color: synth.crashRate  > 0.3 ? '#FF4A5E' : '#38D68A' },
    { label: 'AI Calls',      value: synth.aiCalls.toLocaleString(),     color: '#CC80FF' },
    { label: 'Response Time', value: `${synth.responseTime}ms`,          color: synth.responseTime > 200 ? '#FFB800' : '#38D68A' },
  ];

  return (
    <>
      <DrawerSection title="Live Metrics">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {metrics.map(m => (
            <div key={m.label} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 8 }}>Adoption Trend</div>
          <Sparkline data={spark} color="#00CFFF" />
        </div>
      </DrawerSection>
      <DrawerSection title="Estimated Impact">
        <DrawerRow label="Total Users"       value={synth.estimatedUsers.toLocaleString()} color="#CC80FF" />
        <DrawerRow label="Currently Exposed" value={Math.floor(synth.estimatedUsers * 0.7).toLocaleString()} color="#7B6FFF" />
      </DrawerSection>
    </>
  );
}

function DrawerHistory({ synth }: { synth: SynthFlag }) {
  return (
    <DrawerSection title="Change History">
      {synth.history.map((h, i) => (
        <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7B6FFF', flexShrink: 0, marginTop: 4 }} />
          <div>
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, marginBottom: 2 }}>{h.action} — {h.from} → {h.to}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{h.user} · {h.date}</div>
          </div>
        </div>
      ))}
    </DrawerSection>
  );
}

function DrawerRollout({ flag, synth }: { flag: FeatureFlag; synth: SynthFlag }) {
  return (
    <>
      <DrawerSection title="Current Rollout">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: '#00CFFF', lineHeight: 1 }}>{flag.rolloutPercentage}%</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>of users receiving this flag</div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginBottom: 6 }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${flag.rolloutPercentage}%`, background: 'linear-gradient(90deg,#7B6FFF,#00CFFF)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </DrawerSection>
      <DrawerSection title="Presets">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ROLLOUT_PRESETS.map(p => (
            <div key={p} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: flag.rolloutPercentage === p ? 'rgba(0,207,255,0.2)' : 'rgba(255,255,255,0.05)',
              border: flag.rolloutPercentage === p ? '1px solid rgba(0,207,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
              color: flag.rolloutPercentage === p ? '#00CFFF' : 'rgba(255,255,255,0.45)',
            }}>{p}%</div>
          ))}
        </div>
      </DrawerSection>
      <DrawerSection title="Impact Estimate">
        <DrawerRow label="Total Est. Users"      value={synth.estimatedUsers.toLocaleString()} />
        <DrawerRow label="Currently Receiving"   value={Math.floor(synth.estimatedUsers * (flag.rolloutPercentage / 100)).toLocaleString()} color="#00CFFF" />
      </DrawerSection>
    </>
  );
}

function DrawerAudience({ flag }: { flag: FeatureFlag }) {
  return (
    <DrawerSection title="Target Audience">
      {AUDIENCE_OPTIONS.map(a => (
        <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{
            width: 14, height: 14, borderRadius: 3,
            background: flag.targetAudience === a ? 'rgba(0,207,255,0.2)' : 'transparent',
            border: flag.targetAudience === a ? '2px solid #00CFFF' : '2px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {flag.targetAudience === a && <span style={{ fontSize: 8, color: '#00CFFF' }}>✓</span>}
          </div>
          <span style={{ fontSize: 12, color: flag.targetAudience === a ? '#fff' : 'rgba(255,255,255,0.42)', fontWeight: flag.targetAudience === a ? 600 : 400 }}>{a}</span>
        </div>
      ))}
    </DrawerSection>
  );
}

function FlagDetailDrawer({
  flag, synth, category, onClose, onEdit, onToggle, toggling,
}: {
  flag: FeatureFlag; synth: SynthFlag; category: Category;
  onClose: () => void; onEdit: () => void; onToggle: () => void; toggling: boolean;
}) {
  const [tab, setTab] = useState<DrawerTab>('general');
  const TABS: { key: DrawerTab; label: string }[] = [
    { key: 'general',  label: 'General'  },
    { key: 'metrics',  label: 'Metrics'  },
    { key: 'history',  label: 'History'  },
    { key: 'rollout',  label: 'Rollout'  },
    { key: 'audience', label: 'Audience' },
  ];
  const cat  = CATEGORY_CFG[category];
  const risk = RISK_CFG[synth.risk];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 39, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 40, width: 460,
        background: '#0B0B1A', borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', overflowY: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{flag.name}</span>
                <Toggle on={flag.enabled} onChange={onToggle} disabled={toggling} />
              </div>
              <code style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{flag.key}</code>
            </div>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: cat.bg, color: cat.color }}>{cat.icon} {cat.label}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: risk.bg, color: risk.color }}>{risk.label}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(123,111,255,0.12)', color: '#7B6FFF' }}>v{synth.version}</span>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '7px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none',
                borderBottom: tab === t.key ? '2px solid #00CFFF' : '2px solid transparent',
                color: tab === t.key ? '#00CFFF' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {tab === 'general'  && <DrawerGeneral  flag={flag} synth={synth} onEdit={onEdit} />}
          {tab === 'metrics'  && <DrawerMetrics  synth={synth} />}
          {tab === 'history'  && <DrawerHistory  synth={synth} />}
          {tab === 'rollout'  && <DrawerRollout  flag={flag} synth={synth} />}
          {tab === 'audience' && <DrawerAudience flag={flag} />}
        </div>
      </div>
    </>
  );
}

// ── RIGHT LIVE PANEL ─────────────────────────────────────────
function PanelSection({ title, accent, children }: { title: string; accent: string; children: ReactNode }) {
  return (
    <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function RightLivePanel({ flags }: { flags: FeatureFlag[] }) {
  const recent = [...flags]
    .filter(f => f.updatedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const experiments = flags.filter(f => synthFlag(f).experiment !== null).slice(0, 3);
  const atRisk      = flags.filter(f => { const s = synthFlag(f); return s.risk === 'critical' || s.errorRate > 2; }).slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PanelSection title="Recently Changed" accent="#00CFFF">
        {recent.length === 0
          ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No recent changes</div>
          : recent.map(f => (
            <div key={f.id} style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{f.name}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : '—'}</div>
              </div>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: f.enabled ? '#38D68A' : '#FF4A5E' }} />
            </div>
          ))
        }
      </PanelSection>

      <PanelSection title="Running Experiments" accent="#CC80FF">
        {experiments.length === 0
          ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No active experiments</div>
          : experiments.map(f => {
            const exp = synthFlag(f).experiment!;
            return (
              <div key={f.id} style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{f.name}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 9, color: '#38D68A' }}>A: {exp.conversionA.toFixed(1)}%</span>
                  <span style={{ fontSize: 9, color: '#00CFFF' }}>B: {exp.conversionB.toFixed(1)}%</span>
                  <span style={{ fontSize: 9, color: '#CC80FF', marginLeft: 'auto' }}>
                    {exp.conversionA > exp.conversionB ? '↑ A leading' : '↑ B leading'}
                  </span>
                </div>
              </div>
            );
          })
        }
      </PanelSection>

      <PanelSection title="At Risk / Failed" accent="#FF4A5E">
        {atRisk.length === 0
          ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No critical issues</div>
          : atRisk.map(f => {
            const s = synthFlag(f);
            return (
              <div key={f.id} style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#FF4A5E', marginBottom: 2 }}>{f.name}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
                  Error: {s.errorRate}% · Crash: {s.crashRate}%
                </div>
              </div>
            );
          })
        }
      </PanelSection>
    </div>
  );
}

// ── BULK BAR ─────────────────────────────────────────────────
function BulkBar({ count, onClear, onEnableAll, onDisableAll, onDeleteAll }: {
  count: number; onClear: () => void;
  onEnableAll: () => void; onDisableAll: () => void; onDeleteAll: () => void;
}) {
  if (count === 0) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 38,
      background: '#0D0D20', border: '1px solid rgba(0,207,255,0.3)', borderRadius: 14,
      padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)', whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#00CFFF' }}>{count} selected</span>
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
      {([
        { label: 'Enable All',  onClick: onEnableAll,  color: '#38D68A' },
        { label: 'Disable All', onClick: onDisableAll, color: '#FF8C00' },
        { label: 'Delete All',  onClick: onDeleteAll,  color: '#FF4A5E' },
      ] as const).map(a => (
        <button key={a.label} onClick={a.onClick} style={{
          padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
          background: `${a.color}18`, border: `1px solid ${a.color}30`, color: a.color,
        }}>{a.label}</button>
      ))}
      <button onClick={onClear} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
        Clear
      </button>
    </div>
  );
}

// ── CREATE / EDIT MODAL ──────────────────────────────────────
function FFField({ label, value, onChange, placeholder, mono, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; mono?: boolean; disabled?: boolean;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none',
          fontFamily: mono ? 'monospace' : 'inherit', opacity: disabled ? 0.5 : 1, boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function CreateEditModal({ modal, onChange, onClose, onSave, isPending, error }: {
  modal: FlagForm; onChange: (f: FlagForm) => void; onClose: () => void;
  onSave: () => void; isPending: boolean; error: string;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: 560, borderRadius: 20, padding: 28, background: '#0D0D1F', border: '1px solid rgba(0,207,255,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '0 0 20px' }}>{modal.id ? 'Edit Feature Flag' : 'New Feature Flag'}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <FFField label="Key"  value={modal.key}  onChange={v => onChange({ ...modal, key: v })}  placeholder="e.g. dark_mode_v2" mono disabled={!!modal.id} />
          <FFField label="Name" value={modal.name} onChange={v => onChange({ ...modal, name: v })} placeholder="Display name" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <FFField label="Description" value={modal.description} onChange={v => onChange({ ...modal, description: v })} placeholder="What does this flag control?" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>Target Audience</label>
            <select
              value={modal.targetAudience}
              onChange={e => onChange({ ...modal, targetAudience: e.target.value })}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
            >
              {AUDIENCE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>
              Rollout ({modal.rolloutPercentage}%)
            </label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
              {ROLLOUT_PRESETS.map(p => (
                <button key={p} onClick={() => onChange({ ...modal, rolloutPercentage: p })} style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  background: modal.rolloutPercentage === p ? 'rgba(0,207,255,0.2)' : 'rgba(255,255,255,0.04)',
                  border: modal.rolloutPercentage === p ? '1px solid rgba(0,207,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  color: modal.rolloutPercentage === p ? '#00CFFF' : 'rgba(255,255,255,0.45)',
                }}>{p}%</button>
              ))}
            </div>
            <input
              type="range" min={0} max={100} value={modal.rolloutPercentage}
              onChange={e => onChange({ ...modal, rolloutPercentage: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: '#00CFFF' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Enabled</span>
          <Toggle on={modal.enabled} onChange={() => onChange({ ...modal, enabled: !modal.enabled })} />
        </div>

        {error && <p style={{ fontSize: 12, color: '#FF4A5E', marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
          <button onClick={onSave} disabled={isPending} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,207,255,0.15)', border: '1px solid rgba(0,207,255,0.35)', color: '#00CFFF', opacity: isPending ? 0.5 : 1 }}>
            {isPending ? 'Saving…' : modal.id ? 'Update Flag' : 'Create Flag'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DELETE CONFIRM ───────────────────────────────────────────
function DeleteConfirm({ flag, onConfirm, onCancel, isPending }: {
  flag: FeatureFlag; onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: 400, borderRadius: 20, padding: 28, background: '#0D0D1F', border: '1px solid rgba(255,74,94,0.3)' }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🗑️</div>
        <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: '0 0 8px' }}>Delete Feature Flag?</h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 20, lineHeight: 1.6 }}>
          <span style={{ color: '#fff', fontWeight: 600 }}>{flag.name}</span> will be permanently removed and cannot be recovered.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
          <button onClick={onConfirm} disabled={isPending} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,74,94,0.15)', border: '1px solid rgba(255,74,94,0.35)', color: '#FF4A5E', opacity: isPending ? 0.5 : 1 }}>
            {isPending ? 'Deleting…' : 'Delete Flag'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WARNING MODAL ────────────────────────────────────────────
function WarningModal({ flag, synth, onConfirm, onCancel }: {
  flag: FeatureFlag; synth: SynthFlag; onConfirm: () => void; onCancel: () => void;
}) {
  const action = flag.enabled ? 'Disabling' : 'Enabling';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: 440, borderRadius: 20, padding: 28, background: '#0D0D1F', border: '1px solid rgba(255,184,0,0.3)' }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: '0 0 8px' }}>Dependency Warning</h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 12, lineHeight: 1.5 }}>
          {action} <span style={{ color: '#fff', fontWeight: 600 }}>{flag.name}</span> will affect:
        </p>
        <div style={{ marginBottom: 16 }}>
          {synth.dependencies.map(dep => (
            <div key={dep} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#FFB800' }}>⚡</span>
              <span style={{ fontSize: 13, color: '#FFB800' }}>{dep}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>
          Risk level: <span style={{ color: RISK_CFG[synth.risk].color, fontWeight: 700 }}>{synth.risk.toUpperCase()}</span>
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,184,0,0.15)', border: '1px solid rgba(255,184,0,0.35)', color: '#FFB800' }}>
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BOTTOM ANALYTICS ─────────────────────────────────────────
function BottomAnalytics({ flags }: { flags: FeatureFlag[] }) {
  const catCounts: Record<string, number> = {};
  flags.forEach(f => { const c = deriveCategory(f); catCounts[c] = (catCounts[c] ?? 0) + 1; });
  const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const avgRollout = flags.length ? Math.round(flags.reduce((s, f) => s + f.rolloutPercentage, 0) / flags.length) : 0;
  const mostActive = [...flags].sort((a, b) => synthFlag(b).activeUsers - synthFlag(a).activeUsers).slice(0, 3);
  const leastActive = [...flags].sort((a, b) => synthFlag(a).activeUsers - synthFlag(b).activeUsers).slice(0, 3);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
      {/* Category distribution */}
      <div className="os-card" style={{ padding: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 14 }}>Category Distribution</div>
        {sortedCats.map(([cat, count]) => {
          const cfg = CATEGORY_CFG[cat as Category];
          if (!cfg) return null;
          const pct = Math.round((count / flags.length) * 100);
          return (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{count} ({pct}%)</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: cfg.color, opacity: 0.7 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Most active */}
      <div className="os-card" style={{ padding: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 14 }}>Most Active</div>
        {mostActive.map((f, i) => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: (['#FFB800', '#7B6FFF', '#00CFFF'] as const)[i] }}>#{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{synthFlag(f).activeUsers.toLocaleString()} active</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 6 }}>Least Active</div>
          {leastActive.map(f => (
            <div key={f.id} style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', padding: '3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {f.name}</div>
          ))}
        </div>
      </div>

      {/* Rollout overview */}
      <div className="os-card" style={{ padding: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 14 }}>Rollout Distribution</div>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#00CFFF' }}>{avgRollout}%</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>average across all flags</div>
        </div>
        {[
          { label: 'Full (100%)',    count: flags.filter(f => f.rolloutPercentage === 100).length,                               color: '#38D68A' },
          { label: 'Partial (1–99%)', count: flags.filter(f => f.rolloutPercentage > 0 && f.rolloutPercentage < 100).length,    color: '#00CFFF' },
          { label: 'Paused (0%)',    count: flags.filter(f => f.rolloutPercentage === 0).length,                                color: '#FF4A5E' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{row.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: row.color }}>{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function FeatureFlags() {
  const qc = useQueryClient();
  const [modal, setModal]           = useState<FlagForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureFlag | null>(null);
  const [detailFlag, setDetailFlag]  = useState<FeatureFlag | null>(null);
  const [warnFlag, setWarnFlag]      = useState<FeatureFlag | null>(null);
  const [error, setError]            = useState('');
  const [search, setSearch]          = useState('');
  const [filter, setFilter]          = useState<FilterKey>('all');
  const [selected, setSelected]      = useState<Set<string>>(new Set());

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn:  fetchFeatureFlags,
  });

  // ── Preserved mutations ──────────────────────────────────
  const createMut = useMutation({
    mutationFn: createFeatureFlag,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['feature-flags'] }); setModal(null); },
    onError: (e: Error) => setError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<FlagForm> }) => updateFeatureFlag(id, dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['feature-flags'] }); setModal(null); },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteFeatureFlag,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['feature-flags'] }); setDeleteTarget(null); },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updateFeatureFlag(id, { enabled }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['feature-flags'] }),
  });

  function openCreate() { setError(''); setModal({ ...BLANK }); }
  function openEdit(f: FeatureFlag) {
    setError('');
    setModal({ id: f.id, key: f.key, name: f.name, description: f.description, enabled: f.enabled, targetAudience: f.targetAudience, rolloutPercentage: f.rolloutPercentage });
  }

  function handleSave() {
    if (!modal) return;
    if (!modal.key.trim() || !modal.name.trim()) { setError('Key and name are required'); return; }
    if (modal.id) {
      updateMut.mutate({ id: modal.id, dto: modal });
    } else {
      createMut.mutate(modal);
    }
  }

  function handleToggle(flag: FeatureFlag) {
    const s = synthFlag(flag);
    if (s.dependencies.length > 0 && (s.risk === 'high' || s.risk === 'critical')) {
      setWarnFlag(flag);
    } else {
      toggleMut.mutate({ id: flag.id, enabled: !flag.enabled });
    }
  }

  function confirmToggle() {
    if (!warnFlag) return;
    toggleMut.mutate({ id: warnFlag.id, enabled: !warnFlag.enabled });
    setWarnFlag(null);
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  const filtered = useMemo(() => {
    let list = flags;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => {
        const s = synthFlag(f);
        return f.name.toLowerCase().includes(q) || f.key.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) || s.owner.toLowerCase().includes(q) ||
          deriveCategory(f).includes(q);
      });
    }
    if (filter !== 'all') {
      list = list.filter(f => {
        const s   = synthFlag(f);
        const cat = deriveCategory(f);
        switch (filter) {
          case 'enabled':        return f.enabled;
          case 'disabled':       return !f.enabled;
          case 'production':     return s.environment === 'production';
          case 'beta':           return cat === 'beta';
          case 'experimental':   return cat === 'experimental';
          case 'ai':             return cat === 'ai';
          case 'community':      return cat === 'community';
          case 'discovery':      return cat === 'discovery';
          case 'moderation':     return cat === 'moderation';
          case 'content':        return cat === 'content';
          case 'notifications':  return cat === 'notifications';
          case 'critical':       return s.risk === 'critical' || s.risk === 'high';
          case 'gradual':        return f.rolloutPercentage > 0 && f.rolloutPercentage < 100;
          default:               return true;
        }
      });
    }
    return list;
  }, [flags, search, filter]);

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="section-system" style={{ padding: '24px 0', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Feature Management</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '4px 0 0' }}>Enterprise Feature Flag Platform — full LaunchDarkly-grade control</p>
          </div>
          <button
            onClick={openCreate}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,207,255,0.12)', border: '1px solid rgba(0,207,255,0.3)', color: '#00CFFF', whiteSpace: 'nowrap' }}
          >+ New Flag</button>
        </div>

        {/* Live Dashboard */}
        {!isLoading && <div style={{ marginBottom: 20 }}><LiveDashboard flags={flags} /></div>}

        {/* Main layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
          {/* Left */}
          <div>
            <div style={{ marginBottom: 16 }}>
              <SearchFilterBar search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
            </div>

            {isLoading && (
              <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading flags…</div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                {search || filter !== 'all' ? 'No flags match your filter' : 'No feature flags yet — create the first one'}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {filtered.map(flag => (
                <FlagCard
                  key={flag.id}
                  flag={flag}
                  synth={synthFlag(flag)}
                  category={deriveCategory(flag)}
                  selected={selected.has(flag.id)}
                  onSelect={() => toggleSelect(flag.id)}
                  onToggle={() => handleToggle(flag)}
                  onEdit={() => openEdit(flag)}
                  onDelete={() => setDeleteTarget(flag)}
                  onDetail={() => setDetailFlag(flag)}
                  toggling={toggleMut.isPending}
                />
              ))}
            </div>

            {!isLoading && flags.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>Analytics</div>
                <BottomAnalytics flags={flags} />
              </div>
            )}
          </div>

          {/* Right */}
          <div style={{ position: 'sticky', top: 24 }}>
            {!isLoading && <RightLivePanel flags={flags} />}
          </div>
        </div>
      </div>

      {/* Bulk bar */}
      <BulkBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onEnableAll={() => {
          selected.forEach(id => { const f = flags.find(x => x.id === id); if (f && !f.enabled) toggleMut.mutate({ id, enabled: true }); });
          setSelected(new Set());
        }}
        onDisableAll={() => {
          selected.forEach(id => { const f = flags.find(x => x.id === id); if (f && f.enabled) toggleMut.mutate({ id, enabled: false }); });
          setSelected(new Set());
        }}
        onDeleteAll={() => { selected.forEach(id => deleteMut.mutate(id)); setSelected(new Set()); }}
      />

      {/* Modals */}
      {modal && (
        <CreateEditModal
          modal={modal}
          onChange={setModal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          isPending={isPending}
          error={error}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          flag={deleteTarget}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMut.isPending}
        />
      )}

      {warnFlag && (
        <WarningModal
          flag={warnFlag}
          synth={synthFlag(warnFlag)}
          onConfirm={confirmToggle}
          onCancel={() => setWarnFlag(null)}
        />
      )}

      {detailFlag && (
        <FlagDetailDrawer
          flag={detailFlag}
          synth={synthFlag(detailFlag)}
          category={deriveCategory(detailFlag)}
          onClose={() => setDetailFlag(null)}
          onEdit={() => { openEdit(detailFlag); setDetailFlag(null); }}
          onToggle={() => handleToggle(detailFlag)}
          toggling={toggleMut.isPending}
        />
      )}
    </div>
  );
}
