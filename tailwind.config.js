/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // HCM Lite colour system (brief cover)
        brand: {
          emerald: '#10B981', // present, check-in CTA, HR badge, success
          teal: '#0D9488',
          violet: '#7C3AED', // AI assistant, AI badges
          purple: '#8B5CF6',
          amber: '#F59E0B', // on leave, employee badge, attendance trend, pending
          navy: '#0F172A', // admin badge, sidebar, dark surfaces
          slate: '#1E293B',
          blue: '#3B82F6', // late
          rose: '#F43F5E', // absent, rejection, anomaly
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 12px 32px -18px rgb(15 23 42 / 0.18)',
        lift: '0 2px 4px rgb(15 23 42 / 0.05), 0 22px 44px -22px rgb(15 23 42 / 0.32)',
        'glow-violet': '0 0 0 1px rgb(139 92 246 / 0.35), 0 10px 40px -8px rgb(124 58 237 / 0.55)',
        'glow-emerald': '0 10px 36px -10px rgb(16 185 129 / 0.6)',
        'glow-amber': '0 10px 36px -10px rgb(245 158 11 / 0.55)',
        'glow-rose': '0 10px 36px -10px rgb(244 63 94 / 0.5)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'scan-line': {
          '0%, 100%': { top: '8%' },
          '50%': { top: '88%' },
        },
        'radar-sweep': {
          to: { transform: 'rotate(360deg)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(124 58 237 / 0.0), 0 8px 30px -10px rgb(124 58 237 / 0.55)' },
          '50%': { boxShadow: '0 0 0 6px rgb(139 92 246 / 0.12), 0 12px 44px -8px rgb(124 58 237 / 0.75)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -40px) scale(1.08)' },
          '66%': { transform: 'translate(-24px, 24px) scale(0.94)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(-14deg)' },
          '40%': { transform: 'rotate(10deg)' },
          '60%': { transform: 'rotate(-6deg)' },
          '80%': { transform: 'rotate(3deg)' },
        },
        'bracket-breathe': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.96)' },
        },
        'dot-bounce': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
          '40%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        'ping-soft': {
          '75%, 100%': { transform: 'scale(1.9)', opacity: '0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        'fade-in-up': 'fade-in-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scan-line': 'scan-line 2.6s ease-in-out infinite',
        'radar-sweep': 'radar-sweep 3.2s linear infinite',
        'glow-pulse': 'glow-pulse 2.6s ease-in-out infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        float: 'float 5s ease-in-out infinite',
        blob: 'blob 18s ease-in-out infinite',
        wiggle: 'wiggle 0.9s ease-in-out',
        'bracket-breathe': 'bracket-breathe 1.6s ease-in-out infinite',
        'dot-bounce': 'dot-bounce 1.2s ease-in-out infinite',
        'ping-soft': 'ping-soft 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};
