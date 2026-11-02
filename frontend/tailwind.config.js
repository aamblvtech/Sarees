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
          bg: '#FCF8F8',
          card: '#FBEFEF',
          border: '#F9DFDF',
          accent: '#F5AFAF',
          darkBg: '#0F172A',
          darkBorder: '#1E293B',
          activeLight: '#000000',
          activeDark: '#FFFFFF',
        },
        rose: {
          lightest: '#FCF8F8',
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
        'vestra-sm': '0 1px 3px 0 rgba(245, 175, 175, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'vestra': '0 4px 20px -2px rgba(245, 175, 175, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'vestra-lg': '0 12px 36px -4px rgba(245, 175, 175, 0.18), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'scanner': '0 0 25px rgba(245, 175, 175, 0.65)',
      }
    },
  },
  plugins: [],
}
