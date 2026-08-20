/** @type {import('tailwindcss').Config} */

/*
  Los colores NO se escriben aquí: viven en `src/index.css` como variables CSS.
  Este archivo solo los expone a Tailwind.

  `rgb(var(--x) / <alpha-value>)` es lo que permite seguir usando los
  modificadores de opacidad (`text-texto/50`, `bg-accion/15`). Por eso las
  variables guardan canales sueltos —`46 44 41`— y no `#2E2C29`: con el hex,
  Tailwind no puede inyectar el alfa y `/50` se ignora en silencio.

  Los nombres son de USO, no de color. No existe `bg-salvia`, existe
  `bg-accion`. Así, el día que el color cambie, el código no queda mintiendo.
*/
const token = (nombre) => `rgb(var(${nombre}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Superficies
        fondo: token('--color-fondo'),
        superficie: token('--color-superficie'),
        reposo: token('--color-reposo'),
        linea: token('--color-linea'),
        lineaFuerte: token('--color-linea-fuerte'),

        // Texto. Los tonos intermedios salen del alfa: `text-texto/60`.
        texto: token('--color-texto'),

        // Acción
        accion: token('--color-accion'),
        accionFuerte: token('--color-accion-fuerte'),
        accionViva: token('--color-accion-viva'),
        sobreColor: token('--color-sobre-color'),

        // Adorno. Solo filetes de 1px; nunca texto ni relleno.
        filete: token('--color-filete'),

        // Estado
        confirmado: token('--color-confirmado'),
        espera: token('--color-espera'),
        alerta: token('--color-alerta'),
        alertaFuerte: token('--color-alerta-fuerte'),
      },
      fontFamily: {
        titulo: ['Palatino Linotype', 'Book Antiqua', 'Palatino', 'Georgia', 'serif'],
        // Cifras, mesas e IDs. Tabular: el 1 ocupa lo mismo que el 8 y las
        // columnas del panel no bailan al actualizarse en vivo.
        dato: ['ui-monospace', 'Cascadia Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
