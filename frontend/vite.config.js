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
    // siendo relativas. Express reenvia por su cuenta lo que sea
    // /api/extraccion/* a la API de extraccion (FastAPI, :8000).
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
})
