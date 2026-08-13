import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // El servidor de desarrollo escucha SOLO en localhost.
    //
    // Antes tenía `host: true`, que lo publicaba en toda la red local. Se puso
    // para poder abrir el escáner desde el celular, pero eso nunca llegó a
    // funcionar: la cámara exige HTTPS o localhost, y en 192.168.x.x el
    // navegador la deniega siempre (está documentado en docs/GUIA.md).
    //
    // A cambio, mientras `npm run dev` estuviera corriendo, cualquiera en la
    // misma red —una cafetería, un coworking— podía descargar
    // http://<tu-ip>:5173/serviceAccount.json y quedarse con la clave privada
    // de administrador, que da acceso total a Firestore saltándose las reglas.
    //
    // La prueba real del escáner se hace desplegado en Vercel, que sirve HTTPS.
    // NO vuelvas a poner `host: true` ni uses `npm run dev -- --host`.
    port: 5173,

    fs: {
      // Vite sirve archivos de la raíz del proyecto, y su lista de bloqueo por
      // defecto cubre `.env` pero no la cuenta de servicio. Se repiten aquí los
      // valores por defecto porque definir `deny` los reemplaza.
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/serviceAccount.json'],
    },
  },
})
