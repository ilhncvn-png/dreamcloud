import type { ReactNode } from 'react';

type BadgeVariant = 'role' | 'status' | 'category' | 'visibility' | 'activity';

interface BadgeProps {
  value: string;
  variant?: BadgeVariant;
  className?: string;
}

// ── Color maps ─────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, { cls: string; label: string }> = {
  super_admin: { cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40', label: 'Süper Admin' },
  admin:       { cls: 'bg-dc-primary/20 text-dc-primary border border-dc-primary/40', label: 'Admin' },
  moderator:   { cls: 'bg-purple-500/20 text-purple-400 border border-purple-500/40', label: 'Moderatör' },
  user:        { cls: 'bg-dc-surface-high text-dc-secondary border border-dc-border', label: 'Kullanıcı' },
};

const STATUS_STYLES: Record<string, { cls: string; label: string }> = {
  active:   { cls: 'bg-dc-success/15 text-dc-success border border-dc-success/30', label: '● Aktif' },
  inactive: { cls: 'bg-dc-error/15 text-dc-error border border-dc-error/30',       label: '● Pasif' },
  healthy:  { cls: 'bg-dc-success/15 text-dc-success border border-dc-success/30', label: '● Sağlıklı' },
  error:    { cls: 'bg-dc-error/15 text-dc-error border border-dc-error/30',       label: '● Hata' },
  unknown:  { cls: 'bg-dc-muted/20 text-dc-muted border border-dc-border',         label: '● Bilinmiyor' },
};

const CATEGORY_STYLES: Record<string, { cls: string; label: string }> = {
  lucid:     { cls: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',     label: 'Lucid' },
  beautiful: { cls: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',     label: 'Güzel' },
  nightmare: { cls: 'bg-red-500/20 text-red-400 border border-red-500/30',        label: 'Kabus' },
  normal:    { cls: 'bg-dc-surface-high text-dc-secondary border border-dc-border', label: 'Normal' },
  recurring: { cls: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', label: 'Tekrar Eden' },
};

const VISIBILITY_STYLES: Record<string, { cls: string; label: string }> = {
  public:    { cls: 'bg-dc-success/15 text-dc-success border border-dc-success/30', label: 'Herkese Açık' },
  followers: { cls: 'bg-dc-warning/15 text-dc-warning border border-dc-warning/30', label: 'Takipçiler' },
  private:   { cls: 'bg-dc-muted/15 text-dc-muted border border-dc-border',         label: 'Özel' },
};

const ACTIVITY_STYLES: Record<string, { cls: string; label: string }> = {
  login:           { cls: 'bg-dc-primary/20 text-dc-primary border border-dc-primary/30',   label: 'Giriş' },
  dream_created:   { cls: 'bg-dc-success/15 text-dc-success border border-dc-success/30',   label: 'Rüya' },
  profile_updated: { cls: 'bg-dc-warning/15 text-dc-warning border border-dc-warning/30',   label: 'Profil' },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function Badge({ value, variant = 'status', className = '' }: BadgeProps) {
  let cls   = 'bg-dc-surface-high text-dc-secondary border border-dc-border';
  let label: ReactNode = value;

  if (variant === 'role') {
    const s = ROLE_STYLES[value];
    if (s) { cls = s.cls; label = s.label; }
  } else if (variant === 'status') {
    const key = value === 'true' ? 'active' : value === 'false' ? 'inactive' : value;
    const s = STATUS_STYLES[key];
    if (s) { cls = s.cls; label = s.label; }
  } else if (variant === 'category') {
    const s = CATEGORY_STYLES[value];
    if (s) { cls = s.cls; label = s.label; }
  } else if (variant === 'visibility') {
    const s = VISIBILITY_STYLES[value];
    if (s) { cls = s.cls; label = s.label; }
  } else if (variant === 'activity') {
    const s = ACTIVITY_STYLES[value];
    if (s) { cls = s.cls; label = s.label; }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide ${cls} ${className}`}>
      {label}
    </span>
  );
}
