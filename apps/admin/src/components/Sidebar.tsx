import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearStoredAuth, getStoredAuth } from '../store/auth.store';

// ── Types ──────────────────────────────────────────────────────────────────────

interface NavItem   { to: string; icon: string; label: string; badge?: string }
interface NavSection { title: string; color: string; icon: string; items: NavItem[] }

// ── Nav structure ──────────────────────────────────────────────────────────────

const NAV: NavSection[] = [
  {
    title: 'EXECUTIVE',  color: '#FFB800', icon: '◈',
    items: [
      { to: '/executive',          icon: '◈',  label: 'Command Deck' },
      { to: '/command-center',     icon: '⚡', label: 'Operations Hub' },
      { to: '/dream-intelligence', icon: '🧠', label: 'Intelligence Hub' },
    ],
  },
  {
    title: 'OPERATORS',  color: '#00CFFF', icon: '◆',
    items: [
      { to: '/operators',          icon: '◆', label: 'Operators Center' },
      { to: '/dream-weather',      icon: '≋', label: 'Dream Weather' },
      { to: '/global-emotion',     icon: '〇', label: 'Global Emotion' },
      { to: '/predictions',        icon: '◎', label: 'Predictions' },
      { to: '/trend-radar',        icon: '⊕', label: 'Trend Radar' },
      { to: '/ai-recommendations', icon: '✦', label: 'AI Recommendations' },
    ],
  },
  {
    title: 'DREAM INTEL', color: '#7B6FFF', icon: '∞',
    items: [
      { to: '/consciousness-map',        icon: '◎', label: 'Consciousness Map' },
      { to: '/emotion-map',              icon: '〇', label: 'Emotion Map' },
      { to: '/symbol-analysis',          icon: '◈', label: 'Symbol Analysis' },
      { to: '/archetype-analysis',       icon: '⚜', label: 'Archetype Analysis' },
      { to: '/dream-genome',             icon: '∿', label: 'Dream Genome' },
      { to: '/global-dream-map',         icon: '⊕', label: 'Global Dream Map' },
      { to: '/collective-consciousness', icon: '∞', label: 'Collective Mind' },
    ],
  },
  {
    title: 'CONNECTIONS',  color: '#00CFFF', icon: '◎',
    items: [
      { to: '/dream-connections',  icon: '◎', label: 'Dream Connections' },
      { to: '/resonance-events',   icon: '◈', label: 'Resonance Events' },
      { to: '/seen-in-dreams',     icon: '✦', label: 'Seen In Dreams' },
      { to: '/collective-signals', icon: '∿', label: 'Collective Signals' },
    ],
  },
  {
    title: 'ENGINE',  color: '#A78BFA', icon: '⬡',
    items: [
      { to: '/event-stream',         icon: '⬡', label: 'Event Stream' },
      { to: '/user-timeline',        icon: '◌', label: 'User Timeline' },
      { to: '/dream-graph-explorer', icon: '◈', label: 'Dream Graph' },
      { to: '/dream-assistant',      icon: '✦', label: 'Dream Assistant' },
    ],
  },
  {
    title: 'WORLD MODEL',  color: '#00E87A', icon: '◉',
    items: [
      { to: '/world-weather',       icon: '≋', label: 'Dream Weather' },
      { to: '/symbol-economy',      icon: '◈', label: 'Symbol Economy' },
      { to: '/archetype-dynamics',  icon: '⬡', label: 'Archetype Dynamics' },
      { to: '/consciousness-index', icon: '✦', label: 'Consciousness Index' },
      { to: '/dream-seasons',       icon: '◌', label: 'Dream Seasons' },
    ],
  },
  {
    title: 'OPERATING SYSTEM',  color: '#FF8C00', icon: '⬢',
    items: [
      { to: '/automation-center', icon: '⚡', label: 'Automation' },
      { to: '/scenario-builder',  icon: '⬢', label: 'Scenarios' },
      { to: '/alert-center',      icon: '⛔', label: 'Alert Center' },
      { to: '/ai-observer',       icon: '◉', label: 'AI Observer' },
      { to: '/scheduler',         icon: '◎', label: 'Scheduler' },
    ],
  },
  {
    title: 'OPERATIONS',  color: '#FF9800', icon: '🛡',
    items: [
      { to: '/community-health',    icon: '💚', label: 'Community Health' },
      { to: '/moderation-war-room', icon: '🛡', label: 'War Room' },
      { to: '/support-center',      icon: '⚙', label: 'Support Center' },
      { to: '/user-risk',           icon: '⚠', label: 'Risk Center' },
    ],
  },
  {
    title: 'CONTENT',  color: '#CC80FF', icon: '◉',
    items: [
      { to: '/dreams',     icon: '🌙', label: 'Dreams' },
      { to: '/featured',   icon: '★',  label: 'Featured' },
      { to: '/reports',    icon: '⚑',  label: 'Reports' },
      { to: '/moderation', icon: '◉',  label: 'Moderation Queue' },
    ],
  },
  {
    title: 'USERS',  color: '#80E8FF', icon: '◉',
    items: [
      { to: '/users',       icon: '◉', label: 'All Users' },
      { to: '/banned-users',icon: '✕', label: 'Banned' },
    ],
  },
  {
    title: 'ANALYTICS',  color: '#00E87A', icon: '◈',
    items: [
      { to: '/analytics',    icon: '◈', label: 'Analytics' },
      { to: '/user-growth',  icon: '↑', label: 'User Growth' },
      { to: '/dream-trends', icon: '∿', label: 'Dream Trends' },
      { to: '/engagement',   icon: '◎', label: 'Engagement' },
    ],
  },
  {
    title: 'STAFF',  color: '#5A5A7A', icon: '◉',
    items: [
      { to: '/employees',        icon: '◉', label: 'Employees' },
      { to: '/role-permissions', icon: '⚙', label: 'Permissions' },
    ],
  },
  {
    title: 'BUSINESS',  color: '#00E87A', icon: '◆',
    items: [
      { to: '/revenue',     icon: '◆', label: 'Revenue',     badge: 'Soon' },
      { to: '/advertising', icon: '▸', label: 'Advertising', badge: 'Soon' },
      { to: '/campaigns',   icon: '◉', label: 'Campaigns',   badge: 'Soon' },
      { to: '/segments',    icon: '◈', label: 'Segments',    badge: 'Soon' },
    ],
  },
  {
    title: 'AI',  color: '#CC80FF', icon: '◈',
    items: [
      { to: '/ai-center', icon: '◈', label: 'AI Core', badge: 'Beta' },
    ],
  },
  {
    title: 'CONTROL',  color: '#FF8C00', icon: '⊞',
    items: [
      { to: '/system-control',   icon: '⊞', label: 'System Control' },
      { to: '/app-control',      icon: '◈', label: 'App Control' },
      { to: '/feature-flags',    icon: '⚑', label: 'Feature Flags' },
      { to: '/notifications',    icon: '▸', label: 'Notifications' },
      { to: '/automation-rules', icon: '⚙', label: 'Automation Rules' },
    ],
  },
  {
    title: 'SYSTEM',  color: '#2A2A4A', icon: '⊞',
    items: [
      { to: '/live-activity', icon: '⊞', label: 'Live Feed' },
      { to: '/admin-logs',    icon: '▸', label: 'Audit Logs' },
      { to: '/dashboard',     icon: '◉', label: 'Dashboard' },
      { to: '/settings',      icon: '⚙', label: 'Settings' },
    ],
  },
];

// ── Nav item ───────────────────────────────────────────────────────────────────

function NavItemLink({ item, sectionColor }: { item: NavItem; sectionColor: string }) {
  const { pathname } = useLocation();
  const isActive = pathname === item.to || (item.to !== '/dashboard' && pathname.startsWith(item.to + '/'));

  return (
    <NavLink
      to={item.to}
      end={false}
      style={isActive ? {
        background:  `rgba(${hexToRgb(sectionColor)}, 0.10)`,
        borderColor: `rgba(${hexToRgb(sectionColor)}, 0.35)`,
        color:       sectionColor,
      } : undefined}
      className={() =>
        `flex items-center gap-2 px-3 py-1.5 mx-2 rounded-lg text-[11px] font-medium transition-all border ${
          isActive
            ? 'border-transparent'
            : 'border-transparent text-dc-secondary hover:text-dc-text hover:bg-white/4'
        }`
      }
    >
      <span className="text-[10px] w-3.5 text-center shrink-0 opacity-70">{item.icon}</span>
      <span className="truncate flex-1">{item.label}</span>
      {item.badge && (
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
          style={{
            background:  `rgba(${hexToRgb(sectionColor)}, 0.12)`,
            color:       sectionColor,
            border:      `1px solid rgba(${hexToRgb(sectionColor)}, 0.25)`,
          }}>
          {item.badge}
        </span>
      )}
      {isActive && !item.badge && (
        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: sectionColor }} />
      )}
    </NavLink>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────

function NavSectionGroup({ section }: { section: NavSection }) {
  const { pathname } = useLocation();
  const isActivSection = section.items.some(item =>
    pathname === item.to || (item.to !== '/dashboard' && pathname.startsWith(item.to + '/'))
  );
  const [open, setOpen] = useState(isActivSection);

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-white/3 transition-colors"
      >
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] flex-1"
          style={{ color: isActivSection ? section.color : '#2A2A4A' }}>
          {section.title}
        </span>
        <svg
          className="w-2.5 h-2.5 transition-transform"
          style={{ color: '#2A2A4A', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
          viewBox="0 0 6 10" fill="currentColor">
          <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="pb-0.5">
          {section.items.map(item => (
            <NavItemLink key={item.to} item={item} sectionColor={section.color} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hex to RGB helper ──────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `${r},${g},${b}`;
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'SUPER ADMIN',
  admin:       'ADMIN',
  moderator:   'MODERATOR',
};

export default function Sidebar() {
  const navigate  = useNavigate();
  const auth      = getStoredAuth();

  function handleLogout() {
    clearStoredAuth();
    navigate('/login', { replace: true });
  }

  return (
    <aside
      className="flex flex-col h-screen shrink-0 overflow-hidden"
      style={{
        width: '220px',
        background: 'rgba(6,6,20,0.96)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.6)',
      }}
    >
      {/* Identity */}
      <div className="px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2.5 mb-2">
          <img src="/logo.png" alt="DreamCloud" className="w-6 h-6 rounded-md shrink-0" style={{ objectFit: 'contain' }} />
          <div>
            <p className="text-[10px] font-bold text-dc-text tracking-widest">DREAMCLOUD</p>
            <p className="text-[8px] text-dc-muted font-mono tracking-[0.15em]">OPERATING SYSTEM</p>
          </div>
        </div>
        {/* System health strip */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-dc-success block" />
            <span className="absolute w-1.5 h-1.5 rounded-full bg-dc-success animate-status-ping" />
          </div>
          <span className="text-[8px] text-dc-success font-mono tracking-widest">NOMINAL</span>
          <span className="ml-auto text-[8px] text-dc-muted font-mono">v3.0.0</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'none' }}>
        {NAV.map(section => (
          <NavSectionGroup key={section.title} section={section} />
        ))}
      </nav>

      {/* User */}
      {auth && (
        <div className="px-3 py-3 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
              style={{ background: 'rgba(123,111,255,0.15)', border: '1px solid rgba(123,111,255,0.25)', color: '#7B6FFF' }}>
              {auth.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-dc-text truncate">{auth.username}</p>
              <p className="text-[8px] font-bold tracking-widest" style={{ color: '#7B6FFF' }}>
                {ROLE_LABELS[auth.role] ?? auth.role.toUpperCase()}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-dc-muted hover:text-dc-error transition-colors p-1 rounded"
              title="Çıkış"
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 12l4-4-4-4M14 8H6M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
