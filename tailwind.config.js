/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        // Amber — the Servo Checker brand color
        brand: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        // Warm off-white background — not clinical gray
        warm: {
          50:  '#fffbf2',
          100: '#fff8e8',
        },
        // Pure neutral dark — no blue tint, Claude Code-style
        ink: {
          950: '#0A0A0A',
          900: '#111111',
          850: '#161616',
          800: '#1A1A1A',
          750: '#222222',
          700: '#2A2A2A',
          600: '#3A3A3A',
          500: '#555555',
          400: '#777777',
          300: '#999999',
          200: '#BBBBBB',
          100: '#DDDDDD',
          50:  '#F2F2F2',
        },
      },
    },
  },
  plugins: [],
};
