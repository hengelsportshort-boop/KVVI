/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'kvvi-blue': '#004a99',   // Gebaseerd op clublogo
        'kvvi-green': '#2d5a27',  // Natuurlijke viswater kleur
        'kvvi-gold': '#d4af37',   // De winnaarskleur
      },
      screens: {
        'ios': {'raw': '(hover: none)'}, // Specifieke styling voor touch-devices
      },
    },
  },
  plugins: [],
}