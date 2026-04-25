import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#E07830',
          dark:    '#B85F20',
          light:   '#FFF2EA',
        },
        red: {
          DEFAULT: '#C8102E',
          dark:    '#A00D24',
          light:   '#FFE5E9',
        },
        steel: {
          DEFAULT: '#4A7FA0',
          dark:    '#346080',
          light:   '#E8F2F8',
        },
        accent: {
          DEFAULT: '#D4A843',
          light:   '#FBF3E0',
        },
        cream:   '#FFF8F0',
        navy:    '#1A2D40',
        appbg:   '#F5F5F7',
        sidebar: '#1D1D1F',
      },
      boxShadow: {
        card:        'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px',
        'card-hover':'rgba(0,0,0,0.04) 0 0 0 1px, rgba(0,0,0,0.08) 0 4px 16px, rgba(0,0,0,0.14) 0 8px 24px',
        glow:        '0 8px 32px rgba(224,120,48,0.22)',
        nav:         'rgba(0,0,0,0.04) 0 2px 8px',
      },
      animation: {
        'fade-up':    'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
        float:        'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        shimmer:      'shimmer 1.8s infinite linear',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(22px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-18px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-600px 0' },
          '100%': { backgroundPosition: '600px 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.5' },
          '50%':      { opacity: '0.9' },
        },
      },
      letterSpacing: {
        heading:    '-0.44px',
        'heading-sm': '-0.18px',
      },
    },
  },
  plugins: [],
}

export default config
