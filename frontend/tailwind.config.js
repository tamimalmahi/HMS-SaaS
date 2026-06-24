/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary-color, #0f172a)',
          dark: 'var(--primary-dark, #020617)',
          light: 'var(--primary-light, #1e293b)'
        },
        secondary: {
          DEFAULT: 'var(--secondary-color, #3b82f6)',
          dark: 'var(--secondary-dark, #1d4ed8)',
          light: 'var(--secondary-light, #60a5fa)'
        },
        accent: {
          DEFAULT: '#10b981', // green for successes/badges
          warning: '#f59e0b',
          danger: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
