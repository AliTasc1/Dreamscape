import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** The narrator service holds the API keys; the app only ever sees /api. */
const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:8787'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
})
