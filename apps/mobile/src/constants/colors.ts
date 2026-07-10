export const Colors = {
  background: '#0F0F23',
  surface: '#1A1A35',
  surfaceHigh: '#212142',
  border: '#2D2D4E',
  primary: '#6C63FF',
  primaryDark: '#5549E0',
  primaryGlow: 'rgba(108, 99, 255, 0.15)',
  textPrimary: '#FFFFFF',
  textSecondary: '#9B9BB4',
  textMuted: '#5A5A7A',
  error: '#FF5C5C',
  success: '#4CAF87',
  inputBackground: '#1A1A35',
  inputBorder: '#2D2D4E',
  inputBorderFocus: '#6C63FF',
} as const;

export const CategoryColors = {
  lucid:     { bg: 'rgba(139, 92, 246, 0.18)', accent: '#8B5CF6', text: '#C4B5FD' },
  beautiful: { bg: 'rgba(244, 114, 182, 0.18)', accent: '#F472B6', text: '#FBCFE8' },
  nightmare: { bg: 'rgba(239, 68, 68, 0.18)',  accent: '#EF4444', text: '#FCA5A5' },
  normal:    { bg: 'rgba(96, 165, 250, 0.18)',  accent: '#60A5FA', text: '#BFDBFE' },
} as const;

export const CategoryLabels = {
  lucid:     'Lucid',
  beautiful: 'Güzel',
  nightmare: 'Kabus',
  normal:    'Normal',
} as const;

export const VisibilityConfig = {
  public:       { label: 'Herkese Açık', iconName: 'globe-outline',       color: '#4CAF87' },
  followers:    { label: 'Takipçiler',   iconName: 'people-outline',      color: '#6C63FF' },
  friends_only: { label: 'Arkadaşlar',   iconName: 'people-outline',      color: '#6C63FF' },
  private:      { label: 'Özel',         iconName: 'lock-closed-outline', color: '#5A5A7A' },
} as const;
