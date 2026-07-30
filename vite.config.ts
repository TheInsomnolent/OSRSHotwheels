import { defineConfig } from 'vite'

// Served from https://theinsomnolent.github.io/OSRSHotwheels/ on GitHub Pages.
// Vite's dev server also serves from this base path locally.
export default defineConfig({
  base: '/OSRSHotwheels/',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1024,
  },
})
