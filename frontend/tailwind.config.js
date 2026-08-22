/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        space: {
          900: '#0a0a1a',
          800: '#0d0d2b',
          700: '#141432',
        },
        cosmos: {
          bg: '#050510',
          surface: 'rgba(255,255,255,0.02)',
          'surface-elevated': 'rgba(255,255,255,0.05)',
          panel: '#0d0d2b',
        },
        accent: {
          DEFAULT: '#8b5cf6',  // violet-500
          light: '#c4b5fd',    // violet-300
          dark: '#6d28d9',     // violet-700
        },
      },
      borderColor: {
        subtle: 'rgba(255,255,255,0.08)',
        'subtle-hover': 'rgba(255,255,255,0.20)',
        'subtle-focus': 'rgba(139,92,246,0.6)', // violet-500/60
      },
      fontSize: {
        micro: ['10px', { lineHeight: '1.4', letterSpacing: '0.15em' }],
        'micro-wide': ['11px', { lineHeight: '1.4', letterSpacing: '0.35em' }],
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up-full': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'pop-in': 'pop-in 0.2s ease-out',
        'slide-up-full': 'slide-up-full 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
