import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // El escaneo de QR requiere un contexto seguro (https o localhost).
    // En localhost el navegador sí concede la cámara.
    host: true,
    port: 5173,
  },
})
