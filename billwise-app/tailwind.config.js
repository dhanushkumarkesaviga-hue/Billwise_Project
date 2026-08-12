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
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        youtube: {
          red: '#ff0000',
          darkRed: '#cc0000',
          lightRed: '#ffe5e5',
        },
        redbus: {
          primary: '#d84e55',
          dark: '#b33036',
          light: '#fdf2f2',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'laser-scan': 'laserScan 2.5s infinite ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 0.4, transform: 'scale(1)' },
          '50%': { opacity: 0.9, transform: 'scale(1.02)' },
        },
        laserScan: {
          '0%': { top: '0%' },
          '50%': { top: '95%' },
          '100%': { top: '0%' }
        }
      }
    },
  },
  plugins: [],
}
