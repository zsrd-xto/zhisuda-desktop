/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#34d399',
          500: '#10b981',
          950: '#022c22'
        }
      }
    }
  },
  plugins: []
}
