/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './*.js',
    './scripts/**/*.js'
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
