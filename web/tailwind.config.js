/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0B1D35',
          'navy-light': '#132B4D',
          'navy-mid': '#1A3A5C',
          green: '#00D68F',
          'green-dark': '#00B878',
          red: '#EF4444',
          light: '#F0F4F8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
