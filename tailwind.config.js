/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // This enables the toggle logic we added
  theme: {
    extend: {
      fontFamily: {
        // We'll define these so you can use 'font-heading' and 'font-body'
        heading: ['"Lexend Deca"', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
