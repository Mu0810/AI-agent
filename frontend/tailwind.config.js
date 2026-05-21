/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7' },
        accent: { 400: '#e879f9', 500: '#d946ef', 600: '#c026d3' },
        dark: { 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' }
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'shimmer': 'shimmer 8s ease-in-out infinite',
        'spin-slow': 'spin-slow 6s linear infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
