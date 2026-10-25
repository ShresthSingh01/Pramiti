/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        card: 'var(--bg-card)',
        'card-subtle': 'var(--bg-card-subtle)',
        sidebar: 'var(--bg-sidebar)',
        'sidebar-active': 'var(--bg-sidebar-active)',
        'sidebar-hover': 'var(--bg-sidebar-hover)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-on-dark': 'var(--text-on-dark)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-soft': 'var(--primary-soft)',
        success: 'var(--success)',
        'success-soft': 'var(--success-soft)',
        warning: 'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        orange: 'var(--orange)',
        'orange-soft': 'var(--orange-soft)',
        neutral: 'var(--neutral)',
        'neutral-soft': 'var(--neutral-soft)',
        border: 'var(--border)',
        'border-bright': 'var(--border-bright)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        chip: 'var(--radius-chip)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        glow: 'var(--shadow-glow)',
        'danger-glow': 'var(--shadow-danger-glow)',
        'success-glow': 'var(--shadow-success-glow)',
      },
      animation: {
        'pulse-danger': 'pulse-danger 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-warning': 'pulse-warning 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan-line 4s linear infinite',
      }
    },
  },
  plugins: [],
}
