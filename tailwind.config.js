/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      // Phase 0 Responsive Breakpoints
      compact: { max: '599px' },                // <600px: Mobile handheld
      medium: { min: '600px', max: '839px' },    // 600-839px: Foldable / Small Tablet
      expanded: '840px',                         // ≥840px: Tablet Landscape & POS Desktop
      sm: '600px',
      md: '840px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        'brand-primary': 'var(--color-brand-primary)',
        'brand-primary-strong': 'var(--color-brand-primary-strong)',
        'brand-primary-subtle': 'var(--color-brand-primary-subtle)',
        'brand-accent': 'var(--color-brand-accent)',
        'status-success': 'var(--color-status-success)',
        'status-warning': 'var(--color-status-warning)',
        'status-error': 'var(--color-status-error)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'surface-bg': 'var(--color-surface-bg)',
        'surface-default': 'var(--color-surface-default)',
        'surface-muted': 'var(--color-surface-muted)',
        'surface-elevated': 'var(--color-surface-elevated)',
        'border-subtle': 'var(--color-border-subtle)',
        'border-strong': 'var(--color-border-strong)',
      },
      fontSize: {
        caption: ['0.8125rem', { lineHeight: '1.25' }], // 13px - micro badges
        sub: ['0.875rem', { lineHeight: '1.25' }],       // 14px - status pills
        body: ['1rem', { lineHeight: '1.5' }],           // 16px - standard body
        title: ['1.125rem', { lineHeight: '1.35' }],     // 18px - section titles
        heading: ['1.25rem', { lineHeight: '1.3' }],     // 20px - pane headings
        display: ['1.5rem', { lineHeight: '1.2' }],      // 24px - bill totals
      },
      minHeight: {
        touch: 'var(--touch-target-min)',
      },
      minWidth: {
        touch: 'var(--touch-target-min)',
      },
      spacing: {
        touch: '48px',
      },
      borderRadius: {
        'token-none': 'var(--radius-none)',
        'token-sm': 'var(--radius-sm)',
        'token-md': 'var(--radius-md)',
        'token-lg': 'var(--radius-lg)',
        'token-xl': 'var(--radius-xl)',
        'token-pill': 'var(--radius-pill)',
      },
    },
  },
  plugins: [],
};
