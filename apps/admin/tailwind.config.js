/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Core OS palette (updated for depth) ──────────────────────────────
        'dc-bg':           '#060614',
        'dc-surface':      '#0C0C24',
        'dc-surface-high': '#121230',
        'dc-border':       '#1A1A38',
        'dc-primary':      '#7B6FFF',
        'dc-primary-dark': '#5549E0',
        'dc-glow':         'rgba(123,111,255,0.20)',
        'dc-text':         '#E8E8FF',
        'dc-secondary':    '#7878A8',
        'dc-muted':        '#3E3E62',
        'dc-error':        '#FF4A5E',
        'dc-success':      '#38D68A',
        'dc-warning':      '#FF9800',

        // ── OS Section accent colors ──────────────────────────────────────────
        'os-cyan':    '#00CFFF',
        'os-gold':    '#FFB800',
        'os-emerald': '#00E87A',
        'os-amber':   '#FF8C00',
        'os-violet':  '#CC80FF',
        'os-rose':    '#FF3060',
        'os-teal':    '#00D4C0',
        'os-ice':     '#80E8FF',
      },

      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },

      boxShadow: {
        'glow-purple': '0 0 24px rgba(123,111,255,0.45), 0 0 48px rgba(123,111,255,0.15)',
        'glow-cyan':   '0 0 24px rgba(0,207,255,0.45), 0 0 48px rgba(0,207,255,0.15)',
        'glow-gold':   '0 0 24px rgba(255,184,0,0.45), 0 0 48px rgba(255,184,0,0.15)',
        'glow-green':  '0 0 24px rgba(0,232,122,0.45), 0 0 48px rgba(0,232,122,0.15)',
        'glow-rose':   '0 0 24px rgba(255,48,96,0.45), 0 0 48px rgba(255,48,96,0.15)',
        'glass':       '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        'panel':       '0 4px 24px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.04)',
        'inner-glow':  'inset 0 0 40px rgba(123,111,255,0.06)',
      },

      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 6px rgba(123,111,255,0.4)' },
          '50%':      { boxShadow: '0 0 20px rgba(123,111,255,0.9), 0 0 40px rgba(123,111,255,0.3)' },
        },
        'status-ping': {
          '75%, 100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-5px)' },
        },
        'data-scroll': {
          from: { transform: 'translateX(0%)' },
          to:   { transform: 'translateX(-50%)' },
        },
        'blink-cursor': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        'scan': {
          '0%':   { transform: 'translateY(-100%)', opacity: '0.6' },
          '100%': { transform: 'translateY(100vh)',  opacity: '0.6' },
        },
        'number-tick': {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to:   { transform: 'translateY(0)',      opacity: '1' },
        },
      },

      animation: {
        'glow-pulse':     'glow-pulse 2.5s ease-in-out infinite',
        'status-ping':    'status-ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
        'fade-up':        'fade-up 0.35s ease-out',
        'fade-in':        'fade-in 0.25s ease-out',
        'slide-in-left':  'slide-in-left 0.3s ease-out',
        'float':          'float 4s ease-in-out infinite',
        'data-scroll':    'data-scroll 25s linear infinite',
        'blink-cursor':   'blink-cursor 1s step-end infinite',
        'scan':           'scan 10s linear infinite',
        'number-tick':    'number-tick 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
