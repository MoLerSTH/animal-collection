/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cream: '#F8F5EF', // Primary background
        espresso: '#3A2E2B', // Primary text & buttons
        sand: '#C4A484', // Secondary accent
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
};
