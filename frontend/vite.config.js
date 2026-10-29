import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    // Con el proxy el navegador ve un solo origen y no hace falta CORS en
    // desarrollo, asi que VITE_API_URL se queda vacio y las llamadas siguen
    // siendo relativas. /api/* va a la API de PADEP (FastAPI, :8000) sin el
    // prefijo, igual que hace cliente.js en el servidor (con VITE_API_URL).
    proxy: {
      '/api': {
        // PADEP_API para apuntar a otra instancia (otro puerto) sin tocar esto.
        target: process.env.PADEP_API || 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (ruta) => ruta.replace(/^\/api/, '') || '/',
      },
    },
  },
})
