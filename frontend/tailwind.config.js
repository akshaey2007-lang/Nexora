/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nexora: {
          navy: '#17243B',
          'navy-light': '#213352',
          'navy-dark': '#0E1726',
          electric: '#536DFE',
          'electric-hover': '#4056E0',
          'electric-light': '#EEF2FF',
          ivory: '#F7F8FC',
          surface: '#FFFFFF',
          muted: '#8791A5',
          teal: '#21A58B',
          border: '#E8EBF2',
          'border-dark': '#293A54',
          'dark-bg': '#0B111E',
          'dark-surface': '#121D30',
          'dark-card': '#17243B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'nexora-sm': '0 1px 3px rgba(23, 36, 59, 0.05), 0 1px 2px rgba(23, 36, 59, 0.03)',
        'nexora-md': '0 4px 12px rgba(23, 36, 59, 0.06), 0 1px 3px rgba(23, 36, 59, 0.04)',
        'nexora-lg': '0 12px 30px rgba(23, 36, 59, 0.08), 0 4px 10px rgba(23, 36, 59, 0.03)',
        'nexora-glow': '0 0 20px rgba(83, 109, 254, 0.25)'
      }
    },
  },
  plugins: [],
}
