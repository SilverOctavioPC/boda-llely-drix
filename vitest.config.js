import { defineConfig } from 'vitest/config'

/**
 * Configuración propia de los tests, aparte de vite.config.js a propósito.
 *
 * Los tests cubren solo la lógica pura de src/lib —menú, acompañantes, roles,
 * texto— y las guardas sobre firestore.rules. No tocan React, ni Firebase, ni
 * el DOM: sin el plugin de React ni jsdom arrancan en menos de un segundo.
 *
 * Es también donde vive el número que se le entrega al salón. Un fallo aquí no
 * es un bug visual: es comida mal pedida, sin vuelta atrás el día del evento.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
