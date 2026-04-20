/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#3B5BDB',
          light: '#4C6EF5',
        }
      }
    },
  },
  plugins: [],
}
