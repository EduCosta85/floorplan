import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Para GitHub Pages - nome do repositório
  base: process.env.GITHUB_ACTIONS ? '/floorplan/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
