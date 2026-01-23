/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'primary-light': '#faf5e5',
        'primary': '#f4e5b8',
        'primary-dark': '#e4c56b',
        'secondary-light': '#d4bd8a',
        'secondary': '#b3a077',
        'secondary-dark': '#8a784c',
        'surface': '#faf5e5',
        'surface-card': '#ffffff',
        'surface-alt': '#f4ead1',
        'accent': '#e4c56b',
        'text-primary': '#21210b',
        'text-secondary': '#524d2b',

        'dark-primary-light': '#fff4d8',
        'dark-primary': '#fedea0',
        'dark-primary-dark': '#ccab6c',
        'dark-secondary-light': '#d8c7a0',
        'dark-secondary': '#b39d70',
        'dark-secondary-dark': '#8e7a4b',
        'dark-surface': '#34312f',
        'dark-surface-card': '#2a2826',
        'dark-surface-alt': '#3f3c39',
        'dark-accent': '#b38922',
        'dark-text-primary': '#fedea0',
        'dark-text-secondary': '#d8cdb0',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #e4c56b 0%, #f4e5b8 100%)',
        'gradient-surface': 'linear-gradient(145deg, #ffffff 0%, #f4ead1 100%)',
        'gradient-alt': 'linear-gradient(45deg, #f4e5b8 0%, #faf5e5 100%)',
        'gradient-bar': ' linear-gradient(315deg, #e4c56b 0%, #f4e5b8 100%)',
        'gradient-card': 'linear-gradient(180deg, #f4e5b8 0%, #dfce99 100%)',

        'dark-gradient-primary': 'linear-gradient(135deg, #b38922 0%, #fedea0 100%)',
        'dark-gradient-surface': 'linear-gradient(145deg, #3f3c39 0%, #2a2826 100%)',
        'dark-gradient-alt': 'linear-gradient(45deg, #fedea0 0%, #34312f 100%)',
        'dark-gradient-bar': 'linear-gradient(135deg, #181818 0%, #3f3f3f 100%)',
        'dark-gradient-card': 'linear-gradient(180deg, #000000 0%, #212121 100%)',
      },
      transitionProperty: {
        'colors': 'background-color, color, border-color',
        'transform': 'transform',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out forwards'
      }
    }
  },
  variants: {
    extend: {
      gradientColorStops: ['dark', 'hover', 'focus'],
    },
  },
  plugins: [
  ],
}