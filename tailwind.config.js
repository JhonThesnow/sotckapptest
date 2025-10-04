// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Asegura que lea todos tus archivos de React
  ],
  theme: {
    extend: {
      extend: {
        keyframes: {
          'fade-in': {
            '0%': { opacity: '0' },
            '100%': { opacity: '0.5' },
          },
          'slide-in-left': {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(0)' },
          }
        },
        animation: {
          'fade-in': 'fade-in 0.3s ease-out forwards',
          'slide-in-left': 'slide-in-left 0.3s ease-out forwards',
        }
      },
    },
  },
  plugins: [],
}