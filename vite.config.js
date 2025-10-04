import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Esta sección es la que configura el proxy
    proxy: {
      // Cualquier petición que empiece con '/api'
      '/api': {
        // será redirigida a nuestro servidor backend
        target: 'http://localhost:3001',
        // Esto es importante para que el backend acepte la petición
        changeOrigin: true,
      }
    }
  }
})
