export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--color-surface) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        cream: 'rgb(var(--color-cream) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        shelf: 'rgb(var(--color-shelf) / <alpha-value>)',
        brand: {
          amber: '#f6b93d',
          amberDark: '#e9a825',
          ember: 'rgb(var(--color-ember) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 20px 45px -20px rgba(0, 0, 0, 0.35)',
      },
    },
  },
};
