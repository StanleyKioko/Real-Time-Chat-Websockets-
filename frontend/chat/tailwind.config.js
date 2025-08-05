/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e5edff',
          200: '#cddbfe',
          300: '#b4c6fc',
          400: '#8b5cf6',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3c1361',
        },
        dark: {
          50: '#f8fafc',
          100: '#1e1b23',
          200: '#2a2530',
          300: '#363140',
          400: '#4a4458',
          500: '#5d5b6a',
          600: '#71717a',
          700: '#a1a1aa',
          800: '#d4d4d8',
          900: '#f4f4f5',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}