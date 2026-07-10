type SectionTheme = 'executive' | 'operators' | 'intelligence' | 'operations' | 'business' | 'content' | 'system';

const SECTION_CONFIG: Record<SectionTheme, { label: string; accent: string; glow: string }> = {
  executive:    { label: 'EXECUTIVE',          accent: '#FFB800', glow: 'rgba(255,184,0,0.15)' },
  operators:    { label: 'AI OPERATORS',       accent: '#00CFFF', glow: 'rgba(0,207,255,0.15)' },
  intelligence: { label: 'DREAM INTELLIGENCE', accent: '#7B6FFF', glow: 'rgba(123,111,255,0.15)' },
  operations:   { label: 'OPERATIONS',         accent: '#FF9800', glow: 'rgba(255,152,0,0.15)' },
  business:     { label: 'BUSINESS',           accent: '#00E87A', glow: 'rgba(0,232,122,0.12)' },
  content:      { label: 'CONTENT',            accent: '#CC80FF', glow: 'rgba(204,128,255,0.12)' },
  system:       { label: 'SYSTEM',             accent: '#3E3E62', glow: 'rgba(62,62,98,0.12)' },
};

interface HeaderProps {
  title:    string;
  subtitle?: string;
  section?: SectionTheme;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, section, actions }: HeaderProps) {
  const theme = section ? SECTION_CONFIG[section] : null;

  return (
    <div className="mb-6">
      {/* Section badge */}
      {theme && (
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${theme.accent}40, transparent)` }} />
          <span className="text-[8px] font-bold tracking-[0.3em] px-2.5 py-1 rounded"
            style={{
              color:      theme.accent,
              background: theme.glow,
              border:     `1px solid ${theme.accent}30`,
            }}>
            {theme.label}
          </span>
          <div className="h-px w-8" style={{ background: `${theme.accent}20` }} />
        </div>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight"
            style={{ color: '#E8E8FF' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12px] mt-1" style={{ color: '#4A4A6E' }}>{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 pt-0.5">{actions}</div>
        )}
      </div>

      {/* Bottom divider */}
      <div className="mt-4 h-px"
        style={{
          background: theme
            ? `linear-gradient(90deg, ${theme.accent}30, ${theme.accent}08, transparent)`
            : 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)',
        }}
      />
    </div>
  );
}
