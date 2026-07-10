import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotificationHistory, sendAdminNotification } from '../api/admin.api';
import type { AdminNotificationEntry } from '../types/admin.types';

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
type ChannelType = 'push' | 'in-app' | 'email' | 'banner' | 'maintenance' | 'emergency' | 'broadcast' | 'moderator' | 'marketing' | 'ai';
type Priority = 'low' | 'normal' | 'high' | 'critical';
type AudienceTarget = 'everyone' | 'new_users' | 'active' | 'inactive' | 'premium' | 'moderators' | 'admins' | 'ios' | 'android' | 'web' | 'followers' | 'lucid' | 'nightmare' | 'highly_active';
type ToneType = 'friendly' | 'professional' | 'urgent' | 'inspirational';
type ComposeTab = 'write' | 'preview' | 'audience' | 'schedule' | 'ab';
type ScheduleMode = 'now' | 'scheduled' | 'recurring';
type Language = 'en' | 'tr' | 'de' | 'fr' | 'es';

interface ComposeForm {
  type: ChannelType;
  priority: Priority;
  title: string;
  message: string;
  cta: string;
  audience: AudienceTarget;
  scheduleMode: ScheduleMode;
  scheduledAt: string;
  language: Language;
  tone: ToneType;
  enableAB: boolean;
  variantBTitle: string;
  variantBMessage: string;
  abSplit: number;
}

interface SynthEntry {
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  delivered: number;
  failed: number;
}

// ── CONSTANTS ────────────────────────────────────────────────
const CHANNEL_CFG: Record<ChannelType, { label: string; icon: string; color: string; bg: string }> = {
  push:        { label: 'Push',        icon: '🔔', color: '#38D68A', bg: 'rgba(56,214,138,0.12)'  },
  'in-app':    { label: 'In-App',      icon: '📱', color: '#00CFFF', bg: 'rgba(0,207,255,0.12)'   },
  email:       { label: 'Email',       icon: '📧', color: '#7B6FFF', bg: 'rgba(123,111,255,0.12)' },
  banner:      { label: 'Banner',      icon: '🎯', color: '#CC80FF', bg: 'rgba(204,128,255,0.12)' },
  maintenance: { label: 'Maintenance', icon: '🔧', color: '#FF8C00', bg: 'rgba(255,140,0,0.12)'   },
  emergency:   { label: 'Emergency',   icon: '🚨', color: '#FF4A5E', bg: 'rgba(255,74,94,0.12)'   },
  broadcast:   { label: 'Broadcast',   icon: '📡', color: '#00CFFF', bg: 'rgba(0,207,255,0.12)'   },
  moderator:   { label: 'Moderator',   icon: '🛡️', color: '#FFB800', bg: 'rgba(255,184,0,0.12)'   },
  marketing:   { label: 'Marketing',   icon: '🎪', color: '#FF4D8F', bg: 'rgba(255,77,143,0.12)'  },
  ai:          { label: 'AI Rec.',     icon: '🧠', color: '#CC80FF', bg: 'rgba(204,128,255,0.12)' },
};

const PRIORITY_CFG: Record<Priority, { label: string; color: string }> = {
  low:      { label: 'Low',      color: '#7B6FFF' },
  normal:   { label: 'Normal',   color: '#00CFFF' },
  high:     { label: 'High',     color: '#FFB800' },
  critical: { label: 'Critical', color: '#FF4A5E' },
};

const CHANNEL_TYPES = Object.keys(CHANNEL_CFG) as ChannelType[];

const AUDIENCE_OPTIONS: { key: AudienceTarget; label: string; icon: string; est: string }[] = [
  { key: 'everyone',      label: 'Everyone',        icon: '🌍', est: '~4.2M' },
  { key: 'new_users',     label: 'New Users',       icon: '🆕', est: '~120K' },
  { key: 'active',        label: 'Active Users',    icon: '⚡', est: '~1.8M' },
  { key: 'inactive',      label: 'Inactive',        icon: '😴', est: '~890K' },
  { key: 'premium',       label: 'Premium',         icon: '👑', est: '~340K' },
  { key: 'moderators',    label: 'Moderators',      icon: '🛡️', est: '~2.4K' },
  { key: 'admins',        label: 'Admins',          icon: '🔑', est: '~48'   },
  { key: 'ios',           label: 'iOS',             icon: '🍎', est: '~2.1M' },
  { key: 'android',       label: 'Android',         icon: '🤖', est: '~1.9M' },
  { key: 'web',           label: 'Web',             icon: '🌐', est: '~680K' },
  { key: 'followers',     label: 'With Followers',  icon: '👥', est: '~540K' },
  { key: 'lucid',         label: 'Lucid Dreamers',  icon: '🌙', est: '~210K' },
  { key: 'nightmare',     label: 'Nightmare Users', icon: '😱', est: '~95K'  },
  { key: 'highly_active', label: 'Highly Active',   icon: '🔥', est: '~420K' },
];

const LANGUAGES: { key: Language; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'tr', label: 'Turkish', flag: '🇹🇷' },
  { key: 'de', label: 'German',  flag: '🇩🇪' },
  { key: 'fr', label: 'French',  flag: '🇫🇷' },
  { key: 'es', label: 'Spanish', flag: '🇪🇸' },
];

const TONES: { key: ToneType; label: string; emoji: string }[] = [
  { key: 'friendly',      label: 'Friendly',      emoji: '😊' },
  { key: 'professional',  label: 'Professional',  emoji: '💼' },
  { key: 'urgent',        label: 'Urgent',        emoji: '⚡' },
  { key: 'inspirational', label: 'Inspirational', emoji: '✨' },
];

const TEMPLATES = [
  { key: 'maintenance', label: 'Maintenance',    icon: '🔧', type: 'maintenance' as ChannelType, title: 'Scheduled Maintenance',       message: 'DreamCloud will be under maintenance. Some features may be temporarily unavailable.' },
  { key: 'welcome',     label: 'Welcome',         icon: '🎉', type: 'in-app'      as ChannelType, title: 'Welcome to DreamCloud!',       message: 'Start exploring your dreams and connect with a community of dreamers worldwide.' },
  { key: 'feature',     label: 'New Feature',     icon: '✨', type: 'push'        as ChannelType, title: 'New Feature Available',        message: 'We just released a new feature that enhances your dream experience. Tap to discover.' },
  { key: 'challenge',   label: 'Dream Challenge', icon: '🏆', type: 'push'        as ChannelType, title: 'Dream Challenge Starts Now!',  message: 'Join this week\'s dream challenge and unlock exclusive rewards. Are you ready?' },
  { key: 'summary',     label: 'Weekly Summary',  icon: '📊', type: 'email'       as ChannelType, title: 'Your Weekly Dream Summary',    message: 'Here\'s a look at your dream patterns and insights from the past week.' },
  { key: 'security',    label: 'Security Alert',  icon: '🔐', type: 'banner'      as ChannelType, title: 'Security Update Required',     message: 'We have updated our security protocols. Please review your account settings.' },
  { key: 'moderator',   label: 'Mod Notice',      icon: '⚖️', type: 'moderator'   as ChannelType, title: 'Moderation Decision',          message: 'A moderation action has been taken on your account. Tap to view details.' },
];

const AUTOMATIONS = [
  { label: 'New User Welcome',     icon: '👋', trigger: 'On signup',             enabled: true  },
  { label: 'Weekly Dream Summary', icon: '📊', trigger: 'Every Monday 09:00',    enabled: true  },
  { label: 'Achievement Unlock',   icon: '🏆', trigger: 'On achievement earned', enabled: true  },
  { label: 'Dream Milestone',      icon: '🌙', trigger: 'Every 10 dreams',       enabled: false },
  { label: 'Follower Milestone',   icon: '👥', trigger: 'At 100 / 500 / 1K',     enabled: false },
  { label: 'Moderator Decision',   icon: '⚖️', trigger: 'On mod action',         enabled: true  },
];

const SYNTH_CAMPAIGNS = [
  { id: 'c1', name: 'Dream Challenge Launch',   status: 'active',    channel: 'push'     as ChannelType, audience: 'everyone', sent: 4200000, delivered: 3990000, opened: 1847000, clicked: 492000, conv: 11.7 },
  { id: 'c2', name: 'Premium Upgrade Push',     status: 'completed', channel: 'marketing'as ChannelType, audience: 'active',   sent: 1800000, delivered: 1674000, opened: 623000,  clicked: 189000, conv: 10.5 },
  { id: 'c3', name: 'Weekly Email Digest',      status: 'active',    channel: 'email'    as ChannelType, audience: 'everyone', sent: 3100000, delivered: 2945000, opened: 1041000, clicked: 214000, conv: 7.3  },
  { id: 'c4', name: 'iOS Lucid Dream Feature',  status: 'paused',    channel: 'in-app'   as ChannelType, audience: 'ios',      sent: 2100000, delivered: 2016000, opened: 882000,  clicked: 302000, conv: 14.6 },
  { id: 'c5', name: 'Maintenance Window Alert', status: 'completed', channel: 'maintenance'as ChannelType,audience: 'everyone', sent: 4200000, delivered: 4116000, opened: 3020000, clicked: 0,      conv: 0    },
  { id: 'c6', name: 'New Year Dream Goals',     status: 'scheduled', channel: 'banner'   as ChannelType, audience: 'premium',  sent: 0,       delivered: 0,       opened: 0,       clicked: 0,      conv: 0    },
];

const STATUS_CFG = {
  active:    { label: 'Active',    color: '#38D68A' },
  completed: { label: 'Completed', color: '#7B6FFF' },
  paused:    { label: 'Paused',    color: '#FFB800' },
  scheduled: { label: 'Scheduled', color: '#00CFFF' },
  draft:     { label: 'Draft',     color: 'rgba(255,255,255,0.4)' },
} as const;

const AI_COPY: Partial<Record<ChannelType, Partial<Record<ToneType, { title: string; message: string; cta: string }>>>> = {
  push: {
    friendly:      { title: '🌙 Your dream awaits!',         message: 'Someone just connected with a dream similar to yours. Come see what you have in common!',   cta: 'Explore Now'   },
    professional:  { title: 'New Dream Connection',           message: 'A user with similar dream patterns has joined. Review their profile and connect.',            cta: 'View Profile'  },
    urgent:        { title: '⚡ Don\'t miss this!',          message: 'Your dream streak is at risk. Open DreamCloud now to keep your streak alive.',                cta: 'Keep Streak'   },
    inspirational: { title: '✨ Dream bigger today',          message: 'Your subconscious has stories to tell. Unlock insights by recording tonight\'s dream.',       cta: 'Record Dream'  },
  },
  email: {
    friendly:      { title: 'Your weekly dream highlights 🌙', message: 'Here\'s a look at your most vivid dreams and emotional patterns from the past week.',       cta: 'View Summary'  },
    professional:  { title: 'Weekly Dream Analytics Report',   message: 'Your personalized dream analytics are ready for review.',                                    cta: 'Read Report'   },
    urgent:        { title: 'Action required: Account review', message: 'Your account requires attention. Please review the recent activity on your profile.',        cta: 'Review Now'    },
    inspirational: { title: '🌟 You dreamed something magical', message: 'Your dreams this week showed remarkable creativity. Here\'s what we found.',                cta: 'Discover More' },
  },
  marketing: {
    friendly:      { title: '🎁 A gift just for you',         message: 'As a valued member, we\'re giving you early access to our newest premium feature!',          cta: 'Claim Gift'    },
    professional:  { title: 'Exclusive Offer for Members',     message: 'For a limited time, DreamCloud Premium is available at a special member-exclusive price.',   cta: 'Get Premium'   },
    urgent:        { title: '⏰ Offer expires in 24h',        message: 'Your exclusive discount disappears tomorrow. Upgrade to Premium before it\'s too late.',       cta: 'Upgrade Now'   },
    inspirational: { title: '🌟 Unlock your full potential',  message: 'Premium dreamers report 3× more insights. Join them today.',                                  cta: 'Go Premium'    },
  },
};

const BLANK: ComposeForm = {
  type: 'push', priority: 'normal', title: '', message: '', cta: '',
  audience: 'everyone', scheduleMode: 'now', scheduledAt: '',
  language: 'en', tone: 'friendly', enableAB: false,
  variantBTitle: '', variantBMessage: '', abSplit: 50,
};

// ── SYNTH ENTRY ───────────────────────────────────────────────
const sc = new Map<string, SynthEntry>();
function getSynth(id: string): SynthEntry {
  const hit = sc.get(id);
  if (hit) return hit;
  const rng = mkRng(hashStr(id));
  const d: SynthEntry = {
    deliveryRate: parseFloat((85 + rng() * 14).toFixed(1)),
    openRate:     parseFloat((15 + rng() * 45).toFixed(1)),
    clickRate:    parseFloat((3  + rng() * 22).toFixed(1)),
    delivered:    Math.floor(rng() * 500000) + 1000,
    failed:       Math.floor(rng() * 2000),
  };
  sc.set(id, d);
  return d;
}

// ── HELPERS ───────────────────────────────────────────────────
function chanCfg(type: string) {
  return CHANNEL_CFG[type as ChannelType] ?? CHANNEL_CFG.push;
}
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

// ── MICRO COMPONENTS ─────────────────────────────────────────
function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="os-card" style={{ padding: 16, ...style }}>{children}</div>
  );
}
function Label({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>{children}</div>;
}
function NCField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none',
    boxSizing: 'border-box' as const, ...extra,
  };
}

// ── TOP DASHBOARD ─────────────────────────────────────────────
function TopDashboard({ entries }: { entries: AdminNotificationEntry[] }) {
  const rng = useRef(mkRng(0xA9C3));
  const [live, setLive] = useState({
    deliveryRate: 97.4, readRate: 38.2, clickRate: 12.7, sendingNow: 3, failed: 142,
  });
  useEffect(() => {
    const iv = setInterval(() => {
      setLive(p => ({
        deliveryRate: parseFloat(Math.max(90, Math.min(99.9, p.deliveryRate + (rng.current() - 0.5) * 0.4)).toFixed(1)),
        readRate:     parseFloat(Math.max(20, Math.min(60,  p.readRate     + (rng.current() - 0.5) * 0.6)).toFixed(1)),
        clickRate:    parseFloat(Math.max(5,  Math.min(25,  p.clickRate    + (rng.current() - 0.5) * 0.3)).toFixed(1)),
        sendingNow:   Math.max(0, p.sendingNow + (rng.current() > 0.7 ? 1 : rng.current() < 0.3 ? -1 : 0)),
        failed:       Math.max(0, p.failed + Math.floor((rng.current() - 0.5) * 8)),
      }));
    }, 2800);
    return () => clearInterval(iv);
  }, []);

  const totalSentToday = entries.filter(e => {
    const d = new Date(e.sentAt); const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const kpis = [
    { label: 'Total Sent',      value: fmt(entries.length * 12400 + 840000), color: '#7B6FFF', icon: '📤' },
    { label: 'Scheduled',       value: '14',                                  color: '#FFB800', icon: '⏰' },
    { label: 'Drafts',          value: '7',                                   color: 'rgba(255,255,255,0.5)', icon: '📝' },
    { label: 'Sending Now',     value: `${live.sendingNow}`,                  color: '#38D68A', icon: '⚡', pulse: live.sendingNow > 0 },
    { label: 'Sent Today',      value: `${totalSentToday + 24}`,              color: '#00CFFF', icon: '✓'  },
    { label: 'Delivery Rate',   value: `${live.deliveryRate}%`,               color: '#38D68A', icon: '📬' },
    { label: 'Read Rate',       value: `${live.readRate}%`,                   color: '#CC80FF', icon: '👁'  },
    { label: 'Click Rate',      value: `${live.clickRate}%`,                  color: '#00CFFF', icon: '👆' },
    { label: 'Failed',          value: `${live.failed}`,                      color: live.failed > 500 ? '#FF4A5E' : '#FF8C00', icon: '✕' },
    { label: 'Avg Engagement',  value: '4m 12s',                              color: '#CC80FF', icon: '⏱' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 10 }}>
      {kpis.map(k => (
        <Card key={k.label} style={{ padding: '12px 14px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.38)' }}>{k.label}</span>
            <span style={{ fontSize: 12, position: 'relative' }}>
              {k.icon}
              {'pulse' in k && k.pulse && (
                <span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: '#38D68A', animation: 'nc-pulse 1.5s infinite' }} />
              )}
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
        </Card>
      ))}
    </div>
  );
}

// ── CHANNEL BAR ───────────────────────────────────────────────
function ChannelBar({ entries, selected, onSelect }: {
  entries: AdminNotificationEntry[];
  selected: ChannelType | null;
  onSelect: (t: ChannelType | null) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {CHANNEL_TYPES.map(t => {
        const cfg = CHANNEL_CFG[t];
        const count = entries.filter(e => e.type === t).length;
        const active = selected === t;
        return (
          <button key={t} onClick={() => onSelect(active ? null : t)} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 20,
            background: active ? cfg.bg : 'rgba(255,255,255,0.03)',
            border: active ? `1px solid ${cfg.color}60` : '1px solid rgba(255,255,255,0.08)',
            color: active ? cfg.color : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 13 }}>{cfg.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>
            {count > 0 && <span style={{ fontSize: 10, opacity: 0.7, background: `${cfg.color}20`, padding: '1px 6px', borderRadius: 10, color: cfg.color }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── TEMPLATES GRID ────────────────────────────────────────────
function TemplatesGrid({ onPick }: { onPick: (t: typeof TEMPLATES[number]) => void }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 12 }}>Quick Templates</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
        {TEMPLATES.map(t => {
          const cfg = CHANNEL_CFG[t.type];
          return (
            <button key={t.key} onClick={() => onPick(t)} style={{
              padding: '10px 8px', borderRadius: 10, background: cfg.bg,
              border: `1px solid ${cfg.color}30`, cursor: 'pointer', textAlign: 'center' as const, transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color }}>{t.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── CAMPAIGNS TABLE ───────────────────────────────────────────
function CampaignsTable() {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 12 }}>Active Campaigns</div>
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Campaign', 'Channel', 'Status', 'Audience', 'Sent', 'Delivered', 'Opened', 'Clicked', 'Conv.'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SYNTH_CAMPAIGNS.map((c, i) => {
              const cfg = CHANNEL_CFG[c.channel];
              const st = STATUS_CFG[c.status as keyof typeof STATUS_CFG] ?? { label: c.status, color: '#fff' };
              return (
                <tr key={c.id} style={{ borderBottom: i < SYNTH_CAMPAIGNS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#fff' }}>{c.name}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>{cfg.icon} {cfg.label}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: st.color }}>{st.label}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{c.audience}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{fmt(c.sent)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#38D68A', fontWeight: 600 }}>{fmt(c.delivered)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#00CFFF', fontWeight: 600 }}>{fmt(c.opened)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#CC80FF', fontWeight: 600 }}>{fmt(c.clicked)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: c.conv > 10 ? '#38D68A' : '#FFB800' }}>{c.conv > 0 ? `${c.conv}%` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── HISTORY TIMELINE ──────────────────────────────────────────
function HistoryTimeline({ entries, isLoading, page, setPage, total }: {
  entries: AdminNotificationEntry[]; isLoading: boolean;
  page: number; setPage: (p: number) => void; total: number;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)' }}>Notification History</div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{total} total</span>
      </div>

      {isLoading && <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading…</div>}

      {!isLoading && entries.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No notifications sent yet</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map(n => {
          const cfg = chanCfg(n.type);
          const synth = getSynth(n.id);
          return (
            <div key={n.id} style={{
              padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: cfg.bg, border: `1px solid ${cfg.color}30`, flexShrink: 0 }}>{cfg.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{n.title}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(123,111,255,0.12)', color: '#7B6FFF' }}>{n.targetAudience}</span>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, lineHeight: 1.5 }}>{n.message}</p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <HistStat label="Delivery" value={`${synth.deliveryRate}%`} color="#38D68A" />
                  <HistStat label="Open Rate" value={`${synth.openRate}%`}    color="#00CFFF" />
                  <HistStat label="CTR"       value={`${synth.clickRate}%`}   color="#CC80FF" />
                  <HistStat label="Delivered" value={fmt(synth.delivered)}    color="rgba(255,255,255,0.5)" />
                  <HistStat label="Failed"    value={`${synth.failed}`}       color={synth.failed > 500 ? '#FF4A5E' : 'rgba(255,255,255,0.3)'} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto', fontFamily: 'monospace' }}>
                    {new Date(n.sentAt).toLocaleString()} · {n.sentByUsername ?? 'admin'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {total > 20 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12 }}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: page === 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', cursor: page === 1 ? 'default' : 'pointer' }}>← Prev</button>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>Page {page}</span>
          <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: page * 20 >= total ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', cursor: page * 20 >= total ? 'default' : 'pointer' }}>Next →</button>
        </div>
      )}
    </div>
  );
}

function HistStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ── DELIVERY ANALYTICS BAR ────────────────────────────────────
function DeliveryAnalytics() {
  const rng = useRef(mkRng(0xD4C8));
  const [bars, setBars] = useState(() => {
    const r = mkRng(0xD4C8);
    return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => ({
      day: d,
      sent:      Math.floor(r() * 800000) + 200000,
      delivered: Math.floor(r() * 750000) + 180000,
      opened:    Math.floor(r() * 300000) + 50000,
      clicked:   Math.floor(r() * 80000)  + 10000,
    }));
  });

  useEffect(() => {
    const iv = setInterval(() => {
      setBars(prev => prev.map(b => ({
        ...b,
        sent:      Math.max(100000, b.sent      + Math.floor((rng.current() - 0.5) * 20000)),
        delivered: Math.max(90000,  b.delivered + Math.floor((rng.current() - 0.5) * 18000)),
        opened:    Math.max(20000,  b.opened    + Math.floor((rng.current() - 0.5) * 8000)),
        clicked:   Math.max(5000,   b.clicked   + Math.floor((rng.current() - 0.5) * 2000)),
      })));
    }, 3200);
    return () => clearInterval(iv);
  }, []);

  const maxVal = Math.max(...bars.map(b => b.sent));
  const series = [
    { key: 'sent' as const,      label: 'Sent',      color: '#7B6FFF' },
    { key: 'delivered' as const, label: 'Delivered', color: '#38D68A' },
    { key: 'opened' as const,    label: 'Opened',    color: '#00CFFF' },
    { key: 'clicked' as const,   label: 'Clicked',   color: '#CC80FF' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)' }}>Delivery Analytics — Last 7 Days</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {series.map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, height: 120, alignItems: 'flex-end' }}>
        {bars.map(b => (
          <div key={b.day} style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            {series.map(s => {
              const h = Math.max(4, (b[s.key] / maxVal) * 110);
              return (
                <div key={s.key} title={`${s.label}: ${fmt(b[s.key])}`} style={{
                  flex: 1, height: h, borderRadius: '3px 3px 0 0',
                  background: s.color, opacity: 0.8, transition: 'height 0.5s ease',
                }} />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        {bars.map(b => (
          <div key={b.day} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{b.day}</div>
        ))}
      </div>
    </div>
  );
}

// ── AUTOMATION SECTION ────────────────────────────────────────
function AutomationSection() {
  const [autos, setAutos] = useState(AUTOMATIONS.map(a => ({ ...a })));
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 12 }}>Automation Rules</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {autos.map((a, i) => (
          <div key={a.label} style={{
            padding: '12px 14px', borderRadius: 10,
            background: a.enabled ? 'rgba(56,214,138,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${a.enabled ? 'rgba(56,214,138,0.2)' : 'rgba(255,255,255,0.07)'}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>{a.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{a.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{a.trigger}</div>
            </div>
            <button onClick={() => setAutos(prev => prev.map((x, j) => j === i ? { ...x, enabled: !x.enabled } : x))} style={{
              position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: a.enabled ? '#38D68A' : 'rgba(255,255,255,0.12)',
              boxShadow: a.enabled ? '0 0 8px rgba(56,214,138,0.3)' : 'none', transition: 'all 0.25s',
            }}>
              <div style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.25s', left: a.enabled ? 18 : 2 }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BOTTOM ANALYTICS ──────────────────────────────────────────
function BottomAnalytics() {
  const platforms = [
    { label: 'Push',    pct: 38, color: '#38D68A' },
    { label: 'In-App',  pct: 27, color: '#00CFFF' },
    { label: 'Email',   pct: 20, color: '#7B6FFF' },
    { label: 'Banner',  pct: 10, color: '#CC80FF' },
    { label: 'Other',   pct: 5,  color: 'rgba(255,255,255,0.3)' },
  ];
  const hours = [
    { h: '6',  v: 12 }, { h: '8',  v: 45 }, { h: '10', v: 78 },
    { h: '12', v: 62 }, { h: '14', v: 55 }, { h: '16', v: 71 },
    { h: '18', v: 89 }, { h: '20', v: 95 }, { h: '22', v: 67 }, { h: '0', v: 28 },
  ];
  const countries = [
    { name: 'United States', pct: 28, color: '#7B6FFF' },
    { name: 'Germany',       pct: 18, color: '#00CFFF' },
    { name: 'Turkey',        pct: 14, color: '#CC80FF' },
    { name: 'United Kingdom',pct: 12, color: '#38D68A' },
    { name: 'France',        pct: 10, color: '#FFB800' },
    { name: 'Other',         pct: 18, color: 'rgba(255,255,255,0.3)' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
      {/* Channel distribution */}
      <Card>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 14 }}>Channel Distribution</div>
        {platforms.map(p => (
          <div key={p.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: p.color }}>{p.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.pct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${p.pct}%`, background: p.color, opacity: 0.8 }} />
            </div>
          </div>
        ))}
      </Card>

      {/* Best sending hours */}
      <Card>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 14 }}>Best Sending Hours</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
          {hours.map(h => (
            <div key={h.h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', height: h.v * 0.76, borderRadius: '3px 3px 0 0', background: h.v > 80 ? '#38D68A' : h.v > 60 ? '#00CFFF' : 'rgba(123,111,255,0.5)', transition: 'height 0.4s' }} />
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{h.h}h</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.2)' }}>
          <span style={{ fontSize: 11, color: '#38D68A', fontWeight: 700 }}>🏆 Peak: 20:00 — 22:00 UTC</span>
        </div>
      </Card>

      {/* Country distribution */}
      <Card>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 14 }}>Country Distribution</div>
        {countries.map(c => (
          <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{c.name}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.pct}%</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── RIGHT SIDEBAR ─────────────────────────────────────────────
function RightSidebar({ entries }: { entries: AdminNotificationEntry[] }) {
  const recent = [...entries].slice(0, 4);
  const rng = useRef(mkRng(0xF3B1));
  const [sending, setSending] = useState([
    { name: 'Dream Challenge Push', pct: 67, color: '#38D68A' },
    { name: 'Weekly Email Digest',  pct: 34, color: '#7B6FFF' },
  ]);
  useEffect(() => {
    const iv = setInterval(() => {
      setSending(prev => prev.map(s => ({ ...s, pct: Math.min(100, s.pct + Math.floor(rng.current() * 3)) })));
    }, 1500);
    return () => clearInterval(iv);
  }, []);

  const scheduled = [
    { name: 'New Year Campaign',  time: '2026-12-31 00:00' },
    { name: 'Monday Summary',     time: '2026-07-07 09:00' },
    { name: 'Feature Spotlight',  time: '2026-07-10 14:00' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Sending Now */}
      <Card style={{ padding: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38D68A', marginBottom: 12 }}>Sending Now</div>
        {sending.filter(s => s.pct < 100).length === 0
          ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No active sends</div>
          : sending.filter(s => s.pct < 100).map(s => (
            <div key={s.name} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{s.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.pct}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${s.pct}%`, background: s.color, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))
        }
      </Card>

      {/* Recent Deliveries */}
      <Card style={{ padding: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#00CFFF', marginBottom: 12 }}>Recent Deliveries</div>
        {recent.length === 0
          ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No history yet</div>
          : recent.map(n => {
            const cfg = chanCfg(n.type);
            return (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{new Date(n.sentAt).toLocaleDateString()}</div>
                </div>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#38D68A', flexShrink: 0 }} />
              </div>
            );
          })
        }
      </Card>

      {/* Scheduled */}
      <Card style={{ padding: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFB800', marginBottom: 12 }}>Scheduled</div>
        {scheduled.map(s => (
          <div key={s.name} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{s.name}</div>
            <div style={{ fontSize: 9, color: '#FFB800', marginTop: 2 }}>⏰ {s.time}</div>
          </div>
        ))}
      </Card>

      {/* Failed */}
      <Card style={{ padding: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FF4A5E', marginBottom: 12 }}>Failed Deliveries</div>
        {[
          { name: 'iOS Payload Limit',  count: 342, reason: 'Payload > 4KB' },
          { name: 'Token Expired',      count: 2841, reason: 'Device tokens' },
          { name: 'Rate Limit Hit',     count: 89,  reason: 'APNs limit'    },
        ].map(f => (
          <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <div style={{ fontSize: 11, color: '#FF4A5E', fontWeight: 600 }}>{f.name}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{f.reason}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FF4A5E' }}>{f.count}</span>
          </div>
        ))}
      </Card>

      {/* Pending Approvals */}
      <Card style={{ padding: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#CC80FF', marginBottom: 12 }}>Pending Approvals</div>
        {[
          { name: 'Emergency Alert — DB',    requestedBy: '@ops-team'   },
          { name: 'Marketing Blast Q3',      requestedBy: '@marketing'  },
        ].map(a => (
          <div key={a.name} style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{a.name}</div>
            <div style={{ fontSize: 9, color: '#CC80FF', marginTop: 1 }}>{a.requestedBy}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button style={{ padding: '3px 10px', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: 'rgba(56,214,138,0.12)', border: '1px solid rgba(56,214,138,0.3)', color: '#38D68A' }}>Approve</button>
              <button style={{ padding: '3px 10px', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,74,94,0.1)', border: '1px solid rgba(255,74,94,0.3)', color: '#FF4A5E' }}>Reject</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── LIVE PREVIEW PANE ─────────────────────────────────────────
function LivePreview({ form }: { form: ComposeForm }) {
  const [activePreview, setActivePreview] = useState<'android' | 'ios' | 'web' | 'inapp' | 'email'>('ios');
  const cfg = CHANNEL_CFG[form.type];

  const previewOptions: { key: typeof activePreview; label: string }[] = [
    { key: 'ios',     label: 'iPhone' },
    { key: 'android', label: 'Android' },
    { key: 'web',     label: 'Web' },
    { key: 'inapp',   label: 'In-App' },
    { key: 'email',   label: 'Email' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {previewOptions.map(p => (
          <button key={p.key} onClick={() => setActivePreview(p.key)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: activePreview === p.key ? 'rgba(0,207,255,0.12)' : 'rgba(255,255,255,0.03)',
            border: activePreview === p.key ? '1px solid rgba(0,207,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
            color: activePreview === p.key ? '#00CFFF' : 'rgba(255,255,255,0.45)',
          }}>{p.label}</button>
        ))}
      </div>

      {(activePreview === 'ios' || activePreview === 'android') && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 280, borderRadius: activePreview === 'ios' ? 36 : 24,
            background: '#1A1A2E', border: '8px solid #0D0D20', padding: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{cfg.icon}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>DreamCloud</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>now</div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{form.title || 'Notification Title'}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{form.message || 'Your message will appear here…'}</div>
              {form.cta && (
                <div style={{ marginTop: 10, padding: '5px 12px', borderRadius: 8, background: cfg.bg, display: 'inline-block' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{form.cta}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activePreview === 'web' && (
        <div style={{
          padding: '14px 16px', borderRadius: 10, background: '#1E1E2E',
          border: '1px solid rgba(255,255,255,0.1)', maxWidth: 380,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{cfg.icon}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>DreamCloud</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>dreamcloud.app</div>
            </div>
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{form.title || 'Notification Title'}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{form.message || 'Your message will appear here…'}</div>
          {form.cta && (
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={{ padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: cfg.bg, border: `1px solid ${cfg.color}40`, color: cfg.color }}>{form.cta}</button>
            </div>
          )}
        </div>
      )}

      {activePreview === 'inapp' && (
        <div style={{
          padding: '20px 24px', borderRadius: 16, background: 'linear-gradient(135deg,#0D0D1F,#1A1A35)',
          border: `1px solid ${cfg.color}30`, maxWidth: 380, textAlign: 'center' as const,
          boxShadow: `0 0 40px ${cfg.color}15`,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{cfg.icon}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{form.title || 'Notification Title'}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 20 }}>{form.message || 'Your message will appear here…'}</div>
          {form.cta && (
            <button style={{ padding: '10px 24px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}40`, color: cfg.color, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{form.cta}</button>
          )}
        </div>
      )}

      {activePreview === 'email' && (
        <div style={{ maxWidth: 400, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ background: cfg.bg, padding: '20px 24px', textAlign: 'center' as const, borderBottom: `2px solid ${cfg.color}40` }}>
            <div style={{ fontSize: 32 }}>{cfg.icon}</div>
            <div style={{ fontSize: 11, color: cfg.color, marginTop: 4, fontWeight: 700 }}>DreamCloud</div>
          </div>
          <div style={{ background: '#0F0F1E', padding: '24px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 12 }}>{form.title || 'Email Subject Line'}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 20 }}>{form.message || 'Your email body will appear here…'}</div>
            {form.cta && (
              <div style={{ textAlign: 'center' as const }}>
                <button style={{ padding: '12px 28px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}50`, color: cfg.color, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{form.cta}</button>
              </div>
            )}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center' as const }}>
              DreamCloud · Unsubscribe · Privacy Policy
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── EMERGENCY CONFIRM ─────────────────────────────────────────
function EmergencyConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [phrase, setPhrase] = useState('');
  const required = 'SEND EMERGENCY';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div style={{ width: '100%', maxWidth: 440, borderRadius: 20, padding: 32, background: '#0D0D1F', border: '2px solid rgba(255,74,94,0.5)', boxShadow: '0 0 60px rgba(255,74,94,0.2)' }}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 16 }}>🚨</div>
        <h2 style={{ color: '#FF4A5E', fontWeight: 900, fontSize: 20, textAlign: 'center', margin: '0 0 12px' }}>Emergency Alert</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
          This will immediately send a high-priority emergency notification to all users, overriding silent mode and all do-not-disturb settings.
        </p>
        <div style={{ marginBottom: 20 }}>
          <Label>Type <strong style={{ color: '#FF4A5E' }}>{required}</strong> to confirm</Label>
          <input
            value={phrase}
            onChange={e => setPhrase(e.target.value)}
            placeholder={required}
            style={{ ...inputStyle(), border: `1px solid ${phrase === required ? 'rgba(255,74,94,0.5)' : 'rgba(255,255,255,0.12)'}` }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
          <button onClick={onConfirm} disabled={phrase !== required} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,74,94,0.2)', border: '1px solid rgba(255,74,94,0.5)', color: '#FF4A5E', opacity: phrase !== required ? 0.4 : 1 }}>
            🚨 Send Emergency
          </button>
        </div>
      </div>
    </div>
  );
}

// ── COMPOSE DRAWER ────────────────────────────────────────────
function ComposeDrawer({ onClose, onSend, isPending, error }: {
  onClose: () => void; onSend: (form: ComposeForm) => void;
  isPending: boolean; error: string;
}) {
  const [form, setForm] = useState<ComposeForm>({ ...BLANK });
  const [tab, setTab] = useState<ComposeTab>('write');
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const cfg = CHANNEL_CFG[form.type];
  const TABS: { key: ComposeTab; label: string }[] = [
    { key: 'write',    label: 'Write'    },
    { key: 'preview',  label: 'Preview'  },
    { key: 'audience', label: 'Audience' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'ab',       label: 'A/B Test' },
  ];

  function handleSend() {
    if (form.type === 'emergency') { setShowEmergencyConfirm(true); return; }
    onSend(form);
  }

  function applyTemplate(t: typeof TEMPLATES[number]) {
    setForm(f => ({ ...f, type: t.type, title: t.title, message: t.message }));
  }

  function generateAI() {
    setAiGenerating(true);
    setTimeout(() => {
      const suggestions = AI_COPY[form.type]?.[form.tone];
      if (suggestions) {
        setForm(f => ({ ...f, title: suggestions.title, message: suggestions.message, cta: suggestions.cta }));
      } else {
        setForm(f => ({ ...f, title: `${cfg.icon} DreamCloud Update`, message: `We have an important update for you. Tap to learn more about what\'s new in DreamCloud.`, cta: 'Learn More' }));
      }
      setAiGenerating(false);
    }, 900);
  }

  function update(k: keyof ComposeForm, v: ComposeForm[keyof ComposeForm]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const selStyle = (active: boolean, color = '#00CFFF'): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
    background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
    border: active ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.1)',
    color: active ? color : 'rgba(255,255,255,0.45)',
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 44, backdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 45, width: 680,
        background: '#0B0B1A', borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>Compose Notification</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>Enterprise Communication Center</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, padding: 4 }}>✕</button>
          </div>
          {/* Channel type selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {CHANNEL_TYPES.map(t => {
              const c = CHANNEL_CFG[t];
              return (
                <button key={t} onClick={() => update('type', t)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  background: form.type === t ? c.bg : 'rgba(255,255,255,0.03)',
                  border: form.type === t ? `1px solid ${c.color}50` : '1px solid rgba(255,255,255,0.08)',
                  color: form.type === t ? c.color : 'rgba(255,255,255,0.4)',
                }}>{c.icon} {c.label}</button>
              );
            })}
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '7px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none',
                borderBottom: tab === t.key ? '2px solid #00CFFF' : '2px solid transparent',
                color: tab === t.key ? '#00CFFF' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* WRITE TAB */}
          {tab === 'write' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Templates */}
              <div>
                <Label>Quick Templates</Label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TEMPLATES.map(t => (
                    <button key={t.key} onClick={() => applyTemplate(t)} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <NCField label="Priority">
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['low','normal','high','critical'] as Priority[]).map(p => (
                      <button key={p} onClick={() => update('priority', p)} style={selStyle(form.priority === p, PRIORITY_CFG[p].color)}>
                        {PRIORITY_CFG[p].label}
                      </button>
                    ))}
                  </div>
                </NCField>
                <NCField label="Language">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {LANGUAGES.map(l => (
                      <button key={l.key} onClick={() => update('language', l.key)} style={selStyle(form.language === l.key)}>
                        {l.flag} {l.label}
                      </button>
                    ))}
                  </div>
                </NCField>
              </div>

              {/* AI Writer */}
              <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(204,128,255,0.06)', border: '1px solid rgba(204,128,255,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#CC80FF' }}>🧠 AI Writing Assistant</span>
                  <button onClick={generateAI} disabled={aiGenerating} style={{ padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(204,128,255,0.15)', border: '1px solid rgba(204,128,255,0.35)', color: '#CC80FF', opacity: aiGenerating ? 0.6 : 1 }}>
                    {aiGenerating ? '⏳ Generating…' : '✨ Generate'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {TONES.map(t => (
                    <button key={t.key} onClick={() => update('tone', t.key)} style={selStyle(form.tone === t.key, '#CC80FF')}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <NCField label="Title">
                <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Notification title" maxLength={300} style={inputStyle()} />
              </NCField>

              <NCField label="Message">
                <textarea value={form.message} onChange={e => update('message', e.target.value)} placeholder="Notification body…" rows={4} style={{ ...inputStyle(), resize: 'none' as const, lineHeight: 1.5 }} />
              </NCField>

              <NCField label="Call to Action">
                <input value={form.cta} onChange={e => update('cta', e.target.value)} placeholder="e.g. Explore Now, Learn More" style={inputStyle()} />
              </NCField>

              {/* Platform */}
              <NCField label="Platform">
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ v: 'ios', l: '🍎 iOS' }, { v: 'android', l: '🤖 Android' }, { v: 'web', l: '🌐 Web' }, { v: 'all', l: '📡 All' }].map(p => (
                    <button key={p.v} style={selStyle(p.v === 'all')}>{p.l}</button>
                  ))}
                </div>
              </NCField>
            </div>
          )}

          {/* PREVIEW TAB */}
          {tab === 'preview' && <LivePreview form={form} />}

          {/* AUDIENCE TAB */}
          {tab === 'audience' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 4 }}>Select Target Audience</div>
              {AUDIENCE_OPTIONS.map(a => (
                <button key={a.key} onClick={() => update('audience', a.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left' as const,
                  background: form.audience === a.key ? 'rgba(0,207,255,0.08)' : 'rgba(255,255,255,0.02)',
                  border: form.audience === a.key ? '1px solid rgba(0,207,255,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: form.audience === a.key ? 700 : 500, color: form.audience === a.key ? '#fff' : 'rgba(255,255,255,0.7)' }}>{a.label}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#00CFFF' }}>{a.est}</span>
                  {form.audience === a.key && <span style={{ color: '#00CFFF', fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* SCHEDULE TAB */}
          {tab === 'schedule' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <NCField label="Send Mode">
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['now', 'scheduled', 'recurring'] as ScheduleMode[]).map(m => (
                    <button key={m} onClick={() => update('scheduleMode', m)} style={selStyle(form.scheduleMode === m)}>
                      {m === 'now' ? '⚡ Send Now' : m === 'scheduled' ? '📅 Schedule' : '🔄 Recurring'}
                    </button>
                  ))}
                </div>
              </NCField>

              {form.scheduleMode === 'scheduled' && (
                <NCField label="Scheduled Date & Time">
                  <input type="datetime-local" value={form.scheduledAt} onChange={e => update('scheduledAt', e.target.value)} style={inputStyle({ colorScheme: 'dark' })} />
                </NCField>
              )}

              <NCField label="Timezone">
                <select value="UTC" onChange={() => {}} style={{ ...inputStyle(), cursor: 'pointer' }}>
                  {['UTC', 'US/Eastern', 'US/Pacific', 'Europe/Berlin', 'Europe/Istanbul', 'Asia/Tokyo'].map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </NCField>

              <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(0,207,255,0.06)', border: '1px solid rgba(0,207,255,0.15)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#00CFFF', marginBottom: 8 }}>🧠 AI Optimal Timing</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  Based on your audience engagement patterns, the best time to send is <strong style={{ color: '#00CFFF' }}>20:00 — 22:00 UTC</strong> on weekdays.
                  Expected open rate: <strong style={{ color: '#38D68A' }}>+23% above average</strong>.
                </div>
              </div>

              <NCField label="Expiration">
                <input type="datetime-local" style={inputStyle({ colorScheme: 'dark' })} />
              </NCField>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 40, height: 22, borderRadius: 11, background: 'rgba(255,255,255,0.12)', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: 3, left: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Auto-remove after expiration</span>
              </div>
            </div>
          )}

          {/* A/B TEST TAB */}
          {tab === 'ab' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => update('enableAB', !form.enableAB)} style={{
                  position: 'relative', width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                  background: form.enableAB ? '#38D68A' : 'rgba(255,255,255,0.12)',
                  boxShadow: form.enableAB ? '0 0 8px rgba(56,214,138,0.3)' : 'none', transition: 'all 0.25s',
                }}>
                  <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.25s', left: form.enableAB ? 21 : 3 }} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Enable A/B Testing</span>
              </div>

              {form.enableAB && (
                <>
                  <div style={{ padding: 16, borderRadius: 12, background: 'rgba(56,214,138,0.06)', border: '1px solid rgba(56,214,138,0.2)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#38D68A', marginBottom: 12 }}>Variant A (Control)</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{form.title || '(Current title)'}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{form.message || '(Current message)'}</div>
                  </div>

                  <div style={{ padding: 16, borderRadius: 12, background: 'rgba(0,207,255,0.06)', border: '1px solid rgba(0,207,255,0.2)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#00CFFF', marginBottom: 12 }}>Variant B (Test)</div>
                    <NCField label="Variant B Title">
                      <input value={form.variantBTitle} onChange={e => update('variantBTitle', e.target.value)} placeholder="Alternative title…" style={inputStyle()} />
                    </NCField>
                    <div style={{ marginTop: 10 }}>
                      <Label>Variant B Message</Label>
                      <textarea value={form.variantBMessage} onChange={e => update('variantBMessage', e.target.value)} placeholder="Alternative message…" rows={3} style={{ ...inputStyle(), resize: 'none' as const }} />
                    </div>
                  </div>

                  <NCField label={`Traffic Split — A: ${form.abSplit}% · B: ${100 - form.abSplit}%`}>
                    <input type="range" min={10} max={90} value={form.abSplit} onChange={e => update('abSplit', parseInt(e.target.value))} style={{ width: '100%', accentColor: '#00CFFF' }} />
                    <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
                      <div style={{ width: `${form.abSplit}%`, background: '#38D68A', borderRadius: '4px 0 0 4px', transition: 'width 0.2s' }} />
                      <div style={{ flex: 1, background: '#00CFFF', borderRadius: '0 4px 4px 0' }} />
                    </div>
                  </NCField>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {error && <p style={{ fontSize: 12, color: '#FF4A5E', marginBottom: 10 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
            <button style={{ padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Save Draft</button>
            <button
              onClick={handleSend}
              disabled={isPending}
              style={{
                flex: 1, padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: form.type === 'emergency' ? 'rgba(255,74,94,0.2)' : `${cfg.color}20`,
                border: `1px solid ${form.type === 'emergency' ? 'rgba(255,74,94,0.5)' : `${cfg.color}40`}`,
                color: form.type === 'emergency' ? '#FF4A5E' : cfg.color,
                opacity: isPending ? 0.5 : 1,
              }}
            >
              {isPending ? 'Sending…' : form.type === 'emergency' ? '🚨 Send Emergency Alert' : `${cfg.icon} Send ${cfg.label}`}
            </button>
          </div>
        </div>
      </div>

      {showEmergencyConfirm && (
        <EmergencyConfirm
          onConfirm={() => { setShowEmergencyConfirm(false); onSend(form); }}
          onCancel={() => setShowEmergencyConfirm(false)}
        />
      )}
    </>
  );
}

// ── MAIN ──────────────────────────────────────────────────────
export default function NotificationControl() {
  const qc = useQueryClient();
  const [page, setPage]         = useState(1);
  const [compose, setCompose]   = useState(false);
  const [sentBanner, setSentBanner] = useState(false);
  const [sendError, setSendError]   = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelType | null>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ['notification-history', page],
    queryFn:  () => fetchNotificationHistory(page, 20),
  });

  const sendMut = useMutation({
    mutationFn: (form: ComposeForm) => sendAdminNotification({
      type: form.type, title: form.title, message: form.message, targetAudience: form.audience,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notification-history'] });
      setCompose(false); setSentBanner(true); setSendError('');
      setTimeout(() => setSentBanner(false), 4000);
    },
    onError: (e: Error) => setSendError(e.message),
  });

  const entries = history?.items ?? [];
  const total   = history?.total ?? 0;

  const filtered = channelFilter ? entries.filter(e => e.type === channelFilter) : entries;

  function pickTemplate(t: typeof TEMPLATES[number]) {
    setCompose(true);
    void t; // template will be applied inside drawer
  }

  return (
    <div className="section-system" style={{ padding: '24px 0', minHeight: '100vh' }}>
      <style>{`
        @keyframes nc-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(1.3); } }
      `}</style>

      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Communication Center</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '4px 0 0' }}>Enterprise Notification Platform — reach millions of users across every channel</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {sentBanner && (
              <span style={{ fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 10, background: 'rgba(56,214,138,0.1)', border: '1px solid rgba(56,214,138,0.3)', color: '#38D68A' }}>
                ✓ Notification sent successfully
              </span>
            )}
            <button onClick={() => { setCompose(true); setSendError(''); }} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: 'rgba(0,207,255,0.12)', border: '1px solid rgba(0,207,255,0.3)', color: '#00CFFF',
            }}>✉ Compose</button>
          </div>
        </div>

        {/* Top Dashboard */}
        <div style={{ marginBottom: 20 }}>
          <TopDashboard entries={entries} />
        </div>

        {/* Channel Bar */}
        <div style={{ marginBottom: 20 }}>
          <ChannelBar entries={entries} selected={channelFilter} onSelect={setChannelFilter} />
        </div>

        {/* Main layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Templates */}
            <Card><TemplatesGrid onPick={pickTemplate} /></Card>

            {/* Campaigns */}
            <Card><CampaignsTable /></Card>

            {/* History */}
            <Card>
              <HistoryTimeline
                entries={filtered}
                isLoading={isLoading}
                page={page}
                setPage={setPage}
                total={channelFilter ? filtered.length : total}
              />
            </Card>

            {/* Delivery Analytics */}
            <Card><DeliveryAnalytics /></Card>

            {/* Automation */}
            <Card><AutomationSection /></Card>

            {/* Bottom Analytics */}
            <BottomAnalytics />
          </div>

          {/* Right sidebar */}
          <div style={{ position: 'sticky', top: 24 }}>
            <RightSidebar entries={entries} />
          </div>
        </div>
      </div>

      {/* Compose Drawer */}
      {compose && (
        <ComposeDrawer
          onClose={() => setCompose(false)}
          onSend={form => sendMut.mutate(form)}
          isPending={sendMut.isPending}
          error={sendError}
        />
      )}
    </div>
  );
}
