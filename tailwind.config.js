/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // === Casino Gold Theme (Original) ===
        // Light mode: warm ivory + original gold
        'primary-light': '#faf5e5',
        'primary':       '#e6b420',
        'primary-dark':  '#e4c56b',
        'secondary-light': '#d4c8a8',
        'secondary':     '#b8a878',
        'secondary-dark': '#8a7a5a',
        'surface':       '#faf7ef',
        'surface-card':  '#ffffff',
        'surface-alt':   '#f5edd8',
        'accent':        '#e6b420',
        'text-primary':  '#1a1a2e',
        'text-secondary': '#6b6358',

        // Status colors (warm gold-harmonized)
        'status-success': '#6aa84f',
        'status-success-dark': '#8bc47a',
        'status-error': '#d4555a',
        'status-error-dark': '#e07070',

        // Dark mode: deep navy-black surface + original gold (casino style)
        'dark-primary-light': '#fff8e8',
        'dark-primary':       '#f0d090',
        'dark-primary-dark':  '#e4c56b',
        'dark-secondary-light': '#7a6e52',
        'dark-secondary':     '#5e5238',
        'dark-secondary-dark': '#3e3428',
        'dark-surface':       '#0d0d15',
        'dark-surface-card':  '#161622',
        'dark-surface-alt':   '#1e1e2e',
        'dark-accent':        '#b38922',
        'dark-text-primary':  '#f0ead6',
        'dark-text-secondary': '#a89f85',
      },
      backgroundImage: {
        // Light gradients - warm ivory + original gold elegance
        'gradient-primary': 'linear-gradient(135deg, #e6b420 0%, #e4c56b 100%)',
        'gradient-surface': 'linear-gradient(145deg, #ffffff 0%, #faf5e5 100%)',
        'gradient-alt':     'linear-gradient(45deg, #faf7ef 0%, #faf5e5 100%)',
        'gradient-bar':     'linear-gradient(135deg, #e6b420 0%, #e4c56b 50%, #faf5e5 100%)',
        'gradient-card':    'linear-gradient(160deg, #ffffff 0%, #faf7ef 100%)',

        // Dark gradients - deep navy-black + original gold shimmer
        'dark-gradient-primary': 'linear-gradient(135deg, #e4c56b 0%, #f0d090 50%, #fff8e8 100%)',
        'dark-gradient-surface': 'linear-gradient(145deg, #161622 0%, #1e1e2e 100%)',
        'dark-gradient-alt':     'linear-gradient(45deg, #1e1e2e 0%, #0d0d15 100%)',
        'dark-gradient-bar':     'linear-gradient(135deg, #0d0d15 0%, #161622 70%, #b38922 100%)',
        'dark-gradient-card':    'linear-gradient(160deg, #161622 0%, #1a1a28 100%)',
      },
      transitionProperty: {
        'colors': 'background-color, color, border-color, box-shadow',
        'transform': 'transform',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to':   { opacity: '1', transform: 'translateY(0)' }
        },
        goldShimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn:       'fadeIn 0.5s ease-out forwards',
        goldShimmer:  'goldShimmer 3s linear infinite',
        slideUp:     'slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        scaleIn:     'scaleIn 0.25s ease-out forwards',
      },
      boxShadow: {
        'gold':    '0 0 8px rgba(230, 180, 32, 0.20)',
        'gold-lg': '0 0 16px rgba(230, 180, 32, 0.30)',
        'sm':      '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
        'card':    '0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(230,180,32,0.12), 0 2px 6px rgba(0,0,0,0.06)',
        'modal':   '0 20px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.10)',
      },
      letterSpacing: {
        'heading': '-0.01em',
        'tight':   '-0.02em',
      },
    }
  },
  plugins: [],
}
