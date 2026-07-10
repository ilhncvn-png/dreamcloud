import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getStoredAuth, clearStoredAuth } from '../store/auth.store';

// ── Color palette ──────────────────────────────────────────────────────────────
const C = {
  purple: '#7B6FFF', violet: '#CC80FF', cyan: '#00CFFF', green: '#38D68A',
  red: '#FF4A5E', gold: '#FFB800', pink: '#FF4D8F', orange: '#FF8C00', muted: '#3E3E62',
};

// ── Config state type ──────────────────────────────────────────────────────────
interface Cfg {
  platformName: string; platformDesc: string; timezone: string; defaultLang: string;
  regOpen: boolean; emailVerif: boolean; phoneVerif: boolean; inviteOnly: boolean;
  ageGate: boolean; defaultPrivacy: string; defaultDreamVis: string; dmEnabled: boolean;
  welcomeFlow: boolean; tutorial: boolean; welcomeEmail: boolean; archetypeQuiz: boolean;
  maxPerIP: string;
  maxDreamLen: string; minDreamLen: string; maxTitle: string; maxTags: string;
  maxDrafts: string; autoSaveInterval: string;
  aiAnalysis: boolean; autoTag: boolean; lucidDetect: boolean; nightmareDetect: boolean;
  symbolEngine: boolean; anonymousDreams: boolean; drafts: boolean;
  scheduledDreams: boolean; voiceDreams: boolean;
  analysisModel: string; confidenceMin: string;
  primaryModel: string; dreamModel: string; archetypeModel: string; fallbackModel: string;
  dreamPulse: boolean; pulseFreq: string; resonance: boolean; resonanceRadius: string;
  archetypeEngine: boolean; emotionEngine: boolean; genomeEngine: boolean;
  aiMod: boolean; aiModThreshold: string; maxTokens: string;
  autoHide: boolean; autoHideAfter: string; tempBanAfter: string;
  permBanAfter: string; tempBanDuration: string;
  spamFilter: boolean; nsfw: boolean; violenceThreshold: string;
  shadowBan: boolean; deviceBan: boolean; ipBan: boolean;
  appeals: boolean; appealSLA: string;
  pushEnabled: boolean; emailEnabled: boolean; smsEnabled: boolean;
  weeklyDigest: boolean; modAlerts: boolean; sysAlerts: boolean;
  notifLike: boolean; notifFollow: boolean; notifComment: boolean;
  maxSessions: string; sessionTimeout: string; jwtExpiry: string;
  jwtRefresh: boolean; deviceBinding: boolean; twoFA: boolean;
  oauthGoogle: boolean; oauthApple: boolean; oauthTwitter: boolean;
  apiWhitelist: boolean; adminWhitelist: boolean;
  loginRateLimit: string; lockoutDuration: string; pwMinLength: string;
}

const INIT: Cfg = {
  platformName: 'DreamCloud', platformDesc: 'Collective Dream Intelligence',
  timezone: 'UTC+3', defaultLang: 'en',
  regOpen: true, emailVerif: true, phoneVerif: false, inviteOnly: false,
  ageGate: true, defaultPrivacy: 'followers', defaultDreamVis: 'followers',
  dmEnabled: true, welcomeFlow: true, tutorial: true, welcomeEmail: true,
  archetypeQuiz: true, maxPerIP: '3',
  maxDreamLen: '4000', minDreamLen: '20', maxTitle: '120', maxTags: '10',
  maxDrafts: '20', autoSaveInterval: '30',
  aiAnalysis: true, autoTag: true, lucidDetect: true, nightmareDetect: true,
  symbolEngine: true, anonymousDreams: false, drafts: true,
  scheduledDreams: false, voiceDreams: false,
  analysisModel: 'gpt-4o', confidenceMin: '0.72',
  primaryModel: 'gpt-4o', dreamModel: 'dc-dream-v2.1',
  archetypeModel: 'dc-archetype-v3', fallbackModel: 'gpt-3.5-turbo',
  dreamPulse: true, pulseFreq: '60', resonance: true, resonanceRadius: '50',
  archetypeEngine: true, emotionEngine: true, genomeEngine: false,
  aiMod: false, aiModThreshold: '0.85', maxTokens: '2048',
  autoHide: true, autoHideAfter: '3', tempBanAfter: '5',
  permBanAfter: '3', tempBanDuration: '7',
  spamFilter: true, nsfw: false, violenceThreshold: '0.80',
  shadowBan: false, deviceBan: false, ipBan: true, appeals: true, appealSLA: '72',
  pushEnabled: true, emailEnabled: false, smsEnabled: false,
  weeklyDigest: true, modAlerts: true, sysAlerts: true,
  notifLike: true, notifFollow: true, notifComment: true,
  maxSessions: '3', sessionTimeout: '24', jwtExpiry: '1',
  jwtRefresh: true, deviceBinding: true, twoFA: false,
  oauthGoogle: true, oauthApple: false, oauthTwitter: false,
  apiWhitelist: false, adminWhitelist: false,
  loginRateLimit: '5', lockoutDuration: '15', pwMinLength: '8',
};

// ── Types ──────────────────────────────────────────────────────────────────────
type St     = 'ok' | 'warn' | 'error' | 'off' | 'idle';
type Impact = 'low' | 'medium' | 'high' | 'critical';

const ST_CFG: Record<St, { color: string; label: string }> = {
  ok:    { color: C.green,  label: 'OK'      },
  warn:  { color: C.gold,   label: 'WARN'    },
  error: { color: C.red,    label: 'ERROR'   },
  off:   { color: C.muted,  label: 'OFFLINE' },
  idle:  { color: C.purple, label: 'IDLE'    },
};
const IMP_CFG: Record<Impact, { color: string; label: string }> = {
  low:      { color: C.muted,  label: 'LOW'  },
  medium:   { color: C.gold,   label: 'MED'  },
  high:     { color: C.orange, label: 'HIGH' },
  critical: { color: C.red,    label: 'CRIT' },
};

interface PendingConfirm {
  label: string; impact: Impact; desc: string;
  oldV: string; newV: string; onConfirm: () => void;
}
interface Ctrls {
  cfg: Cfg;
  set: <K extends keyof Cfg>(k: K, v: Cfg[K]) => void;
  tog: (k: keyof Cfg) => void;
  mod: (k: keyof Cfg) => boolean;
  ask: (label: string, impact: Impact, desc: string, oldV: string, newV: string, fn: () => void) => void;
}

// ── Micro-components ───────────────────────────────────────────────────────────
function Badge({ st, label }: { st: St; label?: string }) {
  const { color, label: def } = ST_CFG[st];
  return (
    <span style={{ color, background: `${color}18`, borderColor: `${color}35` }}
      className="inline-flex items-center gap-[3px] px-1.5 py-[1px] rounded text-[8.5px] font-bold font-mono border flex-shrink-0">
      <span style={{ background: color }} className="w-[4px] h-[4px] rounded-full" />{label ?? def}
    </span>
  );
}
function ImpBadge({ level }: { level: Impact }) {
  const { color, label } = IMP_CFG[level];
  return (
    <span style={{ color, background: `${color}12`, borderColor: `${color}35` }}
      className="text-[7.5px] font-bold font-mono px-1 py-[1px] rounded border flex-shrink-0 uppercase tracking-wide">
      {label}
    </span>
  );
}
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      style={{ background: on ? C.purple : undefined }}
      className={`relative flex-shrink-0 h-[14px] w-[26px] rounded-full border transition-all duration-150 ${
        on ? 'border-[#7B6FFF55]' : 'bg-dc-surface-high border-dc-border'}`}>
      <span style={{ background: '#fff', left: on ? '12px' : '2px' }}
        className="absolute top-[2px] w-[9px] h-[9px] rounded-full transition-all duration-150" />
    </button>
  );
}
function Sel({ value, opts, onChange }: { value: string; opts: [string, string][]; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-[10px] bg-dc-surface-high border border-dc-border rounded px-1.5 py-[3px] text-dc-text font-mono cursor-pointer focus:outline-none focus:border-dc-primary/40 appearance-none">
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
function NumIn({ value, onChange, unit, w = 'w-14' }: { value: string; onChange: (v: string) => void; unit?: string; w?: string }) {
  return (
    <div className="flex items-center gap-1">
      <input type="number" value={value} onChange={e => onChange(e.target.value)}
        className={`${w} text-[10px] bg-dc-surface-high border border-dc-border rounded px-1.5 py-[3px] text-dc-text font-mono text-right focus:outline-none focus:border-dc-primary/40`} />
      {unit && <span className="text-[9px] text-dc-muted">{unit}</span>}
    </div>
  );
}
function TxtIn({ value, onChange, mono, w = '140px' }: { value: string; onChange: (v: string) => void; mono?: boolean; w?: string }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)}
      style={{ width: w }}
      className={`text-[10px] bg-dc-surface-high border border-dc-border rounded px-1.5 py-[3px] text-dc-text focus:outline-none focus:border-dc-primary/40 ${mono ? 'font-mono' : ''}`} />
  );
}

// ── Setting Row ────────────────────────────────────────────────────────────────
interface SRowProps {
  label: string; desc?: string; control: React.ReactNode;
  st?: St; stLabel?: string; impact?: Impact;
  changed?: string; modified?: boolean; confirm?: boolean;
}
function SRow({ label, desc, control, st, stLabel, impact, changed, modified, confirm }: SRowProps) {
  return (
    <div style={modified ? { background: `${C.cyan}05`, borderLeftColor: C.cyan } : undefined}
      className={`relative flex items-start gap-2 py-[7px] border-b border-dc-border last:border-0 hover:bg-white/[0.012] transition-colors ${
        modified ? 'pl-2 border-l-[2px]' : 'pl-0 border-l-[2px] border-l-transparent'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px] font-medium text-dc-text leading-none">{label}</span>
          {confirm && <span style={{ color: C.gold }} className="text-[9px] leading-none opacity-70" title="Requires confirmation">⚠</span>}
          {modified && <span style={{ color: C.cyan }} className="text-[7px] font-bold uppercase tracking-widest opacity-80">edited</span>}
        </div>
        {desc && <div className="text-[9px] text-dc-muted mt-[2px] leading-tight">{desc}</div>}
        {changed && <div className="text-[8px] text-dc-muted/50 mt-[1px] font-mono">{changed}</div>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 pt-[1px]">
        {control}
        {st    && <Badge   st={st} label={stLabel} />}
        {impact && <ImpBadge level={impact} />}
      </div>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────
function Card({ title, accent, children, className = '' }: { title: string; accent?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-dc-surface border border-dc-border rounded-lg ${className}`}>
      <div className="flex items-center gap-1.5 px-3.5 pt-2.5 pb-2 border-b border-dc-border">
        {accent && <span style={{ background: accent }} className="w-[3px] h-3 rounded-full flex-shrink-0" />}
        <span className="text-[9px] font-bold text-dc-muted uppercase tracking-[0.13em]">{title}</span>
      </div>
      <div className="px-3.5 py-2">{children}</div>
    </div>
  );
}

// ── Service card (infra) ───────────────────────────────────────────────────────
function SvcCard({ name, st, metrics, onRestart }: {
  name: string; st: St; metrics: { k: string; v: string }[]; onRestart?: () => void;
}) {
  const { color } = ST_CFG[st];
  return (
    <div style={{ borderColor: `${color}28`, background: `${color}07` }} className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10.5px] font-semibold text-dc-text">{name}</span>
        <div className="flex items-center gap-1.5">
          <Badge st={st} />
          {onRestart && (
            <button onClick={onRestart} style={{ color: C.gold, borderColor: `${C.gold}30` }}
              className="text-[7.5px] font-bold border rounded px-1 py-[1px] hover:opacity-80 transition-opacity">
              ↻
            </button>
          )}
        </div>
      </div>
      <div className="space-y-[3px]">
        {metrics.map(m => (
          <div key={m.k} className="flex items-center justify-between">
            <span className="text-[9px] text-dc-muted">{m.k}</span>
            <span style={{ color }} className="text-[9.5px] font-mono font-semibold">{m.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ action, onClose }: { action: PendingConfirm; onClose: () => void }) {
  const auth = getStoredAuth();
  const [reason,  setReason]  = useState('');
  const [confTxt, setConfTxt] = useState('');
  const [schedAt, setSchedAt] = useState('');
  const canApply = confTxt.toUpperCase() === 'CONFIRM' && reason.trim().length >= 5;
  const { color } = IMP_CFG[action.impact];

  function handleApply() { if (canApply) { action.onConfirm(); onClose(); } }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(6,6,20,0.88)' }}
      onClick={onClose}>
      <div className="bg-dc-surface border rounded-xl w-[500px] shadow-2xl" style={{ borderColor: `${color}45` }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-dc-border">
          <div className="flex items-center gap-2">
            <ImpBadge level={action.impact} />
            <span className="text-[12px] font-semibold text-dc-text">Confirm: {action.label}</span>
          </div>
          <button onClick={onClose} className="text-dc-muted hover:text-dc-text text-sm leading-none">✕</button>
        </div>
        {/* Audit preview */}
        <div className="px-5 py-3.5 border-b border-dc-border">
          <div className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-2">Audit Preview</div>
          <div className="bg-dc-bg rounded-lg p-3 space-y-1.5 text-[10.5px]">
            {[
              ['Setting',   action.label,                undefined],
              ['Old Value', action.oldV,                 C.red],
              ['New Value', action.newV,                 C.green],
              ['Admin',     `@${auth?.username ?? '?'}`, C.cyan],
              ['Timestamp', new Date().toISOString(),    undefined],
              ['Impact',    action.impact.toUpperCase(), color],
            ].map(([k, v, col]) => (
              <div key={k as string} className="flex justify-between gap-4">
                <span className="text-dc-muted">{k}</span>
                <span style={col ? { color: col as string } : undefined} className="font-mono text-dc-text truncate">{v}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Form */}
        <div className="px-5 py-3.5 space-y-3">
          <div>
            <div className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-1.5">Reason for Change *</div>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Describe why this change is necessary…"
              className="w-full bg-dc-bg border border-dc-border rounded-lg px-3 py-2 text-[10.5px] text-dc-text placeholder-dc-muted resize-none h-14 focus:outline-none focus:border-dc-primary/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-1.5">Type CONFIRM to proceed</div>
              <input value={confTxt} onChange={e => setConfTxt(e.target.value)} placeholder="CONFIRM"
                className="w-full bg-dc-bg border border-dc-border rounded-lg px-3 py-2 text-[10.5px] text-dc-text font-mono placeholder-dc-muted focus:outline-none focus:border-dc-primary/40" />
            </div>
            <div>
              <div className="text-[9px] font-bold text-dc-muted uppercase tracking-widest mb-1.5">Schedule (optional)</div>
              <input type="datetime-local" value={schedAt} onChange={e => setSchedAt(e.target.value)}
                className="w-full bg-dc-bg border border-dc-border rounded-lg px-3 py-2 text-[10.5px] text-dc-text font-mono focus:outline-none focus:border-dc-primary/40" />
            </div>
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-dc-border">
          <span className="text-[9px] text-dc-muted">{action.desc}</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-[10px] border border-dc-border text-dc-muted hover:text-dc-text transition-colors">
              Cancel
            </button>
            <button onClick={handleApply} disabled={!canApply}
              style={canApply ? { background: color, color: '#000' } : undefined}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                !canApply ? 'bg-dc-surface-high border border-dc-border text-dc-muted cursor-not-allowed opacity-50' : ''}`}>
              Apply Change
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section: Platform ──────────────────────────────────────────────────────────
function PlatformSection({ cfg, set, mod }: Ctrls) {
  return (
    <div className="grid grid-cols-3 gap-3.5">
      <Card title="Platform Identity" accent={C.purple}>
        <SRow label="Platform Name"     desc="Displayed in emails and meta tags"
              control={<TxtIn value={cfg.platformName} onChange={v => set('platformName', v)} w="130px" />}
              impact="medium" changed="@iceven · 4 days ago" modified={mod('platformName')} />
        <SRow label="Description"       desc="Tagline shown on splash screen"
              control={<TxtIn value={cfg.platformDesc} onChange={v => set('platformDesc', v)} w="160px" />}
              impact="low" changed="@iceven · 4 days ago" modified={mod('platformDesc')} />
        <SRow label="Default Language"  desc="Fallback locale for new users"
              control={<Sel value={cfg.defaultLang} onChange={v => set('defaultLang', v)}
                opts={[['en','English'],['tr','Türkçe'],['de','Deutsch'],['ja','日本語'],['fr','Français'],['pt','Português']]} />}
              impact="medium" changed="@iceven · 4 days ago" modified={mod('defaultLang')} />
        <SRow label="Server Timezone"   desc="Database timestamps and cron jobs"
              control={<Sel value={cfg.timezone} onChange={v => set('timezone', v)}
                opts={[['UTC','UTC'],['UTC+3','UTC+3 (Istanbul)'],['UTC-5','UTC-5 (EST)'],['UTC+9','UTC+9 (Tokyo)']]} />}
              impact="high" changed="@iceven · 7 days ago" modified={mod('timezone')} />
        <SRow label="Version"           control={<span className="text-[10px] font-mono text-dc-muted">2.0.0-beta</span>}
              st="ok" stLabel="BUILD OK" impact="low" />
        <SRow label="Environment"       control={<span style={{ color: C.gold }} className="text-[10px] font-mono font-bold">development</span>}
              impact="low" />
      </Card>

      <Card title="Runtime Services" accent={C.cyan}>
        <SRow label="REST API"    desc="localhost:3000"
              control={<span className="text-[9.5px] font-mono text-dc-muted">342 req/min</span>}
              st="ok" impact="critical" changed="Running 12d 4h" />
        <SRow label="Admin Panel" desc="localhost:4000"
              control={<span className="text-[9.5px] font-mono text-dc-muted">99.7% up</span>}
              st="ok" impact="high" />
        <SRow label="PostgreSQL"  desc="localhost:5432 · 12 connections"
              control={<span className="text-[9.5px] font-mono text-dc-muted">4.2ms avg</span>}
              st="ok" impact="critical" />
        <SRow label="Redis"       desc="localhost:6379 · 245 MB"
              control={<span className="text-[9.5px] font-mono text-dc-muted">94% hit</span>}
              st="ok" impact="high" />
        <SRow label="CDN"         desc="cdn.dreamcloud.dev"
              control={<span className="text-[9.5px] font-mono text-dc-muted">8.4% miss</span>}
              st="warn" impact="medium" changed="Latency elevated 2h ago" />
        <SRow label="Email SMTP"  desc="smtp.dreamcloud.dev"
              control={<span className="text-[9.5px] font-mono text-dc-muted">not verified</span>}
              st="warn" impact="medium" />
      </Card>

      <Card title="Branding & Localization" accent={C.pink}>
        <SRow label="Primary Color"   control={<span style={{ color: C.purple }} className="text-[10px] font-mono font-bold">#7B6FFF</span>}
              impact="low" changed="@iceven · 4 days ago" />
        <SRow label="Logo URL"        control={<span className="text-[9.5px] font-mono text-dc-muted">/assets/logo.svg</span>}
              st="ok" stLabel="LOADED" impact="low" />
        <SRow label="Favicon"         control={<span className="text-[9.5px] font-mono text-dc-muted">/assets/favicon.ico</span>}
              st="ok" stLabel="LOADED" impact="low" />
        <SRow label="Brand Font"      control={<span className="text-[9.5px] text-dc-muted">Inter + Space Grotesk</span>}
              impact="low" />
        <SRow label="Supported Langs" control={<span className="text-[9.5px] text-dc-muted">EN · TR · DE · JA · PT · FR</span>}
              impact="low" changed="@iceven · 4 days ago" />
        <SRow label="RTL Support"     control={<span className="text-[9.5px] text-dc-muted">Phase 3</span>}
              st="off" stLabel="PLANNED" impact="low" />
        <SRow label="Copyright"       control={<span className="text-[9.5px] text-dc-muted">© 2026 DreamCloud</span>}
              impact="low" />
      </Card>
    </div>
  );
}

// ── Section: User Defaults ────────────────────────────────────────────────────
function UserDefaultsSection({ cfg, set, tog, mod, ask }: Ctrls) {
  return (
    <div className="grid grid-cols-3 gap-3.5">
      <Card title="Registration Rules" accent={C.cyan}>
        <SRow label="Open Registration"  desc="Allow new user signups"
              control={<Toggle on={cfg.regOpen}    onChange={() => tog('regOpen')} />}
              impact="critical" changed="@iceven · 7 days ago" modified={mod('regOpen')} confirm />
        <SRow label="Email Verification" desc="Required before first access"
              control={<Toggle on={cfg.emailVerif} onChange={() => ask('Email Verification', 'high', 'Affects all new registrations', cfg.emailVerif?'ON':'OFF', !cfg.emailVerif?'ON':'OFF', () => tog('emailVerif'))} />}
              impact="high" modified={mod('emailVerif')} confirm />
        <SRow label="Phone Verification" desc="SMS OTP on signup (Twilio)"
              control={<Toggle on={cfg.phoneVerif} onChange={() => tog('phoneVerif')} />}
              impact="medium" modified={mod('phoneVerif')} />
        <SRow label="Invite-Only Mode"   desc="Require valid invite code"
              control={<Toggle on={cfg.inviteOnly} onChange={() => ask('Invite-Only', 'critical', 'Closes platform to public signups', cfg.inviteOnly?'ON':'OFF', !cfg.inviteOnly?'ON':'OFF', () => tog('inviteOnly'))} />}
              impact="critical" modified={mod('inviteOnly')} confirm />
        <SRow label="Age Gate (13+)"     desc="Enforce minimum age requirement"
              control={<Toggle on={cfg.ageGate}    onChange={() => tog('ageGate')} />}
              impact="high" modified={mod('ageGate')} />
        <SRow label="Max Accounts / IP"  desc="Per 24 hour window"
              control={<NumIn value={cfg.maxPerIP} onChange={v => set('maxPerIP', v)} unit="accounts" />}
              impact="medium" changed="@iceven · 4 days ago" modified={mod('maxPerIP')} />
      </Card>

      <Card title="Default Privacy" accent={C.violet}>
        <SRow label="Default Profile Privacy"
              desc="Public = discoverable by all"
              control={<Sel value={cfg.defaultPrivacy} onChange={v => set('defaultPrivacy', v)}
                opts={[['public','Public'],['followers','Followers only'],['private','Private']]} />}
              impact="medium" changed="@iceven · 7 days ago" modified={mod('defaultPrivacy')} />
        <SRow label="Default Dream Visibility"
              desc="Applied to newly created dreams"
              control={<Sel value={cfg.defaultDreamVis} onChange={v => set('defaultDreamVis', v)}
                opts={[['public','Public'],['followers','Followers only'],['private','Private']]} />}
              impact="medium" modified={mod('defaultDreamVis')} />
        <SRow label="Allow Direct Messages" desc="DMs from non-followers enabled"
              control={<Toggle on={cfg.dmEnabled} onChange={() => tog('dmEnabled')} />}
              impact="low" modified={mod('dmEnabled')} />
        <SRow label="Searchable by Default" desc="Username visible in platform search"
              control={<Toggle on={true} onChange={() => {}} />}
              impact="low" />
        <SRow label="Activity Visibility"
              control={<Sel value="followers" onChange={() => {}}
                opts={[['public','Public'],['followers','Followers only'],['private','Private']]} />}
              impact="low" />
      </Card>

      <Card title="Onboarding & Welcome" accent={C.green}>
        <SRow label="Welcome Flow"       desc="5-step guide for new users"
              control={<Toggle on={cfg.welcomeFlow}   onChange={() => tog('welcomeFlow')} />}
              impact="medium" changed="@iceven · 4 days ago" modified={mod('welcomeFlow')} />
        <SRow label="Interactive Tutorial" desc="First dream walkthrough"
              control={<Toggle on={cfg.tutorial}      onChange={() => tog('tutorial')} />}
              impact="low" modified={mod('tutorial')} />
        <SRow label="Welcome Email"      desc="Sent on account creation"
              control={<Toggle on={cfg.welcomeEmail}  onChange={() => tog('welcomeEmail')} />}
              impact="medium" modified={mod('welcomeEmail')} />
        <SRow label="Archetype Quiz"     desc="Personalise AI on signup"
              control={<Toggle on={cfg.archetypeQuiz} onChange={() => tog('archetypeQuiz')} />}
              impact="medium" modified={mod('archetypeQuiz')} />
        <SRow label="Skip Allowed"       desc="User can skip after step 2"
              control={<Toggle on={true} onChange={() => {}} />}
              impact="low" />
        <SRow label="Completion Rate"    control={<span style={{ color: C.green }} className="text-[10px] font-mono font-bold">68.4%</span>}
              impact="low" changed="Updated 1h ago" />
        <SRow label="Avg Time to Dream"  control={<span className="text-[10px] font-mono text-dc-muted">18 min</span>}
              impact="low" />
      </Card>
    </div>
  );
}

// ── Section: Dream Engine ─────────────────────────────────────────────────────
function DreamEngineSection({ cfg, set, tog, mod }: Ctrls) {
  return (
    <div className="grid grid-cols-2 gap-3.5">
      <div className="space-y-3.5">
        <Card title="Creation Rules" accent={C.pink}>
          <SRow label="Max Dream Length"  desc="Characters including whitespace"
                control={<NumIn value={cfg.maxDreamLen} onChange={v => set('maxDreamLen', v)} unit="chars" w="w-16" />}
                impact="medium" changed="@iceven · 4 days ago" modified={mod('maxDreamLen')} />
          <SRow label="Min Dream Length"  desc="Below this: validation error"
                control={<NumIn value={cfg.minDreamLen} onChange={v => set('minDreamLen', v)} unit="chars" w="w-14" />}
                impact="low" modified={mod('minDreamLen')} />
          <SRow label="Max Title Length"
                control={<NumIn value={cfg.maxTitle} onChange={v => set('maxTitle', v)} unit="chars" w="w-14" />}
                impact="low" modified={mod('maxTitle')} />
          <SRow label="Max Tags / Dream"
                control={<NumIn value={cfg.maxTags} onChange={v => set('maxTags', v)} unit="tags" w="w-12" />}
                impact="low" modified={mod('maxTags')} />
          <SRow label="Max Drafts / User"
                control={<NumIn value={cfg.maxDrafts} onChange={v => set('maxDrafts', v)} w="w-12" />}
                impact="low" modified={mod('maxDrafts')} />
          <SRow label="Auto-save Interval"
                control={<NumIn value={cfg.autoSaveInterval} onChange={v => set('autoSaveInterval', v)} unit="sec" w="w-12" />}
                impact="low" modified={mod('autoSaveInterval')} />
          <SRow label="Drafts"           desc="Enable draft save before publish"
                control={<Toggle on={cfg.drafts}          onChange={() => tog('drafts')} />}
                impact="low" modified={mod('drafts')} />
          <SRow label="Scheduled Dreams" desc="Publish at a future datetime"
                control={<Toggle on={cfg.scheduledDreams} onChange={() => tog('scheduledDreams')} />}
                impact="medium" modified={mod('scheduledDreams')} />
          <SRow label="Anonymous Dreams" desc="24h TTL, no user attribution"
                control={<Toggle on={cfg.anonymousDreams} onChange={() => tog('anonymousDreams')} />}
                impact="medium" modified={mod('anonymousDreams')} />
          <SRow label="Voice Dreams"     desc="Audio recording — max 5 min"
                control={<Toggle on={cfg.voiceDreams}     onChange={() => tog('voiceDreams')} />}
                impact="medium" modified={mod('voiceDreams')} />
        </Card>
      </div>

      <div className="space-y-3.5">
        <Card title="AI Analysis Engine" accent={C.violet}>
          <SRow label="AI Analysis"      desc="Auto-analyze on publish"
                control={<Toggle on={cfg.aiAnalysis}     onChange={() => tog('aiAnalysis')} />}
                st="ok" stLabel="RUNNING" impact="high" changed="@iceven · 7 days ago" modified={mod('aiAnalysis')} />
          <SRow label="Auto-tagging"     desc="AI suggests symbol tags"
                control={<Toggle on={cfg.autoTag}        onChange={() => tog('autoTag')} />}
                impact="medium" modified={mod('autoTag')} />
          <SRow label="Lucid Detection"  desc="Classify lucid vs normal"
                control={<Toggle on={cfg.lucidDetect}    onChange={() => tog('lucidDetect')} />}
                impact="medium" modified={mod('lucidDetect')} />
          <SRow label="Nightmare Detection" desc="Flag nightmare-category content"
                control={<Toggle on={cfg.nightmareDetect} onChange={() => tog('nightmareDetect')} />}
                impact="low" modified={mod('nightmareDetect')} />
          <SRow label="Symbol Engine"    desc="Extract Jungian symbols"
                control={<Toggle on={cfg.symbolEngine}   onChange={() => tog('symbolEngine')} />}
                impact="high" modified={mod('symbolEngine')} />
          <SRow label="Analysis Model"   desc="LLM used for dream analysis"
                control={<Sel value={cfg.analysisModel} onChange={v => set('analysisModel', v)}
                  opts={[['gpt-4o','GPT-4o'],['dc-dream-v2.1','DC Dream v2.1'],['gpt-3.5-turbo','GPT-3.5 Turbo']]} />}
                impact="high" changed="@iceven · 7 days ago" modified={mod('analysisModel')} />
          <SRow label="Confidence Min"   desc="Discard results below this"
                control={<NumIn value={cfg.confidenceMin} onChange={v => set('confidenceMin', v)} />}
                impact="medium" modified={mod('confidenceMin')} />
          <SRow label="Analysis Queue"   control={<span style={{ color: C.green }} className="text-[10px] font-mono font-bold">0 pending</span>}
                st="ok" impact="low" changed="Updated 14 min ago" />
          <SRow label="Avg Analysis Time" control={<span className="text-[10px] font-mono text-dc-muted">1.84 sec</span>}
                impact="low" />
        </Card>
      </div>
    </div>
  );
}

// ── Section: AI Config ────────────────────────────────────────────────────────
function AIConfigSection({ cfg, set, tog, mod, ask }: Ctrls) {
  return (
    <div className="grid grid-cols-2 gap-3.5">
      <div className="space-y-3.5">
        <Card title="Core AI Models" accent={C.violet}>
          <SRow label="Primary Model"     desc="Main inference model"
                control={<Sel value={cfg.primaryModel} onChange={v => ask('Primary Model', 'high', 'Affects all AI operations', cfg.primaryModel, v, () => set('primaryModel', v))}
                  opts={[['gpt-4o','GPT-4o'],['gpt-4-turbo','GPT-4 Turbo'],['claude-sonnet-4-6','Claude Sonnet 4.6']]} />}
                st="ok" stLabel="ACTIVE" impact="critical" changed="@iceven · 4 days ago" modified={mod('primaryModel')} confirm />
          <SRow label="Dream Model"       desc="Specialized dream analysis"
                control={<Sel value={cfg.dreamModel} onChange={v => ask('Dream Model', 'high', 'Retraining required after change', cfg.dreamModel, v, () => set('dreamModel', v))}
                  opts={[['dc-dream-v2.1','DC Dream v2.1'],['dc-dream-v2.0','DC Dream v2.0']]} />}
                st="ok" impact="high" modified={mod('dreamModel')} confirm />
          <SRow label="Archetype Model"
                control={<Sel value={cfg.archetypeModel} onChange={v => set('archetypeModel', v)}
                  opts={[['dc-archetype-v3','DC Archetype v3'],['dc-archetype-v2','DC Archetype v2']]} />}
                st="ok" impact="high" modified={mod('archetypeModel')} />
          <SRow label="Fallback Model"    desc="Used when primary is unavailable"
                control={<Sel value={cfg.fallbackModel} onChange={v => set('fallbackModel', v)}
                  opts={[['gpt-3.5-turbo','GPT-3.5 Turbo'],['gpt-4o-mini','GPT-4o Mini']]} />}
                impact="medium" modified={mod('fallbackModel')} />
          <SRow label="Max Tokens"        desc="Per inference request"
                control={<NumIn value={cfg.maxTokens} onChange={v => set('maxTokens', v)} unit="tok" />}
                impact="medium" modified={mod('maxTokens')} />
          <SRow label="Cost Today"        control={<span style={{ color: C.gold }} className="text-[10px] font-mono font-bold">$2.84</span>}
                impact="low" changed="Updated 1h ago" />
          <SRow label="Used Today"        control={<span className="text-[10px] font-mono text-dc-muted">2,341 / 10,000 req</span>}
                st="ok" impact="low" />
          <SRow label="Avg Latency"       control={<span className="text-[10px] font-mono text-dc-muted">1,840 ms</span>}
                impact="low" />
        </Card>

        <Card title="Dream Pulse & Resonance" accent={C.cyan}>
          <SRow label="Dream Pulse"       desc="Hourly collective analysis run"
                control={<Toggle on={cfg.dreamPulse} onChange={() => tog('dreamPulse')} />}
                st="ok" stLabel="RUNNING" impact="medium" modified={mod('dreamPulse')} />
          <SRow label="Pulse Frequency"   desc="Minutes between pulse runs"
                control={<NumIn value={cfg.pulseFreq} onChange={v => set('pulseFreq', v)} unit="min" />}
                impact="low" modified={mod('pulseFreq')} />
          <SRow label="Resonance Engine"  desc="User–dream semantic matching"
                control={<Toggle on={cfg.resonance} onChange={() => tog('resonance')} />}
                impact="high" modified={mod('resonance')} />
          <SRow label="Resonance Radius"  desc="Nearest-user match window"
                control={<NumIn value={cfg.resonanceRadius} onChange={v => set('resonanceRadius', v)} unit="users" />}
                impact="medium" modified={mod('resonanceRadius')} />
          <SRow label="Last Pulse"        control={<span className="text-[10px] font-mono text-dc-muted">14 min ago</span>}
                st="ok" impact="low" />
          <SRow label="Active Pairs"      control={<span style={{ color: C.purple }} className="text-[10px] font-mono font-bold">1,204</span>}
                impact="low" />
        </Card>
      </div>

      <div className="space-y-3.5">
        <Card title="Identity & Emotion Engines" accent={C.purple}>
          <SRow label="Archetype Engine"  desc="Jungian archetype classification"
                control={<Toggle on={cfg.archetypeEngine} onChange={() => tog('archetypeEngine')} />}
                st="ok" impact="high" modified={mod('archetypeEngine')} />
          <SRow label="Emotion Engine"    desc="Multi-label emotion detection"
                control={<Toggle on={cfg.emotionEngine}   onChange={() => tog('emotionEngine')} />}
                st="ok" impact="high" modified={mod('emotionEngine')} />
          <SRow label="Dream Genome Engine" desc="Deep symbolic fingerprinting (GPU-heavy)"
                control={<Toggle on={cfg.genomeEngine}    onChange={() => ask('Genome Engine', 'high', 'High GPU cost — confirm before enabling', cfg.genomeEngine?'ON':'OFF', !cfg.genomeEngine?'ON':'OFF', () => tog('genomeEngine'))} />}
                st="off" stLabel="DISABLED" impact="high" changed="@iceven · 7 days ago" modified={mod('genomeEngine')} confirm />
          <SRow label="Archetypes Active" control={<span className="text-[10px] text-dc-muted">12 Jungian + 4 custom</span>}
                impact="low" />
          <SRow label="Emotion Categories" control={<span className="text-[10px] text-dc-muted">28 primary · 84 nuanced</span>}
                impact="low" />
          <SRow label="Symbol Dictionary" control={<span style={{ color: C.cyan }} className="text-[10px] font-mono font-bold">3,847 entries</span>}
                st="ok" impact="low" changed="Updated 2026-06-01" />
          <SRow label="Last Trained"      control={<span className="text-[10px] font-mono text-dc-muted">2026-06-01</span>}
                impact="low" />
        </Card>

        <Card title="AI Moderation" accent={C.red}>
          <SRow label="AI Auto-Moderation" desc="Flag content before publishing"
                control={<Toggle on={cfg.aiMod} onChange={() => ask('AI Moderation', 'critical', 'All new dreams will be auto-screened', cfg.aiMod?'ON':'OFF', !cfg.aiMod?'ON':'OFF', () => tog('aiMod'))} />}
                st="off" stLabel="DISABLED" impact="critical" changed="@iceven · 4 days ago" modified={mod('aiMod')} confirm />
          <SRow label="NSFW Threshold"    desc="Flag when confidence above"
                control={<NumIn value={cfg.aiModThreshold} onChange={v => set('aiModThreshold', v)} />}
                impact="high" modified={mod('aiModThreshold')} />
          <SRow label="Violence Threshold" control={<NumIn value={cfg.violenceThreshold} onChange={v => set('violenceThreshold', v)} />}
                impact="high" modified={mod('violenceThreshold')} />
          <SRow label="Flagged Today"     control={<span style={{ color: C.gold }} className="text-[10px] font-mono font-bold">3 dreams</span>}
                impact="low" changed="Updated 2h ago" />
          <SRow label="False Positive Rate" control={<span className="text-[10px] font-mono text-dc-muted">{'< 2.1%'}</span>}
                impact="low" />
          <SRow label="Retrain Cycle"     control={<span className="text-[10px] text-dc-muted">Monthly (next: 2026-07-01)</span>}
                impact="low" />
        </Card>
      </div>
    </div>
  );
}

// ── Section: Moderation ───────────────────────────────────────────────────────
function ModerationSection({ cfg, set, tog, mod, ask }: Ctrls) {
  return (
    <div className="grid grid-cols-3 gap-3.5">
      <Card title="Auto-Action Thresholds" accent={C.red}>
        <SRow label="Auto-Hide"          desc="Remove from feed on threshold"
              control={<Toggle on={cfg.autoHide}   onChange={() => tog('autoHide')} />}
              impact="high" changed="@iceven · 7 days ago" modified={mod('autoHide')} />
        <SRow label="Auto-Hide After"    desc="Unique reports required"
              control={<NumIn value={cfg.autoHideAfter} onChange={v => ask('Auto-Hide Threshold', 'high', 'Changes when content is hidden', cfg.autoHideAfter, v, () => set('autoHideAfter', v))} unit="reports" w="w-12" />}
              impact="high" modified={mod('autoHideAfter')} confirm />
        <SRow label="Temp Ban After"     desc="Resolved reports total"
              control={<NumIn value={cfg.tempBanAfter}  onChange={v => ask('Temp Ban Threshold', 'critical', 'Affects when users are temp-banned', cfg.tempBanAfter, v, () => set('tempBanAfter', v))} unit="reports" w="w-12" />}
              impact="critical" modified={mod('tempBanAfter')} confirm />
        <SRow label="Perm Ban After"     desc="Temp bans before permanent"
              control={<NumIn value={cfg.permBanAfter}  onChange={v => ask('Perm Ban Threshold', 'critical', 'Irreversible — affects user accounts permanently', cfg.permBanAfter, v, () => set('permBanAfter', v))} unit="bans" w="w-12" />}
              impact="critical" modified={mod('permBanAfter')} confirm />
        <SRow label="Temp Ban Duration"
              control={<NumIn value={cfg.tempBanDuration} onChange={v => set('tempBanDuration', v)} unit="days" w="w-12" />}
              impact="medium" modified={mod('tempBanDuration')} />
        <SRow label="Review SLA"         control={<span className="text-[10px] text-dc-muted">48 hours</span>}
              impact="medium" />
        <SRow label="Active Temp Bans"   control={<span style={{ color: C.gold }} className="text-[10px] font-mono font-bold">1 user</span>}
              impact="low" changed="Updated 1h ago" />
        <SRow label="Pending Reports"    control={<span style={{ color: C.orange }} className="text-[10px] font-mono font-bold">8 pending</span>}
              st="warn" impact="low" />
      </Card>

      <Card title="Filter System" accent={C.orange}>
        <SRow label="Spam Filter"        desc="Detect duplicate / low-effort"
              control={<Toggle on={cfg.spamFilter} onChange={() => tog('spamFilter')} />}
              impact="high" modified={mod('spamFilter')} />
        <SRow label="NSFW Detection"     desc="Text + image analysis"
              control={<Toggle on={cfg.nsfw}       onChange={() => ask('NSFW Detection', 'high', 'Enables AI content screening', cfg.nsfw?'ON':'OFF', !cfg.nsfw?'ON':'OFF', () => tog('nsfw'))} />}
              impact="high" modified={mod('nsfw')} confirm />
        <SRow label="Shadow Ban"         desc="Invisible to non-followers"
              control={<Toggle on={cfg.shadowBan}  onChange={() => ask('Shadow Ban', 'high', 'Silently hides user from discover', cfg.shadowBan?'ON':'OFF', !cfg.shadowBan?'ON':'OFF', () => tog('shadowBan'))} />}
              impact="high" modified={mod('shadowBan')} confirm />
        <SRow label="Device Ban"         desc="Block device fingerprint"
              control={<Toggle on={cfg.deviceBan}  onChange={() => ask('Device Ban', 'high', 'Affects all accounts on device', cfg.deviceBan?'ON':'OFF', !cfg.deviceBan?'ON':'OFF', () => tog('deviceBan'))} />}
              impact="high" modified={mod('deviceBan')} confirm />
        <SRow label="IP Ban"             desc="Block by IP address"
              control={<Toggle on={cfg.ipBan}      onChange={() => tog('ipBan')} />}
              impact="high" modified={mod('ipBan')} />
        <SRow label="Keyword Filter"     control={<span className="text-[10px] text-dc-muted">Active — 142 terms</span>}
              st="ok" impact="medium" />
        <SRow label="IP Ban List"        control={<span style={{ color: C.red }} className="text-[10px] font-mono font-bold">7 IPs</span>}
              impact="low" />
        <SRow label="False Positive Rate" control={<span className="text-[10px] font-mono text-dc-muted">{'< 2.1%'}</span>}
              impact="low" />
      </Card>

      <Card title="Appeal System" accent={C.gold}>
        <SRow label="Appeal System"      desc="Users can contest moderation decisions"
              control={<Toggle on={cfg.appeals} onChange={() => tog('appeals')} />}
              impact="medium" changed="@iceven · 7 days ago" modified={mod('appeals')} />
        <SRow label="Appeal SLA"         desc="Max hours to resolve an appeal"
              control={<NumIn value={cfg.appealSLA} onChange={v => set('appealSLA', v)} unit="hrs" w="w-12" />}
              impact="medium" modified={mod('appealSLA')} />
        <SRow label="Max Appeals / User" control={<span className="text-[10px] text-dc-muted">3 per 90 days</span>}
              impact="low" />
        <SRow label="Auto-Approve After" control={<span className="text-[10px] text-dc-muted">7 days no action</span>}
              impact="low" />
        <SRow label="Mod Assignment"     control={<span className="text-[10px] text-dc-muted">Round-robin</span>}
              impact="low" />
        <SRow label="Escalation Path"    control={<span className="text-[9.5px] text-dc-muted">Mod → Senior → Admin</span>}
              impact="medium" />
        <SRow label="Open Appeals"       control={<span style={{ color: C.green }} className="text-[10px] font-mono font-bold">0 pending</span>}
              st="ok" impact="low" changed="Updated 1h ago" />
        <SRow label="Overturn Rate"      control={<span className="text-[10px] font-mono text-dc-muted">12.4%</span>}
              impact="low" />
      </Card>
    </div>
  );
}

// ── Section: Notifications ────────────────────────────────────────────────────
function NotificationsSection({ cfg, tog, mod }: Ctrls) {
  const [testSent, setTestSent] = useState(false);
  return (
    <div className="grid grid-cols-3 gap-3.5">
      <Card title="Channel Configuration" accent={C.gold}>
        <SRow label="Push Notifications" desc="Firebase FCM — 74.2% opt-in"
              control={<Toggle on={cfg.pushEnabled}  onChange={() => tog('pushEnabled')} />}
              st="ok" stLabel="ACTIVE" impact="high" changed="@iceven · 4 days ago" modified={mod('pushEnabled')} />
        <SRow label="Email Notifications" desc="SMTP — not yet verified"
              control={<Toggle on={cfg.emailEnabled} onChange={() => tog('emailEnabled')} />}
              st="warn" stLabel="UNVERIFIED" impact="high" modified={mod('emailEnabled')} />
        <SRow label="SMS Notifications"   desc="Twilio — credentials missing"
              control={<Toggle on={cfg.smsEnabled}   onChange={() => tog('smsEnabled')} />}
              st="off" impact="medium" modified={mod('smsEnabled')} />
        <SRow label="Push Provider"       control={<span className="text-[9.5px] font-mono text-dc-muted">Firebase FCM v9</span>}
              st="ok" impact="low" />
        <SRow label="Email From"          control={<span className="text-[9.5px] font-mono text-dc-muted">noreply@dreamcloud.dev</span>}
              impact="low" />
        <SRow label="SMS Provider"        control={<span className="text-[9.5px] font-mono text-dc-muted">Twilio (not set)</span>}
              st="off" impact="low" />
        <SRow label="Sent Last 24h"       control={<span style={{ color: C.green }} className="text-[10px] font-mono font-bold">1,284</span>}
              impact="low" changed="Updated 1h ago" />
        <SRow label="Bounce Rate"         control={<span style={{ color: C.gold }} className="text-[10px] font-mono font-bold">0.0%</span>}
              impact="low" />
        <div className="mt-2 pt-2 border-t border-dc-border">
          <button onClick={() => setTestSent(true)}
            style={{ color: C.cyan, borderColor: `${C.cyan}35` }}
            className="w-full text-[10px] font-semibold border rounded py-1.5 hover:opacity-80 transition-opacity">
            {testSent ? '✓ Test notification sent' : '⚡ Send Test Notification'}
          </button>
        </div>
      </Card>

      <Card title="Digest & Alerts" accent={C.purple}>
        <SRow label="Weekly Digest"       desc="Dream highlights every Sunday"
              control={<Toggle on={cfg.weeklyDigest} onChange={() => tog('weeklyDigest')} />}
              impact="medium" modified={mod('weeklyDigest')} />
        <SRow label="Moderator Alerts"    desc="New reports → admin email"
              control={<Toggle on={cfg.modAlerts}    onChange={() => tog('modAlerts')} />}
              impact="high" modified={mod('modAlerts')} />
        <SRow label="System Alerts"       desc="Infra events above Warning"
              control={<Toggle on={cfg.sysAlerts}    onChange={() => tog('sysAlerts')} />}
              impact="critical" modified={mod('sysAlerts')} />
        <SRow label="Digest Day"          control={<span className="text-[10px] text-dc-muted">Sunday 08:00 UTC</span>}
              impact="low" />
        <SRow label="Alert Channels"      control={<span className="text-[9.5px] text-dc-muted">Email (+ Slack Phase 3)</span>}
              impact="low" />
        <SRow label="Min Alert Severity"  control={<span className="text-[10px] text-dc-muted">Warning and above</span>}
              impact="medium" />
        <SRow label="Last Digest"         control={<span className="text-[10px] font-mono text-dc-muted">2026-06-22</span>}
              impact="low" />
        <SRow label="Delivery Latency"    control={<span className="text-[10px] font-mono text-dc-muted">{'< 500 ms'}</span>}
              impact="low" />
      </Card>

      <Card title="Notification Templates" accent={C.cyan}>
        <SRow label="Dream Liked"         desc="Notify when dream is liked"
              control={<Toggle on={cfg.notifLike}    onChange={() => tog('notifLike')} />}
              impact="low" modified={mod('notifLike')} />
        <SRow label="New Follower"        desc="Notify on new follower"
              control={<Toggle on={cfg.notifFollow}  onChange={() => tog('notifFollow')} />}
              impact="low" modified={mod('notifFollow')} />
        <SRow label="New Comment"         desc="Notify on dream comment"
              control={<Toggle on={cfg.notifComment} onChange={() => tog('notifComment')} />}
              impact="low" modified={mod('notifComment')} />
        <SRow label="Welcome Email"       control={<Toggle on={true} onChange={() => {}} />}
              st="ok" impact="low" />
        <SRow label="Dream Featured"      control={<Toggle on={true} onChange={() => {}} />}
              st="ok" impact="low" />
        <SRow label="Resonance Match"     control={<Toggle on={true} onChange={() => {}} />}
              st="ok" impact="low" />
        <SRow label="Weekly Report"       control={<Toggle on={false} onChange={() => {}} />}
              st="off" impact="low" />
        <SRow label="Failed (24h)"        control={<span style={{ color: C.green }} className="text-[10px] font-mono font-bold">0 failed</span>}
              st="ok" impact="low" />
      </Card>
    </div>
  );
}

// ── Section: Infrastructure ───────────────────────────────────────────────────
function InfraSection() {
  const [restarted, setRestarted] = useState<string | null>(null);
  const svcs: { name: string; st: St; restart?: boolean; metrics: { k: string; v: string }[] }[] = [
    { name: 'API Server',     st: 'ok',   restart: true,  metrics: [{ k:'Uptime', v:'99.7%' }, { k:'Req/min', v:'342' }, { k:'P99', v:'187ms' }, { k:'Errors', v:'0.3%' }] },
    { name: 'PostgreSQL',     st: 'ok',   metrics: [{ k:'Connections', v:'12/100' }, { k:'Avg Query', v:'4.2ms' }, { k:'Size', v:'8.4 GB' }, { k:'Slow Queries', v:'0/hr' }] },
    { name: 'Redis',          st: 'ok',   metrics: [{ k:'Memory', v:'245 MB' }, { k:'Hit Rate', v:'94.1%' }, { k:'Keys', v:'48,231' }, { k:'Evictions', v:'0/hr' }] },
    { name: 'Job Queue',      st: 'ok',   metrics: [{ k:'Pending', v:'3' }, { k:'Processing', v:'2' }, { k:'Failed', v:'0' }, { k:'Throughput', v:'124/hr' }] },
    { name: 'Workers',        st: 'idle', restart: true,  metrics: [{ k:'Total', v:'4' }, { k:'Active', v:'2' }, { k:'Idle', v:'2' }, { k:'CPU', v:'12%' }] },
    { name: 'Search Index',   st: 'ok',   metrics: [{ k:'Documents', v:'5,318' }, { k:'Query', v:'12ms' }, { k:'Size', v:'142 MB' }, { k:'Last Rebuild', v:'1d' }] },
    { name: 'File Storage',   st: 'warn', metrics: [{ k:'Used', v:'2.1 GB' }, { k:'Total', v:'50 GB' }, { k:'CDN Miss', v:'8.4%' }, { k:'Uploads/hr', v:'12' }] },
    { name: 'Cache Layer',    st: 'ok',   metrics: [{ k:'Hit Rate', v:'89.2%' }, { k:'Size', v:'156 MB' }, { k:'TTL', v:'300s' }, { k:'Evictions', v:'0/hr' }] },
    { name: 'Cron Scheduler', st: 'ok',   metrics: [{ k:'Active Jobs', v:'6' }, { k:'Last Run', v:'14 min' }, { k:'Next', v:'46 min' }, { k:'Failed', v:'0/day' }] },
    { name: 'Push Service',   st: 'ok',   metrics: [{ k:'Provider', v:'FCM v9' }, { k:'Sent/hr', v:'84' }, { k:'Fail Rate', v:'0.1%' }, { k:'Latency', v:'320ms' }] },
    { name: 'Email Service',  st: 'warn', metrics: [{ k:'Provider', v:'SMTP' }, { k:'Verified', v:'No' }, { k:'Queue', v:'0' }, { k:'Bounce', v:'0.0%' }] },
    { name: 'CDN',            st: 'warn', metrics: [{ k:'Provider', v:'Cloudflare' }, { k:'Hit Rate', v:'91.6%' }, { k:'Miss', v:'8.4%' }, { k:'Latency', v:'24ms' }] },
  ];
  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-4 gap-3">
        {svcs.map(s => (
          <SvcCard key={s.name} name={s.name} st={s.st} metrics={s.metrics}
            onRestart={s.restart ? () => setRestarted(s.name) : undefined} />
        ))}
      </div>
      {restarted && (
        <div style={{ color: C.gold, borderColor: `${C.gold}30`, background: `${C.gold}08` }}
          className="rounded-lg border px-4 py-2 text-[10.5px] flex items-center justify-between">
          <span>⚡ Restart signal sent to <strong>{restarted}</strong> — monitoring recovery...</span>
          <button onClick={() => setRestarted(null)} className="opacity-50 hover:opacity-100">✕</button>
        </div>
      )}
      <Card title="System Overview" accent={C.green}>
        <div className="grid grid-cols-8 gap-2">
          {[
            ['Platform Uptime', '12d 4h',    C.green ],
            ['Total Req (24h)', '492,840',   C.cyan  ],
            ['Avg Response',    '87 ms',     C.purple],
            ['Error Rate',      '0.31%',     C.gold  ],
            ['Active Users',    '284 now',   C.green ],
            ['Dreams Today',    '46 pub',    C.violet],
            ['AI Jobs Today',   '2,341',     C.purple],
            ['Storage Free',    '95.8%',     C.cyan  ],
          ].map(([label, value, color]) => (
            <div key={label as string} style={{ borderColor: `${color}25`, background: `${color}08` }}
              className="flex flex-col items-center py-2 rounded border">
              <span style={{ color: color as string }} className="text-[11px] font-bold font-mono">{value}</span>
              <span className="text-[8.5px] text-dc-muted mt-0.5 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Section: Security ─────────────────────────────────────────────────────────
function SecuritySection({ cfg, set, tog, mod, ask }: Ctrls) {
  return (
    <div className="grid grid-cols-3 gap-3.5">
      <Card title="Session & JWT" accent={C.cyan}>
        <SRow label="Max Concurrent Sessions" desc="Per user account"
              control={<NumIn value={cfg.maxSessions} onChange={v => ask('Max Sessions', 'high', 'Existing sessions above limit will be revoked', cfg.maxSessions, v, () => set('maxSessions', v))} unit="sessions" w="w-10" />}
              impact="high" changed="@iceven · 7 days ago" modified={mod('maxSessions')} confirm />
        <SRow label="Session Timeout"        desc="Idle duration before expiry"
              control={<NumIn value={cfg.sessionTimeout} onChange={v => set('sessionTimeout', v)} unit="hrs" w="w-12" />}
              impact="high" modified={mod('sessionTimeout')} />
        <SRow label="JWT Access Expiry"
              control={<NumIn value={cfg.jwtExpiry} onChange={v => ask('JWT Expiry', 'critical', 'Forces all users to re-authenticate', cfg.jwtExpiry, v, () => set('jwtExpiry', v))} unit="hrs" w="w-12" />}
              impact="critical" modified={mod('jwtExpiry')} confirm />
        <SRow label="Refresh Token Rotation" desc="Invalidate on use"
              control={<Toggle on={cfg.jwtRefresh} onChange={() => ask('JWT Refresh Rotation', 'high', 'Security policy change', cfg.jwtRefresh?'ON':'OFF', !cfg.jwtRefresh?'ON':'OFF', () => tog('jwtRefresh'))} />}
              impact="high" modified={mod('jwtRefresh')} confirm />
        <SRow label="Device Binding"         desc="Tie session to device fingerprint"
              control={<Toggle on={cfg.deviceBinding} onChange={() => ask('Device Binding', 'high', 'Existing sessions may be invalidated', cfg.deviceBinding?'ON':'OFF', !cfg.deviceBinding?'ON':'OFF', () => tog('deviceBinding'))} />}
              impact="high" modified={mod('deviceBinding')} confirm />
        <SRow label="Active Sessions"        control={<span style={{ color: C.green }} className="text-[10px] font-mono font-bold">284 users</span>}
              impact="low" changed="Updated 5 min ago" />
        <SRow label="Revoked Today"          control={<span className="text-[10px] font-mono text-dc-muted">3 sessions</span>}
              impact="low" />
        <SRow label="Suspicious Logins (24h)" control={<span style={{ color: C.gold }} className="text-[10px] font-mono font-bold">1 flagged</span>}
              st="warn" impact="medium" />
      </Card>

      <Card title="Password & 2FA" accent={C.purple}>
        <SRow label="Min Password Length"
              control={<NumIn value={cfg.pwMinLength} onChange={v => set('pwMinLength', v)} unit="chars" w="w-12" />}
              impact="high" changed="@iceven · 4 days ago" modified={mod('pwMinLength')} />
        <SRow label="Complexity Rules"      desc="Uppercase + number required"
              control={<Toggle on={true} onChange={() => {}} />}
              impact="high" />
        <SRow label="Password Expiry"       desc="Force rotation (disabled in dev)"
              control={<Toggle on={false} onChange={() => {}} />}
              impact="medium" />
        <SRow label="Bcrypt Rounds"         control={<span className="text-[10px] font-mono text-dc-muted">10 rounds</span>}
              impact="low" />
        <SRow label="Login Rate Limit"      desc="Attempts before lockout"
              control={<NumIn value={cfg.loginRateLimit} onChange={v => set('loginRateLimit', v)} unit="attempts" w="w-10" />}
              impact="high" modified={mod('loginRateLimit')} />
        <SRow label="Lockout Duration"
              control={<NumIn value={cfg.lockoutDuration} onChange={v => set('lockoutDuration', v)} unit="min" w="w-12" />}
              impact="high" modified={mod('lockoutDuration')} />
        <SRow label="Two-Factor Auth"       desc="TOTP (Google Authenticator)"
              control={<Toggle on={cfg.twoFA} onChange={() => ask('2FA', 'high', 'Users will be prompted on next login', cfg.twoFA?'ON':'OFF', !cfg.twoFA?'ON':'OFF', () => tog('twoFA'))} />}
              st="off" stLabel="DISABLED" impact="critical" changed="@iceven · 4 days ago" modified={mod('twoFA')} confirm />
        <SRow label="2FA Enrolled"          control={<span className="text-[10px] font-mono text-dc-muted">0 / 569 users</span>}
              impact="low" />
      </Card>

      <Card title="OAuth & API Keys" accent={C.gold}>
        <SRow label="Google OAuth"           desc="google.com provider"
              control={<Toggle on={cfg.oauthGoogle}    onChange={() => tog('oauthGoogle')} />}
              st="ok" stLabel="ACTIVE" impact="medium" modified={mod('oauthGoogle')} />
        <SRow label="Apple Sign-In"          desc="Not configured"
              control={<Toggle on={cfg.oauthApple}     onChange={() => tog('oauthApple')} />}
              st="off" impact="medium" modified={mod('oauthApple')} />
        <SRow label="Twitter OAuth"          desc="Not configured"
              control={<Toggle on={cfg.oauthTwitter}   onChange={() => tog('oauthTwitter')} />}
              st="off" impact="medium" modified={mod('oauthTwitter')} />
        <SRow label="API Key Whitelist"      desc="Restrict to known keys"
              control={<Toggle on={cfg.apiWhitelist}   onChange={() => tog('apiWhitelist')} />}
              impact="high" modified={mod('apiWhitelist')} />
        <SRow label="Admin IP Whitelist"     desc="Restrict admin panel by IP"
              control={<Toggle on={cfg.adminWhitelist} onChange={() => ask('Admin IP Whitelist', 'critical', 'You may lock yourself out if IP is wrong', cfg.adminWhitelist?'ON':'OFF', !cfg.adminWhitelist?'ON':'OFF', () => tog('adminWhitelist'))} />}
              impact="critical" modified={mod('adminWhitelist')} confirm />
        <SRow label="Active API Keys"        control={<span className="text-[10px] font-mono text-dc-muted">0 keys</span>}
              impact="low" />
        <SRow label="Rate Limit / Key"       control={<span className="text-[10px] font-mono text-dc-muted">1,000 req/hr</span>}
              impact="low" />
        <SRow label="Security Audit"         control={<span className="text-[10px] text-dc-muted">Not scheduled</span>}
              st="warn" impact="high" />
      </Card>
    </div>
  );
}

// ── Danger Zone ────────────────────────────────────────────────────────────────
const DANGER_ACTIONS = [
  { id: 'cache',    label: 'Clear Cache',          desc: 'Flush all Redis layers',        note: 'Last: 3 days ago',  risk: 'medium'   as Impact, color: C.gold   },
  { id: 'index',   label: 'Rebuild Search Index',  desc: 'Reindex 5,318 entries',         note: 'Last: 1 day ago',   risk: 'medium'   as Impact, color: C.cyan   },
  { id: 'maint',   label: 'Enable Maintenance',    desc: 'Platform goes offline',         note: 'Status: Inactive',  risk: 'critical' as Impact, color: C.red    },
  { id: 'backup',  label: 'Create Backup',         desc: 'Snapshot database now',         note: 'Last: 6 hours ago', risk: 'low'      as Impact, color: C.purple },
  { id: 'purge',   label: 'Purge Deleted Content', desc: 'Delete soft-deleted records',   note: 'Last: 7 days ago',  risk: 'critical' as Impact, color: C.red    },
  { id: 'restart', label: 'Restart Services',      desc: 'Restart API + workers',         note: 'Last: 4 days ago',  risk: 'high'     as Impact, color: C.orange },
  { id: 'demo',    label: 'Reset Demo Data',       desc: 'Revert to seed state',          note: 'Last: never',       risk: 'critical' as Impact, color: C.red    },
  { id: 'rollback',label: 'Rollback Last Config',  desc: 'Revert config to last save',    note: 'Last save: today',  risk: 'high'     as Impact, color: C.gold   },
];

function DangerZone({ onLogout }: { onLogout: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [armed,    setArmed]    = useState<string | null>(null);

  return (
    <div style={{ borderColor: `${C.red}28` }} className="rounded-lg border mt-4 overflow-hidden">
      {/* Collapsed strip */}
      <button onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          <span style={{ color: C.red }} className="text-[10px] font-bold uppercase tracking-widest">⚠ Danger Zone</span>
          <span className="text-[9.5px] text-dc-muted">— Irreversible administrative actions</span>
        </div>
        <span style={{ color: C.red }} className="text-[9px] font-mono">{expanded ? '▲ collapse' : '▼ expand'}</span>
      </button>

      {expanded && (
        <div style={{ borderTopColor: `${C.red}28`, background: `${C.red}04` }}
          className="border-t px-4 pb-4 pt-3">
          <div className="grid grid-cols-4 gap-2.5 mb-3">
            {DANGER_ACTIONS.map(a => (
              <div key={a.id} style={{ borderColor: `${a.color}28`, background: `${a.color}07` }}
                className="rounded-lg border p-2.5">
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span style={{ color: a.color }} className="text-[10px] font-semibold">{a.label}</span>
                    <ImpBadge level={a.risk} />
                  </div>
                  <div className="text-[9px] text-dc-muted">{a.desc}</div>
                  <div className="text-[8px] text-dc-muted/50 font-mono mt-0.5">{a.note}</div>
                </div>
                <button onClick={() => setArmed(prev => prev === a.id ? null : a.id)}
                  style={armed === a.id
                    ? { background: a.color, color: '#000' }
                    : { borderColor: `${a.color}40`, color: a.color }
                  }
                  className="w-full text-[9px] font-bold py-[5px] rounded border transition-all">
                  {armed === a.id ? '⚡ EXECUTE — Click to confirm' : 'ARM'}
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t" style={{ borderColor: `${C.red}22` }}>
            {armed ? (
              <span style={{ color: C.gold }} className="text-[9.5px] font-mono">
                ⚠ Armed: {DANGER_ACTIONS.find(a => a.id === armed)?.label} · Click button again to execute · Any other click dearms
              </span>
            ) : (
              <span className="text-[9.5px] text-dc-muted">Click ARM on any action to arm it. Double-click to execute.</span>
            )}
            <button onClick={onLogout}
              style={{ borderColor: `${C.red}35`, color: C.red }}
              className="px-4 py-1.5 rounded text-[10px] font-semibold border hover:bg-red-500/10 transition-colors ml-4 flex-shrink-0">
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'platform',     label: 'Platform',       glyph: '⚙'  },
  { id: 'users',        label: 'User Defaults',  glyph: '👤' },
  { id: 'engine',       label: 'Dream Engine',   glyph: '🌀' },
  { id: 'ai',           label: 'AI Config',      glyph: '◈'  },
  { id: 'moderation',   label: 'Moderation',     glyph: '🛡' },
  { id: 'notifications',label: 'Notifications',  glyph: '◎'  },
  { id: 'infra',        label: 'Infrastructure', glyph: '⬡'  },
  { id: 'security',     label: 'Security',       glyph: '🔐' },
];

const TAB_KEYS: Partial<Record<string, (keyof Cfg)[]>> = {
  platform:      ['platformName','platformDesc','timezone','defaultLang'],
  users:         ['regOpen','emailVerif','phoneVerif','inviteOnly','ageGate','defaultPrivacy','defaultDreamVis','dmEnabled','welcomeFlow','tutorial','welcomeEmail','archetypeQuiz','maxPerIP'],
  engine:        ['maxDreamLen','minDreamLen','maxTitle','maxTags','maxDrafts','autoSaveInterval','aiAnalysis','autoTag','lucidDetect','nightmareDetect','symbolEngine','anonymousDreams','drafts','scheduledDreams','voiceDreams','analysisModel','confidenceMin'],
  ai:            ['primaryModel','dreamModel','archetypeModel','fallbackModel','dreamPulse','pulseFreq','resonance','resonanceRadius','archetypeEngine','emotionEngine','genomeEngine','aiMod','aiModThreshold','maxTokens'],
  moderation:    ['autoHide','autoHideAfter','tempBanAfter','permBanAfter','tempBanDuration','spamFilter','nsfw','violenceThreshold','shadowBan','deviceBan','ipBan','appeals','appealSLA'],
  notifications: ['pushEnabled','emailEnabled','smsEnabled','weeklyDigest','modAlerts','sysAlerts','notifLike','notifFollow','notifComment'],
  security:      ['maxSessions','sessionTimeout','jwtExpiry','jwtRefresh','deviceBinding','twoFA','oauthGoogle','oauthApple','oauthTwitter','apiWhitelist','adminWhitelist','loginRateLimit','lockoutDuration','pwMinLength'],
};

function getTabSt(tab: string, cfg: Cfg, hasLocalMod: boolean): St {
  if (hasLocalMod) return 'idle'; // purple-ish via idle color
  switch (tab) {
    case 'notifications': return !cfg.emailEnabled ? 'warn' : 'ok';
    case 'security':      return !cfg.twoFA ? 'warn' : 'ok';
    case 'ai':            return !cfg.aiMod ? 'warn' : 'ok';
    case 'infra':         return 'warn';
    default:              return 'ok';
  }
}

// ── Main Settings component ────────────────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate();
  const auth     = getStoredAuth();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [cfg,     setCfg]     = useState<Cfg>({ ...INIT });
  const [base,    setBase]    = useState<Cfg>({ ...INIT });
  const [section, setSection] = useState('platform');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const set   = <K extends keyof Cfg>(k: K, v: Cfg[K]) => setCfg(p => ({ ...p, [k]: v }));
  const tog   = (k: keyof Cfg)                          => setCfg(p => ({ ...p, [k]: !(p[k] as boolean) }));
  const mod   = (k: keyof Cfg): boolean                 => cfg[k] !== base[k];
  const ask   = (label: string, impact: Impact, desc: string, oldV: string, newV: string, fn: () => void) =>
    setPending({ label, impact, desc, oldV, newV, onConfirm: fn });

  const ctrl: Ctrls = { cfg, set, tog, mod, ask };

  const changedKeys = (Object.keys(cfg) as (keyof Cfg)[]).filter(k => cfg[k] !== base[k]);
  const totalChanges = changedKeys.length;

  const tabHasMod = (tab: string) => {
    const keys = TAB_KEYS[tab] ?? [];
    return keys.some(k => cfg[k] !== base[k]);
  };

  function handleSave() {
    setBase({ ...cfg });
    setSavedAt(new Date());
  }
  function handleReset() { setCfg({ ...base }); }
  function handleExport() {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `dreamcloud-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Partial<Cfg>;
        setCfg(p => ({ ...p, ...parsed }));
      } catch { /* ignore invalid JSON */ }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const tabSt = (tab: string): St => getTabSt(tab, cfg, tabHasMod(tab));

  const fmtSaved = () => {
    if (!savedAt) return 'Never saved';
    const mins = Math.floor((Date.now() - savedAt.getTime()) / 60000);
    return mins === 0 ? 'Saved just now' : `Saved ${mins}m ago`;
  };

  const currentTabLabel = TABS.find(t => t.id === section)?.label ?? '';

  return (
    <div className="section-system relative">
      <style>{`
        @keyframes cfg-in { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:none } }
        .cfg-enter { animation: cfg-in 0.14s ease-out both; }
      `}</style>

      <Header title="Platform Configuration"
        subtitle={`${auth?.username ? `@${auth.username}` : 'Admin'} · Master Control Center`}
        section="system" />

      {/* ── Sticky tab bar ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-dc-bg/95 backdrop-blur-md border-b border-dc-border -mx-6 px-6">
        <div className="flex items-center gap-0">
          {TABS.map(tab => {
            const st = tabSt(tab.id);
            const dotColor = st === 'idle' ? C.violet : (st === 'ok' ? C.green : st === 'warn' ? C.gold : C.red);
            return (
              <button key={tab.id} onClick={() => setSection(tab.id)}
                className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-[10.5px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-all ${
                  section === tab.id
                    ? 'text-dc-primary border-dc-primary'
                    : 'text-dc-muted border-transparent hover:text-dc-text hover:border-dc-border'}`}>
                <span style={{ background: dotColor }} className="w-[5px] h-[5px] rounded-full flex-shrink-0" />
                {tab.glyph} {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sticky control bar ───────────────────────────────────────────── */}
      <div className="sticky top-[41px] z-29 bg-dc-surface/95 backdrop-blur-md border-b border-dc-border -mx-6 px-6 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10.5px] font-bold text-dc-text">{currentTabLabel}</span>
          <span style={{ background: `${C.gold}15`, borderColor: `${C.gold}35`, color: C.gold }}
            className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border">development</span>
          {totalChanges > 0 && (
            <span style={{ background: `${C.cyan}15`, borderColor: `${C.cyan}35`, color: C.cyan }}
              className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border">
              {totalChanges} unsaved change{totalChanges !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-dc-muted font-mono">{fmtSaved()}</span>
          <button onClick={handleExport}
            className="px-3 py-1 text-[9.5px] font-semibold border border-dc-border text-dc-muted rounded hover:text-dc-text transition-colors">
            ↓ Export
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="px-3 py-1 text-[9.5px] font-semibold border border-dc-border text-dc-muted rounded hover:text-dc-text transition-colors">
            ↑ Import
          </button>
          <button onClick={handleReset} disabled={totalChanges === 0}
            className={`px-3 py-1 text-[9.5px] font-semibold border rounded transition-colors ${
              totalChanges > 0
                ? 'border-dc-border text-dc-muted hover:text-dc-text'
                : 'border-dc-border/30 text-dc-muted/30 cursor-not-allowed'}`}>
            Reset
          </button>
          <button onClick={handleSave} disabled={totalChanges === 0}
            style={totalChanges > 0 ? { background: C.purple, color: '#fff' } : undefined}
            className={`px-4 py-1 text-[9.5px] font-bold rounded transition-all ${
              totalChanges > 0
                ? 'hover:opacity-90'
                : 'bg-dc-surface-high border border-dc-border text-dc-muted/40 cursor-not-allowed'}`}>
            Save Changes
          </button>
        </div>
      </div>

      {/* ── Section content ──────────────────────────────────────────────── */}
      <div className="pt-4 cfg-enter" key={section}>
        {section === 'platform'      && <PlatformSection      {...ctrl} />}
        {section === 'users'         && <UserDefaultsSection  {...ctrl} />}
        {section === 'engine'        && <DreamEngineSection   {...ctrl} />}
        {section === 'ai'            && <AIConfigSection      {...ctrl} />}
        {section === 'moderation'    && <ModerationSection    {...ctrl} />}
        {section === 'notifications' && <NotificationsSection {...ctrl} />}
        {section === 'infra'         && <InfraSection />}
        {section === 'security'      && <SecuritySection      {...ctrl} />}
      </div>

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
      <DangerZone onLogout={() => { clearStoredAuth(); navigate('/login'); }} />

      {/* ── Confirm Modal ─────────────────────────────────────────────────── */}
      {pending && <ConfirmModal action={pending} onClose={() => setPending(null)} />}

      {/* Hidden file input for import */}
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
    </div>
  );
}
