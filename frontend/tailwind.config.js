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
        // Unslop Atelier Neutral Ramp: Warm Graphite & Pure Canvas
        atelier: {
          bg: '#FFFFFF',
          canvas: '#FAFAFA',
          subtle: '#F4F4F5',
          card: '#FFFFFF',
          border: 'rgba(23, 23, 23, 0.08)',
          borderMedium: 'rgba(23, 23, 23, 0.14)',
          text: '#171717',
          secondary: '#525252',
          muted: '#737373',
          
          // Dark Atelier Neutral Ramp
          darkDeep: '#0D0E10',
          darkBg: '#121316',
          darkCard: '#17181C',
          darkRaised: '#202126',
          darkBorder: 'rgba(237, 237, 237, 0.08)',
          darkBorderMedium: 'rgba(237, 237, 237, 0.16)',
          darkText: '#EDEDED',
          darkSecondary: '#A1A1A6',
          darkMuted: '#85858B',

          // High-Fashion Accessible Accent (Rose Copper / Terracotta Tinted)
          // 4.5:1+ contrast on both light and dark
          accent: '#A84B55',
          accentLight: '#C96872',
          accentDark: '#85363F',
          accentWash: 'rgba(168, 75, 85, 0.08)',
          accentWashDark: 'rgba(201, 104, 114, 0.12)',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace']
      },
      boxShadow: {
        'atelier-xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'atelier-sm': '0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'atelier-card': '0 4px 16px -2px rgba(0, 0, 0, 0.04)',
        'atelier-modal': '0 20px 40px -8px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        'atelier-sm': '4px',
        'atelier': '8px',
        'atelier-card': '12px',
        'atelier-panel': '16px',
      }
    },
  },
  plugins: [],
}
