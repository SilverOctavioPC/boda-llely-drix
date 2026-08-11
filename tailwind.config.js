/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        crema: '#FAF7F2',
        arena: '#EFE7DA',
        salvia: '#8A9A7B',
        salviaOscuro: '#5F6D53',
        oro: '#B79055',
        carbon: '#2E2C29',
      },
      fontFamily: {
        titulo: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
