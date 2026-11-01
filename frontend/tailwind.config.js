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
        medical: {
          bg: '#f8fafc',
          darkBg: '#0f172a',
          surface: '#ffffff',
          darkSurface: '#1e293b',
          border: '#e2e8f0',
          darkBorder: '#334155',
          text: '#0f172a',
          darkText: '#f1f5f9',
          muted: '#64748b',
          darkMuted: '#94a3b8'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
