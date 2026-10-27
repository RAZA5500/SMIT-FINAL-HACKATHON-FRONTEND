/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // Neutral greys (slight cool bias) replace Tailwind's blue-tinted slate app-wide.
        // 50 = page canvas, 200 = hairline borders, 500 = muted text (AA on white and canvas), 900/950 = ink.
        slate: {
          50: '#F7F7F8',
          100: '#F0F0F2',
          200: '#E4E5E8',
          300: '#D0D2D7',
          400: '#A0A3AB',
          500: '#6B6E77',
          600: '#53565E',
          700: '#3B3D44',
          800: '#26272C',
          900: '#141519',
          950: '#0B0C0F',
        },
        // Brand = blue → indigo (the `emerald`/`teal` tone names map to these). Status: green = present/approved, blue = late,
        // amber = leave/pending, rose = absent/rejected, violet = AI.
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(15 16 20 / 0.05)',
        card: '0 1px 2px 0 rgb(15 16 20 / 0.04), 0 4px 16px -6px rgb(15 16 20 / 0.07)',
        lift: '0 18px 40px -12px rgb(15 16 20 / 0.2), 0 4px 10px -4px rgb(15 16 20 / 0.08)',
        'glow-brand': '0 8px 24px -8px rgb(59 130 246 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.22)',
        'glow-violet': '0 8px 24px -8px rgb(124 58 237 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.22)',
        'glow-rose': '0 8px 24px -8px rgb(244 63 94 / 0.5), inset 0 1px 0 rgb(255 255 255 / 0.2)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #3B82F6 0%, #4F46E5 100%)',
        'ai-gradient': 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 55%, #6D28D9 100%)',
        'grid-light':
          'linear-gradient(to right, rgb(15 16 20 / 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgb(15 16 20 / 0.045) 1px, transparent 1px)',
        'grid-dark':
          'linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.05) 1px, transparent 1px)',
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
        'bracket-breathe': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'dot-bounce': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
          '40%': { transform: 'translateY(-3px)', opacity: '1' },
        },
        'ping-soft': {
          '75%, 100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        aurora: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(4%, -6%) scale(1.08)' },
          '66%': { transform: 'translate(-5%, 4%) scale(0.95)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        'fade-in-up': 'fade-in-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scan-line': 'scan-line 2.6s ease-in-out infinite',
        'radar-sweep': 'radar-sweep 3.2s linear infinite',
        'bracket-breathe': 'bracket-breathe 1.6s ease-in-out infinite',
        'dot-bounce': 'dot-bounce 1.2s ease-in-out infinite',
        'ping-soft': 'ping-soft 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
        aurora: 'aurora 22s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'gradient-x': 'gradient-x 8s ease infinite',
      },
    },
  },
  plugins: [],
};
