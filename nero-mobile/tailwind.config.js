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
        'nero-bg': '#0c0c0e',
        'nero-sidebar': '#09090b',
        'nero-indigo': '#6366f1',
      }
    },
  },
  plugins: [],
}
