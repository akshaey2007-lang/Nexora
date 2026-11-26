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
          navy: '#0F172A',
          'navy-light': '#1E293B',
          'navy-dark': '#090D16',
          electric: '#4F46E5',
          'electric-hover': '#4338CA',
          'electric-light': '#EEF2FF',
          ivory: '#F8FAFC',
          sidebar: '#F8F9FB',
          surface: '#FFFFFF',
          muted: '#64748B',
          teal: '#059669',
          border: '#E2E8F0',
          'border-dark': '#222636',
          'dark-bg': '#0B0D13',
          'dark-sidebar': '#11131C',
          'dark-surface': '#141722',
          'dark-card': '#1B1F2E'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'nexora-xs': '0 1px 2px rgba(15, 23, 42, 0.04)',
        'nexora-sm': '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        'nexora-md': '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
        'nexora-lg': '0 12px 28px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(15, 23, 42, 0.04)'
      }
    },
  },
  plugins: [],
}
