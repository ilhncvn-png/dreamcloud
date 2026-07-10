import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchUserById, fetchUserActivity, fetchUserDreams,
  fetchUserIntelligenceProfile, fetchUserRiskProfile,
  fetchUserModerationHistory, updateUserRole, updateUserStatus,
  updateUserProfile, resetUserPassword,
  fetchUserTimeline, fetchUserInsights,
} from '../api/admin.api';
import type { UserTimeline, UserInsights } from '../api/admin.api';
import type { AdminDream, AdminUserDetail, ModerationHistoryItem, UserRiskProfile, UserIntelligenceProfile } from '../types/admin.types';
import { getStoredAuth } from '../store/auth.store';

// ── Utilities ──────────────────────────────────────────────────────────────────

function mkRng(seed: number) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

function CountUp({ target, decimals = 0, suffix = '' }: { target: number; decimals?: number; suffix?: string }) {
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

function Sparkline({ values, color, w = 64, h = 22 }: { values: number[]; color: string; w?: number; h?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.1), min = Math.min(...values), range = max - min || 1;
  const step = w / (values.length - 1);
  const pts  = values.map((v, i) => `${i * step},${h - 2 - ((v - min) / range) * (h - 5)}`).join(' ');
  const last = values[values.length - 1]!;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h, display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} opacity={0.75} />
      <circle cx={(values.length - 1) * step} cy={h - 2 - ((last - min) / range) * (h - 5)} r={2.5} fill={color} />
    </svg>
  );
}

function fmt(s: string | null | undefined, withTime = false) {
  if (!s) return '—';
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
  return new Date(s).toLocaleDateString('en-US', opts);
}

function timeAgo(s: string | null | undefined): string {
  if (!s) return '—';
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
}

function useCopy() {
  const [copied, setCopied] = useState('');
  const copy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1800);
  };
  return { copied, copy };
}

// ── Domain helpers ─────────────────────────────────────────────────────────────

function computeHealthScore(risk?: UserRiskProfile, intel?: UserIntelligenceProfile): number {
  let score = 80;
  if (risk) {
    score -= risk.overallScore * 0.4;
    score -= risk.reportScore * 0.2;
    if (risk.riskLevel === 'critical') score -= 15;
    else if (risk.riskLevel === 'high') score -= 8;
  }
  if (intel) {
    score += Math.min(intel.avgDreamScore / 12, 8);
    score += Math.min(intel.totalLikes / 60, 5);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

const healthLabel = (s: number) => s >= 90 ? 'Excellent' : s >= 75 ? 'Good' : s >= 58 ? 'Fair' : s >= 40 ? 'At Risk' : 'Critical';
const healthColor = (s: number) => s >= 90 ? '#38D68A' : s >= 75 ? '#00CFFF' : s >= 58 ? '#FFB800' : s >= 40 ? '#FF8C00' : '#FF4A5E';

function generateSummary(user: AdminUserDetail, risk?: UserRiskProfile, intel?: UserIntelligenceProfile): string {
  const days   = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000);
  const parts: string[] = [`This account has been active for ${days} day${days !== 1 ? 's' : ''}.`];
  if (!risk || risk.riskLevel === 'low') {
    parts.push('Behavior patterns are normal with no significant red flags.');
  } else if (risk.riskLevel === 'medium') {
    parts.push('Minor risk indicators detected — continued monitoring recommended.');
  } else if (risk.riskLevel === 'high') {
    parts.push('Elevated risk level — recent report activity requires review.');
  } else {
    parts.push('Critical risk level. Immediate moderation action is recommended.');
  }
  if (intel && intel.avgDreamScore > 70) {
    parts.push(`Dream content quality is above average (${intel.avgDreamScore}/100).`);
  }
  if (risk) {
    if (risk.reportCount === 0) parts.push('No active reports filed against this account.');
    else parts.push(`${risk.reportCount} report${risk.reportCount !== 1 ? 's' : ''} on file.`);
  }
  if (user.failedLoginAttempts > 3) {
    parts.push(`${user.failedLoginAttempts} failed login attempts detected — possible security concern.`);
  }
  if (intel && intel.totalLikes > 100) {
    parts.push('High community engagement — potential featured creator candidate.');
  }
  return parts.join(' ');
}

function dreamQuality(d: AdminDream, idx: number): number {
  const rng = mkRng((d.id.charCodeAt(0) ?? 65) * 37 + idx * 11);
  const eng = Math.min((d.likeCount * 3 + d.commentCount * 5 + d.saveCount * 4) / 20, 40);
  return Math.round(45 + eng + rng() * 15);
}

function viralityScore(d: AdminDream, idx: number): number {
  const rng = mkRng((d.id.charCodeAt(0) ?? 65) * 23 + idx * 7);
  const engRate = d.viewCount > 0 ? Math.min(((d.likeCount + d.commentCount) / d.viewCount) * 180, 35) : 0;
  return Math.round(Math.min(Math.min(d.viewCount / 80, 35) + engRate + rng() * 15, 100));
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: '#FF4D8F' },
  admin:       { label: 'Admin',       color: '#CC80FF' },
  moderator:   { label: 'Moderator',   color: '#00CFFF' },
  user:        { label: 'User',        color: '#7B6FFF' },
};

const RISK_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: '#FF4A5E', bg: 'rgba(255,74,94,0.1)',  border: 'rgba(255,74,94,0.3)'   },
  high:     { label: 'High',     color: '#FF8C00', bg: 'rgba(255,140,0,0.1)', border: 'rgba(255,140,0,0.3)'   },
  medium:   { label: 'Medium',   color: '#FFB800', bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.25)'  },
  low:      { label: 'Low',      color: '#38D68A', bg: 'rgba(56,214,138,0.08)', border: 'rgba(56,214,138,0.2)' },
};

const CAT_CFG: Record<string, { glyph: string; color: string }> = {
  lucid:     { glyph: '◉', color: '#00CFFF' },
  beautiful: { glyph: '✦', color: '#FF4D8F' },
  nightmare: { glyph: '◆', color: '#FF4A5E' },
  normal:    { glyph: '◇', color: '#7B6FFF' },
  recurring: { glyph: '↺', color: '#FF8C00' },
};

const AVAILABLE_TAGS = ['VIP', 'Creator', 'Trusted', 'Journalist', 'Developer', 'Research', 'Spam Risk', 'Needs Review', 'Appeal Pending'];

const TAG_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  'VIP':            { color: '#FFB800', bg: 'rgba(255,184,0,0.1)',    border: 'rgba(255,184,0,0.25)'    },
  'Creator':        { color: '#CC80FF', bg: 'rgba(204,128,255,0.1)',  border: 'rgba(204,128,255,0.25)'  },
  'Trusted':        { color: '#38D68A', bg: 'rgba(56,214,138,0.1)',   border: 'rgba(56,214,138,0.2)'    },
  'Journalist':     { color: '#00CFFF', bg: 'rgba(0,207,255,0.08)',   border: 'rgba(0,207,255,0.2)'     },
  'Developer':      { color: '#7B6FFF', bg: 'rgba(123,111,255,0.1)',  border: 'rgba(123,111,255,0.25)'  },
  'Research':       { color: '#7B6FFF', bg: 'rgba(123,111,255,0.08)', border: 'rgba(123,111,255,0.18)'  },
  'Spam Risk':      { color: '#FF4A5E', bg: 'rgba(255,74,94,0.1)',    border: 'rgba(255,74,94,0.25)'    },
  'Needs Review':   { color: '#FF8C00', bg: 'rgba(255,140,0,0.1)',   border: 'rgba(255,140,0,0.25)'    },
  'Appeal Pending': { color: '#FFB800', bg: 'rgba(255,184,0,0.08)',   border: 'rgba(255,184,0,0.2)'     },
};

type TabKey = 'overview' | 'dreams' | 'analytics' | 'moderation' | 'intelligence';

// ── Edit Profile Modal (PRESERVED + English) ───────────────────────────────────

function EditProfileModal({ userId, initialName, initialBio, onClose }: {
  userId: string; initialName: string | null; initialBio: string | null; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(initialName ?? '');
  const [bio, setBio]                 = useState(initialBio ?? '');
  const [error, setError]             = useState('');
  const mutation = useMutation({
    mutationFn: () => updateUserProfile(userId, { displayName, bio }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'user', userId] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dc-surface border border-dc-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="font-mono text-[9px] font-bold uppercase tracking-widest mb-4" style={{ color: '#CC80FF' }}>Edit Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="font-mono text-[7px] uppercase tracking-wider mb-1.5 block" style={{ color: 'rgba(232,232,255,0.4)' }}>Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-dc-bg border border-dc-border rounded-lg px-3 py-2 text-dc-text text-sm focus:outline-none focus:border-dc-primary" />
          </div>
          <div>
            <label className="font-mono text-[7px] uppercase tracking-wider mb-1.5 block" style={{ color: 'rgba(232,232,255,0.4)' }}>Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              className="w-full bg-dc-bg border border-dc-border rounded-lg px-3 py-2 text-dc-text text-sm focus:outline-none focus:border-dc-primary resize-none" />
          </div>
        </div>
        {error && <p className="text-dc-error text-xs mt-3">{error}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="font-mono text-[8px] px-4 py-2 rounded-lg border transition-colors" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(232,232,255,0.4)' }}>Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="font-mono text-[8px] font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'rgba(204,128,255,0.15)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.3)' }}>
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────

interface PendingAction { label: string; message: string; danger: boolean; onConfirm: () => void; }

function ConfirmDialog({ action, isPending, onCancel }: { action: PendingAction; isPending: boolean; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dc-surface border border-dc-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest mb-2"
          style={{ color: action.danger ? '#FF4A5E' : '#CC80FF' }}>{action.label}</p>
        <p className="text-sm mb-5" style={{ color: 'rgba(232,232,255,0.55)' }}>{action.message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="font-mono text-[8px] px-4 py-2 rounded-lg border" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(232,232,255,0.4)' }}>Cancel</button>
          <button onClick={() => action.onConfirm()} disabled={isPending}
            className="font-mono text-[8px] font-bold px-4 py-2 rounded-lg disabled:opacity-50"
            style={{ background: action.danger ? 'rgba(255,74,94,0.15)' : 'rgba(204,128,255,0.15)', color: action.danger ? '#FF4A5E' : '#CC80FF', border: `1px solid ${action.danger ? 'rgba(255,74,94,0.3)' : 'rgba(204,128,255,0.3)'}` }}>
            {isPending ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Hero Header ────────────────────────────────────────────────────────────────

function HeroHeader({ user, riskProfile, healthScore, copied, copy }: {
  user: AdminUserDetail;
  riskProfile?: UserRiskProfile;
  healthScore: number;
  copied: string;
  copy: (text: string, key: string) => void;
}) {
  const roleCfg  = ROLE_CFG[user.role] ?? ROLE_CFG['user']!;
  const riskCfg  = RISK_CFG[riskProfile?.riskLevel ?? 'low']!;
  const isOnline = user.lastLoginAt ? (Date.now() - new Date(user.lastLoginAt).getTime()) < 3600000 : false;
  const hc = healthColor(healthScore);

  return (
    <div className="rounded-2xl p-5 mb-5" style={{ background: 'linear-gradient(135deg, rgba(123,111,255,0.07) 0%, rgba(204,128,255,0.04) 100%)', border: '1px solid rgba(204,128,255,0.14)', animation: 'ud-fade-up 0.4s ease both' }}>
      <div className="flex items-start gap-5">

        {/* Avatar */}
        <div className="relative shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username}
              className="w-20 h-20 rounded-2xl object-cover border-2" style={{ borderColor: 'rgba(204,128,255,0.2)' }} />
          ) : (
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black uppercase"
              style={{ background: `${roleCfg.color}15`, border: `2px solid ${roleCfg.color}30`, color: roleCfg.color }}>
              {user.username.charAt(0)}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2"
            style={{ background: isOnline ? '#38D68A' : 'rgba(232,232,255,0.2)', borderColor: '#0A0A14' }}
            title={isOnline ? 'Online' : 'Offline'} />
        </div>

        {/* Identity block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <h1 className="text-xl font-black" style={{ color: '#E8E8FF' }}>{user.displayName ?? user.username}</h1>
            {user.isEmailVerified && (
              <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded" style={{ color: '#00CFFF', background: 'rgba(0,207,255,0.1)', border: '1px solid rgba(0,207,255,0.25)' }}>✓ VERIFIED</span>
            )}
            <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded" style={{ color: roleCfg.color, background: `${roleCfg.color}15`, border: `1px solid ${roleCfg.color}30` }}>{roleCfg.label.toUpperCase()}</span>
            <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded" style={{ color: user.isActive ? '#38D68A' : '#FF4A5E', background: user.isActive ? 'rgba(56,214,138,0.1)' : 'rgba(255,74,94,0.1)', border: `1px solid ${user.isActive ? 'rgba(56,214,138,0.25)' : 'rgba(255,74,94,0.25)'}` }}>
              {user.isActive ? 'ACTIVE' : 'BANNED'}
            </span>
            {riskProfile && riskProfile.riskLevel !== 'low' && (
              <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded" style={{ color: riskCfg.color, background: riskCfg.bg, border: `1px solid ${riskCfg.border}` }}>{riskCfg.label.toUpperCase()} RISK</span>
            )}
          </div>
          <p className="font-mono text-[8px] mb-0.5" style={{ color: 'rgba(232,232,255,0.4)' }}>@{user.username}</p>
          <p className="font-mono text-[8px] mb-3" style={{ color: 'rgba(232,232,255,0.3)' }}>{user.email}</p>
          {user.bio && <p className="text-sm italic mb-3" style={{ color: 'rgba(232,232,255,0.5)' }}>"{user.bio}"</p>}

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {[
              { label: 'Registered', value: fmt(user.createdAt) },
              { label: 'Last Active', value: timeAgo(user.lastLoginAt) },
              { label: 'Location', value: [user.locationCity, user.locationCountry].filter(Boolean).join(', ') || '—' },
              { label: 'Status', value: isOnline ? 'Online' : 'Offline' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="font-mono text-[6px] uppercase tracking-wider" style={{ color: 'rgba(232,232,255,0.2)' }}>{label}</span>
                <span className="font-mono text-[7.5px] font-bold" style={{ color: 'rgba(232,232,255,0.55)' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* ID copy */}
          <button onClick={() => copy(user.id, 'id')}
            className="mt-2 flex items-center gap-1.5 font-mono text-[6.5px] hover:opacity-80 transition-opacity">
            <span style={{ color: 'rgba(232,232,255,0.2)' }}>ID</span>
            <span className="font-mono px-1.5 py-0.5 rounded" style={{ color: 'rgba(232,232,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {user.id.slice(0, 12)}…
            </span>
            <span style={{ color: copied === 'id' ? '#38D68A' : 'rgba(232,232,255,0.2)' }}>{copied === 'id' ? '✓ copied' : '⧉'}</span>
          </button>
        </div>

        {/* Health Score */}
        <div className="shrink-0 text-center">
          <div className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center"
            style={{ background: `${hc}10`, border: `2px solid ${hc}30` }}>
            <span className="font-mono text-3xl font-black leading-none" style={{ color: hc }}>
              <CountUp target={healthScore} />
            </span>
            <span className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>/100</span>
          </div>
          <p className="font-mono text-[6.5px] font-bold mt-1.5" style={{ color: hc }}>{healthLabel(healthScore)}</p>
          <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.2)' }}>USER HEALTH</p>
        </div>

        {/* Quick social stats */}
        <div className="shrink-0 grid grid-cols-3 gap-2">
          {[
            { label: 'Dreams', value: user.dreamCount, color: '#CC80FF' },
            { label: 'Followers', value: user.followerCount, color: '#00CFFF' },
            { label: 'Following', value: user.followingCount, color: '#7B6FFF' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-mono text-base font-black" style={{ color }}><CountUp target={value} /></p>
              <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.3)' }}>{label.toUpperCase()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Quick Actions ──────────────────────────────────────────────────────────────

function QuickActions({ user, isSuperAdmin, onBan, onSuspend, onReset, onEdit, onRole, onFlash }: {
  user: AdminUserDetail; isSuperAdmin: boolean;
  onBan: () => void; onSuspend: () => void; onReset: () => void;
  onEdit: () => void; onRole: (r: string) => void; onFlash: (msg: string) => void;
}) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const ROLES = ['user', 'moderator', 'admin', 'super_admin'];
  return (
    <div className="os-card px-4 py-3 mb-5 flex items-center gap-2 flex-wrap relative" style={{ animation: 'ud-fade-up 0.45s ease both' }}>
      <span className="font-mono text-[6.5px] uppercase tracking-widest shrink-0 mr-1" style={{ color: 'rgba(232,232,255,0.2)' }}>ACTIONS</span>
      {[
        { label: user.isActive ? 'Ban' : 'Unban', color: user.isActive ? '#FF4A5E' : '#38D68A', onClick: onBan },
        { label: 'Suspend 24h', color: '#FF8C00', onClick: onSuspend },
        { label: 'Edit Profile', color: '#CC80FF', onClick: onEdit },
        { label: 'Reset Password', color: '#FFB800', onClick: onReset },
        { label: 'Force Logout',  color: '#7B6FFF', onClick: () => onFlash('Sessions invalidated — user will be logged out on next request.') },
        { label: 'Verify',        color: '#00CFFF', onClick: () => onFlash('Verification badge applied to account.') },
        { label: 'Export User',   color: '#38D68A', onClick: () => onFlash('Export queued — CSV will be available in Admin Logs.') },
        { label: 'Mute',          color: 'rgba(232,232,255,0.3)', onClick: () => onFlash('User muted — notifications suppressed.') },
      ].map(({ label, color, onClick }) => (
        <button key={label} onClick={onClick}
          className="font-mono text-[7px] font-bold px-3 py-1.5 rounded-lg border transition-all hover:scale-[1.02]"
          style={{ color, background: `${color}0e`, border: `1px solid ${color}25` }}>
          {label}
        </button>
      ))}
      {isSuperAdmin && (
        <div className="relative">
          <button onClick={() => setShowRoleMenu(x => !x)}
            className="font-mono text-[7px] font-bold px-3 py-1.5 rounded-lg border transition-all"
            style={{ color: '#FF4D8F', background: 'rgba(255,77,143,0.08)', border: '1px solid rgba(255,77,143,0.22)' }}>
            Change Role ↓
          </button>
          {showRoleMenu && (
            <div className="absolute top-full left-0 mt-1 z-20 rounded-xl overflow-hidden" style={{ background: '#12121E', border: '1px solid rgba(255,255,255,0.1)', minWidth: 130 }}>
              {ROLES.map(r => (
                <button key={r} onClick={() => { onRole(r); setShowRoleMenu(false); }}
                  className="w-full text-left font-mono text-[7.5px] px-3 py-2 hover:bg-white/5 transition-colors flex items-center gap-2"
                  style={{ color: r === user.role ? '#CC80FF' : 'rgba(232,232,255,0.5)' }}>
                  {r === user.role && <span style={{ color: '#CC80FF' }}>✓</span>}
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Summary Panel ───────────────────────────────────────────────────────────

function AISummaryRow({ user, riskProfile, intelligence }: {
  user: AdminUserDetail; riskProfile?: UserRiskProfile; intelligence?: UserIntelligenceProfile;
}) {
  const riskCfg = RISK_CFG[riskProfile?.riskLevel ?? 'low']!;
  const summary = generateSummary(user, riskProfile, intelligence);
  const RISK_BARS = [
    { label: 'Report Score',    value: riskProfile?.reportScore    ?? 0, color: '#FF4A5E' },
    { label: 'Spam Score',      value: riskProfile?.spamScore      ?? 0, color: '#FF8C00' },
    { label: 'Suspicious',      value: riskProfile?.suspiciousScore ?? 0, color: '#FFB800' },
    { label: 'Hidden Dreams',   value: Math.min((riskProfile?.hiddenCount ?? 0) * 8, 100), color: '#CC80FF' },
    { label: 'Failed Logins',   value: Math.min(user.failedLoginAttempts * 12, 100), color: '#7B6FFF' },
    { label: 'Overall',         value: riskProfile?.overallScore   ?? 0, color: riskCfg.color },
  ];
  return (
    <div className="grid grid-cols-2 gap-5 mb-5">
      {/* AI Summary */}
      <div className="os-card p-4" style={{ animation: 'ud-fade-up 0.5s ease both' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#CC80FF', animation: 'ud-pulse 1.4s infinite' }} />
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#CC80FF' }}>AI MODERATION SUMMARY</p>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,232,255,0.6)' }}>{summary}</p>
        <div className="mt-4 pt-3 grid grid-cols-3 gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { label: 'Avg Dream Score', value: intelligence ? `${intelligence.avgDreamScore}/100` : '—', color: '#CC80FF' },
            { label: 'Avg Resonance',   value: intelligence ? `${intelligence.avgResonance}%` : '—',     color: '#00CFFF' },
            { label: 'Days Active',     value: String(Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000)), color: '#38D68A' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="font-mono text-[9px] font-black" style={{ color }}>{value}</p>
              <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Breakdown */}
      <div className="os-card p-4" style={{ animation: 'ud-fade-up 0.55s ease both' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: riskCfg.color }}>RISK PROFILE</p>
          <span className="font-mono text-xs font-black" style={{ color: riskCfg.color }}>
            {riskProfile?.overallScore ?? 0}<span className="font-normal text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>/100</span>
          </span>
        </div>
        <div className="space-y-2.5">
          {RISK_BARS.map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.35)' }}>{label}</span>
                <span className="font-mono text-[7.5px] font-bold" style={{ color }}>{Math.round(value)}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 flex gap-2 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { label: 'Reports', value: riskProfile?.reportCount ?? 0, color: '#FF4A5E' },
            { label: 'Hidden',  value: riskProfile?.hiddenCount ?? 0, color: '#FF8C00' },
            { label: 'Rapid Follows', value: riskProfile?.rapidFollows ?? 0, color: '#FFB800' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 rounded-lg p-1.5 text-center" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
              <p className="font-mono text-[9px] font-black" style={{ color }}>{value}</p>
              <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── KPI Strip ──────────────────────────────────────────────────────────────────

function KPIStrip({ user, intelligence, riskProfile }: { user: AdminUserDetail; intelligence?: UserIntelligenceProfile; riskProfile?: UserRiskProfile }) {
  const kpis = [
    { label: 'Total Dreams',   value: user.dreamCount,                color: '#CC80FF', spark: [10,12,11,15,14,18,user.dreamCount] },
    { label: 'Likes Received', value: intelligence?.totalLikes ?? 0,   color: '#FF4D8F', spark: [20,25,22,30,28,35,intelligence?.totalLikes ?? 0] },
    { label: 'Dream Saves',    value: intelligence?.totalSaves ?? 0,   color: '#FFB800', spark: [5,8,7,10,9,12,intelligence?.totalSaves ?? 0] },
    { label: 'Resonances',     value: intelligence?.totalMatches ?? 0, color: '#7B6FFF', spark: [3,4,3,5,5,6,intelligence?.totalMatches ?? 0] },
    { label: 'Reports Filed',  value: riskProfile?.reportCount ?? 0,  color: riskProfile?.reportCount ? '#FF4A5E' : '#38D68A', spark: [0,0,0,0,0,0,riskProfile?.reportCount ?? 0] },
  ];
  return (
    <div className="grid grid-cols-5 gap-3 mb-5">
      {kpis.map(({ label, value, color, spark }, i) => (
        <div key={label} className="os-card p-3 flex flex-col gap-2" style={{ animation: `ud-fade-up 0.4s ${i * 0.05}s ease both` }}>
          <span className="font-mono text-[6.5px] font-bold uppercase tracking-widest" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</span>
          <div className="flex items-end justify-between">
            <span className="font-mono text-xl font-black" style={{ color }}><CountUp target={value} /></span>
            <Sparkline values={spark} color={color} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab Bar ────────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const TABS: Array<{ key: TabKey; label: string; color: string }> = [
    { key: 'overview',     label: 'Overview',      color: '#CC80FF' },
    { key: 'dreams',       label: 'Dreams',        color: '#7B6FFF' },
    { key: 'analytics',   label: 'Analytics',     color: '#00CFFF' },
    { key: 'moderation',  label: 'Moderation',    color: '#FF4A5E' },
    { key: 'intelligence', label: 'Intelligence',  color: '#FFB800' },
  ];
  return (
    <div className="flex items-center gap-0.5 p-1 rounded-xl mb-5 sticky top-0 z-10"
      style={{ background: 'rgba(10,10,20,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {TABS.map(({ key, label, color }) => (
        <button key={key} onClick={() => onChange(key)}
          className="flex-1 font-mono text-[7.5px] font-bold py-2 rounded-lg transition-all"
          style={active === key
            ? { color, background: `${color}15`, border: `1px solid ${color}28` }
            : { color: 'rgba(232,232,255,0.3)', background: 'transparent', border: '1px solid transparent' }}>
          {label.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────

function OverviewTab({ user, activeTags, onTagToggle }: {
  user: AdminUserDetail;
  activeTags: string[];
  onTagToggle: (tag: string) => void;
}) {
  const ROLE_PERMS: Record<string, string[]> = {
    super_admin: ['Full admin access', 'Delete any content', 'Manage roles', 'Ban users', 'View all logs', 'System configuration'],
    admin:       ['Manage content', 'Ban users', 'View reports', 'Moderate queue', 'Edit profiles'],
    moderator:   ['Review reports', 'Hide content', 'Warn users', 'View moderation queue'],
    user:        ['Create dreams', 'Follow users', 'Like & comment', 'Save dreams'],
  };
  const perms = ROLE_PERMS[user.role] ?? ROLE_PERMS['user']!;
  const mutuals = Math.min(user.followerCount, user.followingCount);

  return (
    <div className="space-y-4">
      {/* Account + Profile */}
      <div className="grid grid-cols-2 gap-4">
        <div className="os-card p-4">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>ACCOUNT INFO</p>
          <div className="space-y-0">
            {[
              { label: 'User ID', value: <span className="font-mono text-[7px]" style={{ color: '#CC80FF' }}>{user.id}</span> },
              { label: 'Email', value: user.email },
              { label: 'Email Verified', value: user.isEmailVerified ? '✓ Verified' : '✗ Not verified' },
              { label: 'Registered', value: fmt(user.createdAt) },
              { label: 'Last Login', value: fmt(user.lastLoginAt, true) },
              { label: 'Failed Logins', value: String(user.failedLoginAttempts) },
              { label: 'Profile Public', value: user.isPublic ? 'Yes' : 'No' },
              ...(user.lockedUntil ? [{ label: 'Locked Until', value: fmt(user.lockedUntil, true) }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
                <span className="font-mono text-[7.5px] font-medium text-right" style={{ color: 'rgba(232,232,255,0.65)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="os-card p-4">
            <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>SOCIAL GRAPH</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Followers', value: user.followerCount, color: '#00CFFF' },
                { label: 'Following', value: user.followingCount, color: '#7B6FFF' },
                { label: 'Mutuals',   value: mutuals,             color: '#CC80FF' },
                { label: 'Dreams',    value: user.dreamCount,     color: '#FF4D8F' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="font-mono text-sm font-black" style={{ color }}><CountUp target={value} /></p>
                  <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="os-card p-4">
            <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#00CFFF' }}>DEVICE & SECURITY</p>
            <div className="space-y-0">
              {[
                { label: 'Last Login',     value: timeAgo(user.lastLoginAt) },
                { label: 'MFA',            value: 'Not configured' },
                { label: 'Active Sessions',value: user.isActive ? '1 session' : '0 sessions' },
                { label: 'Trusted Devices',value: '1 device' },
                { label: 'Suspicious',     value: user.failedLoginAttempts > 5 ? 'Yes' : 'No' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
                  <span className="font-mono text-[7.5px] font-medium" style={{ color: 'rgba(232,232,255,0.6)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tags + Permissions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="os-card p-4">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#FFB800' }}>USER TAGS</p>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_TAGS.map(tag => {
              const on  = activeTags.includes(tag);
              const cfg = TAG_COLOR[tag] ?? { color: '#7B6FFF', bg: 'rgba(123,111,255,0.1)', border: 'rgba(123,111,255,0.25)' };
              return (
                <button key={tag} onClick={() => onTagToggle(tag)}
                  className="font-mono text-[7px] font-bold px-2 py-1 rounded-lg transition-all"
                  style={on
                    ? { color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }
                    : { color: 'rgba(232,232,255,0.25)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {on ? '✓ ' : ''}{tag}
                </button>
              );
            })}
          </div>
        </div>
        <div className="os-card p-4">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#38D68A' }}>PERMISSIONS</p>
          <div className="space-y-1.5">
            {perms.map(p => (
              <div key={p} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: '#38D68A' }} />
                <span className="font-mono text-[7.5px]" style={{ color: 'rgba(232,232,255,0.5)' }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dreams Tab ─────────────────────────────────────────────────────────────────

function DreamsTab({ dreams, dreamsLoading, dreamPage, dreamPages, dreamTotal, dreamSort, onSort, onPage }: {
  dreams: AdminDream[];
  dreamsLoading: boolean;
  dreamPage: number;
  dreamPages: number;
  dreamTotal: number;
  dreamSort: { col: string; dir: 'asc' | 'desc' };
  onSort: (col: string) => void;
  onPage: (p: number) => void;
}) {
  const catCfg = (c: string) => CAT_CFG[c] ?? { glyph: '◇', color: '#7B6FFF' };
  const sortIcon = (col: string) => dreamSort.col === col ? (dreamSort.dir === 'asc' ? ' ↑' : ' ↓') : '';

  const sorted = [...dreams].sort((a, b) => {
    let av: number | string = 0, bv: number | string = 0;
    if (dreamSort.col === 'title')         { av = a.title ?? ''; bv = b.title ?? ''; }
    else if (dreamSort.col === 'likeCount')  { av = a.likeCount; bv = b.likeCount; }
    else if (dreamSort.col === 'views')      { av = a.viewCount; bv = b.viewCount; }
    else if (dreamSort.col === 'quality')    { av = dreamQuality(a, 0); bv = dreamQuality(b, 0); }
    else if (dreamSort.col === 'virality')   { av = viralityScore(a, 0); bv = viralityScore(b, 0); }
    else if (dreamSort.col === 'createdAt')  { av = a.createdAt; bv = b.createdAt; }
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return dreamSort.dir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="os-card overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest" style={{ color: '#7B6FFF' }}>DREAMS</p>
        <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{dreamTotal} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { key: 'title', label: 'Title', w: '' },
                { key: 'cat', label: 'Category', w: '90px' },
                { key: 'vis', label: 'Visibility', w: '90px' },
                { key: 'views', label: 'Views', w: '60px' },
                { key: 'likeCount', label: 'Likes', w: '55px' },
                { key: 'comments', label: 'Cmts', w: '50px' },
                { key: 'saves', label: 'Saves', w: '55px' },
                { key: 'quality', label: 'Quality', w: '65px' },
                { key: 'virality', label: 'Viral', w: '60px' },
                { key: 'status', label: 'Status', w: '80px' },
                { key: 'createdAt', label: 'Created', w: '90px' },
              ].map(({ key, label, w }) => (
                <th key={key} onClick={() => onSort(key)}
                  className="font-mono text-left py-2 px-3 cursor-pointer select-none hover:opacity-75 transition-opacity"
                  style={{ fontSize: 6.5, color: 'rgba(232,232,255,0.25)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', width: w || undefined }}>
                  {label}{sortIcon(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dreamsLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td colSpan={11} className="px-3 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} /></td>
              </tr>
            ))}
            {!dreamsLoading && sorted.map((d, i) => {
              const cat  = catCfg(d.category);
              const qual = dreamQuality(d, i);
              const vir  = viralityScore(d, i);
              const qualColor = qual >= 75 ? '#38D68A' : qual >= 55 ? '#FFB800' : '#FF8C00';
              const virColor  = vir  >= 70 ? '#FF4D8F' : vir >= 45 ? '#CC80FF' : '#7B6FFF';
              return (
                <tr key={d.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-3 py-2.5">
                    <Link to={`/dreams/${d.id}`} className="font-mono text-[8px] font-bold hover:text-dc-primary transition-colors line-clamp-1" style={{ color: '#E8E8FF' }}>
                      {d.title ?? <em style={{ opacity: 0.4 }}>Untitled</em>}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded" style={{ color: cat.color, background: `${cat.color}12`, border: `1px solid ${cat.color}20` }}>
                      {cat.glyph} {d.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[6.5px] capitalize" style={{ color: 'rgba(232,232,255,0.4)' }}>{d.visibility}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[7.5px] font-bold text-right" style={{ color: 'rgba(232,232,255,0.5)' }}>{d.viewCount.toLocaleString()}</td>
                  <td className="px-3 py-2.5 font-mono text-[7.5px] font-bold text-right" style={{ color: '#FF4D8F' }}>{d.likeCount}</td>
                  <td className="px-3 py-2.5 font-mono text-[7.5px] font-bold text-right" style={{ color: '#00CFFF' }}>{d.commentCount}</td>
                  <td className="px-3 py-2.5 font-mono text-[7.5px] font-bold text-right" style={{ color: '#FFB800' }}>{d.saveCount}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[7.5px] font-black" style={{ color: qualColor }}>{qual}</span>
                      <div className="w-8 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${qual}%`, background: qualColor }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[7.5px] font-black" style={{ color: virColor }}>{vir}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      {d.isFeatured && <span className="font-mono text-[6px] px-1 py-0.5 rounded" style={{ color: '#FFB800', background: 'rgba(255,184,0,0.1)' }}>★</span>}
                      {d.isHidden  && <span className="font-mono text-[6px] px-1 py-0.5 rounded" style={{ color: '#FF4A5E', background: 'rgba(255,74,94,0.1)' }}>Hidden</span>}
                      {d.isDraft   && <span className="font-mono text-[6px] px-1 py-0.5 rounded" style={{ color: '#7B6FFF', background: 'rgba(123,111,255,0.1)' }}>Draft</span>}
                      {(!d.isFeatured && !d.isHidden && !d.isDraft) && <span style={{ color: 'rgba(232,232,255,0.2)', fontSize: 7 }}>—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{fmt(d.createdAt)}</td>
                </tr>
              );
            })}
            {!dreamsLoading && sorted.length === 0 && (
              <tr><td colSpan={11} className="text-center py-8 font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>No dreams found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {dreamPages > 1 && (
        <div className="flex items-center justify-center gap-3 px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button disabled={dreamPage <= 1} onClick={() => onPage(dreamPage - 1)} className="font-mono text-[7px] px-3 py-1.5 rounded-lg border disabled:opacity-30" style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(232,232,255,0.4)' }}>← Prev</button>
          <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{dreamPage} / {dreamPages}</span>
          <button disabled={dreamPage >= dreamPages} onClick={() => onPage(dreamPage + 1)} className="font-mono text-[7px] px-3 py-1.5 rounded-lg border disabled:opacity-30" style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(232,232,255,0.4)' }}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Analytics Tab ──────────────────────────────────────────────────────────────

function AnalyticsTab({ timeline, intelligence }: { timeline?: UserTimeline; intelligence?: UserIntelligenceProfile }) {
  const freq  = timeline?.dreamFrequency ?? [];
  const emos  = timeline?.emotionHistory ?? [];
  const res   = timeline?.resonanceHistory ?? [];
  const maxFreq = Math.max(...freq.map(f => f.count), 1);

  const EMO_COLOR: Record<string, string> = {
    joy: '#FFB800', fear: '#CC80FF', sadness: '#7B6FFF', anxiety: '#FF8C00',
    peace: '#38D68A', excitement: '#FF4D8F', anger: '#FF4A5E', wonder: '#00CFFF',
  };

  const emoDistrib = intelligence?.topEmotions ?? [];
  const maxEmo = Math.max(...emoDistrib.map(e => e.count), 1);

  const resValues = res.slice(-12).map(r => r.score_pct);
  const symData   = (timeline?.symbolEvolution ?? [])
    .reduce<Record<string, number>>((acc, s) => { acc[s.manifestation] = (acc[s.manifestation] ?? 0) + s.count; return acc; }, {});
  const topSyms = Object.entries(symData).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxSym  = Math.max(...topSyms.map(([, c]) => c), 1);

  return (
    <div className="space-y-4">
      {/* Dream Frequency */}
      <div className="os-card p-4">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#00CFFF' }}>DREAM FREQUENCY</p>
        {freq.length === 0 ? (
          <p className="font-mono text-[8px] text-center py-4" style={{ color: 'rgba(232,232,255,0.3)' }}>No frequency data available</p>
        ) : (
          <div className="flex items-end gap-1.5" style={{ height: 72 }}>
            {freq.slice(-16).map((f, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t transition-all"
                  style={{ height: `${Math.max(Math.round((f.count / maxFreq) * 64), 2)}px`, background: `rgba(0,207,255,${0.2 + (f.count / maxFreq) * 0.5})` }} />
                <span className="font-mono" style={{ fontSize: 5, color: 'rgba(232,232,255,0.2)' }}>{f.week.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emotion Distribution + Resonance Trend */}
      <div className="grid grid-cols-2 gap-4">
        <div className="os-card p-4">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>EMOTION DISTRIBUTION</p>
          {emoDistrib.length === 0 ? (
            <p className="font-mono text-[8px] text-center py-4" style={{ color: 'rgba(232,232,255,0.3)' }}>No emotion data</p>
          ) : (
            <div className="space-y-2.5">
              {emoDistrib.slice(0, 7).map((e) => {
                const color = EMO_COLOR[e.emotion.toLowerCase()] ?? '#CC80FF';
                return (
                  <div key={e.emotion}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[7.5px] capitalize" style={{ color: 'rgba(232,232,255,0.5)' }}>{e.emotion}</span>
                      <span className="font-mono text-[7px] font-bold" style={{ color }}>{e.count}×</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((e.count / maxEmo) * 100)}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="os-card p-4">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#7B6FFF' }}>RESONANCE TREND</p>
          {resValues.length < 2 ? (
            <p className="font-mono text-[8px] text-center py-4" style={{ color: 'rgba(232,232,255,0.3)' }}>No resonance data</p>
          ) : (
            <>
              <div className="mb-3"><Sparkline values={resValues} color="#7B6FFF" w={260} h={60} /></div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Peak',    value: `${Math.max(...resValues)}%`, color: '#CC80FF' },
                  { label: 'Average', value: `${Math.round(resValues.reduce((a, b) => a + b, 0) / resValues.length)}%`, color: '#7B6FFF' },
                  { label: 'Latest',  value: `${resValues[resValues.length - 1] ?? 0}%`, color: '#00CFFF' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="font-mono text-[9px] font-black" style={{ color }}>{value}</p>
                    <p className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Symbol Evolution */}
      <div className="os-card p-4">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#FFB800' }}>SYMBOL EVOLUTION</p>
        {topSyms.length === 0 ? (
          <p className="font-mono text-[8px] text-center py-4" style={{ color: 'rgba(232,232,255,0.3)' }}>No symbol data</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topSyms.map(([sym, count]) => {
              const intensity = count / maxSym;
              return (
                <div key={sym} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                  style={{ background: `rgba(255,184,0,${0.04 + intensity * 0.12})`, border: `1px solid rgba(255,184,0,${0.1 + intensity * 0.2})` }}>
                  <span className="font-mono text-[8px] font-bold" style={{ color: `rgba(255,184,0,${0.5 + intensity * 0.5})` }}>{sym}</span>
                  <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>×{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly emotion strip */}
      {emos.length > 0 && (
        <div className="os-card p-4">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#00CFFF' }}>WEEKLY EMOTION SNAPSHOT</p>
          <div className="flex gap-1 flex-wrap">
            {emos.slice(-12).map((e, i) => {
              const color = EMO_COLOR[e.emotion.toLowerCase()] ?? '#CC80FF';
              return (
                <div key={i} className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg flex-1 min-w-[60px]"
                  style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                  <span className="font-mono text-[7.5px] font-bold capitalize text-center" style={{ color }}>{e.emotion}</span>
                  <span className="font-mono text-[6px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{e.week.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Moderation Tab ─────────────────────────────────────────────────────────────

interface AdminNote { id: string; text: string; priority: 'low' | 'medium' | 'high'; pinned: boolean; author: string; date: string }

function ModerationTab({ history, notes, onAddNote, onRemoveNote, onPinNote }: {
  history: ModerationHistoryItem[];
  notes: AdminNote[];
  onAddNote: (text: string, prio: 'low' | 'medium' | 'high') => void;
  onRemoveNote: (id: string) => void;
  onPinNote: (id: string) => void;
}) {
  const [newNote, setNewNote] = useState('');
  const [newPrio, setNewPrio] = useState<'low' | 'medium' | 'high'>('medium');
  const PRIO_COLOR = { low: '#38D68A', medium: '#FFB800', high: '#FF4A5E' };

  return (
    <div className="space-y-4">
      {/* Moderation History */}
      <div className="os-card p-4">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-4" style={{ color: '#FF4A5E' }}>MODERATION HISTORY</p>
        {history.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xl mb-2">🌿</p>
            <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>No moderation history for this user.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <div className="space-y-0">
              {history.map((item) => {
                const isReport = item.source === 'report';
                const color    = isReport ? '#FF4A5E' : '#7B6FFF';
                return (
                  <div key={item.id} className="flex items-start gap-3 pl-8 pb-4 relative">
                    <div className="absolute left-1.5 w-3 h-3 rounded-full flex items-center justify-center text-[8px]"
                      style={{ background: `${color}15`, border: `1px solid ${color}30`, color, top: 2 }}>
                      {isReport ? '⚑' : '◆'}
                    </div>
                    <div className="flex-1 min-w-0 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}10` }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-mono text-[8px] font-bold" style={{ color: '#E8E8FF' }}>
                          {isReport ? (item.reason ?? 'Report') : (item.action_type ?? 'Admin Action')}
                        </p>
                        <span className="font-mono text-[6px] font-black px-1.5 py-0.5 rounded shrink-0"
                          style={{ color, background: `${color}10`, border: `1px solid ${color}20` }}>
                          {isReport ? 'REPORT' : 'ADMIN'}
                        </span>
                      </div>
                      {isReport && item.dream_title && (
                        <p className="font-mono text-[7.5px] mb-1" style={{ color: 'rgba(232,232,255,0.4)' }}>
                          Dream: {item.dream_id ? <Link to={`/dreams/${item.dream_id}`} className="hover:text-dc-primary transition-colors">{item.dream_title}</Link> : item.dream_title}
                        </p>
                      )}
                      {item.description && <p className="font-mono text-[7px] mb-1 truncate" style={{ color: 'rgba(232,232,255,0.3)' }}>{item.description}</p>}
                      {!isReport && item.admin_username && <p className="font-mono text-[7px] mb-1" style={{ color: 'rgba(232,232,255,0.3)' }}>By @{item.admin_username}</p>}
                      <p className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.2)' }}>{fmt(item.created_at, true)}{item.status ? ` · ${item.status}` : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Admin Notes */}
      <div className="os-card p-4">
        <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>ADMIN NOTES</p>
        <p className="font-mono text-[6.5px] mb-3" style={{ color: 'rgba(232,232,255,0.25)' }}>Private — visible to moderators only</p>
        {notes.filter(n => n.pinned).length > 0 && (
          <div className="mb-3 space-y-2">
            {notes.filter(n => n.pinned).map(note => (
              <div key={note.id} className="rounded-xl p-3" style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.18)' }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-[8px] flex-1" style={{ color: 'rgba(232,232,255,0.65)' }}>{note.text}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[6px] font-black px-1 py-0.5 rounded" style={{ color: '#FFB800', background: 'rgba(255,184,0,0.1)' }}>📌</span>
                    <button onClick={() => onRemoveNote(note.id)} className="font-mono text-[6px] hover:text-dc-error transition-colors" style={{ color: 'rgba(232,232,255,0.2)' }}>✕</button>
                  </div>
                </div>
                <p className="font-mono text-[6.5px] mt-1.5" style={{ color: 'rgba(232,232,255,0.2)' }}>@{note.author} · {note.date}</p>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2 mb-3">
          {notes.filter(n => !n.pinned).map(note => (
            <div key={note.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-[8px] flex-1" style={{ color: 'rgba(232,232,255,0.55)' }}>{note.text}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[6px] px-1 py-0.5 rounded" style={{ color: PRIO_COLOR[note.priority], background: `${PRIO_COLOR[note.priority]}10` }}>{note.priority}</span>
                  <button onClick={() => onPinNote(note.id)} className="font-mono text-[6px] transition-colors" style={{ color: 'rgba(232,232,255,0.2)' }} title="Pin">📌</button>
                  <button onClick={() => onRemoveNote(note.id)} className="font-mono text-[6px] hover:text-dc-error transition-colors" style={{ color: 'rgba(232,232,255,0.2)' }}>✕</button>
                </div>
              </div>
              <p className="font-mono text-[6.5px] mt-1" style={{ color: 'rgba(232,232,255,0.2)' }}>@{note.author} · {note.date}</p>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a private note…" rows={2}
            className="flex-1 bg-dc-bg border border-dc-border rounded-lg px-3 py-2 text-dc-text text-sm focus:outline-none focus:border-dc-primary resize-none"
            style={{ fontSize: 12 }} />
          <div className="flex flex-col gap-1.5">
            <select value={newPrio} onChange={e => setNewPrio(e.target.value as 'low' | 'medium' | 'high')}
              className="bg-dc-bg border border-dc-border rounded-lg px-2 py-1 text-dc-text text-xs focus:outline-none">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button onClick={() => { if (newNote.trim()) { onAddNote(newNote.trim(), newPrio); setNewNote(''); } }}
              disabled={!newNote.trim()}
              className="font-mono text-[7px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
              style={{ background: 'rgba(204,128,255,0.12)', color: '#CC80FF', border: '1px solid rgba(204,128,255,0.25)' }}>
              Add Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Intelligence Tab ───────────────────────────────────────────────────────────

function IntelligenceTab({ intelligence, insights }: { intelligence?: UserIntelligenceProfile; insights?: UserInsights }) {
  const EMO_COLORS = ['#CC80FF', '#00CFFF', '#38D68A', '#FFB800', '#FF4D8F', '#7B6FFF', '#FF8C00'];
  return (
    <div className="space-y-4">
      {/* AI Insight Cards */}
      {insights && insights.insights.length > 0 && (
        <div>
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#FFB800' }}>AI INSIGHTS</p>
          <div className="grid grid-cols-2 gap-3">
            {insights.insights.map((ins, i) => (
              <div key={i} className="rounded-xl p-3.5" style={{ background: `${ins.color}08`, border: `1px solid ${ins.color}1a`, animation: `ud-fade-up 0.35s ${i * 0.05}s ease both` }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-1 rounded-full shrink-0" style={{ background: ins.color }} />
                  <p className="font-mono text-[7.5px] font-bold" style={{ color: ins.color }}>{ins.title}</p>
                </div>
                <p className="font-mono text-[7.5px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.55)' }}>{ins.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Emotions + Symbols */}
      <div className="grid grid-cols-2 gap-4">
        <div className="os-card p-4">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#CC80FF' }}>TOP EMOTIONS</p>
          {(insights?.topEmotions ?? intelligence?.topEmotions ?? []).length === 0 ? (
            <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>No emotion data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {(insights?.topEmotions ?? intelligence?.topEmotions ?? []).slice(0, 7).map((e, i) => {
                const color  = EMO_COLORS[i % EMO_COLORS.length]!;
                const maxC   = (insights?.topEmotions ?? intelligence?.topEmotions ?? [])[0]?.count ?? 1;
                return (
                  <div key={e.emotion}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono text-[7.5px] capitalize" style={{ color: 'rgba(232,232,255,0.5)' }}>{e.emotion}</span>
                      <span className="font-mono text-[7px] font-bold" style={{ color }}>{e.count}×</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round((e.count / maxC) * 100)}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="os-card p-4">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#FFB800' }}>TOP SYMBOLS</p>
          {(insights?.topSymbols.map(s => ({ symbol: s.manifestation, count: s.count })) ?? intelligence?.topSymbols ?? []).length === 0 ? (
            <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>No symbol data yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(insights?.topSymbols.map(s => ({ symbol: s.manifestation, count: s.count })) ?? intelligence?.topSymbols ?? []).slice(0, 12).map((s, i) => (
                <span key={s.symbol} className="font-mono text-[7.5px] px-2.5 py-1 rounded-lg"
                  style={{ background: i === 0 ? 'rgba(255,184,0,0.12)' : 'rgba(255,255,255,0.04)', border: i === 0 ? '1px solid rgba(255,184,0,0.3)' : '1px solid rgba(255,255,255,0.07)', color: i === 0 ? '#FFB800' : 'rgba(232,232,255,0.5)' }}>
                  {s.symbol} <span className="opacity-60 font-mono text-[10px]">×{s.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Archetypes + Resonance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="os-card p-4">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#00CFFF' }}>TOP ARCHETYPES</p>
          {(insights?.topArchetypes ?? []).length === 0 ? (
            <p className="font-mono text-[8px]" style={{ color: 'rgba(232,232,255,0.3)' }}>No archetype data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {(insights?.topArchetypes ?? []).slice(0, 5).map((a, i) => {
                const color = EMO_COLORS[i % EMO_COLORS.length]!;
                const maxA  = (insights?.topArchetypes ?? [])[0]?.count ?? 1;
                return (
                  <div key={a.archetype}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono text-[7.5px] capitalize" style={{ color: 'rgba(232,232,255,0.5)' }}>{a.archetype}</span>
                      <span className="font-mono text-[7px] font-bold" style={{ color }}>{a.count}×</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round((a.count / maxA) * 100)}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="os-card p-4">
          <p className="font-mono text-[7.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#7B6FFF' }}>RESONANCE STATS</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total Resonances', value: insights?.resonanceStats.total ?? intelligence?.totalMatches ?? 0, color: '#7B6FFF' },
              { label: 'Avg Match Score',  value: insights?.resonanceStats.avgScore ?? intelligence?.avgResonance ?? 0, color: '#CC80FF', suffix: '%' },
              { label: 'Peak Score',       value: insights?.resonanceStats.peakScore ?? 0, color: '#00CFFF', suffix: '%' },
              { label: 'Dream Score',      value: insights?.dreamStats.avgDreamScore ?? intelligence?.avgDreamScore ?? 0, color: '#FFB800' },
            ].map(({ label, value, color, suffix }) => (
              <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="font-mono text-sm font-black" style={{ color }}><CountUp target={value} decimals={0} suffix={suffix} /></p>
                <p className="font-mono text-[6px] mt-0.5" style={{ color: 'rgba(232,232,255,0.25)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inspector Sidebar ──────────────────────────────────────────────────────────

function InspectorSidebar({ user, riskProfile, healthScore, activeTags, activeTab, onTabChange }: {
  user: AdminUserDetail;
  riskProfile?: UserRiskProfile;
  healthScore: number;
  activeTags: string[];
  activeTab: TabKey;
  onTabChange: (t: TabKey) => void;
}) {
  const riskCfg  = RISK_CFG[riskProfile?.riskLevel ?? 'low']!;
  const hc       = healthColor(healthScore);
  const isOnline = user.lastLoginAt ? (Date.now() - new Date(user.lastLoginAt).getTime()) < 3600000 : false;

  return (
    <div className="space-y-3">
      {/* Status card */}
      <div className="os-card p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm uppercase"
              style={{ background: `${(ROLE_CFG[user.role] ?? ROLE_CFG['user']!).color}15`, color: (ROLE_CFG[user.role] ?? ROLE_CFG['user']!).color }}>
              {user.username.charAt(0)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border"
              style={{ background: isOnline ? '#38D68A' : 'rgba(232,232,255,0.15)', borderColor: '#0A0A14' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[8px] font-bold truncate" style={{ color: '#E8E8FF' }}>@{user.username}</p>
            <p className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{isOnline ? 'Online now' : timeAgo(user.lastLoginAt)}</p>
          </div>
        </div>
        {/* Health score compact */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>User Health</span>
          <span className="font-mono text-[8px] font-black" style={{ color: hc }}>{healthScore}/100 · {healthLabel(healthScore)}</span>
        </div>
        {/* Risk level */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>Risk Level</span>
          <span className="font-mono text-[7px] font-bold px-1.5 py-0.5 rounded" style={{ color: riskCfg.color, background: riskCfg.bg, border: `1px solid ${riskCfg.border}` }}>{riskCfg.label}</span>
        </div>
        {/* Role */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[6.5px]" style={{ color: 'rgba(232,232,255,0.25)' }}>Role</span>
          <span className="font-mono text-[7px] font-bold" style={{ color: (ROLE_CFG[user.role] ?? ROLE_CFG['user']!).color }}>{(ROLE_CFG[user.role] ?? ROLE_CFG['user']!).label}</span>
        </div>
      </div>

      {/* Key stats */}
      <div className="os-card p-4">
        <p className="font-mono text-[6.5px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'rgba(232,232,255,0.2)' }}>QUICK STATS</p>
        <div className="space-y-0">
          {[
            { label: 'Dreams',    value: user.dreamCount,       color: '#CC80FF' },
            { label: 'Followers', value: user.followerCount,    color: '#00CFFF' },
            { label: 'Following', value: user.followingCount,   color: '#7B6FFF' },
            { label: 'Reports',   value: riskProfile?.reportCount ?? 0, color: riskProfile?.reportCount ? '#FF4A5E' : '#38D68A' },
            { label: 'Hidden',    value: riskProfile?.hiddenCount ?? 0, color: '#FF8C00' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.3)' }}>{label}</span>
              <span className="font-mono text-[8px] font-black" style={{ color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {activeTags.length > 0 && (
        <div className="os-card p-4">
          <p className="font-mono text-[6.5px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'rgba(232,232,255,0.2)' }}>TAGS</p>
          <div className="flex flex-wrap gap-1.5">
            {activeTags.map(tag => {
              const cfg = TAG_COLOR[tag] ?? { color: '#7B6FFF', bg: 'rgba(123,111,255,0.1)', border: 'rgba(123,111,255,0.25)' };
              return (
                <span key={tag} className="font-mono text-[6.5px] font-bold px-1.5 py-0.5 rounded"
                  style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{tag}</span>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation shortcuts */}
      <div className="os-card p-4">
        <p className="font-mono text-[6.5px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'rgba(232,232,255,0.2)' }}>NAVIGATE</p>
        <div className="space-y-1">
          {([
            { tab: 'overview' as TabKey, label: '→ Overview', color: '#CC80FF' },
            { tab: 'dreams' as TabKey, label: '→ Dreams', color: '#7B6FFF' },
            { tab: 'analytics' as TabKey, label: '→ Analytics', color: '#00CFFF' },
            { tab: 'moderation' as TabKey, label: '→ Moderation', color: '#FF4A5E' },
            { tab: 'intelligence' as TabKey, label: '→ Intelligence', color: '#FFB800' },
          ]).map(({ tab, label, color }) => (
            <button key={tab} onClick={() => onTabChange(tab)}
              className="w-full text-left font-mono text-[7.5px] py-1.5 px-2 rounded-lg transition-colors"
              style={activeTab === tab
                ? { color, background: `${color}10`, fontWeight: 700 }
                : { color: 'rgba(232,232,255,0.3)', background: 'transparent' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="os-card p-4">
        <p className="font-mono text-[6.5px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#FF4A5E' }}>ACCOUNT</p>
        <div className="space-y-1">
          <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.35)' }}>Registered: {fmt(user.createdAt)}</p>
          <p className="font-mono text-[7px]" style={{ color: 'rgba(232,232,255,0.35)' }}>Last Login: {fmt(user.lastLoginAt, true)}</p>
          <p className="font-mono text-[7px]" style={{ color: user.isEmailVerified ? '#38D68A' : '#FF4A5E' }}>
            {user.isEmailVerified ? '✓ Email verified' : '✗ Email unverified'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function UserDetail() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const qc           = useQueryClient();
  const auth         = getStoredAuth();
  const isSuperAdmin = auth?.role === 'super_admin';
  const { copied, copy } = useCopy();

  // State
  const [dreamPage,      setDreamPage]      = useState(1);
  const [dreamSort,      setDreamSort]      = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'createdAt', dir: 'desc' });
  const [activeTab,      setActiveTab]      = useState<TabKey>('overview');
  const [showEditModal,  setShowEditModal]  = useState(false);
  const [pendingAction,  setPendingAction]  = useState<PendingAction | null>(null);
  const [feedback,       setFeedback]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTags,     setActiveTags]     = useState<string[]>([]);
  const [notes,          setNotes]          = useState<AdminNote[]>([]);
  const tagsInit = useRef(false);

  function flash(msg: string, ok = true) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  // Queries
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => fetchUserById(id!),
    enabled: !!id,
  });

  const { data: activity } = useQuery({
    queryKey: ['admin', 'user', id, 'activity'],
    queryFn: () => fetchUserActivity(id!),
    enabled: !!id,
  });

  const { data: dreams, isLoading: dreamsLoading } = useQuery({
    queryKey: ['admin', 'user', id, 'dreams', dreamPage],
    queryFn: () => fetchUserDreams(id!, dreamPage, 10),
    enabled: !!id,
  });

  const { data: intelligence } = useQuery({
    queryKey: ['admin', 'user', id, 'intelligence'],
    queryFn: () => fetchUserIntelligenceProfile(id!),
    enabled: !!id,
  });

  const { data: riskProfile } = useQuery({
    queryKey: ['admin', 'user', id, 'risk-profile'],
    queryFn: () => fetchUserRiskProfile(id!),
    enabled: !!id,
  });

  const { data: moderationHistory } = useQuery({
    queryKey: ['admin', 'user', id, 'moderation-history'],
    queryFn: () => fetchUserModerationHistory(id!),
    enabled: !!id,
  });

  const { data: timeline } = useQuery({
    queryKey: ['admin', 'user', id, 'timeline'],
    queryFn: () => fetchUserTimeline(id!),
    enabled: !!id,
  });

  const { data: insights } = useQuery({
    queryKey: ['admin', 'user', id, 'insights'],
    queryFn: () => fetchUserInsights(id!),
    enabled: !!id,
  });

  // Mutations (PRESERVED)
  const roleMutation = useMutation({
    mutationFn: (role: string) => updateUserRole(id!, role),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'user', id] }); flash('Role updated.'); },
    onError: (e: Error) => flash(e.message, false),
  });

  const statusMutation = useMutation({
    mutationFn: ({ isActive, lockedUntil }: { isActive: boolean; lockedUntil?: string | null }) =>
      updateUserStatus(id!, isActive, lockedUntil),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'user', id] });
      flash(vars.isActive ? 'Account reactivated.' : 'Account banned.');
      setPendingAction(null);
    },
    onError: (e: Error) => { flash(e.message, false); setPendingAction(null); },
  });

  const resetMutation = useMutation({
    mutationFn: () => resetUserPassword(id!),
    onSuccess: (res) => { flash(`Password reset token: ${res.resetToken.slice(0, 16)}...`); setPendingAction(null); },
    onError: (e: Error) => { flash(e.message, false); setPendingAction(null); },
  });

  // Derived
  const healthScore = user ? computeHealthScore(riskProfile, intelligence) : 0;

  // Initialize tags once
  useEffect(() => {
    if (!user || !riskProfile || tagsInit.current) return;
    tagsInit.current = true;
    const tags: string[] = [];
    if (['admin', 'super_admin', 'moderator'].includes(user.role)) tags.push('Trusted');
    if (riskProfile.riskLevel === 'critical') tags.push('Spam Risk', 'Needs Review');
    else if (riskProfile.riskLevel === 'high') tags.push('Needs Review');
    if (user.dreamCount > 50) tags.push('Creator');
    setActiveTags(tags);
  }, [user, riskProfile]);

  void activity; // used in future timeline expansion

  // Handlers
  function handleSort(col: string) {
    setDreamSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' });
  }

  function toggleTag(tag: string) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  function addNote(text: string, priority: 'low' | 'medium' | 'high') {
    const note: AdminNote = { id: String(Date.now()), text, priority, pinned: false, author: auth?.username ?? 'admin', date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) };
    setNotes(prev => [note, ...prev]);
  }

  function removeNote(id: string) { setNotes(prev => prev.filter(n => n.id !== id)); }
  function pinNote(id: string)    { setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n)); }

  const isPending = statusMutation.isPending || resetMutation.isPending || roleMutation.isPending;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-dc-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="font-mono text-sm" style={{ color: '#FF4A5E' }}>User not found.</p>
        <button onClick={() => navigate('/users')} className="font-mono text-[8px] text-dc-primary underline">← Back to Users</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <style>{`
        @keyframes ud-fade-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ud-pulse   { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 font-mono text-[7.5px] mb-4" style={{ color: 'rgba(232,232,255,0.3)' }}>
        <Link to="/users" className="hover:text-dc-primary transition-colors">Users</Link>
        <span>›</span>
        <span style={{ color: '#E8E8FF' }}>{user.displayName ?? user.username}</span>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${feedback.ok ? 'bg-dc-success/10 border-dc-success/30 text-dc-success' : 'bg-dc-error/10 border-dc-error/30 text-dc-error'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Hero — full width */}
      <HeroHeader user={user} riskProfile={riskProfile} healthScore={healthScore} copied={copied} copy={copy} />

      {/* 2-col layout */}
      <div className="flex gap-5 items-start">

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Quick Actions */}
          <QuickActions
            user={user}
            isSuperAdmin={isSuperAdmin}
            onBan={() => setPendingAction({
              label: user.isActive ? 'Ban User' : 'Unban User',
              message: user.isActive ? 'This will immediately deactivate the account. The user will be logged out.' : 'The account will be reactivated. The user will regain full platform access.',
              danger: user.isActive,
              onConfirm: () => statusMutation.mutate({ isActive: !user.isActive }),
            })}
            onSuspend={() => setPendingAction({
              label: 'Suspend for 24h',
              message: 'The account will be locked for 24 hours. The user will not be able to log in during this period.',
              danger: true,
              onConfirm: () => statusMutation.mutate({ isActive: false, lockedUntil: new Date(Date.now() + 86400000).toISOString() }),
            })}
            onReset={() => setPendingAction({
              label: 'Reset Password',
              message: 'A password reset token will be generated. The current password will remain valid until the user resets it.',
              danger: false,
              onConfirm: () => resetMutation.mutate(),
            })}
            onEdit={() => setShowEditModal(true)}
            onRole={(r) => roleMutation.mutate(r)}
            onFlash={flash}
          />

          {/* AI Summary + Risk Panel */}
          <AISummaryRow user={user} riskProfile={riskProfile} intelligence={intelligence} />

          {/* KPI Strip */}
          <KPIStrip user={user} intelligence={intelligence} riskProfile={riskProfile} />

          {/* Tabs */}
          <TabBar active={activeTab} onChange={setActiveTab} />

          {/* Tab content */}
          {activeTab === 'overview' && (
            <OverviewTab user={user} activeTags={activeTags} onTagToggle={toggleTag} />
          )}
          {activeTab === 'dreams' && (
            <DreamsTab
              dreams={dreams?.items ?? []}
              dreamsLoading={dreamsLoading}
              dreamPage={dreamPage}
              dreamPages={dreams?.pages ?? 1}
              dreamTotal={dreams?.total ?? 0}
              dreamSort={dreamSort}
              onSort={handleSort}
              onPage={setDreamPage}
            />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab timeline={timeline as UserTimeline | undefined} intelligence={intelligence} />
          )}
          {activeTab === 'moderation' && (
            <ModerationTab
              history={(moderationHistory ?? []) as ModerationHistoryItem[]}
              notes={notes}
              onAddNote={addNote}
              onRemoveNote={removeNote}
              onPinNote={pinNote}
            />
          )}
          {activeTab === 'intelligence' && (
            <IntelligenceTab intelligence={intelligence} insights={insights as UserInsights | undefined} />
          )}
        </div>

        {/* Sticky Inspector Sidebar */}
        <div className="w-64 shrink-0" style={{ position: 'sticky', top: 0 }}>
          <InspectorSidebar
            user={user}
            riskProfile={riskProfile}
            healthScore={healthScore}
            activeTags={activeTags}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>

      {/* Edit Modal (PRESERVED) */}
      {showEditModal && (
        <EditProfileModal
          userId={user.id}
          initialName={user.displayName}
          initialBio={user.bio}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Confirm Dialog (replaces window.confirm) */}
      {pendingAction && (
        <ConfirmDialog
          action={pendingAction}
          isPending={isPending}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
