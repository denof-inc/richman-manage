/* eslint-disable */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './pages/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    '../../packages/ui/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#295E4F',
          light: '#3F7B69',
          dark: '#1F4A3F',
        },
        accent: {
          DEFAULT: '#3A7BFF',
          light: '#AECBFF',
        },
        background: '#F9F9F9',
        'text-base': '#1F2937',
        'text-muted': '#6B7280',
        'border-default': '#E5E7EB',
        border: '#E5E7EB',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
