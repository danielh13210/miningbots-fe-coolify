/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './*.js',
    './scripts/**/*.js',
    './styles/**/*.css'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        panel: '#f8fafc'
      }
    }
  },
  plugins: []
};
