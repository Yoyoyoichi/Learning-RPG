import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/Learning-RPG/',
  plugins: [react()],
  server: {
    port: 5180,
    watch: {
      usePolling: true,
      interval: 1000
    }
  }
})
