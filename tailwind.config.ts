import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          deepest: '#0A0A0F',
          deep: '#0F0F18',
          surface: '#161622',
          elevated: '#1C1C2E',
          overlay: '#22223A',
        },
        accent: {
          primary: '#6E56FF',
          'primary-hover': '#8370FF',
          'primary-active': '#5A42E6',
          secondary: '#00D4AA',
          'secondary-hover': '#1AE0BA',
          tertiary: '#FF6B9D',
          upload: '#FFB344',
          'upload-hover': '#FFC266',
          'upload-active': '#E6A03D',
          edit: '#FF6B9D',
          'edit-hover': '#FF85B1',
        },
        text: {
          primary: '#EAEAF0',
          secondary: '#A0A0B8',
          tertiary: '#6B6B82',
          disabled: '#3E3E54',
          inverse: '#0A0A0F',
        },
        state: {
          success: '#00D4AA',
          warning: '#FFB344',
          error: '#FF4466',
          info: '#44AAFF',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        glass: '16px',
        'glass-heavy': '24px',
        'glass-light': '8px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.40)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.35), 0 0 24px rgba(110, 86, 255, 0.12)',
        glow: '0 0 24px rgba(110, 86, 255, 0.12)',
      },
      animation: {
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'pulse-glow': 'pulseGlow 1.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
