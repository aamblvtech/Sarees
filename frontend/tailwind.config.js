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
        app: {
          bg: '#FFFFFF',
          card: '#FFFFFF',
          surface: '#F8FAFC',
          border: '#E2E8F0',
          borderLight: '#F1F5F9',
          accent: '#F5AFAF',
          accentSoft: '#FBEFEF',
          darkBg: '#0F172A',
          darkBorder: '#1E293B',
          activeLight: '#1E293B',
          activeDark: '#FFFFFF',
        },
        rose: {
          lightest: '#FFFFFF',
          soft: '#FBEFEF',
          border: '#F9DFDF',
          accent: '#F5AFAF',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace']
      },
      boxShadow: {
        'vestra-xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'vestra-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'vestra': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        'vestra-lg': '0 12px 36px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'scanner': '0 0 25px rgba(245, 175, 175, 0.65)',
      }
    },
  },
  plugins: [],
}
