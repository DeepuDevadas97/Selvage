import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  server: { cors: { origin: '*' } },
  preview: { cors: { origin: '*' } },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
