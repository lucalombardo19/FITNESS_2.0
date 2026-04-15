import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#0F0F1A',
        surface:  '#1A1A2E',
        surfaceB: '#252542',
        border:   '#2E2E50',
        primary:  '#6C63FF',
        accent:   '#43D9AD',
        danger:   '#FF6584',
        muted:    '#5C5C7A',
        sub:      '#9494B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
