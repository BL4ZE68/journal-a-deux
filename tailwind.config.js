/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#2A2138',
        dusk: '#1B1530',
        duskdeep: '#100B1C',
        paper: '#F6EDDC',
        papershadow: '#E9DCBE',
        rose: '#D97878',
        sage: '#8CA377',
        gold: '#E3B77D',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
