import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchModerationRules, updateModerationRules,
  fetchAutomationRules, createAutomationRule, toggleAutomationRule, deleteAutomationRule,
} from '../api/admin.api';
import type { AutomationRule, OsRuleType } from '../api/admin.api';
import type { ModerationRules } from '../types/admin.types';

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
type RuleCategory = 'moderation' | 'security' | 'spam' | 'ai' | 'dream' | 'notifications' | 'reputation' | 'community' | 'content' | 'engagement' | 'growth' | 'system' | 'developer';
type Priority = 'critical' | 'high' | 'normal' | 'low' | 'background';
type RiskLevel = 'safe' | 'medium' | 'high' | 'critical';
type ApprovalStatus = 'approved' | 'pending' | 'draft' | 'rejected';
type DetailTab = 'overview' | 'logic' | 'history' | 'analytics' | 'versions';

interface SynthRule {
  category: RuleCategory;
  priority: Priority;
  risk: RiskLevel;
  owner: string;
  version: number;
  avgExecTime: number;
  successRate: number;
  lastResult: 'success' | 'failed' | 'skipped';
  affectedServices: string[];
  approvalStatus: ApprovalStatus;
  tags: string[];
}

interface BuilderForm {
  name: string;
  description: string;
  rule_type: OsRuleType;
  trigger_event: string;
  trigger_metric: string;
  trigger_threshold: number;
  trigger_cron: string;
  action_type: string;
  conditions: { field: string; op: string; value: string; logic: 'AND' | 'OR' }[];
  actions: { type: string; label: string }[];
}

// ── CONSTANTS ─────────────────────────────────────────────────
const CAT_CFG: Record<RuleCategory, { label: string; icon: string; color: string; bg: string }> = {
  moderation:    { label: 'Moderation',    icon: '🛡️', color: '#FFB800', bg: 'rgba(255,184,0,0.12)'   },
  security:      { label: 'Security',      icon: '🔐', color: '#FF4A5E', bg: 'rgba(255,74,94,0.12)'   },
  spam:          { label: 'Spam',          icon: '🚫', color: '#FF4D8F', bg: 'rgba(255,77,143,0.12)'  },
  ai:            { label: 'AI Analysis',   icon: '🧠', color: '#CC80FF', bg: 'rgba(204,128,255,0.12)' },
  dream:         { label: 'Dream',         icon: '🌙', color: '#7B6FFF', bg: 'rgba(123,111,255,0.12)' },
  notifications: { label: 'Notifications', icon: '🔔', color: '#38D68A', bg: 'rgba(56,214,138,0.12)'  },
  reputation:    { label: 'Reputation',    icon: '⭐', color: '#FFB800', bg: 'rgba(255,184,0,0.12)'   },
  community:     { label: 'Community',     icon: '👥', color: '#00CFFF', bg: 'rgba(0,207,255,0.12)'   },
  content:       { label: 'Content',       icon: '📝', color: '#38D68A', bg: 'rgba(56,214,138,0.12)'  },
  engagement:    { label: 'Engagement',    icon: '⚡', color: '#FF8C00', bg: 'rgba(255,140,0,0.12)'   },
  growth:        { label: 'Growth',        icon: '📈', color: '#00CFFF', bg: 'rgba(0,207,255,0.12)'   },
  system:        { label: 'System',        icon: '⚙️', color: '#7B6FFF', bg: 'rgba(123,111,255,0.12)' },
  developer:     { label: 'Developer',     icon: '💻', color: '#CC80FF', bg: 'rgba(204,128,255,0.12)' },
};

const PRIORITY_CFG: Record<Priority, { label: string; color: string }> = {
  critical:   { label: 'Critical',   color: '#FF4A5E' },
  high:       { label: 'High',       color: '#FF8C00' },
  normal:     { label: 'Normal',     color: '#00CFFF' },
  low:        { label: 'Low',        color: '#7B6FFF' },
  background: { label: 'Background', color: 'rgba(255,255,255,0.38)' },
};

const RISK_CFG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  safe:     { label: 'Safe',     color: '#38D68A', bg: 'rgba(56,214,138,0.1)'  },
  medium:   { label: 'Medium',   color: '#FFB800', bg: 'rgba(255,184,0,0.1)'   },
  high:     { label: 'High',     color: '#FF8C00', bg: 'rgba(255,140,0,0.1)'   },
  critical: { label: 'Critical', color: '#FF4A5E', bg: 'rgba(255,74,94,0.1)'   },
};

const CATS = Object.keys(CAT_CFG) as RuleCategory[];
const OWNERS = ['@ai-team', '@platform', '@moderation', '@security', '@content', '@growth', '@infra'];
const SERVICE_POOL = ['Dream Engine', 'AI Pipeline', 'Notifications', 'User Auth', 'Feed Ranking', 'ML Models', 'Content API', 'Push Service'];
const TRIGGER_EVENTS = ['user.created', 'dream.created', 'dream.edited', 'comment.posted', 'report.received', 'like.threshold', 'follower.milestone', 'spam.detected', 'ai.score.exceeded', 'login.suspicious', 'content.flagged', 'custom.event'];
const TRIGGER_METRICS = ['report_count', 'like_count', 'follower_count', 'ai_toxicity_score', 'spam_probability', 'reputation_score', 'content_quality', 'violence_score'];
const ACTION_TYPES = ['hide_content', 'delete_content', 'warn_user', 'ban_user', 'mute_user', 'decrease_reputation', 'increase_reputation', 'send_notification', 'create_ticket', 'assign_moderator', 'escalate', 'trigger_ai_review', 'generate_report'];
const ACTION_LABELS: Record<string, string> = {
  hide_content:        'Hide Content',
  delete_content:      'Delete Content',
  warn_user:           'Warn User',
  ban_user:            'Ban User',
  mute_user:           'Mute User',
  decrease_reputation: 'Decrease Reputation',
  increase_reputation: 'Increase Reputation',
  send_notification:   'Send Notification',
  create_ticket:       'Create Ticket',
  assign_moderator:    'Assign Moderator',
  escalate:            'Escalate',
  trigger_ai_review:   'Trigger AI Review',
  generate_report:     'Generate Report',
};

const AI_RECOMMENDATIONS = [
  { id: 'r1', title: 'Stricter spam detection needed', body: 'Spam reports increased by 23% in the last 48h. Consider lowering the spam threshold from 70 to 55 for faster auto-moderation.', confidence: 94, impact: 'high', category: 'spam' as RuleCategory, color: '#FF4A5E' },
  { id: 'r2', title: 'Nightmare content threshold too low', body: 'AI nightmare detection is flagging 12% of all dreams. Recommend raising threshold from 60 to 72 to reduce false positives.', confidence: 87, impact: 'medium', category: 'ai' as RuleCategory, color: '#CC80FF' },
  { id: 'r3', title: 'Moderator notification delay detected', body: 'Average moderator response time is 4.2h. Recommend enabling auto-escalation after 2h of unresolved reports.', confidence: 78, impact: 'medium', category: 'moderation' as RuleCategory, color: '#FFB800' },
  { id: 'r4', title: 'New user welcome automation underperforming', body: 'Welcome notification open rate dropped to 41%. AI suggests personalizing content based on signup device.', confidence: 82, impact: 'low', category: 'growth' as RuleCategory, color: '#38D68A' },
];

const WORD_CATEGORIES = [
  { key: 'violence',   label: 'Violence',    color: '#FF4A5E' },
  { key: 'hate',       label: 'Hate Speech', color: '#FF8C00' },
  { key: 'adult',      label: 'Adult',       color: '#FF4D8F' },
  { key: 'spam',       label: 'Spam',        color: '#FFB800' },
  { key: 'scam',       label: 'Scam',        color: '#FF8C00' },
  { key: 'political',  label: 'Political',   color: '#7B6FFF' },
  { key: 'custom',     label: 'Custom',      color: '#00CFFF' },
];

const RATE_LIMIT_ENDPOINTS = [
  { key: 'dreamCreation', label: 'Dream Creation',   icon: '🌙', def: 20,   unit: '/hr'  },
  { key: 'comments',      label: 'Comments',         icon: '💬', def: 60,   unit: '/hr'  },
  { key: 'likes',         label: 'Likes',            icon: '❤️', def: 200,  unit: '/hr'  },
  { key: 'reports',       label: 'Reports',          icon: '🚩', def: 10,   unit: '/hr'  },
  { key: 'messages',      label: 'Messages',         icon: '✉️', def: 100,  unit: '/hr'  },
  { key: 'notifications', label: 'Notifications',    icon: '🔔', def: 50,   unit: '/hr'  },
  { key: 'api',           label: 'API Calls',        icon: '⚡', def: 1000, unit: '/min' },
  { key: 'uploads',       label: 'Uploads',          icon: '📁', def: 15,   unit: '/hr'  },
];

const BLANK_BUILDER: BuilderForm = {
  name: '', description: '', rule_type: 'event',
  trigger_event: 'report.received', trigger_metric: 'report_count',
  trigger_threshold: 5, trigger_cron: '0 9 * * 1',
  action_type: 'hide_content',
  conditions: [{ field: 'report_count', op: '>', value: '5', logic: 'AND' }],
  actions: [{ type: 'hide_content', label: 'Hide Content' }],
};

// ── SYNTH DATA ────────────────────────────────────────────────
const sc = new Map<string, SynthRule>();
function getSynth(id: string): SynthRule {
  const hit = sc.get(id);
  if (hit) return hit;
  const rng = mkRng(hashStr(id));
  const r = Array.from({ length: 25 }, () => rng());
  const d: SynthRule = {
    category:        CATS[Math.floor(r[0]! * CATS.length)] ?? 'system',
    priority:        (['critical','high','normal','low','background'] as Priority[])[Math.floor(r[1]! * 5)] ?? 'normal',
    risk:            (['safe','safe','medium','high','critical'] as RiskLevel[])[Math.floor(r[2]! * 5)] ?? 'safe',
    owner:           OWNERS[Math.floor(r[3]! * OWNERS.length)] ?? '@platform',
    version:         1 + Math.floor(r[4]! * 10),
    avgExecTime:     Math.floor(r[5]! * 800) + 12,
    successRate:     parseFloat((88 + r[6]! * 11).toFixed(1)),
    lastResult:      (['success','success','success','failed','skipped'] as const)[Math.floor(r[7]! * 5)] ?? 'success',
    affectedServices:[...new Set([0,1,2].map(i => SERVICE_POOL[Math.floor(r[8+i]! * SERVICE_POOL.length)] ?? 'API'))],
    approvalStatus:  (['approved','approved','pending','draft'] as ApprovalStatus[])[Math.floor(r[12]! * 4)] ?? 'approved',
    tags:            [...new Set([...Array(2)].map((_, i) => ['fast-path','critical','canary','reviewed','stable','beta','mvp'][Math.floor(r[13+i]! * 7)] ?? 'stable'))],
  };
  sc.set(id, d);
  return d;
}

function deriveCategory(rule: AutomationRule): RuleCategory {
  const k = (rule.name + ' ' + (rule.description ?? '') + ' ' + rule.action_type).toLowerCase();
  if (k.includes('spam') || k.includes('phish')) return 'spam';
  if (k.includes('secur') || k.includes('ban') || k.includes('auth')) return 'security';
  if (k.includes('ai') || k.includes('ml') || k.includes('score') || k.includes('analy')) return 'ai';
  if (k.includes('dream') || k.includes('lucid') || k.includes('nightmare')) return 'dream';
  if (k.includes('notif') || k.includes('push') || k.includes('email')) return 'notifications';
  if (k.includes('reput') || k.includes('trust') || k.includes('karma')) return 'reputation';
  if (k.includes('report') || k.includes('hide') || k.includes('moder')) return 'moderation';
  if (k.includes('communit') || k.includes('follow') || k.includes('social')) return 'community';
  if (k.includes('content') || k.includes('post') || k.includes('media')) return 'content';
  if (k.includes('engag') || k.includes('like') || k.includes('comment')) return 'engagement';
  if (k.includes('growth') || k.includes('signup') || k.includes('onboard')) return 'growth';
  if (k.includes('system') || k.includes('cron') || k.includes('schedule')) return 'system';
  return getSynth(rule.id).category;
}

// ── MICRO HELPERS ─────────────────────────────────────────────
function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div className="os-card" style={{ padding: 16, ...style }}>{children}</div>;
}
function SecLabel({ children, color }: { children: ReactNode; color?: string }) {
  return <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.09em', color: color ?? 'rgba(255,255,255,0.38)', marginBottom: 12 }}>{children}</div>;
}
function inp(extra?: React.CSSProperties): React.CSSProperties {
  return { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, ...extra };
}

// ── GLOBAL DASHBOARD ──────────────────────────────────────────
function GlobalDashboard({ rules }: { rules: AutomationRule[] }) {
  const rng = useRef(mkRng(0xB7F3));
  const [live, setLive] = useState({ triggeredToday: 1847, successRate: 98.4, avgResponseTime: 142 });
  useEffect(() => {
    const iv = setInterval(() => {
      setLive(p => ({
        triggeredToday:  p.triggeredToday + (rng.current() > 0.6 ? Math.floor(rng.current() * 5) : 0),
        successRate:     parseFloat(Math.max(94, Math.min(99.9, p.successRate + (rng.current() - 0.5) * 0.3)).toFixed(1)),
        avgResponseTime: Math.max(80, Math.min(300, p.avgResponseTime + Math.floor((rng.current() - 0.5) * 10))),
      }));
    }, 2600);
    return () => clearInterval(iv);
  }, []);

  const active    = rules.filter(r => r.status === 'active').length;
  const disabled  = rules.filter(r => r.status === 'disabled').length;
  const scheduled = rules.filter(r => r.rule_type === 'scheduled').length;
  const aiRules   = rules.filter(r => {
    const k = (r.name + (r.description ?? '')).toLowerCase();
    return k.includes('ai') || k.includes('score') || k.includes('ml');
  }).length;
  const lastUpdate = rules.length ? new Date(Math.max(...rules.map(r => new Date(r.created_at).getTime()))).toLocaleDateString() : '—';

  const kpis = [
    { label: 'Total Rules',     value: `${rules.length}`,           color: '#7B6FFF', icon: '⚑' },
    { label: 'Active',          value: `${active}`,                 color: '#38D68A', icon: '●', pulse: true },
    { label: 'Disabled',        value: `${disabled}`,               color: '#FF4A5E', icon: '○' },
    { label: 'AI Rules',        value: `${aiRules}`,               color: '#CC80FF', icon: '🧠' },
    { label: 'Scheduled',       value: `${scheduled}`,              color: '#FFB800', icon: '⏰' },
    { label: 'Pending Approval',value: '3',                         color: '#FF8C00', icon: '⏳' },
    { label: 'Triggered Today', value: `${live.triggeredToday.toLocaleString()}`, color: '#00CFFF', icon: '⚡' },
    { label: 'Success Rate',    value: `${live.successRate}%`,      color: '#38D68A', icon: '✓' },
    { label: 'Avg Response',    value: `${live.avgResponseTime}ms`, color: '#00CFFF', icon: '⏱' },
    { label: 'Last Updated',    value: lastUpdate,                  color: 'rgba(255,255,255,0.5)', icon: '✎' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 10 }}>
      {kpis.map(k => (
        <Card key={k.label} style={{ padding: '12px 14px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.38)' }}>{k.label}</span>
            <span style={{ fontSize: 12, position: 'relative' }}>
              {k.icon}
              {'pulse' in k && k.pulse && <span style={{ position: 'absolute', top: -2, right: -2, width: 5, height: 5, borderRadius: '50%', background: '#38D68A', animation: 'ar-pulse 1.5s infinite' }} />}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
        </Card>
      ))}
    </div>
  );
}

// ── CATEGORY BAR ──────────────────────────────────────────────
function CategoryBar({ active, onSelect }: { active: RuleCategory | null; onSelect: (c: RuleCategory | null) => void }) {
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      <button onClick={() => onSelect(null)} style={{
        padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
        background: !active ? 'rgba(0,207,255,0.12)' : 'rgba(255,255,255,0.03)',
        border: !active ? '1px solid rgba(0,207,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
        color: !active ? '#00CFFF' : 'rgba(255,255,255,0.45)',
      }}>All</button>
      {CATS.map(c => {
        const cfg = CAT_CFG[c];
        return (
          <button key={c} onClick={() => onSelect(active === c ? null : c)} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer',
            background: active === c ? cfg.bg : 'rgba(255,255,255,0.03)',
            border: active === c ? `1px solid ${cfg.color}50` : '1px solid rgba(255,255,255,0.08)',
            color: active === c ? cfg.color : 'rgba(255,255,255,0.45)',
          }}>{cfg.icon} {cfg.label}</button>
        );
      })}
    </div>
  );
}

// ── AI RECOMMENDATIONS ────────────────────────────────────────
function AIRecommendations({ onApply }: { onApply: () => void }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = AI_RECOMMENDATIONS.filter(r => !dismissed.includes(r.id));
  if (visible.length === 0) return null;
  return (
    <Card>
      <SecLabel color="#CC80FF">🧠 AI Recommendation Engine</SecLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {visible.map(rec => (
          <div key={rec.id} style={{ padding: '12px 14px', borderRadius: 10, background: `${rec.color}08`, border: `1px solid ${rec.color}20` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', flex: 1, paddingRight: 8 }}>{rec.title}</span>
              <button onClick={() => setDismissed(d => [...d, rec.id])} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 10 }}>{rec.body}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${rec.color}20`, color: rec.color }}>
                  {rec.confidence}% confidence
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
                  {CAT_CFG[rec.category].icon} {CAT_CFG[rec.category].label}
                </span>
              </div>
              <button onClick={onApply} style={{ fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', background: `${rec.color}15`, border: `1px solid ${rec.color}30`, color: rec.color }}>
                Apply →
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── RULE CARD ─────────────────────────────────────────────────
function RuleCard({
  rule, onToggle, onDelete, onDetail, toggling,
}: {
  rule: AutomationRule; onToggle: () => void; onDelete: () => void; onDetail: () => void; toggling: boolean;
}) {
  const synth   = getSynth(rule.id);
  const cat     = CAT_CFG[deriveCategory(rule)];
  const pri     = PRIORITY_CFG[synth.priority];
  const risk    = RISK_CFG[synth.risk];
  const statusColor = rule.status === 'active' ? '#38D68A' : rule.status === 'paused' ? '#FFB800' : '#FF4A5E';

  return (
    <div className="os-card" style={{ padding: 16, border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.2s' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: cat.bg, border: `1px solid ${cat.color}30`, flexShrink: 0 }}>{cat.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{rule.name}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: cat.bg, color: cat.color }}>{cat.label}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: risk.bg, color: risk.color }}>{risk.label}</span>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{rule.description ?? 'No description'}</p>
        </div>
        {/* Toggle */}
        <button onClick={onToggle} disabled={toggling} style={{
          position: 'relative', width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', flexShrink: 0,
          background: rule.status === 'active' ? '#38D68A' : 'rgba(255,255,255,0.12)',
          boxShadow: rule.status === 'active' ? '0 0 8px rgba(56,214,138,0.3)' : 'none',
          transition: 'all 0.25s', opacity: toggling ? 0.5 : 1,
        }}>
          <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.25s', left: rule.status === 'active' ? 19 : 3 }} />
        </button>
      </div>

      {/* Trigger / Action */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>IF</div>
          <div style={{ fontSize: 11, color: '#00CFFF', fontFamily: 'monospace', fontWeight: 600 }}>
            {rule.trigger_event ?? rule.trigger_metric ?? rule.trigger_cron ?? 'scheduled'}
            {rule.trigger_threshold != null && <span style={{ color: '#FFB800' }}> &gt; {rule.trigger_threshold}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)' }}>→</span>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>THEN</div>
          <div style={{ fontSize: 11, color: '#CC80FF', fontFamily: 'monospace', fontWeight: 600 }}>
            {ACTION_LABELS[rule.action_type] ?? rule.action_type}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 14, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: 10 }}>
        <Stat label="Fires"   value={rule.fire_count.toLocaleString()} color="#00CFFF" />
        <Stat label="Success" value={`${synth.successRate}%`}           color={synth.successRate > 95 ? '#38D68A' : '#FFB800'} />
        <Stat label="Avg RT"  value={`${synth.avgExecTime}ms`}          color={synth.avgExecTime > 500 ? '#FF8C00' : 'rgba(255,255,255,0.6)'} />
        <Stat label="Last"    value={synth.lastResult}                   color={synth.lastResult === 'success' ? '#38D68A' : synth.lastResult === 'failed' ? '#FF4A5E' : '#FFB800'} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: statusColor }}>{rule.status}</span>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {[
          { v: synth.owner,                        c: '#7B6FFF' },
          { v: `v${synth.version}`,                c: 'rgba(255,255,255,0.35)' },
          { v: pri.label,                          c: pri.color },
          { v: rule.rule_type,                     c: '#00CFFF' },
        ].map((b, i) => (
          <span key={i} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: `${b.c}15`, color: b.c, border: `1px solid ${b.c}25` }}>{b.v}</span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onDetail}  style={abtn('#00CFFF')}>Details</button>
        <button onClick={onToggle}  style={abtn(rule.status === 'active' ? '#FFB800' : '#38D68A')}>{rule.status === 'active' ? 'Pause' : 'Enable'}</button>
        <button onClick={onDelete}  style={abtn('#FF4A5E')}>Delete</button>
        <button style={abtn('#CC80FF')}>Simulate</button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function abtn(color: string): React.CSSProperties {
  return { padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: `${color}15`, border: `1px solid ${color}28`, color };
}

// ── RULE DETAIL DRAWER ────────────────────────────────────────
function RuleDetailDrawer({ rule, onClose, onToggle, toggling }: {
  rule: AutomationRule; onClose: () => void; onToggle: () => void; toggling: boolean;
}) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const synth   = getSynth(rule.id);
  const cat     = CAT_CFG[deriveCategory(rule)];
  const TABS: { key: DetailTab; label: string }[] = [
    { key: 'overview',  label: 'Overview'  },
    { key: 'logic',     label: 'Logic'     },
    { key: 'history',   label: 'History'   },
    { key: 'analytics', label: 'Analytics' },
    { key: 'versions',  label: 'Versions'  },
  ];

  const mockHistory = [
    { time: '2 min ago', trigger: rule.trigger_event ?? 'threshold', user: '@user_8421', duration: `${synth.avgExecTime}ms`, result: 'success' },
    { time: '14 min ago',trigger: rule.trigger_event ?? 'threshold', user: '@user_3817', duration: `${Math.floor(synth.avgExecTime * 1.3)}ms`, result: 'success' },
    { time: '1h ago',    trigger: rule.trigger_event ?? 'threshold', user: '@user_5590', duration: `${Math.floor(synth.avgExecTime * 0.9)}ms`, result: 'failed'  },
    { time: '3h ago',    trigger: rule.trigger_event ?? 'threshold', user: '@user_2241', duration: `${synth.avgExecTime}ms`, result: 'success' },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 39, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 40, width: 480, background: '#0B0B1A', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: cat.bg }}>{cat.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{rule.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', fontFamily: 'monospace' }}>{rule.id.slice(0, 16)}…</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '7px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none',
                borderBottom: tab === t.key ? '2px solid #00CFFF' : '2px solid transparent',
                color: tab === t.key ? '#00CFFF' : 'rgba(255,255,255,0.4)',
              }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <DRow label="Status"       value={rule.status}      color={rule.status === 'active' ? '#38D68A' : '#FF4A5E'} />
              <DRow label="Type"         value={rule.rule_type}   color="#00CFFF" />
              <DRow label="Owner"        value={synth.owner}      color="#CC80FF" />
              <DRow label="Version"      value={`v${synth.version}`} color="#7B6FFF" />
              <DRow label="Priority"     value={PRIORITY_CFG[synth.priority].label} color={PRIORITY_CFG[synth.priority].color} />
              <DRow label="Risk"         value={RISK_CFG[synth.risk].label} color={RISK_CFG[synth.risk].color} />
              <DRow label="Fire Count"   value={rule.fire_count.toLocaleString()} />
              <DRow label="Success Rate" value={`${synth.successRate}%`} color={synth.successRate > 95 ? '#38D68A' : '#FFB800'} />
              <DRow label="Avg Exec"     value={`${synth.avgExecTime}ms`} />
              <DRow label="Last Fired"   value={rule.last_fired_at ? new Date(rule.last_fired_at).toLocaleString() : 'Never'} />
              <DRow label="Created"      value={new Date(rule.created_at).toLocaleDateString()} />
              {synth.affectedServices.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Affected Services</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {synth.affectedServices.map(s => (
                      <span key={s} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(123,111,255,0.12)', color: '#7B6FFF' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={onToggle} disabled={toggling} style={{ padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: rule.status === 'active' ? 'rgba(255,184,0,0.12)' : 'rgba(56,214,138,0.12)', border: `1px solid ${rule.status === 'active' ? 'rgba(255,184,0,0.3)' : 'rgba(56,214,138,0.3)'}`, color: rule.status === 'active' ? '#FFB800' : '#38D68A', opacity: toggling ? 0.5 : 1 }}>
                {rule.status === 'active' ? 'Pause Rule' : 'Enable Rule'}
              </button>
            </div>
          )}
          {tab === 'logic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(0,207,255,0.06)', border: '1px solid rgba(0,207,255,0.15)' }}>
                <div style={{ fontSize: 9, color: '#00CFFF', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>IF Conditions</div>
                {rule.trigger_event && <LogicChip label="Event:" value={rule.trigger_event} color="#00CFFF" />}
                {rule.trigger_metric && <LogicChip label="Metric:" value={rule.trigger_metric} color="#7B6FFF" />}
                {rule.trigger_threshold != null && <LogicChip label="Threshold:" value={`> ${rule.trigger_threshold}`} color="#FFB800" />}
                {rule.trigger_cron && <LogicChip label="Cron:" value={rule.trigger_cron} color="#CC80FF" />}
              </div>
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 20 }}>↓</div>
              <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(204,128,255,0.06)', border: '1px solid rgba(204,128,255,0.15)' }}>
                <div style={{ fontSize: 9, color: '#CC80FF', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>THEN Actions</div>
                <LogicChip label="Action:" value={ACTION_LABELS[rule.action_type] ?? rule.action_type} color="#CC80FF" />
                {Object.keys(rule.action_config).length > 0 && (
                  <div style={{ marginTop: 8, padding: '8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                    {JSON.stringify(rule.action_config, null, 2)}
                  </div>
                )}
              </div>
            </div>
          )}
          {tab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mockHistory.map((h, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: h.result === 'success' ? '#38D68A' : '#FF4A5E', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{h.trigger}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)' }}>{h.user} · {h.time}</div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{h.duration}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Fire Count',   value: rule.fire_count.toLocaleString(), color: '#00CFFF' },
                  { label: 'Success Rate', value: `${synth.successRate}%`,          color: '#38D68A' },
                  { label: 'Avg Exec',     value: `${synth.avgExecTime}ms`,         color: '#FFB800' },
                  { label: 'False Positives', value: `${(100 - synth.successRate).toFixed(1)}%`, color: '#FF8C00' },
                ].map(m => (
                  <div key={m.label} style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'versions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(Math.min(synth.version, 4))].map((_, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? '#38D68A' : '#fff' }}>v{synth.version - i} {i === 0 && <span style={{ fontSize: 9, color: '#38D68A' }}>CURRENT</span>}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{new Date(Date.now() - i * 7 * 86400000).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{OWNERS[i % OWNERS.length]} — {['Created rule', 'Updated threshold', 'Changed action', 'Fixed logic'][i] ?? 'Updated'}</div>
                  {i > 0 && <button style={{ marginTop: 6, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, cursor: 'pointer', background: 'rgba(123,111,255,0.12)', border: '1px solid rgba(123,111,255,0.25)', color: '#7B6FFF' }}>Rollback</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: color ?? '#fff' }}>{value}</span>
    </div>
  );
}

function LogicChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', minWidth: 70 }}>{label}</span>
      <code style={{ fontSize: 11, color, fontFamily: 'monospace', fontWeight: 700 }}>{value}</code>
    </div>
  );
}

// ── RULE BUILDER MODAL ────────────────────────────────────────
function RuleBuilder({ onClose, onSave, isPending }: {
  onClose: () => void; onSave: (f: BuilderForm) => void; isPending: boolean;
}) {
  const [form, setForm] = useState<BuilderForm>({ ...BLANK_BUILDER });
  const [saveError, setSaveError] = useState('');

  function addCondition() {
    setForm(f => ({ ...f, conditions: [...f.conditions, { field: 'report_count', op: '>', value: '3', logic: 'AND' }] }));
  }
  function removeCondition(i: number) {
    setForm(f => ({ ...f, conditions: f.conditions.filter((_, j) => j !== i) }));
  }
  function addAction() {
    setForm(f => ({ ...f, actions: [...f.actions, { type: 'send_notification', label: 'Send Notification' }] }));
  }
  function removeAction(i: number) {
    setForm(f => ({ ...f, actions: f.actions.filter((_, j) => j !== i) }));
  }
  function handleSave() {
    if (!form.name.trim()) { setSaveError('Rule name is required'); return; }
    onSave(form);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, padding: 28, background: '#0D0D1F', border: '1px solid rgba(0,207,255,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>IF / THEN Rule Builder</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {/* Rule meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>Rule Name</div>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Auto-hide flagged dreams" style={inp()} />
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>Rule Type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['event','threshold','scheduled'] as OsRuleType[]).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, rule_type: t }))} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: form.rule_type === t ? 'rgba(0,207,255,0.12)' : 'rgba(255,255,255,0.04)',
                  border: form.rule_type === t ? '1px solid rgba(0,207,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  color: form.rule_type === t ? '#00CFFF' : 'rgba(255,255,255,0.45)',
                }}>{t}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>Description</div>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe what this rule does…" style={inp()} />
        </div>

        {/* IF block */}
        <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(0,207,255,0.05)', border: '1px solid rgba(0,207,255,0.15)', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#00CFFF', marginBottom: 12 }}>⚡ IF (Conditions)</div>
          {form.conditions.map((cond, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              {i > 0 && (
                <select value={cond.logic} onChange={e => setForm(f => ({ ...f, conditions: f.conditions.map((c, j) => j === i ? { ...c, logic: e.target.value as 'AND' | 'OR' } : c) }))} style={{ ...inp({ width: 64, padding: '6px 8px', fontSize: 11 }) }}>
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              )}
              <select value={cond.field} onChange={e => setForm(f => ({ ...f, conditions: f.conditions.map((c, j) => j === i ? { ...c, field: e.target.value } : c) }))} style={{ ...inp({ flex: 1, padding: '6px 10px', fontSize: 11 }) }}>
                {TRIGGER_METRICS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={cond.op} onChange={e => setForm(f => ({ ...f, conditions: f.conditions.map((c, j) => j === i ? { ...c, op: e.target.value } : c) }))} style={{ ...inp({ width: 60, padding: '6px 8px', fontSize: 11 }) }}>
                {['>', '<', '>=', '<=', '==', '!='].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <input value={cond.value} onChange={e => setForm(f => ({ ...f, conditions: f.conditions.map((c, j) => j === i ? { ...c, value: e.target.value } : c) }))} placeholder="value" style={{ ...inp({ width: 80, padding: '6px 10px', fontSize: 11 }) }} />
              {form.conditions.length > 1 && (
                <button onClick={() => removeCondition(i)} style={{ background: 'none', border: 'none', color: '#FF4A5E', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
              )}
            </div>
          ))}
          <button onClick={addCondition} style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.2)', color: '#00CFFF' }}>+ Add Condition</button>
        </div>

        {/* THEN block */}
        <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(204,128,255,0.05)', border: '1px solid rgba(204,128,255,0.15)', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#CC80FF', marginBottom: 12 }}>🎯 THEN (Actions)</div>
          {form.actions.map((act, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <select
                value={act.type}
                onChange={e => setForm(f => ({ ...f, actions: f.actions.map((a, j) => j === i ? { type: e.target.value, label: ACTION_LABELS[e.target.value] ?? e.target.value } : a) }))}
                style={{ ...inp({ flex: 1, padding: '6px 10px', fontSize: 11 }) }}
              >
                {ACTION_TYPES.map(t => <option key={t} value={t}>{ACTION_LABELS[t] ?? t}</option>)}
              </select>
              {form.actions.length > 1 && (
                <button onClick={() => removeAction(i)} style={{ background: 'none', border: 'none', color: '#FF4A5E', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
              )}
            </div>
          ))}
          <button onClick={addAction} style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', background: 'rgba(204,128,255,0.08)', border: '1px solid rgba(204,128,255,0.2)', color: '#CC80FF' }}>+ Add Action</button>
        </div>

        {/* Trigger config */}
        {form.rule_type === 'event' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>Trigger Event</div>
            <select value={form.trigger_event} onChange={e => setForm(f => ({ ...f, trigger_event: e.target.value }))} style={inp()}>
              {TRIGGER_EVENTS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        )}
        {form.rule_type === 'threshold' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>Metric</div>
              <select value={form.trigger_metric} onChange={e => setForm(f => ({ ...f, trigger_metric: e.target.value }))} style={inp()}>
                {TRIGGER_METRICS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>Threshold</div>
              <input type="number" value={form.trigger_threshold} onChange={e => setForm(f => ({ ...f, trigger_threshold: parseInt(e.target.value) || 0 }))} style={inp()} />
            </div>
          </div>
        )}
        {form.rule_type === 'scheduled' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>Cron Expression</div>
            <input value={form.trigger_cron} onChange={e => setForm(f => ({ ...f, trigger_cron: e.target.value }))} placeholder="0 9 * * 1" style={{ ...inp(), fontFamily: 'monospace' }} />
          </div>
        )}

        {saveError && <p style={{ fontSize: 12, color: '#FF4A5E', marginBottom: 12 }}>{saveError}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
          <button onClick={handleSave} disabled={isPending} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,207,255,0.15)', border: '1px solid rgba(0,207,255,0.35)', color: '#00CFFF', opacity: isPending ? 0.5 : 1 }}>
            {isPending ? 'Creating…' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RIGHT EXECUTION PANEL ─────────────────────────────────────
function ExecPanel({ rules }: { rules: AutomationRule[] }) {
  const rng = useRef(mkRng(0xC9A1));
  const [running, setRunning] = useState([
    { name: 'Auto-Hide Report Threshold', pct: 71, color: '#FFB800' },
    { name: 'AI Toxicity Review',         pct: 38, color: '#CC80FF' },
  ]);
  useEffect(() => {
    const iv = setInterval(() => {
      setRunning(p => p.map(r => ({ ...r, pct: Math.min(100, r.pct + Math.floor(rng.current() * 4)) })));
    }, 1400);
    return () => clearInterval(iv);
  }, []);

  const queued    = rules.filter(r => r.status === 'active').slice(0, 3);
  const completed = rules.filter(r => r.fire_count > 0).slice(0, 4);
  const failed    = rules.filter(r => getSynth(r.id).lastResult === 'failed').slice(0, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Running */}
      <Card style={{ padding: 14 }}>
        <SecLabel color="#38D68A">Currently Running</SecLabel>
        {running.filter(r => r.pct < 100).map(r => (
          <div key={r.name} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 8 }}>{r.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: r.color, flexShrink: 0 }}>{r.pct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${r.pct}%`, background: r.color, transition: 'width 0.8s ease' }} />
            </div>
          </div>
        ))}
        {running.every(r => r.pct >= 100) && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>All tasks completed</div>}
      </Card>

      {/* Queued */}
      <Card style={{ padding: 14 }}>
        <SecLabel color="#FFB800">Queued ({queued.length})</SecLabel>
        {queued.map(r => (
          <div key={r.id} style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 6 }}>{r.name}</span>
            <span style={{ fontSize: 9, color: '#FFB800', flexShrink: 0 }}>{r.rule_type}</span>
          </div>
        ))}
      </Card>

      {/* Completed */}
      <Card style={{ padding: 14 }}>
        <SecLabel color="#7B6FFF">Completed</SecLabel>
        {completed.map(r => (
          <div key={r.id} style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.name}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#38D68A', marginLeft: 6 }}>✓</span>
          </div>
        ))}
      </Card>

      {/* Failed */}
      <Card style={{ padding: 14 }}>
        <SecLabel color="#FF4A5E">Failed</SecLabel>
        {failed.length === 0
          ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No failures</div>
          : failed.map(r => (
            <div key={r.id} style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#FF4A5E' }}>{r.name}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Last attempt: {r.last_fired_at ? new Date(r.last_fired_at).toLocaleString() : 'N/A'}</div>
            </div>
          ))
        }
      </Card>
    </div>
  );
}

// ── ENHANCED THRESHOLDS ───────────────────────────────────────
function EnhancedThresholds({ draft, setDraft }: { draft: Partial<ModerationRules>; setDraft: React.Dispatch<React.SetStateAction<Partial<ModerationRules>>> }) {
  const thresholds: { key: keyof ModerationRules; label: string; desc: string; color: string; max: number; icon: string }[] = [
    { key: 'autoHideThreshold',       label: 'Auto-Hide',       desc: 'Reports before content is hidden',           color: '#FF8C00', max: 20,  icon: '🙈' },
    { key: 'reportThreshold',         label: 'Report Alert',    desc: 'Reports before admin alert fires',           color: '#FFB800', max: 15,  icon: '🚩' },
    { key: 'banThreshold',            label: 'Auto-Ban',        desc: 'Violations before user is auto-banned',      color: '#FF4A5E', max: 30,  icon: '🔨' },
    { key: 'suspiciousUserThreshold', label: 'Suspicious Flag', desc: 'Risk events to flag a suspicious user',      color: '#CC80FF', max: 20,  icon: '👁' },
    { key: 'aiRiskThreshold',         label: 'AI Risk Score',   desc: 'AI score (0–100) to trigger review',         color: '#7B6FFF', max: 100, icon: '🧠' },
  ];

  return (
    <Card>
      <SecLabel color="#FF8C00">⚡ Moderation Thresholds</SecLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {thresholds.map(t => {
          const val = (draft[t.key] as number) ?? 0;
          const pct = Math.min(100, (val / t.max) * 100);
          const dangerZone = pct > 75;
          return (
            <div key={String(t.key)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{t.desc}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {dangerZone && <span style={{ fontSize: 9, color: '#FF4A5E', fontWeight: 700 }}>HIGH</span>}
                  <input
                    type="number" min={1} max={t.max} value={val}
                    onChange={e => setDraft((d: Partial<ModerationRules>) => ({ ...d, [t.key]: parseInt(e.target.value) || 0 }))}
                    style={{ width: 64, background: 'rgba(255,255,255,0.06)', border: `1px solid ${t.color}40`, borderRadius: 8, padding: '4px 8px', color: t.color, fontSize: 14, fontWeight: 800, textAlign: 'center', outline: 'none', fontFamily: 'monospace' }}
                  />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>/ {t.max}</span>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: dangerZone ? '#FF4A5E' : t.color, transition: 'all 0.3s', boxShadow: dangerZone ? `0 0 8px ${t.color}60` : 'none' }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── RATE LIMITS ───────────────────────────────────────────────
function RateLimitsPanel({ draft, setDraft }: { draft: Partial<ModerationRules>; setDraft: React.Dispatch<React.SetStateAction<Partial<ModerationRules>>> }) {
  const [custom, setCustom] = useState<Record<string, number>>(
    RATE_LIMIT_ENDPOINTS.reduce((acc, e) => ({ ...acc, [e.key]: e.def }), {})
  );

  return (
    <Card>
      <SecLabel color="#00CFFF">🛡️ Rate Limits</SecLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { key: 'rateLimitPerMinute' as keyof ModerationRules, label: 'Global / min', color: '#00CFFF', max: 120 },
          { key: 'rateLimitPerHour'   as keyof ModerationRules, label: 'Global / hr',  color: '#7B6FFF', max: 1000 },
        ].map(r => {
          const val = (draft[r.key] as number) ?? 0;
          return (
            <div key={String(r.key)} style={{ padding: '12px', borderRadius: 10, background: `${r.color}08`, border: `1px solid ${r.color}20` }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>{r.label}</div>
              <input
                type="number" min={1} max={r.max} value={val}
                onChange={e => setDraft((d: Partial<ModerationRules>) => ({ ...d, [r.key]: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', background: 'transparent', border: 'none', color: r.color, fontSize: 24, fontWeight: 900, outline: 'none', fontFamily: 'monospace' }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 10 }}>Per-Endpoint Limits</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {RATE_LIMIT_ENDPOINTS.map(e => (
          <div key={e.key} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>{e.icon}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>{e.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <input
                type="number" value={custom[e.key] ?? e.def}
                onChange={ev => setCustom(c => ({ ...c, [e.key]: parseInt(ev.target.value) || 0 }))}
                style={{ width: 52, background: 'transparent', border: 'none', color: '#00CFFF', fontSize: 16, fontWeight: 800, outline: 'none', fontFamily: 'monospace' }}
              />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{e.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── RESTRICTED WORDS ──────────────────────────────────────────
function RestrictedWordsPanel({ draft, setDraft }: { draft: Partial<ModerationRules>; setDraft: React.Dispatch<React.SetStateAction<Partial<ModerationRules>>> }) {
  const [wordInput, setWordInput]   = useState('');
  const [wordCat, setWordCat]       = useState('custom');
  const words: string[] = draft.restrictedWords ?? [];

  const byCat: Record<string, string[]> = {};
  WORD_CATEGORIES.forEach(c => { byCat[c.key] = []; });
  words.forEach((w: string) => {
    const cat = w.includes(':') ? w.split(':')[0] ?? 'custom' : 'custom';
    const word = w.includes(':') ? w.split(':').slice(1).join(':') : w;
    (byCat[cat] ?? (byCat[cat] = [])).push(word);
  });

  function addWord() {
    const w = wordInput.trim().toLowerCase();
    if (!w) return;
    const entry = `${wordCat}:${w}`;
    if (!words.includes(entry) && !words.includes(w)) {
      setDraft((d: Partial<ModerationRules>) => ({ ...d, restrictedWords: [...(d.restrictedWords ?? []), entry] }));
    }
    setWordInput('');
  }
  function removeWord(w: string) {
    setDraft((d: Partial<ModerationRules>) => ({ ...d, restrictedWords: (d.restrictedWords ?? []).filter((x: string) => x !== w && (x.includes(':') ? x.split(':').slice(1).join(':') !== w : true)) }));
  }

  return (
    <Card>
      <SecLabel color="#FF4A5E">🚫 Restricted Words</SecLabel>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <select value={wordCat} onChange={e => setWordCat(e.target.value)} style={{ ...inp({ width: 130, padding: '8px 10px', fontSize: 12 }), cursor: 'pointer' }}>
          {WORD_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <input
          value={wordInput} onChange={e => setWordInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addWord()}
          placeholder="Add word and press Enter…"
          style={{ ...inp({ flex: 1 }) }}
        />
        <button onClick={addWord} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,74,94,0.12)', border: '1px solid rgba(255,74,94,0.3)', color: '#FF4A5E', whiteSpace: 'nowrap' }}>Add</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {WORD_CATEGORIES.map(c => {
          const cWords = byCat[c.key] ?? [];
          if (cWords.length === 0) return null;
          return (
            <div key={c.key}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: c.color, marginBottom: 6 }}>{c.label} ({cWords.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cWords.map(w => (
                  <span key={w} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'monospace', padding: '3px 8px', borderRadius: 6, background: `${c.color}10`, border: `1px solid ${c.color}25`, color: c.color }}>
                    {w}
                    <button onClick={() => removeWord(`${c.key}:${w}`)} style={{ background: 'none', border: 'none', color: c.color, cursor: 'pointer', fontSize: 12, opacity: 0.6, padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {words.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No restricted words configured</div>}
      </div>
    </Card>
  );
}

// ── ANALYTICS ─────────────────────────────────────────────────
function AnalyticsSection({ rules }: { rules: AutomationRule[] }) {
  const topFired = [...rules].sort((a, b) => b.fire_count - a.fire_count).slice(0, 5);
  const topFailed = rules.filter(r => getSynth(r.id).lastResult === 'failed').slice(0, 4);

  const hours = [6,8,10,12,14,16,18,20,22].map(h => ({
    h, v: [12,45,78,62,55,71,89,95,67][Math.floor((h - 6) / 2)] ?? 50,
  }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
      <Card>
        <SecLabel>Most Triggered</SecLabel>
        {topFired.length === 0
          ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No data yet</div>
          : topFired.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: ['#FFB800','#7B6FFF','#00CFFF','#38D68A','rgba(255,255,255,0.4)'][i] ?? '#fff' }}>#{i+1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#00CFFF' }}>{r.fire_count.toLocaleString()}</span>
            </div>
          ))
        }
      </Card>

      <Card>
        <SecLabel>Trigger Distribution (Hourly)</SecLabel>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
          {hours.map(h => (
            <div key={h.h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', height: h.v * 0.76, borderRadius: '3px 3px 0 0', background: h.v > 80 ? '#38D68A' : h.v > 60 ? '#00CFFF' : 'rgba(123,111,255,0.5)', transition: 'height 0.4s' }} />
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{h.h}h</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(56,214,138,0.08)', border: '1px solid rgba(56,214,138,0.15)' }}>
          <span style={{ fontSize: 10, color: '#38D68A', fontWeight: 700 }}>🏆 Peak: 20:00 UTC</span>
        </div>
      </Card>

      <Card>
        <SecLabel>Failed Rules</SecLabel>
        {topFailed.length === 0
          ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No failures</div>
          : topFailed.map(r => {
            const s = getSynth(r.id);
            return (
              <div key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#FF4A5E' }}>{r.name}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Success: {s.successRate}% · Exec: {s.avgExecTime}ms</div>
              </div>
            );
          })
        }
      </Card>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function AutomationRules() {
  const qc = useQueryClient();
  const [draft, setDraft]         = useState<Partial<ModerationRules>>({});
  const [saved, setSaved]         = useState(false);
  const [catFilter, setCatFilter] = useState<RuleCategory | null>(null);
  const [builder, setBuilder]     = useState(false);
  const [detailRule, setDetailRule] = useState<AutomationRule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AutomationRule | null>(null);

  const { data: modRules, isLoading: modLoading } = useQuery({
    queryKey: ['moderation-rules'],
    queryFn:  fetchModerationRules,
  });
  const { data: autoRules = [], isLoading: autoLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn:  fetchAutomationRules,
  });

  useEffect(() => { if (modRules) setDraft(modRules); }, [modRules]);

  const modMut = useMutation({
    mutationFn: updateModerationRules,
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: ['moderation-rules'] }); setSaved(true); setTimeout(() => setSaved(false), 2500); },
  });
  const createMut = useMutation({
    mutationFn: createAutomationRule,
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: ['automation-rules'] }); setBuilder(false); },
  });
  const toggleMut = useMutation({
    mutationFn: toggleAutomationRule,
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  });
  const deleteMut = useMutation({
    mutationFn: deleteAutomationRule,
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: ['automation-rules'] }); setDeleteConfirm(null); },
  });

  const filtered = catFilter
    ? autoRules.filter(r => deriveCategory(r) === catFilter)
    : autoRules;

  function handleCreate(form: BuilderForm) {
    createMut.mutate({
      name:                form.name,
      description:         form.description || undefined,
      rule_type:           form.rule_type,
      trigger_event:       form.rule_type === 'event'     ? form.trigger_event     : undefined,
      trigger_metric:      form.rule_type === 'threshold' ? form.trigger_metric    : undefined,
      trigger_threshold:   form.rule_type === 'threshold' ? form.trigger_threshold : undefined,
      trigger_cron:        form.rule_type === 'scheduled' ? form.trigger_cron      : undefined,
      action_type:         form.action_type,
      action_config:       { actions: form.actions.map(a => a.type) },
    });
  }

  const isLoading = modLoading || autoLoading;

  return (
    <div className="section-system" style={{ padding: '24px 0', minHeight: '100vh' }}>
      <style>{`
        @keyframes ar-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
      `}</style>

      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Automation & Decision Engine</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '4px 0 0' }}>Central AI Rule Engine — moderation thresholds, event triggers, and intelligent automation</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saved && <span style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 10, background: 'rgba(56,214,138,0.1)', border: '1px solid rgba(56,214,138,0.3)', color: '#38D68A' }}>✓ Saved</span>}
            <button onClick={() => modMut.mutate(draft)} disabled={modMut.isPending} style={{ padding: '9px 18px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(56,214,138,0.1)', border: '1px solid rgba(56,214,138,0.3)', color: '#38D68A', opacity: modMut.isPending ? 0.5 : 1 }}>
              {modMut.isPending ? 'Saving…' : 'Save Changes'}
            </button>
            <button onClick={() => setBuilder(true)} style={{ padding: '9px 18px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,207,255,0.12)', border: '1px solid rgba(0,207,255,0.3)', color: '#00CFFF' }}>
              + New Rule
            </button>
          </div>
        </div>

        {isLoading && <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading…</div>}

        {!isLoading && (
          <>
            {/* Global Dashboard */}
            <div style={{ marginBottom: 20 }}><GlobalDashboard rules={autoRules} /></div>

            {/* Category Bar */}
            <div style={{ marginBottom: 20 }}><CategoryBar active={catFilter} onSelect={setCatFilter} /></div>

            {/* AI Recommendations */}
            <div style={{ marginBottom: 20 }}><AIRecommendations onApply={() => setBuilder(true)} /></div>

            {/* Main layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
              {/* Left */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Rule Cards */}
                {filtered.length === 0
                  ? (
                    <Card>
                      <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                        {catFilter ? `No rules in ${CAT_CFG[catFilter].label} category` : 'No automation rules yet — create the first one'}
                      </div>
                    </Card>
                  )
                  : (
                    <div>
                      <SecLabel>Automation Rules ({filtered.length})</SecLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {filtered.map(rule => (
                          <RuleCard
                            key={rule.id}
                            rule={rule}
                            onToggle={() => toggleMut.mutate(rule.id)}
                            onDelete={() => setDeleteConfirm(rule)}
                            onDetail={() => setDetailRule(rule)}
                            toggling={toggleMut.isPending}
                          />
                        ))}
                      </div>
                    </div>
                  )
                }

                {/* Moderation Thresholds */}
                <EnhancedThresholds draft={draft} setDraft={setDraft} />

                {/* Rate Limits */}
                <RateLimitsPanel draft={draft} setDraft={setDraft} />

                {/* Restricted Words */}
                <RestrictedWordsPanel draft={draft} setDraft={setDraft} />

                {/* Analytics */}
                <div>
                  <SecLabel>Analytics</SecLabel>
                  <AnalyticsSection rules={autoRules} />
                </div>
              </div>

              {/* Right */}
              <div style={{ position: 'sticky', top: 24 }}>
                <ExecPanel rules={autoRules} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {builder && (
        <RuleBuilder
          onClose={() => setBuilder(false)}
          onSave={handleCreate}
          isPending={createMut.isPending}
        />
      )}

      {detailRule && (
        <RuleDetailDrawer
          rule={detailRule}
          onClose={() => setDetailRule(null)}
          onToggle={() => { toggleMut.mutate(detailRule.id); setDetailRule(null); }}
          toggling={toggleMut.isPending}
        />
      )}

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <div style={{ width: '100%', maxWidth: 400, borderRadius: 20, padding: 28, background: '#0D0D1F', border: '1px solid rgba(255,74,94,0.3)' }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: '0 0 8px' }}>Delete Automation Rule?</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 20, lineHeight: 1.5 }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>{deleteConfirm.name}</span> will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
              <button onClick={() => deleteMut.mutate(deleteConfirm.id)} disabled={deleteMut.isPending} style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,74,94,0.15)', border: '1px solid rgba(255,74,94,0.35)', color: '#FF4A5E', opacity: deleteMut.isPending ? 0.5 : 1 }}>
                {deleteMut.isPending ? 'Deleting…' : 'Delete Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
