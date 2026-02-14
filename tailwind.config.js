/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        felt: {
          50: '#eef7f1',
          100: '#d5edde',
          200: '#aadcbe',
          300: '#72c496',
          400: '#4aad74',
          500: '#2a9d68',
          600: '#1a7d52',
          700: '#1a5038',
          800: '#184430',
          900: '#153828',
        },
        gold: {
          50: '#fdf8eb',
          100: '#f9edcc',
          200: '#f3d899',
          300: '#ecc05f',
          400: '#e4a832',
          500: '#c49a3c',
          600: '#a67b1e',
          700: '#7e5c17',
          800: '#6a4d1a',
          900: '#5b421c',
        },
        sand: {
          50: '#fdfbf7',
          100: '#f7f3ec',
          200: '#ede8df',
          300: '#ddd6ca',
          400: '#b5ac9e',
          500: '#918779',
          600: '#736a5e',
          700: '#574f45',
          800: '#3b352e',
          900: '#252119',
          950: '#1a1714',
        },
      },
    },
  },
  plugins: [],
};
