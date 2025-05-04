import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#295E4F',
        'primary-light': '#3F7B69',
        'primary-dark': '#1F4A3F',
        accent: '#D4AF37',
        'accent-light': '#F4D06F',
        background: '#F9F9F9',
        'text-base': '#1F2937',
        'text-muted': '#6B7280',
        'border-default': '#E5E7EB',
      },
      fontFamily: {
        sans: ['Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
